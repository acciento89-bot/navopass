import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import styles from "@/app/public-pages.module.css";

export const metadata: Metadata = {
  title: "Datenschutz",
  description: "Datenschutzerklärung für NavoPass.",
};

export default function PrivacyPage() {
  return (
    <PublicShell>
      <main className={styles.main}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>Datenschutz</span>
          <h1>Datenschutzerklärung</h1>
          <p>Informationen zur Verarbeitung personenbezogener Daten auf navopass.de und bei der Nutzung des digitalen Dienstes NavoPass.</p>
        </section>

        <article className={styles.legal}>
          <section>
            <h2>1. Verantwortlicher</h2>
            <p><strong>Piotr Kaminski – Kamilunavo</strong><br />Otto-Braun-Straße 14<br />40595 Düsseldorf<br />Deutschland<br />E-Mail: <a href="mailto:contact@kamilunavo.com">contact@kamilunavo.com</a></p>
          </section>

          <section>
            <h2>2. Bereitstellung der Website und Server-Protokolle</h2>
            <p>Beim Aufruf von navopass.de werden technisch erforderliche Verbindungsdaten verarbeitet. Dazu können insbesondere IP-Adresse, Datum und Uhrzeit, angeforderte URL, Referrer, Browser- und Betriebssysteminformationen, HTTP-Statuscode und übertragene Datenmenge gehören.</p>
            <p>Die Verarbeitung dient der Auslieferung, Stabilität und Sicherheit des Dienstes sowie der Erkennung und Abwehr von Missbrauch. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.</p>
          </section>

          <section>
            <h2>3. Hosting</h2>
            <p>NavoPass wird auf Server-Infrastruktur der Hetzner Online GmbH, Industriestr. 25, 91710 Gunzenhausen, Deutschland, betrieben. Dabei werden die für Betrieb, Datenbank, Dateispeicherung und technische Protokollierung erforderlichen Daten verarbeitet. Soweit erforderlich erfolgt die Verarbeitung auf Grundlage eines Vertrags zur Auftragsverarbeitung.</p>
          </section>

          <section>
            <h2>4. Registrierung und Benutzerkonto</h2>
            <p>Bei der Registrierung werden Name, E-Mail-Adresse und ein Passwort verarbeitet. Das Passwort wird nicht im Klartext gespeichert, sondern als kryptographischer Passwort-Hash. Die Daten werden benötigt, um das Benutzerkonto bereitzustellen, Anmeldungen zu ermöglichen und den NavoPass-Dienst zu erfüllen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.</p>
          </section>

          <section>
            <h2>5. Anmeldung und technisch notwendige Cookies</h2>
            <p>Für angemeldete Nutzer verwendet NavoPass das technisch notwendige Session-Cookie <code className={styles.legalCode}>navopass_session</code>. Es enthält ein zufälliges Sitzungstoken; serverseitig wird nur der Hash dieses Tokens gespeichert. Die Sitzung ist grundsätzlich auf 30 Tage begrenzt und kann durch Abmelden vorzeitig beendet werden.</p>
            <p>Dieses Cookie ist erforderlich, damit der ausdrücklich gewünschte angemeldete Dienst bereitgestellt werden kann. Es wird nicht für Werbung oder Reichweitenmessung verwendet.</p>
          </section>

          <section>
            <h2>6. Objektpässe, Historie und Dokumente</h2>
            <p>Bei der Nutzung von NavoPass werden die vom Nutzer eingegebenen Objekt- und Produktdaten verarbeitet, zum Beispiel Bezeichnung, Kategorie, Hersteller, Modell, Seriennummer, Standort, Kauf- oder Installationsdatum, Garantie- und Wartungsdaten, Notizen sowie Service- und Reparaturhistorien.</p>
            <p>Hochgeladene Fotos und Dokumente werden auf der NavoPass-Server-Infrastruktur gespeichert und mit dem jeweiligen Objektpass verknüpft. Nutzer entscheiden selbst, welche Inhalte sie hochladen. Dabei sollen nur Daten verarbeitet werden, zu deren Nutzung der jeweilige Nutzer berechtigt ist. Rechtsgrundlage für die Bereitstellung dieser Funktionen ist Art. 6 Abs. 1 lit. b DSGVO.</p>
          </section>

          <section>
            <h2>7. Freigabelinks und QR-Codes</h2>
            <p>Nutzer können die Sichtbarkeit eines Objektpasses auf privat, per Link/QR oder öffentlich einstellen. Bei einer Freigabe können die ausgewählten Passdaten sowie ausdrücklich als geteilt markierte Historieneinträge und Dokumente für andere Personen abrufbar werden. Der QR-Code wird innerhalb von NavoPass erzeugt; dafür ist kein externer QR-Dienst erforderlich.</p>
            <p>Die Veröffentlichung erfolgt ausschließlich aufgrund der vom Nutzer gewählten Freigabeeinstellung. Private Pässe sind nicht über den öffentlichen Pass-Link abrufbar.</p>
          </section>

          <section>
            <h2>8. Haushalts- und Team-Bereiche</h2>
            <p>Für gemeinsame Bereiche werden insbesondere Bereichsname, Mitgliedschaften, Rollen und – bei Einladungen – die E-Mail-Adresse der eingeladenen Person verarbeitet. Mitglieder eines Bereichs können je nach Rolle auf die dort abgelegten Objektpässe zugreifen oder sie bearbeiten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.</p>
          </section>

          <section>
            <h2>9. Wartungen, Fristen und Kalenderexport</h2>
            <p>NavoPass verarbeitet hinterlegte Wartungs- und Garantiefristen, um sie im Konto anzuzeigen und Kalenderdateien zu erzeugen. Beim Kalenderexport wird die Kalenderdatei direkt von NavoPass erstellt. Ein externer Kalenderanbieter erhält durch die reine Erstellung der Datei noch keine Daten; erst die weitere Verwendung oder der Import durch den Nutzer kann zu einer Verarbeitung beim jeweiligen Kalenderanbieter führen.</p>
          </section>

          <section>
            <h2>10. Kontakt per E-Mail und Kontaktformular</h2>
            <p>Bei Kontaktaufnahme per E-Mail werden Absenderadresse, Nachrichteninhalt und freiwillig übermittelte Kontaktdaten verarbeitet, um die Anfrage zu beantworten. Bei vertraglichen oder vorvertraglichen Anliegen ist Art. 6 Abs. 1 lit. b DSGVO maßgeblich; im Übrigen Art. 6 Abs. 1 lit. f DSGVO.</p>
            <p>Das auf navopass.de angebotene Kontaktformular übermittelt die Eingaben nicht an einen NavoPass-Formularserver. Es bereitet lokal im Browser eine E-Mail an support@kamilunavo.com vor. Eine Verarbeitung durch Kamilunavo beginnt erst, wenn der Nutzer diese E-Mail tatsächlich versendet.</p>
          </section>

          <section>
            <h2>11. Domain, DNS und geschäftliche E-Mail</h2>
            <p>Für Domainverwaltung, DNS und geschäftliche E-Mail-Kommunikation können Dienste der One.com Group AB, Carlsgatan 3, 211 20 Malmö, Schweden, eingesetzt werden. Dabei können technisch notwendige Verbindungs-, Absender-, Empfänger- und Nachrichtendaten verarbeitet werden.</p>
          </section>

          <section>
            <h2>12. Analyse, Werbung und Profiling</h2>
            <p>NavoPass setzt derzeit keine eigenen Marketing- oder Analyse-Cookies, kein Google Analytics, keinen Meta Pixel und kein eigenes Werbeprofiling ein. Sollte sich dies ändern, wird diese Datenschutzerklärung angepasst und eine erforderliche Einwilligung vor dem Einsatz eingeholt.</p>
          </section>

          <section>
            <h2>13. Empfänger und Drittlandübermittlungen</h2>
            <p>Daten werden nur an Empfänger weitergegeben, soweit dies für Betrieb, Vertragserfüllung, eine vom Nutzer veranlasste Freigabe oder gesetzliche Pflichten erforderlich ist. Dazu können Hosting- und E-Mail-Dienstleister sowie vom Nutzer eingeladene Bereichsmitglieder oder Empfänger eines Freigabelinks gehören.</p>
            <p>Eine Übermittlung personenbezogener Daten in Staaten außerhalb des Europäischen Wirtschaftsraums ist für den derzeitigen Kernbetrieb von NavoPass nicht vorgesehen. Bei externen Diensten, die ein Nutzer selbst über Links oder exportierte Daten aufruft, gelten die Datenschutzhinweise des jeweiligen Anbieters.</p>
          </section>

          <section>
            <h2>14. Speicherdauer</h2>
            <p>Kontodaten und vom Nutzer gespeicherte NavoPass-Inhalte werden grundsätzlich für die Dauer des Benutzerkontos beziehungsweise bis zur Löschung der jeweiligen Inhalte gespeichert. Sitzungen laufen grundsätzlich nach 30 Tagen ab. Kontakt- und Geschäftskommunikation wird nur so lange aufbewahrt, wie dies zur Bearbeitung sowie aufgrund gesetzlicher Aufbewahrungs- oder Nachweispflichten erforderlich ist. Technische Protokolle werden gelöscht, sobald ihr Sicherheits- oder Betriebszweck entfällt, sofern keine längere gesetzliche Aufbewahrung erforderlich ist.</p>
          </section>

          <section>
            <h2>15. Rechte betroffener Personen</h2>
            <p>Unter den gesetzlichen Voraussetzungen bestehen insbesondere Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Soweit eine Verarbeitung auf Einwilligung beruht, kann diese für die Zukunft widerrufen werden. Anfragen können an <a href="mailto:contact@kamilunavo.com">contact@kamilunavo.com</a> gerichtet werden.</p>
            <p>Außerdem besteht das Recht, sich bei einer Datenschutzaufsichtsbehörde zu beschweren. Für den Sitz von Kamilunavo ist insbesondere die <a href="https://www.ldi.nrw.de/" target="_blank" rel="noreferrer">Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen</a> erreichbar.</p>
          </section>

          <section>
            <h2>16. Automatisierte Entscheidungen</h2>
            <p>Bei NavoPass findet derzeit keine automatisierte Entscheidungsfindung im Sinne von Art. 22 DSGVO und kein Profiling statt.</p>
          </section>

          <section>
            <h2>17. Änderungen dieser Datenschutzerklärung</h2>
            <p>Diese Datenschutzerklärung wird angepasst, wenn sich Funktionen, eingesetzte Dienstleister oder rechtliche Anforderungen ändern. Maßgeblich ist die jeweils auf navopass.de veröffentlichte Fassung.</p>
          </section>

          <nav className={styles.legalLinks} aria-label="Weitere rechtliche Informationen">
            <Link href="/impressum">Impressum</Link>
            <Link href="/nutzungsbedingungen">Nutzungsbedingungen</Link>
            <Link href="/preise">Preise</Link>
            <Link href="/kontakt">Kontakt</Link>
          </nav>
          <p className={styles.meta}>Stand: 15. August 2026</p>
        </article>
      </main>
    </PublicShell>
  );
}
