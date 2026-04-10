import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { founderProcedure, router } from "../_core/trpc";
import {
  getAllDesignRequests,
  getDesignRequestById,
  getConceptCardsByRequestId,
  getApprovalHistoryByRequestId,
  getDesignPacketByRequestId,
  getProductionOrdersByRequestId,
  getVendorScoresByPacketId,
  getAllVendors,
  getVendorById,
  getAllProductionOrders,
  getAllAgentLogs,
  getDb,
} from "../db";
import { users, vendors } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";

export const adminRouter = router({
  /**
   * Full pipeline view for a single design request.
   * Returns: request + concepts + approval history + packet + orders + vendor scores
   */
  getFullPipeline: founderProcedure
    .input(z.object({ designRequestId: z.number() }))
    .query(async ({ input }) => {
      const request = await getDesignRequestById(input.designRequestId);
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Design request not found" });

      const [concepts, approvalHistory, packet, orders] = await Promise.all([
        getConceptCardsByRequestId(input.designRequestId),
        getApprovalHistoryByRequestId(input.designRequestId),
        getDesignPacketByRequestId(input.designRequestId),
        getProductionOrdersByRequestId(input.designRequestId),
      ]);

      // Get vendor scores if packet exists
      const vendorScores = packet ? await getVendorScoresByPacketId(packet.id) : [];
      // Always return all active vendors so admin can create orders and see vendor names
      const allVendors = await getAllVendors();
      // Enrich vendor scores with vendor names
      const enrichedVendorScores = vendorScores.map((vs) => {
        const vendor = allVendors.find((v) => v.id === vs.vendorId);
        return { ...vs, vendorName: vendor?.name ?? `Vendor #${vs.vendorId}`, vendorEmail: vendor?.contactEmail ?? null };
      });

      return {
        request,
        concepts,
        approvalHistory,
        packet,
        orders,
        vendorScores: enrichedVendorScores,
        allVendors,
      };
    }),

  /**
   * Dashboard overview — all design requests with status summary.
   */
  getDashboard: founderProcedure.query(async () => {
    const [allRequests, allOrders, allVendors] = await Promise.all([
      getAllDesignRequests(),
      getAllProductionOrders(),
      getAllVendors(),
    ]);

    // Status breakdown
    const statusBreakdown = allRequests.reduce((acc, req) => {
      acc[req.status] = (acc[req.status] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Order stage breakdown
    const stageBreakdown = allOrders.reduce((acc, order) => {
      acc[order.currentStage] = (acc[order.currentStage] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalRequests: allRequests.length,
      totalOrders: allOrders.length,
      totalVendors: allVendors.length,
      statusBreakdown,
      stageBreakdown,
      recentRequests: allRequests.slice(0, 10),
      recentOrders: allOrders.slice(0, 10),
    };
  }),

  /**
   * List all design requests (founder_admin full access).
   */
  listAllRequests: founderProcedure.query(async () => {
    return getAllDesignRequests();
  }),

  /**
   * List all users.
   */
  listUsers: founderProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(users);
  }),

  /**
   * Update a user's role.
   */
  updateUserRole: founderProcedure
    .input(z.object({
      userId: z.number(),
      role: z.enum(["founder_admin", "friend_user"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
      return { success: true, message: `User ${input.userId} role updated to ${input.role}` };
    }),

  /**
   * Create a new vendor profile.
   */
  createVendor: founderProcedure
    .input(z.object({
      name: z.string().min(1),
      contactEmail: z.string().email().optional(),
      contactName: z.string().optional(),
      geography: z.string().optional(),
      capabilities: z.array(z.string()).default([]),
      moqMin: z.number().optional().default(10),
      turnaroundDays: z.number().optional().default(30),
      priceBand: z.string().optional(),
      reliabilityScore: z.number().min(0).max(1).optional().default(0.7),
      communicationsScore: z.number().min(0).max(1).optional().default(0.7),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db.insert(vendors).values({
        ...input,
        capabilities: input.capabilities as any,
        isActive: true,
      });

      return { success: true, message: `Vendor "${input.name}" created` };
    }),

  /**
   * Update a vendor profile.
   */
  updateVendor: founderProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      contactEmail: z.string().email().optional(),
      contactName: z.string().optional(),
      geography: z.string().optional(),
      capabilities: z.array(z.string()).optional(),
      moqMin: z.number().optional(),
      turnaroundDays: z.number().optional(),
      priceBand: z.string().optional(),
      reliabilityScore: z.number().min(0).max(1).optional(),
      communicationsScore: z.number().min(0).max(1).optional(),
      notes: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { id, ...updates } = input;
      const updateData: Record<string, unknown> = { ...updates };
      if (updates.capabilities) updateData.capabilities = updates.capabilities;

      await db.update(vendors).set(updateData as any).where(eq(vendors.id, id));
      return { success: true, message: `Vendor ${id} updated` };
    }),

  /**
   * Get recent agent logs (observability).
   */
  getRecentLogs: founderProcedure
    .input(z.object({ limit: z.number().optional().default(50) }))
    .query(async ({ input }) => {
      return getAllAgentLogs(input.limit);
    }),

  /**
   * Get all festival waitlist signups, grouped by festival.
   */
  getWaitlist: founderProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const rows = await db.execute(
        sql`SELECT email, festival_id, festival_name, created_at FROM festival_waitlist ORDER BY created_at DESC`
      ) as unknown as Array<{ email: string; festival_id: string; festival_name: string; created_at: string }>;
      // Group by festival
      const grouped: Record<string, { festivalId: string; festivalName: string; emails: Array<{ email: string; joinedAt: number }> }> = {};
      for (const row of rows) {
        const key = row.festival_id;
        if (!grouped[key]) {
          grouped[key] = { festivalId: row.festival_id, festivalName: row.festival_name, emails: [] };
        }
        grouped[key].emails.push({ email: row.email, joinedAt: Number(row.created_at) });
      }
      return {
        total: rows.length,
        festivals: Object.values(grouped).sort((a, b) => b.emails.length - a.emails.length),
        raw: rows,
      };
    }),
});
