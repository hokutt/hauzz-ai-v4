/**
 * HAUZZ.AI V4 — Seed Script
 * Seeds: 1 EDC venue, 12 venue DNA documents, 30 garment ontology records, 5 vendor profiles
 */
import { createConnection } from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const url = new URL(DB_URL);
const db = await createConnection({
  host: url.hostname,
  port: parseInt(url.port || "4000"),
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

// ─── 1. Venue ─────────────────────────────────────────────────────────────────
console.log("Seeding venue...");
await db.execute(
  `INSERT IGNORE INTO venues (slug, name, location, description) VALUES (?, ?, ?, ?)`,
  [
    "edc-las-vegas",
    "EDC Las Vegas",
    "Las Vegas Motor Speedway, Las Vegas, NV",
    "Electric Daisy Carnival Las Vegas — the world's largest electronic music festival. Three nights of immersive art, carnival rides, and transformative music across 9 stages under the electric sky."
  ]
);
const [[venueRow]] = await db.execute(`SELECT id FROM venues WHERE slug = 'edc-las-vegas'`);
const venueId = venueRow.id;
console.log(`✓ Venue ID: ${venueId}`);

// ─── 2. Venue DNA Documents ───────────────────────────────────────────────────
console.log("Seeding venue DNA...");
const venueDna = [
  {
    category: "aesthetic",
    title: "The Electric Sky Aesthetic",
    content: "EDC Las Vegas is defined by its signature 'Under the Electric Sky' aesthetic — a world where neon, UV reactive materials, and bioluminescent palettes dominate. The visual language is maximalist, otherworldly, and unapologetically bold. Think cosmic dreamscapes, circuit board geometry, and rave-era futurism fused with carnival wonder.",
    tags: ["neon", "UV reactive", "maximalist", "cosmic", "futurism", "carnival"]
  },
  {
    category: "palette",
    title: "EDC Signature Color Palette",
    content: "The dominant EDC palette rotates around electric blue (#00BFFF), neon pink (#FF007F), cosmic purple (#7B2FBE), UV white (#F0F0FF), acid green (#39FF14), and deep black (#0A0A0A) as the base. Holographic silver and iridescent rainbow are recurring accent treatments. Warm neons like electric orange and hot coral appear in smaller doses for contrast.",
    tags: ["electric blue", "neon pink", "cosmic purple", "UV white", "acid green", "holographic", "iridescent"]
  },
  {
    category: "crowd",
    title: "EDC Attendee Identity",
    content: "EDC attendees (Headliners) are a community-first crowd who invest deeply in their festival identity. Self-expression through fashion is a ritual, not an afterthought. The typical Headliner ranges from 18–35, values comfort for 8+ hour dancing sets, and gravitates toward looks that photograph well under stage lighting. Gender expression is fluid and boundary-pushing.",
    tags: ["headliners", "community", "self-expression", "comfort", "gender-fluid", "photography"]
  },
  {
    category: "energy",
    title: "Festival Energy and Movement",
    content: "EDC is a high-energy, high-movement environment. Attendees dance for 6–10 hours across multiple stages. Garments must allow full range of motion — especially arm raises, hip movement, and crouching. Breathability is critical in the Las Vegas desert heat (85–100°F at night). Secure closures are essential — nothing should fall off during dancing.",
    tags: ["movement", "breathability", "heat", "range of motion", "secure closures", "durability"]
  },
  {
    category: "themes",
    title: "Recurring Festival Themes",
    content: "EDC rotates annual themes but maintains core archetypes: Cosmic Warrior (armored, celestial, powerful), Electric Fairy (ethereal, winged, luminescent), Desert Nomad (earthy tones with neon accents, layered), Rave Royalty (structured, commanding, jewel-toned), Circuit Witch (dark base with glowing accents, mystical), and Carnival Spirit (bright, playful, structured corsetry).",
    tags: ["cosmic warrior", "electric fairy", "desert nomad", "rave royalty", "circuit witch", "carnival spirit"]
  },
  {
    category: "materials",
    title: "Preferred Festival Materials",
    content: "Top-performing materials at EDC: holographic spandex (UV reactive, stretchy), mesh (breathable, layerable), PVC/vinyl accents (structured, reflective), lycra/spandex blends (movement-friendly), faux leather (structured pieces), UV-reactive fabric (glows under blacklight), sequin fabric (light-catching), and organza (ethereal overlays). Avoid heavy fabrics, non-stretch materials for bodywear, and anything that traps heat.",
    tags: ["holographic spandex", "mesh", "PVC", "lycra", "faux leather", "UV reactive", "sequin", "organza"]
  },
  {
    category: "trims",
    title: "Signature Festival Trims and Embellishments",
    content: "EDC looks are elevated with: rhinestone appliqués, LED strip accents, iridescent fringe, holographic binding tape, crystal mesh overlays, UV-reactive piping, metallic hardware (D-rings, chains), feather trim, and heat-transfer holographic vinyl. Trims should be securely attached — loose embellishments become hazards in crowd environments.",
    tags: ["rhinestones", "LED", "fringe", "holographic", "crystals", "UV piping", "chains", "feathers"]
  },
  {
    category: "silhouettes",
    title: "Dominant Silhouette Language",
    content: "EDC silhouettes favor: high-waisted bottoms (shorts, skirts, pants) paired with crop tops or bralettes; bodysuit-as-base with layered outerwear; structured corset tops with flowing or structured bottoms; full-coverage bodysuits for cooler nights; and micro-shorts or booty shorts for maximum movement. Asymmetric cuts, cutouts, and strappy details are signature design moves.",
    tags: ["high-waisted", "crop top", "bodysuit", "corset", "micro-shorts", "asymmetric", "cutouts", "strappy"]
  },
  {
    category: "footwear_accessories",
    title: "Footwear and Accessories Context",
    content: "Platform boots (6–10 inch) are iconic at EDC but require garments with proportional hemlines. Knee-high and thigh-high styles are popular. Accessories include LED gloves, light-up wings, body harnesses, fanny packs (functional), and elaborate headpieces. Garment designs should account for harness layering and avoid competing with statement accessories.",
    tags: ["platform boots", "LED gloves", "wings", "harness", "headpiece", "fanny pack", "proportional hemlines"]
  },
  {
    category: "photography",
    title: "Photography and Stage Lighting Considerations",
    content: "EDC's stage lighting uses heavy UV/blacklight, strobes, laser grids, and RGBW LED washes. Materials that photograph best: UV-reactive fabrics (glow dramatically), holographic (creates rainbow lens flare), sequins (sparkle in any light), and high-contrast color blocking. Avoid matte dark fabrics that disappear in low-light photography.",
    tags: ["UV blacklight", "strobes", "holographic", "sequins", "UV reactive", "color blocking", "photography"]
  },
  {
    category: "sizing_fit",
    title: "Sizing and Fit Philosophy",
    content: "EDC fashion celebrates all body types. Custom garments should be built to exact measurements. Key fit considerations: waistband security (no slippage during dancing), bra-level support for tops, adjustable closures where possible, and stretch allowance of at least 20% beyond body measurements for comfort. Inclusive sizing from XS to 4X is expected.",
    tags: ["inclusive sizing", "custom measurements", "waistband security", "support", "adjustable", "stretch"]
  },
  {
    category: "sustainability",
    title: "Sustainability and Ethical Production",
    content: "A growing segment of EDC Headliners prioritize sustainable fashion. Preferred attributes: recycled or deadstock fabrics, ethical manufacturing (fair wages, safe conditions), low-waste pattern cutting, and durable construction that outlasts one festival season. Certifications like OEKO-TEX and GOTS are valued. Transparency in supply chain is increasingly expected.",
    tags: ["sustainability", "recycled", "ethical", "low-waste", "OEKO-TEX", "durable", "transparency"]
  },
];

for (const doc of venueDna) {
  await db.execute(
    `INSERT INTO venue_dna (venueId, category, title, content, tags) VALUES (?, ?, ?, ?, ?)`,
    [venueId, doc.category, doc.title, doc.content, JSON.stringify(doc.tags)]
  );
}
console.log(`✓ ${venueDna.length} venue DNA documents`);

// ─── 3. Garment Ontology ──────────────────────────────────────────────────────
console.log("Seeding garment ontology...");
const garments = [
  // TOPS
  { garmentType: "rave bra", category: "top", constructionNotes: "Underwire or bralette construction. Must include secure band closure. Cups can be structured or soft. Common base for embellishment.", defaultMaterials: ["holographic spandex", "mesh", "lycra"], defaultTrims: ["rhinestones", "crystal mesh", "fringe"], manufacturabilityBase: 0.85, moqTypical: 5, leadTimeDays: 14, tags: ["top", "bra", "festival", "embellished"] },
  { garmentType: "crop top", category: "top", constructionNotes: "Cropped at or above the navel. Can be structured or stretchy. Keyhole, halter, or bandeau variations common.", defaultMaterials: ["lycra", "mesh", "holographic spandex"], defaultTrims: ["binding tape", "UV piping"], manufacturabilityBase: 0.9, moqTypical: 5, leadTimeDays: 10, tags: ["top", "crop", "festival"] },
  { garmentType: "corset top", category: "top", constructionNotes: "Structured boning required (plastic or steel). Lace-up or hook-and-eye closure at back. Modesty panel recommended. High construction complexity.", defaultMaterials: ["faux leather", "PVC", "brocade", "satin"], defaultTrims: ["metal grommets", "lace-up cord", "rhinestones"], manufacturabilityBase: 0.6, moqTypical: 3, leadTimeDays: 21, tags: ["top", "corset", "structured", "festival"] },
  { garmentType: "bodysuit", category: "top", constructionNotes: "One-piece torso garment with snap or hook closure at crotch. Must have stretch for ease of wear. Can be long-sleeve, sleeveless, or strappy.", defaultMaterials: ["lycra", "holographic spandex", "mesh"], defaultTrims: ["rhinestones", "UV piping", "crystal appliqué"], manufacturabilityBase: 0.8, moqTypical: 5, leadTimeDays: 14, tags: ["top", "bodysuit", "one-piece", "festival"] },
  { garmentType: "halter top", category: "top", constructionNotes: "Neck-tie or neck-hook closure. Open back design. Can be minimal triangle or structured cup style.", defaultMaterials: ["lycra", "mesh", "holographic spandex"], defaultTrims: ["fringe", "rhinestones"], manufacturabilityBase: 0.88, moqTypical: 5, leadTimeDays: 10, tags: ["top", "halter", "open back", "festival"] },
  { garmentType: "harness top", category: "top", constructionNotes: "Strap-based construction worn over skin or base layer. Adjustable buckles or D-rings. More accessory than garment — minimal fabric.", defaultMaterials: ["faux leather", "PVC", "elastic"], defaultTrims: ["metal hardware", "D-rings", "chains"], manufacturabilityBase: 0.75, moqTypical: 5, leadTimeDays: 14, tags: ["top", "harness", "accessory", "festival"] },
  // BOTTOMS
  { garmentType: "micro shorts", category: "bottom", constructionNotes: "Very short inseam (0–2 inches). High-waisted preferred. Elastic or zip closure. Must have secure waistband.", defaultMaterials: ["holographic spandex", "faux leather", "lycra"], defaultTrims: ["UV piping", "rhinestone waistband"], manufacturabilityBase: 0.9, moqTypical: 5, leadTimeDays: 10, tags: ["bottom", "shorts", "micro", "festival"] },
  { garmentType: "booty shorts", category: "bottom", constructionNotes: "Fitted shorts with 1–3 inch inseam. Can include side cutouts or lace-up details. High waist construction preferred.", defaultMaterials: ["lycra", "holographic spandex", "mesh"], defaultTrims: ["lace-up cord", "rhinestones"], manufacturabilityBase: 0.9, moqTypical: 5, leadTimeDays: 10, tags: ["bottom", "shorts", "festival"] },
  { garmentType: "mini skirt", category: "bottom", constructionNotes: "Above-the-knee length. Can be A-line, pencil, or wrap style. Elastic or zip waistband. Consider built-in shorts for modesty.", defaultMaterials: ["holographic spandex", "PVC", "sequin fabric"], defaultTrims: ["fringe", "rhinestones", "iridescent binding"], manufacturabilityBase: 0.85, moqTypical: 5, leadTimeDays: 12, tags: ["bottom", "skirt", "mini", "festival"] },
  { garmentType: "cargo pants", category: "bottom", constructionNotes: "Utility-style pants with multiple pockets. Can be full-length or cropped. Drawstring or elastic waist. Festival version often in bold colors or prints.", defaultMaterials: ["nylon", "cotton twill", "holographic fabric"], defaultTrims: ["metal hardware", "UV piping", "reflective tape"], manufacturabilityBase: 0.7, moqTypical: 8, leadTimeDays: 18, tags: ["bottom", "pants", "cargo", "utility", "festival"] },
  { garmentType: "flare pants", category: "bottom", constructionNotes: "Wide-leg from knee down. High waist construction. Can be full-length or cropped. Dramatic silhouette for stage presence.", defaultMaterials: ["holographic spandex", "sequin fabric", "lycra"], defaultTrims: ["fringe hem", "rhinestone waistband"], manufacturabilityBase: 0.75, moqTypical: 5, leadTimeDays: 14, tags: ["bottom", "pants", "flare", "wide-leg", "festival"] },
  { garmentType: "rave skirt", category: "bottom", constructionNotes: "Flowy or structured skirt, often with layers. Can include built-in shorts. Elastic waistband. Asymmetric hems are popular.", defaultMaterials: ["organza", "mesh", "holographic spandex"], defaultTrims: ["fringe", "iridescent binding", "rhinestones"], manufacturabilityBase: 0.8, moqTypical: 5, leadTimeDays: 12, tags: ["bottom", "skirt", "flowy", "festival"] },
  // FULL BODY
  { garmentType: "full bodysuit", category: "full_body", constructionNotes: "Full torso and leg coverage. Can be long-sleeve or sleeveless. Snap or zip closure. Must have significant stretch for ease of wear and movement.", defaultMaterials: ["holographic spandex", "lycra", "mesh"], defaultTrims: ["rhinestone appliqué", "UV piping", "crystal mesh panels"], manufacturabilityBase: 0.7, moqTypical: 3, leadTimeDays: 18, tags: ["full body", "bodysuit", "coverage", "festival"] },
  { garmentType: "catsuit", category: "full_body", constructionNotes: "Full-length one-piece covering torso and legs. Zip or snap closure. High stretch required. Can include cutouts for visual interest.", defaultMaterials: ["lycra", "holographic spandex", "velvet"], defaultTrims: ["rhinestones", "UV piping", "metallic zippers"], manufacturabilityBase: 0.65, moqTypical: 3, leadTimeDays: 21, tags: ["full body", "catsuit", "one-piece", "festival"] },
  { garmentType: "romper", category: "full_body", constructionNotes: "One-piece shorts and top combination. Can be structured or stretchy. Zip or button front. Practical and fashionable.", defaultMaterials: ["lycra", "holographic spandex", "mesh"], defaultTrims: ["rhinestones", "fringe", "UV piping"], manufacturabilityBase: 0.78, moqTypical: 5, leadTimeDays: 14, tags: ["full body", "romper", "one-piece", "festival"] },
  // OUTERWEAR
  { garmentType: "rave jacket", category: "outerwear", constructionNotes: "Cropped or full-length jacket. Can be structured or oversized. Zip or button front. Statement outerwear for cooler nights.", defaultMaterials: ["faux leather", "holographic fabric", "PVC"], defaultTrims: ["metal hardware", "rhinestones", "fringe"], manufacturabilityBase: 0.65, moqTypical: 3, leadTimeDays: 21, tags: ["outerwear", "jacket", "festival"] },
  { garmentType: "kimono", category: "outerwear", constructionNotes: "Loose, open-front robe-style garment. Flowing sleeves. Can be sheer or opaque. Excellent for layering over festival looks.", defaultMaterials: ["organza", "chiffon", "mesh"], defaultTrims: ["fringe hem", "embroidery", "rhinestones"], manufacturabilityBase: 0.8, moqTypical: 5, leadTimeDays: 14, tags: ["outerwear", "kimono", "layering", "festival"] },
  { garmentType: "cape", category: "outerwear", constructionNotes: "Sleeveless outerwear attached at shoulders or neck. Dramatic silhouette. Can be floor-length or cropped. No sleeves to restrict movement.", defaultMaterials: ["holographic fabric", "organza", "faux leather"], defaultTrims: ["rhinestones", "fringe", "metallic binding"], manufacturabilityBase: 0.75, moqTypical: 5, leadTimeDays: 14, tags: ["outerwear", "cape", "dramatic", "festival"] },
  { garmentType: "mesh cover-up", category: "outerwear", constructionNotes: "Sheer mesh layer worn over festival look. Can be dress-length or top-length. Provides visual layering without adding heat.", defaultMaterials: ["mesh", "fishnet", "sheer organza"], defaultTrims: ["rhinestone trim", "fringe"], manufacturabilityBase: 0.88, moqTypical: 5, leadTimeDays: 10, tags: ["outerwear", "mesh", "sheer", "layering", "festival"] },
  // ACCESSORIES
  { garmentType: "body harness", category: "accessory", constructionNotes: "Strap construction worn over torso. Adjustable buckles. Can be chest harness, full body, or waist harness. Pairs over bodysuits or bare skin.", defaultMaterials: ["faux leather", "elastic", "PVC"], defaultTrims: ["metal hardware", "D-rings", "chains", "rhinestones"], manufacturabilityBase: 0.78, moqTypical: 5, leadTimeDays: 14, tags: ["accessory", "harness", "strappy", "festival"] },
  { garmentType: "arm sleeves", category: "accessory", constructionNotes: "Fingerless or full-hand arm coverings. Can be sheer, mesh, or opaque. Elastic at wrist and upper arm. Popular for UV protection and style.", defaultMaterials: ["mesh", "holographic spandex", "lycra"], defaultTrims: ["rhinestones", "UV piping", "fringe"], manufacturabilityBase: 0.9, moqTypical: 10, leadTimeDays: 7, tags: ["accessory", "arm sleeves", "festival"] },
  { garmentType: "leg warmers", category: "accessory", constructionNotes: "Tube-style leg coverings worn over boots or shoes. Elastic at top and bottom. Can be knee-high or thigh-high.", defaultMaterials: ["holographic spandex", "mesh", "faux fur"], defaultTrims: ["rhinestones", "fringe", "UV piping"], manufacturabilityBase: 0.9, moqTypical: 10, leadTimeDays: 7, tags: ["accessory", "leg warmers", "festival"] },
  { garmentType: "festival belt", category: "accessory", constructionNotes: "Decorative waist belt or hip belt. Can be wide or narrow. Buckle or tie closure. Often heavily embellished.", defaultMaterials: ["faux leather", "elastic", "PVC"], defaultTrims: ["rhinestones", "metal hardware", "chains", "fringe"], manufacturabilityBase: 0.85, moqTypical: 10, leadTimeDays: 10, tags: ["accessory", "belt", "waist", "festival"] },
  { garmentType: "headpiece", category: "accessory", constructionNotes: "Wearable head decoration. Can be crown, halo, ears, or structured hat. Must be secure for dancing. Lightweight construction essential.", defaultMaterials: ["wire frame", "faux flowers", "holographic fabric", "feathers"], defaultTrims: ["rhinestones", "LED lights", "iridescent accents"], manufacturabilityBase: 0.7, moqTypical: 3, leadTimeDays: 14, tags: ["accessory", "headpiece", "crown", "festival"] },
  // SPECIALTY
  { garmentType: "festival wings", category: "specialty", constructionNotes: "Wearable wings attached to wrist or back harness. Wire frame with fabric covering. Must be lightweight and packable. LED version adds complexity.", defaultMaterials: ["organza", "holographic fabric", "wire frame"], defaultTrims: ["rhinestones", "LED strips", "iridescent fabric"], manufacturabilityBase: 0.55, moqTypical: 3, leadTimeDays: 21, tags: ["specialty", "wings", "wearable art", "festival"] },
  { garmentType: "light-up costume", category: "specialty", constructionNotes: "Garment with integrated LED lighting. Requires battery pack concealment and wiring. High complexity. Must be washable or have removable electronics.", defaultMaterials: ["lycra", "holographic spandex", "mesh"], defaultTrims: ["LED strips", "battery pack", "wiring"], manufacturabilityBase: 0.4, moqTypical: 1, leadTimeDays: 30, tags: ["specialty", "LED", "light-up", "tech", "festival"] },
  { garmentType: "pasties set", category: "specialty", constructionNotes: "Adhesive or tie-on nipple covers. Often heavily embellished. Must use skin-safe adhesives. Pair with other festival pieces.", defaultMaterials: ["satin", "faux leather", "holographic fabric"], defaultTrims: ["rhinestones", "fringe", "tassels"], manufacturabilityBase: 0.92, moqTypical: 10, leadTimeDays: 7, tags: ["specialty", "pasties", "minimal", "festival"] },
  { garmentType: "festival set (matching)", category: "set", constructionNotes: "Coordinated two-piece set (top + bottom) in matching fabric. Sold as a unit. Increases perceived value. Bra/shorts, bra/skirt, or corset/pants combinations.", defaultMaterials: ["holographic spandex", "lycra", "mesh"], defaultTrims: ["matching rhinestones", "UV piping", "fringe"], manufacturabilityBase: 0.75, moqTypical: 5, leadTimeDays: 16, tags: ["set", "matching", "two-piece", "festival"] },
  { garmentType: "rave dress", category: "full_body", constructionNotes: "One-piece dress, typically mini to midi length. Can be structured or stretchy. Zip or tie closure. Statement piece for festival.", defaultMaterials: ["holographic spandex", "sequin fabric", "mesh"], defaultTrims: ["rhinestones", "fringe hem", "iridescent binding"], manufacturabilityBase: 0.75, moqTypical: 5, leadTimeDays: 14, tags: ["full body", "dress", "festival"] },
  { garmentType: "bralette", category: "top", constructionNotes: "Soft, unstructured bra-style top. No underwire. Comfortable for extended wear. Can be minimal triangle or more coverage.", defaultMaterials: ["lycra", "mesh", "holographic spandex"], defaultTrims: ["rhinestones", "fringe", "lace trim"], manufacturabilityBase: 0.92, moqTypical: 5, leadTimeDays: 10, tags: ["top", "bralette", "soft", "festival"] },
];

for (const g of garments) {
  await db.execute(
    `INSERT INTO garment_ontology (garmentType, category, constructionNotes, defaultMaterials, defaultTrims, manufacturabilityBase, moqTypical, leadTimeDays, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [g.garmentType, g.category, g.constructionNotes, JSON.stringify(g.defaultMaterials), JSON.stringify(g.defaultTrims), g.manufacturabilityBase, g.moqTypical, g.leadTimeDays, JSON.stringify(g.tags)]
  );
}
console.log(`✓ ${garments.length} garment ontology records`);

// ─── 4. Vendors ───────────────────────────────────────────────────────────────
console.log("Seeding vendors...");
const vendors = [
  {
    name: "Neon Stitch Co.",
    contactEmail: "orders@neonstitch.co",
    contactName: "Maya Rodriguez",
    geography: "USA",
    capabilities: ["rave bra", "bodysuit", "crop top", "bralette", "halter top", "festival set (matching)"],
    moqMin: 5,
    turnaroundDays: 21,
    priceBand: "$$",
    reliabilityScore: 0.92,
    communicationsScore: 0.95,
    notes: "LA-based boutique manufacturer specializing in festival and activewear. Excellent communication, fast sampling. Strong in holographic and UV-reactive fabrics. Preferred vendor for small-batch custom orders."
  },
  {
    name: "Cosmic Threads MFG",
    contactEmail: "production@cosmicthreads.com",
    contactName: "Derek Kim",
    geography: "USA",
    capabilities: ["corset top", "bodysuit", "catsuit", "full bodysuit", "rave jacket", "romper", "rave dress"],
    moqMin: 10,
    turnaroundDays: 28,
    priceBand: "$$$",
    reliabilityScore: 0.88,
    communicationsScore: 0.82,
    notes: "Premium US manufacturer with expertise in structured garments and complex construction. Corset and boning specialists. Higher price point but exceptional quality. Slower communication response times."
  },
  {
    name: "Glitter Factory SZ",
    contactEmail: "sales@glitterfactory.com",
    contactName: "Lily Chen",
    geography: "China",
    capabilities: ["micro shorts", "booty shorts", "mini skirt", "flare pants", "rave skirt", "cargo pants", "festival set (matching)"],
    moqMin: 20,
    turnaroundDays: 35,
    priceBand: "$",
    reliabilityScore: 0.78,
    communicationsScore: 0.72,
    notes: "Shenzhen-based manufacturer with strong bottom and separates capabilities. Very competitive pricing for larger runs. Longer lead times due to shipping. Quality control requires sample approval. Best for volume orders."
  },
  {
    name: "Sparkle & Sew Studio",
    contactEmail: "hello@sparkleandsew.com",
    contactName: "Jasmine Torres",
    geography: "USA",
    capabilities: ["body harness", "festival wings", "headpiece", "festival belt", "arm sleeves", "leg warmers", "pasties set", "harness top"],
    moqMin: 3,
    turnaroundDays: 14,
    priceBand: "$$",
    reliabilityScore: 0.90,
    communicationsScore: 0.98,
    notes: "Miami-based specialty accessories and wearable art studio. Exceptional at embellishment and handcraft work. Low MOQ makes them ideal for accessories and specialty pieces. Outstanding communication and reliability."
  },
  {
    name: "Prism Apparel Group",
    contactEmail: "custom@prismapparel.com",
    contactName: "Alex Nguyen",
    geography: "Mexico",
    capabilities: ["bodysuit", "crop top", "rave bra", "kimono", "cape", "mesh cover-up", "bralette", "full bodysuit", "light-up costume"],
    moqMin: 8,
    turnaroundDays: 24,
    priceBand: "$$",
    reliabilityScore: 0.85,
    communicationsScore: 0.88,
    notes: "Guadalajara-based manufacturer with strong all-around capabilities. Good balance of price, quality, and turnaround. Experienced with festival fashion and UV-reactive materials. Handles complex multi-piece orders well."
  },
];

for (const v of vendors) {
  await db.execute(
    `INSERT INTO vendors (name, contactEmail, contactName, geography, capabilities, moqMin, turnaroundDays, priceBand, reliabilityScore, communicationsScore, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [v.name, v.contactEmail, v.contactName, v.geography, JSON.stringify(v.capabilities), v.moqMin, v.turnaroundDays, v.priceBand, v.reliabilityScore, v.communicationsScore, v.notes]
  );
}
console.log(`✓ ${vendors.length} vendor profiles`);

await db.end();
console.log("\n✅ Seed complete!");
