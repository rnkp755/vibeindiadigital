"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  X,
  Eye,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────────

type PaymentStatus = "pending" | "needs_review" | "completed";

interface AdminPaymentActionsProps {
  token: string;
  currentStatus: PaymentStatus;
  screenshotUrl?: string;
}

type ActionType = "approve" | "reject" | "reset" | null;

// ─── Action config ─────────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<
  NonNullable<ActionType>,
  {
    label: string;
    description: string;
    targetStatus: PaymentStatus;
    confirmLabel: string;
    color: string;
    bgClass: string;
    borderClass: string;
    icon: React.ElementType;
    warningText?: string;
  }
> = {
  approve: {
    label: "Approve",
    description:
      "Mark this payment as completed. The user's credits will be added to their account automatically.",
    targetStatus: "completed",
    confirmLabel: "Approve & Credit",
    color: "#10B981",
    bgClass: "bg-emerald-500/10 hover:bg-emerald-500/20",
    borderClass: "border-emerald-500/30 hover:border-emerald-500/50",
    icon: CheckCircle2,
    warningText:
      "This will add credits to the user's Clerk account. This action should only be taken after confirming the payment is genuine.",
  },
  reject: {
    label: "Reject",
    description:
      "Mark this payment as pending. The user will need to re-upload their screenshot.",
    targetStatus: "pending",
    confirmLabel: "Reset to Pending",
    color: "#EF4444",
    bgClass: "bg-red-500/10 hover:bg-red-500/20",
    borderClass: "border-red-500/30 hover:border-red-500/50",
    icon: XCircle,
    warningText:
      "The payment will be moved back to 'pending'. The user will be able to re-upload a screenshot.",
  },
  reset: {
    label: "Reset",
    description: "Move this payment back to pending status.",
    targetStatus: "pending",
    confirmLabel: "Reset to Pending",
    color: "#6B7280",
    bgClass: "bg-white/5 hover:bg-white/10",
    borderClass: "border-white/10 hover:border-white/20",
    icon: RotateCcw,
  },
};

// ─── Confirm Dialog ────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean;
  token: string;
  actionType: NonNullable<ActionType>;
  screenshotUrl?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
}

