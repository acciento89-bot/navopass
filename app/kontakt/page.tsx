import type { Metadata } from "next";
import { NavoPassContactForm } from "@/components/navopass-contact-form";
import { PublicShell } from "@/components/public-shell";
import styles from "@/app/public-pages.module.css";
import { getLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Kontakt",
  description: "Kontakt und Support für NavoPass.",
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const { sent, error } = await searchParams;
  const locale = await getLocale();
  const tr = (de: string, en: string) => locale === "en" ? en : de;

  return (
    <PublicShell>
      <main className={styles.main}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>{tr("Kontakt & Support", "Contact & support")}</span>
          <h1>{tr("Wie können wir helfen?", "How can we help?")}</h1>
          <p>{tr("Fragen zu NavoPass, deinem Konto, Datenschutz oder einer geschäftlichen Nutzung gehen direkt an Kamilunavo.", "Questions about NavoPass, your account, privacy or business use go directly to Kamilunavo.")}</p>
        </section>

        <article className={styles.legal}>
          <section>
            <h2>{tr("Direkte Kontaktmöglichkeiten", "Contact us directly")}</h2>
            <div className={styles.methods}>
              <div className={styles.method}><span>{tr("Allgemeiner Kontakt", "General enquiries")}</span><a href="mailto:contact@kamilunavo.com">contact@kamilunavo.com</a></div>
              <div className={styles.method}><span>NavoPass Support</span><a href="mailto:support@kamilunavo.com">support@kamilunavo.com</a></div>
            </div>
          </section>

          <section>
            <h2>{tr("Kontaktformular", "Contact form")}</h2>
            <p>{tr("Du kannst deine Anfrage direkt über NavoPass senden. Die Nachricht wird auf dem NavoPass-Server validiert und anschließend an den Support weitergeleitet.", "You can send your enquiry directly through NavoPass. The message is validated on the NavoPass server and then forwarded to support.")}</p>
            <NavoPassContactForm sent={sent === "1"} error={error} locale={locale} />
          </section>

          <section>
            <h2>{tr("Für eine schnelle Bearbeitung", "Help us respond quickly")}</h2>
            <p>{tr("Bei technischen Problemen am besten kurz angeben, auf welcher Seite der Fehler auftritt, welche Aktion unmittelbar davor ausgeführt wurde und welches Gerät beziehungsweise welcher Browser verwendet wird. Bitte keine Passwörter mitsenden.", "For technical issues, please tell us which page showed the problem, what you did immediately beforehand, and which device or browser you used. Never send passwords.")}</p>
          </section>

          <p className={styles.meta}>NavoPass · Ein Produkt von Piotr Kaminski – Kamilunavo</p>
        </article>
      </main>
    </PublicShell>
  );
}
