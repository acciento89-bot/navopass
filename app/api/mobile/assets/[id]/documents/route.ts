import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { getCurrentUser } from "@/lib/auth";
import { getOwnedAsset, roleCanEdit } from "@/lib/assets";
import { query } from "@/lib/db";
import { detectSafeUploadType } from "@/lib/file-signature";
import { canUploadBytes } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const UPLOAD_ROOT = process.env.UPLOAD_DIR || "/app/uploads";
const allowedKinds = new Set(["Photo", "Document", "Invoice", "Manual", "Warranty", "Inspection report", "Foto", "Dokument", "Rechnung", "Anleitung", "Garantie", "Prüfbericht"]);

function response(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}
function clean(value: FormDataEntryValue | null, max = 160) {
  return String(value || "").trim().slice(0, max);
}
function fileStem(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^[-_.]+|[-_.]+$/g, "").slice(0, 80) || "file";
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return response({ error: "UNAUTHENTICATED" }, 401);
  const { id } = await params;
  const asset = await getOwnedAsset(user.id, id);
  if (!asset || !roleCanEdit(asset, user.id)) return response({ error: "FORBIDDEN" }, 403);

  let storedPath: string | null = null;
  try {
    const formData = await request.formData();
    const entry = formData.get("file");
    if (!(entry instanceof File) || entry.size === 0) return response({ error: "FILE_REQUIRED" }, 422);
    if (entry.size > MAX_UPLOAD_BYTES) return response({ error: "FILE_TOO_LARGE" }, 413);
    const capacity = await canUploadBytes(asset.owner_id, entry.size);
    if (!capacity.allowed) return response({ error: "STORAGE_LIMIT_REACHED" }, 409);

    const bytes = Buffer.from(await entry.arrayBuffer());
    const uploadType = detectSafeUploadType(bytes);
    if (!uploadType) return response({ error: "UNSUPPORTED_FILE" }, 415);
    const originalStem = basename(entry.name, extname(entry.name));
    const title = clean(formData.get("title")) || originalStem.slice(0, 160) || "File";
    const requestedKind = clean(formData.get("kind"), 40);
    const kind = allowedKinds.has(requestedKind) ? requestedKind : uploadType.mime.startsWith("image/") ? "Photo" : "Document";
    const isPublic = clean(formData.get("isPublic"), 10) === "true";
    const documentId = randomUUID();
    const downloadName = `${fileStem(title)}.${uploadType.ext}`;
    const url = `/api/files/${documentId}/${encodeURIComponent(downloadName)}`;

    await mkdir(UPLOAD_ROOT, { recursive: true });
    storedPath = join(UPLOAD_ROOT, documentId);
    await writeFile(storedPath, bytes, { flag: "wx", mode: 0o600 });
    await query(
      "INSERT INTO asset_documents (id,asset_id,title,url,kind,is_public,size_bytes) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [documentId,asset.id,title,url,kind,isPublic,entry.size]
    );
    await query("UPDATE assets SET updated_at=now() WHERE id=$1", [asset.id]);
    return response({ ok: true }, 201);
  } catch (error) {
    console.error("NavoPass mobile upload failed", error);
    if (storedPath) await unlink(storedPath).catch(() => undefined);
    return response({ error: "UPLOAD_FAILED" }, 500);
  }
}
