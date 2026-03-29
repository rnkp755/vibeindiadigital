"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
	Check,
	Crown,
	Star,
	Zap,
	ChevronRight,
	X,
	Tag,
	Phone,
	Loader2,
	AlertCircle,
	Coins,
	Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";


interface Coupon {
	code: string;
	discount: number;
}

interface Plan {
	_id: string;
	name: "silver" | "gold" | "platinum";
	credits: number;
	amount: number;
	features: string[];
	coupons: Coupon[];
}

interface BuyCreditsClientProps {
	plans: Plan[];
	fetchError: string | null;
	payments: {
		_id: string;
		token: string;
		payment_status: string;
		amount: number;
		credits_granted?: number;
		plan?: {
			name?: string;
			credits?: number;
			amount?: number;
		} | null;
		createdAt: string;
	}[];
}


const COUNTRY_CODES = [
	{ code: "+91", flag: "🇮🇳", name: "India" },
	{ code: "+93", flag: "🇦🇫", name: "Afghanistan" },
	{ code: "+355", flag: "🇦🇱", name: "Albania" },
	{ code: "+213", flag: "🇩🇿", name: "Algeria" },
	{ code: "+376", flag: "🇦🇩", name: "Andorra" },
	{ code: "+244", flag: "🇦🇴", name: "Angola" },
	{ code: "+1-268", flag: "🇦🇬", name: "Antigua and Barbuda" },
	{ code: "+54", flag: "🇦🇷", name: "Argentina" },
	{ code: "+374", flag: "🇦🇲", name: "Armenia" },
	{ code: "+61", flag: "🇦🇺", name: "Australia" },
	{ code: "+43", flag: "🇦🇹", name: "Austria" },
	{ code: "+994", flag: "🇦🇿", name: "Azerbaijan" },
	{ code: "+1-242", flag: "🇧🇸", name: "Bahamas" },
	{ code: "+973", flag: "🇧🇭", name: "Bahrain" },
	{ code: "+880", flag: "🇧🇩", name: "Bangladesh" },
	{ code: "+1-246", flag: "🇧🇧", name: "Barbados" },
	{ code: "+375", flag: "🇧🇾", name: "Belarus" },
	{ code: "+32", flag: "🇧🇪", name: "Belgium" },
	{ code: "+501", flag: "🇧🇿", name: "Belize" },
	{ code: "+229", flag: "🇧🇯", name: "Benin" },
	{ code: "+975", flag: "🇧🇹", name: "Bhutan" },
	{ code: "+591", flag: "🇧🇴", name: "Bolivia" },
	{ code: "+387", flag: "🇧🇦", name: "Bosnia and Herzegovina" },
	{ code: "+267", flag: "🇧🇼", name: "Botswana" },
	{ code: "+55", flag: "🇧🇷", name: "Brazil" },
	{ code: "+673", flag: "🇧🇳", name: "Brunei" },
	{ code: "+359", flag: "🇧🇬", name: "Bulgaria" },
	{ code: "+226", flag: "🇧🇫", name: "Burkina Faso" },
	{ code: "+257", flag: "🇧🇮", name: "Burundi" },
	{ code: "+238", flag: "🇨🇻", name: "Cabo Verde" },
	{ code: "+855", flag: "🇰🇭", name: "Cambodia" },
	{ code: "+237", flag: "🇨🇲", name: "Cameroon" },
	{ code: "+1", flag: "🇨🇦", name: "Canada" },
	{ code: "+236", flag: "🇨🇫", name: "Central African Republic" },
	{ code: "+235", flag: "🇹🇩", name: "Chad" },
	{ code: "+56", flag: "🇨🇱", name: "Chile" },
	{ code: "+86", flag: "🇨🇳", name: "China" },
	{ code: "+57", flag: "🇨🇴", name: "Colombia" },
	{ code: "+269", flag: "🇰🇲", name: "Comoros" },
	{ code: "+242", flag: "🇨🇬", name: "Congo (Congo-Brazzaville)" },
	{ code: "+243", flag: "🇨🇩", name: "Congo (DRC)" },
	{ code: "+506", flag: "🇨🇷", name: "Costa Rica" },
	{ code: "+385", flag: "🇭🇷", name: "Croatia" },
	{ code: "+53", flag: "🇨🇺", name: "Cuba" },
	{ code: "+357", flag: "🇨🇾", name: "Cyprus" },
	{ code: "+420", flag: "🇨🇿", name: "Czech Republic" },
	{ code: "+45", flag: "🇩🇰", name: "Denmark" },
	{ code: "+253", flag: "🇩🇯", name: "Djibouti" },
	{ code: "+1-767", flag: "🇩🇲", name: "Dominica" },
	{ code: "+1-809", flag: "🇩🇴", name: "Dominican Republic" },
	{ code: "+670", flag: "🇹🇱", name: "East Timor" },
	{ code: "+593", flag: "🇪🇨", name: "Ecuador" },
	{ code: "+20", flag: "🇪🇬", name: "Egypt" },
	{ code: "+503", flag: "🇸🇻", name: "El Salvador" },
	{ code: "+240", flag: "🇬🇶", name: "Equatorial Guinea" },
	{ code: "+291", flag: "🇪🇷", name: "Eritrea" },
	{ code: "+372", flag: "🇪🇪", name: "Estonia" },
	{ code: "+268", flag: "🇸🇿", name: "Eswatini" },
	{ code: "+251", flag: "🇪🇹", name: "Ethiopia" },
	{ code: "+679", flag: "🇫🇯", name: "Fiji" },
	{ code: "+358", flag: "🇫🇮", name: "Finland" },
	{ code: "+33", flag: "🇫🇷", name: "France" },
	{ code: "+241", flag: "🇬🇦", name: "Gabon" },
	{ code: "+220", flag: "🇬🇲", name: "Gambia" },
	{ code: "+995", flag: "🇬🇪", name: "Georgia" },
	{ code: "+49", flag: "🇩🇪", name: "Germany" },
	{ code: "+233", flag: "🇬🇭", name: "Ghana" },
	{ code: "+30", flag: "🇬🇷", name: "Greece" },
	{ code: "+1-473", flag: "🇬🇩", name: "Grenada" },
	{ code: "+502", flag: "🇬🇹", name: "Guatemala" },
	{ code: "+224", flag: "🇬🇳", name: "Guinea" },
	{ code: "+245", flag: "🇬🇼", name: "Guinea-Bissau" },
	{ code: "+592", flag: "🇬🇾", name: "Guyana" },
	{ code: "+509", flag: "🇭🇹", name: "Haiti" },
	{ code: "+504", flag: "🇭🇳", name: "Honduras" },
	{ code: "+36", flag: "🇭🇺", name: "Hungary" },
	{ code: "+354", flag: "🇮🇸", name: "Iceland" },
	{ code: "+62", flag: "🇮🇩", name: "Indonesia" },
	{ code: "+98", flag: "🇮🇷", name: "Iran" },
	{ code: "+964", flag: "🇮🇶", name: "Iraq" },
	{ code: "+353", flag: "🇮🇪", name: "Ireland" },
	{ code: "+972", flag: "🇮🇱", name: "Israel" },
	{ code: "+39", flag: "🇮🇹", name: "Italy" },
	{ code: "+1-876", flag: "🇯🇲", name: "Jamaica" },
	{ code: "+81", flag: "🇯🇵", name: "Japan" },
	{ code: "+962", flag: "🇯🇴", name: "Jordan" },
	{ code: "+7", flag: "🇰🇿", name: "Kazakhstan" },
	{ code: "+254", flag: "🇰🇪", name: "Kenya" },
	{ code: "+686", flag: "🇰🇮", name: "Kiribati" },
	{ code: "+383", flag: "🇽🇰", name: "Kosovo" },
	{ code: "+965", flag: "🇰🇼", name: "Kuwait" },
	{ code: "+996", flag: "🇰🇬", name: "Kyrgyzstan" },
	{ code: "+856", flag: "🇱🇦", name: "Laos" },
	{ code: "+371", flag: "🇱🇻", name: "Latvia" },
	{ code: "+961", flag: "🇱🇧", name: "Lebanon" },
	{ code: "+266", flag: "🇱🇸", name: "Lesotho" },
	{ code: "+231", flag: "🇱🇷", name: "Liberia" },
	{ code: "+218", flag: "🇱🇾", name: "Libya" },
	{ code: "+423", flag: "🇱🇮", name: "Liechtenstein" },
	{ code: "+370", flag: "🇱🇹", name: "Lithuania" },
	{ code: "+352", flag: "🇱🇺", name: "Luxembourg" },
	{ code: "+261", flag: "🇲🇬", name: "Madagascar" },
	{ code: "+265", flag: "🇲🇼", name: "Malawi" },
	{ code: "+60", flag: "🇲🇾", name: "Malaysia" },
	{ code: "+960", flag: "🇲🇻", name: "Maldives" },
	{ code: "+223", flag: "🇲🇱", name: "Mali" },
	{ code: "+356", flag: "🇲🇹", name: "Malta" },
	{ code: "+692", flag: "🇲🇭", name: "Marshall Islands" },
	{ code: "+222", flag: "🇲🇷", name: "Mauritania" },
	{ code: "+230", flag: "🇲🇺", name: "Mauritius" },
	{ code: "+52", flag: "🇲🇽", name: "Mexico" },
	{ code: "+691", flag: "🇫🇲", name: "Micronesia" },
	{ code: "+373", flag: "🇲🇩", name: "Moldova" },
	{ code: "+377", flag: "🇲🇨", name: "Monaco" },
	{ code: "+976", flag: "🇲🇳", name: "Mongolia" },
	{ code: "+382", flag: "🇲🇪", name: "Montenegro" },
	{ code: "+212", flag: "🇲🇦", name: "Morocco" },
	{ code: "+258", flag: "🇲🇿", name: "Mozambique" },
	{ code: "+95", flag: "🇲🇲", name: "Myanmar" },
	{ code: "+264", flag: "🇳🇦", name: "Namibia" },
	{ code: "+674", flag: "🇳🇷", name: "Nauru" },
	{ code: "+977", flag: "🇳🇵", name: "Nepal" },
	{ code: "+31", flag: "🇳🇱", name: "Netherlands" },
	{ code: "+64", flag: "🇳🇿", name: "New Zealand" },
	{ code: "+505", flag: "🇳🇮", name: "Nicaragua" },
	{ code: "+227", flag: "🇳🇪", name: "Niger" },
	{ code: "+234", flag: "🇳🇬", name: "Nigeria" },
	{ code: "+850", flag: "🇰🇵", name: "North Korea" },
	{ code: "+47", flag: "🇳🇴", name: "Norway" },
	{ code: "+968", flag: "🇴🇲", name: "Oman" },
	{ code: "+680", flag: "🇵🇼", name: "Palau" },
	{ code: "+970", flag: "🇵🇸", name: "Palestine" },
	{ code: "+507", flag: "🇵🇦", name: "Panama" },
	{ code: "+675", flag: "🇵🇬", name: "Papua New Guinea" },
	{ code: "+595", flag: "🇵🇾", name: "Paraguay" },
	{ code: "+51", flag: "🇵🇪", name: "Peru" },
	{ code: "+63", flag: "🇵🇭", name: "Philippines" },
	{ code: "+48", flag: "🇵🇱", name: "Poland" },
	{ code: "+351", flag: "🇵🇹", name: "Portugal" },
	{ code: "+974", flag: "🇶🇦", name: "Qatar" },
	{ code: "+40", flag: "🇷🇴", name: "Romania" },
	{ code: "+7", flag: "🇷🇺", name: "Russia" },
	{ code: "+250", flag: "🇷🇼", name: "Rwanda" },
	{ code: "+1-869", flag: "🇰🇳", name: "Saint Kitts and Nevis" },
	{ code: "+1-758", flag: "🇱🇨", name: "Saint Lucia" },
	{ code: "+1-784", flag: "🇻🇨", name: "Saint Vincent and the Grenadines" },
	{ code: "+685", flag: "🇼🇸", name: "Samoa" },
	{ code: "+378", flag: "🇸🇲", name: "San Marino" },
	{ code: "+239", flag: "🇸🇹", name: "Sao Tome and Principe" },
	{ code: "+966", flag: "🇸🇦", name: "Saudi Arabia" },
	{ code: "+221", flag: "🇸🇳", name: "Senegal" },
	{ code: "+381", flag: "🇷🇸", name: "Serbia" },
	{ code: "+248", flag: "🇸🇨", name: "Seychelles" },
	{ code: "+232", flag: "🇸🇱", name: "Sierra Leone" },
	{ code: "+65", flag: "🇸🇬", name: "Singapore" },
	{ code: "+421", flag: "🇸🇰", name: "Slovakia" },
	{ code: "+386", flag: "🇸🇮", name: "Slovenia" },
	{ code: "+677", flag: "🇸🇧", name: "Solomon Islands" },
	{ code: "+252", flag: "🇸🇴", name: "Somalia" },
	{ code: "+27", flag: "🇿🇦", name: "South Africa" },
	{ code: "+82", flag: "🇰🇷", name: "South Korea" },
	{ code: "+211", flag: "🇸🇸", name: "South Sudan" },
	{ code: "+34", flag: "🇪🇸", name: "Spain" },
	{ code: "+94", flag: "🇱🇰", name: "Sri Lanka" },
	{ code: "+249", flag: "🇸🇩", name: "Sudan" },
	{ code: "+597", flag: "🇸🇷", name: "Suriname" },
	{ code: "+46", flag: "🇸🇪", name: "Sweden" },
	{ code: "+41", flag: "🇨🇭", name: "Switzerland" },
	{ code: "+963", flag: "🇸🇾", name: "Syria" },
	{ code: "+886", flag: "🇹🇼", name: "Taiwan" },
	{ code: "+992", flag: "🇹🇯", name: "Tajikistan" },
	{ code: "+255", flag: "🇹🇿", name: "Tanzania" },
	{ code: "+66", flag: "🇹🇭", name: "Thailand" },
	{ code: "+228", flag: "🇹🇬", name: "Togo" },
	{ code: "+676", flag: "🇹🇴", name: "Tonga" },
	{ code: "+1-868", flag: "🇹🇹", name: "Trinidad and Tobago" },
	{ code: "+216", flag: "🇹🇳", name: "Tunisia" },
	{ code: "+90", flag: "🇹🇷", name: "Turkey" },
	{ code: "+993", flag: "🇹🇲", name: "Turkmenistan" },
	{ code: "+688", flag: "🇹🇻", name: "Tuvalu" },
	{ code: "+256", flag: "🇺🇬", name: "Uganda" },
	{ code: "+380", flag: "🇺🇦", name: "Ukraine" },
	{ code: "+971", flag: "🇦🇪", name: "UAE" },
	{ code: "+44", flag: "🇬🇧", name: "United Kingdom" },
	{ code: "+1", flag: "🇺🇸", name: "United States" },
	{ code: "+598", flag: "🇺🇾", name: "Uruguay" },
	{ code: "+998", flag: "🇺🇿", name: "Uzbekistan" },
	{ code: "+678", flag: "🇻🇺", name: "Vanuatu" },
	{ code: "+379", flag: "🇻🇦", name: "Vatican City" },
	{ code: "+58", flag: "🇻🇪", name: "Venezuela" },
	{ code: "+84", flag: "🇻🇳", name: "Vietnam" },
	{ code: "+967", flag: "🇾🇪", name: "Yemen" },
	{ code: "+260", flag: "🇿🇲", name: "Zambia" },
	{ code: "+263", flag: "🇿🇼", name: "Zimbabwe" },
];


