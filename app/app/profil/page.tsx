import Link from "next/link";
import { updateProfessionalProfileAction } from "@/app/actions/professional-profile";
import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/auth";

export const dynamic="force-dynamic";

export default async function ProfileModePage({searchParams}:{searchParams:Promise<{success?:string;error?:string}>}){
  const user=await requireUser();
  const {success,error}=await searchParams;
  return <main className="app-page"><div className="container"><AppHeader name={user.name}/><div className="page-back"><Link href="/app">← Meine Pässe</Link></div>
    <section className="settings-head"><span className="eyebrow">NavoPass Profil</span><h1>Privat oder beruflich nutzen</h1><p>Privatnutzer verwalten ihre eigenen Objektpässe. Firmen und Techniker können sich mit Firmenbezeichnung ausweisen und berechtigte Wartungs- und Serviceeinträge direkt nach einem QR-Scan dokumentieren.</p></section>
    <section className="panel settings-panel professional-profile-panel">
      {success&&<p className="form-success">{success}</p>}{error&&<p className="form-error">{error}</p>}
      <form action={updateProfessionalProfileAction} className="compact-form">
        <label>Nutzungsart<select name="accountType" defaultValue={user.account_type??"PRIVATE"}><option value="PRIVATE">Privat</option><option value="PROFESSIONAL">Firma / Techniker / Servicebetrieb</option></select></label>
        <label>Firma<input name="companyName" defaultValue={user.company_name??""} placeholder="z. B. Muster Haustechnik GmbH" maxLength={180}/><small>Wird bei neuen Serviceeinträgen als ausführender Betrieb vorgeschlagen.</small></label>
        <label>Funktion / Qualifikation<input name="professionalTitle" defaultValue={user.professional_title??""} placeholder="z. B. Kundendiensttechniker SHK" maxLength={180}/></label>
        <button className="button" type="submit">Profil speichern</button>
      </form>
      <div className="form-tip"><b>Wichtig:</b><span>Ein Firmenprofil allein gibt keine Schreibrechte. Der Eigentümer eines Passes muss dich oder dein Team weiterhin als Bearbeiter, Admin oder Inhaber berechtigen.</span></div>
    </section>
  </div></main>;
}
