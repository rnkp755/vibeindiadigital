import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import { generateSignedPaymentUploadParams } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

// GET /api/cloudinary/payment-sign?token=PAYMENT_TOKEN
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token")?.trim() ?? "";

  if (!token) {
    return NextResponse.json(
      { error: "Missing required parameter: token" },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();
  } catch (err) {
    console.error("[Payment Sign] DB connection error:", err);
    return NextResponse.json(
      { error: "Database connection error." },
      { status: 500 }
    );
  }

  const payment = await Payment.findOne({ token }).lean();
  if (!payment) {
    return NextResponse.json(
      { error: "Payment record not found for this token." },
      { status: 404 }
    );
  }

  try {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const userEmail =
      clerkUser.primaryEmailAddress?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress ??
      "";

    if (payment.email.toLowerCase() !== userEmail.toLowerCase()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } catch (err) {
    console.error("[Payment Sign] Clerk error:", err);
    return NextResponse.json(
      { error: "Failed to verify user identity." },
      { status: 500 }
    );
  }

  try {
    const params = generateSignedPaymentUploadParams(token);
    return NextResponse.json(params);
  } catch (err) {
    console.error("[Payment Sign] Failed to generate params:", err);
    return NextResponse.json(
      { error: "Failed to generate signed upload parameters." },
      { status: 500 }
    );
  }
}

