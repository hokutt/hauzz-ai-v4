import { invokeLLM } from "./_core/llm";
import { agentLog, timedLog } from "./agentLogger";
import {
  getAllGarments,
  getVenueDnaByVenueId,
  getVenueBySlug,
  insertConceptCard,
  updateDesignRequestStatus,
} from "./db";
import {
  ConceptCardLLMSchema,
  ConceptGenerationResponseSchema,
  type ConceptCardLLMOutput,
  type IntakeFormInput,
} from "../shared/schemas";
import type { DesignRequest } from "../drizzle/schema";

// ─── RAG: Retrieve Venue DNA ──────────────────────────────────────────────────

async function retrieveVenueDna(venueSlug: string, designRequestId: number) {
  return timedLog(
    { designRequestId, stage: "rag_retrieval", message: `Retrieving venue DNA for: ${venueSlug}` },
    async () => {
      const venue = await getVenueBySlug(venueSlug);
      if (!venue) {
        await agentLog({ designRequestId, stage: "rag_retrieval", level: "warn", message: `Venue not found: ${venueSlug}. Using generic EDC context.` });
        return null;
      }

      const dnaDocs = await getVenueDnaByVenueId(venue.id);
      await agentLog({
        designRequestId,
        stage: "rag_retrieval",
        message: `Retrieved ${dnaDocs.length} venue DNA documents for ${venue.name}`,
        payload: { venueId: venue.id, docCount: dnaDocs.length, categories: dnaDocs.map(d => d.category) },
      });

      return { venue, dnaDocs };
    }
  );
}

// ─── RAG: Retrieve Garment Ontology ──────────────────────────────────────────

async function retrieveGarmentOntology(preferences: string[], designRequestId: number) {
  return timedLog(
    { designRequestId, stage: "rag_retrieval", message: `Retrieving garment ontology for preferences: ${preferences.join(", ")}` },
    async () => {
      const allGarments = await getAllGarments();
      // Filter to relevant garments based on preferences (fuzzy match on garmentType and tags)
      const relevant = allGarments.filter(g => {
        const gType = g.garmentType.toLowerCase();
        const tags = (g.tags as string[] ?? []).map(t => t.toLowerCase());
        return preferences.some(pref => {
          const p = pref.toLowerCase();
          return gType.includes(p) || tags.some(t => t.includes(p));
        });
      });

      // If no specific matches, return all garments (let LLM decide)
      const result = relevant.length > 0 ? relevant : allGarments;

      await agentLog({
        designRequestId,
        stage: "rag_retrieval",
        message: `Garment ontology: ${result.length} relevant records retrieved`,
        payload: { totalGarments: allGarments.length, relevantGarments: result.length, preferences },
      });

      return result;
    }
  );
}

// ─── Build LLM Prompt ─────────────────────────────────────────────────────────

