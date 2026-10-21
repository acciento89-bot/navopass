import Foundation
import CryptoKit

enum ServiceDraftError: Error { case invalid, pending, receiptMismatch, futureArchive, unreadable, stale, notLoaded }
enum ServiceDraftState: String, Codable { case local, publishing, unknown, delivered, blocked }
enum ServiceDraftType: String, Codable { case note = "NOTE", service = "SERVICE" }

/// A past online observation, never a promise of current permission to publish.
struct ServiceDraftPassContext: Codable, Equatable, Identifiable {
    var id: String { passId }
    let ownerId: String
    let passId: String
    let label: String
    let canEditWhenCaptured: Bool
    let observedAt: Date
    func validate() throws {
        guard UUID(uuidString: ownerId) != nil, UUID(uuidString: passId) != nil,
              !label.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, label.unicodeScalars.count <= 300,
              canEditWhenCaptured, observedAt.timeIntervalSince1970.isFinite else { throw ServiceDraftError.invalid }
    }
}

struct ServiceDraftReceipt: Codable, Equatable {
    let eventId: String
    let revision: Int
    let digest: String
}

struct FrozenServiceDraft: Codable, Equatable {
    let ownerId: String
    let passId: String
    let draftId: String
    let revision: Int
    let eventDate: String
    let title: String
    let description: String
    let provider: String
    let eventType: ServiceDraftType

    /// Sorted UTF8 JSON is the cross-platform command/digest contract, without UI snapshots.
    var wireData: Data {
        let body: [String: Any] = ["ownerId": ownerId, "passId": passId, "draftId": draftId, "revision": revision,
                                 "eventDate": eventDate, "title": title, "description": description,
                                 "provider": provider, "eventType": eventType.rawValue]
        return try! JSONSerialization.data(withJSONObject: body, options: [.sortedKeys, .withoutEscapingSlashes])
    }
    var digest: String { SHA256.hash(data: wireData).map { String(format: "%02x", $0) }.joined() }
}

struct ServiceDraft: Codable, Equatable, Identifiable {
    var id: String { draftId }
    let ownerId: String
    let passId: String
    let draftId: String
    let passLabel: String
    let capturedAt: Date
    private(set) var revision: Int
    private(set) var eventDate: String
    private(set) var title: String
    private(set) var description: String
    private(set) var provider: String
    private(set) var eventType: ServiceDraftType
    private(set) var state: ServiceDraftState = .local
    private(set) var frozen: FrozenServiceDraft?
    private(set) var receipt: ServiceDraftReceipt?

    static func create(ownerId: String, passId: String, passLabel: String, eventDate: String, title: String,
                       description: String, provider: String, eventType: ServiceDraftType, capturedAt: Date = Date()) throws -> Self {
        let value = Self(ownerId: ownerId, passId: passId, draftId: UUID().uuidString.lowercased(), passLabel: passLabel,
                         capturedAt: capturedAt, revision: 1, eventDate: eventDate, title: title.trimmingCharacters(in: .whitespacesAndNewlines),
                         description: description, provider: provider, eventType: eventType)
        try value.validate(); return value
    }

    func edited(title: String, description: String, provider: String, eventDate: String, eventType: ServiceDraftType) throws -> Self {
        guard state == .local || state == .delivered || state == .blocked else { throw ServiceDraftError.pending }
        var next = self
        guard revision < 1_000_000 else { throw ServiceDraftError.invalid }
        next.revision += 1; next.title = title.trimmingCharacters(in: .whitespacesAndNewlines)
        next.description = description; next.provider = provider; next.eventDate = eventDate; next.eventType = eventType
        next.state = .local; next.frozen = nil; next.receipt = nil
        try next.validate(); return next
    }

    mutating func freeze() throws -> FrozenServiceDraft {
        guard state == .local else { throw ServiceDraftError.pending }
        try validate()
        let command = commandSnapshot
        frozen = command; state = .publishing
        return command
    }
    func retrySubmission() throws -> FrozenServiceDraft {
        guard state == .publishing || state == .unknown, let frozen else { throw ServiceDraftError.pending }
        try validate(); return frozen
    }
    mutating func markUnknown() throws {
        guard state == .publishing || state == .unknown else { throw ServiceDraftError.pending }
        state = .unknown
    }
    mutating func markBlocked() throws {
        guard state == .publishing || state == .unknown else { throw ServiceDraftError.pending }
        state = .blocked
    }
    mutating func accept(eventId: String, revision: Int, digest: String) throws {
        let command = try retrySubmission()
        guard UUID(uuidString: eventId) != nil, revision == command.revision, digest == command.digest else { throw ServiceDraftError.receiptMismatch }
        receipt = ServiceDraftReceipt(eventId: eventId, revision: revision, digest: digest); state = .delivered
    }
    private var commandSnapshot: FrozenServiceDraft {
        FrozenServiceDraft(ownerId: ownerId, passId: passId, draftId: draftId, revision: revision, eventDate: eventDate,
                           title: title, description: description, provider: provider, eventType: eventType)
    }
    func validate() throws {
        guard [ownerId, passId, draftId].allSatisfy({ UUID(uuidString: $0) != nil }),
              (1...1_000_000).contains(revision), capturedAt.timeIntervalSince1970.isFinite,
              !passLabel.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, passLabel.unicodeScalars.count <= 300,
              !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, title.unicodeScalars.count <= 180,
              description.unicodeScalars.count <= 4000, provider.unicodeScalars.count <= 200,
              [title, description, provider].allSatisfy({ !$0.unicodeScalars.contains(where: { $0.value == 0 }) }),
              Self.validCivilDay(eventDate) else { throw ServiceDraftError.invalid }
        switch state {
        case .local: guard frozen == nil, receipt == nil else { throw ServiceDraftError.invalid }
        case .publishing, .unknown, .blocked:
            guard frozen == commandSnapshot, receipt == nil else { throw ServiceDraftError.invalid }
        case .delivered:
            guard frozen == commandSnapshot, let receipt, UUID(uuidString: receipt.eventId) != nil,
                  receipt.revision == revision, receipt.digest == frozen?.digest else { throw ServiceDraftError.invalid }
        }
    }
    static func validCivilDay(_ value: String) -> Bool {
        guard value.range(of: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$", options: .regularExpression) != nil else { return false }
        let parts = value.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3, parts[0] >= 1 else { return false }
        var calendar = Calendar(identifier: .gregorian); calendar.timeZone = TimeZone(secondsFromGMT: 0)!
        let components = DateComponents(year: parts[0], month: parts[1], day: parts[2])
        guard let date = calendar.date(from: components) else { return false }
        return calendar.component(.year, from: date) == parts[0] && calendar.component(.month, from: date) == parts[1] && calendar.component(.day, from: date) == parts[2]
    }
}
