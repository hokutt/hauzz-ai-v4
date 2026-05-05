-- Migration: Voice Trade Journal
-- Adds the trades table for voice-driven trade logging with optional chart screenshots.

DO $$ BEGIN
  CREATE TYPE "trade_side" AS ENUM ('long', 'short');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "trade_status" AS ENUM ('open', 'closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "trades" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "symbol" varchar(32),
  "side" "trade_side",
  "status" "trade_status" DEFAULT 'open' NOT NULL,
  "entry_price" double precision,
  "exit_price" double precision,
  "quantity" double precision,
  "pnl" double precision,
  "entry_at" timestamp,
  "exit_at" timestamp,
  "strategy" varchar(128),
  "notes" text,
  "tags" jsonb DEFAULT '[]'::jsonb,
  "image_urls" jsonb DEFAULT '[]'::jsonb,
  "raw_transcript" text,
  "agent_summary" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "trades_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_trades_user_id" ON "trades" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_trades_created_at" ON "trades" ("created_at" DESC);