function buildConceptGenerationPrompt(
  intake: IntakeFormInput,
  venueDnaContext: string,
  garmentContext: string,
  generationRound: number
): string {
  return `You are HAUZZ, an AI fashion designer specializing in festival and rave fashion for EDC and similar events.

Your task is to generate ${generationRound === 1 ? "2-4" : "3"} distinct, story-led garment concept directions for a client attending ${intake.venueSlug.replace(/-/g, " ").toUpperCase()}.

## VENUE DNA CONTEXT
${venueDnaContext}

## GARMENT ONTOLOGY (Available garment types and construction knowledge)
${garmentContext}

## CLIENT INTAKE
- Vibe Keywords: ${intake.vibeKeywords.join(", ")}
- Garment Preferences: ${intake.garmentPreferences.join(", ")}
- Comfort/Coverage Level: ${intake.comfortCoverage}
- Color Palette: ${intake.colors.join(", ")}
- Avoid List: ${intake.avoidList.length > 0 ? intake.avoidList.join(", ") : "Nothing specified"}
- Budget Band: ${intake.budgetBand}
- Body Notes: ${intake.bodyNotes ?? "None provided"}
- Event Date: ${intake.eventDate ?? "Not specified"}

## INSTRUCTIONS
Generate ${generationRound === 1 ? "2-4" : "3"} completely distinct concept directions. Each concept must:
1. Have a unique, evocative story name (e.g., "Electric Warrior", "Cosmic Priestess", "Desert Nomad Queen")
2. Include a compelling 2-3 sentence narrative that captures the character and vibe
3. Build a complete look from 2-5 garments (use the ontology as reference)
4. Specify a cohesive color palette (3-6 colors, hex codes preferred)
5. List primary materials and trims
6. Score vibeAlignment (0-1): how well this concept matches the client's vibe keywords
7. Score manufacturabilityScore (0-1): how feasible this is to produce (1 = very easy, 0 = extremely complex)
8. Score productionRiskScore (0-1): production risk (0 = low risk, 1 = high risk)

IMPORTANT: Respect the avoid list strictly. Do not include any avoided elements.
IMPORTANT: Match the comfort/coverage level (${intake.comfortCoverage}).
IMPORTANT: Stay within the spirit of the budget band (${intake.budgetBand}).

Respond with valid JSON matching this exact schema:
{
  "concepts": [
    {
      "storyName": "string",
      "storyNarrative": "string (2-3 sentences)",
      "garmentList": [
        {
          "garmentType": "string (from ontology)",
          "description": "string (specific description for this concept)",
          "materials": ["string"],
          "trims": ["string"],
          "constructionNotes": "string"
        }
      ],
      "palette": ["string (color name or hex)"],
      "materials": ["string (primary materials for the full look)"],
      "trims": ["string (key trims and embellishments)"],
      "vibeAlignment": 0.0,
      "manufacturabilityScore": 0.0,
      "productionRiskScore": 0.0
    }
  ]
}`;
}

// ─── Score Manufacturability ──────────────────────────────────────────────────

function scoreManufacturability(concept: ConceptCardLLMOutput, garmentOntologyData: Awaited<ReturnType<typeof getAllGarments>>): number {
  if (concept.garmentList.length === 0) return 0.5;

  const scores = concept.garmentList.map(g => {
    const ontologyEntry = garmentOntologyData.find(
      o => o.garmentType.toLowerCase() === g.garmentType.toLowerCase()
    );
    return ontologyEntry?.manufacturabilityBase ?? 0.65;
  });

  // Average the scores, penalize for complexity (more garments = slightly lower)
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const complexityPenalty = Math.max(0, (concept.garmentList.length - 3) * 0.03);
  return Math.max(0, Math.min(1, avg - complexityPenalty));
}

// ─── Main: Generate Concepts ──────────────────────────────────────────────────

