import { getCurrentUser } from "@/lib/auth";
import { transaction } from "@/lib/db";
import { publishServiceDraft, ServiceDraftCommandError } from "@/lib/service-draft-command";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 32 * 1024;
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return reply({ error: "UNAUTHENTICATED" }, 401);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return reply({ error: "INVALID_CONTENT_TYPE" }, 415);
  const reader = request.body?.getReader();
  if (!reader) return reply({ error: "INVALID_SERVICE_DRAFT" }, 422);
  let text: string;
  try {
    const chunks: Uint8Array[] = []; let size = 0;
    for (;;) {
      const next = await reader.read(); if (next.done) break;
      size += next.value.byteLength;
      if (size > MAX_BODY_BYTES) { await reader.cancel(); return reply({ error: "DRAFT_TOO_LARGE" }, 413); }
      chunks.push(next.value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch { return reply({ error: "INVALID_SERVICE_DRAFT" }, 422); }
  let body: unknown;
  try { body = JSON.parse(text); } catch { return reply({ error: "INVALID_SERVICE_DRAFT" }, 422); }
  try {
    const receipt = await publishServiceDraft(user.id, body, run => transaction(client => run(client)));
    return reply(receipt);
  } catch (error) {
    if (error instanceof ServiceDraftCommandError) return reply({ error: error.message }, error.status);
    // A lost/failed response never authorizes changing the frozen idempotency key.
    return reply({ error: "SERVICE_DRAFT_RECEIPT_UNKNOWN" }, 500);
  }
}
