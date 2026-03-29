"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import JSZip from "jszip";
import {
  Upload,
  FileArchive,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  RefreshCw,
  Music,
  Image as ImageIcon,
  AlertTriangle,
  FileMusic,
  Loader2,
  FolderOpen,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

// ─── Constants ──────────────────────────────────────────────────────────────

const COVER_ART_WIDTH = parseInt(
  process.env.NEXT_PUBLIC_COVER_ART_WIDTH ?? "3000",
  10
);
const COVER_ART_HEIGHT = parseInt(
  process.env.NEXT_PUBLIC_COVER_ART_HEIGHT ?? "3000",
  10
);
const COVER_ART_LENIENCY = parseInt(
  process.env.NEXT_PUBLIC_COVER_ART_LENIENCY ?? "5",
  10
);

const STORAGE_KEY = "vibeIndia_order_draft_v2";
const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── Types ───────────────────────────────────────────────────────────────────

interface FileEntry {
  name: string;
  baseName: string;
  ext: string;
  size: number;
  path: string;
}

interface TrackValidation {
  wavName: string;
  wavPath: string;
  hasImage: boolean;
  imageName?: string;
  imagePath?: string;
  resolution?: { width: number; height: number };
  resolutionOk?: boolean;
}

interface ValidationResult {
  isValid: boolean;
  issues: { type: "error" | "warning"; message: string }[];
  tracks: TrackValidation[];
  trackCount: number;
  allFiles: FileEntry[];
}

interface DraftData {
  orderId: string;
  emailPrefix: string;
  assetUrl: string;
  trackNames: string[];
  timestamp: number;
}

interface Stage1Props {
  onComplete: (data: {
    orderId: string;
    assetUrl: string;
    trackNames: string[];
  }) => void;
}

// ─── Pure Helpers ─────────────────────────────────────────────────────────────

function getBaseName(filePath: string): string {
  const justName = filePath.split("/").pop() ?? filePath;
  const dotIdx = justName.lastIndexOf(".");
  return dotIdx > 0 ? justName.slice(0, dotIdx) : justName;
}

function getExt(filePath: string): string {
  const justName = filePath.split("/").pop() ?? filePath;
  const dotIdx = justName.lastIndexOf(".");
  return dotIdx > 0 ? justName.slice(dotIdx + 1).toLowerCase() : "";
}

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

function isImageExt(ext: string): boolean {
  return ext === "jpg" || ext === "jpeg" || ext === "png";
}

async function checkImageResolution(
  blob: Blob
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to decode image"));
    };
    img.src = url;
  });
}

// ─── ZIP Parser + Validator ───────────────────────────────────────────────────

