/**
 * Stripe checkout router — payment intents via Stripe MCP
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { execSync } from "child_process";

function stripeMcp(toolName: string, args: Record<string, unknown>) {
  try {
    const jsonArgs = JSON.stringify(args);
    const escaped = jsonArgs.replace(/'/g, "'\\''");
    const result = execSync(
      `manus-mcp-cli tool call ${toolName} --server stripe --input '${escaped}'`,
      { encoding: "utf-8", timeout: 30000 }
    );
    return JSON.parse(result.trim());
  } catch (err: any) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Stripe MCP error: ${err.stderr ?? err.message ?? String(err)}`,
    });
  }
}

export const checkoutRouter = router({

  createPaymentIntent: protectedProcedure
    .input(z.object({
      amountCents: z.number().int().min(100),
      currency: z.string().default("usd"),
      designRequestId: z.number(),
      productId: z.number(),
      variantId: z.number(),
      productName: z.string(),
      imageUrl: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      let customerId: string | undefined;
      if (ctx.user?.email) {
        try {
          const customers = stripeMcp("list_customers", { email: ctx.user.email, limit: 1 });
          const existing = customers?.data?.[0];
          if (existing) {
            customerId = existing.id;
          } else {
            const nc = stripeMcp("create_customer", {
              email: ctx.user.email,
              name: ctx.user.name ?? undefined,
              metadata: { hauzz_user_id: String(ctx.user.id) },
            });
            customerId = nc?.id;
          }
        } catch { /* best-effort */ }
      }

      const pi = stripeMcp("create_payment_intent", {
        amount: input.amountCents,
        currency: input.currency,
        customer: customerId,
        metadata: {
          hauzz_user_id: String(ctx.user.id),
          design_request_id: String(input.designRequestId),
          product_id: String(input.productId),
          variant_id: String(input.variantId),
          product_name: input.productName,
          image_url: input.imageUrl,
        },
        description: `HAUZZ.AI — ${input.productName}`,
      });

      if (!pi?.client_secret) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create payment intent" });
      }

      return {
        clientSecret: pi.client_secret,
        paymentIntentId: pi.id,
        amount: pi.amount,
        currency: pi.currency,
      };
    }),

  confirmAndFulfill: protectedProcedure
    .input(z.object({
      paymentIntentId: z.string(),
      designRequestId: z.number(),
      productId: z.number(),
      variantId: z.number(),
      imageUrl: z.string().url(),
      recipient: z.object({
        name: z.string(),
        email: z.string().email(),
        address1: z.string(),
        address2: z.string().optional(),
        city: z.string(),
        stateCode: z.string(),
        countryCode: z.string().default("US"),
        zip: z.string(),
      }),
    }))
    .mutation(async ({ input }) => {
      const pi = stripeMcp("retrieve_payment_intent", { payment_intent_id: input.paymentIntentId });
      if (pi?.status !== "succeeded") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Payment not confirmed. Status: ${pi?.status ?? "unknown"}`,
        });
      }

      const { ENV } = await import("../_core/env.js");
      const orderRes = await fetch("https://api.printful.com/v2/orders", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ENV.printfulApiKey}`,
          "Content-Type": "application/json",
          "X-PF-Store-Id": ENV.printfulStoreId,
        },
        body: JSON.stringify({
          external_id: `hauzz-${input.designRequestId}-${input.paymentIntentId.slice(-8)}`,
          recipient: {
            name: input.recipient.name,
            email: input.recipient.email,
            address1: input.recipient.address1,
            address2: input.recipient.address2 ?? "",
            city: input.recipient.city,
            state_code: input.recipient.stateCode,
            country_code: input.recipient.countryCode,
            zip: input.recipient.zip,
          },
          items: [{
            variant_id: input.variantId,
            quantity: 1,
            files: [{ url: input.imageUrl, placement: "default" }],
          }],
        }),
      });

      if (!orderRes.ok) {
        const errText = await orderRes.text();
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Printful order failed: ${errText.slice(0, 200)}`,
        });
      }

      const orderData = await orderRes.json();
      const order = orderData.result ?? orderData;

      return {
        success: true,
        printfulOrderId: order.id,
        printfulStatus: order.status,
        paymentIntentId: input.paymentIntentId,
        message: "Order placed! Your custom festival outfit is being printed.",
      };
    }),

  getPublishableKey: protectedProcedure.query(() => {
    const key = process.env.STRIPE_SECRET_KEY ?? "";
    return { publishableKey: key.startsWith("pk_") ? key : "" };
  }),
});
