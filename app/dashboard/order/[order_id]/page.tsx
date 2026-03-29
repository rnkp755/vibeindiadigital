import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { connectToDatabase } from "@/lib/mongodb";
import Order from "@/models/Order";
import { IOrder, OrderStatusValue } from "@/models/Order";
import { format } from "date-fns";
import {
  ArrowLeft,
  Music2,
  Calendar,
  Disc3,
  FileArchive,
  Clock,
  CheckCircle2,
  XCircle,
  PlayCircle,
  ShieldCheck,
  FileText,
  Users,
  Hash,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SupportForm } from "@/components/dashboard/SupportForm";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface StatusStep {
  status: OrderStatusValue;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STEPS: StatusStep[] = [
  {
    status: "unpaid",
    label: "Unpaid",
    description: "Order created — awaiting payment / credits",
    icon: XCircle,
    color: "text-amber-400",
    bgColor: "bg-amber-500/15",
    borderColor: "border-amber-500/30",
  },
  {
    status: "pending",
    label: "Pending Review",
    description: "Credits confirmed — waiting for team review",
    icon: Clock,
    color: "text-blue-400",
    bgColor: "bg-blue-500/15",
    borderColor: "border-blue-500/30",
  },
  {
    status: "verified",
    label: "Verified",
    description: "Files and metadata verified by our team",
    icon: ShieldCheck,
    color: "text-violet-400",
    bgColor: "bg-violet-500/15",
    borderColor: "border-violet-500/30",
  },
  {
    status: "in_progress",
    label: "In Progress",
    description: "Actively distributing to streaming platforms",
    icon: PlayCircle,
    color: "text-[#FF1B6B]",
    bgColor: "bg-[#FF1B6B]/15",
    borderColor: "border-[#FF1B6B]/30",
  },
  {
    status: "completed",
    label: "Completed",
    description: "Successfully distributed to all platforms",
    icon: CheckCircle2,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/15",
    borderColor: "border-emerald-500/30",
  },
];

const STATUS_ORDER: OrderStatusValue[] = [
  "unpaid",
  "pending",
  "verified",
  "in_progress",
  "completed",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLatestStatus(order: IOrder): OrderStatusValue {
  if (!order.current_status || order.current_status.length === 0) return "unpaid";
  return order.current_status[order.current_status.length - 1].status;
}

function getStatusIndex(status: OrderStatusValue, orderList: OrderStatusValue[]): number {
  return orderList.indexOf(status);
}

function getTimestampForStatus(
  order: IOrder,
  status: OrderStatusValue
): Date | null {
  if (!order.current_status) return null;
  const entry = [...order.current_status]
    .reverse()
    .find((e) => e.status === status);
  return entry ? new Date(entry.updated_at) : null;
}

// ─── Vertical Progress Bar ────────────────────────────────────────────────────

function VerticalProgressBar({
  order,
  steps,
  orderList,
}: {
  order: IOrder;
  steps: StatusStep[];
  orderList: OrderStatusValue[];
}) {
  const latestStatus = getLatestStatus(order);
  const latestIdx = getStatusIndex(latestStatus, orderList);

  return (
    <div className="relative">
      {steps.map((step, idx) => {
        const isCompleted = idx < latestIdx;
        const isCurrent = idx === latestIdx;
        const isPending = idx > latestIdx;
        const isLast = idx === steps.length - 1;

        const timestamp = getTimestampForStatus(order, step.status);
        const Icon = step.icon;

        return (
          <div key={step.status} className="flex gap-4">
            {/* ── Left column: icon + connector line ── */}
            <div className="flex flex-col items-center">
              {/* Icon circle */}
              <div
                className={[
                  "w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 z-10 transition-all",
                  isCompleted
                    ? "bg-emerald-500/20 border-emerald-500/50"
                    : isCurrent
                    ? `${step.bgColor} ${step.borderColor}`
                    : "bg-white/[0.03] border-white/10",
                ].join(" ")}
              >
                <Icon
                  className={[
                    "h-4 w-4",
                    isCompleted
                      ? "text-emerald-400"
                      : isCurrent
                      ? step.color
                      : "text-gray-700",
                  ].join(" ")}
                />
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="w-0.5 flex-1 my-1 min-h-[28px]">
                  <div
                    className={[
                      "w-full h-full rounded-full transition-all duration-500",
                      isCompleted
                        ? "bg-emerald-500/40"
                        : "bg-white/[0.06]",
                    ].join(" ")}
                  />
                </div>
              )}
            </div>

            {/* ── Right column: label + description + timestamp ── */}
            <div
              className={[
                "pb-6 flex-1 min-w-0",
                isLast ? "pb-0" : "",
              ].join(" ")}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <p
                  className={[
                    "text-sm font-semibold leading-tight",
                    isCompleted
                      ? "text-emerald-400"
                      : isCurrent
                      ? "text-white"
                      : "text-gray-600",
                  ].join(" ")}
                >
                  {step.label}
                </p>

                {isCurrent && (
                  <span
                    className={[
                      "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border",
                      step.bgColor,
                      step.borderColor,
                      step.color,
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "w-1 h-1 rounded-full",
                        step.status === "in_progress" || step.status === "pending"
                          ? "animate-pulse"
                          : "",
                        step.color.replace("text-", "bg-"),
                      ].join(" ")}
                    />
                    Current
                  </span>
                )}
              </div>

              <p
                className={[
                  "text-xs mt-0.5 leading-relaxed",
                  isPending ? "text-gray-700" : "text-gray-500",
                ].join(" ")}
              >
                {step.description}
              </p>

              {timestamp && (
                <p className="text-[11px] text-gray-700 mt-1 font-mono">
                  {format(timestamp, "MMM d, yyyy · h:mm a")}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: { order_id: string };
}

export default async function OrderDetailPage({ params }: PageProps) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { order_id } = params;

  // ── Fetch order ────────────────────────────────────────────────────────────
  let order: IOrder | null = null;
  try {
    await connectToDatabase();
    order = await Order.findOne({ order_id }).lean();
  } catch (err) {
    console.error("[OrderDetailPage] DB error:", err);
  }

  if (!order) notFound();

  // Ownership check
  if (order.user_id !== userId) {
    // Check if admin
    try {
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(userId);
      const role = (clerkUser.publicMetadata as { role?: string })?.role;
      if (role !== "admin") redirect("/dashboard/orders");
    } catch {
      redirect("/dashboard/orders");
    }
  }

  // ── Fetch user display name ────────────────────────────────────────────────
  let userName = "there";
  try {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    userName =
      clerkUser.firstName ??
      clerkUser.username ??
      clerkUser.primaryEmailAddress?.emailAddress?.split("@")[0] ??
      "there";
  } catch {
    /* non-critical */
  }

  const latestStatus = getLatestStatus(order);
  const isUnpaid = latestStatus === "unpaid";
  const hasUnpaidHistory = order.current_status?.[0]?.status === "unpaid";
  const visibleSteps = hasUnpaidHistory
    ? STATUS_STEPS
    : STATUS_STEPS.filter((step) => step.status !== "unpaid");
  const visibleOrder = hasUnpaidHistory
    ? STATUS_ORDER
    : STATUS_ORDER.filter((status) => status !== "unpaid");

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#0a0a0a] text-white">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-20 left-1/3 w-[500px] h-[300px] rounded-full bg-[#FF1B6B]/6 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Back button ──────────────────────────────────────────────────── */}
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Link>

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#FF1B6B]/15 border border-[#FF1B6B]/25 flex items-center justify-center shrink-0">
              <Music2 className="h-6 w-6 text-[#FF1B6B]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Order{" "}
                  <span className="text-[#FF1B6B] font-mono">
                    #{order.order_id}
                  </span>
                </h1>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {order.tracks} track{order.tracks !== 1 ? "s" : ""} ·{" "}
                {order.createdAt
                  ? `Placed ${format(new Date(order.createdAt), "MMM d, yyyy")}`
                  : ""}
              </p>
            </div>
          </div>

          {/* Unpaid CTA */}
          {isUnpaid && (
            <Link href="/dashboard/buy-credits" className="shrink-0">
              <Button className="bg-[#FF1B6B] hover:bg-[#FF1B6B]/90 text-white font-semibold shadow-lg shadow-[#FF1B6B]/20">
                Buy Credits to Activate
              </Button>
            </Link>
          )}
        </div>

        {/* ── Main grid ────────────────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-5 gap-6">

          {/* ── Left col: order details ───────────────────────────────── */}
          <div className="lg:col-span-3 space-y-5">

            {/* Tracks / metadata */}
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
                <Disc3 className="h-4 w-4 text-[#FF1B6B]" />
                <h2 className="text-sm font-semibold text-white uppercase tracking-wide">
                  Tracks
                </h2>
                <Badge
                  variant="outline"
                  className="ml-auto text-xs border-white/15 text-gray-500 bg-white/5"
                >
                  {order.tracks} total
                </Badge>
              </div>

              <div className="divide-y divide-white/[0.05]">
                {order.metadata && order.metadata.length > 0 ? (
                  order.metadata.map((m, i) => (
                    <div key={i} className="px-5 py-3.5 flex items-start gap-3">
                      <div className="w-6 h-6 rounded-md bg-[#FF1B6B]/10 border border-[#FF1B6B]/20 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-[#FF1B6B]">
                          {i + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {m.title}
                        </p>
                        {m.artist && m.artist.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <Users className="h-3 w-3 text-gray-600 shrink-0" />
                            <p className="text-xs text-gray-500">
                              {Array.isArray(m.artist)
                                ? m.artist.join(", ")
                                : String(m.artist)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-5 py-6 text-center">
                    <p className="text-sm text-gray-600 italic">
                      Track details not yet submitted
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Release info */}
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#FF1B6B]" />
                <h2 className="text-sm font-semibold text-white uppercase tracking-wide">
                  Release Info
                </h2>
              </div>

              <div className="px-5 py-4 space-y-3">
                {/* Order ID */}
                <div className="flex items-center gap-3">
                  <Hash className="h-4 w-4 text-gray-600 shrink-0" />
                  <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-500">Order ID</span>
                    <span className="font-mono text-sm text-white bg-white/5 px-2 py-0.5 rounded-md border border-white/8">
                      #{order.order_id}
                    </span>
                  </div>
                </div>

                {/* Release date */}
                {order.release_date && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-gray-600 shrink-0" />
                    <div className="flex-1 flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-500">
                        Expected Release
                      </span>
                      <span className="text-sm text-white font-medium">
                        {format(new Date(order.release_date), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                )}

                {/* Rights */}
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-gray-600 shrink-0" />
                  <div className="flex-1 flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-500">
                      Rights Retained
                    </span>
                    <span className="text-sm text-emerald-400 font-semibold">
                      {order.rights_distribution ?? 100}%
                    </span>
                  </div>
                </div>

                {/* Asset URL */}
                {order.asset_url && (
                  <div className="flex items-start gap-3">
                    <FileArchive className="h-4 w-4 text-gray-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-gray-500 block mb-1">
                        Release Archive
                      </span>
                      <a
                        href={order.asset_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#FF1B6B] hover:text-[#FF1B6B]/80 font-mono truncate max-w-full transition-colors"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {order.asset_url.replace(
                            /^https:\/\/res\.cloudinary\.com\/[^/]+\//,
                            "☁ "
                          )}
                        </span>
                      </a>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {order.notes && order.notes.trim().length > 0 && (
                  <div className="pt-2 border-t border-white/[0.05]">
                    <p className="text-xs text-gray-500 mb-1.5">Notes</p>
                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {order.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Support form ─────────────────────────────────────────── */}
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
                <Music2 className="h-4 w-4 text-[#FF1B6B]" />
                <h2 className="text-sm font-semibold text-white uppercase tracking-wide">
                  Contact Support
                </h2>
              </div>
              <div className="p-5">
                <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                  Have a question about this order? Send our team a message and
                  we'll get back to you within 24 hours.
                </p>
                <SupportForm orderId={order.order_id} userName={userName} />
              </div>
            </div>
          </div>

          {/* ── Right col: vertical progress ──────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 rounded-2xl border border-white/[0.07] bg-white/[0.025] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#FF1B6B]" />
                <h2 className="text-sm font-semibold text-white uppercase tracking-wide">
                  Distribution Status
                </h2>
              </div>
              <div className="p-5">
                <VerticalProgressBar
                  order={order as IOrder}
                  steps={visibleSteps}
                  orderList={visibleOrder}
                />
              </div>

              {/* Status history */}
              {order.current_status && order.current_status.length > 1 && (
                <div className="px-5 pb-5">
                  <div className="border-t border-white/[0.05] pt-4">
                    <p className="text-[11px] text-gray-600 uppercase tracking-widest font-semibold mb-3">
                      Status History
                    </p>
                    <div className="space-y-2">
                      {[...order.current_status]
                        .reverse()
                        .map((entry, i) => {
                          const step = STATUS_STEPS.find(
                            (s) => s.status === entry.status
                          );
                          const Icon = step?.icon ?? Clock;
                          return (
                            <div
                              key={i}
                              className="flex items-center gap-2 text-xs"
                            >
                              <Icon
                                className={`h-3.5 w-3.5 shrink-0 ${step?.color ?? "text-gray-500"}`}
                              />
                              <span className="text-gray-400 font-medium capitalize">
                                {entry.status.replace("_", " ")}
                              </span>
                              <span className="ml-auto text-gray-700 font-mono tabular-nums">
                                {format(
                                  new Date(entry.updated_at),
                                  "MMM d, yy"
                                )}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
