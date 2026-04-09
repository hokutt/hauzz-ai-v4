import { useRef, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, MapPin, Calendar, Users, Zap } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

const GALAXY_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663522663012/FxMGuZEdHFz8kEGUUru2UP/galaxy-purple_7942970a.jpg";
const EDC_WIDE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663522663012/FxMGuZEdHFz8kEGUUru2UP/edc-wide_e16d4f27.webp";

// ── Animated star canvas ──────────────────────────────────────────────────────
function SpaceCanvas() {
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

    const stars = Array.from({ length: 350 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.8 + 0.2,
      opacity: Math.random() * 0.9 + 0.1,
      speed: Math.random() * 0.008 + 0.002,
      offset: Math.random() * Math.PI * 2,
      color: Math.random() > 0.7 ? "340" : Math.random() > 0.5 ? "280" : "200",
    }));

    // Shooting stars
    const shooters: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number }[] = [];
    let frame = 0;
    let animId: number;

    const spawnShooter = () => {
      shooters.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.5,
        vx: (Math.random() * 3 + 2) * (Math.random() > 0.5 ? 1 : -1),
        vy: Math.random() * 2 + 1,
        life: 0,
        maxLife: Math.random() * 40 + 30,
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      // Spawn shooting stars occasionally
      if (frame % 180 === 0) spawnShooter();

      // Draw stars
      stars.forEach((s) => {
        const opacity = s.opacity * (0.4 + 0.6 * Math.sin(frame * s.speed + s.offset));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `oklch(0.92 0.08 ${s.color} / ${opacity})`;
        ctx.fill();
      });

      // Draw shooting stars
      for (let i = shooters.length - 1; i >= 0; i--) {
        const s = shooters[i];
        const progress = s.life / s.maxLife;
        const opacity = Math.sin(progress * Math.PI);
        const len = 60 * (1 - progress * 0.5);

        const grad = ctx.createLinearGradient(s.x - s.vx * len, s.y - s.vy * len, s.x, s.y);
        grad.addColorStop(0, `oklch(0.95 0.15 340 / 0)`);
        grad.addColorStop(1, `oklch(0.95 0.15 340 / ${opacity * 0.9})`);

        ctx.beginPath();
        ctx.moveTo(s.x - s.vx * len, s.y - s.vy * len);
        ctx.lineTo(s.x, s.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        s.x += s.vx;
        s.y += s.vy;
        s.life++;
        if (s.life >= s.maxLife) shooters.splice(i, 1);
      }

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />;
}

// ── Animated planet component ─────────────────────────────────────────────────
function EDCPlanet({ onClick, isSelected }: { onClick: () => void; isSelected: boolean }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative cursor-pointer group"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ width: 280, height: 280 }}
    >
      {/* Outer glow ring */}
      <div
        className="absolute inset-0 rounded-full transition-all duration-500"
        style={{
          background: isSelected
            ? "radial-gradient(circle, oklch(0.72 0.22 340 / 0.3) 0%, transparent 70%)"
            : "radial-gradient(circle, oklch(0.72 0.22 340 / 0.15) 0%, transparent 70%)",
          transform: hovered ? "scale(1.15)" : "scale(1)",
          filter: "blur(20px)",
        }}
      />

      {/* Orbit ring */}
      <div
        className="absolute rounded-full border pointer-events-none"
        style={{
          width: "130%",
          height: "40%",
          top: "30%",
          left: "-15%",
          borderColor: "oklch(0.72 0.22 340 / 0.25)",
          transform: "rotateX(75deg)",
          borderStyle: "dashed",
        }}
      />

      {/* Planet body */}
      <div
        className="absolute inset-4 rounded-full overflow-hidden transition-all duration-500"
        style={{
          boxShadow: isSelected
            ? "0 0 40px 10px oklch(0.72 0.22 340 / 0.6), inset -20px -20px 40px oklch(0.06 0.02 300 / 0.5)"
            : hovered
            ? "0 0 30px 6px oklch(0.72 0.22 340 / 0.4), inset -20px -20px 40px oklch(0.06 0.02 300 / 0.5)"
            : "0 0 20px 4px oklch(0.72 0.22 340 / 0.2), inset -20px -20px 40px oklch(0.06 0.02 300 / 0.5)",
          transform: hovered ? "scale(1.05)" : "scale(1)",
        }}
      >
        {/* Planet texture — EDC festival image */}
        <img
          src={EDC_WIDE}
          alt="EDC planet"
          className="w-full h-full object-cover animate-spin-slow"
          style={{ opacity: 0.85 }}
        />
        {/* Atmosphere overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at 30% 30%, oklch(0.72 0.22 340 / 0.35) 0%, transparent 60%)",
          }}
        />
        {/* Night side shadow */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at 75% 60%, oklch(0.06 0.02 300 / 0.7) 0%, transparent 55%)",
          }}
        />
      </div>

      {/* Label */}
      <div
        className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-center transition-all duration-300"
        style={{ opacity: hovered || isSelected ? 1 : 0.7 }}
      >
        <div className="font-display font-bold text-lg text-foreground whitespace-nowrap">EDC Las Vegas</div>
        <div className="text-xs text-muted-foreground">May 16–18, 2025 · Las Vegas Motor Speedway</div>
      </div>

      {/* Orbiting moon */}
      <div
        className="absolute w-5 h-5 rounded-full"
        style={{
          top: "50%",
          left: "50%",
          marginTop: -10,
          marginLeft: -10,
          animation: "orbit 8s linear infinite",
          "--orbit-r": "120px",
          background: "oklch(0.78 0.20 200)",
          boxShadow: "0 0 10px oklch(0.78 0.20 200 / 0.8)",
        } as React.CSSProperties}
      />
    </div>
  );
}

