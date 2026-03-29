import { SignIn } from "@clerk/nextjs";
import { Music2 } from "lucide-react";
import Link from "next/link";

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#FF1B6B]/10 via-transparent to-transparent pointer-events-none" />

      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-2 mb-8 group relative z-10"
      >
        <Music2 className="h-8 w-8 text-[#FF1B6B] group-hover:scale-110 transition-transform" />
        <span className="text-2xl font-bold text-white">
          Vibe<span className="text-[#FF1B6B]">India</span>
        </span>
        <span className="text-xs text-[#FF1B6B] bg-[#FF1B6B]/10 border border-[#FF1B6B]/30 px-2 py-0.5 rounded-full font-semibold tracking-wide">
          Digital
        </span>
      </Link>

      {/* Clerk SignIn component */}
      <div className="relative z-10 w-full flex justify-center">
        <SignIn
          path="/sign-in"
          routing="path"
          signUpUrl="/sign-up"
          afterSignInUrl="/dashboard"
        />
      </div>

      {/* Footer */}
      <p className="mt-8 text-sm text-gray-600 relative z-10">
        © {new Date().getFullYear()} VibeIndia Digital. All rights reserved.
      </p>
    </main>
  );
}
