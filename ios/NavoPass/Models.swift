import Foundation

struct User: Codable, Identifiable {
    let id: String
    let email: String
    let name: String
    let plan: String?
    let reminderDays: Int?
    let accountType: String?
    let companyName: String?
    let professionalTitle: String?

    enum CodingKeys: String, CodingKey {
        case id, email, name, plan
        case reminderDays = "reminder_days"
        case accountType = "account_type"
        case companyName = "company_name"
        case professionalTitle = "professional_title"
    }
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
    let workspaceName: String?

    enum CodingKeys: String, CodingKey {
        case id, name, category, manufacturer, model, location, notes, visibility, favorite
        case publicId = "public_id"
        case serialNumber = "serial_number"
        case purchaseDate = "purchase_date"
        case warrantyUntil = "warranty_until"
        case nextServiceDate = "next_service_date"
        case serviceIntervalMonths = "service_interval_months"
        case archivedAt = "archived_at"
        case workspaceName = "workspace_name"
    }
}

struct AssetEvent: Codable, Identifiable {
    let id: String
    let title: String
    let eventType: String
    let eventDate: String
    let description: String?
    let provider: String?
    let isPublic: Bool?

    enum CodingKeys: String, CodingKey {
        case id, title, description, provider
        case eventType = "event_type"
        case eventDate = "event_date"
        case isPublic = "is_public"
    }
}

struct AssetDocument: Codable, Identifiable {
    let id: String
    let title: String
    let url: String
    let kind: String
    let isPublic: Bool?

    enum CodingKeys: String, CodingKey {
        case id, title, url, kind
        case isPublic = "is_public"
    }
}

struct ServiceGrant: Codable, Identifiable {
    var id: String { userId }
    let userId: String
    let email: String?
    let name: String?
    let companyName: String?
    let professionalTitle: String?
    let expiresAt: String

    enum CodingKeys: String, CodingKey {
        case email, name
        case userId = "user_id"
        case companyName = "company_name"
        case professionalTitle = "professional_title"
        case expiresAt = "expires_at"
    }
}

struct ServiceInvite: Codable, Identifiable {
    let id: String
    let email: String
    let expiresAt: String
    let accessUntil: String

    enum CodingKeys: String, CodingKey {
        case id, email
        case expiresAt = "expires_at"
        case accessUntil = "access_until"
    }
}

struct ServiceAccessEnvelope: Codable {
    let grants: [ServiceGrant]
    let invites: [ServiceInvite]
}

struct WorkspaceMember: Codable, Identifiable {
    var id: String { userId }
    let userId: String
    let name: String
    let email: String
    let role: String

    enum CodingKeys: String, CodingKey {
        case name, email, role
        case userId = "user_id"
    }
}

struct Workspace: Codable, Identifiable {
    let id: String
    let name: String
    let kind: String
    let ownerId: String?
    let role: String?
    let memberCount: Int?
    let members: [WorkspaceMember]?

    enum CodingKeys: String, CodingKey {
        case id, name, kind, role, members
        case ownerId = "owner_id"
        case memberCount = "member_count"
    }
}

struct WorkspaceInvite: Codable, Identifiable {
    let id: String
    let workspaceId: String
    let workspaceName: String
    let email: String
    let role: String
    let expiresAt: String

    enum CodingKeys: String, CodingKey {
        case id, email, role
        case workspaceId = "workspace_id"
        case workspaceName = "workspace_name"
        case expiresAt = "expires_at"
    }
}

struct ServiceCustomer: Codable, Identifiable {
    let id: String
    let name: String
    let contactName: String?
    let email: String?
    let phone: String?
    let street: String?
    let postalCode: String?
    let city: String?
    let country: String
    let notes: String?
    let assetCount: Int
    let overdueCount: Int
    let due30Count: Int

    enum CodingKeys: String, CodingKey {
        case id, name, email, phone, street, city, country, notes
        case contactName = "contact_name"
        case postalCode = "postal_code"
        case assetCount = "asset_count"
        case overdueCount = "overdue_count"
        case due30Count = "due_30_count"
    }
}

struct ServiceJob: Codable, Identifiable {
    let id: String
    let ownerUserId: String
    let assignedUserId: String?
    let assignedName: String?
    let title: String
    let scheduledFor: String?
    let estimatedDurationMinutes: Int
    let notes: String?
    let priority: String
    let status: String
    let completedEventId: String?
    let assetId: String
    let assetName: String
    let customerId: String?
    let customerName: String?

    enum CodingKeys: String, CodingKey {
        case id, title, notes, priority, status
        case ownerUserId = "owner_user_id"
        case assignedUserId = "assigned_user_id"
        case assignedName = "assigned_name"
        case scheduledFor = "scheduled_for"
        case estimatedDurationMinutes = "estimated_duration_minutes"
        case completedEventId = "completed_event_id"
        case assetId = "asset_id"
        case assetName = "asset_name"
        case customerId = "customer_id"
        case customerName = "customer_name"
    }
}

struct MobileCapabilities: Codable {
    let professional: Bool
    let business: Bool
}

struct MobileOverview: Codable {
    let workspaces: [Workspace]
    let invites: [WorkspaceInvite]
    let customers: [ServiceCustomer]
    let jobs: [ServiceJob]
    let capabilities: MobileCapabilities
}

struct AssetDraft: Encodable {
    var name = ""
    var category = "Other"
    var manufacturer = ""
    var model = ""
    var serialNumber = ""
    var purchaseDate = ""
    var warrantyUntil = ""
    var nextServiceDate = ""
    var location = ""
    var notes = ""
    var visibility = "LINK"
    var workspaceId: String?
    var serviceIntervalMonths = 12

    init() {}

    init(asset: Asset) {
        name = asset.name
        category = asset.category
        manufacturer = asset.manufacturer ?? ""
        model = asset.model ?? ""
        serialNumber = asset.serialNumber ?? ""
        purchaseDate = asset.purchaseDate ?? ""
        warrantyUntil = asset.warrantyUntil ?? ""
        nextServiceDate = asset.nextServiceDate ?? ""
        location = asset.location ?? ""
        notes = asset.notes ?? ""
        visibility = asset.visibility
        serviceIntervalMonths = asset.serviceIntervalMonths
    }
}

enum NavoDate {
    static let dayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    static let isoFormatter = ISO8601DateFormatter()

    static func parseDay(_ value: String?) -> Date? {
        guard let value else { return nil }
        return dayFormatter.date(from: String(value.prefix(10)))
    }

    static func dayString(_ date: Date) -> String { dayFormatter.string(from: date) }

    static func daysUntil(_ value: String?) -> Int? {
        guard let date = parseDay(value) else { return nil }
        return Calendar.current.dateComponents([.day], from: Calendar.current.startOfDay(for: Date()), to: date).day
    }
}
