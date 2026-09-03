import CoreImage
import CoreImage.CIFilterBuiltins
import SwiftUI
import UniformTypeIdentifiers
import UIKit

struct AssetListView: View {
    @EnvironmentObject private var api: APIClient
    @State private var showingNewAsset = false
    @State private var search = ""

    private var filtered: [Asset] {
        let active = api.assets.filter { $0.archivedAt == nil }
        guard !search.isEmpty else { return active }
        return active.filter { asset in
            [asset.name, asset.category, asset.manufacturer, asset.model, asset.serialNumber]
                .compactMap { $0 }
                .contains { $0.localizedCaseInsensitiveContains(search) }
        }
    }

    private var sharedCount: Int { filtered.filter { $0.visibility != "PRIVATE" }.count }

    var body: some View {
        ZStack {
            NavoBackground()
            ScrollView {
                LazyVStack(spacing: 16) {
                    HStack(alignment: .bottom, spacing: 14) {
                        PageHeader(eyebrow: "Digital asset wallet", title: "My passes", subtitle: "Everything important for your assets in one secure place.")
                        Button { showingNewAsset = true } label: {
                            Image(systemName: "plus").font(.title3.bold()).foregroundStyle(.white)
                                .frame(width: 52, height: 52).background(NavoTheme.accent, in: Circle())
                        }
                        .accessibilityLabel("New pass")
                    }
                    HStack(spacing: 10) {
                        AssetStatTile(value: filtered.count, label: "Active")
                        AssetStatTile(value: filtered.filter { $0.favorite }.count, label: "Favourites")
                        AssetStatTile(value: sharedCount, label: "Shared")
                    }
                    HStack(spacing: 11) {
                        Image(systemName: "magnifyingglass").foregroundStyle(.secondary)
                        TextField("Search passes", text: $search).textInputAutocapitalization(.never)
                        if !search.isEmpty {
                            Button { search = "" } label: { Image(systemName: "xmark.circle.fill").foregroundStyle(.secondary) }.buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 16).frame(minHeight: 52)
                    .background(NavoTheme.surface, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .overlay { RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(NavoTheme.border) }

                    if filtered.isEmpty {
                        ContentUnavailableView("No passes yet", systemImage: "square.stack.3d.up", description: Text("Create your first digital asset pass."))
                            .navoCard()
                    } else {
                        ForEach(filtered) { asset in NavigationLink(value: asset) { AssetCard(asset: asset) }.buttonStyle(.plain) }
                    }
                }
                .navoPageMargins().padding(.top, 18).padding(.bottom, 130)
            }
            .refreshable { await api.refreshAssets() }
        }
        .toolbar(.hidden, for: .navigationBar)
        .navigationDestination(for: Asset.self) { AssetDetailView(asset: $0) }
        .sheet(isPresented: $showingNewAsset) { NavigationStack { NewAssetView() } }
    }
}

private struct AssetStatTile: View {
    let value: Int
    let label: LocalizedStringKey
    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text("\(value)").font(.title2.bold())
            Text(label).font(.caption).foregroundStyle(.secondary).lineLimit(1).minimumScaleFactor(0.7)
        }.frame(maxWidth: .infinity, alignment: .leading).navoCard(padding: 12)
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
    @Environment(\.dismiss) private var dismiss
    let asset: Asset
    @State private var details: AssetDetailsEnvelope?
    @State private var error: String?
    @State private var showingEdit = false
    @State private var showingQR = false
    @State private var showingEvent = false
    @State private var showingDocument = false
    @State private var serviceContext: ServiceEditContext?
    @State private var showingDelete = false

    private var current: Asset { details?.asset ?? asset }

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text(current.category).font(.caption.bold()).foregroundStyle(NavoTheme.accent).textCase(.uppercase)
                    HStack { Text(current.name).font(.title2.bold()); if current.favorite { Image(systemName: "star.fill").foregroundStyle(.yellow) } }
                    let product = [current.manufacturer, current.model].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " · ")
                    if !product.isEmpty { Text(product).foregroundStyle(.secondary) }
                    if let workspace = current.workspaceName { Label(workspace, systemImage: "person.3.fill").font(.caption).foregroundStyle(.secondary) }
                }.padding(.vertical, 8)
            }
            Section("Actions") {
                Button { showingEdit = true } label: { Label("Edit pass", systemImage: "pencil") }
                Button { showingQR = true } label: { Label("Show QR code", systemImage: "qrcode") }
                ShareLink(item: URL(string: "https://navopass.de/p/\(current.publicId)")!) { Label("Share pass", systemImage: "square.and.arrow.up") }
                NavigationLink { ServiceAccessView(asset: current) } label: { Label("Service access", systemImage: "person.badge.key.fill") }
                Button { serviceContext = .init(asset: current, mode: .complete) } label: { Label("Complete service", systemImage: "wrench.and.screwdriver.fill") }
                Button { serviceContext = .init(asset: current, mode: .reschedule) } label: { Label("Reschedule service", systemImage: "calendar.badge.clock") }
            }
            Section("Product") {
                detailRow("Category", current.category)
                detailRow("Manufacturer", current.manufacturer)
                detailRow("Model", current.model)
                detailRow("Serial number", current.serialNumber)
                detailRow("Location", current.location)
            }
            Section("Dates") {
                detailRow("Purchase / installation", current.purchaseDate)
                detailRow("Warranty until", current.warrantyUntil)
                detailRow("Next service", current.nextServiceDate)
                LabeledContent("Service interval", value: String(localized: "\(current.serviceIntervalMonths) months"))
            }
            if let notes = current.notes, !notes.isEmpty { Section("Notes") { Text(notes) } }
            if let details {
                Section {
                    if details.events.isEmpty { Text("No history entries yet.").foregroundStyle(.secondary) }
                    ForEach(details.events) { event in
                        VStack(alignment: .leading, spacing: 4) {
                            HStack { Image(systemName: eventIcon(event.eventType)).foregroundStyle(NavoTheme.accent); Text(event.title).font(.headline) }
                            Text(event.eventDate).font(.caption).foregroundStyle(.secondary)
                            if let provider = event.provider, !provider.isEmpty { Text(provider).font(.caption).foregroundStyle(.secondary) }
                            if let text = event.description, !text.isEmpty { Text(text).font(.subheadline) }
                        }
                        .swipeActions { Button(role: .destructive) { deleteEvent(event) } label: { Label("Delete", systemImage: "trash") } }
                    }
                } header: {
                    HStack { Text("History"); Spacer(); Button { showingEvent = true } label: { Image(systemName: "plus.circle.fill") } }
                }
                Section {
                    if details.documents.isEmpty { Text("No documents yet.").foregroundStyle(.secondary) }
                    ForEach(details.documents) { document in
                        if let url = URL(string: document.url, relativeTo: URL(string: "https://navopass.de")) {
                            Link(destination: url) { Label { VStack(alignment: .leading) { Text(document.title); Text(document.kind).font(.caption).foregroundStyle(.secondary) } } icon: { Image(systemName: "doc.fill") } }
                                .swipeActions { Button(role: .destructive) { deleteDocument(document) } label: { Label("Delete", systemImage: "trash") } }
                        }
                    }
                } header: {
                    HStack { Text("Documents"); Spacer(); Button { showingDocument = true } label: { Image(systemName: "plus.circle.fill") } }
                }
            }
            Section("Pass management") {
                Button { mutate { try await api.toggleFavorite(assetId: current.id) } } label: { Label(current.favorite ? "Remove favourite" : "Add to favourites", systemImage: current.favorite ? "star.slash" : "star") }
                Button { mutate { try await api.duplicateAsset(assetId: current.id) } } label: { Label("Duplicate pass", systemImage: "plus.square.on.square") }
                Button { mutate(dismissAfter: true) { try await api.toggleArchive(assetId: current.id) } } label: { Label("Archive pass", systemImage: "archivebox") }
                Button(role: .destructive) { showingDelete = true } label: { Label("Delete pass", systemImage: "trash") }
            }
            if let error { Section { Text(error).foregroundStyle(.red) } }
        }
        .scrollContentBackground(.hidden).background(NavoBackground())
        .navigationTitle("Pass details").navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .refreshable { await load() }
        .sheet(isPresented: $showingEdit) { NavigationStack { EditAssetView(asset: current) { showingEdit = false; Task { await load() } } } }
        .sheet(isPresented: $showingQR) { NavigationStack { QRCodeView(asset: current) } }
        .sheet(isPresented: $showingEvent) { NavigationStack { AddEventView(assetId: current.id) { showingEvent = false; Task { await load() } } } }
        .sheet(isPresented: $showingDocument) { NavigationStack { AddDocumentView(assetId: current.id) { showingDocument = false; Task { await load() } } } }
        .sheet(item: $serviceContext) { context in NavigationStack { ServiceEditSheet(context: context) { serviceContext = nil; Task { await load() } } } }
        .alert("Delete pass?", isPresented: $showingDelete) {
            Button("Delete", role: .destructive) { mutate(dismissAfter: true) { try await api.deleteAsset(assetId: current.id) } }
            Button("Cancel", role: .cancel) {}
        } message: { Text("This permanently deletes the pass and its entries.") }
    }

    private func load() async { do { details = try await api.assetDetails(id: asset.id); error = nil } catch { self.error = error.localizedDescription } }
    private func mutate(dismissAfter: Bool = false, operation: @escaping () async throws -> Void) { Task { do { try await operation(); if dismissAfter { dismiss() } else { await load() } } catch { self.error = error.localizedDescription } } }
    private func deleteEvent(_ event: AssetEvent) { mutate { try await api.deleteEvent(assetId: current.id, eventId: event.id) } }
    private func deleteDocument(_ document: AssetDocument) { mutate { try await api.deleteDocument(assetId: current.id, documentId: document.id) } }

    @ViewBuilder private func detailRow(_ title: LocalizedStringKey, _ value: String?) -> some View {
        if let value, !value.isEmpty { LabeledContent { Text(value) } label: { Text(title) } }
    }
}

