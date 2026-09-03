import { NextRequest, NextResponse } from "next/server";
import { isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n";

const COUNTRY_HEADERS = [
  "cf-ipcountry",
  "x-vercel-ip-country",
  "cloudfront-viewer-country",
  "x-country-code",
] as const;
const COUNTRY_COOKIE = "navopass_country";

function countryFrom(request: NextRequest) {
  for (const header of COUNTRY_HEADERS) {
    const country = request.headers.get(header)?.trim().toUpperCase();
    if (country && /^[A-Z]{2}$/.test(country)) return country;
  }
  return null;
}

function clientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const candidate = forwarded || request.headers.get("x-real-ip")?.trim();
  return candidate && /^[0-9a-f:.]+$/i.test(candidate) ? candidate : null;
}

async function lookupCountry(request: NextRequest) {
  const cached = request.cookies.get(COUNTRY_COOKIE)?.value?.toUpperCase();
  if (cached && /^[A-Z]{2}$/.test(cached)) return cached;
  const ip = clientIp(request);
  if (!ip) return null;
  const endpoint = (process.env.IP_COUNTRY_API_URL || "https://api.country.is").replace(/\/$/, "");
  try {
    const result = await fetch(`${endpoint}/${encodeURIComponent(ip)}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(900),
    });
    if (!result.ok) return null;
    const data = await result.json() as { country?: unknown };
    const country = typeof data.country === "string" ? data.country.toUpperCase() : null;
    return country && /^[A-Z]{2}$/.test(country) ? country : null;
  } catch {
    return null;
  }
}

function browserFallback(request: NextRequest): Locale {
  const languages = request.headers.get("accept-language")?.toLowerCase() ?? "";
  return /(^|,)\s*de(?:-|;|,|$)/.test(languages) ? "de" : "en";
}

function automaticLocale(request: NextRequest, country: string | null): Locale {
  if (country) return country === "DE" ? "de" : "en";
  return browserFallback(request);
}

export async function proxy(request: NextRequest) {
  const selected = request.nextUrl.searchParams.get("lang");
  if (isLocale(selected)) {
    const target = request.nextUrl.clone();
    target.searchParams.delete("lang");
    const response = NextResponse.redirect(target);
    response.cookies.set(LOCALE_COOKIE, selected, {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  }

  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  const country = countryFrom(request) ?? await lookupCountry(request);
  const locale = isLocale(saved) ? saved : automaticLocale(request, country);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-navopass-locale", locale);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Language", locale);
  response.headers.append("Vary", "Cookie, Accept-Language, CF-IPCountry, X-Country-Code");
  if (country && !request.cookies.get(COUNTRY_COOKIE)) {
    response.cookies.set(COUNTRY_COOKIE, country, {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24,
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
