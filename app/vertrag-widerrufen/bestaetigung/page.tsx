import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { getWithdrawalByReceiptToken, withdrawalReceivedLabel } from "@/lib/withdrawal";
import styles from "@/app/public-pages.module.css";

export const metadata: Metadata = {
  title: "Widerrufsbestätigung",
  robots: { index: false, follow: false },
};

export default async function WithdrawalReceiptPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const receipt = await getWithdrawalByReceiptToken(token);

  return (
    <PublicShell>
      <main className={styles.main}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>Eingangsbestätigung</span>
          <h1>{receipt ? "Widerruf eingegangen" : "Bestätigung nicht gefunden"}</h1>
          <p>{receipt ? "Diese Seite dokumentiert Inhalt, Datum und Uhrzeit deiner elektronischen Widerrufserklärung." : "Der Bestätigungslink ist ungültig oder nicht verfügbar."}</p>
        </section>

        {receipt ? <article className={styles.legal}>
          <section>
            <h2>Deine Widerrufserklärung</h2>
            <div className={styles.receiptGrid}>
              <div><span>Vorgangsnummer</span><b>{receipt.id}</b></div>
              <div><span>Eingang</span><b>{withdrawalReceivedLabel(receipt.requested_at)}</b></div>
              <div><span>Name</span><b>{receipt.consumer_name}</b></div>
              <div><span>Vertrag</span><b>{receipt.contract_label}</b></div>
              <div><span>Bestätigung an</span><b>{receipt.email}</b></div>
              <div><span>Erklärung</span><b>Vertrag wird widerrufen</b></div>
            </div>
            <p className={styles.receiptStatus}><strong>Bearbeitungsstatus:</strong> {receipt.processing_note || "Die Widerrufserklärung ist eingegangen."}</p>
          </section>

          <section>
            <h2>Bestätigung speichern</h2>
            <p>Du kannst diese Eingangsbestätigung als Textdatei herunterladen und dauerhaft speichern.</p>
            <div className={styles.receiptActions}>
              <a className={styles.priceAction} href={`/api/withdrawal-receipt?token=${encodeURIComponent(token)}`}>Bestätigung herunterladen</a>
              <Link className={`${styles.priceAction} ${styles.muted}`} href="/">Zur Startseite</Link>
            </div>
          </section>
        </article> : <article className={styles.legal}><p>Bitte verwende den vollständigen Link aus deiner E-Mail oder sende den Widerruf erneut über <Link href="/vertrag-widerrufen">Vertrag widerrufen</Link>.</p></article>}
      </main>
    </PublicShell>
  );
}
