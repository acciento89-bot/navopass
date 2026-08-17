import { createHash } from "node:crypto";
import { query } from "@/lib/db";

export type CancellationReceipt = {
  id: string;
  email: string;
  contract_label: string;
  cancellation_kind: "ORDINARY" | "EXTRAORDINARY";
  reason: string | null;
  requested_end_mode: "NEXT_POSSIBLE" | "IMMEDIATE" | "DATE";
  requested_end_date: string | null;
  processing_status: string;
  processing_note: string | null;
  requested_at: Date | string;
  confirmation_sent_at: Date | string | null;
};

function hash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function getCancellationByReceiptToken(token: string) {
  if (token.length < 20) return null;
  const result = await query<CancellationReceipt>(
    `SELECT id,email,contract_label,cancellation_kind,reason,requested_end_mode,requested_end_date,
      processing_status,processing_note,requested_at,confirmation_sent_at
     FROM cancellation_requests WHERE receipt_token_hash=$1 LIMIT 1`,
    [hash(token)]
  );
  return result.rows[0] ?? null;
}

export function cancellationKindLabel(kind: CancellationReceipt["cancellation_kind"]) {
  return kind === "EXTRAORDINARY" ? "Außerordentliche Kündigung" : "Ordentliche Kündigung";
}

export function cancellationEndLabel(receipt: CancellationReceipt) {
  if (receipt.requested_end_mode === "NEXT_POSSIBLE") return "Zum nächstmöglichen Zeitpunkt";
  if (receipt.requested_end_mode === "IMMEDIATE") return "Sofort";
  if (!receipt.requested_end_date) return "Zum angegebenen Datum";
  const date = new Date(`${receipt.requested_end_date}T12:00:00Z`);
  return Number.isNaN(date.getTime())
    ? receipt.requested_end_date
    : new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeZone: "Europe/Berlin" }).format(date);
}

export function cancellationReceivedLabel(value: Date | string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeStyle: "medium", timeZone: "Europe/Berlin" }).format(date);
}
