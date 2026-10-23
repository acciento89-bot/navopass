import Foundation

@main struct SessionAdapterTests {
    @MainActor static func main() throws {
        var count = 0
        func check(_ value: Bool, _ reason: String) { count += 1; if !value { fatalError("FAIL \(reason)") } }
        let a = "00000000-0000-4000-8000-000000000001", b = "00000000-0000-4000-8000-000000000002", pass = "00000000-0000-4000-8000-000000000003"
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent("navopass-session-" + UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: folder) }
        let drafts = ServiceDraftCoordinator(baseURL: folder, transport: { _ in throw ServiceDraftPublishError.unknown })
        let adapter = ServiceDraftSessionAdapter(coordinator: drafts)
        check(adapter.beginAuthorizedOperation(userId: a) == nil, "cached user identity alone does not open a journal")
        try adapter.verifiedSession(userId: a)
        let token = adapter.beginAuthorizedOperation(userId: a)!
        try adapter.loadedPass(token: token, passId: pass, label: "QA appliance", canEdit: true)
        _ = try drafts.create(passId: pass, eventDate: "2026-10-25", title: "QA", description: "Original", provider: "", eventType: .note)
        adapter.sessionUnavailable()
        check(drafts.currentOwner == nil && drafts.drafts.isEmpty && drafts.locked, "auth expiry hides while preserving private archive")
        try adapter.verifiedSession(userId: a)
        check(drafts.drafts.count == 1, "only successful owner reauthentication restores pending journal")
        let deleting = adapter.beginAuthorizedOperation(userId: a)!
        adapter.accountDeletionFinished(token: deleting, success: false)
        check(drafts.drafts.count == 1, "failed account deletion never purges")
        adapter.willLogout()
        check(drafts.currentOwner == nil && drafts.drafts.isEmpty, "explicit logout synchronously hides before asynchronous old API runs")
        try adapter.verifiedSession(userId: b)
        do { try adapter.loadedPass(token: token, passId: pass, label: "Late A", canEdit: true); fatalError("FAIL stale detail should reject") } catch { count += 1 }
        let bToken = adapter.beginAuthorizedOperation(userId: b)!
        try adapter.loadedPass(token: bToken, passId: pass, label: "QA B", canEdit: true)
        _ = try drafts.create(passId: pass, eventDate: "2026-10-25", title: "B own", description: "Only B", provider: "", eventType: .note)
        adapter.accountDeletionFinished(token: deleting, success: true)
        check(drafts.currentOwner == b && drafts.drafts.count == 1, "late successful A deletion callback cannot purge B")
        adapter.accountDeletionFinished(token: bToken, success: true)
        check(drafts.currentOwner == nil && drafts.drafts.isEmpty, "confirmed successful matching account deletion purges own journal")
        try adapter.verifiedSession(userId: b)
        check(drafts.drafts.isEmpty, "confirmed deletion actually removed B bytes")
        print("PASS NavoPass session adapter assertions: \(count)")
    }
}
