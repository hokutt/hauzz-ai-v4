import { storagePut } from "./storage";
import { agentLog } from "./agentLogger";
import { getConceptCardById, insertDesignPacket, getDesignPacketByRequestId, updateDesignRequestStatus } from "./db";
import { DesignPacketSchema, type DesignPacketData } from "../shared/schemas";
import { nanoid } from "nanoid";

/**
 * Generates a structured design packet from an approved concept card,
 * saves it to S3, and persists the metadata to the database.
 */
export async function generateDesignPacket(
  conceptCardId: number,
  designRequestId: number
): Promise<{ packetId: number | undefined; fileUrl: string | undefined }> {
  const start = Date.now();

  await agentLog({
    designRequestId,
    stage: "packet_generation",
    message: `Starting design packet generation for concept card ${conceptCardId}`,
  });

  // 1. Fetch the approved concept card
  const concept = await getConceptCardById(conceptCardId);
  if (!concept) {
    await agentLog({
      designRequestId,
      stage: "packet_generation",
      level: "error",
      message: `Concept card ${conceptCardId} not found`,
    });
    throw new Error(`Concept card ${conceptCardId} not found`);
  }

  // 2. Build the packet data
  const garmentList = concept.garmentList as any[];
  const constructionNotes = garmentList
    .map(g => `${g.garmentType}: ${g.constructionNotes}`)
    .join("\n");

  const packetData: DesignPacketData = {
    storyName: concept.storyName,
    garmentList: garmentList,
    palette: concept.palette as string[],
    materials: concept.materials as string[],
    trims: (concept.trims as string[]) ?? [],
    constructionNotes,
    productionRiskScore: concept.productionRiskScore,
    designRequestId,
    conceptCardId,
  };

  // 3. Zod validate the packet
  const validated = DesignPacketSchema.parse(packetData);

  await agentLog({
    designRequestId,
    stage: "packet_generation",
    message: `Design packet validated: "${validated.storyName}" — ${validated.garmentList.length} garments, risk score: ${validated.productionRiskScore.toFixed(2)}`,
    payload: {
      storyName: validated.storyName,
      garmentCount: validated.garmentList.length,
      materials: validated.materials,
      productionRiskScore: validated.productionRiskScore,
    },
  });

  // 4. Serialize and upload to S3
  const packetJson = JSON.stringify({
    ...validated,
    generatedAt: new Date().toISOString(),
    version: "1.0",
  }, null, 2);

  const fileKey = `design-packets/${designRequestId}-${nanoid(8)}.json`;
  let fileUrl: string | undefined;
  let fileKeyStored: string | undefined;

  try {
    const uploaded = await storagePut(fileKey, Buffer.from(packetJson, "utf-8"), "application/json");
    fileUrl = uploaded.url;
    fileKeyStored = uploaded.key;

    await agentLog({
      designRequestId,
      stage: "packet_generation",
      message: `Design packet uploaded to storage: ${fileUrl}`,
      payload: { fileKey: fileKeyStored, fileUrl },
    });
  } catch (err) {
    await agentLog({
      designRequestId,
      stage: "packet_generation",
      level: "warn",
      message: `Storage upload failed — packet will be saved without file URL: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // 5. Persist packet to DB
  await insertDesignPacket({
    designRequestId,
    conceptCardId,
    storyName: validated.storyName,
    garmentList: validated.garmentList,
    palette: validated.palette,
    materials: validated.materials,
    trims: validated.trims,
    constructionNotes: validated.constructionNotes,
    productionRiskScore: validated.productionRiskScore,
    fileUrl,
    fileKey: fileKeyStored,
  });

  // 6. Update design request status
  await updateDesignRequestStatus(designRequestId, "approved");

  const duration = Date.now() - start;
  await agentLog({
    designRequestId,
    stage: "packet_generation",
    message: `Design packet generation complete in ${duration}ms`,
    durationMs: duration,
  });

  // Retrieve the persisted packet to return its ID
  const persistedPacket = await getDesignPacketByRequestId(designRequestId);

  await agentLog({
    designRequestId,
    stage: "packet_generation",
    message: `Design packet persisted with ID: ${persistedPacket?.id ?? "unknown"}`,
    payload: { packetId: persistedPacket?.id, fileUrl },
  });

  return { packetId: persistedPacket?.id, fileUrl };
}
