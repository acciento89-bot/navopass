import { cookies, headers } from "next/headers";

export const LOCALE_COOKIE = "navopass_locale";
export type Locale = "de" | "en";

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "de" || value === "en";
}

export async function getLocale(): Promise<Locale> {
  const [requestHeaders, cookieStore] = await Promise.all([headers(), cookies()]);
  const requestLocale = requestHeaders.get("x-navopass-locale");
  if (isLocale(requestLocale)) return requestLocale;

  const savedLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  return isLocale(savedLocale) ? savedLocale : "de";
}

export function localeName(locale: Locale) {
  return locale === "de" ? "Deutsch" : "English";
}

