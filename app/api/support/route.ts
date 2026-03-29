import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { sendSupportEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

// ─── POST /api/support ────────────────────────────────────────────────────────
// Sends a support email from the authenticated user about a specific order.

export async function POST(req: Request) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: { orderId?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { orderId, message } = body;

  if (!orderId || typeof orderId !== "string" || !orderId.trim()) {
    return NextResponse.json(
      { error: "Missing or invalid field: orderId" },
      { status: 400 }
    );
  }

  if (!message || typeof message !== "string" || message.trim().length < 10) {
    return NextResponse.json(
      { error: "Message must be at least 10 characters long." },
      { status: 400 }
    );
  }

  if (message.trim().length > 2000) {
    return NextResponse.json(
      { error: "Message must not exceed 2000 characters." },
      { status: 400 }
    );
  }

  // ── Fetch user details from Clerk ──────────────────────────────────────────
  let userEmail: string;
  let userName: string;

  try {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);

    userEmail =
      clerkUser.primaryEmailAddress?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress;

    if (!userEmail) {
      return NextResponse.json(
        { error: "Could not determine user email." },
        { status: 400 }
      );
    }

    userName =
      clerkUser.firstName
        ? `${clerkUser.firstName}${clerkUser.lastName ? ` ${clerkUser.lastName}` : ""}`
        : clerkUser.username ?? userEmail.split("@")[0];
  } catch (err) {
    console.error("[POST /api/support] Clerk error:", err);
    return NextResponse.json(
      { error: "Failed to retrieve user information." },
      { status: 500 }
    );
  }

  // ── Send the support email ─────────────────────────────────────────────────
  try {
    await sendSupportEmail({
      orderId: orderId.trim(),
      userEmail,
      userName,
      message: message.trim(),
    });

    return NextResponse.json({
      success: true,
      message: "Your support message has been sent. We'll get back to you within 24 hours.",
    });
  } catch (err) {
    console.error("[POST /api/support] Failed to send support email:", err);
    return NextResponse.json(
      { error: "Failed to send support email. Please try again later." },
      { status: 500 }
    );
  }
}
