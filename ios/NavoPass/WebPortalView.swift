import SwiftUI
import WebKit

struct PortalDestination: Hashable, Identifiable {
    let title: String
    let subtitle: String
    let icon: String
    let path: String

    var id: String { path }

    static let service = PortalDestination(title: "Service", subtitle: "Maintenance, warranties and due dates", icon: "wrench.and.screwdriver.fill", path: "/app/service")
    static let notifications = PortalDestination(title: "Alerts", subtitle: "Upcoming maintenance and important notices", icon: "bell.badge.fill", path: "/app/notifications")

    static let more: [PortalDestination] = [
        PortalDestination(title: "Service jobs", subtitle: "Manage work orders and reports", icon: "briefcase.fill", path: "/app/auftraege"),
        PortalDestination(title: "Customers & locations", subtitle: "Manage customers and assigned assets", icon: "building.2.fill", path: "/app/kunden"),
        PortalDestination(title: "Workspaces", subtitle: "Personal and shared areas", icon: "person.3.fill", path: "/app/team"),
        PortalDestination(title: "QR stickers", subtitle: "Order and manage asset stickers", icon: "qrcode", path: "/app/sticker"),
        PortalDestination(title: "Profile", subtitle: "Personal and professional details", icon: "person.crop.circle.fill", path: "/app/profil"),
        PortalDestination(title: "Settings", subtitle: "Account, security and preferences", icon: "gearshape.fill", path: "/app/settings"),
        PortalDestination(title: "Plans & pricing", subtitle: "Compare and manage NavoPass plans", icon: "creditcard.fill", path: "/preise")
    ]
}

struct PortalScreen: View {
    let destination: PortalDestination

    var body: some View {
        AuthenticatedWebView(path: destination.path)
            .background(Color(uiColor: .systemBackground))
            .navigationTitle(LocalizedStringKey(destination.title))
            .navigationBarTitleDisplayMode(.inline)
    }
}

struct AuthenticatedWebView: UIViewRepresentable {
    let path: String

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.allowsInlineMediaPlayback = true
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic
        load(path: path, in: webView)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        guard context.coordinator.loadedPath != path else { return }
        load(path: path, in: webView)
    }

    func makeCoordinator() -> Coordinator { Coordinator() }

    private func load(path: String, in webView: WKWebView) {
        let cookieStore = webView.configuration.websiteDataStore.httpCookieStore
        let cookies = HTTPCookieStorage.shared.cookies?.filter { $0.domain.contains("navopass.de") } ?? []
        let group = DispatchGroup()
        cookies.forEach { cookie in
            group.enter()
            cookieStore.setCookie(cookie) { group.leave() }
        }
        group.notify(queue: .main) {
            guard let url = URL(string: "https://navopass.de\(path)") else { return }
            var request = URLRequest(url: url)
            request.setValue(Locale.current.language.languageCode?.identifier == "de" ? "de" : "en", forHTTPHeaderField: "Accept-Language")
            webView.load(request)
        }
    }

    final class Coordinator: NSObject, WKNavigationDelegate {
        var loadedPath: String?

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            loadedPath = webView.url?.path
        }
    }
}

struct PortalTabView: View {
    let destination: PortalDestination

    var body: some View {
        PortalScreen(destination: destination)
    }
}

struct MoreView: View {
    @EnvironmentObject private var api: APIClient

    var body: some View {
        ZStack {
            NavoBackground()
            ScrollView {
                LazyVStack(spacing: 16) {
                    PageHeader(
                        eyebrow: "NavoPass",
                        title: "More",
                        subtitle: "All functions for your assets, customers and account."
                    )
                    .padding(.bottom, 4)

                    ForEach(PortalDestination.more) { destination in
                        NavigationLink(value: destination) {
                            HStack(spacing: 15) {
                                FeatureIcon(systemName: destination.icon)
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(LocalizedStringKey(destination.title)).font(.headline).foregroundStyle(.primary)
                                    Text(LocalizedStringKey(destination.subtitle)).font(.subheadline).foregroundStyle(.secondary)
                                }
                                Spacer(minLength: 8)
                                Image(systemName: "chevron.right")
                                    .font(.footnote.weight(.bold))
                                    .foregroundStyle(.tertiary)
                            }
                            .navoCard(padding: 15)
                        }
                        .buttonStyle(.plain)
                    }

                    NavigationLink {
                        AccountView()
                    } label: {
                        HStack(spacing: 15) {
                            FeatureIcon(systemName: "person.crop.circle")
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Account").font(.headline).foregroundStyle(.primary)
                                Text(api.user?.email ?? "").font(.subheadline).foregroundStyle(.secondary)
                            }
                            Spacer()
                            Image(systemName: "chevron.right").font(.footnote.weight(.bold)).foregroundStyle(.tertiary)
                        }
                        .navoCard(padding: 15)
                    }
                    .buttonStyle(.plain)
                }
                .navoPageMargins()
                .padding(.top, 18)
                .padding(.bottom, 110)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .navigationDestination(for: PortalDestination.self) { PortalScreen(destination: $0) }
    }
}
