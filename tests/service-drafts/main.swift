import Foundation

var checks = 0
func check(_ condition: Bool, _ message: String) {
    checks += 1
    if !condition { fatalError("FAIL \(message)") }
}
func rejects(_ message: String, _ action: () throws -> Void) {
    do { try action(); fatalError("FAIL expected rejection: \(message)") } catch { checks += 1 }
}
let owner = "00000000-0000-4000-8000-000000000001"
let other = "00000000-0000-4000-8000-000000000002"
let pass = "00000000-0000-4000-8000-000000000003"
func draft(title: String = "QA Service", description: String = "Original notes", provider: String = "QA", day: String = "2026-10-25") throws -> ServiceDraft {
    try ServiceDraft.create(ownerId: owner, passId: pass, passLabel: "QA appliance", eventDate: day, title: title, description: description, provider: provider, eventType: .service, capturedAt: Date(timeIntervalSince1970: 1_792_540_800))
}
let valid = try draft(title: String(repeating: "ä", count: 180), description: String(repeating: "é", count: 4000), provider: String(repeating: "ö", count: 200))
check(valid.revision == 1 && valid.state == .local, "new draft stays local with explicit revision")
rejects("title181") { _ = try draft(title: String(repeating: "a", count: 181)) }
rejects("description4001") { _ = try draft(description: String(repeating: "a", count: 4001)) }
rejects("provider201") { _ = try draft(provider: String(repeating: "a", count: 201)) }
rejects("blank title") { _ = try draft(title: " \n ") }
for bad in ["2026-02-29", "2026-04-31", "2026-13-01", "2026-1-02", "2026-10-25T00:00:00Z"] {
    rejects("invalid civil day \(bad)") { _ = try draft(day: bad) }
}
check(try draft(day: "2024-02-29").eventDate == "2024-02-29", "valid leap day retained civil, without timezone conversion")
var editable = try draft()
let frozen = try editable.freeze()
check(editable.state == .publishing && frozen.revision == 1 && frozen.ownerId == owner && frozen.passId == pass, "freeze captures exact identity and revision")
check(try editable.retrySubmission() == frozen, "same frozen payload retained for exact retry")
rejects("cannot edit pending submission") { _ = try editable.edited(title: "Changed", description: "Changed", provider: "", eventDate: "2026-10-25", eventType: .note) }
try editable.markUnknown()
check(try editable.retrySubmission() == frozen && editable.state == .unknown, "timeout does not create a new submission")
rejects("wrong accepted revision") { try editable.accept(eventId: pass, revision: 2, digest: frozen.digest) }
rejects("wrong accepted digest") { try editable.accept(eventId: pass, revision: 1, digest: String(repeating: "0", count: 64)) }
try editable.accept(eventId: pass, revision: 1, digest: frozen.digest)
check(editable.state == .delivered && editable.receipt?.eventId == pass, "delivered only after exact receipt")
let edited = try editable.edited(title: "New revision", description: "New notes", provider: "", eventDate: "2026-10-26", eventType: .note)
check(edited.revision == 2 && edited.ownerId == owner && edited.passId == pass && edited.draftId == editable.draftId && edited.receipt == nil, "new edit has fresh revision, immutable association and no inherited receipt")

let directory = FileManager.default.temporaryDirectory.appendingPathComponent("navopass-draft-tests-" + UUID().uuidString)
try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
defer { try? FileManager.default.removeItem(at: directory) }
let file = directory.appendingPathComponent("drafts.json")
let archive = ServiceDraftArchive(url: file, ownerId: owner)
check(try archive.load().revision == 0, "empty archive starts at revision0")
let saved = try archive.save(expectedRevision: 0, drafts: [editable, valid])
check(saved.revision == 1, "save advances envelope revision")
let cold = ServiceDraftArchive(url: file, ownerId: owner)
check(try cold.load().drafts == [editable, valid], "cold read retains frozen/receipt and civil-date data")
rejects("duplicate draft identity") { _ = try archive.save(expectedRevision: 1, drafts: [valid, valid]) }
rejects("stale envelope revision") { _ = try archive.save(expectedRevision: 0, drafts: [valid]) }
rejects("cross-owner journal") { _ = try ServiceDraftArchive(url: file, ownerId: other).load() }
let bytes = try Data(contentsOf: file)
enum Simulated: Error { case full }
let failing = ServiceDraftArchive(url: file, ownerId: owner, writer: { _, _ in throw Simulated.full })
_ = try failing.load()
rejects("failed write remains recoverable") { _ = try failing.save(expectedRevision: 1, drafts: [valid]) }
check(try Data(contentsOf: file) == bytes, "failed write preserves previous bytes")
for malformed in [Data("not-json".utf8), Data("{\"schemaVersion\":999}".utf8)] {
    try malformed.write(to: file)
    rejects("external bad/future archive prevents replacing after successful load") { _ = try archive.save(expectedRevision: 1, drafts: [valid]) }
    check(try Data(contentsOf: file) == malformed, "bad/future bytes preserved")
}
try bytes.write(to: file)
let hundred = try (0..<100).map { _ in try draft() }
let bounded = ServiceDraftArchive(url: directory.appendingPathComponent("bounded.json"), ownerId: owner)
_ = try bounded.load()
check(try bounded.save(expectedRevision: 0, drafts: hundred).drafts.count == 100, "100 drafts allowed")
rejects("101 drafts blocked") { _ = try bounded.save(expectedRevision: 1, drafts: hundred + [draft()]) }
print("PASS NavoPass service draft domain/archive assertions: \(checks)")
