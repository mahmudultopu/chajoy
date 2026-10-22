/** Audit log helpers. Every admin change and sign-in is written to audit_logs. */

import { db, schema, type Tx } from "@/lib/db";

export type Actor =
  | { type: "admin"; id: number; label: string }
  | { type: "customer"; id: number | null; label: string }
  | { type: "system"; label: string };

/** Writes one audit log entry, optionally inside an existing transaction. */
export async function audit(
  actor: Actor,
  entry: { action: string; entityType: string; entityId?: string | number | null; summary: string; diff?: Record<string, unknown>; ip?: string | null },
  tx?: Tx,
) {
  await (tx ?? db).insert(schema.auditLogs).values({
    actorType: actor.type,
    actorId: actor.type === "system" ? null : actor.id,
    actorLabel: actor.label,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId === undefined || entry.entityId === null ? null : String(entry.entityId),
    summary: entry.summary,
    diff: entry.diff,
    ip: entry.ip ?? null,
  });
}

/** Shallow before/after diff of the fields that changed. */
export function diffFields(before: Record<string, unknown>, after: Record<string, unknown>) {
  const changed: Record<string, { from: unknown; to: unknown }> = {};
  for (const k of Object.keys(after)) {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) changed[k] = { from: before[k], to: after[k] };
  }
  return changed;
}
