import { createHash } from "node:crypto";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dateOnlyAsDate } from "@/lib/date";
import { query } from "@/lib/db";
import { BUSINESS_TIME_ZONE } from "@/lib/timezone";
import styles from "@/app/service-report.module.css";
import { getLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false, nocache: true } };

type SharedReport={
  share_id:string;event_id:string;asset_name:string;category:string;manufacturer:string|null;model:string|null;serial_number:string|null;location:string|null;public_id:string;next_service_date:string|null;
  title:string;event_type:string;event_date:string;description:string|null;provider:string|null;cost_cents:number|null;created_by_name:string|null;created_at:string;
  labor_minutes:number|null;parts_used:string|null;measurements:string|null;findings:string|null;recommendation:string|null;customer_name:string|null;customer_signature:string|null;customer_signed_at:string|null;
  report_customer_name:string|null;report_customer_contact_name:string|null;report_customer_street:string|null;report_customer_postal_code:string|null;report_customer_city:string|null;report_customer_country:string|null;
};
function formatDate(value:string|null,en:boolean){const d=dateOnlyAsDate(value);return d?new Intl.DateTimeFormat(en?"en-US":"de-DE",{dateStyle:"long",timeZone:BUSINESS_TIME_ZONE}).format(d):"—";}
function formatDateTime(value:string|null,en:boolean){return value?new Intl.DateTimeFormat(en?"en-US":"de-DE",{dateStyle:"medium",timeStyle:"short",timeZone:BUSINESS_TIME_ZONE}).format(new Date(value)):"—";}
function money(value:number|null,en:boolean){return value===null?"—":new Intl.NumberFormat(en?"en-US":"de-DE",{style:"currency",currency:"EUR"}).format(value/100);}
function labor(value:number|null,en:boolean){if(value===null)return"—";const h=Math.floor(value/60),m=value%60;return h?`${h} ${en?"hr":"Std."}${m?` ${m} ${en?"min":"Min."}`:""}`:`${m} ${en?"min":"Min."}`;}
function typeLabel(value:string,en:boolean){if(value==="SERVICE")return en?"Service / maintenance":"Service / Wartung";if(value==="REPAIR")return en?"Repair / restoration":"Reparatur / Instandsetzung";if(value==="INSPECTION")return en?"Check / inspection":"Prüfung / Inspektion";return en?"Service report":"Einsatzbericht";}

export default async function SharedReportPage({params}:{params:Promise<{token:string}>}){
  const {token}=await params;
  const en=(await getLocale())==="en";
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
  const blocks=[[en?"Work performed":"Durchgeführte Arbeiten",report.description],[en?"Parts / materials used":"Verbaute Teile / Material",report.parts_used],[en?"Measurements / test data":"Messwerte / Prüfdaten",report.measurements],[en?"Findings / defects":"Feststellungen / Mängel",report.findings],[en?"Recommendation / next steps":"Empfehlung / weitere Maßnahmen",report.recommendation]] as const;
  return <main className={styles.page}><article className={styles.sheet}>
    <header className={styles.head}><div><div className={styles.brand}>NavoPass</div><h1 className={styles.title}>{typeLabel(report.event_type,en)} – {en?"Report":"Bericht"}</h1><div className={styles.muted}>{report.title}</div></div><div className={styles.meta}><b>{en?"Record":"Protokoll"} {reportNumber}</b><br/>{en?"Date":"Datum"}: {formatDate(report.event_date,en)}<br/>{en?"Asset pass":"Objektpass"}: #{report.public_id}</div></header>
    <section className={styles.grid}><div className={styles.box}><h2>{en?"Asset / device":"Objekt / Gerät"}</h2><dl className={styles.data}><div><dt>{en?"Name":"Bezeichnung"}</dt><dd>{report.asset_name}</dd></div><div><dt>{en?"Category":"Kategorie"}</dt><dd>{report.category}</dd></div><div><dt>{en?"Manufacturer":"Hersteller"}</dt><dd>{report.manufacturer||"—"}</dd></div><div><dt>{en?"Model / type":"Modell / Typ"}</dt><dd>{report.model||"—"}</dd></div><div><dt>{en?"Serial / inventory no.":"Serien-/Inventarnummer"}</dt><dd>{report.serial_number||"—"}</dd></div><div><dt>{en?"Location":"Standort"}</dt><dd>{report.location||"—"}</dd></div><div><dt>{en?"Next service / inspection":"Nächster Service / Prüfung"}</dt><dd>{formatDate(report.next_service_date,en)}</dd></div></dl></div>
    <div className={styles.box}><h2>{en?"Customer / service":"Kunde / Ausführung"}</h2><dl className={styles.data}><div><dt>{en?"Customer / location":"Kunde / Standort"}</dt><dd>{report.report_customer_name||"—"}</dd></div><div><dt>{en?"Contact":"Ansprechpartner"}</dt><dd>{report.report_customer_contact_name||"—"}</dd></div><div><dt>{en?"Address":"Adresse"}</dt><dd>{customerAddress||"—"}</dd></div><div><dt>{en?"Performed by":"Ausführende Person"}</dt><dd>{report.created_by_name||"—"}</dd></div><div><dt>{en?"Company / provider":"Betrieb / Anbieter"}</dt><dd>{report.provider||"—"}</dd></div><div><dt>{en?"Labor":"Arbeitszeit"}</dt><dd>{labor(report.labor_minutes,en)}</dd></div><div><dt>{en?"Cost":"Kosten"}</dt><dd>{money(report.cost_cents,en)}</dd></div></dl></div></section>
    {blocks.map(([label,value])=><section className={styles.section} key={label}><h2>{label}</h2><div className={styles.description}>{value||(en?"No information documented.":"Keine Angaben dokumentiert.")}</div></section>)}
    <section className={styles.signature}><div className={styles.line}>{en?"Service person / company":"Ausführende Person / Betrieb"}</div><div>{report.customer_signature?<><img src={report.customer_signature} alt={en?"Customer confirmation":"Kundenbestätigung"} style={{maxWidth:"260px",maxHeight:"90px",display:"block",marginBottom:8}}/><div className={styles.line}>{report.customer_name||(en?"Customer / client":"Kunde / Auftraggeber")}{report.customer_signed_at?` · ${en?"confirmed":"bestätigt"} ${formatDateTime(report.customer_signed_at,en)}`:""}</div></>:<div className={styles.line}>{en?"Customer / client":"Kunde / Auftraggeber"}</div>}</div></section>
    <footer className={styles.footer}><span>{en?"Protected historical NavoPass report":"Geschützter historischer NavoPass-Bericht"} · {reportNumber}</span><span>{en?"This link is time-limited and not intended for search engines.":"Der Link ist zeitlich begrenzt und nicht für Suchmaschinen bestimmt."}</span></footer>
  </article></main>;
}
