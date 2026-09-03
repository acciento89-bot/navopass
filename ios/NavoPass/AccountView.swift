import SwiftUI

struct AccountView: View {
    @EnvironmentObject private var api: APIClient
    var body: some View {
        ZStack {
            NavoBackground()
            ScrollView {
                VStack(spacing: 18) {
                    PageHeader(eyebrow: "NavoPass", title: "Account", subtitle: "Your profile, plan and legal information.")
                    if let user = api.user {
                        VStack(spacing: 0) {
                            accountRow("Name", value: user.name, icon: "person.fill")
                            Divider().padding(.leading, 58)
                            accountRow("Email", value: user.email, icon: "envelope.fill")
                            Divider().padding(.leading, 58)
                            accountRow("Plan", value: user.plan ?? "Free", icon: "creditcard.fill")
                        }.navoCard(padding: 10)
                    }
                    VStack(spacing: 0) {
                        Link(destination: URL(string: "https://navopass.de/datenschutz")!) { linkRow("Privacy policy", icon: "hand.raised.fill") }
                        Divider().padding(.leading, 58)
                        Link(destination: URL(string: "https://navopass.de/nutzungsbedingungen")!) { linkRow("Terms of use", icon: "doc.text.fill") }
                    }.navoCard(padding: 10)
                    Button(role: .destructive) { Task { await api.signOut() } } label: {
                        Label("Sign out", systemImage: "rectangle.portrait.and.arrow.right").font(.headline).frame(maxWidth: .infinity, minHeight: 52)
                    }.buttonStyle(.bordered).buttonBorderShape(.roundedRectangle(radius: 17))
                }.navoPageMargins().padding(.top, 18).padding(.bottom, 40)
            }
        }
        .navigationTitle("Account").navigationBarTitleDisplayMode(.inline)
    }

    private func accountRow(_ title: LocalizedStringKey, value: String, icon: String) -> some View {
        HStack(spacing: 14) {
            FeatureIcon(systemName: icon)
            VStack(alignment: .leading, spacing: 3) {
                Text(title).font(.caption).foregroundStyle(.secondary)
                Text(value).font(.body.weight(.medium)).foregroundStyle(.primary).textSelection(.enabled)
            }
            Spacer(minLength: 4)
        }.padding(8)
    }

    private func linkRow(_ title: LocalizedStringKey, icon: String) -> some View {
        HStack(spacing: 14) {
            FeatureIcon(systemName: icon)
            Text(title).font(.body.weight(.medium)).foregroundStyle(.primary)
            Spacer()
            Image(systemName: "arrow.up.right").font(.caption.bold()).foregroundStyle(.secondary)
        }.padding(8)
    }
}
