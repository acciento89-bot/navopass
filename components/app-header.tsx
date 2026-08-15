import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { Logo } from "@/components/logo";

export function AppHeader({ name }: { name: string }) {
  return (
    <header className="app-header">
      <Logo href="/app" />
      <nav className="app-nav">
        <Link href="/app">Meine Pässe</Link>
        <Link href="/app/assets/new" className="button small">+ Objekt</Link>
        <form action={logoutAction}><button className="button ghost small" type="submit">Abmelden</button></form>
      </nav>
      <span className="user-chip">{name}</span>
    </header>
  );
}
