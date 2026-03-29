"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Eye,
  ChevronDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────────

type OrderStatus =
  | "unpaid"
  | "pending"
  | "verified"
  | "in_progress"
  | "completed";

interface AdminOrderActionsProps {
  orderId: string;
  currentStatus: OrderStatus;
  assetUrl?: string;
  email: string;
}

// ─── Status options ────────────────────────────────────────────────────────────

const STATUS_OPTIONS: {
  value: OrderStatus;
  label: string;
  color: string;
  bgClass: string;
}[] = [
  {
    value: "unpaid",
    label: "Unpaid",
    color: "#F59E0B",
    bgClass: "text-amber-400 hover:bg-amber-500/10",
  },
  {
    value: "pending",
    label: "Pending",
    color: "#3B82F6",
    bgClass: "text-blue-400 hover:bg-blue-500/10",
  },
  {
    value: "verified",
    label: "Verified",
    color: "#8B5CF6",
    bgClass: "text-violet-400 hover:bg-violet-500/10",
  },
  {
    value: "in_progress",
    label: "In Progress",
    color: "#FF1B6B",
    bgClass: "text-[#FF1B6B] hover:bg-[#FF1B6B]/10",
  },
  {
    value: "completed",
    label: "Completed",
    color: "#10B981",
    bgClass: "text-emerald-400 hover:bg-emerald-500/10",
  },
];

// ─── Confirm Status Dialog ─────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean;
  orderId: string;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
}

