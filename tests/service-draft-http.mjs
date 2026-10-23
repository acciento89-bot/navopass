// Actual HTTP/auth/transaction acceptance against an isolated local Next server.
import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
const base = new URL(process.env.APP_URL || 'http://127.0.0.1:3000');
const database = new URL(process.env.DATABASE_URL || 'postgres://invalid');
const loopback = value => ['127.0.0.1', 'localhost', '[::1]'].includes(value);
assert.ok(loopback(base.hostname) && loopback(database.hostname), 'HTTP fixture must never use production');
const db = new pg.Client({ connectionString: database.href });
await db.connect();
const actor = randomUUID(), workspace = randomUUID(), passId = randomUUID();
const token = randomBytes(32).toString('base64url');
const command = { ownerId: actor, passId, draftId: randomUUID(), revision: 1, eventDate: '2026-10-23', title: '  Wartung 🛠️ / Heizkreis  ', description: 'SYNTHETIC fixture\nKeine Kundenanlage.', provider: 'QA', eventType: 'SERVICE' };
const canonical = Object.fromEntries(Object.entries(command).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
const expectedDigest = createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
let checks = 0;
async function request(body, status, options = {}) {
  const response = await fetch(new URL('/api/mobile/service-drafts', base), { method: 'POST', redirect: 'manual', headers: { cookie: `navopass_session=${token}`, 'content-type': 'application/json', ...options.headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  assert.equal(response.status, status, `service-draft HTTP expected ${status}`);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  checks++;
  return response.json();
}
try {
  await db.query('INSERT INTO users (id,email,name,password_hash,email_verified_at) VALUES ($1,$2,$3,$4,now())', [actor, `draft-http-${actor}@example.invalid`, 'SYNTHETIC HTTP Fixture', 'fixture-only']);
  await db.query("INSERT INTO workspaces (id,name,kind,owner_id) VALUES ($1,'SYNTHETIC HTTP','PERSONAL',$2)", [workspace, actor]);
  await db.query("INSERT INTO workspace_members (workspace_id,user_id,role) VALUES ($1,$2,'OWNER')", [workspace, actor]);
  await db.query("INSERT INTO sessions (user_id,token_hash,expires_at) VALUES ($1,$2,now()+interval '1 hour')", [actor, createHash('sha256').update(token).digest('hex')]);
  await db.query("INSERT INTO assets (id,owner_id,workspace_id,public_id,name,visibility) VALUES ($1,$2,$3,$4,'SYNTHETIC Heater','PRIVATE')", [passId, actor, workspace, `http-${passId}`]);
  await request(command, 401, { headers: { cookie: '' } });
  await request(command, 415, { headers: { 'content-type': 'text/plain' } });
  await request('{', 422);
  await request(' '.repeat(32769), 413);
  await request({ ...command, ownerId: randomUUID() }, 422);
  const accepted = await request(command, 200);
  assert.match(accepted.eventId, /^[0-9a-f-]{36}$/i);
  assert.equal(accepted.revision, 1);
  assert.equal(accepted.digest, expectedDigest);
  assert.deepEqual(await request(command, 200), accepted, 'same frozen revision must return same receipt');
  await request({ ...command, description: 'conflicting retry' }, 409);
  let rows = await db.query('SELECT id,title,description,is_public FROM asset_events WHERE asset_id=$1', [passId]);
  assert.equal(rows.rowCount, 1);
  assert.equal(rows.rows[0].id, accepted.eventId);
  assert.equal(rows.rows[0].title, command.title);
  assert.equal(rows.rows[0].description, command.description);
  assert.equal(rows.rows[0].is_public, false);
  const concurrent = { ...command, draftId: randomUUID(), title: 'SYNTHETIC concurrent request' };
  const pair = await Promise.all([request(concurrent, 200), request(concurrent, 200)]);
  assert.deepEqual(pair[0], pair[1]);
  rows = await db.query('SELECT id FROM asset_events WHERE asset_id=$1', [passId]);
  assert.equal(rows.rowCount, 2, 'parallel retry must create only one additional event');
  await db.query("UPDATE workspace_members SET role='VIEWER' WHERE workspace_id=$1 AND user_id=$2", [workspace, actor]);
  await request(command, 403);
  await db.query("UPDATE workspace_members SET role='OWNER' WHERE workspace_id=$1 AND user_id=$2", [workspace, actor]);
  await db.query('UPDATE assets SET archived_at=now() WHERE id=$1', [passId]);
  await request(command, 403);
  await db.query('UPDATE assets SET archived_at=NULL WHERE id=$1', [passId]);
  await db.query('DELETE FROM asset_events WHERE id=$1', [accepted.eventId]);
  await request(command, 410);
  rows = await db.query('SELECT count(*)::int AS count FROM asset_events WHERE asset_id=$1', [passId]);
  assert.equal(rows.rows[0].count, 1, 'removed event must not be recreated by a receipt retry');
  console.log(`NavoPass isolated service-draft HTTP acceptance passed: ${checks} actual responses plus transactional row/receipt checks`);
} finally {
  await db.query('DELETE FROM users WHERE id=$1', [actor]);
  await db.end();
}
