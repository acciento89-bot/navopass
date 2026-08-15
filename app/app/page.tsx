import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/auth";
import { listAssets } from "@/lib/assets";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const assets = await listAssets(user.id);

  return (
    <main className="app-page container">
      <AppHeader name={user.name} />
      <section className="dashboard-head"><div><span className="eyebrow">Deine Sammlung</span><h1>Meine Pässe</h1><p>{assets.length} {assets.length === 1 ? "Objekt" : "Objekte"} in NavoPass</p></div><Link className="button" href="/app/assets/new">+ Neues Objekt</Link></section>

      {assets.length === 0 ? (
        <section className="empty-state"><div className="empty-icon">NP</div><h2>Noch kein Pass angelegt.</h2><p>Lege dein erstes Gerät, Fahrzeug, Werkzeug oder anderes Objekt an.</p><Link className="button" href="/app/assets/new">Ersten Pass erstellen</Link></section>
      ) : (
        <section className="asset-grid">
          {assets.map((asset) => (
            <Link href={`/app/assets/${asset.id}`} className="asset-card" key={asset.id}>
              <div className="asset-card-top"><span className="asset-category">{asset.category}</span><span className={`visibility ${asset.visibility.toLowerCase()}`}>{asset.visibility === "PRIVATE" ? "Privat" : asset.visibility === "PUBLIC" ? "Öffentlich" : "Per Link"}</span></div>
              <div className="asset-avatar">{asset.name.slice(0, 2).toUpperCase()}</div>
              <h2>{asset.name}</h2>
              <p>{[asset.manufacturer, asset.model].filter(Boolean).join(" · ") || "Noch keine Produktdaten"}</p>
              <div className="asset-meta"><span>Garantie</span><b>{formatDate(asset.warranty_until)}</b></div>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
