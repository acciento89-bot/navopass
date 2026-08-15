import { notFound } from "next/navigation";
import { getDocuments, getEvents, getShareableAsset } from "@/lib/assets";
import { formatDate, formatMoney } from "@/lib/format";
import { Logo } from "@/components/logo";

export const dynamic = "force-dynamic";

export default async function PublicPassPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const asset = await getShareableAsset(publicId.toUpperCase());
  if (!asset) notFound();
  const [events, documents] = await Promise.all([getEvents(asset.id, true), getDocuments(asset.id, true)]);

  return (
    <main className="public-page">
      <header className="public-header container"><Logo /><span className="verified-chip">Digitaler Objektpass</span></header>
      <section className="public-pass container">
        <div className="public-hero">
          <div className="asset-avatar large">{asset.name.slice(0, 2).toUpperCase()}</div>
          <div><span className="asset-category">{asset.category}</span><h1>{asset.name}</h1><p>{[asset.manufacturer, asset.model].filter(Boolean).join(" · ") || "NavoPass Objekt"}</p></div>
          <span className="pass-id">#{asset.public_id}</span>
        </div>

        <div className="public-stats"><div><small>Seriennummer</small><b>{asset.serial_number || "Nicht angegeben"}</b></div><div><small>Kauf / Installation</small><b>{formatDate(asset.purchase_date)}</b></div><div><small>Garantie</small><b>{formatDate(asset.warranty_until)}</b></div></div>

        <div className="public-grid">
          <article className="panel"><div className="panel-head"><h2>Historie</h2><span className="count-pill">{events.length}</span></div><div className="timeline">{events.length === 0 ? <p className="muted">Noch keine öffentlichen Serviceeinträge.</p> : events.map((event) => <div className="timeline-item" key={event.id}><span className="timeline-dot"></span><div><div className="timeline-line"><b>{event.title}</b><time>{formatDate(event.event_date)}</time></div>{event.description && <p>{event.description}</p>}<small>{[event.provider, formatMoney(event.cost_cents)].filter(Boolean).join(" · ")}</small></div></div>)}</div></article>
          <article className="panel"><div className="panel-head"><h2>Dokumente</h2><span className="count-pill">{documents.length}</span></div><div className="document-list">{documents.length === 0 ? <p className="muted">Keine öffentlichen Dokumente.</p> : documents.map((doc) => <a key={doc.id} href={doc.url} target="_blank" rel="noreferrer"><span>↗</span><div><b>{doc.title}</b><small>{doc.kind}</small></div></a>)}</div></article>
        </div>
        <footer className="public-foot"><p>Dieser Pass wird mit NavoPass bereitgestellt. Der Eigentümer bestimmt die sichtbaren Informationen.</p></footer>
      </section>
    </main>
  );
}
