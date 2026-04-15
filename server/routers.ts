import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { intakeRouter } from "./routers/intake";
import { designRouter } from "./routers/design";
import { productionRouter } from "./routers/production";
import { adminRouter } from "./routers/admin";
import { voiceRouter } from "./routers/voice";
import { aiChatRouter } from "./routers/aiChat";
import { measurementsRouter } from "./routers/measurements";
import { printfulRouter } from "./routers/printful";
import { checkoutRouter } from "./routers/checkout";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── HAUZZ.AI V4 Feature Routers ─────────────────────────────────────────────
  intake: intakeRouter,       // Design request intake form
  design: designRouter,       // Concept generation, approval, packet
  production: productionRouter, // Vendor matching, orders, state machine, logs
  admin: adminRouter,         // Founder admin dashboard (full access)
  voice: voiceRouter,           // Voice intake transcription (Whisper)
  aiChat: aiChatRouter,         // Claude-powered chat + vendor email drafting
  measurements: measurementsRouter, // User body measurements & sizing
  printful: printfulRouter,           // Printful catalog, mockups, orders
  checkout: checkoutRouter,           // Stripe payment intents + fulfillment
});

export type AppRouter = typeof appRouter;
