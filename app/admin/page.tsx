import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { connectToDatabase } from "@/lib/mongodb";
import Order from "@/models/Order";
import { IOrder, OrderStatusValue } from "@/models/Order";
import { format } from "date-fns";
import {
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Music2,
  Calendar,
  Disc3,
  Clock,
  CheckCircle2,
  XCircle,
  PlayCircle,
  ShieldCheck,
  Download,
  Eye,
  CreditCard,
  Users,
  BarChart3,
  Filter,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AdminOrderActions } from "@/components/admin/AdminOrderActions";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: {
    page?: string;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
    limit?: string;
  };
}

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  OrderStatusValue,
  { label: string; chipClass: string; dotClass: string; icon: React.ElementType }
> = {
  unpaid: {
    label: "Unpaid",
    chipClass: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    dotClass: "bg-amber-400",
    icon: XCircle,
  },
  pending: {
    label: "Pending",
    chipClass: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    dotClass: "bg-blue-400 animate-pulse",
    icon: Clock,
  },
  verified: {
    label: "Verified",
    chipClass: "border-violet-500/30 bg-violet-500/10 text-violet-400",
    dotClass: "bg-violet-400",
    icon: ShieldCheck,
  },
  in_progress: {
    label: "In Progress",
    chipClass: "border-[#FF1B6B]/30 bg-[#FF1B6B]/10 text-[#FF1B6B]",
    dotClass: "bg-[#FF1B6B] animate-pulse",
    icon: PlayCircle,
  },
  completed: {
    label: "Completed",
    chipClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    dotClass: "bg-emerald-400",
    icon: CheckCircle2,
  },
};

function getLatestStatus(order: IOrder): OrderStatusValue {
  if (!order.current_status || order.current_status.length === 0) return "unpaid";
  return order.current_status[order.current_status.length - 1].status;
}

function StatusChip({ status }: { status: OrderStatusValue }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold leading-none whitespace-nowrap ${cfg.chipClass}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dotClass}`} />
      <Icon className="h-3 w-3 shrink-0" />
      {cfg.label}
    </span>
  );
}

// ─── Sort link helper ──────────────────────────────────────────────────────────

interface SortLinkProps {
  field: string;
  label: string;
  currentSortBy: string;
  currentSortOrder: string;
  searchParams: PageProps["searchParams"];
}

function buildUrl(
  base: string,
  params: Record<string, string | undefined>
): string {
  const url = new URL(base, "http://localhost");
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== "") url.searchParams.set(key, val);
  });
  return url.pathname + "?" + url.searchParams.toString();
}

function SortLink({
  field,
  label,
  currentSortBy,
  currentSortOrder,
  searchParams,
}: SortLinkProps) {
  const isActive = currentSortBy === field;
  const nextOrder =
    isActive && currentSortOrder === "desc" ? "asc" : "desc";

  const href = buildUrl("/admin", {
    ...searchParams,
    sortBy: field,
    sortOrder: nextOrder,
    page: "1",
  });

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
        isActive ? "text-[#FF1B6B]" : "text-gray-600 hover:text-gray-400"
      }`}
    >
      {label}
      <ArrowUpDown
        className={`h-3 w-3 ${
          isActive ? "text-[#FF1B6B]" : "text-gray-700"
        }`}
      />
      {isActive && (
        <span className="text-[10px] text-gray-600">
          {currentSortOrder === "asc" ? "↑" : "↓"}
        </span>
      )}
    </Link>
  );
}

