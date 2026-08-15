import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { query } from "@/lib/db";
import type { Plan } from "@/lib/plans";

const scrypt = promisify(scryptCallback);
const COOKIE_NAME = "navopass_session";
const SESSION_DAYS = 30;

export type CurrentUser = { id: string; email: string; name: string; reminder_days?: number; plan?: Plan };
type UserRow = CurrentUser & { password_hash: string };

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, salt, expectedHex] = encoded.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function safeNext(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/app";
  return value;
}

export { safeNext };

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await query("INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1,$2,$3)", [userId, tokenHash(token), expires]);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) await query("DELETE FROM sessions WHERE token_hash=$1", [tokenHash(token)]);
  store.delete(COOKIE_NAME);
}

export async function destroyOtherSessions(userId: string) {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) {
    await query("DELETE FROM sessions WHERE user_id=$1", [userId]);
    return;
  }
  await query("DELETE FROM sessions WHERE user_id=$1 AND token_hash<>$2", [userId, tokenHash(token)]);
}

export async function countActiveSessions(userId: string) {
  const result = await query<{ count: number }>(
    "SELECT count(*)::int AS count FROM sessions WHERE user_id=$1 AND expires_at>now()",
    [userId]
  );
  return result.rows[0]?.count ?? 0;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const result = await query<CurrentUser>(
    `SELECT u.id,u.email,u.name,u.reminder_days,u.plan
     FROM sessions s JOIN users u ON u.id=s.user_id
     WHERE s.token_hash=$1 AND s.expires_at>now() LIMIT 1`,
    [tokenHash(token)]
  );
  return result.rows[0] ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function findUserByEmail(email: string) {
  const result = await query<UserRow>(
    "SELECT id,email,name,password_hash,reminder_days,plan FROM users WHERE email=$1 LIMIT 1",
    [normalizeEmail(email)]
  );
  return result.rows[0] ?? null;
}
