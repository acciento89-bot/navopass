import Foundation

@main struct CoordinatorTests {
    @MainActor static func main() async throws {
        var checks = 0
        func check(_ value: Bool, _ message: String) { checks += 1; if !value { fatalError("FAIL \(message)") } }
        func rejects(_ message: String, _ action: () throws -> Void) { do { try action(); fatalError("FAIL expected rejection \(message)") } catch { checks += 1 } }
        let owner = "00000000-0000-4000-8000-000000000001", other = "00000000-0000-4000-8000-000000000002", pass = "00000000-0000-4000-8000-000000000003"
        let root = FileManager.default.temporaryDirectory.appendingPathComponent("navopass-coordinator-" + UUID().uuidString)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: root) }
        enum TestFailure: Error { case full, purge }
        var failWrite = false, failPurge = false
        var commands: [FrozenServiceDraft] = []
        var pending: CheckedContinuation<ServiceDraftReceipt, Error>?
        let coordinator = ServiceDraftCoordinator(baseURL: root, transport: { command in
            commands.append(command)
            return try await withCheckedThrowingContinuation { pending = $0 }
        }, writer: { bytes, url in
            if failWrite { throw TestFailure.full }
            try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
            try bytes.write(to: url, options: .atomic)
        }, purger: { url in
            if failPurge { throw TestFailure.purge }
            if FileManager.default.fileExists(atPath: url.path) { try FileManager.default.removeItem(at: url) }
        })
        check(coordinator.drafts.isEmpty && coordinator.currentOwner == nil, "unauthenticated cold start exposes no journal")
        try coordinator.authenticate(ownerId: owner)
        rejects("cannot create without previously opened authorized pass") { _ = try coordinator.create(passId: pass, eventDate: "2026-10-25", title: "QA", description: "Original", provider: "", eventType: .note) }
        rejects("viewer capability is not editable") { try coordinator.capturePass(ownerId: owner, expectedGeneration: coordinator.generation, passId: pass, label: "QA", canEdit: false) }
        try coordinator.capturePass(ownerId: owner, expectedGeneration: coordinator.generation, passId: pass, label: "QA appliance", canEdit: true)
        let value = try coordinator.create(passId: pass, eventDate: "2026-10-25", title: "QA", description: "Original", provider: "", eventType: .note)
        let publish = Task { await coordinator.publish(draftId: value.draftId) }
        for _ in 0..<1000 { if pending != nil { break }; await Task.yield() }
        check(pending != nil && commands.count == 1, "explicit send invokes transport once")
        let frozen = commands[0]
        let cold = ServiceDraftCoordinator(baseURL: root, transport: { _ in throw ServiceDraftPublishError.unknown })
        try cold.authenticate(ownerId: owner)
        check(try cold.drafts[0].retrySubmission() == frozen, "frozen payload is durable BEFORE request awaits")
        failWrite = true
        pending?.resume(returning: ServiceDraftReceipt(eventId: pass, revision: frozen.revision, digest: frozen.digest)); pending = nil
        await publish.value
        check(coordinator.drafts[0].state != .delivered && coordinator.actionFailed, "receipt disk failure cannot show delivered")
        check(try coordinator.drafts[0].retrySubmission() == frozen, "receipt failure retains exact submission")
        failWrite = false
        let retry = Task { await coordinator.publish(draftId: value.draftId) }
        for _ in 0..<1000 { if pending != nil { break }; await Task.yield() }
        check(commands.count == 2 && commands[1] == frozen, "manual retry uses byte-identical frozen revision")
        pending?.resume(returning: ServiceDraftReceipt(eventId: pass, revision: frozen.revision, digest: frozen.digest)); pending = nil
        await retry.value
        check(coordinator.drafts[0].state == .delivered, "only durably saved matching receipt exposes delivery")
        let second = try coordinator.create(passId: pass, eventDate: "2026-10-26", title: "Late A", description: "No B leak", provider: "", eventType: .service)
        let late = Task { await coordinator.publish(draftId: second.draftId) }
        for _ in 0..<1000 { if pending != nil { break }; await Task.yield() }
        let oldGeneration = coordinator.generation
        try coordinator.deactivate()
        check(coordinator.drafts.isEmpty && coordinator.currentOwner == nil, "logout hides and purges before account opens")
        try coordinator.authenticate(ownerId: other)
        pending?.resume(returning: ServiceDraftReceipt(eventId: pass, revision: commands.last!.revision, digest: commands.last!.digest)); pending = nil
        await late.value
        check(coordinator.currentOwner == other && coordinator.drafts.isEmpty, "late A callback cannot alter B journal or display")
        rejects("old pass-detail callback cannot populate another owner") { try coordinator.capturePass(ownerId: owner, expectedGeneration: oldGeneration, passId: pass, label: "Stale", canEdit: true) }
        try coordinator.deactivate(); try coordinator.authenticate(ownerId: owner)
        check(coordinator.drafts.isEmpty, "A journal was actually purged")
        try coordinator.capturePass(ownerId: owner, expectedGeneration: coordinator.generation, passId: pass, label: "QA", canEdit: true)
        _ = try coordinator.create(passId: pass, eventDate: "2026-10-25", title: "Retained", description: "Own", provider: "", eventType: .note)
        coordinator.accountDeletionCompleted(ownerId: owner, expectedGeneration: coordinator.generation, success: false)
        check(coordinator.drafts.count == 1, "failed server deletion never purges journal")
        failPurge = true
        rejects("purge error is explicit") { try coordinator.deactivate() }
        check(coordinator.drafts.isEmpty && coordinator.locked, "purge failure hides content and locks access")
        let coldBarrier = ServiceDraftCoordinator(baseURL: root, transport: { _ in throw ServiceDraftPublishError.unknown }, purger: { _ in throw TestFailure.purge })
        rejects("durable purge marker survives process restart") { try coldBarrier.authenticate(ownerId: other) }
        check(coldBarrier.drafts.isEmpty && coldBarrier.locked, "other owner stays hidden when cleanup cannot finish")
        failPurge = false; try coordinator.authenticate(ownerId: other)
        check(coordinator.drafts.isEmpty && !coordinator.locked, "explicit retry can recover after successful cleanup")
        print("PASS NavoPass coordinator owner/receipt/purge assertions: \(checks)")
    }
}
