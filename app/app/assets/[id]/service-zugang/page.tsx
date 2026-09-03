import Link from "next/link";
import { notFound } from "next/navigation";
import { inviteServicePartnerAction, revokeServiceGrantAction, revokeServiceInviteAction } from "@/app/actions/service-access";
import { AppHeader } from "@/components/app-header";
import { ConfirmButton } from "@/components/confirm-button";
import { requireUser } from "@/lib/auth";
import { getOwnedAsset, roleCanManage } from "@/lib/assets";
import { listPendingServiceInvites, listServiceGrants } from "@/lib/service-access";

export const dynamic="force-dynamic";

function dateTime(value:string){return new Intl.DateTimeFormat("de-DE",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));}

export default async function ServiceAccessPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{serviceError?:string;serviceInvite?:string;serviceDelivery?:string;serviceJoined?:string}>}){
  const user=await requireUser();const {id}=await params;const qs=await searchParams;const asset=await getOwnedAsset(user.id,id);if(!asset)notFound();
  if(!roleCanManage(asset,user.id))return <main className="app-page"><div className="container"><AppHeader name={user.name}/><div className="page-back"><Link href={`/app/assets/${asset.id}`}>← Zum Objektpass</Link></div><section className="panel"><h1>Keine Verwaltungsrechte</h1><p className="muted">Servicefreigaben können nur Inhaber oder Admins des Objektpasses verwalten.</p></section></div></main>;
  const [grants,invites]=await Promise.all([listServiceGrants(asset.id),listPendingServiceInvites(asset.id)]);
  const manualUrl=qs.serviceInvite?`${(process.env.APP_URL||"https://navopass.de").replace(/\/$/,"")}/service-invite/${qs.serviceInvite}`:null;
  return <main className="app-page"><div className="container"><AppHeader name={user.name}/><div className="page-back"><Link href={`/app/assets/${asset.id}`}>← Zum Objektpass</Link></div>
    <section className="settings-head"><span className="eyebrow">Servicepartner</span><h1>{asset.name}</h1><p>Gib einem Betrieb oder Techniker zeitlich begrenzten Schreibzugriff nur auf diesen einen Pass. Der restliche Haushalt oder Firmenbereich bleibt unsichtbar.</p></section>
    {qs.serviceError&&<p className="form-error">{qs.serviceError}</p>}{qs.serviceJoined&&<p className="form-success">Servicezugriff wurde aktiviert.</p>}
    {manualUrl&&<section className="panel" style={{marginBottom:16}}><h2>Einladung erstellt</h2><p className="muted">{qs.serviceDelivery==="sent"?"Die Einladung wurde per E-Mail versendet.":qs.serviceDelivery==="failed"?"E-Mail-Versand ist fehlgeschlagen. Du kannst den Link manuell weitergeben.":"Du kannst den Link manuell weitergeben."}</p><a className="share-link" href={manualUrl}>{manualUrl}</a></section>}
    <section className="detail-grid">
      <article className="panel"><div className="panel-head"><div><span className="eyebrow">Neue Freigabe</span><h2>Servicepartner einladen</h2></div></div><form action={inviteServicePartnerAction} className="compact-form"><input type="hidden" name="assetId" value={asset.id}/><label>E-Mail-Adresse<input name="email" type="email" autoComplete="email" placeholder="service@betrieb.de" required/></label><label>Zugriffsdauer<select name="accessDays" defaultValue="30"><option value="1">1 Tag</option><option value="7">7 Tage</option><option value="30">30 Tage</option><option value="90">90 Tage</option><option value="365">1 Jahr</option></select></label><button className="button" type="submit">Servicefreigabe senden →</button></form><p className="muted" style={{fontSize:13}}>Die Einladung ist 7 Tage lang annehmbar. Die gewählte Zugriffsdauer beginnt mit Erstellung der Einladung und endet automatisch.</p></article>
      <article className="panel"><div className="panel-head"><div><span className="eyebrow">Aktiv</span><h2>Freigegebene Servicepartner</h2></div><span className="count-pill">{grants.length}</span></div>{grants.length===0?<p className="muted">Aktuell hat kein externer Servicepartner Schreibzugriff.</p>:<div className="timeline">{grants.map(grant=><div className="timeline-item" key={grant.user_id}><span className="timeline-dot"/><div style={{width:"100%"}}><div className="timeline-line"><b>{grant.company_name||grant.name||grant.email}</b><time>bis {dateTime(grant.expires_at)}</time></div><p>{[grant.name,grant.professional_title,grant.email].filter(Boolean).join(" · ")}</p><form action={revokeServiceGrantAction}><input type="hidden" name="assetId" value={asset.id}/><input type="hidden" name="userId" value={grant.user_id}/><ConfirmButton className="mini-danger" type="submit" message="Servicezugriff sofort widerrufen?">Zugriff widerrufen</ConfirmButton></form></div></div>)}</div>}</article>
    </section>
    <section className="panel" style={{marginTop:16}}><div className="panel-head"><div><span className="eyebrow">Ausstehend</span><h2>Noch nicht angenommene Einladungen</h2></div><span className="count-pill">{invites.length}</span></div>{invites.length===0?<p className="muted">Keine offenen Serviceeinladungen.</p>:<div className="timeline">{invites.map(invite=><div className="timeline-item" key={invite.id}><span className="timeline-dot"/><div style={{width:"100%"}}><div className="timeline-line"><b>{invite.email}</b><time>Einladung bis {dateTime(invite.expires_at)}</time></div><p>Zugriff vorgesehen bis {dateTime(invite.access_until)}</p><form action={revokeServiceInviteAction}><input type="hidden" name="assetId" value={asset.id}/><input type="hidden" name="inviteId" value={invite.id}/><ConfirmButton className="mini-danger" type="submit" message="Offene Serviceeinladung zurückziehen?">Einladung zurückziehen</ConfirmButton></form></div></div>)}</div>}</section>
  </div></main>;
}
