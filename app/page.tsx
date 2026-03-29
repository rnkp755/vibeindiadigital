"use client";

import { CustomCursor } from "@/components/custom-cursor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Music,
  Check,
  Play,
  TrendingUp,
  DollarSign,
  ChartBar as BarChart3,
  Globe,
  Shield,
  Zap,
  Users,
  Headphones as HeadphonesIcon,
  ChevronRight,
  Music2,
  Radio,
  Disc3,
  Crown,
  Star,
  Calendar,
  FileText,
  MessageSquare,
  LayoutDashboard,
  LogIn,
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Home() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white cursor-none">
      <CustomCursor />

      <nav className="fixed top-0 w-full z-50 bg-[#0a0a0a]/80 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <Music2 className="h-8 w-8 text-[#FF1B6B] group-hover:scale-110 transition-transform" />
            <span className="text-xl font-bold">
              Vibe<span className="text-[#FF1B6B]">India</span>
            </span>
            <span className="text-[10px] font-semibold text-[#FF1B6B]/70 bg-[#FF1B6B]/10 border border-[#FF1B6B]/20 px-1.5 py-0.5 rounded-full hidden sm:inline">
              Digital
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm hover:text-[#FF1B6B] transition-colors"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-sm hover:text-[#FF1B6B] transition-colors"
            >
              Pricing
            </a>
            <a
              href="#faq"
              className="text-sm hover:text-[#FF1B6B] transition-colors"
            >
              FAQ
            </a>
            <a
              href="#support"
              className="text-sm hover:text-[#FF1B6B] transition-colors"
            >
              Support
            </a>
          </div>
          <div className="flex items-center gap-3">
            {!isLoaded ? (
              /* Skeleton while Clerk loads */
              <div className="flex items-center gap-3">
                <div className="w-20 h-9 rounded-lg bg-white/5 animate-pulse" />
                <div className="w-28 h-9 rounded-lg bg-white/8 animate-pulse" />
              </div>
            ) : isSignedIn ? (
              /* Signed-in state */
              <Link href="/dashboard">
                <Button className="bg-[#FF1B6B] hover:bg-[#FF1B6B]/90 text-white font-semibold shadow-lg shadow-[#FF1B6B]/20 group">
                  <LayoutDashboard className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                  Dashboard
                  <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </Link>
            ) : (
              /* Signed-out state */
              <>
                <Link href="/sign-in">
                  <Button
                    variant="outline"
                    className="border-white/15 text-gray-300 hover:text-white hover:border-white/30 bg-transparent group"
                  >
                    <LogIn className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                    Sign In
                  </Button>
                </Link>
                <Link href="/sign-up">
                  <Button className="bg-[#FF1B6B] hover:bg-[#FF1B6B]/90 text-white font-semibold shadow-lg shadow-[#FF1B6B]/20 group">
                    Get Started
                    <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FF1B6B]/10 to-transparent" />
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-block mb-6">
            <Music className="h-16 w-16 text-[#FF1B6B] animate-pulse" />
          </div>
          <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
            Listen Music.
            <br />
            Your Favorites.
            <br />
            <span className="text-[#FF1B6B]">Your Vibe.</span>
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Distribute your music to all major streaming platforms. Keep 100% of
            your rights. Pay once, distribute forever.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-[#FF1B6B] hover:bg-[#FF1B6B]/90 text-white group"
            >
              Start Distributing
              <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 hover:border-[#FF1B6B] group"
            >
              <Play className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
              Watch Demo
            </Button>
          </div>
          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-gray-500">
            <span>100K+ Artists</span>
            <span>•</span>
            <span>50M+ Streams</span>
            <span>•</span>
            <span>150+ Platforms</span>
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Distribute <span className="text-[#FF1B6B]">Everywhere</span>
          </h2>
          <p className="text-gray-400 mb-12 max-w-2xl mx-auto">
            Your music reaches every major platform automatically. One upload,
            unlimited reach.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {[
              "Spotify",
              "Apple Music",
              "YouTube",
              "Amazon",
              "Deezer",
              "Tidal",
              "Instagram",
              "TikTok",
              "Pandora",
              "SoundCloud",
              "Napster",
              "iHeartRadio",
            ].map((platform, i) => (
              <Card
                key={i}
                className="bg-white/5 border-white/10 hover:border-[#FF1B6B] transition-all hover:scale-105"
              >
                <CardContent className="p-6 flex flex-col items-center justify-center h-24">
                  <Globe className="h-8 w-8 text-[#FF1B6B] mb-2" />
                  <span className="text-sm">{platform}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section
        id="pricing"
        className="py-20 px-6 bg-gradient-to-b from-transparent to-[#FF1B6B]/5"
      >
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Simple. <span className="text-[#FF1B6B]">One-Time Fee.</span>
          </h2>
          <p className="text-gray-400 mb-12 max-w-2xl mx-auto">
            No subscriptions. No hidden fees. Pay once, distribute forever.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Single",
                price: "₹499",
                features: [
                  "1 Track Distribution",
                  "All Major Platforms",
                  "Keep 100% Rights",
                  "Basic Analytics",
                  "Email Support",
                ],
              },
              {
                name: "EP",
                price: "₹999",
                features: [
                  "Up to 5 Tracks",
                  "All Major Platforms",
                  "Keep 100% Rights",
                  "Advanced Analytics",
                  "Priority Support",
                  "Custom Release Date",
                ],
                popular: true,
              },
              {
                name: "Album",
                price: "₹1,499",
                features: [
                  "Unlimited Tracks",
                  "All Major Platforms",
                  "Keep 100% Rights",
                  "Pro Analytics",
                  "Priority Support",
                  "Custom Release Date",
                  "Pre-Save Campaigns",
                ],
              },
            ].map((plan, i) => (
              <Card
                key={i}
                className={`relative bg-white/5 border-white/10 hover:border-[#FF1B6B] transition-all hover:scale-105 overflow-hidden group ${
                  plan.popular ? "border-[#FF1B6B]" : ""
                }`}
                onMouseEnter={() => setHoveredCard(i)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-[#FF1B6B] text-white px-4 py-1 text-xs font-bold">
                    POPULAR
                  </div>
                )}
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="text-4xl font-bold text-[#FF1B6B] mb-6">
                    {plan.price}
                    <span className="text-sm text-gray-400">/one-time</span>
                  </div>
                  <ul className="space-y-3 mb-8 text-left">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-[#FF1B6B] flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${
                      plan.popular
                        ? "bg-[#FF1B6B] hover:bg-[#FF1B6B]/90"
                        : "bg-white/10 hover:bg-white/20"
                    }`}
                  >
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-center">
            From <span className="text-[#FF1B6B]">Distribution</span> Works
          </h2>
          <p className="text-gray-400 mb-12 text-center max-w-2xl mx-auto">
            Everything you need to succeed in the music industry, all in one
            place.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Zap,
                title: "Instant Distribution",
                desc: "Your music goes live within 24-48 hours across all platforms",
              },
              {
                icon: Shield,
                title: "100% Rights Ownership",
                desc: "You own all rights to your music. Forever.",
              },
              {
                icon: BarChart3,
                title: "Real-Time Analytics",
                desc: "Track streams, earnings, and audience insights in real-time",
              },
              {
                icon: DollarSign,
                title: "Direct Payments",
                desc: "Get paid directly from platforms. No middleman.",
              },
              {
                icon: Globe,
                title: "Global Reach",
                desc: "Distribute to 150+ platforms and territories worldwide",
              },
              {
                icon: Users,
                title: "Artist Support",
                desc: "24/7 support from real people who care about your success",
              },
              {
                icon: Crown,
                title: "No Hidden Fees",
                desc: "What you see is what you pay. No surprises.",
              },
              {
                icon: Star,
                title: "Pre-Save Campaigns",
                desc: "Build hype with pre-save links before release",
              },
              {
                icon: Calendar,
                title: "Release Scheduling",
                desc: "Plan and schedule releases in advance",
              },
            ].map((feature, i) => (
              <Card
                key={i}
                className="bg-white/5 border-white/10 hover:border-[#FF1B6B] transition-all hover:scale-105 group"
              >
                <CardContent className="p-6">
                  <feature.icon className="h-10 w-10 text-[#FF1B6B] mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-gray-400 text-sm">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-gradient-to-b from-[#FF1B6B]/5 to-transparent">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Everything <span className="text-[#FF1B6B]">You Need</span>
          </h2>
          <p className="text-gray-400 mb-12 max-w-2xl mx-auto">
            Professional tools for independent artists
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Radio,
                title: "Radio Promotion",
                desc: "Get your tracks played on internet radio stations",
                color: "#FF6B35",
              },
              {
                icon: Disc3,
                title: "Playlist Pitching",
                desc: "Submit your music to curated playlists",
                color: "#FF1B6B",
              },
              {
                icon: TrendingUp,
                title: "Growth Tools",
                desc: "Analytics and insights to grow your audience",
                color: "#00D9FF",
              },
            ].map((item, i) => (
              <Card
                key={i}
                className="bg-white/5 border-white/10 hover:border-[#FF1B6B] transition-all hover:scale-105"
              >
                <CardContent className="p-8 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#FF1B6B]/20 mb-4">
                    <item.icon
                      className="h-8 w-8"
                      style={{ color: item.color }}
                    />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-sm">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-center">
            What <span className="text-[#FF1B6B]">Artists Say</span>
          </h2>
          <p className="text-gray-400 mb-12 text-center max-w-2xl mx-auto">
            Join thousands of artists who trust us with their music
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Priya Sharma",
                role: "Independent Artist",
                rating: 5,
                text: "Best decision I made for my music career. Distribution was instant and support was amazing!",
              },
              {
                name: "Rahul Verma",
                role: "Producer",
                rating: 5,
                text: "Finally, a platform that respects artists. No hidden fees, just pure distribution.",
              },
              {
                name: "Ananya Kapoor",
                role: "Singer-Songwriter",
                rating: 5,
                text: "The analytics dashboard is incredible. I can see exactly where my fans are listening.",
              },
            ].map((testimonial, i) => (
              <Card
                key={i}
                className="bg-white/5 border-white/10 hover:border-[#FF1B6B] transition-all hover:scale-105"
              >
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, j) => (
                      <Star
                        key={j}
                        className="h-4 w-4 fill-[#FF1B6B] text-[#FF1B6B]"
                      />
                    ))}
                  </div>
                  <p className="text-gray-300 mb-4">{testimonial.text}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#FF1B6B]/20 flex items-center justify-center">
                      <Music className="h-5 w-5 text-[#FF1B6B]" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{testimonial.name}</p>
                      <p className="text-xs text-gray-400">
                        {testimonial.role}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-gradient-to-b from-transparent to-[#FF1B6B]/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-center">
            Manage Your <span className="text-[#FF1B6B]">Releases</span>
          </h2>
          <p className="text-gray-400 mb-12 text-center">
            Simple dashboard to manage all your music in one place
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: FileText,
                title: "Upload & Release",
                desc: "Simple upload process with all the tools you need",
              },
              {
                icon: BarChart3,
                title: "Track Performance",
                desc: "See how your music performs across all platforms",
              },
              {
                icon: Calendar,
                title: "Schedule Releases",
                desc: "Plan your releases weeks or months in advance",
              },
              {
                icon: MessageSquare,
                title: "Fan Engagement",
                desc: "Connect with your fans through integrated tools",
              },
            ].map((item, i) => (
              <Card
                key={i}
                className="bg-white/5 border-white/10 hover:border-[#FF1B6B] transition-all hover:scale-105"
              >
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#FF1B6B]/20 flex items-center justify-center flex-shrink-0">
                    <item.icon className="h-6 w-6 text-[#FF1B6B]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-1">{item.title}</h3>
                    <p className="text-gray-400 text-sm">{item.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-center">
            Reports & <span className="text-[#FF1B6B]">Payments</span>
          </h2>
          <p className="text-gray-400 mb-12 text-center">
            Transparent reporting and fast payments
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: DollarSign,
                title: "Monthly Payments",
                desc: "Receive your earnings every month, directly to your bank account",
              },
              {
                icon: BarChart3,
                title: "Detailed Reports",
                desc: "See exactly where your earnings come from, platform by platform",
              },
            ].map((item, i) => (
              <Card
                key={i}
                className="bg-white/5 border-white/10 hover:border-[#FF1B6B] transition-all hover:scale-105"
              >
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#FF1B6B]/20 flex items-center justify-center flex-shrink-0">
                    <item.icon className="h-6 w-6 text-[#FF1B6B]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-1">{item.title}</h3>
                    <p className="text-gray-400 text-sm">{item.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section
        id="support"
        className="py-20 px-6 bg-gradient-to-b from-[#FF1B6B]/5 to-transparent"
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-center">
            Support <span className="text-[#FF1B6B]">Center</span>
          </h2>
          <p className="text-gray-400 mb-12 text-center">
            We're here to help you succeed
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: HeadphonesIcon,
                title: "24/7 Support",
                desc: "Get help whenever you need it from our dedicated support team",
              },
              {
                icon: FileText,
                title: "Knowledge Base",
                desc: "Comprehensive guides and tutorials to help you get started",
              },
            ].map((item, i) => (
              <Card
                key={i}
                className="bg-white/5 border-white/10 hover:border-[#FF1B6B] transition-all hover:scale-105"
              >
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#FF1B6B]/20 flex items-center justify-center flex-shrink-0">
                    <item.icon className="h-6 w-6 text-[#FF1B6B]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-1">{item.title}</h3>
                    <p className="text-gray-400 text-sm">{item.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Invite Fellow <span className="text-[#FF1B6B]">Artists</span>
          </h2>
          <p className="text-gray-400 mb-8">
            Know someone who needs this? Share the love and help them grow their
            music career.
          </p>
          <Button size="lg" className="bg-[#FF1B6B] hover:bg-[#FF1B6B]/90">
            Share Invite Link
          </Button>
        </div>
      </section>

      <section
        id="faq"
        className="py-20 px-6 bg-gradient-to-b from-transparent to-[#FF1B6B]/5"
      >
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-center">
            Frequently Asked <span className="text-[#FF1B6B]">Questions</span>
          </h2>
          <p className="text-gray-400 mb-12 text-center">
            Got questions? We've got answers.
          </p>
          <Accordion type="single" collapsible className="space-y-4">
            {[
              {
                q: "How long does distribution take?",
                a: "Your music typically goes live within 24-48 hours on most platforms. Some platforms may take up to 5-7 days.",
              },
              {
                q: "Do I keep the rights to my music?",
                a: "Absolutely! You retain 100% ownership of your music and all rights. We simply distribute it for you.",
              },
              {
                q: "Can I distribute cover songs?",
                a: "Yes! We handle mechanical licensing for cover songs. Additional fees may apply based on the platform.",
              },
              {
                q: "How do I get paid?",
                a: "We collect royalties from all platforms and pay you monthly via bank transfer. No minimum payout threshold.",
              },
              {
                q: "Can I remove my music later?",
                a: "Yes, you can take down your music anytime from your dashboard. It typically takes 24-48 hours to process.",
              },
              {
                q: "What formats do you accept?",
                a: "We accept WAV, FLAC, and high-quality MP3 files. Album artwork should be at least 3000x3000px in JPG or PNG format.",
              },
            ].map((faq, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="bg-white/5 border-white/10 rounded-lg px-6"
              >
                <AccordionTrigger className="hover:text-[#FF1B6B] text-left">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-br from-[#FF1B6B]/20 to-transparent rounded-3xl p-12 border border-[#FF1B6B]/30">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Ready, In <span className="text-[#FF1B6B]">Demand?</span>
          </h2>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            Join thousands of independent artists who are taking control of
            their music career. Start distributing today.
          </p>
          <Button
            size="lg"
            className="bg-[#FF1B6B] hover:bg-[#FF1B6B]/90 text-white group"
          >
            Start Your Journey
            <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </section>

      <footer className="border-t border-white/10 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Music2 className="h-6 w-6 text-[#FF1B6B]" />
                <span className="text-lg font-bold">VibeIndia</span>
              </div>
              <p className="text-sm text-gray-400">
                Empowering independent artists to share their music with the
                world.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a
                    href="#"
                    className="hover:text-[#FF1B6B] transition-colors"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-[#FF1B6B] transition-colors"
                  >
                    Pricing
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-[#FF1B6B] transition-colors"
                  >
                    Distribution
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-[#FF1B6B] transition-colors"
                  >
                    Analytics
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a
                    href="#"
                    className="hover:text-[#FF1B6B] transition-colors"
                  >
                    About
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-[#FF1B6B] transition-colors"
                  >
                    Blog
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-[#FF1B6B] transition-colors"
                  >
                    Careers
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-[#FF1B6B] transition-colors"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a
                    href="#"
                    className="hover:text-[#FF1B6B] transition-colors"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-[#FF1B6B] transition-colors"
                  >
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-[#FF1B6B] transition-colors"
                  >
                    Cookie Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/10 text-center text-sm text-gray-400">
            <p>&copy; 2026 VibeIndia. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