// ── Venue info panel ──────────────────────────────────────────────────────────
function VenuePanel({ onDesign }: { onDesign: () => void }) {
  return (
    <div className="glass-strong rounded-3xl p-8 max-w-sm w-full animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: "oklch(0.72 0.22 340 / 0.2)" }}
        >
          <MapPin className="w-5 h-5" style={{ color: "oklch(0.85 0.18 340)" }} />
        </div>
        <div>
          <h3 className="font-display font-bold text-xl text-foreground">EDC Las Vegas</h3>
          <p className="text-xs text-muted-foreground">Electric Daisy Carnival</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { icon: <Calendar className="w-4 h-4" />, label: "Date", value: "May 16–18" },
          { icon: <Users className="w-4 h-4" />, label: "Attendees", value: "150,000+" },
          { icon: <MapPin className="w-4 h-4" />, label: "Location", value: "Las Vegas, NV" },
          { icon: <Zap className="w-4 h-4" />, label: "Vibe", value: "Electric" },
        ].map((s, i) => (
          <div key={i} className="glass rounded-2xl p-3">
            <div className="flex items-center gap-1.5 mb-1" style={{ color: "oklch(0.72 0.22 340)" }}>
              {s.icon}
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <div className="font-semibold text-sm text-foreground">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Vibe tags */}
      <div className="mb-6">
        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Venue DNA</p>
        <div className="flex flex-wrap gap-2">
          {["Electric", "Euphoric", "Neon", "Cosmic", "Rave", "Futuristic"].map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 rounded-full text-xs font-medium glass"
              style={{ color: "oklch(0.85 0.18 340)" }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* CTA */}
      <Button
        className="w-full glow-pink font-bold py-5 rounded-2xl text-sm"
        style={{ background: "oklch(0.72 0.22 340)", color: "oklch(0.06 0.02 300)" }}
        onClick={onDesign}
      >
        Design for EDC
        <ArrowRight className="ml-2 w-4 h-4" />
      </Button>

      <p className="text-center text-xs text-muted-foreground mt-3">
        More venues coming soon — Coachella, Burning Man, Ultra
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FestivalMap() {
  const [, navigate] = useLocation();
  const [selected, setSelected] = useState(false);
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Living space background */}
      <div className="fixed inset-0 z-0">
        {/* Deep space image */}
        <img
          src={GALAXY_BG}
          alt="Space"
          className="w-full h-full object-cover animate-nebula-drift"
          style={{ opacity: 0.4 }}
        />
        {/* Dark overlay */}
        <div className="absolute inset-0" style={{ background: "oklch(0.06 0.02 300 / 0.65)" }} />
        {/* Animated star canvas on top */}
        <SpaceCanvas />
      </div>

      {/* ── Nav ── */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-5 glass-strong border-b border-border">
        <button
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full animate-pulse-glow" style={{ background: "oklch(0.72 0.22 340)" }} />
          <span className="font-display font-bold text-base text-foreground">HAUZZ.AI</span>
        </div>
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <span className="text-xs text-muted-foreground">{user?.name}</span>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="font-semibold text-xs text-muted-foreground hover:text-foreground"
              onClick={() => window.location.href = getLoginUrl()}
            >
              Sign In
            </Button>
          )}
          <Button
            size="sm"
            className="font-semibold text-xs"
            style={{ background: "oklch(0.72 0.22 340 / 0.15)", color: "oklch(0.85 0.18 340)", border: "1px solid oklch(0.72 0.22 340 / 0.3)" }}
            onClick={() => navigate("/design-studio")}
          >
            Design Studio
          </Button>
        </div>
      </nav>

      {/* ── Page title ── */}
      <div className="relative z-10 text-center pt-12 pb-6 px-4">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">Select Your Universe</p>
        <h1 className="font-display font-black text-4xl sm:text-6xl text-foreground">
          Festival{" "}
          <span className="text-gradient-pink">Map</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-3 max-w-md mx-auto">
          Each festival is a world. Click your planet to begin designing for it.
        </p>
      </div>

      {/* ── Main content: planet + info panel ── */}
      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-center gap-16 px-6 py-8 min-h-[60vh]">
        {/* Planet */}
        <div className="flex flex-col items-center justify-center" style={{ marginBottom: "60px" }}>
          <EDCPlanet onClick={() => setSelected(true)} isSelected={selected} />
        </div>

        {/* Info panel — shows when planet is selected */}
        {selected && (
          <VenuePanel onDesign={() => navigate("/design-studio")} />
        )}

        {/* Hint when not selected */}
        {!selected && (
          <div className="text-center animate-fade-in" style={{ animationDelay: "0.5s" }}>
            <div className="glass rounded-2xl px-6 py-4 inline-block">
              <p className="text-muted-foreground text-sm">
                <span className="text-foreground font-semibold">Click the planet</span> to explore EDC
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Coming soon planets (placeholder) ── */}
      <div className="relative z-10 px-6 pb-16">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-6">
            More Universes Loading...
          </p>
          <div className="flex justify-center gap-8 flex-wrap">
            {["Coachella", "Burning Man", "Ultra Miami", "Tomorrowland"].map((name, i) => (
              <div key={name} className="flex flex-col items-center gap-2 opacity-30">
                <div
                  className="w-16 h-16 rounded-full border-2 border-dashed flex items-center justify-center"
                  style={{ borderColor: "oklch(0.72 0.22 340 / 0.3)" }}
                >
                  <span className="text-xs text-muted-foreground">?</span>
                </div>
                <span className="text-xs text-muted-foreground">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
