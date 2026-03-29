import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
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
          colorBackground: "#111111",
          colorInputBackground: "#1a1a1a",
          colorInputText: "#ffffff",
          colorText: "#ffffff",
          colorTextSecondary: "#888888",
          colorNeutral: "#ffffff",
          borderRadius: "0.5rem",
          fontFamily: "Inter, sans-serif",
        },
        elements: {
          card: "bg-[#111111] border border-white/10 shadow-2xl",
          headerTitle: "text-white font-bold",
          headerSubtitle: "text-gray-400",
          socialButtonsBlockButton:
            "bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors",
          formFieldInput:
            "bg-[#1a1a1a] border border-white/10 text-white placeholder:text-gray-500 focus:border-[#FF1B6B] focus:ring-[#FF1B6B]/20",
          formFieldLabel: "text-gray-300",
          footerActionLink: "text-[#FF1B6B] hover:text-[#FF1B6B]/80",
          formButtonPrimary:
            "bg-[#FF1B6B] hover:bg-[#FF1B6B]/90 text-white font-semibold shadow-lg shadow-[#FF1B6B]/20 transition-all",
          dividerLine: "bg-white/10",
          dividerText: "text-gray-500",
          identityPreviewText: "text-white",
          identityPreviewEditButtonIcon: "text-[#FF1B6B]",
          alertText: "text-white",
          formResendCodeLink: "text-[#FF1B6B]",
          otpCodeFieldInput:
            "bg-[#1a1a1a] border border-white/10 text-white focus:border-[#FF1B6B]",
          userButtonAvatarBox: "ring-2 ring-[#FF1B6B]/30",
          userButtonPopoverCard: "bg-[#111111] border border-white/10",
          userButtonPopoverActionButton: "text-white hover:bg-white/5",
          userButtonPopoverActionButtonText: "text-white",
          userButtonPopoverActionButtonIcon: "text-gray-400",
          userPreviewMainIdentifier: "text-white",
          userPreviewSecondaryIdentifier: "text-gray-400",
        },
      }}
    >
      <html lang="en" className="dark">
        <body
          className={`${inter.className} bg-[#0a0a0a] text-white antialiased`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
