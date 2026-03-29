import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import "@/models/Plan";
import AvailablePlan from "@/models/Plan";
import Order from "@/models/Order";

export const dynamic = "force-dynamic";

// GET /api/payments/[token]
// Returns the full details of a payment by its token.
// The requesting user must be the owner of the payment OR an admin.

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = params;

  if (!token || token.trim().length === 0) {
    return NextResponse.json(
      { error: "Missing token parameter" },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();
  } catch (err) {
    console.error("[GET /api/payments/:token] DB connection error:", err);
    return NextResponse.json(
      { error: "Database connection error." },
      { status: 500 }
    );
  }

  const payment = await Payment.findOne({ token: token.trim() })
    .populate("plan", "name credits amount features")
    .lean();

  if (!payment) {
    return NextResponse.json(
      { error: "Payment not found. The token may be invalid or expired." },
      { status: 404 }
    );
  }

  // Ownership check
  // Admins (role === "admin" in publicMetadata) can view any payment.
  let userEmail: string;
  let isAdmin = false;

  try {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);

    userEmail =
      clerkUser.primaryEmailAddress?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress ??
      "";

    const role = (clerkUser.publicMetadata as { role?: string })?.role;
    isAdmin = role === "admin";
  } catch (err) {
    console.error("[GET /api/payments/:token] Clerk error:", err);
    return NextResponse.json(
      { error: "Failed to verify user identity." },
      { status: 500 }
    );
  }

  if (!isAdmin && payment.email.toLowerCase() !== userEmail.toLowerCase()) {
    return NextResponse.json(
      { error: "Forbidden. This payment does not belong to your account." },
      { status: 403 }
    );
  }

  // Shape the response
  // Never expose OCR text or screenshot URLs to regular users.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safePayment: Record<string, any> = {
    _id: payment._id,
    token: payment.token,
    email: payment.email,
    plan: payment.plan,
    amount: payment.amount,
    discount_applied: payment.discount_applied ?? 0,
    coupon_code: payment.coupon_code ?? null,
    payment_status: payment.payment_status,
    qr_code: payment.qr_code,
    contact_no: payment.contact_no,
    country_code: payment.country_code ?? "+91",
    credits_granted: payment.credits_granted,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };

  if (isAdmin) {
    safePayment.ocr_extracted_text = payment.ocr_extracted_text ?? null;
    safePayment.screenshot_url = payment.screenshot_url ?? null;
  }

  return NextResponse.json({ payment: safePayment });
}

// PATCH /api/payments/[token]
// Admin-only: manually update the payment status.
// Used by admin dashboard to resolve payments.

export async function PATCH(
  req: Request,
  { params }: { params: { token: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify admin role
  try {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const role = (clerkUser.publicMetadata as { role?: string })?.role;
    if (role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden. Admin access required." },
        { status: 403 }
      );
    }
  } catch (err) {
    console.error("[PATCH /api/payments/:token] Clerk error:", err);
    return NextResponse.json(
      { error: "Failed to verify admin role." },
      { status: 500 }
    );
  }

  const { token } = params;

  let body: { payment_status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { payment_status } = body;
  const allowedStatuses = [
    "pending",
    "needs_review",
    "completed",
    "verified",
    "failed",
  ];

  if (!payment_status || !allowedStatuses.includes(payment_status)) {
    return NextResponse.json(
      {
        error: `Invalid payment_status. Allowed values: ${allowedStatuses.join(", ")}`,
      },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();
  } catch (err) {
    console.error("[PATCH /api/payments/:token] DB connection error:", err);
    return NextResponse.json(
      { error: "Database connection error." },
      { status: 500 }
    );
  }

  const payment = await Payment.findOne({ token: token.trim() });

  if (!payment) {
    return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  }

  // If marking as completed or verified, credit the user
  const shouldCredit =
    (payment_status === "completed" &&
      payment.payment_status !== "completed") ||
    (payment_status === "verified" &&
      payment.payment_status !== "verified" &&
      payment.payment_status !== "completed");

  if (shouldCredit) {
    try {
      const client = await clerkClient();

      // Fetch the plan to get credits
      const plan = await AvailablePlan.findById(payment.plan).lean();
      const creditsToAdd = plan?.credits ?? payment.credits_granted ?? 0;

      // Get current credits
      const clerkUser = await client.users.getUser(
        // We need to find userId by email — use email lookup
        // We rely on clerkClient's getUserList with emailAddress filter
        // Since we only have email, search for the user
        await (async () => {
          const users = await client.users.getUserList({
            emailAddress: [payment.email],
          });
          return users.data[0]?.id ?? "";
        })()
      );

      if (clerkUser?.id) {
        const currentCredits =
          typeof clerkUser.publicMetadata?.credits === "number"
            ? (clerkUser.publicMetadata.credits as number)
            : 0;

        // Update Clerk credits
        await client.users.updateUserMetadata(clerkUser.id, {
          publicMetadata: {
            credits: currentCredits + creditsToAdd,
          },
        });

        payment.credits_granted = creditsToAdd;
      }
    } catch (err) {
      console.error(
        "[PATCH /api/payments/:token] Failed to credit user after admin approval:",
        err
      );
      // Non-fatal: log and continue — admin can retry
    }
  }

  // If marking as failed, rollback credits and unpaid orders
  if (
    payment_status === "failed" &&
    payment.payment_status !== "failed" &&
    (payment.payment_status === "completed" ||
      payment.payment_status === "verified")
  ) {
    try {
      const client = await clerkClient();

      const plan = await AvailablePlan.findById(payment.plan).lean();
      const creditsForPayment = plan?.credits ?? payment.credits_granted ?? 0;

      const clerkUser = await client.users.getUser(
        await (async () => {
          const users = await client.users.getUserList({
            emailAddress: [payment.email],
          });
          return users.data[0]?.id ?? "";
        })()
      );

      if (clerkUser?.id && creditsForPayment > 0) {
        const currentCredits =
          typeof clerkUser.publicMetadata?.credits === "number"
            ? (clerkUser.publicMetadata.credits as number)
            : 0;

        if (currentCredits >= creditsForPayment) {
          await client.users.updateUserMetadata(clerkUser.id, {
            publicMetadata: {
              credits: currentCredits - creditsForPayment,
            },
          });
        } else {
          const usedCredits = creditsForPayment - currentCredits;

          await client.users.updateUserMetadata(clerkUser.id, {
            publicMetadata: {
              credits: 0,
            },
          });

          let remaining = usedCredits;

          const orders = await Order.find({ user_id: clerkUser.id })
            .sort({ createdAt: -1 })
            .exec();

          for (const order of orders) {
            if (remaining <= 0) break;
            const latestStatus =
              order.current_status[order.current_status.length - 1]?.status;
            if (latestStatus === "unpaid") continue;

            order.current_status.push({
              status: "unpaid",
              updated_at: new Date(),
            });
            await order.save();
            remaining -= order.tracks;
          }
        }
      }
    } catch (err) {
      console.error(
        "[PATCH /api/payments/:token] Failed to rollback credits after marking failed:",
        err
      );
    }
  }

  payment.payment_status = payment_status as
    | "pending"
    | "needs_review"
    | "completed"
    | "verified"
    | "failed";
  await payment.save();

  return NextResponse.json({
    message: `Payment status updated to "${payment_status}".`,
    payment: {
      _id: payment._id,
      token: payment.token,
      payment_status: payment.payment_status,
      updatedAt: payment.updatedAt,
    },
  });
}
