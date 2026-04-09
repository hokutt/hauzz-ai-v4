-- ============================================================
-- HAUZZ.AI V4 — Supabase PostgreSQL Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Enums ───────────────────────────────────────────────────
do $$ begin
  create type user_role as enum ('founder_admin', 'friend_user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type design_request_status as enum (
    'pending', 'generating', 'awaiting_approval', 'approved', 'in_production', 'complete'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type approval_action as enum ('selected', 'rejected', 'regeneration_requested');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_stage as enum (
    'inquiry_sent', 'quote_received', 'sample', 'approved',
    'production', 'qa', 'shipped', 'delivered'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type log_level as enum ('info', 'warn', 'error');
exception when duplicate_object then null; end $$;

-- ─── Users ────────────────────────────────────────────────────
create table if not exists public.users (
  id          serial primary key,
  open_id     varchar(64)  not null unique,
  name        text,
  email       varchar(320),
  login_method varchar(64),
  role        user_role    not null default 'friend_user',
  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now(),
  last_signed_in timestamptz not null default now()
);

-- ─── Venues ───────────────────────────────────────────────────
create table if not exists public.venues (
  id          serial primary key,
  slug        varchar(64)  not null unique,
  name        varchar(255) not null,
  location    varchar(255),
  description text,
  created_at  timestamptz  not null default now()
);

-- ─── Venue DNA (RAG Documents) ────────────────────────────────
create table if not exists public.venue_dna (
  id          serial primary key,
  venue_id    int          not null references public.venues(id) on delete cascade,
  category    varchar(64)  not null,
  title       varchar(255) not null,
  content     text         not null,
  tags        jsonb        not null default '[]',
  created_at  timestamptz  not null default now()
);

-- ─── Garment Ontology ─────────────────────────────────────────
create table if not exists public.garment_ontology (
  id                    serial primary key,
  garment_type          varchar(128) not null,
  category              varchar(64)  not null,
  construction_notes    text,
  default_materials     jsonb        not null default '[]',
  default_trims         jsonb        not null default '[]',
  manufacturability_base float       not null default 0.7,
  moq_typical           int          not null default 10,
  lead_time_days        int          not null default 21,
  tags                  jsonb        not null default '[]',
  created_at            timestamptz  not null default now()
);

-- ─── Design Requests (Intake) ─────────────────────────────────
create table if not exists public.design_requests (
  id                  serial primary key,
  user_id             int          not null references public.users(id) on delete cascade,
  venue_slug          varchar(64)  not null,
  event_date          varchar(32),
  vibe_keywords       jsonb        not null default '[]',
  garment_preferences jsonb        not null default '[]',
  comfort_coverage    varchar(64),
  colors              jsonb        not null default '[]',
  avoid_list          jsonb        not null default '[]',
  budget_band         varchar(64),
  body_notes          text,
  status              design_request_status not null default 'pending',
  created_at          timestamptz  not null default now(),
  updated_at          timestamptz  not null default now()
);

-- ─── Concept Cards ────────────────────────────────────────────
create table if not exists public.concept_cards (
  id                      serial primary key,
  design_request_id       int          not null references public.design_requests(id) on delete cascade,
  story_name              varchar(255) not null,
  story_narrative         text         not null,
  garment_list            jsonb        not null default '[]',
  palette                 jsonb        not null default '[]',
  materials               jsonb        not null default '[]',
  trims                   jsonb        not null default '[]',
  vibe_alignment          float        not null default 0.8,
  manufacturability_score float        not null default 0.7,
  production_risk_score   float        not null default 0.3,
  is_selected             boolean      not null default false,
  is_rejected             boolean      not null default false,
  generation_round        int          not null default 1,
  raw_llm_output          jsonb,
  created_at              timestamptz  not null default now()
);

-- ─── Approval History ─────────────────────────────────────────
create table if not exists public.approval_history (
  id                serial primary key,
  design_request_id int             not null references public.design_requests(id) on delete cascade,
  concept_card_id   int             not null references public.concept_cards(id) on delete cascade,
  actor_user_id     int             not null references public.users(id),
  action            approval_action not null,
  notes             text,
  created_at        timestamptz     not null default now()
);

-- ─── Design Packets ───────────────────────────────────────────
create table if not exists public.design_packets (
  id                    serial primary key,
  design_request_id     int          not null references public.design_requests(id) on delete cascade,
  concept_card_id       int          not null references public.concept_cards(id) on delete cascade,
  story_name            varchar(255) not null,
  garment_list          jsonb        not null default '[]',
  palette               jsonb        not null default '[]',
  materials             jsonb        not null default '[]',
  trims                 jsonb        not null default '[]',
  construction_notes    text,
  production_risk_score float        not null default 0.3,
  file_url              varchar(1024),
  file_key              varchar(512),
  created_at            timestamptz  not null default now()
);

-- ─── Vendors ──────────────────────────────────────────────────
create table if not exists public.vendors (
  id                  serial primary key,
  name                varchar(255) not null,
  contact_email       varchar(320),
  contact_name        varchar(255),
  geography           varchar(128),
  capabilities        jsonb        not null default '[]',
  moq_min             int          not null default 10,
  turnaround_days     int          not null default 30,
  price_band          varchar(64),
  reliability_score   float        not null default 0.7,
  communications_score float       not null default 0.7,
  notes               text,
  is_active           boolean      not null default true,
  created_at          timestamptz  not null default now(),
  updated_at          timestamptz  not null default now()
);

-- ─── Vendor Scores ────────────────────────────────────────────
create table if not exists public.vendor_scores (
  id                  serial primary key,
  design_packet_id    int     not null references public.design_packets(id) on delete cascade,
  vendor_id           int     not null references public.vendors(id) on delete cascade,
  capability_score    float   not null,
  timeline_score      float   not null,
  reliability_score   float   not null,
  price_score         float   not null,
  communications_score float  not null,
  total_score         float   not null,
  vendor_rank         int     not null,
  scoring_breakdown   jsonb,
  created_at          timestamptz not null default now()
);

-- ─── Production Orders ────────────────────────────────────────
create table if not exists public.production_orders (
  id                serial primary key,
  design_request_id int          not null references public.design_requests(id) on delete cascade,
  design_packet_id  int          not null references public.design_packets(id) on delete cascade,
  vendor_id         int          not null references public.vendors(id),
  current_stage     order_stage  not null default 'inquiry_sent',
  stage_history     jsonb        not null default '[]',
  quote_amount      float,
  currency          varchar(8)   not null default 'USD',
  notes             text,
  created_at        timestamptz  not null default now(),
  updated_at        timestamptz  not null default now()
);

-- ─── Agent Logs ───────────────────────────────────────────────
create table if not exists public.agent_logs (
  id                serial primary key,
  design_request_id int         references public.design_requests(id) on delete set null,
  stage             varchar(64) not null,
  level             log_level   not null default 'info',
  message           text        not null,
  payload           jsonb,
  duration_ms       int,
  created_at        timestamptz not null default now()
);

-- ─── Indexes ──────────────────────────────────────────────────
create index if not exists idx_venue_dna_venue_id       on public.venue_dna(venue_id);
create index if not exists idx_design_requests_user_id  on public.design_requests(user_id);
create index if not exists idx_concept_cards_request_id on public.concept_cards(design_request_id);
create index if not exists idx_approval_history_req_id  on public.approval_history(design_request_id);
create index if not exists idx_design_packets_req_id    on public.design_packets(design_request_id);
create index if not exists idx_vendor_scores_packet_id  on public.vendor_scores(design_packet_id);
create index if not exists idx_production_orders_req_id on public.production_orders(design_request_id);
create index if not exists idx_agent_logs_req_id        on public.agent_logs(design_request_id);
create index if not exists idx_agent_logs_stage         on public.agent_logs(stage);

-- ─── Updated_at trigger ───────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

create or replace trigger trg_design_requests_updated_at
  before update on public.design_requests
  for each row execute function public.set_updated_at();

create or replace trigger trg_vendors_updated_at
  before update on public.vendors
  for each row execute function public.set_updated_at();

create or replace trigger trg_production_orders_updated_at
  before update on public.production_orders
  for each row execute function public.set_updated_at();
