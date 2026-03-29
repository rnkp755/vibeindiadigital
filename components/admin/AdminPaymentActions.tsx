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
  AlertTriangle,
  MoreHorizontal,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type PaymentStatus =
  | "pending"
  | "needs_review"
  | "completed"
  | "verified"
  | "failed";

interface AdminPaymentActionsProps {
  token: string;
  currentStatus: PaymentStatus;
  screenshotUrl?: string;
}

type ActionType = "verify" | "fail" | null;


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
  verify: {
    label: "Verify",
    description:
      "Mark this payment as verified. Credits will be added if they haven't been credited yet.",
    targetStatus: "verified",
    confirmLabel: "Verify Payment",
    color: "#10B981",
    bgClass: "bg-emerald-500/10 hover:bg-emerald-500/20",
    borderClass: "border-emerald-500/30 hover:border-emerald-500/50",
    icon: ShieldCheck,
    warningText:
      "Only verify after confirming the payment is genuine. This may grant credits to the user.",
  },
  fail: {
    label: "Mark Failed",
    description:
      "Mark this payment as failed. Any previously granted credits will be rolled back.",
    targetStatus: "failed",
    confirmLabel: "Mark Failed",
    color: "#EF4444",
    bgClass: "bg-red-500/10 hover:bg-red-500/20",
    borderClass: "border-red-500/30 hover:border-red-500/50",
    icon: XCircle,
    warningText:
      "If credits were already added, they will be rolled back where possible.",
  },
};

const STATUS_META: Record<
  PaymentStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  pending: { label: "Pending", color: "#60A5FA", icon: AlertTriangle },
  needs_review: { label: "Needs Review", color: "#F59E0B", icon: AlertTriangle },
  completed: { label: "Completed", color: "#10B981", icon: CheckCircle2 },
  verified: { label: "Verified", color: "#34D399", icon: ShieldCheck },
  failed: { label: "Failed", color: "#EF4444", icon: XCircle },
};


interface ConfirmDialogProps {
  open: boolean;
  token: string;
  actionType: NonNullable<ActionType>;
  screenshotUrl?: string;
  currentStatus: PaymentStatus;
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
  currentStatus,
  onConfirm,
  onCancel,
  loading,
  error,
}: ConfirmDialogProps) {
  const config = ACTION_CONFIG[actionType];
  const current = STATUS_META[currentStatus];
  const target = STATUS_META[config.targetStatus];
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
							<config.icon
								className="h-5 w-5"
								style={{ color: config.color }}
							/>
						</div>
						<div>
							<DialogTitle className="text-base font-bold text-white leading-none">
								{actionType === "verify"
									? "Verify Payment"
									: "Mark Failed"}
							</DialogTitle>
							<DialogDescription className="text-xs text-gray-500 mt-0.5">
								Token:{" "}
								<span className="font-mono text-gray-400">
									{token}
								</span>
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
						<div
							className="flex-1 rounded-lg border px-3 py-2 text-center"
							style={{
								backgroundColor: `${current.color}10`,
								borderColor: `${current.color}30`,
							}}
						>
							<p
								className="text-[10px] uppercase tracking-widest font-semibold mb-1"
								style={{ color: `${current.color}80` }}
							>
								Current
							</p>
							<div className="flex items-center justify-center gap-1.5">
								<current.icon
									className="h-3.5 w-3.5"
									style={{ color: current.color }}
								/>
								<span
									className="text-sm font-bold"
									style={{ color: current.color }}
								>
									{current.label}
								</span>
							</div>
						</div>

						{/* Arrow */}
						<div className="text-gray-600 text-lg font-bold shrink-0">
							→
						</div>

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
								<target.icon
									className="h-3.5 w-3.5 shrink-0"
									style={{ color: target.color }}
								/>
								<span
									className="text-sm font-bold capitalize"
									style={{ color: target.color }}
								>
									{target.label}
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
									{screenshotExpanded ? "Hide" : "Show"}
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
											(
												e.target as HTMLImageElement
											).style.display = "none";
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
								Processing
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


  const handleAction = useCallback((action: NonNullable<ActionType>) => {
    setPendingAction(action);
    setError(null);
    setConfirmOpen(true);
  }, []);


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


  const handleCancel = useCallback(() => {
    if (loading) return;
    setConfirmOpen(false);
    setPendingAction(null);
    setError(null);
  }, [loading]);

  const canAct =
    currentStatus === "needs_review" || currentStatus === "completed";

  return (
    <>
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        {/* Success flash */}
        {successAction ? (
          <div
            className={cn(
              "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-semibold whitespace-nowrap",
              successAction === "verify"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-red-500/30 bg-red-500/10 text-red-400"
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

            {/* Actions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-semibold transition-all whitespace-nowrap",
                    canAct
                      ? "border-white/10 bg-white/[0.03] text-gray-300 hover:text-white hover:border-white/20"
                      : "border-white/5 bg-white/[0.02] text-gray-600 cursor-not-allowed"
                  )}
                  disabled={!canAct}
                  title={canAct ? "Actions" : "No actions available"}
                >
                  <MoreHorizontal className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">Actions</span>
                </button>
              </DropdownMenuTrigger>
              {canAct && (
                <DropdownMenuContent
                  align="end"
                  className="bg-[#111111] border border-white/10 text-white"
                >
                  <DropdownMenuItem
                    onClick={() => handleAction("verify")}
                    className="cursor-pointer focus:bg-emerald-500/10 focus:text-emerald-300"
                  >
                    <ShieldCheck className="mr-2 h-4 w-4 text-emerald-400" />
                    Mark Verified
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleAction("fail")}
                    className="cursor-pointer focus:bg-red-500/10 focus:text-red-300"
                  >
                    <XCircle className="mr-2 h-4 w-4 text-red-400" />
                    Mark Failed
                  </DropdownMenuItem>
                </DropdownMenuContent>
              )}
            </DropdownMenu>
          </>
        )}
      </div>

      {pendingAction && (
        <ConfirmDialog
          open={confirmOpen}
          token={token}
          actionType={pendingAction}
          screenshotUrl={screenshotUrl}
          currentStatus={currentStatus}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          loading={loading}
          error={error}
        />
      )}
    </>
  );
}
