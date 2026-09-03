export type Plan = "FREE" | "PLUS" | "FAMILY" | "BUSINESS";

export type PlanDefinition = {
  id: Plan;
  name: string;
  monthlyCents: number;
  yearlyCents: number;
  maxAssets: number;
  maxStorageBytes: number;
  maxSeats: number;
  maxSharedWorkspaces: number | null;
  description: string;
};

const GB = 1024 * 1024 * 1024;
const MB = 1024 * 1024;

export const PLAN_CONFIG: Record<Plan, PlanDefinition> = {
  FREE: { id:"FREE", name:"Free", monthlyCents:0, yearlyCents:0, maxAssets:5, maxStorageBytes:250*MB, maxSeats:1, maxSharedWorkspaces:0, description:"Zum Kennenlernen und für die wichtigsten persönlichen Dinge." },
  PLUS: { id:"PLUS", name:"Plus", monthlyCents:799, yearlyCents:7900, maxAssets:75, maxStorageBytes:5*GB, maxSeats:1, maxSharedWorkspaces:0, description:"Für private Nutzer mit vielen Geräten, Fahrzeugen und Dokumenten." },
  FAMILY: { id:"FAMILY", name:"Family", monthlyCents:1299, yearlyCents:12900, maxAssets:250, maxStorageBytes:20*GB, maxSeats:6, maxSharedWorkspaces:3, description:"Für Familien und Haushalte, die Dinge gemeinsam verwalten." },
  BUSINESS: { id:"BUSINESS", name:"Business", monthlyCents:3999, yearlyCents:39900, maxAssets:1000, maxStorageBytes:50*GB, maxSeats:10, maxSharedWorkspaces:null, description:"Für Teams und Servicebetriebe mit Kunden, Anlagen, Einsatzplanung und Wartungsberichten." },
};

export function normalizePlan(value: unknown): Plan {
  return value === "PLUS" || value === "FAMILY" || value === "BUSINESS" ? value : "FREE";
}

export function getPlanDefinition(plan: unknown) {
  return PLAN_CONFIG[normalizePlan(plan)];
}

export function formatStorage(bytes: number) {
  if (bytes >= GB) return `${(bytes / GB).toLocaleString("de-DE", { maximumFractionDigits: 1 })} GB`;
  return `${Math.max(0, Math.round(bytes / MB)).toLocaleString("de-DE")} MB`;
}

export function formatEuro(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}
