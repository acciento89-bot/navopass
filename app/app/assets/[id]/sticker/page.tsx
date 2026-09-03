import Link from "next/link";
import { notFound } from "next/navigation";
import { requestQrStickerOrderAction } from "@/app/actions/sticker-orders";
import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/auth";
import { getOwnedAsset, roleCanManage } from "@/lib/assets";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type StickerOrder = {
  id: string;
  quantity: number;
  size_mm: number;
  material: "OUTDOOR_MATTE" | "OUTDOOR_GLOSS";
  status: "REQUESTED" | "CONFIRMED" | "IN_PRODUCTION" | "SHIPPED" | "CANCELLED";
  created_at: string;
};

function statusLabel(status: StickerOrder["status"]) {
  if (status === "CONFIRMED") return "Bestätigt";
  if (status === "IN_PRODUCTION") return "In Produktion";
  if (status === "SHIPPED") return "Versendet";
  if (status === "CANCELLED") return "Storniert";
  return "Angefragt";
}

export default async function StickerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { success, error } = await searchParams;
  const asset = await getOwnedAsset(user.id, id);
  if (!asset) notFound();
  const manageable = roleCanManage(asset, user.id);
  const orders = manageable
    ? (await query<StickerOrder>("SELECT id,quantity,size_mm,material,status,created_at FROM qr_sticker_orders WHERE asset_id=$1 AND user_id=$2 ORDER BY created_at DESC LIMIT 20", [asset.id, user.id])).rows
    : [];
  const appUrl = (process.env.APP_URL || "https://navopass.de").replace(/\/$/, "");
  const passUrl = `${appUrl}/p/${asset.public_id}`;

  return <main className="app-page"><div className="container"><AppHeader name={user.name} />
    <div className="page-back"><Link href={`/app/assets/${asset.id}`}>← Zum Objektpass</Link></div>

    <section className="settings-head">
      <span className="eyebrow">QR am echten Objekt</span>
      <h1>QR-Aufkleber für {asset.name}</h1>
      <p>Der Aufkleber verweist direkt auf diesen Objektpass. So kann der Pass später mit der Smartphone-Kamera oder dem NavoPass-Scanner direkt am Gerät geöffnet werden.</p>
    </section>

    <section className="detail-grid">
      <article className="panel share-panel">
        <div className="panel-head"><div><span className="eyebrow">Druckvorlage</span><h2>Dein QR-Code</h2></div><span className="count-pill">#{asset.public_id}</span></div>
        <div className="passport-qr" style={{ margin: "20px 0" }}><img src={`/api/qr?data=${encodeURIComponent(passUrl)}`} alt={`QR-Code für ${asset.name}`} width="190" height="190" /></div>
        <a className="share-link" href={passUrl} target="_blank" rel="noreferrer">{passUrl}</a>
        <div className="form-actions" style={{ justifyContent: "flex-start" }}><a className="button ghost small" href={`/api/qr?data=${encodeURIComponent(passUrl)}`} target="_blank" rel="noreferrer">QR-Code öffnen / speichern</a></div>
      </article>

      <article className="panel">
        <span className="eyebrow">Hinweis zum Start</span><h2>Produktion über externen Druckpartner</h2>
        <p className="muted">NavoPass produziert keine Etiketten selbst. Die Anfrage wird gesammelt und anschließend über einen externen Druckdienstleister abgewickelt. Deshalb wird mit dem Absenden noch keine kostenpflichtige Bestellung ausgelöst.</p>
        <div className="form-tip"><b>Aktuell:</b><span>Du sendest eine Bestellanfrage. Preis, Druckfreigabe und Lieferzeit werden separat bestätigt. Sobald ein fester Fulfillment-Partner angebunden ist, kann dieser Schritt automatisiert werden.</span></div>
      </article>
    </section>

    {!manageable ? <section className="panel"><h2>Keine Bestellberechtigung</h2><p className="readonly-note">Nur Inhaber oder Admins des Objektpasses können physische QR-Aufkleber anfragen.</p></section> : <>
      {success === "1" && <p className="form-success" role="status">QR-Aufkleber-Anfrage wurde gespeichert. Wir melden uns zur Bestätigung von Preis und Produktion.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}

      <section className="panel">
        <div className="panel-head"><div><span className="eyebrow">Bestellanfrage</span><h2>Aufkleber konfigurieren</h2></div></div>
        <form action={requestQrStickerOrderAction} className="compact-form">
          <input type="hidden" name="assetId" value={asset.id} />
          <div className="two-cols">
            <label>Stückzahl<select name="quantity" defaultValue="10"><option value="5">5 Stück</option><option value="10">10 Stück</option><option value="25">25 Stück</option></select></label>
            <label>Größe<select name="sizeMm" defaultValue="40"><option value="30">30 × 30 mm</option><option value="40">40 × 40 mm</option></select></label>
          </div>
          <label>Ausführung<select name="material" defaultValue="OUTDOOR_MATTE"><option value="OUTDOOR_MATTE">Wetterfest matt</option><option value="OUTDOOR_GLOSS">Wetterfest glänzend</option></select><small>Für Heizungen, Klimageräte, Werkzeuge oder andere technische Anlagen ist die wetterfeste Variante vorgesehen.</small></label>

          <div className="two-cols">
            <label>Empfänger<input name="recipientName" defaultValue={user.name} required maxLength={160} /></label>
            <label>Firma (optional)<input name="company" defaultValue={user.company_name || ""} maxLength={180} /></label>
          </div>
          <label>Straße & Hausnummer<input name="street" autoComplete="street-address" required maxLength={180} /></label>
          <div className="two-cols">
            <label>PLZ<input name="postalCode" autoComplete="postal-code" required maxLength={20} /></label>
            <label>Ort<input name="city" autoComplete="address-level2" required maxLength={120} /></label>
          </div>
          <label>Land<select name="country" defaultValue="DE"><option value="DE">Deutschland</option><option value="AT">Österreich</option><option value="CH">Schweiz</option><option value="PL">Polen</option></select></label>
          <label>Hinweis (optional)<textarea name="note" rows={3} maxLength={1000} placeholder="z. B. mehrere Geräte, besondere Beschriftung oder Rückfrage" /></label>
          <div className="form-tip"><b>Noch keine Zahlung:</b><span>Durch Absenden wird nur eine verbindliche Anfrage an NavoPass übermittelt. Eine kostenpflichtige Bestellung entsteht erst nach separater Preisbestätigung.</span></div>
          <button className="button" type="submit">QR-Aufkleber anfragen</button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-head"><div><span className="eyebrow">Verlauf</span><h2>Meine Aufkleber-Anfragen</h2></div><span className="count-pill">{orders.length}</span></div>
        {orders.length === 0 ? <p className="muted">Für diesen Pass wurden noch keine QR-Aufkleber angefragt.</p> : <div className="timeline">{orders.map(order => <div className="timeline-item" key={order.id}><span className="timeline-dot"></span><div><div className="timeline-line"><b>{order.quantity} Stück · {order.size_mm} × {order.size_mm} mm</b><time>{new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(new Date(order.created_at))}</time></div><p>{order.material === "OUTDOOR_GLOSS" ? "Wetterfest glänzend" : "Wetterfest matt"}</p><small>Status: {statusLabel(order.status)}</small></div></div>)}</div>}
      </section>
    </>}
  </div></main>;
}
