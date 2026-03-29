"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import {
  Music2,
  PlusCircle,
  ListOrdered,
  CreditCard,
  Coins,
  Menu,
  X,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface DashboardNavbarProps {
  /** SSR-resolved credits (used as initial value before client hydration) */
  credits?: number;
  userEmail?: string;
  userName?: string;
  userImageUrl?: string;
}

const navLinks = [
  {
    href: "/dashboard/create-order",
    label: "Create Order",
    icon: PlusCircle,
  },
  {
    href: "/dashboard/orders",
    label: "My Orders",
    icon: ListOrdered,
  },
  {
    href: "/dashboard/buy-credits",
    label: "Buy Credits",
    icon: CreditCard,
  },
];

export function DashboardNavbar({
  credits: ssrCredits = 0,
  userEmail: ssrEmail = "",
  userName: ssrName = "",
  userImageUrl: ssrImage = "",
}: DashboardNavbarProps) {
  const pathname = usePathname();
  const { user, isLoaded } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Prefer live Clerk data once hydrated, fall back to SSR props
  const credits: number = isLoaded
    ? typeof user?.publicMetadata?.credits === "number"
      ? (user.publicMetadata.credits as number)
      : ssrCredits
    : ssrCredits;

  const isAdmin = isLoaded
    ? (user?.publicMetadata as { role?: string })?.role === "admin"
    : false;

  // We pass ssrImage/ssrName only as aria labels / fallback; Clerk's UserButton
  // renders the actual avatar independently.
  void ssrEmail;
  void ssrName;
  void ssrImage;

  return (
    <>
      {/* ── Desktop / Tablet Navbar ──────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-[#0d0d0d]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
          {/* ── Logo ───────────────────────────────────────────────────── */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 shrink-0 group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#FF1B6B]/20 border border-[#FF1B6B]/30 flex items-center justify-center group-hover:bg-[#FF1B6B]/30 transition-colors">
              <Music2 className="h-4 w-4 text-[#FF1B6B]" />
            </div>
            <span className="hidden sm:block text-base font-bold tracking-tight">
              Vibe<span className="text-[#FF1B6B]">India</span>
              <span className="ml-1.5 text-[10px] font-semibold text-[#FF1B6B]/70 bg-[#FF1B6B]/10 border border-[#FF1B6B]/20 px-1.5 py-0.5 rounded-full align-middle">
                Digital
              </span>
            </span>
          </Link>

          {/* ── Nav Links (md+) ─────────────────────────────────────────── */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                    active
                      ? "bg-[#FF1B6B]/15 text-[#FF1B6B] border border-[#FF1B6B]/25"
                      : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              );
            })}

            {isAdmin && (
              <Link
                href="/admin"
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                  pathname.startsWith("/admin")
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                    : "text-gray-400 hover:text-amber-400 hover:bg-amber-500/5 border border-transparent",
                )}
              >
                <ShieldCheck className="h-4 w-4 shrink-0" />
                Admin
              </Link>
            )}
          </nav>

          {/* ── Right side: Credits + Avatar + Mobile toggle ─────────────── */}
          <div className="flex items-center gap-3">
            {/* Credits chip — desktop */}
            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full
                         bg-[#FF1B6B]/10 border border-[#FF1B6B]/20 select-none cursor-default"
              title="Available distribution credits"
            >
              <Coins className="h-3.5 w-3.5 text-[#FF1B6B] shrink-0" />
              {!isLoaded ? (
                <span className="w-6 h-3 rounded bg-white/10 animate-pulse inline-block" />
              ) : (
                <span className="text-sm font-semibold text-[#FF1B6B] tabular-nums leading-none">
                  {credits.toLocaleString()}
                </span>
              )}
              <span className="text-xs text-[#FF1B6B]/60 font-medium hidden lg:inline">
                credits
              </span>
            </div>

            {/* Credits chip — mobile (compact) */}
            <div
              className="flex sm:hidden items-center gap-1 px-2 py-1 rounded-full
                         bg-[#FF1B6B]/10 border border-[#FF1B6B]/20 select-none"
            >
              <Coins className="h-3 w-3 text-[#FF1B6B]" />
              {!isLoaded ? (
                <span className="w-4 h-2.5 rounded bg-white/10 animate-pulse inline-block" />
              ) : (
                <span className="text-xs font-bold text-[#FF1B6B] tabular-nums">
                  {credits}
                </span>
              )}
            </div>

            {/* Clerk UserButton */}
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox:
                    "w-8 h-8 ring-2 ring-[#FF1B6B]/30 hover:ring-[#FF1B6B]/60 transition-all rounded-full",
                  userButtonPopoverCard:
                    "bg-[#111111] border border-white/10 shadow-2xl shadow-black/60",
                  userButtonPopoverActions: "bg-transparent",
                  userButtonPopoverActionButton:
                    "text-white hover:bg-white/5 transition-colors",
                  userButtonPopoverActionButtonText: "text-white text-sm",
                  userButtonPopoverActionButtonIcon: "text-gray-400",
                  userButtonPopoverFooter: "hidden",
                  userPreviewMainIdentifier: "text-white font-semibold",
                  userPreviewSecondaryIdentifier: "text-gray-400 text-xs",
                },
              }}
            >
              <UserButton.MenuItems>
                <UserButton.Link
                  label="Dashboard"
                  labelIcon={<LayoutDashboard className="h-4 w-4" />}
                  href="/dashboard"
                />
                <UserButton.Link
                  label="My Orders"
                  labelIcon={<ListOrdered className="h-4 w-4" />}
                  href="/dashboard/orders"
                />
                <UserButton.Link
                  label="Buy Credits"
                  labelIcon={<CreditCard className="h-4 w-4" />}
                  href="/dashboard/buy-credits"
                />
              </UserButton.MenuItems>
            </UserButton>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Drawer ────────────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Panel */}
          <nav
            className="absolute top-16 left-0 right-0 bg-[#0d0d0d] border-b border-white/[0.06] px-4 py-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-1">
              {navLinks.map(({ href, label, icon: Icon }) => {
                const active =
                  pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                      active
                        ? "bg-[#FF1B6B]/15 text-[#FF1B6B] border border-[#FF1B6B]/25"
                        : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent",
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {label}
                  </Link>
                );
              })}

              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                    pathname.startsWith("/admin")
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                      : "text-gray-400 hover:text-amber-400 hover:bg-amber-500/5 border border-transparent",
                  )}
                >
                  <ShieldCheck className="h-5 w-5 shrink-0" />
                  Admin Dashboard
                  <Badge className="ml-auto text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/30 px-1.5 py-0">
                    Admin
                  </Badge>
                </Link>
              )}

              {/* Credits row */}
              <div className="mt-3 mx-1 px-4 py-3 rounded-xl bg-[#FF1B6B]/8 border border-[#FF1B6B]/15 flex items-center gap-2">
                <Coins className="h-4 w-4 text-[#FF1B6B] shrink-0" />
                <span className="text-sm text-gray-300">Available Credits</span>
                <span className="ml-auto text-base font-bold text-[#FF1B6B] tabular-nums">
                  {!isLoaded ? "—" : credits.toLocaleString()}
                </span>
              </div>
            </div>
          </nav>
        </div>
      )}

      {/* Spacer — prevents content from hiding behind the fixed navbar */}
      <div className="h-16 shrink-0" />
    </>
  );
}
