import Link from "next/link";
import { notFound } from "next/navigation";
import { sendServiceReportAction } from "@/app/actions/service-jobs";
import { PrintReportButton } from "@/components/print-report-button";
import { requireUser } from "@/lib/auth";
import { getOwnedAsset } from "@/lib/assets";
import { ensureCustomerSchema } from "@/lib/customer-schema";
import { dateOnlyAsDate } from "@/lib/date";
import { query } from "@/lib/db";
import styles from "@/app/service-report.module.css";

export const dynamic = "force-dynamic";
type ServiceEvent={id:string;title:string;event_type:string;event_date:string;description:string|null;provider:string|null;cost_cents:number|null;created_by_name:string|null;created_at:string;labor_minutes:number|null;parts_used:string|null;measurements:string|null;findings:string|null;recommendation:string|null;customer_name:string|null;customer_signature:string|null;customer_signed_at:string|null};
type Customer={name:string;contact_name:string|null;email:string|null;street:string|null;postal_code:string|null;city:string|null;country:string|null};
function formatDate(value:string|null){const d=dateOnlyAsDate(value);return d?new Intl.DateTimeFormat("de-DE",{dateStyle:"long"}).format(d):"—";}
function typeLabel(value:string){if(value==="SERVICE")return"Wartung / Service";if(value==="REPAIR")return"Reparatur";if(value==="INSPECTION")return"Prüfung / Inspektion";return"Serviceeintrag";}
function money(value:number|null){return value===null?"—":new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(value/100);}
function labor(value:number|null){if(value===null)return"—";const h=Math.floor(value/60),m=value%60;return h?`${h} Std.${m?` ${m} Min.`:""}`:`${m} Min.`;}

export default async function ServiceReportPage({params,searchParams}:{params:Promise<{id:string;eventId:string}>;searchParams:Promise<{sent?:string;error?:string}>}){
  const user=await requireUser(); const {id,eventId}=await params; const {sent,error}=await searchParams;
  const asset=await getOwnedAsset(user.id,id); if(!asset)notFound();
  const event=(await query<ServiceEvent>(`SELECT id,title,event_type,event_date,description,provider,cost_cents,created_by_name,created_at,labor_minutes,parts_used,measurements,findings,recommendation,customer_name,customer_signature,customer_signed_at FROM asset_events WHERE id=$1 AND asset_id=$2 AND event_type IN ('SERVICE','REPAIR','INSPECTION') LIMIT 1`,[eventId,asset.id])).rows[0]; if(!event)notFound();
  await ensureCustomerSchema();
  const customer=(await query<Customer>(`SELECT c.name,c.contact_name,c.email,c.street,c.postal_code,c.city,c.country FROM assets a LEFT JOIN service_customers c ON c.id=a.service_customer_id WHERE a.id=$1 AND (c.user_id=$2 OR c.id IS NULL) LIMIT 1`,[asset.id,user.id])).rows[0]??null;
  const customerAddress=customer?[customer.street,[customer.postal_code,customer.city].filter(Boolean).join(" "),customer.country].filter(Boolean).join(", "):"";
  const reportNumber=`NP-${event.id.slice(0,8).toUpperCase()}`;
  const detailBlocks=[["Durchgeführte Arbeiten",event.description],["Verbaute Teile / Material",event.parts_used],["Messwerte",event.measurements],["Mängel / Feststellungen",event.findings],["Empfehlung / weitere Maßnahmen",event.recommendation]] as const;
  return <main className={styles.page}><div className={styles.toolbar}><Link className="button ghost" href="/app/auftraege">← Serviceaufträge</Link><PrintReportButton /></div>
    <div style={{maxWidth:920,margin:"0 auto 16px"}}>{sent&&<p className="form-success"><b>Bericht versendet.</b> Der Kunde hat einen geschützten, 30 Tage gültigen Link erhalten.</p>}{error&&<p className="form-error">{error}</p>}
      <form action={sendServiceReportAction} className="panel" style={{display:"flex",gap:10,alignItems:"end",flexWrap:"wrap"}}><input type="hidden" name="assetId" value={asset.id}/><input type="hidden" name="eventId" value={event.id}/><label style={{flex:"1 1 280px"}}>Bericht an Kunden senden<input name="recipientEmail" type="email" defaultValue={customer?.email||""} placeholder="kunde@example.de" required/></label><button className="button" type="submit">Geschützten Bericht senden</button></form></div>
    <article className={styles.sheet}><header className={styles.head}><div><div className={styles.brand}>NavoPass</div><h1 className={styles.title}>{typeLabel(event.event_type)} – Protokoll</h1><div className={styles.muted}>{event.title}</div></div><div className={styles.meta}><b>Protokoll {reportNumber}</b><br/>Datum: {formatDate(event.event_date)}<br/>Objektpass: #{asset.public_id}</div></header>
      <section className={styles.grid}><div className={styles.box}><h2>Anlage / Gerät</h2><dl className={styles.data}><div><dt>Bezeichnung</dt><dd>{asset.name}</dd></div><div><dt>Kategorie</dt><dd>{asset.category}</dd></div><div><dt>Hersteller</dt><dd>{asset.manufacturer||"—"}</dd></div><div><dt>Modell / Typ</dt><dd>{asset.model||"—"}</dd></div><div><dt>Seriennummer</dt><dd>{asset.serial_number||"—"}</dd></div><div><dt>Standort</dt><dd>{asset.location||"—"}</dd></div><div><dt>Nächste Wartung</dt><dd>{formatDate(asset.next_service_date)}</dd></div></dl></div><div className={styles.box}><h2>Kunde / Ausführung</h2><dl className={styles.data}><div><dt>Kunde / Standort</dt><dd>{customer?.name||"—"}</dd></div><div><dt>Ansprechpartner</dt><dd>{customer?.contact_name||"—"}</dd></div><div><dt>Adresse</dt><dd>{customerAddress||"—"}</dd></div><div><dt>Techniker / Konto</dt><dd>{event.created_by_name||"—"}</dd></div><div><dt>Ausgeführt durch</dt><dd>{event.provider||"—"}</dd></div><div><dt>Arbeitszeit</dt><dd>{labor(event.labor_minutes)}</dd></div><div><dt>Kosten</dt><dd>{money(event.cost_cents)}</dd></div></dl></div></section>
      {detailBlocks.map(([label,value])=><section className={styles.section} key={label}><h2>{label}</h2><div className={styles.description}>{value||"Keine Angaben dokumentiert."}</div></section>)}
      <section className={styles.signature}><div className={styles.line}>Techniker / ausführender Betrieb</div><div>{event.customer_signature?<><img src={event.customer_signature} alt="Gespeicherte Kundenunterschrift" style={{maxWidth:"260px",maxHeight:"90px",display:"block",marginBottom:8}}/><div className={styles.line}>{event.customer_name||"Kunde / Auftraggeber"}{event.customer_signed_at?` · bestätigt ${new Intl.DateTimeFormat("de-DE",{dateStyle:"medium",timeStyle:"short"}).format(new Date(event.customer_signed_at))}`:""}</div></>:<div className={styles.line}>Kunde / Auftraggeber</div>}</div></section>
      <footer className={styles.footer}><span>Digital aus der NavoPass-Servicehistorie erzeugt · {reportNumber}</span><span>Gespeichert am {new Intl.DateTimeFormat("de-DE",{dateStyle:"medium",timeStyle:"short"}).format(new Date(event.created_at))}</span></footer>
    </article></main>;
}
