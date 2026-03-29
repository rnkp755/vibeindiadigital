import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import AvailablePlan from "@/models/Plan";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();

    const plans = await AvailablePlan.find({})
      .sort({ amount: 1 }) // silver → gold → platinum
      .lean();

    return NextResponse.json({ plans });
  } catch (error) {
    console.error("[GET /api/plans] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch plans" },
      { status: 500 }
    );
  }
}
