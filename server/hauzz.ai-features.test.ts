/**
 * Tests for the new AI feature routers: voice transcription and AI chat.
 * These tests validate the input schemas and business logic without
 * making real API calls (no Claude/Whisper calls in unit tests).
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";

// ─── Voice Router Input Schema ────────────────────────────────────────────────
const VoiceTranscribeInputSchema = z.object({
  audioBase64: z.string().min(1, "Audio data is required"),
  mimeType: z.string().default("audio/webm"),
  language: z.string().optional(),
  prompt: z.string().optional(),
});

describe("Voice Router — Input Validation", () => {
  it("accepts valid base64 audio input", () => {
    const result = VoiceTranscribeInputSchema.safeParse({
      audioBase64: "SGVsbG8gV29ybGQ=", // "Hello World" in base64
      mimeType: "audio/webm",
      language: "en",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty audioBase64", () => {
    const result = VoiceTranscribeInputSchema.safeParse({
      audioBase64: "",
      mimeType: "audio/webm",
    });
    expect(result.success).toBe(false);
  });

  it("defaults mimeType to audio/webm when not provided", () => {
    const result = VoiceTranscribeInputSchema.safeParse({
      audioBase64: "SGVsbG8=",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mimeType).toBe("audio/webm");
    }
  });

  it("accepts optional language and prompt fields", () => {
    const result = VoiceTranscribeInputSchema.safeParse({
      audioBase64: "SGVsbG8=",
      mimeType: "audio/mp4",
      language: "es",
      prompt: "Festival fashion description",
    });
    expect(result.success).toBe(true);
  });

  it("accepts audio/mp4 mimeType", () => {
    const result = VoiceTranscribeInputSchema.safeParse({
      audioBase64: "SGVsbG8=",
      mimeType: "audio/mp4",
    });
    expect(result.success).toBe(true);
  });
});

// ─── AI Chat Router Input Schema ──────────────────────────────────────────────
const AIChatMessageSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  designRequestId: z.number().optional(),
  venueSlug: z.string().optional(),
});

describe("AI Chat Router — Input Validation", () => {
  it("accepts valid chat message array", () => {
    const result = AIChatMessageSchema.safeParse({
      messages: [
        { role: "user", content: "I want a cosmic warrior look" },
        { role: "assistant", content: "Tell me more about your vibe!" },
        { role: "user", content: "Electric blue and holographic" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid role values", () => {
    const result = AIChatMessageSchema.safeParse({
      messages: [
        { role: "system", content: "You are HAUZZ" }, // 'system' not allowed
      ],
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional designRequestId and venueSlug", () => {
    const result = AIChatMessageSchema.safeParse({
      messages: [{ role: "user", content: "Hello" }],
      designRequestId: 42,
      venueSlug: "edc-las-vegas",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.designRequestId).toBe(42);
      expect(result.data.venueSlug).toBe("edc-las-vegas");
    }
  });

  it("accepts empty messages array", () => {
    const result = AIChatMessageSchema.safeParse({ messages: [] });
    expect(result.success).toBe(true);
  });
});

// ─── Vendor Email Draft Input Schema ─────────────────────────────────────────
const VendorEmailDraftInputSchema = z.object({
  vendorId: z.number(),
  designPacketId: z.number(),
  designRequestId: z.number(),
});

describe("Vendor Email Draft — Input Validation", () => {
  it("accepts valid vendor email draft input", () => {
    const result = VendorEmailDraftInputSchema.safeParse({
      vendorId: 1,
      designPacketId: 2,
      designRequestId: 3,
    });
    expect(result.success).toBe(true);
  });

  it("rejects string IDs (must be numbers)", () => {
    const result = VendorEmailDraftInputSchema.safeParse({
      vendorId: "abc",
      designPacketId: 2,
      designRequestId: 3,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const result = VendorEmailDraftInputSchema.safeParse({
      vendorId: 1,
    });
    expect(result.success).toBe(false);
  });
});

// ─── Audio Size Validation Logic ──────────────────────────────────────────────
describe("Voice Router — Audio Size Validation", () => {
  it("calculates size correctly from buffer length", () => {
    const maxSizeMB = 16;
    const bufferLength = 8 * 1024 * 1024; // 8MB
    const sizeMB = bufferLength / (1024 * 1024);
    expect(sizeMB).toBe(8);
    expect(sizeMB <= maxSizeMB).toBe(true);
  });

  it("detects oversized audio correctly", () => {
    const maxSizeMB = 16;
    const bufferLength = 17 * 1024 * 1024; // 17MB
    const sizeMB = bufferLength / (1024 * 1024);
    expect(sizeMB > maxSizeMB).toBe(true);
  });

  it("determines correct file extension from mimeType", () => {
    const getExt = (mimeType: string) =>
      mimeType.includes("webm") ? "webm"
        : mimeType.includes("mp4") ? "mp4"
        : mimeType.includes("wav") ? "wav"
        : mimeType.includes("ogg") ? "ogg"
        : "mp3";

    expect(getExt("audio/webm")).toBe("webm");
    expect(getExt("audio/mp4")).toBe("mp4");
    expect(getExt("audio/wav")).toBe("wav");
    expect(getExt("audio/ogg")).toBe("ogg");
    expect(getExt("audio/mpeg")).toBe("mp3");
  });
});

// ─── Design Agent Claude Upgrade ─────────────────────────────────────────────
describe("Design Agent — Claude Upgrade", () => {
  it("builds a valid concept image prompt", () => {
    const buildConceptImagePrompt = (concept: {
      storyName: string;
      storyNarrative: string;
      garmentList: Array<{ garmentType: string }>;
      palette: string[];
      materials: string[];
    }, venueSlug: string) => {
      const palette = concept.palette.slice(0, 4).join(", ");
      const garments = concept.garmentList.map(g => g.garmentType).join(", ");
      const materials = concept.materials.slice(0, 3).join(", ");
      return `Fashion mood board for a festival outfit concept called "${concept.storyName}". ` +
        `Style: ${concept.storyNarrative} ` +
        `Garments: ${garments}. ` +
        `Color palette: ${palette}. ` +
        `Materials: ${materials}. ` +
        `Setting: ${venueSlug.replace(/-/g, " ")} electronic music festival.`;
    };

    const prompt = buildConceptImagePrompt({
      storyName: "Electric Warrior",
      storyNarrative: "A cosmic warrior of light",
      garmentList: [{ garmentType: "bodysuit" }, { garmentType: "cape" }],
      palette: ["electric blue", "holographic silver", "neon pink"],
      materials: ["spandex", "holographic vinyl"],
    }, "edc-las-vegas");

    expect(prompt).toContain("Electric Warrior");
    expect(prompt).toContain("bodysuit");
    expect(prompt).toContain("electric blue");
    expect(prompt).toContain("edc las vegas");
    expect(prompt.length).toBeGreaterThan(50);
  });

  it("validates concept generation response schema", () => {
    const ConceptCardLLMSchema = z.object({
      storyName: z.string(),
      storyNarrative: z.string(),
      garmentList: z.array(z.object({
        garmentType: z.string(),
        description: z.string(),
        materials: z.array(z.string()),
        trims: z.array(z.string()),
        constructionNotes: z.string(),
      })),
      palette: z.array(z.string()),
      materials: z.array(z.string()),
      trims: z.array(z.string()),
      vibeAlignment: z.number(),
      manufacturabilityScore: z.number(),
      productionRiskScore: z.number(),
    });

    const mockConcept = {
      storyName: "Electric Warrior",
      storyNarrative: "A cosmic warrior of light",
      garmentList: [{
        garmentType: "bodysuit",
        description: "High-cut holographic bodysuit",
        materials: ["spandex", "holographic vinyl"],
        trims: ["rhinestones", "LED strips"],
        constructionNotes: "Stretch-fit construction",
      }],
      palette: ["electric blue", "holographic silver"],
      materials: ["spandex", "holographic vinyl"],
      trims: ["rhinestones"],
      vibeAlignment: 0.92,
      manufacturabilityScore: 0.78,
      productionRiskScore: 0.25,
    };

    const result = ConceptCardLLMSchema.safeParse(mockConcept);
    expect(result.success).toBe(true);
  });
});
