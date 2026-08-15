import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./home.module.css";

function Icon({ children, size = 22 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

function Brand() {
  return (
    <Link href="/" className={styles.brand} aria-label="NavoPass Startseite">
      <span className={styles.brandMark}>
        <Icon size={23}><path d="M12 3 5 6v5.5c0 4.2 2.8 6.9 7 8.9 4.2-2 7-4.7 7-8.9V6z"/><path d="m9 12 2 2 4-4"/></Icon>
      </span>
      <span>NavoPass</span>
    </Link>
  );
}

const steps = [
  {
    number: "1",
    title: "Gegenstand anlegen",
    text: "Erstelle deinen Pass in wenigen Sekunden und füge die wichtigsten Informationen hinzu.",
    icon: <Icon size={31}><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/><path d="M18 14v6M15 17h6"/></Icon>,
  },
  {
    number: "2",
    title: "Historie sammeln",
    text: "Lade Dokumente hoch und halte Wartungen, Reparaturen und Ereignisse fest.",
    icon: <Icon size={31}><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v5h5M9 12h6M9 16h6"/><circle cx="18" cy="18" r="3"/></Icon>,
  },
  {
    number: "3",
    title: "QR-Code teilen",
    text: "Dein Pass wird mit einem QR-Code verknüpft und ist jederzeit direkt im Browser abrufbar.",
    icon: <Icon size={31}><rect x="3" y="3" width="6" height="6"/><rect x="15" y="3" width="6" height="6"/><rect x="3" y="15" width="6" height="6"/><path d="M15 15h2v2h-2zM19 15h2v6h-2zM15 19h2v2h-2z"/></Icon>,
  },
  {
    number: "4",
    title: "Weitergeben",
    text: "Gib den Pass sicher weiter – zum Beispiel bei Verkauf, Vermietung oder im Servicefall.",
    icon: <Icon size={31}><circle cx="9" cy="8" r="4"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M17 9h4M19 7v4"/></Icon>,
  },
];

const assetTypes = [
  { label: "Wärmepumpe", icon: <Icon size={36}><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="12" r="4"/><path d="M15 9h3M15 12h3M15 15h3"/></Icon> },
  { label: "Fahrrad", icon: <Icon size={36}><circle cx="6" cy="17" r="4"/><circle cx="18" cy="17" r="4"/><path d="m6 17 4-8 3 8h5M8 13h7M10 9h4M14 9l2-3"/></Icon> },
  { label: "Auto", icon: <Icon size={36}><path d="m3 14 2-5h14l2 5v4H3z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M5 14h14"/></Icon> },
  { label: "Werkzeug", icon: <Icon size={36}><path d="M14.7 6.3a4 4 0 0 0-5 5L3 18l3 3 6.7-6.7a4 4 0 0 0 5-5l-2.5 2.5-3-3z"/></Icon> },
  { label: "Waschmaschine", icon: <Icon size={36}><rect x="5" y="2" width="14" height="20" rx="2"/><circle cx="12" cy="14" r="5"/><path d="M8 6h.01M11 6h5"/></Icon> },
  { label: "Klimaanlage", icon: <Icon size={36}><rect x="3" y="5" width="18" height="8" rx="2"/><path d="M7 17c1.5 0 1.5 2 0 2M12 16c1.5 0 1.5 3 0 3M17 17c1.5 0 1.5 2 0 2"/></Icon> },
  { label: "Maschine", icon: <Icon size={36}><path d="M4 20h16M6 20v-7l5-3 2 3 5-2v9"/><circle cx="8" cy="8" r="3"/><path d="M8 5V3M11 8h2M5 8H3"/></Icon> },
  { label: "Boot", icon: <Icon size={36}><path d="M3 15h18l-3 5H7z"/><path d="M9 15V5h5l3 4H9M12 5V2"/></Icon> },
];

const privateBenefits = [
  "Wichtige Dokumente und Garantien sicher aufbewahren",
  "Wartungen rechtzeitig planen und nachvollziehen",
  "QR-Code bei Reparaturen oder Weitergabe nutzen",
  "Mehr Überblick und weniger Papierkram",
];

const businessBenefits = [
  "Inventar und Betriebsmittel digital erfassen",
  "Wartungsintervalle und Prüfungen im Griff behalten",
  "Reibungslose Zusammenarbeit im Team",
  "Zeit sparen und nachvollziehbar dokumentieren",
];

export default function HomePage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Brand />
          <nav className={styles.nav} aria-label="Hauptnavigation">
            <a href="#produkt">Produkt</a>
            <a href="#zielgruppen">Für wen?</a>
            <a href="#so-gehts">So funktioniert&apos;s</a>
            <a href="#start">Preise</a>
            <a href="#footer">Ressourcen</a>
          </nav>
          <div className={styles.headerActions}>
            <Link href="/login" className={styles.login}>Anmelden</Link>
            <Link href="/register" className={styles.topCta}>Jetzt starten <span>→</span></Link>
          </div>
        </div>
      </header>

      <section className={styles.hero} id="produkt">
        <div className={styles.heroScene} aria-hidden="true">
          <img src="/navopass-home.svg" alt="" />
        </div>
        <div className={styles.heroFade} aria-hidden="true" />
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <div className={styles.heroBadge}>
              <Icon size={16}><path d="M12 3 5 6v5.5c0 4.2 2.8 6.9 7 8.9 4.2-2 7-4.7 7-8.9V6z"/></Icon>
              Der digitale Pass für alles, was dir gehört
            </div>
            <h1>Alles, was dir gehört,<br/>bekommt seinen eigenen<br/><em>digitalen Pass.</em></h1>
            <p>Dokumente, Garantien, Reparaturen, Wartungen und die gesamte Historie – sicher an einem Ort, jederzeit per QR-Code verfügbar und einfach weiterzugeben.</p>
            <div className={styles.heroActions}>
              <Link href="/register" className={styles.primaryCta}>Jetzt starten <span>→</span></Link>
              <a href="#demo" className={styles.secondaryCta}>Beispiel ansehen <span className={styles.play}>▷</span></a>
            </div>
            <div className={styles.trustBar}>
              <span><Icon size={17}><path d="M12 3 5 6v5.5c0 4.2 2.8 6.9 7 8.9 4.2-2 7-4.7 7-8.9V6z"/><path d="m9 12 2 2 4-4"/></Icon> Datenschutz im Fokus</span>
              <span><Icon size={17}><path d="m13 2-8 12h7l-1 8 8-12h-7z"/></Icon> In Sekunden eingerichtet</span>
              <span><Icon size={17}><path d="M17.5 19H7a5 5 0 1 1 1.2-9.85A6 6 0 0 1 20 11a4 4 0 0 1-2.5 8Z"/></Icon> Überall verfügbar</span>
            </div>
          </div>

          <div className={styles.demoWrap} id="demo">
            <div className={styles.demoCard}>
              <div className={styles.demoHead}>
                <div className={styles.productImage}>
                  <img src="/heatpump.svg" alt="Illustration einer Wärmepumpe" />
                </div>
                <div className={styles.productTitle}>
                  <span>WÄRMEPUMPE</span>
                  <h2>Vaillant aroTHERM plus</h2>
                  <small>Seriennummer</small>
                  <b>VAI-2024-784512</b>
                </div>
                <div className={styles.demoQr}>
                  <img src="/api/qr?data=https%3A%2F%2Fnavopass.de%2Fregister" alt="QR-Code Beispiel" />
                </div>
              </div>

              <div className={styles.demoTabs}>
                <button className={styles.activeTab}>Übersicht</button>
                <button>Historie</button>
                <button>Dokumente</button>
              </div>

              <div className={styles.demoStats}>
                <article><span>Garantie</span><b>Bis 12.06.2028</b><small className={styles.green}>Noch 3 Jahre</small></article>
                <article><span>Letzte Wartung</span><b>18.04.2025</b><small>vor 32 Tagen</small></article>
                <article><span>Nächste Wartung</span><b>April 2026</b><small className={styles.blue}>in 11 Monaten</small></article>
              </div>

              <div className={styles.demoRows}>
                <div><span>Status</span><b className={styles.statusOk}>Alles in Ordnung</b><strong>›</strong></div>
                <div><span>Standort</span><b>Musterstraße 12, 12345 Musterstadt</b><strong>›</strong></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.stepsSection} id="so-gehts">
        <div className={styles.sectionHeading}>
          <span>SO FUNKTIONIERT&apos;S</span>
          <h2>In 4 einfachen Schritten zum digitalen Pass</h2>
        </div>
        <div className={styles.stepsGrid}>
          {steps.map((step, index) => (
            <article className={styles.stepCard} key={step.title}>
              <div className={styles.stepNumber}>{step.number}</div>
              {index < steps.length - 1 && <div className={styles.connector} aria-hidden="true" />}
              <div className={styles.stepIcon}>{step.icon}</div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.assetSection}>
        <div className={styles.sectionHeading}>
          <span>FÜR ALLES, WAS DIR WICHTIG IST</span>
          <h2>Ein Pass für jedes deiner Dinge</h2>
        </div>
        <div className={styles.assetGrid}>
          {assetTypes.map((item) => (
            <article className={styles.assetCard} key={item.label}>
              <div>{item.icon}</div>
              <b>{item.label}</b>
            </article>
          ))}
        </div>
        <a href="#zielgruppen" className={styles.more}>Und vieles mehr…</a>
      </section>

      <section className={styles.audienceSection} id="zielgruppen">
        <article className={styles.audienceCard}>
          <div className={styles.audienceImage}>
            <img src="/navopass-private.svg" alt="Helles Zuhause als Beispiel für private Nutzung" />
          </div>
          <div className={styles.audienceContent}>
            <span>FÜR PRIVATPERSONEN</span>
            <h2>Alles im Blick. Zuhause und unterwegs.</h2>
            <ul>
              {privateBenefits.map((item) => <li key={item}><i>✓</i>{item}</li>)}
            </ul>
          </div>
        </article>

        <article className={styles.audienceCard}>
          <div className={styles.audienceContent}>
            <span>FÜR UNTERNEHMEN</span>
            <h2>Effizient verwalten. Einfach skalieren.</h2>
            <ul>
              {businessBenefits.map((item) => <li key={item}><i>✓</i>{item}</li>)}
            </ul>
          </div>
          <div className={styles.audienceImage}>
            <img src="/navopass-business.svg" alt="Modernes Büro als Beispiel für geschäftliche Nutzung" />
          </div>
        </article>
      </section>

      <section className={styles.ctaPanel} id="start">
        <div className={styles.ctaShield}><Icon size={28}><path d="M12 3 5 6v5.5c0 4.2 2.8 6.9 7 8.9 4.2-2 7-4.7 7-8.9V6z"/><path d="m9 12 2 2 4-4"/></Icon></div>
        <div>
          <h2>Bereit für deinen ersten digitalen Pass?</h2>
          <p>Starte jetzt kostenlos und behalte alles im Blick, was dir gehört.</p>
        </div>
        <div className={styles.ctaButtons}>
          <Link href="/register" className={styles.primaryCta}>Jetzt starten <span>→</span></Link>
          <a href="#produkt" className={styles.moreCta}>Mehr erfahren <span>→</span></a>
        </div>
      </section>

      <footer className={styles.footer} id="footer">
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}><Brand /><p>Der digitale Pass für deine Dinge.</p></div>
          <div><b>Produkt</b><a href="#so-gehts">Funktionen</a><a href="#zielgruppen">Für wen?</a><a href="#produkt">Sicherheit</a><a href="#start">Integrationen</a></div>
          <div><b>Ressourcen</b><a href="#so-gehts">Hilfe-Center</a><a href="#produkt">Blog</a><a href="#produkt">Vorlagen</a></div>
          <div><b>Unternehmen</b><a href="https://kamilunavo.com">Über uns</a><a href="https://kamilunavo.com/support">Support</a></div>
          <div><b>Rechtliches</b><a href="https://kamilunavo.com/datenschutz">Datenschutz</a><a href="https://kamilunavo.com/impressum">Impressum</a><span>© 2026 Kamilunavo</span></div>
        </div>
      </footer>
    </main>
  );
}
