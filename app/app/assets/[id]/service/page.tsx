import Link from "next/link";
import { notFound } from "next/navigation";
import { recordServiceEntryAction } from "@/app/actions/service-entry";
import { AppHeader } from "@/components/app-header";
import { CustomerSignaturePad } from "@/components/customer-signature-pad";
import { requireUser } from "@/lib/auth";
import { getOwnedAsset, roleCanEdit, roleCanManage } from "@/lib/assets";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ServiceEntryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ success?: string; error?: string; event?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { success, error, event } = await searchParams;
  const asset = await getOwnedAsset(user.id, id);
  if (!asset) notFound();
  const providerIdentity = user.account_type === "PROFESSIONAL" && user.company_name ? [user.company_name, user.name, user.professional_title].filter(Boolean).join(" · ") : user.name;
  const manageable = roleCanManage(asset, user.id);

  if (!roleCanEdit(asset, user.id)) {
    return <main className="app-page"><div className="container"><AppHeader name={user.name} /><div className="page-back"><Link href={`/app/assets/${asset.id}`}>← Zum Objektpass</Link></div><section className="panel"><h1>Nur Lesezugriff</h1><p className="readonly-note">Für einen Service- oder Wartungseintrag brauchst du mindestens die Rolle Bearbeiter.</p></section></div></main>;
  }

  return <main className="app-page"><div className="container"><AppHeader name={user.name} />
    <div className="page-back"><Link href={`/app/assets/${asset.id}`}>← Zum Objektpass</Link></div>
    <section className="passport-head"><div className="passport-title"><div className="passport-kicker"><span>{asset.category}</span><span>{asset.service_access ? "Externe Servicefreigabe" : "Service-Erfassung"}</span></div><h1>{asset.name}</h1><p>{[asset.manufacturer, asset.model, asset.serial_number].filter(Boolean).join(" · ")}</p>{manageable&&<div className="passport-actions"><Link className="button light small" href={`/app/assets/${asset.id}/service-zugang`}>Servicezugriff verwalten</Link></div>}</div><div className="passport-qr"><img src={`/api/qr?data=${encodeURIComponent(`${(process.env.APP_URL || "https://navopass.de").replace(/\/$/, "")}/p/${asset.public_id}`)}`} alt="QR-Code des Objektpasses" width="132" height="132" /><small>#{asset.public_id}</small></div></section>
    {asset.service_access&&asset.service_access_expires_at&&<p className="form-tip"><b>Zeitlich begrenzter Zugriff:</b><span>Deine Servicefreigabe endet automatisch am {new Intl.DateTimeFormat("de-DE",{dateStyle:"medium",timeStyle:"short"}).format(new Date(asset.service_access_expires_at))}.</span></p>}
    {success === "1" && <div className="form-success" role="status"><b>Serviceeintrag gespeichert.</b> Die Historie des Passes wurde aktualisiert.{event && <div style={{ marginTop: 10 }}><Link className="button small" href={`/app/assets/${asset.id}/service/${event}/bericht`}>Wartungsprotokoll öffnen / PDF</Link></div>}</div>}{error && <p className="form-error" role="alert">{error}</p>}
    <section className="panel"><div className="panel-head"><div><span className="eyebrow">Vor Ort erfassen</span><h2>Wartung / Service dokumentieren</h2></div><span className="count-pill">{formatDate(asset.next_service_date)}</span></div>
      <p className="muted">Erfasse den Kundendienstbericht strukturiert. Freitext bleibt zusätzlich möglich; Messwerte, Teile, Feststellungen und Empfehlung werden separat im Protokoll geführt.</p>
      <form action={recordServiceEntryAction} className="compact-form event-form"><input type="hidden" name="assetId" value={asset.id} />
        <div className="two-cols"><label>Titel<input name="title" maxLength={180} defaultValue="Wartung durchgeführt" required /></label><label>Typ<select name="eventType" defaultValue="SERVICE"><option value="SERVICE">Wartung / Service</option><option value="REPAIR">Reparatur</option><option value="INSPECTION">Prüfung / Inspektion</option><option value="NOTE">Notiz</option></select></label></div>
        <div className="two-cols"><label>Datum<input name="eventDate" type="date" /></label><label>Firma / Techniker<input name="provider" maxLength={200} defaultValue={providerIdentity} /></label></div>
        <div className="two-cols"><label>Arbeitszeit in Minuten<input name="laborMinutes" type="number" min="0" max="1440" step="1" placeholder="z. B. 75" /></label><label>Kosten €<input name="cost" inputMode="decimal" placeholder="0,00" /></label></div>
        <label>Durchgeführte Arbeiten<textarea name="description" maxLength={4000} rows={5} placeholder="z. B. Brenner gereinigt, Filter gewechselt, Wärmetauscher geprüft …" /></label>
        <div className="two-cols"><label>Verbaute Teile / Material<textarea name="partsUsed" maxLength={4000} rows={4} placeholder="z. B. Zündelektrode, Dichtungssatz …" /></label><label>Messwerte<textarea name="measurements" maxLength={4000} rows={4} placeholder="z. B. CO₂ 8,8 %, Gasfließdruck 22 mbar …" /></label></div>
        <div className="two-cols"><label>Mängel / Feststellungen<textarea name="findings" maxLength={4000} rows={4} placeholder="z. B. MAG Vordruck zu niedrig …" /></label><label>Empfehlung / weitere Maßnahmen<textarea name="recommendation" maxLength={4000} rows={4} placeholder="z. B. Austausch bei nächster Wartung empfohlen …" /></label></div>
        <CustomerSignaturePad />
        <div className="two-cols"><div className="compact-form" style={{ marginTop: 0 }}><label className="check-label"><input name="isPublic" type="checkbox" defaultChecked /> Im geteilten Pass sichtbar</label><label className="check-label"><input name="advanceService" type="checkbox" defaultChecked /> Nächsten Wartungstermin berechnen</label></div><div /></div>
        <button className="button" type="submit">Serviceeintrag speichern</button>
      </form>
    </section>
  </div></main>;
}