struct EditAssetView: View {
    @EnvironmentObject private var api: APIClient
    @Environment(\.dismiss) private var dismiss
    let asset: Asset
    let completed: () -> Void
    @State private var draft: AssetDraft
    @State private var purchaseDate: Date
    @State private var warrantyDate: Date
    @State private var serviceDate: Date
    @State private var hasPurchase: Bool
    @State private var hasWarranty: Bool
    @State private var hasService: Bool
    @State private var error: String?

    init(asset: Asset, completed: @escaping () -> Void) {
        self.asset = asset; self.completed = completed
        _draft = State(initialValue: AssetDraft(asset: asset))
        _purchaseDate = State(initialValue: NavoDate.parseDay(asset.purchaseDate) ?? Date())
        _warrantyDate = State(initialValue: NavoDate.parseDay(asset.warrantyUntil) ?? Date())
        _serviceDate = State(initialValue: NavoDate.parseDay(asset.nextServiceDate) ?? Date())
        _hasPurchase = State(initialValue: asset.purchaseDate != nil)
        _hasWarranty = State(initialValue: asset.warrantyUntil != nil)
        _hasService = State(initialValue: asset.nextServiceDate != nil)
    }

    var body: some View {
        AssetEditorForm(draft: $draft, hasPurchaseDate: $hasPurchase, hasWarrantyDate: $hasWarranty, hasServiceDate: $hasService, purchaseDate: $purchaseDate, warrantyDate: $warrantyDate, serviceDate: $serviceDate, error: error)
            .navigationTitle("Edit pass").navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }; ToolbarItem(placement: .confirmationAction) { Button("Save") { save() }.disabled(draft.name.trimmingCharacters(in: .whitespaces).isEmpty) } }
    }

    private func save() {
        draft.purchaseDate = hasPurchase ? NavoDate.dayString(purchaseDate) : ""
        draft.warrantyUntil = hasWarranty ? NavoDate.dayString(warrantyDate) : ""
        draft.nextServiceDate = hasService ? NavoDate.dayString(serviceDate) : ""
        Task { do { try await api.updateAsset(id: asset.id, draft: draft); completed(); dismiss() } catch { self.error = error.localizedDescription } }
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

    var body: some View {
        AssetEditorForm(draft: $draft, workspaces: workspaces, hasPurchaseDate: $hasPurchaseDate, hasWarrantyDate: $hasWarrantyDate, hasServiceDate: $hasServiceDate, purchaseDate: $purchaseDate, warrantyDate: $warrantyDate, serviceDate: $serviceDate, error: error)
            .navigationTitle("New pass").navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }; ToolbarItem(placement: .confirmationAction) { Button("Save") { save() }.disabled(draft.name.trimmingCharacters(in: .whitespaces).isEmpty || saving) } }
            .task { do { workspaces = try await api.workspaces(); draft.workspaceId = workspaces.first(where: { $0.kind == "PERSONAL" })?.id } catch { self.error = error.localizedDescription } }
    }

    private func save() {
        saving = true
        draft.purchaseDate = hasPurchaseDate ? NavoDate.dayString(purchaseDate) : ""
        draft.warrantyUntil = hasWarrantyDate ? NavoDate.dayString(warrantyDate) : ""
        draft.nextServiceDate = hasServiceDate ? NavoDate.dayString(serviceDate) : ""
        Task { do { _ = try await api.createAsset(draft); dismiss() } catch { self.error = error.localizedDescription }; saving = false }
    }
}

