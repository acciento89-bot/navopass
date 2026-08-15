import Link from "next/link";
import { notFound } from "next/navigation";
import { addDocumentAction, addEventAction, updateVisibilityAction } from "@/app/actions/assets";
import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/auth";
import { getDocuments, getEvents, getOwnedAsset } from "@/lib/assets";
import { formatDate, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const asset = await getOwnedAsset(user.id, id);
  if (!asset) notFound();
  const [events, documents] = await Promise.all([getEvents(asset.id), getDocuments(asset.id)]);
  const appUrl = (process.env.APP_URL || "https://navopass.de").replace(/\/$/, "");
  const shareUrl = `${appUrl}/p/${asset.public_id}`;

  return (
    <main className="app-page container">
      <AppHeader name={user.name} />
      <div className="page-back"><Link href="/app">← Meine Pässe</Link></div>

      <section className="passport-head">
        <div className="passport-title">
          <span className="asset-category">{asset.category}</span>
          <h1>{asset.name}</h1>
          <p>{[asset.manufacturer, asset.model].filter(Boolean).join(" · ") || "Produktdaten noch nicht vollständig"}</p>
        </div>
        <div className="passport-qr">
          <img src={`/api/qr?data=${encodeURIComponent(shareUrl)}`} alt="QR-Code des Objektpasses" width="148" height="148" />
          <small>{asset.public_id}</small>
        </div>
      </section>

      <section className="detail-grid">
        <article className="panel">
          <div className="panel-head"><h2>Objektdaten</h2><span className={`visibility ${asset.visibility.toLowerCase()}`}>{asset.visibility === "PRIVATE" ? "Privat" : asset.visibility === "PUBLIC" ? "Öffentlich" : "Per Link"}</span></div>
          <dl className="detail-list">
            <div><dt>Hersteller</dt><dd>{asset.manufacturer || "—"}</dd></div>
            <div><dt>Modell</dt><dd>{asset.model || "—"}</dd></div>
            <div><dt>Seriennummer</dt><dd>{asset.serial_number || "—"}</dd></div>
            <div><dt>Standort</dt><dd>{asset.location || "—"}</dd></div>
            <div><dt>Kauf / Installation</dt><dd>{formatDate(asset.purchase_date)}</dd></div>
            <div><dt>Garantie bis</dt><dd>{formatDate(asset.warranty_until)}</dd></div>
          </dl>
          {asset.notes && <p className="note-box">{asset.notes}</p>}
        </article>

        <article className="panel">
          <h2>Teilen & QR</h2>
          <p className="muted">Mit „Per Link“ kann jeder mit QR-Code oder Link die freigegebenen Daten sehen. „Privat“ sperrt den Pass.</p>
          <a className="share-link" href={shareUrl} target="_blank" rel="noreferrer">{shareUrl}</a>
          <form action={updateVisibilityAction} className="inline-form">
            <input type="hidden" name="assetId" value={asset.id} />
            <select name="visibility" defaultValue={asset.visibility}><option value="PRIVATE">Privat</option><option value="LINK">Per Link / QR</option><option value="PUBLIC">Öffentlich</option></select>
            <button className="button small" type="submit">Speichern</button>
          </form>
        </article>
      </section>

      <section className="workspace-grid">
        <article className="panel">
          <div className="panel-head"><div><span className="eyebrow">Chronik</span><h2>Service & Ereignisse</h2></div><span className="count-pill">{events.length}</span></div>
          <form action={addEventAction} className="compact-form">
            <input type="hidden" name="assetId" value={asset.id} />
            <div className="two-cols"><label>Titel<input name="title" placeholder="z. B. Wartung durchgeführt" required /></label><label>Typ<select name="eventType"><option value="SERVICE">Service</option><option value="REPAIR">Reparatur</option><option value="INSPECTION">Prüfung</option><option value="NOTE">Notiz</option></select></label></div>
            <div className="two-cols"><label>Datum<input name="eventDate" type="date" /></label><label>Firma / Person<input name="provider" placeholder="optional" /></label></div>
            <label>Beschreibung<textarea name="description" rows={3} placeholder="Was wurde gemacht?" /></label>
            <div className="two-cols"><label>Kosten €<input name="cost" inputMode="decimal" placeholder="0,00" /></label><label className="check-label"><input name="isPublic" type="checkbox" defaultChecked /> Im geteilten Pass sichtbar</label></div>
            <button className="button small" type="submit">Ereignis hinzufügen</button>
          </form>

          <div className="timeline">
            {events.length === 0 ? <p className="muted">Noch keine Ereignisse dokumentiert.</p> : events.map((event) => (
              <div className="timeline-item" key={event.id}><span className="timeline-dot"></span><div><div className="timeline-line"><b>{event.title}</b><time>{formatDate(event.event_date)}</time></div>{event.description && <p>{event.description}</p>}<small>{[event.provider, formatMoney(event.cost_cents)].filter(Boolean).join(" · ")}</small></div></div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head"><div><span className="eyebrow">Unterlagen</span><h2>Dokumente</h2></div><span className="count-pill">{documents.length}</span></div>
          <p className="muted">Im ersten MVP werden Dokumente als sichere Links hinterlegt. Datei-Uploads folgen als nächster Schritt.</p>
          <form action={addDocumentAction} className="compact-form">
            <input type="hidden" name="assetId" value={asset.id} />
            <label>Titel<input name="title" placeholder="z. B. Bedienungsanleitung" required /></label>
            <label>Link<input name="url" type="url" placeholder="https://…" required /></label>
            <div className="two-cols"><label>Art<select name="kind"><option>Dokument</option><option>Rechnung</option><option>Anleitung</option><option>Garantie</option><option>Prüfbericht</option></select></label><label className="check-label"><input name="isPublic" type="checkbox" defaultChecked /> Im geteilten Pass sichtbar</label></div>
            <button className="button small" type="submit">Dokument hinzufügen</button>
          </form>
          <div className="document-list">{documents.length === 0 ? <p className="muted">Noch keine Dokumente.</p> : documents.map((doc) => <a key={doc.id} href={doc.url} target="_blank" rel="noreferrer"><span>↗</span><div><b>{doc.title}</b><small>{doc.kind}</small></div></a>)}</div>
        </article>
      </section>
    </main>
  );
}
