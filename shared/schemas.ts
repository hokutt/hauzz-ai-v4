import { z } from "zod";

// ─── Intake ───────────────────────────────────────────────────────────────────

export const IntakeFormSchema = z.object({
  venueSlug: z.string().min(1, "Venue is required"),
  eventDate: z.string().optional(),
  vibeKeywords: z.array(z.string()).min(1, "At least one vibe keyword required"),
  garmentPreferences: z.array(z.string()).default([]),
  comfortCoverage: z.enum(["minimal", "moderate", "full"]),
  colors: z.array(z.string()).min(1, "At least one color required"),
  avoidList: z.array(z.string()).default([]),
  budgetBand: z.string().min(1, "Budget band is required"),
  bodyNotes: z.string().optional(),
});

export type IntakeFormInput = z.infer<typeof IntakeFormSchema>;

// ─── Concept Card (LLM Output) ────────────────────────────────────────────────

export const ConceptGarmentSchema = z.object({
  garmentType: z.string(),
  description: z.string(),
  materials: z.array(z.string()),
  trims: z.array(z.string()),
  constructionNotes: z.string(),
});

export const ConceptCardLLMSchema = z.object({
  storyName: z.string().min(1),
  storyNarrative: z.string().min(20),
  garmentList: z.array(ConceptGarmentSchema).min(1).max(8),
  palette: z.array(z.string()).min(2).max(8),
  materials: z.array(z.string()).min(1),
  trims: z.array(z.string()).default([]),
  vibeAlignment: z.number().min(0).max(1),
  manufacturabilityScore: z.number().min(0).max(1),
  productionRiskScore: z.number().min(0).max(1),
});

export type ConceptCardLLMOutput = z.infer<typeof ConceptCardLLMSchema>;

export const ConceptGenerationResponseSchema = z.object({
  concepts: z.array(ConceptCardLLMSchema).min(2).max(4),
});

export type ConceptGenerationResponse = z.infer<typeof ConceptGenerationResponseSchema>;

// ─── Design Packet ────────────────────────────────────────────────────────────

export const DesignPacketSchema = z.object({
  storyName: z.string(),
  garmentList: z.array(ConceptGarmentSchema),
  palette: z.array(z.string()),
  materials: z.array(z.string()),
  trims: z.array(z.string()),
  constructionNotes: z.string(),
  productionRiskScore: z.number().min(0).max(1),
  designRequestId: z.number(),
  conceptCardId: z.number(),
});

export type DesignPacketData = z.infer<typeof DesignPacketSchema>;

// ─── Vendor Scoring ───────────────────────────────────────────────────────────

export const VendorScoringWeights = {
  capability: 0.35,
  timeline: 0.25,
  reliability: 0.20,
  price: 0.10,
  communications: 0.10,
} as const;

export const VendorScoreBreakdownSchema = z.object({
  capability: z.object({ raw: z.number(), weight: z.number(), weighted: z.number() }),
  timeline: z.object({ raw: z.number(), weight: z.number(), weighted: z.number() }),
  reliability: z.object({ raw: z.number(), weight: z.number(), weighted: z.number() }),
  price: z.object({ raw: z.number(), weight: z.number(), weighted: z.number() }),
  communications: z.object({ raw: z.number(), weight: z.number(), weighted: z.number() }),
  total: z.number().min(0).max(1),
});

export type VendorScoreBreakdown = z.infer<typeof VendorScoreBreakdownSchema>;

// ─── Order Stage Machine ──────────────────────────────────────────────────────

export const ORDER_STAGES = [
  "inquiry_sent",
  "quote_received",
  "sample",
  "approved",
  "production",
  "qa",
  "shipped",
  "delivered",
] as const;

export const OrderStageSchema = z.enum(ORDER_STAGES);
export type OrderStage = z.infer<typeof OrderStageSchema>;

export function getNextStage(current: OrderStage): OrderStage | null {
  const idx = ORDER_STAGES.indexOf(current);
  if (idx === -1 || idx === ORDER_STAGES.length - 1) return null;
  return ORDER_STAGES[idx + 1];
}

export function isValidStageTransition(from: OrderStage, to: OrderStage): boolean {
  const fromIdx = ORDER_STAGES.indexOf(from);
  const toIdx = ORDER_STAGES.indexOf(to);
  return toIdx === fromIdx + 1;
}

// ─── Agent Log ────────────────────────────────────────────────────────────────

export const AgentLogStages = [
  "intake",
  "rag_retrieval",
  "concept_generation",
  "manufacturability_scoring",
  "approval",
  "packet_generation",
  "vendor_scoring",
  "order_transition",
  "error",
] as const;

export type AgentLogStage = (typeof AgentLogStages)[number];
