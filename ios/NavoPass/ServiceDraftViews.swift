import SwiftUI

private struct ServiceDraftEditorSelection: Identifiable {
    let id = UUID()
    let context: ServiceDraftPassContext
    let draft: ServiceDraft?
}

struct ServiceDraftQueueView: View {
    @EnvironmentObject private var api: APIClient
    @ObservedObject var store: ServiceDraftCoordinator
    var passId: String? = nil
    @State private var editor: ServiceDraftEditorSelection?
    var body: some View {
        List {
            Section {
                Text("Notes stay on this device until you explicitly publish. A previous permission observation is not current permission.")
                Text("Signing out deletes this account's local drafts. No photos, documents or passwords are stored here.").font(.footnote).foregroundStyle(.secondary)
            }
            if store.locked {
                Section {
                    Label("Offline drafts are locked. Previous private files were preserved.", systemImage: "lock.fill")
                    Button("Verify session and retry loading") { Task { await api.verifyDraftSession() } }
                }
            } else {
                Section("Previously opened passes") {
                    let contexts = store.contexts.filter { passId == nil || $0.passId == passId }
                    if contexts.isEmpty { Text("Open an editable pass online once before preparing its offline draft.") }
                    ForEach(contexts) { context in
                        Button { editor = ServiceDraftEditorSelection(context: context, draft: nil) } label: {
                            VStack(alignment: .leading, spacing: 5) {
                                Text(context.label).font(.headline)
                                Text("New local service draft").font(.subheadline)
                                Text(context.observedAt, format: .dateTime.year().month().day().hour().minute()).font(.caption).foregroundStyle(.secondary)
                            }
                        }.disabled(store.drafts.count >= 100)
                    }
                }
                Section("Local queue and receipts") {
                    let values = store.drafts.filter { passId == nil || $0.passId == passId }
                    if values.isEmpty { Text("No local drafts yet.") }
                    ForEach(values) { draft in
                        NavigationLink { ServiceDraftDetailView(store: store, draftId: draft.draftId) } label: {
                            VStack(alignment: .leading, spacing: 5) {
                                Text(draft.title).font(.headline)
                                Text(draft.passLabel + " · " + draft.eventDate).font(.subheadline)
                                Text(draftStatus(draft.state)).font(.caption).foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
            if store.actionFailed { Section { Text("Not saved or delivered. Your previous bytes and frozen retry were retained. Check storage, authentication and current permission.").foregroundStyle(.red) } }
        }
        .navigationTitle("Offline service drafts")
        .sheet(item: $editor) { selection in NavigationStack { ServiceDraftEditor(store: store, context: selection.context, draft: selection.draft) } }
        .onChange(of: store.currentOwner) { _, _ in editor = nil }
    }
}

private struct ServiceDraftDetailView: View {
    @ObservedObject var store: ServiceDraftCoordinator
    let draftId: String
    @State private var editor: ServiceDraftEditorSelection?
    private var value: ServiceDraft? { store.drafts.first { $0.draftId == draftId && $0.ownerId == store.currentOwner } }
    var body: some View {
        List {
            if let value, !store.locked {
                Section("Factual preview") {
                    Text(value.passLabel).font(.headline)
                    Text(value.title).font(.title3)
                    LabeledContent("Event date", value: value.eventDate)
                    LabeledContent("Entry type", value: value.eventType == .service ? String(localized: "Service") : String(localized: "Note"))
                    Text(value.description).textSelection(.enabled)
                    if !value.provider.isEmpty { LabeledContent("Provider", value: value.provider) }
                    LabeledContent("Local revision", value: String(value.revision))
                    Text(value.capturedAt, format: .dateTime.year().month().day().hour().minute())
                    Text(draftStatus(value.state)).font(.headline)
                    if let receipt = value.receipt {
                        LabeledContent("Published event", value: receipt.eventId)
                        Text(receipt.digest).font(.caption.monospaced()).textSelection(.enabled)
                    } else { Text("Unsent or receipt unknown. This preview is not a server history entry.").foregroundStyle(.secondary) }
                }
                Section {
                    if value.state == .local || value.state == .delivered || value.state == .blocked,
                       let context = store.contexts.first(where: { $0.passId == value.passId }) {
                        Button(value.state == .delivered ? String(localized: "Create new local revision") : String(localized: "Edit local draft")) { editor = ServiceDraftEditorSelection(context: context, draft: value) }
                    }
                    if value.state == .local || value.state == .unknown || value.state == .publishing {
                        Button(value.state == .local ? String(localized: "Publish this private entry") : String(localized: "Retry identical submission")) { Task { await store.publish(draftId: draftId) } }
                            .disabled(store.sending.contains(draftId))
                        if store.sending.contains(draftId) { ProgressView("Waiting for a durable receipt…") }
                        Text("Publishing checks current server permission. Retrying keeps the same revision and content; it never sends automatically.").font(.footnote)
                    }
                    if value.state == .blocked { Text("Publication was rejected. Check your access or deliberately save a new local revision. Earlier server history is unchanged.") }
                }
                if store.actionFailed { Section { Text("Not saved or delivered. Your previous bytes and frozen retry were retained. Check storage, authentication and current permission.").foregroundStyle(.red) } }
            } else { Text("This draft is unavailable for the current authenticated account.") }
        }
        .navigationTitle("Service draft")
        .sheet(item: $editor) { selection in NavigationStack { ServiceDraftEditor(store: store, context: selection.context, draft: selection.draft) } }
        .onChange(of: store.currentOwner) { _, _ in editor = nil }
    }
}

private struct ServiceDraftEditor: View {
    @ObservedObject var store: ServiceDraftCoordinator
    let context: ServiceDraftPassContext
    let draft: ServiceDraft?
    @Environment(\.dismiss) private var dismiss
    @State private var title: String
    @State private var notes: String
    @State private var provider: String
    @State private var day: String
    @State private var type: ServiceDraftType
    @State private var discard = false
    @State private var failed = false
    private let initialDay: String
    init(store: ServiceDraftCoordinator, context: ServiceDraftPassContext, draft: ServiceDraft?) {
        self.store = store; self.context = context; self.draft = draft
        let calendar = Calendar(identifier: .gregorian)
        let parts = calendar.dateComponents([.year, .month, .day], from: Date())
        let today = String(format: "%04d-%02d-%02d", parts.year ?? 2000, parts.month ?? 1, parts.day ?? 1)
        let initial = draft?.eventDate ?? today; initialDay = initial
        _title = State(initialValue: draft?.title ?? ""); _notes = State(initialValue: draft?.description ?? "")
        _provider = State(initialValue: draft?.provider ?? ""); _day = State(initialValue: initial); _type = State(initialValue: draft?.eventType ?? .service)
    }
    private var dirty: Bool {
        title != (draft?.title ?? "") || notes != (draft?.description ?? "") || provider != (draft?.provider ?? "") || day != initialDay || type != (draft?.eventType ?? .service)
    }
    private var valid: Bool {
        guard store.currentOwner == context.ownerId, !store.locked else { return false }
        return (try? ServiceDraft.create(ownerId: context.ownerId, passId: context.passId, passLabel: context.label, eventDate: day, title: title, description: notes, provider: provider, eventType: type)) != nil
    }
    var body: some View {
        Group {
            if store.currentOwner == context.ownerId, !store.locked {
                Form {
                    Section { Text(context.label).font(.headline); Text("Local only. Saving does not publish or message anyone.") }
                    Section("Service facts") {
                        TextField("Entry title", text: $title)
                        TextField("Event date (YYYY-MM-DD)", text: $day).keyboardType(.numbersAndPunctuation)
                        Picker("Entry type", selection: $type) { Text("Service").tag(ServiceDraftType.service); Text("Note").tag(ServiceDraftType.note) }
                        TextField("Provider", text: $provider)
                        VStack(alignment: .leading) { Text("Service notes"); TextEditor(text: $notes).frame(minHeight: 140).accessibilityLabel("Service notes") }
                    }
                    Section {
                        Text("Title up to 180, notes up to 4,000 and provider up to 200 characters. Use a valid calendar date; inputs are never silently truncated.").font(.footnote)
                        if failed { Text("Not saved. Your editor and the previous private file were retained.").foregroundStyle(.red) }
                    }
                }.scrollDismissesKeyboard(.interactively)
            } else { Text("This draft is unavailable for the current authenticated account.") }
        }
        .navigationTitle(draft == nil ? String(localized: "New local service draft") : String(localized: "Edit local draft"))
        .toolbar {
            ToolbarItem(placement: .cancellationAction) { Button("Cancel") { if dirty { discard = true } else { dismiss() } } }
            ToolbarItem(placement: .confirmationAction) { Button("Save locally") { save() }.disabled(!valid) }
        }
        .interactiveDismissDisabled(dirty)
        .confirmationDialog("Discard unsaved changes?", isPresented: $discard, titleVisibility: .visible) { Button("Discard changes", role: .destructive) { dismiss() }; Button("Keep editing", role: .cancel) {} }
        .onChange(of: store.currentOwner) { _, owner in if owner != context.ownerId { dismiss() } }
    }
    private func save() {
        do {
            if let draft { try store.update(draftId: draft.draftId, eventDate: day, title: title, description: notes, provider: provider, eventType: type) }
            else { try store.create(passId: context.passId, eventDate: day, title: title, description: notes, provider: provider, eventType: type) }
            dismiss()
        } catch { failed = true }
    }
}

private func draftStatus(_ state: ServiceDraftState) -> String {
    switch state {
    case .local: return String(localized: "Local draft — not published")
    case .publishing: return String(localized: "Frozen submission — receipt pending")
    case .unknown: return String(localized: "Receipt unknown — retry identical submission")
    case .delivered: return String(localized: "Published — receipt saved on this device")
    case .blocked: return String(localized: "Publication rejected — local content retained")
    }
}
