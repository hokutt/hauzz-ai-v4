import { agentLog } from "./agentLogger";
import {
  createProductionOrder,
  getProductionOrderById,
  updateProductionOrderStage,
} from "./db";
import {
  ORDER_STAGES,
  OrderStageSchema,
  isValidStageTransition,
  type OrderStage,
} from "../shared/schemas";

export interface StageHistoryEntry {
  stage: OrderStage;
  enteredAt: string;
  notes?: string;
  actorUserId?: number;
}

/**
 * Create a new production order in the initial stage: inquiry_sent.
 */
export async function createOrder(data: {
  designRequestId: number;
  designPacketId: number;
  vendorId: number;
  actorUserId: number;
  notes?: string;
}): Promise<void> {
  const initialHistory: StageHistoryEntry[] = [
    {
      stage: "inquiry_sent",
      enteredAt: new Date().toISOString(),
      notes: data.notes,
      actorUserId: data.actorUserId,
    },
  ];

  await createProductionOrder({
    designRequestId: data.designRequestId,
    designPacketId: data.designPacketId,
    vendorId: data.vendorId,
    stageHistory: initialHistory,
  });

  await agentLog({
    designRequestId: data.designRequestId,
    stage: "order_transition",
    message: `Production order created. Initial stage: inquiry_sent. Vendor ID: ${data.vendorId}`,
    payload: { vendorId: data.vendorId, designPacketId: data.designPacketId },
  });
}

/**
 * Advance a production order to the next stage in the state machine.
 * Enforces strict sequential stage transitions.
 */
export async function advanceOrderStage(
  orderId: number,
  toStage: OrderStage,
  actorUserId: number,
  notes?: string
): Promise<{ success: boolean; message: string; currentStage: OrderStage }> {
  const order = await getProductionOrderById(orderId);
  if (!order) {
    return { success: false, message: `Order ${orderId} not found`, currentStage: "inquiry_sent" };
  }

  const currentStage = OrderStageSchema.parse(order.currentStage);

  // Validate the transition
  if (!isValidStageTransition(currentStage, toStage)) {
    const message = `Invalid stage transition: ${currentStage} → ${toStage}. Expected next stage: ${ORDER_STAGES[ORDER_STAGES.indexOf(currentStage) + 1] ?? "delivered (final)"}`;
    await agentLog({
      designRequestId: order.designRequestId,
      stage: "order_transition",
      level: "warn",
      message,
      payload: { orderId, currentStage, attemptedStage: toStage },
    });
    return { success: false, message, currentStage };
  }

  // Build updated stage history
  const existingHistory = (order.stageHistory as StageHistoryEntry[]) ?? [];
  const updatedHistory: StageHistoryEntry[] = [
    ...existingHistory,
    {
      stage: toStage,
      enteredAt: new Date().toISOString(),
      notes,
      actorUserId,
    },
  ];

  await updateProductionOrderStage(orderId, toStage, updatedHistory, notes);

  await agentLog({
    designRequestId: order.designRequestId,
    stage: "order_transition",
    message: `Order ${orderId} advanced: ${currentStage} → ${toStage}`,
    payload: {
      orderId,
      fromStage: currentStage,
      toStage,
      actorUserId,
      notes,
    },
  });

  return { success: true, message: `Order advanced to ${toStage}`, currentStage: toStage };
}

/**
 * Get the valid next stage for a given current stage.
 */
export function getNextOrderStage(currentStage: OrderStage): OrderStage | null {
  const idx = ORDER_STAGES.indexOf(currentStage);
  if (idx === -1 || idx === ORDER_STAGES.length - 1) return null;
  return ORDER_STAGES[idx + 1];
}
