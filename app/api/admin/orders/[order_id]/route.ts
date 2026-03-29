import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Order from "@/models/Order";
import { OrderStatusValue } from "@/models/Order";
import { generateSignedDownloadUrl } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function requireAdmin(userId: string): Promise<boolean> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const role = (user.publicMetadata as { role?: string })?.role;
    return role === "admin";
  } catch {
    return false;
  }
}

// ─── GET /api/admin/orders/[order_id] ─────────────────────────────────────────
// Returns full order details (any user's order).
// Also returns a short-lived signed Cloudinary download URL if asset_url is set.

export async function GET(
  _req: Request,
  { params }: { params: { order_id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await requireAdmin(userId))) {
    return NextResponse.json(
      { error: "Forbidden. Admin access required." },
      { status: 403 }
    );
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
  } catch (err) {
    console.error("[Admin GET /orders/:id] DB error:", err);
    return NextResponse.json(
      { error: "Database connection error." },
      { status: 500 }
    );
  }

  const order = await Order.findOne({ order_id }).lean();

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  // ── Generate signed download URL ───────────────────────────────────────────
  let downloadUrl: string | null = null;

  if (order.asset_url && order.email) {
    try {
      // email prefix is the part before the '@' symbol
      const emailPrefix = order.email.split("@")[0];
      downloadUrl = generateSignedDownloadUrl(emailPrefix, order.order_id, 3600);
    } catch (err) {
      console.error("[Admin GET /orders/:id] Failed to generate download URL:", err);
      // Non-fatal — proceed without download URL
    }
  }

  return NextResponse.json({
    order,
    downloadUrl,
  });
}

// ─── PATCH /api/admin/orders/[order_id] ───────────────────────────────────────
// Admin updates the order status.
// Appends a new status entry to current_status[].

export async function PATCH(
  req: Request,
  { params }: { params: { order_id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await requireAdmin(userId))) {
    return NextResponse.json(
      { error: "Forbidden. Admin access required." },
      { status: 403 }
    );
  }

  const { order_id } = params;

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { status } = body;

  const allowedStatuses: OrderStatusValue[] = [
    "unpaid",
    "pending",
    "verified",
    "in_progress",
    "completed",
  ];

  if (!status || !allowedStatuses.includes(status as OrderStatusValue)) {
    return NextResponse.json(
      {
        error: `Invalid status. Allowed values: ${allowedStatuses.join(", ")}`,
      },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();
  } catch (err) {
    console.error("[Admin PATCH /orders/:id] DB error:", err);
    return NextResponse.json(
      { error: "Database connection error." },
      { status: 500 }
    );
  }

  const order = await Order.findOne({ order_id });

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  // Prevent duplicate consecutive status entries
  const latestStatus =
    order.current_status[order.current_status.length - 1]?.status;

  if (latestStatus === status) {
    return NextResponse.json(
      {
        message: `Order is already in "${status}" status. No update needed.`,
        order,
      },
      { status: 200 }
    );
  }

  // Append new status entry
  order.current_status.push({
    status: status as OrderStatusValue,
    updated_at: new Date(),
  });

  await order.save();

  return NextResponse.json({
    message: `Order ${order_id} status updated to "${status}".`,
    order: {
      _id: order._id,
      order_id: order.order_id,
      email: order.email,
      current_status: order.current_status,
      updatedAt: order.updatedAt,
    },
  });
}
