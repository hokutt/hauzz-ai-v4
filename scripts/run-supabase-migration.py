"""
Apply HAUZZ.AI V4 schema to Supabase via MCP execute_sql tool
Runs each table creation as a separate statement for reliability
"""
import subprocess
import json
import sys

PROJECT_ID = "eujvbnqugnkwpwskdort"

def execute_sql(sql: str, label: str) -> bool:
    """Execute SQL via Supabase MCP tool"""
    payload = json.dumps({"project_id": PROJECT_ID, "query": sql})
    result = subprocess.run(
        ["manus-mcp-cli", "tool", "call", "execute_sql", "--server", "supabase", "--input", payload],
        capture_output=True, text=True, timeout=30
    )
    output = result.stdout + result.stderr
    if "error" in output.lower() and "duplicate_object" not in output.lower() and "already exists" not in output.lower():
        print(f"  ✗ {label}: {output[:200]}")
        return False
    print(f"  ✓ {label}")
    return True

statements = [
    # Tables
    ("""CREATE TABLE IF NOT EXISTS public.users (
  id            SERIAL PRIMARY KEY,
  open_id       VARCHAR(64) NOT NULL UNIQUE,
  name          TEXT,
  email         VARCHAR(320),
  login_method  VARCHAR(64),
  role          user_role NOT NULL DEFAULT 'friend_user',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_signed_in TIMESTAMPTZ NOT NULL DEFAULT now()
)""", "users table"),

    ("""CREATE TABLE IF NOT EXISTS public.venues (
  id          SERIAL PRIMARY KEY,
  slug        VARCHAR(64) NOT NULL UNIQUE,
  name        VARCHAR(255) NOT NULL,
  location    VARCHAR(255),
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
)""", "venues table"),

    ("""CREATE TABLE IF NOT EXISTS public.venue_dna (
  id         SERIAL PRIMARY KEY,
  venue_id   INT NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  category   VARCHAR(64) NOT NULL,
  title      VARCHAR(255) NOT NULL,
  content    TEXT NOT NULL,
  tags       JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)""", "venue_dna table"),

    ("""CREATE TABLE IF NOT EXISTS public.garment_ontology (
  id                     SERIAL PRIMARY KEY,
  garment_type           VARCHAR(128) NOT NULL,
  category               VARCHAR(64) NOT NULL,
  construction_notes     TEXT,
  default_materials      JSONB NOT NULL DEFAULT '[]',
  default_trims          JSONB NOT NULL DEFAULT '[]',
  manufacturability_base FLOAT NOT NULL DEFAULT 0.7,
  moq_typical            INT NOT NULL DEFAULT 10,
  lead_time_days         INT NOT NULL DEFAULT 21,
  tags                   JSONB NOT NULL DEFAULT '[]',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
)""", "garment_ontology table"),

    ("""CREATE TABLE IF NOT EXISTS public.design_requests (
  id                  SERIAL PRIMARY KEY,
  user_id             INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  venue_slug          VARCHAR(64) NOT NULL,
  event_date          VARCHAR(32),
  vibe_keywords       JSONB NOT NULL DEFAULT '[]',
  garment_preferences JSONB NOT NULL DEFAULT '[]',
  comfort_coverage    VARCHAR(64),
  colors              JSONB NOT NULL DEFAULT '[]',
  avoid_list          JSONB NOT NULL DEFAULT '[]',
  budget_band         VARCHAR(64),
  body_notes          TEXT,
  status              design_request_status NOT NULL DEFAULT 'pending',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
)""", "design_requests table"),

    ("""CREATE TABLE IF NOT EXISTS public.concept_cards (
  id                      SERIAL PRIMARY KEY,
  design_request_id       INT NOT NULL REFERENCES public.design_requests(id) ON DELETE CASCADE,
  story_name              VARCHAR(255) NOT NULL,
  story_narrative         TEXT NOT NULL,
  garment_list            JSONB NOT NULL DEFAULT '[]',
  palette                 JSONB NOT NULL DEFAULT '[]',
  materials               JSONB NOT NULL DEFAULT '[]',
  trims                   JSONB NOT NULL DEFAULT '[]',
  vibe_alignment          FLOAT NOT NULL DEFAULT 0.8,
  manufacturability_score FLOAT NOT NULL DEFAULT 0.7,
  production_risk_score   FLOAT NOT NULL DEFAULT 0.3,
  is_selected             BOOLEAN NOT NULL DEFAULT false,
  is_rejected             BOOLEAN NOT NULL DEFAULT false,
  generation_round        INT NOT NULL DEFAULT 1,
  raw_llm_output          JSONB,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
)""", "concept_cards table"),

    ("""CREATE TABLE IF NOT EXISTS public.approval_history (
  id                SERIAL PRIMARY KEY,
  design_request_id INT NOT NULL REFERENCES public.design_requests(id) ON DELETE CASCADE,
  concept_card_id   INT NOT NULL REFERENCES public.concept_cards(id) ON DELETE CASCADE,
  actor_user_id     INT NOT NULL REFERENCES public.users(id),
  action            approval_action NOT NULL,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
)""", "approval_history table"),

    ("""CREATE TABLE IF NOT EXISTS public.design_packets (
  id                    SERIAL PRIMARY KEY,
  design_request_id     INT NOT NULL REFERENCES public.design_requests(id) ON DELETE CASCADE,
  concept_card_id       INT NOT NULL REFERENCES public.concept_cards(id) ON DELETE CASCADE,
  story_name            VARCHAR(255) NOT NULL,
  garment_list          JSONB NOT NULL DEFAULT '[]',
  palette               JSONB NOT NULL DEFAULT '[]',
  materials             JSONB NOT NULL DEFAULT '[]',
  trims                 JSONB NOT NULL DEFAULT '[]',
  construction_notes    TEXT,
  production_risk_score FLOAT NOT NULL DEFAULT 0.3,
  file_url              VARCHAR(1024),
  file_key              VARCHAR(512),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
)""", "design_packets table"),

    ("""CREATE TABLE IF NOT EXISTS public.vendors (
  id                   SERIAL PRIMARY KEY,
  name                 VARCHAR(255) NOT NULL,
  contact_email        VARCHAR(320),
  contact_name         VARCHAR(255),
  geography            VARCHAR(128),
  capabilities         JSONB NOT NULL DEFAULT '[]',
  moq_min              INT NOT NULL DEFAULT 10,
  turnaround_days      INT NOT NULL DEFAULT 30,
  price_band           VARCHAR(64),
  reliability_score    FLOAT NOT NULL DEFAULT 0.7,
  communications_score FLOAT NOT NULL DEFAULT 0.7,
  notes                TEXT,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
)""", "vendors table"),

    ("""CREATE TABLE IF NOT EXISTS public.vendor_scores (
  id                   SERIAL PRIMARY KEY,
  design_packet_id     INT NOT NULL REFERENCES public.design_packets(id) ON DELETE CASCADE,
  vendor_id            INT NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  capability_score     FLOAT NOT NULL,
  timeline_score       FLOAT NOT NULL,
  reliability_score    FLOAT NOT NULL,
  price_score          FLOAT NOT NULL,
  communications_score FLOAT NOT NULL,
  total_score          FLOAT NOT NULL,
  vendor_rank          INT NOT NULL,
  scoring_breakdown    JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
)""", "vendor_scores table"),

    ("""CREATE TABLE IF NOT EXISTS public.production_orders (
  id                SERIAL PRIMARY KEY,
  design_request_id INT NOT NULL REFERENCES public.design_requests(id) ON DELETE CASCADE,
  design_packet_id  INT NOT NULL REFERENCES public.design_packets(id) ON DELETE CASCADE,
  vendor_id         INT NOT NULL REFERENCES public.vendors(id),
  current_stage     order_stage NOT NULL DEFAULT 'inquiry_sent',
  stage_history     JSONB NOT NULL DEFAULT '[]',
  quote_amount      FLOAT,
  currency          VARCHAR(8) NOT NULL DEFAULT 'USD',
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
)""", "production_orders table"),

    ("""CREATE TABLE IF NOT EXISTS public.agent_logs (
  id                SERIAL PRIMARY KEY,
  design_request_id INT REFERENCES public.design_requests(id) ON DELETE SET NULL,
  stage             VARCHAR(64) NOT NULL,
  level             log_level NOT NULL DEFAULT 'info',
  message           TEXT NOT NULL,
  payload           JSONB,
  duration_ms       INT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
)""", "agent_logs table"),

    # Indexes
    ("CREATE INDEX IF NOT EXISTS idx_venue_dna_venue_id ON public.venue_dna(venue_id)", "idx venue_dna"),
    ("CREATE INDEX IF NOT EXISTS idx_design_requests_user_id ON public.design_requests(user_id)", "idx design_requests"),
    ("CREATE INDEX IF NOT EXISTS idx_concept_cards_request_id ON public.concept_cards(design_request_id)", "idx concept_cards"),
    ("CREATE INDEX IF NOT EXISTS idx_design_packets_req_id ON public.design_packets(design_request_id)", "idx design_packets"),
    ("CREATE INDEX IF NOT EXISTS idx_vendor_scores_packet_id ON public.vendor_scores(design_packet_id)", "idx vendor_scores"),
    ("CREATE INDEX IF NOT EXISTS idx_production_orders_req_id ON public.production_orders(design_request_id)", "idx production_orders"),
    ("CREATE INDEX IF NOT EXISTS idx_agent_logs_req_id ON public.agent_logs(design_request_id)", "idx agent_logs"),

    # Updated_at trigger function
    ("""CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$""", "set_updated_at function"),

    # Triggers
    ("""CREATE OR REPLACE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()""", "users trigger"),

    ("""CREATE OR REPLACE TRIGGER trg_design_requests_updated_at
  BEFORE UPDATE ON public.design_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()""", "design_requests trigger"),

    ("""CREATE OR REPLACE TRIGGER trg_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()""", "vendors trigger"),

    ("""CREATE OR REPLACE TRIGGER trg_production_orders_updated_at
  BEFORE UPDATE ON public.production_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()""", "production_orders trigger"),
]

print(f"Applying HAUZZ.AI V4 schema to Supabase project: {PROJECT_ID}")
print("=" * 60)

success = 0
failed = 0
for sql, label in statements:
    if execute_sql(sql, label):
        success += 1
    else:
        failed += 1

print("=" * 60)
print(f"Schema: {success} succeeded, {failed} failed")

if failed == 0:
    print("\n✅ Schema applied successfully! Now applying RLS policies...")
    sys.exit(0)
else:
    print(f"\n⚠️  {failed} statements failed. Check errors above.")
    sys.exit(1)
