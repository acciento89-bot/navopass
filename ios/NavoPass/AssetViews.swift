import SwiftUI

struct AssetListView: View {
    @EnvironmentObject private var api: APIClient
    @State private var showingNewAsset = false
    @State private var search = ""

    private var filtered: [Asset] {
        guard !search.isEmpty else { return api.assets.filter { $0.archivedAt == nil } }
        return api.assets.filter { asset in
            [asset.name, asset.category, asset.manufacturer, asset.model, asset.serialNumber].compactMap { $0 }.contains { $0.localizedCaseInsensitiveContains(search) }
        }
    }

    private var sharedCount: Int {
        filtered.filter { $0.visibility != "PRIVATE" }.count
    }

    var body: some View {
        ZStack {
            NavoBackground()
            ScrollView {
                LazyVStack(spacing: 16) {
                    PageHeader(eyebrow: "Digital asset wallet", title: "My passes", subtitle: "Everything important for your assets in one secure place.")
                    HStack(spacing: 10) {
                        StatTile(value: "\(filtered.count)", label: "Active")
                        StatTile(value: "\(filtered.filter { $0.favorite }.count)", label: "Favourites")
                        StatTile(value: "\(sharedCount)", label: "Shared")
                    }
                    HStack(spacing: 11) {
                        Image(systemName: "magnifyingglass").foregroundStyle(.secondary)
                        TextField("Search passes", text: $search).textInputAutocapitalization(.never)
                        if !search.isEmpty {
                            Button { search = "" } label: { Image(systemName: "xmark.circle.fill").foregroundStyle(.secondary) }
                                .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 16).frame(minHeight: 52)
                    .background(NavoTheme.surface, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .overlay { RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(NavoTheme.border) }

                    if filtered.isEmpty {
                        ContentUnavailableView("No passes yet", systemImage: "square.stack.3d.up", description: Text("Create your first digital asset pass."))
                            .navoCard()
                    } else {
                        ForEach(filtered) { asset in
                            NavigationLink(value: asset) { AssetCard(asset: asset) }.buttonStyle(.plain)
                        }
                    }
                }
                .navoPageMargins().padding(.top, 18).padding(.bottom, 110)
            }
            .refreshable { await api.refreshAssets() }
        }
        .toolbar(.hidden, for: .navigationBar)
        .overlay(alignment: .bottomTrailing) {
            Button { showingNewAsset = true } label: {
                Image(systemName: "plus").font(.title2.weight(.bold)).foregroundStyle(.white)
                    .frame(width: 58, height: 58).background(NavoTheme.accent, in: Circle())
                    .shadow(color: NavoTheme.accent.opacity(0.35), radius: 16, y: 7)
            }
            .accessibilityLabel("New pass").padding(.trailing, 22).padding(.bottom, 18)
        }
        .navigationDestination(for: Asset.self) { AssetDetailView(asset: $0) }
        .sheet(isPresented: $showingNewAsset) { NavigationStack { NewAssetView() } }
    }
}

private struct StatTile: View {
    let value: String
    let label: LocalizedStringKey
    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(value).font(.title2.bold())
            Text(label).font(.caption).foregroundStyle(.secondary).lineLimit(1).minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity, alignment: .leading).navoCard(padding: 12)
    }
}

