"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
	CheckCircle2,
	Clock,
	AlertTriangle,
	Upload,
	Loader2,
	QrCode,
	Coins,
	Tag,
	Phone,
	Calendar,
	ArrowRight,
	RefreshCw,
	Shield,
	Info,
	X,
	ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";


interface SerializedPayment {
	_id: string;
	token: string;
	email: string;
	amount: number;
	discount_applied: number;
	coupon_code: string | null;
	payment_status:
		| "pending"
		| "needs_review"
		| "completed"
		| "verified"
		| "failed";
	qr_code: string;
	contact_no: string;
	country_code: string;
	credits_granted: number;
	createdAt: string | null;
	plan: {
		_id: string;
		name: string;
		credits: number;
		amount: number;
	};
}

interface CheckoutClientProps {
	payment: SerializedPayment;
}

type VerifyResult = "completed" | "needs_review" | "already_completed" | null;
type UploadStep = "idle" | "reading" | "uploading" | "done";


function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function uploadScreenshotToCloudinary(
	file: File,
	token: string,
	onProgress: (pct: number) => void,
): Promise<string> {
	const signRes = await fetch(
		`/api/cloudinary/payment-sign?token=${encodeURIComponent(token)}`,
	);

	if (!signRes.ok) {
		const err = await signRes.json().catch(() => ({}));
		throw new Error(
			(err as { error?: string }).error ?? "Failed to prepare upload.",
		);
	}

	const params = (await signRes.json()) as {
		uploadUrl: string;
		signature: string;
		timestamp: number;
		publicId: string;
		apiKey: string;
	};

	return new Promise((resolve, reject) => {
		const formData = new FormData();
		formData.append("file", file);
		formData.append("public_id", params.publicId);
		formData.append("timestamp", params.timestamp.toString());
		formData.append("signature", params.signature);
		formData.append("api_key", params.apiKey);
    formData.append("resource_type", "image");
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

		xhr.onerror = () => reject(new Error("Network error during upload."));
		xhr.onabort = () => reject(new Error("Upload was cancelled."));
		xhr.ontimeout = () => reject(new Error("Upload timed out."));

		xhr.timeout = 120_000;
		xhr.open("POST", params.uploadUrl);
		xhr.send(formData);
	});
}


function StatusBanner({
	status,
}: {
	status: SerializedPayment["payment_status"];
}) {
	if (status === "completed" || status === "verified") {
		return (
			<div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/8 p-6 flex flex-col items-center text-center gap-4">
				<div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center">
					<CheckCircle2 className="h-8 w-8 text-emerald-400" />
				</div>
				<div>
					<h3 className="text-xl font-bold text-emerald-300 mb-1">
						Payment Verified!
					</h3>
					<p className="text-sm text-emerald-400/70 leading-relaxed">
						Your credits have been added to your account. You can
						now distribute your music.
					</p>
				</div>
				<div className="flex gap-3 flex-wrap justify-center">
					<a href="/dashboard/buy-credits">
						<Button
							variant="outline"
							size="sm"
							className="h-9 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 bg-transparent text-sm"
						>
							Buy More Credits
						</Button>
					</a>
					<a href="/dashboard/create-order">
						<Button
							size="sm"
							className="h-9 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm"
						>
							Create Order
							<ArrowRight className="ml-2 h-3.5 w-3.5" />
						</Button>
					</a>
				</div>
			</div>
		);
	}

	if (status === "needs_review") {
		return (
			<div className="rounded-2xl border border-amber-500/30 bg-amber-500/6 p-5 flex items-start gap-4">
				<div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
					<AlertTriangle className="h-5 w-5 text-amber-400" />
				</div>
				<div>
					<h3 className="text-base font-bold text-amber-300 mb-1">
						Under Manual Review
					</h3>
					<p className="text-sm text-amber-400/70 leading-relaxed">
						We couldn&apos;t automatically verify your payment. Our
						team will review it within 24 hours and add credits to
						your account. You don&apos;t need to do anything else.
					</p>
				</div>
			</div>
		);
	}

	return null;
}


