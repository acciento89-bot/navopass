import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import styles from "@/app/public-pages.module.css";
import { getLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "NavoPass-Konto löschen",
  description: "So löschst du dein NavoPass-Konto und die zugehörigen persönlichen Daten.",
};

export default async function DeleteAccountPage() {
  const locale = await getLocale();
  const tr = (de: string, en: string) => locale === "en" ? en : de;

  return (
    <PublicShell>
      <main className={styles.main}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>{tr("Kontosicherheit", "Account security")}</span>
          <h1>{tr("NavoPass-Konto löschen", "Delete your NavoPass account")}</h1>
          <p>{tr("Du kannst dein Konto direkt in der NavoPass-App oder nach der Anmeldung im Web dauerhaft löschen.", "You can permanently delete your account directly in the NavoPass app or after signing in on the web.")}</p>
        </section>

        <article className={styles.legal}>
          <section>
            <h2>{tr("In der mobilen App", "In the mobile app")}</h2>
            <ol>
              <li>{tr("Öffne Mehr und anschließend Profil & Konto.", "Open More, then Profile & account.")}</li>
              <li>{tr("Wähle in der Gefahrenzone Konto löschen.", "In the danger zone, select Delete account.")}</li>
              <li>{tr("Gib dein aktuelles Passwort und das angezeigte Bestätigungswort ein.", "Enter your current password and the displayed confirmation word.")}</li>
              <li>{tr("Bestätige die endgültige Löschung.", "Confirm permanent deletion.")}</li>
            </ol>
          </section>

          <section>
            <h2>{tr("Im Web", "On the web")}</h2>
            <p>{tr("Melde dich an, öffne Einstellungen und nutze dort den Abschnitt Konto löschen.", "Sign in, open Settings and use the Delete account section.")}</p>
            <p><Link href="/login">{tr("Bei NavoPass anmelden", "Sign in to NavoPass")}</Link></p>
          </section>

          <section>
            <h2>{tr("Was gelöscht wird", "What is deleted")}</h2>
            <p>{tr("Das Benutzerkonto und die damit verbundenen persönlichen NavoPass-Daten, Objektpässe, Historien und gespeicherten Dokumente werden dauerhaft entfernt. Gesetzlich erforderliche Abrechnungs- und Nachweisdaten können entsprechend den gesetzlichen Fristen aufbewahrt werden.", "The user account and associated personal NavoPass data, asset passes, histories and stored documents are permanently removed. Billing and evidence records required by law may be retained for the applicable statutory periods.")}</p>
            <p>{tr("Ein aktives Abonnement wird vor der Kontolöschung beendet. Gemeinsame Bereiche mit weiteren Mitgliedern müssen zuvor übertragen oder gelöscht werden.", "An active subscription is ended before account deletion. Shared workspaces with other members must first be transferred or deleted.")}</p>
          </section>

          <section>
            <h2>{tr("Unterstützung", "Support")}</h2>
            <p>{tr("Wenn die Löschung nicht möglich ist, kontaktiere den NavoPass-Support unter", "If deletion is not possible, contact NavoPass support at")} <a href="mailto:support@kamilunavo.com">support@kamilunavo.com</a>.</p>
          </section>
        </article>
      </main>
    </PublicShell>
  );
}
