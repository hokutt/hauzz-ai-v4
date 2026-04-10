import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, Plus, MessageSquare, Package, Clock, ChevronRight, Zap, Check, Truck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

const RAVE_FASHION = "https://d2xsxph8kpxj0f.cloudfront.net/310519663522663012/FxMGuZEdHFz8kEGUUru2UP/rave-fashion_d9f3949e.jpg";
const NEBULA_PINK = "https://d2xsxph8kpxj0f.cloudfront.net/310519663522663012/FxMGuZEdHFz8kEGUUru2UP/nebula-pink_118da7c1.jpg";
const GALAXY_STARS = "https://d2xsxph8kpxj0f.cloudfront.net/310519663522663012/FxMGuZEdHFz8kEGUUru2UP/galaxy-pink-stars_0875c3f7.jpg";

const FALLBACK_IMAGES = [RAVE_FASHION, NEBULA_PINK, GALAXY_STARS];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Chatting", color: "oklch(0.75 0.12 280)" },
  generating: { label: "Generating", color: "oklch(0.80 0.18 60)" },
  awaiting_approval: { label: "Ready to Review", color: "oklch(0.85 0.18 340)" },
  approved: { label: "Approved", color: "oklch(0.78 0.20 160)" },
  in_production: { label: "In Production", color: "oklch(0.78 0.20 160)" },
  complete: { label: "Complete", color: "oklch(0.78 0.20 160)" },
};

// Statuses that have a production order to track
const TRACKABLE_STATUSES = new Set(["in_production", "complete", "approved"]);