// ─── Stats Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3.5 flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}18`, border: `1px solid ${color}30` }}
      >
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div>
        <p className="text-xl font-black text-white leading-none">{value}</p>
        <p className="text-xs text-gray-600 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  // ── Auth + admin check ─────────────────────────────────────────────────────
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  try {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const role = (clerkUser.publicMetadata as { role?: string })?.role;
    if (role !== "admin") redirect("/dashboard");
  } catch {
    redirect("/dashboard");
  }

  // ── Parse query params ─────────────────────────────────────────────────────
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const limit = Math.min(50, Math.max(5, parseInt(searchParams.limit ?? "20", 10)));
  const skip = (page - 1) * limit;
  const search = searchParams.search?.trim() ?? "";
  const statusFilter = searchParams.status?.trim() ?? "";
  const sortBy = searchParams.sortBy ?? "createdAt";
  const sortOrder = searchParams.sortOrder === "asc" ? 1 : -1;

  // ── DB query ───────────────────────────────────────────────────────────────
  await connectToDatabase();

  // Build base filter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let baseFilter: Record<string, any> = {};
  if (search) {
    baseFilter.$or = [
      { email: { $regex: search, $options: "i" } },
      { order_id: { $regex: search, $options: "i" } },
    ];
  }

  const allowedSortFields: Record<string, string> = {
    createdAt: "createdAt",
    tracks: "tracks",
    release_date: "release_date",
    updatedAt: "updatedAt",
  };
  const safeSortBy = allowedSortFields[sortBy] ?? "createdAt";

  let orders: IOrder[] = [];
  let total = 0;

  // ── Stats (aggregate over all orders, no filter) ───────────────────────────
  const [statsResult] = await Order.aggregate([
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalTracks: { $sum: "$tracks" },
        unpaid: {
          $sum: {
            $cond: [
              {
                $eq: [
                  { $arrayElemAt: ["$current_status.status", -1] },
                  "unpaid",
                ],
              },
              1,
              0,
            ],
          },
        },
        completed: {
          $sum: {
            $cond: [
              {
                $eq: [
                  { $arrayElemAt: ["$current_status.status", -1] },
                  "completed",
                ],
              },
              1,
              0,
            ],
          },
        },
        in_progress: {
          $sum: {
            $cond: [
              {
                $eq: [
                  { $arrayElemAt: ["$current_status.status", -1] },
                  "in_progress",
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  try {
    if (statusFilter) {
      // Aggregation pipeline to filter by last status entry
      const pipeline = [
        {
          $addFields: {
            latest_status_val: {
              $arrayElemAt: ["$current_status.status", -1],
            },
          },
        },
        {
          $match: {
            latest_status_val: statusFilter,
            ...baseFilter,
          },
        },
      ];

      const [countResult] = await Order.aggregate([
        ...pipeline,
        { $count: "total" },
      ]);
      total = countResult?.total ?? 0;

      orders = await Order.aggregate([
        ...pipeline,
        { $sort: { [safeSortBy]: sortOrder } as Record<string, 1 | -1> },
        { $skip: skip },
        { $limit: limit },
        { $project: { latest_status_val: 0 } },
      ]);
    } else {
      [orders, total] = await Promise.all([
        Order.find(baseFilter)
          .sort({ [safeSortBy]: sortOrder })
          .skip(skip)
          .limit(limit)
          .lean(),
        Order.countDocuments(baseFilter),
      ]);
    }
  } catch (err) {
    console.error("[AdminOrdersPage] DB error:", err);
  }

  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  // ── Pagination URL builder ─────────────────────────────────────────────────
  function pageUrl(p: number) {
    return buildUrl("/admin", {
      ...searchParams,
      page: String(p),
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[400px] rounded-full bg-amber-500/4 blur-[140px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[300px] rounded-full bg-[#FF1B6B]/4 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-5 w-5 text-amber-400" />
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                Admin
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
              Orders <span className="text-[#FF1B6B]">Dashboard</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              All customer orders · {total.toLocaleString()} result
              {total !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/admin/payments">
              <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-sm text-gray-400 hover:text-white hover:border-white/20 transition-all">
                <CreditCard className="h-4 w-4" />
                Payments
              </button>
            </Link>
            <Link href={pageUrl(page)}>
              <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-sm text-gray-400 hover:text-white hover:border-white/20 transition-all">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </Link>
          </div>
        </div>

        {/* ── Stats row ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
          <StatCard
            label="Total Orders"
            value={(statsResult?.totalOrders ?? 0).toLocaleString()}
            icon={BarChart3}
            color="#FF1B6B"
          />
          <StatCard
            label="Total Tracks"
            value={(statsResult?.totalTracks ?? 0).toLocaleString()}
            icon={Disc3}
            color="#8B5CF6"
          />
          <StatCard
            label="Unpaid"
            value={(statsResult?.unpaid ?? 0).toLocaleString()}
            icon={XCircle}
            color="#F59E0B"
          />
          <StatCard
            label="Completed"
            value={(statsResult?.completed ?? 0).toLocaleString()}
            icon={CheckCircle2}
            color="#10B981"
          />
        </div>

        {/* ── Filters bar ──────────────────────────────────────────────────── */}
        <form
          method="GET"
          action="/admin"
          className="flex flex-wrap gap-2 mb-6 items-end"
        >
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search by email or order ID…"
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-white/10 bg-[#1a1a1a] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#FF1B6B]/50 focus:ring-1 focus:ring-[#FF1B6B]/20 transition-all"
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
            <select
              name="status"
              defaultValue={statusFilter}
              className="h-9 pl-9 pr-3 rounded-lg border border-white/10 bg-[#1a1a1a] text-sm text-white focus:outline-none focus:border-[#FF1B6B]/50 transition-all appearance-none cursor-pointer min-w-[140px]"
            >
              <option value="">All Statuses</option>
              <option value="unpaid">Unpaid</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Rows per page */}
          <div className="relative">
            <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
            <select
              name="limit"
              defaultValue={String(limit)}
              className="h-9 pl-9 pr-3 rounded-lg border border-white/10 bg-[#1a1a1a] text-sm text-white focus:outline-none focus:border-[#FF1B6B]/50 transition-all appearance-none cursor-pointer"
            >
              <option value="10">10 / page</option>
              <option value="20">20 / page</option>
              <option value="50">50 / page</option>
            </select>
          </div>

          {/* Hidden carry-through params */}
          <input type="hidden" name="sortBy" value={sortBy} />
          <input type="hidden" name="sortOrder" value={sortOrder === 1 ? "asc" : "desc"} />
          <input type="hidden" name="page" value="1" />

          <button
            type="submit"
            className="h-9 px-4 rounded-lg bg-[#FF1B6B]/15 border border-[#FF1B6B]/25 text-[#FF1B6B] text-sm font-semibold hover:bg-[#FF1B6B]/25 transition-all"
          >
            Apply
          </button>

          {/* Clear filters */}
          {(search || statusFilter) && (
            <Link
              href="/admin"
              className="h-9 px-3 rounded-lg border border-white/10 bg-white/[0.03] text-sm text-gray-500 hover:text-white hover:border-white/20 transition-all flex items-center"
            >
              Clear
            </Link>
          )}
        </form>

        {/* ── Active filter chips ───────────────────────────────────────────── */}
        {(search || statusFilter) && (
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <span className="text-xs text-gray-600">Filters:</span>
            {search && (
              <Badge
                variant="outline"
                className="text-xs border-white/15 text-gray-400 bg-white/5 gap-1.5"
              >
                <Search className="h-3 w-3" />
                &quot;{search}&quot;
              </Badge>
            )}
            {statusFilter && (
              <Badge
                variant="outline"
                className={`text-xs gap-1.5 ${
                  STATUS_CONFIG[statusFilter as OrderStatusValue]?.chipClass ??
                  "border-white/15 text-gray-400 bg-white/5"
                }`}
              >
                <Filter className="h-3 w-3" />
                {STATUS_CONFIG[statusFilter as OrderStatusValue]?.label ??
                  statusFilter}
              </Badge>
            )}
          </div>
        )}

        {/* ── Table ────────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
          {/* Table header */}
          <div className="hidden lg:grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
            <SortLink
              field="createdAt"
              label="Order"
              currentSortBy={sortBy}
              currentSortOrder={sortOrder === 1 ? "asc" : "desc"}
              searchParams={searchParams}
            />
            <SortLink
              field="tracks"
              label="Tracks"
              currentSortBy={sortBy}
              currentSortOrder={sortOrder === 1 ? "asc" : "desc"}
              searchParams={searchParams}
            />
            <SortLink
              field="release_date"
              label="Release"
              currentSortBy={sortBy}
              currentSortOrder={sortOrder === 1 ? "asc" : "desc"}
              searchParams={searchParams}
            />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">
              Status
            </span>
            <SortLink
              field="updatedAt"
              label="Updated"
              currentSortBy={sortBy}
              currentSortOrder={sortOrder === 1 ? "asc" : "desc"}
              searchParams={searchParams}
            />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">
              Actions
            </span>
          </div>

          {/* Rows */}
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/8 flex items-center justify-center mb-4">
                <BarChart3 className="h-7 w-7 text-gray-600" />
              </div>
              <p className="text-gray-500 font-medium mb-1">No orders found</p>
              <p className="text-xs text-gray-700">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {orders.map((order) => {
                const latestStatus = getLatestStatus(order as IOrder);
                const createdAt = order.createdAt
                  ? format(new Date(order.createdAt), "MMM d, yyyy")
                  : "—";
                const updatedAt =
                  order.current_status &&
                  order.current_status.length > 0
                    ? format(
                        new Date(
                          order.current_status[
                            order.current_status.length - 1
                          ].updated_at
                        ),
                        "MMM d, yy"
                      )
                    : "—";

                return (
                  <div
                    key={order.order_id}
                    className="group px-5 py-4 hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Mobile layout */}
                    <div className="lg:hidden space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-[#FF1B6B]/10 border border-[#FF1B6B]/20 flex items-center justify-center shrink-0">
                            <Music2 className="h-4 w-4 text-[#FF1B6B]" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-sm font-bold text-white">
                                #{order.order_id}
                              </span>
                              <StatusChip status={latestStatus} />
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                              {order.email}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <Disc3 className="h-3 w-3" />
                          {order.tracks} track
                          {order.tracks !== 1 ? "s" : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {createdAt}
                        </span>
                        {order.release_date && (
                          <span className="flex items-center gap-1">
                            <PlayCircle className="h-3 w-3" />
                            {format(
                              new Date(order.release_date),
                              "MMM d, yyyy"
                            )}
                          </span>
                        )}
                      </div>

                      <AdminOrderActions
                        orderId={order.order_id}
                        currentStatus={latestStatus}
                        assetUrl={order.asset_url}
                        email={order.email}
                      />
                    </div>

                    {/* Desktop layout */}
                    <div className="hidden lg:grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 items-center">
                      {/* Order + email */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[#FF1B6B]/10 border border-[#FF1B6B]/20 flex items-center justify-center shrink-0">
                          <Music2 className="h-4 w-4 text-[#FF1B6B]" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-white">
                              #{order.order_id}
                            </span>
                            <span className="text-xs text-gray-600">
                              {createdAt}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 truncate max-w-[200px]">
                            {order.email}
                          </p>
                          {order.metadata && order.metadata.length > 0 && (
                            <p className="text-xs text-gray-700 truncate max-w-[200px] mt-0.5">
                              {order.metadata[0]?.title}
                              {order.metadata.length > 1
                                ? ` +${order.metadata.length - 1} more`
                                : ""}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Tracks */}
                      <div className="flex items-center gap-1.5 text-sm text-gray-400">
                        <Disc3 className="h-4 w-4 text-gray-600 shrink-0" />
                        <span className="tabular-nums font-medium">
                          {order.tracks}
                        </span>
                      </div>

                      {/* Release date */}
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap">
                        <Calendar className="h-3.5 w-3.5 text-gray-600 shrink-0" />
                        {order.release_date
                          ? format(new Date(order.release_date), "MMM d, yyyy")
                          : "—"}
                      </div>

                      {/* Status */}
                      <StatusChip status={latestStatus} />

                      {/* Updated at */}
                      <span className="text-xs text-gray-600 whitespace-nowrap tabular-nums">
                        {updatedAt}
                      </span>

                      {/* Actions */}
                      <AdminOrderActions
                        orderId={order.order_id}
                        currentStatus={latestStatus}
                        assetUrl={order.asset_url}
                        email={order.email}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Pagination ───────────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 mt-6">
            <p className="text-xs text-gray-600 shrink-0">
              Showing{" "}
              <span className="text-gray-400 font-medium">
                {(page - 1) * limit + 1}–{Math.min(page * limit, total)}
              </span>{" "}
              of{" "}
              <span className="text-gray-400 font-medium">
                {total.toLocaleString()}
              </span>{" "}
              orders
            </p>

            <div className="flex items-center gap-1.5">
              {/* Prev */}
              {hasPrev ? (
                <Link
                  href={pageUrl(page - 1)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-sm text-gray-400 hover:text-white hover:border-white/20 transition-all"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Link>
              ) : (
                <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/[0.05] bg-white/[0.01] text-sm text-gray-700 cursor-not-allowed">
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </span>
              )}

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p: number;
                  if (totalPages <= 5) {
                    p = i + 1;
                  } else if (page <= 3) {
                    p = i + 1;
                  } else if (page >= totalPages - 2) {
                    p = totalPages - 4 + i;
                  } else {
                    p = page - 2 + i;
                  }

                  return (
                    <Link
                      key={p}
                      href={pageUrl(p)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                        p === page
                          ? "bg-[#FF1B6B] text-white border border-[#FF1B6B]"
                          : "border border-white/10 bg-white/[0.03] text-gray-400 hover:text-white hover:border-white/20"
                      }`}
                    >
                      {p}
                    </Link>
                  );
                })}
              </div>

              {/* Next */}
              {hasNext ? (
                <Link
                  href={pageUrl(page + 1)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-sm text-gray-400 hover:text-white hover:border-white/20 transition-all"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/[0.05] bg-white/[0.01] text-sm text-gray-700 cursor-not-allowed">
                  Next
                  <ChevronRight className="h-4 w-4" />
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── No results + total shown ──────────────────────────────────────── */}
        {orders.length > 0 && totalPages <= 1 && (
          <p className="text-center text-xs text-gray-700 mt-6">
            Showing all {total} order{total !== 1 ? "s" : ""}.
          </p>
        )}
      </div>
    </div>
  );
}
