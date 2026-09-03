import Link from "next/link";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getLocale, type Locale } from "@/lib/i18n";
import styles from "./home.module.css";

function Icon({ children, size = 22 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

function Brand({ locale }: { locale: Locale }) {
  return (
    <Link href="/" className={styles.brand} aria-label={locale === "de" ? "NavoPass Startseite" : "NavoPass home page"}>
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
    title: "Historie & Fristen pflegen",
    text: "Lade Dokumente hoch, dokumentiere Wartungen und lass dich an Service- und Garantiefristen erinnern.",
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
    title: "Gemeinsam nutzen",
    text: "Organisiere Pässe allein, im Haushalt oder im Team und steuere mit Rollen, wer ansehen oder bearbeiten darf.",
    icon: <Icon size={31}><circle cx="9" cy="8" r="4"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M17 9h4M19 7v4"/></Icon>,
  },
];

const businessWorkflow = [
  {
    number: "1",
    title: "Kunden & Objekte organisieren",
    text: "Ordne Objektpässe Kunden und Standorten zu und behalte Geräte, Anlagen, Fahrzeuge, Maschinen, Dokumente und QR-Codes zentral im Blick.",
    icon: <Icon size={31}><path d="M3 21h18M5 21V7l7-4 7 4v14M9 10h6M9 14h6M9 18h6"/></Icon>,
  },
  {
    number: "2",
    title: "Einsätze planen",
    text: "Plane Termine und Dauer, setze Prioritäten, weise Mitarbeiter oder Servicekräfte zu und verhindere Doppelbelegungen automatisch.",
    icon: <Icon size={31}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18M8 14h3M13 14h3M8 18h3"/></Icon>,
  },
  {
    number: "3",
    title: "Vor Ort dokumentieren",
    text: "Erfasse Arbeiten, Material, Messwerte, Prüfergebnisse, Feststellungen, Empfehlungen, Arbeitszeit und Kundenbestätigung direkt am Einsatz.",
    icon: <Icon size={31}><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v5h5M9 12h6M9 16h4"/><path d="m14 18 2 2 4-5"/></Icon>,
  },
  {
    number: "4",
    title: "Bericht fertig & versenden",
    text: "Erzeuge einen nachvollziehbaren Einsatz- oder Servicebericht mit PDF-Druckansicht und sende dem Kunden einen geschützten Bericht-Link.",
    icon: <Icon size={31}><path d="M4 4h16v16H4z"/><path d="m4 6 8 7 8-7M8 17h8"/></Icon>,
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
  "Wartungs- und Garantiefristen rechtzeitig im Blick behalten",
  "QR-Code bei Reparaturen oder Weitergabe nutzen",
  "Pässe mit der Familie in einem Haushalt gemeinsam verwalten",
];

const businessBenefits = [
  "Kunden, Standorte, Geräte, Fahrzeuge und Anlagen digital organisieren",
  "Service-, Prüf- oder Außendiensteinsätze mit Terminen und Teamzuweisung planen",
  "Wochenplanung mit Einsatzdauer und Schutz vor Doppelbelegungen nutzen",
  "Arbeiten, Material, Messwerte, Prüfergebnisse und Kundenbestätigungen dokumentieren",
  "Einsatz- und Serviceberichte als PDF ausgeben und geschützt an Kunden senden",
  "QR-Aufkleber, Servicezugänge und nachvollziehbare Objekt-Historien verwalten",
];

export default async function HomePage() {
  const locale = await getLocale();
  const en = locale === "en";
  const tr = (de: string, english: string) => en ? english : de;
  const localizedSteps = steps.map((step, index) => ({ ...step, title: ["Create an item", "Manage history & deadlines", "Share the QR code", "Use it together"][index], text: ["Create your pass in seconds and add the most important information.", "Upload documents, record maintenance and keep an eye on service and warranty deadlines.", "Your pass is linked to a QR code and can be opened directly in any browser.", "Organise passes on your own, with your household or team, and control access with roles."][index] }));
  const localizedBusinessWorkflow = businessWorkflow.map((step, index) => ({ ...step, title: ["Organise customers & assets", "Plan service jobs", "Document work on site", "Complete & send the report"][index], text: ["Assign asset passes to customers and locations and manage equipment, systems, vehicles, machines, documents and QR codes in one place.", "Plan appointments and duration, set priorities, assign staff or service technicians and automatically prevent scheduling conflicts.", "Record work, materials, readings, test results, findings, recommendations, working time and customer confirmation during the visit.", "Create a traceable service report with a printable PDF view and send the customer a protected report link."][index] }));
  const localizedAssetTypes = assetTypes.map((item, index) => ({ ...item, label: ["Heat pump", "Bicycle", "Car", "Tool", "Washing machine", "Air conditioner", "Machine", "Boat"][index] }));
  const localizedPrivateBenefits = en ? ["Keep important documents and warranties safely in one place", "Stay on top of maintenance and warranty deadlines", "Use the QR code for repairs, handovers or resale", "Manage passes together with your family in one household"] : privateBenefits;
  const localizedBusinessBenefits = en ? ["Organise customers, locations, devices, vehicles and systems digitally", "Plan service, inspection and field jobs with appointments and team assignments", "Use weekly scheduling with job durations and conflict prevention", "Document work, materials, readings, test results and customer confirmations", "Export service reports as PDFs and share them securely with customers", "Manage QR stickers, service access and traceable asset histories"] : businessBenefits;
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Brand locale={locale} />
          <nav className={styles.nav} aria-label={tr("Hauptnavigation", "Main navigation")}>
            <a href="#produkt">{tr("Produkt", "Product")}</a>
            <a href="#zielgruppen">{tr("Für wen?", "For whom?")}</a>
            <a href="#firmen-service">Business</a>
            <Link href="/preise">{tr("Preise", "Pricing")}</Link>
            <a href="#start">{tr("Loslegen", "Get started")}</a>
          </nav>
          <div className={styles.headerActions}>
            <LanguageSwitcher compact />
            <Link href="/login" className={styles.login}>{tr("Anmelden", "Sign in")}</Link>
            <Link href="/register" className={styles.topCta}>{tr("Kostenlos starten", "Start for free")} <span>→</span></Link>
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
              {tr("Digitale Pässe für Privat, Familien und Unternehmen", "Digital passes for individuals, families and businesses")}
            </div>
            <h1>{tr("Alles, was dir gehört,", "Everything you own")}<br/>{tr("bekommt seinen eigenen", "gets its own")}<br/><em>{tr("digitalen Pass.", "digital pass.")}</em></h1>
            <p>{tr("Privat bündelt NavoPass Dokumente, Garantien, Reparaturen und Wartungen. Unternehmen nutzen dieselben Objektpässe zusätzlich für Kundenverwaltung, Einsatzplanung, Teamzuweisung und nachvollziehbare Service- oder Arbeitsberichte – unabhängig von Branche oder Gewerbe.", "For personal use, NavoPass brings documents, warranties, repairs and maintenance together. Businesses also use the same asset passes for customer management, job scheduling, team assignments and traceable service or work reports – across industries.")}</p>
            <div className={styles.heroActions}>
              <Link href="/register" className={styles.primaryCta}>{tr("Kostenlos starten", "Start for free")} <span>→</span></Link>
              <a href="#firmen-service" className={styles.secondaryCta}>{tr("Business-Funktionen ansehen", "Explore business features")} <span className={styles.play}>↓</span></a>
            </div>
            <div className={styles.trustBar}>
              <span><Icon size={17}><path d="M12 3 5 6v5.5c0 4.2 2.8 6.9 7 8.9 4.2-2 7-4.7 7-8.9V6z"/><path d="m9 12 2 2 4-4"/></Icon> {tr("Datenschutz im Fokus", "Privacy by design")}</span>
              <span><Icon size={17}><path d="m13 2-8 12h7l-1 8 8-12h-7z"/></Icon> {tr("In Sekunden eingerichtet", "Set up in seconds")}</span>
              <span><Icon size={17}><path d="M17.5 19H7a5 5 0 1 1 1.2-9.85A6 6 0 0 1 20 11a4 4 0 0 1-2.5 8Z"/></Icon> {tr("Browserbasiert & QR-fähig", "Browser-based & QR-ready")}</span>
            </div>
          </div>

          <div className={styles.demoWrap} id="demo">
            <div className={styles.demoCard}>
              <div className={styles.demoHead}>
                <div className={styles.productImage}>
                  <img src="/heatpump.svg" alt={tr("Beispiel eines technischen Objektpasses", "Example of a technical asset pass")} />
                </div>
                <div className={styles.productTitle}>
                  <span>{tr("TECHNISCHES OBJEKT", "TECHNICAL ASSET")}</span>
                  <h2>{tr("Beispiel-Anlage", "Example system")}</h2>
                  <small>{tr("Seriennummer", "Serial number")}</small>
                  <b>NP-2026-784512</b>
                </div>
                <div className={styles.demoQr}>
                  <img src="/api/qr?data=https%3A%2F%2Fnavopass.de%2Fregister" alt={tr("QR-Code Beispiel", "Example QR code")} />
                </div>
              </div>

              <div className={styles.demoTabs}>
                <button className={styles.activeTab}>{tr("Übersicht", "Overview")}</button>
                <button>{tr("Historie", "History")}</button>
                <button>{tr("Dokumente", "Documents")}</button>
              </div>

              <div className={styles.demoStats}>
                <article><span>{tr("Garantie", "Warranty")}</span><b>{tr("Bis 12.06.2028", "Until 12 Jun 2028")}</b><small className={styles.green}>{tr("Noch 3 Jahre", "3 years remaining")}</small></article>
                <article><span>{tr("Letzter Service", "Last service")}</span><b>{tr("18.04.2026", "18 Apr 2026")}</b><small>{tr("vor 4 Monaten", "4 months ago")}</small></article>
                <article><span>{tr("Nächster Termin", "Next appointment")}</span><b>{tr("April 2027", "April 2027")}</b><small className={styles.blue}>{tr("in 7 Monaten", "in 7 months")}</small></article>
              </div>

              <div className={styles.demoRows}>
                <div><span>Status</span><b className={styles.statusOk}>{tr("Alles in Ordnung", "Everything is up to date")}</b><strong>›</strong></div>
                <div><span>{tr("Bereich", "Workspace")}</span><b>{tr("Team · 3 Mitglieder", "Team · 3 members")}</b><strong>›</strong></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.stepsSection} id="so-gehts">
        <div className={styles.sectionHeading}>
          <span>{tr("SO FUNKTIONIERT'S", "HOW IT WORKS")}</span>
          <h2>{tr("In 4 einfachen Schritten zum digitalen Pass", "Your digital pass in 4 simple steps")}</h2>
        </div>
        <div className={styles.stepsGrid}>
          {(en ? localizedSteps : steps).map((step, index) => (
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
          <span>{tr("FÜR ALLES, WAS DIR WICHTIG IST", "FOR EVERYTHING THAT MATTERS")}</span>
          <h2>{tr("Ein Pass für jedes deiner Dinge", "One pass for every item you own")}</h2>
        </div>
        <div className={styles.assetGrid}>
          {(en ? localizedAssetTypes : assetTypes).map((item) => (
            <article className={styles.assetCard} key={item.label}>
              <div>{item.icon}</div>
              <b>{item.label}</b>
            </article>
          ))}
        </div>
        <a href="#zielgruppen" className={styles.more}>{tr("Und vieles mehr…", "And much more…")}</a>
      </section>

      <section className={styles.audienceSection} id="zielgruppen">
        <article className={styles.audienceCard}>
          <div className={styles.audienceImage}>
            <img src="/navopass-private.svg" alt={tr("Helles Zuhause als Beispiel für private Nutzung", "Bright home illustrating personal use")} />
          </div>
          <div className={styles.audienceContent}>
            <span>{tr("FÜR PRIVATPERSONEN & FAMILIEN", "FOR INDIVIDUALS & FAMILIES")}</span>
            <h2>{tr("Alles im Blick. Zuhause und unterwegs.", "Stay organised. At home and on the go.")}</h2>
            <ul>
              {localizedPrivateBenefits.map((item) => <li key={item}><i>✓</i>{item}</li>)}
            </ul>
          </div>
        </article>

        <article className={styles.audienceCard}>
          <div className={styles.audienceContent}>
            <span>{tr("FÜR UNTERNEHMEN, SERVICE- & AUSSENDIENSTTEAMS", "FOR BUSINESSES, SERVICE & FIELD TEAMS")}</span>
            <h2>{tr("Vom Objektpass bis zum fertigen Einsatzbericht.", "From asset pass to completed service report.")}</h2>
            <ul>
              {localizedBusinessBenefits.map((item) => <li key={item}><i>✓</i>{item}</li>)}
            </ul>
          </div>
          <div className={styles.audienceImage}>
            <img src="/navopass-business.svg" alt={tr("Modernes Büro als Beispiel für geschäftliche Nutzung", "Modern office illustrating business use")} />
          </div>
        </article>
      </section>

      <section className={styles.stepsSection} id="firmen-service">
        <div className={styles.sectionHeading}>
          <span>{tr("NAVOPASS BUSINESS FÜR VIELE BRANCHEN", "NAVOPASS BUSINESS ACROSS INDUSTRIES")}</span>
          <h2>{tr("Ein durchgängiger Einsatzprozess statt einzelner QR-Pässe", "One connected service workflow, not isolated QR passes")}</h2>
        </div>
        <div className={styles.stepsGrid}>
          {(en ? localizedBusinessWorkflow : businessWorkflow).map((step, index) => (
            <article className={styles.stepCard} key={step.title}>
              <div className={styles.stepNumber}>{step.number}</div>
              {index < businessWorkflow.length - 1 && <div className={styles.connector} aria-hidden="true" />}
              <div className={styles.stepIcon}>{step.icon}</div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.ctaPanel} id="start">
        <div className={styles.ctaShield}><Icon size={28}><path d="M12 3 5 6v5.5c0 4.2 2.8 6.9 7 8.9 4.2-2 7-4.7 7-8.9V6z"/><path d="m9 12 2 2 4-4"/></Icon></div>
        <div>
          <h2>{tr("Vom ersten Pass bis zum digitalen Einsatzprozess.", "From your first pass to a complete digital service workflow.")}</h2>
          <p>{tr("Starte mit NavoPass und wähle den Tarif passend zu Haushalt, Team oder Unternehmen – vom Handwerk über Wartung und Prüfung bis zu Fahrzeug-, Geräte- oder Außendienst-Services.", "Start with NavoPass and choose the plan that fits your household, team or business – from trades and maintenance to inspections, vehicle service, equipment service and field operations.")}</p>
        </div>
        <div className={styles.ctaButtons}>
          <Link href="/register" className={styles.primaryCta}>{tr("Kostenlos starten", "Start for free")} <span>→</span></Link>
          <Link href="/preise" className={styles.moreCta}>{tr("Preise ansehen", "View pricing")} <span>→</span></Link>
        </div>
      </section>

      <footer className={styles.footer} id="footer">
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}><Brand locale={locale} /><p>{tr("Digitale Objektpässe und Einsatzprozesse.", "Digital asset passes and service workflows.")}</p></div>
          <div><b>{tr("Produkt", "Product")}</b><a href="#so-gehts">{tr("Digitale Pässe", "Digital passes")}</a><a href="#firmen-service">Business</a><Link href="/preise">{tr("Preise", "Pricing")}</Link><Link href="/register">{tr("Kostenlos starten", "Start for free")}</Link></div>
          <div><b>{tr("Ressourcen", "Resources")}</b><Link href="/kontakt">{tr("Kontakt & Support", "Contact & support")}</Link><a href="#firmen-service">{tr("Einsatzplanung & Berichte", "Scheduling & reports")}</a><a href="#produkt">QR {tr("Pässe", "passes")}</a></div>
          <div><b>{tr("Unternehmen", "Company")}</b><a href="https://kamilunavo.com">Kamilunavo</a><a href="https://kamilunavo.com/support">Kamilunavo Support</a></div>
          <div><b>{tr("Rechtliches", "Legal")}</b><Link href="/datenschutz">{tr("Datenschutz", "Privacy")}</Link><Link href="/impressum">{tr("Impressum", "Legal notice")}</Link><Link href="/nutzungsbedingungen">{tr("Nutzungsbedingungen", "Terms of use")}</Link><span>© 2026 Kamilunavo</span></div>
        </div>
      </footer>
    </main>
  );
}
