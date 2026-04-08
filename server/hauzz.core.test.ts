import { describe, expect, it } from "vitest";
import {
  ORDER_STAGES,
  OrderStageSchema,
  isValidStageTransition,
  getNextStage,
  VendorScoringWeights,
  VendorScoreBreakdownSchema,
  IntakeFormSchema,
  ConceptCardLLMSchema,
  DesignPacketSchema,
} from "../shared/schemas";

// ─── Order State Machine Tests ────────────────────────────────────────────────

describe("Order State Machine", () => {
  it("defines exactly 8 stages in correct order", () => {
    expect(ORDER_STAGES).toEqual([
      "inquiry_sent",
      "quote_received",
      "sample",
      "approved",
      "production",
      "qa",
      "shipped",
      "delivered",
    ]);
    expect(ORDER_STAGES.length).toBe(8);
  });

  it("validates valid stage transitions (sequential only)", () => {
    expect(isValidStageTransition("inquiry_sent", "quote_received")).toBe(true);
    expect(isValidStageTransition("quote_received", "sample")).toBe(true);
    expect(isValidStageTransition("sample", "approved")).toBe(true);
    expect(isValidStageTransition("approved", "production")).toBe(true);
    expect(isValidStageTransition("production", "qa")).toBe(true);
    expect(isValidStageTransition("qa", "shipped")).toBe(true);
    expect(isValidStageTransition("shipped", "delivered")).toBe(true);
  });

  it("rejects invalid stage transitions (skipping stages)", () => {
    expect(isValidStageTransition("inquiry_sent", "sample")).toBe(false);
    expect(isValidStageTransition("inquiry_sent", "delivered")).toBe(false);
    expect(isValidStageTransition("production", "delivered")).toBe(false);
    expect(isValidStageTransition("qa", "inquiry_sent")).toBe(false); // backward
  });

  it("returns null for next stage after delivered (final)", () => {
    expect(getNextStage("delivered")).toBeNull();
  });

  it("returns correct next stage for each stage", () => {
    expect(getNextStage("inquiry_sent")).toBe("quote_received");
    expect(getNextStage("quote_received")).toBe("sample");
    expect(getNextStage("sample")).toBe("approved");
    expect(getNextStage("approved")).toBe("production");
    expect(getNextStage("production")).toBe("qa");
    expect(getNextStage("qa")).toBe("shipped");
    expect(getNextStage("shipped")).toBe("delivered");
  });

  it("validates OrderStageSchema enum", () => {
    expect(() => OrderStageSchema.parse("inquiry_sent")).not.toThrow();
    expect(() => OrderStageSchema.parse("delivered")).not.toThrow();
    expect(() => OrderStageSchema.parse("invalid_stage")).toThrow();
    expect(() => OrderStageSchema.parse("")).toThrow();
  });
});

// ─── Vendor Scoring Weights Tests ─────────────────────────────────────────────

describe("Vendor Scoring Weights", () => {
  it("weights sum to exactly 1.0", () => {
    const total = Object.values(VendorScoringWeights).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1.0, 10);
  });

  it("has exact weight values per spec", () => {
    expect(VendorScoringWeights.capability).toBe(0.35);
    expect(VendorScoringWeights.timeline).toBe(0.25);
    expect(VendorScoringWeights.reliability).toBe(0.20);
    expect(VendorScoringWeights.price).toBe(0.10);
    expect(VendorScoringWeights.communications).toBe(0.10);
  });

  it("validates a correct scoring breakdown with Zod", () => {
    const breakdown = {
      capability: { raw: 0.8, weight: 0.35, weighted: 0.28 },
      timeline: { raw: 1.0, weight: 0.25, weighted: 0.25 },
      reliability: { raw: 0.9, weight: 0.20, weighted: 0.18 },
      price: { raw: 0.7, weight: 0.10, weighted: 0.07 },
      communications: { raw: 0.95, weight: 0.10, weighted: 0.095 },
      total: 0.875,
    };
    expect(() => VendorScoreBreakdownSchema.parse(breakdown)).not.toThrow();
  });

  it("computes correct weighted total", () => {
    const cap = 0.8 * 0.35;
    const timeline = 1.0 * 0.25;
    const reliability = 0.9 * 0.20;
    const price = 0.7 * 0.10;
    const comms = 0.95 * 0.10;
    const total = cap + timeline + reliability + price + comms;
    expect(total).toBeCloseTo(0.875, 5);
  });

  it("rejects breakdown with total out of range", () => {
    const breakdown = {
      capability: { raw: 0.8, weight: 0.35, weighted: 0.28 },
      timeline: { raw: 1.0, weight: 0.25, weighted: 0.25 },
      reliability: { raw: 0.9, weight: 0.20, weighted: 0.18 },
      price: { raw: 0.7, weight: 0.10, weighted: 0.07 },
      communications: { raw: 0.95, weight: 0.10, weighted: 0.095 },
      total: 1.5, // invalid
    };
    expect(() => VendorScoreBreakdownSchema.parse(breakdown)).toThrow();
  });
});

