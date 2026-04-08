import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, LayoutDashboard, Users, Package, Truck, Activity,
  ChevronRight, RefreshCw, Zap, Star, CheckCircle, Clock, AlertCircle
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Streamdown } from "streamdown";

// ── Order stage badge ─────────────────────────────────────────────────────────
const STAGE_COLORS: Record<string, string> = {
  inquiry_sent: "oklch(0.78 0.15 200)",
  quote_received: "oklch(0.80 0.18 60)",
  sample: "oklch(0.78 0.20 280)",
  approved: "oklch(0.72 0.22 340)",
  production: "oklch(0.80 0.18 60)",
  qa: "oklch(0.78 0.20 200)",
  shipped: "oklch(0.72 0.22 160)",
  delivered: "oklch(0.72 0.22 160)",
};

function StageBadge({ stage }: { stage: string }) {
  const color = STAGE_COLORS[stage] ?? "oklch(0.65 0.06 300)";
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-xs font-semibold glass"
      style={{ color }}
    >
      {stage.replace(/_/g, " ")}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    pending: "oklch(0.80 0.18 60)",
    concepts_generated: "oklch(0.78 0.20 200)",
    concept_selected: "oklch(0.72 0.22 340)",
    packet_generated: "oklch(0.72 0.22 160)",
    in_production: "oklch(0.72 0.22 160)",
    delivered: "oklch(0.72 0.22 160)",
  };
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-xs font-medium glass"
      style={{ color: colorMap[status] ?? "oklch(0.65 0.06 300)" }}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactNode; color: string }) {
  return (
    <div className="glass rounded-2xl p-5 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}20`, color }}>
        {icon}
      </div>
      <div>
        <div className="font-display font-bold text-2xl text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

// ── Pipeline row ──────────────────────────────────────────────────────────────
function PipelineRow({ request, onSelect }: { request: any; onSelect: () => void }) {
  return (
    <div
      className="glass rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-primary/30 transition-all group"
      onClick={onSelect}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm text-foreground truncate">
            Request #{request.id}
          </span>
          <StatusBadge status={request.status} />
        </div>
        <div className="text-xs text-muted-foreground">
          {request.vibeKeywords?.slice(0, 3).join(", ")} · {request.budgetBand}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
    </div>
  );
}

// ── Order row ─────────────────────────────────────────────────────────────────
function OrderRow({ order, onAdvance, isAdvancing }: { order: any; onAdvance: (orderId: number) => void; isAdvancing?: boolean }) {
  return (
    <div className="glass rounded-2xl p-4 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm text-foreground">Order #{order.id}</span>
          <StageBadge stage={order.currentStage} />
        </div>
        <div className="text-xs text-muted-foreground">
          Request #{order.designRequestId} · Vendor #{order.vendorId}
        </div>
      </div>
      {order.currentStage !== "delivered" ? (
        <Button
          size="sm"
          disabled={isAdvancing}
          className="text-xs font-semibold flex-shrink-0 disabled:opacity-50"
          style={{ background: "oklch(0.72 0.22 340 / 0.15)", color: "oklch(0.85 0.18 340)", border: "1px solid oklch(0.72 0.22 340 / 0.3)" }}
          onClick={() => onAdvance(order.id)}
        >
          {isAdvancing ? (
            <><RefreshCw className="mr-1 w-3 h-3 animate-spin" />Advancing...</>
          ) : (
            <>Advance<ChevronRight className="ml-1 w-3 h-3" /></>
          )}
        </Button>
      ) : (
        <span className="text-xs font-semibold flex-shrink-0" style={{ color: "oklch(0.72 0.22 160)" }}>Delivered ✓</span>
      )}
    </div>
  );
}

// ── Pipeline detail modal ─────────────────────────────────────────────────────
function PipelineDetail({ requestId, onClose }: { requestId: number; onClose: () => void }) {
  const { data, isLoading } = trpc.admin.getFullPipeline.useQuery({ designRequestId: requestId });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "oklch(0.06 0.02 300 / 0.8)", backdropFilter: "blur(20px)" }}>
      <div className="glass-strong rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="font-display font-bold text-lg text-foreground">Request #{requestId} — Full Pipeline</h3>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</Button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading pipeline...</div>
        ) : data ? (
          <div className="p-6 space-y-6">
            {/* Request info */}
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Design Request</p>
              <div className="glass rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge status={data.request.status} />
                  <span className="text-xs text-muted-foreground">{data.request.budgetBand}</span>
                </div>
                <p className="text-sm text-foreground">
                  Vibe: {(data.request.vibeKeywords as string[])?.join(", ")}
                </p>
                <p className="text-sm text-muted-foreground">
                  Colors: {(data.request.colors as string[])?.join(", ")}
                </p>
              </div>
            </div>

            {/* Concepts */}
            {data.concepts.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Concept Cards ({data.concepts.length})
                </p>
                <div className="space-y-2">
                  {data.concepts.map((c: any) => (
                    <div key={c.id} className="glass rounded-2xl p-3 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-sm text-foreground">{c.storyName}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{c.manufacturabilityScore}% viable</span>
                      </div>
                      {c.isSelected && (
                        <span className="text-xs font-semibold" style={{ color: "oklch(0.72 0.22 340)" }}>Selected ✓</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Design packet */}
            {data.packet && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Design Packet</p>
                <div className="glass rounded-2xl p-4">
                    <p className="text-sm font-semibold text-foreground mb-1">{data.packet.storyName}</p>
                  <p className="text-xs text-muted-foreground">Risk score: {(data.packet.productionRiskScore * 100).toFixed(0)}/100</p>
                  {data.packet.fileUrl && (
                    <a href={data.packet.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs mt-2 block" style={{ color: "oklch(0.72 0.22 340)" }}>
                      View packet JSON →
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Vendor scores */}
            {data.vendorScores.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Vendor Rankings</p>
                <div className="space-y-2">
                  {data.vendorScores.map((vs: any) => (
                    <div key={vs.id} className="glass rounded-2xl p-3 flex items-center justify-between">
                      <span className="text-sm text-foreground">Vendor #{vs.vendorId}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">#{vs.vendorRank}</span>
                        <span className="font-bold text-sm" style={{ color: "oklch(0.72 0.22 340)" }}>
                          {vs.totalScore?.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Orders */}
            {data.orders.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Production Orders</p>
                <div className="space-y-2">
                  {data.orders.map((o: any) => (
                    <div key={o.id} className="glass rounded-2xl p-3 flex items-center justify-between">
                      <span className="text-sm text-foreground">Order #{o.id}</span>
                      <StageBadge stage={o.currentStage} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground">No data found.</div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "requests" | "orders" | "vendors" | "logs">("overview");

  const { data: dashboard, isLoading: dashLoading, refetch: refetchDash } = trpc.admin.getDashboard.useQuery(undefined, { enabled: isAuthenticated });
  const { data: allOrders, refetch: refetchOrders } = trpc.production.listOrders.useQuery(undefined, { enabled: isAuthenticated && activeTab === "orders" });
  const { data: allVendors } = trpc.production.listVendors.useQuery(undefined, { enabled: isAuthenticated && activeTab === "vendors" });
  const { data: recentLogs } = trpc.admin.getRecentLogs.useQuery({ limit: 30 }, { enabled: isAuthenticated && activeTab === "logs" });

  const [advancingId, setAdvancingId] = useState<number | null>(null);
  const advanceStageMutation = trpc.production.advanceStage.useMutation({
    onSuccess: () => { refetchOrders(); setAdvancingId(null); },
    onError: () => setAdvancingId(null),
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="glass rounded-3xl p-8 text-center max-w-sm">
          <h2 className="font-display font-bold text-xl text-foreground mb-2">Access Restricted</h2>
          <p className="text-muted-foreground text-sm mb-4">Sign in as a founder_admin to access this dashboard.</p>
          <Button onClick={() => navigate("/")} style={{ background: "oklch(0.72 0.22 340)", color: "oklch(0.06 0.02 300)" }}>
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  if (user?.role !== "founder_admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="glass rounded-3xl p-8 text-center max-w-sm">
          <h2 className="font-display font-bold text-xl text-foreground mb-2">Founder Access Only</h2>
          <p className="text-muted-foreground text-sm mb-4">This dashboard is restricted to founder_admin accounts.</p>
          <Button onClick={() => navigate("/")} style={{ background: "oklch(0.72 0.22 340)", color: "oklch(0.06 0.02 300)" }}>
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "requests", label: "Requests", icon: <Users className="w-4 h-4" /> },
    { id: "orders", label: "Orders", icon: <Package className="w-4 h-4" /> },
    { id: "vendors", label: "Vendors", icon: <Truck className="w-4 h-4" /> },
    { id: "logs", label: "Agent Logs", icon: <Activity className="w-4 h-4" /> },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      {/* Nebula background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[60vw] h-[60vh] rounded-full" style={{ background: "radial-gradient(ellipse, oklch(0.55 0.18 340 / 0.06) 0%, transparent 70%)", filter: "blur(80px)" }} />
      </div>

      {/* Nav */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-4 glass-strong border-b border-border">
        <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => navigate("/")}>
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Home</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full" style={{ background: "oklch(0.72 0.22 340)" }} />
          <span className="font-display font-bold text-base text-foreground">Admin Dashboard</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="glass px-2.5 py-1 rounded-full text-xs font-semibold" style={{ color: "oklch(0.72 0.22 340)" }}>
            founder_admin
          </span>
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => { refetchDash(); refetchOrders(); }}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        {/* Tab nav */}
        <div className="flex gap-1 mb-8 glass rounded-2xl p-1 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              style={activeTab === tab.id ? { background: "oklch(0.72 0.22 340 / 0.15)", color: "oklch(0.85 0.18 340)" } : {}}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {dashLoading ? (
              <div className="text-muted-foreground text-sm">Loading dashboard...</div>
            ) : dashboard ? (
              <>
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard label="Total Requests" value={dashboard.totalRequests} icon={<Users className="w-5 h-5" />} color="oklch(0.72 0.22 340)" />
                  <StatCard label="Active Orders" value={dashboard.totalOrders} icon={<Package className="w-5 h-5" />} color="oklch(0.78 0.20 200)" />
                  <StatCard label="Vendors" value={dashboard.totalVendors} icon={<Truck className="w-5 h-5" />} color="oklch(0.80 0.18 60)" />
                  <StatCard label="In Production" value={dashboard.stageBreakdown?.production ?? 0} icon={<Zap className="w-5 h-5" />} color="oklch(0.72 0.22 160)" />
                </div>

                {/* Status breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="glass rounded-3xl p-6">
                    <h3 className="font-display font-bold text-base text-foreground mb-4">Request Status</h3>
                    <div className="space-y-2">
                      {Object.entries(dashboard.statusBreakdown).map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between">
                          <StatusBadge status={status} />
                          <span className="font-bold text-sm text-foreground">{count as number}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="glass rounded-3xl p-6">
                    <h3 className="font-display font-bold text-base text-foreground mb-4">Order Stages</h3>
                    <div className="space-y-2">
                      {Object.keys(dashboard.stageBreakdown).length === 0 ? (
                        <p className="text-muted-foreground text-sm">No orders yet.</p>
                      ) : (
                        Object.entries(dashboard.stageBreakdown).map(([stage, count]) => (
                          <div key={stage} className="flex items-center justify-between">
                            <StageBadge stage={stage} />
                            <span className="font-bold text-sm text-foreground">{count as number}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Recent requests */}
                <div className="glass rounded-3xl p-6">
                  <h3 className="font-display font-bold text-base text-foreground mb-4">Recent Requests</h3>
                  {dashboard.recentRequests.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No requests yet. Users will appear here once they submit intake forms.</p>
                  ) : (
                    <div className="space-y-2">
                      {dashboard.recentRequests.map((req: any) => (
                        <PipelineRow key={req.id} request={req} onSelect={() => setSelectedRequestId(req.id)} />
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* ── Requests Tab ── */}
        {activeTab === "requests" && (
          <div className="glass rounded-3xl p-6">
            <h3 className="font-display font-bold text-base text-foreground mb-4">All Design Requests</h3>
            {!dashboard?.recentRequests?.length ? (
              <p className="text-muted-foreground text-sm">No requests yet.</p>
            ) : (
              <div className="space-y-2">
                {dashboard.recentRequests.map((req: any) => (
                  <PipelineRow key={req.id} request={req} onSelect={() => setSelectedRequestId(req.id)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Orders Tab ── */}
        {activeTab === "orders" && (
          <div className="glass rounded-3xl p-6">
            <h3 className="font-display font-bold text-base text-foreground mb-4">Production Orders</h3>
            {!allOrders?.length ? (
              <p className="text-muted-foreground text-sm">No production orders yet. Orders are created after a design packet is approved and a vendor is matched.</p>
            ) : (
              <div className="space-y-2">
                {allOrders.map((order: any) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    isAdvancing={advancingId === order.id}
                    onAdvance={(id) => {
                      const order = allOrders?.find((o: any) => o.id === id);
                      if (!order) return;
                      const stages = ["inquiry_sent","quote_received","sample","approved","production","qa","shipped","delivered"] as const;
                      const idx = stages.indexOf(order.currentStage);
                      if (idx < stages.length - 1) {
                        setAdvancingId(id);
                        advanceStageMutation.mutate({ orderId: id, toStage: stages[idx + 1] });
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Vendors Tab ── */}
        {activeTab === "vendors" && (
          <div className="glass rounded-3xl p-6">
            <h3 className="font-display font-bold text-base text-foreground mb-4">Vendor Profiles</h3>
            {!allVendors?.length ? (
              <p className="text-muted-foreground text-sm">No vendors loaded.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allVendors.map((v: any) => (
                  <div key={v.id} className="glass rounded-2xl p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-display font-bold text-base text-foreground">{v.name}</h4>
                        <p className="text-xs text-muted-foreground">{v.geography} · {v.priceBand}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg" style={{ color: "oklch(0.72 0.22 340)" }}>{v.reliabilityScore}</div>
                        <div className="text-xs text-muted-foreground">reliability</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {(v.capabilityTags as string[])?.slice(0, 4).map((tag: string) => (
                        <span key={tag} className="glass px-2 py-0.5 rounded-full text-xs text-muted-foreground">{tag}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>MOQ: {v.moq}</span>
                      <span>Turnaround: {v.turnaroundDays}d</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Logs Tab ── */}
        {activeTab === "logs" && (
          <div className="glass rounded-3xl p-6">
            <h3 className="font-display font-bold text-base text-foreground mb-4">Agent Logs</h3>
            {!recentLogs?.length ? (
              <p className="text-muted-foreground text-sm">No logs yet. Logs appear as the pipeline runs.</p>
            ) : (
              <div className="space-y-2 font-mono text-xs">
                {recentLogs.map((log: any) => (
                  <div key={log.id} className="glass rounded-xl p-3 flex gap-3">
                    <span className="text-muted-foreground flex-shrink-0">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                    <span
                      className="flex-shrink-0 font-bold"
                      style={{
                        color: log.level === "error" ? "oklch(0.65 0.22 20)" : log.level === "warn" ? "oklch(0.80 0.18 60)" : "oklch(0.72 0.22 340)",
                      }}
                    >
                      [{log.stage}]
                    </span>
                    <span className="text-foreground truncate">{log.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pipeline detail modal */}
      {selectedRequestId !== null && (
        <PipelineDetail requestId={selectedRequestId} onClose={() => setSelectedRequestId(null)} />
      )}
    </div>
  );
}
