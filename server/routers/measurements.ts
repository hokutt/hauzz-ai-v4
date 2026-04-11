import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getUserMeasurements, upsertUserMeasurements } from "../db";
import Anthropic from "@anthropic-ai/sdk";

// ─── Size Chart Presets ──────────────────────────────────────────────────────

const SIZE_CHARTS: Record<string, Record<string, { bust: number; waist: number; hips: number }>> = {
  standard: {
    XS:  { bust: 31, waist: 24, hips: 34 },
    S:   { bust: 33, waist: 26, hips: 36 },
    M:   { bust: 35, waist: 28, hips: 38 },
    L:   { bust: 38, waist: 31, hips: 41 },
    XL:  { bust: 41, waist: 34, hips: 44 },
    XXL: { bust: 44, waist: 37, hips: 47 },
  },
  iheartraves: {
    XS:  { bust: 30, waist: 23, hips: 33 },
    S:   { bust: 32, waist: 25, hips: 35 },
    M:   { bust: 34, waist: 27, hips: 37 },
    L:   { bust: 37, waist: 30, hips: 40 },
    XL:  { bust: 40, waist: 33, hips: 43 },
    XXL: { bust: 43, waist: 36, hips: 46 },
  },
  dollskill: {
    XS:  { bust: 31.5, waist: 24.5, hips: 34.5 },
    S:   { bust: 33.5, waist: 26.5, hips: 36.5 },
    M:   { bust: 35.5, waist: 28.5, hips: 38.5 },
    L:   { bust: 38.5, waist: 31.5, hips: 41.5 },
    XL:  { bust: 41.5, waist: 34.5, hips: 44.5 },
    XXL: { bust: 44.5, waist: 37.5, hips: 47.5 },
  },
};

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const MeasurementsInputSchema = z.object({
  bust: z.number().min(20).max(60).optional(),
  waist: z.number().min(18).max(55).optional(),
  hips: z.number().min(25).max(65).optional(),
  inseam: z.number().min(20).max(40).optional(),
  shoulder: z.number().min(12).max(24).optional(),
  height: z.number().min(48).max(84).optional(),
  sizeLabel: z.enum(["XS", "S", "M", "L", "XL", "XXL"]).optional(),
  fitPreference: z.enum(["fitted", "relaxed", "oversized"]).default("relaxed"),
  lengthPreference: z.enum(["true_to_size", "runs_small", "runs_large"]).default("true_to_size"),
  source: z.enum(["manual", "size-chart", "ai-estimate"]).default("manual"),
});

// ─── Router ──────────────────────────────────────────────────────────────────

export const measurementsRouter = router({
  /**
   * Get the current user's measurements. Returns null if none saved.
   */
  get: protectedProcedure.query(async ({ ctx }) => {
    return (await getUserMeasurements(ctx.user.id)) ?? null;
  }),

  /**
   * Save or update the current user's measurements (manual input).
   */
  save: protectedProcedure
    .input(MeasurementsInputSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await upsertUserMeasurements({
        userId: ctx.user.id,
        bust: input.bust ?? null,
        waist: input.waist ?? null,
        hips: input.hips ?? null,
        inseam: input.inseam ?? null,
        shoulder: input.shoulder ?? null,
        height: input.height ?? null,
        sizeLabel: input.sizeLabel ?? null,
        fitPreference: input.fitPreference,
        lengthPreference: input.lengthPreference,
        source: input.source,
      });
      return result ?? null;
    }),

  /**
   * Populate measurements from a size chart preset.
   * User picks a brand + size → we fill in bust/waist/hips automatically.
   */
  fromSizeChart: protectedProcedure
    .input(z.object({
      brand: z.string().min(1),
      size: z.enum(["XS", "S", "M", "L", "XL", "XXL"]),
      fitPreference: z.enum(["fitted", "relaxed", "oversized"]).default("relaxed"),
      lengthPreference: z.enum(["true_to_size", "runs_small", "runs_large"]).default("true_to_size"),
    }))
    .mutation(async ({ ctx, input }) => {
      const chart = SIZE_CHARTS[input.brand.toLowerCase()] ?? SIZE_CHARTS.standard;
      const measurements = chart[input.size];
      if (!measurements) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Size ${input.size} not found in chart` });
      }

      const result = await upsertUserMeasurements({
        userId: ctx.user.id,
        bust: measurements.bust,
        waist: measurements.waist,
        hips: measurements.hips,
        inseam: null,
        shoulder: null,
        height: null,
        sizeLabel: input.size,
        fitPreference: input.fitPreference,
        lengthPreference: input.lengthPreference,
        source: "size-chart",
      });
      return result ?? null;
    }),

  /**
   * AI-estimate measurements from the user's body photo using Claude Vision.
   * Requires the user to have a body photo uploaded.
   * Returns estimated measurements that the user can review and confirm.
   */
  aiEstimate: protectedProcedure.mutation(async ({ ctx }) => {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "ANTHROPIC_API_KEY not configured" });
    }

    // Get user's body photo
    const { getDb } = await import("../db.js");
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const { users } = await import("../../drizzle/schema.js");
    const { eq } = await import("drizzle-orm");
    const userRows = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
    const user = userRows[0];

    if (!user?.bodyPhotoUrl) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Upload a body photo first — we need it to estimate your measurements",
      });
    }

    const prompt = `You are a professional fashion sizing expert. Analyze this full-body photo and estimate the person's body measurements for custom garment production.

Return ONLY a valid JSON object with these fields (all measurements in inches):
{
  "bust": <number>,
  "waist": <number>,
  "hips": <number>,
  "inseam": <number or null if not estimable>,
  "shoulder": <number>,
  "height": <number or null if not estimable>,
  "sizeLabel": "<XS|S|M|L|XL|XXL>",
  "confidence": "<low|medium|high>"
}

Important:
- Estimate based on visible body proportions relative to standard human anatomy
- Use standard US women's sizing for sizeLabel
- Be conservative — it's better to slightly overestimate for custom festival garments
- If you cannot see enough of the body to estimate a measurement, use null
- Return ONLY the JSON, no explanation`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "url", url: user.bodyPhotoUrl },
            },
            { type: "text", text: prompt },
          ],
        }],
      });

      const text = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("");

      // Parse the JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned invalid format" });
      }

      const estimated = JSON.parse(jsonMatch[0]) as {
        bust?: number;
        waist?: number;
        hips?: number;
        inseam?: number | null;
        shoulder?: number;
        height?: number | null;
        sizeLabel?: string;
        confidence?: string;
      };

      return {
        bust: estimated.bust ?? null,
        waist: estimated.waist ?? null,
        hips: estimated.hips ?? null,
        inseam: estimated.inseam ?? null,
        shoulder: estimated.shoulder ?? null,
        height: estimated.height ?? null,
        sizeLabel: estimated.sizeLabel ?? null,
        confidence: estimated.confidence ?? "low",
        source: "ai-estimate" as const,
      };
    } catch (err) {
      if (err instanceof TRPCError) throw err;
      console.error("[measurements.aiEstimate] Claude vision failed:", err);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "AI measurement estimation failed — please enter measurements manually",
      });
    }
  }),

  /**
   * Get available size chart brands.
   */
  getSizeCharts: protectedProcedure.query(() => {
    return Object.entries(SIZE_CHARTS).map(([key, chart]) => ({
      brand: key,
      label: key === "standard" ? "Standard US" : key === "iheartraves" ? "iHeartRaves" : key === "dollskill" ? "Dolls Kill" : key,
      sizes: Object.keys(chart),
    }));
  }),
});
