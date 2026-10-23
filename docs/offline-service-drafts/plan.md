Implementation authorization: root approved this audited design on21October2026 under the user’s full published-app update request. Historical audit-only language below is retained as provenance; current authorization permits this isolated implementation. Apple submission remains prohibited. Root owns native, provider, deployment and store gates.

# NavoPass offline service drafts Implementation Plan

> For agentic workers: use superpowers:executing-plans task by task after root allocates an isolated product checkout. No implementation is authorized by this audit-only handoff.

**Goal:** Preserve offline service notes and explicitly publish each frozen revision once to the existing pass history.
**Architecture:** Independent native owner-scoped journals, additive authenticated idempotent event endpoint, no old schema rewrites.
**Tech Stack:** SwiftUI/Foundation, Kotlin/Compose, Next16 TypeScript/PostgreSQL.
**Spec:** NavoPass-spec.md in this directory.

## Global constraints
Google-only delivery; Apple unpublished/protected. No billing/limits/role changes, actual customer/backend writes or real transactions. Root alone executes all test/build/device commands. No version bump before fresh release baseline. Existing cookie and pass storage formats remain intact. No attachment support in this first draft workflow.

## Review focus
1. Revocation between load and publish: fresh server authorization inside publish transaction.
2. Timeout after server commit and local receipt-write failure: exact idempotent retry, no duplicated event.
3. A→B account switch during callback: generation/owner barrier prevents A display or mutation.
4. Corrupt/future or disk-full journals: old bytes retained, editor recoverable, no success banner.
5. DST/civil-date and dirty keyboard/resize transitions: event day and draft content preserved.

### Task1: Native draft domain and archives
Create ios/NavoPass/ServiceDraft.swift, ServiceDraftArchive.swift; android/.../ServiceDraft.kt, ServiceDraftArchive.kt; tests/service-drafts/main.swift + run.sh; Android src/test/.../ServiceDraftTest.kt.
Interfaces: ServiceDraft(ownerId,passId,draftId,revision,eventDate,title,description,provider,state); freeze() -> FrozenServiceDraft; DraftArchive.load(ownerId) -> validated snapshot; save(expectedRevision,candidate) -> committed snapshot or explicit error.
- [ ] Author FIRST cases title180/181, description4000/4001, provider200/201,100/101drafts, invalid date, immutable ownership/frozen retry, dirty-save failure and byte-identical corrupt/future preservation.
- [ ] Request root RED: `sh tests/service-drafts/run.sh`; Android `gradle -p android :app:testDebugUnitTest --tests '*ServiceDraftTest'` (root uses actual pinned Gradle path).
- [ ] Only after observed platform RED implement minimal pure domain then native private atomic IO, backup exclusions and purge barrier.
- [ ] Request root GREEN including previous native/account tests. Do not integrate UI before observed GREEN.

### Task2: Additive idempotent server event endpoint
Create lib/service-draft-schema.ts, lib/service-draft-command.ts, app/api/mobile/service-drafts/route.ts and tests/service-drafts.test.mjs; extend schema bootstrap additively, never mutate old event columns. Table receipt references actor/draft/revision/digest/eventId with unique(actor,draft,revision); deletion cleanup follows existing account deletion transaction.
Interface publishServiceDraft(actor,command,transaction) -> {eventId,revision,digest}; POST endpoint is authenticated, private-only and requires current editable nonarchived pass. Existing addEvent stays unchanged.
- [ ] FIRST missing-module tests + real isolated PG transaction fixtures: same key/body repeat returns one event, same key/changed body409, parallel duplicate, wrong owner/revoked/deleted pass, malformed date, rollback receipt+event together, replay cannot disclose receipt after access removal.
- [ ] Root RED `node --experimental-strip-types --test tests/service-drafts.test.mjs`; then implement and request GREEN plus isolated PostgreSQL integration via existing HTTP fixture conventions. No production DB connection/deployment.

### Task3: Native publish coordinator/account boundary
Create ios/NavoPass/ServiceDraftCoordinator.swift and Android ServiceDraftCoordinator.kt; add typed transport in APIClient files; hook existing successful-delete/logout/session owner changes without changing existing network semantics.
Interface publish(draftId) -> persistent frozen candidate -> endpoint -> persist receipt -> visible delivered state. currentOwner/generation checked before every await result applies.
- [ ] FIRST fixture tests lost-response retry, corrupt receipt, auth expiry, stale callback after logout/new owner, purge error locks drafts, failed account deletion retains data, accepted response+local disk failure retains exact retry body.
- [ ] Root platform RED then minimal implementation and GREEN; parent reviews account cleanup hooks.

### Task4: Native queue/form/history handoff
Create ServiceDraftViews.swift and ServiceDraftUi.kt. Modify ios AssetViews.swift/RootView.swift and Android MainActivity.kt pass details with draft entry and owner-only queue; extend existing DE/EN string files/helpers. Do not split existing business dispatch/report flows.
- [ ] Add meaningful native acceptance harness for create offline→save→terminate/relaunch→same text/day→reconnect→explicit publish→duplicate retry one history entry against synthetic server; rotate/resize/large text, dirty cancel, storage blocked, account switch.
- [ ] Root build/typecheck/test commands from original workflows; actual root native Android first, iOS source parity/build separately with no Apple review.
- [ ] Independent whole-feature review, fresh provenance/max-build, then scoped local commits. Root separately owns backend deployment, integration, signing, gallery and Google delivery. Source success is not native/network/release acceptance.
