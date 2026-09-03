import { dateOnlyAsDate, type DateOnlyInput } from "@/lib/date";

export function formatDate(value: DateOnlyInput, locale: "de" | "en" = "de") {
  const parsed = dateOnlyAsDate(value);
  if (!parsed) return "—";
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", { dateStyle: "medium" }).format(parsed);
}

export function formatMoney(cents: number | null, locale: "de" | "en" = "de") {
  if (cents == null) return null;
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-GB", { style: "currency", currency: "EUR" }).format(cents / 100);
}
