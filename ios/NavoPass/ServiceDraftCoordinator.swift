import Foundation
import Combine

enum ServiceDraftPublishError: Error { case unauthenticated, forbidden, conflict, unknown }

@MainActor final class ServiceDraftCoordinator: ObservableObject {
    @Published private(set) var drafts: [ServiceDraft] = []
    @Published private(set) var contexts: [ServiceDraftPassContext] = []
    @Published private(set) var currentOwner: String?
    @Published private(set) var locked = true
    @Published private(set) var actionFailed = false
    @Published private(set) var sending: Set<String> = []
    private(set) var generation = 0
    private let baseURL: URL
    private let transport: (FrozenServiceDraft) async throws -> ServiceDraftReceipt
    private let writer: (Data, URL) throws -> Void
    private let purger: (URL) throws -> Void
    private var archive: ServiceDraftArchive?
    private var snapshot: ServiceDraftSnapshot?
    private var pendingOwner: String?
    private struct Barrier: Codable, Equatable { let schemaVersion: Int; let ownerId: String; let purgePending: Bool }

    init(baseURL: URL, transport: @escaping (FrozenServiceDraft) async throws -> ServiceDraftReceipt,
         writer: ((Data, URL) throws -> Void)? = nil, purger: ((URL) throws -> Void)? = nil) {
        self.baseURL = baseURL.appendingPathComponent("service-drafts", isDirectory: true)
        self.transport = transport; self.writer = writer ?? ServiceDraftArchive.atomicWrite
        self.purger = purger ?? { url in if FileManager.default.fileExists(atPath: url.path) { try FileManager.default.removeItem(at: url) } }
    }

    /// Call only after existing API session authentication succeeded. No cached-user cold bypass.
    func authenticate(ownerId: String) throws {
        generation += 1; hide(); actionFailed = false
        do {
            guard let uuid = UUID(uuidString: ownerId) else { throw ServiceDraftError.invalid }
            let owner = uuid.uuidString.lowercased()
            if let pendingOwner {
                try purgeOwner(pendingOwner); self.pendingOwner = nil
            }
            if let barrier = try readBarrier(), barrier.purgePending || barrier.ownerId != owner { try purgeOwner(barrier.ownerId) }
            // Durable active-owner association prevents B opening while A cleanup is unfinished.
            try writeBarrier(Barrier(schemaVersion: 1, ownerId: owner, purgePending: false))
            let archive = ServiceDraftArchive(url: ownerURL(owner), ownerId: owner, writer: writer)
            let value = try archive.load()
            self.archive = archive; snapshot = value; currentOwner = owner
            drafts = value.drafts; contexts = value.contexts ?? []; locked = false
        } catch { hide(); actionFailed = true; throw error }
    }
    /// Passive authentication expiry hides content while retaining owner journal for reauthentication.
    func suspendAuthentication() { generation += 1; hide() }

