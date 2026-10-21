import Foundation

struct ServiceDraftSnapshot: Codable, Equatable {
    let schemaVersion: Int
    let ownerId: String
    let revision: Int
    let drafts: [ServiceDraft]
    var contexts: [ServiceDraftPassContext]? = nil
}

/// Separate owner-scoped journal. Bad bytes are never replaced or silently reset.
final class ServiceDraftArchive {
    private let url: URL
    private let ownerId: String
    private let writer: (Data, URL) throws -> Void
    private var readBefore = false
    private var lastBytes: Data?
    static let maxBytes = 2 * 1024 * 1024

    init(url: URL, ownerId: String, writer: ((Data, URL) throws -> Void)? = nil) {
        self.url = url; self.ownerId = ownerId
        self.writer = writer ?? Self.atomicWrite
    }
    func load() throws -> ServiceDraftSnapshot {
        let bytes = try readBytes()
        let value = try bytes.map(decode) ?? ServiceDraftSnapshot(schemaVersion: 1, ownerId: ownerId, revision: 0, drafts: [])
        guard UUID(uuidString: ownerId) != nil else { throw ServiceDraftError.invalid }
        lastBytes = bytes; readBefore = true; return value
    }
    func save(expectedRevision: Int, drafts: [ServiceDraft], contexts: [ServiceDraftPassContext]? = nil) throws -> ServiceDraftSnapshot {
        guard readBefore else { throw ServiceDraftError.notLoaded }
        let current = try readBytes()
        let previous = try current.map(decode) ?? ServiceDraftSnapshot(schemaVersion: 1, ownerId: ownerId, revision: 0, drafts: [])
        guard current == lastBytes, previous.revision == expectedRevision, expectedRevision < 1_000_000 else { throw ServiceDraftError.stale }
        let next = ServiceDraftSnapshot(schemaVersion: 1, ownerId: ownerId, revision: expectedRevision + 1, drafts: drafts, contexts: contexts ?? previous.contexts)
        try validate(next)
        let encoder = JSONEncoder(); encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        let encoded = try encoder.encode(next)
        guard encoded.count <= Self.maxBytes, try decode(encoded) == next else { throw ServiceDraftError.invalid }
        // Re-read immediately before replacement; an invalid external file remains untouched.
        let fresh = try readBytes(); if let fresh { _ = try decode(fresh) }
        guard fresh == current else { throw ServiceDraftError.stale }
        try writer(encoded, url)
        lastBytes = encoded; return next
    }
    private func readBytes() throws -> Data? {
        guard FileManager.default.fileExists(atPath: url.path) else { return nil }
        let size = try FileManager.default.attributesOfItem(atPath: url.path)[.size] as? NSNumber
        guard let size, size.intValue <= Self.maxBytes else { throw ServiceDraftError.unreadable }
        let bytes = try Data(contentsOf: url)
        guard bytes.count <= Self.maxBytes else { throw ServiceDraftError.unreadable }
        return bytes
    }
    private func decode(_ bytes: Data) throws -> ServiceDraftSnapshot {
        struct Version: Decodable { let schemaVersion: Int }
        guard try JSONDecoder().decode(Version.self, from: bytes).schemaVersion == 1 else { throw ServiceDraftError.futureArchive }
        let value = try JSONDecoder().decode(ServiceDraftSnapshot.self, from: bytes)
        try validate(value); return value
    }
    private func validate(_ value: ServiceDraftSnapshot) throws {
        guard value.schemaVersion == 1, value.ownerId == ownerId, value.revision >= 0, value.revision <= 1_000_000,
              value.drafts.count <= 100, Set(value.drafts.map(\.draftId)).count == value.drafts.count else { throw ServiceDraftError.invalid }
        for draft in value.drafts { guard draft.ownerId == ownerId else { throw ServiceDraftError.invalid }; try draft.validate() }
        let contexts = value.contexts ?? []
        guard contexts.count <= 100, Set(contexts.map(\.passId)).count == contexts.count else { throw ServiceDraftError.invalid }
        for context in contexts { guard context.ownerId == ownerId else { throw ServiceDraftError.invalid }; try context.validate() }
    }
    static func atomicWrite(_ bytes: Data, _ destination: URL) throws {
        let directory = destination.deletingLastPathComponent()
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        var directoryURL = directory
        var values = URLResourceValues(); values.isExcludedFromBackup = true
        try directoryURL.setResourceValues(values)
        #if os(iOS)
        try bytes.write(to: destination, options: [.atomic, .completeFileProtection])
        #else
        try bytes.write(to: destination, options: .atomic)
        #endif
        // Protect the archive as well as the private directory from backup.
        var fileURL = destination
        try? fileURL.setResourceValues(values)
    }
}
