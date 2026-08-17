import Link from "next/link";
import { verifyEmailAction } from "@/app/actions/verification";
import { Logo } from "@/components/logo";
import styles from "@/app/auth.module.css";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string; success?: string; error?: string }> }) {
  const { token = "", success, error } = await searchParams;
  return <main className={styles.page}><header className={styles.header}><div className={styles.brand}><Logo /></div><Link className={styles.back} href="/app">← Zu NavoPass</Link></header><section className={styles.shell}><aside className={styles.side}><div className={styles.sideInner}><span className={styles.eyebrow}>Kontosicherheit</span><h2>Bestätige deine E-Mail-Adresse.</h2><p>So können nur berechtigte Nutzer Einladungen und sicherheitsrelevante Nachrichten für diese Adresse verwenden.</p></div></aside><div className={styles.formPane}><div className={styles.formBox}><span>E-Mail bestätigen</span><h1>{success ? "Bestätigt" : "Adresse verifizieren"}</h1>{success ? <><p className={styles.success}>Deine E-Mail-Adresse wurde erfolgreich bestätigt.</p><Link className={styles.submitLink} href="/app">Zum Dashboard →</Link></> : <>{error && <p className={styles.error}>{error}</p>}{token.length > 20 ? <form action={verifyEmailAction} className={styles.form}><input type="hidden" name="token" value={token} /><button className={styles.submit} type="submit">E-Mail-Adresse bestätigen →</button></form> : <><p className={styles.error}>Der Bestätigungslink fehlt oder ist ungültig.</p><Link className={styles.submitLink} href="/app">Zum Dashboard →</Link></>}</>}<p className={styles.foot}><Link href="/kontakt">Probleme mit der Bestätigung?</Link></p></div></div></section></main>;
}
