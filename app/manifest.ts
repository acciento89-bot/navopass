import type { MetadataRoute } from "next";
import { getLocale } from "@/lib/i18n";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const locale = await getLocale();
  return {
    name: "NavoPass",
    short_name: "NavoPass",
    description: locale === "de" ? "Digitale Objekt- und Servicepässe" : "Digital asset and service passes",
    start_url: "/app",
    display: "standalone",
    background_color: "#f7fbfd",
    theme_color: "#0b6e9d",
    icons: [{ src: "/navopass.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
