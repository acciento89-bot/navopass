import Link from "next/link";
import { notFound } from "next/navigation";
import { updateAssetAction } from "@/app/actions/assets";
import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/auth";
import { getOwnedAsset } from "@/lib/assets";

const categories = ["Heizung & Klima", "Haushalt", "Fahrzeug", "Fahrrad", "Werkzeug", "Elektronik", "Boot", "Maschine", "Immobilie", "Sonstiges"];

export default async function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const asset = await getOwnedAsset(user.id, id);
  if (!asset) notFound();

  return (
    <main className="app-page">
      <div className="container">
        <AppHeader name={user.name} />
        <div className="page-back"><Link href={`/app/assets/${asset.id}`}>← Zurück zu {asset.name}</Link></div>
        <section className="editor-card">
          <div className="section-heading left"><span className="eyebrow">Objektpass bearbeiten</span><h1>{asset.name}</h1><p>Ändere Stammdaten, Termine, Wartungsintervall, Freigabe und Notizen. Historie und Dokumente bleiben erhalten.</p></div>
          <form action={updateAssetAction} className="form-grid">
            <input type="hidden" name="assetId" value={asset.id} />
            <label className="span-2">Name des Objekts<input name="name" defaultValue={asset.name} maxLength={160} required /></label>
            <label>Kategorie<select name="category" defaultValue={asset.category}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label>Standort<input name="location" defaultValue={asset.location ?? ""} maxLength={200} /></label>
            <label>Hersteller<input name="manufacturer" defaultValue={asset.manufacturer ?? ""} maxLength={160} /></label>
            <label>Modell<input name="model" defaultValue={asset.model ?? ""} maxLength={160} /></label>
            <label className="span-2">Seriennummer<input name="serialNumber" defaultValue={asset.serial_number ?? ""} maxLength={160} /></label>
            <label>Kauf-/Installationsdatum<input name="purchaseDate" type="date" defaultValue={asset.purchase_date ?? ""} /></label>
            <label>Garantie bis<input name="warrantyUntil" type="date" defaultValue={asset.warranty_until ?? ""} /></label>
            <label>Nächste Wartung<input name="nextServiceDate" type="date" defaultValue={asset.next_service_date ?? ""} /></label>
            <label>Wartungsintervall<select name="serviceIntervalMonths" defaultValue={String(asset.service_interval_months || 12)}><option value="3">Alle 3 Monate</option><option value="6">Alle 6 Monate</option><option value="12">Jährlich</option><option value="18">Alle 18 Monate</option><option value="24">Alle 2 Jahre</option><option value="36">Alle 3 Jahre</option><option value="60">Alle 5 Jahre</option></select></label>
            <label className="span-2">Sichtbarkeit<select name="visibility" defaultValue={asset.visibility}><option value="PRIVATE">Privat – nur ich</option><option value="LINK">Per Link/QR – wer den Link hat</option><option value="PUBLIC">Öffentlich</option></select></label>
            <label className="span-2">Notizen<textarea name="notes" rows={5} maxLength={5000} defaultValue={asset.notes ?? ""} /></label>
            <div className="form-tip span-2"><b>Automatische Folgetermine</b><span>„Wartung erledigt“ im Service-Center setzt den nächsten Termin anhand dieses Intervalls neu.</span></div>
            <div className="form-actions span-2"><Link className="button ghost" href={`/app/assets/${asset.id}`}>Abbrechen</Link><button className="button" type="submit">Änderungen speichern</button></div>
          </form>
        </section>
      </div>
    </main>
  );
}
