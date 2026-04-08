import { agentLog } from "./agentLogger";
import { getAllVendors, getDesignPacketById, insertVendorScores } from "./db";
import {
  VendorScoringWeights,
  VendorScoreBreakdownSchema,
  type VendorScoreBreakdown,
} from "../shared/schemas";
import type { Vendor } from "../drizzle/schema";

// Price band to normalized score (lower price = higher score for budget-conscious clients)
const PRICE_BAND_SCORES: Record<string, number> = {
  "$": 1.0,
  "$$": 0.7,
  "$$$": 0.4,
};

/**
 * Score a single vendor against a design packet.
 * Weights: capability 35%, timeline 25%, reliability 20%, price 10%, communications 10%
 */
function scoreVendor(
  vendor: Vendor,
  requiredCapabilities: string[],
  targetTurnaroundDays: number
): VendorScoreBreakdown {
  // 1. Capability score: % of required garment types the vendor can produce
  const vendorCaps = (vendor.capabilities as string[]) ?? [];
  const capabilityRaw = requiredCapabilities.length > 0
    ? requiredCapabilities.filter(req =>
        vendorCaps.some(cap => cap.toLowerCase().includes(req.toLowerCase()) || req.toLowerCase().includes(cap.toLowerCase()))
      ).length / requiredCapabilities.length
    : 0.5;

  // 2. Timeline score: how well vendor turnaround fits target
  // Score 1.0 if vendor is faster, decreasing as they exceed target
  const vendorTurnaround = vendor.turnaroundDays ?? 30;
  const timelineRaw = vendorTurnaround <= targetTurnaroundDays
    ? 1.0
    : Math.max(0, 1 - (vendorTurnaround - targetTurnaroundDays) / targetTurnaroundDays);

  // 3. Reliability score: direct from vendor profile
  const reliabilityRaw = vendor.reliabilityScore ?? 0.5;

  // 4. Price score: normalized from price band
  const priceRaw = PRICE_BAND_SCORES[vendor.priceBand ?? "$$"] ?? 0.5;

  // 5. Communications score: direct from vendor profile
  const communicationsRaw = vendor.communicationsScore ?? 0.5;

  // Apply exact weights from spec
  const capability = {
    raw: capabilityRaw,
    weight: VendorScoringWeights.capability,
    weighted: capabilityRaw * VendorScoringWeights.capability,
  };
  const timeline = {
    raw: timelineRaw,
    weight: VendorScoringWeights.timeline,
    weighted: timelineRaw * VendorScoringWeights.timeline,
  };
  const reliability = {
    raw: reliabilityRaw,
    weight: VendorScoringWeights.reliability,
    weighted: reliabilityRaw * VendorScoringWeights.reliability,
  };
  const price = {
    raw: priceRaw,
    weight: VendorScoringWeights.price,
    weighted: priceRaw * VendorScoringWeights.price,
  };
  const communications = {
    raw: communicationsRaw,
    weight: VendorScoringWeights.communications,
    weighted: communicationsRaw * VendorScoringWeights.communications,
  };

  const total = capability.weighted + timeline.weighted + reliability.weighted + price.weighted + communications.weighted;

  const breakdown: VendorScoreBreakdown = {
    capability,
    timeline,
    reliability,
    price,
    communications,
    total: Math.round(total * 10000) / 10000, // 4 decimal precision
  };

  // Validate with Zod
  return VendorScoreBreakdownSchema.parse(breakdown);
}

/**
 * Score and rank all active vendors against an approved design packet.
 * Persists results to vendor_scores table with full breakdown logging.
 */
export async function matchVendorsToPacket(
  designPacketId: number,
  designRequestId: number,
  targetTurnaroundDays = 30
): Promise<Array<{ vendorId: number; vendorName: string; totalScore: number; vendorRank: number; breakdown: VendorScoreBreakdown }>> {
  const start = Date.now();

  await agentLog({
    designRequestId,
    stage: "vendor_scoring",
    message: `Starting vendor matching for design packet ${designPacketId}`,
    payload: { designPacketId, targetTurnaroundDays },
  });

  // 1. Fetch design packet
  const packet = await getDesignPacketById(designPacketId);
  if (!packet) throw new Error(`Design packet ${designPacketId} not found`);

  const garmentList = packet.garmentList as Array<{ garmentType: string }>;
  const requiredCapabilities = garmentList.map(g => g.garmentType);

  await agentLog({
    designRequestId,
    stage: "vendor_scoring",
    message: `Scoring against ${requiredCapabilities.length} required capabilities`,
    payload: { requiredCapabilities, storyName: packet.storyName },
  });

  // 2. Fetch all active vendors
  const allVendors = await getAllVendors();

  await agentLog({
    designRequestId,
    stage: "vendor_scoring",
    message: `Evaluating ${allVendors.length} active vendors`,
  });

  // 3. Score each vendor
  const scoredVendors = allVendors.map(vendor => {
    const breakdown = scoreVendor(vendor, requiredCapabilities, targetTurnaroundDays);
    return {
      vendor,
      breakdown,
      totalScore: breakdown.total,
    };
  });

  // 4. Sort by total score descending and assign ranks
  scoredVendors.sort((a, b) => b.totalScore - a.totalScore);
  const rankedVendors = scoredVendors.map((sv, idx) => ({
    ...sv,
    vendorRank: idx + 1,
  }));

  // 5. Log scoring breakdown for each vendor
  for (const rv of rankedVendors) {
    await agentLog({
      designRequestId,
      stage: "vendor_scoring",
      message: `Vendor #${rv.vendorRank}: ${rv.vendor.name} — total: ${rv.totalScore.toFixed(4)}`,
      payload: {
        vendorId: rv.vendor.id,
        vendorName: rv.vendor.name,
        rank: rv.vendorRank,
        breakdown: rv.breakdown,
      },
    });
  }

  // 6. Persist scores to DB
  await insertVendorScores(
    rankedVendors.map(rv => ({
      designPacketId,
      vendorId: rv.vendor.id,
      capabilityScore: rv.breakdown.capability.raw,
      timelineScore: rv.breakdown.timeline.raw,
      reliabilityScore: rv.breakdown.reliability.raw,
      priceScore: rv.breakdown.price.raw,
      communicationsScore: rv.breakdown.communications.raw,
      totalScore: rv.totalScore,
      vendorRank: rv.vendorRank,
      scoringBreakdown: rv.breakdown,
    }))
  );

  const duration = Date.now() - start;
  await agentLog({
    designRequestId,
    stage: "vendor_scoring",
    message: `Vendor matching complete in ${duration}ms. Top vendor: ${rankedVendors[0]?.vendor.name ?? "none"} (${rankedVendors[0]?.totalScore.toFixed(4)})`,
    durationMs: duration,
    payload: {
      topVendor: rankedVendors[0]?.vendor.name,
      topScore: rankedVendors[0]?.totalScore,
      allRanks: rankedVendors.map(rv => ({ name: rv.vendor.name, score: rv.totalScore, rank: rv.vendorRank })),
    },
  });

  return rankedVendors.map(rv => ({
    vendorId: rv.vendor.id,
    vendorName: rv.vendor.name,
    totalScore: rv.totalScore,
    vendorRank: rv.vendorRank,
    breakdown: rv.breakdown,
  }));
}
