import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { DashboardClient } from "@/components/dashboard-client";
import { requireUser } from "@/lib/auth";
import { listAssets } from "@/lib/assets";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const assets = await listAssets(user.id);
  const activeCount = assets.filter((asset) => !asset.archived_at).length;

  return (
    <main className="app-page">
      <div className="container">
        <AppHeader name={user.name} />
        <section className="dashboard-head">
          <div><span className="eyebrow">Deine Sammlung</span><h1>Meine Pässe</h1><p>{activeCount} {activeCount === 1 ? "aktiver Objektpass" : "aktive Objektpässe"} in NavoPass</p></div>
          <Link className="button" href="/app/assets/new">+ Neues Objekt</Link>
        </section>

        {assets.length === 0 ? (
          <section className="empty-state"><div className="empty-icon">NP</div><h2>Noch kein Pass angelegt.</h2><p>Lege dein erstes Gerät, Fahrzeug, Werkzeug oder anderes Objekt an und halte Dokumente, Wartungen und Garantien an einem Ort fest.</p><Link className="button" href="/app/assets/new">Ersten Pass erstellen</Link></section>
        ) : <DashboardClient assets={assets} />}
      </div>
    </main>
  );
}
