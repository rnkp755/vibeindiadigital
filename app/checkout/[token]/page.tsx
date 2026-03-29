import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { connectToDatabase } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import { IPayment } from "@/models/Payment";
import { IAvailablePlan } from "@/models/Plan";
import "@/models/Plan";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";
import { format } from "date-fns";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: { token: string };
}

export default async function CheckoutPage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { token } = params;

  if (!token || token.trim().length === 0) {
    notFound();
  }

  // ── Fetch payment from DB ────────────────────────────────────────────────
  let payment: (IPayment & { plan: IAvailablePlan }) | null = null;

  try {
    await connectToDatabase();
    payment = (await Payment.findOne({ token: token.trim() })
      .populate("plan", "name credits amount features")
      .lean()) as (IPayment & { plan: IAvailablePlan }) | null;
  } catch (err) {
    console.error("[CheckoutPage] DB error:", err);
  }

  if (!payment) notFound();

  // ── Ownership check ──────────────────────────────────────────────────────
  try {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const userEmail =
      clerkUser.primaryEmailAddress?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress ??
      "";

    const role = (clerkUser.publicMetadata as { role?: string })?.role;
    const isAdmin = role === "admin";

    if (!isAdmin && payment.email.toLowerCase() !== userEmail.toLowerCase()) {
      redirect("/dashboard/buy-credits");
    }
  } catch {
    redirect("/dashboard/buy-credits");
  }

  // ── Serialize for client ─────────────────────────────────────────────────
  const plan = payment.plan as IAvailablePlan;

  const serializedPayment = {
    _id: String(payment._id),
    token: payment.token,
    email: payment.email,
    amount: payment.amount,
    discount_applied: payment.discount_applied ?? 0,
    coupon_code: payment.coupon_code ?? null,
    payment_status: payment.payment_status,
    qr_code: payment.qr_code,
    contact_no: payment.contact_no ?? "",
    country_code: payment.country_code ?? "+91",
    credits_granted: payment.credits_granted ?? 0,
    createdAt: payment.createdAt
      ? format(new Date(payment.createdAt), "MMM d, yyyy · h:mm a")
      : null,
    plan: {
      _id: String(plan._id),
      name: plan.name,
      credits: plan.credits,
      amount: plan.amount,
    },
  };

  return <CheckoutClient payment={serializedPayment} />;
}
