import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import pg from "pg";

const { Client } = pg;
const base = process.env.APP_URL || "http://127.0.0.1:3000";
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for smoke tests");

async function page(path, options = {}) {
  return fetch(`${base}${path}`, { redirect: "manual", ...options });
}

async function expectOk(path) {
  const response = await page(path);
  assert.equal(response.status, 200, `${path} should return 200`);
  return response;
}

const healthResponse = await expectOk("/api/health");
const health = await healthResponse.json();
assert.equal(health.ok, true, "health check should be OK");
assert.equal(health.version, "1.0.0");
assert.equal(health.schema?.action_rate_limits, true, "rate limit schema should exist");

const csp = healthResponse.headers.get("content-security-policy") || "";
assert.match(csp, /object-src 'none'/, "CSP must disable object embedding");
assert.match(csp, /frame-ancestors 'none'/, "CSP must prevent framing");

for (const path of [
  "/",
  "/preise",
  "/impressum",
  "/datenschutz",
  "/nutzungsbedingungen",
  "/vertrag-kuendigen",
  "/vertrag-widerrufen",
  "/manifest.webmanifest",
  "/sw.js",
  "/offline",
]) {
  await expectOk(path);
}

const pricing = await (await page("/preise", { headers: { cookie: "navopass_locale=de" } })).text();
assert.match(pricing, /§ 19 UStG/, "pricing must show Kleinunternehmer notice");
const englishPricingResponse = await page("/preise", { headers: { cookie: "navopass_locale=en" } });
assert.equal(englishPricingResponse.status, 200, "English pricing should return 200");
const englishPricing = await englishPricingResponse.text();
assert.match(englishPricing, /small-business regulation/, "pricing must provide the English VAT notice");

const anonymousApp = await page("/app");
assert.ok(anonymousApp.status >= 300 && anonymousApp.status < 400, "anonymous /app should redirect");
assert.match(anonymousApp.headers.get("location") || "", /\/login/, "anonymous /app should redirect to login");

const client = new Client({ connectionString: databaseUrl });
await client.connect();

const userId = randomUUID();
const workspaceId = randomUUID();
const email = `release-smoke-${Date.now()}@example.invalid`;
const sessionToken = randomBytes(32).toString("base64url");
const sessionHash = createHash("sha256").update(sessionToken).digest("hex");

try {
  await client.query(
    "INSERT INTO users (id,email,name,password_hash,email_verified_at) VALUES ($1,$2,$3,$4,now())",
    [userId, email, "Release Smoke", "smoke-test-only"]
  );
  await client.query(
    "INSERT INTO workspaces (id,name,kind,owner_id) VALUES ($1,$2,'PERSONAL',$3)",
    [workspaceId, "Persönlich", userId]
  );
  await client.query(
    "INSERT INTO workspace_members (workspace_id,user_id,role) VALUES ($1,$2,'OWNER')",
    [workspaceId, userId]
  );
  await client.query(
    "INSERT INTO sessions (user_id,token_hash,expires_at) VALUES ($1,$2,now() + interval '1 hour')",
    [userId, sessionHash]
  );

  const cookie = `navopass_session=${sessionToken}; navopass_locale=de`;
  const authHeaders = { cookie };

  const dashboardResponse = await page("/app", { headers: authHeaders });
  assert.equal(dashboardResponse.status, 200, "authenticated dashboard should load");
  const dashboard = await dashboardResponse.text();
  assert.match(dashboard, /Meine Pässe/);
  assert.match(dashboard, />Preise</);
  assert.match(dashboard, />Rechtliches</);

  for (const path of ["/impressum", "/datenschutz", "/nutzungsbedingungen", "/preise", "/"]) {
    const response = await page(path, { headers: authHeaders });
    assert.equal(response.status, 200, `signed-in ${path} should load without invalidating the session`);
  }

  const legalResponse = await page("/impressum", { headers: authHeaders });
  const legal = await legalResponse.text();
  assert.match(legal, /Mein Konto/, "public legal shell should retain signed-in navigation");
  assert.match(legal, /href="\/app"[^>]*>Startseite</, "signed-in legal navigation should return to the app");

  const sessionRow = await client.query(
    "SELECT count(*)::int AS count FROM sessions WHERE user_id=$1 AND token_hash=$2 AND expires_at>now()",
    [userId, sessionHash]
  );
  assert.equal(sessionRow.rows[0]?.count, 1, "visiting public/legal pages must not delete the active session row");

  const dashboardAfterPublicPages = await page("/app", { headers: authHeaders });
  assert.equal(dashboardAfterPublicPages.status, 200, "session must still authenticate after visiting legal/public pages");
} finally {
  await client.query("DELETE FROM users WHERE id=$1", [userId]).catch(() => undefined);
  await client.end();
}

console.log("NavoPass production smoke tests passed");
