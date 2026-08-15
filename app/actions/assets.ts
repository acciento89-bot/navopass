"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOwnedAsset, newPublicId } from "@/lib/assets";
import { query } from "@/lib/db";

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function checked(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

export async function createAssetAction(formData: FormData) {
  const user = await requireUser();
  const name = text(formData, "name");
  if (!name) redirect("/app/assets/new?error=Bitte%20einen%20Namen%20angeben");

  const visibilityRaw = text(formData, "visibility") ?? "LINK";
  const visibility = ["PRIVATE", "LINK", "PUBLIC"].includes(visibilityRaw) ? visibilityRaw : "LINK";

  const result = await query<{ id: string }>(
    `INSERT INTO assets
      (owner_id,public_id,name,category,manufacturer,model,serial_number,purchase_date,warranty_until,location,notes,visibility)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING id`,
    [
      user.id,
      newPublicId(),
      name,
      text(formData, "category") ?? "Sonstiges",
      text(formData, "manufacturer"),
      text(formData, "model"),
      text(formData, "serialNumber"),
      text(formData, "purchaseDate"),
      text(formData, "warrantyUntil"),
      text(formData, "location"),
      text(formData, "notes"),
      visibility,
    ]
  );
  redirect(`/app/assets/${result.rows[0].id}`);
}

export async function addEventAction(formData: FormData) {
  const user = await requireUser();
  const assetId = text(formData, "assetId");
  const title = text(formData, "title");
  if (!assetId || !title) return;
  const asset = await getOwnedAsset(user.id, assetId);
  if (!asset) return;

  const cost = text(formData, "cost");
  const costCents = cost ? Math.round(Number(cost.replace(",", ".")) * 100) : null;

  await query(
    `INSERT INTO asset_events (asset_id,title,event_type,event_date,description,provider,cost_cents,is_public)
     VALUES ($1,$2,$3,COALESCE($4::date,current_date),$5,$6,$7,$8)`,
    [assetId, title, text(formData, "eventType") ?? "NOTE", text(formData, "eventDate"), text(formData, "description"), text(formData, "provider"), Number.isFinite(costCents) ? costCents : null, checked(formData, "isPublic")]
  );
  revalidatePath(`/app/assets/${assetId}`);
  revalidatePath(`/p/${asset.public_id}`);
}

export async function addDocumentAction(formData: FormData) {
  const user = await requireUser();
  const assetId = text(formData, "assetId");
  const title = text(formData, "title");
  const url = text(formData, "url");
  if (!assetId || !title || !url || !/^https?:\/\//i.test(url)) return;
  const asset = await getOwnedAsset(user.id, assetId);
  if (!asset) return;

  await query(
    "INSERT INTO asset_documents (asset_id,title,url,kind,is_public) VALUES ($1,$2,$3,$4,$5)",
    [assetId, title, url, text(formData, "kind") ?? "Dokument", checked(formData, "isPublic")]
  );
  revalidatePath(`/app/assets/${assetId}`);
  revalidatePath(`/p/${asset.public_id}`);
}

export async function updateVisibilityAction(formData: FormData) {
  const user = await requireUser();
  const assetId = text(formData, "assetId");
  const visibility = text(formData, "visibility");
  if (!assetId || !visibility || !["PRIVATE", "LINK", "PUBLIC"].includes(visibility)) return;
  const asset = await getOwnedAsset(user.id, assetId);
  if (!asset) return;

  await query("UPDATE assets SET visibility=$1, updated_at=now() WHERE id=$2 AND owner_id=$3", [visibility, assetId, user.id]);
  revalidatePath(`/app/assets/${assetId}`);
  revalidatePath(`/p/${asset.public_id}`);
}
