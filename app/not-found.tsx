import Link from "next/link";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return <main className="auth-page"><div className="auth-card"><Logo /><div className="empty-icon">?</div><h1>Pass nicht gefunden</h1><p>Der Link ist ungültig oder der Eigentümer hat den Pass auf privat gestellt.</p><Link className="button" href="/">Zu NavoPass</Link></div></main>;
}
