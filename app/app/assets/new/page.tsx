import Link from "next/link";
import { createAssetAction } from "@/app/actions/assets";
import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/auth";
import { canEdit, listUserWorkspaces } from "@/lib/workspaces";
import { getLocale } from "@/lib/i18n";

const categories = ["Heizung & Klima", "Haushalt", "Fahrzeug", "Fahrrad", "Werkzeug", "Elektronik", "Boot", "Maschine", "Immobilie", "Sonstiges"];

export default async function NewAssetPage({ searchParams }: { searchParams: Promise<{ error?: string; upgrade?: string }> }) {
  const user = await requireUser();
  const locale = await getLocale();
  const tr = (de: string, en: string) => locale === "en" ? en : de;
  const { error, upgrade } = await searchParams;
  const workspaces = (await listUserWorkspaces(user.id)).filter((workspace) => canEdit(workspace.role));

  return (
    <main className="app-page"><div className="container"><AppHeader name={user.name} /><div className="page-back"><Link href="/app">← {tr("Meine Pässe", "My passes")}</Link></div><section className="editor-card"><div className="section-heading left"><span className="eyebrow">{tr("Neuer Objektpass", "New asset pass")}</span><h1>{tr("Was möchtest du dokumentieren?", "What would you like to document?")}</h1><p>{tr("Starte mit den wichtigsten Daten. Fotos, Dokumente und Historieneinträge kannst du direkt danach ergänzen.", "Start with the essential details. You can add photos, documents and history entries straight afterwards.")}</p></div>{error && <p className="form-error">{error}</p>}{upgrade && <div className="upgrade-banner"><span><b>{tr("Mehr Platz benötigt?", "Need more space?")}</b> {tr("Deine bestehenden Pässe bleiben vollständig erhalten.", "Your existing passes remain fully available.")}</span><Link href="/preise">{tr("Tarife ansehen", "View plans")} →</Link></div>}<form action={createAssetAction} className="form-grid"><input type="hidden" name="locale" value={locale} />
      <label className="span-2">{tr("Name des Objekts", "Asset name")}<input name="name" placeholder={tr("z. B. Maschine Halle 2, Firmenfahrzeug oder Klimagerät", "e.g. hall 2 machine, company vehicle or air conditioner")} maxLength={160} required /></label>
      <label>{tr("Bereich", "Workspace")}<select name="workspaceId" defaultValue={workspaces.find((workspace) => workspace.kind === "PERSONAL")?.id}>{workspaces.map((workspace) => <option value={workspace.id} key={workspace.id}>{workspace.name} · {workspace.kind === "PERSONAL" ? tr("Persönlich", "Personal") : workspace.kind === "HOUSEHOLD" ? tr("Haushalt", "Household") : "Team"}</option>)}</select></label>
      <label>{tr("Kategorie", "Category")}<select name="category" defaultValue="Sonstiges">{categories.map((category) => <option value={category} key={category}>{locale === "en" ? ({"Heizung & Klima":"Heating & climate","Haushalt":"Household","Fahrzeug":"Vehicle","Fahrrad":"Bicycle","Werkzeug":"Tools","Elektronik":"Electronics","Boot":"Boat","Maschine":"Machine","Immobilie":"Property","Sonstiges":"Other"} as Record<string,string>)[category] : category}</option>)}</select></label>
      <label>{tr("Standort", "Location")}<input name="location" placeholder={tr("z. B. Halle 2 / Lager / Fahrzeug 12", "e.g. hall 2 / warehouse / vehicle 12")} maxLength={200} /></label><label>{tr("Hersteller", "Manufacturer")}<input name="manufacturer" placeholder={tr("Hersteller", "Manufacturer")} maxLength={160} /></label><label>{tr("Modell", "Model")}<input name="model" placeholder={tr("Modell / Typ", "Model / type")} maxLength={160} /></label><label>{tr("Seriennummer", "Serial number")}<input name="serialNumber" placeholder={tr("Serien-, Geräte- oder Inventarnummer", "Serial, device or inventory number")} maxLength={160} /></label>
      <label>{tr("Kauf-/Installationsdatum", "Purchase / installation date")}<input name="purchaseDate" type="date" /></label><label>{tr("Garantie bis", "Warranty until")}<input name="warrantyUntil" type="date" /></label><label>{tr("Nächster Service / Prüfung", "Next service / inspection")}<input name="nextServiceDate" type="date" /></label><label>{tr("Serviceintervall", "Service interval")}<select name="serviceIntervalMonths" defaultValue="12">{[3,6,12,18,24,36].map(months=><option value={months} key={months}>{months} {tr("Monate", "months")}</option>)}</select></label>
      <label>{tr("Sichtbarkeit", "Visibility")}<select name="visibility" defaultValue="LINK"><option value="PRIVATE">{tr("Privat – nur Mitglieder", "Private – members only")}</option><option value="LINK">{tr("Per Link/QR – wer den Link hat", "By link/QR – anyone with the link")}</option><option value="PUBLIC">{tr("Öffentlich", "Public")}</option></select></label><label className="span-2">{tr("Notizen", "Notes")}<textarea name="notes" rows={5} maxLength={5000} placeholder={tr("Wichtige Hinweise, Besonderheiten, Zubehör oder andere Informationen", "Important notes, special details, accessories or other information")} /></label>
      <div className="form-tip span-2"><b>{tr("Bereiche", "Workspaces")}</b><span>{tr("In einem Haushalt oder Team können Mitglieder den Pass entsprechend ihrer Rolle ansehen oder bearbeiten.", "In a household or team, members can view or edit the pass according to their role.")}</span></div><div className="form-actions span-2"><Link className="button ghost" href="/app">{tr("Abbrechen", "Cancel")}</Link><button className="button" type="submit">{tr("Pass erstellen", "Create pass")} →</button></div>
    </form></section></div></main>
  );
}
