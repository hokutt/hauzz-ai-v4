import { useEffect, useRef, useState } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  color: string;
}

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const colors = ["#ff2d78", "#00f5ff", "#bf5fff", "#ff2d78", "#00f5ff"];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Spawn particles
    const count = Math.min(80, Math.floor((window.innerWidth * window.innerHeight) / 14000));
    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.6 + 0.2,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const particles = particlesRef.current;

      // Draw connection lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(0, 245, 255, ${0.08 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(p.opacity * 255).toString(16).padStart(2, "0");
        ctx.fill();

        // Glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3);
        grad.addColorStop(0, p.color + "44");
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.fill();

        // Move
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}

export default function ComingSoon() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [focused, setFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at 30% 20%, #1a0030 0%, #080010 40%, #000308 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Space Grotesk', 'Syne', sans-serif",
        padding: "2rem 1rem",
      }}
    >
      {/* Ambient glow blobs */}
      <div
        style={{
          position: "fixed",
          top: "-20%",
          left: "-10%",
          width: "60vw",
          height: "60vw",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,45,120,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: "-20%",
          right: "-10%",
          width: "55vw",
          height: "55vw",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,245,255,0.10) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "40vw",
          height: "40vw",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(191,95,255,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <ParticleCanvas />

      {/* Main content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          maxWidth: "680px",
          width: "100%",
        }}
      >
        {/* Logo */}
        <div
          style={{
            marginBottom: "1.5rem",
            animation: "floatY 4s ease-in-out infinite",
          }}
        >
          <div
            style={{
              fontSize: "clamp(3.5rem, 12vw, 7rem)",
              fontFamily: "'Syne', 'Space Grotesk', sans-serif",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              lineHeight: 1,
              background: "linear-gradient(135deg, #ff2d78 0%, #bf5fff 40%, #00f5ff 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 40px rgba(255,45,120,0.5)) drop-shadow(0 0 80px rgba(0,245,255,0.3))",
              userSelect: "none",
            }}
          >
            HAUZZ.AI
          </div>
        </div>

        {/* Divider line */}
        <div
          style={{
            width: "120px",
            height: "2px",
            background: "linear-gradient(90deg, transparent, #ff2d78, #00f5ff, transparent)",
            marginBottom: "2rem",
            borderRadius: "2px",
          }}
        />

        {/* Coming Soon badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "rgba(255,45,120,0.08)",
            border: "1px solid rgba(255,45,120,0.3)",
            borderRadius: "100px",
            padding: "0.4rem 1.2rem",
            marginBottom: "1.5rem",
            backdropFilter: "blur(8px)",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#ff2d78",
              boxShadow: "0 0 8px #ff2d78, 0 0 16px #ff2d78",
              animation: "pulse 2s ease-in-out infinite",
            }}
          />
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#ff2d78",
            }}
          >
            Coming Soon
          </span>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: "clamp(1.6rem, 5vw, 2.8rem)",
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1.2,
            marginBottom: "1rem",
            letterSpacing: "-0.01em",
          }}
        >
          Something incredible
          <br />
          <span
            style={{
              background: "linear-gradient(90deg, #00f5ff, #bf5fff)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            is being built.
          </span>
        </h1>

        {/* Tagline */}
        <p
          style={{
            fontSize: "clamp(1rem, 2.5vw, 1.15rem)",
            color: "rgba(255,255,255,0.55)",
            lineHeight: 1.7,
            marginBottom: "2.5rem",
            maxWidth: "480px",
            fontWeight: 400,
          }}
        >
          AI-powered festival fashion is getting a full upgrade. We're redesigning the experience from the ground up — and it's going to be worth the wait.
        </p>

        {/* Email capture */}
        {!submitted ? (
          <form
            onSubmit={handleSubmit}
            style={{
              display: "flex",
              gap: "0",
              width: "100%",
              maxWidth: "440px",
              borderRadius: "12px",
              overflow: "hidden",
              border: focused ? "1px solid rgba(0,245,255,0.5)" : "1px solid rgba(255,255,255,0.12)",
              boxShadow: focused ? "0 0 24px rgba(0,245,255,0.15), 0 0 48px rgba(0,245,255,0.08)" : "none",
              transition: "border 0.3s ease, box-shadow 0.3s ease",
              background: "rgba(255,255,255,0.04)",
              backdropFilter: "blur(12px)",
            }}
          >
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                padding: "0.9rem 1.2rem",
                fontSize: "0.95rem",
                color: "#ffffff",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            />
            <button
              type="submit"
              style={{
                background: "linear-gradient(135deg, #ff2d78, #bf5fff)",
                border: "none",
                padding: "0.9rem 1.4rem",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "0.85rem",
                letterSpacing: "0.05em",
                cursor: "pointer",
                fontFamily: "'Space Grotesk', sans-serif",
                whiteSpace: "nowrap",
                transition: "opacity 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Join Waitlist
            </button>
          </form>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              background: "rgba(0,245,255,0.08)",
              border: "1px solid rgba(0,245,255,0.3)",
              borderRadius: "12px",
              padding: "0.9rem 1.6rem",
              color: "#00f5ff",
              fontSize: "0.95rem",
              fontWeight: 500,
              backdropFilter: "blur(12px)",
            }}
          >
            <span style={{ fontSize: "1.2rem" }}>✓</span>
            You're on the list. We'll be in touch.
          </div>
        )}

        {/* Social / hint */}
        <p
          style={{
            marginTop: "3rem",
            fontSize: "0.8rem",
            color: "rgba(255,255,255,0.25)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Stay tuned &nbsp;·&nbsp; hauzz.ai
        </p>
      </div>

      {/* Inline keyframes via style tag */}
      <style>{`
        @keyframes floatY {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px #ff2d78, 0 0 16px #ff2d78; }
          50% { opacity: 0.5; box-shadow: 0 0 4px #ff2d78; }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow-x: hidden; }
        input::placeholder { color: rgba(255,255,255,0.3); }
      `}</style>
    </div>
  );
}
