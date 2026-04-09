import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, founderProcedure, router } from "../_core/trpc";
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
});
