import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import path from "path";
import { fork } from "child_process";
import { connectToDatabase } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import Order from "@/models/Order";
import "@/models/Plan";
import {
  sendPaymentReviewEmail,
  sendPaymentConfirmedEmail,
} from "@/lib/mailer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ─── OCR via isolated child process ──────────────────────────────────────────
// Tesseract.js can't run inside Next.js's bundled worker environment because
// Next.js rewrites worker paths into .next/worker-script/... which breaks
// Tesseract's internal resolution. We fork a plain .mjs script that lives
// outside the Next.js build at scripts/ocr-worker.mjs.
function runOcr(imageBuffer: Buffer): Promise<string> {
  return new Promise((resolve) => {
    const workerScript = path.resolve(process.cwd(), "scripts/ocr-worker.mjs");
    const child = fork(workerScript, [], { silent: true });

    const timeout = setTimeout(() => {
      child.kill();
      console.error("[Verify] OCR worker timed out");
      resolve("");
    }, 50_000);

    child.on("message", (msg: { ok: boolean; text?: string; error?: string }) => {
      clearTimeout(timeout);
      if (msg.ok) {
        resolve(msg.text ?? "");
      } else {
        console.error("[Verify] OCR worker error:", msg.error);
        resolve("");
      }
    });

    child.on("error", (err) => {
      clearTimeout(timeout);
      console.error("[Verify] Failed to spawn OCR worker:", err);
      resolve("");
    });

    child.send({ imageBase64: imageBuffer.toString("base64") });
  });
}
export const maxDuration = 60; // seconds (Vercel / Netlify function timeout)

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract all numeric amounts from OCR text.
 * Matches plain numbers with optional commas and decimals.
 */
function extractAmounts(text: string): number[] {
  const amountRegex = /(\d{1,6}(?:,\d{3})*(?:\.\d{1,2})?)/g;

  const found: number[] = [];
  let match: RegExpExecArray | null;

  while ((match = amountRegex.exec(text)) !== null) {
    const raw = match[1].replace(/,/g, "");
    const value = parseFloat(raw);
    if (!isNaN(value) && value > 0) {
      found.push(value);
    }
  }

  return [...new Set(found)]; // deduplicate
}

/**
 * Check if any extracted amount matches the expected amount with a small tolerance.
 */
function amountMatches(extracted: number[], expected: number): boolean {
  const tolerance = 0.01;
  return extracted.some(
    (amt) => Math.abs(amt - expected) <= tolerance
  );
}

// ─── POST /api/payments/[token]/verify ───────────────────────────────────────

