import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, Truck, CheckCircle, Clock, Zap, Star, Scissors, ShieldCheck, MapPin } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

// ── Stage definitions ─────────────────────────────────────────────────────────
const ORDER_STAGES = [
  "inquiry_sent",
  "quote_received",
  "sample",
  "approved",
  "production",
  "qa",
  "shipped",
  "delivered",
] as const;

type OrderStage = (typeof ORDER_STAGES)[number];

const STAGE_META: Record<OrderStage, { label: string; description: string; icon: React.ReactNode; color: string }> = {
  inquiry_sent: {
    label: "Inquiry Sent",
    description: "Your design packet has been sent to the matched vendor for review.",
    icon: <Zap className="w-4 h-4" />,
    color: "oklch(0.78 0.15 200)",
  },
  quote_received: {
    label: "Quote Received",
    description: "The vendor has reviewed your design and sent back a production quote.",
    icon: <Star className="w-4 h-4" />,
    color: "oklch(0.80 0.18 60)",
  },
  sample: {
    label: "Sample",
    description: "A physical sample is being made so you can approve the fit and finish.",
    icon: <Scissors className="w-4 h-4" />,
    color: "oklch(0.78 0.20 280)",
  },
  approved: {
    label: "Sample Approved",
    description: "Sample approved — full production run is about to begin.",
    icon: <CheckCircle className="w-4 h-4" />,
    color: "oklch(0.72 0.22 340)",
  },
  production: {
    label: "In Production",
    description: "Your garment is being cut, sewn, and assembled by the vendor.",
    icon: <Package className="w-4 h-4" />,
    color: "oklch(0.80 0.18 60)",
  },
  qa: {
    label: "Quality Check",
    description: "Final quality inspection — every stitch, seam, and embellishment verified.",
    icon: <ShieldCheck className="w-4 h-4" />,
    color: "oklch(0.78 0.20 200)",
  },
  shipped: {
    label: "Shipped",
    description: "Your garment is on its way! Tracking info will be shared soon.",
    icon: <Truck className="w-4 h-4" />,
    color: "oklch(0.78 0.20 160)",
  },
  delivered: {
    label: "Delivered",
    description: "Your custom HAUZZ garment has arrived. Time to shine at EDC! ✨",
    icon: <MapPin className="w-4 h-4" />,
    color: "oklch(0.72 0.22 160)",
  },
};

