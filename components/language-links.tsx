"use client";

import type { Locale } from "@/lib/i18n";

export function LanguageLinks({ locale }: { locale: Locale }) {
  function select(nextLocale: Locale) {
    const target = new URL(window.location.href);
    target.searchParams.set("lang", nextLocale);
    window.location.assign(target);
  }

  return (
    <>
      <button type="button" lang="de" aria-current={locale === "de" ? "true" : undefined} onClick={() => select("de")}>DE</button>
      <span aria-hidden="true">/</span>
      <button type="button" lang="en" aria-current={locale === "en" ? "true" : undefined} onClick={() => select("en")}>EN</button>
    </>
  );
}
