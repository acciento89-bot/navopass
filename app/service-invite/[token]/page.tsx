import Link from "next/link";
import { acceptServiceAccessAction } from "@/app/actions/service-access";
import { Logo } from "@/components/logo";
import { getCurrentUser, normalizeEmail } from "@/lib/auth";
import { getServiceInviteByToken } from "@/lib/service-access";

export const dynamic="force-dynamic";

export default async function ServiceInvitePage({params,searchParams}:{params:Promise<{token:string}>;searchParams:Promise<{error?:string}>}){
  const {token}=await params;const {error}=await searchParams;const invite=await getServiceInviteByToken(token);const user=await getCurrentUser();
  if(!invite)return <main className="public-page"><section className="public-pass container"><Logo/><article className="panel" style={{marginTop:32}}><span className="eyebrow">Servicefreigabe</span><h1>Einladung nicht verfügbar</h1><p className="muted">Die Einladung ist ungültig, abgelaufen oder wurde bereits verwendet.</p><Link className="button" href="/app">Zu NavoPass</Link></article></section></main>;
  const matching=Boolean(user&&normalizeEmail(user.email)===normalizeEmail(invite.email));
  const next=`/service-invite/${encodeURIComponent(token)}`;
  return <main className="public-page"><section className="public-pass container"><Logo/><article className="panel" style={{marginTop:32,maxWidth:720}}><span className="eyebrow">Servicezugriff</span><h1>Einzelnen Objektpass bearbeiten</h1><p className="muted">Diese Freigabe erlaubt Service- und Wartungseinträge ausschließlich für den eingeladenen NavoPass. Sie macht dich nicht zum Mitglied des gesamten Haushalts oder Teams.</p>{error&&<p className="form-error">{error}</p>}<div className="detail-list" style={{margin:"22px 0"}}><div><dt>Eingeladene E-Mail</dt><dd>{invite.email}</dd></div><div><dt>Zugriff bis</dt><dd>{new Intl.DateTimeFormat("de-DE",{dateStyle:"medium",timeStyle:"short"}).format(new Date(invite.access_until))}</dd></div></div>{matching?<form action={acceptServiceAccessAction}><input type="hidden" name="token" value={token}/><button className="button" type="submit">Servicezugriff annehmen →</button></form>:user?<><p className="form-error">Du bist aktuell als {user.email} angemeldet. Diese Einladung gehört zu {invite.email}.</p><Link className="button ghost" href="/app">Zum Konto</Link></>:<div style={{display:"flex",gap:12,flexWrap:"wrap"}}><Link className="button" href={`/login?next=${encodeURIComponent(next)}`}>Anmelden →</Link><Link className="button ghost" href={`/register?next=${encodeURIComponent(next)}`}>Konto erstellen</Link></div>}<p className="muted" style={{marginTop:20,fontSize:13}}>Der Eigentümer kann diese Freigabe jederzeit widerrufen. Nach Ablauf endet der Schreibzugriff automatisch.</p></article></section></main>;
}
