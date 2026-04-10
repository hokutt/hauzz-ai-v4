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
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: userRoleEnum("role").default("friend_user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
  bodyPhotoUrl: text("body_photo_url"),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Venue = typeof venues.$inferSelect;

// ─── Venue DNA (RAG Documents) ────────────────────────────────────────────────

export const venueDna = pgTable("venue_dna", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id").notNull().references(() => venues.id),
  category: varchar("category", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  tags: jsonb("tags").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type VenueDna = typeof venueDna.$inferSelect;

// ─── Garment Ontology ─────────────────────────────────────────────────────────

export const garmentOntology = pgTable("garment_ontology", {
  id: serial("id").primaryKey(),
  garmentType: varchar("garment_type", { length: 128 }).notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  constructionNotes: text("construction_notes"),
  defaultMaterials: jsonb("default_materials").$type<string[]>().default([]),
  defaultTrims: jsonb("default_trims").$type<string[]>().default([]),
  manufacturabilityBase: doublePrecision("manufacturability_base").default(0.7),
  moqTypical: integer("moq_typical").default(10),
  leadTimeDays: integer("lead_time_days").default(21),
  tags: jsonb("tags").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type GarmentOntology = typeof garmentOntology.$inferSelect;

// ─── Design Requests (Intake) ─────────────────────────────────────────────────

export const designRequests = pgTable("design_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  venueSlug: varchar("venue_slug", { length: 64 }).notNull(),
  eventDate: varchar("event_date", { length: 32 }),
  vibeKeywords: jsonb("vibe_keywords").$type<string[]>().default([]),
  garmentPreferences: jsonb("garment_preferences").$type<string[]>().default([]),
  comfortCoverage: varchar("comfort_coverage", { length: 64 }),
  colors: jsonb("colors").$type<string[]>().default([]),
  avoidList: jsonb("avoid_list").$type<string[]>().default([]),
  budgetBand: varchar("budget_band", { length: 64 }),
  bodyNotes: text("body_notes"),
  status: designRequestStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type DesignRequest = typeof designRequests.$inferSelect;
export type InsertDesignRequest = typeof designRequests.$inferInsert;

// ─── Concept Cards ────────────────────────────────────────────────────────────

export const conceptCards = pgTable("concept_cards", {
  id: serial("id").primaryKey(),
  designRequestId: integer("design_request_id").notNull().references(() => designRequests.id),
  storyName: varchar("story_name", { length: 255 }).notNull(),
  storyNarrative: text("story_narrative").notNull(),
  garmentList: jsonb("garment_list").$type<ConceptGarment[]>().notNull(),
  palette: jsonb("palette").$type<string[]>().notNull(),
  materials: jsonb("materials").$type<string[]>().notNull(),
  trims: jsonb("trims").$type<string[]>().default([]),
  vibeAlignment: doublePrecision("vibe_alignment").notNull(),
  manufacturabilityScore: doublePrecision("manufacturability_score").notNull(),
  productionRiskScore: doublePrecision("production_risk_score").notNull(),
  isSelected: boolean("is_selected").default(false).notNull(),
  isRejected: boolean("is_rejected").default(false).notNull(),
  generationRound: integer("generation_round").default(1).notNull(),
  rawLlmOutput: jsonb("raw_llm_output"),
  fashnRenderUrl: text("fashn_render_url"),
  fashnFlatLayUrl: text("fashn_flat_lay_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  designRequestId: integer("design_request_id").notNull().references(() => designRequests.id),
  conceptCardId: integer("concept_card_id").notNull().references(() => conceptCards.id),
  actorUserId: integer("actor_user_id").notNull().references(() => users.id),
  action: approvalActionEnum("action").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ApprovalHistory = typeof approvalHistory.$inferSelect;

// ─── Design Packets ───────────────────────────────────────────────────────────

export const designPackets = pgTable("design_packets", {
  id: serial("id").primaryKey(),
  designRequestId: integer("design_request_id").notNull().references(() => designRequests.id),
  conceptCardId: integer("concept_card_id").notNull().references(() => conceptCards.id),
  storyName: varchar("story_name", { length: 255 }).notNull(),
  garmentList: jsonb("garment_list").$type<ConceptGarment[]>().notNull(),
  palette: jsonb("palette").$type<string[]>().notNull(),
  materials: jsonb("materials").$type<string[]>().notNull(),
  trims: jsonb("trims").$type<string[]>().default([]),
  constructionNotes: text("construction_notes"),
  productionRiskScore: doublePrecision("production_risk_score").notNull(),
  fileUrl: varchar("file_url", { length: 1024 }),
  fileKey: varchar("file_key", { length: 512 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DesignPacket = typeof designPackets.$inferSelect;

// ─── Vendors ──────────────────────────────────────────────────────────────────

export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  contactEmail: varchar("contact_email", { length: 320 }),
  contactName: varchar("contact_name", { length: 255 }),
  geography: varchar("geography", { length: 128 }),
  capabilities: jsonb("capabilities").$type<string[]>().default([]),
  moqMin: integer("moq_min").default(10),
  turnaroundDays: integer("turnaround_days").default(30),
  priceBand: varchar("price_band", { length: 64 }),
  reliabilityScore: doublePrecision("reliability_score").default(0.7),
  communicationsScore: doublePrecision("communications_score").default(0.7),
  notes: text("notes"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = typeof vendors.$inferInsert;

// ─── Vendor Scores ────────────────────────────────────────────────────────────

export const vendorScores = pgTable("vendor_scores", {
  id: serial("id").primaryKey(),
  designPacketId: integer("design_packet_id").notNull().references(() => designPackets.id),
  vendorId: integer("vendor_id").notNull().references(() => vendors.id),
  capabilityScore: doublePrecision("capability_score").notNull(),
  timelineScore: doublePrecision("timeline_score").notNull(),
  reliabilityScore: doublePrecision("reliability_score").notNull(),
  priceScore: doublePrecision("price_score").notNull(),
  communicationsScore: doublePrecision("communications_score").notNull(),
  totalScore: doublePrecision("total_score").notNull(),
  vendorRank: integer("vendor_rank").notNull(),
  scoringBreakdown: jsonb("scoring_breakdown").$type<VendorScoringBreakdown>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  designRequestId: integer("design_request_id").notNull().references(() => designRequests.id),
  designPacketId: integer("design_packet_id").notNull().references(() => designPackets.id),
  vendorId: integer("vendor_id").notNull().references(() => vendors.id),
  currentStage: orderStageEnum("current_stage").default("inquiry_sent").notNull(),
  stageHistory: jsonb("stage_history").$type<OrderStageEvent[]>().default([]),
  quoteAmount: doublePrecision("quote_amount"),
  currency: varchar("currency", { length: 8 }).default("USD"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type OrderStageEvent = {
  stage: OrderStage;
  enteredAt: string;
  actorUserId: number;
  notes?: string;
};

export type ProductionOrder = typeof productionOrders.$inferSelect;
export type InsertProductionOrder = typeof productionOrders.$inferInsert;

// ─── Chat Messages ───────────────────────────────────────────────────────────

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  designRequestId: integer("design_request_id").notNull().references(() => designRequests.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 16 }).notNull(), // 'user' | 'assistant'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

// ─── Agent Logs ───────────────────────────────────────────────────────────────

export const agentLogs = pgTable("agent_logs", {
  id: serial("id").primaryKey(),
  designRequestId: integer("design_request_id").references(() => designRequests.id),
  stage: varchar("stage", { length: 64 }).notNull(),
  level: logLevelEnum("level").default("info").notNull(),
  message: text("message").notNull(),
  payload: jsonb("payload"),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AgentLog = typeof agentLogs.$inferSelect;
