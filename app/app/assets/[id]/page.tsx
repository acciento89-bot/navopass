import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addDocumentAction,
  addEventAction,
  deleteAssetAction,
  deleteDocumentAction,
  deleteEventAction,
  duplicateAssetAction,
  toggleArchiveAction,
  toggleFavoriteAction,
  updateVisibilityAction,
} from "@/app/actions/assets";
import { AppHeader } from "@/components/app-header";
import { ConfirmButton } from "@/components/confirm-button";
import { ShareActions } from "@/components/share-actions";
import { requireUser } from "@/lib/auth";
import { getDocuments, getEvents, getOwnedAsset, isDueSoon, isOverdue, roleCanEdit, roleCanManage } from "@/lib/assets";
import type { DateOnlyInput } from "@/lib/date";
import { formatDate, formatMoney } from "@/lib/format";
import fileStyles from "@/app/file-cards.module.css";

export const dynamic = "force-dynamic";

function decodedUrl(url: string) { try { return decodeURIComponent(url); } catch { return url; } }
function isImageUrl(url: string) { return /\.(jpe?g|png|webp|heic|heif)(?:$|[?#])/i.test(decodedUrl(url)); }
function isPdfUrl(url: string) { return /\.pdf(?:$|[?#])/i.test(decodedUrl(url)); }
function dateTone(value: DateOnlyInput) { if (isOverdue(value)) return "danger"; if (isDueSoon(value)) return "warning"; return "ok"; }
function roleLabel(role?: string | null) { if (role === "OWNER") return "Inhaber"; if (role === "ADMIN") return "Admin"; if (role === "EDITOR") return "Bearbeiter"; if (role === "VIEWER") return "Betrachter"; return "Persönlich"; }

export default async function AssetDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ uploadError?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { uploadError } = await searchParams;
  const asset = await getOwnedAsset(user.id, id);
  if (!asset) notFound();
  const [events, documents] = await Promise.all([getEvents(asset.id), getDocuments(asset.id)]);
  const appUrl = (process.env.APP_URL || "https://navopass.de").replace(/\/$/, "");
  const shareUrl = `${appUrl}/p/${asset.public_id}`;
  const serviceTone = dateTone(asset.next_service_date);
  const warrantyTone = dateTone(asset.warranty_until);
  const editable = roleCanEdit(asset, user.id);
  const manageable = roleCanManage(asset, user.id);

  return (
    <main className="app-page"><div className="container"><AppHeader name={user.name} /><div className="page-back"><Link href="/app">← Meine Pässe</Link></div>
      <div className="workspace-context"><span>{asset.workspace_name || "Persönlich"}</span><b>{roleLabel(asset.access_role)}</b>{!editable && <em>Nur Lesezugriff</em>}</div>
      {asset.archived_at && <div className="archive-banner"><b>Dieser Pass ist archiviert.</b><span>Er bleibt im Bereich erhalten, ist aber öffentlich nicht mehr abrufbar.</span></div>}

      <section className="passport-head"><div className="passport-title"><div className="passport-kicker"><span>{asset.category}</span>{asset.favorite && <span>★ Favorit</span>}</div><h1>{asset.name}</h1><p>{[asset.manufacturer,asset.model].filter(Boolean).join(" · ") || "Produktdaten noch nicht vollständig"}</p>{editable && <div className="passport-actions"><Link className="button light small" href={`/app/assets/${asset.id}/edit`}>Bearbeiten</Link><form action={toggleFavoriteAction}><input type="hidden" name="assetId" value={asset.id} /><button className="button glass small" type="submit">{asset.favorite ? "★ Favorit entfernen" : "☆ Als Favorit"}</button></form></div>}</div><div className="passport-qr"><img src={`/api/qr?data=${encodeURIComponent(shareUrl)}`} alt="QR-Code des Objektpasses" width="148" height="148" /><small>#{asset.public_id}</small></div></section>

      <section className="pass-status-grid"><article className={`status-card ${serviceTone}`}><span>Nächste Wartung</span><b>{formatDate(asset.next_service_date)}</b><small>{serviceTone === "danger" ? "Überfällig" : serviceTone === "warning" ? "Demnächst fällig" : asset.next_service_date ? `Intervall ${asset.service_interval_months || 12} Monate` : "Noch nicht gesetzt"}</small></article><article className={`status-card ${warrantyTone}`}><span>Garantie bis</span><b>{formatDate(asset.warranty_until)}</b><small>{warrantyTone === "danger" ? "Abgelaufen" : warrantyTone === "warning" ? "Läuft bald aus" : asset.warranty_until ? "Aktiv" : "Nicht angegeben"}</small></article><article className="status-card"><span>Historie</span><b>{events.length}</b><small>{events.length === 1 ? "Eintrag" : "Einträge"}</small></article><article className="status-card"><span>Unterlagen</span><b>{documents.length}</b><small>{documents.length === 1 ? "Datei / Link" : "Dateien / Links"}</small></article></section>

      <section className="detail-grid"><article className="panel"><div className="panel-head"><h2>Objektdaten</h2><span className={`visibility ${asset.visibility.toLowerCase()}`}>{asset.visibility === "PRIVATE" ? "Privat" : asset.visibility === "PUBLIC" ? "Öffentlich" : "Per Link"}</span></div><dl className="detail-list"><div><dt>Hersteller</dt><dd>{asset.manufacturer || "—"}</dd></div><div><dt>Modell</dt><dd>{asset.model || "—"}</dd></div><div><dt>Seriennummer</dt><dd>{asset.serial_number || "—"}</dd></div><div><dt>Standort</dt><dd>{asset.location || "—"}</dd></div><div><dt>Kauf / Installation</dt><dd>{formatDate(asset.purchase_date)}</dd></div><div><dt>Nächste Wartung</dt><dd>{formatDate(asset.next_service_date)}</dd></div></dl>{asset.notes && <p className="note-box">{asset.notes}</p>}{editable && <Link className="text-link" href={`/app/assets/${asset.id}/edit`}>Stammdaten bearbeiten →</Link>}</article>
        <article className="panel share-panel"><div className="panel-head"><h2>Teilen & QR</h2><span className={`visibility ${asset.visibility.toLowerCase()}`}>{asset.visibility === "PRIVATE" ? "Gesperrt" : "Aktiv"}</span></div><p className="muted">Der QR-Link folgt der Sichtbarkeit dieses Passes. Mitglieder des Bereichs können private Passdaten entsprechend ihrer Rolle sehen.</p><a className="share-link" href={shareUrl} target="_blank" rel="noreferrer">{shareUrl}</a><ShareActions url={shareUrl} title={asset.name} />{editable && <form action={updateVisibilityAction} className="inline-form share-visibility"><input type="hidden" name="assetId" value={asset.id} /><select name="visibility" defaultValue={asset.visibility}><option value="PRIVATE">Privat</option><option value="LINK">Per Link / QR</option><option value="PUBLIC">Öffentlich</option></select><button className="button small" type="submit">Speichern</button></form>}</article></section>

      <section className="workspace-grid"><article className="panel"><div className="panel-head"><div><span className="eyebrow">Chronik</span><h2>Service & Ereignisse</h2></div><span className="count-pill">{events.length}</span></div>{editable && <form action={addEventAction} className="compact-form event-form"><input type="hidden" name="assetId" value={asset.id} /><div className="two-cols"><label>Titel<input name="title" maxLength={180} placeholder="z. B. Wartung durchgeführt" required /></label><label>Typ<select name="eventType"><option value="SERVICE">Service</option><option value="REPAIR">Reparatur</option><option value="INSPECTION">Prüfung</option><option value="NOTE">Notiz</option></select></label></div><div className="two-cols"><label>Datum<input name="eventDate" type="date" /></label><label>Firma / Person<input name="provider" maxLength={200} placeholder="optional" /></label></div><label>Beschreibung<textarea name="description" maxLength={4000} rows={3} placeholder="Was wurde gemacht?" /></label><div className="two-cols"><label>Kosten €<input name="cost" inputMode="decimal" placeholder="0,00" /></label><label className="check-label"><input name="isPublic" type="checkbox" defaultChecked /> Im geteilten Pass sichtbar</label></div><button className="button small" type="submit">+ Ereignis hinzufügen</button></form>}
        {!editable && <p className="readonly-note">Du kannst die Historie ansehen. Zum Hinzufügen oder Löschen ist mindestens die Rolle Bearbeiter erforderlich.</p>}
        <div className="timeline">{events.length === 0 ? <p className="muted">Noch keine Ereignisse dokumentiert.</p> : events.map((event) => <div className="timeline-item" key={event.id}><span className="timeline-dot"></span><div><div className="timeline-line"><b>{event.title}</b><time>{formatDate(event.event_date)}</time></div>{event.description && <p>{event.description}</p>}<div className="timeline-foot"><small>{[event.provider,formatMoney(event.cost_cents)].filter(Boolean).join(" · ") || event.event_type}</small>{editable && <form action={deleteEventAction}><input type="hidden" name="assetId" value={asset.id} /><input type="hidden" name="eventId" value={event.id} /><ConfirmButton className="mini-danger" type="submit" message={`„${event.title}“ wirklich löschen?`}>Löschen</ConfirmButton></form>}</div></div></div>)}</div></article>

        <article className="panel"><div className="panel-head"><div><span className="eyebrow">Unterlagen</span><h2>Fotos & Dokumente</h2></div><span className="count-pill">{documents.length}</span></div><p className="muted">Fotos, Rechnungen, Anleitungen und Prüfberichte bleiben direkt am Objektpass gespeichert.</p>{uploadError && <p className={fileStyles.error}>{uploadError}</p>}
          {editable && <div className={fileStyles.uploadBox}><div className={fileStyles.uploadIntro}><div><h3>Datei hochladen</h3><p>PDF oder Foto bis 15 MB. HEIC/HEIF vom iPhone wird ebenfalls akzeptiert.</p></div><span className={fileStyles.uploadBadge}>Lokal gespeichert</span></div><form action="/api/uploads" method="post" encType="multipart/form-data" className={fileStyles.uploadForm}><input type="hidden" name="assetId" value={asset.id} /><label>Datei<input name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" required /></label><div className={fileStyles.uploadRow}><label>Titel (optional)<input name="title" placeholder="z. B. Rechnung Wärmepumpe" /></label><label>Art<select name="kind" defaultValue=""><option value="">Automatisch erkennen</option><option value="Foto">Foto</option><option value="Dokument">Dokument</option><option value="Rechnung">Rechnung</option><option value="Anleitung">Anleitung</option><option value="Garantie">Garantie</option><option value="Prüfbericht">Prüfbericht</option></select></label></div><div className={fileStyles.uploadActions}><label className={fileStyles.publicCheck}><input name="isPublic" type="checkbox" defaultChecked /> Im geteilten Pass sichtbar</label><button className={fileStyles.uploadButton} type="submit">Datei hochladen</button></div></form></div>}
          {documents.length === 0 ? <p className={fileStyles.empty}>Noch keine Fotos oder Dokumente gespeichert.</p> : <div className={fileStyles.fileGrid}>{documents.map((doc) => { const image=isImageUrl(doc.url); return <article className={fileStyles.fileCard} key={doc.id}><a href={doc.url} target="_blank" rel="noreferrer"><div className={fileStyles.preview}>{image ? <img src={doc.url} alt={doc.title} loading="lazy" /> : <div className={fileStyles.fileIcon}>{isPdfUrl(doc.url) ? "PDF" : "LINK"}</div>}</div><div className={fileStyles.fileMeta}><b>{doc.title}</b><small>{doc.kind}{doc.is_public ? " · geteilt" : " · privat"}</small></div></a>{editable && <form action={deleteDocumentAction} className={fileStyles.deleteForm}><input type="hidden" name="assetId" value={asset.id} /><input type="hidden" name="documentId" value={doc.id} /><ConfirmButton className={fileStyles.deleteButton} type="submit" message={`„${doc.title}“ wirklich löschen?`}>Löschen</ConfirmButton></form>}</article>; })}</div>}
          {editable && <><div className={fileStyles.divider}>oder externer Link</div><form action={addDocumentAction} className={fileStyles.linkForm}><input type="hidden" name="assetId" value={asset.id} /><label>Titel<input name="title" placeholder="z. B. Hersteller-Anleitung" required /></label><label>Link<input name="url" type="url" placeholder="https://…" required /></label><div className={fileStyles.uploadRow}><label>Art<select name="kind"><option>Dokument</option><option>Rechnung</option><option>Anleitung</option><option>Garantie</option><option>Prüfbericht</option></select></label><label className={fileStyles.publicCheck}><input name="isPublic" type="checkbox" defaultChecked /> Im geteilten Pass sichtbar</label></div><button className="button small" type="submit">Link hinzufügen</button></form></>}
        </article></section>

      {editable && <section className="pass-management panel"><div><span className="eyebrow">Pass verwalten</span><h2>Weitere Aktionen</h2><p className="muted">Duplizieren erstellt eine private Kopie im selben Bereich. Archivieren und Löschen sind nur für Inhaber oder Admins möglich.</p></div><div className="management-actions"><form action={duplicateAssetAction}><input type="hidden" name="assetId" value={asset.id} /><button className="button ghost small" type="submit">Pass duplizieren</button></form>{manageable && <form action={toggleArchiveAction}><input type="hidden" name="assetId" value={asset.id} /><ConfirmButton className="button ghost small" type="submit" message={asset.archived_at ? "Pass wieder aktivieren?" : "Pass archivieren und öffentlichen Zugriff deaktivieren?"}>{asset.archived_at ? "Reaktivieren" : "Archivieren"}</ConfirmButton></form>}{manageable && <form action={deleteAssetAction}><input type="hidden" name="assetId" value={asset.id} /><ConfirmButton className="danger-button small" type="submit" message={`„${asset.name}“ inklusive Historie und Uploads dauerhaft löschen?`}>Pass löschen</ConfirmButton></form>}</div></section>}
    </div></main>
  );
}
