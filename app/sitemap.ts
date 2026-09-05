import type { MetadataRoute } from "next";
import { seoGuides } from "@/lib/seo-guides";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-09-04T00:00:00.000Z");
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: "https://navopass.de",
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    { url: "https://navopass.de/ratgeber", lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: "https://navopass.de/preise", lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: "https://navopass.de/kontakt", changeFrequency: "yearly", priority: 0.4 },
    { url: "https://navopass.de/impressum", changeFrequency: "yearly", priority: 0.2 },
    { url: "https://navopass.de/datenschutz", changeFrequency: "yearly", priority: 0.2 },
    { url: "https://navopass.de/konto-loeschen", changeFrequency: "yearly", priority: 0.3 },
    { url: "https://navopass.de/nutzungsbedingungen", changeFrequency: "yearly", priority: 0.2 },
  ];

  return [
    ...staticPages,
    ...seoGuides.map((guide) => ({
      url: `https://navopass.de/ratgeber/${guide.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.85,
    })),
  ];
}
