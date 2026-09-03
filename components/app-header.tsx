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
        <Link href="/app/team" className="app-nav-link">Bereiche</Link>
        <Link href="/app/profil" className="app-nav-link">Profil</Link>
        <Link href="/app/settings" className="app-nav-link">Einstellungen</Link>
        <Link href="/preise" className="app-nav-link">Preise</Link>
        <Link href="/impressum" className="app-nav-link">Rechtliches</Link>
        <Link href="/app/assets/new" className="button small">+ Objekt</Link>
        <form action={logoutAction}><button className="button ghost small" type="submit">Abmelden</button></form>
      </nav>
    </header>
  );
}