private struct AssetEditorForm: View {
    @Binding var draft: AssetDraft
    var workspaces: [Workspace] = []
    @Binding var hasPurchaseDate: Bool
    @Binding var hasWarrantyDate: Bool
    @Binding var hasServiceDate: Bool
    @Binding var purchaseDate: Date
    @Binding var warrantyDate: Date
    @Binding var serviceDate: Date
    let error: String?
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
                Stepper(value: $draft.serviceIntervalMonths, in: 1...120) { LabeledContent("Service interval", value: String(localized: "\(draft.serviceIntervalMonths) months")) }
            }
            Section("Sharing") { Picker("Visibility", selection: $draft.visibility) { Text("Private").tag("PRIVATE"); Text("Anyone with the link / QR code").tag("LINK"); Text("Public").tag("PUBLIC") } }
            Section("Notes") { TextEditor(text: $draft.notes).frame(minHeight: 100) }
            if let error { Text(error).foregroundStyle(.red) }
        }
    }
}

struct AddEventView: View {
    @EnvironmentObject private var api: APIClient
    @Environment(\.dismiss) private var dismiss
    let assetId: String
    var presetTitle = ""
    var completed: () -> Void = {}
    @State private var title = ""
    @State private var type = "NOTE"
    @State private var date = Date()
    @State private var description = ""
    @State private var provider = ""
    @State private var isPublic = false
    @State private var error: String?