interface UploadZoneProps {
	onFileSelect: (file: File) => void;
	disabled?: boolean;
}

function UploadZone({ onFileSelect, disabled }: UploadZoneProps) {
	const [isDragging, setIsDragging] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const handleFile = useCallback(
		(file: File) => {
			if (!file.type.startsWith("image/")) return;
			onFileSelect(file);
		},
		[onFileSelect],
	);

	const onDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setIsDragging(false);
			const file = e.dataTransfer.files[0];
			if (file) handleFile(file);
		},
		[handleFile],
	);

	return (
		<div
			onDragEnter={(e) => {
				e.preventDefault();
				if (!disabled) setIsDragging(true);
			}}
			onDragOver={(e) => {
				e.preventDefault();
				if (!disabled) setIsDragging(true);
			}}
			onDragLeave={(e) => {
				e.preventDefault();
				setIsDragging(false);
			}}
			onDrop={disabled ? undefined : onDrop}
			onClick={() => !disabled && inputRef.current?.click()}
			role="button"
			tabIndex={disabled ? -1 : 0}
			onKeyDown={(e) => {
				if (!disabled && (e.key === "Enter" || e.key === " ")) {
					e.preventDefault();
					inputRef.current?.click();
				}
			}}
			className={cn(
				"relative rounded-2xl border-2 border-dashed transition-all duration-200 select-none",
				disabled
					? "opacity-50 cursor-not-allowed"
					: "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF1B6B]/50",
				isDragging
					? "border-[#FF1B6B] bg-[#FF1B6B]/10 scale-[1.01]"
					: "border-white/15 bg-white/[0.02] hover:border-[#FF1B6B]/50 hover:bg-[#FF1B6B]/5",
			)}
		>
			<input
				ref={inputRef}
				type="file"
				accept="image/*"
				onChange={(e) => {
					const f = e.target.files?.[0];
					if (f) handleFile(f);
					e.target.value = "";
				}}
				disabled={disabled}
				className="hidden"
			/>
			<div className="flex flex-col items-center justify-center py-10 px-6 text-center gap-3">
				<div
					className={cn(
						"w-14 h-14 rounded-2xl flex items-center justify-center transition-all",
						isDragging
							? "bg-[#FF1B6B]/20 border-2 border-[#FF1B6B]/40 scale-110"
							: "bg-white/5 border border-white/10",
					)}
				>
					<ImageIcon
						className={cn(
							"h-6 w-6 transition-colors",
							isDragging ? "text-[#FF1B6B]" : "text-gray-500",
						)}
					/>
				</div>
				<div>
					<p className="text-sm font-semibold text-white">
						{isDragging
							? "Release to upload"
							: "Drag & drop screenshot here"}
					</p>
					<p className="text-xs text-gray-500 mt-1">
						or{" "}
						<span className="text-[#FF1B6B] font-medium">
							click to browse
						</span>
					</p>
					<p className="text-[11px] text-gray-700 mt-2">
            JPG, PNG, WebP — max 10 MB
					</p>
				</div>
			</div>
		</div>
	);
}


