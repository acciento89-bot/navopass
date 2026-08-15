import { dateOnlyAsDate, type DateOnlyInput } from "@/lib/date";

export function formatDate(value: DateOnlyInput) {
  const parsed = dateOnlyAsDate(value);
  if (!parsed) return "—";
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(parsed);
}

export function formatMoney(cents: number | null) {
  if (cents == null) return null;
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}
