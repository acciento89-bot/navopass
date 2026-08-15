import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NavoPass",
    short_name: "NavoPass",
    description: "Digitale Objekt- und Servicepässe",
    start_url: "/app",
    display: "standalone",
    background_color: "#f7fbfd",
    theme_color: "#0b6e9d",
    icons: [{ src: "/navopass.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
