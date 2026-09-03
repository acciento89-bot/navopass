import Link from "next/link";
import { notFound } from "next/navigation";
import { sendServiceReportAction } from "@/app/actions/service-jobs";
import { revokeServiceReportShareAction } from "@/app/actions/service-report-shares";
import { PrintReportButton } from "@/components/print-report-button";
import { requireUser } from "@/lib/auth";
import { getOwnedAsset, roleCanManage } from "@/lib/assets";
import { ensureCustomerSchema } from "@/lib/customer-schema";
import { dateOnlyAsDate } from "@/lib/date";
import { query } from "@/lib/db";
import styles from "@/app/service-report.module.css";

export const dynamic = "force-dynamic";
type ServiceEvent={
  id:string;title:string;event_type:string;event_date:string;description:string|null;provider:string|null;cost_cents:number|null;created_by_name:string|null;created_at:string;
  labor_minutes:number|null;parts_used:string|null;measurements:string|null;findings:string|null;recommendation:string|null;customer_name:string|null;customer_signature:string|null;customer_signed_at:string|null;
  report_asset_name:string|null;report_asset_category:string|null;report_asset_manufacturer:string|null;report_asset_model:string|null;report_asset_serial_number:string|null;report_asset_location:string|null;report_asset_public_id:string|null;report_next_service_date:string|null;
  report_customer_name:string|null;report_customer_contact_name:string|null;report_customer_email:string|null;report_customer_street:string|null;report_customer_postal_code:string|null;report_customer_city:string|null;report_customer_country:string|null;
};
type Customer={name:string;contact_name:string|null;email:string|null;street:string|null;postal_code:string|null;city:string|null;country:string|null};
type ReportShare={id:string;created_by:string;recipient_email:string;created_at:string;opened_at:string|null;expires_at:string;revoked_at:string|null};
function formatDate(value:string|null){const d=dateOnlyAsDate(value);return d?new Intl.DateTimeFormat("de-DE",{dateStyle:"long"}).format(d):"—";}
function formatDateTime(value:string|null){return value?new Intl.DateTimeFormat("de-DE",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value)):"—";}
function typeLabel(value:string){if(value==="SERVICE")return"Wartung / Service";if(value==="REPAIR")return"Reparatur";if(value==="INSPECTION")return"Prüfung / Inspektion";return"Serviceeintrag";}
function money(value:number|null){return value===null?"—":new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(value/100);}
function labor(value:number|null){if(value===null)return"—";const h=Math.floor(value/60),m=value%60;return h?`${h} Std.${m?` ${m} Min.`:""}`:`${m} Min.`;}