export function CheckoutClient({
	payment: initialPayment,
}: CheckoutClientProps) {
	const router = useRouter();
	const [payment, setPayment] = useState(initialPayment);

	// Screenshot state
	const [previewFile, setPreviewFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [uploadStep, setUploadStep] = useState<UploadStep>("idle");
	const [uploadProgress, setUploadProgress] = useState(0);
	const [verifyResult, setVerifyResult] = useState<VerifyResult>(null);
	const [verifyError, setVerifyError] = useState<string | null>(null);
	const [creditsDelta, setCreditsDelta] = useState<number | null>(null);

	// QR load state
	const [qrLoaded, setQrLoaded] = useState(false);
	const [qrError, setQrError] = useState(false);

	// Simulate progress bar animation while verifying
	const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
		null,
	);

	// Clean up object URL on unmount / file change
	useEffect(() => {
		return () => {
			if (previewUrl) URL.revokeObjectURL(previewUrl);
		};
	}, [previewUrl]);

	const handleFileSelect = useCallback(
		(file: File) => {
			// Max 10 MB
			if (file.size > 10 * 1024 * 1024) {
				setVerifyError(
					"File is too large. Please upload an image under 10 MB.",
				);
				return;
			}

			setPreviewFile(file);
			setVerifyError(null);
			setVerifyResult(null);
			setCreditsDelta(null);

			// Create object URL for preview
			if (previewUrl) URL.revokeObjectURL(previewUrl);
			setPreviewUrl(URL.createObjectURL(file));
		},
		[previewUrl],
	);

	const clearFile = useCallback(() => {
		setPreviewFile(null);
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
			setPreviewUrl(null);
		}
		setVerifyError(null);
		setVerifyResult(null);
		setCreditsDelta(null);
		setUploadStep("idle");
		setUploadProgress(0);
	}, [previewUrl]);

	const handleVerify = useCallback(async () => {
		if (!previewFile) return;

		if (progressIntervalRef.current) {
			clearInterval(progressIntervalRef.current);
			progressIntervalRef.current = null;
		}

		setUploadStep("uploading");
		setVerifyError(null);
		setVerifyResult(null);
		setUploadProgress(0);

		try {
			const screenshotUrl = await uploadScreenshotToCloudinary(
				previewFile,
				payment.token,
				(pct) => {
					const scaled = Math.min(70, Math.round(pct * 0.7));
					setUploadProgress(scaled);
				},
			);

			setUploadStep("reading");
			setUploadProgress(70);

			progressIntervalRef.current = setInterval(() => {
				setUploadProgress((prev) => {
					if (prev >= 95) return prev;
					return prev + Math.random() * 2;
				});
			}, 400);

			const res = await fetch(
				`/api/payments/${encodeURIComponent(payment.token)}/verify`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ screenshot_url: screenshotUrl }),
				},
			);

			// Clear interval and complete progress
			if (progressIntervalRef.current) {
				clearInterval(progressIntervalRef.current);
				progressIntervalRef.current = null;
			}
			setUploadProgress(100);

			const data = await res.json().catch(() => ({}));

			if (!res.ok && res.status !== 202) {
				throw new Error(
					(data as { error?: string }).error ??
						`Verification failed (HTTP ${res.status}).`,
				);
			}

			const result = (data as { result?: string }).result as VerifyResult;
			setVerifyResult(result ?? "needs_review");

			if (result === "completed" || result === "already_completed") {
				// Update local payment status
				setPayment((prev) => ({
					...prev,
					payment_status: "completed",
				}));
				const added = (data as { credits_added?: number })
					.credits_added;
				if (typeof added === "number") setCreditsDelta(added);
			} else if (result === "needs_review") {
				setPayment((prev) => ({
					...prev,
					payment_status: "needs_review",
				}));
			}

			setUploadStep("done");
		} catch (err) {
			if (progressIntervalRef.current) {
				clearInterval(progressIntervalRef.current);
				progressIntervalRef.current = null;
			}
			setVerifyError(
				err instanceof Error
					? err.message
					: "Something went wrong. Please try again.",
			);
			setUploadStep("idle");
			setUploadProgress(0);
		}
	}, [previewFile, payment.token]);

	const isProcessing = uploadStep === "reading" || uploadStep === "uploading";
	const isDone = uploadStep === "done";
	const isCompleted =
		payment.payment_status === "completed" ||
		payment.payment_status === "verified";
	const isNeedsReview = payment.payment_status === "needs_review";
	const isPending = payment.payment_status === "pending";


	return (
		<div className="min-h-screen bg-[#0a0a0a] text-white">
			{/* Ambient glow */}
			<div className="pointer-events-none fixed inset-0 overflow-hidden">
				<div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[#FF1B6B]/6 blur-[140px]" />
				<div className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full bg-violet-500/4 blur-[100px]" />
			</div>

			<div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-10">
				<div className="flex items-center gap-2 text-xs text-gray-600 mb-8">
					<a
						href="/dashboard"
						className="hover:text-gray-400 transition-colors"
					>
						Dashboard
					</a>
					<span>/</span>
					<a
						href="/dashboard/buy-credits"
						className="hover:text-gray-400 transition-colors"
					>
						Buy Credits
					</a>
					<span>/</span>
					<span className="text-gray-400 font-mono">Checkout</span>
				</div>

				<div className="mb-8">
					<div className="flex items-center gap-3 mb-3">
						<h1 className="text-3xl font-black tracking-tight">
							Complete{" "}
							<span className="text-[#FF1B6B]">Payment</span>
						</h1>
						<Badge
							variant="outline"
							className={cn(
								"text-xs font-semibold border px-2.5 py-1 capitalize",
								isCompleted
									? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
									: isNeedsReview
										? "border-amber-500/30 bg-amber-500/10 text-amber-400"
										: "border-blue-500/30 bg-blue-500/10 text-blue-400",
							)}
						>
							<span
								className={cn(
									"w-1.5 h-1.5 rounded-full mr-1.5 inline-block",
									isCompleted
										? "bg-emerald-400"
										: isNeedsReview
											? "bg-amber-400"
											: "bg-blue-400 animate-pulse",
								)}
							/>
							{isCompleted
								? "Completed"
								: isNeedsReview
									? "Under Review"
									: "Pending Payment"}
						</Badge>
					</div>

					<p className="text-sm text-gray-500 leading-relaxed">
						Scan the QR code with any UPI app, complete the payment,
						then upload your screenshot for instant verification.
					</p>
				</div>

				{(isCompleted || isNeedsReview) && (
					<div className="mb-6">
						<StatusBanner status={payment.payment_status} />
						{isCompleted && creditsDelta !== null && (
							<div className="mt-3 flex items-center gap-2 justify-center">
								<Coins className="h-5 w-5 text-[#FF1B6B]" />
								<span className="text-base font-bold text-white">
									+{creditsDelta} credits added to your
									account
								</span>
							</div>
						)}
					</div>
				)}

				<div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] overflow-hidden">
					<div className="px-6 py-5 border-b border-white/[0.06] bg-gradient-to-r from-[#FF1B6B]/5 to-transparent">
						<div className="flex items-start justify-between gap-4 flex-wrap">
							<div>
								<p className="text-[11px] text-gray-600 uppercase tracking-widest font-semibold mb-1">
									Order Summary
								</p>
								<div className="flex items-center gap-2 flex-wrap">
									<span className="text-2xl font-black text-white">
										₹
										{payment.amount.toLocaleString("en-IN")}
									</span>
									{payment.discount_applied > 0 && (
										<Badge
											variant="outline"
											className="border-emerald-500/25 bg-emerald-500/8 text-emerald-400 text-xs gap-1"
										>
											<Tag className="h-3 w-3" />
											{payment.coupon_code} saved ₹
											{payment.discount_applied.toLocaleString(
												"en-IN",
											)}
										</Badge>
									)}
								</div>
							</div>
							<div className="text-right">
								<div className="flex items-center gap-1.5 justify-end">
									<Coins className="h-4 w-4 text-[#FF1B6B]" />
									<span className="text-lg font-bold text-[#FF1B6B]">
										{payment.credits_granted} Credits
									</span>
								</div>
								<p className="text-xs text-gray-500 mt-0.5 capitalize">
									{payment.plan.name} Plan
								</p>
							</div>
						</div>

						{/* Meta details */}
						<div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-4 text-xs text-gray-600">
							{payment.contact_no && (
								<span className="flex items-center gap-1.5">
									<Phone className="h-3 w-3" />
									{payment.country_code} {payment.contact_no}
								</span>
							)}
							{payment.createdAt && (
								<span className="flex items-center gap-1.5">
									<Calendar className="h-3 w-3" />
									{payment.createdAt}
								</span>
							)}
							<span className="flex items-center gap-1.5">
								<Shield className="h-3 w-3" />
								Secure checkout
							</span>
						</div>
					</div>

					<div className="px-6 py-6 border-b border-white/[0.06]">
						<div className="flex flex-col sm:flex-row items-center gap-6">
							{/* QR code */}
							<div className="shrink-0">
								<p className="text-[11px] text-gray-600 uppercase tracking-widest font-semibold mb-3 text-center sm:text-left">
									Scan to Pay
								</p>
								<div className="relative w-[180px] h-[180px] rounded-xl border border-white/10 bg-[#111111] overflow-hidden flex items-center justify-center">
									{!qrLoaded && !qrError && (
										<div className="absolute inset-0 flex items-center justify-center">
											<Loader2 className="h-6 w-6 animate-spin text-gray-600" />
										</div>
									)}
									{qrError ? (
										<div className="flex flex-col items-center gap-2 p-4 text-center">
											<QrCode className="h-8 w-8 text-gray-600" />
											<p className="text-[11px] text-gray-600">
												QR unavailable
											</p>
											<button
												onClick={() => {
													setQrError(false);
													setQrLoaded(false);
												}}
												className="text-[11px] text-[#FF1B6B] hover:underline"
											>
												Retry
											</button>
										</div>
									) : (
										// eslint-disable-next-line @next/next/no-img-element
										<img
											src={payment.qr_code}
											alt="UPI Payment QR Code"
											className={cn(
												"w-full h-full object-contain transition-opacity duration-300",
												qrLoaded
													? "opacity-100"
													: "opacity-0",
											)}
											onLoad={() => setQrLoaded(true)}
											onError={() => setQrError(true)}
										/>
									)}
								</div>

								{/* Refresh QR hint */}
								{isPending && qrLoaded && (
									<button
										onClick={() => router.refresh()}
										className="flex items-center gap-1 mt-2 mx-auto text-[11px] text-gray-600 hover:text-gray-400 transition-colors"
									>
										<RefreshCw className="h-3 w-3" />
										Refresh QR
									</button>
								)}
							</div>

							{/* Instructions */}
							<div className="flex-1 min-w-0">
								<p className="text-[11px] text-gray-600 uppercase tracking-widest font-semibold mb-4">
									How to Pay
								</p>
								<ol className="space-y-3">
									{[
										{
											step: "1",
											text: "Open any UPI app (PhonePe, GPay, Paytm, etc.)",
										},
										{
											step: "2",
											text: "Scan the QR code or tap 'Scan & Pay'",
										},
										{
											step: "3",
                      text: `Pay exactly ₹${payment.amount.toLocaleString("en-IN")} — the amount is pre-filled`,
										},
										{
											step: "4",
											text: "Take a screenshot of the success screen showing the transaction details",
										},
										{
											step: "5",
											text: "Upload the screenshot below to verify your payment",
										},
									].map(({ step, text }) => (
										<li
											key={step}
											className="flex items-start gap-3"
										>
											<div className="w-5 h-5 rounded-full bg-[#FF1B6B]/15 border border-[#FF1B6B]/25 flex items-center justify-center shrink-0 mt-0.5">
												<span className="text-[10px] font-bold text-[#FF1B6B]">
													{step}
												</span>
											</div>
											<p className="text-sm text-gray-400 leading-relaxed">
												{text}
											</p>
										</li>
									))}
								</ol>

								{/* Important note */}
								<div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/6 px-3 py-2.5">
									<Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
									<p className="text-xs text-amber-400/80 leading-relaxed">
										Please make sure the paid amount is
										visible in your screenshot for faster
										verification.
									</p>
								</div>
							</div>
						</div>
					</div>

					{!isCompleted && (
						<div className="px-6 py-6">
							<div className="flex items-center justify-between mb-4">
								<p className="text-[11px] text-gray-500 uppercase tracking-widest font-semibold">
									Upload Payment Screenshot
								</p>
								{isNeedsReview && (
									<Badge
										variant="outline"
										className="text-[10px] border-amber-500/25 bg-amber-500/8 text-amber-400"
									>
										Re-submit
									</Badge>
								)}
							</div>

							{/* File preview or upload zone */}
							{previewFile && previewUrl ? (
								<div className="space-y-4">
									{/* Image preview */}
									<div className="relative rounded-xl border border-white/10 bg-[#111111] overflow-hidden">
										<div className="relative aspect-video">
											{/* eslint-disable-next-line @next/next/no-img-element */}
											<img
												src={previewUrl}
												alt="Payment screenshot preview"
												className="w-full h-full object-contain"
											/>
										</div>
										<div className="px-3 py-2 border-t border-white/[0.06] flex items-center justify-between gap-3">
											<div className="flex items-center gap-2 min-w-0">
												<ImageIcon className="h-3.5 w-3.5 text-gray-500 shrink-0" />
												<span className="text-xs text-gray-400 truncate">
													{previewFile.name}
												</span>
												<span className="text-xs text-gray-600 shrink-0">
													{formatBytes(
														previewFile.size,
													)}
												</span>
											</div>
											{!isProcessing && !isDone && (
												<button
													onClick={clearFile}
													className="p-1 rounded-md text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
													title="Remove"
												>
													<X className="h-3.5 w-3.5" />
												</button>
											)}
										</div>
									</div>

									{/* Upload / verify progress */}
									{isProcessing && (
										<div className="space-y-2 rounded-xl border border-white/8 bg-white/[0.025] px-4 py-3.5">
											<div className="flex items-center gap-2 justify-between text-sm">
												<span className="text-gray-300 font-medium flex items-center gap-2">
													<Loader2 className="h-4 w-4 animate-spin text-[#FF1B6B]" />
                          {uploadStep === "uploading"
                            ? "Uploading screenshot…"
                            : "Verifying payment…"}
												</span>
												<span className="text-[#FF1B6B] font-bold tabular-nums text-sm">
													{Math.round(uploadProgress)}
													%
												</span>
											</div>
											<Progress
												value={uploadProgress}
												className="h-1.5 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-[#FF1B6B] [&>div]:to-[#ff6b9d] [&>div]:transition-all [&>div]:duration-300"
											/>
											<p className="text-xs text-gray-600">
                        Checking payment details — please wait…
											</p>
										</div>
									)}

									{/* Verify result */}
									{isDone && verifyResult === "completed" && (
										<div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
											<CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
											<p className="text-sm text-emerald-300 font-medium">
                        Payment verified! Credits are
                        being added to your account…
											</p>
										</div>
									)}

									{isDone &&
										verifyResult ===
											"already_completed" && (
											<div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
												<CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
												<p className="text-sm text-emerald-300 font-medium">
													This payment was already
													verified and your credits
													have been added.
												</p>
											</div>
										)}

									{isDone &&
										verifyResult === "needs_review" && (
											<div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-amber-500/8 border border-amber-500/25">
												<AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
												<div>
													<p className="text-sm text-amber-300 font-medium">
														Sent for manual review
													</p>
													<p className="text-xs text-amber-400/70 mt-0.5">
														Our team will verify and
														credit your account
														within 24 hours.
													</p>
												</div>
											</div>
										)}

									{/* Error */}
									{verifyError && (
										<Alert className="border border-red-500/30 bg-red-500/6 py-2.5 px-3.5">
											<div className="flex items-start gap-2">
												<AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
												<AlertDescription className="text-red-300 text-sm">
													{verifyError}
												</AlertDescription>
											</div>
										</Alert>
									)}

									{/* Action buttons */}
									{!isProcessing && !isDone && (
										<div className="flex gap-3">
											<Button
												onClick={clearFile}
												variant="outline"
												className="border-white/15 text-gray-400 hover:text-white hover:border-white/25 bg-transparent h-11"
											>
												Change
											</Button>
											<Button
												onClick={handleVerify}
												className="flex-1 bg-[#FF1B6B] hover:bg-[#FF1B6B]/90 text-white font-bold h-11 text-base shadow-lg shadow-[#FF1B6B]/20"
											>
												<Upload className="h-4 w-4 mr-2" />
												Submit for Verification
											</Button>
										</div>
									)}

									{/* Try again after done with error */}
									{isDone && verifyError && (
										<Button
											onClick={() => {
												setUploadStep("idle");
												setUploadProgress(0);
												setVerifyResult(null);
												setVerifyError(null);
											}}
											variant="outline"
											className="w-full h-11 border-white/15 text-gray-400 hover:text-white hover:border-white/25 bg-transparent"
										>
											<RefreshCw className="h-4 w-4 mr-2" />
											Try Again
										</Button>
									)}
								</div>
							) : (
								<div className="space-y-3">
									<UploadZone
										onFileSelect={handleFileSelect}
										disabled={isProcessing}
									/>
									{verifyError && (
										<Alert className="border border-red-500/30 bg-red-500/6 py-2.5 px-3.5">
											<div className="flex items-start gap-2">
												<AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
												<AlertDescription className="text-red-300 text-sm">
													{verifyError}
												</AlertDescription>
											</div>
										</Alert>
									)}
									<p className="text-[11px] text-gray-700 text-center leading-relaxed">
										Your screenshot is used only for payment
										verification and is not stored unless
										manual review is required.
									</p>
								</div>
							)}
						</div>
					)}

					{isCompleted && (
						<div className="px-6 py-6">
							<div className="flex flex-col items-center text-center gap-4">
								<div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center">
									<CheckCircle2 className="h-7 w-7 text-emerald-400" />
								</div>
								<div>
									<p className="text-white font-semibold text-base">
										Payment Complete!
									</p>
									<p className="text-sm text-gray-500 mt-1">
										{payment.credits_granted} credits have
										been added to your account. Start
										distributing your music.
									</p>
								</div>
								<div className="flex gap-3">
									<a href="/dashboard/orders">
										<Button
											variant="outline"
											size="sm"
											className="border-white/15 text-gray-400 hover:text-white hover:border-white/25 bg-transparent"
										>
											My Orders
										</Button>
									</a>
									<a href="/dashboard/create-order">
										<Button
											size="sm"
											className="bg-[#FF1B6B] hover:bg-[#FF1B6B]/90 text-white font-bold shadow-lg shadow-[#FF1B6B]/20"
										>
											Create Order
											<ArrowRight className="ml-2 h-3.5 w-3.5" />
										</Button>
									</a>
								</div>
							</div>
						</div>
					)}
				</div>

				<div className="mt-6 rounded-xl border border-white/[0.05] bg-white/[0.015] px-5 py-3.5 flex items-start gap-3">
					<Shield className="h-4 w-4 text-gray-600 shrink-0 mt-0.5" />
					<p className="text-xs text-gray-700 leading-relaxed">
						<span className="text-gray-500 font-medium">
							Secure Transaction
						</span>{" "}
            · All payments are processed via UPI, a
						government-regulated payment system. Your screenshot is
						used only for verification and is never stored unless a
						manual review is required.
					</p>
				</div>
			</div>
		</div>
	);
}
