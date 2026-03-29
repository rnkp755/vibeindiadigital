import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import "@/models/Plan";

export const dynamic = "force-dynamic";

// ─── GET /api/admin/payments ──────────────────────────────────────────────────
// Admin-only: returns all payments with optional filters, sorting, and pagination.
//
// Query params:
//   page          - page number (default: 1)
//   limit         - results per page (default: 20, max: 100)
//   status        - filter by payment_status (pending | needs_review | completed)
//   email         - filter by partial email match
//   token         - filter by partial token match
//   sortBy        - field to sort by (default: createdAt)
//   sortOrder     - asc | desc (default: desc)

export async function GET(req: Request) {
  // ── Auth + admin guard ─────────────────────────────────────────────────────
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    console.error("[GET /api/admin/payments] Clerk error:", err);
    return NextResponse.json(
      { error: "Failed to verify admin role." },
      { status: 500 }
    );
  }

  // ── Parse query params ─────────────────────────────────────────────────────
  const { searchParams } = new URL(req.url);

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10))
  );
  const skip = (page - 1) * limit;

  const statusFilter = searchParams.get("status");
  const emailFilter = searchParams.get("email");
  const tokenFilter = searchParams.get("token");
  const sortBy = searchParams.get("sortBy") ?? "createdAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;

  // ── Build Mongoose filter ──────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};

  const allowedStatuses = ["pending", "needs_review", "completed"];
  if (statusFilter && allowedStatuses.includes(statusFilter)) {
    filter.payment_status = statusFilter;
  }

  if (emailFilter && emailFilter.trim().length > 0) {
    // Case-insensitive partial match
    filter.email = { $regex: emailFilter.trim(), $options: "i" };
  }

  if (tokenFilter && tokenFilter.trim().length > 0) {
    filter.token = { $regex: tokenFilter.trim(), $options: "i" };
  }

  // ── Allowed sort fields ────────────────────────────────────────────────────
  const allowedSortFields = ["createdAt", "updatedAt", "amount", "payment_status", "email"];
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

  // ── DB query ───────────────────────────────────────────────────────────────
  try {
    await connectToDatabase();

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate("plan", "name credits amount")
        .sort({ [safeSortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments(filter),
    ]);

    // ── Aggregate stats for the filtered set ──────────────────────────────────
    const [stats] = await Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total_amount: { $sum: "$amount" },
          pending_count: {
            $sum: { $cond: [{ $eq: ["$payment_status", "pending"] }, 1, 0] },
          },
          needs_review_count: {
            $sum: {
              $cond: [{ $eq: ["$payment_status", "needs_review"] }, 1, 0],
            },
          },
          completed_count: {
            $sum: {
              $cond: [{ $eq: ["$payment_status", "completed"] }, 1, 0],
            },
          },
          completed_amount: {
            $sum: {
              $cond: [
                { $eq: ["$payment_status", "completed"] },
                "$amount",
                0,
              ],
            },
          },
        },
      },
    ]);

    return NextResponse.json({
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      stats: stats
        ? {
            total_amount: stats.total_amount,
            completed_amount: stats.completed_amount,
            pending_count: stats.pending_count,
            needs_review_count: stats.needs_review_count,
            completed_count: stats.completed_count,
          }
        : {
            total_amount: 0,
            completed_amount: 0,
            pending_count: 0,
            needs_review_count: 0,
            completed_count: 0,
          },
    });
  } catch (err) {
    console.error("[GET /api/admin/payments] DB error:", err);
    return NextResponse.json(
      { error: "Failed to fetch payments." },
      { status: 500 }
    );
  }
}