private struct AssetCard: View {
    let asset: Asset
    private var productLine: String {
        let value = [asset.manufacturer, asset.model].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " · ")
        return value.isEmpty ? asset.category : value
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 15) {
            HStack(alignment: .top, spacing: 14) {
                ZStack {
                    RoundedRectangle(cornerRadius: 17, style: .continuous).fill(NavoTheme.accent.opacity(0.13))
                    Text(String(asset.name.prefix(2)).uppercased()).font(.headline.bold()).foregroundStyle(NavoTheme.accent)
                }.frame(width: 58, height: 58)
                VStack(alignment: .leading, spacing: 5) {
                    HStack {
                        Text(asset.name).font(.title3.bold()).foregroundStyle(.primary)
                        if asset.favorite { Image(systemName: "star.fill").font(.caption).foregroundStyle(.yellow) }
                    }
                    Text(productLine).font(.subheadline).foregroundStyle(.secondary).lineLimit(2)
                }
                Spacer(minLength: 4)
                Image(systemName: "chevron.right").font(.footnote.bold()).foregroundStyle(.tertiary).padding(.top, 20)
            }
            Divider()
            HStack {
                Label(asset.category, systemImage: "tag.fill")
                Spacer()
                Label(asset.visibility == "PRIVATE" ? "Private" : "Shared", systemImage: asset.visibility == "PRIVATE" ? "lock.fill" : "link")
            }.font(.caption.weight(.semibold)).foregroundStyle(.secondary)
        }.navoCard()
    }
}

struct AssetDetailView: View {
    @EnvironmentObject private var api: APIClient
    let asset: Asset
    @State private var details: AssetDetailsEnvelope?
    @State private var error: String?

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text(asset.category).font(.caption.bold()).foregroundStyle(NavoTheme.accent).textCase(.uppercase)
                    Text(asset.name).font(.title2.bold())
                    let product = [asset.manufacturer, asset.model].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " · ")
                    if !product.isEmpty { Text(product).foregroundStyle(.secondary) }
                }.padding(.vertical, 8)
            }
            Section("Product") {
                row("Category", asset.category)
                row("Manufacturer", asset.manufacturer)
                row("Model", asset.model)
                row("Serial number", asset.serialNumber)
                row("Location", asset.location)
            }
            Section("Dates") {
                row("Purchase / installation", asset.purchaseDate)
                row("Warranty until", asset.warrantyUntil)
                row("Next service", asset.nextServiceDate)
            }
            if let notes = asset.notes, !notes.isEmpty { Section("Notes") { Text(notes) } }
            if let details {
                Section("Quick actions") {
                    ShareLink(item: URL(string: "https://navopass.de/p/\(asset.publicId)")!) { Label("Share pass", systemImage: "square.and.arrow.up") }
                    Link(destination: URL(string: "https://navopass.de/api/qr?data=https%3A%2F%2Fnavopass.de%2Fp%2F\(asset.publicId)")!) { Label("Open QR code", systemImage: "qrcode") }
                    NavigationLink { PortalScreen(destination: PortalDestination(title: "Edit pass", subtitle: "", icon: "pencil", path: "/app/assets/\(asset.id)/edit")) } label: { Label("Edit pass", systemImage: "pencil") }
                    NavigationLink { PortalScreen(destination: PortalDestination(title: "Service access", subtitle: "", icon: "person.badge.key.fill", path: "/app/assets/\(asset.id)/service-zugang")) } label: { Label("Service access", systemImage: "person.badge.key.fill") }
                    NavigationLink { PortalScreen(destination: PortalDestination(title: "Record service", subtitle: "", icon: "wrench.fill", path: "/app/assets/\(asset.id)/service")) } label: { Label("Record service", systemImage: "wrench.fill") }
                }
                Section("History") {
                    if details.events.isEmpty { Text("No history entries yet.").foregroundStyle(.secondary) }
                    ForEach(details.events) { event in
                        VStack(alignment: .leading, spacing: 4) { Text(event.title).font(.headline); Text(event.eventDate).font(.caption).foregroundStyle(.secondary); if let text = event.description { Text(text).font(.subheadline) } }
                    }
                }
                Section("Documents") {
                    if details.documents.isEmpty { Text("No documents yet.").foregroundStyle(.secondary) }
                    ForEach(details.documents) { document in
                        if let url = URL(string: document.url, relativeTo: URL(string: "https://navopass.de")) { Link(destination: url) { Label(document.title, systemImage: "doc") } }
                    }
                }
            }
            if let error { Section { Text(error).foregroundStyle(.red) } }
        }
        .scrollContentBackground(.hidden)
        .background(NavoBackground())
        .navigationTitle("Pass details").navigationBarTitleDisplayMode(.inline)
        .task { do { details = try await api.assetDetails(id: asset.id) } catch { self.error = error.localizedDescription } }
        .toolbar { ShareLink(item: URL(string: "https://navopass.de/p/\(asset.publicId)")!) { Image(systemName: "square.and.arrow.up") } }
    }

    @ViewBuilder private func row(_ title: LocalizedStringKey, _ value: String?) -> some View {
        if let value, !value.isEmpty { LabeledContent { Text(value) } label: { Text(title) } }
    }
}