export default async function ServiceReportPage({params,searchParams}:{params:Promise<{id:string;eventId:string}>;searchParams:Promise<{sent?:string;revoked?:string;error?:string}>}){
  const user=await requireUser(); const {id,eventId}=await params; const {sent,revoked,error}=await searchParams;
  const asset=await getOwnedAsset(user.id,id); if(!asset)notFound();
  const event=(await query<ServiceEvent>(`SELECT id,title,event_type,event_date,description,provider,cost_cents,created_by_name,created_at,labor_minutes,parts_used,measurements,findings,recommendation,customer_name,customer_signature,customer_signed_at,
    report_asset_name,report_asset_category,report_asset_manufacturer,report_asset_model,report_asset_serial_number,report_asset_location,report_asset_public_id,report_next_service_date,
    report_customer_name,report_customer_contact_name,report_customer_email,report_customer_street,report_customer_postal_code,report_customer_city,report_customer_country
    FROM asset_events WHERE id=$1 AND asset_id=$2 AND event_type IN ('SERVICE','REPAIR','INSPECTION') LIMIT 1`,[eventId,asset.id])).rows[0]; if(!event)notFound();
  await ensureCustomerSchema();
  const currentCustomer=(await query<Customer>(`SELECT c.name,c.contact_name,c.email,c.street,c.postal_code,c.city,c.country FROM assets a LEFT JOIN service_customers c ON c.id=a.service_customer_id WHERE a.id=$1 AND (c.user_id=$2 OR c.id IS NULL) LIMIT 1`,[asset.id,user.id])).rows[0]??null;
  const customer={
    name:event.report_customer_name??currentCustomer?.name??null,
    contact_name:event.report_customer_contact_name??currentCustomer?.contact_name??null,
    email:event.report_customer_email??currentCustomer?.email??null,
    street:event.report_customer_street??currentCustomer?.street??null,
    postal_code:event.report_customer_postal_code??currentCustomer?.postal_code??null,
    city:event.report_customer_city??currentCustomer?.city??null,
    country:event.report_customer_country??currentCustomer?.country??null,
  };
  const customerAddress=[customer.street,[customer.postal_code,customer.city].filter(Boolean).join(" "),customer.country].filter(Boolean).join(", ");
  const reportNumber=`NP-${event.id.slice(0,8).toUpperCase()}`;
  const reportAsset={
    name:event.report_asset_name??asset.name,
    category:event.report_asset_category??asset.category,
    manufacturer:event.report_asset_manufacturer??asset.manufacturer,
    model:event.report_asset_model??asset.model,
    serial_number:event.report_asset_serial_number??asset.serial_number,
    location:event.report_asset_location??asset.location,
    public_id:event.report_asset_public_id??asset.public_id,
    next_service_date:event.report_next_service_date??asset.next_service_date,
  };
  const manageable=roleCanManage(asset,user.id);
  const shares=(await query<ReportShare>(
    manageable
      ? "SELECT id,created_by,recipient_email,created_at,opened_at,expires_at,revoked_at FROM service_report_shares WHERE event_id=$1 AND asset_id=$2 ORDER BY created_at DESC LIMIT 20"
      : "SELECT id,created_by,recipient_email,created_at,opened_at,expires_at,revoked_at FROM service_report_shares WHERE event_id=$1 AND asset_id=$2 AND created_by=$3 ORDER BY created_at DESC LIMIT 20",
    manageable?[event.id,asset.id]:[event.id,asset.id,user.id]
  )).rows;
  const detailBlocks=[["Durchgeführte Arbeiten",event.description],["Verbaute Teile / Material",event.parts_used],["Messwerte",event.measurements],["Mängel / Feststellungen",event.findings],["Empfehlung / weitere Maßnahmen",event.recommendation]] as const;
  return <main className={styles.page}><div className={styles.toolbar}><Link className="button ghost" href="/app/auftraege">← Serviceaufträge</Link><PrintReportButton /></div>
    <div style={{maxWidth:920,margin:"0 auto 16px"}}>{sent&&<p className="form-success"><b>Bericht versendet.</b> Der Kunde hat einen geschützten, 30 Tage gültigen Link erhalten.</p>}{revoked&&<p className="form-success"><b>Freigabe widerrufen.</b> Der bisherige Kundenlink ist nicht mehr gültig.</p>}{error&&<p className="form-error">{error}</p>}
      <form action={sendServiceReportAction} className="panel" style={{display:"flex",gap:10,alignItems:"end",flexWrap:"wrap"}}><input type="hidden" name="assetId" value={asset.id}/><input type="hidden" name="eventId" value={event.id}/><label style={{flex:"1 1 280px"}}>Bericht an Kunden senden<input name="recipientEmail" type="email" defaultValue={customer.email||""} placeholder="kunde@example.de" required/></label><button className="button" type="submit">Geschützten Bericht senden</button></form>
      {shares.length>0&&<section className="panel" style={{marginTop:12}}><div className="panel-head"><div><span className="eyebrow">Zustellung</span><h2>Versendete Bericht-Links</h2></div><span className="count-pill">{shares.length}</span></div><div className="timeline">{shares.map(share=>{const expired=new Date(share.expires_at).getTime()<=Date.now();const inactive=Boolean(share.revoked_at)||expired;return <div className="timeline-item" key={share.id}><span className="timeline-dot"></span><div style={{width:"100%"}}><div className="timeline-line"><b>{share.recipient_email}</b><span>{share.revoked_at?"Widerrufen":share.opened_at?"Geöffnet":expired?"Abgelaufen":"Gesendet"}</span></div><p>Gesendet {formatDateTime(share.created_at)} · {share.opened_at?`geöffnet ${formatDateTime(share.opened_at)}`:`noch nicht geöffnet`} · gültig bis {formatDateTime(share.expires_at)}</p>{!inactive&&(share.created_by===user.id||manageable)&&<form action={revokeServiceReportShareAction}><input type="hidden" name="assetId" value={asset.id}/><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="shareId" value={share.id}/><button className="button ghost small" type="submit">Link widerrufen</button></form>}</div></div>})}</div></section>}
    </div>
    <article className={styles.sheet}><header className={styles.head}><div><div className={styles.brand}>NavoPass</div><h1 className={styles.title}>{typeLabel(event.event_type)} – Protokoll</h1><div className={styles.muted}>{event.title}</div></div><div className={styles.meta}><b>Protokoll {reportNumber}</b><br/>Datum: {formatDate(event.event_date)}<br/>Objektpass: #{reportAsset.public_id}</div></header>
      <section className={styles.grid}><div className={styles.box}><h2>Anlage / Gerät</h2><dl className={styles.data}><div><dt>Bezeichnung</dt><dd>{reportAsset.name}</dd></div><div><dt>Kategorie</dt><dd>{reportAsset.category}</dd></div><div><dt>Hersteller</dt><dd>{reportAsset.manufacturer||"—"}</dd></div><div><dt>Modell / Typ</dt><dd>{reportAsset.model||"—"}</dd></div><div><dt>Seriennummer</dt><dd>{reportAsset.serial_number||"—"}</dd></div><div><dt>Standort</dt><dd>{reportAsset.location||"—"}</dd></div><div><dt>Nächste Wartung</dt><dd>{formatDate(reportAsset.next_service_date)}</dd></div></dl></div><div className={styles.box}><h2>Kunde / Ausführung</h2><dl className={styles.data}><div><dt>Kunde / Standort</dt><dd>{customer.name||"—"}</dd></div><div><dt>Ansprechpartner</dt><dd>{customer.contact_name||"—"}</dd></div><div><dt>Adresse</dt><dd>{customerAddress||"—"}</dd></div><div><dt>Techniker / Konto</dt><dd>{event.created_by_name||"—"}</dd></div><div><dt>Ausgeführt durch</dt><dd>{event.provider||"—"}</dd></div><div><dt>Arbeitszeit</dt><dd>{labor(event.labor_minutes)}</dd></div><div><dt>Kosten</dt><dd>{money(event.cost_cents)}</dd></div></dl></div></section>
      {detailBlocks.map(([label,value])=><section className={styles.section} key={label}><h2>{label}</h2><div className={styles.description}>{value||"Keine Angaben dokumentiert."}</div></section>)}
      <section className={styles.signature}><div className={styles.line}>Techniker / ausführender Betrieb</div><div>{event.customer_signature?<><img src={event.customer_signature} alt="Gespeicherte Kundenunterschrift" style={{maxWidth:"260px",maxHeight:"90px",display:"block",marginBottom:8}}/><div className={styles.line}>{event.customer_name||"Kunde / Auftraggeber"}{event.customer_signed_at?` · bestätigt ${new Intl.DateTimeFormat("de-DE",{dateStyle:"medium",timeStyle:"short"}).format(new Date(event.customer_signed_at))}`:""}</div></>:<div className={styles.line}>Kunde / Auftraggeber</div>}</div></section>
      <footer className={styles.footer}><span>Historischer NavoPass-Servicebericht · {reportNumber}</span><span>Gespeichert am {new Intl.DateTimeFormat("de-DE",{dateStyle:"medium",timeStyle:"short"}).format(new Date(event.created_at))}</span></footer>
    </article></main>;
}
