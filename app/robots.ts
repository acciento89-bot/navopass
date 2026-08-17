import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: "*",
      allow: ["/", "/p/"],
      disallow: ["/app/", "/api/", "/login", "/register", "/invite/", "/passwort-vergessen", "/passwort-zuruecksetzen"],
    }],
  };
}
