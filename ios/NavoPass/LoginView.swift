import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var api: APIClient
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    Image(systemName: "checkmark.shield.fill")
                        .font(.system(size: 58))
                        .foregroundStyle(.tint)
                    VStack(spacing: 8) {
                        Text("NavoPass").font(.largeTitle.bold())
                        Text("Your digital passes. Securely available wherever you need them.")
                            .foregroundStyle(.secondary).multilineTextAlignment(.center)
                    }
                    VStack(spacing: 14) {
                        TextField("Email address", text: $email)
                            .textContentType(.emailAddress).keyboardType(.emailAddress).textInputAutocapitalization(.never)
                        SecureField("Password", text: $password).textContentType(.password)
                    }
                    .textFieldStyle(.roundedBorder)
                    if let message = api.errorMessage {
                        Text(message).foregroundStyle(.red).font(.callout)
                    }
                    Button {
                        Task { await api.signIn(email: email, password: password) }
                    } label: {
                        Group { if api.isLoading { ProgressView() } else { Text("Sign in").bold() } }
                            .frame(maxWidth: .infinity).frame(height: 30)
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(email.isEmpty || password.isEmpty || api.isLoading)
                    Link("Create an account on navopass.de", destination: URL(string: "https://navopass.de/register")!)
                        .font(.callout)
                }
                .padding(28).frame(maxWidth: 520)
            }
            .safeAreaInset(edge: .bottom) { Text("Kamilunavo · Privacy by design").font(.caption).foregroundStyle(.secondary).padding() }
        }
    }
}