async function parseAndValidateZip(file: File): Promise<ValidationResult> {
  const issues: { type: "error" | "warning"; message: string }[] = [];
  const allFiles: FileEntry[] = [];

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    return {
      isValid: false,
      issues: [
        {
          type: "error",
          message:
            "Could not open the ZIP file. Please ensure it is a valid .zip archive.",
        },
      ],
      tracks: [],
      trackCount: 0,
      allFiles: [],
    };
  }

  // Collect all non-directory entries, skipping macOS metadata
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    if (
      path.startsWith("__MACOSX/") ||
      path.includes("/.") ||
      path.split("/").pop()?.startsWith(".")
    )
      continue;

    const ext = getExt(path);
    const baseName = getBaseName(path);
    // JSZip exposes uncompressed size via _data (semi-private but stable across v3)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const size: number = (entry as any)._data?.uncompressedSize ?? 0;
    const name = path.split("/").pop()!;

    allFiles.push({ name, baseName, ext, size, path });
  }

  if (allFiles.length === 0) {
    return {
      isValid: false,
      issues: [
        {
          type: "error",
          message: "The ZIP file appears to be empty or contains only hidden files.",
        },
      ],
      tracks: [],
      trackCount: 0,
      allFiles: [],
    };
  }

  // Find WAV files
  const wavFiles = allFiles.filter((f) => f.ext === "wav");

  if (wavFiles.length === 0) {
    issues.push({
      type: "error",
      message:
        "No WAV files found in the ZIP. Each audio track must be a .wav file.",
    });
    return { isValid: false, issues, tracks: [], trackCount: 0, allFiles };
  }

  // Validate each track
  const tracks: TrackValidation[] = [];

  for (const wav of wavFiles) {
    // Find corresponding image (case-insensitive base name match)
    const imageFile = allFiles.find(
      (f) =>
        f.baseName.toLowerCase() === wav.baseName.toLowerCase() &&
        isImageExt(f.ext)
    );

    const track: TrackValidation = {
      wavName: wav.name,
      wavPath: wav.path,
      hasImage: !!imageFile,
      imageName: imageFile?.name,
      imagePath: imageFile?.path,
    };

    if (!imageFile) {
      issues.push({
        type: "error",
        message: `"${wav.baseName}" is missing cover art. Add "${wav.baseName}.jpg" or "${wav.baseName}.png" to your ZIP.`,
      });
    } else {
      // Extract and check image resolution
      try {
        const zipEntry = zip.file(imageFile.path);
        if (!zipEntry) throw new Error("File not found in zip");

        const blob = await zipEntry.async("blob");
        const resolution = await checkImageResolution(blob);
        track.resolution = resolution;

        const widthOk =
          Math.abs(resolution.width - COVER_ART_WIDTH) <= COVER_ART_LENIENCY;
        const heightOk =
          Math.abs(resolution.height - COVER_ART_HEIGHT) <=
          COVER_ART_LENIENCY;
        track.resolutionOk = widthOk && heightOk;

        if (!track.resolutionOk) {
          issues.push({
            type: "error",
            message: `Cover art for "${wav.baseName}" is ${resolution.width}×${resolution.height}px. Required: ${COVER_ART_WIDTH}×${COVER_ART_HEIGHT}px (±${COVER_ART_LENIENCY}px tolerance).`,
          });
        }
      } catch (err) {
        track.resolutionOk = false;
        issues.push({
          type: "warning",
          message: `Could not verify resolution for "${imageFile.name}". Ensure it is a valid JPG or PNG — ${
            err instanceof Error ? err.message : "unknown error"
          }.`,
        });
      }
    }

    tracks.push(track);
  }

  const hasErrors = issues.some((i) => i.type === "error");
  return {
    isValid: !hasErrors,
    issues,
    tracks,
    trackCount: wavFiles.length,
    allFiles,
  };
}

// ─── Cloudinary Upload (XHR with progress) ────────────────────────────────────

