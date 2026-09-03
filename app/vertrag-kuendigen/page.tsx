import type { Metadata } from "next";
import { submitCancellationAction } from "@/app/actions/cancellation";
import { PublicShell } from "@/components/public-shell";
import styles from "@/app/public-pages.module.css";
import { getLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Verträge hier kündigen",
  description: "NavoPass-Vertrag elektronisch kündigen und Empfangsbestätigung erhalten.",
  robots: { index: false, follow: false },
};

export default async function CancellationPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const en = (await getLocale()) === "en";
  return (
    <PublicShell>
      <main className={styles.main}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>{en ? "Cancellation form" : "Kündigungsschaltfläche"}</span>
          <h1>{en ? "Cancel your contract here" : "Verträge hier kündigen"}</h1>
          <p>{en ? "Use this form to submit an ordinary or extraordinary cancellation of your paid NavoPass subscription electronically." : "Hier kannst du eine ordentliche oder außerordentliche Kündigung für dein kostenpflichtiges NavoPass-Abonnement elektronisch erklären."}</p>
        </section>

        <article className={styles.legal}>
          <section>
            <h2>{en ? "Cancellation notice" : "Kündigungserklärung"}</h2>
            <p>{en ? "After submitting, you will immediately receive a confirmation page containing a reference number, the date and time received, and your cancellation details. We will also send the confirmation to the email address provided where technically possible." : "Nach dem Absenden erhältst du sofort eine Bestätigungsseite mit Vorgangsnummer, Datum und Uhrzeit des Eingangs sowie deinen angegebenen Kündigungsdaten. Zusätzlich senden wir die Bestätigung an die angegebene E-Mail-Adresse, soweit der Mailversand technisch erreichbar ist."}</p>
            {error && <p className={styles.formError}>{error}</p>}
            <form action={submitCancellationAction} className={styles.cancelForm}>
              <input type="hidden" name="locale" value={en ? "en" : "de"} />
              <label className={styles.field}>{en ? "Contract email address" : "E-Mail-Adresse des Vertrags"}
                <input name="email" type="email" autoComplete="email" required maxLength={320} />
                <small>{en ? "This address is used for identification and the electronic cancellation confirmation." : "Diese Adresse dient zugleich deiner Identifikation und der elektronischen Kündigungsbestätigung."}</small>
              </label>

              <label className={styles.field}>{en ? "Contract / plan" : "Vertrag / Tarif"}
                <select name="contractLabel" defaultValue="NavoPass-Abo" required>
                  <option value="NavoPass-Abo">{en ? "NavoPass subscription – plan unknown" : "NavoPass-Abo – Tarif unbekannt"}</option>
                  <option value="NavoPass Plus">NavoPass Plus</option>
                  <option value="NavoPass Family">NavoPass Family</option>
                  <option value="NavoPass Business">NavoPass Business</option>
                </select>
              </label>

              <label className={styles.field}>{en ? "Type of cancellation" : "Art der Kündigung"}
                <select name="cancellationKind" defaultValue="ORDINARY" required>
                  <option value="ORDINARY">{en ? "Ordinary cancellation" : "Ordentliche Kündigung"}</option>
                  <option value="EXTRAORDINARY">{en ? "Extraordinary cancellation" : "Außerordentliche Kündigung"}</option>
                </select>
              </label>

              <label className={styles.field}>{en ? "Reason for extraordinary cancellation" : "Kündigungsgrund bei außerordentlicher Kündigung"}
                <textarea name="reason" maxLength={2000} placeholder={en ? "Leave this blank for an ordinary cancellation." : "Bei einer ordentlichen Kündigung kannst du dieses Feld leer lassen."} />
              </label>

              <label className={styles.field}>{en ? "Requested end date" : "Gewünschter Beendigungszeitpunkt"}
                <select name="requestedEndMode" defaultValue="NEXT_POSSIBLE" required>
                  <option value="NEXT_POSSIBLE">{en ? "At the earliest possible date" : "Zum nächstmöglichen Zeitpunkt"}</option>
                  <option value="IMMEDIATE">{en ? "Immediately" : "Sofort"}</option>
                  <option value="DATE">{en ? "On a specific date" : "Zu einem bestimmten Datum"}</option>
                </select>
              </label>

              <label className={styles.field}>{en ? "Requested date, if “specific date” was selected above" : "Gewünschtes Datum, falls oben „bestimmtes Datum“ gewählt wurde"}
                <input name="requestedEndDate" type="date" />
              </label>

              <label className={styles.honeypot} aria-hidden="true">Website
                <input name="companyWebsite" tabIndex={-1} autoComplete="off" />
              </label>

              <p className={styles.formNote}>{en ? "Where a Stripe subscription can be matched unambiguously, an ordinary cancellation at the earliest possible date is automatically scheduled for the end of the current billing period. Other requested dates and extraordinary cancellations are recorded and reviewed." : "Eine ordentliche Kündigung zum nächstmöglichen Zeitpunkt wird bei eindeutig zuordenbarem Stripe-Abo automatisch zum Ende des laufenden Abrechnungszeitraums vorgemerkt. Andere gewünschte Beendigungszeitpunkte und außerordentliche Kündigungen werden als Kündigungserklärung mit deinem angegebenen Zeitpunkt erfasst und geprüft."}</p>
              <button className={styles.cancelSubmit} type="submit">{en ? "Cancel now" : "jetzt kündigen"}</button>
            </form>
          </section>
        </article>
      </main>
    </PublicShell>
  );
}
