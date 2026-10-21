import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeServiceDraft,serviceDraftDigest} from '../lib/service-draft-command.ts';
const actor='00000000-0000-4000-8000-000000000001';
const command={ownerId:actor,passId:'00000000-0000-4000-8000-000000000002',draftId:'00000000-0000-4000-8000-000000000003',revision:1,eventDate:'2026-10-25',title:'QA Service',description:'Original\nnotes ä </script>',provider:'QA',eventType:'SERVICE'};
test('PostgreSQL text NUL rejected before any transaction',()=>{
 for(const field of ['title','description','provider'])assert.throws(()=>normalizeServiceDraft(actor,{...command,[field]:'QA\0text'}),error=>error.status===422);
});
test('shared native UTF8 digest fixture',()=>{
 assert.equal(serviceDraftDigest(command),'afaa60edb2000869bb5506dc5135c61b46e9693e037e7be01590fd178c54e84f');
 assert.equal(normalizeServiceDraft(actor,command).description,command.description);
});

test('accepted frozen Unicode title retains exact digest',()=>{
 const frozen={...command,title:'\uFEFFService\uFEFF'};
 const accepted=normalizeServiceDraft(actor,frozen);
 assert.equal(accepted.title,frozen.title);
 assert.equal(serviceDraftDigest(accepted),serviceDraftDigest(frozen));
});
