import { SignUp } from "@clerk/nextjs";
import { Music2 } from "lucide-react";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4 py-12">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#FF1B6B]/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-[#FF1B6B]/5 blur-[100px]" />
      </div>

      {/* Logo */}
      <Link
        href="/"
        className="relative z-10 flex items-center gap-2 mb-8 group"
      >
        <div className="w-9 h-9 rounded-xl bg-[#FF1B6B]/20 border border-[#FF1B6B]/30 flex items-center justify-center group-hover:bg-[#FF1B6B]/30 transition-colors">
          <Music2 className="h-5 w-5 text-[#FF1B6B]" />
        </div>
        <span className="text-xl font-bold text-white tracking-tight">
          Vibe<span className="text-[#FF1B6B]">India</span>
          <span className="ml-1.5 text-xs font-medium text-[#FF1B6B]/70 bg-[#FF1B6B]/10 border border-[#FF1B6B]/20 px-2 py-0.5 rounded-full align-middle">
            Digital
          </span>
        </span>
      </Link>

      {/* Clerk SignUp component */}
      <div className="relative z-10 w-full flex justify-center">
        <SignUp
          appearance={{
            elements: {
              rootBox: "w-full max-w-md",
              card: "bg-[#111111] border border-white/10 shadow-2xl shadow-black/60 rounded-2xl",
              headerTitle: "text-white text-2xl font-bold",
              headerSubtitle: "text-gray-400 text-sm",
              socialButtonsBlockButton:
                "bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all rounded-xl",
              socialButtonsBlockButtonText: "text-white font-medium",
              dividerLine: "bg-white/10",
              dividerText: "text-gray-500 text-xs",
              formFieldLabel: "text-gray-300 text-sm font-medium",
              formFieldInput:
                "bg-[#1a1a1a] border border-white/10 text-white placeholder:text-gray-600 rounded-xl focus:border-[#FF1B6B] focus:ring-2 focus:ring-[#FF1B6B]/20 transition-all",
              formButtonPrimary:
                "bg-[#FF1B6B] hover:bg-[#FF1B6B]/90 text-white font-semibold rounded-xl shadow-lg shadow-[#FF1B6B]/25 transition-all",
              footerActionLink:
                "text-[#FF1B6B] hover:text-[#FF1B6B]/80 font-medium transition-colors",
              footerActionText: "text-gray-500",
              identityPreviewText: "text-white",
              identityPreviewEditButtonIcon: "text-[#FF1B6B]",
              formFieldSuccessText: "text-emerald-400",
              formFieldErrorText: "text-red-400",
              alertText: "text-white",
              alertTextDanger: "text-red-400",
              otpCodeFieldInput:
                "bg-[#1a1a1a] border border-white/10 text-white focus:border-[#FF1B6B] rounded-xl",
              formResendCodeLink: "text-[#FF1B6B] hover:text-[#FF1B6B]/80",
              badge: "bg-[#FF1B6B]/10 text-[#FF1B6B] border border-[#FF1B6B]/20",
              formFieldInputShowPasswordButton: "text-gray-400 hover:text-white",
              navbar: "hidden",
              navbarMobileMenuButton: "hidden",
            },
            layout: {
              socialButtonsVariant: "blockButton",
              socialButtonsPlacement: "top",
            },
          }}
        />
      </div>

      {/* Footer note */}
      <p className="relative z-10 mt-6 text-xs text-gray-600 text-center max-w-xs">
        By creating an account you agree to our{" "}
        <Link href="/" className="text-gray-500 hover:text-gray-400 underline underline-offset-2">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/" className="text-gray-500 hover:text-gray-400 underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>
    </main>
  );
}
