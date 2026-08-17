import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import {
  cancellationEndLabel,
  cancellationKindLabel,
  cancellationReceivedLabel,
  getCancellationByReceiptToken,
} from "@/lib/cancellation";
import styles from "@/app/public-pages.module.css";

export const metadata: Metadata = {
  title: "Kündigungsbestätigung",
  robots: { index: false, follow: false },
};

export default async function CancellationReceiptPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const receipt = await getCancellationByReceiptToken(token);

  return (
    <PublicShell>
      <main className={styles.main}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>Empfangsbestätigung</span>
          <h1>{receipt ? "Kündigung eingegangen" : "Bestätigung nicht gefunden"}</h1>
          <p>{receipt ? "Diese Seite dokumentiert deine elektronisch abgegebene Kündigungserklärung." : "Der Bestätigungslink ist ungültig oder nicht mehr verfügbar."}</p>
        </section>

        {receipt ? <article className={styles.legal}>
          <section>
            <h2>Deine Kündigungserklärung</h2>
            <div className={styles.receiptGrid}>
              <div><span>Vorgangsnummer</span><b>{receipt.id}</b></div>
              <div><span>Eingang</span><b>{cancellationReceivedLabel(receipt.requested_at)}</b></div>
              <div><span>Vertrag</span><b>{receipt.contract_label}</b></div>
              <div><span>Art</span><b>{cancellationKindLabel(receipt.cancellation_kind)}</b></div>
              <div><span>Gewünschtes Ende</span><b>{cancellationEndLabel(receipt)}</b></div>
              <div><span>Bestätigung an</span><b>{receipt.email}</b></div>
            </div>
            {receipt.reason && <p><strong>Angegebener Kündigungsgrund:</strong><br />{receipt.reason}</p>}
            <p className={styles.receiptStatus}><strong>Bearbeitungsstatus:</strong> {receipt.processing_note || "Die Kündigungserklärung ist eingegangen."}</p>
          </section>

          <section>
            <h2>Bestätigung speichern</h2>
            <p>Du kannst diese Empfangsbestätigung als Textdatei herunterladen und dauerhaft speichern. Der Download enthält Vorgangsnummer, Datum und Uhrzeit des Eingangs sowie die von dir abgegebenen Kündigungsdaten.</p>
            <div className={styles.receiptActions}>
              <a className={styles.priceAction} href={`/api/cancellation-receipt?token=${encodeURIComponent(token)}`}>Bestätigung herunterladen</a>
              <Link className={`${styles.priceAction} ${styles.muted}`} href="/">Zur Startseite</Link>
            </div>
          </section>
        </article> : <article className={styles.legal}><p>Bitte verwende den vollständigen Link aus deiner Kündigungsbestätigung oder sende die Kündigung erneut über <Link href="/vertrag-kuendigen">Verträge hier kündigen</Link>.</p></article>}
      </main>
    </PublicShell>
  );
}
