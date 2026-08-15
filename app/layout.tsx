import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "NavoPass", template: "%s · NavoPass" },
  description: "Der digitale Pass für Dinge, die dir wichtig sind.",
  applicationName: "NavoPass",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/navopass.svg" },
};

export const viewport: Viewport = { themeColor: "#0b1324", colorScheme: "light dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="de"><body>{children}</body></html>;
}
