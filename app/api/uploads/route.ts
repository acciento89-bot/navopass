import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOwnedAsset, roleCanEdit } from "@/lib/assets";
import { query } from "@/lib/db";
import { detectSafeUploadType } from "@/lib/file-signature";
import { canUploadBytes, formatStorage } from "@/lib/plans";

export const runtime = "nodejs";
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const UPLOAD_ROOT = process.env.UPLOAD_DIR || "/app/uploads";
const allowedKinds = new Set(["Foto", "Dokument", "Rechnung", "Anleitung", "Garantie", "Prüfbericht"]);

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

function validOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const expected = new URL(process.env.APP_URL || request.url).origin;
    return new URL(origin).origin === expected;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!validOrigin(request)) return new Response("Forbidden", { status: 403 });

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
    if (!roleCanEdit(asset, user.id)) return redirectToAsset(request, assetId, "Du hast in diesem Bereich nur Lesezugriff.");

    const fileEntry = formData.get("file");
    if (!(fileEntry instanceof File) || fileEntry.size === 0) return redirectToAsset(request, assetId, "Bitte eine Datei auswählen.");
    if (fileEntry.size > MAX_UPLOAD_BYTES) return redirectToAsset(request, assetId, "Die Datei darf maximal 15 MB groß sein.");

    const capacity = await canUploadBytes(asset.owner_id, fileEntry.size);
    if (!capacity.allowed) {
      return redirectToAsset(
        request,
        assetId,
        `Speicherlimit erreicht: ${capacity.definition.name} enthält ${formatStorage(capacity.definition.maxStorageBytes)}. Bestehende Dateien bleiben erhalten; für weitere Uploads bitte Tarif upgraden.`
      );
    }

    const bytes = Buffer.from(await fileEntry.arrayBuffer());
    const uploadType = detectSafeUploadType(bytes);
    if (!uploadType) {
      return redirectToAsset(request, assetId, "Der Dateityp konnte nicht sicher bestätigt werden. Erlaubt sind PDF, JPG, PNG, WebP, HEIC und HEIF.");
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
    await writeFile(storedPath, bytes, { flag: "wx", mode: 0o600 });

    await query(
      "INSERT INTO asset_documents (id,asset_id,title,url,kind,is_public,size_bytes) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [id, asset.id, title, documentUrl, kind, isPublic, fileEntry.size]
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