    var body: some View {
        Form {
            Section("History entry") {
                TextField("Title", text: $title)
                Picker("Type", selection: $type) { Text("Note").tag("NOTE"); Text("Service").tag("SERVICE"); Text("Repair").tag("REPAIR"); Text("Inspection").tag("INSPECTION") }
                DatePicker("Date", selection: $date, displayedComponents: .date)
                TextField("Provider / company", text: $provider)
                TextField("Description", text: $description, axis: .vertical).lineLimit(3...8)
                Toggle("Visible on shared pass", isOn: $isPublic)
            }
            if let error { Text(error).foregroundStyle(.red) }
        }
        .navigationTitle("New history entry").navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }; ToolbarItem(placement: .confirmationAction) { Button("Save") { save() }.disabled(title.trimmingCharacters(in: .whitespaces).isEmpty) } }
        .onAppear { if title.isEmpty { title = presetTitle } }
    }
    private func save() { Task { do { try await api.addEvent(assetId: assetId, title: title, type: type, date: date, description: description, provider: provider, isPublic: isPublic); completed(); dismiss() } catch { self.error = error.localizedDescription } } }
}

struct AddDocumentView: View {
    @EnvironmentObject private var api: APIClient
    @Environment(\.dismiss) private var dismiss
    let assetId: String
    let completed: () -> Void
    @State private var source = 0
    @State private var title = ""
    @State private var link = ""
    @State private var kind = "Document"
    @State private var isPublic = false
    @State private var fileURL: URL?
    @State private var choosingFile = false
    @State private var saving = false
    @State private var error: String?

