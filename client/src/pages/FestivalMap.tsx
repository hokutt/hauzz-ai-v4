import { useRef, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowRight, MapPin, Calendar, Users, Zap, Lock, CheckCircle } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const GALAXY_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663522663012/FxMGuZEdHFz8kEGUUru2UP/galaxy-purple_7942970a.jpg";
const EDC_WIDE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663522663012/FxMGuZEdHFz8kEGUUru2UP/edc-wide_e16d4f27.webp";

// ── Festival data ─────────────────────────────────────────────────────────────
// Today: April 9, 2026. Cutoff = July 9, 2026 (3 months out).
// locked = true means under 3 months out → show waitlist card
// EDC Las Vegas shown as 2027 per product decision (too close)

interface Festival {
  id: string;
  name: string;
  subtitle: string;
  dates: string;
  location: string;
  attendees: string;
  vibe: string;
  vibeTags: string[];
  color: string; // oklch hue
  locked: boolean; // true = waitlist only
  comingSoon?: boolean; // true = date TBD (e.g. EDC 2027)
  image?: string;
}

const FESTIVALS: Festival[] = [
  // ── OPEN (3+ months out from Apr 9 2026) ──
  {
    id: "edc-lv-2027",
    name: "EDC Las Vegas 2027",
    subtitle: "Electric Daisy Carnival",
    dates: "Coming 2027 · Las Vegas Motor Speedway",
    location: "Las Vegas, NV",
    attendees: "150,000+",
    vibe: "Electric",
    vibeTags: ["Electric", "Euphoric", "Neon", "Cosmic", "Rave", "Futuristic"],
    color: "340",
    locked: false,
    comingSoon: true,
    image: EDC_WIDE,
  },
  {
    id: "lost-in-dreams-2026",
    name: "Lost In Dreams 2026",
    subtitle: "Insomniac Festival",
    dates: "July 11–12, 2026",
    location: "Los Angeles, CA",
    attendees: "30,000+",
    vibe: "Dreamy",
    vibeTags: ["Dreamy", "Ethereal", "Pastel", "Soft", "Surreal"],
    color: "280",
    locked: false,
  },
  {
    id: "hard-summer-2026",
    name: "HARD Summer 2026",
    subtitle: "HARD Events",
    dates: "August 1–2, 2026",
    location: "Los Angeles, CA",
    attendees: "65,000+",
    vibe: "Hard",
    vibeTags: ["Gritty", "Industrial", "Dark", "Bass", "Edgy"],
    color: "30",
    locked: false,
  },
  {
    id: "wasteland-2026",
    name: "Wasteland 2026",
    subtitle: "Insomniac Festival",
    dates: "September 4–5, 2026",
    location: "San Bernardino, CA",
    attendees: "20,000+",
    vibe: "Post-Apocalyptic",
    vibeTags: ["Dark", "Industrial", "Leather", "Cyber", "Dystopian"],
    color: "60",
    locked: false,
  },
  {
    id: "nocturnal-2026",
    name: "Nocturnal Wonderland 2026",
    subtitle: "Insomniac Festival",
    dates: "September 19–20, 2026",
    location: "San Bernardino, CA",
    attendees: "40,000+",
    vibe: "Nocturnal",
    vibeTags: ["Dark", "Mystical", "Glitter", "Night", "Enchanted"],
    color: "260",
    locked: false,
  },
  {
    id: "edc-korea-2026",
    name: "EDC Korea 2026",
    subtitle: "Electric Daisy Carnival",
    dates: "October 3–4, 2026",
    location: "Incheon, South Korea",
    attendees: "50,000+",
    vibe: "K-Rave",
    vibeTags: ["Futuristic", "Neon", "K-Pop", "Holographic", "Electric"],
    color: "200",
    locked: false,
  },
  {
    id: "edc-colombia-2026",
    name: "EDC Colombia 2026",
    subtitle: "Electric Daisy Carnival",
    dates: "October 10–11, 2026",
    location: "Medellín, Colombia",
    attendees: "40,000+",
    vibe: "Tropical Electric",
    vibeTags: ["Vibrant", "Tropical", "Electric", "Color", "Latin"],
    color: "150",
    locked: false,
  },
  {
    id: "iii-points-2026",
    name: "III Points 2026",
    subtitle: "Insomniac Festival",
    dates: "October 16–17, 2026",
    location: "Miami, FL",
    attendees: "25,000+",
    vibe: "Art-Forward",
    vibeTags: ["Art", "Minimal", "Techno", "Underground", "Creative"],
    color: "180",
    locked: false,
  },

  // ── LOCKED (under 3 months from Apr 9 2026) ──
  {
    id: "beyond-chicago-2026",
    name: "Beyond Wonderland Chicago",
    subtitle: "Insomniac Festival",
    dates: "June 6–7, 2026",
    location: "Chicago, IL",
    attendees: "30,000+",
    vibe: "Wonderland",
    vibeTags: ["Whimsical", "Colorful", "Fantasy", "Playful"],
    color: "320",
    locked: true,
  },
  {
    id: "electric-forest-2026",
    name: "Electric Forest 2026",
    subtitle: "Insomniac × Rothbury",
    dates: "June 25–28, 2026",
    location: "Rothbury, MI",
    attendees: "45,000+",
    vibe: "Forest Magic",
    vibeTags: ["Earthy", "Mystical", "Forest", "Fairy", "Organic"],
    color: "130",
    locked: true,
  },
  {
    id: "beyond-gorge-2026",
    name: "Beyond Wonderland at the Gorge",
    subtitle: "Insomniac Festival",
    dates: "June 27–28, 2026",
    location: "George, WA",
    attendees: "20,000+",
    vibe: "Gorge Wonderland",
    vibeTags: ["Nature", "Whimsical", "Scenic", "Fantasy"],
    color: "160",
    locked: true,
  },
];

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
      if (frame % 180 === 0) spawnShooter();

      stars.forEach((s) => {
        const opacity = s.opacity * (0.4 + 0.6 * Math.sin(frame * s.speed + s.offset));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `oklch(0.92 0.08 ${s.color} / ${opacity})`;
        ctx.fill();
      });

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

