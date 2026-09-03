import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/auth";
import { listAssets, roleCanManage } from "@/lib/assets";
import { ensureCustomerSchema } from "@/lib/customer-schema";
import { dateOnlyAsDate, daysUntil } from "@/lib/date";
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
};

type Assignment = { id: string; service_customer_id: string | null };
type LastService = { asset_id: string; event_date: string; title: string; provider: string | null };

function formatDate(value: string | null) {
  const parsed = dateOnlyAsDate(value);
  return parsed ? new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(parsed) : "—";
}

function serviceStatus(value: string | null) {
  const days = daysUntil(value);
  if (days === null) return { label: "Kein Termin", tone: "neutral" };
  if (days < 0) return { label: `${Math.abs(days)} ${Math.abs(days) === 1 ? "Tag" : "Tage"} überfällig`, tone: "danger" };
  if (days === 0) return { label: "Heute fällig", tone: "danger" };
  if (days <= 30) return { label: `in ${days} Tagen`, tone: "warning" };
  return { label: `in ${days} Tagen`, tone: "ok" };
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (user.account_type !== "PROFESSIONAL") notFound();
  await ensureCustomerSchema();

  const customer = (await query<Customer>(
    "SELECT id,name,contact_name,email,phone,street,postal_code,city,country,notes FROM service_customers WHERE id=$1 AND user_id=$2 LIMIT 1",
    [id, user.id]
  )).rows[0];
  if (!customer) notFound();

  const accessible = (await listAssets(user.id)).filter(asset => !asset.archived_at);
  const assignments = accessible.length > 0
    ? (await query<Assignment>("SELECT id,service_customer_id FROM assets WHERE id=ANY($1::uuid[])", [accessible.map(asset => asset.id)])).rows
    : [];
  const assignedIds = new Set(assignments.filter(row => row.service_customer_id === customer.id).map(row => row.id));
  const assets = accessible.filter(asset => assignedIds.has(asset.id));

  const lastServices = assets.length > 0
    ? (await query<LastService>(`
        SELECT DISTINCT ON (asset_id) asset_id,event_date,title,provider
          FROM asset_events
         WHERE asset_id=ANY($1::uuid[])
           AND event_type IN ('SERVICE','REPAIR','INSPECTION')
         ORDER BY asset_id,event_date DESC,created_at DESC
      `, [assets.map(asset => asset.id)])).rows
    : [];
  const lastServiceByAsset = new Map(lastServices.map(item => [item.asset_id, item]));

  const overdue = assets.filter(asset => { const days = daysUntil(asset.next_service_date); return days !== null && days < 0; }).length;
  const due30 = assets.filter(asset => { const days = daysUntil(asset.next_service_date); return days !== null && days >= 0 && days <= 30; }).length;
  const unplanned = assets.filter(asset => daysUntil(asset.next_service_date) === null).length;
  const address = [customer.street, [customer.postal_code, customer.city].filter(Boolean).join(" "), customer.country].filter(Boolean).join(", ");

  return <main className="app-page"><div className="container">
    <AppHeader name={user.name} />
    <div className="page-back"><Link href="/app/kunden">← Kunden & Standorte</Link></div>

    <section className="service-head">
      <div><span className="eyebrow">Kunde / Standort</span><h1>{customer.name}</h1><p>{address || "Noch keine Adresse hinterlegt"}</p></div>
      <div className="form-actions" style={{ flexWrap: "wrap" }}><Link className="button" href={`/app/service?customer=${customer.id}`}>Wartungen öffnen</Link><Link className="button ghost" href="/app/scannen">QR scannen</Link></div>
    </section>

    <section className="service-stats">
      <div><span>Anlagen</span><b>{assets.length}</b><small>zugeordnet</small></div>
      <div className={overdue > 0 ? "danger" : ""}><span>Überfällig</span><b>{overdue}</b><small>Wartungen</small></div>
      <div className={due30 > 0 ? "warning" : ""}><span>Nächste 30 Tage</span><b>{due30}</b><small>Wartungen</small></div>
      <div><span>Ohne Termin</span><b>{unplanned}</b><small>noch ungeplant</small></div>
    </section>

    <section className="detail-grid">
      <article className="panel"><div className="panel-head"><div><span className="eyebrow">Kontakt</span><h2>Ansprechpartner</h2></div></div><dl className="detail-list">
        <div><dt>Name</dt><dd>{customer.contact_name || "—"}</dd></div>
        <div><dt>Telefon</dt><dd>{customer.phone ? <a href={`tel:${customer.phone}`}>{customer.phone}</a> : "—"}</dd></div>
        <div><dt>E-Mail</dt><dd>{customer.email ? <a href={`mailto:${customer.email}`}>{customer.email}</a> : "—"}</dd></div>
        <div><dt>Adresse</dt><dd>{address || "—"}</dd></div>
      </dl></article>
      <article className="panel"><div className="panel-head"><div><span className="eyebrow">Hinweise</span><h2>Vor Ort</h2></div></div><p className="note-box">{customer.notes || "Noch keine Hinweise zum Zugang oder Standort hinterlegt."}</p></article>
    </section>

    <section className="panel">
      <div className="panel-head"><div><span className="eyebrow">Anlagenbestand</span><h2>Objektpässe & Service</h2></div><span className="count-pill">{assets.length}</span></div>
      {assets.length === 0 ? <div className="empty-state compact"><div className="empty-icon">K</div><h2>Noch keine Anlage zugeordnet</h2><p>Ordne auf der Kundenübersicht einen Objektpass diesem Kunden oder Standort zu.</p><Link className="button" href="/app/kunden">Zur Zuordnung</Link></div> : <div className="service-list">{assets.map(asset => {
        const next = serviceStatus(asset.next_service_date);
        const last = lastServiceByAsset.get(asset.id);
        const manageable = roleCanManage(asset, user.id);
        return <article className={`service-card ${next.tone}`} key={asset.id}>
          <div className="service-date"><span>Nächste Wartung</span><b>{formatDate(asset.next_service_date)}</b><small>{next.label}</small></div>
          <div className="service-main"><span className="asset-category">{asset.category}</span><h2><Link href={`/app/assets/${asset.id}`}>{asset.name}</Link></h2><p>{[asset.manufacturer, asset.model, asset.location].filter(Boolean).join(" · ") || "Noch keine weiteren Anlagendaten"}</p><span className="interval-chip">Letzter Service: {last ? `${formatDate(last.event_date)} · ${last.title}${last.provider ? ` · ${last.provider}` : ""}` : "noch nicht dokumentiert"}</span></div>
          <div className="service-actions"><Link className="button small" href={`/app/assets/${asset.id}/service`}>Wartung eintragen</Link><Link className="button ghost small" href={`/app/assets/${asset.id}`}>Pass öffnen</Link><a className="button ghost small" href={`/p/${asset.public_id}`} target="_blank" rel="noreferrer">QR-Pass</a>{manageable && <><Link className="button ghost small" href={`/app/assets/${asset.id}/service-zugang`}>Servicezugang</Link><Link className="button ghost small" href={`/app/assets/${asset.id}/sticker`}>QR-Aufkleber</Link></>}</div>
        </article>;
      })}</div>}
    </section>
  </div></main>;
}
