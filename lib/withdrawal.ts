import { createHash } from "node:crypto";
import { query } from "@/lib/db";

export type WithdrawalReceipt = {
  id: string;
  consumer_name: string;
  email: string;
  contract_label: string;
  processing_status: string;
  processing_note: string | null;
  requested_at: Date | string;
  confirmation_sent_at: Date | string | null;
};

function hash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function getWithdrawalByReceiptToken(token: string) {
  if (token.length < 20) return null;
  const result = await query<WithdrawalReceipt>(
    `SELECT id,consumer_name,email,contract_label,processing_status,processing_note,requested_at,confirmation_sent_at
     FROM withdrawal_requests WHERE receipt_token_hash=$1 LIMIT 1`,
    [hash(token)]
  );
  return result.rows[0] ?? null;
}

export function withdrawalReceivedLabel(value: Date | string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeStyle: "medium", timeZone: "Europe/Berlin" }).format(date);
}
