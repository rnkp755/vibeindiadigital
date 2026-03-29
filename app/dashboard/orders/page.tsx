import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { connectToDatabase } from "@/lib/mongodb";
import Order from "@/models/Order";
import { IOrder, OrderStatusValue } from "@/models/Order";
import {
  Music2,
  Calendar,
  Disc3,
  Clock,
  ArrowRight,
  CreditCard,
  PackageOpen,
  CheckCircle2,
  Loader2,
  XCircle,
  PlayCircle,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

// ─── Status helpers ────────────────────────────────────────────────────────────

interface StatusConfig {
  label: string;
  icon: React.ElementType;
  chipClass: string;
  dotClass: string;
}

const STATUS_CONFIG: Record<OrderStatusValue, StatusConfig> = {
  unpaid: {
    label: "Unpaid",
    icon: XCircle,
    chipClass:
      "border-amber-500/30 bg-amber-500/10 text-amber-400",
    dotClass: "bg-amber-400",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    chipClass:
      "border-blue-500/30 bg-blue-500/10 text-blue-400",
    dotClass: "bg-blue-400 animate-pulse",
  },
  verified: {
    label: "Verified",
    icon: ShieldCheck,
    chipClass:
      "border-violet-500/30 bg-violet-500/10 text-violet-400",
    dotClass: "bg-violet-400",
  },
  in_progress: {
    label: "In Progress",
    icon: PlayCircle,
    chipClass:
      "border-[#FF1B6B]/30 bg-[#FF1B6B]/10 text-[#FF1B6B]",
    dotClass: "bg-[#FF1B6B] animate-pulse",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    chipClass:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    dotClass: "bg-emerald-400",
  },
};

function getLatestStatus(order: IOrder): OrderStatusValue {
  if (!order.current_status || order.current_status.length === 0) {
    return "unpaid";
  }
  return order.current_status[order.current_status.length - 1].status;
}

function StatusChip({ status }: { status: OrderStatusValue }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold leading-none ${cfg.chipClass}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dotClass}`} />
      <Icon className="h-3 w-3 shrink-0" />
      {cfg.label}
    </span>
  );
}

// ─── Order Card ────────────────────────────────────────────────────────────────

function OrderCard({ order }: { order: IOrder }) {
  const latestStatus = getLatestStatus(order);
  const isUnpaid = latestStatus === "unpaid";
  const updatedAt =
    order.current_status?.[order.current_status.length - 1]?.updated_at;

  return (
    <div className="group relative rounded-2xl border border-white/[0.07] bg-white/[0.025] hover:border-white/[0.14] hover:bg-white/[0.04] transition-all duration-200 overflow-hidden">
      {/* Pink glow on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#FF1B6B]/0 to-[#FF1B6B]/0 group-hover:from-[#FF1B6B]/[0.03] group-hover:to-transparent transition-all duration-300 pointer-events-none" />

      <div className="relative p-5 sm:p-6">
        {/* ── Top row ── */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Icon */}
            <div className="w-10 h-10 rounded-xl bg-[#FF1B6B]/10 border border-[#FF1B6B]/20 flex items-center justify-center shrink-0">
              <Music2 className="h-5 w-5 text-[#FF1B6B]" />
            </div>

            {/* Order ID + tracks */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-gray-500">
                  Order
                </span>
                <Badge
                  variant="outline"
                  className="font-mono text-xs border-white/15 text-white bg-white/5 px-2 py-0.5"
                >
                  #{order.order_id}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <Disc3 className="h-3.5 w-3.5 text-gray-600 shrink-0" />
                <span className="text-sm text-gray-400">
                  {order.tracks} track{order.tracks !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Status — shown top-right on desktop */}
          <div className="shrink-0">
            <StatusChip status={latestStatus} />
          </div>
        </div>

        {/* ── Track list preview ── */}
        {order.metadata && order.metadata.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {order.metadata.slice(0, 3).map((m, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/8 text-gray-400 truncate max-w-[180px]"
              >
                <Music2 className="h-2.5 w-2.5 text-[#FF1B6B] shrink-0" />
                {m.title}
              </span>
            ))}
            {order.metadata.length > 3 && (
              <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/8 text-gray-600">
                +{order.metadata.length - 3} more
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-700 mb-4 italic">
            No track metadata added yet
          </p>
        )}

        {/* ── Meta row (dates) ── */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-5 text-xs text-gray-600">
          {order.release_date && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3 shrink-0" />
              Release:{" "}
              <span className="text-gray-400 font-medium">
                {format(new Date(order.release_date), "MMM d, yyyy")}
              </span>
            </span>
          )}
          {updatedAt && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 shrink-0" />
              Updated:{" "}
              <span className="text-gray-400">
                {format(new Date(updatedAt), "MMM d, yyyy")}
              </span>
            </span>
          )}
        </div>

        {/* ── Action row ── */}
        <div className="flex items-center gap-3">
          {isUnpaid ? (
            <>
              {/* Pay Now CTA */}
              <Link href="/dashboard/buy-credits" className="flex-1">
                <Button className="w-full bg-[#FF1B6B] hover:bg-[#FF1B6B]/90 text-white font-semibold h-9 text-sm shadow-lg shadow-[#FF1B6B]/20 transition-all">
                  <CreditCard className="h-3.5 w-3.5 mr-2" />
                  Pay Now
                </Button>
              </Link>

              {/* View details (secondary) */}
              <Link href={`/dashboard/order/${order.order_id}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 border-white/15 text-gray-400 hover:text-white hover:border-white/25 bg-transparent text-sm"
                >
                  Details
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </Link>
            </>
          ) : (
            <Link href={`/dashboard/order/${order.order_id}`} className="flex-1">
              <Button
                variant="outline"
                className="w-full h-9 border-white/12 text-gray-300 hover:text-white hover:border-white/25 hover:bg-white/5 bg-transparent text-sm font-medium transition-all group/btn"
              >
                View Order Details
                <ArrowRight className="h-3.5 w-3.5 ml-2 group-hover/btn:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmptyOrders() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/8 flex items-center justify-center mb-5">
        <PackageOpen className="h-8 w-8 text-gray-600" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">No orders yet</h3>
      <p className="text-sm text-gray-500 max-w-xs leading-relaxed mb-6">
        You haven't placed any distribution orders. Upload your first release
        to get started.
      </p>
      <Link href="/dashboard/create-order">
        <Button className="bg-[#FF1B6B] hover:bg-[#FF1B6B]/90 text-white font-semibold shadow-lg shadow-[#FF1B6B]/20">
          Create Your First Order
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}

