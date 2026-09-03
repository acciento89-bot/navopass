import type { Metadata } from "next";
import { submitWithdrawalAction } from "@/app/actions/withdrawal";
import { PublicShell } from "@/components/public-shell";
import styles from "@/app/public-pages.module.css";
import { getLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Vertrag widerrufen",
  description: "NavoPass-Vertrag elektronisch widerrufen und Eingangsbestätigung erhalten.",
  robots: { index: false, follow: false },
};

export default async function WithdrawalPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const en = (await getLocale()) === "en";
  return (
    <PublicShell>
      <main className={styles.main}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>{en ? "Electronic withdrawal form" : "Elektronische Widerrufsfunktion"}</span>
          <h1>{en ? "Withdraw from your contract" : "Vertrag widerrufen"}</h1>
          <p>{en ? "If you have a right of withdrawal for your NavoPass contract concluded online, you can submit your notice electronically here." : "Wenn dir für deinen online abgeschlossenen NavoPass-Vertrag ein Widerrufsrecht zusteht, kannst du deine Widerrufserklärung hier elektronisch abgeben."}</p>
        </section>

        <article className={styles.legal}>
          <section>
            <h2>{en ? "Notice of withdrawal" : "Widerrufserklärung"}</h2>
            <p>{en ? "For consumers, the statutory withdrawal period for distance contracts is generally 14 days. Whether and when it began in your particular case, or whether a right of withdrawal still exists, depends on the applicable statutory requirements. Receipt of your notice is documented immediately with date and time in all cases." : "Für Verbraucher beträgt die gesetzliche Widerrufsfrist bei Fernabsatzverträgen grundsätzlich 14 Tage. Ob und wann die Frist in deinem konkreten Fall begonnen hat oder ein Widerrufsrecht noch besteht, richtet sich nach den gesetzlichen Voraussetzungen. Der Eingang deiner Erklärung wird unabhängig davon sofort mit Datum und Uhrzeit dokumentiert."}</p>
            {error && <p className={styles.formError}>{error}</p>}
            <form action={submitWithdrawalAction} className={styles.cancelForm}>
              <input type="hidden" name="locale" value={en ? "en" : "de"} />
              <label className={styles.field}>{en ? "Name" : "Name"}
                <input name="consumerName" autoComplete="name" required maxLength={160} />
              </label>

              <label className={styles.field}>{en ? "Contract email address" : "E-Mail-Adresse des Vertrags"}
                <input name="email" type="email" autoComplete="email" required maxLength={320} />
                <small>{en ? "The electronic receipt confirmation will be sent to this address." : "An diese Adresse wird die elektronische Eingangsbestätigung gesendet."}</small>
              </label>

              <label className={styles.field}>{en ? "Contract you wish to withdraw from" : "Vertrag, den du widerrufen möchtest"}
                <select name="contractLabel" defaultValue="NavoPass-Abo" required>
                  <option value="NavoPass-Abo">{en ? "NavoPass subscription – plan unknown" : "NavoPass-Abo – Tarif unbekannt"}</option>
                  <option value="NavoPass Plus">NavoPass Plus</option>
                  <option value="NavoPass Family">NavoPass Family</option>
                  <option value="NavoPass Business">NavoPass Business</option>
                </select>
              </label>

              <label className={styles.honeypot} aria-hidden="true">Website
                <input name="companyWebsite" tabIndex={-1} autoComplete="off" />
              </label>

              <p className={styles.formNote}>{en ? "By clicking the button below, you unambiguously declare withdrawal from the contract specified above. You will immediately receive a storable confirmation containing the notice, date, and time." : "Mit dem folgenden Button erklärst du eindeutig den Widerruf des oben bezeichneten Vertrags. Du erhältst anschließend sofort eine speicherbare Eingangsbestätigung mit Inhalt, Datum und Uhrzeit deiner Erklärung."}</p>
              <button className={styles.withdrawSubmit} type="submit">{en ? "Confirm withdrawal" : "Widerruf bestätigen"}</button>
            </form>
          </section>

          <section>
            <h2>{en ? "Withdrawal information" : "Widerrufsbelehrung"}</h2>
            <p>{en ? "Consumers generally have the right to withdraw from a distance contract within 14 days without giving a reason. The period begins in accordance with statutory rules and not before the required information about the right of withdrawal has been provided." : "Verbraucher haben bei Fernabsatzverträgen grundsätzlich das Recht, den Vertrag binnen 14 Tagen ohne Angabe von Gründen zu widerrufen. Die Frist beginnt nach den gesetzlichen Vorschriften und nicht, bevor die vorgeschriebenen Informationen zum Widerrufsrecht erteilt wurden."}</p>
            <p>{en ? "Withdrawal may be declared using the electronic form above or by another unambiguous statement to Piotr Kaminski – Kamilunavo, Otto-Braun-Straße 14, 40595 Düsseldorf, Germany, email: contact@kamilunavo.com. Timely dispatch of the notice is sufficient to meet the deadline." : "Der Widerruf kann über die obige elektronische Funktion oder durch eine andere eindeutige Erklärung gegenüber Piotr Kaminski – Kamilunavo, Otto-Braun-Straße 14, 40595 Düsseldorf, E-Mail: contact@kamilunavo.com, erklärt werden. Zur Fristwahrung genügt die rechtzeitige Absendung der Widerrufserklärung."}</p>
            <p>{en ? "In the event of an effective withdrawal, benefits received are reversed in accordance with statutory rules. Where compensation is legally owed for services already provided before expiry of the withdrawal period at the consumer’s express request, its extent is governed by applicable law." : "Im Falle eines wirksamen Widerrufs werden empfangene Leistungen nach den gesetzlichen Vorschriften rückabgewickelt. Soweit für bereits vor Ablauf der Widerrufsfrist auf ausdrücklichen Wunsch erbrachte Dienstleistungen gesetzlich Wertersatz geschuldet ist, richtet sich dessen Umfang nach den gesetzlichen Bestimmungen."}</p>
          </section>

          <section>
            <h2>{en ? "Model withdrawal form" : "Muster-Widerrufsformular"}</h2>
            <p>{en ? "You are not required to use this model:" : "Du musst dieses Muster nicht verwenden:"}</p>
            <p>{en ? "“I hereby withdraw from the contract I concluded for the provision of the NavoPass service. Name: …, address: …, ordered on: …, date: …”" : "„Hiermit widerrufe ich den von mir abgeschlossenen Vertrag über die Erbringung der NavoPass-Dienstleistung. Name: …, Anschrift: …, bestellt am: …, Datum: …“"}</p>
            <p>{en ? "The electronic form above is the fastest option and confirms receipt immediately." : "Die elektronische Funktion oben ist der schnellste Weg und bestätigt den Eingang unmittelbar."}</p>
          </section>
        </article>
      </main>
    </PublicShell>
  );
}
