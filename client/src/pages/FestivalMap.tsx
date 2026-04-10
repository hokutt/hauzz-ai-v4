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
  // Optional second and third rings
  ring2?: string;
  ring2Opacity?: number;
  ring3?: string;
  ring3Opacity?: number;
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
    color: "290",
    locked: false,
    theme: {
      surface: [
        "oklch(0.88 0.20 300)",
        "oklch(0.62 0.28 280)",
        "oklch(0.28 0.18 260)",
      ],
      ring: "oklch(0.92 0.18 310)",
      ringOpacity: 0.85,
      ring2: "oklch(0.78 0.22 280)",
      ring2Opacity: 0.45,
      atmosphereHue: "290",
      detail: "dreamy",
      icon: "✨",
      accent: "oklch(0.90 0.22 300)",
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
    color: "25",
    locked: false,
    theme: {
      surface: [
        "oklch(0.72 0.28 25)",
        "oklch(0.38 0.22 15)",
        "oklch(0.08 0.04 300)",
      ],
      atmosphereHue: "25",
      detail: "industrial",
      icon: "🔥",
      accent: "oklch(0.85 0.28 25)",
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
    color: "85",
    locked: false,
    theme: {
      surface: [
        "oklch(0.65 0.26 85)",
        "oklch(0.35 0.18 70)",
        "oklch(0.10 0.06 300)",
      ],
      ring: "oklch(0.78 0.30 85)",
      ringOpacity: 0.60,
      atmosphereHue: "85",
      detail: "wasteland",
      icon: "☢️",
      accent: "oklch(0.80 0.28 85)",
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
    color: "255",
    locked: false,
    theme: {
      surface: [
        "oklch(0.55 0.28 255)",
        "oklch(0.28 0.22 270)",
        "oklch(0.06 0.04 300)",
      ],
      ring: "oklch(0.80 0.22 255)",
      ringOpacity: 0.70,
      ring2: "oklch(0.65 0.18 240)",
      ring2Opacity: 0.35,
      atmosphereHue: "255",
      detail: "nocturnal",
      icon: "🌙",
      accent: "oklch(0.82 0.24 255)",
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
    color: "195",
    locked: false,
    theme: {
      surface: [
        "oklch(0.85 0.26 195)",
        "oklch(0.55 0.30 210)",
        "oklch(0.18 0.10 300)",
      ],
      ring: "oklch(0.92 0.24 195)",
      ringOpacity: 0.80,
      ring2: "oklch(0.75 0.20 220)",
      ring2Opacity: 0.50,
      ring3: "oklch(0.60 0.16 240)",
      ring3Opacity: 0.25,
      atmosphereHue: "195",
      detail: "krave",
      icon: "🌐",
      accent: "oklch(0.90 0.26 195)",
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
    color: "145",
    locked: false,
    theme: {
      surface: [
        "oklch(0.82 0.30 145)",
        "oklch(0.58 0.28 120)",
        "oklch(0.22 0.12 300)",
      ],
      atmosphereHue: "145",
      detail: "tropical",
      icon: "🌴",
      accent: "oklch(0.88 0.30 145)",
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
    color: "50",
    locked: false,
    theme: {
      surface: [
        "oklch(0.78 0.26 50)",
        "oklch(0.50 0.20 40)",
        "oklch(0.15 0.08 300)",
      ],
      ring: "oklch(0.88 0.24 50)",
      ringOpacity: 0.65,
      atmosphereHue: "50",
      detail: "artdeco",
      icon: "🎨",
      accent: "oklch(0.88 0.26 50)",
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

    // ── EDC Las Vegas: Electric storm world ──────────────────────────────────
    case "electric":
      return (
        <svg width={size} height={size} className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: "screen" }}>
          <defs>
            <radialGradient id="edcGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={`oklch(0.95 0.25 ${hue})`} stopOpacity="0.4" />
              <stop offset="100%" stopColor={`oklch(0.95 0.25 ${hue})`} stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* Plasma atmosphere pulse */}
          <circle cx={cx} cy={cy} r={r * 0.88} fill="url(#edcGlow)" />
          {/* Neon equatorial band */}
          <ellipse cx={cx} cy={cy} rx={r * 0.88} ry={r * 0.10} fill={`oklch(0.92 0.28 ${hue} / 0.50)`} />
          <ellipse cx={cx} cy={cy} rx={r * 0.88} ry={r * 0.04} fill={`oklch(1.0 0.30 ${hue} / 0.70)`} />
          {/* Secondary bands */}
          <ellipse cx={cx} cy={cy - r * 0.32} rx={r * 0.75} ry={r * 0.055} fill={`oklch(0.88 0.24 ${hue} / 0.38)`} />
          <ellipse cx={cx} cy={cy + r * 0.32} rx={r * 0.75} ry={r * 0.055} fill={`oklch(0.88 0.24 ${hue} / 0.38)`} />
          <ellipse cx={cx} cy={cy - r * 0.58} rx={r * 0.55} ry={r * 0.035} fill={`oklch(0.85 0.20 ${hue} / 0.25)`} />
          <ellipse cx={cx} cy={cy + r * 0.58} rx={r * 0.55} ry={r * 0.035} fill={`oklch(0.85 0.20 ${hue} / 0.25)`} />
          {/* Lightning bolt 1 */}
          <polyline
            points={`${cx - r*0.05},${cy - r*0.55} ${cx - r*0.18},${cy - r*0.18} ${cx - r*0.02},${cy - r*0.18} ${cx - r*0.20},${cy + r*0.28}`}
            fill="none" stroke={`oklch(1.0 0.28 ${hue})`} strokeWidth="2.5" strokeLinejoin="round" opacity="0.85"
          />
          {/* Lightning bolt 2 (smaller, right side) */}
          <polyline
            points={`${cx + r*0.30},${cy - r*0.40} ${cx + r*0.18},${cy - r*0.05} ${cx + r*0.28},${cy - r*0.05} ${cx + r*0.14},${cy + r*0.30}`}
            fill="none" stroke={`oklch(1.0 0.28 ${hue})`} strokeWidth="1.8" strokeLinejoin="round" opacity="0.60"
          />
          {/* Spark constellation ring */}
          {[0,1,2,3,4,5,6,7,8,9,10,11].map((i) => {
            const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
            const rr = r * (i % 3 === 0 ? 0.72 : 0.62);
            const sr = i % 3 === 0 ? 3.5 : 2;
            return <circle key={i} cx={cx + Math.cos(a)*rr} cy={cy + Math.sin(a)*rr} r={sr} fill={`oklch(1.0 0.25 ${hue})`} opacity={i % 3 === 0 ? 0.95 : 0.55} />;
          })}
          {/* EDC daisy petal ring (center) */}
          {[0,1,2,3,4,5].map((i) => {
            const a = (i / 6) * Math.PI * 2;
            return (
              <ellipse key={i}
                cx={cx + Math.cos(a) * r * 0.22}
                cy={cy + Math.sin(a) * r * 0.22}
                rx={r * 0.09} ry={r * 0.05}
                fill={`oklch(1.0 0.28 ${hue} / 0.45)`}
                transform={`rotate(${(a * 180) / Math.PI}, ${cx + Math.cos(a) * r * 0.22}, ${cy + Math.sin(a) * r * 0.22})`}
              />
            );
          })}
          <circle cx={cx} cy={cy} r={r * 0.07} fill={`oklch(1.0 0.30 ${hue})`} opacity="0.9" />
        </svg>
      );

    // ── Lost In Dreams: Dreamy aurora nebula world ───────────────────────────
    case "dreamy":
      return (
        <svg width={size} height={size} className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: "screen" }}>
          <defs>
            <radialGradient id="dreamCore" cx="40%" cy="40%" r="55%">
              <stop offset="0%" stopColor="oklch(0.95 0.12 300)" stopOpacity="0.45" />
              <stop offset="60%" stopColor={`oklch(0.80 0.18 ${hue})`} stopOpacity="0.20" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx={cx} cy={cy} r={r * 0.88} fill="url(#dreamCore)" />
          {/* Aurora ribbon 1 */}
          <path d={`M ${cx - r*0.85} ${cy - r*0.15} C ${cx - r*0.4} ${cy - r*0.55}, ${cx + r*0.3} ${cy - r*0.45}, ${cx + r*0.85} ${cy - r*0.10}`}
            fill="none" stroke={`oklch(0.92 0.14 300 / 0.55)`} strokeWidth={r * 0.10} strokeLinecap="round" />
          {/* Aurora ribbon 2 */}
          <path d={`M ${cx - r*0.80} ${cy + r*0.10} C ${cx - r*0.3} ${cy + r*0.50}, ${cx + r*0.4} ${cy + r*0.40}, ${cx + r*0.80} ${cy + r*0.05}`}
            fill="none" stroke={`oklch(0.88 0.16 ${hue} / 0.45)`} strokeWidth={r * 0.08} strokeLinecap="round" />
          {/* Aurora ribbon 3 (thin) */}
          <path d={`M ${cx - r*0.70} ${cy - r*0.40} C ${cx - r*0.2} ${cy - r*0.70}, ${cx + r*0.5} ${cy - r*0.60}, ${cx + r*0.72} ${cy - r*0.35}`}
            fill="none" stroke={`oklch(0.95 0.10 260 / 0.35)`} strokeWidth={r * 0.05} strokeLinecap="round" />
          {/* Floating dream bubbles */}
          {[
            [0.28, -0.50, 0.055, 0.80],
            [-0.42, -0.28, 0.040, 0.65],
            [0.52, 0.22, 0.048, 0.70],
            [-0.30, 0.45, 0.038, 0.55],
            [0.10, 0.58, 0.030, 0.60],
            [-0.55, 0.10, 0.035, 0.50],
            [0.40, -0.15, 0.025, 0.75],
          ].map(([dx, dy, rr, op], i) => (
            <circle key={i}
              cx={cx + dx * r} cy={cy + dy * r} r={rr * r}
              fill="none" stroke={`oklch(0.95 0.10 ${hue} / ${op})`} strokeWidth="1.2"
            />
          ))}
          {/* Sparkle stars */}
          {[
            [0.18, -0.62], [-0.50, -0.38], [0.60, -0.22], [-0.18, 0.60], [0.42, 0.48], [-0.62, 0.28], [0.0, -0.72],
          ].map(([dx, dy], i) => (
            <g key={i} transform={`translate(${cx + dx! * r}, ${cy + dy! * r})`}>
              <line x1="0" y1={-r*0.045} x2="0" y2={r*0.045} stroke={`oklch(1.0 0.08 ${hue})`} strokeWidth="1.5" opacity="0.85" />
              <line x1={-r*0.045} y1="0" x2={r*0.045} y2="0" stroke={`oklch(1.0 0.08 ${hue})`} strokeWidth="1.5" opacity="0.85" />
              <line x1={-r*0.030} y1={-r*0.030} x2={r*0.030} y2={r*0.030} stroke={`oklch(1.0 0.08 ${hue})`} strokeWidth="1" opacity="0.55" />
              <line x1={r*0.030} y1={-r*0.030} x2={-r*0.030} y2={r*0.030} stroke={`oklch(1.0 0.08 ${hue})`} strokeWidth="1" opacity="0.55" />
            </g>
          ))}
        </svg>
      );

    // ── HARD Summer: Scorched industrial hellscape ───────────────────────────────────────
    case "industrial":
      return (
        <svg width={size} height={size} className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: "screen" }}>       {/* Large impact crater (main) */}
          <circle cx={cx - r*0.22} cy={cy - r*0.20} r={r * 0.30} fill={`oklch(0.15 0.06 ${hue} / 0.60)`} />
          <circle cx={cx - r*0.22} cy={cy - r*0.20} r={r * 0.30} fill="none" stroke={`oklch(0.75 0.22 ${hue})`} strokeWidth="2.5" opacity="0.65" />
          <circle cx={cx - r*0.22} cy={cy - r*0.20} r={r * 0.38} fill="none" stroke={`oklch(0.65 0.18 ${hue})`} strokeWidth="1" opacity="0.35" />
          <circle cx={cx - r*0.22} cy={cy - r*0.20} r={r * 0.48} fill="none" stroke={`oklch(0.55 0.14 ${hue})`} strokeWidth="0.8" opacity="0.20" />
          {/* Small crater top-right */}
          <circle cx={cx + r*0.42} cy={cy - r*0.38} r={r * 0.14} fill={`oklch(0.12 0.05 ${hue} / 0.55)`} />
          <circle cx={cx + r*0.42} cy={cy - r*0.38} r={r * 0.14} fill="none" stroke={`oklch(0.70 0.20 ${hue})`} strokeWidth="1.8" opacity="0.55" />
          {/* Micro crater bottom */}
          <circle cx={cx + r*0.20} cy={cy + r*0.50} r={r * 0.09} fill={`oklch(0.10 0.04 ${hue} / 0.50)`} />
          <circle cx={cx + r*0.20} cy={cy + r*0.50} r={r * 0.09} fill="none" stroke={`oklch(0.65 0.18 ${hue})`} strokeWidth="1.5" opacity="0.45" />
          {/* Heat fracture lines radiating from main crater */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
            const rad = (deg * Math.PI) / 180;
            const x1 = cx - r*0.22 + Math.cos(rad) * r * 0.30;
            const y1 = cy - r*0.20 + Math.sin(rad) * r * 0.30;
            const x2 = cx - r*0.22 + Math.cos(rad) * r * (0.50 + (i % 3) * 0.08);
            const y2 = cy - r*0.20 + Math.sin(rad) * r * (0.50 + (i % 3) * 0.08);
            return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke={`oklch(0.72 0.20 ${hue})`} strokeWidth={1.2 - i*0.05} opacity={0.45 - i*0.02} />;
          })}
          {/* Lava vein lines */}
          <path d={`M ${cx - r*0.52} ${cy + r*0.15} Q ${cx - r*0.10} ${cy + r*0.30} ${cx + r*0.35} ${cy + r*0.10}`}
            fill="none" stroke={`oklch(0.80 0.28 ${hue})`} strokeWidth="2" opacity="0.55" strokeLinecap="round" />
          <path d={`M ${cx + r*0.10} ${cy - r*0.60} Q ${cx + r*0.30} ${cy - r*0.30} ${cx + r*0.55} ${cy + r*0.20}`}
            fill="none" stroke={`oklch(0.78 0.26 ${hue})`} strokeWidth="1.5" opacity="0.40" strokeLinecap="round" />
          {/* HARD text suggestion: bold horizontal slash */}
          <line x1={cx - r*0.55} y1={cy + r*0.70} x2={cx + r*0.55} y2={cy + r*0.70} stroke={`oklch(0.80 0.24 ${hue})`} strokeWidth="3" opacity="0.30" strokeLinecap="round" />
          <line x1={cx - r*0.40} y1={cy + r*0.76} x2={cx + r*0.40} y2={cy + r*0.76} stroke={`oklch(0.80 0.24 ${hue})`} strokeWidth="2" opacity="0.18" strokeLinecap="round" />
        </svg>
      );

    // ── Wasteland: Post-apocalyptic toxic world ──────────────────────────────
    case "wasteland":
      return (
        <svg width={size} height={size} className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: "screen" }}>
          {/* Radiation symbol — 3 blades */}
          {[0, 120, 240].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const rad2 = ((deg + 60) * Math.PI) / 180;
            const innerR = r * 0.14;
            const outerR = r * 0.32;
            const x1i = cx + Math.cos(rad) * innerR;
            const y1i = cy + Math.sin(rad) * innerR;
            const x2i = cx + Math.cos(rad2) * innerR;
            const y2i = cy + Math.sin(rad2) * innerR;
            const x1o = cx + Math.cos(rad) * outerR;
            const y1o = cy + Math.sin(rad) * outerR;
            const x2o = cx + Math.cos(rad2) * outerR;
            const y2o = cy + Math.sin(rad2) * outerR;
            return (
              <path key={deg}
                d={`M ${x1i} ${y1i} L ${x1o} ${y1o} A ${outerR} ${outerR} 0 0 1 ${x2o} ${y2o} L ${x2i} ${y2i} A ${innerR} ${innerR} 0 0 0 ${x1i} ${y1i} Z`}
                fill={`oklch(0.78 0.22 ${hue} / 0.55)`}
              />
            );
          })}
          <circle cx={cx} cy={cy} r={r * 0.10} fill={`oklch(0.78 0.22 ${hue} / 0.80)`} />
          <circle cx={cx} cy={cy} r={r * 0.14} fill="none" stroke={`oklch(0.78 0.22 ${hue})`} strokeWidth="1.5" opacity="0.60" />
          <circle cx={cx} cy={cy} r={r * 0.36} fill="none" stroke={`oklch(0.72 0.18 ${hue})`} strokeWidth="1.5" opacity="0.45" />
          {/* Outer dashed radiation rings */}
          <circle cx={cx} cy={cy} r={r * 0.55} fill="none" stroke={`oklch(0.68 0.16 ${hue})`} strokeWidth="1.2" strokeDasharray="5 4" opacity="0.35" />
          <circle cx={cx} cy={cy} r={r * 0.72} fill="none" stroke={`oklch(0.62 0.14 ${hue})`} strokeWidth="1" strokeDasharray="3 5" opacity="0.22" />
          {/* Cracked terrain polygon mesh */}
          <path d={`M ${cx - r*0.55} ${cy - r*0.10} L ${cx - r*0.20} ${cy - r*0.45} L ${cx + r*0.15} ${cy - r*0.20} L ${cx + r*0.50} ${cy - r*0.50} L ${cx + r*0.60} ${cy + r*0.05}`}
            fill="none" stroke={`oklch(0.60 0.14 ${hue})`} strokeWidth="1.2" opacity="0.40" />
          <path d={`M ${cx - r*0.60} ${cy + r*0.30} L ${cx - r*0.15} ${cy + r*0.55} L ${cx + r*0.25} ${cy + r*0.35} L ${cx + r*0.55} ${cy + r*0.60}`}
            fill="none" stroke={`oklch(0.55 0.12 ${hue})`} strokeWidth="1" opacity="0.32" />
          {/* Toxic drip spots */}
          {[[-0.55, -0.55], [0.55, -0.45], [-0.48, 0.55], [0.50, 0.52]].map(([dx, dy], i) => (
            <circle key={i} cx={cx + dx! * r} cy={cy + dy! * r} r={r * 0.04}
              fill={`oklch(0.82 0.26 ${hue} / 0.65)`} />
          ))}
        </svg>
      );

    // ── Nocturnal Wonderland: Deep night sky constellation world ─────────────
    case "nocturnal":
      return (
        <svg width={size} height={size} className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: "screen" }}>
          {/* Constellation: Orion-like pattern */}
          {(() => {
            const stars: [number, number, number][] = [
              [0.05, -0.60, 3.5],   // top
              [-0.28, -0.38, 2.5],  // left shoulder
              [0.32, -0.32, 2.5],   // right shoulder
              [-0.18, -0.05, 3.0],  // belt left
              [0.05, -0.00, 2.8],   // belt center
              [0.28, 0.05, 2.5],    // belt right
              [-0.22, 0.38, 2.0],   // left foot
              [0.30, 0.42, 2.0],    // right foot
              [0.55, -0.55, 1.8],   // far right
              [-0.55, 0.20, 1.5],   // far left
              [0.10, 0.68, 1.5],    // bottom
              [-0.40, -0.62, 1.8],  // top left
            ];
            const lines: [number, number][] = [
              [1,3],[2,3],[3,4],[4,5],[5,6],[1,0],[2,0],[6,7],[3,9],[5,8],
            ];
            return (
              <>
                {lines.map(([a, b], i) => (
                  <line key={i}
                    x1={cx + stars[a][0] * r} y1={cy + stars[a][1] * r}
                    x2={cx + stars[b][0] * r} y2={cy + stars[b][1] * r}
                    stroke={`oklch(0.85 0.16 ${hue})`} strokeWidth="0.8" opacity="0.40"
                  />
                ))}
                {stars.map(([dx, dy, sr], i) => (
                  <circle key={i} cx={cx + dx * r} cy={cy + dy * r} r={sr}
                    fill={`oklch(1.0 0.10 ${hue})`} opacity={sr > 3 ? 0.95 : 0.70}
                  />
                ))}
              </>
            );
          })()}
          {/* Crescent moon carved into surface */}
          <circle cx={cx - r*0.35} cy={cy + r*0.40} r={r * 0.18} fill={`oklch(0.88 0.18 ${hue} / 0.50)`} />
          <circle cx={cx - r*0.28} cy={cy + r*0.34} r={r * 0.14} fill={`oklch(0.12 0.06 ${hue} / 0.90)`} />
          {/* Milky way band */}
          <ellipse cx={cx + r*0.25} cy={cy - r*0.10} rx={r * 0.28} ry={r * 0.62}
            fill={`oklch(0.75 0.14 ${hue} / 0.12)`} transform={`rotate(25, ${cx}, ${cy})`} />
          {/* Glitter micro-dots */}
          {[0.45,-0.30,0.60,-0.55,-0.65,0.25,0.15,0.70,-0.20,-0.70].map((v, i) => (
            <circle key={`g${i}`}
              cx={cx + v * r}
              cy={cy + (i % 2 === 0 ? 0.55 : -0.45) * r * (i * 0.1 + 0.5)}
              r={0.8 + (i % 3) * 0.5}
              fill={`oklch(1.0 0.06 ${hue})`} opacity={0.5 + (i % 4) * 0.12}
            />
          ))}
        </svg>
      );

    // ── EDC Korea: K-Rave cyber circuit world ────────────────────────────────
    case "krave":
      return (
        <svg width={size} height={size} className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: "screen" }}>
          <defs>
            <linearGradient id="holoShift" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={`oklch(0.90 0.22 ${hue})`} stopOpacity="0.5" />
              <stop offset="50%" stopColor="oklch(0.90 0.20 280)" stopOpacity="0.3" />
              <stop offset="100%" stopColor={`oklch(0.88 0.22 ${hue})`} stopOpacity="0.5" />
            </linearGradient>
          </defs>
          {/* Holographic shimmer overlay */}
          <ellipse cx={cx} cy={cy} rx={r * 0.88} ry={r * 0.88} fill="url(#holoShift)" opacity="0.25" />
          {/* Circuit board traces — horizontal */}
          <line x1={cx - r*0.70} y1={cy - r*0.40} x2={cx - r*0.20} y2={cy - r*0.40} stroke={`oklch(0.90 0.22 ${hue})`} strokeWidth="1.5" opacity="0.65" />
          <line x1={cx - r*0.20} y1={cy - r*0.40} x2={cx - r*0.20} y2={cy - r*0.10} stroke={`oklch(0.90 0.22 ${hue})`} strokeWidth="1.5" opacity="0.65" />
          <line x1={cx - r*0.20} y1={cy - r*0.10} x2={cx + r*0.40} y2={cy - r*0.10} stroke={`oklch(0.90 0.22 ${hue})`} strokeWidth="1.5" opacity="0.65" />
          <line x1={cx + r*0.40} y1={cy - r*0.10} x2={cx + r*0.40} y2={cy + r*0.30} stroke={`oklch(0.90 0.22 ${hue})`} strokeWidth="1.5" opacity="0.65" />
          <line x1={cx + r*0.40} y1={cy + r*0.30} x2={cx + r*0.70} y2={cy + r*0.30} stroke={`oklch(0.90 0.22 ${hue})`} strokeWidth="1.5" opacity="0.65" />
          {/* Circuit trace 2 */}
          <line x1={cx - r*0.60} y1={cy + r*0.20} x2={cx - r*0.60} y2={cy + r*0.50} stroke={`oklch(0.85 0.18 200)`} strokeWidth="1.2" opacity="0.50" />
          <line x1={cx - r*0.60} y1={cy + r*0.50} x2={cx + r*0.10} y2={cy + r*0.50} stroke={`oklch(0.85 0.18 200)`} strokeWidth="1.2" opacity="0.50" />
          <line x1={cx + r*0.10} y1={cy + r*0.50} x2={cx + r*0.10} y2={cy + r*0.65} stroke={`oklch(0.85 0.18 200)`} strokeWidth="1.2" opacity="0.50" />
          {/* Circuit nodes (solder pads) */}
          {[
            [cx - r*0.20, cy - r*0.40], [cx + r*0.40, cy - r*0.10],
            [cx + r*0.40, cy + r*0.30], [cx - r*0.60, cy + r*0.20],
            [cx + r*0.10, cy + r*0.50], [cx - r*0.70, cy - r*0.40],
          ].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r={4.5} fill={`oklch(0.92 0.24 ${hue})`} opacity="0.80" />
              <circle cx={x} cy={y} r={2.5} fill={`oklch(0.06 0.02 300)`} />
            </g>
          ))}
          {/* K-pop star burst center */}
          {[0,45,90,135].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            return (
              <line key={deg}
                x1={cx + Math.cos(rad) * r * 0.08} y1={cy + Math.sin(rad) * r * 0.08}
                x2={cx + Math.cos(rad) * r * 0.22} y2={cy + Math.sin(rad) * r * 0.22}
                stroke={`oklch(1.0 0.28 ${hue})`} strokeWidth="2.5" opacity="0.80" strokeLinecap="round"
              />
            );
          })}
          <circle cx={cx} cy={cy} r={r * 0.08} fill={`oklch(1.0 0.28 ${hue})`} opacity="0.90" />
          {/* Neon pixel dot matrix (top right quadrant) */}
          {[0,1,2,3,4].flatMap((row) =>
            [0,1,2,3,4].map((col) => {
              const px = cx + r*0.25 + col * r * 0.10;
              const py = cy - r*0.65 + row * r * 0.10;
              const on = (row + col) % 2 === 0;
              return on ? <circle key={`${row}-${col}`} cx={px} cy={py} r={1.5} fill={`oklch(0.95 0.20 ${hue})`} opacity="0.55" /> : null;
            })
          )}
        </svg>
      );

    // ── EDC Colombia: Tropical electric jungle world ─────────────────────────
    case "tropical":
      return (
        <svg width={size} height={size} className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: "screen" }}>
          {/* Tropical flower — 6 petals */}
          {[0,60,120,180,240,300].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const px = cx + Math.cos(rad) * r * 0.32;
            const py = cy + Math.sin(rad) * r * 0.32;
            return (
              <ellipse key={deg}
                cx={px} cy={py}
                rx={r * 0.18} ry={r * 0.10}
                fill={`oklch(0.88 0.26 ${hue} / 0.55)`}
                transform={`rotate(${deg}, ${px}, ${py})`}
              />
            );
          })}
          <circle cx={cx} cy={cy} r={r * 0.12} fill={`oklch(0.95 0.28 60 / 0.85)`} />
          {/* Jungle canopy silhouette band */}
          <path d={`M ${cx - r*0.88} ${cy + r*0.30}
            Q ${cx - r*0.65} ${cy + r*0.05} ${cx - r*0.45} ${cy + r*0.25}
            Q ${cx - r*0.25} ${cy + r*0.00} ${cx - r*0.05} ${cy + r*0.20}
            Q ${cx + r*0.15} ${cy - r*0.05} ${cx + r*0.35} ${cy + r*0.18}
            Q ${cx + r*0.55} ${cy + r*0.02} ${cx + r*0.75} ${cy + r*0.28}
            L ${cx + r*0.88} ${cy + r*0.88} L ${cx - r*0.88} ${cy + r*0.88} Z`}
            fill={`oklch(0.45 0.22 ${hue} / 0.40)`}
          />
          {/* Electric current arcs */}
          <path d={`M ${cx - r*0.70} ${cy - r*0.50} Q ${cx} ${cy - r*0.80} ${cx + r*0.70} ${cy - r*0.50}`}
            fill="none" stroke={`oklch(0.95 0.28 60 / 0.55)`} strokeWidth="2" strokeLinecap="round" />
          <path d={`M ${cx - r*0.55} ${cy - r*0.60} Q ${cx} ${cy - r*0.90} ${cx + r*0.55} ${cy - r*0.60}`}
            fill="none" stroke={`oklch(0.92 0.24 ${hue} / 0.35)`} strokeWidth="1.2" strokeLinecap="round" />
          {/* Vibrant festival color burst dots */}
          {[
            [0.62, -0.42, 4, 0.80], [-0.58, -0.38, 3.5, 0.70],
            [0.48, 0.55, 3, 0.65], [-0.50, 0.48, 3.5, 0.70],
            [0.0, -0.72, 3, 0.75], [0.72, 0.15, 2.5, 0.60],
          ].map(([dx, dy, sr, op], i) => (
            <circle key={i} cx={cx + dx! * r} cy={cy + dy! * r} r={sr!}
              fill={i % 2 === 0 ? `oklch(0.95 0.28 60)` : `oklch(0.90 0.26 ${hue})`}
              opacity={op!}
            />
          ))}
        </svg>
      );

    // ── III Points: Miami art-deco minimal world ─────────────────────────────
    case "artdeco":
      return (
        <svg width={size} height={size} className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: "screen" }}>
          {/* Golden ratio spiral approximation */}
          <path d={`
            M ${cx} ${cy}
            A ${r*0.12} ${r*0.12} 0 0 1 ${cx + r*0.12} ${cy}
            A ${r*0.20} ${r*0.20} 0 0 1 ${cx + r*0.12} ${cy - r*0.20}
            A ${r*0.32} ${r*0.32} 0 0 1 ${cx - r*0.20} ${cy - r*0.20}
            A ${r*0.52} ${r*0.52} 0 0 1 ${cx - r*0.20} ${cy + r*0.32}
            A ${r*0.72} ${r*0.72} 0 0 1 ${cx + r*0.52} ${cy + r*0.32}
          `} fill="none" stroke={`oklch(0.80 0.20 ${hue})`} strokeWidth="1.8" opacity="0.55" strokeLinecap="round" />
          {/* Concentric precision rings */}
          <circle cx={cx} cy={cy} r={r * 0.22} fill="none" stroke={`oklch(0.80 0.20 ${hue})`} strokeWidth="1.5" opacity="0.60" />
          <circle cx={cx} cy={cy} r={r * 0.40} fill="none" stroke={`oklch(0.75 0.18 ${hue})`} strokeWidth="1.0" opacity="0.45" />
          <circle cx={cx} cy={cy} r={r * 0.58} fill="none" stroke={`oklch(0.70 0.16 ${hue})`} strokeWidth="0.8" opacity="0.32" />
          <circle cx={cx} cy={cy} r={r * 0.76} fill="none" stroke={`oklch(0.65 0.14 ${hue})`} strokeWidth="0.6" opacity="0.22" />
          {/* Art-deco radiating lines (8-fold) */}
          {[0,45,90,135,180,225,270,315].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            return (
              <line key={deg}
                x1={cx + Math.cos(rad) * r * 0.22}
                y1={cy + Math.sin(rad) * r * 0.22}
                x2={cx + Math.cos(rad) * r * 0.76}
                y2={cy + Math.sin(rad) * r * 0.76}
                stroke={`oklch(0.75 0.18 ${hue})`} strokeWidth={deg % 90 === 0 ? 1.5 : 0.8}
                opacity={deg % 90 === 0 ? 0.50 : 0.28}
              />
            );
          })}
          {/* III Points triple dot motif */}
          <circle cx={cx - r*0.12} cy={cy} r={r * 0.05} fill={`oklch(0.85 0.22 ${hue})`} opacity="0.90" />
          <circle cx={cx} cy={cy} r={r * 0.05} fill={`oklch(0.85 0.22 ${hue})`} opacity="0.90" />
          <circle cx={cx + r*0.12} cy={cy} r={r * 0.05} fill={`oklch(0.85 0.22 ${hue})`} opacity="0.90" />
          {/* Bauhaus geometric accent — triangle */}
          <polygon
            points={`${cx},${cy - r*0.68} ${cx - r*0.20},${cy - r*0.42} ${cx + r*0.20},${cy - r*0.42}`}
            fill="none" stroke={`oklch(0.80 0.20 ${hue})`} strokeWidth="1.5" opacity="0.45"
          />
        </svg>
      );

    // ── Beyond Wonderland: Alice rabbit hole fantasy world ───────────────────
    case "wonderland":
      return (
        <svg width={size} height={size} className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: "screen" }}>
          {/* Checkerboard patches */}
          {[[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]].map(([dx, dy], i) => (
            <rect key={i}
              x={cx + dx! * r - r*0.10} y={cy + dy! * r - r*0.10}
              width={r * 0.20} height={r * 0.20}
              fill={i % 2 === 0 ? `oklch(0.88 0.22 ${hue} / 0.45)` : `oklch(0.92 0.18 300 / 0.35)`}
              rx="3"
            />
          ))}
          {/* Spiral tunnel (rabbit hole) */}
          {[0.72, 0.55, 0.40, 0.28, 0.18, 0.10].map((rr, i) => (
            <circle key={i} cx={cx} cy={cy} r={rr * r}
              fill="none"
              stroke={i % 2 === 0 ? `oklch(0.90 0.22 ${hue})` : `oklch(0.88 0.20 300)`}
              strokeWidth={1.5 - i * 0.15}
              strokeDasharray={i % 2 === 0 ? "none" : `${r*0.15} ${r*0.08}`}
              opacity={0.55 - i * 0.05}
            />
          ))}
          {/* Playing card suits */}
          {/* Heart ♥ */}
          <path d={`M ${cx - r*0.55} ${cy - r*0.62} C ${cx - r*0.55} ${cy - r*0.72}, ${cx - r*0.40} ${cy - r*0.72}, ${cx - r*0.40} ${cy - r*0.62} C ${cx - r*0.40} ${cy - r*0.72}, ${cx - r*0.25} ${cy - r*0.72}, ${cx - r*0.25} ${cy - r*0.62} L ${cx - r*0.40} ${cy - r*0.48} Z`}
            fill={`oklch(0.80 0.28 10 / 0.70)`} />
          {/* Diamond ♦ */}
          <polygon points={`${cx + r*0.42},${cy - r*0.70} ${cx + r*0.52},${cy - r*0.58} ${cx + r*0.42},${cy - r*0.46} ${cx + r*0.32},${cy - r*0.58}`}
            fill={`oklch(0.85 0.24 ${hue} / 0.70)`} />
          {/* Spade ♠ */}
          <path d={`M ${cx + r*0.42} ${cy + r*0.48} C ${cx + r*0.32} ${cy + r*0.38}, ${cx + r*0.28} ${cy + r*0.52}, ${cx + r*0.42} ${cy + r*0.62} C ${cx + r*0.56} ${cy + r*0.52}, ${cx + r*0.52} ${cy + r*0.38}, ${cx + r*0.42} ${cy + r*0.48} Z`}
            fill={`oklch(0.88 0.20 300 / 0.65)`} />
          {/* Club ♣ */}
          <circle cx={cx - r*0.42} cy={cy + r*0.50} r={r*0.07} fill={`oklch(0.82 0.22 ${hue} / 0.65)`} />
          <circle cx={cx - r*0.52} cy={cy + r*0.60} r={r*0.07} fill={`oklch(0.82 0.22 ${hue} / 0.65)`} />
          <circle cx={cx - r*0.32} cy={cy + r*0.60} r={r*0.07} fill={`oklch(0.82 0.22 ${hue} / 0.65)`} />
          <line x1={cx - r*0.42} y1={cy + r*0.57} x2={cx - r*0.42} y2={cy + r*0.70} stroke={`oklch(0.82 0.22 ${hue} / 0.65)`} strokeWidth="2" />
        </svg>
      );

    // ── Electric Forest: Living enchanted forest world ───────────────────────
    case "forest":
      return (
        <svg width={size} height={size} className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: "screen" }}>
          {/* Tree silhouette ring */}
          {[-0.55, -0.28, 0.0, 0.28, 0.55].map((dx, i) => {
            const baseY = cy + r * 0.30;
            const h2 = r * (0.35 + (i % 2) * 0.15);
            const w = r * 0.14;
            return (
              <g key={i}>
                {/* Trunk */}
                <rect x={cx + dx * r - r*0.025} y={baseY} width={r*0.05} height={r*0.12}
                  fill={`oklch(0.40 0.14 ${hue} / 0.60)`} />
                {/* Canopy triangle */}
                <polygon
                  points={`${cx + dx * r},${baseY - h2} ${cx + dx * r - w},${baseY} ${cx + dx * r + w},${baseY}`}
                  fill={`oklch(0.55 0.22 ${hue} / 0.65)`}
                />
                {/* Second canopy layer */}
                <polygon
                  points={`${cx + dx * r},${baseY - h2 * 0.65} ${cx + dx * r - w*0.80},${baseY - h2*0.30} ${cx + dx * r + w*0.80},${baseY - h2*0.30}`}
                  fill={`oklch(0.62 0.24 ${hue} / 0.55)`}
                />
              </g>
            );
          })}
          {/* Root network paths */}
          <path d={`M ${cx} ${cy + r*0.42} Q ${cx - r*0.30} ${cy + r*0.58} ${cx - r*0.55} ${cy + r*0.72}`}
            fill="none" stroke={`oklch(0.45 0.16 ${hue})`} strokeWidth="1.8" opacity="0.55" strokeLinecap="round" />
          <path d={`M ${cx} ${cy + r*0.42} Q ${cx + r*0.25} ${cy + r*0.60} ${cx + r*0.50} ${cy + r*0.70}`}
            fill="none" stroke={`oklch(0.45 0.16 ${hue})`} strokeWidth="1.5" opacity="0.45" strokeLinecap="round" />
          <path d={`M ${cx} ${cy + r*0.42} Q ${cx + r*0.05} ${cy + r*0.65} ${cx - r*0.10} ${cy + r*0.78}`}
            fill="none" stroke={`oklch(0.42 0.14 ${hue})`} strokeWidth="1.2" opacity="0.38" strokeLinecap="round" />
          {/* Firefly glow dots */}
          {[
            [-0.62, -0.30, 3.5, 0.85], [0.58, -0.45, 3.0, 0.80],
            [-0.40, -0.62, 2.5, 0.75], [0.65, 0.10, 3.0, 0.80],
            [-0.68, 0.25, 2.5, 0.70], [0.20, -0.70, 2.0, 0.75],
            [0.42, -0.60, 2.0, 0.65], [-0.20, 0.68, 2.5, 0.70],
          ].map(([dx, dy, sr, op], i) => (
            <circle key={i} cx={cx + dx! * r} cy={cy + dy! * r} r={sr!}
              fill={`oklch(0.92 0.28 ${hue})`} opacity={op!}
            />
          ))}
          {/* Mushroom caps (2) */}
          <ellipse cx={cx - r*0.28} cy={cy + r*0.18} rx={r*0.10} ry={r*0.06}
            fill={`oklch(0.70 0.26 ${hue} / 0.65)`} />
          <rect x={cx - r*0.295} y={cy + r*0.18} width={r*0.03} height={r*0.08}
            fill={`oklch(0.85 0.10 ${hue} / 0.50)`} />
          <ellipse cx={cx + r*0.35} cy={cy + r*0.08} rx={r*0.08} ry={r*0.05}
            fill={`oklch(0.72 0.24 ${hue} / 0.60)`} />
          <rect x={cx + r*0.338} y={cy + r*0.08} width={r*0.024} height={r*0.07}
            fill={`oklch(0.85 0.10 ${hue} / 0.45)`} />
        </svg>
      );

    // ── Beyond Wonderland at the Gorge: Pacific Northwest scenic world ───────
    case "gorge":
      return (
        <svg width={size} height={size} className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: "screen" }}>
          {/* Sky gradient band */}
          <ellipse cx={cx} cy={cy - r*0.35} rx={r*0.88} ry={r*0.50}
            fill={`oklch(0.65 0.18 ${hue} / 0.22)`} />
          {/* Mountain range — back layer */}
          <path d={`
            M ${cx - r*0.88} ${cy + r*0.20}
            L ${cx - r*0.65} ${cy - r*0.45}
            L ${cx - r*0.40} ${cy - r*0.10}
            L ${cx - r*0.15} ${cy - r*0.60}
            L ${cx + r*0.10} ${cy - r*0.30}
            L ${cx + r*0.35} ${cy - r*0.55}
            L ${cx + r*0.60} ${cy - r*0.15}
            L ${cx + r*0.88} ${cy - r*0.40}
            L ${cx + r*0.88} ${cy + r*0.20} Z`}
            fill={`oklch(0.40 0.16 ${hue} / 0.50)`}
          />
          {/* Mountain range — front layer */}
          <path d={`
            M ${cx - r*0.88} ${cy + r*0.50}
            L ${cx - r*0.55} ${cy + r*0.05}
            L ${cx - r*0.30} ${cy + r*0.30}
            L ${cx - r*0.05} ${cy - r*0.15}
            L ${cx + r*0.20} ${cy + r*0.20}
            L ${cx + r*0.45} ${cy - r*0.05}
            L ${cx + r*0.70} ${cy + r*0.35}
            L ${cx + r*0.88} ${cy + r*0.15}
            L ${cx + r*0.88} ${cy + r*0.88}
            L ${cx - r*0.88} ${cy + r*0.88} Z`}
            fill={`oklch(0.50 0.20 ${hue} / 0.55)`}
          />
          {/* Snow caps */}
          <polygon points={`${cx - r*0.65},${cy - r*0.45} ${cx - r*0.72},${cy - r*0.30} ${cx - r*0.58},${cy - r*0.30}`}
            fill={`oklch(0.95 0.04 ${hue} / 0.70)`} />
          <polygon points={`${cx - r*0.15},${cy - r*0.60} ${cx - r*0.24},${cy - r*0.42} ${cx - r*0.06},${cy - r*0.42}`}
            fill={`oklch(0.95 0.04 ${hue} / 0.70)`} />
          <polygon points={`${cx + r*0.35},${cy - r*0.55} ${cx + r*0.26},${cy - r*0.38} ${cx + r*0.44},${cy - r*0.38}`}
            fill={`oklch(0.95 0.04 ${hue} / 0.70)`} />
          {/* Columbia River gorge — canyon path */}
          <path d={`M ${cx - r*0.88} ${cy + r*0.55} Q ${cx} ${cy + r*0.42} ${cx + r*0.88} ${cy + r*0.55}`}
            fill="none" stroke={`oklch(0.72 0.20 200 / 0.55)`} strokeWidth="3.5" strokeLinecap="round" />
          <path d={`M ${cx - r*0.88} ${cy + r*0.62} Q ${cx} ${cy + r*0.50} ${cx + r*0.88} ${cy + r*0.62}`}
            fill="none" stroke={`oklch(0.68 0.18 200 / 0.40)`} strokeWidth="2" strokeLinecap="round" />
          {/* Waterfall cascade */}
          <line x1={cx + r*0.20} y1={cy - r*0.15} x2={cx + r*0.22} y2={cy + r*0.42}
            stroke={`oklch(0.80 0.16 200 / 0.55)`} strokeWidth="2.5" strokeLinecap="round" />
          <line x1={cx + r*0.24} y1={cy + r*0.05} x2={cx + r*0.26} y2={cy + r*0.42}
            stroke={`oklch(0.78 0.14 200 / 0.35)`} strokeWidth="1.5" strokeLinecap="round" />
          {/* Stars above mountains */}
          {[[-0.50, -0.72], [0.0, -0.80], [0.55, -0.68], [-0.20, -0.78], [0.30, -0.75]].map(([dx, dy], i) => (
            <circle key={i} cx={cx + dx! * r} cy={cy + dy! * r} r={1.5 + (i % 2)}
              fill={`oklch(0.95 0.08 ${hue})`} opacity={0.70 + i * 0.05} />
          ))}
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
            width: size + 36,
            height: (size + 36) * 0.26,
            top: bodySize * 0.37,
            left: -8,
            borderRadius: "50%",
            border: `3px solid ${theme.ring}`,
            opacity: isActive ? Math.min((theme.ringOpacity ?? 0.5) * 1.5, 1) : (theme.ringOpacity ?? 0.5),
            transform: `rotateX(70deg) ${isActive ? "scale(1.06)" : "scale(1)"}`,
            boxShadow: isActive ? `0 0 18px 4px ${theme.ring}, 0 0 6px 1px ${theme.ring}` : `0 0 6px 1px ${theme.ring}`,
            transition: "opacity 0.5s ease, box-shadow 0.5s ease",
          }}
        />
      )}
      {/* Second ring */}
      {theme.ring2 && (
        <div
          className="absolute pointer-events-none"
          style={{
            width: size + 52,
            height: (size + 52) * 0.22,
            top: bodySize * 0.39,
            left: -16,
            borderRadius: "50%",
            border: `2px solid ${theme.ring2}`,
            opacity: isActive ? Math.min((theme.ring2Opacity ?? 0.35) * 1.4, 1) : (theme.ring2Opacity ?? 0.35),
            transform: "rotateX(70deg)",
            boxShadow: isActive ? `0 0 10px 2px ${theme.ring2}` : "none",
            transition: "opacity 0.5s ease",
          }}
        />
      )}
      {/* Third ring */}
      {theme.ring3 && (
        <div
          className="absolute pointer-events-none"
          style={{
            width: size + 68,
            height: (size + 68) * 0.18,
            top: bodySize * 0.41,
            left: -24,
            borderRadius: "50%",
            border: `1.5px solid ${theme.ring3}`,
            opacity: isActive ? Math.min((theme.ring3Opacity ?? 0.25) * 1.4, 1) : (theme.ring3Opacity ?? 0.25),
            transform: "rotateX(70deg)",
            transition: "opacity 0.5s ease",
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
          filter: festival.locked ? "saturate(0.35) brightness(0.50) contrast(0.85)" : "none",
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
        <div className="absolute inset-0" style={{ clipPath: "circle(50% at 50% 50%)" }}>
          <PlanetSurface detail={theme.detail} size={bodySize} hue={h} />
        </div>

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
            style={{ background: "oklch(0.04 0.02 300 / 0.60)" }}
          >
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: bodySize * 0.28,
                height: bodySize * 0.28,
                background: `oklch(0.72 0.22 ${h} / 0.15)`,
                border: `1px solid oklch(0.72 0.22 ${h} / 0.35)`,
              }}
            >
              <Lock className="w-4 h-4" style={{ color: `oklch(0.80 0.18 ${h} / 0.90)` }} />
            </div>
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
