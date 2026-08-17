import type { Metadata } from "next";
import { submitCancellationAction } from "@/app/actions/cancellation";
import { PublicShell } from "@/components/public-shell";
import styles from "@/app/public-pages.module.css";

export const metadata: Metadata = {
  title: "Verträge hier kündigen",
  description: "NavoPass-Vertrag elektronisch kündigen und Empfangsbestätigung erhalten.",
  robots: { index: false, follow: false },
};

export default async function CancellationPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <PublicShell>
      <main className={styles.main}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>Kündigungsschaltfläche</span>
          <h1>Verträge hier kündigen</h1>
          <p>Hier kannst du eine ordentliche oder außerordentliche Kündigung für dein kostenpflichtiges NavoPass-Abonnement elektronisch erklären.</p>
        </section>

        <article className={styles.legal}>
          <section>
            <h2>Kündigungserklärung</h2>
            <p>Nach dem Absenden erhältst du sofort eine Bestätigungsseite mit Vorgangsnummer, Datum und Uhrzeit des Eingangs sowie deinen angegebenen Kündigungsdaten. Zusätzlich senden wir die Bestätigung an die angegebene E-Mail-Adresse, soweit der Mailversand technisch erreichbar ist.</p>
            {error && <p className={styles.formError}>{error}</p>}
            <form action={submitCancellationAction} className={styles.cancelForm}>
              <label className={styles.field}>E-Mail-Adresse des Vertrags
                <input name="email" type="email" autoComplete="email" required maxLength={320} />
                <small>Diese Adresse dient zugleich deiner Identifikation und der elektronischen Kündigungsbestätigung.</small>
              </label>

              <label className={styles.field}>Vertrag / Tarif
                <select name="contractLabel" defaultValue="NavoPass-Abo" required>
                  <option value="NavoPass-Abo">NavoPass-Abo – Tarif unbekannt</option>
                  <option value="NavoPass Plus">NavoPass Plus</option>
                  <option value="NavoPass Family">NavoPass Family</option>
                  <option value="NavoPass Business">NavoPass Business</option>
                </select>
              </label>

              <label className={styles.field}>Art der Kündigung
                <select name="cancellationKind" defaultValue="ORDINARY" required>
                  <option value="ORDINARY">Ordentliche Kündigung</option>
                  <option value="EXTRAORDINARY">Außerordentliche Kündigung</option>
                </select>
              </label>

              <label className={styles.field}>Kündigungsgrund bei außerordentlicher Kündigung
                <textarea name="reason" maxLength={2000} placeholder="Bei einer ordentlichen Kündigung kannst du dieses Feld leer lassen." />
              </label>

              <label className={styles.field}>Gewünschter Beendigungszeitpunkt
                <select name="requestedEndMode" defaultValue="NEXT_POSSIBLE" required>
                  <option value="NEXT_POSSIBLE">Zum nächstmöglichen Zeitpunkt</option>
                  <option value="IMMEDIATE">Sofort</option>
                  <option value="DATE">Zu einem bestimmten Datum</option>
                </select>
              </label>

              <label className={styles.field}>Gewünschtes Datum, falls oben „bestimmtes Datum“ gewählt wurde
                <input name="requestedEndDate" type="date" />
              </label>

              <label className={styles.honeypot} aria-hidden="true">Website
                <input name="companyWebsite" tabIndex={-1} autoComplete="off" />
              </label>

              <p className={styles.formNote}>Eine ordentliche Kündigung zum nächstmöglichen Zeitpunkt wird bei eindeutig zuordenbarem Stripe-Abo automatisch zum Ende des laufenden Abrechnungszeitraums vorgemerkt. Andere gewünschte Beendigungszeitpunkte und außerordentliche Kündigungen werden als Kündigungserklärung mit deinem angegebenen Zeitpunkt erfasst und geprüft.</p>
              <button className={styles.cancelSubmit} type="submit">jetzt kündigen</button>
            </form>
          </section>
        </article>
      </main>
    </PublicShell>
  );
}
