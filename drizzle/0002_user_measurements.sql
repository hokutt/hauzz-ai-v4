-- Migration: Add user_measurements table for Phase 2 Sizing System
-- Stores per-user body measurements, fit preferences, and sizing source

DO $$ BEGIN
  CREATE TYPE "fit_preference" AS ENUM ('fitted', 'relaxed', 'oversized');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "length_preference" AS ENUM ('true_to_size', 'runs_small', 'runs_large');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "user_measurements" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL UNIQUE,
  "bust" double precision,
  "waist" double precision,
  "hips" double precision,
  "inseam" double precision,
  "shoulder" double precision,
  "height" double precision,
  "size_label" varchar(8),
  "fit_preference" "fit_preference" DEFAULT 'relaxed' NOT NULL,
  "length_preference" "length_preference" DEFAULT 'true_to_size' NOT NULL,
  "source" varchar(32) DEFAULT 'manual' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "user_measurements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Add measurements JSONB column to design_packets for downstream tech packs
ALTER TABLE "design_packets" ADD COLUMN IF NOT EXISTS "measurements" jsonb;

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS "idx_user_measurements_user_id" ON "user_measurements" ("user_id");
