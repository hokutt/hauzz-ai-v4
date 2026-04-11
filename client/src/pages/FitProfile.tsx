import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Ruler,
  Sparkles,
  ShoppingBag,
  ArrowLeft,
  Check,
  Camera,
  Info,
} from "lucide-react";

// ─── Size Chart Types ────────────────────────────────────────────────────────

type FitPreference = "fitted" | "relaxed" | "oversized";
type LengthPreference = "true_to_size" | "runs_small" | "runs_large";

const FIT_LABELS: Record<FitPreference, string> = {
  fitted: "Fitted — hugs the body",
  relaxed: "Relaxed — comfortable, not tight",
  oversized: "Oversized — loose, flowy",
};

const LENGTH_LABELS: Record<LengthPreference, string> = {
  true_to_size: "True to size",
  runs_small: "I usually size up (runs small)",
  runs_large: "I usually size down (runs large)",
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function FitProfile() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // ─── tRPC queries & mutations ──────────────────────────────────────────────
  const measurementsQuery = trpc.measurements.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const sizeChartsQuery = trpc.measurements.getSizeCharts.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const saveMutation = trpc.measurements.save.useMutation({
    onSuccess: () => {
      measurementsQuery.refetch();
      toast.success("Measurements saved!");
    },
    onError: (e) => toast.error(e.message),
  });
  const fromSizeChartMutation = trpc.measurements.fromSizeChart.useMutation({
    onSuccess: () => {
      measurementsQuery.refetch();
      toast.success("Measurements populated from size chart!");
    },
    onError: (e) => toast.error(e.message),
  });
  const aiEstimateMutation = trpc.measurements.aiEstimate.useMutation({
    onSuccess: (data) => {
      // Pre-fill manual fields with AI estimates
      if (data.bust) setBust(String(data.bust));
      if (data.waist) setWaist(String(data.waist));
      if (data.hips) setHips(String(data.hips));
      if (data.inseam) setInseam(String(data.inseam));
      if (data.shoulder) setShoulder(String(data.shoulder));
      if (data.height) setHeight(String(data.height));
      if (data.sizeLabel) setSizeLabel(data.sizeLabel);
      toast.success(`AI estimated your measurements (${data.confidence} confidence). Review and save!`);
    },
    onError: (e) => toast.error(e.message),
  });

  // ─── Manual input state ────────────────────────────────────────────────────
  const [bust, setBust] = useState("");
  const [waist, setWaist] = useState("");
  const [hips, setHips] = useState("");
  const [inseam, setInseam] = useState("");
  const [shoulder, setShoulder] = useState("");
  const [height, setHeight] = useState("");
  const [sizeLabel, setSizeLabel] = useState("");
  const [fitPreference, setFitPreference] = useState<FitPreference>("relaxed");
  const [lengthPreference, setLengthPreference] = useState<LengthPreference>("true_to_size");

  // ─── Size chart state ──────────────────────────────────────────────────────
  const [chartBrand, setChartBrand] = useState("standard");
  const [chartSize, setChartSize] = useState("");

  // ─── Hydrate from existing measurements ────────────────────────────────────
  useEffect(() => {
    const m = measurementsQuery.data;
    if (!m) return;
    if (m.bust) setBust(String(m.bust));
    if (m.waist) setWaist(String(m.waist));
    if (m.hips) setHips(String(m.hips));
    if (m.inseam) setInseam(String(m.inseam));
    if (m.shoulder) setShoulder(String(m.shoulder));
    if (m.height) setHeight(String(m.height));
    if (m.sizeLabel) setSizeLabel(m.sizeLabel);
    if (m.fitPreference) setFitPreference(m.fitPreference as FitPreference);
    if (m.lengthPreference) setLengthPreference(m.lengthPreference as LengthPreference);
  }, [measurementsQuery.data]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  function handleManualSave() {
    saveMutation.mutate({
      bust: bust ? parseFloat(bust) : undefined,
      waist: waist ? parseFloat(waist) : undefined,
      hips: hips ? parseFloat(hips) : undefined,
      inseam: inseam ? parseFloat(inseam) : undefined,
      shoulder: shoulder ? parseFloat(shoulder) : undefined,
      height: height ? parseFloat(height) : undefined,
      sizeLabel: (sizeLabel as "XS" | "S" | "M" | "L" | "XL" | "XXL") || undefined,
      fitPreference,
      lengthPreference,
      source: "manual",
    });
  }

  function handleSizeChartSave() {
    if (!chartSize) {
      toast.error("Pick a size first");
      return;
    }
    fromSizeChartMutation.mutate({
      brand: chartBrand,
      size: chartSize as "XS" | "S" | "M" | "L" | "XL" | "XXL",
      fitPreference,
      lengthPreference,
    });
  }

  // ─── Auth guard ────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full border-primary/20">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Sign In Required</CardTitle>
            <CardDescription>Log in to save your fit profile for custom garment production.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate("/")} className="rounded-2xl">
              <ArrowLeft className="size-4 mr-2" /> Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasMeasurements = !!measurementsQuery.data;
  const hasBodyPhoto = !!(user as any)?.bodyPhotoUrl;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1 as any)} className="rounded-xl">
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight">Fit Profile</h1>
            <p className="text-sm text-muted-foreground">Your measurements for custom garment production</p>
          </div>
          {hasMeasurements && (
            <Badge className="bg-green-500/15 text-green-400 border-green-500/30">
              <Check className="size-3 mr-1" /> Saved
            </Badge>
          )}
        </div>
      </div>

      {/* ─── Content ────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* Fit Preferences — always visible */}
        <Card className="border-primary/20 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingBag className="size-5 text-primary" /> Fit Preferences
            </CardTitle>
            <CardDescription>How do you like your clothes to fit?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Fit Style</Label>
              <RadioGroup value={fitPreference} onValueChange={(v) => setFitPreference(v as FitPreference)}>
                {(Object.entries(FIT_LABELS) as [FitPreference, string][]).map(([value, label]) => (
                  <div key={value} className="flex items-center space-x-3">
                    <RadioGroupItem value={value} id={`fit-${value}`} />
                    <Label htmlFor={`fit-${value}`} className="text-sm cursor-pointer">{label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-medium">Length / Sizing Tendency</Label>
              <RadioGroup value={lengthPreference} onValueChange={(v) => setLengthPreference(v as LengthPreference)}>
                {(Object.entries(LENGTH_LABELS) as [LengthPreference, string][]).map(([value, label]) => (
                  <div key={value} className="flex items-center space-x-3">
                    <RadioGroupItem value={value} id={`len-${value}`} />
                    <Label htmlFor={`len-${value}`} className="text-sm cursor-pointer">{label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* Measurement Input — tabbed: Manual | Size Chart | AI Estimate */}
        <Card className="border-primary/20 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Ruler className="size-5 text-primary" /> Body Measurements
            </CardTitle>
            <CardDescription>Enter your measurements, pick from a size chart, or let AI estimate from your photo.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="manual" className="w-full">
              <TabsList className="w-full grid grid-cols-3 mb-4">
                <TabsTrigger value="manual" className="text-xs sm:text-sm">
                  <Ruler className="size-3.5 mr-1.5 hidden sm:inline" /> Manual
                </TabsTrigger>
                <TabsTrigger value="size-chart" className="text-xs sm:text-sm">
                  <ShoppingBag className="size-3.5 mr-1.5 hidden sm:inline" /> Size Chart
                </TabsTrigger>
                <TabsTrigger value="ai-estimate" className="text-xs sm:text-sm">
                  <Sparkles className="size-3.5 mr-1.5 hidden sm:inline" /> AI Estimate
                </TabsTrigger>
              </TabsList>

              {/* ─── Manual Tab ──────────────────────────────────────────── */}
              <TabsContent value="manual" className="space-y-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Info className="size-3.5" /> All measurements in inches. Leave blank if unsure — we can estimate later.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <MeasurementField label="Bust" value={bust} onChange={setBust} placeholder="e.g. 34" />
                  <MeasurementField label="Waist" value={waist} onChange={setWaist} placeholder="e.g. 27" />
                  <MeasurementField label="Hips" value={hips} onChange={setHips} placeholder="e.g. 37" />
                  <MeasurementField label="Inseam" value={inseam} onChange={setInseam} placeholder="e.g. 30" />
                  <MeasurementField label="Shoulder" value={shoulder} onChange={setShoulder} placeholder="e.g. 16" />
                  <MeasurementField label="Height" value={height} onChange={setHeight} placeholder="e.g. 65" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">General Size</Label>
                  <Select value={sizeLabel} onValueChange={setSizeLabel}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select size (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {["XS", "S", "M", "L", "XL", "XXL"].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleManualSave}
                  disabled={saveMutation.isPending}
                  className="w-full rounded-2xl font-semibold"
                >
                  {saveMutation.isPending ? <Spinner className="size-4 mr-2" /> : <Check className="size-4 mr-2" />}
                  Save Measurements
                </Button>
              </TabsContent>

              {/* ─── Size Chart Tab ──────────────────────────────────────── */}
              <TabsContent value="size-chart" className="space-y-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Info className="size-3.5" /> Pick a brand you usually wear and your size — we'll fill in the measurements.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Brand</Label>
                    <Select value={chartBrand} onValueChange={setChartBrand}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(sizeChartsQuery.data ?? []).map((c) => (
                          <SelectItem key={c.brand} value={c.brand}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Size</Label>
                    <Select value={chartSize} onValueChange={setChartSize}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pick size" />
                      </SelectTrigger>
                      <SelectContent>
                        {["XS", "S", "M", "L", "XL", "XXL"].map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  onClick={handleSizeChartSave}
                  disabled={fromSizeChartMutation.isPending || !chartSize}
                  className="w-full rounded-2xl font-semibold"
                >
                  {fromSizeChartMutation.isPending ? <Spinner className="size-4 mr-2" /> : <ShoppingBag className="size-4 mr-2" />}
                  Use Size Chart
                </Button>
              </TabsContent>

              {/* ─── AI Estimate Tab ─────────────────────────────────────── */}
              <TabsContent value="ai-estimate" className="space-y-4">
                {hasBodyPhoto ? (
                  <>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                      <Camera className="size-5 text-green-400" />
                      <div>
                        <p className="text-sm font-medium text-green-400">Body photo detected</p>
                        <p className="text-xs text-muted-foreground">AI will analyze your photo to estimate measurements</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Info className="size-3.5" /> AI estimates are approximate. You can review and adjust before saving.
                    </p>
                    <Button
                      onClick={() => aiEstimateMutation.mutate()}
                      disabled={aiEstimateMutation.isPending}
                      className="w-full rounded-2xl font-semibold"
                    >
                      {aiEstimateMutation.isPending ? (
                        <>
                          <Spinner className="size-4 mr-2" /> Analyzing photo...
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-4 mr-2" /> Estimate from Photo
                        </>
                      )}
                    </Button>
                    {aiEstimateMutation.isSuccess && (
                      <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                        <p className="text-sm font-medium text-primary mb-2">AI Estimates Ready</p>
                        <p className="text-xs text-muted-foreground mb-3">
                          Review the measurements in the Manual tab, adjust if needed, then save.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleManualSave}
                          disabled={saveMutation.isPending}
                          className="rounded-xl"
                        >
                          <Check className="size-3.5 mr-1.5" /> Save AI Estimates
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center">
                      <Camera className="size-7 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">No body photo uploaded</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Upload a full-body photo in the Design Studio to use AI estimation
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate("/design-studio")} className="rounded-xl mt-2">
                      Go to Design Studio
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* ─── Current Measurements Summary ──────────────────────────────── */}
        {hasMeasurements && measurementsQuery.data && (
          <Card className="border-green-500/20 bg-green-500/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-green-400">
                <Check className="size-5" /> Your Saved Measurements
              </CardTitle>
              <CardDescription>
                These measurements will be included in all design packets sent to manufacturers.
                <br />
                <span className="text-xs">Source: {measurementsQuery.data.source}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {[
                  { label: "Bust", value: measurementsQuery.data.bust },
                  { label: "Waist", value: measurementsQuery.data.waist },
                  { label: "Hips", value: measurementsQuery.data.hips },
                  { label: "Inseam", value: measurementsQuery.data.inseam },
                  { label: "Shoulder", value: measurementsQuery.data.shoulder },
                  { label: "Height", value: measurementsQuery.data.height },
                ].filter(m => m.value != null).map((m) => (
                  <div key={m.label} className="text-center p-2 rounded-lg bg-card/60 border border-border/30">
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                    <p className="text-lg font-bold">{m.value}"</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {measurementsQuery.data.sizeLabel && (
                  <Badge variant="outline" className="text-xs">Size: {measurementsQuery.data.sizeLabel}</Badge>
                )}
                <Badge variant="outline" className="text-xs">Fit: {measurementsQuery.data.fitPreference}</Badge>
                <Badge variant="outline" className="text-xs">Length: {measurementsQuery.data.lengthPreference?.replace(/_/g, " ")}</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── Continue to Design Studio ─────────────────────────────────── */}
        <div className="flex justify-center pb-8">
          <Button
            onClick={() => navigate("/design-studio")}
            className="rounded-2xl px-8 font-semibold"
            size="lg"
          >
            Continue to Design Studio
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Measurement Input Field ─────────────────────────────────────────────────

function MeasurementField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label} (in)</Label>
      <Input
        type="number"
        step="0.5"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10"
      />
    </div>
  );
}
