export type DateOnlyInput = string | Date | null | undefined;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function dateOnly(value: DateOnlyInput): string | null {
  if (!value) return null;

  if (typeof value === "string") {
    const direct = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (direct) return `${direct[1]}-${direct[2]}-${direct[3]}`;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }

  return null;
}

export function dateOnlyAsDate(value: DateOnlyInput): Date | null {
  const normalized = dateOnly(value);
  if (!normalized) return null;
  const parsed = new Date(`${normalized}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function dateOnlyCompact(value: DateOnlyInput): string | null {
  const normalized = dateOnly(value);
  return normalized ? normalized.replace(/-/g, "") : null;
}

export function addDaysDateOnly(value: DateOnlyInput, days: number): string | null {
  const parsed = dateOnlyAsDate(value);
  if (!parsed) return null;
  parsed.setDate(parsed.getDate() + days);
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
}

export function daysUntil(value: DateOnlyInput): number | null {
  const target = dateOnlyAsDate(value);
  if (!target) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}
