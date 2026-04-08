import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { IntakeFormSchema } from "../../shared/schemas";
import { createDesignRequest, getDesignRequestById, getDesignRequestsByUserId } from "../db";
import { generateConceptsForRequest } from "../designAgent";
import { agentLog } from "../agentLogger";

export const intakeRouter = router({
  /**
   * Submit a new design request (intake form).
   * Triggers async concept generation.
   */
  submit: protectedProcedure
    .input(IntakeFormSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      await agentLog({
        stage: "intake",
        message: `New design request submitted by user ${userId}`,
        payload: { userId, venueSlug: input.venueSlug, vibeKeywords: input.vibeKeywords },
      });

      // Create the design request record
      await createDesignRequest({
        userId,
        venueSlug: input.venueSlug,
        eventDate: input.eventDate ?? null,
        vibeKeywords: input.vibeKeywords as any,
        garmentPreferences: input.garmentPreferences as any,
        comfortCoverage: input.comfortCoverage,
        colors: input.colors as any,
        avoidList: input.avoidList as any,
        budgetBand: input.budgetBand,
        bodyNotes: input.bodyNotes ?? null,
        status: "pending",
      });

      // Fetch the newly created request to get its ID
      const requests = await getDesignRequestsByUserId(userId);
      const newRequest = requests[0]; // Most recent

      if (!newRequest) throw new Error("Failed to create design request");

      // Trigger concept generation asynchronously (don't await — return immediately)
      generateConceptsForRequest(newRequest, input).catch(err => {
        console.error(`[HAUZZ] Concept generation failed for request ${newRequest.id}:`, err);
      });

      return {
        success: true,
        designRequestId: newRequest.id,
        message: "Design request submitted. Concepts are being generated.",
      };
    }),

  /**
   * Get a specific design request (scoped to own data for friend_user).
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const request = await getDesignRequestById(input.id);
      if (!request) throw new Error("Design request not found");

      // friend_user can only see their own requests
      if (ctx.user.role !== "founder_admin" && request.userId !== ctx.user.id) {
        throw new Error("Access denied");
      }

      return request;
    }),

  /**
   * List all design requests for the current user.
   */
  myRequests: protectedProcedure.query(async ({ ctx }) => {
    return getDesignRequestsByUserId(ctx.user.id);
  }),
});
