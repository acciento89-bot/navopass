import SwiftUI

struct RootView: View {
    @EnvironmentObject private var api: APIClient
    @State private var restoring = true

    var body: some View {
        Group {
            if restoring {
                ProgressView("Loading NavoPass…")
            } else if api.user == nil {
                LoginView()
            } else {
                MainTabView()
            }
        }
        .task {
            await api.restoreSession()
            restoring = false
        }
    }
}

struct MainTabView: View {
    var body: some View {
        TabView {
            NavigationStack { AssetListView() }
                .tabItem { Label("Passes", systemImage: "square.stack.3d.up.fill") }
            NavigationStack { ScannerScreen() }
                .tabItem { Label("Scan", systemImage: "qrcode.viewfinder") }
            NavigationStack { AccountView() }
                .tabItem { Label("Account", systemImage: "person.crop.circle") }
        }
    }
}

