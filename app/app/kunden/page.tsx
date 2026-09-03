import Link from "next/link";
import { assignAssetToCustomerAction, createCustomerAction, deleteCustomerAction } from "@/app/actions/customers";
import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/auth";
import { ensureCustomerSchema } from "@/lib/customer-schema";
import { listAssets, roleCanManage } from "@/lib/assets";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type Customer = {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  country: string;
  notes: string | null;
  asset_count: number;
  overdue_count: number;
  due_30_count: number;
  unplanned_count: number;
};

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const user = await requireUser();
  const { success, error } = await searchParams;
  if (user.account_type !== "PROFESSIONAL") {
    return <main className="app-page"><div className="container"><AppHeader name={user.name} /><section className="empty-state compact"><div className="empty-icon">K</div><h1>Kunden & Standorte</h1><p>Dieser Bereich ist für Firmen- und Technikerprofile vorgesehen.</p><Link className="button" href="/app/profil">Profil auf beruflich umstellen</Link></section></div></main>;
  }

  await ensureCustomerSchema();
  const customers = (await query<Customer>(`
    SELECT c.id,c.name,c.contact_name,c.email,c.phone,c.street,c.postal_code,c.city,c.country,c.notes,
           count(a.id)::int AS asset_count,
           count(a.id) FILTER (WHERE a.next_service_date < current_date)::int AS overdue_count,
           count(a.id) FILTER (WHERE a.next_service_date >= current_date AND a.next_service_date <= current_date + 30)::int AS due_30_count,
           count(a.id) FILTER (WHERE a.next_service_date IS NULL)::int AS unplanned_count
      FROM service_customers c
      LEFT JOIN assets a ON a.service_customer_id=c.id AND a.archived_at IS NULL
     WHERE c.user_id=$1
     GROUP BY c.id
     ORDER BY c.name ASC
  `, [user.id])).rows;
  const assets = (await listAssets(user.id)).filter(asset => !asset.archived_at && roleCanManage(asset, user.id));
  const assignedRows = assets.length > 0
    ? await query<{ id: string; service_customer_id: string | null }>("SELECT id,service_customer_id FROM assets WHERE id=ANY($1::uuid[])", [assets.map(asset => asset.id)])
    : { rows: [] as { id: string; service_customer_id: string | null }[] };
  const assignedByAsset = new Map(assignedRows.rows.map(row => [row.id, row.service_customer_id]));

  return <main className="app-page"><div className="container"><AppHeader name={user.name} />
    <section className="settings-head"><span className="eyebrow">Firmenmodus</span><h1>Kunden & Standorte</h1><p>Gruppiere Objektpässe nach Kunde oder Einsatzort und erkenne sofort, wo Wartungen anstehen.</p></section>
    {success && <p className="form-success" role="status">{success}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}

    <section className="detail-grid">
      <article className="panel">
        <div className="panel-head"><div><span className="eyebrow">Neuer Datensatz</span><h2>Kunde / Standort anlegen</h2></div></div>
        <form action={createCustomerAction} className="compact-form">
          <label>Kunde / Objektbezeichnung<input name="name" placeholder="z. B. Familie Müller oder Büro Köln" required maxLength={180} /></label>
          <div className="two-cols"><label>Ansprechpartner<input name="contactName" maxLength={180} /></label><label>E-Mail<input name="email" type="email" maxLength={220} /></label></div>
          <div className="two-cols"><label>Telefon<input name="phone" maxLength={80} /></label><label>Land<select name="country" defaultValue="DE"><option value="DE">Deutschland</option><option value="AT">Österreich</option><option value="CH">Schweiz</option><option value="PL">Polen</option></select></label></div>
          <label>Straße & Hausnummer<input name="street" maxLength={180} /></label>
          <div className="two-cols"><label>PLZ<input name="postalCode" maxLength={30} /></label><label>Ort<input name="city" maxLength={140} /></label></div>
          <label>Notiz<textarea name="notes" rows={3} maxLength={1500} placeholder="z. B. Zugang Heizraum über Hausmeister" /></label>
          <button className="button" type="submit">Kunde anlegen</button>
        </form>
      </article>

      <article className="panel">
        <div className="panel-head"><div><span className="eyebrow">Zuordnung</span><h2>Objekt einem Kunden zuweisen</h2></div></div>
        {assets.length === 0 ? <p className="muted">Noch keine verwaltbaren Objektpässe vorhanden.</p> : <form action={assignAssetToCustomerAction} className="compact-form">
          <label>Objektpass<select name="assetId" required>{assets.map(asset => <option value={asset.id} key={asset.id}>{asset.name} · {asset.category}</option>)}</select></label>
          <label>Kunde / Standort<select name="customerId" defaultValue=""><option value="">Keine Zuordnung</option>{customers.map(customer => <option value={customer.id} key={customer.id}>{customer.name}{customer.city ? ` · ${customer.city}` : ""}</option>)}</select></label>
          <button className="button" type="submit">Zuordnung speichern</button>
        </form>}
      </article>
    </section>

    <section className="panel">
      <div className="panel-head"><div><span className="eyebrow">Übersicht</span><h2>Kunden & Anlagen</h2></div><span className="count-pill">{customers.length}</span></div>
      {customers.length === 0 ? <p className="muted">Noch keine Kunden oder Standorte angelegt.</p> : <div className="timeline">{customers.map(customer => {
        const customerAssets = assets.filter(asset => assignedByAsset.get(asset.id) === customer.id);
        const address = [customer.street, [customer.postal_code, customer.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
        return <div className="timeline-item" key={customer.id}><span className="timeline-dot"></span><div style={{ width: "100%" }}><div className="timeline-line"><b><Link href={`/app/kunden/${customer.id}`}>{customer.name}</Link></b><span>{customer.asset_count} {customer.asset_count === 1 ? "Anlage" : "Anlagen"}</span></div>{address && <p>{address}</p>}{customer.contact_name && <small>{customer.contact_name}{customer.phone ? ` · ${customer.phone}` : ""}{customer.email ? ` · ${customer.email}` : ""}</small>}<div className="form-actions" style={{ justifyContent: "flex-start", marginTop: 10, flexWrap: "wrap" }}>{customer.overdue_count > 0 && <span className="access-chip">{customer.overdue_count} überfällig</span>}{customer.due_30_count > 0 && <span className="interval-chip">{customer.due_30_count} in 30 Tagen</span>}{customer.unplanned_count > 0 && <span className="count-pill">{customer.unplanned_count} ohne Termin</span>}<Link className="button small" href={`/app/kunden/${customer.id}`}>Kundendetails</Link><Link className="button ghost small" href={`/app/service?customer=${customer.id}`}>Wartungen</Link>{customerAssets.slice(0, 3).map(asset => <Link className="button ghost small" href={`/app/assets/${asset.id}`} key={asset.id}>{asset.name}</Link>)}{customerAssets.length > 3 && <span className="count-pill">+{customerAssets.length - 3} weitere</span>}<form action={deleteCustomerAction}><input type="hidden" name="customerId" value={customer.id} /><button className="button ghost small" type="submit">Kunde löschen</button></form></div></div></div>;
      })}</div>}
    </section>
  </div></main>;
}
