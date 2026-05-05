import { z } from "zod";
import { TRPCError } from "@trpc/server";
import Anthropic from "@anthropic-ai/sdk";
import { and, desc, eq } from "drizzle-orm";

import { protectedProcedure, router } from "../_core/trpc";
import { transcribeAudio } from "../_core/voiceTranscription";
import { storagePut } from "../storage";
import { getDb } from "../db";
import { trades } from "../../drizzle/schema";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EXTRACTION_SYSTEM_PROMPT = `You are a trade-journal assistant. The user dictates trades by voice and may attach chart screenshots. Your job is to extract a single trade record as STRICT JSON matching the provided schema. Use the screenshots to fill or sanity-check fields the user did not say (ticker overlay, timeframe, levels, candles). Never invent prices that are not visible in the chart or stated by the user — leave the field null instead. Return ONLY a JSON object, no prose, no code fences.`;

const TRADE_JSON_SCHEMA_HINT = `{
  "symbol": string|null,            // ticker e.g. "AAPL", "BTCUSD", "ES1!"
  "side": "long"|"short"|null,
  "status": "open"|"closed",        // closed only if exit_price stated/visible
  "entry_price": number|null,
  "exit_price": number|null,
  "quantity": number|null,          // shares/contracts/units, optional
  "pnl": number|null,               // profit or loss in account currency, optional
  "entry_at": string|null,          // ISO 8601 if mentioned, else null
  "exit_at": string|null,           // ISO 8601 if mentioned, else null
  "strategy": string|null,          // e.g. "breakout", "VWAP reclaim", "ICT FVG"
  "notes": string|null,             // 1-3 sentence summary of reasoning + emotion
  "tags": string[]                  // short labels e.g. ["scalp","earnings","missed-stop"]
}`;

type ExtractedTrade = {
  symbol: string | null;
  side: "long" | "short" | null;
  status: "open" | "closed";
  entry_price: number | null;
  exit_price: number | null;
  quantity: number | null;
  pnl: number | null;
  entry_at: string | null;
  exit_at: string | null;
  strategy: string | null;
  notes: string | null;
  tags: string[];
};

function safeParseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function computePnl(t: ExtractedTrade): number | null {
  if (t.pnl !== null && t.pnl !== undefined) return t.pnl;
  if (
    t.entry_price !== null &&
    t.exit_price !== null &&
    t.quantity !== null &&
    t.side
  ) {
    const direction = t.side === "long" ? 1 : -1;
    return (t.exit_price - t.entry_price) * t.quantity * direction;
  }
  return null;
}

async function fetchImageAsBase64(url: string): Promise<{ data: string; mediaType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const mediaType = res.headers.get("content-type") || "image/jpeg";
  const buf = Buffer.from(await res.arrayBuffer());
  return { data: buf.toString("base64"), mediaType };
}

