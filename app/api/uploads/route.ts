import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOwnedAsset } from "@/lib/assets";
import { query } from "@/lib/db";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const UPLOAD_ROOT = process.env.UPLOAD_DIR || "/app/uploads";

const allowedByMime: Record<string, { ext: string; mime: string }> = {
  "application/pdf": { ext: "pdf", mime: "application/pdf" },
  "image/jpeg": { ext: "jpg", mime: "image/jpeg" },
  "image/png": { ext: "png", mime: "image/png" },
  "image/webp": { ext: "webp", mime: "image/webp" },
  "image/heic": { ext: "heic", mime: "image/heic" },
  "image/heif": { ext: "heif", mime: "image/heif" },
};

const allowedByExtension: Record<string, { ext: string; mime: string }> = {
  ".pdf": allowedByMime["application/pdf"],
  ".jpg": allowedByMime["image/jpeg"],
  ".jpeg": allowedByMime["image/jpeg"],
  ".png": allowedByMime["image/png"],
  ".webp": allowedByMime["image/webp"],
  ".heic": allowedByMime["image/heic"],
  ".heif": allowedByMime["image/heif"],
};

const allowedKinds = new Set(["Foto", "Dokument", "Rechnung", "Anleitung", "Garantie", "Prüfbericht"]);

function resolveUploadType(file: File) {
  return allowedByMime[file.type.toLowerCase()] || allowedByExtension[extname(file.name).toLowerCase()] || null;
}

function cleanText(value: FormDataEntryValue | null, max = 160) {
  return String(value || "").trim().slice(0, max);
}

function safeFileStem(value: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_.]+|[-_.]+$/g, "")
    .slice(0, 80);
  return normalized || "datei";
}

function redirectToAsset(request: Request, assetId: string, error?: string) {
  const target = new URL(`/app/assets/${assetId}`, request.url);
  if (error) target.searchParams.set("uploadError", error);
  return NextResponse.redirect(target, 303);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);

  let assetId = "";
  let storedPath: string | null = null;

  try {
    const formData = await request.formData();
    assetId = cleanText(formData.get("assetId"), 80);
    if (!assetId) return NextResponse.redirect(new URL("/app", request.url), 303);

    const asset = await getOwnedAsset(user.id, assetId);
    if (!asset) return NextResponse.redirect(new URL("/app", request.url), 303);

    const fileEntry = formData.get("file");
    if (!(fileEntry instanceof File) || fileEntry.size === 0) {
      return redirectToAsset(request, assetId, "Bitte eine Datei auswählen.");
    }
    if (fileEntry.size > MAX_UPLOAD_BYTES) {
      return redirectToAsset(request, assetId, "Die Datei darf maximal 15 MB groß sein.");
    }

    const uploadType = resolveUploadType(fileEntry);
    if (!uploadType) {
      return redirectToAsset(request, assetId, "Erlaubt sind PDF, JPG, PNG, WebP, HEIC und HEIF.");
    }

    const originalStem = basename(fileEntry.name, extname(fileEntry.name));
    const title = cleanText(formData.get("title")) || originalStem.slice(0, 160) || "Datei";
    const requestedKind = cleanText(formData.get("kind"), 40);
    const kind = allowedKinds.has(requestedKind) ? requestedKind : uploadType.mime.startsWith("image/") ? "Foto" : "Dokument";
    const isPublic = formData.get("isPublic") === "on";

    const id = randomUUID();
    const downloadName = `${safeFileStem(title)}.${uploadType.ext}`;
    const documentUrl = `/api/files/${id}/${encodeURIComponent(downloadName)}`;

    await mkdir(UPLOAD_ROOT, { recursive: true });
    storedPath = join(UPLOAD_ROOT, id);
    const bytes = Buffer.from(await fileEntry.arrayBuffer());
    await writeFile(storedPath, bytes, { flag: "wx" });

    await query(
      "INSERT INTO asset_documents (id,asset_id,title,url,kind,is_public) VALUES ($1,$2,$3,$4,$5,$6)",
      [id, asset.id, title, documentUrl, kind, isPublic]
    );
    await query("UPDATE assets SET updated_at=now() WHERE id=$1", [asset.id]);

    return redirectToAsset(request, assetId);
  } catch (error) {
    console.error("NavoPass upload failed", error);
    if (storedPath) await unlink(storedPath).catch(() => undefined);
    if (assetId) return redirectToAsset(request, assetId, "Upload fehlgeschlagen. Bitte erneut versuchen.");
    return NextResponse.redirect(new URL("/app", request.url), 303);
  }
}