// ─── Status filter tabs ────────────────────────────────────────────────────────

const STATUS_TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unpaid", label: "Unpaid" },
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  searchParams: { status?: string };
}

export default async function OrdersPage({ searchParams }: PageProps) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // ── Fetch orders from DB ───────────────────────────────────────────────────
  let orders: IOrder[] = [];
  let fetchError: string | null = null;

  try {
    await connectToDatabase();
    orders = await Order.find({ user_id: userId })
      .sort({ createdAt: -1 })
      .lean();
  } catch (err) {
    console.error("[OrdersPage] DB error:", err);
    fetchError = "Failed to load orders. Please refresh the page.";
  }

  // ── Clerk user (for email / credit display) ────────────────────────────────
  let credits = 0;
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    credits =
      typeof user.publicMetadata?.credits === "number"
        ? (user.publicMetadata.credits as number)
        : 0;
  } catch {
    /* non-critical */
  }

  // ── Apply status filter ────────────────────────────────────────────────────
  const statusFilter = searchParams?.status ?? "all";
  const filteredOrders =
    statusFilter === "all"
      ? orders
      : orders.filter((o) => getLatestStatus(o) === statusFilter);

  // ── Count by status for badges ─────────────────────────────────────────────
  const countByStatus: Record<string, number> = { all: orders.length };
  orders.forEach((o) => {
    const s = getLatestStatus(o);
    countByStatus[s] = (countByStatus[s] ?? 0) + 1;
  });

  const unpaidCount = countByStatus["unpaid"] ?? 0;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#0a0a0a] text-white">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[400px] rounded-full bg-[#FF1B6B]/5 blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              My <span className="text-[#FF1B6B]">Orders</span>
            </h1>
            <p className="mt-1.5 text-sm text-gray-500">
              {orders.length} order{orders.length !== 1 ? "s" : ""} · {credits}{" "}
              credit{credits !== 1 ? "s" : ""} remaining
            </p>
          </div>

          <Link href="/dashboard/create-order">
            <Button className="bg-[#FF1B6B] hover:bg-[#FF1B6B]/90 text-white font-semibold shadow-md shadow-[#FF1B6B]/20 h-9 text-sm">
              + New Order
            </Button>
          </Link>
        </div>

        {/* ── Unpaid banner ──────────────────────────────────────────────────── */}
        {unpaidCount > 0 && (
          <div className="mb-6 rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/25 flex items-center justify-center shrink-0">
              <CreditCard className="h-4 w-4 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-300">
                {unpaidCount} unpaid order{unpaidCount !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-amber-500/80 mt-0.5">
                Buy credits to activate {unpaidCount !== 1 ? "them" : "it"} and
                start distribution.
              </p>
            </div>
            <Link href="/dashboard/buy-credits" className="shrink-0">
              <Button
                size="sm"
                className="h-8 text-xs bg-amber-500 hover:bg-amber-400 text-black font-bold"
              >
                Buy Credits
              </Button>
            </Link>
          </div>
        )}

        {/* ── Error state ────────────────────────────────────────────────────── */}
        {fetchError && (
          <div className="mb-6 rounded-xl border border-red-500/25 bg-red-500/8 px-4 py-3 flex items-center gap-2 text-red-400">
            <XCircle className="h-4 w-4 shrink-0" />
            <p className="text-sm">{fetchError}</p>
          </div>
        )}

        {/* ── Status filter tabs ─────────────────────────────────────────────── */}
        {orders.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mb-6">
            {STATUS_TABS.map((tab) => {
              const count = countByStatus[tab.value] ?? 0;
              const isActive = statusFilter === tab.value;

              if (tab.value !== "all" && count === 0) return null;

              return (
                <Link
                  key={tab.value}
                  href={
                    tab.value === "all"
                      ? "/dashboard/orders"
                      : `/dashboard/orders?status=${tab.value}`
                  }
                  className={[
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
                    isActive
                      ? "bg-[#FF1B6B]/15 border-[#FF1B6B]/30 text-[#FF1B6B]"
                      : "bg-white/[0.03] border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20",
                  ].join(" ")}
                >
                  {tab.label}
                  {count > 0 && (
                    <span
                      className={[
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center leading-none",
                        isActive
                          ? "bg-[#FF1B6B]/20 text-[#FF1B6B]"
                          : "bg-white/8 text-gray-500",
                      ].join(" ")}
                    >
                      {count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* ── Orders list ────────────────────────────────────────────────────── */}
        {!fetchError && filteredOrders.length === 0 ? (
          orders.length === 0 ? (
            <EmptyOrders />
          ) : (
            <div className="flex flex-col items-center py-16 text-center">
              <Loader2 className="h-8 w-8 text-gray-700 mb-4" />
              <p className="text-gray-500 text-sm">
                No{" "}
                <span className="text-gray-400 font-medium">
                  {statusFilter.replace("_", " ")}
                </span>{" "}
                orders found.
              </p>
              <Link
                href="/dashboard/orders"
                className="text-[#FF1B6B] text-sm mt-3 hover:underline"
              >
                Show all orders
              </Link>
            </div>
          )
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <OrderCard key={order.order_id} order={order as IOrder} />
            ))}
          </div>
        )}

        {/* ── Bottom help text ───────────────────────────────────────────────── */}
        {orders.length > 0 && (
          <p className="text-center text-xs text-gray-700 mt-10">
            Click an order to view details and track its distribution status.
          </p>
        )}
      </div>
    </div>
  );
}
