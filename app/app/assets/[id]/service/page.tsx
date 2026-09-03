import Link from "next/link";
import { notFound } from "next/navigation";
import { recordServiceEntryAction } from "@/app/actions/service-entry";
import { AppHeader } from "@/components/app-header";
import { CustomerSignaturePad } from "@/components/customer-signature-pad";
import { requireUser } from "@/lib/auth";
import { getOwnedAsset, roleCanManage, roleCanRecordService } from "@/lib/assets";
import { query } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";
type Job={id:string;title:string;notes:string|null;customer_name:string|null};

export default async function ServiceEntryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ success?: string; error?: string; event?: string; job?:string; jobDone?:string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { success, error, event, job:jobId, jobDone } = await searchParams;
  const asset = await getOwnedAsset(user.id, id);
  if (!asset) notFound();
  const providerIdentity = user.account_type === "PROFESSIONAL" && user.company_name ? [user.company_name, user.name, user.professional_title].filter(Boolean).join(" · ") : user.name;
  const manageable = roleCanManage(asset, user.id);
  const job=jobId?(await query<Job>(`SELECT j.id,j.title,j.notes,c.name AS customer_name FROM service_jobs j LEFT JOIN service_customers c ON c.id=j.customer_id WHERE j.id=$1 AND (j.user_id=$2 OR j.assigned_user_id=$2) AND j.asset_id=$3 AND j.status IN ('OPEN','IN_PROGRESS') LIMIT 1`,[jobId,user.id,asset.id])).rows[0]??null:null;

  if (!roleCanRecordService(asset, user.id)) return <main className="app-page"><div className="container"><AppHeader name={user.name} /><div className="page-back"><Link href={`/app/assets/${asset.id}`}>← Zum Objektpass</Link></div><section className="panel"><h1>Kein Servicezugriff</h1><p className="readonly-note">Für einen Service- oder Wartungseintrag brauchst du mindestens die Rolle Bearbeiter oder einen aktiven Servicezugang für diese Anlage.</p></section></div></main>;

  return <main className="app-page"><div className="container"><AppHeader name={user.name} />
    <div className="page-back"><Link href={job?"/app/auftraege":`/app/assets/${asset.id}`}>← {job?"Serviceaufträge":"Zum Objektpass"}</Link></div>
    <section className="passport-head"><div className="passport-title"><div className="passport-kicker"><span>{asset.category}</span><span>{job?"Serviceauftrag":"Service-Erfassung"}</span></div><h1>{asset.name}</h1><p>{[asset.manufacturer, asset.model, asset.serial_number].filter(Boolean).join(" · ")}</p>{job&&<p className="note-box"><b>{job.title}</b>{job.notes?` · ${job.notes}`:""}</p>}{asset.service_access&&!manageable&&<p className="readonly-note">Servicepartner-Zugang: Du kannst Service dokumentieren, aber keine Stammdaten, Dateien oder Freigaben des Objektpasses ändern.</p>}{manageable&&<div className="passport-actions"><Link className="button light small" href={`/app/assets/${asset.id}/service-zugang`}>Servicezugriff verwalten</Link></div>}</div><div className="passport-qr"><img src={`/api/qr?data=${encodeURIComponent(`${(process.env.APP_URL || "https://navopass.de").replace(/\/$/, "")}/p/${asset.public_id}`)}`} alt="QR-Code des Objektpasses" width="132" height="132" /><small>#{asset.public_id}</small></div></section>
    {success === "1" && <div className="form-success" role="status"><b>{jobDone?"Serviceauftrag abgeschlossen.":"Serviceeintrag gespeichert."}</b> Die Historie des Passes wurde aktualisiert.{event && <div style={{ marginTop: 10 }}><Link className="button small" href={`/app/assets/${asset.id}/service/${event}/bericht`}>Bericht öffnen / senden</Link></div>}</div>}{error && <p className="form-error" role="alert">{error}</p>}
    <section className="panel"><div className="panel-head"><div><span className="eyebrow">Vor Ort erfassen</span><h2>Wartung / Service dokumentieren</h2></div><span className="count-pill">{formatDate(asset.next_service_date)}</span></div>
      <p className="muted">Erfasse Arbeiten, Messwerte, Material und Feststellungen; anschließend unterschreibt der Kunde direkt auf dem Gerät.</p>
      <form action={recordServiceEntryAction} className="compact-form event-form"><input type="hidden" name="assetId" value={asset.id} />{job&&<input type="hidden" name="jobId" value={job.id}/>} 
        <div className="two-cols"><label>Titel<input name="title" maxLength={180} defaultValue={job?.title||"Wartung durchgeführt"} required /></label><label>Typ<select name="eventType" defaultValue="SERVICE"><option value="SERVICE">Wartung / Service</option><option value="REPAIR">Reparatur</option><option value="INSPECTION">Prüfung / Inspektion</option><option value="NOTE">Notiz</option></select></label></div>
        <div className="two-cols"><label>Datum<input name="eventDate" type="date" /></label><label>Firma / Techniker<input name="provider" maxLength={200} defaultValue={providerIdentity} /></label></div>
        <div className="two-cols"><label>Arbeitszeit in Minuten<input name="laborMinutes" type="number" min="0" max="1440" step="1" placeholder="z. B. 75" /></label><label>Kosten €<input name="cost" inputMode="decimal" placeholder="0,00" /></label></div>
        <label>Durchgeführte Arbeiten<textarea name="description" maxLength={4000} rows={5} defaultValue={job?.notes||""} /></label>
        <div className="two-cols"><label>Verbaute Teile / Material<textarea name="partsUsed" maxLength={4000} rows={4} /></label><label>Messwerte<textarea name="measurements" maxLength={4000} rows={4} /></label></div>
        <div className="two-cols"><label>Mängel / Feststellungen<textarea name="findings" maxLength={4000} rows={4} /></label><label>Empfehlung / weitere Maßnahmen<textarea name="recommendation" maxLength={4000} rows={4} /></label></div>
        <CustomerSignaturePad defaultCustomerName={job?.customer_name||undefined} />
        <div className="two-cols"><div className="compact-form" style={{ marginTop: 0 }}><label className="check-label"><input name="isPublic" type="checkbox" defaultChecked /> Im geteilten Pass sichtbar</label><label className="check-label"><input name="advanceService" type="checkbox" defaultChecked /> Nächsten Wartungstermin berechnen</label></div><div /></div>
        <button className="button" type="submit">{job?"Serviceauftrag abschließen":"Serviceeintrag speichern"}</button>
      </form>
    </section>
  </div></main>;
}