const PLAN_STYLE: Record<
	string,
	{
		icon: React.ElementType;
		gradient: string;
		accentColor: string;
		borderColor: string;
		badgeClass: string;
		popular: boolean;
		iconBg: string;
	}
> = {
	silver: {
		icon: Star,
		gradient: "from-slate-500/10 to-slate-600/5",
		accentColor: "#94a3b8",
		borderColor: "border-slate-500/25",
		badgeClass: "border-slate-500/30 bg-slate-500/10 text-slate-300",
		popular: false,
		iconBg: "bg-slate-500/15 border-slate-500/25",
	},
	gold: {
		icon: Crown,
		gradient: "from-amber-500/12 to-amber-600/5",
		accentColor: "#f59e0b",
		borderColor: "border-amber-500/30",
		badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-400",
		popular: true,
		iconBg: "bg-amber-500/15 border-amber-500/25",
	},
	platinum: {
		icon: Zap,
		gradient: "from-[#FF1B6B]/10 to-violet-600/5",
		accentColor: "#FF1B6B",
		borderColor: "border-[#FF1B6B]/30",
		badgeClass: "border-[#FF1B6B]/30 bg-[#FF1B6B]/10 text-[#FF1B6B]",
		popular: false,
		iconBg: "bg-[#FF1B6B]/15 border-[#FF1B6B]/25",
	},
};


