import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import { Logo } from "@/components/logo";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="auth-page">
      <div className="auth-card">
        <Logo />
        <div><span className="eyebrow">Willkommen zurück</span><h1>Anmelden</h1><p>Öffne deine Objekt- und Servicepässe.</p></div>
        {error && <p className="form-error">{error}</p>}
        <form action={loginAction} className="form-stack">
          <label>E-Mail<input name="email" type="email" autoComplete="email" required /></label>
          <label>Passwort<input name="password" type="password" autoComplete="current-password" required /></label>
          <button className="button" type="submit">Anmelden</button>
        </form>
        <p className="auth-foot">Noch kein Konto? <Link href="/register">Kostenlos registrieren</Link></p>
      </div>
    </main>
  );
}
