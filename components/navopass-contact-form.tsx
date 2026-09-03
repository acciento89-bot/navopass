import Link from "next/link";
import { sendContactAction } from "@/app/actions/contact";
import styles from "@/app/public-pages.module.css";

export function NavoPassContactForm({ sent = false, error }: { sent?: boolean; error?: string }) {
  return (
    <form action={sendContactAction} id="kontaktformular">
      {sent && <p className={styles.formStatus} role="status">Danke. Deine Nachricht wurde an den NavoPass-Support gesendet.</p>}
      {error && <p className={styles.formError} role="alert">{error}</p>}
      <div className={styles.contactGrid}>
        <label className={styles.field}>Name<input name="name" autoComplete="name" required /></label>
        <label className={styles.field}>E-Mail-Adresse<input name="email" type="email" autoComplete="email" required /></label>
      </div>
      <label className={styles.field}>Thema<select name="topic" defaultValue="Allgemeine Anfrage"><option>Allgemeine Anfrage</option><option>Produktsupport</option><option>Konto & Zugang</option><option>QR-Aufkleber Anfrage</option><option>Datenschutzanfrage</option><option>Geschäftliche Anfrage</option></select></label>
      <label className={styles.field}>Nachricht<textarea name="message" minLength={10} maxLength={5000} required /></label>
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}><label>Website<input name="companyWebsite" tabIndex={-1} autoComplete="off" /></label></div>
      <label className={styles.consent}>
        <input name="privacy" type="checkbox" required />
        <span className={styles.consentText}>Ich habe die <Link href="/datenschutz">Datenschutzerklärung</Link> gelesen. Meine Angaben werden zur Bearbeitung meiner Anfrage an Kamilunavo übermittelt.</span>
      </label>
      <button className={styles.submit} type="submit">Nachricht senden</button>
      <p className={styles.formNote}>Die Nachricht wird verschlüsselt an den NavoPass-Server übertragen und anschließend über die für Kamilunavo konfigurierte E-Mail-Infrastruktur an den Support weitergeleitet.</p>
    </form>
  );
}
