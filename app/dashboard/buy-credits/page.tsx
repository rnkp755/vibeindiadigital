import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/mongodb";
import AvailablePlan from "@/models/Plan";
import { IAvailablePlan } from "@/models/Plan";
import { BuyCreditsClient } from "@/components/dashboard/BuyCreditsClient";
import Payment from "@/models/Payment";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BuyCreditsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  let plans: IAvailablePlan[] = [];
  let fetchError: string | null = null;
  let payments: {
    _id: string;
    token: string;
    payment_status: string;
    amount: number;
    credits_granted?: number;
    plan?: {
      name?: string;
      credits?: number;
      amount?: number;
    } | null;
    createdAt: string;
  }[] = [];

  try {
    await connectToDatabase();
    plans = await AvailablePlan.find({}).sort({ amount: 1 }).lean();

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const userEmail =
      user.primaryEmailAddress?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      "";

    if (userEmail) {
      const userPayments = await Payment.find({ email: userEmail.toLowerCase() })
        .populate("plan", "name credits amount")
        .sort({ createdAt: -1 })
        .lean();

      payments = userPayments.map((p) => ({
        _id: String(p._id),
        token: p.token,
        payment_status: p.payment_status,
        amount: p.amount,
        credits_granted: p.credits_granted,
        plan: p.plan
          ? {
              name: (p.plan as { name?: string }).name,
              credits: (p.plan as { credits?: number }).credits,
              amount: (p.plan as { amount?: number }).amount,
            }
          : null,
        createdAt: new Date(p.createdAt).toISOString(),
      }));
    }
  } catch (err) {
    console.error("[BuyCreditsPage] DB error:", err);
    fetchError = "Failed to load plans. Please refresh the page.";
  }

  return (
    <BuyCreditsClient
      plans={plans.map((p) => ({
        _id: String(p._id),
        name: p.name,
        credits: p.credits,
        amount: p.amount,
        features: p.features ?? [],
        coupons: (p.coupons ?? []).map((c) => ({
          code: c.code,
          discount: c.discount,
        })),
      }))}
      fetchError={fetchError}
      payments={payments}
    />
  );
}
