import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Sparkles, Zap, Star, RefreshCw, Check, ChevronRight, Mic, MicOff, Loader2, Package, Palette, Scissors, AlertTriangle, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

const RAVE_FASHION = "https://d2xsxph8kpxj0f.cloudfront.net/310519663522663012/FxMGuZEdHFz8kEGUUru2UP/rave-fashion_d9f3949e.jpg";
const NEBULA_PINK = "https://d2xsxph8kpxj0f.cloudfront.net/310519663522663012/FxMGuZEdHFz8kEGUUru2UP/nebula-pink_118da7c1.jpg";
const GALAXY_STARS = "https://d2xsxph8kpxj0f.cloudfront.net/310519663522663012/FxMGuZEdHFz8kEGUUru2UP/galaxy-pink-stars_0875c3f7.jpg";

// ── Concept card data ─────────────────────────────────────────────────────────
interface ConceptCardData {
  id: number;
  storyName: string;
  storyDescription: string;
  garments: string[];
  palette: string[];
  manufacturabilityScore: number;
  imageUrl?: string | null;
}

function ConceptCard({
  concept,
  isSelected,
  onSelect,
  onReject,
  index,
}: {
  concept: ConceptCardData;
  isSelected: boolean;
  onSelect: () => void;
  onReject?: () => void;
  index: number;
}) {
  const fallbackImages = [RAVE_FASHION, NEBULA_PINK, GALAXY_STARS];
  const img = concept.imageUrl ?? fallbackImages[index % fallbackImages.length];

  return (
    <div
      className={`relative rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 group ${
        isSelected ? "ring-2 ring-primary glow-pink" : "hover:ring-1 hover:ring-primary/40"
      }`}
      onClick={onSelect}
      style={{ minHeight: 280 }}
    >
      <img
        src={img}
        alt={concept.storyName}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        onError={(e) => {
          (e.target as HTMLImageElement).src = fallbackImages[index % fallbackImages.length];
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

      {concept.imageUrl && (
        <div
          className="absolute top-4 right-12 px-2 py-0.5 rounded-full text-xs glass"
          style={{ color: "oklch(0.85 0.18 340)" }}
        >
          AI Generated
        </div>
      )}

      {isSelected && (
        <div
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "oklch(0.72 0.22 340)" }}
        >
          <Check className="w-4 h-4" style={{ color: "oklch(0.06 0.02 300)" }} />
        </div>
      )}

      <div
        className="absolute top-4 left-4 px-2.5 py-1 rounded-full text-xs font-bold glass"
        style={{ color: concept.manufacturabilityScore >= 70 ? "oklch(0.78 0.20 160)" : "oklch(0.80 0.18 60)" }}
      >
        {concept.manufacturabilityScore}% viable
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-5">
        <h3 className="font-display font-bold text-lg text-foreground mb-1">{concept.storyName}</h3>
        <p className="text-muted-foreground text-xs leading-relaxed mb-3 line-clamp-2">
          {concept.storyDescription}
        </p>

        <div className="flex items-center gap-2 mb-3">
          {concept.palette.slice(0, 5).map((color, i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-full border border-border/50"
              title={color}
              style={{
                background: color.startsWith("#") || color.startsWith("rgb") || color.startsWith("oklch")
                  ? color
                  : `hsl(${(i * 60 + 300) % 360}, 70%, 60%)`,
              }}
            />
          ))}
          <span className="text-xs text-muted-foreground ml-1">{concept.palette.slice(0, 3).join(", ")}</span>
        </div>

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

        {!isSelected && onReject && (
          <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
            <button
              className="flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: "oklch(0.72 0.22 340 / 0.15)", color: "oklch(0.85 0.18 340)", border: "1px solid oklch(0.72 0.22 340 / 0.3)" }}
              onClick={onSelect}
            >
              Select
            </button>
            <button
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: "oklch(0.65 0.10 20 / 0.15)", color: "oklch(0.75 0.12 20)", border: "1px solid oklch(0.65 0.10 20 / 0.3)" }}
              onClick={onReject}
            >
              Reject
            </button>
          </div>
        )}
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
      <div
        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
        style={{
          background: isUser ? "oklch(0.55 0.18 280)" : "oklch(0.72 0.22 340 / 0.2)",
          color: isUser ? "oklch(0.97 0.01 300)" : "oklch(0.85 0.18 340)",
        }}
      >
        {isUser ? "U" : <Sparkles className="w-4 h-4" />}
      </div>
      <div
        className="max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed glass"
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

