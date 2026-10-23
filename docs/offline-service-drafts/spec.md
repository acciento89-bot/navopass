Implementation authorization: root approved this audited design on21October2026 under the user’s full published-app update request. Historical audit-only language below is retained as provenance; current authorization permits this isolated implementation. Apple submission remains prohibited. Root owns native, provider, deployment and store gates.

# NavoPass offline service drafts — proposed design

Status: source audit and design only, no implementation or ownership allocation. Uses human-authorized routine design decisions. Google published-update scope; Apple 6808345429 / de.kamilunavo.navopass is REJECTED 1.0 in saved inventory and must not be submitted. No versions selected.

## Intent and novelty
An authenticated user should prepare service notes against a previously opened pass without connectivity, survive restart, see exactly what remains local, and deliberately publish once connectivity and current edit permission are available. Existing online service history, structured Business reports, dispatch, documents and calendar remain intact. Native Android/iOS currently expose authenticated API actions; no durable draft/outbox domain exists in inspected model/ViewModel/API files. README explicitly limits PWA offline caching to static resources. Existing addEvent inserts a new event for each POST and returns only ok: true (app/api/mobile/actions/route.ts:131–149); retrying it blindly can duplicate history.

## Approaches considered
1. Native local notebook plus manual copy: smallest backend scope, but no reliable delivery to existing history.
2. Recommended: native text-only offline draft outbox plus additive idempotent event endpoint. Meaningful connected workflow with bounded data and no document pipeline rewrite.
3. Entire offline pass/document/team replica: expensive authorization and conflict surface; defer.

## Scope and data contract
Add per-user, per-pass drafts with UUID draftId, integer revision, passId, pass label snapshot, capturedAt, eventDate (civil YYYY-MM-DD), title max180, description max4000, provider max200, type NOTE/SERVICE and private visibility. Owner/pass identity immutable. Maximum100 drafts/user and 2MiB envelope. One optional outcome/follow-up text stays within description; no legal/certification claims. No cached PDFs/photos/QR secrets, public-link contents or new sharing permission.

Open a pass online before first offline capture; record user/pass association and capability observation, explicitly not ongoing permission. Save text locally before leaving form; dirty-navigation confirmation and visible save errors. Distinct draft, publishing, delivered receipt and blocked/rejected states. Publish is an explicit button, never background/foreground auto-send. Freeze submitted revision; edits create a newer revision after response settles. Network timeout leaves receipt unknown; repeat uses the same draftId/revision and identical content. Never claim delivered before server receipt and durable local receipt persistence. A failed local receipt write retains frozen submission for exact retry.

Server endpoint reauthenticates, fetches current pass and current role on every request; reject archived/deleted/revoked assets. Transaction locks/checks access and atomically inserts event + unique receipt (userId,draftId,revision) with content digest. Identical repeat returns same eventId; changed body under same key returns409. Response returns eventId, accepted revision and digest. Existing addEvent and histories unchanged. Receipt authorization is always checked before replay. Local pending content never merges silently into an edited server event.

## Storage, account and UI
New schema1 archives in app-private storage separate from old cookies/models. Atomic replace, canonical decode preflight, byte/revision comparison and recoverable write failure; corrupt/future archives block writes, preserve bytes and show actionable error. iOS file protection and backup exclusion; Android private file + backup exclusion. No password/cookie in journal. After logout hide all drafts, invalidate in-flight generation and purge that owner's journal before another account opens; failure locks access and records pending purge. Account deletion purges only after confirmed successful server deletion. Unauthenticated offline cold start must not expose prior content before owner reauthentication. Authentication expiry does not overwrite/discard pending content. Background obscures sensitive UI.

Android Compose and SwiftUI have matching queue/pass draft entry, form and factual preview. DE/EN labels distinguish local vs published; preview includes timestamp and unsent state, no automatic messaging. Keyboard-safe scrolling, system insets, rotation/window resize and large text preserve draft and selection. Apple source parity allowed but no Apple review or store dispatch under this scope.

## Preservation and acceptance
Do not change Stripe plans/limits/customer portal/webhooks, role definitions, existing asset/event/file schemas or commerce. Additive server schema requires separate reviewed deployment by root; no live backend write during implementation/tests. No offline availability promise for data never loaded. Synthetic tests must cover all behaviors in the plan. Native acceptance requires actual cold-start/offline/retry/fresh-role fixture on root's one disposable device, not a source-only claim. Fresh production version/maximum uploaded build and immutable release provenance remain required before versioning.
