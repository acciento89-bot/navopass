import SwiftUI

@main
struct NavoPassApp: App {
    @StateObject private var api = APIClient()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(api)
                .tint(Color(red: 0.04, green: 0.43, blue: 0.62))
        }
    }
}

