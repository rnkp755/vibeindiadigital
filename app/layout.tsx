import "./globals.css";
import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { CustomCursor } from "@/components/custom-cursor";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-body" });
const spaceGrotesk = Space_Grotesk({
	subsets: ["latin"],
	variable: "--font-display",
});

export const metadata: Metadata = {
	metadataBase: new URL(
		process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
	),
	title: "VibeIndia Digital — Music Distribution",
	description:
		"Distribute your music to all major streaming platforms. Keep 100% of your rights. Pay once, distribute forever.",
	openGraph: {
		title: "VibeIndia Digital",
		description: "Music Distribution Platform",
		images: [{ url: "https://bolt.new/static/og_default.png" }],
	},
	twitter: {
		card: "summary_large_image",
		images: [{ url: "https://bolt.new/static/og_default.png" }],
	},
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<ClerkProvider
			appearance={{
				variables: {
					colorPrimary: "#FF1B6B",
					colorBackground: "#0b0712",
					colorInputBackground: "#16101f",
					colorInputText: "#ffffff",
					colorText: "#ffffff",
					colorTextSecondary: "#a7a0ba",
					colorNeutral: "#ffffff",
					borderRadius: "1rem",
					fontFamily: "DM Sans, sans-serif",
				},
				elements: {
					card: "bg-[#120b1c] border border-white/10 shadow-2xl shadow-black/40",
					headerTitle: "text-white font-bold tracking-tight",
					headerSubtitle: "text-[#a7a0ba]",
					socialButtonsBlockButton:
						"bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors",
					formFieldInput:
						"bg-[#16101f] border border-white/10 text-white placeholder:text-[#7e7595] focus:border-[#FF1B6B] focus:ring-[#FF1B6B]/20",
					formFieldLabel: "text-[#d7d0e7]",
					footerActionLink: "text-[#FF1B6B] hover:text-[#FF1B6B]/80",
					formButtonPrimary:
						"bg-[#FF1B6B] hover:bg-[#FF1B6B]/90 text-white font-semibold shadow-lg shadow-[#FF1B6B]/20 transition-all",
					dividerLine: "bg-white/10",
					dividerText: "text-[#7e7595]",
					identityPreviewText: "text-white",
					identityPreviewEditButtonIcon: "text-[#FF1B6B]",
					alertText: "text-white",
					formResendCodeLink: "text-[#FF1B6B]",
					otpCodeFieldInput:
						"bg-[#16101f] border border-white/10 text-white focus:border-[#FF1B6B]",
					userButtonAvatarBox: "ring-2 ring-[#FF1B6B]/30",
					userButtonPopoverCard:
						"bg-[#120b1c] border border-white/10",
					userButtonPopoverActionButton:
						"text-white hover:bg-white/5",
					userButtonPopoverActionButtonText: "text-white",
					userButtonPopoverActionButtonIcon: "text-[#a7a0ba]",
					userPreviewMainIdentifier: "text-white",
					userPreviewSecondaryIdentifier: "text-[#a7a0ba]",
				},
			}}
		>
			<html lang="en" className="dark">
				<body
					className={`${dmSans.variable} ${spaceGrotesk.variable} bg-[#0a0a0a] text-white antialiased`}
				>
					{children}
					<CustomCursor />
				</body>
			</html>
		</ClerkProvider>
	);
}
