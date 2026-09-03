import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { ServiceCenterClient } from "@/components/service-center-client";
import { requireUser } from "@/lib/auth";
import { listAssets } from "@/lib/assets";
import { ensureCustomerSchema } from "@/lib/customer-schema";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type CustomerOption = { id: string; name: string; city: string | null };
type AssetCustomer = { id: string; service_customer_id: string | null };

export default async function ServicePage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string; customer?: string }> }) {
  const user = await requireUser();
  const assets = await listAssets(user.id);
  const { success, error, customer } = await searchParams;
  let customers: CustomerOption[] = [];
  let customerByAsset: Record<string, string> = {};

  if (user.account_type === "PROFESSIONAL") {
    await ensureCustomerSchema();
    customers = (await query<CustomerOption>("SELECT id,name,city FROM service_customers WHERE user_id=$1 ORDER BY name ASC", [user.id])).rows;
    if (assets.length > 0) {
      const assignments = (await query<AssetCustomer>("SELECT id,service_customer_id FROM assets WHERE id=ANY($1::uuid[])", [assets.map(asset => asset.id)])).rows;
      customerByAsset = Object.fromEntries(assignments.filter(row => row.service_customer_id).map(row => [row.id, row.service_customer_id as string]));
    }
  }
  const initialCustomerId = customer && customers.some(item => item.id === customer) ? customer : "ALL";

  return (
    <main className="app-page">
      <div className="container">
        <AppHeader name={user.name} />
        <div className="page-back"><Link href="/app">← Meine Pässe</Link></div>
        <section className="service-head">
          <div><span className="eyebrow">Service & Fristen</span><h1>Wartungszentrale</h1><p>Alle Wartungen und Garantiefristen im Blick – inklusive automatischer Folgetermine und Kalenderexport.</p></div>
          <a className="button" href="/api/calendar">Termine als Kalender ↓</a>
        </section>
        {success && <p className="form-success team-message">{success}</p>}
        {error && <p className="form-error team-message">{error}</p>}
        <ServiceCenterClient assets={assets} customers={customers} customerByAsset={customerByAsset} initialCustomerId={initialCustomerId} />
      </div>
    </main>
  );
}
