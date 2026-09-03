import Link from "next/link";
import { requestBulkQrStickerOrderAction } from "@/app/actions/sticker-orders";
import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/auth";
import { listAssets, roleCanManage } from "@/lib/assets";

export const dynamic = "force-dynamic";

export default async function BulkStickerPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; stickers?: string; error?: string }>;
}) {
  const user = await requireUser();
  const { success, stickers, error } = await searchParams;
  const professional = user.account_type === "PROFESSIONAL";
  const assets = professional
    ? (await listAssets(user.id)).filter(asset => !asset.archived_at && roleCanManage(asset, user.id))
    : [];

  return <main className="app-page"><div className="container"><AppHeader name={user.name} />
    <div className="page-back"><Link href="/app/sticker">← QR-Aufkleber</Link></div>

    <section className="settings-head">
      <span className="eyebrow">Firmen & größere Bestände</span>
      <h1>QR-Aufkleber als Sammelanfrage</h1>
      <p>Wähle mehrere Objektpässe aus. Jeder ausgewählte Pass behält seinen eigenen QR-Code; es werden also nicht viele Kopien desselben Geräte-Codes erzeugt.</p>
    </section>

    {!professional ? <section className="panel"><h2>Firmenprofil erforderlich</h2><p className="readonly-note">Sammelanfragen sind für Firmen-, Techniker- und Serviceprofile vorgesehen. Stelle dein Profil zuerst auf berufliche Nutzung um.</p><div className="form-actions" style={{ justifyContent: "flex-start" }}><Link className="button" href="/app/profil">Profil öffnen</Link></div></section> : <>
      {success && <p className="form-success" role="status">Sammelanfrage gespeichert: {success} Objektpässe mit insgesamt {stickers || success} QR-Aufklebern.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}

      {assets.length === 0 ? <section className="empty-state compact"><div className="empty-icon">QR</div><h2>Keine verwaltbaren Objektpässe</h2><p>Lege zuerst Geräte oder Anlagen an, für die du Aufkleber benötigst.</p><Link className="button" href="/app/assets/new">+ Objektpass anlegen</Link></section> : <section className="panel">
        <div className="panel-head"><div><span className="eyebrow">Mehrere Geräte · getrennte QR-Codes</span><h2>Objekte auswählen</h2></div><span className="count-pill">{assets.length}</span></div>
        <p className="muted">Pro ausgewähltem Objekt werden 1 oder optional 2 identische Aufkleber für genau diesen Objektpass angefragt. Bei 20 ausgewählten Geräten entstehen damit 20 verschiedene QR-Codes.</p>

        <form action={requestBulkQrStickerOrderAction} className="compact-form">
          <div className="asset-grid">
            {assets.map(asset => <label className="asset-card" key={asset.id} style={{ cursor: "pointer" }}>
              <div className="asset-card-top"><span className="asset-category">{asset.category}</span><input name="assetIds" value={asset.id} type="checkbox" style={{ width: 20, height: 20 }} /></div>
              <div className="asset-avatar">QR</div>
              <h2>{asset.name}</h2>
              <p>{[asset.manufacturer, asset.model].filter(Boolean).join(" · ") || `#${asset.public_id}`}</p>
              <small className="muted">Eigener QR-Code #{asset.public_id}</small>
            </label>)}
          </div>

          <div className="two-cols">
            <label>Aufkleber je Objekt<select name="quantity" defaultValue="1"><option value="1">1 pro Objekt</option><option value="2">2 pro Objekt</option></select><small>Maximal 2 je Gerät: Hauptaufkleber plus Reserve oder zweite Position.</small></label>
            <label>Größe<select name="sizeMm" defaultValue="40"><option value="30">30 × 30 mm</option><option value="40">40 × 40 mm</option></select></label>
          </div>
          <label>Ausführung<select name="material" defaultValue="OUTDOOR_MATTE"><option value="OUTDOOR_MATTE">Wetterfest matt</option><option value="OUTDOOR_GLOSS">Wetterfest glänzend</option></select></label>

          <div className="two-cols">
            <label>Empfänger<input name="recipientName" defaultValue={user.name} required maxLength={160} /></label>
            <label>Firma<input name="company" defaultValue={user.company_name || ""} maxLength={180} /></label>
          </div>
          <label>Straße & Hausnummer<input name="street" autoComplete="street-address" required maxLength={180} /></label>
          <div className="two-cols">
            <label>PLZ<input name="postalCode" autoComplete="postal-code" required maxLength={20} /></label>
            <label>Ort<input name="city" autoComplete="address-level2" required maxLength={120} /></label>
          </div>
          <label>Land<select name="country" defaultValue="DE"><option value="DE">Deutschland</option><option value="AT">Österreich</option><option value="CH">Schweiz</option><option value="PL">Polen</option></select></label>
          <label>Hinweis (optional)<textarea name="note" rows={3} maxLength={1000} placeholder="z. B. Baustelle, Objektbezeichnung oder gewünschte Sortierung" /></label>

          <div className="form-tip"><b>Wichtig:</b><span>Die Sammelanfrage erzeugt für jeden ausgewählten Objektpass eine eigene Bestellposition mit dessen individuellem QR-Code. Es wird weiterhin noch keine Zahlung ausgelöst; Preis und Produktion werden separat bestätigt.</span></div>
          <button className="button" type="submit">Sammelanfrage absenden</button>
        </form>
      </section>}
    </>}
  </div></main>;
}
