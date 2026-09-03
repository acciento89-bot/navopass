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
    private let decoder: JSONDecoder
    private let encoder = JSONEncoder()

    init() {
        let configuration = URLSessionConfiguration.default
        configuration.httpCookieStorage = .shared
        configuration.httpShouldSetCookies = true
        configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
        session = URLSession(configuration: configuration)
        decoder = JSONDecoder()
    }

    func restoreSession() async {
        do {
            let envelope: UserEnvelope = try await request("/api/mobile/session")
            user = envelope.user
            await refreshAssets()
        } catch {
            user = nil
        }
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

    func workspaces() async throws -> [Workspace] {
        let envelope: WorkspacesEnvelope = try await request("/api/mobile/workspaces")
        return envelope.workspaces
    }

    func createAsset(_ draft: AssetDraft) async throws -> Asset {
        let envelope: AssetEnvelope = try await request("/api/mobile/assets", method: "POST", body: draft)
        await refreshAssets()
        return envelope.asset
    }

    private func request<Response: Decodable>(_ path: String) async throws -> Response {
        try await perform(path, method: "GET", body: nil)
    }

    private func request<Response: Decodable, Body: Encodable>(_ path: String, method: String, body: Body) async throws -> Response {
        try await perform(path, method: method, body: try encoder.encode(body))
    }

    private func perform<Response: Decodable>(_ path: String, method: String, body: Data?) async throws -> Response {
        var request = URLRequest(url: baseURL.appending(path: path))
        request.httpMethod = method
        request.setValue(Locale.current.language.languageCode?.identifier == "de" ? "de" : "en", forHTTPHeaderField: "Accept-Language")
        if let body {
            request.httpBody = body
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse }
        guard 200..<300 ~= http.statusCode else {
            let failure = try? decoder.decode(FailureEnvelope.self, from: data)
            throw APIError.server(failure?.error ?? "HTTP_\(http.statusCode)")
        }
        return try decoder.decode(Response.self, from: data)
    }

    private func requestWithoutBody(_ path: String, method: String) async throws {
        var request = URLRequest(url: baseURL.appending(path: path))
        request.httpMethod = method
        let (_, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, 200..<300 ~= http.statusCode else { throw APIError.invalidResponse }
    }
}

private struct Credentials: Encodable { let email: String; let password: String }
private struct FailureEnvelope: Decodable { let error: String }
private struct UserEnvelope: Decodable { let user: User }
private struct AssetsEnvelope: Decodable { let assets: [Asset] }
private struct AssetEnvelope: Decodable { let asset: Asset }
private struct WorkspacesEnvelope: Decodable { let workspaces: [Workspace] }
struct AssetDetailsEnvelope: Decodable { let asset: Asset; let events: [AssetEvent]; let documents: [AssetDocument] }
