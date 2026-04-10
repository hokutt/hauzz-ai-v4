import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Zap, Star } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

const EDC_AERIAL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663522663012/FxMGuZEdHFz8kEGUUru2UP/edc-aerial_28453b73.jpg";
const EDC_STAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663522663012/FxMGuZEdHFz8kEGUUru2UP/edc-stage_339dd238.jpg";
const RAVE_FASHION = "https://d2xsxph8kpxj0f.cloudfront.net/310519663522663012/FxMGuZEdHFz8kEGUUru2UP/rave-fashion_d9f3949e.jpg";
const NEBULA_PINK = "https://d2xsxph8kpxj0f.cloudfront.net/310519663522663012/FxMGuZEdHFz8kEGUUru2UP/nebula-pink_118da7c1.jpg";

// Floating particle component
function Particle({ style }: { style: React.CSSProperties }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        background: `radial-gradient(circle, oklch(0.85 0.18 340 / 0.8), transparent)`,
        ...style,
      }}
    />
  );
}

// Star field canvas
function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Generate stars
    const stars = Array.from({ length: 200 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3,
      opacity: Math.random() * 0.7 + 0.3,
      twinkleSpeed: Math.random() * 0.02 + 0.005,
      twinkleOffset: Math.random() * Math.PI * 2,
    }));

    let frame = 0;
    let animId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;
      stars.forEach((s) => {
        const opacity = s.opacity * (0.5 + 0.5 * Math.sin(frame * s.twinkleSpeed + s.twinkleOffset));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `oklch(0.95 0.05 300 / ${opacity})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />;
}

const features = [
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: "AI Design Agent",
    desc: "Describe your vibe. Our agent builds full looks from EDC's garment DNA — Electric Warrior, Cosmic Priestess, and beyond.",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: "Venue-Native Concepts",
    desc: "Every design is built around the specific energy of your festival — not a generic template.",
  },
  {
    icon: <Star className="w-5 h-5" />,
    title: "End-to-End Production",
    desc: "From concept approval to vendor matching to garment delivery. One loop, no middlemen.",
  },
];

export default function Home() {
  const [, navigate] = useLocation();
  const [scrollY, setScrollY] = useState(0);
  const { user, isAuthenticated } = useAuth();

  // Set page title and description at runtime so SEO scanners pick up the correct values
  useEffect(() => {
    document.title = "HAUZZ.AI — Custom Festival Fashion, AI-Designed";
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", "HAUZZ.AI builds custom festival outfits powered by AI. Describe your vibe, pick your festival, and get a one-of-a-kind garment made end-to-end.");
  }, []);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const particles = [
    { width: 6, height: 6, top: "15%", left: "8%", animationDelay: "0s", animationDuration: "4s" },
    { width: 4, height: 4, top: "25%", right: "12%", animationDelay: "1s", animationDuration: "5s" },
    { width: 8, height: 8, top: "60%", left: "5%", animationDelay: "2s", animationDuration: "6s" },
    { width: 5, height: 5, top: "70%", right: "8%", animationDelay: "0.5s", animationDuration: "4.5s" },
    { width: 3, height: 3, top: "40%", left: "15%", animationDelay: "1.5s", animationDuration: "3.5s" },
    { width: 7, height: 7, top: "80%", right: "20%", animationDelay: "2.5s", animationDuration: "5.5s" },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      {/* ── Starfield ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <StarField />
      </div>

      {/* ── Nebula background layers ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="absolute -top-1/4 -left-1/4 w-[80vw] h-[80vw] rounded-full animate-nebula-drift"
          style={{
            background: "radial-gradient(ellipse, oklch(0.55 0.18 340 / 0.18) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        <div
          className="absolute -bottom-1/4 -right-1/4 w-[70vw] h-[70vw] rounded-full animate-nebula-drift"
          style={{
            background: "radial-gradient(ellipse, oklch(0.55 0.18 280 / 0.15) 0%, transparent 70%)",
            filter: "blur(80px)",
            animationDelay: "7s",
          }}
        />
        <div
          className="absolute top-1/3 left-1/3 w-[50vw] h-[50vw] rounded-full"
          style={{
            background: "radial-gradient(ellipse, oklch(0.60 0.15 200 / 0.08) 0%, transparent 70%)",
            filter: "blur(100px)",
          }}
        />
      </div>

      {/* ── Floating particles ── */}
      {particles.map((p, i) => (
        <Particle
          key={i}
          style={{
            width: p.width,
            height: p.height,
            top: p.top,
            left: (p as any).left,
            right: (p as any).right,
            animation: `float ${p.animationDuration} ease-in-out infinite`,
            animationDelay: p.animationDelay,
            zIndex: 1,
          }}
        />
      ))}

      {/* ── Nav ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 transition-all duration-300"
        style={{
          background: scrollY > 50 ? "oklch(0.06 0.02 300 / 0.9)" : "transparent",
          backdropFilter: scrollY > 50 ? "blur(20px)" : "none",
          borderBottom: scrollY > 50 ? "1px solid oklch(0.72 0.22 340 / 0.1)" : "none",
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full animate-pulse-glow" style={{ background: "oklch(0.72 0.22 340)" }} />
          <span className="font-display font-bold text-xl tracking-tight text-foreground">HAUZZ.AI</span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-foreground text-sm"
            onClick={() => navigate("/festival-map")}
          >
            Festival Map
          </Button>
          {isAuthenticated && (
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground text-sm"
              onClick={() => navigate("/my-designs")}
            >
              My Designs
            </Button>
          )}
          {isAuthenticated ? (
            <span className="text-xs text-muted-foreground px-3">{user?.name}</span>
          ) : (
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground text-sm"
              onClick={() => window.location.href = getLoginUrl()}
            >
              Sign In
            </Button>
          )}
          <Button
            className="glow-pink text-sm font-semibold"
            style={{ background: "oklch(0.72 0.22 340)", color: "oklch(0.06 0.02 300)" }}
            onClick={() => navigate("/design-studio")}
          >
            Start Designing
          </Button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center text-center px-4 pt-20">
        {/* Pill badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 animate-fade-up glass"
          style={{ animationDelay: "0.1s", color: "oklch(0.85 0.18 340)" }}
        >
          <Sparkles className="w-3 h-3" />
          EDC Las Vegas 2027 — Custom Garment AI
        </div>

        {/* Main headline */}
        <h1
          className="font-display font-black text-5xl sm:text-7xl lg:text-8xl leading-[0.9] tracking-tight mb-6 animate-fade-up"
          style={{ animationDelay: "0.2s" }}
        >
          <span className="text-gradient-pink block">Wear the</span>
          <span className="text-foreground block">Universe.</span>
        </h1>

        <p
          className="text-muted-foreground text-lg sm:text-xl max-w-xl mx-auto mb-10 leading-relaxed animate-fade-up"
          style={{ animationDelay: "0.35s" }}
        >
          AI-designed festival fashion built around your vibe, your venue, and your body.
          From concept to custom garment — end to end.
        </p>

        <div
          className="flex flex-col sm:flex-row gap-4 items-center animate-fade-up"
          style={{ animationDelay: "0.5s" }}
        >
          <Button
            size="lg"
            className="glow-pink font-bold text-base px-8 py-6 rounded-2xl group"
            style={{ background: "oklch(0.72 0.22 340)", color: "oklch(0.06 0.02 300)" }}
            onClick={() => navigate("/festival-map")}
          >
            Choose Your Festival
            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="glass font-semibold text-base px-8 py-6 rounded-2xl text-foreground border-border hover:border-primary"
            onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
          >
            See How It Works
          </Button>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-fade-in" style={{ animationDelay: "1.2s" }}>
          <span className="text-xs text-muted-foreground tracking-widest uppercase">Scroll</span>
          <div className="w-px h-12 bg-gradient-to-b from-primary/60 to-transparent" />
        </div>
      </section>

      {/* ── Hero Image Collage ── */}
      <section className="relative z-10 px-4 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-12 gap-3 h-[500px]">
            {/* Large left image */}
            <div className="col-span-7 relative rounded-3xl overflow-hidden group">
              <img
                src={EDC_AERIAL}
                alt="EDC aerial"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6">
                <span className="glass px-3 py-1.5 rounded-full text-xs font-semibold text-foreground">
                  EDC Las Vegas — 150,000 attendees
                </span>
              </div>
            </div>
            {/* Right column */}
            <div className="col-span-5 flex flex-col gap-3">
              <div className="flex-1 relative rounded-3xl overflow-hidden group">
                <img
                  src={EDC_STAGE}
                  alt="EDC stage"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
              </div>
              <div className="flex-1 relative rounded-3xl overflow-hidden group">
                <img
                  src={RAVE_FASHION}
                  alt="Rave fashion"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <span className="glass px-3 py-1.5 rounded-full text-xs font-semibold text-foreground">
                    AI-designed looks
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="relative z-10 px-4 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6 glass"
              style={{ color: "oklch(0.85 0.18 340)" }}
            >
              <Sparkles className="w-3 h-3" />
              How It Works
            </div>
            <h2 className="font-display font-bold text-4xl sm:text-5xl text-foreground mb-4">
              Three steps to{" "}
              <span className="text-gradient-pink">your look.</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto">
              From vibe to garment in one seamless loop — no designers, no middlemen.
            </p>
          </div>

          <div className="relative">
            {/* Connector line */}
            <div
              className="absolute top-16 left-1/2 -translate-x-1/2 w-px h-[calc(100%-8rem)] hidden md:block"
              style={{ background: "linear-gradient(to bottom, oklch(0.72 0.22 340 / 0.4), oklch(0.55 0.18 280 / 0.2), transparent)" }}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center group">
                <div
                  className="relative w-20 h-20 rounded-3xl flex items-center justify-center mb-6 group-hover:animate-pulse-glow transition-all"
                  style={{ background: "oklch(0.72 0.22 340 / 0.12)", border: "1px solid oklch(0.72 0.22 340 / 0.35)" }}
                >
                  <span className="absolute -top-3 -right-3 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black" style={{ background: "oklch(0.72 0.22 340)", color: "oklch(0.06 0.02 300)" }}>1</span>
                  <svg className="w-9 h-9" viewBox="0 0 36 36" fill="none">
                    <circle cx="18" cy="12" r="5" stroke="oklch(0.85 0.18 340)" strokeWidth="1.8" />
                    <path d="M8 28c0-5.5 4.5-10 10-10s10 4.5 10 10" stroke="oklch(0.85 0.18 340)" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M24 6l2 2-2 2M28 8h-4" stroke="oklch(0.72 0.22 340)" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <h3 className="font-display font-bold text-xl text-foreground mb-3">Chat Your Vibe</h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
                  Tell our AI agent your aesthetic, colors, and energy. Use voice or text — describe anything from "cosmic rave priestess" to "electric warrior."
                </p>
                <div
                  className="mt-4 px-3 py-1.5 rounded-full text-xs font-semibold glass"
                  style={{ color: "oklch(0.78 0.20 160)" }}
                >
                  Powered by Claude 3.5 Sonnet
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center group">
                <div
                  className="relative w-20 h-20 rounded-3xl flex items-center justify-center mb-6 group-hover:animate-pulse-glow transition-all"
                  style={{ background: "oklch(0.55 0.18 280 / 0.12)", border: "1px solid oklch(0.55 0.18 280 / 0.35)" }}
                >
                  <span className="absolute -top-3 -right-3 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black" style={{ background: "oklch(0.55 0.18 280)", color: "oklch(0.97 0.01 300)" }}>2</span>
                  <svg className="w-9 h-9" viewBox="0 0 36 36" fill="none">
                    <rect x="5" y="7" width="26" height="22" rx="3" stroke="oklch(0.75 0.18 280)" strokeWidth="1.8" />
                    <path d="M10 14h16M10 19h10" stroke="oklch(0.75 0.18 280)" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="26" cy="22" r="4" fill="oklch(0.72 0.22 340 / 0.3)" stroke="oklch(0.85 0.18 340)" strokeWidth="1.5" />
                    <path d="M24.5 22l1 1 2-2" stroke="oklch(0.85 0.18 340)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="font-display font-bold text-xl text-foreground mb-3">AI Builds Concepts</h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
                  The agent scans EDC's venue DNA and generates 2–4 story-led concept directions with mood boards and photorealistic renders. Pick the one that speaks to you.
                </p>
                <div
                  className="mt-4 px-3 py-1.5 rounded-full text-xs font-semibold glass"
                  style={{ color: "oklch(0.80 0.18 60)" }}
                >
                  AI mood boards + FASHN renders
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center group">
                <div
                  className="relative w-20 h-20 rounded-3xl flex items-center justify-center mb-6 group-hover:animate-pulse-glow transition-all"
                  style={{ background: "oklch(0.78 0.20 200 / 0.12)", border: "1px solid oklch(0.78 0.20 200 / 0.35)" }}
                >
                  <span className="absolute -top-3 -right-3 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black" style={{ background: "oklch(0.78 0.20 200)", color: "oklch(0.06 0.02 300)" }}>3</span>
                  <svg className="w-9 h-9" viewBox="0 0 36 36" fill="none">
                    <path d="M18 4l3.5 7 7.5 1-5.5 5.5 1.5 7.5L18 22l-7 3.5 1.5-7.5L7 12.5l7.5-1z" stroke="oklch(0.78 0.20 200)" strokeWidth="1.8" strokeLinejoin="round" />
                    <path d="M12 26l-4 6M24 26l4 6" stroke="oklch(0.78 0.20 200)" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <h3 className="font-display font-bold text-xl text-foreground mb-3">Garment Delivered</h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
                  Lock in your direction and we handle the rest — vendor matching, production specs, quality checks, and delivery. Your custom garment arrives ready to wear.
                </p>
                <div
                  className="mt-4 px-3 py-1.5 rounded-full text-xs font-semibold glass"
                  style={{ color: "oklch(0.85 0.18 340)" }}
                >
                  6–8 weeks to your door
                </div>
              </div>
            </div>
          </div>

          {/* CTA below steps */}
          <div className="text-center mt-16">
            <Button
              size="lg"
              className="glow-pink font-bold text-base px-8 py-6 rounded-2xl group"
              style={{ background: "oklch(0.72 0.22 340)", color: "oklch(0.06 0.02 300)" }}
              onClick={() => navigate("/festival-map")}
            >
              Start Your Design
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative z-10 px-4 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display font-bold text-4xl sm:text-5xl text-foreground mb-4">
              The full loop.{" "}
              <span className="text-gradient-pink">Nothing missing.</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto">
              Every step from "I want something special" to wearing it at the festival.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="glass rounded-3xl p-8 hover:border-primary/30 transition-all duration-300 group"
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center mb-5 group-hover:animate-pulse-glow transition-all"
                  style={{ background: "oklch(0.72 0.22 340 / 0.15)", color: "oklch(0.85 0.18 340)" }}
                >
                  {f.icon}
                </div>
                <h3 className="font-display font-bold text-lg text-foreground mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="relative z-10 px-4 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display font-bold text-4xl sm:text-5xl text-foreground mb-4">
              Simple pricing.{" "}
              <span className="text-gradient-pink">One-of-a-kind results.</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto">
              No subscriptions. No hidden fees. Pay once, wear forever.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Concept Only */}
            <div className="glass rounded-3xl p-8 flex flex-col">
              <div className="mb-6">
                <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "oklch(0.72 0.22 340)" }}>Concept</div>
                <div className="font-display font-black text-4xl text-foreground">Free</div>
                <div className="text-muted-foreground text-sm mt-1">Generate &amp; explore ideas</div>
              </div>
              <ul className="space-y-3 flex-1 mb-8">
                {["AI concept directions", "Mood board images", "Color palette + materials", "Design packet preview"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "oklch(0.72 0.22 340 / 0.15)", color: "oklch(0.85 0.18 340)" }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full rounded-2xl font-semibold" onClick={() => navigate("/festival-map")}>
                Start Free
              </Button>
            </div>

            {/* Full Garment — featured */}
            <div
              className="rounded-3xl p-8 flex flex-col relative overflow-hidden"
              style={{ background: "oklch(0.72 0.22 340 / 0.12)", border: "1px solid oklch(0.72 0.22 340 / 0.4)" }}
            >
              <div className="absolute top-4 right-4">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: "oklch(0.72 0.22 340)", color: "oklch(0.06 0.02 300)" }}>Most Popular</span>
              </div>
              <div className="mb-6">
                <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "oklch(0.72 0.22 340)" }}>Full Garment</div>
                <div className="font-display font-black text-4xl text-foreground">$350<span className="text-lg font-normal text-muted-foreground">+</span></div>
                <div className="text-muted-foreground text-sm mt-1">Custom-made, delivered to you</div>
              </div>
              <ul className="space-y-3 flex-1 mb-8">
                {["Everything in Concept", "FASHN photorealistic render", "Full production packet", "Vendor matching + outreach", "6–8 week delivery", "Founder review at every stage"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-foreground">
                    <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "oklch(0.72 0.22 340 / 0.15)", color: "oklch(0.85 0.18 340)" }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full rounded-2xl font-bold glow-pink"
                style={{ background: "oklch(0.72 0.22 340)", color: "oklch(0.06 0.02 300)" }}
                onClick={() => navigate("/festival-map")}
              >
                Design My Look
              </Button>
            </div>

            {/* Rush */}
            <div className="glass rounded-3xl p-8 flex flex-col">
              <div className="mb-6">
                <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "oklch(0.80 0.18 60)" }}>Rush</div>
                <div className="font-display font-black text-4xl text-foreground">$550<span className="text-lg font-normal text-muted-foreground">+</span></div>
                <div className="text-muted-foreground text-sm mt-1">Festival in under 3 weeks</div>
              </div>
              <ul className="space-y-3 flex-1 mb-8">
                {["Everything in Full Garment", "Priority vendor queue", "Expedited production", "2–3 week delivery", "Daily status updates"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "oklch(0.80 0.18 60 / 0.15)", color: "oklch(0.80 0.18 60)" }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full rounded-2xl font-semibold" onClick={() => navigate("/festival-map")}>
                Rush My Order
              </Button>
            </div>
          </div>

          <p className="text-center text-muted-foreground text-xs mt-8">
            Final price depends on garment complexity, materials, and quantity. All quotes confirmed before production begins.
          </p>
        </div>
      </section>

      {/* ── Nebula image strip ── */}
      <section className="relative z-10 px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden h-64">
            <img src={NEBULA_PINK} alt="Cosmic nebula" className="w-full h-full object-cover animate-nebula-drift" />
            <div className="absolute inset-0" style={{ background: "oklch(0.06 0.02 300 / 0.5)" }} />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
              <h2 className="font-display font-black text-3xl sm:text-5xl text-foreground mb-4">
                Ready to wear the{" "}
                <span className="text-gradient-cosmic">cosmos?</span>
              </h2>
              <Button
                size="lg"
                className="glow-pink font-bold text-base px-8 py-5 rounded-2xl"
                style={{ background: "oklch(0.72 0.22 340)", color: "oklch(0.06 0.02 300)" }}
                onClick={() => navigate("/festival-map")}
              >
                Pick Your Festival
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 px-4 py-12 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full" style={{ background: "oklch(0.72 0.22 340)" }} />
            <span className="font-display font-bold text-sm text-foreground">HAUZZ.AI</span>
          </div>
          <p className="text-muted-foreground text-xs">
            Venue-native custom garments. Designed by AI. Made for you.
          </p>
        </div>
      </footer>
    </div>
  );
}
