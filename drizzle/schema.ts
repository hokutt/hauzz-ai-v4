import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["founder_admin", "friend_user"]).default("friend_user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Venues ───────────────────────────────────────────────────────────────────

export const venues = mysqlTable("venues", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Venue = typeof venues.$inferSelect;

// ─── Venue DNA (RAG Documents) ────────────────────────────────────────────────

export const venueDna = mysqlTable("venue_dna", {
  id: int("id").autoincrement().primaryKey(),
  venueId: int("venueId").notNull().references(() => venues.id),
  category: varchar("category", { length: 64 }).notNull(), // e.g. "aesthetic", "palette", "crowd", "energy"
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  tags: json("tags").$type<string[]>().default([]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VenueDna = typeof venueDna.$inferSelect;

// ─── Garment Ontology ─────────────────────────────────────────────────────────

export const garmentOntology = mysqlTable("garment_ontology", {
  id: int("id").autoincrement().primaryKey(),
  garmentType: varchar("garmentType", { length: 128 }).notNull(), // e.g. "bodysuit", "rave bra", "cargo pants"
  category: varchar("category", { length: 64 }).notNull(), // e.g. "top", "bottom", "outerwear", "accessory"
  constructionNotes: text("constructionNotes"),
  defaultMaterials: json("defaultMaterials").$type<string[]>().default([]),
  defaultTrims: json("defaultTrims").$type<string[]>().default([]),
  manufacturabilityBase: float("manufacturabilityBase").default(0.7), // 0–1 base score
  moqTypical: int("moqTypical").default(10),
  leadTimeDays: int("leadTimeDays").default(21),
  tags: json("tags").$type<string[]>().default([]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GarmentOntology = typeof garmentOntology.$inferSelect;

// ─── Design Requests (Intake) ─────────────────────────────────────────────────

export const designRequests = mysqlTable("design_requests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  venueSlug: varchar("venueSlug", { length: 64 }).notNull(),
  eventDate: varchar("eventDate", { length: 32 }), // ISO date string
  vibeKeywords: json("vibeKeywords").$type<string[]>().default([]),
  garmentPreferences: json("garmentPreferences").$type<string[]>().default([]),
  comfortCoverage: varchar("comfortCoverage", { length: 64 }), // e.g. "minimal", "moderate", "full"
  colors: json("colors").$type<string[]>().default([]),
  avoidList: json("avoidList").$type<string[]>().default([]),
  budgetBand: varchar("budgetBand", { length: 64 }), // e.g. "$200-$400", "$400-$800"
  bodyNotes: text("bodyNotes"),
  status: mysqlEnum("status", ["pending", "generating", "awaiting_approval", "approved", "in_production", "complete"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DesignRequest = typeof designRequests.$inferSelect;
export type InsertDesignRequest = typeof designRequests.$inferInsert;

// ─── Concept Cards ────────────────────────────────────────────────────────────

export const conceptCards = mysqlTable("concept_cards", {
  id: int("id").autoincrement().primaryKey(),
  designRequestId: int("designRequestId").notNull().references(() => designRequests.id),
  storyName: varchar("storyName", { length: 255 }).notNull(), // e.g. "Electric Warrior"
  storyNarrative: text("storyNarrative").notNull(),
  garmentList: json("garmentList").$type<ConceptGarment[]>().notNull(),
  palette: json("palette").$type<string[]>().notNull(),
  materials: json("materials").$type<string[]>().notNull(),
  trims: json("trims").$type<string[]>().default([]),
  vibeAlignment: float("vibeAlignment").notNull(), // 0–1
  manufacturabilityScore: float("manufacturabilityScore").notNull(), // 0–1
  productionRiskScore: float("productionRiskScore").notNull(), // 0–1 (lower = less risk)
  isSelected: boolean("isSelected").default(false).notNull(),
  isRejected: boolean("isRejected").default(false).notNull(),
  generationRound: int("generationRound").default(1).notNull(),
  rawLlmOutput: json("rawLlmOutput"),
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

export const approvalHistory = mysqlTable("approval_history", {
  id: int("id").autoincrement().primaryKey(),
  designRequestId: int("designRequestId").notNull().references(() => designRequests.id),
  conceptCardId: int("conceptCardId").notNull().references(() => conceptCards.id),
  actorUserId: int("actorUserId").notNull().references(() => users.id),
  action: mysqlEnum("action", ["selected", "rejected", "regeneration_requested"]).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ApprovalHistory = typeof approvalHistory.$inferSelect;

// ─── Design Packets ───────────────────────────────────────────────────────────

export const designPackets = mysqlTable("design_packets", {
  id: int("id").autoincrement().primaryKey(),
  designRequestId: int("designRequestId").notNull().references(() => designRequests.id),
  conceptCardId: int("conceptCardId").notNull().references(() => conceptCards.id),
  storyName: varchar("storyName", { length: 255 }).notNull(),
  garmentList: json("garmentList").$type<ConceptGarment[]>().notNull(),
  palette: json("palette").$type<string[]>().notNull(),
  materials: json("materials").$type<string[]>().notNull(),
  trims: json("trims").$type<string[]>().default([]),
  constructionNotes: text("constructionNotes"),
  productionRiskScore: float("productionRiskScore").notNull(),
  fileUrl: varchar("fileUrl", { length: 1024 }), // S3 URL for the full packet JSON
  fileKey: varchar("fileKey", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DesignPacket = typeof designPackets.$inferSelect;

// ─── Vendors ──────────────────────────────────────────────────────────────────

export const vendors = mysqlTable("vendors", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  contactEmail: varchar("contactEmail", { length: 320 }),
  contactName: varchar("contactName", { length: 255 }),
  geography: varchar("geography", { length: 128 }), // e.g. "USA", "China", "Mexico"
  capabilities: json("capabilities").$type<string[]>().default([]), // e.g. ["bodysuit", "rave bra", "embroidery"]
  moqMin: int("moqMin").default(10),
  turnaroundDays: int("turnaroundDays").default(30),
  priceBand: varchar("priceBand", { length: 64 }), // e.g. "$", "$$", "$$$"
  reliabilityScore: float("reliabilityScore").default(0.7), // 0–1
  communicationsScore: float("communicationsScore").default(0.7), // 0–1
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = typeof vendors.$inferInsert;

// ─── Vendor Scores ────────────────────────────────────────────────────────────

export const vendorScores = mysqlTable("vendor_scores", {
  id: int("id").autoincrement().primaryKey(),
  designPacketId: int("designPacketId").notNull().references(() => designPackets.id),
  vendorId: int("vendorId").notNull().references(() => vendors.id),
  capabilityScore: float("capabilityScore").notNull(), // 0–1
  timelineScore: float("timelineScore").notNull(), // 0–1
  reliabilityScore: float("reliabilityScore").notNull(), // 0–1
  priceScore: float("priceScore").notNull(), // 0–1
  communicationsScore: float("communicationsScore").notNull(), // 0–1
  totalScore: float("totalScore").notNull(), // weighted composite
  vendorRank: int("vendorRank").notNull(),
  scoringBreakdown: json("scoringBreakdown").$type<VendorScoringBreakdown>(),
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

export const productionOrders = mysqlTable("production_orders", {
  id: int("id").autoincrement().primaryKey(),
  designRequestId: int("designRequestId").notNull().references(() => designRequests.id),
  designPacketId: int("designPacketId").notNull().references(() => designPackets.id),
  vendorId: int("vendorId").notNull().references(() => vendors.id),
  currentStage: mysqlEnum("currentStage", ORDER_STAGES).default("inquiry_sent").notNull(),
  stageHistory: json("stageHistory").$type<OrderStageEvent[]>().default([]),
  quoteAmount: float("quoteAmount"),
  currency: varchar("currency", { length: 8 }).default("USD"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OrderStageEvent = {
  stage: OrderStage;
  enteredAt: string; // ISO timestamp
  actorUserId: number;
  notes?: string;
};

export type ProductionOrder = typeof productionOrders.$inferSelect;
export type InsertProductionOrder = typeof productionOrders.$inferInsert;

// ─── Agent Logs ───────────────────────────────────────────────────────────────

export const agentLogs = mysqlTable("agent_logs", {
  id: int("id").autoincrement().primaryKey(),
  designRequestId: int("designRequestId").references(() => designRequests.id),
  stage: varchar("stage", { length: 64 }).notNull(), // e.g. "intake", "rag_retrieval", "concept_generation", "approval", "packet_generation", "vendor_scoring", "order_transition"
  level: mysqlEnum("level", ["info", "warn", "error"]).default("info").notNull(),
  message: text("message").notNull(),
  payload: json("payload"), // structured data: prompts, inputs, outputs, scores
  durationMs: int("durationMs"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgentLog = typeof agentLogs.$inferSelect;
export type InsertAgentLog = typeof agentLogs.$inferInsert;
