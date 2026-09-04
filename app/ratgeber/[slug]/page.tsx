import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/public-shell";
import { getLocale } from "@/lib/i18n";
import { getSeoGuide, seoGuides } from "@/lib/seo-guides";
import styles from "../ratgeber.module.css";

export function generateStaticParams() {
  return seoGuides.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = getSeoGuide(slug);
  if (!guide) return { title: "Ratgeber nicht gefunden", robots: { index: false, follow: false } };
  const locale = await getLocale();
  const seoTitles: Record<string, { de: string; en: string }> = {
    "digitaler-objektpass": { de: "Digitaler Objektpass", en: "Digital asset pass" },
    "inventar-mit-qr-code": { de: "Inventar mit QR-Code", en: "QR code inventory" },
    "wartungsplan-digital": { de: "Digitaler Wartungsplan", en: "Digital maintenance plan" },
    "servicebericht-digital-erstellen": { de: "Servicebericht digital erstellen", en: "Create digital service reports" },
  };
  return {
    title: seoTitles[guide.slug][locale],
    description: guide.description[locale],
    alternates: { canonical: `/ratgeber/${guide.slug}` },
    openGraph: { type: "article", url: `https://navopass.de/ratgeber/${guide.slug}`, title: guide.title[locale], description: guide.description[locale] },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getSeoGuide(slug);
  if (!guide) notFound();
  const locale = await getLocale();
  const tr = (de: string, en: string) => locale === "en" ? en : de;
  const url = `https://navopass.de/ratgeber/${guide.slug}`;
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: guide.title[locale],
      description: guide.description[locale],
      datePublished: "2026-09-04",
      dateModified: "2026-09-04",
      inLanguage: locale,
      mainEntityOfPage: url,
      author: { "@type": "Organization", name: "Kamilunavo", url: "https://kamilunavo.com" },
      publisher: { "@type": "Organization", name: "Kamilunavo", url: "https://kamilunavo.com" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: guide.faq.map((item) => ({ "@type": "Question", name: item.question[locale], acceptedAnswer: { "@type": "Answer", text: item.answer[locale] } })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: tr("Startseite", "Home"), item: "https://navopass.de" },
        { "@type": "ListItem", position: 2, name: tr("Ratgeber", "Guides"), item: "https://navopass.de/ratgeber" },
        { "@type": "ListItem", position: 3, name: guide.eyebrow[locale], item: url },
      ],
    },
  ];

  return (
    <PublicShell>
      <main className={styles.main}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
        <div className={styles.wrap}>
          <article>
            <header className={styles.guideHero}>
              <span className={styles.eyebrow}>{guide.eyebrow[locale]}</span>
              <h1>{guide.title[locale]}</h1>
              <p>{guide.intro[locale]}</p>
              <div className={styles.actions}>
                <Link className={styles.primary} href="/register">{tr("Kostenlos starten →", "Start for free →")}</Link>
                <Link className={styles.secondary} href="/preise">{tr("Preise ansehen", "View pricing")}</Link>
              </div>
            </header>

            <section className={styles.section}>
              <div className={styles.sectionHead}><span>{tr("VORTEILE", "BENEFITS")}</span><h2>{tr("Alle Informationen bleiben am richtigen Objekt", "Keep every detail connected to the right asset")}</h2></div>
              <div className={styles.benefits}>{guide.benefits.map((benefit) => <div className={styles.benefit} key={benefit.de}>{benefit[locale]}</div>)}</div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHead}><span>{tr("ABLAUF", "WORKFLOW")}</span><h2>{tr("In vier Schritten übersichtlich dokumentieren", "A clear four-step workflow")}</h2></div>
              <div className={styles.steps}>{guide.steps.map((step, index) => <article className={styles.step} key={step.title.de}><i>{index + 1}</i><h3>{step.title[locale]}</h3><p>{step.text[locale]}</p></article>)}</div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHead}><span>{tr("HÄUFIGE FRAGEN", "FREQUENTLY ASKED QUESTIONS")}</span><h2>{tr("Kurz und verständlich beantwortet", "Clear answers at a glance")}</h2></div>
              <div className={styles.faq}>{guide.faq.map((item) => <article className={styles.faqItem} key={item.question.de}><h3>{item.question[locale]}</h3><p>{item.answer[locale]}</p></article>)}</div>
            </section>

            <nav className={styles.related} aria-label={tr("Weitere Ratgeber", "Related guides")}>
              <Link href="/ratgeber">{tr("Alle Ratgeber", "All guides")}</Link>
              {seoGuides.filter((item) => item.slug !== guide.slug).map((item) => <Link href={`/ratgeber/${item.slug}`} key={item.slug}>{item.eyebrow[locale]}</Link>)}
            </nav>
          </article>
        </div>
      </main>
    </PublicShell>
  );
}
