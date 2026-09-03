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
        <details className="app-nav-more">
          <summary className="app-nav-link">Mehr</summary>
          <div className="app-nav-menu">
            <Link href="/app/team">Bereiche</Link>
            <Link href="/app/profil">Profil</Link>
            <Link href="/app/sticker">QR-Aufkleber</Link>
            <Link href="/app/settings">Einstellungen</Link>
            <Link href="/preise">Preise</Link>
            <Link href="/impressum">Rechtliches</Link>
          </div>
        </details>
        <Link href="/app/assets/new" className="button small">+ Objekt</Link>
        <form action={logoutAction}><button className="button ghost small" type="submit">Abmelden</button></form>
      </nav>
    </header>
  );
}
