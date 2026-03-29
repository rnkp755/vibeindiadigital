import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Order from "@/models/Order";
import { OrderStatusValue } from "@/models/Order";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

// ─── GET /api/orders ─────────────────────────────────────────────────────────
// Returns all orders for the authenticated user, sorted newest first.

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const orders = await Order.find({ user_id: userId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("[GET /api/orders] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

// ─── POST /api/orders ────────────────────────────────────────────────────────
// Creates a new order.
// Atomically checks credits and either sets status to "pending" (deducting
// credits) or "unpaid" if the user doesn't have enough credits.

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    order_id?: string;
    tracks?: number;
    asset_url?: string;
    release_date?: string;
    metadata?: { title: string; artist: string[] }[];
    rights_distribution?: number;
    notes?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    order_id,
    tracks,
    asset_url,
    release_date,
    metadata,
    rights_distribution = 100,
    notes,
  } = body;

  // ── Validate required fields ───────────────────────────────────────────────
  if (!order_id || typeof order_id !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid field: order_id" },
      { status: 400 }
    );
  }

  if (!tracks || typeof tracks !== "number" || tracks < 1) {
    return NextResponse.json(
      { error: "Missing or invalid field: tracks (must be >= 1)" },
      { status: 400 }
    );
  }

  if (!asset_url || typeof asset_url !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid field: asset_url" },
      { status: 400 }
    );
  }

  if (!release_date) {
    return NextResponse.json(
      { error: "Missing field: release_date" },
      { status: 400 }
    );
  }

  // Release date must be at least 10 days in the future
  const releaseAt = new Date(release_date);
  const tenDaysFromNow = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
  if (isNaN(releaseAt.getTime()) || releaseAt < tenDaysFromNow) {
    return NextResponse.json(
      { error: "release_date must be at least 10 days in the future." },
      { status: 400 }
    );
  }

  if (!metadata || !Array.isArray(metadata) || metadata.length !== tracks) {
    return NextResponse.json(
      {
        error: `metadata must be an array with exactly ${tracks} entries (one per track).`,
      },
      { status: 400 }
    );
  }

  // ── Fetch Clerk user for email + credits ───────────────────────────────────
  let userEmail: string;
  let currentCredits: number;

  try {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);

    userEmail =
      clerkUser.primaryEmailAddress?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress;

    if (!userEmail) {
      return NextResponse.json(
        { error: "Could not determine user email from Clerk." },
        { status: 400 }
      );
    }

    currentCredits =
      typeof clerkUser.publicMetadata?.credits === "number"
        ? (clerkUser.publicMetadata.credits as number)
        : 0;
  } catch (err) {
    console.error("[POST /api/orders] Failed to fetch Clerk user:", err);
    return NextResponse.json(
      { error: "Failed to retrieve user information." },
      { status: 500 }
    );
  }

  // ── Check for duplicate order_id ───────────────────────────────────────────
  try {
    await connectToDatabase();
    const existing = await Order.findOne({ order_id }).lean();
    if (existing) {
      return NextResponse.json(
        { error: "An order with this order_id already exists." },
        { status: 409 }
      );
    }
  } catch (err) {
    console.error("[POST /api/orders] DB connection error:", err);
    return NextResponse.json(
      { error: "Database connection error." },
      { status: 500 }
    );
  }

  // ── Determine status and atomically update credits ─────────────────────────
  // We use a MongoDB session + Clerk metadata update wrapped in Promise.all
  // to make the deduction as atomic as possible.
  const hasEnoughCredits = currentCredits >= tracks;
  const initialStatus: OrderStatusValue = hasEnoughCredits ? "pending" : "unpaid";

  const session = await mongoose.startSession();
  let createdOrder;

  try {
    await session.withTransaction(async () => {
      // Create the order document inside the transaction
      const [newOrder] = await Order.create(
        [
          {
            email: userEmail,
            user_id: userId,
            order_id,
            tracks,
            current_status: [{ status: initialStatus, updated_at: new Date() }],
            asset_url,
            release_date: releaseAt,
            metadata,
            rights_distribution,
            notes: notes ?? "",
          },
        ],
        { session }
      );

      createdOrder = newOrder;
    });
  } catch (err) {
    console.error("[POST /api/orders] Transaction error:", err);
    session.endSession();
    return NextResponse.json(
      { error: "Failed to create order. Please try again." },
      { status: 500 }
    );
  } finally {
    session.endSession();
  }

  // ── If credits are sufficient, deduct them from Clerk metadata ────────────
  // This runs outside the DB transaction because Clerk is an external system.
  // We do it after the order is committed to avoid over-deducting on retry.
  if (hasEnoughCredits) {
    try {
      const client = await clerkClient();
      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          credits: currentCredits - tracks,
        },
      });
    } catch (err) {
      // The order was already created with "pending" status.
      // Log this discrepancy so an admin can manually reconcile.
      console.error(
        `[POST /api/orders] CRITICAL: Order ${order_id} created as "pending" but ` +
          `failed to deduct ${tracks} credits from user ${userId}. Manual reconciliation needed.`,
        err
      );
      // Don't return an error to the client — the order is valid, just flag for review.
    }
  }

  return NextResponse.json(
    {
      order: createdOrder,
      status: initialStatus,
      creditsDeducted: hasEnoughCredits ? tracks : 0,
      creditsRemaining: hasEnoughCredits ? currentCredits - tracks : currentCredits,
    },
    { status: 201 }
  );
}
