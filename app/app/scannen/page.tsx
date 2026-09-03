import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { QrScanner } from "@/components/qr-scanner";
import { requireUser } from "@/lib/auth";
import { getLocale } from "@/lib/i18n";

export const dynamic="force-dynamic";

export default async function ScanPage(){
  const user=await requireUser();
  const locale=await getLocale();const en=locale==="en";
  return <main className="app-page"><div className="container"><AppHeader name={user.name}/><div className="page-back"><Link href="/app">← {en?"My passes":"Meine Pässe"}</Link></div>
    <section className="settings-head"><span className="eyebrow">{en?"On site":"Vor Ort"}</span><h1>{en?"Scan QR code":"QR-Code scannen"}</h1><p>{en?"Open a NavoPass directly at the asset. With the required permission, you can then document maintenance, repair, or inspection work.":"Öffne einen NavoPass direkt am Gerät. Mit entsprechender Berechtigung kannst du anschließend Wartung, Reparatur oder Prüfung dokumentieren."}</p></section>
    <section className="panel scanner-panel"><QrScanner locale={locale}/></section>
  </div></main>;
}
