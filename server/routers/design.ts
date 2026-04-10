import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, founderProcedure, publicProcedure, router } from "../_core/trpc";
import { sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  getConceptCardsByRequestId,
  getConceptCardById,
  markConceptSelected,
  markConceptRejected,
  insertApprovalHistory,
  getApprovalHistoryByRequestId,
  getDesignRequestById,
  getDesignPacketByRequestId,
  getDesignPacketById,
  updateDesignRequestStatus,
  getDesignRequestsWithConceptsByUserId,
  getChatMessagesByRequestId,
  saveChatMessage,
} from "../db";
import { generateConceptsForRequest } from "../designAgent";
import { generateDesignPacket } from "../packetGenerator";
import { agentLog } from "../agentLogger";
import { IntakeFormSchema } from "../../shared/schemas";

export const designRouter = router({
  /**
   * Get all concept cards for a design request.
   */
  getConcepts: protectedProcedure
    .input(z.object({ designRequestId: z.number() }))
    .query(async ({ ctx, input }) => {
      const request = await getDesignRequestById(input.designRequestId);
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Design request not found" });

      if (ctx.user.role !== "founder_admin" && request.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return getConceptCardsByRequestId(input.designRequestId);
    }),

  /**
   * Select (approve) a concept card — triggers design packet generation.
   * Both founder_admin and the owning friend_user can approve.
   */
  selectConcept: protectedProcedure
    .input(z.object({
      designRequestId: z.number(),
      conceptCardId: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const request = await getDesignRequestById(input.designRequestId);
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Design request not found" });

      if (ctx.user.role !== "founder_admin" && request.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const concept = await getConceptCardById(input.conceptCardId);
      if (!concept || concept.designRequestId !== input.designRequestId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Concept card not found" });
      }

      // Mark concept as selected
      await markConceptSelected(input.conceptCardId);

      // Record approval history
      await insertApprovalHistory({
        designRequestId: input.designRequestId,
        conceptCardId: input.conceptCardId,
        actorUserId: ctx.user.id,
        action: "selected",
        notes: input.notes,
      });

      await agentLog({
        designRequestId: input.designRequestId,
        stage: "approval",
        message: `Concept "${concept.storyName}" selected by user ${ctx.user.id}`,
        payload: { conceptCardId: input.conceptCardId, actorRole: ctx.user.role },
      });

      // Trigger design packet generation asynchronously
      generateDesignPacket(input.conceptCardId, input.designRequestId).catch(err => {
        console.error(`[HAUZZ] Packet generation failed for request ${input.designRequestId}:`, err);
      });

      return { success: true, message: `Concept "${concept.storyName}" approved. Design packet is being generated.` };
    }),

  /**
   * Reject a concept card — founder_admin only.
   * Automatically triggers concept regeneration.
   */
  rejectConcept: founderProcedure
    .input(z.object({
      designRequestId: z.number(),
      conceptCardId: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const request = await getDesignRequestById(input.designRequestId);
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Design request not found" });

      if (ctx.user.role !== "founder_admin" && request.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const concept = await getConceptCardById(input.conceptCardId);
      if (!concept || concept.designRequestId !== input.designRequestId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Concept card not found" });
      }

      await markConceptRejected(input.conceptCardId);

      await insertApprovalHistory({
        designRequestId: input.designRequestId,
        conceptCardId: input.conceptCardId,
        actorUserId: ctx.user.id,
        action: "rejected",
        notes: input.notes,
      });

      await agentLog({
        designRequestId: input.designRequestId,
        stage: "approval",
        message: `Concept "${concept.storyName}" rejected by user ${ctx.user.id} — triggering regeneration`,
        payload: { notes: input.notes },
      });

      // Auto-trigger regeneration after rejection
      const existingConcepts = await getConceptCardsByRequestId(input.designRequestId);
      const maxRound = existingConcepts.reduce((max, c) => Math.max(max, c.generationRound), 0);
      const nextRound = maxRound + 1;

      const baseIntake = {
        venueSlug: request.venueSlug,
        eventDate: request.eventDate ?? undefined,
        vibeKeywords: (request.vibeKeywords as string[]) ?? [],
        garmentPreferences: (request.garmentPreferences as string[]) ?? [],
        comfortCoverage: (request.comfortCoverage as "minimal" | "moderate" | "full") ?? "moderate",
        colors: (request.colors as string[]) ?? [],
        avoidList: (request.avoidList as string[]) ?? [],
        budgetBand: request.budgetBand ?? "$$",
        bodyNotes: request.bodyNotes ?? undefined,
      };

      generateConceptsForRequest(request, baseIntake, nextRound).catch(err => {
        console.error(`[HAUZZ] Auto-regeneration failed for request ${input.designRequestId}:`, err);
      });

      return { success: true, message: `Concept "${concept.storyName}" rejected. Regeneration triggered (round ${nextRound}).` };
    }),

  /**
   * Request concept regeneration — founder or owning user only.
   */
  requestRegeneration: protectedProcedure
    .input(z.object({
      designRequestId: z.number(),
      notes: z.string().optional(),
      intakeOverrides: IntakeFormSchema.partial().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const request = await getDesignRequestById(input.designRequestId);
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Design request not found" });

      if (ctx.user.role !== "founder_admin" && request.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      // Get existing concepts to determine generation round
      const existingConcepts = await getConceptCardsByRequestId(input.designRequestId);
      const maxRound = existingConcepts.reduce((max, c) => Math.max(max, c.generationRound), 0);
      const nextRound = maxRound + 1;

      // Record regeneration request in approval history (use first concept card id or 0)
      const firstConceptId = existingConcepts[0]?.id ?? 0;
      if (firstConceptId > 0) {
        await insertApprovalHistory({
          designRequestId: input.designRequestId,
          conceptCardId: firstConceptId,
          actorUserId: ctx.user.id,
          action: "regeneration_requested",
          notes: input.notes,
        });
      }

      await agentLog({
        designRequestId: input.designRequestId,
        stage: "approval",
        message: `Regeneration requested by user ${ctx.user.id} (round ${nextRound})`,
        payload: { notes: input.notes, nextRound },
      });

      // Build intake from stored request + any overrides
      const baseIntake = {
        venueSlug: request.venueSlug,
        eventDate: request.eventDate ?? undefined,
        vibeKeywords: (request.vibeKeywords as string[]) ?? [],
        garmentPreferences: (request.garmentPreferences as string[]) ?? [],
        comfortCoverage: (request.comfortCoverage as "minimal" | "moderate" | "full") ?? "moderate",
        colors: (request.colors as string[]) ?? [],
        avoidList: (request.avoidList as string[]) ?? [],
        budgetBand: request.budgetBand ?? "$$",
        bodyNotes: request.bodyNotes ?? undefined,
        ...input.intakeOverrides,
      };

      // Trigger regeneration asynchronously
      generateConceptsForRequest(request, baseIntake, nextRound).catch(err => {
        console.error(`[HAUZZ] Regeneration failed for request ${input.designRequestId}:`, err);
      });

      return { success: true, message: `Regeneration triggered (round ${nextRound}).` };
    }),

  /**
   * Get approval history for a design request.
   */
  getApprovalHistory: protectedProcedure
    .input(z.object({ designRequestId: z.number() }))
    .query(async ({ ctx, input }) => {
      const request = await getDesignRequestById(input.designRequestId);
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Design request not found" });

      if (ctx.user.role !== "founder_admin" && request.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return getApprovalHistoryByRequestId(input.designRequestId);
    }),

  /**
   * Get the design packet for an approved request.
   */
  getPacket: protectedProcedure
    .input(z.object({ designRequestId: z.number() }))
    .query(async ({ ctx, input }) => {
      const request = await getDesignRequestById(input.designRequestId);
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Design request not found" });

      if (ctx.user.role !== "founder_admin" && request.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return getDesignPacketByRequestId(input.designRequestId);
    }),

  /**
   * Get all design sessions (threads) for the current user, with concept previews.
   */
  getMyThreads: protectedProcedure
    .query(async ({ ctx }) => {
      return getDesignRequestsWithConceptsByUserId(ctx.user.id);
    }),

  /**
   * Get all chat messages for a design request thread.
   */
  getThreadMessages: protectedProcedure
    .input(z.object({ designRequestId: z.number() }))
    .query(async ({ ctx, input }) => {
      const request = await getDesignRequestById(input.designRequestId);
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Thread not found" });
      if (ctx.user.role !== "founder_admin" && request.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      return getChatMessagesByRequestId(input.designRequestId);
    }),

  /**
   * Save a chat message to a design request thread.
   */
  saveMessage: protectedProcedure
    .input(z.object({
      designRequestId: z.number(),
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const request = await getDesignRequestById(input.designRequestId);
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Thread not found" });
      if (ctx.user.role !== "founder_admin" && request.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      return saveChatMessage({
        designRequestId: input.designRequestId,
        role: input.role,
        content: input.content,
      });
    }),

  /**
   * FASHN.ai Product-to-Model render — takes a garment image URL and returns
   * a photorealistic render of a festival model wearing the garment.
   * Async: submits job, polls until done (max 90s), returns output image URL.
   */
  fashnRender: protectedProcedure
    .input(z.object({
      garmentImageUrl: z.string().url(),
      prompt: z.string().optional().default("rave festival model, EDC Las Vegas, neon lights, vibrant energy"),
      aspectRatio: z.enum(["1:1", "3:4", "4:3", "9:16"]).optional().default("3:4"),
      resolution: z.enum(["1k", "2k"]).optional().default("1k"),
    }))
    .mutation(async ({ input }) => {
      const apiKey = process.env.FASHN_API_KEY;
      if (!apiKey) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "FASHN_API_KEY not configured — add it in project secrets" });

      // Submit the render job
      const submitRes = await fetch("https://api.fashn.ai/v1/run", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model_name: "product-to-model",
          product_image: input.garmentImageUrl,
          prompt: input.prompt,
          aspect_ratio: input.aspectRatio,
          resolution: input.resolution,
          generation_mode: "fast",
          num_images: 1,
          output_format: "png",
        }),
      });
      if (!submitRes.ok) {
        const err = await submitRes.text();
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `FASHN submit failed: ${err}` });
      }
      const { id: predictionId } = await submitRes.json() as { id: string };

      // Poll for result (max 90s, 3s intervals = 30 attempts)
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const pollRes = await fetch(`https://api.fashn.ai/v1/status/${predictionId}`, {
          headers: { "Authorization": `Bearer ${apiKey}` },
        });
        if (!pollRes.ok) continue;
        const poll = await pollRes.json() as { status: string; output?: string[] };
        if (poll.status === "succeeded" && poll.output?.[0]) {
          return { renderUrl: poll.output[0], predictionId, status: "succeeded" };
        }
        if (poll.status === "failed") {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "FASHN render failed" });
        }
      }
      throw new TRPCError({ code: "TIMEOUT", message: "FASHN render timed out after 90s" });
    }),

  /**
   * NewArc.ai sketch-to-photorealistic-render.
   * Placeholder until API docs are available from newarc.ai.
   * Wire in the actual endpoint once Jay has the API key + docs.
   */
  newarcRender: protectedProcedure
    .input(z.object({
      sketchImageUrl: z.string().url(),
      prompt: z.string().optional().default("rave festival fashion, vibrant colors, EDC aesthetic, photorealistic"),
    }))
    .mutation(async ({ input: _input }) => {
      const apiKey = process.env.NEWARC_API_KEY;
      if (!apiKey) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "NEWARC_API_KEY not configured — sign up at newarc.ai and add the key in project secrets" });
      // TODO: Replace with actual NewArc.ai endpoint once docs are received
      // Expected: POST https://api.newarc.ai/v1/sketch-to-render
      // Body: { sketch_url, prompt, style: "photorealistic" }
      throw new TRPCError({ code: "NOT_IMPLEMENTED", message: "NewArc.ai endpoint not yet wired — add NEWARC_API_KEY and update this procedure with the API docs" });
    }),

  /**
   * Submit a design packet to the Style3D local bridge via S3.
   * The Python bridge (hauzz-style3d-bridge.py) running on Jay's Mac watches
   * the S3 inbox, processes through Style3D, and uploads DXF + PDF to outbox.
   */
  style3dSubmit: protectedProcedure
    .input(z.object({
      designRequestId: z.number(),
      garmentImageUrl: z.string().url(),
      fabricPreset: z.string().optional().default("rave-spandex"),
    }))
    .mutation(async ({ ctx, input }) => {
      const request = await getDesignRequestById(input.designRequestId);
      if (!request) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.user.role !== "founder_admin" && request.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const jobId = `style3d-${input.designRequestId}-${Date.now()}`;
      const payload = JSON.stringify({
        jobId,
        designRequestId: input.designRequestId,
        garmentImageUrl: input.garmentImageUrl,
        fabricPreset: input.fabricPreset,
        submittedAt: Date.now(),
        submittedBy: ctx.user.id,
      });
      const { storagePut } = await import("../storage.js");
      const { url } = await storagePut(`style3d-inbox/${jobId}.json`, Buffer.from(payload), "application/json");
      return { jobId, inboxUrl: url, status: "submitted" };
    }),

  /**
   * Poll the S3 outbox for Style3D output files (DXF pattern + PDF tech pack).
   * Returns download URLs once the local bridge has finished processing.
   */
  style3dCheck: protectedProcedure
    .input(z.object({ jobId: z.string().min(1) }))
    .query(async ({ input }) => {
      const { storageGet } = await import("../storage.js");
      try {
        const dxf = await storageGet(`style3d-outbox/${input.jobId}.dxf`);
        const pdf = await storageGet(`style3d-outbox/${input.jobId}.pdf`);
        return { status: "ready" as const, dxfUrl: dxf.url, pdfUrl: pdf.url };
      } catch {
        return { status: "pending" as const, dxfUrl: null, pdfUrl: null };
      }
    }),

  /**
   * Generate a clean garment flat-lay image then feed it to FASHN product-to-model.
   * This is the correct FASHN workflow: flat-lay → model render.
   * Called explicitly via the "Try On" button on each concept card.
   */
  fashnTryOn: protectedProcedure
    .input(z.object({
      conceptId: z.number(),
      storyName: z.string(),
      garments: z.array(z.string()),
      palette: z.array(z.string()),
      materials: z.array(z.string()),
      storyDescription: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const apiKey = process.env.FASHN_API_KEY;
      if (!apiKey) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "FASHN_API_KEY not configured" });

      const { generateImage } = await import("../_core/imageGeneration.js");

      // Fetch user's body photo URL (if uploaded)
      let modelImageUrl: string | undefined;
      try {
        const db = await getDb();
        if (db) {
          const rows = await db.execute(
            sql`SELECT body_photo_url FROM users WHERE id = ${ctx.user.id} LIMIT 1`
          );
          modelImageUrl = ((rows as any).rows?.[0] ?? (rows as any)[0])?.body_photo_url ?? undefined;
        }
      } catch { /* non-fatal */ }

      // Step 1: Generate a clean garment flat-lay (white background, isolated clothing)
      // Detailed prompt for FASHN compatibility: single dominant garment, clean product shot
      const primaryGarment = input.garments[0] ?? "festival outfit";
      const colors = input.palette.slice(0, 3).join(", ");
      const mats = input.materials.slice(0, 2).join(", ");
      const flatLayPrompt = [
        `Product photography flat lay of a single ${primaryGarment}.`,
        `Made from ${mats || "holographic spandex"}.`,
        `Color: ${colors || "electric pink and purple"}.`,
        `Pure white background, overhead shot, garment laid flat, no wrinkles, no model, no props, no shadows.`,
        `Ultra-sharp focus, commercial fashion product photography, 8K resolution.`,
        `Festival rave aesthetic: ${input.storyDescription?.slice(0, 60) ?? input.storyName}.`,
      ].filter(Boolean).join(" ");

      const flatLayResult = await generateImage({ prompt: flatLayPrompt });
      if (!flatLayResult.url) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate garment flat-lay image" });

      const garmentImageUrl = flatLayResult.url;

      // Step 2: Submit to FASHN
      // If user has uploaded a body photo, use model-to-model (person wearing garment).
      // Otherwise fall back to product-to-model (stock model).
      // Use tryon-max for both paths:
      // - With user body photo: product_image (flat-lay) + model_image (user's photo)
      // - Without user photo: product_image only (FASHN uses a stock model automatically)
      const usePersonPhoto = !!modelImageUrl;
      const fashnBody: Record<string, unknown> = {
        model_name: "tryon-max",
        inputs: {
          product_image: garmentImageUrl,
          ...(usePersonPhoto ? { model_image: modelImageUrl } : {}),
        },
        output_format: "png",
        resolution: "1k",
      };

      const submitRes = await fetch("https://api.fashn.ai/v1/run", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify(fashnBody),
      });
      if (!submitRes.ok) {
        const err = await submitRes.text();
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `FASHN submit failed: ${err}` });
      }
      const { id: predictionId } = await submitRes.json() as { id: string };

      // Step 3: Poll for result (max 90s)
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const pollRes = await fetch(`https://api.fashn.ai/v1/status/${predictionId}`, {
          headers: { "Authorization": `Bearer ${apiKey}` },
        });
        if (!pollRes.ok) continue;
        const poll = await pollRes.json() as { status: string; output?: string[] };
        if (poll.status === "succeeded" && poll.output?.[0]) {
          const renderUrl = poll.output[0];
          // Persist render URLs to the database so they survive page refreshes
          try {
            const db = await getDb();
            if (db) {
              await db.execute(
                sql`UPDATE concept_cards SET fashn_render_url = ${renderUrl}, fashn_flat_lay_url = ${garmentImageUrl} WHERE id = ${input.conceptId}`
              );
            }
          } catch (dbErr) {
            // Non-fatal: return the render URL even if DB save fails
            console.error("[fashnTryOn] Failed to persist render URL:", dbErr);
          }
          return { renderUrl, flatLayUrl: garmentImageUrl, predictionId, status: "succeeded" as const };
        }
        if (poll.status === "failed") {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "FASHN render failed" });
        }
      }
      throw new TRPCError({ code: "TIMEOUT", message: "FASHN render timed out after 90s" });
    }),

  /**
   * Upload a body photo for FASHN try-on. Accepts base64-encoded image, uploads to S3,
   * saves URL to the user's profile.
   */
  uploadBodyPhoto: protectedProcedure
    .input(z.object({
      base64: z.string().min(1),          // base64-encoded image data (no data: prefix)
      mimeType: z.string().default("image/jpeg"),
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate MIME type
      const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (!allowedMimes.includes(input.mimeType)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only JPEG, PNG, or WebP images are accepted" });
      }
      // Validate base64 size (10MB limit)
      const buffer = Buffer.from(input.base64, "base64");
      if (buffer.length > 10 * 1024 * 1024) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Photo must be under 10MB" });
      }
      if (buffer.length < 1000) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Photo appears to be empty or corrupted" });
      }
      const { storagePut } = await import("../storage.js");
      const ext = input.mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
      const key = `body-photos/${ctx.user.id}-${Date.now()}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      // Save URL to user profile
      const db = await getDb();
      if (db) {
        await db.execute(
          sql`UPDATE users SET body_photo_url = ${url} WHERE id = ${ctx.user.id}`
        );
      }
      return { url };
    }),

  /**
   * Get the current user's body photo URL.
   */
  getBodyPhoto: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { url: null };
      const rows = await db.execute(
        sql`SELECT body_photo_url FROM users WHERE id = ${ctx.user.id} LIMIT 1`
      );
      const url = ((rows as any).rows?.[0] ?? (rows as any)[0])?.body_photo_url ?? null;
      return { url };
    }),

  /**
   * Join the waitlist for a locked/upcoming festival.
   */
  joinWaitlist: publicProcedure
    .input(z.object({
      email: z.string().email(),
      festivalId: z.string().min(1),
      festivalName: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (db) {
        await db.execute(
          sql`INSERT INTO festival_waitlist (email, festival_id, festival_name, created_at)
              VALUES (${input.email}, ${input.festivalId}, ${input.festivalName}, ${Date.now()})
              ON CONFLICT (email, festival_id) DO NOTHING`
        );
      }
      return { success: true };
    }),
});
