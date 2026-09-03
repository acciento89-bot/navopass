import Link from "next/link";
import { Logo } from "@/components/logo";
import { getLocale } from "@/lib/i18n";

export default async function NotFound() {
  const locale = await getLocale();
  const tr = (de: string, en: string) => locale === "en" ? en : de;
  return <main className="auth-page"><div className="auth-card"><Logo label={tr("NavoPass Startseite", "NavoPass home page")} /><div className="empty-icon">?</div><h1>{tr("Pass nicht gefunden", "Pass not found")}</h1><p>{tr("Der Link ist ungültig oder der Eigentümer hat den Pass auf privat gestellt.", "The link is invalid or the owner has made the pass private.")}</p><Link className="button" href="/">{tr("Zu NavoPass", "Go to NavoPass")}</Link></div></main>;
}
