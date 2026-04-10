import { useRef, useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Calendar,
  Users,
  Zap,
  Lock,
  CheckCircle,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const GALAXY_BG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663522663012/FxMGuZEdHFz8kEGUUru2UP/galaxy-purple_7942970a.jpg";
const EDC_WIDE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663522663012/FxMGuZEdHFz8kEGUUru2UP/edc-wide_e16d4f27.webp";

// ── Festival data ─────────────────────────────────────────────────────────────
interface Festival {
  id: string;
  name: string;
  subtitle: string;
  dates: string;
  location: string;
  attendees: string;
  vibe: string;
  vibeTags: string[];
  color: string;
  locked: boolean;
  comingSoon?: boolean;
  image?: string;
  // Planet theming
  theme: PlanetTheme;
}

interface PlanetTheme {
  // Primary surface gradient stops (oklch)
  surface: string[];
  // Optional ring color
  ring?: string;
  ringOpacity?: number;
  // Atmosphere hue
  atmosphereHue: string;
  // Surface detail type
  detail: "electric" | "dreamy" | "industrial" | "wasteland" | "nocturnal" | "krave" | "tropical" | "artdeco" | "wonderland" | "forest" | "gorge";
  // Emoji icon shown in label
  icon: string;
  // Accent color for glow/tags
  accent: string;
}

const FESTIVALS: Festival[] = [
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
    theme: {
      surface: [
        "oklch(0.72 0.22 340)",
        "oklch(0.45 0.22 320)",
        "oklch(0.18 0.10 300)",
      ],
      ring: "oklch(0.85 0.20 340)",
      ringOpacity: 0.7,
      atmosphereHue: "340",
      detail: "electric",
      icon: "⚡",
      accent: "oklch(0.85 0.20 340)",
    },
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
    theme: {
      surface: [
        "oklch(0.82 0.14 280)",
        "oklch(0.65 0.18 300)",
        "oklch(0.35 0.12 260)",
      ],
      ring: "oklch(0.78 0.16 290)",
      ringOpacity: 0.5,
      atmosphereHue: "280",
      detail: "dreamy",
      icon: "✨",
      accent: "oklch(0.82 0.16 280)",
    },
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
    theme: {
      surface: [
        "oklch(0.55 0.18 30)",
        "oklch(0.28 0.10 20)",
        "oklch(0.10 0.04 300)",
      ],
      atmosphereHue: "30",
      detail: "industrial",
      icon: "🔥",
      accent: "oklch(0.75 0.20 30)",
    },
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
    theme: {
      surface: [
        "oklch(0.50 0.14 60)",
        "oklch(0.30 0.10 45)",
        "oklch(0.12 0.04 300)",
      ],
      atmosphereHue: "55",
      detail: "wasteland",
      icon: "☢️",
      accent: "oklch(0.70 0.18 60)",
    },
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
    theme: {
      surface: [
        "oklch(0.38 0.20 260)",
        "oklch(0.20 0.14 280)",
        "oklch(0.08 0.04 300)",
      ],
      ring: "oklch(0.70 0.18 260)",
      ringOpacity: 0.45,
      atmosphereHue: "260",
      detail: "nocturnal",
      icon: "🌙",
      accent: "oklch(0.75 0.18 260)",
    },
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
    theme: {
      surface: [
        "oklch(0.72 0.20 200)",
        "oklch(0.45 0.18 220)",
        "oklch(0.15 0.06 300)",
      ],
      ring: "oklch(0.80 0.18 200)",
      ringOpacity: 0.55,
      atmosphereHue: "200",
      detail: "krave",
      icon: "🌐",
      accent: "oklch(0.80 0.20 200)",
    },
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
    theme: {
      surface: [
        "oklch(0.70 0.22 150)",
        "oklch(0.50 0.18 130)",
        "oklch(0.18 0.08 300)",
      ],
      ring: "oklch(0.75 0.20 150)",
      ringOpacity: 0.4,
      atmosphereHue: "150",
      detail: "tropical",
      icon: "🌴",
      accent: "oklch(0.78 0.22 150)",
    },
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
    theme: {
      surface: [
        "oklch(0.60 0.18 180)",
        "oklch(0.35 0.12 190)",
        "oklch(0.12 0.05 300)",
      ],
      ring: "oklch(0.68 0.16 180)",
      ringOpacity: 0.35,
      atmosphereHue: "180",
      detail: "artdeco",
      icon: "🎨",
      accent: "oklch(0.72 0.18 180)",
    },
  },
  // ── LOCKED ──
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
    theme: {
      surface: [
        "oklch(0.72 0.22 320)",
        "oklch(0.55 0.18 300)",
        "oklch(0.20 0.08 300)",
      ],
      atmosphereHue: "320",
      detail: "wonderland",
      icon: "🐇",
      accent: "oklch(0.78 0.20 320)",
    },
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
    theme: {
      surface: [
        "oklch(0.55 0.20 130)",
        "oklch(0.35 0.16 140)",
        "oklch(0.12 0.06 300)",
      ],
      atmosphereHue: "130",
      detail: "forest",
      icon: "🌲",
      accent: "oklch(0.68 0.20 130)",
    },
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
    theme: {
      surface: [
        "oklch(0.58 0.18 160)",
        "oklch(0.38 0.14 145)",
        "oklch(0.14 0.06 300)",
      ],
      atmosphereHue: "160",
      detail: "gorge",
      icon: "🏔️",
      accent: "oklch(0.68 0.18 160)",
    },
  },
];

