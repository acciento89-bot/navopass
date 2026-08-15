import Link from "next/link";
import { createAssetAction } from "@/app/actions/assets";
import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/auth";

const categories = ["Heizung & Klima", "Haushalt", "Fahrzeug", "Fahrrad", "Werkzeug", "Elektronik", "Boot", "Maschine", "Immobilie", "Sonstiges"];

export default async function NewAssetPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  const { error } = await searchParams;

  return (
    <main className="app-page">
      <div className="container">
        <AppHeader name={user.name} />
        <div className="page-back"><Link href="/app">← Meine Pässe</Link></div>
        <section className="editor-card">
          <div className="section-heading left"><span className="eyebrow">Neuer Objektpass</span><h1>Was möchtest du dokumentieren?</h1><p>Starte mit den wichtigsten Daten. Fotos, Dokumente und Historieneinträge kannst du direkt danach ergänzen.</p></div>
          {error && <p className="form-error">{error}</p>}
          <form action={createAssetAction} className="form-grid">
            <label className="span-2">Name des Objekts<input name="name" placeholder="z. B. Wärmepumpe Keller" maxLength={160} required /></label>
            <label>Kategorie<select name="category" defaultValue="Heizung & Klima">{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label>Standort<input name="location" placeholder="z. B. Keller / Garage" maxLength={200} /></label>
            <label>Hersteller<input name="manufacturer" placeholder="Hersteller" maxLength={160} /></label>
            <label>Modell<input name="model" placeholder="Modell / Typ" maxLength={160} /></label>
            <label className="span-2">Seriennummer<input name="serialNumber" placeholder="Serien- oder Gerätenummer" maxLength={160} /></label>
            <label>Kauf-/Installationsdatum<input name="purchaseDate" type="date" /></label>
            <label>Garantie bis<input name="warrantyUntil" type="date" /></label>
            <label>Nächste Wartung<input name="nextServiceDate" type="date" /></label>
            <label>Sichtbarkeit<select name="visibility" defaultValue="LINK"><option value="PRIVATE">Privat – nur ich</option><option value="LINK">Per Link/QR – wer den Link hat</option><option value="PUBLIC">Öffentlich</option></select></label>
            <label className="span-2">Notizen<textarea name="notes" rows={5} maxLength={5000} placeholder="Wichtige Hinweise, Besonderheiten, Zubehör oder andere Informationen" /></label>
            <div className="form-tip span-2"><b>Tipp</b><span>Nach dem Anlegen bekommst du sofort deinen QR-Code und kannst Rechnungen, Fotos, Wartungen und Reparaturen ergänzen.</span></div>
            <div className="form-actions span-2"><Link className="button ghost" href="/app">Abbrechen</Link><button className="button" type="submit">Pass erstellen →</button></div>
          </form>
        </section>
      </div>
    </main>
  );
}
