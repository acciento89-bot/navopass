import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { query } from "@/lib/db";

function rateLimitSecret() {
  return process.env.RATE_LIMIT_SECRET?.trim() || process.env.DB_PASSWORD?.trim() || "navopass-development-rate-limit";
}

function hashKey(value: string) {
  return createHmac("sha256", rateLimitSecret()).update(value).digest("hex");
}

export async function requestIp() {
  const store = await headers();
  const realIp = store.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const forwarded = store.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return "unknown";
}

export async function consumeRateLimit({
  scope,
  identifier,
  limit,
  windowSeconds,
}: {
  scope: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
}) {
  if (limit < 1 || windowSeconds < 1) throw new Error("Invalid rate limit configuration");

  const result = await query<{ hits: number; window_started_at: Date | string }>(
    `INSERT INTO action_rate_limits (scope,key_hash,window_started_at,hits,updated_at)
     VALUES ($1,$2,now(),1,now())
     ON CONFLICT (scope,key_hash) DO UPDATE SET
       hits=CASE
         WHEN action_rate_limits.window_started_at <= now() - ($3::text || ' seconds')::interval THEN 1
         ELSE action_rate_limits.hits + 1
       END,
       window_started_at=CASE
         WHEN action_rate_limits.window_started_at <= now() - ($3::text || ' seconds')::interval THEN now()
         ELSE action_rate_limits.window_started_at
       END,
       updated_at=now()
     RETURNING hits,window_started_at`,
    [scope.slice(0, 80), hashKey(identifier), windowSeconds]
  );

  const row = result.rows[0];
  const hits = row?.hits ?? limit + 1;
  const windowStartedAt = new Date(row?.window_started_at ?? Date.now());
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((windowStartedAt.getTime() + windowSeconds * 1000 - Date.now()) / 1000)
  );

  return { allowed: hits <= limit, hits, retryAfterSeconds };
}
