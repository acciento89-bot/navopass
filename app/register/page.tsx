import Link from "next/link";
import { registerAction } from "@/app/actions/auth";
import { Logo } from "@/components/logo";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="auth-page">
      <div className="auth-card">
        <Logo />
        <div><span className="eyebrow">Dein erster Pass</span><h1>Konto erstellen</h1><p>Starte kostenlos mit deinen digitalen Objektpässen.</p></div>
        {error && <p className="form-error">{error}</p>}
        <form action={registerAction} className="form-stack">
          <label>Name<input name="name" autoComplete="name" required /></label>
          <label>E-Mail<input name="email" type="email" autoComplete="email" required /></label>
          <label>Passwort<input name="password" type="password" minLength={8} autoComplete="new-password" required /><small>Mindestens 8 Zeichen.</small></label>
          <button className="button" type="submit">Konto erstellen</button>
        </form>
        <p className="auth-foot">Schon registriert? <Link href="/login">Anmelden</Link></p>
      </div>
    </main>
  );
}
