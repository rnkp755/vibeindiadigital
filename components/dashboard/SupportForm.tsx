"use client";

import { useState, useCallback } from "react";
import { Loader2, Send, CheckCircle2, AlertCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SupportFormProps {
  orderId: string;
  userName: string;
}

type FormStatus = "idle" | "sending" | "sent" | "error";

export function SupportForm({ orderId, userName }: SupportFormProps) {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const trimmed = message.trim();
      if (!trimmed || trimmed.length < 10) return;

      setStatus("sending");
      setErrorMsg(null);

      try {
        const res = await fetch("/api/support", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, message: trimmed }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(
            (data as { error?: string }).error ??
              `Failed to send message (HTTP ${res.status}).`
          );
        }

        setStatus("sent");
        setMessage("");
      } catch (err) {
        setStatus("error");
        setErrorMsg(
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again."
        );
      }
    },
    [message, orderId]
  );

  const handleReset = useCallback(() => {
    setStatus("idle");
    setErrorMsg(null);
  }, []);

  // ── Sent state ─────────────────────────────────────────────────────────────
  if (status === "sent") {
    return (
      <div className="flex flex-col items-center text-center py-6 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
          <CheckCircle2 className="h-6 w-6 text-emerald-400" />
        </div>
        <div>
          <p className="text-white font-semibold text-base">Message sent!</p>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            Thanks, {userName}. Our team will review your message and get back
            to you within 24 hours.
          </p>
        </div>
        <Button
          onClick={handleReset}
          variant="outline"
          size="sm"
          className="h-8 text-xs border-white/15 text-gray-400 hover:text-white hover:border-white/25 bg-transparent"
        >
          Send another message
        </Button>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <Textarea
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (status === "error") {
              setStatus("idle");
              setErrorMsg(null);
            }
          }}
          placeholder={`Hi, I have a question about order #${orderId}…`}
          rows={5}
          maxLength={2000}
          disabled={status === "sending"}
          className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-gray-600 focus:border-[#FF1B6B] focus:ring-[#FF1B6B]/20 resize-none text-sm leading-relaxed disabled:opacity-60 disabled:cursor-not-allowed"
        />
        <div className="absolute bottom-2 right-3 text-[11px] text-gray-700 tabular-nums pointer-events-none select-none">
          {message.length}/2000
        </div>
      </div>

      {/* Validation hint */}
      {message.trim().length > 0 && message.trim().length < 10 && (
        <p className="text-xs text-amber-500/80">
          Please write at least 10 characters.
        </p>
      )}

      {/* Error state */}
      {status === "error" && errorMsg && (
        <Alert className="border border-red-500/30 bg-red-500/6 py-2.5 px-3.5">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <AlertDescription className="text-red-300 text-sm">
              {errorMsg}
            </AlertDescription>
          </div>
        </Alert>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-700 leading-relaxed">
          We typically respond within{" "}
          <span className="text-gray-500">24 hours</span>.
        </p>

        <Button
          type="submit"
          disabled={
            status === "sending" ||
            message.trim().length < 10
          }
          className="bg-[#FF1B6B] hover:bg-[#FF1B6B]/90 text-white font-semibold shadow-md shadow-[#FF1B6B]/20 h-9 text-sm px-5 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {status === "sending" ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
              Sending…
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5 mr-2" />
              Send Message
            </>
          )}
        </Button>
      </div>

      {/* Icon watermark */}
      <div className="flex items-center gap-1.5 pt-1">
        <MessageSquare className="h-3 w-3 text-gray-800" />
        <p className="text-[11px] text-gray-700">
          Your message is sent directly to our support team along with your
          order details.
        </p>
      </div>
    </form>
  );
}
