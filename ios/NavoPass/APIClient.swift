import Combine
import Foundation

enum APIError: LocalizedError {
    case invalidResponse
    case server(String)

    var errorDescription: String? {
        switch self {
        case .invalidResponse: return String(localized: "The server response was invalid.")
        case .server(let code):
            switch code {
            case "INVALID_CREDENTIALS": return String(localized: "Email or password is incorrect.")
            case "RATE_LIMITED": return String(localized: "Too many attempts. Please try again later.")
            case "ASSET_LIMIT_REACHED": return String(localized: "Your current plan's pass limit has been reached.")
            case "BUSINESS_REQUIRED": return String(localized: "This function requires the Business plan.")
            case "FILE_TOO_LARGE": return String(localized: "The file may not exceed 15 MB.")
            case "UNSUPPORTED_FILE": return String(localized: "Please select a PDF, JPG, PNG, WebP, HEIC or HEIF file.")
            case "STORAGE_LIMIT_REACHED": return String(localized: "Your storage limit has been reached.")
            case "EMAIL_IN_USE": return String(localized: "This email address is already in use.")
            case "FORBIDDEN": return String(localized: "You do not have permission for this action.")
            case "INVALID_CONFIRMATION": return String(localized: "Enter the required confirmation word.")
            case "INVALID_PASSWORD": return String(localized: "The password is incorrect.")
            case "SHARED_WORKSPACES_EXIST": return String(localized: "Delete or transfer your shared workspaces before deleting the account.")
            case "SUBSCRIPTION_CANCEL_FAILED": return String(localized: "Your subscription could not be cancelled. Your account was not deleted.")
            default: return String(localized: "The request could not be completed.")
            }
        }
    }
}

@MainActor
final class APIClient: ObservableObject {
    @Published private(set) var user: User?
    @Published private(set) var assets: [Asset] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let baseURL = URL(string: "https://navopass.de")!
    private let session: URLSession
    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()

    init() {
        let configuration = URLSessionConfiguration.default
        configuration.httpCookieStorage = .shared
        configuration.httpShouldSetCookies = true
        configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
        session = URLSession(configuration: configuration)
    }

    func restoreSession() async {
        do {
            try await refreshUser()
            await refreshAssets()
        } catch {
            user = nil
        }
    }

    func refreshUser() async throws {
        let envelope: UserEnvelope = try await request("/api/mobile/session")
        user = envelope.user
    }

