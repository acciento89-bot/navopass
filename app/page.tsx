import Link from "next/link";
import { Logo } from "@/components/logo";

export default function HomePage() {
  return (
    <main>
      <header className="site-header container">
        <Logo />
        <nav><Link href="/login">Anmelden</Link><Link className="button small" href="/register">Kostenlos starten</Link></nav>
      </header>

      <section className="hero container">
        <div className="hero-copy">
          <span className="eyebrow">Ein Pass. Die ganze Geschichte.</span>
          <h1>Der digitale Lebenslauf für deine Dinge.</h1>
          <p>NavoPass verbindet Geräte, Fahrzeuge, Werkzeuge und andere Gegenstände per QR-Code mit ihrer Historie – Kauf, Garantie, Dokumente, Wartung und Service an einem Ort.</p>
          <div className="hero-actions"><Link className="button" href="/register">Ersten Pass erstellen</Link><a className="button ghost" href="#so-gehts">So funktioniert’s</a></div>
          <div className="trust-row"><span>✓ Kein App-Zwang beim QR-Scan</span><span>✓ Privat & geschäftlich</span><span>✓ Kontrolliert teilbar</span></div>
        </div>
        <div className="pass-preview">
          <div className="preview-top"><span className="preview-badge">NAVOPASS</span><span className="status-dot">Aktiv</span></div>
          <div className="preview-icon">WP</div>
          <h2>Wärmepumpe Keller</h2>
          <p>Vaillant · aroTHERM plus</p>
          <div className="preview-grid"><div><small>Garantie</small><b>bis 03/2029</b></div><div><small>Letzter Service</small><b>04.08.2026</b></div></div>
          <div className="timeline-mini"><span></span><div><b>Wartung durchgeführt</b><small>Filter gereinigt · 1,8 bar</small></div></div>
          <div className="qr-fake">▦</div>
        </div>
      </section>

      <section id="so-gehts" className="section container">
        <div className="section-heading"><span className="eyebrow">So einfach</span><h2>Vom Gegenstand zum digitalen Pass.</h2></div>
        <div className="feature-grid">
          <article><span>01</span><h3>Objekt anlegen</h3><p>Name, Hersteller, Modell, Seriennummer, Kaufdatum und Garantie erfassen.</p></article>
          <article><span>02</span><h3>Historie aufbauen</h3><p>Wartungen, Reparaturen, Notizen und Dokumente bleiben dauerhaft am Objekt.</p></article>
          <article><span>03</span><h3>QR-Code teilen</h3><p>Der Pass öffnet direkt im Browser. Du bestimmst, welche Informationen sichtbar sind.</p></article>
        </div>
      </section>

      <section className="split-section container">
        <div><span className="eyebrow">Für zuhause</span><h2>Garantie, Belege und Reparaturen endlich zusammen.</h2><p>Vom Fahrrad bis zur Waschmaschine: Alles bleibt nachvollziehbar und kann beim Verkauf oder Service weitergegeben werden.</p></div>
        <div><span className="eyebrow">Für Betriebe</span><h2>Servicehistorie direkt am Objekt.</h2><p>QR scannen, Historie sehen, Service dokumentieren. Business-Funktionen werden auf derselben Plattform aufgebaut.</p></div>
      </section>

      <footer className="footer container"><Logo /><p>© 2026 Kamilunavo · NavoPass</p></footer>
    </main>
  );
}