function ThreadCard({
  thread,
  index,
  onResume,
  onTrackOrder,
}: {
  thread: any;
  index: number;
  onResume: () => void;
  onTrackOrder: () => void;
}) {
  const selectedConcept = thread.selectedConcept;
  const firstConcept = thread.concepts?.[0];
  const previewConcept = selectedConcept ?? firstConcept;
  // Prefer FASHN render (photorealistic) over mood board image if available
  const fashnRenderUrl = (previewConcept as any)?.fashnRenderUrl as string | null | undefined;
  const moodBoardUrl = (previewConcept?.rawLlmOutput as any)?.conceptImageUrl as string | null | undefined;
  const imageUrl = fashnRenderUrl ?? moodBoardUrl ?? FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
  const hasFashnRender = !!fashnRenderUrl;
  const status = STATUS_LABELS[thread.status] ?? { label: thread.status, color: "oklch(0.6 0.05 300)" };
  const conceptCount = thread.concepts?.length ?? 0;
  const messageCount = thread.messageCount ?? 0;
  const createdAt = new Date(thread.createdAt);
  const timeAgo = formatTimeAgo(createdAt);
  const vibeKeywords = (thread.vibeKeywords as string[]) ?? [];
  const isTrackable = TRACKABLE_STATUSES.has(thread.status) && !!selectedConcept;

  return (
    <div
      className="group relative rounded-3xl overflow-hidden transition-all duration-300 hover:ring-1 hover:ring-primary/40"
      style={{ minHeight: 220 }}
    >
      {/* Background image */}
      <img
        src={imageUrl}
        alt={previewConcept?.storyName ?? "Design session"}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        onError={(e) => {
          (e.target as HTMLImageElement).src = FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />

      {/* Status badge */}
      <div className="absolute top-4 left-4">
        <span
          className="px-2.5 py-1 rounded-full text-xs font-bold glass"
          style={{ color: status.color }}
        >
          {status.label}
        </span>
      </div>

      {/* Selected indicator + FASHN badge */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        {hasFashnRender && (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-bold glass"
            style={{ color: "oklch(0.72 0.22 340)" }}
          >
            FASHN
          </span>
        )}
        {selectedConcept && (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "oklch(0.72 0.22 340)" }}
          >
            <Check className="w-3.5 h-3.5" style={{ color: "oklch(0.06 0.02 300)" }} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-base text-foreground mb-1 truncate">
              {selectedConcept?.storyName ?? (conceptCount > 0 ? `${conceptCount} concept${conceptCount !== 1 ? "s" : ""} generated` : "New session")}
            </h3>
            {vibeKeywords.length > 0 && (
              <p className="text-xs text-muted-foreground mb-2 truncate">
                {vibeKeywords.slice(0, 4).join(" · ")}
              </p>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {messageCount} messages
              </span>
              {conceptCount > 0 && (
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {conceptCount} concept{conceptCount !== 1 ? "s" : ""}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeAgo}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            {/* Track Order button — only for approved/in_production sessions */}
            {isTrackable && (
              <button
                onClick={(e) => { e.stopPropagation(); onTrackOrder(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-90"
                style={{ background: "oklch(0.72 0.22 160 / 0.25)", color: "oklch(0.78 0.20 160)", border: "1px solid oklch(0.72 0.22 160 / 0.4)" }}
              >
                <Truck className="w-3 h-3" />
                Track Order
              </button>
            )}
            {/* Resume button */}
            <button
              onClick={(e) => { e.stopPropagation(); onResume(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
              style={{ background: "oklch(0.72 0.22 340 / 0.2)", color: "oklch(0.85 0.18 340)", border: "1px solid oklch(0.72 0.22 340 / 0.4)" }}
            >
              <ChevronRight className="w-3 h-3" />
              {selectedConcept ? "View Design" : "Continue"}
            </button>
          </div>
        </div>

        {/* Venue */}
        <div className="mt-2 flex items-center gap-1.5">
          <span className="glass px-2 py-0.5 rounded-full text-xs" style={{ color: "oklch(0.75 0.12 340)" }}>
            {thread.venueSlug?.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
          </span>
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function MyDesigns() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();

  const threadsQuery = trpc.design.getMyThreads.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const threads = threadsQuery.data ?? [];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-6">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "oklch(0.72 0.22 340 / 0.15)" }}
        >
          <Sparkles className="w-8 h-8" style={{ color: "oklch(0.85 0.18 340)" }} />
        </div>
        <div className="text-center">
          <h2 className="font-display font-bold text-2xl text-foreground mb-2">Sign in to see your designs</h2>
          <p className="text-muted-foreground text-sm max-w-xs">
            Your design sessions are saved to your profile so you can pick up right where you left off.
          </p>
        </div>
        <Button
          style={{ background: "oklch(0.72 0.22 340)", color: "oklch(0.06 0.02 300)" }}
          onClick={() => window.location.href = getLoginUrl()}
        >
          Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 20% 10%, oklch(0.55 0.18 340 / 0.06) 0%, transparent 50%)",
        }}
      />

      {/* Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 glass-strong border-b border-border">
        <button
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Home</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full" style={{ background: "oklch(0.72 0.22 340)" }} />
          <span className="font-display font-bold text-base text-foreground">My Designs</span>
        </div>
        <Button
          size="sm"
          className="text-xs font-bold gap-1.5"
          style={{ background: "oklch(0.72 0.22 340)", color: "oklch(0.06 0.02 300)" }}
          onClick={() => navigate("/festival-map")}
        >
          <Plus className="w-3.5 h-3.5" />
          New Session
        </Button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display font-bold text-3xl text-foreground mb-2">
            Your Design Sessions
          </h1>
          <p className="text-muted-foreground text-sm">
            {threads.length > 0
              ? `${threads.length} session${threads.length !== 1 ? "s" : ""} — pick up where you left off or start a new one.`
              : "No sessions yet. Start your first design session below."}
          </p>
        </div>

        {/* Loading state */}
        {threadsQuery.isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-3xl animate-pulse"
                style={{ height: 220, background: "oklch(0.12 0.03 300)" }}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!threadsQuery.isLoading && threads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
              style={{ background: "oklch(0.72 0.22 340 / 0.1)", border: "1px dashed oklch(0.72 0.22 340 / 0.3)" }}
            >
              <Zap className="w-10 h-10" style={{ color: "oklch(0.72 0.22 340 / 0.5)" }} />
            </div>
            <h3 className="font-display font-bold text-xl text-foreground mb-2">No sessions yet</h3>
            <p className="text-muted-foreground text-sm max-w-xs mb-6">
              Start your first design session by choosing a festival and chatting with the HAUZZ AI.
            </p>
            <Button
              style={{ background: "oklch(0.72 0.22 340)", color: "oklch(0.06 0.02 300)" }}
              onClick={() => navigate("/festival-map")}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Start Designing
            </Button>
          </div>
        )}

        {/* Thread grid */}
        {threads.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {threads.map((thread: any, i: number) => (
              <ThreadCard
                key={thread.id}
                thread={thread}
                index={i}
                onResume={() => navigate(`/design-studio?requestId=${thread.id}`)}
                onTrackOrder={() => navigate(`/my-order?requestId=${thread.id}`)}
              />
            ))}
          </div>
        )}

        {/* Stats bar */}
        {threads.length > 0 && (
          <div
            className="mt-8 rounded-2xl p-4 flex items-center justify-around gap-4"
            style={{ background: "oklch(0.10 0.02 300)", border: "1px solid oklch(0.72 0.22 340 / 0.15)" }}
          >
            {[
              { label: "Sessions", value: threads.length },
              { label: "Concepts Generated", value: threads.reduce((sum: number, t: any) => sum + (t.concepts?.length ?? 0), 0) },
              { label: "Approved", value: threads.filter((t: any) => t.selectedConcept).length },
              { label: "In Production", value: threads.filter((t: any) => ["in_production", "complete"].includes(t.status)).length },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-display font-bold text-2xl text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
