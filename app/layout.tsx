import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa-register";
import { getLocale } from "@/lib/i18n";
import "./globals.css";
import "./service-extra.css";
import "./collaboration.css";
import "./finish.css";
import "./billing.css";
import "./seo.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const de = locale === "de";
  return {
    metadataBase: new URL("https://navopass.de"),
    title: {
      default: de ? "NavoPass – digitaler Objektpass mit QR-Code" : "NavoPass – digital asset passes with QR codes",
      template: "%s · NavoPass",
    },
    description: de
      ? "Geräte, Anlagen, Fahrzeuge und Dokumente in digitalen Objektpässen organisieren – mit QR-Code, Wartungshistorie, Fristen und Serviceberichten."
      : "Organise equipment, systems, vehicles and documents in digital asset passes with QR codes, maintenance history, deadlines and service reports.",
    keywords: de
      ? ["digitaler Objektpass", "Gerätepass", "QR Code Inventar", "Wartungsplan digital", "Servicebericht digital", "Anlagenverwaltung"]
      : ["digital asset pass", "QR code inventory", "digital maintenance log", "service report software", "asset management"],
    authors: [{ name: "Kamilunavo", url: "https://kamilunavo.com" }],
    creator: "Kamilunavo",
    publisher: "Kamilunavo",
    category: "Asset Management",
    applicationName: "NavoPass",
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [{ url: "/navopass.svg", type: "image/svg+xml" }],
      shortcut: [{ url: "/navopass.svg", type: "image/svg+xml" }],
      apple: [{ url: "/navopass.svg", type: "image/svg+xml" }],
    },
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: de ? "de_DE" : "en_GB",
      url: "https://navopass.de",
      siteName: "NavoPass",
      title: de ? "NavoPass – der digitale Pass für deine Dinge" : "NavoPass – a digital pass for everything you own",
      description: de
        ? "Objekte, Dokumente, Wartungen, QR-Codes und Serviceberichte an einem Ort."
        : "Assets, documents, maintenance, QR codes and service reports in one place.",
      images: [{ url: "/navopass-home.svg", alt: "NavoPass digitaler Objektpass" }],
    },
    twitter: {
      card: "summary_large_image",
      title: de ? "NavoPass – digitaler Objektpass" : "NavoPass – digital asset passes",
      description: de ? "Objekte, Dokumente, Wartungen und Serviceberichte übersichtlich organisieren." : "Organise assets, documents, maintenance and service reports.",
      images: ["/navopass-home.svg"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
    },
  };
}

export const viewport: Viewport = { themeColor: "#0b6e9d", colorScheme: "light" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return <html lang={locale}><body>{children}<PwaRegister /></body></html>;
}
