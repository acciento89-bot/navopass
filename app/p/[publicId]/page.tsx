import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAccessibleAssetByPublicId, getDocuments, getEvents, getShareableAsset, roleCanEdit } from "@/lib/assets";
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

export async function generateMetadata({ params }: { params: Promise<{ publicId: string }> }): Promise<Metadata> {
  const { publicId } = await params;
  const asset = await getShareableAsset(publicId.toUpperCase());
  if (!asset) return { title: "Pass nicht gefunden", robots: { index: false, follow: false } };

  const publicIndex = asset.visibility === "PUBLIC";
  return {
    title: `${asset.name} · Digitaler Objektpass`,
    description: [asset.manufacturer, asset.model, asset.category].filter(Boolean).join(" · "),
    robots: { index: publicIndex, follow: publicIndex },
  };
}

export default async function PublicPassPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const normalizedPublicId = publicId.toUpperCase();
  const asset = await getShareableAsset(normalizedPublicId);
  if (!asset) notFound();
  const [events, documents, user] = await Promise.all([getEvents(asset.id, true), getDocuments(asset.id, true), getCurrentUser()]);
  const accessibleAsset = user ? await getAccessibleAssetByPublicId(user.id, normalizedPublicId) : null;
  const canRecordService = Boolean(user && accessibleAsset && roleCanEdit(accessibleAsset, user.id));
  const returnPath = `/p/${asset.public_id}`;

  return (
    <main className="public-page">
      <header className="public-header container"><Logo /><span className="verified-chip">Vom Eigentümer freigegeben</span></header>
      <section className="public-pass container">
        <div className="public-hero">
          <div className="asset-avatar large">{asset.name.slice(0, 2).toUpperCase()}</div>
          <div><span className="asset-category">{asset.category}</span><h1>{asset.name}</h1><p>{[asset.manufacturer, asset.model].filter(Boolean).join(" · ") || "NavoPass Objekt"}</p></div>
          <span className="pass-id">#{asset.public_id}</span>
        </div>

        <article className="panel">
          <div className="panel-head"><div><span className="eyebrow">QR-Service</span><h2>Pass gescannt?</h2></div>{canRecordService ? <span className="visibility public">Bearbeiten erlaubt</span> : <span className="visibility link">Ansicht</span>}</div>
          <p className="muted">{canRecordService ? "Du hast Bearbeitungsrechte für diesen Pass und kannst die Wartung direkt vor Ort dokumentieren." : user ? "Du bist angemeldet, hast für diesen Pass aber nur Ansicht oder keine Bereichsberechtigung." : "Als berechtigter Eigentümer, Mitarbeiter oder Servicepartner kannst du dich anmelden und Wartungen direkt am Objekt dokumentieren."}</p>
          <div className="form-actions">
            {canRecordService && accessibleAsset ? <Link className="button" href={`/app/assets/${accessibleAsset.id}/service`}>Wartung eintragen →</Link> : !user ? <Link className="button" href={`/login?next=${encodeURIComponent(returnPath)}`}>Für Service anmelden →</Link> : null}
            {accessibleAsset && <Link className="button ghost" href={`/app/assets/${accessibleAsset.id}`}>Im Konto öffnen</Link>}
          </div>
        </article>

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
        <footer className="public-foot"><p>Dieser digitale Objektpass wird mit NavoPass bereitgestellt. Der Eigentümer bestimmt selbst, welche Informationen sichtbar sind. Schreibzugriff ist ausschließlich für angemeldete und berechtigte Bereichsmitglieder möglich.</p></footer>
      </section>
    </main>
  );
}
