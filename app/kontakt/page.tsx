import type { Metadata } from "next";
import { NavoPassContactForm } from "@/components/navopass-contact-form";
import { PublicShell } from "@/components/public-shell";
import styles from "@/app/public-pages.module.css";

export const metadata: Metadata = {
  title: "Kontakt",
  description: "Kontakt und Support für NavoPass.",
};

export default function ContactPage() {
  return (
    <PublicShell>
      <main className={styles.main}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>Kontakt & Support</span>
          <h1>Wie können wir helfen?</h1>
          <p>Fragen zu NavoPass, deinem Konto, Datenschutz oder einer geschäftlichen Nutzung gehen direkt an Kamilunavo.</p>
        </section>

        <article className={styles.legal}>
          <section>
            <h2>Direkte Kontaktmöglichkeiten</h2>
            <div className={styles.methods}>
              <div className={styles.method}><span>Allgemeiner Kontakt</span><a href="mailto:contact@kamilunavo.com">contact@kamilunavo.com</a></div>
              <div className={styles.method}><span>NavoPass Support</span><a href="mailto:support@kamilunavo.com">support@kamilunavo.com</a></div>
            </div>
          </section>

          <section>
            <h2>Kontaktformular</h2>
            <p>Das Formular bereitet deine Nachricht lokal im E-Mail-Programm vor. So werden deine Eingaben nicht an einen zusätzlichen Formularanbieter übertragen.</p>
            <NavoPassContactForm />
          </section>

          <section>
            <h2>Für eine schnelle Bearbeitung</h2>
            <p>Bei technischen Problemen am besten kurz angeben, auf welcher Seite der Fehler auftritt, welche Aktion unmittelbar davor ausgeführt wurde und welches Gerät beziehungsweise welcher Browser verwendet wird. Bitte keine Passwörter mitsenden.</p>
          </section>

          <p className={styles.meta}>NavoPass · Ein Produkt von Piotr Kaminski – Kamilunavo</p>
        </article>
      </main>
    </PublicShell>
  );
}
