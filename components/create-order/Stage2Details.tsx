"use client";

import { useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Music,
  Calendar,
  ExternalLink,
  Youtube,
  Radio,
  Link as LinkIcon,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  UserPlus,
  FileText,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, addDays, isAfter } from "date-fns";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const SOCIAL_PLATFORMS = [
  {
    value: "youtube",
    label: "YouTube",
    icon: Youtube,
    prefix: "https://youtube.com/@",
    placeholder: "yourchannel",
    color: "#FF0000",
  },
  {
    value: "spotify",
    label: "Spotify",
    icon: Radio,
    prefix: "https://open.spotify.com/artist/",
    placeholder: "artist_id",
    color: "#1DB954",
  },
  {
    value: "instagram",
    label: "Instagram",
    icon: LinkIcon,
    prefix: "https://instagram.com/",
    placeholder: "yourusername",
    color: "#E1306C",
  },
  {
    value: "twitter",
    label: "Twitter / X",
    icon: LinkIcon,
    prefix: "https://x.com/",
    placeholder: "yourusername",
    color: "#1DA1F2",
  },
  {
    value: "facebook",
    label: "Facebook",
    icon: LinkIcon,
    prefix: "https://facebook.com/",
    placeholder: "yourpage",
    color: "#1877F2",
  },
  {
    value: "other",
    label: "Other",
    icon: ExternalLink,
    prefix: "https://",
    placeholder: "yourwebsite.com/profile",
    color: "#888888",
  },
] as const;

type PlatformValue = (typeof SOCIAL_PLATFORMS)[number]["value"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrackMetadata {
  title: string;
  artist: string[]; // stored as array; user inputs comma-separated
  artistInput: string; // raw input field value
}

interface SocialLink {
  id: string;
  platform: PlatformValue;
  suffix: string; // the part after the prefix
}

interface Stage2Props {
  orderId: string;
  assetUrl: string;
  trackNames: string[]; // base names of WAV files from Stage 1
  onBack: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2, 9);
}

/**
 * Given a platform and a raw user input (could be full URL or just the suffix),
 * extract only the suffix part.
 */
