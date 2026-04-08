import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Zap, Star } from "lucide-react";

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
          EDC Las Vegas 2025 — Custom Garment AI
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
            onClick={() => navigate("/design-studio")}
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
