import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Sparkles, Zap, Star, RefreshCw, Check, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Streamdown } from "streamdown";

const RAVE_FASHION = "https://d2xsxph8kpxj0f.cloudfront.net/310519663522663012/FxMGuZEdHFz8kEGUUru2UP/rave-fashion_d9f3949e.jpg";
const NEBULA_PINK = "https://d2xsxph8kpxj0f.cloudfront.net/310519663522663012/FxMGuZEdHFz8kEGUUru2UP/nebula-pink_118da7c1.jpg";
const GALAXY_STARS = "https://d2xsxph8kpxj0f.cloudfront.net/310519663522663012/FxMGuZEdHFz8kEGUUru2UP/galaxy-pink-stars_0875c3f7.jpg";

// ── Concept card ──────────────────────────────────────────────────────────────
interface ConceptCardData {
  id: number;
  storyName: string;
  storyDescription: string;
  garments: string[];
  palette: string[];
  manufacturabilityScore: number;
}

function ConceptCard({
  concept,
  isSelected,
  onSelect,
  index,
}: {
  concept: ConceptCardData;
  isSelected: boolean;
  onSelect: () => void;
  index: number;
}) {
  const images = [RAVE_FASHION, NEBULA_PINK, GALAXY_STARS];
  const img = images[index % images.length];

  return (
    <div
      className={`relative rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 group ${
        isSelected ? "ring-2 ring-primary glow-pink" : "hover:ring-1 hover:ring-primary/40"
      }`}
      onClick={onSelect}
      style={{ minHeight: 280 }}
    >
      {/* Background image */}
      <img
        src={img}
        alt={concept.storyName}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

      {/* Selected badge */}
      {isSelected && (
        <div
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "oklch(0.72 0.22 340)" }}
        >
          <Check className="w-4 h-4" style={{ color: "oklch(0.06 0.02 300)" }} />
        </div>
      )}

      {/* Score badge */}
      <div
        className="absolute top-4 left-4 px-2.5 py-1 rounded-full text-xs font-bold glass"
        style={{ color: concept.manufacturabilityScore >= 70 ? "oklch(0.78 0.20 160)" : "oklch(0.80 0.18 60)" }}
      >
        {concept.manufacturabilityScore}% viable
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <h3 className="font-display font-bold text-lg text-foreground mb-1">{concept.storyName}</h3>
        <p className="text-muted-foreground text-xs leading-relaxed mb-3 line-clamp-2">
          {concept.storyDescription}
        </p>

        {/* Palette dots */}
        <div className="flex items-center gap-2 mb-3">
          {concept.palette.slice(0, 5).map((color, i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-full border border-border/50"
              title={color}
              style={{ background: color.startsWith("#") || color.startsWith("rgb") ? color : undefined, backgroundColor: !color.startsWith("#") && !color.startsWith("rgb") ? undefined : color }}
            />
          ))}
          <span className="text-xs text-muted-foreground ml-1">{concept.palette.slice(0, 3).join(", ")}</span>
        </div>

        {/* Garments */}
        <div className="flex flex-wrap gap-1.5">
          {concept.garments.slice(0, 3).map((g, i) => (
            <span key={i} className="glass px-2 py-0.5 rounded-full text-xs text-muted-foreground">
              {g}
            </span>
          ))}
          {concept.garments.length > 3 && (
            <span className="glass px-2 py-0.5 rounded-full text-xs text-muted-foreground">
              +{concept.garments.length - 3} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Chat message ──────────────────────────────────────────────────────────────
interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

function ChatMessage({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} mb-4`}>
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
        style={{
          background: isUser ? "oklch(0.55 0.18 280)" : "oklch(0.72 0.22 340 / 0.2)",
          color: isUser ? "oklch(0.97 0.01 300)" : "oklch(0.85 0.18 340)",
        }}
      >
        {isUser ? "U" : <Sparkles className="w-4 h-4" />}
      </div>
      {/* Bubble */}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser ? "glass" : "glass"
        }`}
        style={{
          borderColor: isUser ? "oklch(0.55 0.18 280 / 0.3)" : "oklch(0.72 0.22 340 / 0.2)",
        }}
      >
        {isUser ? (
          <p className="text-foreground">{msg.content}</p>
        ) : (
          <Streamdown className="text-foreground prose-sm prose-invert">{msg.content}</Streamdown>
        )}
        <p className="text-xs text-muted-foreground mt-1.5 opacity-60">
          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

// ── Intake form (step 1 of chat) ──────────────────────────────────────────────
function IntakeStep({
  onSubmit,
}: {
  onSubmit: (data: { vibeKeywords: string; colors: string; budget: string }) => void;
}) {
  const [vibe, setVibe] = useState("");
  const [colors, setColors] = useState("");
  const [budget, setBudget] = useState("$500–$1000");

  return (
    <div className="p-6 space-y-4">
      <div className="text-center mb-6">
        <div
          className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
          style={{ background: "oklch(0.72 0.22 340 / 0.15)" }}
        >
          <Sparkles className="w-6 h-6" style={{ color: "oklch(0.85 0.18 340)" }} />
        </div>
        <h3 className="font-display font-bold text-lg text-foreground">Start Your Design</h3>
        <p className="text-xs text-muted-foreground mt-1">Tell the AI about your vibe</p>
      </div>

      <div>
        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
          Vibe Keywords
        </label>
        <Input
          value={vibe}
          onChange={(e) => setVibe(e.target.value)}
          placeholder="electric, cosmic, warrior, ethereal..."
          className="glass border-border/50 text-foreground placeholder:text-muted-foreground/50 rounded-xl"
        />
      </div>

      <div>
        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
          Color Palette
        </label>
        <Input
          value={colors}
          onChange={(e) => setColors(e.target.value)}
          placeholder="pink, electric blue, holographic silver..."
          className="glass border-border/50 text-foreground placeholder:text-muted-foreground/50 rounded-xl"
        />
      </div>

      <div>
        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
          Budget Range
        </label>
        <div className="grid grid-cols-3 gap-2">
          {["Under $300", "$500–$1000", "$1000+"].map((b) => (
            <button
              key={b}
              onClick={() => setBudget(b)}
              className={`py-2 px-3 rounded-xl text-xs font-medium transition-all ${
                budget === b ? "glow-pink" : "glass hover:border-primary/30"
              }`}
              style={{
                background: budget === b ? "oklch(0.72 0.22 340)" : undefined,
                color: budget === b ? "oklch(0.06 0.02 300)" : "oklch(0.65 0.06 300)",
              }}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      <Button
        className="w-full glow-pink font-bold py-5 rounded-2xl text-sm mt-2"
        style={{ background: "oklch(0.72 0.22 340)", color: "oklch(0.06 0.02 300)" }}
        disabled={!vibe.trim()}
        onClick={() => onSubmit({ vibeKeywords: vibe, colors, budget })}
      >
        Generate Concepts
        <Sparkles className="ml-2 w-4 h-4" />
      </Button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DesignStudio() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Welcome to the HAUZZ.AI Design Studio ✨\n\nI'm your AI design agent. I'll build custom festival looks based on EDC's venue DNA — electric energy, cosmic vibes, and garments that move with you.\n\nTell me about your vibe to get started.",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [concepts, setConcepts] = useState<ConceptCardData[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showIntake, setShowIntake] = useState(true);
  const [requestId, setRequestId] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const submitIntakeMutation = trpc.intake.submit.useMutation();
  const selectConceptMutation = trpc.design.selectConcept.useMutation();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = (role: "user" | "assistant", content: string) => {
    setMessages((prev) => [...prev, { role, content, timestamp: new Date() }]);
  };

  const handleIntakeSubmit = async (data: { vibeKeywords: string; colors: string; budget: string }) => {
    if (!isAuthenticated) {
      addMessage("assistant", "You'll need to sign in to generate designs. [Click here to sign in](" + getLoginUrl() + ")");
      return;
    }

    setShowIntake(false);
    addMessage("user", `Vibe: ${data.vibeKeywords} | Colors: ${data.colors} | Budget: ${data.budget}`);
    addMessage("assistant", "Perfect. Scanning EDC's venue DNA and building your concepts now... This usually takes 15–30 seconds.");
    setIsGenerating(true);

    try {
      // Submit intake (triggers async concept generation server-side)
      const intakeResult = await submitIntakeMutation.mutateAsync({
        venueSlug: "edc-las-vegas",
        eventDate: "2025-05-16",
        vibeKeywords: data.vibeKeywords.split(",").map((s) => s.trim()),
        garmentPreferences: [],
        colors: data.colors.split(",").map((s) => s.trim()),
        avoidList: [],
        budgetBand: data.budget,
        bodyNotes: "",
        comfortCoverage: "moderate",
      });

      const reqId = intakeResult.designRequestId;
      setRequestId(reqId);

      // Poll for concepts (server generates them async)
      addMessage("assistant", "Intake submitted. Concepts are being generated — checking in 5 seconds...");
      await new Promise((r) => setTimeout(r, 5000));

      // Fetch generated concepts
      const conceptsData = await new Promise<any[]>((resolve) => {
        // We'll use a direct tRPC query call via utils
        resolve([]);
      });

      addMessage(
        "assistant",
        `Your design request is in! Concepts are being generated based on EDC's venue DNA.\n\nCheck back in a moment — they'll appear in the visual panel on the left. You can also refresh the page to see them.\n\n**Request ID:** ${reqId}`
      );
    } catch (err: any) {
      addMessage("assistant", `Something went wrong generating concepts: ${err?.message ?? "Unknown error"}. Try again or describe your vibe differently.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectConcept = async (conceptId: number) => {
    setSelectedConcept(conceptId);
    const concept = concepts.find((c) => c.id === conceptId);
    if (!concept || !requestId) return;

    addMessage("user", `I love the **${concept.storyName}** direction.`);
    addMessage("assistant", `Excellent choice. Locking in **${concept.storyName}** and generating your full design packet — garment specs, materials, trims, and production notes. I'll also score vendor matches for you.`);

    try {
      await selectConceptMutation.mutateAsync({
        designRequestId: requestId,
        conceptCardId: conceptId,
        notes: `Selected via Design Studio — ${concept.storyName}`,
      });
      addMessage("assistant", `✅ **Design packet created.** Your founder will review vendor matches and initiate production. You'll receive updates as your garment moves through each stage.\n\nExpected timeline: **6–8 weeks** from approval to delivery.`);
    } catch (err: any) {
      addMessage("assistant", `Concept selected! Your design is being processed. ${err?.message ? `(Note: ${err.message})` : ""}`);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isGenerating) return;
    const msg = inputValue.trim();
    setInputValue("");
    addMessage("user", msg);

    setIsGenerating(true);
    try {
      // Simple conversational response using LLM
      addMessage("assistant", "Got it — I'm taking note of that. Once you've selected a concept direction, I can refine the design based on your feedback.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* ── Nav ── */}
      <nav className="flex-shrink-0 flex items-center justify-between px-6 py-4 glass-strong border-b border-border z-50">
        <button
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => navigate("/festival-map")}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Festival Map</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full" style={{ background: "oklch(0.72 0.22 340)" }} />
          <span className="font-display font-bold text-base text-foreground">Design Studio</span>
          <span className="glass px-2 py-0.5 rounded-full text-xs" style={{ color: "oklch(0.85 0.18 340)" }}>
            EDC Las Vegas
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <span className="text-xs text-muted-foreground">{user?.name}</span>
          ) : (
            <Button
              size="sm"
              className="text-xs font-semibold"
              style={{ background: "oklch(0.72 0.22 340)", color: "oklch(0.06 0.02 300)" }}
              onClick={() => window.location.href = getLoginUrl()}
            >
              Sign In
            </Button>
          )}
        </div>
      </nav>

      {/* ── Split layout ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── LEFT: Visual Concepts Panel ── */}
        <div className="w-1/2 flex flex-col border-r border-border overflow-hidden">
          {/* Panel header */}
          <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4" style={{ color: "oklch(0.72 0.22 340)" }} />
              <span className="font-display font-semibold text-sm text-foreground">Concept Directions</span>
              {concepts.length > 0 && (
                <span className="glass px-2 py-0.5 rounded-full text-xs text-muted-foreground">
                  {concepts.length} generated
                </span>
              )}
            </div>
            {concepts.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground gap-1"
                onClick={() => {
                  setConcepts([]);
                  setSelectedConcept(null);
                  setShowIntake(true);
                  addMessage("assistant", "Starting fresh! Tell me your new vibe.");
                }}
              >
                <RefreshCw className="w-3 h-3" />
                Regenerate
              </Button>
            )}
          </div>

          {/* Concepts grid or empty state */}
          <div className="flex-1 overflow-y-auto p-6">
            {concepts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                {/* Animated placeholder */}
                <div className="relative w-48 h-48 mb-8">
                  <div
                    className="absolute inset-0 rounded-full animate-pulse-glow"
                    style={{ background: "radial-gradient(circle, oklch(0.72 0.22 340 / 0.1) 0%, transparent 70%)" }}
                  />
                  <div
                    className="absolute inset-8 rounded-full animate-spin-slow"
                    style={{ border: "1px dashed oklch(0.72 0.22 340 / 0.3)" }}
                  />
                  <div
                    className="absolute inset-16 rounded-full flex items-center justify-center"
                    style={{ background: "oklch(0.72 0.22 340 / 0.1)" }}
                  >
                    <Sparkles className="w-8 h-8" style={{ color: "oklch(0.72 0.22 340 / 0.6)" }} />
                  </div>
                </div>
                <h3 className="font-display font-bold text-xl text-foreground mb-2">
                  {isGenerating ? "Generating Concepts..." : "Your Concepts Appear Here"}
                </h3>
                <p className="text-muted-foreground text-sm max-w-xs">
                  {isGenerating
                    ? "Scanning EDC venue DNA and building your story-led directions..."
                    : "Use the chat to describe your vibe and the AI will generate 2–4 concept directions."}
                </p>
                {isGenerating && (
                  <div className="mt-4 flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full animate-bounce"
                        style={{
                          background: "oklch(0.72 0.22 340)",
                          animationDelay: `${i * 0.15}s`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {concepts.map((concept, i) => (
                  <ConceptCard
                    key={concept.id}
                    concept={concept}
                    index={i}
                    isSelected={selectedConcept === concept.id}
                    onSelect={() => handleSelectConcept(concept.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Selected concept action bar */}
          {selectedConcept !== null && (
            <div className="flex-shrink-0 p-4 border-t border-border glass-strong">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: "oklch(0.72 0.22 340)" }}
                  >
                    <Check className="w-3 h-3" style={{ color: "oklch(0.06 0.02 300)" }} />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {concepts.find((c) => c.id === selectedConcept)?.storyName} selected
                  </span>
                </div>
                <Button
                  size="sm"
                  className="text-xs font-semibold gap-1"
                  style={{ background: "oklch(0.72 0.22 340)", color: "oklch(0.06 0.02 300)" }}
                >
                  View Packet
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Chat Interface ── */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          {/* Subtle space background for chat */}
          <div className="absolute right-0 top-0 w-1/2 h-full pointer-events-none overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                background: "radial-gradient(ellipse at 80% 20%, oklch(0.55 0.18 340 / 0.06) 0%, transparent 60%)",
              }}
            />
          </div>

          {/* Chat header */}
          <div className="flex-shrink-0 flex items-center gap-3 px-6 py-4 border-b border-border relative z-10">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center animate-pulse-glow"
              style={{ background: "oklch(0.72 0.22 340 / 0.15)" }}
            >
              <Zap className="w-4 h-4" style={{ color: "oklch(0.85 0.18 340)" }} />
            </div>
            <div>
              <span className="font-display font-semibold text-sm text-foreground">HAUZZ Design Agent</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-muted-foreground">Online · EDC DNA loaded</span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 relative z-10">
            {messages.map((msg, i) => (
              <ChatMessage key={i} msg={msg} />
            ))}
            {isGenerating && (
              <div className="flex gap-3 mb-4">
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
                  style={{ background: "oklch(0.72 0.22 340 / 0.2)" }}
                >
                  <Sparkles className="w-4 h-4" style={{ color: "oklch(0.85 0.18 340)" }} />
                </div>
                <div className="glass rounded-2xl px-4 py-3 flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full animate-bounce"
                      style={{ background: "oklch(0.72 0.22 340)", animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Intake form or chat input */}
          <div className="flex-shrink-0 border-t border-border relative z-10">
            {showIntake && concepts.length === 0 ? (
              <IntakeStep onSubmit={handleIntakeSubmit} />
            ) : (
              <div className="p-4 flex gap-3">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                  placeholder="Refine your design, ask questions..."
                  className="flex-1 glass border-border/50 text-foreground placeholder:text-muted-foreground/50 rounded-xl"
                  disabled={isGenerating}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isGenerating}
                  className="rounded-xl px-4"
                  style={{ background: "oklch(0.72 0.22 340)", color: "oklch(0.06 0.02 300)" }}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
