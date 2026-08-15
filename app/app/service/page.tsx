import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { ServiceCenterClient } from "@/components/service-center-client";
import { requireUser } from "@/lib/auth";
import { listAssets } from "@/lib/assets";

export const dynamic = "force-dynamic";

export default async function ServicePage() {
  const user = await requireUser();
  const assets = await listAssets(user.id);

  return (
    <main className="app-page">
      <div className="container">
        <AppHeader name={user.name} />
        <div className="page-back"><Link href="/app">← Meine Pässe</Link></div>
        <section className="service-head">
          <div><span className="eyebrow">Service & Fristen</span><h1>Wartungszentrale</h1><p>Alle Wartungen und Garantiefristen im Blick – inklusive automatischer Folgetermine und Kalenderexport.</p></div>
          <a className="button" href="/api/calendar">Termine als Kalender ↓</a>
        </section>
        <ServiceCenterClient assets={assets} />
      </div>
    </main>
  );
}
