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
          <p>Diese Bedingungen regeln die Registrierung und Nutzung des digitalen Dienstes NavoPass.</p>
        </section>

        <article className={styles.legal}>
          <section>
            <h2>1. Anbieter und Geltungsbereich</h2>
            <p>Anbieter von NavoPass ist Piotr Kaminski – Kamilunavo, Otto-Braun-Straße 14, 40595 Düsseldorf, Deutschland. Diese Nutzungsbedingungen gelten für Benutzerkonten und die Nutzung von navopass.de. Zwingende gesetzliche Rechte, insbesondere von Verbrauchern, bleiben unberührt.</p>
          </section>

          <section>
            <h2>2. Registrierung und Vertragsschluss</h2>
            <p>Für die Nutzung der geschützten Funktionen ist ein Benutzerkonto erforderlich. Der Nutzungsvertrag kommt zustande, wenn die Registrierung abgeschlossen und das Konto bereitgestellt wird. Nutzer müssen bei der Registrierung zutreffende Angaben machen und ihre Zugangsdaten vor unbefugtem Zugriff schützen.</p>
          </section>

          <section>
            <h2>3. Aktuelle kostenlose Startphase</h2>
            <p>NavoPass wird derzeit in einer kostenlosen Startphase angeboten. Für Registrierung und aktuelle Nutzung wird kein Entgelt verlangt und kein Zahlungsmittel benötigt. Die derzeitigen Konditionen sind auf der Seite <Link href="/preise">Preise</Link> dargestellt.</p>
            <p>Eine kostenlose Nutzung wird nicht automatisch in ein kostenpflichtiges Abonnement umgewandelt. Sollte Kamilunavo später kostenpflichtige Tarife anbieten, ist für einen kostenpflichtigen Vertrag eine gesonderte, ausdrückliche Bestellung des Nutzers erforderlich. Preis, Leistungsumfang, Laufzeit, Kündigungsbedingungen und gesetzlich erforderliche Verbraucherinformationen werden vor der Bestellung angezeigt.</p>
          </section>

          <section>
            <h2>4. Leistungsumfang</h2>
            <p>NavoPass ermöglicht insbesondere das Anlegen digitaler Objektpässe, das Speichern von Objekt- und Produktinformationen, Fotos und Dokumenten, das Führen einer Historie, das Verwalten von Wartungs- und Garantiefristen, Kalenderexporte sowie die Zusammenarbeit in persönlichen, Haushalts- und Team-Bereichen.</p>
            <p>Der konkrete Funktionsumfang kann im Rahmen der Weiterentwicklung angepasst oder erweitert werden. Gesetzliche Anforderungen an Änderungen digitaler Produkte bleiben unberührt.</p>
          </section>

          <section>
            <h2>5. Eigene Inhalte und Nutzungsrechte</h2>
            <p>Nutzer behalten ihre Rechte an selbst hochgeladenen oder eingegebenen Inhalten. Sie räumen Kamilunavo lediglich die technisch erforderlichen Rechte ein, diese Inhalte zu speichern, zu verarbeiten, darzustellen und – soweit vom Nutzer aktiviert – über Freigabelinks oder QR-Codes zugänglich zu machen, soweit dies für die Bereitstellung von NavoPass erforderlich ist.</p>
            <p>Nutzer dürfen nur Inhalte hochladen oder teilen, für die sie die erforderlichen Rechte besitzen und deren Verarbeitung nicht gegen Gesetze oder Rechte Dritter verstößt.</p>
          </section>

          <section>
            <h2>6. Freigaben, QR-Codes und gemeinsame Bereiche</h2>
            <p>Nutzer steuern die Sichtbarkeit ihrer Objektpässe selbst. Bei der Einstellung „Per Link / QR“ können Personen mit dem Link auf die freigegebenen Inhalte zugreifen. Bei „Öffentlich“ können die freigegebenen Inhalte ohne Anmeldung abrufbar sein. Für vertrauliche oder personenbezogene Informationen sollte die Sichtbarkeit entsprechend restriktiv gewählt werden.</p>
            <p>In gemeinsamen Bereichen bestimmt die zugewiesene Rolle, welche Mitglieder Inhalte ansehen, bearbeiten oder verwalten können. Der Inhaber eines Bereichs ist dafür verantwortlich, Einladungen und Rollen sachgerecht zu vergeben.</p>
          </section>

          <section>
            <h2>7. Unzulässige Nutzung</h2>
            <p>Untersagt sind insbesondere rechtswidrige Inhalte, Schadsoftware, Angriffe auf die Infrastruktur, Umgehung von Sicherheitsmaßnahmen, störender automatisierter Zugriff, Spam, die missbräuchliche Nutzung fremder Daten sowie Handlungen, die die Stabilität oder Sicherheit von NavoPass beeinträchtigen.</p>
          </section>

          <section>
            <h2>8. Verfügbarkeit und Wartung</h2>
            <p>Kamilunavo bemüht sich um einen zuverlässigen Betrieb. Eine jederzeit unterbrechungsfreie Verfügbarkeit kann jedoch nicht zugesichert werden. Wartungsarbeiten, Sicherheitsmaßnahmen, technische Störungen oder Ereignisse außerhalb des Einflussbereichs können die Nutzung vorübergehend einschränken.</p>
          </section>

          <section>
            <h2>9. Hinweise zu Fristen und Erinnerungen</h2>
            <p>Wartungs-, Garantie- und sonstige Fristfunktionen dienen der Organisation. Nutzer bleiben dafür verantwortlich, hinterlegte Daten auf Richtigkeit zu prüfen und rechtlich oder technisch relevante Fristen selbst zu überwachen. NavoPass ersetzt keine gesetzlich vorgeschriebene Prüfung, fachliche Wartung oder verbindliche Herstellerinformation.</p>
          </section>

          <section>
            <h2>10. Beendigung des Kontos</h2>
            <p>Während der kostenlosen Startphase kann der Nutzer den Nutzungsvertrag jederzeit beenden. Solange keine direkte Kontolöschung in NavoPass angeboten wird, kann die Löschung über <a href="mailto:support@kamilunavo.com">support@kamilunavo.com</a> oder das <Link href="/kontakt">Kontaktformular</Link> verlangt werden. Gesetzliche Aufbewahrungs- und Nachweispflichten bleiben unberührt.</p>
          </section>

          <section>
            <h2>11. Haftung</h2>
            <p>Die Haftung richtet sich nach den gesetzlichen Vorschriften. Bei leichter Fahrlässigkeit und Verletzung einer wesentlichen Vertragspflicht ist die Haftung, soweit gesetzlich zulässig, auf den vorhersehbaren vertragstypischen Schaden begrenzt. Unberührt bleiben insbesondere Fälle von Vorsatz, grober Fahrlässigkeit, Schäden an Leben, Körper oder Gesundheit sowie zwingende gesetzliche Haftung.</p>
          </section>

          <section>
            <h2>12. Datenschutz</h2>
            <p>Informationen zur Verarbeitung personenbezogener Daten sind in der <Link href="/datenschutz">Datenschutzerklärung</Link> beschrieben.</p>
          </section>

          <section>
            <h2>13. Verbraucherstreitbeilegung</h2>
            <p>Kamilunavo ist weder bereit noch verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen. Die frühere EU-Plattform für Online-Streitbeilegung ist eingestellt; deshalb wird kein veralteter OS-Link angegeben.</p>
          </section>

          <section>
            <h2>14. Anwendbares Recht</h2>
            <p>Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Gegenüber Verbrauchern gilt diese Rechtswahl nur, soweit dadurch nicht der Schutz zwingender Vorschriften des Staates ihres gewöhnlichen Aufenthalts entzogen wird. Gesetzliche Gerichtsstandsregelungen bleiben unberührt.</p>
          </section>

          <section>
            <h2>15. Änderungen</h2>
            <p>Diese Bedingungen können angepasst werden, wenn sich NavoPass oder der rechtliche Rahmen ändern. Änderungen bestehender Nutzungsverträge erfolgen nur im Rahmen der gesetzlichen Voraussetzungen. Eine Einführung kostenpflichtiger Tarife führt ohne ausdrückliche Bestellung nicht zu einer Zahlungspflicht.</p>
          </section>

          <nav className={styles.legalLinks} aria-label="Weitere Informationen">
            <Link href="/impressum">Impressum</Link>
            <Link href="/datenschutz">Datenschutz</Link>
            <Link href="/preise">Preise</Link>
            <Link href="/kontakt">Kontakt</Link>
          </nav>
          <p className={styles.meta}>Stand: 15. August 2026</p>
        </article>
      </main>
    </PublicShell>
  );
}
