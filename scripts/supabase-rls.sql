-- ============================================================
-- HAUZZ.AI V4 — Supabase RLS Policies
-- Run AFTER supabase-schema.sql
-- ============================================================

-- ─── Enable RLS on all tables ─────────────────────────────────
alter table public.users             enable row level security;
alter table public.venues            enable row level security;
alter table public.venue_dna         enable row level security;
alter table public.garment_ontology  enable row level security;
alter table public.design_requests   enable row level security;
alter table public.concept_cards     enable row level security;
alter table public.approval_history  enable row level security;
alter table public.design_packets    enable row level security;
alter table public.vendors           enable row level security;
alter table public.vendor_scores     enable row level security;
alter table public.production_orders enable row level security;
alter table public.agent_logs        enable row level security;

-- ─── Helper: is_founder_admin() ───────────────────────────────
create or replace function public.is_founder_admin()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1
    from public.users
    where open_id = auth.uid()::text and role = 'founder_admin'
  );
$$;

-- ─── Users ────────────────────────────────────────────────────
create policy users_self_or_founder_select on public.users
  for select using (open_id = auth.uid()::text or public.is_founder_admin());

create policy users_self_insert on public.users
  for insert with check (open_id = auth.uid()::text or public.is_founder_admin());

create policy users_self_update on public.users
  for update using (open_id = auth.uid()::text or public.is_founder_admin());

create policy founder_full_access_users on public.users
  for all using (public.is_founder_admin()) with check (public.is_founder_admin());

-- ─── Venues (read-only for all authenticated) ─────────────────
create policy venues_read_all_authenticated on public.venues
  for select using (auth.uid() is not null);

create policy founder_full_access_venues on public.venues
  for all using (public.is_founder_admin()) with check (public.is_founder_admin());

-- ─── Venue DNA (read-only for all authenticated) ──────────────
create policy venue_dna_read_all_authenticated on public.venue_dna
  for select using (auth.uid() is not null);

create policy founder_full_access_venue_dna on public.venue_dna
  for all using (public.is_founder_admin()) with check (public.is_founder_admin());

-- ─── Garment Ontology (read-only for all authenticated) ───────
create policy garment_ontology_read_all_authenticated on public.garment_ontology
  for select using (auth.uid() is not null);

create policy founder_full_access_garment_ontology on public.garment_ontology
  for all using (public.is_founder_admin()) with check (public.is_founder_admin());

-- ─── Design Requests ──────────────────────────────────────────
create policy design_requests_owner_select on public.design_requests
  for select using (
    exists (select 1 from public.users u where u.id = user_id and u.open_id = auth.uid()::text)
    or public.is_founder_admin()
  );

create policy design_requests_owner_insert on public.design_requests
  for insert with check (
    exists (select 1 from public.users u where u.id = user_id and u.open_id = auth.uid()::text)
    or public.is_founder_admin()
  );

create policy design_requests_owner_update on public.design_requests
  for update using (
    exists (select 1 from public.users u where u.id = user_id and u.open_id = auth.uid()::text)
    or public.is_founder_admin()
  );

-- ─── Concept Cards ────────────────────────────────────────────
create policy concept_cards_owner_select on public.concept_cards
  for select using (
    exists (
      select 1 from public.design_requests dr
      join public.users u on u.id = dr.user_id
      where dr.id = design_request_id
        and (u.open_id = auth.uid()::text or public.is_founder_admin())
    )
  );

create policy founder_full_access_concept_cards on public.concept_cards
  for all using (public.is_founder_admin()) with check (public.is_founder_admin());

-- ─── Approval History ─────────────────────────────────────────
create policy approval_history_owner_select on public.approval_history
  for select using (
    exists (
      select 1 from public.design_requests dr
      join public.users u on u.id = dr.user_id
      where dr.id = design_request_id
        and (u.open_id = auth.uid()::text or public.is_founder_admin())
    )
  );

create policy founder_full_access_approval_history on public.approval_history
  for all using (public.is_founder_admin()) with check (public.is_founder_admin());

-- ─── Design Packets ───────────────────────────────────────────
create policy design_packets_owner_select on public.design_packets
  for select using (
    exists (
      select 1 from public.concept_cards cc
      join public.design_requests dr on dr.id = cc.design_request_id
      join public.users u on u.id = dr.user_id
      where cc.id = concept_card_id
        and (u.open_id = auth.uid()::text or public.is_founder_admin())
    )
  );

create policy founder_full_access_design_packets on public.design_packets
  for all using (public.is_founder_admin()) with check (public.is_founder_admin());

-- ─── Vendors ──────────────────────────────────────────────────
create policy vendors_read_all_authenticated on public.vendors
  for select using (auth.uid() is not null);

create policy founder_full_access_vendors on public.vendors
  for all using (public.is_founder_admin()) with check (public.is_founder_admin());

-- ─── Vendor Scores ────────────────────────────────────────────
create policy vendor_scores_owner_select on public.vendor_scores
  for select using (
    exists (
      select 1 from public.design_packets dp
      join public.concept_cards cc on cc.id = dp.concept_card_id
      join public.design_requests dr on dr.id = cc.design_request_id
      join public.users u on u.id = dr.user_id
      where dp.id = design_packet_id
        and (u.open_id = auth.uid()::text or public.is_founder_admin())
    )
  );

create policy founder_full_access_vendor_scores on public.vendor_scores
  for all using (public.is_founder_admin()) with check (public.is_founder_admin());

-- ─── Production Orders ────────────────────────────────────────
create policy production_orders_owner_select on public.production_orders
  for select using (
    exists (
      select 1 from public.design_requests dr
      join public.users u on u.id = dr.user_id
      where dr.id = design_request_id
        and (u.open_id = auth.uid()::text or public.is_founder_admin())
    )
  );

create policy founder_full_access_production_orders on public.production_orders
  for all using (public.is_founder_admin()) with check (public.is_founder_admin());

-- ─── Agent Logs (founder only) ────────────────────────────────
create policy founder_full_access_agent_logs on public.agent_logs
  for all using (public.is_founder_admin()) with check (public.is_founder_admin());
