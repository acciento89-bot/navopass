export const BUSINESS_TIME_ZONE = "Europe/Berlin";

function zoneOffsetMs(date: Date, timeZone = BUSINESS_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value || 0);
  const representedAsUtc = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second"));
  return representedAsUtc - date.getTime();
}

export function berlinLocalDateTimeToUtcIso(value: string | null) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, ys, ms, ds, hs, mins] = match;
  const wallClockUtc = Date.UTC(Number(ys), Number(ms) - 1, Number(ds), Number(hs), Number(mins), 0);
  let guess = new Date(wallClockUtc);
  let offset = zoneOffsetMs(guess);
  guess = new Date(wallClockUtc - offset);
  offset = zoneOffsetMs(guess);
  const resolved = new Date(wallClockUtc - offset);
  return Number.isNaN(resolved.getTime()) ? null : resolved.toISOString();
}