function PlanCard({
	plan,
	onSelect,
}: {
	plan: Plan;
	onSelect: (plan: Plan) => void;
}) {
	const style = PLAN_STYLE[plan.name] ?? PLAN_STYLE.silver;
	const Icon = style.icon;

	return (
		<div
			className={cn(
				"relative group rounded-2xl border bg-gradient-to-br transition-all duration-300 overflow-hidden",
				"hover:scale-[1.02] hover:shadow-2xl cursor-pointer",
				style.borderColor,
				style.gradient,
				style.popular
					? "shadow-lg shadow-amber-500/10"
					: "shadow-md shadow-black/30",
			)}
			onClick={() => onSelect(plan)}
		>
			{/* Popular badge */}
			{style.popular && (
				<div className="absolute top-0 right-0">
					<div className="bg-amber-500 text-black text-[10px] font-black px-3 py-1 rounded-bl-xl tracking-widest uppercase">
						POPULAR
					</div>
				</div>
			)}

			{/* Hover glow */}
			<div
				className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
				style={{
					background: `radial-gradient(ellipse at top, ${style.accentColor}10, transparent 60%)`,
				}}
			/>

			<div className="relative p-6 sm:p-7">
				{/* Plan icon + name */}
				<div className="flex items-center gap-3 mb-5">
					<div
						className={cn(
							"w-11 h-11 rounded-xl border flex items-center justify-center shrink-0",
							style.iconBg,
						)}
					>
						<Icon
							className="h-5 w-5"
							style={{ color: style.accentColor }}
						/>
					</div>
					<div>
						<h3
							className="text-xl font-bold capitalize tracking-tight"
							style={{ color: style.accentColor }}
						>
							{plan.name}
						</h3>
						<p className="text-xs text-gray-500 font-medium">
							Distribution Plan
						</p>
					</div>
				</div>

				{/* Price */}
				<div className="mb-5">
					<div className="flex items-baseline gap-1">
						<span className="text-4xl font-black text-white">
							₹{plan.amount.toLocaleString("en-IN")}
						</span>
						<span className="text-sm text-gray-500 font-medium">
							one-time
						</span>
					</div>
					<div className="flex items-center gap-1.5 mt-2">
						<Coins
							className="h-4 w-4 shrink-0"
							style={{ color: style.accentColor }}
						/>
						<span
							className="text-lg font-bold"
							style={{ color: style.accentColor }}
						>
							{plan.credits} Credits
						</span>
						<span className="text-xs text-gray-600">
							({plan.credits} track{plan.credits !== 1 ? "s" : ""}
							)
						</span>
					</div>
				</div>

				{/* Divider */}
				<div
					className="h-px mb-5 rounded-full"
					style={{ backgroundColor: `${style.accentColor}20` }}
				/>

				{/* Features */}
				<ul className="space-y-2.5 mb-6">
					{(plan.features.length > 0
						? plan.features
						: [
								`${plan.credits} Track Distribution Credits`,
								"All Major Streaming Platforms",
								"Keep 100% Rights Ownership",
								"Priority Support",
								"Real-time Status Updates",
							]
					).map((feature, i) => (
						<li key={i} className="flex items-start gap-2.5">
							<div
								className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
								style={{
									backgroundColor: `${style.accentColor}20`,
								}}
							>
								<Check
									className="h-2.5 w-2.5"
									style={{ color: style.accentColor }}
								/>
							</div>
							<span className="text-sm text-gray-300 leading-tight">
								{feature}
							</span>
						</li>
					))}
				</ul>

				{/* Coupons hint */}
				{plan.coupons && plan.coupons.length > 0 && (
					<div className="flex items-center gap-1.5 mb-4">
						<Tag
							className="h-3.5 w-3.5"
							style={{ color: style.accentColor }}
						/>
						<span
							className="text-xs"
							style={{ color: style.accentColor }}
						>
							{plan.coupons.length} coupon
							{plan.coupons.length !== 1 ? "s" : ""} available
						</span>
					</div>
				)}

				{/* CTA */}
				<Button
					className="w-full font-semibold h-11 text-base transition-all group/btn"
					style={
						style.popular
							? {}
							: {
									backgroundColor: `${style.accentColor}18`,
									borderColor: `${style.accentColor}40`,
									color: style.accentColor,
								}
					}
					variant={style.popular ? "default" : "outline"}
					onClick={(e) => {
						e.stopPropagation();
						onSelect(plan);
					}}
				>
					{style.popular ? (
						<span className="flex items-center gap-2">
							<Sparkles className="h-4 w-4" />
							Get{" "}
							{plan.name.charAt(0).toUpperCase() +
								plan.name.slice(1)}
							<ChevronRight className="h-4 w-4 group-hover/btn:translate-x-0.5 transition-transform" />
						</span>
					) : (
						<span className="flex items-center gap-2">
							Get{" "}
							{plan.name.charAt(0).toUpperCase() +
								plan.name.slice(1)}
							<ChevronRight className="h-4 w-4 group-hover/btn:translate-x-0.5 transition-transform" />
						</span>
					)}
				</Button>
			</div>
		</div>
	);
}


