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
                    VStack(alignment: .leading, spacing: 12) {
                        Label("Danger zone", systemImage: "exclamationmark.triangle.fill")
                            .font(.headline)
                            .foregroundStyle(.red)
                        Text("Permanently delete your NavoPass account and associated data.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        NavigationLink {
                            DeleteAccountView()
                        } label: {
                            Label("Delete account", systemImage: "trash.fill")
                                .font(.headline)
                                .frame(maxWidth: .infinity, minHeight: 50)
                        }
                        .buttonStyle(.bordered)
                        .buttonBorderShape(.roundedRectangle(radius: 16))
                        .tint(.red)
                    }
                    .navoCard()
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

private struct DeleteAccountView: View {
    @EnvironmentObject private var api: APIClient
    @State private var password = ""
    @State private var confirmation = ""
    @State private var error: String?
    @State private var isDeleting = false
    @State private var showingFinalConfirmation = false

    private var confirmationIsValid: Bool {
        let normalized = confirmation.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        return normalized == "DELETE" || normalized == "LÖSCHEN" || normalized == "LOESCHEN"
    }

    var body: some View {
        ZStack {
            NavoBackground()
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    PageHeader(
                        eyebrow: "Account security",
                        title: "Delete account",
                        subtitle: "This permanently removes your account and personal NavoPass data."
                    )

                    VStack(alignment: .leading, spacing: 12) {
                        Label("Before deleting", systemImage: "exclamationmark.triangle.fill")
                            .font(.headline)
                            .foregroundStyle(.red)
                        Text("An active NavoPass subscription will be cancelled first. Shared workspaces with other members must be deleted or transferred beforehand.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .navoCard()

                    VStack(alignment: .leading, spacing: 14) {
                        SecureField("Current password", text: $password)
                            .textContentType(.password)
                            .padding(.horizontal, 16)
                            .frame(minHeight: 54)
                            .background(NavoTheme.elevatedSurface, in: RoundedRectangle(cornerRadius: 15, style: .continuous))

                        TextField("Type DELETE to confirm", text: $confirmation)
                            .textInputAutocapitalization(.characters)
                            .autocorrectionDisabled()
                            .padding(.horizontal, 16)
                            .frame(minHeight: 54)
                            .background(NavoTheme.elevatedSurface, in: RoundedRectangle(cornerRadius: 15, style: .continuous))

                        if let error {
                            Label(error, systemImage: "exclamationmark.circle.fill")
                                .font(.callout)
                                .foregroundStyle(.red)
                        }
                    }
                    .navoCard()

                    Button(role: .destructive) {
                        showingFinalConfirmation = true
                    } label: {
                        Group {
                            if isDeleting { ProgressView() } else { Text("Delete account permanently").bold() }
                        }
                        .frame(maxWidth: .infinity, minHeight: 52)
                    }
                    .buttonStyle(.borderedProminent)
                    .buttonBorderShape(.roundedRectangle(radius: 17))
                    .tint(.red)
                    .disabled(password.isEmpty || !confirmationIsValid || isDeleting)
                }
                .navoPageMargins()
                .padding(.top, 18)
                .padding(.bottom, 40)
            }
        }
        .navigationTitle("Delete account")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Delete account permanently?", isPresented: $showingFinalConfirmation) {
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive) { deleteAccount() }
        } message: {
            Text("This cannot be undone. Your account and associated data will be deleted.")
        }
    }

    private func deleteAccount() {
        guard confirmationIsValid, !password.isEmpty, !isDeleting else { return }
        isDeleting = true
        error = nil
        Task {
            do {
                try await api.deleteAccount(password: password, confirmation: confirmation)
            } catch {
                self.error = error.localizedDescription
                isDeleting = false
            }
        }
    }
}
