"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronRight,
  Disc3,
  Headphones,
  LayoutDashboard,
  LogIn,
  Music2,
  Play,
  ShieldCheck,
  Sparkles,
  Upload,
  Wallet,
  Waves,
} from "lucide-react";

import { CustomCursor } from "@/components/custom-cursor";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

const platformLogos = [
  "Spotify",
  "Apple Music",
  "YouTube Music",
  "Instagram",
  "TikTok",
  "JioSaavn",
  "Amazon Music",
  "Gaana",
];

const releaseSteps = [
  {
    step: "01",
    title: "Sign in and start a release request",
    copy:
      "Create your account, open a release order, and move straight into the upload flow without hunting for the next step.",
    icon: LogIn,
  },
  {
    step: "02",
    title: "Upload masters and cover art",
    copy:
      "Bring your WAV files, artwork, and release assets together in one place so the submission stays clean from the start.",
    icon: Upload,
  },
  {
    step: "03",
    title: "Pay once and lock the drop",
    copy:
      "Choose the right plan, pay a one-time fee, and keep control of your catalog without subscription anxiety.",
    icon: Wallet,
  },
  {
    step: "04",
    title: "Track status until it goes live",
    copy:
      "Watch the release move through review, payment, and delivery stages so you always know what is happening next.",
    icon: LayoutDashboard,
  },
];

const advantageColumns = [
  {
    eyebrow: "For creators",
    title: "Designed for people distributing a message, not filling a spreadsheet.",
    points: [
      "Direct release language instead of platform jargon",
      "Clear states around upload, payment, and approval",
      "Support framed around shipping the release, not filing tickets",
    ],
  },
  {
    eyebrow: "For momentum",
    title: "Microinteractions that feel musical without slowing the work down.",
    points: [
      "Fast hover and press feedback with reduced-motion fallbacks",
      "Color used as a signal for energy, readiness, and progress",
      "Visual rhythm that feels more editorial than templated",
    ],
  },
];

const statusNotes = [
  { label: "Masters checked", value: "2 WAV + 2 covers ready", tone: "ready" },
  { label: "Payment", value: "Pending confirmation", tone: "pending" },
  { label: "Distribution", value: "Queued for platform delivery", tone: "active" },
];

const faqs = [
  {
    q: "How fast can my release move after payment?",
    a: "Most releases can be prepared for delivery within 24 to 48 hours after the assets and payment are confirmed. Some stores can take longer to publish.",
  },
  {
    q: "Do I keep my rights?",
    a: "Yes. The platform is built around distribution, not ownership transfer. You keep control of your music and artwork.",
  },
  {
    q: "What do I need before I start?",
    a: "Prepare WAV masters, square cover art, release details, and the payout information you want tied to the order. The create-order flow is designed around exactly that set.",
  },
  {
    q: "Can I track where my release is stuck?",
    a: "Yes. The workflow is meant to make status visible so artists can see whether the order is waiting on upload checks, payment, review, or distribution.",
  },
];

