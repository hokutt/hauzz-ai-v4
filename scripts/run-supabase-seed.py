"""
Seed HAUZZ.AI V4 Supabase database with:
- 1 EDC venue
- 12 venue DNA documents
- 30 garment ontology records
- 5 vendor profiles
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
    if "error" in output.lower() and "duplicate" not in output.lower() and "unique" not in output.lower():
        print(f"  ✗ {label}: {output[:300]}")
        return False
    print(f"  ✓ {label}")
    return True

print(f"Seeding Supabase project: {PROJECT_ID}")
print("=" * 60)

# ─── VENUE ────────────────────────────────────────────────────────────────────
ok = execute_sql("""
INSERT INTO public.venues (slug, name, location, description)
VALUES (
  'edc-las-vegas',
  'Electric Daisy Carnival Las Vegas',
  'Las Vegas Motor Speedway, Las Vegas, NV',
  'The world''s largest electronic music festival. Three nights of immersive art, carnival rides, and transformative fashion under the electric sky.'
)
ON CONFLICT (slug) DO NOTHING
""", "EDC Las Vegas venue")

# Get venue ID
result = subprocess.run(
    ["manus-mcp-cli", "tool", "call", "execute_sql", "--server", "supabase", "--input",
     json.dumps({"project_id": PROJECT_ID, "query": "SELECT id FROM public.venues WHERE slug = 'edc-las-vegas' LIMIT 1"})],
    capture_output=True, text=True, timeout=15
)
# Parse venue ID from result
venue_id = 1  # Default, will be overridden
try:
    output = result.stdout
    # Find the JSON result in the output
    import re
    match = re.search(r'\[{"id":(\d+)', output)
    if match:
        venue_id = int(match.group(1))
        print(f"  → Venue ID: {venue_id}")
except:
    pass

# ─── VENUE DNA ────────────────────────────────────────────────────────────────
dna_records = [
    ("aesthetic", "Electric Sky Aesthetic", "EDC is defined by its signature 'Under the Electric Sky' theme — a universe of neon lights, LED installations, and bioluminescent color palettes. The visual language is cosmic, euphoric, and otherworldly.", '["neon", "LED", "bioluminescent", "cosmic", "electric"]'),
    ("aesthetic", "Rave Couture Tradition", "EDC fashion blends rave culture with couture sensibility. Attendees are called 'Headliners' and dress as if performing on stage. Looks range from elaborate fantasy costumes to elevated festival streetwear.", '["rave", "couture", "headliner", "costume", "streetwear"]'),
    ("color_palette", "EDC Color Universe", "Core palette: electric pink (#FF006E), neon cyan (#00F5FF), ultraviolet purple (#7B2FBE), acid green (#39FF14), holographic silver, and deep space black. Secondary: iridescent white, laser yellow, sunset orange.", '["pink", "cyan", "purple", "neon", "holographic", "iridescent"]'),
    ("silhouette", "Signature Silhouettes", "Dominant silhouettes: high-waisted bottoms with crop tops, bodycon sets, wrap skirts with structured bras, oversized hoodies with micro shorts, and full-body iridescent jumpsuits. Asymmetric cuts and cutouts are signature.", '["crop top", "bodycon", "wrap skirt", "jumpsuit", "asymmetric", "cutout"]'),
    ("material", "Performance Fabrics", "EDC demands sweat-wicking, stretch-friendly materials that survive 3 nights of dancing. Preferred: spandex-lycra blends (4-way stretch), mesh overlays, holographic PVC accents, sequin-on-stretch, and reflective fabrics.", '["spandex", "lycra", "mesh", "holographic", "PVC", "sequin", "reflective"]'),
    ("material", "Iridescent & Holographic", "Iridescent and holographic materials are the crown jewel of EDC fashion. Laser-cut holographic vinyl, color-shifting spandex, and prismatic sequins catch the stage lighting and create a living, breathing visual effect.", '["iridescent", "holographic", "laser-cut", "prismatic", "color-shifting"]'),
    ("vibe", "Euphoria & Transformation", "EDC is a transformative experience. Fashion should reflect the emotional arc: arriving as yourself, ascending into a higher version. Looks should feel like armor for joy — protective, expressive, and larger than life.", '["euphoria", "transformation", "joy", "expressive", "empowerment"]'),
    ("vibe", "Cosmic & Celestial", "Space, stars, and the cosmos are central metaphors. Celestial motifs — moons, stars, planets, galaxies — appear across prints, embroidery, and structural details. The night sky is the canvas.", '["cosmic", "celestial", "space", "stars", "galaxy", "moon"]'),
    ("vibe", "Rave Royalty", "EDC headliners dress as royalty of their own universe. Crowns, corsets, capes, and structured bodices signal authority and fantasy. The look should say: this person rules the dancefloor.", '["royalty", "crown", "corset", "cape", "fantasy", "dancefloor"]'),
    ("practical", "Comfort for 3 Nights", "Practical requirements: secure closures (no wardrobe malfunctions), breathable fabrics for desert heat (95°F+), comfortable footwear compatibility, minimal bulk for dancing, and pockets or harness attachment points for essentials.", '["comfort", "breathable", "secure", "danceable", "practical"]'),
    ("practical", "Light & Sound Interaction", "Garments should interact with EDC''s lighting environment. Reflective strips, UV-reactive dyes, LED-compatible panels, and glow-in-the-dark elements create a dynamic visual experience that evolves throughout the night.", '["UV-reactive", "reflective", "LED", "glow-in-dark", "light-interactive"]'),
    ("cultural", "Community & Self-Expression", "EDC fashion is deeply communal. Matching sets for friend groups (called ''kandi crews''), complementary color stories, and group themes are common. Individual expression within a collective aesthetic is the ideal.", '["community", "kandi", "group", "self-expression", "collective"]'),
]

success = 0
for i, (category, title, content, tags) in enumerate(dna_records):
    sql = f"""
