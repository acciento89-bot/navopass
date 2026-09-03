import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/auth";
import { listAssets, roleCanManage } from "@/lib/assets";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type OrderSummary = { asset_id: string; count: number; latest_status: string | null };

export default async function StickerOverviewPage() {
  const user = await requireUser();
  const assets = (await listAssets(user.id)).filter(asset => !asset.archived_at && roleCanManage(asset, user.id));
  const orderRows = (await query<OrderSummary>(
    `SELECT asset_id,count(*)::int AS count,(array_agg(status ORDER BY created_at DESC))[1] AS latest_status
     FROM qr_sticker_orders WHERE user_id=$1 GROUP BY asset_id`,
    [user.id]
  )).rows;
  const byAsset = new Map(orderRows.map(row => [row.asset_id, row]));

  return <main className="app-page"><div className="container"><AppHeader name={user.name} />
    <section className="settings-head"><span className="eyebrow">QR am Objekt</span><h1>QR-Aufkleber</h1><p>Wähle einen Objektpass aus, um dessen QR-Code als Druckvorlage zu öffnen oder wetterfeste QR-Aufkleber anzufragen.</p></section>
    {assets.length === 0 ? <section className="empty-state compact"><div className="empty-icon">QR</div><h2>Noch kein bestellbarer Pass</h2><p>Du brauchst einen eigenen oder von dir administrierten Objektpass.</p><Link className="button" href="/app/assets/new">+ Objektpass anlegen</Link></section> : <section className="asset-grid">{assets.map(asset => {
      const summary = byAsset.get(asset.id);
      return <article className="asset-card" key={asset.id}><Link className="asset-card-link" href={`/app/assets/${asset.id}/sticker`}><span className="asset-category">{asset.category}</span><div className="asset-avatar">QR</div><h2>{asset.name}</h2><p>{[asset.manufacturer, asset.model].filter(Boolean).join(" · ") || `#${asset.public_id}`}</p><div className="asset-card-info"><div><span>Anfragen</span><b>{summary?.count || 0}</b></div><div><span>Letzter Status</span><b>{summary?.latest_status || "—"}</b></div></div><span className="text-link">QR-Code & Aufkleber öffnen →</span></Link></article>;
    })}</section>}
  </div></main>;
}
