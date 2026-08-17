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
          <section><h2>1. Verantwortlicher</h2><p><strong>Piotr Kaminski – Kamilunavo</strong><br />Otto-Braun-Straße 14<br />40595 Düsseldorf<br />Deutschland<br />E-Mail: <a href="mailto:contact@kamilunavo.com">contact@kamilunavo.com</a></p></section>

          <section><h2>2. Bereitstellung der Website und Server-Protokolle</h2><p>Beim Aufruf von navopass.de werden technisch erforderliche Verbindungsdaten verarbeitet. Dazu können insbesondere IP-Adresse, Datum und Uhrzeit, angeforderte URL, Referrer, Browser- und Betriebssysteminformationen, HTTP-Statuscode und übertragene Datenmenge gehören.</p><p>Die Verarbeitung dient der Auslieferung, Stabilität und Sicherheit des Dienstes sowie der Erkennung und Abwehr von Missbrauch. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.</p></section>

          <section><h2>3. Hosting</h2><p>NavoPass wird auf Server-Infrastruktur der Hetzner Online GmbH, Industriestr. 25, 91710 Gunzenhausen, Deutschland, betrieben. Dabei werden die für Betrieb, Datenbank, Dateispeicherung und technische Protokollierung erforderlichen Daten verarbeitet. Soweit erforderlich erfolgt die Verarbeitung auf Grundlage eines Vertrags zur Auftragsverarbeitung.</p></section>

          <section><h2>4. Registrierung, E-Mail-Bestätigung und Benutzerkonto</h2><p>Bei der Registrierung werden Name, E-Mail-Adresse und ein Passwort verarbeitet. Das Passwort wird nicht im Klartext gespeichert, sondern als kryptographischer Passwort-Hash. Die Daten werden benötigt, um das Benutzerkonto bereitzustellen, Anmeldungen zu ermöglichen und den NavoPass-Dienst zu erfüllen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.</p><p>Zur Bestätigung einer E-Mail-Adresse erzeugt NavoPass einen zeitlich begrenzten, einmal verwendbaren Link. Server-seitig wird nur ein kryptographischer Hash des Bestätigungstokens gespeichert. Bei einer Änderung der Konto-E-Mail muss die neue Adresse erneut bestätigt werden.</p><p>Zum Nachweis der bei der Registrierung abgegebenen Erklärung speichert NavoPass außerdem den Zeitpunkt der Akzeptanz der Nutzungsbedingungen, die dabei geltende Versionskennung sowie den Zeitpunkt der Kenntnisnahme der Datenschutzerklärung.</p></section>

          <section><h2>5. Anmeldung, Passwort-Wiederherstellung und technisch notwendige Cookies</h2><p>Für angemeldete Nutzer verwendet NavoPass das technisch notwendige Session-Cookie <code className={styles.legalCode}>navopass_session</code>. Es enthält ein zufälliges Sitzungstoken; serverseitig wird nur der Hash dieses Tokens gespeichert. Die Sitzung ist grundsätzlich auf 30 Tage begrenzt und kann durch Abmelden vorzeitig beendet werden.</p><p>Für „Passwort vergessen“ wird die eingegebene E-Mail-Adresse verarbeitet. Wenn ein passendes Konto besteht, erzeugt NavoPass einen zeitlich begrenzten, einmal verwendbaren Wiederherstellungslink. Server-seitig wird nur ein Hash des Wiederherstellungstokens gespeichert. Nach erfolgreicher Passwortänderung werden bestehende Sitzungen beendet.</p></section>

          <section><h2>6. Objektpässe, Historie und Dokumente</h2><p>Bei der Nutzung von NavoPass werden die vom Nutzer eingegebenen Objekt- und Produktdaten verarbeitet, zum Beispiel Bezeichnung, Kategorie, Hersteller, Modell, Seriennummer, Standort, Kauf- oder Installationsdatum, Garantie- und Wartungsdaten, Notizen sowie Service- und Reparaturhistorien.</p><p>Hochgeladene Fotos und Dokumente werden auf der NavoPass-Server-Infrastruktur gespeichert und mit dem jeweiligen Objektpass verknüpft. Nutzer entscheiden selbst, welche Inhalte sie hochladen. Rechtsgrundlage für die Bereitstellung dieser Funktionen ist Art. 6 Abs. 1 lit. b DSGVO.</p></section>

          <section><h2>7. Freigabelinks und QR-Codes</h2><p>Nutzer können die Sichtbarkeit eines Objektpasses auf privat, per Link/QR oder öffentlich einstellen. Bei einer Freigabe können die ausgewählten Passdaten sowie ausdrücklich als geteilt markierte Historieneinträge und Dokumente für andere Personen abrufbar werden. Der QR-Code wird innerhalb von NavoPass erzeugt; dafür ist kein externer QR-Dienst erforderlich.</p><p>Private Pässe sind nicht über den öffentlichen Pass-Link abrufbar.</p></section>

          <section><h2>8. Haushalts- und Team-Bereiche</h2><p>Für gemeinsame Bereiche werden insbesondere Bereichsname, Mitgliedschaften, Rollen und – bei Einladungen – die E-Mail-Adresse der eingeladenen Person verarbeitet. Mitglieder können je nach Rolle auf die dort abgelegten Objektpässe zugreifen oder sie bearbeiten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.</p><p>Einladungen können per E-Mail mit Name der einladenden Person, Bereich, Rolle und zeitlich begrenztem Einladungslink versendet werden. Vor dem Beitritt zu einem gemeinsamen Bereich muss die E-Mail-Adresse des eingeladenen Kontos bestätigt sein.</p></section>

          <section><h2>9. Wartungen, Fristen und Kalenderexport</h2><p>NavoPass verarbeitet hinterlegte Wartungs- und Garantiefristen, um sie im Konto anzuzeigen und Kalenderdateien zu erzeugen. Beim Kalenderexport wird die Datei direkt von NavoPass erstellt. Erst eine spätere Verwendung bei einem externen Kalenderanbieter kann dort zu einer weiteren Verarbeitung führen.</p></section>

          <section><h2>10. Kontakt per E-Mail und Kontaktformular</h2><p>Bei Kontaktaufnahme werden Absenderadresse, Nachrichteninhalt und freiwillig übermittelte Kontaktdaten verarbeitet, um die Anfrage zu beantworten. Bei vertraglichen oder vorvertraglichen Anliegen ist Art. 6 Abs. 1 lit. b DSGVO maßgeblich; im Übrigen Art. 6 Abs. 1 lit. f DSGVO.</p><p>Beim Kontaktformular werden Name, E-Mail-Adresse, Thema und Nachrichteninhalt an den NavoPass-Server übertragen, validiert und anschließend über die konfigurierte geschäftliche E-Mail-Infrastruktur an den Support weitergeleitet.</p></section>

          <section><h2>11. E-Mail-Versand und Domain-Infrastruktur</h2><p>Für Domainverwaltung, DNS und geschäftliche E-Mail-Kommunikation können Dienste der One.com Group AB, Carlsgatan 3, 211 20 Malmö, Schweden, eingesetzt werden. Dies betrifft insbesondere Support-, Bestätigungs-, Passwort-Wiederherstellungs-, Einladungs- und Kündigungsbestätigungs-E-Mails.</p></section>

          <section><h2>12. Kostenpflichtige Tarife und Stripe</h2><p>Für die Buchung und Verwaltung kostenpflichtiger NavoPass-Abonnements wird Stripe eingesetzt. Zahlungsdaten werden im Stripe Checkout beziehungsweise in Stripe-Zahlungsoberflächen eingegeben. NavoPass speichert keine vollständigen Kartennummern. NavoPass speichert zur Zuordnung des Vertrags insbesondere Stripe-Kunden-ID, Abonnement-ID, Price-ID, Abonnementstatus, Abrechnungszeitraum und Kündigungsstatus.</p><p>Stripe verarbeitet im Zusammenhang mit Zahlungen und Abonnements weitere Daten, die für Zahlungsabwicklung, Betrugsprävention, Abrechnung und gesetzliche Pflichten erforderlich sein können, etwa Kontaktdaten, Transaktionsdaten, Zahlungsinformationen, IP-Adresse und Geräteinformationen. Rechtsgrundlage der durch Kamilunavo veranlassten Verarbeitung zur Vertragsdurchführung ist Art. 6 Abs. 1 lit. b DSGVO; gesetzlich erforderliche Abrechnungs- und Nachweisdaten können zusätzlich auf Art. 6 Abs. 1 lit. c DSGVO beruhen.</p><p>Je nach konkreter Tätigkeit sind innerhalb des EWR verschiedene Gesellschaften der Stripe-Unternehmensgruppe beteiligt, insbesondere irische Stripe-Gesellschaften. Weitere Informationen zu Rollen, Empfängern und internationalen Datenübermittlungen stellt Stripe in seiner <a href="https://stripe.com/de/privacy" target="_blank" rel="noreferrer">Datenschutzerklärung</a> und im <a href="https://stripe.com/en-de/legal/privacy-center" target="_blank" rel="noreferrer">Privacy Center</a> bereit.</p></section>

          <section><h2>13. Elektronische Kündigung kostenpflichtiger Verträge</h2><p>Über „Verträge hier kündigen“ können Kündigungserklärungen ohne vorherige Anmeldung abgegeben werden. Dabei verarbeitet NavoPass insbesondere E-Mail-Adresse, Vertragsbezeichnung, Art der Kündigung, gewünschten Beendigungszeitpunkt, bei außerordentlicher Kündigung den angegebenen Grund, Datum und Uhrzeit des Eingangs sowie Bearbeitungs- und Bestätigungsstatus.</p><p>Zur nachweisbaren Empfangsbestätigung wird ein zufälliger, nicht erratbarer Bestätigungslink erzeugt; serverseitig wird nur dessen Hash gespeichert. Die Kündigungsdaten werden zur Durchführung und Dokumentation der Vertragsbeendigung sowie zur Erfüllung gesetzlicher Nachweis- und Bestätigungspflichten verarbeitet. Rechtsgrundlagen sind Art. 6 Abs. 1 lit. b und lit. c DSGVO.</p></section>

          <section><h2>14. Analyse, Werbung und Profiling</h2><p>NavoPass setzt derzeit keine eigenen Marketing- oder Analyse-Cookies, kein Google Analytics, keinen Meta Pixel und kein eigenes Werbeprofiling ein. Sollte sich dies ändern, wird diese Datenschutzerklärung angepasst und eine erforderliche Einwilligung vor dem Einsatz eingeholt.</p></section>

          <section><h2>15. Empfänger und internationale Datenübermittlungen</h2><p>Daten werden nur an Empfänger weitergegeben, soweit dies für Betrieb, Vertragserfüllung, Zahlungsabwicklung, eine vom Nutzer veranlasste Freigabe oder gesetzliche Pflichten erforderlich ist. Dazu können Hosting-, E-Mail- und Zahlungsdienstleister sowie eingeladene Bereichsmitglieder oder Empfänger eines Freigabelinks gehören.</p><p>Im Zusammenhang mit Stripe können Daten abhängig von Zahlungsweg, technischen Dienstleistern und Stripe-internen Verarbeitungen auch außerhalb des Europäischen Wirtschaftsraums verarbeitet werden. Stripe beschreibt hierfür eingesetzte Transfermechanismen und Schutzmaßnahmen in seinen Datenschutzinformationen. Bei vom Nutzer selbst aufgerufenen externen Diensten gelten zusätzlich die Datenschutzhinweise des jeweiligen Anbieters.</p></section>

          <section><h2>16. Speicherdauer</h2><p>Kontodaten und NavoPass-Inhalte werden grundsätzlich für die Dauer des Benutzerkontos beziehungsweise bis zur Löschung der jeweiligen Inhalte gespeichert. Sitzungen laufen grundsätzlich nach 30 Tagen ab. Nicht verwendete Bestätigungs- und Wiederherstellungstokens sind zeitlich begrenzt.</p><p>Abrechnungs-, Vertrags- und Kündigungsdaten können über das Ende des Kontos hinaus gespeichert werden, soweit dies für gesetzliche Aufbewahrungsfristen, steuerliche Pflichten, die Abwicklung des Vertrags oder die Abwehr beziehungsweise Durchsetzung von Ansprüchen erforderlich ist. Stripe verarbeitet Zahlungs- und Abrechnungsdaten nach den dort geltenden gesetzlichen und vertraglichen Speicherregeln.</p></section>

          <section><h2>17. Rechte betroffener Personen</h2><p>Unter den gesetzlichen Voraussetzungen bestehen insbesondere Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Soweit eine Verarbeitung auf Einwilligung beruht, kann diese für die Zukunft widerrufen werden. Anfragen können an <a href="mailto:contact@kamilunavo.com">contact@kamilunavo.com</a> gerichtet werden.</p><p>Außerdem besteht das Recht, sich bei einer Datenschutzaufsichtsbehörde zu beschweren. Für den Sitz von Kamilunavo ist insbesondere die <a href="https://www.ldi.nrw.de/" target="_blank" rel="noreferrer">Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen</a> erreichbar.</p></section>

          <section><h2>18. Automatisierte Entscheidungen</h2><p>Bei NavoPass findet derzeit keine automatisierte Entscheidungsfindung im Sinne von Art. 22 DSGVO und kein eigenes Profiling statt. Stripe kann zur Zahlungs- und Betrugsprävention eigene automatisierte Verfahren einsetzen; Einzelheiten beschreibt Stripe in seinen Datenschutzinformationen.</p></section>

          <section><h2>19. Änderungen dieser Datenschutzerklärung</h2><p>Diese Datenschutzerklärung wird angepasst, wenn sich Funktionen, eingesetzte Dienstleister oder rechtliche Anforderungen ändern. Maßgeblich ist die jeweils auf navopass.de veröffentlichte Fassung.</p></section>

          <nav className={styles.legalLinks} aria-label="Weitere rechtliche Informationen"><Link href="/impressum">Impressum</Link><Link href="/nutzungsbedingungen">Nutzungsbedingungen</Link><Link href="/preise">Preise</Link><Link href="/vertrag-kuendigen">Verträge hier kündigen</Link><Link href="/kontakt">Kontakt</Link></nav>
          <p className={styles.meta}>Stand: 17. August 2026</p>
        </article>
      </main>
    </PublicShell>
  );
}