INSERT INTO public.venue_dna (venue_id, category, title, content, tags)
VALUES ({venue_id}, '{category}', '{title.replace("'", "''")}', '{content.replace("'", "''")}', '{tags}'::jsonb)
ON CONFLICT DO NOTHING
"""
    if execute_sql(sql, f"DNA: {title[:40]}"):
        success += 1

print(f"  → {success}/{len(dna_records)} DNA records seeded")

# ─── GARMENT ONTOLOGY ─────────────────────────────────────────────────────────
garments = [
    # Tops
    ("Structured Bra Top", "top", "Underwire or boning with fabric overlay. Requires precise cup sizing and hook-and-eye closure.", '["spandex", "mesh", "holographic vinyl"]', '["underwire", "hook-eye closure", "boning"]', 0.75, 20, 18, '["festival", "EDC", "crop", "structured"]'),
    ("Mesh Crop Top", "top", "Stretch mesh with lining options. Simple construction, high volume potential.", '["mesh", "spandex lining"]', '["elastic hem", "optional lining"]', 0.90, 30, 10, '["festival", "EDC", "mesh", "layering"]'),
    ("Corset Bodice", "top", "Boned corset with lacing or zipper. Complex construction requiring skilled pattern making.", '["brocade", "spandex", "faux leather"]', '["boning channels", "grommets", "lacing", "zipper"]', 0.55, 15, 28, '["festival", "EDC", "corset", "structured", "royalty"]'),
    ("Halter Neck Top", "top", "Minimal fabric, neck tie closure. Easy construction, versatile styling.", '["spandex", "holographic", "sequin stretch"]', '["neck tie", "optional clasp"]', 0.92, 50, 8, '["festival", "EDC", "halter", "minimal"]'),
    ("Wrap Crop Top", "top", "Front-wrap with tie closure. Adjustable fit, simple construction.", '["spandex", "satin", "mesh"]', '["tie closure", "optional snap"]', 0.88, 40, 10, '["festival", "EDC", "wrap", "adjustable"]'),
    ("Cape / Kimono Overlay", "top", "Flowing open-front overlay. Minimal construction, dramatic effect.", '["chiffon", "organza", "iridescent fabric"]', '["optional clasp", "fringe trim"]', 0.85, 25, 12, '["festival", "EDC", "cape", "overlay", "dramatic"]'),

    # Bottoms
    ("High-Waist Booty Shorts", "bottom", "4-way stretch with high waistband. Core EDC staple, high volume.", '["spandex-lycra", "holographic spandex"]', '["elastic waistband", "optional lace trim"]', 0.95, 50, 7, '["festival", "EDC", "shorts", "high-waist", "staple"]'),
    ("Micro Mini Skirt", "bottom", "A-line or bodycon micro skirt. Simple construction.", '["spandex", "sequin stretch", "PVC"]', '["elastic waistband", "optional zipper"]', 0.90, 40, 8, '["festival", "EDC", "skirt", "mini"]'),
    ("Wrap Skirt", "bottom", "Asymmetric wrap with tie or snap closure. Versatile length options.", '["chiffon", "spandex", "mesh"]', '["tie closure", "snap", "optional hem trim"]', 0.85, 30, 10, '["festival", "EDC", "wrap", "skirt", "asymmetric"]'),
    ("High-Waist Flare Pants", "bottom", "Bell-bottom or flare silhouette with high waist. Moderate complexity.", '["spandex", "velvet", "holographic"]', '["elastic waistband", "side seam", "hem finish"]', 0.78, 20, 14, '["festival", "EDC", "flare", "pants", "retro"]'),
    ("Chaps / Leg Wraps", "bottom", "Decorative leg coverage worn over shorts. Minimal construction.", '["faux leather", "mesh", "fringe"]', '["snap closures", "belt loops", "fringe trim"]', 0.82, 25, 10, '["festival", "EDC", "chaps", "leg", "accessory"]'),

    # Sets
    ("Matching Bra + Shorts Set", "set", "Coordinated bra top and booty shorts. High volume, core product.", '["spandex-lycra", "holographic spandex", "sequin stretch"]', '["elastic waistband", "hook-eye or clasp", "matching trim"]', 0.88, 50, 12, '["festival", "EDC", "set", "matching", "core"]'),
    ("Bodycon Two-Piece Set", "set", "Fitted crop top and mini skirt or shorts. Clean lines, moderate complexity.", '["spandex", "rib knit", "velvet"]', '["elastic", "optional zipper", "hem finish"]', 0.85, 40, 12, '["festival", "EDC", "bodycon", "set", "fitted"]'),
    ("Corset + Skirt Set", "set", "Structured corset top with coordinating skirt. Complex construction.", '["brocade", "spandex", "satin"]', '["boning", "grommets", "lacing", "waistband"]', 0.60, 15, 28, '["festival", "EDC", "corset", "set", "structured"]'),

    # Jumpsuits
    ("Iridescent Jumpsuit", "jumpsuit", "Full-body coverage with stretch fabric. Moderate complexity, high visual impact.", '["holographic spandex", "iridescent lycra"]', '["zipper", "elastic waist", "snap crotch"]', 0.72, 20, 18, '["festival", "EDC", "jumpsuit", "holographic", "statement"]'),
    ("Mesh Bodysuit", "jumpsuit", "Sheer mesh full-body suit. Simple construction, layering piece.", '["stretch mesh", "spandex lining panels"]', '["snap crotch", "elastic edges"]', 0.88, 40, 10, '["festival", "EDC", "bodysuit", "mesh", "layering"]'),
    ("Cut-Out Bodysuit", "jumpsuit", "Stretch bodysuit with strategic cut-outs. Moderate complexity.", '["spandex", "holographic spandex"]', '["snap crotch", "cut-out reinforcement", "elastic edges"]', 0.78, 30, 14, '["festival", "EDC", "bodysuit", "cutout", "fitted"]'),

    # Outerwear
    ("Faux Fur Jacket", "outerwear", "Short cropped faux fur jacket. Moderate construction, high visual impact.", '["faux fur", "satin lining"]', '["snap or hook closure", "lining", "cuffs"]', 0.70, 15, 21, '["festival", "EDC", "fur", "jacket", "statement"]'),
    ("Holographic Puffer Vest", "outerwear", "Quilted puffer vest in holographic fabric. Moderate complexity.", '["holographic nylon", "polyester fill"]', '["zipper", "quilting", "binding"]', 0.72, 20, 18, '["festival", "EDC", "puffer", "vest", "holographic"]'),
    ("Sequin Blazer", "outerwear", "Structured blazer in sequin fabric. Complex tailoring.", '["sequin fabric", "lining"]', '["structured shoulders", "lining", "buttons or hooks"]', 0.58, 10, 28, '["festival", "EDC", "blazer", "sequin", "tailored"]'),

    # Accessories
    ("Body Harness", "accessory", "Adjustable strapping harness worn over outfit. Minimal sewing, hardware-focused.", '["faux leather", "elastic", "chain"]', '["buckles", "D-rings", "adjusters"]', 0.85, 30, 10, '["festival", "EDC", "harness", "accessory", "layering"]'),
    ("Arm Sleeves / Gloves", "accessory", "Stretch arm coverage from wrist to upper arm. Simple tube construction.", '["mesh", "spandex", "holographic"]', '["elastic cuffs", "optional thumb hole"]', 0.95, 50, 7, '["festival", "EDC", "sleeves", "gloves", "accessory"]'),
    ("Mini Skirt Belt", "accessory", "Decorative belt with attached mini skirt panel. Simple construction.", '["faux leather", "chain", "fringe"]', '["buckle", "D-rings", "fringe or chain trim"]', 0.88, 40, 8, '["festival", "EDC", "belt", "skirt", "accessory"]'),
    ("Festival Crown / Headpiece", "accessory", "Structured headpiece or crown. Artisan construction, low volume.", '["wire frame", "fabric", "gems", "feathers"]', '["wire", "hot glue", "elastic band"]', 0.60, 10, 21, '["festival", "EDC", "crown", "headpiece", "artisan"]'),
    ("Cape / Wings", "accessory", "Dramatic wearable wings or cape attachment. Artisan, low volume.", '["organza", "iridescent fabric", "wire frame"]', '["wire", "elastic straps", "optional LED"]', 0.55, 5, 28, '["festival", "EDC", "wings", "cape", "statement", "artisan"]'),

    # Specialty
    ("LED-Integrated Top", "specialty", "Top with sewn-in LED strip channels. Requires electronics integration knowledge.", '["spandex", "mesh", "LED strips"]', '["LED channels", "battery pocket", "wire management"]', 0.45, 10, 35, '["festival", "EDC", "LED", "tech", "specialty"]'),
    ("UV-Reactive Set", "specialty", "Matching set in UV-reactive fabric. Standard construction with specialty fabric.", '["UV-reactive spandex", "glow fabric"]', '["standard closures", "UV-reactive thread"]', 0.82, 25, 14, '["festival", "EDC", "UV", "glow", "reactive"]'),
    ("Reflective Jacket", "specialty", "Jacket with 3M reflective panels. Standard jacket construction with specialty material.", '["3M reflective fabric", "lining"]', '["zipper", "reflective binding", "lining"]', 0.68, 15, 21, '["festival", "EDC", "reflective", "jacket", "safety"]'),
    ("Fringe Bodysuit", "specialty", "Bodysuit with attached fringe panels. Moderate complexity, high movement effect.", '["spandex base", "fringe trim"]', '["snap crotch", "fringe attachment", "elastic edges"]', 0.75, 20, 16, '["festival", "EDC", "fringe", "bodysuit", "movement"]'),
    ("Crystal-Embellished Bra", "specialty", "Bra top with hand-applied crystal embellishment. Labor-intensive, artisan.", '["spandex base", "crystals", "adhesive"]', '["underwire", "crystal application", "hook-eye"]', 0.40, 5, 42, '["festival", "EDC", "crystal", "embellished", "artisan", "luxury"]'),
]

success = 0
for (garment_type, category, construction_notes, materials, trims, mfg_base, moq, lead_time, tags) in garments:
    sql = f"""