export async function POST(
  req: Request,
  { params }: { params: { token: string } }
) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = params;
  if (!token) {
    return NextResponse.json(
      { error: "Missing token in URL" },
      { status: 400 }
    );
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  // Expects { screenshot_url: "https://res.cloudinary.com/.../image/upload/..." }
  let body: { screenshot_url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { screenshot_url: screenshotUrl } = body;

  if (!screenshotUrl || typeof screenshotUrl !== "string") {
    return NextResponse.json(
      { error: "Missing field: screenshot_url" },
      { status: 400 }
    );
  }

  // ── Load payment from DB ───────────────────────────────────────────────────
  try {
    await connectToDatabase();
  } catch (err) {
    console.error("[Verify] DB connection error:", err);
    return NextResponse.json(
      { error: "Database connection error" },
      { status: 500 }
    );
  }

  const payment = await Payment.findOne({ token })
    .populate("plan")
    .exec();

  if (!payment) {
    return NextResponse.json(
      { error: "Payment record not found for this token" },
      { status: 404 }
    );
  }

  // Confirm this payment belongs to the requesting user
  const client = await clerkClient();
  const clerkUser = await client.users.getUser(userId);
  const userEmail =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    "";

  if (payment.email.toLowerCase() !== userEmail.toLowerCase()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Idempotency: if already completed, return early
  if (payment.payment_status === "completed" || payment.payment_status === "verified") {
    return NextResponse.json({
      result: "already_completed",
      message: "This payment has already been verified and marked as completed.",
    });
  }

  // ── OCR the screenshot ─────────────────────────────────────────────────────
  let extractedText = "";

  try {
    const imageRes = await fetch(screenshotUrl);
    if (!imageRes.ok) {
      throw new Error(`Failed to fetch screenshot (HTTP ${imageRes.status})`);
    }
    const arrayBuffer = await imageRes.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
    extractedText = await runOcr(imageBuffer);
  } catch (err) {
    console.error("[Verify] Failed to fetch screenshot for OCR:", err);
    extractedText = "";
  }

  // ── Determine verification outcome ────────────────────────────────────────
  const amounts = extractAmounts(extractedText);
  const amountOk = amountMatches(amounts, payment.amount);

  const isVerified = amountOk;

  // ── Store OCR text in payment doc (useful for admin review) ───────────────
  payment.ocr_extracted_text = extractedText.slice(0, 3000); // cap at 3 KB

  // ── Branch: COMPLETED ─────────────────────────────────────────────────────
  if (isVerified) {
    payment.payment_status = "completed";
    await payment.save();

    // Retrieve plan info (populated above)
    const plan = payment.plan as unknown as {
      name: string;
      credits: number;
    };
    const creditsToAdd = plan?.credits ?? (payment.credits_granted ?? 0);

    // ── Update Clerk user credits ────────────────────────────────────────────
    let newCredits = creditsToAdd;
    try {
      const currentCredits =
        typeof clerkUser.publicMetadata?.credits === "number"
          ? (clerkUser.publicMetadata.credits as number)
          : 0;

      newCredits = currentCredits + creditsToAdd;

      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          credits: newCredits,
        },
      });
    } catch (err) {
      console.error(
        `[Verify] CRITICAL: Payment ${token} completed but failed to add ${creditsToAdd} credits to user ${userId}.`,
        err
      );
      // Payment is still marked completed — admin will need to reconcile.
    }

    // ── Check user's last unpaid order ───────────────────────────────────────
    try {
      const lastUnpaidOrder = await Order.findOne({
        user_id: userId,
        "current_status": {
          $elemMatch: { status: "unpaid" },
        },
      })
        .sort({ createdAt: -1 })
        .exec();

      if (lastUnpaidOrder) {
        // Determine the latest status entry
        const latestStatus =
          lastUnpaidOrder.current_status[
            lastUnpaidOrder.current_status.length - 1
          ]?.status;

        if (latestStatus === "unpaid" && lastUnpaidOrder.tracks <= newCredits) {
          // Activate the order and deduct credits atomically
          lastUnpaidOrder.current_status.push({
            status: "pending",
            updated_at: new Date(),
          });
          await lastUnpaidOrder.save();

          // Deduct tracks from the newly updated credit balance
          const creditsAfterOrder = newCredits - lastUnpaidOrder.tracks;
          await client.users.updateUserMetadata(userId, {
            publicMetadata: {
              credits: creditsAfterOrder,
            },
          });
        }
      }
    } catch (err) {
      // Non-critical: log and continue
      console.error(
        "[Verify] Failed to auto-activate unpaid order for user:",
        userId,
        err
      );
    }

    // ── Send confirmation email ──────────────────────────────────────────────
    sendPaymentConfirmedEmail({
      userEmail,
      userName:
        clerkUser.firstName ??
        clerkUser.username ??
        userEmail.split("@")[0],
      planName: plan?.name ?? "unknown",
      credits: creditsToAdd,
      amount: payment.amount,
      token,
    }).catch((err) =>
      console.error("[Verify] Failed to send confirmation email:", err)
    );

    return NextResponse.json({
      result: "completed",
      message: "Payment verified! Your credits have been added.",
      credits_added: creditsToAdd,
      new_credit_balance: newCredits,
    });
  }

  // ── Branch: NEEDS REVIEW ──────────────────────────────────────────────────
  payment.payment_status = "needs_review";

  const reviewScreenshotUrl = screenshotUrl;
  payment.screenshot_url = reviewScreenshotUrl;

  await payment.save();

  // Notify admin
  const plan = payment.plan as unknown as { name: string };
  sendPaymentReviewEmail({
    token,
    userEmail,
    planName: plan?.name ?? "unknown",
    amount: payment.amount,
    extractedText,
    screenshotUrl: reviewScreenshotUrl,
  }).catch((err) =>
    console.error("[Verify] Failed to send review email to admin:", err)
  );

  return NextResponse.json(
    {
      result: "needs_review",
      message:
        "We could not automatically verify your payment. Our team will review it and update your account within 24 hours.",
      debug:
        process.env.NODE_ENV === "development"
          ? {
              amount_ok: amountOk,
              extracted_amounts: amounts,
              expected_amount: payment.amount,
              text_preview: extractedText.slice(0, 500),
            }
          : undefined,
    },
    { status: 202 }
  );
}
