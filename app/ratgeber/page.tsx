import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { getLocale } from "@/lib/i18n";
import { seoGuides } from "@/lib/seo-guides";
import styles from "./ratgeber.module.css";

export const metadata: Metadata = {
  title: "Ratgeber für digitale Objekt- und Servicepässe",
  description: "Praxiswissen zu digitalen Objektpässen, QR-Code-Inventar, Wartungsplanung und digitalen Serviceberichten.",
  alternates: { canonical: "/ratgeber" },
};

export default async function GuidesPage() {
  const locale = await getLocale();
  const tr = (de: string, en: string) => locale === "en" ? en : de;
  return (
    <PublicShell>
      <main className={styles.main}>
        <div className={styles.wrap}>
          <section className={styles.hero}>
            <span className={styles.eyebrow}>{tr("NAVOPASS RATGEBER", "NAVOPASS GUIDES")}</span>
            <h1>{tr("Objekte und Serviceabläufe besser organisieren", "Organise assets and service workflows more effectively")}</h1>
            <p>{tr("Verständliche Anleitungen für digitale Objektpässe, QR-Codes, Wartungsfristen und nachvollziehbare Serviceberichte.", "Practical guidance on digital asset passes, QR codes, maintenance deadlines and traceable service reports.")}</p>
          </section>
          <section className={styles.grid} aria-label={tr("NavoPass Ratgeber", "NavoPass guides")}>
            {seoGuides.map((guide) => (
              <Link className={styles.card} href={`/ratgeber/${guide.slug}`} key={guide.slug}>
                <span>{guide.eyebrow[locale]}</span>
                <h2>{guide.title[locale]}</h2>
                <p>{guide.description[locale]}</p>
                <strong>{tr("Ratgeber öffnen →", "Open guide →")}</strong>
              </Link>
            ))}
          </section>
        </div>
      </main>
    </PublicShell>
  );
}