INSERT INTO public.garment_ontology 
  (garment_type, category, construction_notes, default_materials, default_trims, manufacturability_base, moq_typical, lead_time_days, tags)
VALUES (
  '{garment_type.replace("'", "''")}',
  '{category}',
  '{construction_notes.replace("'", "''")}',
  '{materials}'::jsonb,
  '{trims}'::jsonb,
  {mfg_base},
  {moq},
  {lead_time},
  '{tags}'::jsonb
)
ON CONFLICT DO NOTHING
"""
    if execute_sql(sql, f"Garment: {garment_type[:35]}"):
        success += 1

print(f"  → {success}/{len(garments)} garment ontology records seeded")

# ─── VENDORS ──────────────────────────────────────────────────────────────────
vendors = [
    (
        "Neon Stitch LA",
        "orders@neonstitch.la",
        "Mia Chen",
        "Los Angeles, CA",
        '["spandex sets", "holographic fabric", "crop tops", "booty shorts", "bodysuits", "matching sets"]',
        10, 21, "mid",
        0.88, 0.85,
        "Specializes in festival and rave wear. Strong holographic and spandex capabilities. Fast LA turnaround. Preferred for core sets."
    ),
    (
        "Desert Bloom Apparel",
        "production@desertbloom.co",
        "Carlos Rivera",
        "Phoenix, AZ",
        '["corsets", "structured bodices", "boning", "tailored pieces", "outerwear", "blazers"]',
        15, 28, "premium",
        0.82, 0.90,
        "Boutique manufacturer specializing in structured and tailored festival wear. Excellent for corsets and complex construction. Higher price point."
    ),
    (
        "Sparkle Factory",
        "hello@sparklefactory.com",
        "Priya Patel",
        "New York, NY",
        '["sequin", "crystal embellishment", "embroidery", "specialty fabrics", "UV-reactive", "LED-integrated"]',
        5, 35, "luxury",
        0.75, 0.78,
        "Artisan embellishment house. Best for crystal work, sequin application, and specialty fabric pieces. Low MOQ for luxury items. Longer lead times."
    ),
    (
        "Pacific Rave Co",
        "ops@pacificrave.com",
        "Jake Morrison",
        "San Francisco, CA",
        '["mesh", "harnesses", "accessories", "arm sleeves", "body harness", "fringe", "faux leather"]',
        20, 14, "budget",
        0.80, 0.92,
        "High-volume accessory and basics manufacturer. Best for mesh pieces, harnesses, and simple accessories. Fast turnaround, competitive pricing."
    ),
    (
        "Electric Thread Studio",
        "studio@electricthread.io",
        "Zara Williams",
        "Austin, TX",
        '["jumpsuits", "full-body suits", "iridescent", "holographic", "capes", "outerwear", "UV-reactive"]',
        10, 21, "mid",
        0.85, 0.88,
        "Full-service festival fashion studio. Strong in jumpsuits, full-body garments, and dramatic statement pieces. Good balance of quality and price."
    ),
]

success = 0
for (name, email, contact, geo, caps, moq, turnaround, price_band, reliability, comms, notes) in vendors:
    sql = f"""
INSERT INTO public.vendors 
  (name, contact_email, contact_name, geography, capabilities, moq_min, turnaround_days, price_band, reliability_score, communications_score, notes)
VALUES (
  '{name}',
  '{email}',
  '{contact}',
  '{geo}',
  '{caps}'::jsonb,
  {moq},
  {turnaround},
  '{price_band}',
  {reliability},
  {comms},
  '{notes.replace("'", "''")}'
)
ON CONFLICT DO NOTHING
"""
    if execute_sql(sql, f"Vendor: {name}"):
        success += 1

print(f"  → {success}/{len(vendors)} vendor profiles seeded")

print("=" * 60)
print("\n✅ Supabase seed complete!")
print(f"  • 1 venue (EDC Las Vegas)")
print(f"  • {len(dna_records)} venue DNA documents")
print(f"  • {len(garments)} garment ontology records")
print(f"  • {len(vendors)} vendor profiles")
