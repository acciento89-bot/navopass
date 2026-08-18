import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";
import "./service-extra.css";
import "./collaboration.css";
import "./finish.css";
import "./billing.css";

export const metadata: Metadata = {
  title: { default: "NavoPass", template: "%s · NavoPass" },
  description: "Der digitale Pass für Dinge, die dir wichtig sind.",
  applicationName: "NavoPass",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/navopass.svg" },
};

export const viewport: Viewport = { themeColor: "#0b6e9d", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="de"><body>{children}<PwaRegister /></body></html>;
}
