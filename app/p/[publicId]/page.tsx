import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAccessibleAssetByPublicId, getDocuments, getEvents, getShareableAsset, roleCanRecordService } from "@/lib/assets";
import { formatDate, formatMoney } from "@/lib/format";
import { Logo } from "@/components/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getLocale } from "@/lib/i18n";
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
  const [{ publicId }, locale] = await Promise.all([params, getLocale()]);
  const asset = await getShareableAsset(publicId.toUpperCase());
  if (!asset) return { title: locale === "de" ? "Pass nicht gefunden" : "Pass not found", robots: { index: false, follow: false } };

  const publicIndex = asset.visibility === "PUBLIC";
  return {
    title: `${asset.name} · ${locale === "de" ? "Digitaler Objektpass" : "Digital asset pass"}`,
    description: [asset.manufacturer, asset.model, asset.category].filter(Boolean).join(" · "),
    robots: { index: publicIndex, follow: publicIndex },
  };
}

export default async function PublicPassPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const locale = await getLocale();
  const en = locale === "en";
  const tr = (de: string, english: string) => en ? english : de;
  const normalizedPublicId = publicId.toUpperCase();
  const asset = await getShareableAsset(normalizedPublicId);
  if (!asset) notFound();
  const [events, documents, user] = await Promise.all([getEvents(asset.id, true), getDocuments(asset.id, true), getCurrentUser()]);
  const accessibleAsset = user ? await getAccessibleAssetByPublicId(user.id, normalizedPublicId) : null;
  const canRecordService = Boolean(user && accessibleAsset && roleCanRecordService(accessibleAsset, user.id));
  const returnPath = `/p/${asset.public_id}`;

  return (
    <main className="public-page">
      <header className="public-header container"><Logo label={tr("NavoPass Startseite", "NavoPass home page")} /><LanguageSwitcher compact /><span className="verified-chip">{tr("Vom Eigentümer freigegeben", "Shared by the owner")}</span></header>
      <section className="public-pass container">
        <div className="public-hero">
          <div className="asset-avatar large">{asset.name.slice(0, 2).toUpperCase()}</div>
          <div><span className="asset-category">{asset.category}</span><h1>{asset.name}</h1><p>{[asset.manufacturer, asset.model].filter(Boolean).join(" · ") || tr("NavoPass Objekt", "NavoPass asset")}</p></div>
          <span className="pass-id">#{asset.public_id}</span>
        </div>

        <article className="panel">
          <div className="panel-head"><div><span className="eyebrow">QR Service</span><h2>{tr("Pass gescannt?", "Scanned this pass?")}</h2></div>{canRecordService ? <span className="visibility public">{tr("Service erlaubt", "Service enabled")}</span> : <span className="visibility link">{tr("Ansicht", "View only")}</span>}</div>
          <p className="muted">{canRecordService ? tr("Du hast Servicezugriff und kannst Wartung, Reparatur oder Prüfung direkt vor Ort dokumentieren. Stammdaten, Dateien und Freigaben bleiben geschützt.", "You have service access and can document maintenance, repairs or inspections on site. Master data, files and sharing settings remain protected.") : user ? tr("Du bist angemeldet, hast für diesen Pass aber keinen Service-Schreibzugriff.", "You are signed in but do not have service write access for this pass.") : tr("Als berechtigter Eigentümer, Mitarbeiter oder Servicepartner kannst du dich anmelden und Wartungen direkt am Objekt dokumentieren.", "Authorised owners, employees and service partners can sign in and document maintenance directly on the asset.")}</p>
          <div className="form-actions">
            {canRecordService && accessibleAsset ? <Link className="button" href={`/app/assets/${accessibleAsset.id}/service`}>{tr("Wartung eintragen", "Record service")} →</Link> : !user ? <Link className="button" href={`/login?next=${encodeURIComponent(returnPath)}`}>{tr("Für Service anmelden", "Sign in for service")} →</Link> : null}
            {accessibleAsset && <Link className="button ghost" href={`/app/assets/${accessibleAsset.id}`}>{tr("Im Konto öffnen", "Open in account")}</Link>}
          </div>
        </article>

        <div className="public-stats">
          <div><small>{tr("Seriennummer", "Serial number")}</small><b>{asset.serial_number || tr("Nicht angegeben", "Not provided")}</b></div>
          <div><small>{tr("Kauf / Installation", "Purchase / installation")}</small><b>{formatDate(asset.purchase_date, locale)}</b></div>
          <div><small>{tr("Garantie bis", "Warranty until")}</small><b>{formatDate(asset.warranty_until, locale)}</b></div>
          <div><small>{tr("Nächste Wartung", "Next service")}</small><b>{formatDate(asset.next_service_date, locale)}</b></div>
        </div>

        <div className="public-grid">
          <article className="panel">
            <div className="panel-head"><div><span className="eyebrow">{tr("Nachvollziehbar", "Traceable")}</span><h2>{tr("Historie", "History")}</h2></div><span className="count-pill">{events.length}</span></div>
            <div className="timeline">{events.length === 0 ? <p className="muted">{tr("Noch keine freigegebenen Serviceeinträge.", "No shared service entries yet.")}</p> : events.map((event) => <div className="timeline-item" key={event.id}><span className="timeline-dot"></span><div><div className="timeline-line"><b>{event.title}</b><time>{formatDate(event.event_date, locale)}</time></div>{event.description && <p>{event.description}</p>}<small>{[event.provider, formatMoney(event.cost_cents, locale)].filter(Boolean).join(" · ")}</small></div></div>)}</div>
          </article>

          <article className="panel">
            <div className="panel-head"><div><span className="eyebrow">{tr("Freigegeben", "Shared")}</span><h2>{tr("Fotos & Dokumente", "Photos & documents")}</h2></div><span className="count-pill">{documents.length}</span></div>
            {documents.length === 0 ? <p className="muted">{tr("Keine freigegebenen Fotos oder Dokumente.", "No shared photos or documents.")}</p> : (
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
        <footer className="public-foot"><p>{tr("Dieser digitale Objektpass wird mit NavoPass bereitgestellt. Der Eigentümer bestimmt selbst, welche Informationen sichtbar sind. Servicezugriff erlaubt ausschließlich die Dokumentation von Serviceereignissen; Stammdaten und Dokumentverwaltung bleiben geschützt.", "This digital asset pass is provided by NavoPass. The owner controls which information is visible. Service access only permits recording service events; master data and document management remain protected.")}</p></footer>
      </section>
    </main>
  );
}
