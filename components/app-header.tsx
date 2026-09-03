import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getLocale } from "@/lib/i18n";

export async function AppHeader({ name }: { name: string }) {
  const locale = await getLocale();
  const tr = (de: string, en: string) => locale === "en" ? en : de;
  return (
    <header className="app-header">
      <div className="app-header-main"><Logo href="/app" /><span className="user-chip"><b>{name}</b></span></div>
      <nav className="app-nav" aria-label={tr("App-Navigation", "App navigation")}>
        <Link href="/app" className="app-nav-link">{tr("Meine Pässe", "My passes")}</Link>
        <Link href="/app/scannen" className="app-nav-link">{tr("QR scannen", "Scan QR")}</Link>
        <Link href="/app/service" className="app-nav-link">Service</Link>
        <Link href="/app/notifications" className="app-nav-link">{tr("Hinweise", "Alerts")}</Link>
        <details style={{ position: "relative" }}>
          <summary className="app-nav-link" style={{ cursor: "pointer", listStyle: "none" }}>{tr("Mehr", "More")} ▾</summary>
          <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", minWidth: 190, padding: 8, display: "grid", gap: 2, background: "#fff", border: "1px solid #dce8ef", borderRadius: 14, boxShadow: "0 18px 44px rgba(24,55,75,.14)", zIndex: 100 }}>
            <Link href="/app/auftraege" className="app-nav-link">{tr("Serviceaufträge", "Service jobs")}</Link>
            <Link href="/app/kunden" className="app-nav-link">{tr("Kunden & Standorte", "Customers & locations")}</Link>
            <Link href="/app/team" className="app-nav-link">{tr("Bereiche", "Workspaces")}</Link>
            <Link href="/app/profil" className="app-nav-link">{tr("Profil", "Profile")}</Link>
            <Link href="/app/sticker" className="app-nav-link">{tr("QR-Aufkleber", "QR stickers")}</Link>
            <Link href="/app/settings" className="app-nav-link">{tr("Einstellungen", "Settings")}</Link>
            <Link href="/preise" className="app-nav-link">{tr("Preise", "Pricing")}</Link>
            <Link href="/impressum" className="app-nav-link">{tr("Rechtliches", "Legal")}</Link>
          </div>
        </details>
        <LanguageSwitcher compact />
        <Link href="/app/assets/new" className="button small">+ {tr("Objekt", "Asset")}</Link>
        <form action={logoutAction}><button className="button ghost small" type="submit">{tr("Abmelden", "Sign out")}</button></form>
      </nav>
    </header>
  );
}