// ── Space canvas ──────────────────────────────────────────────────────────────
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

    const stars = Array.from({ length: 400 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.6 + 0.2,
      opacity: Math.random() * 0.9 + 0.1,
      speed: Math.random() * 0.006 + 0.002,
      offset: Math.random() * Math.PI * 2,
      hue: ["340", "280", "200", "60"][Math.floor(Math.random() * 4)],
    }));

    const shooters: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number }[] = [];
    let frame = 0;
    let animId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;
      if (frame % 200 === 0) {
        shooters.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height * 0.4,
          vx: (Math.random() * 4 + 2) * (Math.random() > 0.5 ? 1 : -1),
          vy: Math.random() * 2 + 1,
          life: 0,
          maxLife: Math.random() * 50 + 30,
        });
      }

      stars.forEach((s) => {
        const opacity = s.opacity * (0.4 + 0.6 * Math.sin(frame * s.speed + s.offset));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `oklch(0.95 0.06 ${s.hue} / ${opacity})`;
        ctx.fill();
      });

      for (let i = shooters.length - 1; i >= 0; i--) {
        const s = shooters[i];
        const progress = s.life / s.maxLife;
        const opacity = Math.sin(progress * Math.PI);
        const len = 70 * (1 - progress * 0.4);
        const grad = ctx.createLinearGradient(s.x - s.vx * len, s.y - s.vy * len, s.x, s.y);
        grad.addColorStop(0, `oklch(0.95 0.15 340 / 0)`);
        grad.addColorStop(1, `oklch(0.95 0.15 340 / ${opacity * 0.85})`);
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

// ── Planet surface SVG details ────────────────────────────────────────────────
function PlanetSurface({ detail, size, hue }: { detail: Festival["theme"]["detail"]; size: number; hue: string }) {
  const r = size / 2;
  const cx = r;
  const cy = r;

  switch (detail) {
    case "electric":
      return (
        <svg width={size} height={size} className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: "screen" }}>
          {/* Lightning band 1 */}
          <ellipse cx={cx} cy={cy * 0.55} rx={r * 0.85} ry={r * 0.08} fill={`oklch(0.90 0.22 ${hue} / 0.35)`} />
          <ellipse cx={cx} cy={cy * 0.75} rx={r * 0.70} ry={r * 0.05} fill={`oklch(0.85 0.20 ${hue} / 0.25)`} />
          <ellipse cx={cx} cy={cy * 1.3} rx={r * 0.60} ry={r * 0.04} fill={`oklch(0.85 0.20 ${hue} / 0.20)`} />
          {/* Neon spark dots */}
          {[...Array(8)].map((_, i) => (
            <circle
              key={i}
              cx={cx + Math.cos((i / 8) * Math.PI * 2) * r * 0.55}
              cy={cy + Math.sin((i / 8) * Math.PI * 2) * r * 0.55}
              r={2.5}
              fill={`oklch(0.95 0.18 ${hue} / 0.7)`}
            />
          ))}
        </svg>
      );
    case "dreamy":
      return (
        <svg width={size} height={size} className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: "screen" }}>
          {/* Soft cloud bands */}
          <ellipse cx={cx * 0.9} cy={cy * 0.6} rx={r * 0.55} ry={r * 0.14} fill={`oklch(0.92 0.10 ${hue} / 0.30)`} />
          <ellipse cx={cx * 1.1} cy={cy * 0.9} rx={r * 0.45} ry={r * 0.10} fill={`oklch(0.88 0.12 ${hue} / 0.25)`} />
          <ellipse cx={cx * 0.85} cy={cy * 1.25} rx={r * 0.50} ry={r * 0.09} fill={`oklch(0.85 0.14 ${hue} / 0.20)`} />
          {/* Pastel sparkle dots */}
          {[...Array(6)].map((_, i) => (
            <circle
              key={i}
              cx={cx + Math.cos((i / 6) * Math.PI * 2 + 0.5) * r * 0.45}
              cy={cy + Math.sin((i / 6) * Math.PI * 2 + 0.5) * r * 0.45}
              r={3}
              fill={`oklch(0.95 0.08 ${hue} / 0.6)`}
            />
          ))}
        </svg>
      );
    case "industrial":
      return (
        <svg width={size} height={size} className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: "overlay" }}>
          {/* Crater rings */}
          <circle cx={cx * 0.65} cy={cy * 0.7} r={r * 0.18} fill="none" stroke={`oklch(0.70 0.18 ${hue} / 0.4)`} strokeWidth="2" />
          <circle cx={cx * 1.3} cy={cy * 1.2} r={r * 0.12} fill="none" stroke={`oklch(0.65 0.16 ${hue} / 0.35)`} strokeWidth="1.5" />
          <circle cx={cx * 0.9} cy={cy * 1.4} r={r * 0.08} fill="none" stroke={`oklch(0.60 0.14 ${hue} / 0.3)`} strokeWidth="1" />
          {/* Grid lines */}
          <line x1={cx - r * 0.7} y1={cy * 0.85} x2={cx + r * 0.7} y2={cy * 0.85} stroke={`oklch(0.70 0.16 ${hue} / 0.2)`} strokeWidth="1" />
          <line x1={cx - r * 0.5} y1={cy * 1.15} x2={cx + r * 0.5} y2={cy * 1.15} stroke={`oklch(0.70 0.16 ${hue} / 0.15)`} strokeWidth="1" />
        </svg>
      );
    case "wasteland":
      return (
        <svg width={size} height={size} className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: "overlay" }}>
          {/* Cracked terrain lines */}
          <path d={`M ${cx * 0.5} ${cy * 0.7} L ${cx * 0.8} ${cy * 1.0} L ${cx * 0.6} ${cy * 1.3}`} fill="none" stroke={`oklch(0.65 0.16 ${hue} / 0.45)`} strokeWidth="1.5" />
          <path d={`M ${cx * 1.2} ${cy * 0.8} L ${cx * 1.4} ${cy * 1.1} L ${cx * 1.1} ${cy * 1.4}`} fill="none" stroke={`oklch(0.60 0.14 ${hue} / 0.35)`} strokeWidth="1" />
          {/* Radiation circles */}
          <circle cx={cx} cy={cy} r={r * 0.25} fill="none" stroke={`oklch(0.72 0.18 ${hue} / 0.20)`} strokeWidth="1" strokeDasharray="4 4" />
          <circle cx={cx} cy={cy} r={r * 0.45} fill="none" stroke={`oklch(0.68 0.16 ${hue} / 0.12)`} strokeWidth="1" strokeDasharray="6 6" />
        </svg>
      );
    case "nocturnal":
      return (
        <svg width={size} height={size} className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: "screen" }}>
          {/* Star cluster dots */}
          {[...Array(12)].map((_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            const dist = r * (0.25 + Math.random() * 0.35);
            return (
              <circle
                key={i}
                cx={cx + Math.cos(angle) * dist}
                cy={cy + Math.sin(angle) * dist}
                r={1.5 + Math.random() * 2}
                fill={`oklch(0.95 0.08 ${hue} / ${0.4 + Math.random() * 0.4})`}
              />
            );
          })}
          {/* Crescent highlight */}
          <ellipse cx={cx * 0.72} cy={cy * 0.72} rx={r * 0.22} ry={r * 0.10} fill={`oklch(0.85 0.14 ${hue} / 0.25)`} transform={`rotate(-35, ${cx}, ${cy})`} />
        </svg>
      );
    case "krave":
      return (
        <svg width={size} height={size} className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: "screen" }}>
          {/* Holographic bands */}
          <ellipse cx={cx} cy={cy * 0.5} rx={r * 0.75} ry={r * 0.06} fill={`oklch(0.88 0.18 ${hue} / 0.30)`} />
          <ellipse cx={cx} cy={cy * 0.8} rx={r * 0.65} ry={r * 0.05} fill={`oklch(0.85 0.16 200 / 0.25)`} />
          <ellipse cx={cx} cy={cy * 1.2} rx={r * 0.55} ry={r * 0.04} fill={`oklch(0.82 0.14 220 / 0.20)`} />
          <ellipse cx={cx} cy={cy * 1.5} rx={r * 0.45} ry={r * 0.04} fill={`oklch(0.80 0.12 ${hue} / 0.18)`} />
          {/* Grid dots */}
          {[...Array(5)].map((_, i) => (
            <circle key={i} cx={cx + (i - 2) * r * 0.22} cy={cy} r={2} fill={`oklch(0.95 0.10 ${hue} / 0.5)`} />
          ))}
        </svg>
      );
    case "tropical":
      return (
        <svg width={size} height={size} className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: "screen" }}>
          {/* Swirl bands */}
          <ellipse cx={cx * 0.85} cy={cy * 0.65} rx={r * 0.50} ry={r * 0.12} fill={`oklch(0.82 0.20 ${hue} / 0.30)`} transform={`rotate(15, ${cx}, ${cy})`} />
          <ellipse cx={cx * 1.1} cy={cy * 1.0} rx={r * 0.45} ry={r * 0.09} fill={`oklch(0.78 0.18 150 / 0.25)`} transform={`rotate(-10, ${cx}, ${cy})`} />
          <ellipse cx={cx * 0.9} cy={cy * 1.35} rx={r * 0.40} ry={r * 0.08} fill={`oklch(0.75 0.16 ${hue} / 0.20)`} />
          {/* Bright dots */}
          {[...Array(5)].map((_, i) => (
            <circle key={i} cx={cx + Math.cos((i / 5) * Math.PI * 2) * r * 0.38} cy={cy + Math.sin((i / 5) * Math.PI * 2) * r * 0.38} r={3} fill={`oklch(0.92 0.18 ${hue} / 0.55)`} />
          ))}
        </svg>
      );
    case "artdeco":
      return (
        <svg width={size} height={size} className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: "screen" }}>
          {/* Concentric rings */}
          <circle cx={cx} cy={cy} r={r * 0.30} fill="none" stroke={`oklch(0.75 0.16 ${hue} / 0.35)`} strokeWidth="1" />
          <circle cx={cx} cy={cy} r={r * 0.50} fill="none" stroke={`oklch(0.70 0.14 ${hue} / 0.25)`} strokeWidth="1" />
          <circle cx={cx} cy={cy} r={r * 0.70} fill="none" stroke={`oklch(0.65 0.12 ${hue} / 0.18)`} strokeWidth="1" />
          {/* Cross lines */}
          <line x1={cx - r * 0.72} y1={cy} x2={cx + r * 0.72} y2={cy} stroke={`oklch(0.72 0.14 ${hue} / 0.20)`} strokeWidth="0.8" />
          <line x1={cx} y1={cy - r * 0.72} x2={cx} y2={cy + r * 0.72} stroke={`oklch(0.72 0.14 ${hue} / 0.20)`} strokeWidth="0.8" />
        </svg>
      );
    case "wonderland":
      return (
        <svg width={size} height={size} className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: "screen" }}>
          {/* Candy swirl bands */}
          <ellipse cx={cx * 0.8} cy={cy * 0.6} rx={r * 0.48} ry={r * 0.10} fill={`oklch(0.88 0.18 ${hue} / 0.30)`} transform={`rotate(20, ${cx}, ${cy})`} />
          <ellipse cx={cx * 1.15} cy={cy * 0.95} rx={r * 0.42} ry={r * 0.08} fill={`oklch(0.82 0.20 300 / 0.25)`} transform={`rotate(-15, ${cx}, ${cy})`} />
          <ellipse cx={cx * 0.9} cy={cy * 1.3} rx={r * 0.38} ry={r * 0.07} fill={`oklch(0.85 0.16 ${hue} / 0.20)`} />
          {/* Sparkle dots */}
          {[...Array(7)].map((_, i) => (
            <circle key={i} cx={cx + Math.cos((i / 7) * Math.PI * 2) * r * 0.42} cy={cy + Math.sin((i / 7) * Math.PI * 2) * r * 0.42} r={2.5} fill={`oklch(0.95 0.12 ${hue} / 0.55)`} />
          ))}
        </svg>
      );
    case "forest":
      return (
        <svg width={size} height={size} className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: "overlay" }}>
          {/* Organic terrain bands */}
          <ellipse cx={cx * 0.9} cy={cy * 0.7} rx={r * 0.55} ry={r * 0.12} fill={`oklch(0.60 0.20 ${hue} / 0.35)`} transform={`rotate(8, ${cx}, ${cy})`} />
          <ellipse cx={cx * 1.05} cy={cy * 1.05} rx={r * 0.50} ry={r * 0.10} fill={`oklch(0.55 0.18 140 / 0.28)`} />
          <ellipse cx={cx * 0.85} cy={cy * 1.35} rx={r * 0.45} ry={r * 0.09} fill={`oklch(0.50 0.16 ${hue} / 0.22)`} />
          {/* Organic dots */}
          {[...Array(6)].map((_, i) => (
            <circle key={i} cx={cx + Math.cos((i / 6) * Math.PI * 2 + 1) * r * 0.35} cy={cy + Math.sin((i / 6) * Math.PI * 2 + 1) * r * 0.35} r={3.5} fill={`oklch(0.72 0.20 ${hue} / 0.45)`} />
          ))}
        </svg>
      );
    case "gorge":
      return (
        <svg width={size} height={size} className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: "overlay" }}>
          {/* Layered terrain */}
          <path d={`M ${cx * 0.3} ${cy * 1.1} Q ${cx * 0.8} ${cy * 0.6} ${cx * 1.3} ${cy * 0.9} Q ${cx * 1.6} ${cy * 1.1} ${cx * 1.7} ${cy * 1.4}`} fill="none" stroke={`oklch(0.65 0.16 ${hue} / 0.40)`} strokeWidth="2" />
          <path d={`M ${cx * 0.2} ${cy * 1.3} Q ${cx * 0.7} ${cy * 0.9} ${cx * 1.2} ${cy * 1.1} Q ${cx * 1.5} ${cy * 1.25} ${cx * 1.8} ${cy * 1.5}`} fill="none" stroke={`oklch(0.58 0.14 ${hue} / 0.30)`} strokeWidth="1.5" />
          {/* Summit dots */}
          <circle cx={cx * 0.8} cy={cy * 0.62} r={4} fill={`oklch(0.80 0.16 ${hue} / 0.50)`} />
          <circle cx={cx * 1.3} cy={cy * 0.88} r={3} fill={`oklch(0.75 0.14 ${hue} / 0.40)`} />
        </svg>
      );
    default:
      return null;
  }
}

