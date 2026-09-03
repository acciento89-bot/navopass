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

    var body: some View {
        Group {
            if filtered.isEmpty {
                ContentUnavailableView("No passes yet", systemImage: "square.stack.3d.up", description: Text("Create your first digital asset pass."))
            } else {
                List(filtered) { asset in
                    NavigationLink(value: asset) {
                        HStack(spacing: 14) {
                            ZStack {
                                RoundedRectangle(cornerRadius: 12).fill(Color.accentColor.opacity(0.12))
                                Text(String(asset.name.prefix(2)).uppercased()).font(.headline).foregroundStyle(.tint)
                            }.frame(width: 48, height: 48)
                            VStack(alignment: .leading, spacing: 4) {
                                Text(asset.name).font(.headline)
                                Text([asset.manufacturer, asset.model].compactMap { $0 }.joined(separator: " · ").isEmpty ? asset.category : [asset.manufacturer, asset.model].compactMap { $0 }.joined(separator: " · "))
                                    .font(.subheadline).foregroundStyle(.secondary)
                            }
                        }.padding(.vertical, 4)
                    }
                }.listStyle(.insetGrouped)
            }
        }
        .navigationTitle("My passes")
        .searchable(text: $search, prompt: "Search passes")
        .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("New", systemImage: "plus") { showingNewAsset = true } } }
        .navigationDestination(for: Asset.self) { AssetDetailView(asset: $0) }
        .sheet(isPresented: $showingNewAsset) { NavigationStack { NewAssetView() } }
        .refreshable { await api.refreshAssets() }
    }
}

struct AssetDetailView: View {
    @EnvironmentObject private var api: APIClient
    let asset: Asset
    @State private var details: AssetDetailsEnvelope?
    @State private var error: String?

    var body: some View {
        List {
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
        .navigationTitle(asset.name).navigationBarTitleDisplayMode(.inline)
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
        Task { do { _ = try await api.createAsset(draft); dismiss() } catch { self.error = error.localizedDescription }; saving = false }
    }
}
