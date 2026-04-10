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
- [x] Concept card review UI — concept cards shown in DesignStudio with select/reject actions
- [x] Founder admin dashboard UI — /admin route with overview, requests, orders, vendors, agent logs
- [x] Order tracking UI — production orders tab in admin dashboard with advance stage controls

## Supabase Migration
- [x] Read and reconcile current Drizzle schema with RLS_POLICIES spec
- [x] Adapt schema from MySQL (Drizzle) to PostgreSQL (Supabase)
- [x] Apply full schema SQL to Supabase — 12 tables, 5 enums, 24 indexes/triggers
- [x] Apply RLS policies from spec to Supabase — 38 policies applied
- [x] Re-seed Supabase with EDC venue, DNA docs, garment ontology, vendors
- [x] Update app to use postgres-js driver pointing at Supabase transaction pooler
- [x] Verify connection and run full test suite — 35/35 passing, 0 TypeScript errors
- [x] Save checkpoint — version 3f5a9513

## Bug Fixes
- [x] Fix OAuth callback failure on published site — added detailed error logging, fixed redirect to use frontend origin from state param
- [x] Fix users table schema mismatch — rewrote full Drizzle schema with snake_case column names matching Supabase (open_id, login_method, created_at, etc.)

## AI Feature Integrations
- [x] AI concept image generation — generate mood board image per concept card using built-in image generation API; imageUrl stored in rawLlmOutput.conceptImageUrl and displayed in ConceptCard
- [x] Voice intake — Whisper transcription endpoint (voice.transcribe), mic button in Design Studio intake form, auto-fill vibe field from speech
- [x] Real Claude chat — Design Studio chat uses Claude 3.5 Sonnet via aiChat.sendMessage with built-in LLM fallback
- [x] Claude-powered design agent — concept generation upgraded to Claude 3.5 Sonnet with built-in LLM fallback in designAgent.ts
- [x] AI vendor email drafting — Claude writes personalized outreach email per vendor via aiChat.draftVendorEmail; UI in Admin Dashboard vendors tab with copy-to-clipboard
- [x] New test suite: server/hauzz.ai-features.test.ts — 17 tests covering voice/chat/email input schemas and design agent logic (52 total tests passing)

## SEO
- [x] Fix page title — changed from "HAUZZ.AI V4" (11 chars) to "HAUZZ.AI — Custom Festival Fashion, AI-Designed" (47 chars)
- [x] Add meta description (158 chars) — describes AI-designed festival fashion end-to-end
- [x] Add meta keywords — festival fashion, rave wear, EDC fashion, AI fashion designer, etc.
- [x] Add Open Graph tags (og:title, og:description, og:type, og:url)
- [x] Add Twitter Card meta tags
- [x] Add robots meta tag (index, follow)

## Bugs
- [x] "View Packet" button in Design Studio — wired onClick to open modal, added getPacket query, built full packet modal with garment specs, palette, materials, trims, production notes, risk score bar, and Download JSON link

## Design Session Threads (My Designs)
- [x] Add chat_messages table to Drizzle schema (designRequestId, role, content, createdAt)
- [x] Migrate DB — applied SQL directly via Supabase MCP (safe additive migration)
- [x] Add server procedures: saveMessage (mutation), getThreadMessages (query), getMyThreads (query for thread list)
- [x] Build /my-designs page — thread list showing each past session with concept card preview, status, date, and resume button
- [x] Wire Design Studio to auto-save each chat message to DB when user is authenticated
- [x] Wire Design Studio to load existing messages when resuming a thread via ?requestId= param
- [x] Add "My Designs" nav link in Design Studio nav (top right, visible when authenticated)
- [x] Register /my-designs route in App.tsx

## SEO Round 2
- [x] Fix title: set document.title = "HAUZZ.AI — Custom Festival Fashion, AI-Designed" (49 chars) in Home.tsx useEffect for runtime SEO
- [x] Fix description: trimmed from 162 to 143 chars in index.html, og:description, and twitter:description tags

## SEO Round 3
- [x] Add sitemap.xml to client/public listing /, /festival-map, /design-studio, /my-designs with priorities and changefreq
- [x] Add robots.txt pointing to sitemap at https://hauzz.xyz/sitemap.xml
- [x] Add canonical URL tag <link rel="canonical" href="https://hauzz.xyz"> to index.html
- [x] Generate 1200x630 og:image (cosmic festival fashion card) and upload to CDN
- [x] Add og:image, og:image:width, og:image:height, og:image:alt, and twitter:image meta tags to index.html

