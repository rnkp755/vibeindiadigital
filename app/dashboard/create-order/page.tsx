"use client";

import { useState } from "react";
import { Stage1Upload } from "@/components/create-order/Stage1Upload";
import { Stage2Details } from "@/components/create-order/Stage2Details";
import { CustomCursor } from "@/components/custom-cursor";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stage1Result {
  orderId: string;
  assetUrl: string;
  trackNames: string[];
}

type Stage = 1 | 2;

// ─── Step indicator ───────────────────────────────────────────────────────────

interface StepProps {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}

function Step({ number, label, active, completed }: StepProps) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shrink-0",
          completed
            ? "bg-emerald-500 border-2 border-emerald-500 text-white"
            : active
            ? "bg-[#FF1B6B] border-2 border-[#FF1B6B] text-white shadow-lg shadow-[#FF1B6B]/30"
            : "bg-transparent border-2 border-white/20 text-gray-500"
        )}
      >
        {completed ? <Check className="h-3.5 w-3.5" /> : number}
      </div>
      <span
        className={cn(
          "text-sm font-medium transition-colors duration-200 hidden sm:block",
          active
            ? "text-white"
            : completed
            ? "text-emerald-400"
            : "text-gray-600"
        )}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreateOrderPage() {
  const [stage, setStage] = useState<Stage>(1);
  const [stage1Result, setStage1Result] = useState<Stage1Result | null>(null);

  const handleStage1Complete = (data: Stage1Result) => {
    setStage1Result(data);
    setStage(2);
    // Scroll to top so user sees Stage 2 header
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGoBack = () => {
    setStage(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white cursor-none">
      <CustomCursor />

      {/* ── Ambient background glow ───────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-[#FF1B6B]/8 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full bg-[#FF1B6B]/4 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Create{" "}
            <span className="text-[#FF1B6B]">New Order</span>
          </h1>
          <p className="mt-2 text-sm text-gray-400 leading-relaxed max-w-lg">
            Upload your release ZIP, fill in the track details, and we'll
            distribute your music to all major platforms.
          </p>
        </div>

        {/* ── Stage stepper ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-0 mb-8">
          <Step
            number={1}
            label="Upload ZIP"
            active={stage === 1}
            completed={stage > 1}
          />

          {/* Connector */}
          <div className="flex-1 mx-3 h-0.5 rounded-full overflow-hidden bg-white/8 max-w-24 hidden sm:block">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                stage > 1 ? "bg-emerald-500 w-full" : "bg-transparent w-0"
              )}
            />
          </div>
          <div className="flex-shrink-0 mx-2 text-gray-700 sm:hidden text-xs">
            →
          </div>

          <Step
            number={2}
            label="Release Details"
            active={stage === 2}
            completed={false}
          />
        </div>

        {/* ── Stage content ──────────────────────────────────────────────────── */}
        <div className="relative">
          {stage === 1 && (
            <div
              key="stage-1"
              className="animate-in fade-in slide-in-from-right-4 duration-300"
            >
              <Stage1Upload onComplete={handleStage1Complete} />
            </div>
          )}

          {stage === 2 && stage1Result && (
            <div
              key="stage-2"
              className="animate-in fade-in slide-in-from-right-4 duration-300"
            >
              <Stage2Details
                orderId={stage1Result.orderId}
                assetUrl={stage1Result.assetUrl}
                trackNames={stage1Result.trackNames}
                onBack={handleGoBack}
              />
            </div>
          )}
        </div>

        {/* ── Bottom instructions card ──────────────────────────────────────── */}
        <div className="mt-10 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
          <p className="text-xs text-gray-600 leading-relaxed">
            <span className="text-gray-400 font-medium">Need help?</span> Your
            progress is automatically saved. If you leave and come back, we'll
            resume from where you left off. For any issues, reach out through
            the support form on your order page after submission.
          </p>
        </div>
      </div>
    </div>
  );
}
