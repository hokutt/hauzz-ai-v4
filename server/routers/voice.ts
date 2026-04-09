import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { transcribeAudio } from "../_core/voiceTranscription";
import { storagePut } from "../storage";
import { TRPCError } from "@trpc/server";

export const voiceRouter = router({
  /**
   * Upload audio blob (base64) to storage and transcribe it.
   * Frontend sends: base64-encoded audio data + mimeType
   * Returns: transcription text + language + segments
   */
  transcribe: protectedProcedure
    .input(
      z.object({
        audioBase64: z.string().min(1, "Audio data is required"),
        mimeType: z.string().default("audio/webm"),
        language: z.string().optional(),
        prompt: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Step 1: Decode base64 audio and upload to storage
      let audioBuffer: Buffer;
      try {
        audioBuffer = Buffer.from(input.audioBase64, "base64");
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid base64 audio data",
        });
      }

      // Validate size (16MB limit)
      const sizeMB = audioBuffer.length / (1024 * 1024);
      if (sizeMB > 16) {
        throw new TRPCError({
          code: "PAYLOAD_TOO_LARGE",
          message: `Audio file is ${sizeMB.toFixed(1)}MB. Maximum is 16MB.`,
        });
      }

      // Upload to S3 storage
      const ext = input.mimeType.includes("webm") ? "webm"
        : input.mimeType.includes("mp4") ? "mp4"
        : input.mimeType.includes("wav") ? "wav"
        : input.mimeType.includes("ogg") ? "ogg"
        : "mp3";

      const fileKey = `voice-intake/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { url: audioUrl } = await storagePut(fileKey, audioBuffer, input.mimeType);

      // Step 2: Transcribe via Whisper
      const result = await transcribeAudio({
        audioUrl,
        language: input.language ?? "en",
        prompt: input.prompt ?? "Transcribe this festival fashion description. The user is describing their style preferences, colors, vibes, and garment ideas.",
      });

      if ("error" in result) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error,
        });
      }

      return {
        text: result.text,
        language: result.language,
        duration: result.duration,
        segments: result.segments,
      };
    }),
});
