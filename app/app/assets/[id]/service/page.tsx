import Link from "next/link";
import { notFound } from "next/navigation";
import { recordServiceEntryAction } from "@/app/actions/service-entry";
import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/auth";
import { getOwnedAsset, roleCanEdit } from "@/lib/assets";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ServiceEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { success, error } = await searchParams;
  const asset = await getOwnedAsset(user.id, id);
  if (!asset) notFound();
  if (!roleCanEdit(asset, user.id)) {
    return (
      <main className="app-page"><div className="container"><AppHeader name={user.name} />
        <div className="page-back"><Link href={`/app/assets/${asset.id}`}>← Zum Objektpass</Link></div>
        <section className="panel"><h1>Nur Lesezugriff</h1><p className="muted">Für einen Service- oder Wartungseintrag brauchst du mindestens die Rolle Bearbeiter.</p></section>
      </div></main>
    );
  }

  return (
    <main className="app-page"><div className="container"><AppHeader name={user.name} />
      <div className="page-back"><Link href={`/app/assets/${asset.id}`}>← Zum Objektpass</Link></div>
      <section className="passport-head">
        <div className="passport-title"><div className="passport-kicker"><span>{asset.category}</span><span>Service-Erfassung</span></div><h1>{asset.name}</h1><p>{[asset.manufacturer, asset.model, asset.serial_number].filter(Boolean).join(" · ")}</p></div>
        <div className="passport-qr"><img src={`/api/qr?data=${encodeURIComponent(`${(process.env.APP_URL || "https://navopass.de").replace(/\/$/, "")}/p/${asset.public_id}`)}`} alt="QR-Code des Objektpasses" width="132" height="132" /><small>#{asset.public_id}</small></div>
      </section>

      {success === "1" && <p className="form-status-success" role="status">Serviceeintrag gespeichert. Die Historie des Passes wurde aktualisiert.</p>}
      {error && <p className="form-status-error" role="alert">{error}</p>}

      <section className="panel">
        <div className="panel-head"><div><span className="eyebrow">Vor Ort erfassen</span><h2>Wartung / Service dokumentieren</h2></div><span className="count-pill">{formatDate(asset.next_service_date)}</span></div>
        <p className="muted">Der Eintrag wird mit deinem angemeldeten NavoPass-Konto protokolliert. So bleibt nachvollziehbar, wer die Historie ergänzt hat.</p>
        <form action={recordServiceEntryAction} className="compact-form event-form">
          <input type="hidden" name="assetId" value={asset.id} />
          <div className="two-cols">
            <label>Titel<input name="title" maxLength={180} defaultValue="Wartung durchgeführt" required /></label>
            <label>Typ<select name="eventType" defaultValue="SERVICE"><option value="SERVICE">Wartung / Service</option><option value="REPAIR">Reparatur</option><option value="INSPECTION">Prüfung / Inspektion</option><option value="NOTE">Notiz</option></select></label>
          </div>
          <div className="two-cols">
            <label>Datum<input name="eventDate" type="date" /></label>
            <label>Firma / Techniker<input name="provider" maxLength={200} defaultValue={user.name} /></label>
          </div>
          <label>Arbeiten / Messwerte / Bemerkungen<textarea name="description" maxLength={4000} rows={6} placeholder="z. B. Brenner gereinigt, Filter gewechselt, Messwerte geprüft …" /></label>
          <div className="two-cols">
            <label>Kosten €<input name="cost" inputMode="decimal" placeholder="0,00" /></label>
            <div className="service-checks">
              <label className="check-label"><input name="isPublic" type="checkbox" defaultChecked /> Im geteilten Pass sichtbar</label>
              <label className="check-label"><input name="advanceService" type="checkbox" defaultChecked /> Nächsten Wartungstermin berechnen</label>
            </div>
          </div>
          <button className="button" type="submit">Serviceeintrag speichern</button>
        </form>
      </section>
    </div></main>
  );
}
