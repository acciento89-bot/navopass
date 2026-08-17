import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import styles from "@/app/public-pages.module.css";

export const metadata: Metadata = {
  title: "Nutzungsbedingungen",
  description: "Nutzungsbedingungen für den digitalen Dienst NavoPass.",
};

export default function TermsPage() {
  return (
    <PublicShell>
      <main className={styles.main}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>NavoPass Bedingungen</span>
          <h1>Nutzungsbedingungen</h1>
          <p>Diese Bedingungen regeln die Registrierung sowie die kostenlose und kostenpflichtige Nutzung des digitalen Dienstes NavoPass.</p>
        </section>

        <article className={styles.legal}>
          <section>
            <h2>1. Anbieter und Geltungsbereich</h2>
            <p>Anbieter von NavoPass ist Piotr Kaminski – Kamilunavo, Otto-Braun-Straße 14, 40595 Düsseldorf, Deutschland. Diese Nutzungsbedingungen gelten für Benutzerkonten und die Nutzung von navopass.de. Zwingende gesetzliche Rechte, insbesondere von Verbrauchern, bleiben unberührt.</p>
          </section>

          <section>
            <h2>2. Registrierung und Benutzerkonto</h2>
            <p>Für die geschützten Funktionen ist ein Benutzerkonto erforderlich. Nutzer müssen zutreffende Angaben machen, eine erreichbare E-Mail-Adresse verwenden und ihre Zugangsdaten vor unbefugtem Zugriff schützen. Für sicherheitsrelevante Funktionen und gemeinsame Bereiche kann eine Bestätigung der E-Mail-Adresse erforderlich sein.</p>
            <p>Der kostenlose Nutzungsvertrag kommt mit Abschluss der Registrierung und Bereitstellung des Kontos zustande. Ein kostenloses Konto wird niemals allein durch Zeitablauf oder Nutzung automatisch kostenpflichtig.</p>
          </section>

          <section>
            <h2>3. Tarife, Preise und kostenpflichtige Bestellung</h2>
            <p>NavoPass bietet einen kostenlosen Tarif sowie kostenpflichtige Tarife an. Leistungsumfang, technische Limits und die für den jeweiligen Abrechnungszeitraum ausgewiesenen Preise sind auf der Seite <Link href="/preise">Preise</Link> und unmittelbar vor der kostenpflichtigen Bestellung dargestellt.</p>
            <p>Eine kostenpflichtige Bestellung erfordert eine ausdrückliche Auswahl durch den Nutzer. Vor dem Wechsel zu Stripe werden Tarif, Abrechnungsintervall, wesentliche Leistungsmerkmale, Kündigungsbedingungen sowie die Hinweise zum Widerrufsrecht nochmals angezeigt und bestätigt. Die eigentliche Zahlungsabwicklung erfolgt über Stripe Checkout.</p>
            <p>Ein kostenpflichtiges Abonnement wird erst nach erfolgreichem Abschluss des Stripe-Checkouts und anschließender Bestätigung des Abonnementstatus für das NavoPass-Konto aktiviert. Maßgeblich für die Belastung ist der im Stripe-Checkout unmittelbar vor Abschluss ausgewiesene Gesamtpreis. Versandkosten fallen für NavoPass nicht an.</p>
          </section>

          <section>
            <h2>4. Abrechnungsintervall, Laufzeit und Verlängerung</h2>
            <p>Kostenpflichtige Tarife werden je nach Auswahl monatlich oder jährlich im Voraus abgerechnet. Das Abonnement läuft fort, bis es gekündigt oder auf andere Weise beendet wird. Ohne Kündigung beginnt nach Ablauf des jeweiligen Abrechnungszeitraums der nächste Abrechnungszeitraum.</p>
            <p>Eine ordentliche Kündigung ist zum Ende des laufenden Abrechnungszeitraums möglich. Das konkrete Ende wird im Konto beziehungsweise im Stripe-Kundenportal angezeigt. Gesetzliche Sonderkündigungs-, Widerrufs- und sonstige Beendigungsrechte bleiben unberührt.</p>
          </section>

          <section>
            <h2>5. Zahlung und Stripe</h2>
            <p>Für kostenpflichtige Abonnements wird Stripe als Zahlungs- und Abrechnungsdienst eingesetzt. Welche Zahlungsmittel tatsächlich verfügbar sind, wird im Stripe-Checkout angezeigt. NavoPass speichert keine vollständigen Kartennummern.</p>
            <p>Kann eine fällige Zahlung nicht erfolgreich verarbeitet werden, kann Stripe weitere Zahlungsversuche durchführen oder eine Aktualisierung des Zahlungsmittels verlangen. Der kostenpflichtige Leistungsumfang kann entsprechend dem von Stripe bestätigten Abonnementstatus eingeschränkt werden. Bestehende NavoPass-Daten werden bei einer tarifbedingten Einschränkung nicht allein deshalb automatisch gelöscht.</p>
          </section>

          <section>
            <h2>6. Leistungsumfang und Tariflimits</h2>
            <p>NavoPass ermöglicht insbesondere das Anlegen digitaler Objektpässe, das Speichern von Objekt- und Produktinformationen, Fotos und Dokumenten, das Führen einer Historie, das Verwalten von Wartungs- und Garantiefristen, Kalenderexporte sowie die Zusammenarbeit in persönlichen, Haushalts- und Team-Bereichen.</p>
            <p>Tarife können Grenzen für Anzahl der Pässe, Speicher, Nutzerplätze und gemeinsame Bereiche enthalten. Wird nach einer Tarifänderung ein niedrigeres Limit überschritten, bleiben vorhandene Daten grundsätzlich erhalten. NavoPass kann jedoch neue Pässe, Uploads, Mitglieder oder Bereiche blockieren, bis das Konto wieder innerhalb des aktuellen Limits liegt oder ein passender Tarif gewählt wird.</p>
          </section>

          <section>
            <h2>7. Beginn der kostenpflichtigen Leistung und Widerruf</h2>
            <p>Verbrauchern steht bei einem im Fernabsatz abgeschlossenen kostenpflichtigen Vertrag grundsätzlich ein gesetzliches Widerrufsrecht zu. Einzelheiten, die Widerrufsbelehrung und die elektronische Funktion <Link href="/vertrag-widerrufen">Vertrag widerrufen</Link> sind dauerhaft online erreichbar.</p>
            <p>Wenn der Nutzer die kostenpflichtigen NavoPass-Funktionen unmittelbar nach der Bestellung nutzen möchte, wird vor dem Checkout ausdrücklich abgefragt, ob NavoPass bereits vor Ablauf der Widerrufsfrist mit der Leistung beginnen soll. Die gesetzlichen Folgen eines späteren Widerrufs, einschließlich eines gegebenenfalls geschuldeten Wertersatzes für bereits auf ausdrücklichen Wunsch erbrachte Leistungen, richten sich ausschließlich nach den gesetzlichen Vorschriften.</p>
          </section>

          <section>
            <h2>8. Kündigung und Vertragsverwaltung</h2>
            <p>Angemeldete Nutzer können ihr Abonnement über den in NavoPass verlinkten Stripe-Kundenbereich verwalten. Zusätzlich steht ohne Anmeldung die dauerhaft erreichbare Funktion <Link href="/vertrag-kuendigen">Verträge hier kündigen</Link> zur Verfügung.</p>
            <p>Eine ordentliche Kündigung zum nächstmöglichen Zeitpunkt wird bei eindeutig zuordenbarem Stripe-Abonnement automatisiert zum Ende des laufenden Abrechnungszeitraums vorgemerkt. Kündigungen mit einem anderen gewünschten Beendigungszeitpunkt sowie außerordentliche Kündigungen werden mit Inhalt, Datum und Uhrzeit erfasst und entsprechend den gesetzlichen und vertraglichen Voraussetzungen bearbeitet. Der Eingang wird elektronisch bestätigt.</p>
          </section>

          <section>
            <h2>9. Tarifwechsel</h2>
            <p>Bei einem bestehenden kostenpflichtigen Abonnement erfolgt ein Tarif- oder Abrechnungswechsel über die hierfür bereitgestellten Stripe- beziehungsweise NavoPass-Funktionen. Vor einem Wechsel werden die dort maßgeblichen Preise und Abrechnungsfolgen angezeigt. Ein zweites paralleles NavoPass-Abonnement wird durch den normalen Tarifwechsel nicht beabsichtigt.</p>
          </section>

          <section>
            <h2>10. Eigene Inhalte und Nutzungsrechte</h2>
            <p>Nutzer behalten ihre Rechte an selbst hochgeladenen oder eingegebenen Inhalten. Sie räumen Kamilunavo lediglich die technisch erforderlichen Rechte ein, diese Inhalte zu speichern, zu verarbeiten, darzustellen und – soweit vom Nutzer aktiviert – über Freigabelinks oder QR-Codes zugänglich zu machen, soweit dies für die Bereitstellung von NavoPass erforderlich ist.</p>
            <p>Nutzer dürfen nur Inhalte hochladen oder teilen, für die sie die erforderlichen Rechte besitzen und deren Verarbeitung nicht gegen Gesetze oder Rechte Dritter verstößt.</p>
          </section>

          <section>
            <h2>11. Freigaben, QR-Codes und gemeinsame Bereiche</h2>
            <p>Nutzer steuern die Sichtbarkeit ihrer Objektpässe selbst. Bei „Per Link / QR“ können Personen mit dem Link auf freigegebene Inhalte zugreifen. Bei „Öffentlich“ können freigegebene Inhalte ohne Anmeldung abrufbar sein. Für vertrauliche oder personenbezogene Informationen sollte eine restriktive Sichtbarkeit gewählt werden.</p>
            <p>In gemeinsamen Bereichen bestimmt die zugewiesene Rolle, welche Mitglieder Inhalte ansehen, bearbeiten oder verwalten können. Der Inhaber eines Bereichs ist dafür verantwortlich, Einladungen und Rollen sachgerecht zu vergeben.</p>
          </section>

          <section>
            <h2>12. Unzulässige Nutzung</h2>
            <p>Untersagt sind insbesondere rechtswidrige Inhalte, Schadsoftware, Angriffe auf die Infrastruktur, Umgehung von Sicherheitsmaßnahmen, störender automatisierter Zugriff, Spam, die missbräuchliche Nutzung fremder Daten sowie Handlungen, die Stabilität oder Sicherheit von NavoPass beeinträchtigen.</p>
          </section>

          <section>
            <h2>13. Verfügbarkeit, Wartung und Änderungen</h2>
            <p>Kamilunavo bemüht sich um einen zuverlässigen Betrieb. Eine jederzeit unterbrechungsfreie Verfügbarkeit kann jedoch nicht zugesichert werden. Wartungsarbeiten, Sicherheitsmaßnahmen, technische Störungen oder Ereignisse außerhalb des Einflussbereichs können die Nutzung vorübergehend einschränken.</p>
            <p>Der Funktionsumfang kann weiterentwickelt werden. Für Änderungen laufender Verbraucherverträge und digitaler Produkte gelten die gesetzlichen Voraussetzungen.</p>
          </section>

          <section>
            <h2>14. Hinweise zu Fristen und Erinnerungen</h2>
            <p>Wartungs-, Garantie- und sonstige Fristfunktionen dienen der Organisation. Nutzer bleiben dafür verantwortlich, hinterlegte Daten auf Richtigkeit zu prüfen und rechtlich oder technisch relevante Fristen selbst zu überwachen. NavoPass ersetzt keine gesetzlich vorgeschriebene Prüfung, fachliche Wartung oder verbindliche Herstellerinformation.</p>
          </section>

          <section>
            <h2>15. Kontolöschung</h2>
            <p>Das Benutzerkonto kann in den Einstellungen gelöscht werden, soweit keine gemeinsam verwalteten Bereiche zunächst aufgeräumt werden müssen. Ist dem Konto ein noch laufendes NavoPass-Abonnement zugeordnet, versucht NavoPass dieses vor der endgültigen Kontolöschung bei Stripe zu beenden. Schlägt die Beendigung technisch fehl, wird die Kontolöschung abgebrochen, damit kein laufendes Abonnement ohne zugehöriges Konto zurückbleibt.</p>
            <p>Gesetzliche Aufbewahrungs-, Abrechnungs-, Erstattungs- und Nachweispflichten bleiben von der Kontolöschung unberührt.</p>
          </section>

          <section>
            <h2>16. Haftung</h2>
            <p>Die Haftung richtet sich nach den gesetzlichen Vorschriften. Bei leichter Fahrlässigkeit und Verletzung einer wesentlichen Vertragspflicht ist die Haftung, soweit gesetzlich zulässig, auf den vorhersehbaren vertragstypischen Schaden begrenzt. Unberührt bleiben insbesondere Vorsatz, grobe Fahrlässigkeit, Schäden an Leben, Körper oder Gesundheit sowie zwingende gesetzliche Haftung.</p>
          </section>

          <section>
            <h2>17. Datenschutz</h2>
            <p>Informationen zur Verarbeitung personenbezogener Daten, einschließlich der Zahlungsabwicklung über Stripe, sind in der <Link href="/datenschutz">Datenschutzerklärung</Link> beschrieben.</p>
          </section>

          <section>
            <h2>18. Verbraucherstreitbeilegung</h2>
            <p>Kamilunavo ist weder bereit noch verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen. Die frühere EU-Plattform für Online-Streitbeilegung ist eingestellt; deshalb wird kein veralteter OS-Link angegeben.</p>
          </section>

          <section>
            <h2>19. Anwendbares Recht</h2>
            <p>Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Gegenüber Verbrauchern gilt diese Rechtswahl nur, soweit dadurch nicht der Schutz zwingender Vorschriften des Staates ihres gewöhnlichen Aufenthalts entzogen wird. Gesetzliche Gerichtsstandsregelungen bleiben unberührt.</p>
          </section>

          <section>
            <h2>20. Änderungen dieser Bedingungen</h2>
            <p>Diese Bedingungen können angepasst werden, wenn sich NavoPass oder der rechtliche Rahmen ändern. Änderungen bestehender Verträge erfolgen nur im Rahmen der gesetzlichen Voraussetzungen. Ein kostenloser Tarif wird ohne eine neue ausdrückliche kostenpflichtige Bestellung nicht automatisch kostenpflichtig.</p>
          </section>

          <nav className={styles.legalLinks} aria-label="Weitere Informationen"><Link href="/impressum">Impressum</Link><Link href="/datenschutz">Datenschutz</Link><Link href="/preise">Preise</Link><Link href="/vertrag-widerrufen">Vertrag widerrufen</Link><Link href="/vertrag-kuendigen">Verträge hier kündigen</Link><Link href="/kontakt">Kontakt</Link></nav>
          <p className={styles.meta}>Stand: 17. August 2026 · Version 2026-08-17-paid-v1</p>
        </article>
      </main>
    </PublicShell>
  );
}