function StageTimeline({ currentStage, stageHistory }: { currentStage: OrderStage; stageHistory: Array<{ stage: string; enteredAt: string }> }) {
  const currentIdx = ORDER_STAGES.indexOf(currentStage);
  const historyMap = new Map(stageHistory.map((s) => [s.stage, new Date(s.enteredAt)]));

  return (
    <div className="space-y-0">
      {ORDER_STAGES.map((stage, idx) => {
        const meta = STAGE_META[stage];
        const isCompleted = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isPending = idx > currentIdx;
        const enteredAt = historyMap.get(stage);

        return (
          <div key={stage} className="flex gap-4">
            {/* Connector column */}
            <div className="flex flex-col items-center flex-shrink-0 w-8">
              {/* Circle */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500"
                style={{
                  background: isCompleted
                    ? `${meta.color}30`
                    : isCurrent
                    ? `${meta.color}20`
                    : "oklch(0.12 0.02 300)",
                  border: `2px solid ${isCompleted ? meta.color : isCurrent ? meta.color : "oklch(0.22 0.03 300)"}`,
                  color: isCompleted || isCurrent ? meta.color : "oklch(0.40 0.04 300)",
                  boxShadow: isCurrent ? `0 0 16px ${meta.color}40` : "none",
                }}
              >
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  meta.icon
                )}
              </div>
              {/* Vertical line */}
              {idx < ORDER_STAGES.length - 1 && (
                <div
                  className="w-0.5 flex-1 my-1 transition-all duration-500"
                  style={{
                    background: isCompleted
                      ? `linear-gradient(to bottom, ${meta.color}, ${STAGE_META[ORDER_STAGES[idx + 1]].color})`
                      : "oklch(0.18 0.02 300)",
                    minHeight: 24,
                  }}
                />
              )}
            </div>

            {/* Content */}
            <div className={`pb-6 flex-1 min-w-0 ${idx === ORDER_STAGES.length - 1 ? "pb-0" : ""}`}>
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className="font-semibold text-sm transition-all"
                  style={{ color: isCompleted || isCurrent ? meta.color : "oklch(0.40 0.04 300)" }}
                >
                  {meta.label}
                </span>
                {isCurrent && (
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-bold animate-pulse"
                    style={{ background: `${meta.color}20`, color: meta.color }}
                  >
                    Current
                  </span>
                )}
              </div>
              <p
                className="text-xs leading-relaxed"
                style={{ color: isPending ? "oklch(0.35 0.03 300)" : "oklch(0.60 0.05 300)" }}
              >
                {meta.description}
              </p>
              {enteredAt && (
                <p className="text-xs mt-1" style={{ color: "oklch(0.45 0.04 300)" }}>
                  {enteredAt.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                  {" · "}
                  {enteredAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function OrderTracking() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const requestId = params.get("requestId") ? Number(params.get("requestId")) : null;

  const { isAuthenticated } = useAuth();

  const ordersQuery = trpc.production.getOrdersByRequest.useQuery(
    { designRequestId: requestId! },
    { enabled: isAuthenticated && requestId !== null, refetchInterval: 30000 }
  );

  const orders = ordersQuery.data ?? [];
  const order = orders[0] ?? null;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-6">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "oklch(0.72 0.22 340 / 0.15)" }}>
          <Package className="w-8 h-8" style={{ color: "oklch(0.85 0.18 340)" }} />
        </div>
        <div className="text-center">
          <h2 className="font-display font-bold text-2xl text-foreground mb-2">Sign in to track your order</h2>
          <p className="text-muted-foreground text-sm max-w-xs">Your production status is saved to your account.</p>
        </div>
        <Button style={{ background: "oklch(0.72 0.22 340)", color: "oklch(0.06 0.02 300)" }} onClick={() => window.location.href = getLoginUrl()}>
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
        style={{ background: "radial-gradient(ellipse at 50% 0%, oklch(0.55 0.18 340 / 0.07) 0%, transparent 60%)" }}
      />

      {/* Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 glass-strong border-b border-border">
        <button
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => navigate("/my-designs")}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">My Designs</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full" style={{ background: "oklch(0.72 0.22 340)" }} />
          <span className="font-display font-bold text-base text-foreground">Order Tracking</span>
        </div>
        <div className="w-24" />
      </nav>

      <div className="max-w-lg mx-auto px-6 py-8">
        {ordersQuery.isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div
              className="w-12 h-12 rounded-2xl animate-pulse flex items-center justify-center"
              style={{ background: "oklch(0.72 0.22 340 / 0.15)" }}
            >
              <Package className="w-6 h-6" style={{ color: "oklch(0.85 0.18 340)" }} />
            </div>
            <p className="text-muted-foreground text-sm">Loading your order...</p>
          </div>
        )}

        {!ordersQuery.isLoading && !order && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{ background: "oklch(0.72 0.22 340 / 0.1)", border: "1px dashed oklch(0.72 0.22 340 / 0.3)" }}
            >
              <Clock className="w-10 h-10" style={{ color: "oklch(0.72 0.22 340 / 0.5)" }} />
            </div>
            <div>
              <h3 className="font-display font-bold text-xl text-foreground mb-2">Production not started yet</h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                Your design packet has been approved and is being reviewed by the founder. A vendor will be matched and production will begin shortly.
              </p>
            </div>
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => navigate(requestId ? `/design-studio?requestId=${requestId}` : "/my-designs")}
            >
              Back to Design Studio
            </Button>
          </div>
        )}

        {order && (
          <div className="space-y-6">
            {/* Header card */}
            <div
              className="rounded-3xl p-6"
              style={{ background: "oklch(0.10 0.02 300)", border: "1px solid oklch(0.72 0.22 340 / 0.2)" }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Production Order</p>
                  <h1 className="font-display font-bold text-2xl text-foreground">#{order.id}</h1>
                </div>
                <div
                  className="px-3 py-1.5 rounded-full text-sm font-bold"
                  style={{
                    background: `${STAGE_META[order.currentStage as OrderStage]?.color ?? "oklch(0.72 0.22 340)"}20`,
                    color: STAGE_META[order.currentStage as OrderStage]?.color ?? "oklch(0.72 0.22 340)",
                  }}
                >
                  {STAGE_META[order.currentStage as OrderStage]?.label ?? order.currentStage.replace(/_/g, " ")}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Progress</span>
                  <span>{ORDER_STAGES.indexOf(order.currentStage as OrderStage) + 1} of {ORDER_STAGES.length} stages</span>
                </div>
                <div className="w-full h-2 rounded-full" style={{ background: "oklch(0.18 0.03 300)" }}>
                  <div
                    className="h-2 rounded-full transition-all duration-700"
                    style={{
                      width: `${((ORDER_STAGES.indexOf(order.currentStage as OrderStage) + 1) / ORDER_STAGES.length) * 100}%`,
                      background: "linear-gradient(to right, oklch(0.72 0.22 340), oklch(0.78 0.20 280))",
                    }}
                  />
                </div>
              </div>

              {order.quoteAmount && (
                <p className="text-xs text-muted-foreground mt-3">
                  Quote: <span className="font-semibold text-foreground">${order.quoteAmount.toLocaleString()} {order.currency ?? "USD"}</span>
                </p>
              )}
              {order.notes && (
                <p className="text-xs text-muted-foreground mt-1 italic">"{order.notes}"</p>
              )}
            </div>

            {/* Timeline */}
            <div
              className="rounded-3xl p-6"
              style={{ background: "oklch(0.10 0.02 300)", border: "1px solid oklch(0.72 0.22 340 / 0.15)" }}
            >
              <h2 className="font-display font-bold text-base text-foreground mb-6">Production Timeline</h2>
              <StageTimeline
                currentStage={order.currentStage as OrderStage}
                stageHistory={(order.stageHistory as Array<{ stage: string; enteredAt: string }>) ?? []}
              />
            </div>

            {/* What to expect */}
            <div
              className="rounded-3xl p-6"
              style={{ background: "oklch(0.10 0.02 300)", border: "1px solid oklch(0.72 0.22 340 / 0.15)" }}
            >
              <h2 className="font-display font-bold text-sm text-foreground mb-3">What to Expect</h2>
              <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                <p>Your garment is being crafted by a vetted festival fashion vendor matched to your design's specific requirements.</p>
                <p>Total timeline from approval to delivery is typically <span className="text-foreground font-semibold">6–8 weeks</span>. This page refreshes automatically every 30 seconds.</p>
                <p>Questions? Reply to any HAUZZ email or reach out at <span className="text-foreground">hello@hauzz.xyz</span>.</p>
              </div>
            </div>

            {/* Back button */}
            <Button
              variant="outline"
              className="w-full rounded-2xl"
              onClick={() => navigate(requestId ? `/design-studio?requestId=${requestId}` : "/my-designs")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Design Studio
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
