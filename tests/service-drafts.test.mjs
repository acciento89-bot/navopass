import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { SERVICE_DRAFT_SCHEMA_STATEMENTS } from "../lib/service-draft-schema.ts";
import { normalizeServiceDraft, serviceDraftDigest, publishServiceDraft } from "../lib/service-draft-command.ts";

const actor = "00000000-0000-4000-8000-000000000001";
const pass = "00000000-0000-4000-8000-000000000002";
const draftId = "00000000-0000-4000-8000-000000000003";
const command = () => ({ ownerId: actor, passId: pass, draftId, revision: 1, eventDate: "2026-10-25", title: "QA Service", description: "Original\nnotes ä </script>", provider: "QA", eventType: "SERVICE" });

// Pure transactional contract double, never a claim of real PostgreSQL behavior.
function fixture() {
  const state = { asset: { id: pass, owner_id: actor, workspace_id: null, archived_at: null }, actorExists: true, role: "EDITOR", events: [], receipts: [], calls: [], failReceipt: false };
  let chain = Promise.resolve();
  function transaction(run) {
    const execute = async () => {
      const before = structuredClone({ events: state.events, receipts: state.receipts });
      try {
        return await run({ query: async (sql, values = []) => {
          state.calls.push(sql);
          if (sql.includes("pg_advisory_xact_lock")) {
            assert.match(sql, /hashtextextended\(\$1,0\)/);
            assert.ok([1, 2].map(revision => actor + "|" + draftId + "|" + revision).includes(values[0]));
            return { rows: [] };
          }
          if (sql.includes("FROM assets")) return { rows: state.asset && values[0] === state.asset.id ? [structuredClone(state.asset)] : [] };
          if (sql.includes("FROM users")) return { rows: state.actorExists ? [{ id: actor }] : [] };
          if (sql.includes("FROM workspace_members")) return { rows: state.role ? [{ role: state.role }] : [] };
          if (sql.includes("FROM mobile_service_draft_receipts")) return { rows: state.receipts.filter(x => x.actor_id === values[0] && x.draft_id === values[1] && x.revision === values[2]) };
          if (sql.includes("INSERT INTO asset_events")) {
            assert.match(sql, /false/i, "drafts publish privately regardless of pass visibility");
            const event = { id: "00000000-0000-4000-8000-" + String(state.events.length + 100).padStart(12, "0"), values };
            state.events.push(event); return { rows: [{ id: event.id }] };
          }
          if (sql.includes("INSERT INTO mobile_service_draft_receipts")) {
            if (state.failReceipt) throw new Error("simulated receipt failure");
            const [actor_id, draft_id, revision, digest, event_id, asset_id] = values;
            const receipt = { actor_id, draft_id, revision, digest, event_id, asset_id }; state.receipts.push(receipt); return { rows: [receipt] };
          }
          if (sql.includes("UPDATE assets")) return { rows: [] };
          throw new Error("Unexpected SQL: " + sql);
        }});
      } catch (error) { state.events = before.events; state.receipts = before.receipts; throw error; }
    };
    const result = chain.then(execute); chain = result.catch(() => {}); return result;
  }
  return { state, transaction };
}

test("validates exact bounds/civil dates/private command and deterministic digest", () => {
  const input = command(); const normalized = normalizeServiceDraft(actor, input);
  assert.equal(normalized.eventDate, "2026-10-25");
  assert.equal(serviceDraftDigest(normalized), createHash("sha256").update(JSON.stringify(Object.fromEntries(Object.entries(normalized).sort(([a], [b]) => a.localeCompare(b))))).digest("hex"));
  for (const [key, limit] of [["title",180],["description",4000],["provider",200]]) {
    assert.doesNotThrow(() => normalizeServiceDraft(actor, { ...input, [key]: "ä".repeat(limit) }));
    assert.throws(() => normalizeServiceDraft(actor, { ...input, [key]: "a".repeat(limit + 1) }));
  }
  for (const eventDate of ["2026-02-29", "2026-04-31", "2026-10-25T00:00Z", "2026-1-01"]) assert.throws(() => normalizeServiceDraft(actor, { ...input, eventDate }));
  assert.doesNotThrow(() => normalizeServiceDraft(actor, { ...input, eventDate: "2024-02-29" }));
  for (const patch of [{ownerId:pass},{eventType:"PUBLIC"},{revision:0},{revision:1.5},{draftId:"bad"},{isPublic:true},{unknown:"x"}]) assert.throws(() => normalizeServiceDraft(actor, {...input,...patch}));
});

