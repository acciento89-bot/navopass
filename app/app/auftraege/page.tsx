import Link from "next/link";
import { cancelServiceJobAction, createServiceJobAction } from "@/app/actions/service-jobs";
import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/auth";
import { listAssets, roleCanManage } from "@/lib/assets";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type Job = {
  id:string; title:string; scheduled_for:string|null; notes:string|null; status:"OPEN"|"DONE"|"CANCELLED"; completed_event_id:string|null; created_at:string;
  asset_id:string; asset_name:string; public_id:string; customer_id:string|null; customer_name:string|null; customer_email:string|null; customer_city:string|null;
};
type Customer={id:string;name:string;city:string|null};
type Assignment={id:string;service_customer_id:string|null};

function when(value:string|null){return value?new Intl.DateTimeFormat("de-DE",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value)):"Ohne Termin";}
function statusLabel(value:Job["status"]){return value==="DONE"?"Erledigt":value==="CANCELLED"?"Storniert":"Offen";}

export default async function ServiceJobsPage({searchParams}:{searchParams:Promise<{success?:string;error?:string}>}){
  const user=await requireUser();
  const {success,error}=await searchParams;
  if(user.account_type!=="PROFESSIONAL") return <main className="app-page"><div className="container"><AppHeader name={user.name}/><section className="empty-state compact"><div className="empty-icon">A</div><h1>Serviceaufträge</h1><p>Der Auftragsbereich ist für Firmen- und Technikerprofile vorgesehen.</p><Link className="button" href="/app/profil">Profil auf beruflich umstellen</Link></section></div></main>;

  const assets=(await listAssets(user.id)).filter(a=>!a.archived_at&&roleCanManage(a,user.id));
  const assignments=assets.length?(await query<Assignment>("SELECT id,service_customer_id FROM assets WHERE id=ANY($1::uuid[])",[assets.map(a=>a.id)])).rows:[];
  const customerIds=[...new Set(assignments.map(a=>a.service_customer_id).filter((v):v is string=>Boolean(v)))];
  const customers=customerIds.length?(await query<Customer>("SELECT id,name,city FROM service_customers WHERE user_id=$1 AND id=ANY($2::uuid[]) ORDER BY name",[user.id,customerIds])).rows:[];
  const jobs=(await query<Job>(`
    SELECT j.id,j.title,j.scheduled_for,j.notes,j.status,j.completed_event_id,j.created_at,
           a.id AS asset_id,a.name AS asset_name,a.public_id,
           c.id AS customer_id,c.name AS customer_name,c.email AS customer_email,c.city AS customer_city
      FROM service_jobs j
      JOIN assets a ON a.id=j.asset_id
      LEFT JOIN service_customers c ON c.id=j.customer_id
     WHERE j.user_id=$1
     ORDER BY CASE j.status WHEN 'OPEN' THEN 0 WHEN 'DONE' THEN 1 ELSE 2 END,
              j.scheduled_for NULLS LAST,j.created_at DESC`,[user.id])).rows;

  return <main className="app-page"><div className="container"><AppHeader name={user.name}/>
    <section className="service-head"><div><span className="eyebrow">Kundendienst</span><h1>Serviceaufträge</h1><p>Von der Terminplanung über die Wartung bis zum unterschriebenen Bericht.</p></div><Link className="button ghost" href="/app/kunden">Kunden & Standorte</Link></section>
    {success&&<p className="form-success" role="status">{success}</p>}{error&&<p className="form-error" role="alert">{error}</p>}

    <section className="detail-grid"><article className="panel"><div className="panel-head"><div><span className="eyebrow">Planung</span><h2>Serviceauftrag anlegen</h2></div></div>
      {assets.length===0?<p className="muted">Noch keine verwaltbaren Anlagen vorhanden.</p>:<form action={createServiceJobAction} className="compact-form">
        <label>Anlage<select name="assetId" required>{assets.map(a=><option value={a.id} key={a.id}>{a.name} · {a.category}</option>)}</select></label>
        <label>Kunde / Standort<select name="customerId" defaultValue=""><option value="">Ohne Kundenzuordnung</option>{customers.map(c=><option value={c.id} key={c.id}>{c.name}{c.city?` · ${c.city}`:""}</option>)}</select></label>
        <label>Auftrag<input name="title" defaultValue="Wartung / Service" maxLength={180} required/></label>
        <label>Termin<input name="scheduledFor" type="datetime-local"/></label>
        <label>Auftragsnotiz<textarea name="notes" rows={3} maxLength={2000} placeholder="z. B. Kunde meldet Störung, jährliche Wartung, Ersatzteil mitbringen …"/></label>
        <button className="button" type="submit">Serviceauftrag anlegen</button>
      </form>}
    </article>
    <article className="panel"><div className="panel-head"><div><span className="eyebrow">Ablauf</span><h2>Digitaler Kundendienst</h2></div></div><p className="muted">1. Auftrag öffnen<br/>2. Wartung oder Reparatur erfassen<br/>3. Kunde unterschreibt direkt vor Ort<br/>4. Bericht/PDF wird erzeugt<br/>5. Bericht per geschütztem Link an den Kunden senden</p></article></section>

    <section className="panel"><div className="panel-head"><div><span className="eyebrow">Auftragsliste</span><h2>Offen & erledigt</h2></div><span className="count-pill">{jobs.length}</span></div>
      {jobs.length===0?<p className="muted">Noch keine Serviceaufträge angelegt.</p>:<div className="service-list">{jobs.map(job=><article className={`service-card ${job.status==="OPEN"?"warning":"neutral"}`} key={job.id}>
        <div className="service-date"><span>{statusLabel(job.status)}</span><b>{when(job.scheduled_for)}</b><small>{job.customer_name||"Ohne Kunde"}</small></div>
        <div className="service-main"><span className="asset-category">{job.customer_city||"Kundendienst"}</span><h2>{job.title}</h2><p>{job.asset_name}{job.notes?` · ${job.notes}`:""}</p></div>
        <div className="service-actions">{job.status==="OPEN"&&<><Link className="button small" href={`/app/assets/${job.asset_id}/service?job=${job.id}`}>Auftrag öffnen</Link><form action={cancelServiceJobAction}><input type="hidden" name="jobId" value={job.id}/><button className="button ghost small" type="submit">Stornieren</button></form></>}{job.status==="DONE"&&job.completed_event_id&&<Link className="button small" href={`/app/assets/${job.asset_id}/service/${job.completed_event_id}/bericht`}>Bericht öffnen</Link>}<Link className="button ghost small" href={`/app/assets/${job.asset_id}`}>Objektpass</Link></div>
      </article>)}</div>}
    </section>
  </div></main>;
}
