import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPLOAD_ROOT = process.env.UPLOAD_DIR || "/app/uploads";

const mimeByExtension: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

type FileRow = {
  id: string;
  owner_id: string;
  visibility: "PRIVATE" | "LINK" | "PUBLIC";
  archived_at: string | null;
  is_public: boolean;
  url: string;
};

function storedFilename(url: string) {
  const last = url.split("/").pop() || "datei";
  try {
    return decodeURIComponent(last).replace(/[\r\n"\\]/g, "-");
  } catch {
    return last.replace(/[\r\n"\\]/g, "-");
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; filename: string }> }) {
  const { id } = await params;
  const result = await query<FileRow>(
    `SELECT d.id, d.url, d.is_public, a.owner_id, a.visibility, a.archived_at
     FROM asset_documents d
     JOIN assets a ON a.id=d.asset_id
     WHERE d.id=$1
     LIMIT 1`,
    [id]
  );
  const document = result.rows[0];
  if (!document || !document.url.startsWith(`/api/files/${id}/`)) return new Response("Not found", { status: 404 });

  const user = await getCurrentUser();
  const isOwner = user?.id === document.owner_id;
  const isShared = document.is_public && document.visibility !== "PRIVATE" && !document.archived_at;
  if (!isOwner && !isShared) return new Response("Not found", { status: 404 });

  const filename = storedFilename(document.url);
  const extension = extname(filename).toLowerCase();
  const contentType = mimeByExtension[extension];
  if (!contentType) return new Response("Not found", { status: 404 });

  try {
    const bytes = await readFile(join(UPLOAD_ROOT, document.id));
    return new Response(bytes, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(bytes.length),
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
