import { getDb } from "./db";
import { agentLogs } from "../drizzle/schema";
import type { AgentLogStage } from "../shared/schemas";

export interface LogEntry {
  designRequestId?: number;
  stage: AgentLogStage | string;
  level?: "info" | "warn" | "error";
  message: string;
  payload?: unknown;
  durationMs?: number;
}

/**
 * Structured logger for all HAUZZ.AI V4 pipeline stages.
 * Persists to agent_logs table and mirrors to console.
 */
export async function agentLog(entry: LogEntry): Promise<void> {
  const { designRequestId, stage, level = "info", message, payload, durationMs } = entry;

  // Always log to console for observability
  const prefix = `[HAUZZ:${stage.toUpperCase()}]`;
  if (level === "error") {
    console.error(prefix, message, payload ?? "");
  } else if (level === "warn") {
    console.warn(prefix, message, payload ?? "");
  } else {
    console.log(prefix, message, payload ? JSON.stringify(payload).slice(0, 200) : "");
  }

  // Persist to DB (non-blocking — don't let logging failures break the pipeline)
  try {
    const db = await getDb();
    if (!db) return;

    await db.insert(agentLogs).values({
      designRequestId: designRequestId ?? null,
      stage,
      level,
      message,
      payload: payload ? (payload as Record<string, unknown>) : null,
      durationMs: durationMs ?? null,
    });
  } catch (err) {
    console.error("[HAUZZ:LOGGER] Failed to persist log entry:", err);
  }
}

/**
 * Utility to time an async operation and log its duration.
 */
export async function timedLog<T>(
  entry: Omit<LogEntry, "durationMs">,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    await agentLog({ ...entry, durationMs: Date.now() - start });
    return result;
  } catch (err) {
    await agentLog({
      ...entry,
      level: "error",
      message: `${entry.message} — FAILED: ${err instanceof Error ? err.message : String(err)}`,
      durationMs: Date.now() - start,
    });
    throw err;
  }
}