export const tradeJournalRouter = router({
  /** Upload an image (base64) — used for chart screenshots attached to a trade. */
  uploadImage: protectedProcedure
    .input(
      z.object({
        imageBase64: z.string().min(1),
        mimeType: z.string().default("image/jpeg"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const buffer = Buffer.from(input.imageBase64, "base64");
      const sizeMB = buffer.length / (1024 * 1024);
      if (sizeMB > 10) {
        throw new TRPCError({
          code: "PAYLOAD_TOO_LARGE",
          message: `Image is ${sizeMB.toFixed(1)}MB. Maximum is 10MB.`,
        });
      }
      const ext = input.mimeType.split("/")[1] || "jpg";
      const key = `trade-journal/${ctx.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      return { url };
    }),

  /** Transcribe a recorded voice memo (base64 audio) — returns plain text. */
  transcribe: protectedProcedure
    .input(
      z.object({
        audioBase64: z.string().min(1),
        mimeType: z.string().default("audio/webm"),
        language: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const buffer = Buffer.from(input.audioBase64, "base64");
      const sizeMB = buffer.length / (1024 * 1024);
      if (sizeMB > 16) {
        throw new TRPCError({
          code: "PAYLOAD_TOO_LARGE",
          message: `Audio is ${sizeMB.toFixed(1)}MB. Maximum is 16MB.`,
        });
      }
      const ext = input.mimeType.includes("webm") ? "webm"
        : input.mimeType.includes("mp4") ? "mp4"
        : input.mimeType.includes("wav") ? "wav"
        : input.mimeType.includes("ogg") ? "ogg"
        : "mp3";
      const key = `trade-journal/${ctx.user.id}/audio/${Date.now()}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);

      const result = await transcribeAudio({
        audioUrl: url,
        language: input.language ?? "en",
        prompt:
          "Transcribe a trader narrating a trade: ticker symbols, entry/exit prices, stop, target, P/L, setup, emotions.",
      });
      if ("error" in result) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error });
      }
      return { text: result.text, language: result.language, duration: result.duration };
    }),

  /**
   * Extract a structured trade from transcript + optional chart images via Claude vision,
   * then persist it. Returns the saved trade row plus a short agent summary.
   */
  logFromVoice: protectedProcedure
    .input(
      z.object({
        transcript: z.string().min(1),
        imageUrls: z.array(z.string().url()).max(6).default([]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database is not configured.",
        });
      }

      const imageBlocks: Anthropic.ImageBlockParam[] = [];
      for (const url of input.imageUrls) {
        try {
          const { data, mediaType } = await fetchImageAsBase64(url);
          imageBlocks.push({
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data,
            },
          });
        } catch (err) {
          console.warn("[tradeJournal] skipping unfetchable image", url, err);
        }
      }

      const userBlocks: Anthropic.ContentBlockParam[] = [
        ...imageBlocks,
        {
          type: "text",
          text: `Transcript:\n"""${input.transcript}"""\n\nReturn JSON matching this schema:\n${TRADE_JSON_SCHEMA_HINT}`,
        },
      ];

      let extracted: ExtractedTrade;
      let agentSummary = "";
      try {
        const response = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1024,
          system: EXTRACTION_SYSTEM_PROMPT,
          messages: [{ role: "user", content: userBlocks }],
        });
        const text = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("")
          .trim();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON in model response");
        extracted = JSON.parse(jsonMatch[0]) as ExtractedTrade;

        const followup = await anthropic.messages.create({
          model: "claude-3-5-haiku-20241022",
          max_tokens: 200,
          messages: [
            {
              role: "user",
              content: `One short sentence (max 25 words) summarizing this trade for a journal feed. No emojis. Trade: ${JSON.stringify(extracted)}`,
            },
          ],
        });
        agentSummary = followup.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("")
          .trim();
      } catch (err) {
        console.error("[tradeJournal] extraction failed", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not extract trade details. Try again with clearer audio or details.",
        });
      }

      const pnl = computePnl(extracted);
      const status: "open" | "closed" =
        extracted.status === "closed" || extracted.exit_price !== null ? "closed" : "open";

      const inserted = await db
        .insert(trades)
        .values({
          userId: ctx.user.id,
          symbol: extracted.symbol ?? null,
          side: extracted.side ?? null,
          status,
          entryPrice: extracted.entry_price ?? null,
          exitPrice: extracted.exit_price ?? null,
          quantity: extracted.quantity ?? null,
          pnl,
          entryAt: safeParseDate(extracted.entry_at),
          exitAt: safeParseDate(extracted.exit_at),
          strategy: extracted.strategy ?? null,
          notes: extracted.notes ?? null,
          tags: extracted.tags ?? [],
          imageUrls: input.imageUrls,
          rawTranscript: input.transcript,
          agentSummary: agentSummary || null,
        })
        .returning();

      return { trade: inserted[0], agentSummary };
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(trades)
      .where(eq(trades.userId, ctx.user.id))
      .orderBy(desc(trades.createdAt))
      .limit(200);
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db
        .delete(trades)
        .where(and(eq(trades.id, input.id), eq(trades.userId, ctx.user.id)));
      return { success: true };
    }),
});
