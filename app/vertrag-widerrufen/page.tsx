import type { Metadata } from "next";
import { submitWithdrawalAction } from "@/app/actions/withdrawal";
import { PublicShell } from "@/components/public-shell";
import styles from "@/app/public-pages.module.css";

export const metadata: Metadata = {
  title: "Vertrag widerrufen",
  description: "NavoPass-Vertrag elektronisch widerrufen und Eingangsbestätigung erhalten.",
  robots: { index: false, follow: false },
};

export default async function WithdrawalPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <PublicShell>
      <main className={styles.main}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>Elektronische Widerrufsfunktion</span>
          <h1>Vertrag widerrufen</h1>
          <p>Wenn dir für deinen online abgeschlossenen NavoPass-Vertrag ein Widerrufsrecht zusteht, kannst du deine Widerrufserklärung hier elektronisch abgeben.</p>
        </section>

        <article className={styles.legal}>
          <section>
            <h2>Widerrufserklärung</h2>
            <p>Für Verbraucher beträgt die gesetzliche Widerrufsfrist bei Fernabsatzverträgen grundsätzlich 14 Tage. Ob und wann die Frist in deinem konkreten Fall begonnen hat oder ein Widerrufsrecht noch besteht, richtet sich nach den gesetzlichen Voraussetzungen. Der Eingang deiner Erklärung wird unabhängig davon sofort mit Datum und Uhrzeit dokumentiert.</p>
            {error && <p className={styles.formError}>{error}</p>}
            <form action={submitWithdrawalAction} className={styles.cancelForm}>
              <label className={styles.field}>Name
                <input name="consumerName" autoComplete="name" required maxLength={160} />
              </label>

              <label className={styles.field}>E-Mail-Adresse des Vertrags
                <input name="email" type="email" autoComplete="email" required maxLength={320} />
                <small>An diese Adresse wird die elektronische Eingangsbestätigung gesendet.</small>
              </label>

              <label className={styles.field}>Vertrag, den du widerrufen möchtest
                <select name="contractLabel" defaultValue="NavoPass-Abo" required>
                  <option value="NavoPass-Abo">NavoPass-Abo – Tarif unbekannt</option>
                  <option value="NavoPass Plus">NavoPass Plus</option>
                  <option value="NavoPass Family">NavoPass Family</option>
                  <option value="NavoPass Business">NavoPass Business</option>
                </select>
              </label>

              <label className={styles.honeypot} aria-hidden="true">Website
                <input name="companyWebsite" tabIndex={-1} autoComplete="off" />
              </label>

              <p className={styles.formNote}>Mit dem folgenden Button erklärst du eindeutig den Widerruf des oben bezeichneten Vertrags. Du erhältst anschließend sofort eine speicherbare Eingangsbestätigung mit Inhalt, Datum und Uhrzeit deiner Erklärung.</p>
              <button className={styles.withdrawSubmit} type="submit">Widerruf bestätigen</button>
            </form>
          </section>

          <section>
            <h2>Widerrufsbelehrung</h2>
            <p>Verbraucher haben bei Fernabsatzverträgen grundsätzlich das Recht, den Vertrag binnen 14 Tagen ohne Angabe von Gründen zu widerrufen. Die Frist beginnt nach den gesetzlichen Vorschriften und nicht, bevor die vorgeschriebenen Informationen zum Widerrufsrecht erteilt wurden.</p>
            <p>Der Widerruf kann über die obige elektronische Funktion oder durch eine andere eindeutige Erklärung gegenüber Piotr Kaminski – Kamilunavo, Otto-Braun-Straße 14, 40595 Düsseldorf, E-Mail: contact@kamilunavo.com, erklärt werden. Zur Fristwahrung genügt die rechtzeitige Absendung der Widerrufserklärung.</p>
            <p>Im Falle eines wirksamen Widerrufs werden empfangene Leistungen nach den gesetzlichen Vorschriften rückabgewickelt. Soweit für bereits vor Ablauf der Widerrufsfrist auf ausdrücklichen Wunsch erbrachte Dienstleistungen gesetzlich Wertersatz geschuldet ist, richtet sich dessen Umfang nach den gesetzlichen Bestimmungen.</p>
          </section>

          <section>
            <h2>Muster-Widerrufsformular</h2>
            <p>Du musst dieses Muster nicht verwenden:</p>
            <p>„Hiermit widerrufe ich den von mir abgeschlossenen Vertrag über die Erbringung der NavoPass-Dienstleistung. Name: …, Anschrift: …, bestellt am: …, Datum: …“</p>
            <p>Die elektronische Funktion oben ist der schnellste Weg und bestätigt den Eingang unmittelbar.</p>
          </section>
        </article>
      </main>
    </PublicShell>
  );
}
