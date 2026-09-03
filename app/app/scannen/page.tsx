import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { QrScanner } from "@/components/qr-scanner";
import { requireUser } from "@/lib/auth";

export const dynamic="force-dynamic";

export default async function ScanPage(){
  const user=await requireUser();
  return <main className="app-page"><div className="container"><AppHeader name={user.name}/><div className="page-back"><Link href="/app">← Meine Pässe</Link></div>
    <section className="settings-head"><span className="eyebrow">Vor Ort</span><h1>QR-Code scannen</h1><p>Öffne einen NavoPass direkt am Gerät. Mit entsprechender Berechtigung kannst du anschließend Wartung, Reparatur oder Prüfung dokumentieren.</p></section>
    <section className="panel scanner-panel"><QrScanner/></section>
  </div></main>;
}