// ── Voice recorder hook ───────────────────────────────────────────────────────
function useVoiceRecorder(onTranscript: (text: string) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const transcribeMutation = trpc.voice.transcribe.useMutation();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(",")[1];
          setIsTranscribing(true);
          try {
            const result = await transcribeMutation.mutateAsync({
              audioBase64: base64,
              mimeType: "audio/webm",
              language: "en",
              prompt: "Festival fashion description: vibe, colors, garments, aesthetic",
            });
            if (result.text) {
              onTranscript(result.text);
              toast.success("Voice transcribed!");
            }
          } catch (err: any) {
            toast.error(`Transcription failed: ${err?.message ?? "Unknown error"}`);
          } finally {
            setIsTranscribing(false);
          }
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      toast.error("Microphone access denied. Please allow microphone access.");
    }
  }, [transcribeMutation, onTranscript]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  return { isRecording, isTranscribing, startRecording, stopRecording };
}

// ── Generate Concepts Button (shown after chat has enough context) ─────────────
function GenerateConceptsBar({
  onGenerate,
  isAuthenticated,
}: {
  onGenerate: () => void;
  isAuthenticated: boolean;
}) {
  return (
    <div
      className="mx-4 mb-3 p-3 rounded-2xl flex items-center justify-between gap-3"
      style={{ background: "oklch(0.72 0.22 340 / 0.1)", border: "1px solid oklch(0.72 0.22 340 / 0.3)" }}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 flex-shrink-0" style={{ color: "oklch(0.85 0.18 340)" }} />
        <span className="text-xs text-muted-foreground">
          {isAuthenticated
            ? "Ready to see your concepts?"
            : "Sign in to generate your custom concepts"}
        </span>
      </div>
      <Button
        size="sm"
        className="text-xs font-bold flex-shrink-0 glow-pink"
        style={{ background: "oklch(0.72 0.22 340)", color: "oklch(0.06 0.02 300)" }}
        onClick={onGenerate}
      >
        {isAuthenticated ? "Generate Concepts" : "Sign In & Generate"}
        <Sparkles className="ml-1.5 w-3 h-3" />
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
        "Welcome to the HAUZZ.AI Design Studio ✨\n\nI'm your AI design agent — powered by Claude. I'll build custom festival looks based on EDC's venue DNA — electric energy, cosmic vibes, and garments that move with you.\n\nTell me about your vibe to get started — what's your aesthetic? What colors speak to you? What kind of look are you going for?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [concepts, setConcepts] = useState<ConceptCardData[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [requestId, setRequestId] = useState<number | null>(null);
  const [showGenerateBar, setShowGenerateBar] = useState(false);
  const [showPacketModal, setShowPacketModal] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track how many user messages sent (show generate bar after 2+)
  const userMessageCountRef = useRef(0);

  const submitIntakeMutation = trpc.intake.submit.useMutation();
  const selectConceptMutation = trpc.design.selectConcept.useMutation();
  const rejectConceptMutation = trpc.design.rejectConcept.useMutation();
  const sendMessageMutation = trpc.aiChat.sendMessage.useMutation();
  const packetQuery = trpc.design.getPacket.useQuery(
    { designRequestId: requestId! },
    { enabled: showPacketModal && requestId !== null }
  );
  const utils = trpc.useUtils();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const addMessage = (role: "user" | "assistant", content: string) => {
    setMessages((prev) => [...prev, { role, content, timestamp: new Date() }]);
  };

  // Poll for concepts after intake submission
  const startPollingForConcepts = useCallback((reqId: number) => {
    let attempts = 0;
    const maxAttempts = 12;

    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      attempts++;
      try {
        const data = await utils.design.getConcepts.fetch({ designRequestId: reqId });
        if (data && data.length > 0) {
          clearInterval(pollIntervalRef.current!);
          pollIntervalRef.current = null;

          const mapped: ConceptCardData[] = data.map((c) => {
            const raw = c.rawLlmOutput as Record<string, unknown> | null;
            const imageUrl = raw?.conceptImageUrl as string | null | undefined;
            return {
              id: c.id,
              storyName: c.storyName,
              storyDescription: c.storyNarrative,
              garments: (c.garmentList as Array<{ garmentType: string }>).map((g) => g.garmentType),
              palette: c.palette as string[],
              manufacturabilityScore: Math.round(c.manufacturabilityScore * 100),
              imageUrl: imageUrl ?? null,
            };
          });

          setConcepts(mapped);
          setIsGenerating(false);
          setShowGenerateBar(false);
          addMessage(
            "assistant",
            `Your **${mapped.length} concept directions** are ready! 🎨\n\nEach one is built from EDC's venue DNA — check out the visual panel on the left. Select the direction that speaks to your soul, or reject any that don't resonate.`
          );
        } else if (attempts >= maxAttempts) {
          clearInterval(pollIntervalRef.current!);
          pollIntervalRef.current = null;
          setIsGenerating(false);
          addMessage(
            "assistant",
            "Concept generation is taking longer than expected. Your request is queued — refresh the page in a minute to see your concepts."
          );
        }
      } catch {
        // Silently retry
      }
    }, 5000);
  }, [utils.design.getConcepts]);

  // Extract vibe context from conversation history
  const extractVibeFromMessages = () => {
    const userMessages = messages.filter((m) => m.role === "user").map((m) => m.content);
    const combinedVibe = userMessages.join(", ");
    // Extract colors mentioned
    const colorWords = ["pink", "blue", "purple", "green", "gold", "silver", "white", "black", "red", "orange", "yellow", "holographic", "neon", "iridescent"];
    const foundColors = colorWords.filter((c) => combinedVibe.toLowerCase().includes(c));
    // Extract budget
    const budgetMatch = combinedVibe.match(/\$[\d,]+|\bunder\s+\$[\d,]+|\b[\d,]+\s*\+/i);
    return {
      vibeKeywords: userMessages.slice(-3).join(", ").slice(0, 200) || "festival, EDC, electric",
      colors: foundColors.length > 0 ? foundColors : ["open to suggestions"],
      budget: budgetMatch ? budgetMatch[0] : "$500–$1000",
    };
  };

  const handleGenerateConcepts = async () => {
    if (!isAuthenticated) {
      // Redirect to sign in, then come back
      window.location.href = getLoginUrl();
      return;
    }

    setShowGenerateBar(false);
    setIsGenerating(true);
    addMessage("assistant", "Perfect. Scanning EDC's venue DNA and building your concepts with Claude... This usually takes 20–40 seconds.");

    const { vibeKeywords, colors, budget } = extractVibeFromMessages();

    try {
      const intakeResult = await submitIntakeMutation.mutateAsync({
        venueSlug: "edc-las-vegas",
        eventDate: "2025-05-16",
        vibeKeywords: vibeKeywords.split(",").map((s) => s.trim()).filter(Boolean),
        garmentPreferences: [],
        colors: colors,
        avoidList: [],
        budgetBand: budget,
        bodyNotes: "",
        comfortCoverage: "moderate",
      });

      const reqId = intakeResult.designRequestId;
      setRequestId(reqId);

      addMessage("assistant", "Intake locked in. Claude is generating your story-led concept directions with AI mood board images — I'll update you when they're ready.");
      startPollingForConcepts(reqId);
    } catch (err: any) {
      setIsGenerating(false);
      addMessage("assistant", `Something went wrong generating your concepts: ${err?.message ?? "Unknown error"}. Try describing your vibe again.`);
    }
  };

  const handleRejectConcept = async (conceptId: number) => {
    const concept = concepts.find((c) => c.id === conceptId);
    if (!concept || !requestId) return;
    addMessage("user", `The **${concept.storyName}** direction isn't quite right.`);
    addMessage("assistant", `Got it — rejecting **${concept.storyName}** and triggering a fresh concept round. New directions will appear shortly.`);
    try {
      await rejectConceptMutation.mutateAsync({
        designRequestId: requestId,
        conceptCardId: conceptId,
        notes: `Rejected via Design Studio — ${concept.storyName}`,
      });
      setConcepts((prev) => prev.filter((c) => c.id !== conceptId));
    } catch (err: any) {
      addMessage("assistant", `Rejection noted. ${err?.message ? `(${err.message})` : ""}`);
    }
  };

  const handleSelectConcept = async (conceptId: number) => {
    setSelectedConcept(conceptId);
    const concept = concepts.find((c) => c.id === conceptId);
    if (!concept || !requestId) return;

    addMessage("user", `I love the **${concept.storyName}** direction.`);
    addMessage("assistant", `Excellent choice. Locking in **${concept.storyName}** and generating your full design packet — garment specs, materials, trims, and production notes.`);

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

  // Chat with Claude — public, no auth required
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isChatLoading) return;
    const msg = inputValue.trim();
    setInputValue("");
    addMessage("user", msg);
    setIsChatLoading(true);
    userMessageCountRef.current += 1;

    try {
      const history = messages.slice(-10).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
      history.push({ role: "user", content: msg });

      const result = await sendMessageMutation.mutateAsync({
        messages: history,
        designRequestId: requestId ?? undefined,
        venueSlug: "edc-las-vegas",
      });

      addMessage("assistant", result.text);

      // Show generate bar after user has shared enough context (2+ messages)
      if (userMessageCountRef.current >= 2 && concepts.length === 0 && !isGenerating) {
        setShowGenerateBar(true);
      }
    } catch (err: any) {
      addMessage("assistant", `I'm having a moment — try again. ${err?.message ? `(${err.message})` : ""}`);
    } finally {
      setIsChatLoading(false);
    }
  };

  const { isRecording, isTranscribing, startRecording, stopRecording } = useVoiceRecorder((text) => {
    setInputValue((prev) => (prev ? `${prev}, ${text}` : text));
  });

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
                  setRequestId(null);
                  userMessageCountRef.current = 0;
                  if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                  addMessage("assistant", "Starting fresh! Tell me your new vibe.");
                }}
              >
                <RefreshCw className="w-3 h-3" />
                Regenerate
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {concepts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
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
                    ? "Claude is scanning EDC venue DNA and building your story-led directions with AI mood boards..."
                    : "Chat with the AI about your vibe — after a few messages, hit Generate Concepts to see your custom directions."}
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
                    onReject={() => handleRejectConcept(concept.id)}
                  />
                ))}
              </div>
            )}
          </div>

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
                  onClick={() => setShowPacketModal(true)}
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
                <span className="text-xs text-muted-foreground">Claude · EDC DNA loaded</span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 relative z-10">
            {messages.map((msg, i) => (
              <ChatMessage key={i} msg={msg} />
            ))}
            {(isGenerating || isChatLoading) && (
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

          {/* Generate concepts bar — appears after 2+ messages */}
          {showGenerateBar && concepts.length === 0 && !isGenerating && (
            <GenerateConceptsBar
              onGenerate={handleGenerateConcepts}
              isAuthenticated={isAuthenticated}
            />
          )}

          {/* Chat input — always visible, works without auth */}
          <div className="flex-shrink-0 border-t border-border relative z-10 p-4 flex gap-3">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing}
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                isRecording ? "animate-pulse" : ""
              }`}
              style={{
                background: isRecording
                  ? "oklch(0.65 0.22 20)"
                  : isTranscribing
                  ? "oklch(0.55 0.10 300 / 0.5)"
                  : "oklch(0.72 0.22 340 / 0.15)",
                border: `1px solid ${isRecording ? "oklch(0.65 0.22 20 / 0.5)" : "oklch(0.72 0.22 340 / 0.3)"}`,
              }}
              title={isRecording ? "Stop recording" : "Speak your vibe"}
            >
              {isTranscribing ? (
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: "oklch(0.85 0.18 340)" }} />
              ) : isRecording ? (
                <MicOff className="w-4 h-4" style={{ color: "oklch(0.97 0.01 300)" }} />
              ) : (
                <Mic className="w-4 h-4" style={{ color: "oklch(0.85 0.18 340)" }} />
              )}
            </button>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
              placeholder="Tell me your vibe — aesthetic, colors, energy..."
              className="flex-1 glass border-border/50 text-foreground placeholder:text-muted-foreground/50 rounded-xl"
              disabled={isChatLoading || isGenerating}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isChatLoading || isGenerating}
              className="rounded-xl px-4"
              style={{ background: "oklch(0.72 0.22 340)", color: "oklch(0.06 0.02 300)" }}
            >
              {isChatLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Design Packet Modal ── */}
      <Dialog open={showPacketModal} onOpenChange={setShowPacketModal}>
        <DialogContent
          className="max-w-2xl w-full p-0 overflow-hidden"
          style={{ background: "oklch(0.08 0.02 300)", border: "1px solid oklch(0.72 0.22 340 / 0.3)" }}
        >
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle className="flex items-center gap-3 font-display text-xl text-foreground">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "oklch(0.72 0.22 340 / 0.15)" }}
              >
                <Package className="w-4 h-4" style={{ color: "oklch(0.85 0.18 340)" }} />
              </div>
              Design Packet
              {packetQuery.data && (
                <span className="text-sm font-normal text-muted-foreground">— {packetQuery.data.storyName}</span>
              )}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh]">
            <div className="px-6 py-5 space-y-6">
              {packetQuery.isLoading && (
                <div className="flex items-center justify-center py-12 gap-3">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: "oklch(0.85 0.18 340)" }} />
                  <span className="text-sm text-muted-foreground">Loading your design packet...</span>
                </div>
              )}

              {packetQuery.error && (
                <div
                  className="rounded-2xl p-4 flex items-start gap-3"
                  style={{ background: "oklch(0.65 0.22 20 / 0.1)", border: "1px solid oklch(0.65 0.22 20 / 0.3)" }}
                >
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "oklch(0.75 0.18 40)" }} />
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">Packet not ready yet</p>
                    <p className="text-xs text-muted-foreground">Your design packet is still being generated. This usually takes 20–40 seconds after selecting a concept. Try again in a moment.</p>
                  </div>
                </div>
              )}

              {packetQuery.data && (() => {
                const pkt = packetQuery.data;
                const garmentList = pkt.garmentList as Array<{ garmentType: string; description: string; materials: string[]; trims: string[]; constructionNotes: string }>;
                const palette = pkt.palette as string[];
                const materials = pkt.materials as string[];
                const trims = (pkt.trims as string[]) ?? [];
                const riskScore = pkt.productionRiskScore;
                const riskLabel = riskScore < 0.35 ? "Low Risk" : riskScore < 0.65 ? "Medium Risk" : "High Risk";
                const riskColor = riskScore < 0.35 ? "oklch(0.78 0.20 160)" : riskScore < 0.65 ? "oklch(0.80 0.18 60)" : "oklch(0.72 0.22 20)";

                return (
                  <>
                    {/* Risk + overview */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Production Risk</p>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 rounded-full" style={{ background: "oklch(0.18 0.03 300)" }}>
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{ width: `${Math.round(riskScore * 100)}%`, background: riskColor }}
                            />
                          </div>
                          <span className="text-xs font-semibold" style={{ color: riskColor }}>
                            {riskLabel} ({Math.round(riskScore * 100)}%)
                          </span>
                        </div>
                      </div>
                      {pkt.fileUrl && (
                        <a
                          href={pkt.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all hover:opacity-80"
                          style={{ background: "oklch(0.72 0.22 340 / 0.15)", color: "oklch(0.85 0.18 340)", border: "1px solid oklch(0.72 0.22 340 / 0.3)" }}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Download JSON
                        </a>
                      )}
                    </div>

                    {/* Palette */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Palette className="w-4 h-4" style={{ color: "oklch(0.85 0.18 340)" }} />
                        <span className="text-sm font-semibold text-foreground">Color Palette</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {palette.map((color, i) => (
                          <div key={i} className="flex items-center gap-2 glass px-3 py-1.5 rounded-xl">
                            <div
                              className="w-4 h-4 rounded-full border border-border/50 flex-shrink-0"
                              style={{
                                background: color.startsWith("#") || color.startsWith("rgb") || color.startsWith("oklch")
                                  ? color
                                  : `hsl(${(i * 60 + 300) % 360}, 70%, 60%)`,
                              }}
                            />
                            <span className="text-xs text-foreground">{color}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Materials */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Scissors className="w-4 h-4" style={{ color: "oklch(0.85 0.18 340)" }} />
                        <span className="text-sm font-semibold text-foreground">Materials &amp; Trims</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {materials.map((m, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{m}</Badge>
                        ))}
                        {trims.map((t, i) => (
                          <Badge key={`t-${i}`} variant="outline" className="text-xs">{t}</Badge>
                        ))}
                      </div>
                    </div>

                    {/* Garment list */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Package className="w-4 h-4" style={{ color: "oklch(0.85 0.18 340)" }} />
                        <span className="text-sm font-semibold text-foreground">Garment Specifications</span>
                        <span className="text-xs text-muted-foreground">({garmentList.length} pieces)</span>
                      </div>
                      <div className="space-y-3">
                        {garmentList.map((g, i) => (
                          <div
                            key={i}
                            className="rounded-2xl p-4"
                            style={{ background: "oklch(0.12 0.03 300)", border: "1px solid oklch(0.72 0.22 340 / 0.15)" }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-bold text-foreground">{g.garmentType}</span>
                              {g.materials?.length > 0 && (
                                <span className="text-xs text-muted-foreground">{g.materials.slice(0, 2).join(" · ")}</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed mb-2">{g.description}</p>
                            {g.constructionNotes && (
                              <p className="text-xs leading-relaxed" style={{ color: "oklch(0.75 0.12 340)" }}>
                                <span className="font-semibold">Construction: </span>{g.constructionNotes}
                              </p>
                            )}
                            {g.trims?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {g.trims.map((t, ti) => (
                                  <span key={ti} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "oklch(0.72 0.22 340 / 0.1)", color: "oklch(0.85 0.18 340)" }}>{t}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Construction notes */}
                    {pkt.constructionNotes && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="w-4 h-4" style={{ color: "oklch(0.85 0.18 340)" }} />
                          <span className="text-sm font-semibold text-foreground">Production Notes</span>
                        </div>
                        <div
                          className="rounded-2xl p-4"
                          style={{ background: "oklch(0.12 0.03 300)", border: "1px solid oklch(0.72 0.22 340 / 0.15)" }}
                        >
                          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{pkt.constructionNotes}</p>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
