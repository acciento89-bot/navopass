import SwiftUI

@main
struct NavoPassApp: App {
    @StateObject private var api = APIClient()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(api)
                .tint(NavoTheme.accent)
        }
    }
}