function extractSuffix(platform: PlatformValue, raw: string): string {
  const p = SOCIAL_PLATFORMS.find((pl) => pl.value === platform);
  if (!p) return raw.trim();

  const prefix = p.prefix.toLowerCase();
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();

  // If the user pasted the full URL, strip the prefix
  if (lower.startsWith(prefix)) {
    return trimmed.slice(p.prefix.length);
  }

  // Also handle without protocol: e.g. "youtube.com/@channel"
  const withoutProtocol = prefix.replace(/^https?:\/\//i, "");
  if (lower.startsWith(withoutProtocol)) {
    return trimmed.slice(withoutProtocol.length);
  }

  // For youtube: handle /channel/ and /user/ variants too
  if (platform === "youtube") {
    const ytPatterns = [
      "https://www.youtube.com/@",
      "https://www.youtube.com/channel/",
      "https://www.youtube.com/user/",
      "http://youtube.com/@",
      "youtube.com/@",
      "youtube.com/channel/",
      "youtube.com/user/",
      "www.youtube.com/@",
    ];
    for (const pat of ytPatterns) {
      if (lower.startsWith(pat.toLowerCase())) {
        return trimmed.slice(pat.length);
      }
    }
  }

  // For spotify: handle /artist/ and trailing ?si= params
  if (platform === "spotify") {
    const cleaned = trimmed.split("?")[0]; // remove query params
    const spotifyPat = "https://open.spotify.com/artist/";
    if (cleaned.toLowerCase().startsWith(spotifyPat)) {
      return cleaned.slice(spotifyPat.length);
    }
  }

  return trimmed;
}

/**
 * Parse comma-separated artist string into an array.
 */
function parseArtists(input: string): string[] {
  return input
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Stage2Details({
  orderId,
  assetUrl,
  trackNames,
  onBack,
}: Stage2Props) {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  // ── Track metadata ─────────────────────────────────────────────────────────
  const [tracks, setTracks] = useState<TrackMetadata[]>(() =>
    trackNames.map((name) => ({
      title: name
        .replace(/_/g, " ")
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      artist: [],
      artistInput: "",
    }))
  );

  // ── Release date ───────────────────────────────────────────────────────────
  const minDate = addDays(new Date(), 10);
  const [releaseDate, setReleaseDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // ── Social links ───────────────────────────────────────────────────────────

  // Prefill from Clerk metadata on mount
  const [socials, setSocials] = useState<SocialLink[]>(() => {
    if (!isLoaded || !user) return [];
    const savedSocials = (
      user.publicMetadata as {
        socials?: { platform: string; link: string }[];
      }
    )?.socials;

    if (!Array.isArray(savedSocials) || savedSocials.length === 0) return [];

    return savedSocials.map((s) => {
      const platform = (
        SOCIAL_PLATFORMS.find((p) => p.value === s.platform)
          ? s.platform
          : "other"
      ) as PlatformValue;
      const platformData = SOCIAL_PLATFORMS.find((p) => p.value === platform)!;
      const suffix = s.link.startsWith(platformData.prefix)
        ? s.link.slice(platformData.prefix.length)
        : s.link;
      return { id: generateId(), platform, suffix };
    });
  });

  const [newSocialPlatform, setNewSocialPlatform] =
    useState<PlatformValue>("youtube");
  const [newSocialSuffix, setNewSocialSuffix] = useState("");
  const [savingSocials, setSavingSocials] = useState(false);
  const [socialSaveStatus, setSocialSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  // ── Notes ──────────────────────────────────────────────────────────────────
  const [notes, setNotes] = useState("");

  // ── Submission ─────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // ── Track metadata handlers ───────────────────────────────────────────────

  const updateTrackTitle = useCallback((idx: number, value: string) => {
    setTracks((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, title: value } : t))
    );
  }, []);

  const updateTrackArtistInput = useCallback((idx: number, value: string) => {
    setTracks((prev) =>
      prev.map((t, i) =>
        i === idx
          ? { ...t, artistInput: value, artist: parseArtists(value) }
          : t
      )
    );
  }, []);

  // ── Social link handlers ──────────────────────────────────────────────────

  const addSocial = useCallback(() => {
    const raw = newSocialSuffix.trim();
    if (!raw) return;

    const suffix = extractSuffix(newSocialPlatform, raw);
    if (!suffix) return;

    setSocials((prev) => [
      ...prev,
      { id: generateId(), platform: newSocialPlatform, suffix },
    ]);
    setNewSocialSuffix("");
  }, [newSocialPlatform, newSocialSuffix]);

  const removeSocial = useCallback((id: string) => {
    setSocials((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleSocialInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      // Auto-extract suffix as user types a full URL
      const suffix = extractSuffix(newSocialPlatform, val);
      setNewSocialSuffix(suffix !== val ? suffix : val);
    },
    [newSocialPlatform]
  );

  const saveSocialsToClerk = useCallback(async () => {
    if (!user || savingSocials) return;
    setSavingSocials(true);
    setSocialSaveStatus("saving");

    try {
      const socialsPayload = socials.map((s) => {
        const p = SOCIAL_PLATFORMS.find((pl) => pl.value === s.platform)!;
        return {
          platform: s.platform,
          link: `${p.prefix}${s.suffix}`,
        };
      });

      await user.update({
        unsafeMetadata: {
          ...(user.unsafeMetadata as object),
          socials: socialsPayload,
        },
      });

      // Also update public metadata via API (user.update only sets unsafeMetadata)
      // We do a best-effort server call
      await fetch("/api/user/socials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ socials: socialsPayload }),
      }).catch(() => {}); // non-critical

      setSocialSaveStatus("saved");
      setTimeout(() => setSocialSaveStatus("idle"), 2500);
    } catch {
      setSocialSaveStatus("error");
      setTimeout(() => setSocialSaveStatus("idle"), 3000);
    } finally {
      setSavingSocials(false);
    }
  }, [user, socials, savingSocials]);

  // ── Validation ─────────────────────────────────────────────────────────────

  const validate = useCallback((): string[] => {
    const errors: string[] = [];

    tracks.forEach((track, idx) => {
      if (!track.title.trim()) {
        errors.push(
          `Track ${idx + 1} (${trackNames[idx]}): Title is required.`
        );
      }
      if (track.artist.length === 0 || !track.artistInput.trim()) {
        errors.push(
          `Track ${idx + 1} (${trackNames[idx]}): At least one artist is required.`
        );
      }
    });

    if (!releaseDate) {
      errors.push("Release date is required.");
    } else if (!isAfter(releaseDate, minDate) && !isAfter(releaseDate, addDays(new Date(), 9))) {
      errors.push("Release date must be at least 10 days in the future.");
    }

    return errors;
  }, [tracks, releaseDate, trackNames, minDate]);

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    const errors = validate();
    setValidationErrors(errors);
    if (errors.length > 0) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const metadata = tracks.map((t) => ({
        title: t.title.trim(),
        artist: t.artist.length > 0 ? t.artist : [t.artistInput.trim()],
      }));

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          tracks: trackNames.length,
          asset_url: assetUrl,
          release_date: releaseDate!.toISOString(),
          metadata,
          rights_distribution: 100,
          notes: notes.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ?? `Failed to create order (HTTP ${res.status}).`
        );
      }

      // Clear the draft from localStorage
      localStorage.removeItem("vibeIndia_order_draft_v2");

      // Reload clerk user to get updated credits
      await user?.reload().catch(() => {});

      // Redirect to orders page
      router.push("/dashboard/orders");
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }, [validate, tracks, orderId, assetUrl, releaseDate, notes, trackNames, user, router]);

  // ── Platform helpers ───────────────────────────────────────────────────────

  const currentPlatformData = SOCIAL_PLATFORMS.find(
    (p) => p.value === newSocialPlatform
  )!;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to upload
        </button>
        <h2 className="text-2xl font-bold text-white mb-1">Release Details</h2>
        <p className="text-sm text-gray-400">
          Fill in the details for your{" "}
          <span className="text-white font-medium">
            {trackNames.length} track{trackNames.length !== 1 ? "s" : ""}
          </span>
          . Order #{orderId}.
        </p>
      </div>

      {/* ── Track Metadata ─────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Music className="h-4 w-4 text-[#FF1B6B]" />
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
            Track Info
          </h3>
        </div>

        {tracks.map((track, idx) => (
          <div
            key={trackNames[idx]}
            className="rounded-xl border border-white/8 bg-white/[0.025] p-4 space-y-4"
          >
            {/* Track header */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[#FF1B6B]/15 border border-[#FF1B6B]/20 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold text-[#FF1B6B]">
                  {idx + 1}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-mono truncate">
                {trackNames[idx]}.wav
              </p>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-400">
                Song Title <span className="text-[#FF1B6B]">*</span>
              </Label>
              <Input
                value={track.title}
                onChange={(e) => updateTrackTitle(idx, e.target.value)}
                placeholder="Enter song title"
                className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-gray-600 focus:border-[#FF1B6B] focus:ring-[#FF1B6B]/20 h-10"
              />
            </div>

            {/* Artist(s) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-400">
                Artist(s) <span className="text-[#FF1B6B]">*</span>
                <span className="ml-2 text-gray-600 font-normal">
                  — separate multiple artists with commas
                </span>
              </Label>
              <Input
                value={track.artistInput}
                onChange={(e) =>
                  updateTrackArtistInput(idx, e.target.value)
                }
                placeholder="Artist Name, Feat. Artist"
                className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-gray-600 focus:border-[#FF1B6B] focus:ring-[#FF1B6B]/20 h-10"
              />
              {/* Artist chips preview */}
              {track.artist.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {track.artist.map((a, ai) => (
                    <Badge
                      key={ai}
                      variant="outline"
                      className="text-xs border-[#FF1B6B]/25 text-[#FF1B6B] bg-[#FF1B6B]/8"
                    >
                      <UserPlus className="h-2.5 w-2.5 mr-1" />
                      {a}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Release Date ────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#FF1B6B]" />
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
            Release Date
          </h3>
        </div>

        <div className="rounded-xl border border-white/8 bg-white/[0.025] p-4 space-y-2">
          <Label className="text-xs font-medium text-gray-400">
            Expected Release Date <span className="text-[#FF1B6B]">*</span>
            <span className="ml-2 text-gray-600 font-normal">
              — must be at least 10 days from today
            </span>
          </Label>

          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "w-full flex items-center gap-3 px-3 h-10 rounded-lg border text-sm transition-all text-left",
                  releaseDate
                    ? "border-[#FF1B6B]/30 bg-[#FF1B6B]/5 text-white"
                    : "border-white/10 bg-[#1a1a1a] text-gray-500 hover:border-white/20"
                )}
              >
                <Calendar className="h-4 w-4 text-[#FF1B6B] shrink-0" />
                {releaseDate
                  ? format(releaseDate, "MMMM d, yyyy")
                  : "Select a release date"}
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0 bg-[#111111] border border-white/10 shadow-2xl shadow-black/60"
              align="start"
            >
              <CalendarUI
                mode="single"
                selected={releaseDate}
                onSelect={(date) => {
                  setReleaseDate(date ?? undefined);
                  setCalendarOpen(false);
                }}
                disabled={(date) => date <= addDays(new Date(), 9)}
                initialFocus
                fromDate={minDate}
                classNames={{
                  months: "text-white",
                  month: "space-y-3",
                  caption: "flex justify-center relative items-center px-2 pt-2",
                  caption_label: "text-sm font-semibold text-white",
                  nav: "flex items-center gap-1",
                  nav_button:
                    "h-7 w-7 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center text-gray-400 hover:text-white",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse",
                  head_row: "flex",
                  head_cell:
                    "text-gray-600 w-9 font-normal text-[11px] uppercase tracking-wide text-center py-2",
                  row: "flex w-full mt-1",
                  cell: "h-9 w-9 text-center text-sm p-0 relative",
                  day: cn(
                    "h-9 w-9 p-0 font-normal text-sm rounded-md",
                    "hover:bg-[#FF1B6B]/15 hover:text-[#FF1B6B] transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF1B6B]/50",
                    "text-gray-300"
                  ),
                  day_selected:
                    "bg-[#FF1B6B] text-white hover:bg-[#FF1B6B]/90 font-semibold",
                  day_today: "border border-white/20 text-white",
                  day_outside: "text-gray-700 opacity-50",
                  day_disabled: "text-gray-700 opacity-30 cursor-not-allowed hover:bg-transparent hover:text-gray-700",
                  day_hidden: "invisible",
                }}
              />
              <div className="px-3 py-2 border-t border-white/8">
                <p className="text-[11px] text-gray-600 text-center">
                  Dates before{" "}
                  <span className="text-gray-400">
                    {format(minDate, "MMM d, yyyy")}
                  </span>{" "}
                  are unavailable
                </p>
              </div>
            </PopoverContent>
          </Popover>

          {releaseDate && (
            <p className="text-xs text-emerald-400 flex items-center gap-1.5 pt-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Releasing on{" "}
              <span className="font-semibold">
                {format(releaseDate, "EEEE, MMMM d, yyyy")}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* ── Social Links ─────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ExternalLink className="h-4 w-4 text-[#FF1B6B]" />
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
            Social Links
          </h3>
          <span className="text-xs text-gray-600 font-normal">— optional</span>
        </div>

        <div className="rounded-xl border border-white/8 bg-white/[0.025] p-4 space-y-4">
          {/* Saved socials */}
          {socials.length > 0 && (
            <div className="space-y-2">
              {socials.map((s) => {
                const p = SOCIAL_PLATFORMS.find(
                  (pl) => pl.value === s.platform
                )!;
                const Icon = p.icon;
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.03] border border-white/8 group"
                  >
                    <Icon
                      className="h-4 w-4 flex-shrink-0"
                      style={{ color: p.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">{p.label}</p>
                      <p className="text-sm text-white truncate font-mono">
                        {p.prefix}
                        <span className="text-[#FF1B6B]">{s.suffix}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => removeSocial(s.id)}
                      className="p-1 rounded-md text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add new social */}
          <div className="flex gap-2 items-start">
            {/* Platform selector */}
            <Select
              value={newSocialPlatform}
              onValueChange={(v) => {
                setNewSocialPlatform(v as PlatformValue);
                setNewSocialSuffix("");
              }}
            >
              <SelectTrigger className="w-36 h-10 bg-[#1a1a1a] border-white/10 text-white text-sm shrink-0 focus:border-[#FF1B6B]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#111111] border border-white/10">
                {SOCIAL_PLATFORMS.map((p) => {
                  const Icon = p.icon;
                  return (
                    <SelectItem
                      key={p.value}
                      value={p.value}
                      className="text-white hover:bg-white/5 focus:bg-white/8 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Icon
                          className="h-3.5 w-3.5"
                          style={{ color: p.color }}
                        />
                        {p.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Input with prefix */}
            <div className="flex-1 relative">
              <div className="flex h-10 rounded-lg border border-white/10 bg-[#1a1a1a] overflow-hidden focus-within:border-[#FF1B6B] transition-colors">
                <span className="flex items-center px-2.5 text-[11px] text-gray-600 font-mono border-r border-white/8 bg-white/[0.02] whitespace-nowrap shrink-0 max-w-[140px] truncate">
                  {currentPlatformData.prefix}
                </span>
                <input
                  type="text"
                  value={newSocialSuffix}
                  onChange={handleSocialInput}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSocial();
                    }
                  }}
                  placeholder={currentPlatformData.placeholder}
                  className="flex-1 bg-transparent text-white text-sm px-2.5 placeholder:text-gray-600 outline-none min-w-0"
                />
              </div>
            </div>

            {/* Add button */}
            <Button
              onClick={addSocial}
              disabled={!newSocialSuffix.trim()}
              size="icon"
              className="h-10 w-10 shrink-0 bg-[#FF1B6B]/15 hover:bg-[#FF1B6B]/25 border border-[#FF1B6B]/25 text-[#FF1B6B] disabled:opacity-40 disabled:cursor-not-allowed"
              title="Add social link"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Save to Clerk button */}
          {socials.length > 0 && (
            <div className="flex items-center justify-between pt-1 border-t border-white/6">
              <p className="text-xs text-gray-600">
                Save these links to your profile so they auto-fill next time.
              </p>
              <Button
                onClick={saveSocialsToClerk}
                disabled={savingSocials || socialSaveStatus === "saved"}
                size="sm"
                variant="outline"
                className={cn(
                  "h-7 text-xs border px-3 transition-all",
                  socialSaveStatus === "saved"
                    ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/8"
                    : socialSaveStatus === "error"
                    ? "border-red-500/30 text-red-400 bg-red-500/8"
                    : "border-white/15 text-gray-400 hover:text-white hover:border-white/25 bg-transparent"
                )}
              >
                {savingSocials ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                ) : socialSaveStatus === "saved" ? (
                  <CheckCircle2 className="h-3 w-3 mr-1.5" />
                ) : (
                  <Save className="h-3 w-3 mr-1.5" />
                )}
                {socialSaveStatus === "saved"
                  ? "Saved!"
                  : socialSaveStatus === "error"
                  ? "Failed"
                  : "Save to Profile"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Notes ───────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#FF1B6B]" />
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
            Notes
          </h3>
          <span className="text-xs text-gray-600 font-normal">— optional</span>
        </div>

        <div className="rounded-xl border border-white/8 bg-white/[0.025] p-4 space-y-2">
          <Label className="text-xs text-gray-400">
            Anything special about this release? Share it with our team.
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. This is a collaboration with XYZ artist. Please ensure the release lands before a specific event. Special credit requests, etc."
            rows={4}
            maxLength={2000}
            className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-gray-600 focus:border-[#FF1B6B] focus:ring-[#FF1B6B]/20 resize-none text-sm leading-relaxed"
          />
          <div className="flex justify-end">
            <span className="text-xs text-gray-700 tabular-nums">
              {notes.length}/2000
            </span>
          </div>
        </div>
      </div>

      {/* ── Validation errors ────────────────────────────────────────────────── */}
      {validationErrors.length > 0 && (
        <div className="space-y-2">
          {validationErrors.map((err, i) => (
            <Alert
              key={i}
              className="border border-red-500/30 bg-red-500/6 py-2.5 px-3.5"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <AlertDescription className="text-red-300 text-sm">
                  {err}
                </AlertDescription>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* ── Submit error ─────────────────────────────────────────────────────── */}
      {submitError && (
        <Alert className="border border-red-500/30 bg-red-500/6 py-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-300">
                Order creation failed
              </p>
              <p className="text-xs text-red-400/80 mt-0.5">{submitError}</p>
            </div>
          </div>
        </Alert>
      )}

      {/* ── Credit info ──────────────────────────────────────────────────────── */}
      {isLoaded && user && (
        <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#FF1B6B]/15 border border-[#FF1B6B]/20 flex items-center justify-center shrink-0">
            <Music className="h-4 w-4 text-[#FF1B6B]" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-300">
              This order requires{" "}
              <span className="font-bold text-white">
                {trackNames.length} credit{trackNames.length !== 1 ? "s" : ""}
              </span>
            </p>
            <p className="text-xs text-gray-600 mt-0.5">
              Your balance:{" "}
              <span
                className={cn(
                  "font-semibold",
                  typeof user.publicMetadata?.credits === "number" &&
                    (user.publicMetadata.credits as number) >= trackNames.length
                    ? "text-emerald-400"
                    : "text-amber-400"
                )}
              >
                {typeof user.publicMetadata?.credits === "number"
                  ? (user.publicMetadata.credits as number).toLocaleString()
                  : "—"}{" "}
                credits
              </span>
              {typeof user.publicMetadata?.credits === "number" &&
                (user.publicMetadata.credits as number) < trackNames.length && (
                  <span className="text-amber-400">
                    {" "}
                    — order will be marked as{" "}
                    <span className="font-semibold">unpaid</span>. You can pay
                    later.
                  </span>
                )}
            </p>
          </div>
        </div>
      )}

      {/* ── Submit / Back ────────────────────────────────────────────────────── */}
      <div className="flex gap-3 pt-2">
        <Button
          onClick={onBack}
          variant="outline"
          className="border-white/15 text-gray-400 hover:text-white hover:border-white/25 bg-transparent h-11"
          disabled={submitting}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 bg-[#FF1B6B] hover:bg-[#FF1B6B]/90 text-white font-semibold shadow-lg shadow-[#FF1B6B]/20 h-11 text-base"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating Order…
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4 mr-2 rotate-180 hidden" />
              Submit Order
              <ChevronRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
