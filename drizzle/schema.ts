import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
  doublePrecision,
  boolean,
  jsonb,
  serial,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", ["founder_admin", "friend_user"]);
export const designRequestStatusEnum = pgEnum("design_request_status", [
  "pending", "generating", "awaiting_approval", "approved", "in_production", "complete",
]);
export const approvalActionEnum = pgEnum("approval_action", [
  "selected", "rejected", "regeneration_requested",
]);
export const orderStageEnum = pgEnum("order_stage", [
  "inquiry_sent", "quote_received", "sample", "approved",
  "production", "qa", "shipped", "delivered",
]);
export const logLevelEnum = pgEnum("log_level", ["info", "warn", "error"]);

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("friend_user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Venues ───────────────────────────────────────────────────────────────────

export const venues = pgTable("venues", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Venue = typeof venues.$inferSelect;

// ─── Venue DNA (RAG Documents) ────────────────────────────────────────────────

export const venueDna = pgTable("venue_dna", {
  id: serial("id").primaryKey(),
  venueId: integer("venueId").notNull().references(() => venues.id),
  category: varchar("category", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  tags: jsonb("tags").$type<string[]>().default([]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VenueDna = typeof venueDna.$inferSelect;

// ─── Garment Ontology ─────────────────────────────────────────────────────────

export const garmentOntology = pgTable("garment_ontology", {
  id: serial("id").primaryKey(),
  garmentType: varchar("garmentType", { length: 128 }).notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  constructionNotes: text("constructionNotes"),
  defaultMaterials: jsonb("defaultMaterials").$type<string[]>().default([]),
  defaultTrims: jsonb("defaultTrims").$type<string[]>().default([]),
  manufacturabilityBase: doublePrecision("manufacturabilityBase").default(0.7),
  moqTypical: integer("moqTypical").default(10),
  leadTimeDays: integer("leadTimeDays").default(21),
  tags: jsonb("tags").$type<string[]>().default([]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GarmentOntology = typeof garmentOntology.$inferSelect;

// ─── Design Requests (Intake) ─────────────────────────────────────────────────

export const designRequests = pgTable("design_requests", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id),
  venueSlug: varchar("venueSlug", { length: 64 }).notNull(),
  eventDate: varchar("eventDate", { length: 32 }),
  vibeKeywords: jsonb("vibeKeywords").$type<string[]>().default([]),
  garmentPreferences: jsonb("garmentPreferences").$type<string[]>().default([]),
  comfortCoverage: varchar("comfortCoverage", { length: 64 }),
  colors: jsonb("colors").$type<string[]>().default([]),
  avoidList: jsonb("avoidList").$type<string[]>().default([]),
  budgetBand: varchar("budgetBand", { length: 64 }),
  bodyNotes: text("bodyNotes"),
  status: designRequestStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type DesignRequest = typeof designRequests.$inferSelect;
export type InsertDesignRequest = typeof designRequests.$inferInsert;

// ─── Concept Cards ────────────────────────────────────────────────────────────

export const conceptCards = pgTable("concept_cards", {
  id: serial("id").primaryKey(),
  designRequestId: integer("designRequestId").notNull().references(() => designRequests.id),
  storyName: varchar("storyName", { length: 255 }).notNull(),
  storyNarrative: text("storyNarrative").notNull(),
  garmentList: jsonb("garmentList").$type<ConceptGarment[]>().notNull(),
  palette: jsonb("palette").$type<string[]>().notNull(),
  materials: jsonb("materials").$type<string[]>().notNull(),
  trims: jsonb("trims").$type<string[]>().default([]),
  vibeAlignment: doublePrecision("vibeAlignment").notNull(),
  manufacturabilityScore: doublePrecision("manufacturabilityScore").notNull(),
  productionRiskScore: doublePrecision("productionRiskScore").notNull(),
  isSelected: boolean("isSelected").default(false).notNull(),
  isRejected: boolean("isRejected").default(false).notNull(),
  generationRound: integer("generationRound").default(1).notNull(),
  rawLlmOutput: jsonb("rawLlmOutput"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ConceptGarment = {
  garmentType: string;
  description: string;
  materials: string[];
  trims: string[];
  constructionNotes: string;
};

export type ConceptCard = typeof conceptCards.$inferSelect;
export type InsertConceptCard = typeof conceptCards.$inferInsert;

// ─── Approval History ─────────────────────────────────────────────────────────

export const approvalHistory = pgTable("approval_history", {
  id: serial("id").primaryKey(),
  designRequestId: integer("designRequestId").notNull().references(() => designRequests.id),
  conceptCardId: integer("conceptCardId").notNull().references(() => conceptCards.id),
  actorUserId: integer("actorUserId").notNull().references(() => users.id),
  action: approvalActionEnum("action").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ApprovalHistory = typeof approvalHistory.$inferSelect;

// ─── Design Packets ───────────────────────────────────────────────────────────

export const designPackets = pgTable("design_packets", {
  id: serial("id").primaryKey(),
  designRequestId: integer("designRequestId").notNull().references(() => designRequests.id),
  conceptCardId: integer("conceptCardId").notNull().references(() => conceptCards.id),
  storyName: varchar("storyName", { length: 255 }).notNull(),
  garmentList: jsonb("garmentList").$type<ConceptGarment[]>().notNull(),
  palette: jsonb("palette").$type<string[]>().notNull(),
  materials: jsonb("materials").$type<string[]>().notNull(),
  trims: jsonb("trims").$type<string[]>().default([]),
  constructionNotes: text("constructionNotes"),
  productionRiskScore: doublePrecision("productionRiskScore").notNull(),
  fileUrl: varchar("fileUrl", { length: 1024 }),
  fileKey: varchar("fileKey", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DesignPacket = typeof designPackets.$inferSelect;

// ─── Vendors ──────────────────────────────────────────────────────────────────

export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  contactEmail: varchar("contactEmail", { length: 320 }),
  contactName: varchar("contactName", { length: 255 }),
  geography: varchar("geography", { length: 128 }),
  capabilities: jsonb("capabilities").$type<string[]>().default([]),
  moqMin: integer("moqMin").default(10),
  turnaroundDays: integer("turnaroundDays").default(30),
  priceBand: varchar("priceBand", { length: 64 }),
  reliabilityScore: doublePrecision("reliabilityScore").default(0.7),
  communicationsScore: doublePrecision("communicationsScore").default(0.7),
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = typeof vendors.$inferInsert;

// ─── Vendor Scores ────────────────────────────────────────────────────────────

export const vendorScores = pgTable("vendor_scores", {
  id: serial("id").primaryKey(),
  designPacketId: integer("designPacketId").notNull().references(() => designPackets.id),
  vendorId: integer("vendorId").notNull().references(() => vendors.id),
  capabilityScore: doublePrecision("capabilityScore").notNull(),
  timelineScore: doublePrecision("timelineScore").notNull(),
  reliabilityScore: doublePrecision("reliabilityScore").notNull(),
  priceScore: doublePrecision("priceScore").notNull(),
  communicationsScore: doublePrecision("communicationsScore").notNull(),
  totalScore: doublePrecision("totalScore").notNull(),
  vendorRank: integer("vendorRank").notNull(),
  scoringBreakdown: jsonb("scoringBreakdown").$type<VendorScoringBreakdown>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VendorScoringBreakdown = {
  capability: { raw: number; weight: number; weighted: number };
  timeline: { raw: number; weight: number; weighted: number };
  reliability: { raw: number; weight: number; weighted: number };
  price: { raw: number; weight: number; weighted: number };
  communications: { raw: number; weight: number; weighted: number };
  total: number;
};

export type VendorScore = typeof vendorScores.$inferSelect;

// ─── Production Orders ────────────────────────────────────────────────────────

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

export type OrderStage = (typeof ORDER_STAGES)[number];

export const productionOrders = pgTable("production_orders", {
  id: serial("id").primaryKey(),
  designRequestId: integer("designRequestId").notNull().references(() => designRequests.id),
  designPacketId: integer("designPacketId").notNull().references(() => designPackets.id),
  vendorId: integer("vendorId").notNull().references(() => vendors.id),
  currentStage: orderStageEnum("currentStage").default("inquiry_sent").notNull(),
  stageHistory: jsonb("stageHistory").$type<OrderStageEvent[]>().default([]),
  quoteAmount: doublePrecision("quoteAmount"),
  currency: varchar("currency", { length: 8 }).default("USD"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type OrderStageEvent = {
  stage: OrderStage;
  enteredAt: string;
  actorUserId: number;
  notes?: string;
};

export type ProductionOrder = typeof productionOrders.$inferSelect;
export type InsertProductionOrder = typeof productionOrders.$inferInsert;

// ─── Agent Logs ───────────────────────────────────────────────────────────────

export const agentLogs = pgTable("agent_logs", {
  id: serial("id").primaryKey(),
  designRequestId: integer("designRequestId").references(() => designRequests.id),
  stage: varchar("stage", { length: 64 }).notNull(),
  level: logLevelEnum("level").default("info").notNull(),
  message: text("message").notNull(),
  payload: jsonb("payload"),
  durationMs: integer("durationMs"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgentLog = typeof agentLogs.$inferSelect;
export type InsertAgentLog = typeof agentLogs.$inferInsert;
