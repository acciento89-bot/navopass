import { notFound } from "next/navigation";
import { getDocuments, getEvents, getShareableAsset } from "@/lib/assets";
import { formatDate, formatMoney } from "@/lib/format";
import { Logo } from "@/components/logo";
import fileStyles from "@/app/file-cards.module.css";

export const dynamic = "force-dynamic";

function decodedUrl(url: string) {
  try { return decodeURIComponent(url); } catch { return url; }
}

function isImageUrl(url: string) {
  return /\.(jpe?g|png|webp|heic|heif)(?:$|[?#])/i.test(decodedUrl(url));
}

function isPdfUrl(url: string) {
  return /\.pdf(?:$|[?#])/i.test(decodedUrl(url));
}

export default async function PublicPassPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const asset = await getShareableAsset(publicId.toUpperCase());
  if (!asset) notFound();
  const [events, documents] = await Promise.all([getEvents(asset.id, true), getDocuments(asset.id, true)]);

  return (
    <main className="public-page">
      <header className="public-header container"><Logo /><span className="verified-chip">Vom Eigentümer freigegeben</span></header>
      <section className="public-pass container">
        <div className="public-hero">
          <div className="asset-avatar large">{asset.name.slice(0, 2).toUpperCase()}</div>
          <div><span className="asset-category">{asset.category}</span><h1>{asset.name}</h1><p>{[asset.manufacturer, asset.model].filter(Boolean).join(" · ") || "NavoPass Objekt"}</p></div>
          <span className="pass-id">#{asset.public_id}</span>
        </div>

        <div className="public-stats">
          <div><small>Seriennummer</small><b>{asset.serial_number || "Nicht angegeben"}</b></div>
          <div><small>Kauf / Installation</small><b>{formatDate(asset.purchase_date)}</b></div>
          <div><small>Garantie bis</small><b>{formatDate(asset.warranty_until)}</b></div>
          <div><small>Nächste Wartung</small><b>{formatDate(asset.next_service_date)}</b></div>
        </div>

        <div className="public-grid">
          <article className="panel">
            <div className="panel-head"><div><span className="eyebrow">Nachvollziehbar</span><h2>Historie</h2></div><span className="count-pill">{events.length}</span></div>
            <div className="timeline">{events.length === 0 ? <p className="muted">Noch keine freigegebenen Serviceeinträge.</p> : events.map((event) => <div className="timeline-item" key={event.id}><span className="timeline-dot"></span><div><div className="timeline-line"><b>{event.title}</b><time>{formatDate(event.event_date)}</time></div>{event.description && <p>{event.description}</p>}<small>{[event.provider, formatMoney(event.cost_cents)].filter(Boolean).join(" · ")}</small></div></div>)}</div>
          </article>

          <article className="panel">
            <div className="panel-head"><div><span className="eyebrow">Freigegeben</span><h2>Fotos & Dokumente</h2></div><span className="count-pill">{documents.length}</span></div>
            {documents.length === 0 ? <p className="muted">Keine freigegebenen Fotos oder Dokumente.</p> : (
              <div className={fileStyles.publicGrid}>
                {documents.map((doc) => {
                  const image = isImageUrl(doc.url);
                  return (
                    <article className={fileStyles.fileCard} key={doc.id}>
                      <a href={doc.url} target="_blank" rel="noreferrer">
                        <div className={fileStyles.preview}>{image ? <img src={doc.url} alt={doc.title} loading="lazy" /> : <div className={fileStyles.fileIcon}>{isPdfUrl(doc.url) ? "PDF" : "LINK"}</div>}</div>
                        <div className={fileStyles.fileMeta}><b>{doc.title}</b><small>{doc.kind}</small></div>
                      </a>
                    </article>
                  );
                })}
              </div>
            )}
          </article>
        </div>
        <footer className="public-foot"><p>Dieser digitale Objektpass wird mit NavoPass bereitgestellt. Der Eigentümer bestimmt selbst, welche Informationen sichtbar sind.</p></footer>
      </section>
    </main>
  );
}
