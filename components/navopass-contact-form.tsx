"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import styles from "@/app/public-pages.module.css";

type Status = "idle" | "opening" | "opened";

export function NavoPassContactForm() {
  const [status, setStatus] = useState<Status>("idle");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const topic = String(data.get("topic") ?? "Allgemeine Anfrage").trim();
    const message = String(data.get("message") ?? "").trim();
    const subject = `[NavoPass] ${topic}`;
    const body = [
      `Name: ${name}`,
      `Antwort an: ${email}`,
      "",
      message,
      "",
      "Vorbereitet über das NavoPass Kontaktformular auf navopass.de",
    ].join("\n");

    setStatus("opening");
    window.location.href = `mailto:support@kamilunavo.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.setTimeout(() => setStatus("opened"), 650);
  }

  return (
    <form onSubmit={submit}>
      <div className={styles.contactGrid}>
        <label className={styles.field}>Name<input name="name" autoComplete="name" required /></label>
        <label className={styles.field}>E-Mail-Adresse<input name="email" type="email" autoComplete="email" required /></label>
      </div>
      <label className={styles.field}>Thema<select name="topic" defaultValue="Allgemeine Anfrage"><option>Allgemeine Anfrage</option><option>Produktsupport</option><option>Konto & Zugang</option><option>Datenschutzanfrage</option><option>Geschäftliche Anfrage</option></select></label>
      <label className={styles.field}>Nachricht<textarea name="message" required /></label>
      <label className={styles.consent}><input name="privacy" type="checkbox" required /><span>Ich habe die <Link href="/datenschutz">Datenschutzerklärung</Link> gelesen. Das Formular bereitet eine E-Mail in meinem E-Mail-Programm vor.</span></label>
      <button className={styles.submit} type="submit" disabled={status === "opening"}>{status === "opening" ? "E-Mail-Programm wird geöffnet…" : "Nachricht vorbereiten"}</button>
      <p className={styles.formNote}>Die Eingaben werden vor dem Absenden nicht an einen NavoPass-Formularserver übertragen. Erst wenn du die vorbereitete E-Mail tatsächlich versendest, erhält Kamilunavo deine Nachricht.</p>
      {status === "opened" && <p className={styles.formStatus} role="status">Dein E-Mail-Programm sollte jetzt geöffnet sein. Bitte Nachricht dort prüfen und absenden.</p>}
    </form>
  );
}