function ConfirmStatusDialog({
  open,
  orderId,
  fromStatus,
  toStatus,
  onConfirm,
  onCancel,
  loading,
  error,
}: ConfirmDialogProps) {
  const from = STATUS_OPTIONS.find((s) => s.value === fromStatus);
  const to = STATUS_OPTIONS.find((s) => s.value === toStatus);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="bg-[#111111] border border-white/10 text-white shadow-2xl shadow-black/60 max-w-sm rounded-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
          <DialogTitle className="text-base font-bold text-white">
            Update Order Status
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 mt-1">
            This will append a new status entry to order{" "}
            <span className="font-mono text-gray-300">#{orderId}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          {/* Status transition preview */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div
              className="px-3 py-1.5 rounded-full border text-xs font-semibold capitalize"
              style={{
                color: from?.color,
                borderColor: `${from?.color}40`,
                backgroundColor: `${from?.color}12`,
              }}
            >
              {fromStatus.replace("_", " ")}
            </div>

            <div className="flex-1 h-0.5 rounded-full bg-white/10 relative overflow-hidden">
              <div
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: `${to?.color}60` }}
              />
            </div>

            <div
              className="px-3 py-1.5 rounded-full border text-xs font-bold capitalize"
              style={{
                color: to?.color,
                borderColor: `${to?.color}50`,
                backgroundColor: `${to?.color}18`,
              }}
            >
              {toStatus.replace("_", " ")}
            </div>
          </div>

          {/* Warning for potentially irreversible changes */}
          {(toStatus === "completed" || fromStatus === "completed") && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/6 px-3.5 py-2.5">
              <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-400/80 leading-relaxed">
                {toStatus === "completed"
                  ? "Marking as completed is a significant action. Ensure all distribution tasks are done."
                  : "Moving back from 'completed' — use with caution."}
              </p>
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
              backgroundColor: `${to?.color}22`,
              borderColor: `${to?.color}40`,
              color: to?.color,
              border: "1px solid",
            }}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirm Update
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function AdminOrderActions({
  orderId,
  currentStatus,
  assetUrl,
  email,
}: AdminOrderActionsProps) {
  const router = useRouter();

  // Status update state
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Download state
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // ── Status update flow ─────────────────────────────────────────────────────

  const handleSelectStatus = useCallback((status: OrderStatus) => {
    if (status === currentStatus) return;
    setPendingStatus(status);
    setUpdateError(null);
    setConfirmOpen(true);
  }, [currentStatus]);

  const handleConfirmUpdate = useCallback(async () => {
    if (!pendingStatus) return;

    setUpdating(true);
    setUpdateError(null);

    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: pendingStatus }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          (data as { error?: string }).error ??
            `Failed to update status (HTTP ${res.status}).`
        );
      }

      setUpdateSuccess(true);
      setConfirmOpen(false);
      setPendingStatus(null);

      // Brief success flash then refresh
      setTimeout(() => {
        setUpdateSuccess(false);
        router.refresh();
      }, 1200);
    } catch (err) {
      setUpdateError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setUpdating(false);
    }
  }, [pendingStatus, orderId, router]);

  const handleCancelUpdate = useCallback(() => {
    if (updating) return;
    setConfirmOpen(false);
    setPendingStatus(null);
    setUpdateError(null);
  }, [updating]);

  // ── Download flow ──────────────────────────────────────────────────────────

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    setDownloadError(null);

    try {
      const res = await fetch(
        `/api/admin/orders/${encodeURIComponent(orderId)}`,
        { method: "GET" }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          (data as { error?: string }).error ??
            "Failed to get download URL."
        );
      }

      const downloadUrl = (data as { downloadUrl?: string }).downloadUrl;

      if (!downloadUrl) {
        throw new Error(
          "No download URL available for this order. The archive may not have been uploaded yet."
        );
      }

      // Open in new tab — Cloudinary signed URL handles the download
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setDownloadError(
        err instanceof Error ? err.message : "Download failed."
      );
      // Clear error after a few seconds
      setTimeout(() => setDownloadError(null), 5000);
    } finally {
      setDownloading(false);
    }
  }, [orderId]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        {/* ── View order link ── */}
        <a
          href={`/dashboard/order/${orderId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-white/10 bg-white/[0.03] text-xs font-medium text-gray-400 hover:text-white hover:border-white/20 transition-all whitespace-nowrap"
          title="View order page"
        >
          <Eye className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">View</span>
        </a>

        {/* ── Download button ── */}
        <button
          onClick={handleDownload}
          disabled={downloading || !assetUrl}
          className={cn(
            "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium transition-all whitespace-nowrap",
            !assetUrl
              ? "border-white/[0.05] bg-white/[0.01] text-gray-700 cursor-not-allowed"
              : downloading
              ? "border-white/10 bg-white/[0.03] text-gray-500 cursor-wait"
              : "border-white/10 bg-white/[0.03] text-gray-400 hover:text-white hover:border-white/20"
          )}
          title={
            !assetUrl
              ? "No archive uploaded for this order"
              : "Download release ZIP"
          }
        >
          {downloading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
          ) : (
            <Download className="h-3.5 w-3.5 shrink-0" />
          )}
          <span className="hidden sm:inline">
            {downloading ? "…" : "ZIP"}
          </span>
        </button>

        {/* ── Download error tooltip ── */}
        {downloadError && (
          <div className="absolute z-50 mt-1 max-w-xs text-xs text-red-300 bg-red-900/80 border border-red-500/30 rounded-lg px-3 py-2 shadow-xl">
            {downloadError}
          </div>
        )}

        {/* ── Status update dropdown ── */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-semibold transition-all whitespace-nowrap",
                updateSuccess
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-[#FF1B6B]/20 bg-[#FF1B6B]/8 text-[#FF1B6B] hover:bg-[#FF1B6B]/15 hover:border-[#FF1B6B]/30"
              )}
              title="Update order status"
            >
              {updateSuccess ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">Done!</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Status</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="bg-[#111111] border border-white/10 shadow-2xl shadow-black/60 rounded-xl p-1 min-w-[160px]"
          >
            <DropdownMenuLabel className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold px-2 py-1.5">
              Change Status
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/[0.06] my-1" />

            {STATUS_OPTIONS.map((option) => {
              const isCurrent = option.value === currentStatus;
              return (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => handleSelectStatus(option.value)}
                  disabled={isCurrent}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors capitalize",
                    isCurrent
                      ? "opacity-50 cursor-default"
                      : option.bgClass,
                    "focus:outline-none"
                  )}
                  style={
                    isCurrent
                      ? {
                          color: option.color,
                          backgroundColor: `${option.color}10`,
                        }
                      : {}
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: option.color }}
                    />
                    <span>
                      {option.label}
                      {isCurrent && (
                        <span className="ml-1.5 text-[10px] opacity-60">
                          (current)
                        </span>
                      )}
                    </span>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Confirm dialog ── */}
      {pendingStatus && (
        <ConfirmStatusDialog
          open={confirmOpen}
          orderId={orderId}
          fromStatus={currentStatus}
          toStatus={pendingStatus}
          onConfirm={handleConfirmUpdate}
          onCancel={handleCancelUpdate}
          loading={updating}
          error={updateError}
        />
      )}
    </>
  );
}
