import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/auth";
import { listRecentActivity } from "@/lib/assets";

export const dynamic = "force-dynamic";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function typeLabel(type: "EVENT" | "DOCUMENT" | "ASSET") {
  if (type === "EVENT") return "Historie";
  if (type === "DOCUMENT") return "Dokument";
  return "Objektpass";
}

function typeIcon(type: "EVENT" | "DOCUMENT" | "ASSET") {
  if (type === "EVENT") return "✓";
  if (type === "DOCUMENT") return "↓";
  return "NP";
}

export default async function ActivityPage() {
  const user = await requireUser();
  const activity = await listRecentActivity(user.id, 100);

  return (
    <main className="app-page">
      <div className="container">
        <AppHeader name={user.name} />
        <div className="page-back"><Link href="/app">← Meine Pässe</Link></div>
        <section className="activity-head"><span className="eyebrow">Kontoaktivität</span><h1>Letzte Änderungen</h1><p>Wartungen, neue Dokumente und Änderungen an deinen Objektpässen chronologisch an einem Ort.</p></section>

        {activity.length === 0 ? (
          <section className="empty-state"><div className="empty-icon">NP</div><h2>Noch keine Aktivität.</h2><p>Sobald du Pässe anlegst, Wartungen dokumentierst oder Dateien hochlädst, erscheint hier deine Chronik.</p></section>
        ) : (
          <section className="activity-feed">
            {activity.map((item) => (
              <article className="activity-row" key={`${item.activity_type}-${item.id}-${item.happened_at}`}>
                <div className={`activity-icon ${item.activity_type.toLowerCase()}`}>{typeIcon(item.activity_type)}</div>
                <div className="activity-copy"><div className="activity-kicker"><span>{typeLabel(item.activity_type)}</span><time>{formatDateTime(item.happened_at)}</time></div><h2>{item.title}</h2><p>{item.detail || "Aktualisiert"} · <Link href={`/app/assets/${item.asset_id}`}>{item.asset_name}</Link></p></div>
                <Link className="activity-open" href={`/app/assets/${item.asset_id}`}>Öffnen →</Link>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
