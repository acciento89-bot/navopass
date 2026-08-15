import Link from "next/link";
import { Logo } from "@/components/logo";
import styles from "./home.module.css";

function Icon({ name }: { name: string }) {
  const common = { width: 28, height: 28, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, React.ReactNode> = {
    box: <><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/></>,
    history: <><path d="M4 4v5h5"/><path d="M5.5 16.5A8 8 0 1 0 4 9"/><path d="M12 7v5l3 2"/></>,
    qr: <><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><path d="M15 15h2v2h-2zM19 15h2v6h-2zM15 19h2v2h-2z"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    pump: <><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="12" r="4"/><path d="M15 9h3M15 12h3M15 15h3"/></>,
    bike: <><circle cx="6" cy="17" r="4"/><circle cx="18" cy="17" r="4"/><path d="m6 17 4-8 3 8h5M8 13h7M10 9h4M14 9l2-3"/></>,
    car: <><path d="m3 14 2-5h14l2 5v4H3z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M5 14h14"/></>,
    tool: <><path d="M14.7 6.3a4 4 0 0 0-5 5L3 18l3 3 6.7-6.7a4 4 0 0 0 5-5l-2.5 2.5-3-3z"/></>,
    washer: <><rect x="5" y="2" width="14" height="20" rx="2"/><circle cx="12" cy="14" r="5"/><path d="M8 6h.01M11 6h5"/></>,
    ac: <><rect x="3" y="5" width="18" height="8" rx="2"/><path d="M7 17c1.5 0 1.5 2 0 2M12 16c1.5 0 1.5 3 0 3M17 17c1.5 0 1.5 2 0 2"/></>,
    machine: <><path d="M4 20h16M6 20v-7l5-3 2 3 5-2v9"/><circle cx="8" cy="8" r="3"/><path d="M8 5V3M11 8h2M5 8H3"/></>,
    boat: <><path d="M3 15h18l-3 5H7z"/><path d="M9 15V5h5l3 4H9M12 5V2"/></>,
    shield: <><path d="M12 3 4.5 6v5.8c0 4.4 3 7.2 7.5 9.2 4.5-2 7.5-4.8 7.5-9.2V6z"/><path d="m9 12 2 2 4-4"/></>,
    bolt: <path d="m13 2-8 12h7l-1 8 8-12h-7z"/>,
    cloud: <path d="M17.5 19H7a5 5 0 1 1 1.2-9.85A6 6 0 0 1 20 11a4 4 0 0 1-2.5 8Z"/>,
    check: <path d="m5 12 4 4L19 6"/>,
  };
  return <svg {...common} aria-hidden="true">{paths[name]}</svg>;
}

const steps = [
  { icon: "box", title: "Gegenstand anlegen", text: "Erstelle deinen Pass in wenigen Sekunden und füge die wichtigsten Informationen hinzu." },
  { icon: "history", title: "Historie sammeln", text: "Dokumente, Wartungen, Reparaturen und Ereignisse bleiben dauerhaft am Objekt." },
  { icon: "qr", title: "QR-Code teilen", text: "Dein Pass ist mit einem QR-Code verknüpft – jederzeit abrufbar für dich und andere." },
  { icon: "users", title: "Weitergeben", text: "Gib den Pass sicher weiter – z. B. bei Verkauf, Vermietung oder im Servicefall." },
];

const assetTypes = [
  ["pump", "Wärmepumpe"], ["bike", "Fahrrad"], ["car", "Auto"], ["tool", "Werkzeug"],
  ["washer", "Waschmaschine"], ["ac", "Klimaanlage"], ["machine", "Maschine"], ["boat", "Boot"],
];

export default function HomePage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.navInner}>
          <Logo />
          <nav className={styles.mainNav} aria-label="Hauptnavigation">
            <a href="#produkt">Produkt</a>
            <a href="#zielgruppen">Für wen?</a>
            <a href="#funktionen">Funktionen</a>
            <a href="#preise">Preise</a>
            <a href="#ressourcen">Ressourcen</a>
          </nav>
          <div className={styles.navActions}>
            <Link href="/login" className={styles.loginLink}>Anmelden</Link>
            <Link href="/register" className={styles.primaryButton}>Jetzt starten <span>→</span></Link>
          </div>
        </div>
      </header>

      <section className={styles.hero} id="produkt">
        <div className={styles.heroBackdrop} />
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <div className={styles.kicker}><Icon name="shield" /> Der digitale Pass für alles, was dir gehört</div>
            <h1>Alles, was dir gehört,<br/>bekommt seinen eigenen<br/><span>digitalen Pass.</span></h1>
            <p>Dokumente, Garantien, Reparaturen, Wartungen und die gesamte Historie – sicher an einem Ort, jederzeit per QR-Code verfügbar und einfach weiterzugeben.</p>
            <div className={styles.heroButtons}>
              <Link href="/register" className={styles.primaryButton}>Jetzt starten <span>→</span></Link>
              <a href="#beispiel" className={styles.secondaryButton}>Beispiel ansehen <span>▷</span></a>
            </div>
            <div className={styles.trustRow}>
              <span><Icon name="shield" /> Datenschutz im Fokus</span>
              <span><Icon name="bolt" /> In Sekunden eingerichtet</span>
              <span><Icon name="cloud" /> Überall verfügbar</span>
            </div>
          </div>

          <div className={styles.passStage} id="beispiel">
            <div className={styles.passCard}>
              <div className={styles.passTop}>
                <div className={styles.productVisual}><Icon name="pump" /></div>
                <div className={styles.productName}><small>WÄRMEPUMPE</small><strong>Vaillant aroTHERM plus</strong><span>Seriennummer<br/><b>VAI-2024-784512</b></span></div>
                <div className={styles.qrMock}><i/><i/><i/><i/><i/><i/><i/><i/><i/></div>
              </div>
              <div className={styles.passTabs}><b>Übersicht</b><span>Historie</span><span>Dokumente</span></div>
              <div className={styles.passStats}>
                <div><small>Garantie</small><b>Bis 12.06.2028</b><span>Noch 3 Jahre</span></div>
                <div><small>Letzte Wartung</small><b>18.04.2025</b><span>vor 32 Tagen</span></div>
                <div><small>Nächste Wartung</small><b>April 2026</b><span>in 11 Monaten</span></div>
              </div>
              <div className={styles.passRows}>
                <div><span>Status</span><b className={styles.ok}>Alles in Ordnung</b><em>›</em></div>
                <div><span>Standort</span><b>Musterstraße 12, 12345 Musterstadt</b><em>›</em></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.how} id="funktionen">
        <div className={styles.sectionTitle}><span>SO FUNKTIONIERT&apos;S</span><h2>In 4 einfachen Schritten zum digitalen Pass</h2></div>
        <div className={styles.steps}>
          {steps.map((step, index) => (
            <article className={styles.step} key={step.title}>
              <div className={styles.stepNumber}>{index + 1}</div>
              <div className={styles.stepIcon}><Icon name={step.icon} /></div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.assets}>
        <div className={styles.sectionTitle}><span>FÜR ALLES, WAS DIR WICHTIG IST</span><h2>Ein Pass für jedes deiner Dinge</h2></div>
        <div className={styles.assetGrid}>
          {assetTypes.map(([icon, label]) => <div className={styles.assetTile} key={label}><Icon name={icon} /><b>{label}</b></div>)}
        </div>
        <a className={styles.moreLink} href="#zielgruppen">Und vieles mehr…</a>
      </section>

      <section className={styles.audiences} id="zielgruppen">
        <article className={`${styles.audienceCard} ${styles.privateCard}`}>
          <div className={styles.scenePrivate}><div className={styles.sceneWindow}/><div className={styles.sceneSofa}/><div className={styles.scenePlant}/></div>
          <div className={styles.audienceText}><span>FÜR PRIVATPERSONEN</span><h2>Alles im Blick. Zuhause und unterwegs.</h2>
            <ul><li><Icon name="check"/> Wichtige Dokumente und Garantien sicher aufbewahren</li><li><Icon name="check"/> Wartungen rechtzeitig planen und durchführen</li><li><Icon name="check"/> QR-Code bei Reparaturen oder Weitergabe nutzen</li><li><Icon name="check"/> Mehr Überblick, weniger Papierkram</li></ul>
          </div>
        </article>
        <article className={`${styles.audienceCard} ${styles.businessCard}`}>
          <div className={styles.audienceText}><span>FÜR UNTERNEHMEN</span><h2>Effizient verwalten. Einfach skalieren.</h2>
            <ul><li><Icon name="check"/> Inventar und Betriebsmittel digital erfassen</li><li><Icon name="check"/> Wartungsintervalle und Prüfungen im Griff behalten</li><li><Icon name="check"/> Reibungslose Zusammenarbeit im Team</li><li><Icon name="check"/> Zeit sparen und nachvollziehbar dokumentieren</li></ul>
          </div>
          <div className={styles.sceneBusiness}><div className={styles.desk}/><div className={styles.screen}/><div className={styles.officePlant}/></div>
        </article>
      </section>

      <section className={styles.cta} id="preise">
        <div className={styles.ctaIcon}><Icon name="shield" /></div>
        <div><h2>Bereit für deinen ersten digitalen Pass?</h2><p>Starte jetzt kostenlos und behalte im Blick, was dir gehört.</p></div>
        <div className={styles.ctaActions}><Link href="/register" className={styles.primaryButton}>Jetzt starten <span>→</span></Link><a href="#produkt" className={styles.ctaLink}>Mehr erfahren <span>→</span></a></div>
      </section>

      <footer className={styles.footer} id="ressourcen">
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}><Logo /><p>Der digitale Pass für deine Dinge.</p></div>
          <div><b>Produkt</b><a href="#funktionen">Funktionen</a><a href="#zielgruppen">Für wen?</a><a href="#produkt">Sicherheit</a></div>
          <div><b>Ressourcen</b><a href="#funktionen">Hilfe-Center</a><a href="#produkt">Vorlagen</a><a href="#produkt">FAQ</a></div>
          <div><b>Unternehmen</b><a href="https://kamilunavo.com">Kamilunavo</a><a href="https://kamilunavo.com/support">Support</a></div>
          <div><b>Rechtliches</b><a href="https://kamilunavo.com/datenschutz">Datenschutz</a><a href="https://kamilunavo.com/impressum">Impressum</a><span>© 2026 Kamilunavo</span></div>
        </div>
      </footer>
    </main>
  );
}
