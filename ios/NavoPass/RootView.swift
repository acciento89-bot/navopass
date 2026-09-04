import SwiftUI

struct RootView: View {
    @EnvironmentObject private var api: APIClient
    @State private var restoring = true

    var body: some View {
        ZStack {
            NavoBackground()

            Group {
                if restoring {
                    ProgressView("Loading NavoPass…")
                        .controlSize(.large)
                } else if api.user == nil {
                    LoginView()
                } else {
                    MainTabView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .task {
            await api.restoreSession()
            restoring = false
        }
    }
}

struct MainTabView: View {
    private enum Tab: Hashable {
        case passes
        case service
        case scanner
        case alerts
        case more
    }

    @State private var selection: Tab = .passes

    var body: some View {
        TabView(selection: $selection) {
            NavigationStack { AssetListView() }
                .tabItem { Label("Passes", systemImage: "square.stack.3d.up.fill") }
                .tag(Tab.passes)
            NavigationStack { ServiceCenterView() }
                .tabItem { Label("Service", systemImage: "wrench.and.screwdriver.fill") }
                .tag(Tab.service)
            NavigationStack { ScannerScreen() }
                .tabItem { Label("Scan", systemImage: "qrcode.viewfinder") }
                .tag(Tab.scanner)
            NavigationStack { AlertsView() }
                .tabItem { Label("Alerts", systemImage: "bell.badge.fill") }
                .tag(Tab.alerts)
            NavigationStack { MoreView() }
                .tabItem { Label("More", systemImage: "ellipsis.circle.fill") }
                .tag(Tab.more)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .tint(NavoTheme.accent)
        .toolbarBackground(.visible, for: .tabBar)
    }
}
