import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var api: APIClient
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        ZStack {
            NavoBackground()
            ScrollView {
                VStack(spacing: 26) {
                    VStack(spacing: 16) {
                        Image(systemName: "checkmark.shield.fill")
                            .font(.system(size: 46, weight: .semibold))
                            .foregroundStyle(.white)
                            .frame(width: 88, height: 88)
                            .background(
                                LinearGradient(colors: [NavoTheme.accent, NavoTheme.accentDeep], startPoint: .topLeading, endPoint: .bottomTrailing),
                                in: RoundedRectangle(cornerRadius: 27, style: .continuous)
                            )
                            .shadow(color: NavoTheme.accent.opacity(0.28), radius: 24, y: 12)
                        Text("NavoPass")
                            .font(.system(.largeTitle, design: .rounded, weight: .bold))
                        Text("Your digital passes. Securely available wherever you need them.")
                            .font(.body)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    VStack(spacing: 16) {
                        Label {
                            TextField("Email address", text: $email)
                                .textContentType(.emailAddress)
                                .keyboardType(.emailAddress)
                                .textInputAutocapitalization(.never)
                                .submitLabel(.next)
                        } icon: {
                            Image(systemName: "envelope.fill").foregroundStyle(NavoTheme.accent)
                        }
                        .padding(.horizontal, 16).frame(minHeight: 56)
                        .background(NavoTheme.elevatedSurface, in: RoundedRectangle(cornerRadius: 16, style: .continuous))

                        Label {
                            SecureField("Password", text: $password)
                                .textContentType(.password)
                                .submitLabel(.go)
                                .onSubmit { signIn() }
                        } icon: {
                            Image(systemName: "lock.fill").foregroundStyle(NavoTheme.accent)
                        }
                        .padding(.horizontal, 16).frame(minHeight: 56)
                        .background(NavoTheme.elevatedSurface, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    }
                    .navoCard()

                    if let message = api.errorMessage {
                        Label(message, systemImage: "exclamationmark.triangle.fill")
                            .foregroundStyle(.red)
                            .font(.callout)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    Button {
                        signIn()
                    } label: {
                        Group { if api.isLoading { ProgressView() } else { Text("Sign in").bold() } }
                            .frame(maxWidth: .infinity).frame(minHeight: 54)
                    }
                    .buttonStyle(.borderedProminent)
                    .buttonBorderShape(.roundedRectangle(radius: 17))
                    .tint(NavoTheme.accent)
                    .disabled(email.isEmpty || password.isEmpty || api.isLoading)

                    Link("Create an account on navopass.de", destination: URL(string: "https://navopass.de/register")!)
                        .font(.subheadline.weight(.semibold))

                    Text("Kamilunavo · Privacy by design")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
                .padding(.horizontal, 24)
                .padding(.top, 46)
                .padding(.bottom, 30)
                .frame(maxWidth: 520)
                .frame(maxWidth: .infinity)
            }
            .scrollDismissesKeyboard(.interactively)
        }
    }

    private func signIn() {
        guard !email.isEmpty, !password.isEmpty, !api.isLoading else { return }
        Task { await api.signIn(email: email, password: password) }
    }
}
