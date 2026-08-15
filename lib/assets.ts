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
  location: string | null;
  notes: string | null;
  visibility: "PRIVATE" | "LINK" | "PUBLIC";
  created_at: string;
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
  const result = await query<Asset>("SELECT * FROM assets WHERE owner_id=$1 ORDER BY created_at DESC", [ownerId]);
  return result.rows;
}

export async function getOwnedAsset(ownerId: string, id: string) {
  const result = await query<Asset>("SELECT * FROM assets WHERE id=$1 AND owner_id=$2 LIMIT 1", [id, ownerId]);
  return result.rows[0] ?? null;
}

export async function getShareableAsset(publicId: string) {
  const result = await query<Asset>("SELECT * FROM assets WHERE public_id=$1 AND visibility <> 'PRIVATE' LIMIT 1", [publicId]);
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
