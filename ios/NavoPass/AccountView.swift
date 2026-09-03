import SwiftUI

struct AccountView: View {
    @EnvironmentObject private var api: APIClient
    var body: some View {
        List {
            if let user = api.user {
                Section("Account") { LabeledContent("Name", value: user.name); LabeledContent("Email", value: user.email); LabeledContent("Plan", value: user.plan ?? "Free") }
            }
            Section { Link("Privacy policy", destination: URL(string: "https://navopass.de/datenschutz")!); Link("Terms of use", destination: URL(string: "https://navopass.de/nutzungsbedingungen")!) }
            Section { Button("Sign out", role: .destructive) { Task { await api.signOut() } } }
        }.navigationTitle("Account")
    }
}

