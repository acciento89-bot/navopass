import { createHash } from "node:crypto";
import { notFound } from "next/navigation";
import { dateOnlyAsDate } from "@/lib/date";
import { query } from "@/lib/db";
import styles from "@/app/service-report.module.css";

export const dynamic = "force-dynamic";

type SharedReport={
  share_id:string; asset_name:string; category:string; manufacturer:string|null; model:string|null; serial_number:string|null; location:string|null; public_id:string; next_service_date:string|null;
  title:string; event_type:string; event_date:string; description:string|null; provider:string|null; cost_cents:number|null; created_by_name:string|null; created_at:string;
  labor_minutes:number|null; parts_used:string|null; measurements:string|null; findings:string|null; recommendation:string|null; customer_name:string|null; customer_signature:string|null; customer_signed_at:string|null;
};
function formatDate(value:string|null){const d=dateOnlyAsDate(value);return d?new Intl.DateTimeFormat("de-DE",{dateStyle:"long"}).format(d):"—";}
function money(value:number|null){return value===null?"—":new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(value/100);}
function labor(value:number|null){if(value===null)return"—";const h=Math.floor(value/60),m=value%60;return h?`${h} Std.${m?` ${m} Min.`:""}`:`${m} Min.`;}
function typeLabel(value:string){if(value==="SERVICE")return"Wartung / Service";if(value==="REPAIR")return"Reparatur";if(value==="INSPECTION")return"Prüfung / Inspektion";return"Servicebericht";}

export default async function SharedReportPage({params}:{params:Promise<{token:string}>}){
  const {token}=await params;
  if(!token||token.length<20)notFound();
  const hash=createHash("sha256").update(token).digest("hex");
  const report=(await query<SharedReport>(`
    SELECT s.id AS share_id,a.name AS asset_name,a.category,a.manufacturer,a.model,a.serial_number,a.location,a.public_id,a.next_service_date,
           e.title,e.event_type,e.event_date,e.description,e.provider,e.cost_cents,e.created_by_name,e.created_at,e.labor_minutes,e.parts_used,e.measurements,e.findings,e.recommendation,e.customer_name,e.customer_signature,e.customer_signed_at
      FROM service_report_shares s
      JOIN assets a ON a.id=s.asset_id
      JOIN asset_events e ON e.id=s.event_id AND e.asset_id=a.id
     WHERE s.token_hash=$1 AND s.expires_at>now()
     LIMIT 1`,[hash])).rows[0];
  if(!report)notFound();
  await query("UPDATE service_report_shares SET opened_at=COALESCE(opened_at,now()) WHERE id=$1",[report.share_id]);
  const reportNumber=`NP-${report.share_id.slice(0,8).toUpperCase()}`;
  const blocks=[["Durchgeführte Arbeiten",report.description],["Verbaute Teile / Material",report.parts_used],["Messwerte",report.measurements],["Mängel / Feststellungen",report.findings],["Empfehlung / weitere Maßnahmen",report.recommendation]] as const;
  return <main className={styles.page}><article className={styles.sheet}>
    <header className={styles.head}><div><div className={styles.brand}>NavoPass</div><h1 className={styles.title}>{typeLabel(report.event_type)} – Bericht</h1><div className={styles.muted}>{report.title}</div></div><div className={styles.meta}><b>{reportNumber}</b><br/>Datum: {formatDate(report.event_date)}<br/>Objektpass: #{report.public_id}</div></header>
    <section className={styles.grid}><div className={styles.box}><h2>Anlage / Gerät</h2><dl className={styles.data}><div><dt>Bezeichnung</dt><dd>{report.asset_name}</dd></div><div><dt>Kategorie</dt><dd>{report.category}</dd></div><div><dt>Hersteller</dt><dd>{report.manufacturer||"—"}</dd></div><div><dt>Modell / Typ</dt><dd>{report.model||"—"}</dd></div><div><dt>Seriennummer</dt><dd>{report.serial_number||"—"}</dd></div><div><dt>Standort</dt><dd>{report.location||"—"}</dd></div><div><dt>Nächste Wartung</dt><dd>{formatDate(report.next_service_date)}</dd></div></dl></div>
    <div className={styles.box}><h2>Ausführung</h2><dl className={styles.data}><div><dt>Techniker / Konto</dt><dd>{report.created_by_name||"—"}</dd></div><div><dt>Ausgeführt durch</dt><dd>{report.provider||"—"}</dd></div><div><dt>Arbeitszeit</dt><dd>{labor(report.labor_minutes)}</dd></div><div><dt>Kosten</dt><dd>{money(report.cost_cents)}</dd></div></dl></div></section>
    {blocks.map(([label,value])=><section className={styles.section} key={label}><h2>{label}</h2><div className={styles.description}>{value||"Keine Angaben dokumentiert."}</div></section>)}
    <section className={styles.signature}><div className={styles.line}>Techniker / ausführender Betrieb</div><div>{report.customer_signature?<><img src={report.customer_signature} alt="Kundenunterschrift" style={{maxWidth:"260px",maxHeight:"90px",display:"block",marginBottom:8}}/><div className={styles.line}>{report.customer_name||"Kunde / Auftraggeber"}{report.customer_signed_at?` · bestätigt ${new Intl.DateTimeFormat("de-DE",{dateStyle:"medium",timeStyle:"short"}).format(new Date(report.customer_signed_at))}`:""}</div></>:<div className={styles.line}>Kunde / Auftraggeber</div>}</div></section>
    <footer className={styles.footer}><span>Geschützter NavoPass-Servicebericht · {reportNumber}</span><span>Der Link ist zeitlich begrenzt.</span></footer>
  </article></main>;
}
