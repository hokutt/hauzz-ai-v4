import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, founderProcedure, router } from "../_core/trpc";
import {
  getAllVendors,
  getVendorById,
  getVendorScoresByPacketId,
  getDesignPacketById,
  getProductionOrderById,
  getProductionOrdersByRequestId,
  getAllProductionOrders,
  getDesignRequestById,
  getAgentLogsByRequestId,
  getAllAgentLogs,
} from "../db";
import { matchVendorsToPacket } from "../vendorMatcher";
import { createOrder, advanceOrderStage, getNextOrderStage } from "../orderStateMachine";
import { OrderStageSchema, ORDER_STAGES } from "../../shared/schemas";

export const productionRouter = router({
  // ─── Vendor Matching ────────────────────────────────────────────────────────

  /**
   * Score and rank vendors against an approved design packet.
   * founder_admin only.
   */
  matchVendors: founderProcedure
    .input(z.object({
      designPacketId: z.number(),
      designRequestId: z.number(),
      targetTurnaroundDays: z.number().optional().default(30),
    }))
    .mutation(async ({ input }) => {
      const results = await matchVendorsToPacket(
        input.designPacketId,
        input.designRequestId,
        input.targetTurnaroundDays
      );
      return { success: true, rankedVendors: results };
    }),

  /**
   * Get vendor scores for a design packet.
   */
  getVendorScores: founderProcedure
    .input(z.object({ designPacketId: z.number() }))
    .query(async ({ input }) => {
      return getVendorScoresByPacketId(input.designPacketId);
    }),

  /**
   * List all active vendors.
   */
  listVendors: founderProcedure.query(async () => {
    return getAllVendors();
  }),

  /**
   * Get a single vendor by ID.
   */
  getVendor: founderProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const vendor = await getVendorById(input.id);
      if (!vendor) throw new TRPCError({ code: "NOT_FOUND", message: "Vendor not found" });
      return vendor;
    }),

  // ─── Production Orders ──────────────────────────────────────────────────────

  /**
   * Create a production order for an approved design packet.
   * founder_admin only.
   */
  createOrder: founderProcedure
    .input(z.object({
      designRequestId: z.number(),
      designPacketId: z.number(),
      vendorId: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify the design packet exists
      const packet = await getDesignPacketById(input.designPacketId);
      if (!packet) throw new TRPCError({ code: "NOT_FOUND", message: "Design packet not found" });

      // Verify the vendor exists
      const vendor = await getVendorById(input.vendorId);
      if (!vendor) throw new TRPCError({ code: "NOT_FOUND", message: "Vendor not found" });

      await createOrder({
        designRequestId: input.designRequestId,
        designPacketId: input.designPacketId,
        vendorId: input.vendorId,
        actorUserId: ctx.user.id,
        notes: input.notes,
      });

      return { success: true, message: `Production order created with ${vendor.name}. Stage: inquiry_sent` };
    }),

  /**
   * Advance a production order to the next stage.
   * founder_admin only — enforces strict sequential stage transitions.
   */
  advanceStage: founderProcedure
    .input(z.object({
      orderId: z.number(),
      toStage: OrderStageSchema,
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await advanceOrderStage(
        input.orderId,
        input.toStage,
        ctx.user.id,
        input.notes
      );

      if (!result.success) {
        throw new TRPCError({ code: "BAD_REQUEST", message: result.message });
      }

      return result;
    }),

  /**
   * Get all production orders (founder_admin only).
   */
  listOrders: founderProcedure.query(async () => {
    return getAllProductionOrders();
  }),

  /**
   * Get production orders for a specific design request.
   * Scoped: friend_user can only see their own.
   */
  getOrdersByRequest: protectedProcedure
    .input(z.object({ designRequestId: z.number() }))
    .query(async ({ ctx, input }) => {
      const request = await getDesignRequestById(input.designRequestId);
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Design request not found" });

      if (ctx.user.role !== "founder_admin" && request.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return getProductionOrdersByRequestId(input.designRequestId);
    }),

  /**
   * Get a single production order.
   * Scoped: friend_user can only see their own.
   */
  getOrder: protectedProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ ctx, input }) => {
      const order = await getProductionOrderById(input.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });

      if (ctx.user.role !== "founder_admin") {
        const request = await getDesignRequestById(order.designRequestId);
        if (!request || request.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
      }

      return order;
    }),

  /**
   * Get the valid next stage for an order.
   */
  getNextStage: protectedProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ ctx, input }) => {
      const order = await getProductionOrderById(input.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });

      const currentStage = OrderStageSchema.parse(order.currentStage);
      const nextStage = getNextOrderStage(currentStage);

      return {
        currentStage,
        nextStage,
        allStages: ORDER_STAGES,
        isComplete: nextStage === null,
      };
    }),

  // ─── Agent Logs ─────────────────────────────────────────────────────────────

  /**
   * Get agent logs for a specific design request (founder_admin only).
   */
  getLogs: founderProcedure
    .input(z.object({ designRequestId: z.number() }))
    .query(async ({ input }) => {
      return getAgentLogsByRequestId(input.designRequestId);
    }),

  /**
   * Get all recent agent logs (founder_admin only).
   */
  getAllLogs: founderProcedure
    .input(z.object({ limit: z.number().optional().default(100) }))
    .query(async ({ input }) => {
      return getAllAgentLogs(input.limit);
    }),
});