    func signIn(email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            let envelope: UserEnvelope = try await request("/api/mobile/session", method: "POST", body: Credentials(email: email, password: password))
            user = envelope.user
            await refreshAssets()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func signOut() async {
        do { try await requestWithoutBody("/api/mobile/session", method: "DELETE") } catch { }
        user = nil
        assets = []
    }

    func refreshAssets() async {
        do {
            let envelope: AssetsEnvelope = try await request("/api/mobile/assets")
            assets = envelope.assets
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func assetDetails(id: String) async throws -> AssetDetailsEnvelope {
        try await request("/api/mobile/assets/\(id)")
    }

    func publicAssetDetails(publicId: String) async throws -> AssetDetailsEnvelope {
        let safeId = publicId.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? publicId
        return try await request("/api/mobile/public/\(safeId)")
    }

    func overview() async throws -> MobileOverview {
        try await request("/api/mobile/overview")
    }

    func workspaces() async throws -> [Workspace] {
        let envelope: WorkspacesEnvelope = try await request("/api/mobile/workspaces")
        return envelope.workspaces
    }

    func createAsset(_ draft: AssetDraft) async throws -> Asset {
        let envelope: AssetEnvelope = try await request("/api/mobile/assets", method: "POST", body: draft)
        await refreshAssets()
        return envelope.asset
    }

    func updateAsset(id: String, draft: AssetDraft) async throws {
        var action = MobileAction(action: "updateAsset")
        action.assetId = id
        action.name = draft.name
        action.category = draft.category
        action.manufacturer = draft.manufacturer
        action.model = draft.model
        action.serialNumber = draft.serialNumber
        action.purchaseDate = draft.purchaseDate
        action.warrantyUntil = draft.warrantyUntil
        action.nextServiceDate = draft.nextServiceDate
        action.location = draft.location
        action.notes = draft.notes
        action.visibility = draft.visibility
        action.serviceIntervalMonths = draft.serviceIntervalMonths
        try await performAction(action)
        await refreshAssets()
    }

    func toggleFavorite(assetId: String) async throws { try await assetAction("toggleFavorite", assetId: assetId) }
    func toggleArchive(assetId: String) async throws { try await assetAction("toggleArchive", assetId: assetId) }
    func duplicateAsset(assetId: String) async throws { try await assetAction("duplicateAsset", assetId: assetId) }
    func deleteAsset(assetId: String) async throws { try await assetAction("deleteAsset", assetId: assetId) }

    private func assetAction(_ name: String, assetId: String) async throws {
        var action = MobileAction(action: name)
        action.assetId = assetId
        try await performAction(action)
        await refreshAssets()
    }

    func completeService(assetId: String, provider: String, note: String, jobId: String? = nil) async throws {
        var action = MobileAction(action: "completeService")
        action.assetId = assetId
        action.title = String(localized: "Service completed")
        action.provider = provider
        action.note = note
        action.jobId = jobId
        try await performAction(action)
        await refreshAssets()
    }

    func rescheduleService(assetId: String, date: Date) async throws {
        var action = MobileAction(action: "rescheduleService")
        action.assetId = assetId
        action.nextServiceDate = NavoDate.dayString(date)
        try await performAction(action)
        await refreshAssets()
    }

    func addEvent(assetId: String, title: String, type: String, date: Date, description: String, provider: String, isPublic: Bool) async throws {
        var action = MobileAction(action: "addEvent")
        action.assetId = assetId
        action.title = title
        action.eventType = type
        action.eventDate = NavoDate.dayString(date)
        action.description = description
        action.provider = provider
        action.isPublic = isPublic
        try await performAction(action)
    }

    func deleteEvent(assetId: String, eventId: String) async throws {
        var action = MobileAction(action: "deleteEvent")
        action.assetId = assetId
        action.eventId = eventId
        try await performAction(action)
    }

    func addDocumentLink(assetId: String, title: String, url: String, kind: String, isPublic: Bool) async throws {
        var action = MobileAction(action: "addDocumentLink")
        action.assetId = assetId
        action.title = title
        action.url = url
        action.kind = kind
        action.isPublic = isPublic
        try await performAction(action)
    }

    func deleteDocument(assetId: String, documentId: String) async throws {
        var action = MobileAction(action: "deleteDocument")
        action.assetId = assetId
        action.documentId = documentId
        try await performAction(action)
    }

    func uploadDocument(assetId: String, title: String, kind: String, isPublic: Bool, fileName: String, data: Data) async throws {
        let boundary = "NavoPass-\(UUID().uuidString)"
        var body = Data()
        func add(_ value: String) { body.append(Data(value.utf8)) }
        func field(_ name: String, _ value: String) {
            add("--\(boundary)\r\nContent-Disposition: form-data; name=\"\(name)\"\r\n\r\n\(value)\r\n")
        }
        field("title", title)
        field("kind", kind)
        field("isPublic", isPublic ? "true" : "false")
        let safeName = fileName.replacingOccurrences(of: "\"", with: "")
        add("--\(boundary)\r\nContent-Disposition: form-data; name=\"file\"; filename=\"\(safeName)\"\r\nContent-Type: application/octet-stream\r\n\r\n")
        body.append(data)
        add("\r\n--\(boundary)--\r\n")
        var request = baseRequest(path: "/api/mobile/assets/\(assetId)/documents", method: "POST")
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.httpBody = body
        let responseData = try await responseData(for: request)
        _ = try decoder.decode(ActionEnvelope.self, from: responseData)
    }

    func updateProfile(name: String, email: String, accountType: String, companyName: String, professionalTitle: String) async throws {
        var action = MobileAction(action: "updateProfile")
        action.name = name
        action.email = email
        action.accountType = accountType
        action.companyName = companyName
        action.professionalTitle = professionalTitle
        try await performAction(action)
        try await refreshUser()
    }

    func updateReminder(days: Int) async throws {
        var action = MobileAction(action: "updateReminder")
        action.reminderDays = days
        try await performAction(action)
        try await refreshUser()
    }

    func deleteAccount(password: String, confirmation: String) async throws {
        var action = MobileAction(action: "deleteAccount")
        action.password = password
        action.confirmation = confirmation
        try await performAction(action)
        user = nil
        assets = []
        errorMessage = nil
    }

    func createWorkspace(name: String, kind: String) async throws {
        var action = MobileAction(action: "createWorkspace")
        action.name = name
        action.kind = kind
        try await performAction(action)
    }

    func inviteWorkspaceMember(workspaceId: String, email: String, role: String) async throws {
        var action = MobileAction(action: "inviteWorkspaceMember")
        action.workspaceId = workspaceId
        action.email = email
        action.role = role
        try await performAction(action)
    }

    func inviteServicePartner(assetId: String, email: String, accessDays: Int) async throws {
        var action = MobileAction(action: "inviteServicePartner")
        action.assetId = assetId
        action.email = email
        action.accessDays = accessDays
        try await performAction(action)
    }

    func revokeServiceGrant(assetId: String, userId: String) async throws {
        var action = MobileAction(action: "revokeServiceGrant")
        action.assetId = assetId
        action.targetUserId = userId
        try await performAction(action)
    }

    func revokeServiceInvite(assetId: String, inviteId: String) async throws {
        var action = MobileAction(action: "revokeServiceInvite")
        action.assetId = assetId
        action.inviteId = inviteId
        try await performAction(action)
    }

    func createCustomer(name: String, contactName: String, email: String, phone: String, street: String, postalCode: String, city: String, country: String, notes: String) async throws {
        var action = MobileAction(action: "createCustomer")
        action.name = name
        action.contactName = contactName
        action.email = email
        action.phone = phone
        action.street = street
        action.postalCode = postalCode
        action.city = city
        action.country = country
        action.notes = notes
        try await performAction(action)
    }

    func assignCustomer(assetId: String, customerId: String?) async throws {
        var action = MobileAction(action: "assignCustomer")
        action.assetId = assetId
        action.customerId = customerId
        try await performAction(action)
    }

    func createJob(assetId: String, title: String, scheduledFor: Date?, duration: Int, notes: String, priority: String) async throws {
        var action = MobileAction(action: "createJob")
        action.assetId = assetId
        action.title = title
        action.scheduledFor = scheduledFor.map { NavoDate.isoFormatter.string(from: $0) }
        action.estimatedDurationMinutes = duration
        action.notes = notes
        action.priority = priority
        try await performAction(action)
    }

    func updateJobStatus(jobId: String, status: String) async throws {
        var action = MobileAction(action: "updateJobStatus")
        action.jobId = jobId
        action.status = status
        try await performAction(action)
    }

    private func performAction(_ action: MobileAction) async throws {
        let _: ActionEnvelope = try await request("/api/mobile/actions", method: "POST", body: action)
    }

    private func request<Response: Decodable>(_ path: String) async throws -> Response {
        try await perform(path, method: "GET", body: nil)
    }

    private func request<Response: Decodable, Body: Encodable>(_ path: String, method: String, body: Body) async throws -> Response {
        try await perform(path, method: method, body: try encoder.encode(body))
    }

    private func perform<Response: Decodable>(_ path: String, method: String, body: Data?) async throws -> Response {
        var request = baseRequest(path: path, method: method)
        if let body {
            request.httpBody = body
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        let data = try await responseData(for: request)
        return try decoder.decode(Response.self, from: data)
    }

    private func baseRequest(path: String, method: String) -> URLRequest {
        var request = URLRequest(url: baseURL.appending(path: path))
        request.httpMethod = method
        request.setValue(Locale.current.language.languageCode?.identifier == "de" ? "de" : "en", forHTTPHeaderField: "Accept-Language")
        return request
    }

    private func responseData(for request: URLRequest) async throws -> Data {
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse }
        guard 200..<300 ~= http.statusCode else {
            let failure = try? decoder.decode(FailureEnvelope.self, from: data)
            throw APIError.server(failure?.error ?? "HTTP_\(http.statusCode)")
        }
        return data
    }

    private func requestWithoutBody(_ path: String, method: String) async throws {
        _ = try await responseData(for: baseRequest(path: path, method: method))
    }
}

private struct Credentials: Encodable { let email: String; let password: String }
private struct FailureEnvelope: Decodable { let error: String }
private struct UserEnvelope: Decodable { let user: User }
private struct AssetsEnvelope: Decodable { let assets: [Asset] }
private struct AssetEnvelope: Decodable { let asset: Asset }
private struct WorkspacesEnvelope: Decodable { let workspaces: [Workspace] }
private struct ActionEnvelope: Decodable { let ok: Bool }

struct AssetDetailsEnvelope: Decodable {
    let asset: Asset
    let events: [AssetEvent]
    let documents: [AssetDocument]
    let serviceAccess: ServiceAccessEnvelope?
}

private struct MobileAction: Encodable {
    let action: String
    var assetId: String?
    var eventId: String?
    var documentId: String?
    var jobId: String?
    var customerId: String?
    var workspaceId: String?
    var targetUserId: String?
    var inviteId: String?
    var name: String?
    var email: String?
    var password: String?
    var confirmation: String?
    var title: String?
    var category: String?
    var manufacturer: String?
    var model: String?
    var serialNumber: String?
    var purchaseDate: String?
    var warrantyUntil: String?
    var nextServiceDate: String?
    var location: String?
    var notes: String?
    var note: String?
    var description: String?
    var provider: String?
    var visibility: String?
    var url: String?
    var kind: String?
    var eventType: String?
    var eventDate: String?
    var accountType: String?
    var companyName: String?
    var professionalTitle: String?
    var contactName: String?
    var phone: String?
    var street: String?
    var postalCode: String?
    var city: String?
    var country: String?
    var scheduledFor: String?
    var priority: String?
    var status: String?
    var role: String?
    var isPublic: Bool?
    var reminderDays: Int?
    var serviceIntervalMonths: Int?
    var estimatedDurationMinutes: Int?
    var accessDays: Int?
}
