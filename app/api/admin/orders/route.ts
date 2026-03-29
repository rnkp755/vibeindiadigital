import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Order from "@/models/Order";
import { FilterQuery } from "mongoose";
import { IOrderDocument } from "@/models/Order";

export const dynamic = "force-dynamic";

// ─── GET /api/admin/orders ────────────────────────────────────────────────────
// Admin-only endpoint to list all orders with filtering, sorting, search,
// and pagination.
//
// Query parameters:
//   page        (number, default 1)
//   limit       (number, default 20, max 100)
//   search      (string)  — searches by email or order_id (case-insensitive)
//   status      (string)  — filter by latest status value
//   sortBy      (string)  — field to sort by (createdAt | tracks | release_date)
//   sortOrder   (asc|desc, default desc)
//   email       (string)  — exact email filter
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  // ── Auth + role check ──────────────────────────────────────────────────────
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
    console.error("[Admin GET /api/admin/orders] Clerk error:", err);
    return NextResponse.json(
      { error: "Failed to verify admin role." },
      { status: 500 }
    );
  }

  // ── Parse query params ─────────────────────────────────────────────────────
  const { searchParams } = new URL(req.url);

  const rawPage = parseInt(searchParams.get("page") ?? "1", 10);
  const rawLimit = parseInt(searchParams.get("limit") ?? "20", 10);

  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  const limit = isNaN(rawLimit) || rawLimit < 1 ? 20 : Math.min(rawLimit, 100);
  const skip = (page - 1) * limit;

  const search = searchParams.get("search")?.trim() ?? "";
  const statusFilter = searchParams.get("status")?.trim() ?? "";
  const emailFilter = searchParams.get("email")?.trim().toLowerCase() ?? "";

  const allowedSortFields: Record<string, string> = {
    createdAt: "createdAt",
    tracks: "tracks",
    release_date: "release_date",
    updatedAt: "updatedAt",
  };
  const rawSortBy = searchParams.get("sortBy") ?? "createdAt";
  const sortBy = allowedSortFields[rawSortBy] ?? "createdAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;

  // ── Build Mongoose filter ──────────────────────────────────────────────────
  const filter: FilterQuery<IOrderDocument> = {};

  // Search by email or order_id (case-insensitive regex)
  if (search) {
    const regex = { $regex: search, $options: "i" };
    filter.$or = [{ email: regex }, { order_id: regex }];
  }

  // Exact email filter (takes precedence over search for email field)
  if (emailFilter && !search) {
    filter.email = emailFilter;
  }

  // Filter by the most recent status entry
  if (statusFilter) {
    const allowedStatuses = [
      "unpaid",
      "pending",
      "verified",
      "in_progress",
      "completed",
    ];
    if (!allowedStatuses.includes(statusFilter)) {
      return NextResponse.json(
        {
          error: `Invalid status filter. Allowed: ${allowedStatuses.join(", ")}`,
        },
        { status: 400 }
      );
    }
    // Match orders whose last element of current_status matches the filter
    filter["current_status"] = {
      $elemMatch: { status: statusFilter },
    };
    // More precise: filter where the last status entry matches.
    // MongoDB doesn't natively support "last element" queries in a simple filter,
    // so we rely on the application-level convention that the last entry is current.
    // A more robust approach uses an aggregation pipeline — see below.
  }

  // ── Connect to DB ──────────────────────────────────────────────────────────
  try {
    await connectToDatabase();
  } catch (err) {
    console.error("[Admin GET /api/admin/orders] DB connection error:", err);
    return NextResponse.json(
      { error: "Database connection error." },
      { status: 500 }
    );
  }

  // ── Execute queries in parallel ────────────────────────────────────────────
  // If statusFilter is applied we use an aggregation to properly filter by
  // the *last* element of current_status; otherwise use a standard query.
  try {
    let orders;
    let total: number;

    if (statusFilter) {
      // Aggregation pipeline to filter by the last status entry
      const pipeline = [
        // Add a computed field "latest_status" = last element of current_status
        {
          $addFields: {
            latest_status_val: {
              $arrayElemAt: ["$current_status.status", -1],
            },
          },
        },
        // Apply all filters including status
        {
          $match: {
            latest_status_val: statusFilter,
            ...(search
              ? {
                  $or: [
                    { email: { $regex: search, $options: "i" } },
                    { order_id: { $regex: search, $options: "i" } },
                  ],
                }
              : {}),
            ...(emailFilter && !search ? { email: emailFilter } : {}),
          },
        },
      ];

      // Count total matching documents
      const countPipeline = [...pipeline, { $count: "total" }];
      const countResult = await Order.aggregate(countPipeline);
      total = countResult[0]?.total ?? 0;

      // Fetch paginated results
      const dataPipeline = [
        ...pipeline,
        { $sort: { [sortBy]: sortOrder } as Record<string, 1 | -1> },
        { $skip: skip },
        { $limit: limit },
        // Remove the computed field from the output
        { $project: { latest_status_val: 0 } },
      ];
      orders = await Order.aggregate(dataPipeline);
    } else {
      // Standard Mongoose query (faster for the common case)
      [orders, total] = await Promise.all([
        Order.find(filter)
          .sort({ [sortBy]: sortOrder })
          .skip(skip)
          .limit(limit)
          .lean(),
        Order.countDocuments(filter),
      ]);
    }

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      filters: {
        search: search || null,
        status: statusFilter || null,
        email: emailFilter || null,
        sortBy,
        sortOrder: sortOrder === 1 ? "asc" : "desc",
      },
    });
  } catch (err) {
    console.error("[Admin GET /api/admin/orders] Query error:", err);
    return NextResponse.json(
      { error: "Failed to fetch orders." },
      { status: 500 }
    );
  }
}
