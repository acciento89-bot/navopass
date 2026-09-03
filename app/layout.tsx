import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa-register";
import { getLocale } from "@/lib/i18n";
import "./globals.css";
import "./service-extra.css";
import "./collaboration.css";
import "./finish.css";
import "./billing.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: { default: "NavoPass", template: "%s · NavoPass" },
    description: locale === "de" ? "Der digitale Pass für Dinge, die dir wichtig sind." : "The digital pass for the things that matter to you.",
    applicationName: "NavoPass",
    manifest: "/manifest.webmanifest",
    icons: { icon: "/navopass.svg" },
  };
}

export const viewport: Viewport = { themeColor: "#0b6e9d", colorScheme: "light" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return <html lang={locale}><body>{children}<PwaRegister /></body></html>;
}