async function uploadToCloudinary(
  file: File,
  params: {
    uploadUrl: string;
    signature: string;
    timestamp: number;
    publicId: string;
    apiKey: string;
  },
  onProgress: (pct: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("public_id", params.publicId);
    formData.append("timestamp", params.timestamp.toString());
    formData.append("signature", params.signature);
    formData.append("api_key", params.apiKey);
    formData.append("resource_type", "raw");
    formData.append("overwrite", "true");
    formData.append("invalidate", "true");

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          const url: string = res.secure_url ?? res.url ?? "";
          if (!url) {
            reject(new Error("Cloudinary did not return a URL."));
          } else {
            resolve(url);
          }
        } catch {
          reject(new Error("Failed to parse Cloudinary response."));
        }
      } else {
        let message = `Upload failed (HTTP ${xhr.status}).`;
        try {
          const err = JSON.parse(xhr.responseText);
          message = err?.error?.message ?? message;
        } catch {
          /* ignore */
        }
        reject(new Error(message));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload. Please check your connection."));
    xhr.onabort = () => reject(new Error("Upload was cancelled."));
    xhr.ontimeout = () => reject(new Error("Upload timed out. Please try again."));

    xhr.timeout = 300_000; // 5 minute timeout
    xhr.open("POST", params.uploadUrl);
    xhr.send(formData);
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Stage1Upload({ onComplete }: Stage1Props) {
  const { user, isLoaded } = useUser();

  // File + drag state
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation state
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadDone, setUploadDone] = useState(false);

  // Draft / resume state
  const [draft, setDraft] = useState<DraftData | null>(null);
  const [checkingDraft, setCheckingDraft] = useState(true);

  // The email prefix is derived from the signed-in user's primary email
  const emailPrefix: string = isLoaded
    ? (
        user?.primaryEmailAddress?.emailAddress ??
        user?.emailAddresses?.[0]?.emailAddress ??
        "user"
      )
        .split("@")[0]
        .toLowerCase()
        .replace(/[^a-z0-9._-]/gi, "")
    : "user";

  // ── Check for existing draft on mount ──────────────────────────────────────
  useEffect(() => {
    if (!isLoaded) return;

    let cancelled = false;

    const checkDraft = async () => {
      setCheckingDraft(true);
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;

        const saved: DraftData = JSON.parse(raw);

        // Expire old drafts
        if (Date.now() - saved.timestamp > DRAFT_MAX_AGE_MS) {
          localStorage.removeItem(STORAGE_KEY);
          return;
        }

        // Verify the file still exists in Cloudinary
        const res = await fetch("/api/cloudinary/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: saved.orderId,
            emailPrefix: saved.emailPrefix,
          }),
        });

        if (cancelled) return;

        if (res.ok) {
          const data: { exists: boolean } = await res.json();
          if (data.exists) {
            setDraft(saved);
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      } finally {
        if (!cancelled) setCheckingDraft(false);
      }
    };

    checkDraft();
    return () => { cancelled = true; };
  }, [isLoaded]);

  // ── File handling ──────────────────────────────────────────────────────────

  const handleFile = useCallback(async (selected: File) => {
    if (!selected.name.toLowerCase().endsWith(".zip")) {
      setValidation({
        isValid: false,
        issues: [
          {
            type: "error",
            message:
              "Only ZIP files are accepted. Please compress your files into a .zip archive first.",
          },
        ],
        tracks: [],
        trackCount: 0,
        allFiles: [],
      });
      return;
    }

    setFile(selected);
    setValidation(null);
    setUploadError(null);
    setUploadDone(false);
    setUploadProgress(0);
    setValidating(true);

    try {
      const result = await parseAndValidateZip(selected);
      setValidation(result);
    } finally {
      setValidating(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile]
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) handleFile(selected);
      e.target.value = "";
    },
    [handleFile]
  );

  const resetFile = useCallback(() => {
    setFile(null);
    setValidation(null);
    setUploadError(null);
    setUploadDone(false);
    setUploadProgress(0);
  }, []);

  // ── Upload flow ────────────────────────────────────────────────────────────

  const handleUpload = useCallback(async () => {
    if (!file || !validation?.isValid) return;

    setUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      // Generate a 4-digit order ID from the current timestamp
      const orderId = Date.now().toString().slice(-4);

      // Step 1 — Get signed upload params from our backend
      const signRes = await fetch(
        `/api/cloudinary/sign?orderId=${encodeURIComponent(orderId)}&emailPrefix=${encodeURIComponent(emailPrefix)}`
      );

      if (!signRes.ok) {
        const err = await signRes.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ??
            "Failed to get upload credentials. Please try again."
        );
      }

      const signData: {
        uploadUrl: string;
        signature: string;
        timestamp: number;
        publicId: string;
        apiKey: string;
      } = await signRes.json();

      // Step 2 — Upload the ZIP directly to Cloudinary
      const assetUrl = await uploadToCloudinary(file, signData, setUploadProgress);

      // Step 3 — Persist draft to localStorage so user can resume
      const trackNames = validation.tracks.map((t) => getBaseName(t.wavName));

      const draftData: DraftData = {
        orderId,
        emailPrefix,
        assetUrl,
        trackNames,
        timestamp: Date.now(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(draftData));
      setUploadDone(true);

      // Short pause so the user sees the 100% / "complete" state
      setTimeout(() => {
        onComplete({ orderId, assetUrl, trackNames });
      }, 900);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Upload failed. Please try again."
      );
    } finally {
      setUploading(false);
    }
  }, [file, validation, emailPrefix, onComplete]);

  // ── Draft actions ──────────────────────────────────────────────────────────

  const handleResumeDraft = useCallback(() => {
    if (!draft) return;
    onComplete({
      orderId: draft.orderId,
      assetUrl: draft.assetUrl,
      trackNames: draft.trackNames,
    });
  }, [draft, onComplete]);

  const handleClearDraft = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setDraft(null);
  }, []);

  // ── Render: checking draft ─────────────────────────────────────────────────

  if (checkingDraft) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF1B6B]" />
        <p className="text-sm text-gray-400">Checking for saved progress…</p>
      </div>
    );
  }

  // ── Render: resume from draft ──────────────────────────────────────────────

  if (draft) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">
            Resume Your Upload
          </h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            We found a previously uploaded release. Continue from where you left
            off, or start with a new ZIP.
          </p>
        </div>

        <div className="rounded-2xl border border-[#FF1B6B]/30 bg-[#FF1B6B]/5 p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#FF1B6B]/20 border border-[#FF1B6B]/25 flex items-center justify-center flex-shrink-0">
              <FileArchive className="h-6 w-6 text-[#FF1B6B]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-white font-semibold">Saved Release</p>
                <Badge
                  variant="outline"
                  className="text-xs border-[#FF1B6B]/30 text-[#FF1B6B] bg-[#FF1B6B]/8 font-mono"
                >
                  #{draft.orderId}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {draft.trackNames.length} track
                {draft.trackNames.length !== 1 ? "s" : ""} · Uploaded{" "}
                {new Date(draft.timestamp).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {draft.trackNames.map((name) => (
                  <Badge
                    key={name}
                    variant="outline"
                    className="text-xs border-white/15 text-gray-300 bg-white/5"
                  >
                    <Music className="h-3 w-3 mr-1 text-[#FF1B6B]" />
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <Button
              onClick={handleResumeDraft}
              className="flex-1 bg-[#FF1B6B] hover:bg-[#FF1B6B]/90 text-white font-semibold shadow-lg shadow-[#FF1B6B]/20"
            >
              Continue with This Release
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              onClick={handleClearDraft}
              variant="outline"
              className="border-white/15 text-gray-400 hover:text-white hover:border-white/30 bg-transparent"
              title="Discard and upload a new ZIP"
            >
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Start Fresh
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: main upload UI ─────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">
          Upload Your Release
        </h2>
        <p className="text-sm text-gray-400 leading-relaxed">
          Compress your audio files and cover art into a single ZIP file. We'll
          run quality checks before it goes to distribution.
        </p>
      </div>

      {/* Checklist */}
      <div className="rounded-xl border border-white/8 bg-white/[0.025] p-4 space-y-3">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
          ZIP Contents Requirements
        </p>
        <div className="space-y-2">
          {[
            {
              icon: FileMusic,
              text: "One .wav file per track — e.g. my_song.wav",
              note: null,
            },
            {
              icon: ImageIcon,
              text: "One cover art per track — same base name",
              note: "e.g. my_song.jpg  or  my_song.png",
            },
            {
              icon: CheckCircle2,
              text: `Cover art resolution: ${COVER_ART_WIDTH}×${COVER_ART_HEIGHT}px`,
              note: `±${COVER_ART_LENIENCY}px tolerance`,
            },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <item.icon className="h-4 w-4 text-[#FF1B6B] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-300">{item.text}</p>
                {item.note && (
                  <p className="text-xs text-gray-600 mt-0.5 font-mono">
                    {item.note}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
        }}
        onDrop={onDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!uploading) fileInputRef.current?.click();
          }
        }}
        className={[
          "relative rounded-2xl border-2 border-dashed transition-all duration-200 select-none",
          uploading
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF1B6B]/50",
          isDragging
            ? "border-[#FF1B6B] bg-[#FF1B6B]/10 scale-[1.01]"
            : file
            ? "border-white/20 bg-white/[0.025] hover:border-white/30"
            : "border-white/12 bg-white/[0.02] hover:border-[#FF1B6B]/50 hover:bg-[#FF1B6B]/5",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          onChange={onInputChange}
          className="hidden"
          disabled={uploading}
        />

        <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
          {file ? (
            <>
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <FileArchive className="h-8 w-8 text-gray-300" />
                </div>
                {!uploading && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      resetFile();
                    }}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500/80 hover:bg-red-500 border border-red-500/50 flex items-center justify-center transition-colors"
                    title="Remove file"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                )}
              </div>
              <p className="mt-4 text-white font-semibold text-sm sm:text-base truncate max-w-xs">
                {file.name}
              </p>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">
                {formatBytes(file.size)}
              </p>
              {!uploading && (
                <p className="text-gray-600 text-xs mt-3">
                  Click or drag to replace
                </p>
              )}
            </>
          ) : (
            <>
              <div
                className={[
                  "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-200",
                  isDragging
                    ? "bg-[#FF1B6B]/20 border-2 border-[#FF1B6B]/40 scale-110"
                    : "bg-white/5 border border-white/10",
                ].join(" ")}
              >
                <Upload
                  className={[
                    "h-7 w-7 transition-colors",
                    isDragging ? "text-[#FF1B6B]" : "text-gray-400",
                  ].join(" ")}
                />
              </div>
              <p className="mt-4 text-white font-semibold text-sm sm:text-base">
                {isDragging
                  ? "Release to upload"
                  : "Drag & drop your ZIP here"}
              </p>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">
                or{" "}
                <span className="text-[#FF1B6B] font-medium">
                  click to browse
                </span>
              </p>
              <p className="text-gray-600 text-xs mt-3 font-mono">
                .zip only
              </p>
            </>
          )}
        </div>
      </div>

      {/* Validating spinner */}
      {validating && (
        <div className="rounded-xl border border-white/8 bg-white/[0.025] px-4 py-3.5 flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-[#FF1B6B] flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-white">
              Analysing ZIP contents…
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Checking files and cover art resolutions — this may take a moment
            </p>
          </div>
        </div>
      )}

      {/* Validation results */}
      {validation && !validating && (
        <div className="space-y-4">
          {/* Summary bar */}
          {validation.trackCount > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/8">
              <div className="w-9 h-9 rounded-lg bg-[#FF1B6B]/15 border border-[#FF1B6B]/20 flex items-center justify-center flex-shrink-0">
                <Music className="h-5 w-5 text-[#FF1B6B]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white leading-tight">
                  {validation.trackCount} Track
                  {validation.trackCount !== 1 ? "s" : ""} Detected
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {validation.allFiles.length} total file
                  {validation.allFiles.length !== 1 ? "s" : ""} in ZIP
                </p>
              </div>
              <Badge
                variant="outline"
                className={
                  validation.isValid
                    ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/8 shrink-0"
                    : "border-red-500/30 text-red-400 bg-red-500/8 shrink-0"
                }
              >
                {validation.isValid ? "✓ Ready to upload" : "Issues found"}
              </Badge>
            </div>
          )}

          {/* Per-track cards */}
          {validation.tracks.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest px-1">
                Track Breakdown
              </p>
              {validation.tracks.map((track, i) => {
                const hasError =
                  !track.hasImage || track.resolutionOk === false;
                return (
                  <div
                    key={i}
                    className={[
                      "rounded-xl border p-3.5 transition-colors",
                      hasError
                        ? "border-red-500/25 bg-red-500/5"
                        : "border-emerald-500/20 bg-emerald-500/5",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FileMusic className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {getBaseName(track.wavName)}
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                          {/* WAV chip */}
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                            <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                            <span className="font-mono">WAV</span>
                          </span>

                          {/* Cover art chip */}
                          {track.hasImage ? (
                            <span
                              className={[
                                "inline-flex items-center gap-1 text-xs",
                                track.resolutionOk === false
                                  ? "text-red-400"
                                  : "text-emerald-400",
                              ].join(" ")}
                            >
                              {track.resolutionOk === false ? (
                                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                              )}
                              <span className="truncate max-w-[140px]">
                                {track.imageName}
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-red-400">
                              <X className="h-3 w-3 flex-shrink-0" />
                              No cover art
                            </span>
                          )}

                          {/* Resolution chip */}
                          {track.resolution && (
                            <span
                              className={[
                                "inline-flex items-center gap-1 text-xs font-mono",
                                track.resolutionOk
                                  ? "text-emerald-400"
                                  : "text-red-400",
                              ].join(" ")}
                            >
                              {track.resolutionOk ? (
                                <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                              ) : (
                                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                              )}
                              {track.resolution.width}×{track.resolution.height}
                              px
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* All files collapsible */}
          {validation.allFiles.length > 0 && (
            <details className="group">
              <summary className="flex items-center gap-1.5 px-1 py-1 cursor-pointer select-none text-xs text-gray-500 hover:text-gray-400 transition-colors list-none">
                <FolderOpen className="h-3.5 w-3.5 flex-shrink-0" />
                <span>
                  View all {validation.allFiles.length} file
                  {validation.allFiles.length !== 1 ? "s" : ""}
                </span>
                <svg
                  className="ml-auto h-3 w-3 transition-transform duration-200 group-open:rotate-180"
                  viewBox="0 0 10 10"
                  fill="currentColor"
                >
                  <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </svg>
              </summary>
              <div className="mt-2 rounded-xl border border-white/8 overflow-hidden">
                <div className="max-h-52 overflow-y-auto divide-y divide-white/[0.05]">
                  {validation.allFiles.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-white/[0.02] transition-colors"
                    >
                      <span
                        className={[
                          "font-mono uppercase text-[10px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0",
                          f.ext === "wav"
                            ? "bg-violet-500/20 text-violet-400"
                            : isImageExt(f.ext)
                            ? "bg-sky-500/20 text-sky-400"
                            : "bg-white/8 text-gray-500",
                        ].join(" ")}
                      >
                        {f.ext || "—"}
                      </span>
                      <span className="text-xs text-gray-300 truncate flex-1">
                        {f.name}
                      </span>
                      <span className="text-[11px] text-gray-600 tabular-nums flex-shrink-0">
                        {f.size > 0 ? formatBytes(f.size) : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          )}

          {/* Issues list */}
          {validation.issues.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest px-1">
                {validation.issues.filter((i) => i.type === "error").length}{" "}
                Error
                {validation.issues.filter((i) => i.type === "error").length !==
                1
                  ? "s"
                  : ""}
                {validation.issues.filter((i) => i.type === "warning").length >
                  0 &&
                  ` · ${
                    validation.issues.filter((i) => i.type === "warning").length
                  } Warning${
                    validation.issues.filter((i) => i.type === "warning")
                      .length !== 1
                      ? "s"
                      : ""
                  }`}
              </p>
              {validation.issues.map((issue, i) => (
                <Alert
                  key={i}
                  className={[
                    "border py-2.5 px-3.5",
                    issue.type === "error"
                      ? "border-red-500/30 bg-red-500/6"
                      : "border-amber-500/30 bg-amber-500/6",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-2">
                    {issue.type === "error" ? (
                      <AlertCircle className="h-4 w-4 mt-0.5 text-red-400 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-400 flex-shrink-0" />
                    )}
                    <AlertDescription
                      className={
                        issue.type === "error"
                          ? "text-red-300 text-sm"
                          : "text-amber-300 text-sm"
                      }
                    >
                      {issue.message}
                    </AlertDescription>
                  </div>
                </Alert>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload progress bar */}
      {uploading && (
        <div className="space-y-2 rounded-xl border border-white/8 bg-white/[0.025] px-4 py-4">
          <div className="flex items-center gap-2 justify-between text-sm">
            <span className="text-gray-300 font-medium flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-[#FF1B6B]" />
              {uploadProgress < 100 ? "Uploading to cloud…" : "Finalising…"}
            </span>
            <span className="text-[#FF1B6B] font-bold tabular-nums">
              {uploadProgress}%
            </span>
          </div>
          <Progress
            value={uploadProgress}
            className="h-1.5 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-[#FF1B6B] [&>div]:to-[#ff6b9d] [&>div]:transition-all [&>div]:duration-300"
          />
        </div>
      )}

      {/* Upload success */}
      {uploadDone && !uploading && (
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
          <p className="text-sm text-emerald-300 font-medium">
            Upload complete! Moving to track details…
          </p>
        </div>
      )}

      {/* Upload error */}
      {uploadError && !uploading && (
        <Alert className="border border-red-500/30 bg-red-500/6 py-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <AlertDescription className="text-red-300 text-sm">
                {uploadError}
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}

      {/* Action buttons */}
      {!uploading && !uploadDone && (
        <div className="flex items-center gap-3 pt-1">
          {validation?.isValid && file && (
            <Button
              onClick={handleUpload}
              className="flex-1 bg-[#FF1B6B] hover:bg-[#FF1B6B]/90 text-white font-semibold shadow-lg shadow-[#FF1B6B]/20 h-11 text-base"
            >
              Upload & Continue
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}

          {validation && !validation.isValid && (
            <Button
              onClick={resetFile}
              variant="outline"
              className="flex-1 border-white/15 text-gray-400 hover:text-white hover:border-white/25 bg-transparent h-11"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-upload Fixed ZIP
            </Button>
          )}

          {uploadError && validation?.isValid && (
            <Button
              onClick={handleUpload}
              variant="outline"
              className="border-[#FF1B6B]/30 text-[#FF1B6B] hover:bg-[#FF1B6B]/8 bg-transparent h-11"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Upload
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
