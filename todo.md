# HAUZZ.AI V4 — Project TODO

## Schema & Database
- [x] Extend Drizzle schema: roles enum (founder_admin, friend_user)
- [x] Table: design_requests (intake form data)
- [x] Table: concept_cards (AI-generated concept directions)
- [x] Table: approval_history (concept approvals/rejections with notes)
- [x] Table: design_packets (structured production packets, file URL)
- [x] Table: venue_dna (RAG documents for EDC venue context)
- [x] Table: garment_ontology (garment types, construction notes, materials)
- [x] Table: vendors (capability profiles, MOQ, turnaround, geography, price band, reliability)
- [x] Table: vendor_scores (scored rankings per design packet)
- [x] Table: production_orders (state machine, 8 stages)
- [x] Table: agent_logs (structured logging for all pipeline stages)
- [x] Run migration and verify all tables created

## Seed Data
- [x] Seed 1 EDC venue record
- [x] Seed 12 venue DNA documents
- [x] Seed 30 garment ontology records
- [x] Seed 5 vendor profiles

## Auth & Roles
- [x] founder_admin role: full access to all data
- [x] friend_user role: own data only (scoped procedures)
- [x] adminProcedure / founderProcedure guard for founder_admin-only routes
- [x] Role-based access enforced in all tRPC procedures

## Intake API
- [x] tRPC procedure: intake.submit (Zod validated)
- [x] Fields: venue, event_date, vibe_keywords, garment_preferences, comfort_coverage, colors, avoid_list, budget_band, body_notes
- [x] Log intake submission to agent_logs

## Design Agent
- [x] RAG retrieval: query venue_dna by venue slug
- [x] RAG retrieval: query garment_ontology by garment type
- [x] LLM: generate 2–4 story-led concept directions
- [x] LLM output: Zod-validated concept card schema
- [x] Manufacturability scoring per concept
- [x] Persist concept cards to DB
- [x] Log retrieval inputs, prompts, and outputs to agent_logs

## Approval Workflow
- [x] tRPC procedure: design.selectConcept (friend_user or founder_admin)
- [x] tRPC procedure: design.rejectConcept (friend_user or founder_admin)
- [x] tRPC procedure: design.requestRegeneration (triggers new concept round)
- [x] Approval history persisted with notes and timestamps
- [x] Log all approval actions to agent_logs

## Design Packet Generator
- [x] Generate packet: story name, garment list, palette, materials, trims, construction notes, production risk score
- [x] Zod-validate packet structure
- [x] Save packet JSON to S3 file storage
- [x] Store packet URL + metadata in design_packets table
- [x] Log packet generation to agent_logs

## Vendor Matching Engine
- [x] Score vendors against approved design packet
- [x] Weights: capability 35%, timeline 25%, reliability 20%, price 10%, communications 10%
- [x] Rank and persist vendor_scores per design packet
- [x] Log scoring breakdown to agent_logs

## Production Order State Machine
- [x] 8-stage enum: inquiry_sent → quote_received → sample → approved → production → qa → shipped → delivered
- [x] Enforce sequential stage transitions (no skipping)
- [x] tRPC procedure: production.createOrder (founder_admin only)
- [x] tRPC procedure: production.advanceStage (founder_admin only)
- [x] tRPC procedure: production.getOrdersByRequest (scoped by role)
- [x] Log all stage transitions to agent_logs

## Founder Admin API
- [x] procedure: admin.listAllRequests (founder_admin only)
- [x] procedure: admin.listVendors (founder_admin only)
- [x] procedure: admin.listOrders (founder_admin only)
- [x] procedure: admin.getRecentLogs (founder_admin only)
- [x] procedure: admin.getVendorScores (founder_admin only)
- [x] procedure: admin.getDashboard (full pipeline overview)
- [x] procedure: admin.getFullPipeline (per-request full view)
- [x] procedure: admin.updateUserRole (promote/demote users)
- [x] procedure: admin.createVendor / updateVendor
- [x] friend_user procedures scoped to own data only

## Testing
- [x] Vitest: intake submission validation (IntakeFormSchema)
- [x] Vitest: concept card Zod schema validation (ConceptCardLLMSchema)
- [x] Vitest: vendor scoring weight calculation (exact weights + total)
- [x] Vitest: order state machine transition enforcement (all 8 stages)
- [x] Vitest: role string constants (founder_admin, friend_user)
- [x] Vitest: auth.logout cookie clearing

## UI
- [x] Design direction confirmed: cosmic pink euphoria / living space / split studio
- [x] Source and upload EDC-themed imagery and space assets to CDN
- [x] Page 1: Cosmic pink landing page with EDC imagery, hero text, CTA to festival map
- [x] Page 2: Living animated space map with EDC planet, starfield background, venue selection
- [x] Page 3: Split design studio — visual concepts panel (left) + AI chat interface (right)
- [x] Global theme: cosmic pink palette, custom fonts, smooth page transitions
- [x] App routing: Home → Festival Map → Design Studio
- [x] Intake form UI (accessible from Design Studio — embedded in chat)
- [ ] Concept card review UI
- [ ] Founder admin dashboard UI
- [ ] Order tracking UI