export async function generateConceptsForRequest(
  designRequest: DesignRequest,
  intake: IntakeFormInput,
  generationRound = 1
): Promise<void> {
  const requestId = designRequest.id;

  await agentLog({
    designRequestId: requestId,
    stage: "concept_generation",
    message: `Starting concept generation (round ${generationRound})`,
    payload: { intake, generationRound },
  });

  // Update status to generating
  await updateDesignRequestStatus(requestId, "generating");

  // Step 1: RAG Retrieval
  const venueData = await retrieveVenueDna(intake.venueSlug, requestId);
  const garmentData = await retrieveGarmentOntology(intake.garmentPreferences, requestId);

  // Build context strings for the prompt
  const venueDnaContext = venueData
    ? venueData.dnaDocs.map(d => `### ${d.category.toUpperCase()}: ${d.title}\n${d.content}`).join("\n\n")
    : "EDC Las Vegas: High-energy electronic music festival. Neon, UV-reactive, holographic aesthetics. Maximalist, otherworldly fashion. Movement-friendly, breathable garments essential.";

  const garmentContext = garmentData
    .slice(0, 20) // Limit to avoid token overflow
    .map(g => `- ${g.garmentType} (${g.category}): ${g.constructionNotes ?? ""} | Materials: ${(g.defaultMaterials as string[]).join(", ")} | Manufacturability: ${g.manufacturabilityBase}`)
    .join("\n");

  // Step 2: LLM Concept Generation
  const prompt = buildConceptGenerationPrompt(intake, venueDnaContext, garmentContext, generationRound);

  await agentLog({
    designRequestId: requestId,
    stage: "concept_generation",
    message: "Sending concept generation prompt to LLM",
    payload: { promptLength: prompt.length, generationRound },
  });

  let rawResponse: string;
  try {
    const llmResponse = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are HAUZZ, a specialist AI fashion designer for festival and rave fashion. Always respond with valid JSON only, no markdown code blocks.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "concept_generation_response",
          strict: true,
          schema: {
            type: "object",
            properties: {
              concepts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    storyName: { type: "string" },
                    storyNarrative: { type: "string" },
                    garmentList: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          garmentType: { type: "string" },
                          description: { type: "string" },
                          materials: { type: "array", items: { type: "string" } },
                          trims: { type: "array", items: { type: "string" } },
                          constructionNotes: { type: "string" },
                        },
                        required: ["garmentType", "description", "materials", "trims", "constructionNotes"],
                        additionalProperties: false,
                      },
                    },
                    palette: { type: "array", items: { type: "string" } },
                    materials: { type: "array", items: { type: "string" } },
                    trims: { type: "array", items: { type: "string" } },
                    vibeAlignment: { type: "number" },
                    manufacturabilityScore: { type: "number" },
                    productionRiskScore: { type: "number" },
                  },
                  required: ["storyName", "storyNarrative", "garmentList", "palette", "materials", "trims", "vibeAlignment", "manufacturabilityScore", "productionRiskScore"],
                  additionalProperties: false,
                },
              },
            },
            required: ["concepts"],
            additionalProperties: false,
          },
        },
      },
    });

    const msgContent = llmResponse.choices[0]?.message?.content;
    rawResponse = typeof msgContent === "string" ? msgContent : "{}";
  } catch (err) {
    await agentLog({
      designRequestId: requestId,
      stage: "concept_generation",
      level: "error",
      message: `LLM call failed: ${err instanceof Error ? err.message : String(err)}`,
    });
    await updateDesignRequestStatus(requestId, "pending");
    throw err;
  }

  // Step 3: Zod Validation of LLM Output
  let parsed: { concepts: ConceptCardLLMOutput[] };
  try {
    const raw = JSON.parse(rawResponse);
    parsed = ConceptGenerationResponseSchema.parse(raw);
  } catch (err) {
    await agentLog({
      designRequestId: requestId,
      stage: "concept_generation",
      level: "error",
      message: `LLM output validation failed: ${err instanceof Error ? err.message : String(err)}`,
      payload: { rawResponse: rawResponse.slice(0, 500) },
    });
    await updateDesignRequestStatus(requestId, "pending");
    throw new Error(`LLM output failed Zod validation: ${err instanceof Error ? err.message : String(err)}`);
  }

  await agentLog({
    designRequestId: requestId,
    stage: "concept_generation",
    message: `LLM generated ${parsed.concepts.length} concepts — validating and scoring`,
    payload: { conceptNames: parsed.concepts.map(c => c.storyName) },
  });

  // Step 4: Score manufacturability and persist concept cards
  for (const concept of parsed.concepts) {
    const computedManufacturability = scoreManufacturability(concept, garmentData);

    await agentLog({
      designRequestId: requestId,
      stage: "manufacturability_scoring",
      message: `Scored "${concept.storyName}": manufacturability=${computedManufacturability.toFixed(2)}, risk=${concept.productionRiskScore.toFixed(2)}`,
      payload: {
        storyName: concept.storyName,
        computedManufacturability,
        llmManufacturability: concept.manufacturabilityScore,
        productionRiskScore: concept.productionRiskScore,
      },
    });

    await insertConceptCard({
      designRequestId: requestId,
      storyName: concept.storyName,
      storyNarrative: concept.storyNarrative,
      garmentList: concept.garmentList as any,
      palette: concept.palette as any,
      materials: concept.materials as any,
      trims: concept.trims as any,
      vibeAlignment: concept.vibeAlignment,
      manufacturabilityScore: computedManufacturability,
      productionRiskScore: concept.productionRiskScore,
      generationRound,
      rawLlmOutput: { response: rawResponse.slice(0, 2000) } as any,
    });
  }

  // Step 5: Update request status to awaiting approval
  await updateDesignRequestStatus(requestId, "awaiting_approval");

  await agentLog({
    designRequestId: requestId,
    stage: "concept_generation",
    message: `Concept generation complete. ${parsed.concepts.length} concepts persisted. Status: awaiting_approval`,
  });
}
