import { createHash } from "node:crypto";

export type ServiceDraftCommand = {
  ownerId: string; passId: string; draftId: string; revision: number;
  eventDate: string; title: string; description: string; provider: string; eventType: "NOTE" | "SERVICE";
};
export type ServiceDraftReceipt = { eventId: string; revision: number; digest: string };
export interface ServiceDraftTransaction {
  query(sql: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}
export type ServiceDraftTransactionRunner = <T>(run: (client: ServiceDraftTransaction) => Promise<T>) => Promise<T>;
export class ServiceDraftCommandError extends Error {
  readonly status: number;
  constructor(status: number, code: string) { super(code); this.status = status; }
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const keys = ["ownerId", "passId", "draftId", "revision", "eventDate", "title", "description", "provider", "eventType"];
function invalid(): never { throw new ServiceDraftCommandError(422, "INVALID_SERVICE_DRAFT"); }
function bounded(value: unknown, max: number): string {
  if (typeof value !== "string" || Array.from(value).length > max) return invalid();
  // Reject unpaired UTF16 surrogates; cross-platform UTF8 digest must represent the same text.
  if (!value.isWellFormed() || value.includes("\0")) return invalid();
  return value;
}
export function normalizeServiceDraft(actorId: string, input: unknown): ServiceDraftCommand {
  if (!uuid.test(actorId) || !input || typeof input !== "object" || Array.isArray(input)) return invalid();
  const body = input as Record<string, unknown>;
  if (Object.keys(body).length !== keys.length || Object.keys(body).some(key => !keys.includes(key))) return invalid();
  for (const key of ["ownerId", "passId", "draftId"]) if (typeof body[key] !== "string" || !uuid.test(body[key])) return invalid();
  if ((body.ownerId as string).toLowerCase() !== actorId.toLowerCase()) return invalid();
  if (typeof body.revision !== "number" || !Number.isSafeInteger(body.revision) || body.revision < 1 || body.revision > 1_000_000) return invalid();
  const eventDate = bounded(body.eventDate, 10);
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(eventDate) || Number(eventDate.slice(0, 4)) < 1) return invalid();
  const parsed = new Date(eventDate + "T12:00:00Z");
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== eventDate) return invalid();
  const title = bounded(body.title, 180);
  if (!title.trim()) return invalid();
  if (body.eventType !== "NOTE" && body.eventType !== "SERVICE") return invalid();
  return { ownerId: body.ownerId as string, passId: body.passId as string, draftId: body.draftId as string,
           revision: body.revision, eventDate, title, description: bounded(body.description, 4000), provider: bounded(body.provider, 200), eventType: body.eventType };
}
export function serviceDraftDigest(command: ServiceDraftCommand): string {
  const canonical = Object.fromEntries(Object.entries(command).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
  return createHash("sha256").update(JSON.stringify(canonical), "utf8").digest("hex");
}

/** Access locks and receipt replay live INSIDE the same transaction as event insertion. */
export async function publishServiceDraft(actorId: string, input: unknown, transaction: ServiceDraftTransactionRunner): Promise<ServiceDraftReceipt> {
  const command = normalizeServiceDraft(actorId, input);
  const digest = serviceDraftDigest(command);
  return transaction(async client => {
    const actor = await client.query("SELECT id,name FROM users WHERE id=$1 FOR KEY SHARE", [actorId]);
    if (!actor.rows[0]) throw new ServiceDraftCommandError(403, "FORBIDDEN");
    const assets = await client.query("SELECT id,owner_id,workspace_id,archived_at FROM assets WHERE id=$1 FOR UPDATE", [command.passId]);
    const asset = assets.rows[0];
    if (!asset || asset.archived_at) throw new ServiceDraftCommandError(403, "FORBIDDEN");
    if (asset.workspace_id) {
      const membership = await client.query("SELECT role FROM workspace_members WHERE workspace_id=$1 AND user_id=$2 FOR SHARE", [asset.workspace_id, actorId]);
      if (!["OWNER", "ADMIN", "EDITOR"].includes(String(membership.rows[0]?.role))) throw new ServiceDraftCommandError(403, "FORBIDDEN");
    } else if (String(asset.owner_id).toLowerCase() !== actorId.toLowerCase()) throw new ServiceDraftCommandError(403, "FORBIDDEN");
    // Same idempotency key is serialized even when two requests name different passes.
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [actorId.toLowerCase() + "|" + command.draftId.toLowerCase() + "|" + command.revision]);
    const existing = await client.query("SELECT digest,event_id,revision,asset_id FROM mobile_service_draft_receipts WHERE actor_id=$1 AND draft_id=$2 AND revision=$3 FOR UPDATE", [actorId, command.draftId, command.revision]);
    const receipt = existing.rows[0];
    if (receipt) {
      if (receipt.digest !== digest || String(receipt.asset_id).toLowerCase() !== command.passId.toLowerCase()) throw new ServiceDraftCommandError(409, "DRAFT_KEY_CONTENT_CONFLICT");
      if (!receipt.event_id) throw new ServiceDraftCommandError(410, "DELIVERED_EVENT_REMOVED");
      return { eventId: String(receipt.event_id), revision: command.revision, digest };
    }
    const event = await client.query(
      `INSERT INTO asset_events (asset_id,title,event_type,event_date,description,provider,is_public,created_by_user_id,created_by_name)
       VALUES ($1,$2,$3,$4::date,$5,$6,false,$7,$8) RETURNING id`,
      [command.passId, command.title, command.eventType, command.eventDate, command.description, command.provider, actorId, actor.rows[0].name ?? null]
    );
    const eventId = String(event.rows[0]?.id ?? "");
    if (!uuid.test(eventId)) throw new Error("Event insert did not return a valid identifier");
    await client.query(
      "INSERT INTO mobile_service_draft_receipts (actor_id,draft_id,revision,digest,event_id,asset_id) VALUES ($1,$2,$3,$4,$5,$6)",
      [actorId, command.draftId, command.revision, digest, eventId, command.passId]
    );
    await client.query("UPDATE assets SET updated_at=now() WHERE id=$1", [command.passId]);
    return { eventId, revision: command.revision, digest };
  });
}
