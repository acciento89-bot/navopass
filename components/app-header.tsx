import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { Logo } from "@/components/logo";

export function AppHeader({ name }: { name: string }) {
  return (
    <header className="app-header">
      <div className="app-header-main">
        <Logo href="/app" />
        <span className="user-chip"><b>{name}</b></span>
      </div>
      <nav className="app-nav" aria-label="App Navigation">
        <Link href="/app" className="app-nav-link">Meine Pässe</Link>
        <Link href="/app/scannen" className="app-nav-link">QR scannen</Link>
        <Link href="/app/service" className="app-nav-link">Service</Link>
        <Link href="/app/notifications" className="app-nav-link">Hinweise</Link>
        <details style={{ position: "relative" }}>
          <summary className="app-nav-link" style={{ cursor: "pointer", listStyle: "none" }}>Mehr ▾</summary>
          <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", minWidth: 190, padding: 8, display: "grid", gap: 2, background: "#fff", border: "1px solid #dce8ef", borderRadius: 14, boxShadow: "0 18px 44px rgba(24,55,75,.14)", zIndex: 100 }}>
            <Link href="/app/team" className="app-nav-link">Bereiche</Link>
            <Link href="/app/profil" className="app-nav-link">Profil</Link>
            <Link href="/app/sticker" className="app-nav-link">QR-Aufkleber</Link>
            <Link href="/app/settings" className="app-nav-link">Einstellungen</Link>
            <Link href="/preise" className="app-nav-link">Preise</Link>
            <Link href="/impressum" className="app-nav-link">Rechtliches</Link>
          </div>
        </details>
        <Link href="/app/assets/new" className="button small">+ Objekt</Link>
        <form action={logoutAction}><button className="button ghost small" type="submit">Abmelden</button></form>
      </nav>
    </header>
  );
}
