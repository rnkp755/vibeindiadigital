import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/mongodb";
import AvailablePlan from "@/models/Plan";
import { IAvailablePlan } from "@/models/Plan";
import { BuyCreditsClient } from "@/components/dashboard/BuyCreditsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BuyCreditsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  let plans: IAvailablePlan[] = [];
  let fetchError: string | null = null;

  try {
    await connectToDatabase();
    plans = await AvailablePlan.find({}).sort({ amount: 1 }).lean();
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
    />
  );
}
