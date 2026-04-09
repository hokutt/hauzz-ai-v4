import { z } from "zod";
import { protectedProcedure, founderProcedure, publicProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { vendors, designPackets } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { agentLog } from "../agentLogger";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Design Studio Chat ────────────────────────────────────────────────────────

export const aiChatRouter = router({
  /**
   * Send a message to the HAUZZ AI design assistant.
   * Uses Claude for richer, more creative responses.
   * Returns full response (streaming handled via SSE endpoint).
   */
  sendMessage: publicProcedure
    .input(
      z.object({
        messages: z.array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
          })
        ),
        designRequestId: z.number().optional(),
        venueSlug: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const systemPrompt = buildChatSystemPrompt(input.venueSlug);

      try {
        // Use Claude for richer creative responses
        const response = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1024,
          system: systemPrompt,
          messages: input.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        });

        const text = response.content
          .filter((b) => b.type === "text")
          .map((b) => (b.type === "text" ? b.text : ""))
          .join("");

        return { text, model: "claude-3-5-sonnet" };
      } catch (claudeErr) {
        // Fallback to built-in LLM if Claude fails
        console.warn("[aiChat] Claude failed, falling back to built-in LLM:", claudeErr);
        const llmResponse = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            ...input.messages,
          ],
        });
        const text =
          typeof llmResponse.choices[0]?.message?.content === "string"
            ? llmResponse.choices[0].message.content
            : "I'm having trouble responding right now. Please try again.";
        return { text, model: "built-in" };
      }
    }),

  /**
   * Draft a personalized vendor outreach email using Claude.
   * Founder-only. Takes a vendor ID and design packet ID.
   */
  draftVendorEmail: founderProcedure
    .input(
      z.object({
        vendorId: z.number(),
        designPacketId: z.number(),
        designRequestId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Fetch vendor and design packet
      const [vendorRows, packetRows] = await Promise.all([
        db.select().from(vendors).where(eq(vendors.id, input.vendorId)).limit(1),
        db.select().from(designPackets).where(eq(designPackets.id, input.designPacketId)).limit(1),
      ]);

      const vendor = vendorRows[0];
      const packet = packetRows[0];

      if (!vendor) throw new TRPCError({ code: "NOT_FOUND", message: "Vendor not found" });
      if (!packet) throw new TRPCError({ code: "NOT_FOUND", message: "Design packet not found" });

      const vendorTags = (vendor.capabilities as string[] ?? []).join(", ");

      const prompt = `You are a professional fashion production coordinator at HAUZZ.AI, a custom festival garment company.

Draft a concise, professional, and personalized outreach email to a garment manufacturer about a new production inquiry.

VENDOR DETAILS:
- Name: ${vendor.name}
- Specialty: ${vendorTags}
- MOQ: ${vendor.moqMin ?? "Unknown"} units minimum
- Turnaround: ${vendor.turnaroundDays ?? "Unknown"} days
- Location: ${vendor.geography ?? "Unknown"}

DESIGN PACKET SUMMARY:
- Story Name: ${packet.storyName ?? "Custom Festival Look"}
- Garments: ${JSON.stringify(packet.garmentList ?? [])}
- Materials: ${JSON.stringify(packet.materials ?? [])}
- Production Risk Score: ${packet.productionRiskScore ?? "N/A"}

Write a 150-200 word email that:
1. Introduces HAUZZ.AI briefly (1 sentence)
2. Describes the specific garment project and why this vendor is a good fit
3. Lists the key production requirements (garment types, materials, timeline)
4. Asks for a quote and sample timeline
5. Ends with a professional sign-off from "The HAUZZ.AI Team"

Be warm but professional. Do not use generic templates — make it specific to this vendor's specialty.`;

      let emailDraft: string;
      try {
        const response = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 512,
          messages: [{ role: "user", content: prompt }],
        });
        emailDraft = response.content
          .filter((b) => b.type === "text")
          .map((b) => (b.type === "text" ? b.text : ""))
          .join("");
      } catch {
        // Fallback to built-in LLM
        const llmRes = await invokeLLM({
          messages: [{ role: "user", content: prompt }],
        });
        emailDraft =
          typeof llmRes.choices[0]?.message?.content === "string"
            ? llmRes.choices[0].message.content
            : "Unable to generate email draft.";
      }

      await agentLog({
        designRequestId: input.designRequestId,
        stage: "vendor_outreach",
        message: `Vendor email drafted for ${vendor.name}`,
        payload: { vendorId: input.vendorId, packetId: input.designPacketId, emailLength: emailDraft.length },
      });

      return {
        emailDraft,
        vendorName: vendor.name,
        vendorEmail: vendor.contactEmail,
        subject: `Custom Garment Production Inquiry — HAUZZ.AI x ${vendor.name}`,
      };
    }),
});

// ─── System Prompt Builder ─────────────────────────────────────────────────────

function buildChatSystemPrompt(venueSlug?: string): string {
  const venueName = venueSlug
    ? venueSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "EDC Las Vegas";

  return `You are HAUZZ, an AI fashion designer specializing in custom festival and rave fashion for ${venueName} and similar events.

Your personality: Creative, knowledgeable, enthusiastic about festival culture, and deeply attuned to the EDC aesthetic — neon, holographic, UV-reactive, maximalist, otherworldly.

Your role in this conversation:
- Help clients articulate their festival fashion vision
- Ask smart questions about their vibe, comfort level, colors, and garment preferences
- Suggest concept directions with evocative story names (e.g., "Electric Warrior", "Cosmic Priestess")
- Explain garment construction, materials, and what's feasible to produce
- Guide them through the intake form fields naturally in conversation

When you have enough information, encourage the user to submit their intake by saying something like:
"I have a great sense of your vision! Ready to generate your custom concept directions? Hit 'Submit Intake' to see what HAUZZ creates for you."

Keep responses concise (2-4 sentences max unless asked for detail). Be encouraging and make the user feel like they're working with a real fashion designer who gets the culture.`;
}
