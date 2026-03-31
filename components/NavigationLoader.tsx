"use client";

import { useNavigation } from "./NavigationProvider";

export function NavigationLoader() {
  const { isNavigating } = useNavigation();

  if (!isNavigating) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-sm flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-2 border-white/10" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#FF1B6B] animate-spin" />
        </div>
        <p className="text-sm text-gray-400 tracking-wide">Loading…</p>
      </div>
    </div>
  );
}