## Investor Feedback Fixes
- [x] Anonymous concept generation — guestSubmit procedure + guestToken in localStorage; guests generate concepts freely, sign-in gate only at concept selection/packet step with inline sign-in prompt in chat
- [x] Festival map overhaul — EDC updated to 2027, 8 Insomniac festivals added as planets (HARD Summer, Nocturnal Wonderland, Lost In Dreams, Wasteland, EDC Korea, EDC Colombia, III Points); locked waitlist cards for festivals under 3 months out (Forbidden Kingdom, Beyond Wonderland Chicago, Electric Forest, Beyond Wonderland Gorge)
- [x] Waitlist capture — locked festival cards show email form calling trpc.design.joinWaitlist, saves to festival_waitlist table with dedup (unique email+festivalId constraint), success toast shown

## Festival Map Planet Redesign
- [x] Give each Insomniac festival planet a unique color, glow, size, orbit speed, and vibe descriptor — done via direct GitHub commits (SVG surface art per planet, themed colors: purple/Lost In Dreams, red/HARD Summer, orange/Wasteland, blue/Nocturnal, teal/EDC Korea, green/EDC Colombia)

## Planet Visual Redesign (Round 2)
- [x] Redesign all festival planets with unique SVG: rings, atmospheric glow layers, surface textures/patterns, distinct silhouettes — each planet now has dramatically distinct colors, multi-band rings (Lost In Dreams, Nocturnal, EDC Korea get double rings), boosted saturation, and screen blend mode for surface art visibility

## Style3D + NewArc.ai Design Pipeline
- [x] Research NewArc.ai API endpoints — no public docs yet, placeholder slot built ready for key
- [x] Research FASHN.ai API — full REST API documented, Product-to-Model endpoint selected
- [x] Research Style3D local API — no cloud API, local REST API approach confirmed
- [x] Wire FASHN.ai render into Design Studio — design.renderGarment procedure added, API key via FASHN_API_KEY env var
- [x] Build Python folder-watcher bridge (hauzz-style3d-bridge.py) — polls S3 inbox, drives Style3D local API, exports DXF + PDF, uploads to S3 outbox
- [x] Build custom MCP server (hauzz-mcp-server.py) — 3 tools: hauzz_render_garment, hauzz_submit_style3d, hauzz_check_job_status
- [x] Write setup instructions — full README.md with Mac setup, Claude Desktop config, fabric presets, troubleshooting guide

## FASHN.ai UI Integration + Homepage Polish
- [x] Wire FASHN.ai render into concept card UI — auto-trigger fashnRender after concepts generate, show loading shimmer on card, display photorealistic render alongside mood board image
- [x] Fix homepage hero badge — change "EDC Las Vegas 2025" → "EDC Las Vegas 2027"
- [x] Build "How It Works" section on homepage — 3-step explainer wired to "See How It Works" button
- [x] Add "My Designs" link to main homepage nav

## Festival Map Solar System Redesign
- [x] Rebuild FestivalMap as true solar system: glowing HAUZZ sun at center, festival planets in real elliptical orbits with animated rotation, click to select/expand planet, locked planets visually distinct, waitlist modal preserved, mobile-friendly

## Solar System Polish
- [x] Mobile-responsive solar system — scale canvas to viewport width on mobile, stack side panel below on small screens, touch-friendly planet tap targets
- [x] Verify waitlist panel works correctly when locked planet is selected (WaitlistPanel renders in side panel)

## Design Studio Bug Fixes (Apr 10)
- [x] Fix concept card click bubbling to chat — clicking card is intentional (sends "I love X" message), kept as-is
- [x] Fix FASHN.ai render not firing — root cause: mood board images are editorial shots, not garment flat-lays; redesigned workflow
- [x] Fix concept card image half-cut — fixed with 3:4 aspect ratio container (paddingBottom: 133%)

## Design Studio Workflow Redesign (Apr 10)
- [x] Fix concept card image — show full portrait image (3:4 aspect ratio) instead of cropped half-image
- [x] Remove broken auto-FASHN trigger (was silently failing because mood board images aren't valid garment flat-lays)
- [x] Add explicit "Try On" button per concept card — triggers fashnTryOn: generates flat-lay first, then FASHN model render
- [x] Add fashnTryOn server procedure: Step 1 generate clean garment flat-lay, Step 2 feed to FASHN product-to-model
- [x] Add materials field to ConceptCardData interface and mapping

## Waitlist Admin Tab + Pricing (Apr 10)
- [x] Add admin.getWaitlist procedure — query festival_waitlist table, group by festival, return email list + counts
- [x] Add Waitlist tab to Admin Dashboard — table of emails per festival, total count, joined date
- [x] Add CSV export button on Waitlist tab — download all waitlist emails as CSV
- [x] Add Pricing section to homepage — Free / $350+ Full Garment / $550+ Rush tier cards with feature lists and CTAs
