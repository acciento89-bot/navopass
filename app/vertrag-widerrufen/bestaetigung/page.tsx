import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { getWithdrawalByReceiptToken, withdrawalReceivedLabel } from "@/lib/withdrawal";
import styles from "@/app/public-pages.module.css";
import { getLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Widerrufsbestätigung",
  robots: { index: false, follow: false },
};

export default async function WithdrawalReceiptPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const receipt = await getWithdrawalByReceiptToken(token);
  const en = (await getLocale()) === "en";

  return (
    <PublicShell>
      <main className={styles.main}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>{en ? "Receipt confirmation" : "Eingangsbestätigung"}</span>
          <h1>{receipt ? (en ? "Withdrawal received" : "Widerruf eingegangen") : (en ? "Confirmation not found" : "Bestätigung nicht gefunden")}</h1>
          <p>{receipt ? (en ? "This page documents the content, date, and time of your electronic withdrawal notice." : "Diese Seite dokumentiert Inhalt, Datum und Uhrzeit deiner elektronischen Widerrufserklärung.") : (en ? "The confirmation link is invalid or unavailable." : "Der Bestätigungslink ist ungültig oder nicht verfügbar.")}</p>
        </section>

        {receipt ? <article className={styles.legal}>
          <section>
            <h2>{en ? "Your withdrawal notice" : "Deine Widerrufserklärung"}</h2>
            <div className={styles.receiptGrid}>
              <div><span>{en ? "Reference number" : "Vorgangsnummer"}</span><b>{receipt.id}</b></div>
              <div><span>{en ? "Received" : "Eingang"}</span><b>{withdrawalReceivedLabel(receipt.requested_at)}</b></div>
              <div><span>Name</span><b>{receipt.consumer_name}</b></div>
              <div><span>{en ? "Contract" : "Vertrag"}</span><b>{receipt.contract_label}</b></div>
              <div><span>{en ? "Confirmation sent to" : "Bestätigung an"}</span><b>{receipt.email}</b></div>
              <div><span>{en ? "Notice" : "Erklärung"}</span><b>{en ? "Withdrawal from contract" : "Vertrag wird widerrufen"}</b></div>
            </div>
            <p className={styles.receiptStatus}><strong>{en ? "Processing status:" : "Bearbeitungsstatus:"}</strong> {receipt.processing_note || (en ? "The withdrawal notice has been received." : "Die Widerrufserklärung ist eingegangen.")}</p>
          </section>

          <section>
            <h2>{en ? "Save confirmation" : "Bestätigung speichern"}</h2>
            <p>{en ? "Download this receipt confirmation as a text file for permanent storage." : "Du kannst diese Eingangsbestätigung als Textdatei herunterladen und dauerhaft speichern."}</p>
            <div className={styles.receiptActions}>
              <a className={styles.priceAction} href={`/api/withdrawal-receipt?token=${encodeURIComponent(token)}`}>{en ? "Download confirmation" : "Bestätigung herunterladen"}</a>
              <Link className={`${styles.priceAction} ${styles.muted}`} href="/">{en ? "Home" : "Zur Startseite"}</Link>
            </div>
          </section>
        </article> : <article className={styles.legal}><p>{en ? <>Please use the complete link from your email or submit the notice again via <Link href="/vertrag-widerrufen">Withdraw from contract</Link>.</> : <>Bitte verwende den vollständigen Link aus deiner E-Mail oder sende den Widerruf erneut über <Link href="/vertrag-widerrufen">Vertrag widerrufen</Link>.</>}</p></article>}
      </main>
    </PublicShell>
  );
}
