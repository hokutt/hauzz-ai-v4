"""
Apply HAUZZ.AI V4 RLS policies to Supabase
"""
import subprocess
import json
import sys

PROJECT_ID = "eujvbnqugnkwpwskdort"

def execute_sql(sql: str, label: str) -> bool:
    payload = json.dumps({"project_id": PROJECT_ID, "query": sql})
    result = subprocess.run(
        ["manus-mcp-cli", "tool", "call", "execute_sql", "--server", "supabase", "--input", payload],
        capture_output=True, text=True, timeout=30
    )
    output = result.stdout + result.stderr
    if "error" in output.lower() and "already exists" not in output.lower() and "duplicate" not in output.lower():
        print(f"  ✗ {label}: {output[:300]}")
        return False
    print(f"  ✓ {label}")
    return True

statements = [
    # Enable RLS
    ("ALTER TABLE public.users             ENABLE ROW LEVEL SECURITY", "RLS users"),
    ("ALTER TABLE public.venues            ENABLE ROW LEVEL SECURITY", "RLS venues"),
    ("ALTER TABLE public.venue_dna         ENABLE ROW LEVEL SECURITY", "RLS venue_dna"),
    ("ALTER TABLE public.garment_ontology  ENABLE ROW LEVEL SECURITY", "RLS garment_ontology"),
    ("ALTER TABLE public.design_requests   ENABLE ROW LEVEL SECURITY", "RLS design_requests"),
    ("ALTER TABLE public.concept_cards     ENABLE ROW LEVEL SECURITY", "RLS concept_cards"),
    ("ALTER TABLE public.approval_history  ENABLE ROW LEVEL SECURITY", "RLS approval_history"),
    ("ALTER TABLE public.design_packets    ENABLE ROW LEVEL SECURITY", "RLS design_packets"),
    ("ALTER TABLE public.vendors           ENABLE ROW LEVEL SECURITY", "RLS vendors"),
    ("ALTER TABLE public.vendor_scores     ENABLE ROW LEVEL SECURITY", "RLS vendor_scores"),
    ("ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY", "RLS production_orders"),
    ("ALTER TABLE public.agent_logs        ENABLE ROW LEVEL SECURITY", "RLS agent_logs"),

    # is_founder_admin helper
    ("""CREATE OR REPLACE FUNCTION public.is_founder_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE open_id = auth.uid()::text AND role = 'founder_admin'
  )
$$""", "is_founder_admin()"),

    # Users policies
    ("""CREATE POLICY users_self_select ON public.users
  FOR SELECT USING (open_id = auth.uid()::text OR public.is_founder_admin())""", "users self select"),
    ("""CREATE POLICY users_self_insert ON public.users
  FOR INSERT WITH CHECK (open_id = auth.uid()::text OR public.is_founder_admin())""", "users self insert"),
    ("""CREATE POLICY founder_full_users ON public.users
  FOR ALL USING (public.is_founder_admin()) WITH CHECK (public.is_founder_admin())""", "users founder full"),

    # Venues
    ("""CREATE POLICY venues_read_authenticated ON public.venues
  FOR SELECT USING (auth.uid() IS NOT NULL)""", "venues read"),
    ("""CREATE POLICY founder_full_venues ON public.venues
  FOR ALL USING (public.is_founder_admin()) WITH CHECK (public.is_founder_admin())""", "venues founder full"),

    # Venue DNA
    ("""CREATE POLICY venue_dna_read_authenticated ON public.venue_dna
  FOR SELECT USING (auth.uid() IS NOT NULL)""", "venue_dna read"),
    ("""CREATE POLICY founder_full_venue_dna ON public.venue_dna
  FOR ALL USING (public.is_founder_admin()) WITH CHECK (public.is_founder_admin())""", "venue_dna founder full"),

    # Garment Ontology
    ("""CREATE POLICY garment_ontology_read_authenticated ON public.garment_ontology
  FOR SELECT USING (auth.uid() IS NOT NULL)""", "garment_ontology read"),
    ("""CREATE POLICY founder_full_garment_ontology ON public.garment_ontology
  FOR ALL USING (public.is_founder_admin()) WITH CHECK (public.is_founder_admin())""", "garment_ontology founder full"),

    # Design Requests
    ("""CREATE POLICY design_requests_owner_select ON public.design_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = user_id AND u.open_id = auth.uid()::text)
    OR public.is_founder_admin()
  )""", "design_requests owner select"),
    ("""CREATE POLICY design_requests_owner_insert ON public.design_requests
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = user_id AND u.open_id = auth.uid()::text)
    OR public.is_founder_admin()
  )""", "design_requests owner insert"),
    ("""CREATE POLICY design_requests_owner_update ON public.design_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = user_id AND u.open_id = auth.uid()::text)
    OR public.is_founder_admin()
  )""", "design_requests owner update"),

    # Concept Cards
    ("""CREATE POLICY concept_cards_owner_select ON public.concept_cards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.design_requests dr
      JOIN public.users u ON u.id = dr.user_id
      WHERE dr.id = design_request_id
        AND (u.open_id = auth.uid()::text OR public.is_founder_admin())
    )
  )""", "concept_cards owner select"),
    ("""CREATE POLICY founder_full_concept_cards ON public.concept_cards
  FOR ALL USING (public.is_founder_admin()) WITH CHECK (public.is_founder_admin())""", "concept_cards founder full"),

    # Approval History
    ("""CREATE POLICY approval_history_owner_select ON public.approval_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.design_requests dr
      JOIN public.users u ON u.id = dr.user_id
      WHERE dr.id = design_request_id
        AND (u.open_id = auth.uid()::text OR public.is_founder_admin())
    )
  )""", "approval_history owner select"),
    ("""CREATE POLICY founder_full_approval_history ON public.approval_history
  FOR ALL USING (public.is_founder_admin()) WITH CHECK (public.is_founder_admin())""", "approval_history founder full"),

    # Design Packets
    ("""CREATE POLICY design_packets_owner_select ON public.design_packets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.concept_cards cc
      JOIN public.design_requests dr ON dr.id = cc.design_request_id
      JOIN public.users u ON u.id = dr.user_id
      WHERE cc.id = concept_card_id
        AND (u.open_id = auth.uid()::text OR public.is_founder_admin())
    )
  )""", "design_packets owner select"),
    ("""CREATE POLICY founder_full_design_packets ON public.design_packets
  FOR ALL USING (public.is_founder_admin()) WITH CHECK (public.is_founder_admin())""", "design_packets founder full"),

    # Vendors
    ("""CREATE POLICY vendors_read_authenticated ON public.vendors
  FOR SELECT USING (auth.uid() IS NOT NULL)""", "vendors read"),
    ("""CREATE POLICY founder_full_vendors ON public.vendors
  FOR ALL USING (public.is_founder_admin()) WITH CHECK (public.is_founder_admin())""", "vendors founder full"),

    # Vendor Scores
    ("""CREATE POLICY vendor_scores_owner_select ON public.vendor_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.design_packets dp
      JOIN public.concept_cards cc ON cc.id = dp.concept_card_id
      JOIN public.design_requests dr ON dr.id = cc.design_request_id
      JOIN public.users u ON u.id = dr.user_id
      WHERE dp.id = design_packet_id
        AND (u.open_id = auth.uid()::text OR public.is_founder_admin())
    )
  )""", "vendor_scores owner select"),
    ("""CREATE POLICY founder_full_vendor_scores ON public.vendor_scores
  FOR ALL USING (public.is_founder_admin()) WITH CHECK (public.is_founder_admin())""", "vendor_scores founder full"),

    # Production Orders
    ("""CREATE POLICY production_orders_owner_select ON public.production_orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.design_requests dr
      JOIN public.users u ON u.id = dr.user_id
      WHERE dr.id = design_request_id
        AND (u.open_id = auth.uid()::text OR public.is_founder_admin())
    )
  )""", "production_orders owner select"),
    ("""CREATE POLICY founder_full_production_orders ON public.production_orders
  FOR ALL USING (public.is_founder_admin()) WITH CHECK (public.is_founder_admin())""", "production_orders founder full"),

    # Agent Logs (founder only)
    ("""CREATE POLICY founder_full_agent_logs ON public.agent_logs
  FOR ALL USING (public.is_founder_admin()) WITH CHECK (public.is_founder_admin())""", "agent_logs founder full"),
]

print(f"Applying RLS policies to Supabase project: {PROJECT_ID}")
print("=" * 60)

success = 0
failed = 0
for sql, label in statements:
    if execute_sql(sql, label):
        success += 1
    else:
        failed += 1

print("=" * 60)
print(f"RLS: {success} succeeded, {failed} failed")

if failed == 0:
    print("\n✅ All RLS policies applied successfully!")
else:
    print(f"\n⚠️  {failed} policies failed. Check errors above.")
