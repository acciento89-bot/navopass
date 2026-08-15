import Link from "next/link";
import { createAssetAction } from "@/app/actions/assets";
import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/auth";
import { canEdit, listUserWorkspaces } from "@/lib/workspaces";

const categories = ["Heizung & Klima", "Haushalt", "Fahrzeug", "Fahrrad", "Werkzeug", "Elektronik", "Boot", "Maschine", "Immobilie", "Sonstiges"];

export default async function NewAssetPage({ searchParams }: { searchParams: Promise<{ error?: string; upgrade?: string }> }) {
  const user = await requireUser();
  const { error, upgrade } = await searchParams;
  const workspaces = (await listUserWorkspaces(user.id)).filter((workspace) => canEdit(workspace.role));

  return (
    <main className="app-page"><div className="container"><AppHeader name={user.name} /><div className="page-back"><Link href="/app">← Meine Pässe</Link></div><section className="editor-card"><div className="section-heading left"><span className="eyebrow">Neuer Objektpass</span><h1>Was möchtest du dokumentieren?</h1><p>Starte mit den wichtigsten Daten. Fotos, Dokumente und Historieneinträge kannst du direkt danach ergänzen.</p></div>{error && <p className="form-error">{error}</p>}{upgrade && <div className="upgrade-banner"><span><b>Mehr Platz benötigt?</b> Deine bestehenden Pässe bleiben vollständig erhalten.</span><Link href="/preise">Tarife ansehen →</Link></div>}<form action={createAssetAction} className="form-grid">
      <label className="span-2">Name des Objekts<input name="name" placeholder="z. B. Wärmepumpe Keller" maxLength={160} required /></label>
      <label>Bereich<select name="workspaceId" defaultValue={workspaces.find((workspace) => workspace.kind === "PERSONAL")?.id}>{workspaces.map((workspace) => <option value={workspace.id} key={workspace.id}>{workspace.name} · {workspace.kind === "PERSONAL" ? "Persönlich" : workspace.kind === "HOUSEHOLD" ? "Haushalt" : "Team"}</option>)}</select></label>
      <label>Kategorie<select name="category" defaultValue="Heizung & Klima">{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
      <label>Standort<input name="location" placeholder="z. B. Keller / Garage" maxLength={200} /></label><label>Hersteller<input name="manufacturer" placeholder="Hersteller" maxLength={160} /></label><label>Modell<input name="model" placeholder="Modell / Typ" maxLength={160} /></label><label>Seriennummer<input name="serialNumber" placeholder="Serien- oder Gerätenummer" maxLength={160} /></label>
      <label>Kauf-/Installationsdatum<input name="purchaseDate" type="date" /></label><label>Garantie bis<input name="warrantyUntil" type="date" /></label><label>Nächste Wartung<input name="nextServiceDate" type="date" /></label><label>Wartungsintervall<select name="serviceIntervalMonths" defaultValue="12"><option value="3">3 Monate</option><option value="6">6 Monate</option><option value="12">12 Monate</option><option value="18">18 Monate</option><option value="24">24 Monate</option><option value="36">36 Monate</option></select></label>
      <label>Sichtbarkeit<select name="visibility" defaultValue="LINK"><option value="PRIVATE">Privat – nur Mitglieder</option><option value="LINK">Per Link/QR – wer den Link hat</option><option value="PUBLIC">Öffentlich</option></select></label><label className="span-2">Notizen<textarea name="notes" rows={5} maxLength={5000} placeholder="Wichtige Hinweise, Besonderheiten, Zubehör oder andere Informationen" /></label>
      <div className="form-tip span-2"><b>Bereiche</b><span>In einem Haushalt oder Team können Mitglieder den Pass entsprechend ihrer Rolle ansehen oder bearbeiten.</span></div><div className="form-actions span-2"><Link className="button ghost" href="/app">Abbrechen</Link><button className="button" type="submit">Pass erstellen →</button></div>
    </form></section></div></main>
  );
}
