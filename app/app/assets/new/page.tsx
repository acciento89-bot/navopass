import Link from "next/link";
import { createAssetAction } from "@/app/actions/assets";
import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/auth";

export default async function NewAssetPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  const { error } = await searchParams;
  return (
    <main className="app-page container">
      <AppHeader name={user.name} />
      <div className="page-back"><Link href="/app">← Meine Pässe</Link></div>
      <section className="editor-card">
        <div className="section-heading left"><span className="eyebrow">Neuer Objektpass</span><h1>Was möchtest du dokumentieren?</h1><p>Die Angaben lassen sich später erweitern. Für den Start reicht ein Name.</p></div>
        {error && <p className="form-error">{error}</p>}
        <form action={createAssetAction} className="form-grid">
          <label className="span-2">Name des Objekts<input name="name" placeholder="z. B. Wärmepumpe Keller" required /></label>
          <label>Kategorie<select name="category" defaultValue="Heizung & Klima"><option>Heizung & Klima</option><option>Haushalt</option><option>Fahrzeug</option><option>Fahrrad</option><option>Werkzeug</option><option>Elektronik</option><option>Boot</option><option>Maschine</option><option>Sonstiges</option></select></label>
          <label>Standort<input name="location" placeholder="z. B. Keller" /></label>
          <label>Hersteller<input name="manufacturer" placeholder="Hersteller" /></label>
          <label>Modell<input name="model" placeholder="Modell / Typ" /></label>
          <label className="span-2">Seriennummer<input name="serialNumber" placeholder="Serien- oder Gerätenummer" /></label>
          <label>Kauf-/Installationsdatum<input name="purchaseDate" type="date" /></label>
          <label>Garantie bis<input name="warrantyUntil" type="date" /></label>
          <label className="span-2">Notizen<textarea name="notes" rows={4} placeholder="Wichtige Hinweise zum Objekt" /></label>
          <label className="span-2">Sichtbarkeit<select name="visibility" defaultValue="LINK"><option value="PRIVATE">Privat – nur ich</option><option value="LINK">Per Link/QR – wer den Link hat</option><option value="PUBLIC">Öffentlich</option></select></label>
          <div className="form-actions span-2"><Link className="button ghost" href="/app">Abbrechen</Link><button className="button" type="submit">Pass erstellen</button></div>
        </form>
      </section>
    </main>
  );
}
