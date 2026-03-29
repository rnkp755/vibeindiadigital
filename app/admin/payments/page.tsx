import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { connectToDatabase } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import { IPayment } from "@/models/Payment";
import { IAvailablePlan } from "@/models/Plan";
import "@/models/Plan";
import { format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  SlidersHorizontal,
  RefreshCw,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CreditCard,
  Coins,
  Tag,
  Phone,
  BarChart3,
  TrendingUp,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AdminPaymentActions } from "@/components/admin/AdminPaymentActions";

// ─── Types ─────────────────────────────────────────────────────────────────────

type PaymentStatus = "pending" | "needs_review" | "completed";

interface PageProps {
  searchParams: {
    page?: string;
    limit?: string;
    status?: string;
    email?: string;
    token?: string;
    sortBy?: string;
    sortOrder?: string;
  };
}

type PopulatedPayment = Omit<IPayment, "plan"> & {
  plan: Pick<IAvailablePlan, "name" | "credits" | "amount">;
};

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  PaymentStatus,
  {
    label: string;
    chipClass: string;
    dotClass: string;
    icon: React.ElementType;
  }
> = {
  pending: {
    label: "Pending",
    chipClass: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    dotClass: "bg-blue-400 animate-pulse",
    icon: Clock,
  },
  needs_review: {
    label: "Needs Review",
    chipClass: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    dotClass: "bg-amber-400 animate-pulse",
    icon: AlertTriangle,
  },
  completed: {
    label: "Completed",
    chipClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    dotClass: "bg-emerald-400",
    icon: CheckCircle2,
  },
};