interface CheckoutDialogProps {
	plan: Plan;
	open: boolean;
	onClose: () => void;
}

function CheckoutDialog({ plan, open, onClose }: CheckoutDialogProps) {
	const router = useRouter();
	const style = PLAN_STYLE[plan.name] ?? PLAN_STYLE.silver;

	const [selectedCoupon, setSelectedCoupon] = useState<string>("");
	const [countryCode, setCountryCode] = useState("+91");
	const [contactNo, setContactNo] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Derive final amount
	const appliedCoupon = plan.coupons.find((c) => c.code === selectedCoupon);
	const discountPct = appliedCoupon?.discount ?? 0;
	const discountAmount = Math.round(plan.amount * discountPct) / 100;
	const finalAmount = Math.max(0, plan.amount - discountAmount);

	const handlePayWithUPI = useCallback(async () => {
		if (!contactNo.trim() || contactNo.trim().length < 5) {
			setError("Please enter a valid contact number.");
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const res = await fetch("/api/payments", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					plan_id: plan._id,
					coupon_code: selectedCoupon || undefined,
					contact_no: contactNo.trim(),
					country_code: countryCode,
				}),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(
					(data as { error?: string }).error ??
						`Payment initiation failed (HTTP ${res.status}).`,
				);
			}

			const token: string = (data as { payment: { token: string } })
				.payment.token;

			// Navigate to checkout page
			router.push(`/checkout/${token}`);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Something went wrong. Please try again.",
			);
		} finally {
			setLoading(false);
		}
	}, [plan._id, selectedCoupon, contactNo, countryCode, router]);

	const handleClose = useCallback(() => {
		if (loading) return;
		setSelectedCoupon("");
		setContactNo("");
		setError(null);
		onClose();
	}, [loading, onClose]);

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="bg-[#111111] border border-white/10 text-white shadow-2xl shadow-black/60 max-w-md w-full rounded-2xl p-0 overflow-hidden gap-0">
				{/* Header */}
				<DialogHeader className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
					<div className="flex items-center gap-3 mb-2">
						<div
							className={cn(
								"w-10 h-10 rounded-xl border flex items-center justify-center",
								style.iconBg,
							)}
						>
							{(() => {
								const Icon = style.icon;
								return (
									<Icon
										className="h-5 w-5"
										style={{ color: style.accentColor }}
									/>
								);
							})()}
						</div>
						<div>
							<DialogTitle className="text-lg font-bold text-white capitalize leading-none">
								{plan.name} Plan
							</DialogTitle>
							<DialogDescription className="text-xs text-gray-500 mt-0.5">
								{plan.credits} credits • ₹
								{plan.amount.toLocaleString("en-IN")}
							</DialogDescription>
						</div>
					</div>

					{/* Price summary */}
					<div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3.5 mt-2">
						<div className="flex items-center justify-between text-sm text-gray-400 mb-1.5">
							<span>Plan Amount</span>
							<span>₹{plan.amount.toLocaleString("en-IN")}</span>
						</div>
						{discountAmount > 0 && (
							<div className="flex items-center justify-between text-sm text-emerald-400 mb-1.5">
								<span className="flex items-center gap-1.5">
									<Tag className="h-3.5 w-3.5" />
									Coupon ({selectedCoupon})
								</span>
								<span>
									₹{discountAmount.toLocaleString("en-IN")}
								</span>
							</div>
						)}
						<div
							className="flex items-center justify-between text-base font-bold mt-1 pt-1.5 border-t border-white/[0.06]"
							style={{ color: style.accentColor }}
						>
							<span>Total</span>
							<span>₹{finalAmount.toLocaleString("en-IN")}</span>
						</div>
					</div>
				</DialogHeader>

				{/* Body */}
				<div className="px-6 py-5 space-y-5">
					{plan.coupons && plan.coupons.length > 0 && (
						<div className="space-y-2">
							<Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
								<Tag className="h-3.5 w-3.5 text-[#FF1B6B]" />
								Available Coupons
							</Label>
							<div className="grid gap-2">
								{/* "No coupon" option */}
								<button
									onClick={() => setSelectedCoupon("")}
									className={cn(
										"flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-all",
										!selectedCoupon
											? "border-white/25 bg-white/5"
											: "border-white/8 bg-transparent hover:border-white/15 hover:bg-white/[0.02]",
									)}
								>
									<div
										className={cn(
											"w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
											!selectedCoupon
												? "border-[#FF1B6B] bg-[#FF1B6B]"
												: "border-white/25",
										)}
									>
										{!selectedCoupon && (
											<Check className="h-2.5 w-2.5 text-white" />
										)}
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-sm text-gray-400">
											No coupon
										</p>
									</div>
									<span className="text-sm font-semibold text-gray-400">
										₹{plan.amount.toLocaleString("en-IN")}
									</span>
								</button>

								{plan.coupons.map((coupon) => {
									const isSelected =
										selectedCoupon === coupon.code;
									const discountedPrice = Math.max(
										0,
										plan.amount -
											Math.round(
												plan.amount * coupon.discount,
											) /
												100,
									);
									return (
										<button
											key={coupon.code}
											onClick={() =>
												setSelectedCoupon(
													isSelected
														? ""
														: coupon.code,
												)
											}
											className={cn(
												"flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-all",
												isSelected
													? "border-emerald-500/30 bg-emerald-500/8"
													: "border-white/8 bg-transparent hover:border-white/15 hover:bg-white/[0.02]",
											)}
										>
											<div
												className={cn(
													"w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
													isSelected
														? "border-emerald-500 bg-emerald-500"
														: "border-white/25",
												)}
											>
												{isSelected && (
													<Check className="h-2.5 w-2.5 text-white" />
												)}
											</div>
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2">
													<span className="font-mono text-sm font-bold text-white">
														{coupon.code}
													</span>
													<Badge
														variant="outline"
														className="text-[10px] border-emerald-500/25 text-emerald-400 bg-emerald-500/8 px-1.5 py-0"
													>
														{coupon.discount}%
													</Badge>
												</div>
												<p className="text-[11px] text-gray-600 mt-0.5">
													Save {coupon.discount}% on
													this plan
												</p>
											</div>
											<span className="text-sm font-semibold text-emerald-400">
												₹
												{discountedPrice.toLocaleString(
													"en-IN",
												)}
											</span>
										</button>
									);
								})}
							</div>
						</div>
					)}

					<div className="space-y-2">
						<Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
							<Phone className="h-3.5 w-3.5 text-[#FF1B6B]" />
							Contact Number
						</Label>
						<div className="flex gap-2">
							{/* Country code */}
							<Select
								value={countryCode}
								onValueChange={setCountryCode}
							>
								<SelectTrigger className="w-[7.5rem] h-11 bg-[#1a1a1a] border-white/10 text-white text-sm shrink-0 focus:border-[#FF1B6B] focus:ring-[#FF1B6B]/20">
									<SelectValue>
										<span className="flex items-center gap-1.5">
											<span>
												{COUNTRY_CODES.find(
													(c) =>
														c.code === countryCode,
												)?.flag ?? "ðŸŒ"}
											</span>
											<span className="font-mono font-semibold">
												{countryCode}
											</span>
										</span>
									</SelectValue>
								</SelectTrigger>
								<SelectContent className="bg-[#111111] border border-white/10 max-h-60">
									{COUNTRY_CODES.map((c) => (
										<SelectItem
											key={c.code}
											value={c.code}
											className="text-white hover:bg-white/5 focus:bg-white/8 cursor-pointer text-sm"
										>
											<span className="flex items-center gap-2">
												<span>{c.flag}</span>
												<span className="font-mono font-semibold text-[#FF1B6B]">
													{c.code}
												</span>
												<span className="text-gray-400 text-xs truncate">
													{c.name}
												</span>
											</span>
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							{/* Number input */}
							<Input
								type="tel"
								value={contactNo}
								onChange={(e) => {
									const val = e.target.value.replace(
										/[^\d\s\-()]/g,
										"",
									);
									setContactNo(val);
									if (error) setError(null);
								}}
								placeholder="98765 43210"
								className="flex-1 h-11 bg-[#1a1a1a] border-white/10 text-white placeholder:text-gray-600 focus:border-[#FF1B6B] focus:ring-[#FF1B6B]/20 font-mono"
							/>
						</div>
						<p className="text-[11px] text-gray-600">
							Your contact number for this transaction.
						</p>
					</div>

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

					<div className="rounded-xl bg-white/[0.02] border border-white/[0.05] px-3.5 py-3">
						<p className="text-[11px] text-gray-600 leading-relaxed">
							After clicking below, you'll be shown a{" "}
							<span className="text-gray-400">UPI QR code</span>{" "}
							to scan with any UPI app. Once paid, upload your
							payment screenshot for instant verification.
						</p>
					</div>
				</div>

				{/* Footer */}
				<div className="px-6 pb-6 flex gap-3">
					<Button
						onClick={handleClose}
						variant="outline"
						disabled={loading}
						className="h-11 border-white/15 text-gray-400 hover:text-white hover:border-white/25 bg-transparent"
					>
						<X className="h-4 w-4 mr-1.5" />
						Cancel
					</Button>

					<Button
						onClick={handlePayWithUPI}
						disabled={
							loading ||
							!contactNo.trim() ||
							contactNo.trim().length < 5
						}
						className="flex-1 h-11 text-base font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						style={
							loading
								? {}
								: {
										background: `linear-gradient(135deg, ${style.accentColor}, ${style.accentColor}cc)`,
										boxShadow: `0 8px 24px ${style.accentColor}30`,
										color:
											plan.name === "silver"
												? "#000"
												: "#fff",
									}
						}
					>
						{loading ? (
							<>
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								Generating QR
							</>
						) : (
							<>
								Pay ₹{finalAmount.toLocaleString("en-IN")} with
								UPI
								<ChevronRight className="ml-2 h-4 w-4" />
							</>
						)}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}


export function BuyCreditsClient({
	plans,
	fetchError,
	payments,
}: BuyCreditsClientProps) {
	const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

	return (
		<div className="min-h-[calc(100vh-64px)] bg-[#0a0a0a] text-white">
			{/* Ambient glow */}
			<div className="pointer-events-none fixed inset-0 overflow-hidden">
				<div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-[#FF1B6B]/6 blur-[140px]" />
				<div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-amber-500/4 blur-[120px]" />
			</div>

			<div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8">
				<div className="text-center max-w-2xl mx-auto mb-12">
					<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#FF1B6B]/25 bg-[#FF1B6B]/8 text-xs font-semibold text-[#FF1B6B] mb-4 tracking-wide">
						<Coins className="h-3.5 w-3.5" />
						Distribution Credits
					</div>
					<h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-4 leading-tight">
						Power Up Your{" "}
						<span className="text-[#FF1B6B]">Music Career</span>
					</h1>
					<p className="text-base text-gray-400 leading-relaxed max-w-lg mx-auto">
						Buy credits to distribute your tracks to 150+ streaming
						platforms worldwide. One credit = one track. Pay once,
						distribute forever.
					</p>
				</div>

				{fetchError && (
					<Alert className="border border-red-500/30 bg-red-500/8 mb-8 max-w-lg mx-auto">
						<div className="flex items-start gap-2">
							<AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
							<AlertDescription className="text-red-300 text-sm">
								{fetchError}
							</AlertDescription>
						</div>
					</Alert>
				)}

				{plans.length === 0 && !fetchError ? (
					<div className="text-center py-20">
						<p className="text-gray-500">
							No plans available at the moment. Please check back
							later.
						</p>
					</div>
				) : (
					<div className="grid md:grid-cols-3 gap-6">
						{plans.map((plan) => (
							<PlanCard
								key={plan._id}
								plan={plan}
								onSelect={setSelectedPlan}
							/>
						))}
					</div>
				)}

				<div className="mt-10 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 max-w-2xl mx-auto">
					<p className="text-xs text-gray-600 text-center leading-relaxed">
						<span className="text-gray-400 font-medium">
							Secure UPI Payment
						</span>{" "}
						· Credits are added instantly upon payment verification
						· All transactions are manually reviewed for your
						safety.
					</p>
				</div>

				{/* Payment history  */}
				<div className="mt-14 max-w-5xl mx-auto">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-lg sm:text-xl font-bold">
							Your Payments
						</h2>
						<span className="text-xs text-gray-500">
							{payments.length} entr
							{payments.length === 1 ? "y" : "ies"}
						</span>
					</div>

					{payments.length === 0 ? (
						<div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-6 text-center text-sm text-gray-500">
							No payments yet. Start by choosing a plan above.
						</div>
					) : (
						<div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
							<Table>
								<TableHeader>
									<TableRow className="border-white/10">
										<TableHead className="text-gray-500">
											Date
										</TableHead>
										<TableHead className="text-gray-500">
											Plan
										</TableHead>
										<TableHead className="text-gray-500">
											Credits
										</TableHead>
										<TableHead className="text-gray-500">
											Amount
										</TableHead>
										<TableHead className="text-gray-500">
											Status
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{payments.map((payment) => {
										const created = new Date(
											payment.createdAt,
										);
										const planName =
											payment.plan?.name ?? "Custom";
										const credits =
											payment.credits_granted ??
											payment.plan?.credits ??
											0;

										const statusStyles: Record<
											string,
											{ className: string; label: string }
										> = {
											pending: {
												className:
													"border-amber-500/30 bg-amber-500/10 text-amber-300",
												label: "Pending",
											},
											needs_review: {
												className:
													"border-violet-500/30 bg-violet-500/10 text-violet-300",
												label: "Needs Review",
											},
											completed: {
												className:
													"border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
												label: "Completed",
											},
											verified: {
												className:
													"border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
												label: "Verified",
											},
											failed: {
												className:
													"border-red-500/30 bg-red-500/10 text-red-300",
												label: "Failed",
											},
										};

										const status =
											statusStyles[
												payment.payment_status
											] ?? statusStyles.pending;

										return (
											<TableRow
												key={payment._id}
												className="border-white/10"
											>
												<TableCell className="text-gray-300">
													{Number.isNaN(
														created.getTime(),
													)
														? "—"
														: created.toLocaleDateString(
																"en-IN",
																{
																	day: "2-digit",
																	month: "short",
																	year: "numeric",
																},
															)}
												</TableCell>
												<TableCell className="text-gray-200 capitalize">
													{planName}
												</TableCell>
												<TableCell className="text-gray-200">
													{credits.toLocaleString(
														"en-IN",
													)}
												</TableCell>
												<TableCell className="text-gray-200">
													₹
													{payment.amount.toLocaleString(
														"en-IN",
													)}
												</TableCell>
												<TableCell>
													<Badge
														variant="outline"
														className={cn(
															"text-xs",
															status.className,
														)}
													>
														{status.label}
													</Badge>
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</div>
					)}
				</div>
			</div>

			{selectedPlan && (
				<CheckoutDialog
					plan={selectedPlan}
					open={!!selectedPlan}
					onClose={() => setSelectedPlan(null)}
				/>
			)}
		</div>
	);
}