function ConfirmDialog({
  open,
  token,
  actionType,
  screenshotUrl,
  onConfirm,
  onCancel,
  loading,
  error,
}: ConfirmDialogProps) {
  const config = ACTION_CONFIG[actionType];
  const [screenshotExpanded, setScreenshotExpanded] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !loading && onCancel()}>
      <DialogContent className="bg-[#111111] border border-white/10 text-white shadow-2xl shadow-black/70 max-w-md w-full rounded-2xl p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0"
              style={{
                backgroundColor: `${config.color}18`,
                borderColor: `${config.color}35`,
              }}
            >
              <config.icon className="h-5 w-5" style={{ color: config.color }} />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white leading-none">
                {actionType === "approve"
                  ? "Approve Payment"
                  : actionType === "reject"
                  ? "Reject Payment"
                  : "Reset Payment"}
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 mt-0.5">
                Token:{" "}
                <span className="font-mono text-gray-400">{token}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Action description */}
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3.5">
            <p className="text-sm text-gray-300 leading-relaxed">
              {config.description}
            </p>
          </div>

          {/* Status transition */}
          <div className="flex items-center gap-3">
            {/* Current */}
            <div className="flex-1 rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2 text-center">
              <p className="text-[10px] text-amber-400/60 uppercase tracking-widest font-semibold mb-1">
                Current
              </p>
              <div className="flex items-center justify-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-sm font-bold text-amber-400">
                  Needs Review
                </span>
              </div>
            </div>

            {/* Arrow */}
            <div className="text-gray-600 text-lg font-bold shrink-0">→</div>

            {/* Target */}
            <div
              className="flex-1 rounded-lg border px-3 py-2 text-center"
              style={{
                backgroundColor: `${config.color}10`,
                borderColor: `${config.color}30`,
              }}
            >
              <p
                className="text-[10px] uppercase tracking-widest font-semibold mb-1"
                style={{ color: `${config.color}80` }}
              >
                New Status
              </p>
              <div className="flex items-center justify-center gap-1.5">
                <config.icon
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: config.color }}
                />
                <span
                  className="text-sm font-bold capitalize"
                  style={{ color: config.color }}
                >
                  {config.targetStatus === "completed"
                    ? "Completed"
                    : "Pending"}
                </span>
              </div>
            </div>
          </div>

          {/* Warning */}
          {config.warningText && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/6 px-3.5 py-3">
              <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-400/80 leading-relaxed">
                {config.warningText}
              </p>
            </div>
          )}

          {/* Screenshot preview (collapsible) */}
          {screenshotUrl && (
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
              <button
                onClick={() => setScreenshotExpanded((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Eye className="h-3.5 w-3.5 text-gray-500" />
                  <span className="text-xs font-medium text-gray-400">
                    Payment Screenshot
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] border-amber-500/25 bg-amber-500/8 text-amber-400 px-1.5 py-0"
                  >
                    Evidence
                  </Badge>
                </div>
                <span className="text-xs text-gray-600">
                  {screenshotExpanded ? "Hide ▲" : "Show ▼"}
                </span>
              </button>

              {screenshotExpanded && (
                <div className="px-4 pb-4 space-y-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={screenshotUrl}
                    alt="Payment screenshot"
                    className="w-full rounded-lg border border-white/8 object-contain max-h-56"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <a
                    href={screenshotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#FF1B6B] hover:text-[#FF1B6B]/80 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open in new tab
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <Alert className="border border-red-500/30 bg-red-500/6 py-2.5 px-3.5">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <AlertDescription className="text-red-300 text-sm">
                  {error}
                </AlertDescription>
              </div>
            </Alert>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <Button
            onClick={onCancel}
            disabled={loading}
            variant="outline"
            className="h-10 flex-1 border-white/15 text-gray-400 hover:text-white hover:border-white/25 bg-transparent text-sm"
          >
            <X className="h-4 w-4 mr-1.5" />
            Cancel
          </Button>

          <Button
            onClick={onConfirm}
            disabled={loading}
            className="h-10 flex-1 text-sm font-bold transition-all disabled:opacity-60"
            style={{
              backgroundColor: `${config.color}20`,
              borderColor: `${config.color}45`,
              color: config.color,
              border: "1px solid",
            }}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <config.icon className="h-4 w-4 mr-2" />
                {config.confirmLabel}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function AdminPaymentActions({
  token,
  currentStatus,
  screenshotUrl,
}: AdminPaymentActionsProps) {
  const router = useRouter();

  const [pendingAction, setPendingAction] = useState<ActionType>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successAction, setSuccessAction] = useState<ActionType>(null);

  // ── Initiate action ────────────────────────────────────────────────────────

  const handleAction = useCallback((action: NonNullable<ActionType>) => {
    setPendingAction(action);
    setError(null);
    setConfirmOpen(true);
  }, []);

  // ── Confirm action ─────────────────────────────────────────────────────────

  const handleConfirm = useCallback(async () => {
    if (!pendingAction) return;

    const targetStatus = ACTION_CONFIG[pendingAction].targetStatus;
    setLoading(true);
    setError(null);

    try {
      // Use the admin PATCH endpoint on /api/payments/[token]
      const res = await fetch(
        `/api/payments/${encodeURIComponent(token)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payment_status: targetStatus }),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          (data as { error?: string }).error ??
            `Failed to update payment (HTTP ${res.status}).`
        );
      }

      // Show brief success state then refresh
      setSuccessAction(pendingAction);
      setConfirmOpen(false);
      setPendingAction(null);

      setTimeout(() => {
        setSuccessAction(null);
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [pendingAction, token, router]);

  // ── Cancel ─────────────────────────────────────────────────────────────────

  const handleCancel = useCallback(() => {
    if (loading) return;
    setConfirmOpen(false);
    setPendingAction(null);
    setError(null);
  }, [loading]);

  // ── Render: completed — no actions needed ──────────────────────────────────

  if (currentStatus === "completed") {
    return (
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-emerald-500/20 bg-emerald-500/8 text-xs font-semibold text-emerald-400 whitespace-nowrap cursor-default select-none">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">Verified</span>
        </div>
      </div>
    );
  }

  // ── Render: pending — just show status indicator ───────────────────────────

  if (currentStatus === "pending") {
    return (
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-blue-500/20 bg-blue-500/8 text-xs font-semibold text-blue-400 whitespace-nowrap cursor-default select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shrink-0" />
          <span className="hidden sm:inline">Awaiting</span>
        </div>
      </div>
    );
  }

  // ── Render: needs_review — show approve / reject buttons ──────────────────

  return (
    <>
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        {/* Success flash */}
        {successAction ? (
          <div
            className={cn(
              "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-semibold whitespace-nowrap",
              successAction === "approve"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-gray-500/30 bg-gray-500/10 text-gray-400"
            )}
          >
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            Done!
          </div>
        ) : (
          <>
            {/* Screenshot viewer shortcut (if available) */}
            {screenshotUrl && (
              <a
                href={screenshotUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-white/10 bg-white/[0.03] text-xs font-medium text-gray-400 hover:text-white hover:border-white/20 transition-all whitespace-nowrap"
                title="View payment screenshot"
              >
                <Eye className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Screenshot</span>
              </a>
            )}

            {/* ── Approve button ── */}
            <button
              onClick={() => handleAction("approve")}
              className={cn(
                "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-semibold transition-all whitespace-nowrap",
                "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
                "hover:bg-emerald-500/20 hover:border-emerald-500/50",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
              )}
              title="Approve payment and credit user"
            >
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Approve</span>
            </button>

            {/* ── Reject / Reset button ── */}
            <button
              onClick={() => handleAction("reject")}
              className={cn(
                "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-semibold transition-all whitespace-nowrap",
                "border-red-500/25 bg-red-500/8 text-red-400",
                "hover:bg-red-500/18 hover:border-red-500/45",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
              )}
              title="Reject payment and reset to pending"
            >
              <XCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Reject</span>
            </button>
          </>
        )}
      </div>

      {/* ── Confirmation dialog ── */}
      {pendingAction && (
        <ConfirmDialog
          open={confirmOpen}
          token={token}
          actionType={pendingAction}
          screenshotUrl={screenshotUrl}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          loading={loading}
          error={error}
        />
      )}
    </>
  );
}
