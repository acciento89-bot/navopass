import Link from "next/link";
import { sendContactAction } from "@/app/actions/contact";
import styles from "@/app/public-pages.module.css";
import type { Locale } from "@/lib/i18n";

export function NavoPassContactForm({ sent = false, error, locale = "de" }: { sent?: boolean; error?: string; locale?: Locale }) {
  const tr = (de: string, en: string) => locale === "en" ? en : de;
  return (
    <form action={sendContactAction} id="kontaktformular">
      <input type="hidden" name="locale" value={locale} />
      {sent && <p className={styles.formStatus} role="status">{tr("Danke. Deine Nachricht wurde an den NavoPass-Support gesendet.", "Thank you. Your message has been sent to NavoPass support.")}</p>}
      {error && <p className={styles.formError} role="alert">{error}</p>}
      <div className={styles.contactGrid}>
        <label className={styles.field}>{tr("Name", "Name")}<input name="name" autoComplete="name" required /></label>
        <label className={styles.field}>{tr("E-Mail-Adresse", "Email address")}<input name="email" type="email" autoComplete="email" required /></label>
      </div>
      <label className={styles.field}>{tr("Thema", "Topic")}<select name="topic" defaultValue="Allgemeine Anfrage"><option value="Allgemeine Anfrage">{tr("Allgemeine Anfrage", "General enquiry")}</option><option value="Produktsupport">{tr("Produktsupport", "Product support")}</option><option value="Konto & Zugang">{tr("Konto & Zugang", "Account & access")}</option><option value="QR-Aufkleber Anfrage">{tr("QR-Aufkleber Anfrage", "QR sticker enquiry")}</option><option value="Datenschutzanfrage">{tr("Datenschutzanfrage", "Privacy enquiry")}</option><option value="Geschäftliche Anfrage">{tr("Geschäftliche Anfrage", "Business enquiry")}</option></select></label>
      <label className={styles.field}>{tr("Nachricht", "Message")}<textarea name="message" minLength={10} maxLength={5000} required /></label>
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}><label>Website<input name="companyWebsite" tabIndex={-1} autoComplete="off" /></label></div>
      <label className={styles.consent}>
        <input name="privacy" type="checkbox" required />
        <span className={styles.consentText}>{tr("Ich habe die", "I have read the")} <Link href="/datenschutz">{tr("Datenschutzerklärung", "Privacy policy")}</Link>. {tr("Meine Angaben werden zur Bearbeitung meiner Anfrage an Kamilunavo übermittelt.", "My information is sent to Kamilunavo to process my enquiry.")}</span>
      </label>
      <button className={styles.submit} type="submit">{tr("Nachricht senden", "Send message")}</button>
      <p className={styles.formNote}>{tr("Die Nachricht wird verschlüsselt an den NavoPass-Server übertragen und anschließend über die für Kamilunavo konfigurierte E-Mail-Infrastruktur an den Support weitergeleitet.", "The message is transmitted securely to the NavoPass server and then forwarded to support through Kamilunavo’s configured email infrastructure.")}</p>
    </form>
  );
}
