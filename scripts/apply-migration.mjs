/**
 * Apply the HAUZZ.AI V4 schema migration by running all CREATE TABLE statements
 * using the drizzle-kit migrate command which handles TiDB-compatible SQL.
 */
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { createConnection } from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

// Parse the DATABASE_URL
const url = new URL(DB_URL);
const connection = await createConnection({
  host: url.hostname,
  port: parseInt(url.port || "4000"),
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
  multipleStatements: true,
});

const tables = [
  {
    name: "garment_ontology",
    sql: `CREATE TABLE IF NOT EXISTS garment_ontology (
      id int AUTO_INCREMENT NOT NULL,
      garmentType varchar(128) NOT NULL,
      category varchar(64) NOT NULL,
      constructionNotes text,
      defaultMaterials json,
      defaultTrims json,
      manufacturabilityBase float DEFAULT 0.7,
      moqTypical int DEFAULT 10,
      leadTimeDays int DEFAULT 21,
      tags json,
      createdAt timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT garment_ontology_id PRIMARY KEY(id)
    )`,
  },
  {
    name: "design_requests",
    sql: `CREATE TABLE IF NOT EXISTS design_requests (
      id int AUTO_INCREMENT NOT NULL,
      userId int NOT NULL,
      venueSlug varchar(64) NOT NULL,
      eventDate varchar(32),
      vibeKeywords json,
      garmentPreferences json,
      comfortCoverage varchar(64),
      colors json,
      avoidList json,
      budgetBand varchar(64),
      bodyNotes text,
      status enum('pending','generating','awaiting_approval','approved','in_production','complete') NOT NULL DEFAULT 'pending',
      createdAt timestamp NOT NULL DEFAULT (now()),
      updatedAt timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT design_requests_id PRIMARY KEY(id)
    )`,
  },
  {
    name: "concept_cards",
    sql: `CREATE TABLE IF NOT EXISTS concept_cards (
      id int AUTO_INCREMENT NOT NULL,
      designRequestId int NOT NULL,
      storyName varchar(255) NOT NULL,
      storyNarrative text NOT NULL,
      garmentList json NOT NULL,
      palette json NOT NULL,
      materials json NOT NULL,
      trims json,
      vibeAlignment float NOT NULL,
      manufacturabilityScore float NOT NULL,
      productionRiskScore float NOT NULL,
      isSelected boolean NOT NULL DEFAULT false,
      isRejected boolean NOT NULL DEFAULT false,
      generationRound int NOT NULL DEFAULT 1,
      rawLlmOutput json,
      createdAt timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT concept_cards_id PRIMARY KEY(id)
    )`,
  },
  {
    name: "approval_history",
    sql: `CREATE TABLE IF NOT EXISTS approval_history (
      id int AUTO_INCREMENT NOT NULL,
      designRequestId int NOT NULL,
      conceptCardId int NOT NULL,
      actorUserId int NOT NULL,
      action enum('selected','rejected','regeneration_requested') NOT NULL,
      notes text,
      createdAt timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT approval_history_id PRIMARY KEY(id)
    )`,
  },
  {
    name: "design_packets",
    sql: `CREATE TABLE IF NOT EXISTS design_packets (
      id int AUTO_INCREMENT NOT NULL,
      designRequestId int NOT NULL,
      conceptCardId int NOT NULL,
      storyName varchar(255) NOT NULL,
      garmentList json NOT NULL,
      palette json NOT NULL,
      materials json NOT NULL,
      trims json,
      constructionNotes text,
      productionRiskScore float NOT NULL,
      fileUrl varchar(1024),
      fileKey varchar(512),
      createdAt timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT design_packets_id PRIMARY KEY(id)
    )`,
  },
  {
    name: "vendors",
    sql: `CREATE TABLE IF NOT EXISTS vendors (
      id int AUTO_INCREMENT NOT NULL,
      name varchar(255) NOT NULL,
      contactEmail varchar(320),
      contactName varchar(255),
      geography varchar(128),
      capabilities json,
      moqMin int DEFAULT 10,
      turnaroundDays int DEFAULT 30,
      priceBand varchar(64),
      reliabilityScore float DEFAULT 0.7,
      communicationsScore float DEFAULT 0.7,
      notes text,
      isActive boolean NOT NULL DEFAULT true,
      createdAt timestamp NOT NULL DEFAULT (now()),
      updatedAt timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT vendors_id PRIMARY KEY(id)
    )`,
  },
  {
    name: "vendor_scores",
    sql: `CREATE TABLE IF NOT EXISTS vendor_scores (
      id int AUTO_INCREMENT NOT NULL,
      designPacketId int NOT NULL,
      vendorId int NOT NULL,
      capabilityScore float NOT NULL,
      timelineScore float NOT NULL,
      reliabilityScore float NOT NULL,
      priceScore float NOT NULL,
      communicationsScore float NOT NULL,
      totalScore float NOT NULL,
      rank int NOT NULL,
      scoringBreakdown json,
      createdAt timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT vendor_scores_id PRIMARY KEY(id)
    )`,
  },
  {
    name: "production_orders",
    sql: `CREATE TABLE IF NOT EXISTS production_orders (
      id int AUTO_INCREMENT NOT NULL,
      designRequestId int NOT NULL,
      designPacketId int NOT NULL,
      vendorId int NOT NULL,
      currentStage enum('inquiry_sent','quote_received','sample','approved','production','qa','shipped','delivered') NOT NULL DEFAULT 'inquiry_sent',
      stageHistory json,
      quoteAmount float,
      currency varchar(8) DEFAULT 'USD',
      notes text,
      createdAt timestamp NOT NULL DEFAULT (now()),
      updatedAt timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT production_orders_id PRIMARY KEY(id)
    )`,
  },
  {
    name: "agent_logs",
    sql: `CREATE TABLE IF NOT EXISTS agent_logs (
      id int AUTO_INCREMENT NOT NULL,
      designRequestId int,
      stage varchar(64) NOT NULL,
      level enum('info','warn','error') NOT NULL DEFAULT 'info',
      message text NOT NULL,
      payload json,
      durationMs int,
      createdAt timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT agent_logs_id PRIMARY KEY(id)
    )`,
  },
];

// Alter users table role enum
const alterUsers = `ALTER TABLE users MODIFY COLUMN role enum('founder_admin','friend_user') NOT NULL DEFAULT 'friend_user'`;

console.log("Applying HAUZZ.AI V4 schema migration...");

for (const table of tables) {
  try {
    await connection.execute(table.sql);
    console.log(`✓ ${table.name}`);
  } catch (err) {
    console.error(`✗ ${table.name}:`, err.message);
  }
}

try {
  await connection.execute(alterUsers);
  console.log("✓ users role enum updated");
} catch (err) {
  console.error("✗ users alter:", err.message);
}

await connection.end();
console.log("Migration complete.");
