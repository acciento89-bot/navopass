"use server";

import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOwnedAsset, newPublicId } from "@/lib/assets";
import { query } from "@/lib/db";

const UPLOAD_ROOT = process.env.UPLOAD_DIR || "/app/uploads";
const VISIBILITIES = new Set(["PRIVATE", "LINK", "PUBLIC"]);

function text(formData: FormData, key: string, max = 1000) {
  const value = String(formData.get(key) ?? "").trim().slice(0, max);
  return value || null;
}

function checked(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function visibilityValue(formData: FormData) {
  const value = text(formData, "visibility", 20) ?? "LINK";
  return VISIBILITIES.has(value) ? value : "LINK";
}

function revalidateAsset(assetId: string, publicId?: string) {
  revalidatePath("/app");
  revalidatePath(`/app/assets/${assetId}`);
  if (publicId) revalidatePath(`/p/${publicId}`);
}

export async function createAssetAction(formData: FormData) {
  const user = await requireUser();
  const name = text(formData, "name", 160);
  if (!name) redirect("/app/assets/new?error=Bitte%20einen%20Namen%20angeben");

  const result = await query<{ id: string }>(
    `INSERT INTO assets
      (owner_id,public_id,name,category,manufacturer,model,serial_number,purchase_date,warranty_until,next_service_date,location,notes,visibility)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING id`,
    [
      user.id,
      newPublicId(),
      name,
      text(formData, "category", 80) ?? "Sonstiges",
      text(formData, "manufacturer", 160),
      text(formData, "model", 160),
      text(formData, "serialNumber", 160),
      text(formData, "purchaseDate", 20),
      text(formData, "warrantyUntil", 20),
      text(formData, "nextServiceDate", 20),
      text(formData, "location", 200),
      text(formData, "notes", 5000),
      visibilityValue(formData),
    ]
  );
  revalidatePath("/app");
  redirect(`/app/assets/${result.rows[0].id}`);
}

export async function updateAssetAction(formData: FormData) {
  const user = await requireUser();
  const assetId = text(formData, "assetId", 80);
  const name = text(formData, "name", 160);
  if (!assetId || !name) return;
  const asset = await getOwnedAsset(user.id, assetId);
  if (!asset) return;

  await query(
    `UPDATE assets SET
      name=$1, category=$2, manufacturer=$3, model=$4, serial_number=$5,
      purchase_date=$6, warranty_until=$7, next_service_date=$8, location=$9,
      notes=$10, visibility=$11, updated_at=now()
     WHERE id=$12 AND owner_id=$13`,
    [
      name,
      text(formData, "category", 80) ?? "Sonstiges",
      text(formData, "manufacturer", 160),
      text(formData, "model", 160),
      text(formData, "serialNumber", 160),
      text(formData, "purchaseDate", 20),
      text(formData, "warrantyUntil", 20),
      text(formData, "nextServiceDate", 20),
      text(formData, "location", 200),
      text(formData, "notes", 5000),
      visibilityValue(formData),
      assetId,
      user.id,
    ]
  );
  revalidateAsset(assetId, asset.public_id);
  redirect(`/app/assets/${assetId}`);
}

export async function toggleFavoriteAction(formData: FormData) {
  const user = await requireUser();
  const assetId = text(formData, "assetId", 80);
  if (!assetId) return;
  await query("UPDATE assets SET favorite=NOT favorite, updated_at=now() WHERE id=$1 AND owner_id=$2", [assetId, user.id]);
  revalidatePath("/app");
  revalidatePath(`/app/assets/${assetId}`);
}

export async function toggleArchiveAction(formData: FormData) {
  const user = await requireUser();
  const assetId = text(formData, "assetId", 80);
  if (!assetId) return;
  const asset = await getOwnedAsset(user.id, assetId);
  if (!asset) return;
  await query(
    "UPDATE assets SET archived_at=CASE WHEN archived_at IS NULL THEN now() ELSE NULL END, updated_at=now() WHERE id=$1 AND owner_id=$2",
    [assetId, user.id]
  );
  revalidateAsset(assetId, asset.public_id);
  redirect("/app");
}

export async function duplicateAssetAction(formData: FormData) {
  const user = await requireUser();
  const assetId = text(formData, "assetId", 80);
  if (!assetId) return;
  const asset = await getOwnedAsset(user.id, assetId);
  if (!asset) return;

  const result = await query<{ id: string }>(
    `INSERT INTO assets
      (owner_id,public_id,name,category,manufacturer,model,serial_number,purchase_date,warranty_until,next_service_date,location,notes,visibility)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING id`,
    [
      user.id,
      newPublicId(),
      `${asset.name} Kopie`.slice(0, 160),
      asset.category,
      asset.manufacturer,
      asset.model,
      asset.serial_number,
      asset.purchase_date,
      asset.warranty_until,
      asset.next_service_date,
      asset.location,
      asset.notes,
      "PRIVATE",
    ]
  );
  revalidatePath("/app");
  redirect(`/app/assets/${result.rows[0].id}`);
}

export async function deleteAssetAction(formData: FormData) {
  const user = await requireUser();
  const assetId = text(formData, "assetId", 80);
  if (!assetId) return;
  const asset = await getOwnedAsset(user.id, assetId);
  if (!asset) return;

  const docs = await query<{ id: string; url: string }>("SELECT id,url FROM asset_documents WHERE asset_id=$1", [assetId]);
  await query("DELETE FROM assets WHERE id=$1 AND owner_id=$2", [assetId, user.id]);

  await Promise.all(
    docs.rows.map(async (doc) => {
      if (doc.url.startsWith(`/api/files/${doc.id}/`)) await unlink(join(UPLOAD_ROOT, doc.id)).catch(() => undefined);
    })
  );
  revalidatePath("/app");
  redirect("/app");
}

export async function addEventAction(formData: FormData) {
  const user = await requireUser();
  const assetId = text(formData, "assetId", 80);
  const title = text(formData, "title", 180);
  if (!assetId || !title) return;
  const asset = await getOwnedAsset(user.id, assetId);
  if (!asset) return;

  const cost = text(formData, "cost", 30);
  const costCents = cost ? Math.round(Number(cost.replace(",", ".")) * 100) : null;

  await query(
    `INSERT INTO asset_events (asset_id,title,event_type,event_date,description,provider,cost_cents,is_public)
     VALUES ($1,$2,$3,COALESCE($4::date,current_date),$5,$6,$7,$8)`,
    [assetId, title, text(formData, "eventType", 40) ?? "NOTE", text(formData, "eventDate", 20), text(formData, "description", 4000), text(formData, "provider", 200), Number.isFinite(costCents) ? costCents : null, checked(formData, "isPublic")]
  );
  await query("UPDATE assets SET updated_at=now() WHERE id=$1", [assetId]);
  revalidateAsset(assetId, asset.public_id);
}

export async function deleteEventAction(formData: FormData) {
  const user = await requireUser();
  const eventId = text(formData, "eventId", 80);
  const assetId = text(formData, "assetId", 80);
  if (!eventId || !assetId) return;
  const asset = await getOwnedAsset(user.id, assetId);
  if (!asset) return;
  await query("DELETE FROM asset_events WHERE id=$1 AND asset_id=$2", [eventId, assetId]);
  await query("UPDATE assets SET updated_at=now() WHERE id=$1", [assetId]);
  revalidateAsset(assetId, asset.public_id);
}

export async function addDocumentAction(formData: FormData) {
  const user = await requireUser();
  const assetId = text(formData, "assetId", 80);
  const title = text(formData, "title", 180);
  const url = text(formData, "url", 2000);
  if (!assetId || !title || !url || !/^https?:\/\//i.test(url)) return;
  const asset = await getOwnedAsset(user.id, assetId);
  if (!asset) return;

  await query(
    "INSERT INTO asset_documents (asset_id,title,url,kind,is_public) VALUES ($1,$2,$3,$4,$5)",
    [assetId, title, url, text(formData, "kind", 80) ?? "Dokument", checked(formData, "isPublic")]
  );
  await query("UPDATE assets SET updated_at=now() WHERE id=$1", [assetId]);
  revalidateAsset(assetId, asset.public_id);
}

export async function deleteDocumentAction(formData: FormData) {
  const user = await requireUser();
  const documentId = text(formData, "documentId", 80);
  const assetId = text(formData, "assetId", 80);
  if (!documentId || !assetId) return;
  const asset = await getOwnedAsset(user.id, assetId);
  if (!asset) return;

  const doc = await query<{ id: string; url: string }>(
    "SELECT id,url FROM asset_documents WHERE id=$1 AND asset_id=$2 LIMIT 1",
    [documentId, assetId]
  );
  if (!doc.rows[0]) return;
  await query("DELETE FROM asset_documents WHERE id=$1 AND asset_id=$2", [documentId, assetId]);
  if (doc.rows[0].url.startsWith(`/api/files/${documentId}/`)) {
    await unlink(join(UPLOAD_ROOT, documentId)).catch(() => undefined);
  }
  await query("UPDATE assets SET updated_at=now() WHERE id=$1", [assetId]);
  revalidateAsset(assetId, asset.public_id);
}

export async function updateVisibilityAction(formData: FormData) {
  const user = await requireUser();
  const assetId = text(formData, "assetId", 80);
  const visibility = text(formData, "visibility", 20);
  if (!assetId || !visibility || !VISIBILITIES.has(visibility)) return;
  const asset = await getOwnedAsset(user.id, assetId);
  if (!asset) return;

  await query("UPDATE assets SET visibility=$1, updated_at=now() WHERE id=$2 AND owner_id=$3", [visibility, assetId, user.id]);
  revalidateAsset(assetId, asset.public_id);
}