// ── Planet component ──────────────────────────────────────────────────────────
function Planet({
  festival,
  isSelected,
  onClick,
  size = 200,
}: {
  festival: Festival;
  isSelected: boolean;
  onClick: () => void;
  size?: number;
}) {
  const [hovered, setHovered] = useState(false);
  const h = festival.color;

  return (
    <div
      className="relative cursor-pointer flex flex-col items-center"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ width: size, marginBottom: 56 }}
    >
      {/* Lock badge */}
      {festival.locked && (
        <div
          className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold"
          style={{ background: "oklch(0.15 0.04 300 / 0.9)", color: "oklch(0.75 0.15 60)", border: "1px solid oklch(0.75 0.15 60 / 0.4)" }}
        >
          <Lock className="w-3 h-3" />
          Soon
        </div>
      )}

      {/* Outer glow */}
      <div
        className="absolute rounded-full transition-all duration-500"
        style={{
          width: size,
          height: size,
          background: isSelected
            ? `radial-gradient(circle, oklch(0.72 0.22 ${h} / 0.35) 0%, transparent 70%)`
            : `radial-gradient(circle, oklch(0.72 0.22 ${h} / 0.15) 0%, transparent 70%)`,
          transform: hovered ? "scale(1.18)" : "scale(1)",
          filter: "blur(18px)",
        }}
      />

      {/* Planet body */}
      <div
        className="rounded-full overflow-hidden transition-all duration-500 relative"
        style={{
          width: size - 24,
          height: size - 24,
          boxShadow: isSelected
            ? `0 0 40px 10px oklch(0.72 0.22 ${h} / 0.6), inset -20px -20px 40px oklch(0.06 0.02 300 / 0.5)`
            : hovered
            ? `0 0 28px 6px oklch(0.72 0.22 ${h} / 0.4), inset -20px -20px 40px oklch(0.06 0.02 300 / 0.5)`
            : `0 0 16px 3px oklch(0.72 0.22 ${h} / 0.2), inset -20px -20px 40px oklch(0.06 0.02 300 / 0.5)`,
          transform: hovered ? "scale(1.06)" : "scale(1)",
          filter: festival.locked ? "grayscale(0.4) brightness(0.7)" : "none",
        }}
      >
        {festival.image ? (
          <img
            src={festival.image}
            alt={festival.name}
            className="w-full h-full object-cover"
            style={{ opacity: 0.85 }}
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: `radial-gradient(ellipse at 35% 35%, oklch(0.72 0.22 ${h} / 0.8) 0%, oklch(0.35 0.18 ${h} / 0.9) 50%, oklch(0.12 0.06 300) 100%)`,
            }}
          />
        )}
        {/* Atmosphere */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 30% 30%, oklch(0.72 0.22 ${h} / 0.3) 0%, transparent 60%)`,
          }}
        />
        {/* Night side */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at 75% 65%, oklch(0.06 0.02 300 / 0.65) 0%, transparent 55%)",
          }}
        />
        {/* Lock overlay */}
        {festival.locked && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "oklch(0.06 0.02 300 / 0.4)" }}>
            <Lock className="w-8 h-8" style={{ color: "oklch(0.75 0.15 60 / 0.8)" }} />
          </div>
        )}
      </div>

      {/* Label */}
      <div className="absolute text-center transition-all duration-300" style={{ bottom: -48, left: "50%", transform: "translateX(-50%)", width: size + 40, opacity: hovered || isSelected ? 1 : 0.65 }}>
        <div className="font-display font-bold text-sm text-foreground whitespace-nowrap truncate">{festival.name}</div>
        <div className="text-xs text-muted-foreground">{festival.dates.split("·")[0].trim()}</div>
      </div>

      {/* Orbiting moon */}
      <div
        className="absolute w-4 h-4 rounded-full pointer-events-none"
        style={{
          top: "50%",
          left: "50%",
          marginTop: -8,
          marginLeft: -8,
          animation: "orbit 8s linear infinite",
          "--orbit-r": `${(size - 24) / 2 + 20}px`,
          background: `oklch(0.78 0.20 ${h})`,
          boxShadow: `0 0 8px oklch(0.78 0.20 ${h} / 0.8)`,
        } as React.CSSProperties}
      />
    </div>
  );
}

// ── Venue info panel ──────────────────────────────────────────────────────────
function VenuePanel({ festival, onDesign }: { festival: Festival; onDesign: () => void }) {
  const h = festival.color;

  return (
    <div className="glass-strong rounded-3xl p-8 max-w-sm w-full animate-slide-in-right">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: `oklch(0.72 0.22 ${h} / 0.2)` }}
        >
          <MapPin className="w-5 h-5" style={{ color: `oklch(0.85 0.18 ${h})` }} />
        </div>
        <div>
          <h3 className="font-display font-bold text-xl text-foreground">{festival.name}</h3>
          <p className="text-xs text-muted-foreground">{festival.subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { icon: <Calendar className="w-4 h-4" />, label: "Date", value: festival.dates.split("·")[0].trim() },
          { icon: <Users className="w-4 h-4" />, label: "Attendees", value: festival.attendees },
          { icon: <MapPin className="w-4 h-4" />, label: "Location", value: festival.location },
          { icon: <Zap className="w-4 h-4" />, label: "Vibe", value: festival.vibe },
        ].map((s, i) => (
          <div key={i} className="glass rounded-2xl p-3">
            <div className="flex items-center gap-1.5 mb-1" style={{ color: `oklch(0.72 0.22 ${h})` }}>
              {s.icon}
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <div className="font-semibold text-sm text-foreground">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Venue DNA</p>
        <div className="flex flex-wrap gap-2">
          {festival.vibeTags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 rounded-full text-xs font-medium glass"
              style={{ color: `oklch(0.85 0.18 ${h})` }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <Button
        className="w-full font-bold py-5 rounded-2xl text-sm"
        style={{ background: `oklch(0.72 0.22 ${h})`, color: "oklch(0.06 0.02 300)" }}
        onClick={onDesign}
      >
        {festival.comingSoon ? "Design for EDC 2027" : `Design for ${festival.name.split(" ")[0]} ${festival.name.split(" ")[1] ?? ""}`}
        <ArrowRight className="ml-2 w-4 h-4" />
      </Button>
    </div>
  );
}

// ── Waitlist panel ────────────────────────────────────────────────────────────
function WaitlistPanel({ festival }: { festival: Festival }) {
  const h = festival.color;
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);

  const joinWaitlist = trpc.design.joinWaitlist.useMutation({
    onSuccess: () => {
      setJoined(true);
      toast.success("You're on the list! We'll reach out before tickets drop.");
    },
    onError: () => {
      toast.error("Something went wrong. Try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    joinWaitlist.mutate({ email: email.trim(), festivalId: festival.id, festivalName: festival.name });
  };

  return (
    <div className="glass-strong rounded-3xl p-8 max-w-sm w-full animate-slide-in-right">
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: `oklch(0.72 0.22 ${h} / 0.15)` }}
        >
          <Lock className="w-5 h-5" style={{ color: `oklch(0.85 0.18 ${h})` }} />
        </div>
        <div>
          <h3 className="font-display font-bold text-xl text-foreground">{festival.name}</h3>
          <p className="text-xs text-muted-foreground">{festival.dates}</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        This festival is coming up soon. Join the waitlist and we'll notify you when HAUZZ designs open for this universe — before the general public.
      </p>

      {joined ? (
        <div className="flex items-center gap-3 glass rounded-2xl p-4">
          <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: `oklch(0.72 0.22 ${h})` }} />
          <div>
            <p className="font-semibold text-sm text-foreground">You're on the list</p>
            <p className="text-xs text-muted-foreground">We'll reach out before designs open for {festival.name.split(" ")[0]}.</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="glass border-border rounded-2xl"
            required
          />
          <Button
            type="submit"
            className="w-full font-bold py-5 rounded-2xl text-sm"
            style={{ background: `oklch(0.72 0.22 ${h})`, color: "oklch(0.06 0.02 300)" }}
            disabled={joinWaitlist.isPending}
          >
            {joinWaitlist.isPending ? "Joining..." : "Join the Waitlist"}
          </Button>
        </form>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {festival.vibeTags.slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="px-3 py-1 rounded-full text-xs font-medium glass opacity-60"
            style={{ color: `oklch(0.85 0.18 ${h})` }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FestivalMap() {
  const [, navigate] = useLocation();
  const [selectedId, setSelectedId] = useState<string | null>("edc-lv-2027");
  const { user, isAuthenticated } = useAuth();

  const selected = FESTIVALS.find((f) => f.id === selectedId) ?? null;

  const openFestivals = FESTIVALS.filter((f) => !f.locked);
  const lockedFestivals = FESTIVALS.filter((f) => f.locked);

  const handlePlanetClick = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  const handleDesign = () => {
    navigate(`/design-studio?festival=${selectedId}`);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <img src={GALAXY_BG} alt="Space" className="w-full h-full object-cover animate-nebula-drift" style={{ opacity: 0.4 }} />
        <div className="absolute inset-0" style={{ background: "oklch(0.06 0.02 300 / 0.65)" }} />
        <SpaceCanvas />
      </div>

      {/* Nav */}
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
              onClick={() => (window.location.href = getLoginUrl())}
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

      {/* Title */}
      <div className="relative z-10 text-center pt-12 pb-4 px-4">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">Select Your Universe</p>
        <h1 className="font-display font-black text-4xl sm:text-6xl text-foreground">
          Festival <span className="text-gradient-pink">Map</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-3 max-w-md mx-auto">
          Each festival is a world. Click your planet to begin designing for it.
        </p>
      </div>

      {/* ── Open festivals grid + side panel ── */}
      <div className="relative z-10 px-6 pt-8 pb-4">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-12 items-start justify-center">
          {/* Planet grid */}
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-8 text-center">Open Universes</p>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-16">
              {openFestivals.map((festival) => (
                <Planet
                  key={festival.id}
                  festival={festival}
                  isSelected={selectedId === festival.id}
                  onClick={() => handlePlanetClick(festival.id)}
                  size={festival.id === "edc-lv-2027" ? 220 : 160}
                />
              ))}
            </div>
          </div>

          {/* Side panel */}
          <div className="lg:sticky lg:top-24 w-full lg:w-auto">
            {selected && !selected.locked && (
              <VenuePanel festival={selected} onDesign={handleDesign} />
            )}
            {!selected && (
              <div className="glass rounded-2xl px-6 py-4 inline-block animate-fade-in max-w-sm">
                <p className="text-muted-foreground text-sm">
                  <span className="text-foreground font-semibold">Click a planet</span> to explore its universe and start designing.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Locked festivals ── */}
      <div className="relative z-10 px-6 pb-16 mt-8">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-12 items-start justify-center">
          {/* Locked planet grid */}
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-8 text-center">Coming Soon — Join the Waitlist</p>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-16">
              {lockedFestivals.map((festival) => (
                <Planet
                  key={festival.id}
                  festival={festival}
                  isSelected={selectedId === festival.id}
                  onClick={() => handlePlanetClick(festival.id)}
                  size={140}
                />
              ))}
            </div>
          </div>

          {/* Waitlist panel */}
          <div className="lg:sticky lg:top-24 w-full lg:w-auto">
            {selected && selected.locked && (
              <WaitlistPanel festival={selected} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
