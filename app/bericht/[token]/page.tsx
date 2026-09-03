import { createHash } from "node:crypto";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dateOnlyAsDate } from "@/lib/date";
import { query } from "@/lib/db";
import { BUSINESS_TIME_ZONE } from "@/lib/timezone";
import styles from "@/app/service-report.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false, nocache: true } };

type SharedReport={
  share_id:string;event_id:string;asset_name:string;category:string;manufacturer:string|null;model:string|null;serial_number:string|null;location:string|null;public_id:string;next_service_date:string|null;
  title:string;event_type:string;event_date:string;description:string|null;provider:string|null;cost_cents:number|null;created_by_name:string|null;created_at:string;
  labor_minutes:number|null;parts_used:string|null;measurements:string|null;findings:string|null;recommendation:string|null;customer_name:string|null;customer_signature:string|null;customer_signed_at:string|null;
  report_customer_name:string|null;report_customer_contact_name:string|null;report_customer_street:string|null;report_customer_postal_code:string|null;report_customer_city:string|null;report_customer_country:string|null;
};
function formatDate(value:string|null){const d=dateOnlyAsDate(value);return d?new Intl.DateTimeFormat("de-DE",{dateStyle:"long",timeZone:BUSINESS_TIME_ZONE}).format(d):"—";}
function formatDateTime(value:string|null){return value?new Intl.DateTimeFormat("de-DE",{dateStyle:"medium",timeStyle:"short",timeZone:BUSINESS_TIME_ZONE}).format(new Date(value)):"—";}
function money(value:number|null){return value===null?"—":new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(value/100);}
function labor(value:number|null){if(value===null)return"—";const h=Math.floor(value/60),m=value%60;return h?`${h} Std.${m?` ${m} Min.`:""}`:`${m} Min.`;}
function typeLabel(value:string){if(value==="SERVICE")return"Service / Wartung";if(value==="REPAIR")return"Reparatur / Instandsetzung";if(value==="INSPECTION")return"Prüfung / Inspektion";return"Einsatzbericht";}

export default async function SharedReportPage({params}:{params:Promise<{token:string}>}){
  const {token}=await params;
  if(!token||token.length<20)notFound();
  const hash=createHash("sha256").update(token).digest("hex");
  const report=(await query<SharedReport>(`
    SELECT s.id AS share_id,e.id AS event_id,
           COALESCE(e.report_asset_name,a.name) AS asset_name,
           COALESCE(e.report_asset_category,a.category) AS category,
           COALESCE(e.report_asset_manufacturer,a.manufacturer) AS manufacturer,
           COALESCE(e.report_asset_model,a.model) AS model,
           COALESCE(e.report_asset_serial_number,a.serial_number) AS serial_number,
           COALESCE(e.report_asset_location,a.location) AS location,
           COALESCE(e.report_asset_public_id,a.public_id) AS public_id,
           COALESCE(e.report_next_service_date,a.next_service_date) AS next_service_date,
           e.title,e.event_type,e.event_date,e.description,e.provider,e.cost_cents,e.created_by_name,e.created_at,
           e.labor_minutes,e.parts_used,e.measurements,e.findings,e.recommendation,e.customer_name,e.customer_signature,e.customer_signed_at,
           e.report_customer_name,e.report_customer_contact_name,e.report_customer_street,e.report_customer_postal_code,e.report_customer_city,e.report_customer_country
      FROM service_report_shares s
      JOIN assets a ON a.id=s.asset_id
      JOIN asset_events e ON e.id=s.event_id AND e.asset_id=a.id
     WHERE s.token_hash=$1 AND s.expires_at>now() AND s.revoked_at IS NULL
     LIMIT 1`,[hash])).rows[0];
  if(!report)notFound();
  await query("UPDATE service_report_shares SET opened_at=COALESCE(opened_at,now()) WHERE id=$1 AND revoked_at IS NULL",[report.share_id]);
  const reportNumber=`NP-${report.event_id.slice(0,8).toUpperCase()}`;
  const customerAddress=[report.report_customer_street,[report.report_customer_postal_code,report.report_customer_city].filter(Boolean).join(" "),report.report_customer_country].filter(Boolean).join(", ");
  const blocks=[["Durchgeführte Arbeiten",report.description],["Verbaute Teile / Material",report.parts_used],["Messwerte / Prüfdaten",report.measurements],["Feststellungen / Mängel",report.findings],["Empfehlung / weitere Maßnahmen",report.recommendation]] as const;
  return <main className={styles.page}><article className={styles.sheet}>
    <header className={styles.head}><div><div className={styles.brand}>NavoPass</div><h1 className={styles.title}>{typeLabel(report.event_type)} – Bericht</h1><div className={styles.muted}>{report.title}</div></div><div className={styles.meta}><b>Protokoll {reportNumber}</b><br/>Datum: {formatDate(report.event_date)}<br/>Objektpass: #{report.public_id}</div></header>
    <section className={styles.grid}><div className={styles.box}><h2>Objekt / Gerät</h2><dl className={styles.data}><div><dt>Bezeichnung</dt><dd>{report.asset_name}</dd></div><div><dt>Kategorie</dt><dd>{report.category}</dd></div><div><dt>Hersteller</dt><dd>{report.manufacturer||"—"}</dd></div><div><dt>Modell / Typ</dt><dd>{report.model||"—"}</dd></div><div><dt>Serien-/Inventarnummer</dt><dd>{report.serial_number||"—"}</dd></div><div><dt>Standort</dt><dd>{report.location||"—"}</dd></div><div><dt>Nächster Service / Prüfung</dt><dd>{formatDate(report.next_service_date)}</dd></div></dl></div>
    <div className={styles.box}><h2>Kunde / Ausführung</h2><dl className={styles.data}><div><dt>Kunde / Standort</dt><dd>{report.report_customer_name||"—"}</dd></div><div><dt>Ansprechpartner</dt><dd>{report.report_customer_contact_name||"—"}</dd></div><div><dt>Adresse</dt><dd>{customerAddress||"—"}</dd></div><div><dt>Ausführende Person</dt><dd>{report.created_by_name||"—"}</dd></div><div><dt>Betrieb / Anbieter</dt><dd>{report.provider||"—"}</dd></div><div><dt>Arbeitszeit</dt><dd>{labor(report.labor_minutes)}</dd></div><div><dt>Kosten</dt><dd>{money(report.cost_cents)}</dd></div></dl></div></section>
    {blocks.map(([label,value])=><section className={styles.section} key={label}><h2>{label}</h2><div className={styles.description}>{value||"Keine Angaben dokumentiert."}</div></section>)}
    <section className={styles.signature}><div className={styles.line}>Ausführende Person / Betrieb</div><div>{report.customer_signature?<><img src={report.customer_signature} alt="Kundenbestätigung" style={{maxWidth:"260px",maxHeight:"90px",display:"block",marginBottom:8}}/><div className={styles.line}>{report.customer_name||"Kunde / Auftraggeber"}{report.customer_signed_at?` · bestätigt ${formatDateTime(report.customer_signed_at)}`:""}</div></>:<div className={styles.line}>Kunde / Auftraggeber</div>}</div></section>
    <footer className={styles.footer}><span>Geschützter historischer NavoPass-Bericht · {reportNumber}</span><span>Der Link ist zeitlich begrenzt und nicht für Suchmaschinen bestimmt.</span></footer>
  </article></main>;
}