test("same key and exact content delivers one private event and same receipt", async () => {
  const f = fixture(); const input = command();
  const first = await publishServiceDraft(actor, input, f.transaction);
  const repeat = await publishServiceDraft(actor, {...input}, f.transaction);
  assert.deepEqual(repeat, first); assert.equal(first.revision, 1); assert.equal(first.digest, serviceDraftDigest(normalizeServiceDraft(actor,input)));
  assert.equal(f.state.events.length, 1); assert.equal(f.state.receipts.length, 1);
  assert.ok(f.state.calls.filter(x => x.includes("FROM assets")).every(x => /FOR UPDATE/.test(x)));
});

test("changed content under frozen key conflicts; next revision is separate", async () => {
  const f = fixture(); await publishServiceDraft(actor,command(),f.transaction);
  await assert.rejects(publishServiceDraft(actor,{...command(),description:"Changed"},f.transaction), e => e.status === 409);
  const second = await publishServiceDraft(actor,{...command(),revision:2,description:"New revision"},f.transaction);
  assert.equal(second.revision,2); assert.equal(f.state.events.length,2);
});

test("parallel exact retries serialize through transaction and do not duplicate", async () => {
  const f = fixture(); const results = await Promise.all(Array.from({length:8}, () => publishServiceDraft(actor,command(),f.transaction)));
  assert.ok(results.every(x => x.eventId === results[0].eventId)); assert.equal(f.state.events.length,1);
});

test("fresh access is checked before each replay and denial exposes no receipt", async () => {
  for (const mode of ["archived","deleted","wrongOwner","revoked","viewer","deletedActor"]) {
    const f = fixture(); await publishServiceDraft(actor,command(),f.transaction); f.state.calls=[];
    if(mode==="archived") f.state.asset.archived_at="now";
    if(mode==="deleted") f.state.asset=null;
    if(mode==="wrongOwner") f.state.asset.owner_id=pass;
    if(mode==="revoked" || mode==="viewer") { f.state.asset.workspace_id=pass; f.state.role=mode==="viewer"?"VIEWER":null; }
    if(mode==="deletedActor") f.state.actorExists=false;
    await assert.rejects(publishServiceDraft(actor,command(),f.transaction), e => e.status===403);
    assert.equal(f.state.calls.some(x=>x.includes("FROM mobile_service_draft_receipts")),false,mode);
    assert.equal(f.state.events.length,1);
  }
});

test("receipt insertion failure rolls back the event; retry can commit exactly once", async () => {
  const f=fixture(); f.state.failReceipt=true;
  await assert.rejects(publishServiceDraft(actor,command(),f.transaction));
  assert.equal(f.state.events.length,0); assert.equal(f.state.receipts.length,0);
  f.state.failReceipt=false; await publishServiceDraft(actor,command(),f.transaction); assert.equal(f.state.events.length,1);
});

test("schema is additive receipt-only, uniquely keyed and cascades actor cleanup", () => {
  const sql=SERVICE_DRAFT_SCHEMA_STATEMENTS.join("\n");
  assert.match(sql,/CREATE TABLE IF NOT EXISTS mobile_service_draft_receipts/);
  assert.match(sql,/PRIMARY KEY\s*\(actor_id,\s*draft_id,\s*revision\)/i);
  assert.match(sql,/REFERENCES users\(id\) ON DELETE CASCADE/);
  assert.doesNotMatch(sql,/\b(DELETE FROM|UPDATE|DROP|ALTER TABLE)\b/i);
});
