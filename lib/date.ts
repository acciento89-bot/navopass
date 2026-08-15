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

function parts(value: DateOnlyInput) {
  const normalized = dateOnly(value);
  if (!normalized) return null;
  const [year, month, day] = normalized.split("-").map(Number);
  if (!year || !month || !day) return null;
  return { normalized, year, month, day };
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
  const source = parts(value);
  if (!source) return null;
  const shifted = new Date(Date.UTC(source.year, source.month - 1, source.day + days));
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

export function daysUntil(value: DateOnlyInput): number | null {
  const target = parts(value);
  if (!target) return null;
  const now = new Date();
  const targetOrdinal = Date.UTC(target.year, target.month - 1, target.day) / 86_400_000;
  const todayOrdinal = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000;
  return Math.round(targetOrdinal - todayOrdinal);
}