    var body: some View {
        Form {
            Picker("Source", selection: $source) { Text("File").tag(0); Text("Web link").tag(1) }.pickerStyle(.segmented)
            Section("Document") {
                TextField("Title", text: $title)
                Picker("Type", selection: $kind) { ForEach(["Document", "Photo", "Invoice", "Manual", "Warranty", "Inspection report"], id: \.self) { Text(LocalizedStringKey($0)).tag($0) } }
                if source == 0 {
                    Button { choosingFile = true } label: { Label(fileURL?.lastPathComponent ?? String(localized: "Choose file"), systemImage: "paperclip") }
                } else { TextField("https://…", text: $link).keyboardType(.URL).textInputAutocapitalization(.never) }
                Toggle("Visible on shared pass", isOn: $isPublic)
            }
            if let error { Text(error).foregroundStyle(.red) }
        }
        .navigationTitle("Add document").navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }; ToolbarItem(placement: .confirmationAction) { Button("Save") { save() }.disabled(title.isEmpty || saving || (source == 0 ? fileURL == nil : !link.lowercased().hasPrefix("http"))) } }
        .fileImporter(isPresented: $choosingFile, allowedContentTypes: [.pdf, .image, .webP], allowsMultipleSelection: false) { result in
            if case .success(let urls) = result { fileURL = urls.first; if title.isEmpty { title = urls.first?.deletingPathExtension().lastPathComponent ?? "" } }
            if case .failure(let error) = result { self.error = error.localizedDescription }
        }
    }

    private func save() {
        saving = true
        Task {
            do {
                if source == 0, let fileURL {
                    let accessing = fileURL.startAccessingSecurityScopedResource()
                    defer { if accessing { fileURL.stopAccessingSecurityScopedResource() } }
                    let data = try Data(contentsOf: fileURL, options: .mappedIfSafe)
                    try await api.uploadDocument(assetId: assetId, title: title, kind: kind, isPublic: isPublic, fileName: fileURL.lastPathComponent, data: data)
                } else {
                    try await api.addDocumentLink(assetId: assetId, title: title, url: link, kind: kind, isPublic: isPublic)
                }
                completed(); dismiss()
            } catch { self.error = error.localizedDescription }
            saving = false
        }
    }
}

struct QRCodeView: View {
    @Environment(\.dismiss) private var dismiss
    let asset: Asset
    private let context = CIContext()
    private let filter = CIFilter.qrCodeGenerator()
    private var passURL: URL { URL(string: "https://navopass.de/p/\(asset.publicId)")! }

    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            if let image = qrImage() {
                Image(uiImage: image).interpolation(.none).resizable().scaledToFit().frame(maxWidth: 290)
                    .padding(20).background(.white, in: RoundedRectangle(cornerRadius: 24))
            }
            VStack(spacing: 6) { Text(asset.name).font(.title2.bold()); Text(asset.publicId).font(.subheadline.monospaced()).foregroundStyle(.secondary) }
            ShareLink(item: passURL) { Label("Share QR link", systemImage: "square.and.arrow.up").frame(maxWidth: .infinity, minHeight: 50) }.buttonStyle(.borderedProminent).buttonBorderShape(.roundedRectangle(radius: 16))
            Spacer()
        }
        .padding(24).background(NavoBackground()).navigationTitle("QR code").navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Done") { dismiss() } } }
    }

    private func qrImage() -> UIImage? {
        filter.message = Data(passURL.absoluteString.utf8)
        filter.correctionLevel = "M"
        guard let output = filter.outputImage?.transformed(by: CGAffineTransform(scaleX: 12, y: 12)), let cgImage = context.createCGImage(output, from: output.extent) else { return nil }
        return UIImage(cgImage: cgImage)
    }
}

private func eventIcon(_ type: String) -> String {
    if type == "SERVICE" { return "wrench.fill" }
    if type == "REPAIR" { return "hammer.fill" }
    if type == "INSPECTION" { return "checkmark.seal.fill" }
    return "note.text"
}