struct NewAssetView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var api: APIClient
    @State private var draft = AssetDraft()
    @State private var workspaces: [Workspace] = []
    @State private var saving = false
    @State private var error: String?
    @State private var hasPurchaseDate = false
    @State private var hasWarrantyDate = false
    @State private var hasServiceDate = false
    @State private var purchaseDate = Date()
    @State private var warrantyDate = Date()
    @State private var serviceDate = Date()
    private let categories = ["Heating & climate", "Household", "Vehicle", "Bicycle", "Tools", "Electronics", "Boat", "Machine", "Property", "Other"]

    var body: some View {
        Form {
            Section("Asset") {
                TextField("Name", text: $draft.name)
                Picker("Category", selection: $draft.category) { ForEach(categories, id: \.self) { Text(LocalizedStringKey($0)).tag($0) } }
                TextField("Manufacturer", text: $draft.manufacturer)
                TextField("Model / type", text: $draft.model)
                TextField("Serial number", text: $draft.serialNumber)
                TextField("Location", text: $draft.location)
            }
            if !workspaces.isEmpty { Section("Workspace") { Picker("Workspace", selection: $draft.workspaceId) { ForEach(workspaces) { Text($0.name).tag(Optional($0.id)) } } } }
            Section("Dates & service") {
                Toggle("Purchase / installation date", isOn: $hasPurchaseDate)
                if hasPurchaseDate { DatePicker("Purchase / installation", selection: $purchaseDate, displayedComponents: .date) }
                Toggle("Warranty end date", isOn: $hasWarrantyDate)
                if hasWarrantyDate { DatePicker("Warranty until", selection: $warrantyDate, displayedComponents: .date) }
                Toggle("Plan next service", isOn: $hasServiceDate)
                if hasServiceDate { DatePicker("Next service", selection: $serviceDate, displayedComponents: .date) }
                Stepper(value: $draft.serviceIntervalMonths, in: 1...120) {
                    LabeledContent("Service interval", value: String(localized: "\(draft.serviceIntervalMonths) months"))
                }
            }
            Section("Sharing") { Picker("Visibility", selection: $draft.visibility) { Text("Private").tag("PRIVATE"); Text("Anyone with the link / QR code").tag("LINK"); Text("Public").tag("PUBLIC") } }
            Section("Notes") { TextEditor(text: $draft.notes).frame(minHeight: 100) }
            if let error { Text(error).foregroundStyle(.red) }
        }
        .navigationTitle("New pass").navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            ToolbarItem(placement: .confirmationAction) { Button("Save") { save() }.disabled(draft.name.trimmingCharacters(in: .whitespaces).isEmpty || saving) }
        }
        .task { do { workspaces = try await api.workspaces(); draft.workspaceId = workspaces.first(where: { $0.kind == "PERSONAL" })?.id } catch { self.error = error.localizedDescription } }
    }

    private func save() {
        saving = true
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        draft.purchaseDate = hasPurchaseDate ? formatter.string(from: purchaseDate) : ""
        draft.warrantyUntil = hasWarrantyDate ? formatter.string(from: warrantyDate) : ""
        draft.nextServiceDate = hasServiceDate ? formatter.string(from: serviceDate) : ""
        Task { do { _ = try await api.createAsset(draft); dismiss() } catch { self.error = error.localizedDescription }; saving = false }
    }
}
