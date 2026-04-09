import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  InsertUser,
  agentLogs,
  approvalHistory,
  chatMessages,
  conceptCards,
  designPackets,
  designRequests,
  garmentOntology,
  productionOrders,
  users,
  vendorScores,
  vendors,
  venueDna,
  venues,
} from "../drizzle/schema";
import type { InsertDesignRequest, InsertConceptCard, InsertChatMessage } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!_db && dbUrl) {
    try {
      const client = postgres(dbUrl, { ssl: 'require', max: 10 });
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const; // these are TS field names, Drizzle maps to snake_case DB columns

    for (const field of textFields) {
      const value = user[field];
      if (value === undefined) continue;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    }

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn; // Drizzle maps to last_signed_in
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "founder_admin";
      updateSet.role = "founder_admin";
    }

    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: { ...updateSet, updatedAt: sql`now()` },
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0] ?? undefined;
}

// ─── Venues & DNA ─────────────────────────────────────────────────────────────

export async function getVenueBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(venues).where(eq(venues.slug, slug)).limit(1);
  return result[0] ?? undefined;
}

export async function getVenueDnaByVenueId(venueId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(venueDna).where(eq(venueDna.venueId, venueId));
}

// ─── Garment Ontology ─────────────────────────────────────────────────────────

export async function getGarmentsByTypes(types: string[]) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(garmentOntology);
}

export async function getAllGarments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(garmentOntology);
}

// ─── Design Requests ──────────────────────────────────────────────────────────

export async function createDesignRequest(data: InsertDesignRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(designRequests).values(data);
  return result[0];
}

export async function getDesignRequestById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(designRequests).where(eq(designRequests.id, id)).limit(1);
  return result[0] ?? undefined;
}

export async function getDesignRequestsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(designRequests).where(eq(designRequests.userId, userId)).orderBy(desc(designRequests.createdAt));
}

export async function getAllDesignRequests() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(designRequests).orderBy(desc(designRequests.createdAt));
}

export async function updateDesignRequestStatus(
  id: number,
  status: "pending" | "generating" | "awaiting_approval" | "approved" | "in_production" | "complete"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(designRequests).set({ status }).where(eq(designRequests.id, id));
}

// ─── Concept Cards ────────────────────────────────────────────────────────────

export async function insertConceptCard(data: InsertConceptCard) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(conceptCards).values(data);
  return result[0];
}

export async function getConceptCardsByRequestId(designRequestId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(conceptCards).where(eq(conceptCards.designRequestId, designRequestId));
}

export async function getConceptCardById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(conceptCards).where(eq(conceptCards.id, id)).limit(1);
  return result[0] ?? undefined;
}

export async function markConceptSelected(conceptCardId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(conceptCards).set({ isSelected: true }).where(eq(conceptCards.id, conceptCardId));
}

export async function markConceptRejected(conceptCardId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(conceptCards).set({ isRejected: true }).where(eq(conceptCards.id, conceptCardId));
}

// ─── Approval History ─────────────────────────────────────────────────────────

export async function insertApprovalHistory(data: {
  designRequestId: number;
  conceptCardId: number;
  actorUserId: number;
  action: "selected" | "rejected" | "regeneration_requested";
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(approvalHistory).values(data);
}

export async function getApprovalHistoryByRequestId(designRequestId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(approvalHistory).where(eq(approvalHistory.designRequestId, designRequestId)).orderBy(desc(approvalHistory.createdAt));
}

// ─── Design Packets ───────────────────────────────────────────────────────────

export async function insertDesignPacket(data: {
  designRequestId: number;
  conceptCardId: number;
  storyName: string;
  garmentList: unknown;
  palette: string[];
  materials: string[];
  trims: string[];
  constructionNotes: string;
  productionRiskScore: number;
  fileUrl?: string;
  fileKey?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(designPackets).values(data as any);
  return result[0];
}

export async function getDesignPacketByRequestId(designRequestId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(designPackets).where(eq(designPackets.designRequestId, designRequestId)).limit(1);
  return result[0] ?? undefined;
}

export async function getDesignPacketById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(designPackets).where(eq(designPackets.id, id)).limit(1);
  return result[0] ?? undefined;
}

// ─── Vendors ──────────────────────────────────────────────────────────────────

export async function getAllVendors() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vendors).where(eq(vendors.isActive, true));
}

export async function getVendorById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(vendors).where(eq(vendors.id, id)).limit(1);
  return result[0] ?? undefined;
}

// ─── Vendor Scores ────────────────────────────────────────────────────────────

export async function insertVendorScores(scores: Array<{
  designPacketId: number;
  vendorId: number;
  capabilityScore: number;
  timelineScore: number;
  reliabilityScore: number;
  priceScore: number;
  communicationsScore: number;
  totalScore: number;
  vendorRank: number;
  scoringBreakdown: unknown;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  for (const score of scores) {
    await db.insert(vendorScores).values(score as any);
  }
}

export async function getVendorScoresByPacketId(designPacketId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vendorScores).where(eq(vendorScores.designPacketId, designPacketId));
}

// ─── Production Orders ────────────────────────────────────────────────────────

export async function createProductionOrder(data: {
  designRequestId: number;
  designPacketId: number;
  vendorId: number;
  stageHistory: unknown;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(productionOrders).values({
    ...data,
    currentStage: "inquiry_sent",
  } as any);
  return result[0];
}

export async function getProductionOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(productionOrders).where(eq(productionOrders.id, id)).limit(1);
  return result[0] ?? undefined;
}

export async function getProductionOrdersByRequestId(designRequestId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(productionOrders).where(eq(productionOrders.designRequestId, designRequestId));
}

export async function getAllProductionOrders() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(productionOrders).orderBy(desc(productionOrders.createdAt));
}

export async function updateProductionOrderStage(
  orderId: number,
  stage: string,
  stageHistory: unknown,
  notes?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(productionOrders).set({
    currentStage: stage as any,
    stageHistory: stageHistory as any,
    notes: notes ?? undefined,
  }).where(eq(productionOrders.id, orderId));
}

// ─── Chat Messages ───────────────────────────────────────────────────────────

export async function saveChatMessage(data: InsertChatMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.insert(chatMessages).values(data).returning();
  return row;
}

export async function getChatMessagesByRequestId(designRequestId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chatMessages)
    .where(eq(chatMessages.designRequestId, designRequestId))
    .orderBy(chatMessages.createdAt);
}

export async function getDesignRequestsWithConceptsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const requests = await db.select().from(designRequests)
    .where(eq(designRequests.userId, userId))
    .orderBy(desc(designRequests.createdAt));
  const results = await Promise.all(
    requests.map(async (req) => {
      const concepts = await db.select().from(conceptCards)
        .where(eq(conceptCards.designRequestId, req.id))
        .orderBy(conceptCards.createdAt);
      const selectedConcept = concepts.find((c) => c.isSelected) ?? null;
      const msgRows = await db.select({ count: sql<number>`count(*)::int` })
        .from(chatMessages)
        .where(eq(chatMessages.designRequestId, req.id));
      return {
        ...req,
        concepts,
        selectedConcept,
        messageCount: Number(msgRows[0]?.count ?? 0),
      };
    })
  );
  return results;
}

// ─── Agent Logs ───────────────────────────────────────────────────────────────

export async function getAgentLogsByRequestId(designRequestId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agentLogs).where(eq(agentLogs.designRequestId, designRequestId)).orderBy(desc(agentLogs.createdAt));
}

export async function getAllAgentLogs(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agentLogs).orderBy(desc(agentLogs.createdAt)).limit(limit);
}
