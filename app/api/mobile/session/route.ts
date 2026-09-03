import { createSession, destroySession, findUserByEmail, getCurrentUser, normalizeEmail, verifyPassword } from "@/lib/auth";
import { consumeRateLimit, requestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PASSWORD_LENGTH = 256;
const DUMMY_PASSWORD_HASH = "scrypt$navopass-invalid-login$7014d0ba76c320105ee163ed7930c590178f4697efc7361954100e2a7cc6d091f002ecc28deeab2f510a4fb20bc048c4cb595f1dd15d14c949f173718a9e4d78";

function noStore(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET() {
  const user = await getCurrentUser();
  return user ? noStore({ user }) : noStore({ error: "UNAUTHENTICATED" }, 401);
}

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return noStore({ error: "INVALID_CONTENT_TYPE" }, 415);
  }

  const body = await request.json().catch(() => null) as { email?: unknown; password?: unknown } | null;
  const email = normalizeEmail(typeof body?.email === "string" ? body.email : "");
  const password = typeof body?.password === "string" ? body.password : "";
  const ip = await requestIp();
  const [ipLimit, pairLimit] = await Promise.all([
    consumeRateLimit({ scope: "mobile-login:ip", identifier: ip, limit: 50, windowSeconds: 15 * 60 }),
    consumeRateLimit({ scope: "mobile-login:pair", identifier: `${ip}|${email}`, limit: 10, windowSeconds: 15 * 60 }),
  ]);
  if (!ipLimit.allowed || !pairLimit.allowed) return noStore({ error: "RATE_LIMITED" }, 429);

  const user = await findUserByEmail(email);
  const matches = await verifyPassword(password.slice(0, MAX_PASSWORD_LENGTH), user?.password_hash ?? DUMMY_PASSWORD_HASH);
  if (!user || password.length > MAX_PASSWORD_LENGTH || !matches) return noStore({ error: "INVALID_CREDENTIALS" }, 401);

  await createSession(user.id);
  const { password_hash: _passwordHash, ...safeUser } = user;
  return noStore({ user: safeUser });
}

export async function DELETE() {
  await destroySession();
  return new Response(null, { status: 204, headers: { "Cache-Control": "private, no-store" } });
}

