import { query } from "@/lib/db";

let ready: Promise<void> | null = null;

export function ensureCustomerSchema() {
  if (!ready) {
    ready = query("SELECT 1 FROM service_customers LIMIT 0").then(() => undefined);
  }
  return ready;
}
