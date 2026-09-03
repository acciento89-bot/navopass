import Foundation

struct User: Codable, Identifiable {
    let id: String
    let email: String
    let name: String
    let plan: String?
}

struct Asset: Codable, Identifiable, Hashable {
    let id: String
    let publicId: String
    let name: String
    let category: String
    let manufacturer: String?
    let model: String?
    let serialNumber: String?
    let purchaseDate: String?
    let warrantyUntil: String?
    let nextServiceDate: String?
    let serviceIntervalMonths: Int
    let location: String?
    let notes: String?
    let visibility: String
    let favorite: Bool
    let archivedAt: String?

    enum CodingKeys: String, CodingKey {
        case id, name, category, manufacturer, model, location, notes, visibility, favorite
        case publicId = "public_id"
        case serialNumber = "serial_number"
        case purchaseDate = "purchase_date"
        case warrantyUntil = "warranty_until"
        case nextServiceDate = "next_service_date"
        case serviceIntervalMonths = "service_interval_months"
        case archivedAt = "archived_at"
    }
}

struct AssetEvent: Codable, Identifiable {
    let id: String
    let title: String
    let eventType: String
    let eventDate: String
    let description: String?
    let provider: String?

    enum CodingKeys: String, CodingKey {
        case id, title, description, provider
        case eventType = "event_type"
        case eventDate = "event_date"
    }
}

struct AssetDocument: Codable, Identifiable {
    let id: String
    let title: String
    let url: String
    let kind: String
}

struct Workspace: Codable, Identifiable {
    let id: String
    let name: String
    let kind: String
}

struct AssetDraft: Encodable {
    var name = ""
    var category = "Other"
    var manufacturer = ""
    var model = ""
    var serialNumber = ""
    var location = ""
    var notes = ""
    var visibility = "LINK"
    var workspaceId: String?
    var serviceIntervalMonths = 12
}

