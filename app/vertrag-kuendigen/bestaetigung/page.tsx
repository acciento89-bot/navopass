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
import { getLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Kündigungsbestätigung",
  robots: { index: false, follow: false },
};

export default async function CancellationReceiptPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const receipt = await getCancellationByReceiptToken(token);
  const en = (await getLocale()) === "en";

  return (
    <PublicShell>
      <main className={styles.main}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>{en ? "Receipt confirmation" : "Empfangsbestätigung"}</span>
          <h1>{receipt ? (en ? "Cancellation received" : "Kündigung eingegangen") : (en ? "Confirmation not found" : "Bestätigung nicht gefunden")}</h1>
          <p>{receipt ? (en ? "This page documents your electronically submitted cancellation notice." : "Diese Seite dokumentiert deine elektronisch abgegebene Kündigungserklärung.") : (en ? "The confirmation link is invalid or no longer available." : "Der Bestätigungslink ist ungültig oder nicht mehr verfügbar.")}</p>
        </section>

        {receipt ? <article className={styles.legal}>
          <section>
            <h2>{en ? "Your cancellation notice" : "Deine Kündigungserklärung"}</h2>
            <div className={styles.receiptGrid}>
              <div><span>{en ? "Reference number" : "Vorgangsnummer"}</span><b>{receipt.id}</b></div>
              <div><span>{en ? "Received" : "Eingang"}</span><b>{cancellationReceivedLabel(receipt.requested_at)}</b></div>
              <div><span>{en ? "Contract" : "Vertrag"}</span><b>{receipt.contract_label}</b></div>
              <div><span>{en ? "Type" : "Art"}</span><b>{en ? (receipt.cancellation_kind === "EXTRAORDINARY" ? "Extraordinary cancellation" : "Ordinary cancellation") : cancellationKindLabel(receipt.cancellation_kind)}</b></div>
              <div><span>{en ? "Requested end" : "Gewünschtes Ende"}</span><b>{cancellationEndLabel(receipt)}</b></div>
              <div><span>{en ? "Confirmation sent to" : "Bestätigung an"}</span><b>{receipt.email}</b></div>
            </div>
            {receipt.reason && <p><strong>{en ? "Reason provided:" : "Angegebener Kündigungsgrund:"}</strong><br />{receipt.reason}</p>}
            <p className={styles.receiptStatus}><strong>{en ? "Processing status:" : "Bearbeitungsstatus:"}</strong> {receipt.processing_note || (en ? "The cancellation notice has been received." : "Die Kündigungserklärung ist eingegangen.")}</p>
          </section>

          <section>
            <h2>{en ? "Save confirmation" : "Bestätigung speichern"}</h2>
            <p>{en ? "Download this receipt confirmation as a text file for permanent storage. It contains the reference number, date and time received, and the cancellation details you submitted." : "Du kannst diese Empfangsbestätigung als Textdatei herunterladen und dauerhaft speichern. Der Download enthält Vorgangsnummer, Datum und Uhrzeit des Eingangs sowie die von dir abgegebenen Kündigungsdaten."}</p>
            <div className={styles.receiptActions}>
              <a className={styles.priceAction} href={`/api/cancellation-receipt?token=${encodeURIComponent(token)}`}>{en ? "Download confirmation" : "Bestätigung herunterladen"}</a>
              <Link className={`${styles.priceAction} ${styles.muted}`} href="/">{en ? "Home" : "Zur Startseite"}</Link>
            </div>
          </section>
        </article> : <article className={styles.legal}><p>{en ? <>Please use the complete link from your cancellation confirmation or submit the cancellation again via <Link href="/vertrag-kuendigen">Cancel contract</Link>.</> : <>Bitte verwende den vollständigen Link aus deiner Kündigungsbestätigung oder sende die Kündigung erneut über <Link href="/vertrag-kuendigen">Verträge hier kündigen</Link>.</>}</p></article>}
      </main>
    </PublicShell>
  );
}
