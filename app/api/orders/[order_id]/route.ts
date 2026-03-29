import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Order from "@/models/Order";

export const dynamic = "force-dynamic";

// ─── GET /api/orders/[order_id] ───────────────────────────────────────────────
// Returns a single order by order_id.
// Regular users can only fetch their own orders.

export async function GET(
  _req: Request,
  { params }: { params: { order_id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { order_id } = params;

  if (!order_id) {
    return NextResponse.json(
      { error: "Missing order_id parameter" },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const order = await Order.findOne({ order_id }).lean();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Ensure the order belongs to the requesting user
    if (order.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error(`[GET /api/orders/${order_id}] Error:`, error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}
