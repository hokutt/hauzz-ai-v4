/**
 * Printful API router — catalog, mockup generation, order creation
 * API key lives in process.env.prihtful (note the intentional typo)
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { ENV } from "../_core/env";

const PRINTFUL_BASE = "https://api.printful.com";

function printfulHeaders() {
  const key = ENV.printfulApiKey;
  if (!key) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Printful API key not configured" });
  return {
    "Authorization": `Bearer ${key}`,
    "Content-Type": "application/json",
    "X-PF-Store-Id": ENV.printfulStoreId,
  };
}

async function pfFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${PRINTFUL_BASE}${path}`, {
    ...opts,
    headers: { ...printfulHeaders(), ...(opts.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Printful API error ${res.status}: ${body.slice(0, 300)}`,
    });
  }
  return res.json();
}

// Festival-appropriate Printful product IDs (all-over-print / premium apparel)
const FEATURED_PRODUCT_IDS = [
  { id: 358, name: "All-Over Print Unisex Crew Neck T-Shirt", type: "t-shirt" },
  { id: 361, name: "All-Over Print Women's Leggings", type: "leggings" },
  { id: 362, name: "All-Over Print Women's Sports Bra", type: "sports-bra" },
  { id: 380, name: "All-Over Print Unisex Hoodie", type: "hoodie" },
  { id: 400, name: "All-Over Print Unisex Tank Top", type: "tank-top" },
  { id: 319, name: "All-Over Print Women's Racerback Tank", type: "racerback" },
];

// Markup multipliers to get clean festival pricing
function applyMarkup(baseCost: number): number {
  const marked = baseCost * 3.5;
  // Round to nearest clean price tier
  const tiers = [29, 39, 49, 59, 69, 79, 89, 99, 119, 139, 159];
  return tiers.find(t => t >= marked) ?? Math.ceil(marked / 10) * 10;
}

export const printfulRouter = router({

  /**
   * Get featured festival-appropriate products with pricing
   */
  getCatalog: publicProcedure.query(async () => {
    const results = await Promise.allSettled(
      FEATURED_PRODUCT_IDS.map(async (p) => {
        const data = await pfFetch(`/v2/catalog-products/${p.id}`);
        const product = data.result ?? data;
        // Get first variant for base pricing
        const variantsData = await pfFetch(`/v2/catalog-variants?catalog_product_id=${p.id}&limit=5`);
        const variants = variantsData.result ?? variantsData.data ?? [];
        const firstVariant = Array.isArray(variants) ? variants[0] : null;
        const baseCost = firstVariant?.price ? parseFloat(firstVariant.price) : 18;
        return {
          id: p.id,
          name: p.name,
          type: p.type,
          thumbnail: product.image ?? product.thumbnail_url ?? "",
          basePrice: baseCost,
          retailPrice: applyMarkup(baseCost),
          currency: "USD",
        };
      })
    );
    return results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
      .map(r => r.value);
  }),

  /**
   * Generate mockups for a design image on a specific product
   * Submits to Printful mockup generator and polls until complete
   */
  generateMockup: publicProcedure
    .input(z.object({
      productId: z.number(),
      imageUrl: z.string().url(),
      variantIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ input }) => {
      const storeId = ENV.printfulStoreId;

      // Get product variants if not provided
      let variantIds = input.variantIds;
      if (!variantIds || variantIds.length === 0) {
        const variantsData = await pfFetch(`/v2/catalog-variants?catalog_product_id=${input.productId}&limit=3`);
        const variants = variantsData.result ?? variantsData.data ?? [];
        variantIds = Array.isArray(variants) ? variants.slice(0, 3).map((v: any) => v.id) : [];
      }

      if (variantIds.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No variants found for product" });
      }

      // Submit mockup task
      const taskRes = await pfFetch(`/v2/mockup-generator/create-task/${input.productId}`, {
        method: "POST",
        body: JSON.stringify({
          variant_ids: variantIds,
          files: [
            {
              placement: "default",
              image_url: input.imageUrl,
              position: {
                area_width: 1800,
                area_height: 2400,
                width: 1800,
                height: 2400,
                top: 0,
                left: 0,
              },
            },
          ],
        }),
      });

      const taskKey = taskRes.result?.task_key ?? taskRes.task_key;
      if (!taskKey) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Mockup task creation failed — no task key returned" });
      }

      // Poll for result (up to 30s)
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const pollRes = await pfFetch(`/v2/mockup-generator/task?task_key=${taskKey}`);
        const task = pollRes.result ?? pollRes;
        if (task.status === "completed") {
          const mockups = task.mockups ?? [];
          return {
            taskKey,
            status: "completed" as const,
            mockups: mockups.map((m: any) => ({
              placement: m.placement,
              variantIds: m.variant_ids ?? [],
              mockupUrl: m.mockup_url ?? m.url ?? "",
              extraUrls: m.extra ?? [],
            })),
          };
        }
        if (task.status === "failed") {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Mockup generation failed" });
        }
      }

      throw new TRPCError({ code: "TIMEOUT", message: "Mockup generation timed out" });
    }),

  /**
   * Create a Printful fulfillment order after payment
   */
  createOrder: protectedProcedure
    .input(z.object({
      designRequestId: z.number(),
      productId: z.number(),
      variantId: z.number(),
      imageUrl: z.string().url(),
      quantity: z.number().default(1),
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
      stripePaymentIntentId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orderRes = await pfFetch("/v2/orders", {
        method: "POST",
        body: JSON.stringify({
          external_id: `hauzz-${input.designRequestId}-${Date.now()}`,
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
          items: [
            {
              variant_id: input.variantId,
              quantity: input.quantity,
              files: [
                {
                  url: input.imageUrl,
                  placement: "default",
                },
              ],
            },
          ],
          retail_costs: {
            currency: "USD",
          },
        }),
      });

      const order = orderRes.result ?? orderRes;
      return {
        printfulOrderId: order.id,
        externalId: order.external_id,
        status: order.status,
        estimatedShipping: order.shipping_service_name ?? "Standard",
      };
    }),

  /**
   * Get order status from Printful
   */
  getOrderStatus: protectedProcedure
    .input(z.object({ printfulOrderId: z.number() }))
    .query(async ({ input }) => {
      const data = await pfFetch(`/v2/orders/${input.printfulOrderId}`);
      const order = data.result ?? data;
      return {
        id: order.id,
        status: order.status,
        shippingService: order.shipping_service_name,
        trackingNumber: order.shipments?.[0]?.tracking_number ?? null,
        trackingUrl: order.shipments?.[0]?.tracking_url ?? null,
        estimatedDelivery: order.shipments?.[0]?.estimated_delivery ?? null,
      };
    }),
});