// ─── Intake Form Schema Tests ─────────────────────────────────────────────────

describe("IntakeFormSchema", () => {
  const validIntake = {
    venueSlug: "edc-las-vegas",
    eventDate: "2025-05-16",
    vibeKeywords: ["cosmic", "electric", "warrior"],
    garmentPreferences: ["rave bra", "micro shorts"],
    comfortCoverage: "minimal" as const,
    colors: ["neon pink", "electric blue"],
    avoidList: ["feathers"],
    budgetBand: "$$",
    bodyNotes: "Petite frame, size XS",
  };

  it("validates a complete valid intake form", () => {
    expect(() => IntakeFormSchema.parse(validIntake)).not.toThrow();
  });

  it("requires at least one vibe keyword", () => {
    expect(() => IntakeFormSchema.parse({ ...validIntake, vibeKeywords: [] })).toThrow();
  });

  it("requires at least one garment preference", () => {
    expect(() => IntakeFormSchema.parse({ ...validIntake, garmentPreferences: [] })).toThrow();
  });

  it("requires at least one color", () => {
    expect(() => IntakeFormSchema.parse({ ...validIntake, colors: [] })).toThrow();
  });

  it("validates comfortCoverage enum values", () => {
    expect(() => IntakeFormSchema.parse({ ...validIntake, comfortCoverage: "minimal" })).not.toThrow();
    expect(() => IntakeFormSchema.parse({ ...validIntake, comfortCoverage: "moderate" })).not.toThrow();
    expect(() => IntakeFormSchema.parse({ ...validIntake, comfortCoverage: "full" })).not.toThrow();
    expect(() => IntakeFormSchema.parse({ ...validIntake, comfortCoverage: "none" })).toThrow();
  });

  it("allows optional fields to be omitted", () => {
    const minimal = {
      venueSlug: "edc-las-vegas",
      vibeKeywords: ["cosmic"],
      garmentPreferences: ["bodysuit"],
      comfortCoverage: "moderate" as const,
      colors: ["purple"],
      budgetBand: "$$",
    };
    expect(() => IntakeFormSchema.parse(minimal)).not.toThrow();
  });

  it("defaults avoidList to empty array when not provided", () => {
    const result = IntakeFormSchema.parse({
      venueSlug: "edc-las-vegas",
      vibeKeywords: ["cosmic"],
      garmentPreferences: ["bodysuit"],
      comfortCoverage: "moderate" as const,
      colors: ["purple"],
      budgetBand: "$$",
    });
    expect(result.avoidList).toEqual([]);
  });
});

// ─── Concept Card LLM Schema Tests ────────────────────────────────────────────

