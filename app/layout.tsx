import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./service-extra.css";

export const metadata: Metadata = {
  title: { default: "NavoPass", template: "%s · NavoPass" },
  description: "Der digitale Pass für Dinge, die dir wichtig sind.",
  applicationName: "NavoPass",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/navopass.svg" },
};

export const viewport: Viewport = { themeColor: "#0b6e9d", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="de"><body>{children}</body></html>;
}