// ── Planet component ──────────────────────────────────────────────────────────
function Planet({
  festival,
  isSelected,
  onClick,
  size = 160,
}: {
  festival: Festival;
  isSelected: boolean;
  onClick: () => void;
  size?: number;
}) {
  const [hovered, setHovered] = useState(false);
  const { theme } = festival;
  const h = festival.color;
  const bodySize = size - 20;
  const isActive = isSelected || hovered;

  return (
    <div
      className="relative cursor-pointer flex flex-col items-center select-none"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: size + 60,
        marginBottom: 64,
        animation: `planet-float ${8 + (festival.id.length % 4)}s ease-in-out infinite`,
        animationDelay: `${(festival.id.charCodeAt(0) % 5) * 0.8}s`,
      }}
    >
      {/* Outer ambient glow */}
      <div
        className="absolute rounded-full pointer-events-none transition-all duration-700"
        style={{
          width: size + 40,
          height: size + 40,
          top: -20,
          left: 10,
          background: isActive
            ? `radial-gradient(circle, ${theme.accent} 0%, transparent 65%)`
            : `radial-gradient(circle, oklch(0.72 0.22 ${h} / 0.08) 0%, transparent 65%)`,
          filter: "blur(24px)",
          opacity: isActive ? 0.55 : 0.25,
          transition: "opacity 0.6s ease, background 0.6s ease",
        }}
      />

      {/* Planet ring (if defined) */}
      {theme.ring && (
        <div
          className="absolute pointer-events-none transition-all duration-500"
          style={{
            width: size + 28,
            height: (size + 28) * 0.28,
            top: bodySize * 0.36,
            left: -4,
            borderRadius: "50%",
            border: `2px solid ${theme.ring}`,
            opacity: isActive ? (theme.ringOpacity ?? 0.5) * 1.4 : (theme.ringOpacity ?? 0.5),
            transform: `rotateX(72deg) ${isActive ? "scale(1.05)" : "scale(1)"}`,
            boxShadow: isActive ? `0 0 12px ${theme.ring}` : "none",
            transition: "opacity 0.5s ease, box-shadow 0.5s ease",
          }}
        />
      )}

      {/* Planet body */}
      <div
        className="relative rounded-full overflow-hidden transition-all duration-500"
        style={{
          width: bodySize,
          height: bodySize,
          flexShrink: 0,
          boxShadow: isSelected
            ? `0 0 50px 14px oklch(0.72 0.22 ${h} / 0.65), inset -${bodySize * 0.15}px -${bodySize * 0.15}px ${bodySize * 0.3}px oklch(0.06 0.02 300 / 0.6)`
            : hovered
            ? `0 0 32px 8px oklch(0.72 0.22 ${h} / 0.45), inset -${bodySize * 0.15}px -${bodySize * 0.15}px ${bodySize * 0.3}px oklch(0.06 0.02 300 / 0.5)`
            : `0 0 18px 4px oklch(0.72 0.22 ${h} / 0.18), inset -${bodySize * 0.15}px -${bodySize * 0.15}px ${bodySize * 0.3}px oklch(0.06 0.02 300 / 0.5)`,
          transform: isSelected ? "scale(1.06)" : hovered ? "scale(1.03)" : "scale(1)",
          filter: festival.locked ? "saturate(0.5) brightness(0.55)" : "none",
        }}
      >
        {/* Base surface */}
        {festival.image && !festival.locked ? (
          <img
            src={festival.image}
            alt={festival.name}
            className="w-full h-full object-cover"
            style={{ opacity: 0.80 }}
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: `radial-gradient(ellipse at 32% 32%, ${theme.surface[0]} 0%, ${theme.surface[1]} 50%, ${theme.surface[2]} 100%)`,
            }}
          />
        )}

        {/* Themed surface detail */}
        <PlanetSurface detail={theme.detail} size={bodySize} hue={h} />

        {/* Atmosphere highlight */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 28% 28%, oklch(0.90 0.15 ${h} / 0.28) 0%, transparent 55%)`,
          }}
        />
        {/* Night side shadow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 72% 68%, oklch(0.04 0.02 300 / 0.70) 0%, transparent 52%)",
          }}
        />

        {/* Lock overlay */}
        {festival.locked && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-1"
            style={{ background: "oklch(0.06 0.02 300 / 0.55)" }}
          >
            <Lock className="w-5 h-5" style={{ color: "oklch(0.75 0.15 60 / 0.9)" }} />
          </div>
        )}

        {/* Selected pulse ring */}
        {isSelected && (
          <div
            className="absolute inset-0 rounded-full pointer-events-none animate-pulse-glow"
            style={{ border: `2px solid oklch(0.85 0.18 ${h} / 0.6)` }}
          />
        )}
      </div>

      {/* Orbiting moon */}
      {!festival.locked && (
        <div
          className="absolute pointer-events-none"
          style={{
            width: bodySize,
            height: bodySize,
            top: 10,
            left: 10,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: Math.max(8, bodySize * 0.09),
              height: Math.max(8, bodySize * 0.09),
              marginTop: -Math.max(4, bodySize * 0.045),
              marginLeft: -Math.max(4, bodySize * 0.045),
              borderRadius: "50%",
              background: theme.accent,
              boxShadow: `0 0 10px ${theme.accent}`,
              animation: `orbit ${7 + (festival.id.length % 5)}s linear infinite`,
              "--orbit-r": `${bodySize / 2 + 18}px`,
            } as React.CSSProperties}
          />
        </div>
      )}

      {/* Label */}
      <div
        className="absolute text-center transition-all duration-300 pointer-events-none"
        style={{
          bottom: -52,
          left: "50%",
          transform: "translateX(-50%)",
          width: size + 60,
          opacity: isActive ? 1 : festival.locked ? 0.5 : 0.75,
        }}
      >
        <div className="flex items-center justify-center gap-1.5 mb-0.5">
          <span className="text-base leading-none">{theme.icon}</span>
          <span
            className="font-display font-bold text-sm text-foreground"
            style={{
              color: isActive ? theme.accent : undefined,
              display: "block",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: size + 50,
            }}
          >
            {festival.name.replace(/\s*\d{4}$/, "").trim()}
          </span>
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {festival.locked ? "Waitlist" : festival.dates.split("·")[0].trim()}
        </div>
      </div>
    </div>
  );
}

// ── Venue info panel ──────────────────────────────────────────────────────────
function VenuePanel({ festival, onDesign }: { festival: Festival; onDesign: () => void }) {
  const h = festival.color;
  const { theme } = festival;

  return (
    <div className="glass-strong rounded-3xl p-7 w-full max-w-xs animate-slide-in-right">
      {/* Header */}
      <div className="flex items-start gap-3 mb-5">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: `oklch(0.72 0.22 ${h} / 0.18)` }}
        >
          {theme.icon}
        </div>
        <div className="min-w-0">
          <h3 className="font-display font-bold text-lg text-foreground leading-tight">{festival.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{festival.subtitle}</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        {[
          { icon: <Calendar className="w-3.5 h-3.5" />, label: "Date", value: festival.dates.split("·")[0].trim() },
          { icon: <Users className="w-3.5 h-3.5" />, label: "Attendees", value: festival.attendees },
          { icon: <MapPin className="w-3.5 h-3.5" />, label: "Location", value: festival.location },
          { icon: <Zap className="w-3.5 h-3.5" />, label: "Vibe", value: festival.vibe },
        ].map((s, i) => (
          <div key={i} className="glass rounded-xl p-2.5">
            <div className="flex items-center gap-1 mb-1" style={{ color: theme.accent }}>
              {s.icon}
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <div className="font-semibold text-xs text-foreground leading-snug">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Venue DNA tags */}
      <div className="mb-5">
        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Venue DNA</p>
        <div className="flex flex-wrap gap-1.5">
          {festival.vibeTags.map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-1 rounded-full text-xs font-medium glass"
              style={{ color: theme.accent }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* CTA */}
      <Button
        className="w-full font-bold py-5 rounded-2xl text-sm"
        style={{ background: theme.accent, color: "oklch(0.06 0.02 300)" }}
        onClick={onDesign}
      >
        <Sparkles className="w-4 h-4 mr-2" />
        {festival.comingSoon
          ? "Design for EDC 2027"
          : `Design for ${festival.name.split(" ")[0]} ${festival.name.split(" ")[1] ?? ""}`}
        <ArrowRight className="ml-2 w-4 h-4" />
      </Button>
    </div>
  );
}

// ── Waitlist panel ────────────────────────────────────────────────────────────
function WaitlistPanel({ festival }: { festival: Festival }) {
  const h = festival.color;
  const { theme } = festival;
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
    <div className="glass-strong rounded-3xl p-7 w-full max-w-xs animate-slide-in-right">
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: `oklch(0.72 0.22 ${h} / 0.15)` }}
        >
          {theme.icon}
        </div>
        <div className="min-w-0">
          <h3 className="font-display font-bold text-lg text-foreground leading-tight">{festival.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{festival.dates}</p>
        </div>
      </div>

      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl mb-4"
        style={{ background: `oklch(0.72 0.22 60 / 0.12)`, border: `1px solid oklch(0.72 0.22 60 / 0.25)` }}
      >
        <Lock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "oklch(0.80 0.18 60)" }} />
        <p className="text-xs" style={{ color: "oklch(0.80 0.18 60)" }}>
          This festival is under 3 months out — designs open on waitlist first.
        </p>
      </div>

      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
        Drop your email and we'll notify you the moment HAUZZ designs open for this universe — before the general public.
      </p>

      {joined ? (
        <div className="flex items-center gap-3 glass rounded-2xl p-4">
          <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: theme.accent }} />
          <div>
            <p className="font-semibold text-sm text-foreground">You're on the list</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              We'll reach out before designs open for {festival.name.split(" ")[0]}.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="glass border-border rounded-xl text-sm"
            required
          />
          <Button
            type="submit"
            className="w-full font-bold py-5 rounded-2xl text-sm"
            style={{ background: theme.accent, color: "oklch(0.06 0.02 300)" }}
            disabled={joinWaitlist.isPending}
          >
            {joinWaitlist.isPending ? "Joining..." : "Join the Waitlist"}
          </Button>
        </form>
      )}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {festival.vibeTags.slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="px-2.5 py-1 rounded-full text-xs font-medium glass opacity-50"
            style={{ color: theme.accent }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Empty hint ────────────────────────────────────────────────────────────────
function EmptyHint() {
  return (
    <div className="glass rounded-2xl px-6 py-5 max-w-xs animate-fade-in">
      <p className="text-sm text-muted-foreground leading-relaxed">
        <span className="text-foreground font-semibold">Click a planet</span> to explore its universe and start designing your festival look.
      </p>
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

  const handlePlanetClick = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const handleDesign = () => {
    navigate(`/design-studio?festival=${selectedId}`);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* ── Background ── */}
      <div className="fixed inset-0 z-0">
        <img
          src={GALAXY_BG}
          alt="Space"
          className="w-full h-full object-cover"
          style={{ opacity: 0.3, filter: "saturate(1.2)" }}
        />
        <div className="absolute inset-0" style={{ background: "oklch(0.06 0.02 300 / 0.72)" }} />
        {/* Nebula blobs */}
        <div
          className="absolute -top-1/4 -left-1/4 w-[70vw] h-[70vw] rounded-full animate-nebula-drift pointer-events-none"
          style={{ background: "radial-gradient(ellipse, oklch(0.55 0.18 340 / 0.12) 0%, transparent 70%)", filter: "blur(80px)" }}
        />
        <div
          className="absolute -bottom-1/4 -right-1/4 w-[60vw] h-[60vw] rounded-full animate-nebula-drift pointer-events-none"
          style={{ background: "radial-gradient(ellipse, oklch(0.55 0.18 260 / 0.10) 0%, transparent 70%)", filter: "blur(100px)", animationDelay: "8s" }}
        />
        <SpaceCanvas />
      </div>

      {/* ── Nav ── */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-4 border-b border-border/50 backdrop-blur-xl" style={{ background: "oklch(0.06 0.02 300 / 0.75)" }}>
        <button
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full animate-pulse-glow" style={{ background: "oklch(0.72 0.22 340)" }} />
          <span className="font-display font-bold text-sm text-foreground tracking-tight">HAUZZ.AI</span>
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
            style={{
              background: "oklch(0.72 0.22 340 / 0.15)",
              color: "oklch(0.85 0.18 340)",
              border: "1px solid oklch(0.72 0.22 340 / 0.3)",
            }}
            onClick={() => navigate("/design-studio")}
          >
            Design Studio
          </Button>
        </div>
      </nav>

      {/* ── Page header ── */}
      <div className="relative z-10 text-center pt-14 pb-6 px-4">
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground mb-3 animate-fade-up" style={{ animationDelay: "0.05s" }}>
          Select Your Universe
        </p>
        <h1
          className="font-display font-black text-5xl sm:text-7xl text-foreground animate-fade-up"
          style={{ animationDelay: "0.15s" }}
        >
          Festival <span className="text-gradient-pink">Map</span>
        </h1>
        <p
          className="text-muted-foreground text-sm mt-3 max-w-sm mx-auto animate-fade-up"
          style={{ animationDelay: "0.25s" }}
        >
          Each festival is a world. Click your planet to begin designing for it.
        </p>
      </div>

      {/* ── Main layout: planets + panel ── */}
      <div className="relative z-10 px-4 sm:px-8 pb-8">
        <div className="max-w-7xl mx-auto flex flex-col xl:flex-row gap-10 items-start justify-center">

          {/* ── Planet solar system ── */}
          <div className="flex-1 min-w-0">

            {/* Open universes */}
            <div className="mb-2">
              <div className="flex items-center gap-3 mb-10 justify-center">
                <div className="h-px flex-1 max-w-[80px]" style={{ background: "oklch(0.72 0.22 340 / 0.25)" }} />
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Open Universes</p>
                <div className="h-px flex-1 max-w-[80px]" style={{ background: "oklch(0.72 0.22 340 / 0.25)" }} />
              </div>

              {/* Featured row: EDC LV (large, centered) */}
              <div className="flex justify-center mb-4">
                {openFestivals.filter((f) => f.id === "edc-lv-2027").map((f) => (
                  <Planet
                    key={f.id}
                    festival={f}
                    isSelected={selectedId === f.id}
                    onClick={() => handlePlanetClick(f.id)}
                    size={210}
                  />
                ))}
              </div>

              {/* Secondary row: next 3 */}
              <div className="flex flex-wrap justify-center gap-x-10 gap-y-4">
                {openFestivals.filter((f) => f.id !== "edc-lv-2027").slice(0, 3).map((f) => (
                  <Planet
                    key={f.id}
                    festival={f}
                    isSelected={selectedId === f.id}
                    onClick={() => handlePlanetClick(f.id)}
                    size={155}
                  />
                ))}
              </div>

              {/* Tertiary row: remaining open */}
              <div className="flex flex-wrap justify-center gap-x-10 gap-y-4 mt-4">
                {openFestivals.filter((f) => f.id !== "edc-lv-2027").slice(3).map((f) => (
                  <Planet
                    key={f.id}
                    festival={f}
                    isSelected={selectedId === f.id}
                    onClick={() => handlePlanetClick(f.id)}
                    size={148}
                  />
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 my-12 px-4">
              <div className="h-px flex-1" style={{ background: "oklch(0.72 0.22 340 / 0.12)" }} />
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full glass">
                <Lock className="w-3 h-3" style={{ color: "oklch(0.75 0.15 60)" }} />
                <span className="text-xs text-muted-foreground uppercase tracking-widest">Coming Soon — Join the Waitlist</span>
              </div>
              <div className="h-px flex-1" style={{ background: "oklch(0.72 0.22 340 / 0.12)" }} />
            </div>

            {/* Locked universes */}
            <div className="flex flex-wrap justify-center gap-x-10 gap-y-4">
              {lockedFestivals.map((f) => (
                <Planet
                  key={f.id}
                  festival={f}
                  isSelected={selectedId === f.id}
                  onClick={() => handlePlanetClick(f.id)}
                  size={138}
                />
              ))}
            </div>
          </div>

          {/* ── Side panel ── */}
          <div className="xl:sticky xl:top-24 w-full xl:w-auto flex-shrink-0 flex justify-center xl:justify-start pt-4">
            {selected && !selected.locked && (
              <VenuePanel festival={selected} onDesign={handleDesign} />
            )}
            {selected && selected.locked && (
              <WaitlistPanel festival={selected} />
            )}
            {!selected && <EmptyHint />}
          </div>
        </div>
      </div>

      {/* Bottom padding */}
      <div className="h-20" />
    </div>
  );
}
