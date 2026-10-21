/** ROOT ONLY: real PostgreSQL integration in an explicitly local disposable test database. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { SERVICE_DRAFT_SCHEMA_STATEMENTS } from "../lib/service-draft-schema.ts";
import { publishServiceDraft } from "../lib/service-draft-command.ts";

const connectionString = process.env.NAVOPASS_TEST_PG_URL;
assert.ok(connectionString, "Root must supply dedicated local NAVOPASS_TEST_PG_URL; no default production environment is read");
const endpoint = new URL(connectionString);
assert.ok(["postgres:", "postgresql:"].includes(endpoint.protocol));
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname), "Only local PostgreSQL is permitted");
assert.match(decodeURIComponent(endpoint.pathname).slice(1), /^navopass_draft_test_[a-zA-Z0-9_]+$/, "Dedicated disposable test database prefix required");
const driver = await import(process.env.NAVOPASS_TEST_PG_DRIVER || "pg");
const Pool = driver.Pool || driver.default?.Pool;
assert.ok(Pool, "Root supplies existing pg dependency; this harness installs nothing");
(driver.types || driver.default.types).setTypeParser(1082, value => value);
const pool = new Pool({ connectionString, max: 10 });
const schema = "navopass_draft_" + randomUUID().replaceAll("-", "");
assert.match(schema, /^navopass_draft_[a-f0-9]{32}$/);
const actor = randomUUID(), pass = randomUUID(), workspace = randomUUID(), draft = randomUUID();
const command = (extra = {}) => ({ ownerId: actor, passId: pass, draftId: draft, revision: 1, eventDate: "2026-10-25", title: "QA synthetic service", description: "Original notes ä", provider: "QA fixture", eventType: "SERVICE", ...extra });
async function transaction(run) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SET LOCAL search_path TO "${schema}",pg_catalog`);
    await client.query("SET LOCAL statement_timeout='5s'");
    const result = await run(client); await client.query("COMMIT"); return result;
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}
let created = false, assertions = 0, releaseHeldPublish, heldPublish;
function bounded(promise) {
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error("Fixture synchronization exceeded3s")),3000);
    promise.then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});
  });
}
try {
  await pool.query(`CREATE SCHEMA "${schema}"`); created = true;
  await transaction(async client => {
    // Only the old columns used by the additive endpoint, in matching PostgreSQL types.
    await client.query("CREATE TABLE users(id uuid PRIMARY KEY,name text NOT NULL)");
    await client.query("CREATE TABLE workspaces(id uuid PRIMARY KEY)");
    await client.query("CREATE TABLE workspace_members(workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,user_id uuid REFERENCES users(id) ON DELETE CASCADE,role text NOT NULL,PRIMARY KEY(workspace_id,user_id))");
    await client.query("CREATE TABLE assets(id uuid PRIMARY KEY,owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,workspace_id uuid REFERENCES workspaces(id),archived_at timestamptz,updated_at timestamptz NOT NULL DEFAULT now())");
    await client.query("CREATE TABLE asset_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,title text NOT NULL,event_type text NOT NULL,event_date date NOT NULL,description text,provider text,is_public boolean NOT NULL,created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,created_by_name text)");
    for (const sql of SERVICE_DRAFT_SCHEMA_STATEMENTS) await client.query(sql);
    // Idempotent bootstrap replay, without altering any old table/row.
    for (const sql of SERVICE_DRAFT_SCHEMA_STATEMENTS) await client.query(sql);
    await client.query("INSERT INTO users(id,name)VALUES($1,'QA actor')",[actor]);
    await client.query("INSERT INTO workspaces(id)VALUES($1)",[workspace]);
    await client.query("INSERT INTO workspace_members(workspace_id,user_id,role)VALUES($1,$2,'EDITOR')",[workspace,actor]);
    await client.query("INSERT INTO assets(id,owner_id,workspace_id)VALUES($1,$2,$3)",[pass,actor,workspace]);
  });
  const first = await publishServiceDraft(actor,command(),transaction);
  const retries = await Promise.all(Array.from({length:8},()=>publishServiceDraft(actor,command(),transaction)));
  assert.ok(retries.every(x=>x.eventId===first.eventId && x.digest===first.digest)); assertions++;
  await assert.rejects(publishServiceDraft(actor,command({description:"Changed frozen body"}),transaction),e=>e.status===409); assertions++;
  await transaction(async client=>{
    const events=await client.query("SELECT * FROM asset_events"); assert.equal(events.rowCount,1); assert.equal(events.rows[0].is_public,false);
    assert.equal(events.rows[0].event_date,"2026-10-25"); assertions++;
  });
  // Fresh role revocation must deny even an already delivered receipt replay.
  await transaction(client=>client.query("UPDATE workspace_members SET role='VIEWER' WHERE workspace_id=$1 AND user_id=$2",[workspace,actor]));
  await assert.rejects(publishServiceDraft(actor,command(),transaction),e=>e.status===403); assertions++;
  await transaction(client=>client.query("UPDATE workspace_members SET role='EDITOR' WHERE workspace_id=$1 AND user_id=$2",[workspace,actor]));
  // A current membership FOR SHARE lock must prevent a concurrent role mutation until commit.
  let signal, release;
  const ready=new Promise(resolve=>{signal=resolve;}); const hold=new Promise(resolve=>{release=resolve;});
  heldPublish=publishServiceDraft(actor,command({draftId:randomUUID(),title:"QA locked role"}),run=>transaction(client=>run({query:async(sql,values)=>{
    const result=await client.query(sql,values);
    if(sql.includes("FROM workspace_members")){signal();await hold;}
    return result;
  }})));
  releaseHeldPublish=release;
  await bounded(Promise.race([ready,heldPublish.then(()=>{throw new Error("Role lock hook was not reached");})]));
  const revoker=await pool.connect();
  try {
    await revoker.query("BEGIN");await revoker.query(`SET LOCAL search_path TO "${schema}",pg_catalog`);await revoker.query("SET LOCAL lock_timeout='200ms'");
    await assert.rejects(revoker.query("UPDATE workspace_members SET role='VIEWER' WHERE workspace_id=$1 AND user_id=$2",[workspace,actor]),e=>e.code==="55P03");assertions++;
  } finally {await revoker.query("ROLLBACK");revoker.release();release();}
  await heldPublish;
  // Receipt failure after event INSERT must roll back BOTH rows, not leave phantom history.
  const failingDraft=randomUUID();
  await transaction(async client=>{
    await client.query(`CREATE FUNCTION reject_fixture_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic receipt failure'; END $$`);
    await client.query(`CREATE TRIGGER reject_fixture_receipt BEFORE INSERT ON mobile_service_draft_receipts FOR EACH ROW WHEN (NEW.draft_id='${failingDraft}'::uuid) EXECUTE FUNCTION reject_fixture_receipt()`);
  });
  await assert.rejects(publishServiceDraft(actor,command({draftId:failingDraft,title:"QA rollback"}),transaction));
  await transaction(async client=>{
    assert.equal((await client.query("SELECT count(*)::int AS n FROM asset_events WHERE title='QA rollback'")).rows[0].n,0);
    assert.equal((await client.query("SELECT count(*)::int AS n FROM mobile_service_draft_receipts WHERE draft_id=$1",[failingDraft])).rows[0].n,0);assertions++;
    await client.query("DROP TRIGGER reject_fixture_receipt ON mobile_service_draft_receipts");await client.query("DROP FUNCTION reject_fixture_receipt()");
  });
  await publishServiceDraft(actor,command({draftId:failingDraft,title:"QA rollback"}),transaction);
  await transaction(client=>client.query("UPDATE assets SET archived_at=now() WHERE id=$1",[pass]));
  await assert.rejects(publishServiceDraft(actor,command(),transaction),e=>e.status===403);assertions++;
  await transaction(client=>client.query("UPDATE assets SET archived_at=NULL WHERE id=$1",[pass]));
  await transaction(client=>client.query("DELETE FROM asset_events WHERE id=$1",[first.eventId]));
  await assert.rejects(publishServiceDraft(actor,command(),transaction),e=>e.status===410);assertions++;
  await transaction(client=>client.query("DELETE FROM assets WHERE id=$1",[pass]));
  await assert.rejects(publishServiceDraft(actor,command(),transaction),e=>e.status===403);assertions++;
  const otherActor=randomUUID(),otherPass=randomUUID();
  await transaction(async client=>{
    await client.query("INSERT INTO users(id,name)VALUES($1,'QA other')",[otherActor]);
    await client.query("INSERT INTO assets(id,owner_id,workspace_id)VALUES($1,$2,$3)",[otherPass,otherActor,workspace]);
  });
  const retained=await publishServiceDraft(actor,command({draftId:randomUUID(),passId:otherPass}),transaction);
  await transaction(client=>client.query("DELETE FROM users WHERE id=$1",[actor]));
  await transaction(async client=>{
    assert.equal((await client.query("SELECT count(*)::int AS n FROM mobile_service_draft_receipts WHERE actor_id=$1",[actor])).rows[0].n,0);
    assert.equal((await client.query("SELECT count(*)::int AS n FROM asset_events WHERE id=$1",[retained.eventId])).rows[0].n,1);assertions++;
  });
  console.log(JSON.stringify({result:"PASS",assertions,scope:"Real local PostgreSQL receipt/access/parallel/role-lock/rollback/deletion tests; isolated schema only; not full app deployment or HTTP/native acceptance"}));
} finally {
  releaseHeldPublish?.();
  if(heldPublish)await heldPublish.catch(()=>{});
  if(created)await pool.query(`DROP SCHEMA "${schema}" CASCADE`);
  await pool.end();
}
