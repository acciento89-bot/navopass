import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: "*",
      allow: ["/", "/p/"],
      disallow: ["/app/", "/api/", "/login", "/register", "/invite/", "/passwort-vergessen", "/passwort-zuruecksetzen", "/email-bestaetigen"],
    }],
    sitemap: "https://navopass.de/sitemap.xml",
    host: "https://navopass.de",
  };
}