    /// Explicit logout/account switch hides immediately, invalidates callbacks, then durably purges.
    func deactivate() throws {
        let owner = currentOwner
        generation += 1; hide()
        do {
            let barrier = try readBarrier()
            guard let purge = owner ?? pendingOwner ?? barrier?.ownerId else { return }
            pendingOwner = purge
            try writeBarrier(Barrier(schemaVersion: 1, ownerId: purge, purgePending: true))
            try purgeOwner(purge); pendingOwner = nil; actionFailed = false
        } catch { actionFailed = true; throw error }
    }
    func accountDeletionCompleted(ownerId: String, expectedGeneration: Int, success: Bool) {
        guard success, expectedGeneration == generation, UUID(uuidString: ownerId) != nil,
              currentOwner == nil || ownerId == currentOwner else { return }
        generation += 1; hide()
        do {
            let exists = FileManager.default.fileExists(atPath: barrierURL.path)
            let metadata = try? readBarrier()
            if exists, metadata == nil || metadata?.ownerId != ownerId {
                // Own deletion must not replace a future/unknown or another owner's barrier.
                try purger(ownerURL(ownerId)); actionFailed = false; return
            }
            pendingOwner = ownerId
            try writeBarrier(Barrier(schemaVersion: 1, ownerId: ownerId, purgePending: true))
            try purgeOwner(ownerId); pendingOwner = nil; actionFailed = false
        } catch { actionFailed = true }
    }
    func capturePass(ownerId: String, expectedGeneration: Int, passId: String, label: String, canEdit: Bool) throws {
        do {
            guard !locked, ownerId == currentOwner, expectedGeneration == generation else { throw ServiceDraftError.stale }
            let value = ServiceDraftPassContext(ownerId: ownerId, passId: passId, label: label, canEditWhenCaptured: canEdit, observedAt: Date())
            try value.validate()
            var next = contexts.filter { $0.passId != passId }; next.append(value)
            try commit(drafts, contexts: next)
        } catch { actionFailed = true; throw error }
    }
    @discardableResult func create(passId: String, eventDate: String, title: String, description: String, provider: String, eventType: ServiceDraftType) throws -> ServiceDraft {
        do {
            guard !locked, let owner = currentOwner, let context = contexts.first(where: { $0.passId == passId && $0.ownerId == owner }) else { throw ServiceDraftError.invalid }
            let value = try ServiceDraft.create(ownerId: owner, passId: passId, passLabel: context.label, eventDate: eventDate, title: title, description: description, provider: provider, eventType: eventType)
            try commit(drafts + [value]); return value
        } catch { actionFailed = true; throw error }
    }
    func update(draftId: String, eventDate: String, title: String, description: String, provider: String, eventType: ServiceDraftType) throws {
        do {
            guard let index = drafts.firstIndex(where: { $0.draftId == draftId }) else { throw ServiceDraftError.invalid }
            let next = try drafts[index].edited(title: title, description: description, provider: provider, eventDate: eventDate, eventType: eventType)
            var values = drafts; values[index] = next; try commit(values)
        } catch { actionFailed = true; throw error }
    }
    func publish(draftId: String) async {
        guard !locked, let owner = currentOwner, !sending.contains(draftId), let value = drafts.first(where: { $0.draftId == draftId }) else { actionFailed = true; return }
        let epoch = generation
        do {
            var pending = value
            let command = try pending.state == .local ? pending.freeze() : pending.retrySubmission()
            try replacing(pending) // Persist exact frozen payload BEFORE network side effect.
            sending.insert(draftId)
            defer { if generation == epoch { sending.remove(draftId) } }
            let receipt = try await transport(command)
            guard generation == epoch, currentOwner == owner, !locked else { return }
            guard var current = drafts.first(where: { $0.draftId == draftId }), try current.retrySubmission() == command else { throw ServiceDraftError.stale }
            try current.accept(eventId: receipt.eventId, revision: receipt.revision, digest: receipt.digest)
            try replacing(current) // No delivered UI before this receipt write succeeds.
        } catch {
            guard generation == epoch, currentOwner == owner else { return }
            sending.remove(draftId); actionFailed = true
            if let error = error as? ServiceDraftPublishError, error == .unauthenticated { suspendAuthentication(); actionFailed = true; return }
            if var current = drafts.first(where: { $0.draftId == draftId }), current.state == .publishing || current.state == .unknown {
                if let error = error as? ServiceDraftPublishError, error == .forbidden || error == .conflict { try? current.markBlocked() }
                else { try? current.markUnknown() }
                try? replacing(current)
                actionFailed = true
            }
        }
    }
    private func commit(_ values: [ServiceDraft], contexts: [ServiceDraftPassContext]? = nil) throws {
        guard !locked, let owner = currentOwner, let archive, let snapshot else { throw ServiceDraftError.notLoaded }
        guard values.allSatisfy({ $0.ownerId == owner }) else { throw ServiceDraftError.invalid }
        let saved = try archive.save(expectedRevision: snapshot.revision, drafts: values, contexts: contexts ?? self.contexts)
        self.snapshot = saved; drafts = saved.drafts; self.contexts = saved.contexts ?? []; actionFailed = false
    }
    private func replacing(_ value: ServiceDraft) throws {
        guard let index = drafts.firstIndex(where: { $0.draftId == value.draftId }) else { throw ServiceDraftError.stale }
        var next = drafts; next[index] = value; try commit(next)
    }
    private func hide() { currentOwner = nil; drafts = []; contexts = []; sending = []; snapshot = nil; archive = nil; locked = true }
    private var barrierURL: URL { baseURL.appendingPathComponent("owner-barrier.json") }
    private func ownerURL(_ owner: String) -> URL { baseURL.appendingPathComponent(owner.lowercased() + ".json") }
    private func readBarrier() throws -> Barrier? {
        guard FileManager.default.fileExists(atPath: barrierURL.path) else { return nil }
        let size = try FileManager.default.attributesOfItem(atPath: barrierURL.path)[.size] as? NSNumber
        guard let size, size.intValue <= 1024 else { throw ServiceDraftError.unreadable }
        let value = try JSONDecoder().decode(Barrier.self, from: Data(contentsOf: barrierURL))
        guard value.schemaVersion == 1, let uuid = UUID(uuidString: value.ownerId), uuid.uuidString.lowercased() == value.ownerId else { throw ServiceDraftError.futureArchive }
        return value
    }
    private func writeBarrier(_ value: Barrier) throws {
        let encoder = JSONEncoder(); encoder.outputFormatting = [.sortedKeys]
        let bytes = try encoder.encode(value)
        guard try JSONDecoder().decode(Barrier.self, from: bytes) == value else { throw ServiceDraftError.invalid }
        try writer(bytes, barrierURL)
    }
    private func purgeOwner(_ owner: String) throws {
        guard UUID(uuidString: owner) != nil else { throw ServiceDraftError.invalid }
        try purger(ownerURL(owner))
        if FileManager.default.fileExists(atPath: barrierURL.path) { try FileManager.default.removeItem(at: barrierURL) }
    }
}