function StatusChip({ status }: { status: PaymentStatus }) {
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

// ─── Helpers ───────────────────────────────────────────────────────────────────

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

// ─── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  subValue,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  subValue?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-4 flex items-start gap-3">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
        style={{
          backgroundColor: `${color}18`,
          border: `1px solid ${color}30`,
        }}
      >
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-black text-white leading-none">{value}</p>
        {subValue && (
          <p className="text-xs font-semibold mt-0.5" style={{ color }}>
            {subValue}
          </p>
        )}
        <p className="text-xs text-gray-600 mt-1">{label}</p>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPaymentsPage({ searchParams }: PageProps) {
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
  const limit = Math.min(
    50,
    Math.max(5, parseInt(searchParams.limit ?? "20", 10))
  );
  const skip = (page - 1) * limit;

  const statusFilter = searchParams.status?.trim() ?? "";
  const emailFilter = searchParams.email?.trim() ?? "";
  const tokenFilter = searchParams.token?.trim() ?? "";
  const sortBy = searchParams.sortBy ?? "createdAt";
  const sortOrder = searchParams.sortOrder === "asc" ? 1 : -1;

  // ── Build filter ───────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};

  const allowedStatuses: PaymentStatus[] = [
    "pending",
    "needs_review",
    "completed",
  ];
  if (statusFilter && allowedStatuses.includes(statusFilter as PaymentStatus)) {
    filter.payment_status = statusFilter;
  }

  if (emailFilter) {
    filter.email = { $regex: emailFilter, $options: "i" };
  }

  if (tokenFilter) {
    filter.token = { $regex: tokenFilter, $options: "i" };
  }

  const allowedSortFields: Record<string, string> = {
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    amount: "amount",
    payment_status: "payment_status",
    email: "email",
  };
  const safeSortBy = allowedSortFields[sortBy] ?? "createdAt";

  // ── DB queries ─────────────────────────────────────────────────────────────
  await connectToDatabase();

  // Stats (aggregate over ALL payments, ignoring current filter)
  const [statsResult] = await Payment.aggregate([
    {
      $group: {
        _id: null,
        total_amount: { $sum: "$amount" },
        completed_amount: {
          $sum: {
            $cond: [{ $eq: ["$payment_status", "completed"] }, "$amount", 0],
          },
        },
        pending_count: {
          $sum: {
            $cond: [{ $eq: ["$payment_status", "pending"] }, 1, 0],
          },
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
        total_count: { $sum: 1 },
      },
    },
  ]);

  let payments: PopulatedPayment[] = [];
  let total = 0;

  try {
    [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate("plan", "name credits amount")
        .sort({ [safeSortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean() as unknown as Promise<PopulatedPayment[]>,
      Payment.countDocuments(filter),
    ]);
  } catch (err) {
    console.error("[AdminPaymentsPage] DB query error:", err);
  }

  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  function pageUrl(p: number) {
    return buildUrl("/admin/payments", {
      ...searchParams,
      page: String(p),
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-[500px] h-[400px] rounded-full bg-emerald-500/4 blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] rounded-full bg-amber-500/4 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link
                href="/admin"
                className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-400 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Orders Dashboard
              </Link>
              <span className="text-gray-700">/</span>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                  Admin
                </span>
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
              Payment <span className="text-[#FF1B6B]">Logs</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {total.toLocaleString()} payment
              {total !== 1 ? "s" : ""} ·{" "}
              {statsResult?.needs_review_count ?? 0} need
              {(statsResult?.needs_review_count ?? 0) !== 1 ? "" : "s"} review
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href={pageUrl(page)}>
              <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-sm text-gray-400 hover:text-white hover:border-white/20 transition-all">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </Link>
          </div>
        </div>

        {/* ── Stats row ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
          <StatCard
            label="Total Revenue"
            value={`₹${(statsResult?.total_amount ?? 0).toLocaleString("en-IN")}`}
            subValue={`₹${(statsResult?.completed_amount ?? 0).toLocaleString(
              "en-IN"
            )} collected`}
            icon={TrendingUp}
            color="#10B981"
          />
          <StatCard
            label="Completed"
            value={(statsResult?.completed_count ?? 0).toLocaleString()}
            icon={CheckCircle2}
            color="#10B981"
          />
          <StatCard
            label="Needs Review"
            value={(statsResult?.needs_review_count ?? 0).toLocaleString()}
            icon={AlertTriangle}
            color="#F59E0B"
          />
          <StatCard
            label="Pending"
            value={(statsResult?.pending_count ?? 0).toLocaleString()}
            icon={Clock}
            color="#60A5FA"
          />
        </div>

        {/* ── Alert banner: needs review ───────────────────────────────────── */}
        {(statsResult?.needs_review_count ?? 0) > 0 && !statusFilter && (
          <div className="mb-6 rounded-xl border border-amber-500/25 bg-amber-500/6 px-5 py-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/25 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4.5 w-4.5 text-amber-400 h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-300">
                {statsResult.needs_review_count} payment
                {statsResult.needs_review_count !== 1 ? "s" : ""} require
                {statsResult.needs_review_count === 1 ? "s" : ""} manual review
              </p>
              <p className="text-xs text-amber-500/70 mt-0.5">
                These payments could not be automatically verified via OCR.
                Please review the uploaded screenshots and approve or reject.
              </p>
            </div>
            <Link
              href={buildUrl("/admin/payments", {
                ...searchParams,
                status: "needs_review",
                page: "1",
              })}
              className="shrink-0"
            >
              <button className="h-8 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-all">
                Review Now
              </button>
            </Link>
          </div>
        )}

        {/* ── Filters bar ────────────────────────────────────────────────────── */}
        <form
          method="GET"
          action="/admin/payments"
          className="flex flex-wrap gap-2 mb-6 items-end"
        >
          {/* Email search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            <input
              type="text"
              name="email"
              defaultValue={emailFilter}
              placeholder="Search by email…"
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-white/10 bg-[#1a1a1a] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#FF1B6B]/50 focus:ring-1 focus:ring-[#FF1B6B]/20 transition-all"
            />
          </div>

          {/* Token search */}
          <div className="relative min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            <input
              type="text"
              name="token"
              defaultValue={tokenFilter}
              placeholder="Search by token…"
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-white/10 bg-[#1a1a1a] text-sm text-white placeholder:text-gray-600 font-mono focus:outline-none focus:border-[#FF1B6B]/50 focus:ring-1 focus:ring-[#FF1B6B]/20 transition-all"
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
            <select
              name="status"
              defaultValue={statusFilter}
              className="h-9 pl-9 pr-3 rounded-lg border border-white/10 bg-[#1a1a1a] text-sm text-white focus:outline-none focus:border-[#FF1B6B]/50 transition-all appearance-none cursor-pointer min-w-[160px]"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="needs_review">Needs Review</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Sort by */}
          <div className="relative">
            <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
            <select
              name="sortBy"
              defaultValue={sortBy}
              className="h-9 pl-9 pr-3 rounded-lg border border-white/10 bg-[#1a1a1a] text-sm text-white focus:outline-none focus:border-[#FF1B6B]/50 transition-all appearance-none cursor-pointer"
            >
              <option value="createdAt">Date Created</option>
              <option value="updatedAt">Date Updated</option>
              <option value="amount">Amount</option>
              <option value="payment_status">Status</option>
              <option value="email">Email</option>
            </select>
          </div>

          {/* Sort order */}
          <select
            name="sortOrder"
            defaultValue={sortOrder === 1 ? "asc" : "desc"}
            className="h-9 px-3 rounded-lg border border-white/10 bg-[#1a1a1a] text-sm text-white focus:outline-none focus:border-[#FF1B6B]/50 transition-all appearance-none cursor-pointer"
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>

          {/* Rows per page */}
          <select
            name="limit"
            defaultValue={String(limit)}
            className="h-9 px-3 rounded-lg border border-white/10 bg-[#1a1a1a] text-sm text-white focus:outline-none focus:border-[#FF1B6B]/50 transition-all appearance-none cursor-pointer"
          >
            <option value="10">10 / page</option>
            <option value="20">20 / page</option>
            <option value="50">50 / page</option>
          </select>

          <input type="hidden" name="page" value="1" />

          <button
            type="submit"
            className="h-9 px-4 rounded-lg bg-[#FF1B6B]/15 border border-[#FF1B6B]/25 text-[#FF1B6B] text-sm font-semibold hover:bg-[#FF1B6B]/25 transition-all"
          >
            Apply
          </button>

          {(statusFilter || emailFilter || tokenFilter) && (
            <Link
              href="/admin/payments"
              className="h-9 px-3 rounded-lg border border-white/10 bg-white/[0.03] text-sm text-gray-500 hover:text-white hover:border-white/20 transition-all flex items-center"
            >
              Clear
            </Link>
          )}
        </form>

        {/* ── Active filter chips ─────────────────────────────────────────────── */}
        {(statusFilter || emailFilter || tokenFilter) && (
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <span className="text-xs text-gray-600">Filters:</span>
            {emailFilter && (
              <Badge
                variant="outline"
                className="text-xs border-white/15 text-gray-400 bg-white/5 gap-1.5"
              >
                <Search className="h-3 w-3" />
                email: &quot;{emailFilter}&quot;
              </Badge>
            )}
            {tokenFilter && (
              <Badge
                variant="outline"
                className="text-xs border-white/15 text-gray-400 bg-white/5 gap-1.5 font-mono"
              >
                token: &quot;{tokenFilter}&quot;
              </Badge>
            )}
            {statusFilter && (
              <Badge
                variant="outline"
                className={`text-xs gap-1.5 ${
                  STATUS_CONFIG[statusFilter as PaymentStatus]?.chipClass ??
                  "border-white/15 text-gray-400 bg-white/5"
                }`}
              >
                <Filter className="h-3 w-3" />
                {STATUS_CONFIG[statusFilter as PaymentStatus]?.label ??
                  statusFilter}
              </Badge>
            )}
          </div>
        )}

        {/* ── Payments table ──────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
          {/* Table header — desktop only */}
          <div className="hidden xl:grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
            {[
              "Token / Email",
              "Plan",
              "Amount",
              "Coupon",
              "Contact",
              "Status",
              "Actions",
            ].map((h) => (
              <span
                key={h}
                className="text-xs font-semibold uppercase tracking-wider text-gray-600"
              >
                {h}
              </span>
            ))}
          </div>

          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/8 flex items-center justify-center mb-4">
                <BarChart3 className="h-7 w-7 text-gray-600" />
              </div>
              <p className="text-gray-500 font-medium mb-1">
                No payments found
              </p>
              <p className="text-xs text-gray-700">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {payments.map((payment) => {
                const createdAt = payment.createdAt
                  ? format(new Date(payment.createdAt), "MMM d, yyyy · h:mm a")
                  : "—";
                const planData = payment.plan as unknown as Pick<
                  IAvailablePlan,
                  "name" | "credits" | "amount"
                >;
                const isNeedsReview =
                  payment.payment_status === "needs_review";

                return (
                  <div
                    key={payment.token}
                    className={[
                      "group px-5 py-4 transition-colors",
                      isNeedsReview
                        ? "bg-amber-500/[0.03] hover:bg-amber-500/[0.05]"
                        : "hover:bg-white/[0.02]",
                    ].join(" ")}
                  >
                    {/* ── Mobile layout ── */}
                    <div className="xl:hidden space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-mono text-xs font-bold text-[#FF1B6B] bg-[#FF1B6B]/10 px-2 py-0.5 rounded-md border border-[#FF1B6B]/20">
                              {payment.token}
                            </span>
                            <StatusChip
                              status={payment.payment_status as PaymentStatus}
                            />
                          </div>
                          <p className="text-xs text-gray-400 truncate">
                            {payment.email}
                          </p>
                          <p className="text-[11px] text-gray-600 mt-0.5 font-mono">
                            {createdAt}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <CreditCard className="h-3 w-3 text-gray-600" />
                          <span className="capitalize font-medium text-gray-300">
                            {planData?.name ?? "—"}
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Coins className="h-3 w-3 text-[#FF1B6B]" />
                          <span className="font-bold text-white">
                            ₹{payment.amount.toLocaleString("en-IN")}
                          </span>
                          {payment.discount_applied &&
                            payment.discount_applied > 0 && (
                              <span className="text-emerald-400 text-[11px]">
                                (−₹{payment.discount_applied})
                              </span>
                            )}
                        </span>
                        {planData?.credits && (
                          <span className="flex items-center gap-1 text-[#FF1B6B]">
                            <Coins className="h-3 w-3" />
                            {planData.credits} credits
                          </span>
                        )}
                        {payment.contact_no && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {payment.country_code} {payment.contact_no}
                          </span>
                        )}
                        {payment.coupon_code && (
                          <span className="flex items-center gap-1 text-emerald-400">
                            <Tag className="h-3 w-3" />
                            {payment.coupon_code}
                          </span>
                        )}
                      </div>

                      {/* Screenshot link */}
                      {payment.screenshot_url && (
                        <a
                          href={payment.screenshot_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View Screenshot
                        </a>
                      )}

                      {/* OCR text */}
                      {payment.ocr_extracted_text && (
                        <details className="group/ocr">
                          <summary className="text-xs text-gray-600 hover:text-gray-400 cursor-pointer select-none list-none flex items-center gap-1">
                            <span className="border-b border-dashed border-gray-700">
                              View OCR text
                            </span>
                          </summary>
                          <div className="mt-2 rounded-lg border border-white/8 bg-white/[0.02] p-3 max-h-32 overflow-y-auto">
                            <pre className="text-[11px] text-gray-500 whitespace-pre-wrap font-mono leading-relaxed">
                              {payment.ocr_extracted_text.slice(0, 800)}
                            </pre>
                          </div>
                        </details>
                      )}

                      {/* Actions */}
                      <AdminPaymentActions
                        token={payment.token}
                        currentStatus={payment.payment_status as PaymentStatus}
                        screenshotUrl={payment.screenshot_url}
                      />
                    </div>

                    {/* ── Desktop layout ── */}
                    <div className="hidden xl:grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-4 items-center">
                      {/* Token / Email */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-xs font-bold text-[#FF1B6B] bg-[#FF1B6B]/8 px-2 py-0.5 rounded border border-[#FF1B6B]/15 truncate max-w-[180px]">
                            {payment.token}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate max-w-[220px]">
                          {payment.email}
                        </p>
                        <p className="text-[11px] text-gray-700 font-mono mt-0.5">
                          {createdAt}
                        </p>

                        {/* Screenshot + OCR inline */}
                        <div className="flex items-center gap-3 mt-1">
                          {payment.screenshot_url && (
                            <a
                              href={payment.screenshot_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-amber-400/80 hover:text-amber-300 transition-colors"
                            >
                              <ExternalLink className="h-2.5 w-2.5" />
                              Screenshot
                            </a>
                          )}
                          {payment.ocr_extracted_text && (
                            <details className="relative group/ocr">
                              <summary className="text-[11px] text-gray-600 hover:text-gray-400 cursor-pointer select-none list-none border-b border-dashed border-gray-700">
                                OCR text
                              </summary>
                              <div className="absolute top-5 left-0 z-20 w-80 rounded-xl border border-white/10 bg-[#111111] shadow-2xl p-3 max-h-48 overflow-y-auto">
                                <pre className="text-[11px] text-gray-400 whitespace-pre-wrap font-mono leading-relaxed">
                                  {payment.ocr_extracted_text.slice(0, 1000)}
                                </pre>
                              </div>
                            </details>
                          )}
                        </div>
                      </div>

                      {/* Plan */}
                      <div className="text-center">
                        <p className="text-sm font-semibold text-white capitalize">
                          {planData?.name ?? "—"}
                        </p>
                        {planData?.credits && (
                          <p className="text-[11px] text-[#FF1B6B] mt-0.5">
                            {planData.credits} credits
                          </p>
                        )}
                      </div>

                      {/* Amount */}
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">
                          ₹{payment.amount.toLocaleString("en-IN")}
                        </p>
                        {payment.discount_applied &&
                          payment.discount_applied > 0 && (
                            <p className="text-[11px] text-emerald-400 mt-0.5">
                              −₹{payment.discount_applied.toLocaleString("en-IN")}{" "}
                              off
                            </p>
                          )}
                      </div>

                      {/* Coupon */}
                      <div className="text-center">
                        {payment.coupon_code ? (
                          <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-emerald-400 bg-emerald-500/8 border border-emerald-500/20 px-2 py-0.5 rounded">
                            <Tag className="h-3 w-3" />
                            {payment.coupon_code}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-700">—</span>
                        )}
                      </div>

                      {/* Contact */}
                      <div className="text-center">
                        {payment.contact_no ? (
                          <p className="text-xs text-gray-400 font-mono whitespace-nowrap">
                            {payment.country_code} {payment.contact_no}
                          </p>
                        ) : (
                          <span className="text-xs text-gray-700">—</span>
                        )}
                      </div>

                      {/* Status */}
                      <StatusChip
                        status={payment.payment_status as PaymentStatus}
                      />

                      {/* Actions */}
                      <AdminPaymentActions
                        token={payment.token}
                        currentStatus={payment.payment_status as PaymentStatus}
                        screenshotUrl={payment.screenshot_url}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Pagination ──────────────────────────────────────────────────────── */}
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
              payments
            </p>

            <div className="flex items-center gap-1.5">
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

        {payments.length > 0 && totalPages <= 1 && (
          <p className="text-center text-xs text-gray-700 mt-6">
            Showing all {total} payment{total !== 1 ? "s" : ""}.
          </p>
        )}
      </div>
    </div>
  );
}