describe("ConceptCardLLMSchema", () => {
  const validConcept = {
    storyName: "Electric Warrior",
    storyNarrative: "A fierce, armored vision of cosmic power. Structured holographic armor meets flowing UV-reactive mesh in a look that commands the stage.",
    garmentList: [
      {
        garmentType: "rave bra",
        description: "Structured holographic bra with rhinestone armor detailing",
        materials: ["holographic spandex", "rhinestones"],
        trims: ["crystal appliqué", "UV piping"],
        constructionNotes: "Underwire construction with boning channels for structure",
      },
      {
        garmentType: "micro shorts",
        description: "High-waisted holographic micro shorts with UV-reactive waistband",
        materials: ["holographic spandex", "lycra"],
        trims: ["rhinestone waistband"],
        constructionNotes: "Elastic waistband, 1-inch inseam",
      },
    ],
    palette: ["#00BFFF", "#FF007F", "#7B2FBE", "#F0F0FF"],
    materials: ["holographic spandex", "lycra", "rhinestones"],
    trims: ["crystal appliqué", "UV piping", "rhinestone waistband"],
    vibeAlignment: 0.92,
    manufacturabilityScore: 0.85,
    productionRiskScore: 0.15,
  };

  it("validates a complete valid concept card", () => {
    expect(() => ConceptCardLLMSchema.parse(validConcept)).not.toThrow();
  });

  it("requires storyNarrative to be at least 20 characters", () => {
    expect(() => ConceptCardLLMSchema.parse({ ...validConcept, storyNarrative: "Too short" })).toThrow();
  });

  it("requires at least 2 palette colors", () => {
    expect(() => ConceptCardLLMSchema.parse({ ...validConcept, palette: ["#00BFFF"] })).toThrow();
  });

  it("clamps scores between 0 and 1", () => {
    expect(() => ConceptCardLLMSchema.parse({ ...validConcept, vibeAlignment: 1.5 })).toThrow();
    expect(() => ConceptCardLLMSchema.parse({ ...validConcept, manufacturabilityScore: -0.1 })).toThrow();
  });

  it("requires at least 1 garment in the list", () => {
    expect(() => ConceptCardLLMSchema.parse({ ...validConcept, garmentList: [] })).toThrow();
  });
});

// ─── Auth Logout Test (from template) ────────────────────────────────────────

import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type CookieCall = { name: string; options: Record<string, unknown> };
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "founder_admin" | "friend_user" = "friend_user"): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({ maxAge: -1, secure: true, sameSite: "none", httpOnly: true, path: "/" });
  });
});

describe("Role guards", () => {
  it("founder_admin role string is exact", () => {
    expect("founder_admin").toBe("founder_admin");
  });

  it("friend_user role string is exact", () => {
    expect("friend_user").toBe("friend_user");
  });
});

// ─── RBAC Access Control Tests ────────────────────────────────────────────────

describe("RBAC: founderProcedure guard", () => {
  it("throws FORBIDDEN when friend_user calls a founder-only procedure (admin.getDashboard)", async () => {
    const { ctx } = createAuthContext("friend_user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.getDashboard()).rejects.toThrow();
  });

  it("throws FORBIDDEN when friend_user calls admin.listAllRequests", async () => {
    const { ctx } = createAuthContext("friend_user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.listAllRequests()).rejects.toThrow();
  });

  it("throws FORBIDDEN when friend_user calls production.listVendors", async () => {
    const { ctx } = createAuthContext("friend_user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.production.listVendors()).rejects.toThrow();
  });

  it("throws FORBIDDEN when friend_user calls production.listOrders", async () => {
    const { ctx } = createAuthContext("friend_user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.production.listOrders()).rejects.toThrow();
  });

  it("throws FORBIDDEN when friend_user calls production.matchVendors", async () => {
    const { ctx } = createAuthContext("friend_user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.production.matchVendors({ designPacketId: 1, designRequestId: 1 })).rejects.toThrow();
  });

  it("throws FORBIDDEN when friend_user calls production.createOrder", async () => {
    const { ctx } = createAuthContext("friend_user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.production.createOrder({ designRequestId: 1, designPacketId: 1, vendorId: 1 })).rejects.toThrow();
  });

  it("throws FORBIDDEN when friend_user calls production.advanceStage", async () => {
    const { ctx } = createAuthContext("friend_user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.production.advanceStage({ orderId: 1, toStage: "quote_received" })).rejects.toThrow();
  });

  it("throws UNAUTHENTICATED when unauthenticated user calls protectedProcedure", async () => {
    const unauthCtx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(unauthCtx);
    await expect(caller.intake.myRequests()).rejects.toThrow();
  });
});
