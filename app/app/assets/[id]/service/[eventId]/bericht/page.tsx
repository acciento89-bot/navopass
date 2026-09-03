import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintReportButton } from "@/components/print-report-button";
import { requireUser } from "@/lib/auth";
import { getOwnedAsset } from "@/lib/assets";
import { ensureCustomerSchema } from "@/lib/customer-schema";
import { dateOnlyAsDate } from "@/lib/date";
import { query } from "@/lib/db";
import styles from "@/app/service-report.module.css";

export const dynamic = "force-dynamic";

type ServiceEvent = {
  id: string;
  title: string;
  event_type: string;
  event_date: string;
  description: string | null;
  provider: string | null;
  cost_cents: number | null;
  created_by_name: string | null;
  created_at: string;
};

type Customer = {
  name: string;
  contact_name: string | null;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
};

function formatDate(value: string | null) {
  const parsed = dateOnlyAsDate(value);
  return parsed ? new Intl.DateTimeFormat("de-DE", { dateStyle: "long" }).format(parsed) : "—";
}

function typeLabel(value: string) {
  if (value === "SERVICE") return "Wartung / Service";
  if (value === "REPAIR") return "Reparatur";
  if (value === "INSPECTION") return "Prüfung / Inspektion";
  return "Serviceeintrag";
}

function money(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value / 100);
}

export default async function ServiceReportPage({ params }: { params: Promise<{ id: string; eventId: string }> }) {
  const user = await requireUser();
  const { id, eventId } = await params;
  const asset = await getOwnedAsset(user.id, id);
  if (!asset) notFound();

  const event = (await query<ServiceEvent>(
    `SELECT id,title,event_type,event_date,description,provider,cost_cents,created_by_name,created_at
       FROM asset_events
      WHERE id=$1 AND asset_id=$2 AND event_type IN ('SERVICE','REPAIR','INSPECTION')
      LIMIT 1`,
    [eventId, asset.id]
  )).rows[0];
  if (!event) notFound();

  await ensureCustomerSchema();
  const customer = (await query<Customer>(`
    SELECT c.name,c.contact_name,c.street,c.postal_code,c.city,c.country
      FROM assets a
      LEFT JOIN service_customers c ON c.id=a.service_customer_id
     WHERE a.id=$1 AND (c.user_id=$2 OR c.id IS NULL)
     LIMIT 1`, [asset.id, user.id])).rows[0] ?? null;

  const customerAddress = customer
    ? [customer.street, [customer.postal_code, customer.city].filter(Boolean).join(" "), customer.country].filter(Boolean).join(", ")
    : "";
  const company = user.account_type === "PROFESSIONAL" ? user.company_name : null;
  const reportNumber = `NP-${event.id.slice(0, 8).toUpperCase()}`;

  return <main className={styles.page}>
    <div className={styles.toolbar}>
      <Link className="button ghost" href={`/app/assets/${asset.id}`}>← Zum Objektpass</Link>
      <PrintReportButton />
    </div>

    <article className={styles.sheet}>
      <header className={styles.head}>
        <div>
          <div className={styles.brand}>NavoPass</div>
          <h1 className={styles.title}>{typeLabel(event.event_type)} – Protokoll</h1>
          <div className={styles.muted}>{event.title}</div>
        </div>
        <div className={styles.meta}>
          <b>Protokoll {reportNumber}</b><br />
          Datum: {formatDate(event.event_date)}<br />
          Objektpass: #{asset.public_id}
        </div>
      </header>

      <section className={styles.grid}>
        <div className={styles.box}>
          <h2>Anlage / Gerät</h2>
          <dl className={styles.data}>
            <div><dt>Bezeichnung</dt><dd>{asset.name}</dd></div>
            <div><dt>Kategorie</dt><dd>{asset.category}</dd></div>
            <div><dt>Hersteller</dt><dd>{asset.manufacturer || "—"}</dd></div>
            <div><dt>Modell / Typ</dt><dd>{asset.model || "—"}</dd></div>
            <div><dt>Seriennummer</dt><dd>{asset.serial_number || "—"}</dd></div>
            <div><dt>Standort</dt><dd>{asset.location || "—"}</dd></div>
            <div><dt>Nächste Wartung</dt><dd>{formatDate(asset.next_service_date)}</dd></div>
          </dl>
        </div>

        <div className={styles.box}>
          <h2>Kunde / Ausführung</h2>
          <dl className={styles.data}>
            <div><dt>Kunde / Standort</dt><dd>{customer?.name || "—"}</dd></div>
            <div><dt>Ansprechpartner</dt><dd>{customer?.contact_name || "—"}</dd></div>
            <div><dt>Adresse</dt><dd>{customerAddress || "—"}</dd></div>
            <div><dt>Firma</dt><dd>{company || "—"}</dd></div>
            <div><dt>Techniker</dt><dd>{event.created_by_name || user.name}</dd></div>
            <div><dt>Ausgeführt durch</dt><dd>{event.provider || "—"}</dd></div>
            <div><dt>Kosten</dt><dd>{money(event.cost_cents)}</dd></div>
          </dl>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Durchgeführte Arbeiten / Messwerte / Bemerkungen</h2>
        <div className={styles.description}>{event.description || "Keine weiteren Angaben dokumentiert."}</div>
      </section>

      <section className={styles.signature}>
        <div className={styles.line}>Techniker / ausführender Betrieb</div>
        <div className={styles.line}>Kunde / Auftraggeber</div>
      </section>

      <footer className={styles.footer}>
        <span>Digital aus der NavoPass-Servicehistorie erzeugt · {reportNumber}</span>
        <span>Erstellt am {new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date())}</span>
      </footer>
    </article>
  </main>;
}