function Surface({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("surface-panel rounded-[28px]", className)}>{children}</div>;
}

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  if (isLoaded && isSignedIn) {
    return null;
  }

  return (
    <main className="min-h-screen cursor-none overflow-x-hidden text-white">
      <CustomCursor />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="hero-grid absolute inset-x-0 top-0 h-[720px] opacity-25" />
        <div className="float-drift absolute left-[6%] top-28 h-40 w-40 rounded-full bg-[#ff1b6b]/14 blur-3xl" />
        <div className="float-drift-delay absolute right-[10%] top-40 h-48 w-48 rounded-full bg-[#ff914d]/12 blur-3xl" />
        <div className="absolute inset-x-0 top-[34rem] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <nav className="sticky top-0 z-50 border-b border-white/6 bg-[#0b0712]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.28)]">
              <Waves className="h-5 w-5 text-[#ff1b6b] transition-transform duration-200 group-hover:scale-110" />
            </div>
            <div>
              <div
                className="text-lg font-bold tracking-[-0.04em]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                VibeIndia Digital
              </div>
              <div className="text-xs uppercase tracking-[0.28em] text-[#a7a0ba]">
                Release distribution
              </div>
            </div>
          </Link>

          <div className="hidden items-center gap-8 text-sm text-[#bfb8d3] md:flex">
            <a href="#flow" className="hover:text-white">
              Flow
            </a>
            <a href="#why-us" className="hover:text-white">
              Why us
            </a>
            <a href="#faq" className="hover:text-white">
              FAQ
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Button asChild variant="outline" className="border-white/12 bg-white/5 text-white hover:bg-white/10">
              <Link href="/sign-in">
                <LogIn className="mr-2 h-4 w-4" />
                Sign in
              </Link>
            </Button>
            <Button
              asChild
              className="bg-[#ff1b6b] px-5 text-white shadow-[0_18px_40px_rgba(255,27,107,0.28)] hover:bg-[#ff1b6b]/92 hover:shadow-[0_22px_46px_rgba(255,27,107,0.34)]"
            >
              <Link href="/sign-up">
                Start release
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative px-5 pb-20 pt-12 sm:px-6 lg:px-8 lg:pb-28 lg:pt-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.12fr_0.88fr] lg:items-end">
          <div className="reveal-up" style={{ animationDelay: "60ms" }}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs uppercase tracking-[0.24em] text-[#ffb48a]">
              <Sparkles className="h-3.5 w-3.5 text-[#ff1b6b]" />
              Dark mode only. Creator-first.
            </div>

            <h1 className="max-w-4xl text-[clamp(3.4rem,8vw,7rem)] font-bold leading-[0.95] tracking-[-0.06em] text-white">
              Drop your next
              <span className="block text-[#ff1b6b]">release with pulse.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#c8c2d8] sm:text-xl">
              VibeIndia Digital gives musicians, singers, and lyricists a clear path
              from sign-in to upload, payment, and live distribution without making
              the process feel corporate or flat.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Button
                asChild
                size="lg"
                className="h-14 bg-[#ff1b6b] px-7 text-base font-semibold text-white shadow-[0_20px_50px_rgba(255,27,107,0.3)] hover:-translate-y-0.5 hover:bg-[#ff1b6b]/92"
              >
                <Link href="/sign-up">
                  Create your release order
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-14 border-white/12 bg-white/5 px-7 text-base text-white hover:-translate-y-0.5 hover:bg-white/10"
              >
                <Link href="/sign-in">
                  <Play className="mr-2 h-4 w-4" />
                  Go to sign in
                </Link>
              </Button>
            </div>

            <div className="mt-10 flex flex-wrap gap-3 text-sm text-[#d8d2e6]">
              {[
                "One-time payment",
                "Upload assets once",
                "Track release status",
              ].map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2"
                >
                  <Check className="h-4 w-4 text-[#ff914d]" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="reveal-up" style={{ animationDelay: "180ms" }}>
            <Surface className="relative overflow-hidden p-6 sm:p-7">
              <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#ff1b6b]/18 to-transparent" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-[#a7a0ba]">
                      Release cockpit
                    </p>
                    <h2 className="mt-2 text-2xl font-bold">Midnight Prayer EP</h2>
                  </div>
                  <span className="rounded-full border border-[#ff914d]/30 bg-[#ff914d]/10 px-3 py-1 text-xs font-medium text-[#ffd3b0]">
                    3 steps complete
                  </span>
                </div>

                <div className="mt-6 grid gap-3">
                  {statusNotes.map((note, index) => (
                    <div
                      key={note.label}
                      className="rounded-3xl border border-white/8 bg-black/20 p-4 reveal-up"
                      style={{ animationDelay: `${260 + index * 70}ms` }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-[#a7a0ba]">{note.label}</p>
                          <p className="mt-1 text-sm font-medium text-white">
                            {note.value}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "mt-1 h-2.5 w-2.5 rounded-full",
                            note.tone === "ready" && "bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.45)]",
                            note.tone === "pending" && "bg-[#ff914d] shadow-[0_0_20px_rgba(255,145,77,0.35)]",
                            note.tone === "active" && "bg-[#ff1b6b] shadow-[0_0_20px_rgba(255,27,107,0.45)]"
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                  <div className="flex items-center justify-between text-sm text-[#a7a0ba]">
                    <span>What happens next</span>
                    <span>Today</span>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    {[
                      { icon: Upload, title: "Asset review" },
                      { icon: BadgeCheck, title: "Payment verify" },
                      { icon: Music2, title: "Store delivery" },
                    ].map((item) => (
                      <div key={item.title} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                        <item.icon className="h-5 w-5 text-[#ff1b6b]" />
                        <p className="mt-3 text-sm font-medium text-white">
                          {item.title}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Surface>
          </div>
        </div>
      </section>

      <section className="px-5 pb-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[30px] border border-white/8 bg-white/[0.03] px-6 py-5">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 text-sm uppercase tracking-[0.22em] text-[#a7a0ba]">
              <span className="text-white/80">Platforms in the release mix</span>
              {platformLogos.map((platform) => (
                <span key={platform} className="text-white/70 transition-colors hover:text-white">
                  {platform}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="flow" className="px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <p className="text-sm uppercase tracking-[0.28em] text-[#ffb48a]">
                Onboarding flow
              </p>
              <h2 className="mt-4 max-w-md text-4xl font-bold leading-tight sm:text-5xl">
                The first release should feel obvious in under a minute.
              </h2>
              <p className="mt-5 max-w-md text-base leading-7 text-[#bfb8d3]">
                The experience is built around one job: get creators from account
                creation to a submitted order with confidence and visible progress.
              </p>
            </div>

            <div className="grid gap-5">
              {releaseSteps.map((item, index) => (
                <Surface
                  key={item.step}
                  className={cn(
                    "reveal-up grid gap-5 p-6 sm:p-7 md:grid-cols-[96px_1fr]",
                    index % 2 === 1 && "md:translate-x-10"
                  )}
                >
                  <div className="flex items-center justify-between md:block">
                    <span className="font-display text-5xl font-bold text-white/14">
                      {item.step}
                    </span>
                    <item.icon className="h-8 w-8 text-[#ff1b6b]" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{item.title}</h3>
                    <p className="mt-3 max-w-2xl text-base leading-7 text-[#bfb8d3]">
                      {item.copy}
                    </p>
                  </div>
                </Surface>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="why-us" className="px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Surface className="overflow-hidden p-7 sm:p-8">
            <div className="flex items-center gap-3 text-[#ffb48a]">
              <Disc3 className="h-5 w-5" />
              <p className="text-sm uppercase tracking-[0.26em]">Why creators stick</p>
            </div>
            <h2 className="mt-4 max-w-xl text-4xl font-bold leading-tight">
              Modern enough to feel alive. Clear enough to trust with money and music.
            </h2>
            <div className="mt-8 grid gap-8 lg:grid-cols-2">
              {advantageColumns.map((column) => (
                <div key={column.eyebrow}>
                  <p className="text-sm uppercase tracking-[0.22em] text-[#a7a0ba]">
                    {column.eyebrow}
                  </p>
                  <h3 className="mt-3 text-2xl font-bold leading-tight">
                    {column.title}
                  </h3>
                  <ul className="mt-5 space-y-3 text-sm leading-7 text-[#c8c2d8]">
                    {column.points.map((point) => (
                      <li key={point} className="flex items-start gap-3">
                        <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#ff1b6b]" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Surface>

          <div className="grid gap-6">
            <Surface className="p-6 sm:p-7">
              <p className="text-sm uppercase tracking-[0.22em] text-[#a7a0ba]">
                Built-in trust
              </p>
              <div className="mt-5 flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff1b6b]/12">
                  <ShieldCheck className="h-6 w-6 text-[#ff1b6b]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Rights stay with the artist</h3>
                  <p className="mt-2 text-sm leading-7 text-[#c8c2d8]">
                    The value proposition is simple: pay once, distribute the release,
                    and keep ownership visible in the story and interface.
                  </p>
                </div>
              </div>
            </Surface>

            <Surface className="p-6 sm:p-7">
              <p className="text-sm uppercase tracking-[0.22em] text-[#a7a0ba]">
                Status visibility
              </p>
              <div className="mt-6 space-y-4">
                {[
                  "Upload received",
                  "Payment matched",
                  "Review in progress",
                  "Sent to platforms",
                ].map((item, index) => (
                  <div key={item} className="flex items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-semibold text-white">
                      {index + 1}
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
                    <span className="text-sm text-[#d7d0e7]">{item}</span>
                  </div>
                ))}
              </div>
            </Surface>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <Surface className="grid gap-8 overflow-hidden p-7 sm:p-8 lg:grid-cols-[0.92fr_1.08fr]">
            <div>
              <p className="text-sm uppercase tracking-[0.26em] text-[#ffb48a]">
                Aha moment
              </p>
              <h2 className="mt-4 max-w-lg text-4xl font-bold leading-tight">
                The colors and microinteractions should make the platform feel like a release booth, not a form dump.
              </h2>
              <p className="mt-5 max-w-lg text-base leading-7 text-[#bfb8d3]">
                That means focused highlights, tactile buttons, and enough movement to
                make status and action feel alive, while still respecting reduced-motion
                settings and keeping the path to payment obvious.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: Headphones,
                  title: "Feedback with restraint",
                  text: "Hover, press, and focus states are quick and legible instead of flashy for the sake of it.",
                },
                {
                  icon: Music2,
                  title: "Color with a job",
                  text: "Pink carries urgency and release energy, amber supports highlights, and the dark field keeps them readable.",
                },
                {
                  icon: BadgeCheck,
                  title: "Onboarding in the UI",
                  text: "The homepage now teaches the core release path instead of burying it under generic marketing claims.",
                },
                {
                  icon: Sparkles,
                  title: "Gen Z, not gimmick",
                  text: "The tone stays modern and music-adjacent without turning into neon gamer UI or AI-generated gloss.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[24px] border border-white/8 bg-black/20 p-5 hover:-translate-y-1 hover:border-white/14"
                >
                  <item.icon className="h-6 w-6 text-[#ff1b6b]" />
                  <h3 className="mt-4 text-lg font-bold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[#c8c2d8]">{item.text}</p>
                </div>
              ))}
            </div>
          </Surface>
        </div>
      </section>

      <section id="faq" className="px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.28em] text-[#ffb48a]">
              FAQ
            </p>
            <h2 className="mt-4 text-4xl font-bold sm:text-5xl">
              The questions artists ask before they hit upload.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#bfb8d3]">
              Clear answers matter more than filler copy when money, rights, and release
              timing are involved.
            </p>
          </div>

          <Accordion type="single" collapsible className="mt-10 space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={faq.q}
                value={`item-${index}`}
                className="rounded-[24px] border border-white/8 bg-white/[0.03] px-6"
              >
                <AccordionTrigger className="text-left text-base font-medium text-white hover:text-[#ffb48a]">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-sm leading-7 text-[#c8c2d8]">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="px-5 pb-20 pt-10 sm:px-6 lg:px-8 lg:pb-28">
        <div className="mx-auto max-w-5xl">
          <Surface className="overflow-hidden px-7 py-10 text-center sm:px-10 sm:py-12">
            <div className="mx-auto max-w-3xl">
              <p className="text-sm uppercase tracking-[0.28em] text-[#ffb48a]">
                Start the drop
              </p>
              <h2 className="mt-4 text-4xl font-bold sm:text-5xl">
                Bring the track, the artwork, and the intent. We handle the release path.
              </h2>
              <p className="mt-5 text-base leading-7 text-[#c8c2d8] sm:text-lg">
                Create the order, upload the assets, pay once, and keep your eye on the
                status from dashboard to distribution.
              </p>
            </div>

            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-14 bg-[#ff1b6b] px-7 text-base font-semibold text-white shadow-[0_20px_50px_rgba(255,27,107,0.3)] hover:-translate-y-0.5 hover:bg-[#ff1b6b]/92"
              >
                <Link href="/sign-up">
                  Get started
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-14 border-white/12 bg-white/5 px-7 text-base text-white hover:-translate-y-0.5 hover:bg-white/10"
              >
                <Link href="/sign-in">Already have an account</Link>
              </Button>
            </div>
          </Surface>
        </div>
      </section>
    </main>
  );
}
