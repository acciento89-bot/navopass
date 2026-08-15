import { randomBytes } from "node:crypto";
import { query } from "@/lib/db";

export type Asset = {
  id: string;
  owner_id: string;
  public_id: string;
  name: string;
  category: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  warranty_until: string | null;
  next_service_date: string | null;
  location: string | null;
  notes: string | null;
  visibility: "PRIVATE" | "LINK" | "PUBLIC";
  favorite: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AssetEvent = {
  id: string;
  title: string;
  event_type: string;
  event_date: string;
  description: string | null;
  provider: string | null;
  cost_cents: number | null;
  is_public: boolean;
};

export type AssetDocument = {
  id: string;
  title: string;
  url: string;
  kind: string;
  is_public: boolean;
};

export function newPublicId() {
  return randomBytes(8).toString("base64url").replace(/[_-]/g, "").slice(0, 10).toUpperCase();
}

export async function listAssets(ownerId: string) {
  const result = await query<Asset>(
    "SELECT * FROM assets WHERE owner_id=$1 ORDER BY favorite DESC, updated_at DESC, created_at DESC",
    [ownerId]
  );
  return result.rows;
}

export async function getOwnedAsset(ownerId: string, id: string) {
  const result = await query<Asset>("SELECT * FROM assets WHERE id=$1 AND owner_id=$2 LIMIT 1", [id, ownerId]);
  return result.rows[0] ?? null;
}

export async function getShareableAsset(publicId: string) {
  const result = await query<Asset>(
    "SELECT * FROM assets WHERE public_id=$1 AND visibility <> 'PRIVATE' AND archived_at IS NULL LIMIT 1",
    [publicId]
  );
  return result.rows[0] ?? null;
}

export async function getEvents(assetId: string, publicOnly = false) {
  const sql = publicOnly
    ? "SELECT * FROM asset_events WHERE asset_id=$1 AND is_public=true ORDER BY event_date DESC, created_at DESC"
    : "SELECT * FROM asset_events WHERE asset_id=$1 ORDER BY event_date DESC, created_at DESC";
  const result = await query<AssetEvent>(sql, [assetId]);
  return result.rows;
}

export async function getDocuments(assetId: string, publicOnly = false) {
  const sql = publicOnly
    ? "SELECT * FROM asset_documents WHERE asset_id=$1 AND is_public=true ORDER BY created_at DESC"
    : "SELECT * FROM asset_documents WHERE asset_id=$1 ORDER BY created_at DESC";
  const result = await query<AssetDocument>(sql, [assetId]);
  return result.rows;
}

export function isDueSoon(value: string | null, days = 30) {
  if (!value) return false;
  const due = new Date(`${value}T12:00:00`).getTime();
  const now = Date.now();
  return due >= now && due <= now + days * 24 * 60 * 60 * 1000;
}

export function isOverdue(value: string | null) {
  if (!value) return false;
  return new Date(`${value}T23:59:59`).getTime() < Date.now();
}
