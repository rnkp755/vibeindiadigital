import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import AvailablePlan from "@/models/Plan";

export const dynamic = "force-dynamic";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate a payment token in the format: XXXX-<timestamp>
 * where XXXX is 4 random alphanumeric characters (uppercase).
 */
function generateToken(): string {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	let prefix = "";
	for (let i = 0; i < 4; i++) {
		prefix += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return `${prefix}-${Date.now()}`;
}

/**
 * Build a UPI deep-link string.
 * upi://pay?pa=<vpa>&pn=<name>&am=<amount>&cu=<currency>&tn=<note>
 */
function buildUpiString(amount: number): string {
	const pa = encodeURIComponent(process.env.UPI_ID ?? "merchant@upi");
	const pn = encodeURIComponent(process.env.UPI_NAME ?? "VibeIndia Digital");
	const cu = encodeURIComponent(process.env.UPI_CURRENCY ?? "INR");
	const tr = encodeURIComponent(process.env.UPI_NOTE ?? "VibeIndia Payment");

	return `upi://pay?pa=${pa}&pn=${pn}&am=${amount.toFixed(2)}&cu=${cu}&tr=${tr}`;
}

/**
 * Fetch a QR-code image URL from api.qrserver.com.
 * IMPORTANT: the full UPI URI must be URL-encoded before embedding in the QR API URL.
 */
function buildQrCodeUrl(data: string, size = "250x250"): string {
	return `https://api.qrserver.com/v1/create-qr-code/?size=${size}&data=${encodeURIComponent(
		data,
	)}&bgcolor=111111&color=FFFFFF&qzone=2&format=png`;
}

function computeMarkedAmount(baseAmount: number): number {
	const basePaise = Math.round(baseAmount * 100);
	const baseRupees = Math.floor(basePaise / 100);
	const remainder = basePaise % 100;

	const minCut = 20;
	const maxCut = 99;
	let cutPaise = 0;

	if (basePaise < minCut) {
		return baseAmount;
	}

	if (remainder >= minCut) {
		const cap = Math.min(maxCut, remainder);
		cutPaise = Math.floor(Math.random() * (cap - minCut + 1)) + minCut;
		return (basePaise - cutPaise) / 100;
	}

	if (baseRupees > 0) {
		const borrowedRemainder = remainder + 100;
		const cap = Math.min(maxCut, borrowedRemainder);
		cutPaise = Math.floor(Math.random() * (cap - minCut + 1)) + minCut;
		const payablePaise = (baseRupees - 1) * 100 + (borrowedRemainder - cutPaise);
		return payablePaise / 100;
	}

	return baseAmount;
}

// ─── POST /api/payments ───────────────────────────────────────────────────────

export async function POST(req: Request) {
	// ── Auth ───────────────────────────────────────────────────────────────────
	const { userId } = await auth();

	if (!userId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	// ── Parse body ─────────────────────────────────────────────────────────────
	let body: {
		plan_id?: string;
		coupon_code?: string;
		contact_no?: string;
		country_code?: string;
	};

	try {
		body = await req.json();
	} catch {
		return NextResponse.json(
			{ error: "Invalid JSON body" },
			{ status: 400 },
		);
	}

	const { plan_id, coupon_code, contact_no, country_code = "+91" } = body;

	if (!plan_id) {
		return NextResponse.json(
			{ error: "Missing required field: plan_id" },
			{ status: 400 },
		);
	}

	if (!contact_no || contact_no.trim().length < 5) {
		return NextResponse.json(
			{ error: "Missing or invalid field: contact_no" },
			{ status: 400 },
		);
	}

	// ── Resolve user email from Clerk ──────────────────────────────────────────
	let userEmail: string;

	try {
		const client = await clerkClient();
		const clerkUser = await client.users.getUser(userId);

		userEmail =
			clerkUser.primaryEmailAddress?.emailAddress ??
			clerkUser.emailAddresses[0]?.emailAddress;

		if (!userEmail) {
			return NextResponse.json(
				{ error: "Could not determine user email." },
				{ status: 400 },
			);
		}
	} catch (err) {
		console.error("[POST /api/payments] Clerk error:", err);
		return NextResponse.json(
			{ error: "Failed to retrieve user information." },
			{ status: 500 },
		);
	}

	// ── Connect to DB and fetch plan ───────────────────────────────────────────
	try {
		await connectToDatabase();
	} catch (err) {
		console.error("[POST /api/payments] DB connection error:", err);
		return NextResponse.json(
			{ error: "Database connection error." },
			{ status: 500 },
		);
	}

	let plan;
	try {
		plan = await AvailablePlan.findById(plan_id).lean();
	} catch (err) {
		console.error("[POST /api/payments] Invalid plan_id:", err);
		return NextResponse.json(
			{ error: "Invalid plan ID format." },
			{ status: 400 },
		);
	}

	if (!plan) {
		return NextResponse.json(
			{ error: "Plan not found. Please select a valid plan." },
			{ status: 404 },
		);
	}

	// ── Validate and apply coupon ──────────────────────────────────────────────
	let discountAmount = 0;
	let appliedCouponCode: string | undefined;

	if (coupon_code && coupon_code.trim()) {
		const normalised = coupon_code.trim().toUpperCase();

		const coupon = plan.coupons?.find(
			(c: { code: string; discount: number }) =>
				c.code.toUpperCase() === normalised,
		);

		if (!coupon) {
			return NextResponse.json(
				{
					error: `Coupon "${coupon_code}" is not valid for the ${plan.name} plan.`,
				},
				{ status: 400 },
			);
		}

		const pct = Math.min(Math.max(coupon.discount, 0), 100);
		discountAmount = Math.round((plan.amount * pct) ) / 100;
		appliedCouponCode = normalised;
	}

	// ── Calculate final amount ─────────────────────────────────────────────────
	const baseAmount = Math.max(0, plan.amount - discountAmount);
	const payableAmount = computeMarkedAmount(baseAmount);

	// ── Generate token and QR code ─────────────────────────────────────────────
	const token = generateToken();
	const upiString = buildUpiString(payableAmount);
	const qrCodeUrl = buildQrCodeUrl(upiString, "250x250");

	// ── Persist payment record ─────────────────────────────────────────────────
	let paymentDoc;

	try {
		paymentDoc = await Payment.create({
			email: userEmail,
			plan: plan._id,
			amount: payableAmount,
			token,
			payment_status: "pending",
			qr_code: qrCodeUrl,
			contact_no: contact_no.trim(),
			country_code: country_code.trim(),
			coupon_code: appliedCouponCode,
			discount_applied: discountAmount,
			credits_granted: plan.credits,
		});
	} catch (err: unknown) {
		// Handle duplicate token (extremely unlikely but safe to handle)
		if (
			typeof err === "object" &&
			err !== null &&
			"code" in err &&
			(err as { code: number }).code === 11000
		) {
			return NextResponse.json(
				{ error: "Token collision. Please try again." },
				{ status: 409 },
			);
		}

		console.error("[POST /api/payments] Create payment error:", err);
		return NextResponse.json(
			{ error: "Failed to create payment record." },
			{ status: 500 },
		);
	}

	// ── Return response ────────────────────────────────────────────────────────
	return NextResponse.json(
		{
			payment: {
				token: paymentDoc.token,
				amount: paymentDoc.amount,
				original_amount: plan.amount,
				discount_applied: discountAmount,
				qr_code: paymentDoc.qr_code,
				payment_status: paymentDoc.payment_status,
				credits: plan.credits,
				plan_name: plan.name,
				contact_no: paymentDoc.contact_no,
				country_code: paymentDoc.country_code,
				createdAt: paymentDoc.createdAt,
			},
			message:
				"Payment initiated. Scan the QR code to complete your payment.",
		},
		{ status: 201 },
	);
}
