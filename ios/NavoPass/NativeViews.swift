import SwiftUI

private struct SummaryTile: View {
    let value: Int
    let label: LocalizedStringKey
    var warning = false

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("\(value)").font(.title2.bold()).foregroundStyle(warning && value > 0 ? .red : .primary)
            Text(label).font(.caption).foregroundStyle(.secondary).lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .navoCard(padding: 13)
    }
}

enum ServiceEditMode: String, Identifiable {
    case complete
    case reschedule
    var id: String { rawValue }
}

struct ServiceEditContext: Identifiable {
    let asset: Asset
    let mode: ServiceEditMode
    var jobId: String? = nil
    var id: String { "\(asset.id)-\(mode.rawValue)" }
}

struct ServiceCenterView: View {
    @EnvironmentObject private var api: APIClient
    @State private var selection: ServiceEditContext?

    private var activeAssets: [Asset] { api.assets.filter { $0.archivedAt == nil } }
    private var planned: [Asset] {
        activeAssets.filter { $0.nextServiceDate != nil }.sorted { (NavoDate.daysUntil($0.nextServiceDate) ?? 99999) < (NavoDate.daysUntil($1.nextServiceDate) ?? 99999) }
    }
    private var overdue: Int { planned.filter { (NavoDate.daysUntil($0.nextServiceDate) ?? 0) < 0 }.count }
    private var dueSoon: Int { planned.filter { (0...30).contains(NavoDate.daysUntil($0.nextServiceDate) ?? 99999) }.count }

    var body: some View {
        ZStack {
            NavoBackground()
            ScrollView {
                LazyVStack(spacing: 16) {
                    PageHeader(eyebrow: "Service & deadlines", title: "Maintenance center", subtitle: "Plan maintenance, complete work and keep warranty dates under control.")
                    HStack(spacing: 10) {
                        SummaryTile(value: overdue, label: "Overdue", warning: true)
                        SummaryTile(value: dueSoon, label: "Next 30 days")
                        SummaryTile(value: activeAssets.count - planned.count, label: "Not planned")
                    }
                    if planned.isEmpty {
                        ContentUnavailableView("No maintenance planned", systemImage: "wrench.and.screwdriver", description: Text("Add a service date to a pass to see it here."))
                            .navoCard()
                    } else {
                        ForEach(planned) { asset in
                            ServiceAssetCard(asset: asset, complete: { selection = .init(asset: asset, mode: .complete) }, reschedule: { selection = .init(asset: asset, mode: .reschedule) })
                        }
                    }
                }
                .navoPageMargins().padding(.top, 18).padding(.bottom, 120)
            }
            .refreshable { await api.refreshAssets() }
        }
        .toolbar(.hidden, for: .navigationBar)
        .navigationDestination(for: Asset.self) { AssetDetailView(asset: $0) }
        .sheet(item: $selection) { context in
            NavigationStack {
                ServiceEditSheet(context: context) { selection = nil }
            }
        }
    }
}

private struct ServiceAssetCard: View {
    let asset: Asset
    let complete: () -> Void
    let reschedule: () -> Void

    private var days: Int? { NavoDate.daysUntil(asset.nextServiceDate) }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top) {
                FeatureIcon(systemName: days.map { $0 < 0 ? "exclamationmark.triangle.fill" : "calendar.badge.clock" } ?? "calendar")
                VStack(alignment: .leading, spacing: 4) {
                    Text(asset.name).font(.headline)
                    Text(asset.nextServiceDate ?? "—").font(.subheadline).foregroundStyle(.secondary)
                    if let days {
                        Text(relativeDeadline(days)).font(.caption.bold()).foregroundStyle(days < 0 ? .red : NavoTheme.accent)
                    }
                }
                Spacer()
            }
            HStack {
                Button("Complete", action: complete).buttonStyle(.borderedProminent)
                Button("Reschedule", action: reschedule).buttonStyle(.bordered)
                Spacer()
                NavigationLink(value: asset) { Image(systemName: "chevron.right") }
            }
            .buttonBorderShape(.capsule)
        }
        .navoCard()
    }
}

struct ServiceEditSheet: View {
    @EnvironmentObject private var api: APIClient
    @Environment(\.dismiss) private var dismiss
    let context: ServiceEditContext
    let onSaved: () -> Void
    @State private var date: Date
    @State private var provider = ""
    @State private var note = ""
    @State private var saving = false
    @State private var error: String?

    init(context: ServiceEditContext, onSaved: @escaping () -> Void) {
        self.context = context
        self.onSaved = onSaved
        _date = State(initialValue: NavoDate.parseDay(context.asset.nextServiceDate) ?? Date())
    }

    var body: some View {
        Form {
            Section {
                LabeledContent("Pass", value: context.asset.name)
            }
            if context.mode == .complete {
                Section("Service entry") {
                    TextField("Provider / company", text: $provider)
                    TextField("Notes", text: $note, axis: .vertical).lineLimit(3...7)
                    Text("The next date is calculated automatically from the service interval.").font(.footnote).foregroundStyle(.secondary)
                }
            } else {
                Section("New date") { DatePicker("Next service", selection: $date, displayedComponents: .date) }
            }
            if let error { Text(error).foregroundStyle(.red) }
        }
        .navigationTitle(context.mode == .complete ? "Complete service" : "Reschedule service")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            ToolbarItem(placement: .confirmationAction) { Button("Save") { save() }.disabled(saving) }
        }
    }

    private func save() {
        saving = true
        Task {
            do {
                if context.mode == .complete {
                    try await api.completeService(assetId: context.asset.id, provider: provider, note: note, jobId: context.jobId)
                } else {
                    try await api.rescheduleService(assetId: context.asset.id, date: date)
                }
                onSaved()
                dismiss()
            } catch { self.error = error.localizedDescription }
            saving = false
        }
    }
}

struct AlertsView: View {
    @EnvironmentObject private var api: APIClient
    @State private var overview: MobileOverview?
    @State private var error: String?

    private struct Reminder: Identifiable {
        let id: String
        let asset: Asset
        let title: LocalizedStringKey
        let date: String
        let days: Int
        let icon: String
    }

    private var reminders: [Reminder] {
        let lead = api.user?.reminderDays ?? 30
        return api.assets.filter { $0.archivedAt == nil }.flatMap { asset -> [Reminder] in
            var rows: [Reminder] = []
            if let date = asset.nextServiceDate, let days = NavoDate.daysUntil(date), days <= lead {
                rows.append(.init(id: "\(asset.id)-service", asset: asset, title: "Maintenance", date: date, days: days, icon: "wrench.fill"))
            }
            if let date = asset.warrantyUntil, let days = NavoDate.daysUntil(date), days <= lead {
                rows.append(.init(id: "\(asset.id)-warranty", asset: asset, title: "Warranty", date: date, days: days, icon: "shield.fill"))
            }
            return rows
        }.sorted { $0.days < $1.days }
    }

    var body: some View {
        ZStack {
            NavoBackground()
            ScrollView {
                LazyVStack(spacing: 16) {
                    PageHeader(eyebrow: "NavoPass reminds you", title: "Alerts", subtitle: "Maintenance, warranty deadlines and workspace invitations in one place.")
                    HStack(spacing: 10) {
                        SummaryTile(value: reminders.filter { $0.days < 0 }.count, label: "Overdue", warning: true)
                        SummaryTile(value: reminders.count, label: "In reminder window")
                        SummaryTile(value: overview?.invites.count ?? 0, label: "Invitations")
                    }
                    if let invites = overview?.invites, !invites.isEmpty {
                        SectionCard(title: "Workspace invitations", icon: "person.2.badge.plus") {
                            ForEach(invites) { invite in
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(invite.workspaceName).font(.headline)
                                    Text(invite.role.capitalized).font(.subheadline).foregroundStyle(.secondary)
                                }
                                if invite.id != invites.last?.id { Divider() }
                            }
                        }
                    }
                    if reminders.isEmpty {
                        ContentUnavailableView("Everything is on track", systemImage: "checkmark.circle.fill", description: Text("No maintenance or warranty deadline falls within your reminder window."))
                            .navoCard()
                    } else {
                        ForEach(reminders) { reminder in
                            NavigationLink(value: reminder.asset) {
                                HStack(spacing: 14) {
                                    FeatureIcon(systemName: reminder.icon, color: reminder.days < 0 ? .red : NavoTheme.accent)
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(reminder.title).font(.caption.bold()).foregroundStyle(.secondary)
                                        Text(reminder.asset.name).font(.headline).foregroundStyle(.primary)
                                        Text("\(relativeDeadline(reminder.days)) · \(reminder.date)").font(.subheadline).foregroundStyle(reminder.days < 0 ? .red : .secondary)
                                    }
                                    Spacer()
                                    Image(systemName: "chevron.right").foregroundStyle(.tertiary)
                                }
                                .navoCard(padding: 15)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    if let error { Text(error).foregroundStyle(.red).navoCard() }
                }
                .navoPageMargins().padding(.top, 18).padding(.bottom, 120)
            }
            .refreshable { await load() }
        }
        .toolbar(.hidden, for: .navigationBar)
        .navigationDestination(for: Asset.self) { AssetDetailView(asset: $0) }
        .task { await load() }
    }

    private func load() async {
        await api.refreshAssets()
        do { overview = try await api.overview(); error = nil } catch { self.error = error.localizedDescription }
    }
}

struct MoreView: View {
    @EnvironmentObject private var api: APIClient

    var body: some View {
        ZStack {
            NavoBackground()
            ScrollView {
                LazyVStack(spacing: 13) {
                    PageHeader(eyebrow: "NavoPass", title: "More", subtitle: "All native tools for your assets, service work and account.")
                        .padding(.bottom, 3)
                    NativeMenuLink(title: "Service jobs", subtitle: "Plan and complete work orders", icon: "briefcase.fill", destination: ServiceJobsView())
                    NativeMenuLink(title: "Customers & locations", subtitle: "Assign assets and manage contacts", icon: "building.2.fill", destination: CustomersView())
                    NativeMenuLink(title: "Workspaces", subtitle: "Personal and shared areas", icon: "person.3.fill", destination: WorkspacesView())
                    NativeMenuLink(title: "QR labels", subtitle: "Show and share printable pass codes", icon: "qrcode", destination: QRLabelsView())
                    NativeMenuLink(title: "Profile", subtitle: "Personal or professional use", icon: "person.crop.circle.fill", destination: ProfileView())
                    NativeMenuLink(title: "Settings", subtitle: "Reminders, account and legal", icon: "gearshape.fill", destination: SettingsView())
                    NavigationLink { AccountView() } label: {
                        HStack(spacing: 14) {
                            FeatureIcon(systemName: "person.text.rectangle.fill")
                            VStack(alignment: .leading, spacing: 3) {
                                Text("Account").font(.headline).foregroundStyle(.primary)
                                Text(api.user?.email ?? "").font(.subheadline).foregroundStyle(.secondary)
                            }
                            Spacer(minLength: 8)
                            Image(systemName: "chevron.right").font(.footnote.bold()).foregroundStyle(.tertiary)
                        }.navoCard(padding: 14)
                    }.buttonStyle(.plain)
                }
                .navoPageMargins().padding(.top, 18).padding(.bottom, 120)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
    }
}

private struct NativeMenuLink<Destination: View>: View {
    let title: LocalizedStringKey
    let subtitle: LocalizedStringKey
    let icon: String
    let destination: Destination

    var body: some View {
        NavigationLink { destination } label: { MenuRow(title: title, subtitle: subtitle, icon: icon) }.buttonStyle(.plain)
    }
}

private struct MenuRow: View {
    let title: LocalizedStringKey
    let subtitle: LocalizedStringKey
    let icon: String
    var body: some View {
        HStack(spacing: 14) {
            FeatureIcon(systemName: icon)
            VStack(alignment: .leading, spacing: 3) {
                Text(title).font(.headline).foregroundStyle(.primary)
                Text(subtitle).font(.subheadline).foregroundStyle(.secondary).lineLimit(2)
            }
            Spacer(minLength: 8)
            Image(systemName: "chevron.right").font(.footnote.bold()).foregroundStyle(.tertiary)
        }.navoCard(padding: 14)
    }
}

struct ServiceJobsView: View {
    @EnvironmentObject private var api: APIClient
    @State private var overview: MobileOverview?
    @State private var showingNew = false
    @State private var serviceContext: ServiceEditContext?
    @State private var error: String?

    var body: some View {
        List {
            if let overview {
                Section {
                    HStack {
                        SummaryTile(value: overview.jobs.filter { $0.status == "OPEN" }.count, label: "Open")
                        SummaryTile(value: overview.jobs.filter { $0.status == "IN_PROGRESS" }.count, label: "In progress")
                    }.listRowInsets(EdgeInsets()).listRowBackground(Color.clear)
                }
                if !overview.capabilities.business {
                    Section { Label("Creating jobs and customer dispatch requires the Business plan.", systemImage: "info.circle").foregroundStyle(.secondary) }
                }
                Section("Jobs") {
                    if overview.jobs.isEmpty { Text("No service jobs yet.").foregroundStyle(.secondary) }
                    ForEach(overview.jobs) { job in
                        VStack(alignment: .leading, spacing: 8) {
                            HStack { Text(job.title).font(.headline); Spacer(); Text(jobStatus(job.status)).font(.caption.bold()).foregroundStyle(NavoTheme.accent) }
                            Text(job.assetName).font(.subheadline)
                            Text([job.customerName, formattedDateTime(job.scheduledFor)].compactMap { $0 }.joined(separator: " · ")).font(.caption).foregroundStyle(.secondary)
                            if job.status == "OPEN" {
                                Button("Start job") { update(job, "IN_PROGRESS") }.buttonStyle(.borderedProminent)
                            } else if job.status == "IN_PROGRESS" {
                                HStack {
                                    Button("Set back to open") { update(job, "OPEN") }.buttonStyle(.bordered)
                                    Button("Complete & record") {
                                        if let asset = api.assets.first(where: { $0.id == job.assetId }) {
                                            serviceContext = .init(asset: asset, mode: .complete, jobId: job.id)
                                        }
                                    }
                                }
                            }
                        }.padding(.vertical, 5)
                    }
                }
            } else { ProgressView() }
            if let error { Text(error).foregroundStyle(.red) }
        }
        .navigationTitle("Service jobs")
        .toolbar { Button { showingNew = true } label: { Label("New job", systemImage: "plus") } }
        .refreshable { await load() }
        .task { await load() }
        .sheet(isPresented: $showingNew) { NavigationStack { NewJobView { showingNew = false; Task { await load() } } } }
        .sheet(item: $serviceContext) { context in NavigationStack { ServiceEditSheet(context: context) { serviceContext = nil; Task { await load() } } } }
    }

    private func load() async { do { overview = try await api.overview(); error = nil } catch { self.error = error.localizedDescription } }
    private func update(_ job: ServiceJob, _ status: String) { Task { do { try await api.updateJobStatus(jobId: job.id, status: status); await load() } catch { self.error = error.localizedDescription } } }
}

struct NewJobView: View {
    @EnvironmentObject private var api: APIClient
    @Environment(\.dismiss) private var dismiss
    let completed: () -> Void
    @State private var assetId = ""
    @State private var title = ""
    @State private var hasDate = true
    @State private var date = Date()
    @State private var duration = 60
    @State private var notes = ""
    @State private var priority = "NORMAL"
    @State private var error: String?

    var body: some View {
        Form {
            Section("Job") {
                Picker("Pass", selection: $assetId) { ForEach(api.assets.filter { $0.archivedAt == nil }) { Text($0.name).tag($0.id) } }
                TextField("Title", text: $title)
                Picker("Priority", selection: $priority) { Text("Low").tag("LOW"); Text("Normal").tag("NORMAL"); Text("High").tag("HIGH") }
                Toggle("Schedule date", isOn: $hasDate)
                if hasDate { DatePicker("Date and time", selection: $date) }
                Stepper("\(duration) min", value: $duration, in: 15...720, step: 15)
                TextField("Notes", text: $notes, axis: .vertical).lineLimit(3...6)
            }
            if let error { Text(error).foregroundStyle(.red) }
        }
        .navigationTitle("New job").navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            ToolbarItem(placement: .confirmationAction) { Button("Save") { save() }.disabled(assetId.isEmpty || title.trimmingCharacters(in: .whitespaces).isEmpty) }
        }
        .onAppear { if assetId.isEmpty { assetId = api.assets.first(where: { $0.archivedAt == nil })?.id ?? "" } }
    }

    private func save() { Task { do { try await api.createJob(assetId: assetId, title: title, scheduledFor: hasDate ? date : nil, duration: duration, notes: notes, priority: priority); completed(); dismiss() } catch { self.error = error.localizedDescription } } }
}

struct CustomersView: View {
    @EnvironmentObject private var api: APIClient
    @State private var overview: MobileOverview?
    @State private var showingNew = false
    @State private var showingAssignment = false
    @State private var error: String?

    var body: some View {
        List {
            if let overview {
                if !overview.capabilities.professional {
                    Section { Label("Switch your profile to professional use to manage customers.", systemImage: "person.crop.circle.badge.exclamationmark").foregroundStyle(.secondary) }
                } else if !overview.capabilities.business {
                    Section { Label("Customer management requires the Business plan.", systemImage: "info.circle").foregroundStyle(.secondary) }
                }
                Section("Customers & locations") {
                    if overview.customers.isEmpty { Text("No customers yet.").foregroundStyle(.secondary) }
                    ForEach(overview.customers) { customer in
                        VStack(alignment: .leading, spacing: 6) {
                            HStack { Text(customer.name).font(.headline); Spacer(); Text("\(customer.assetCount)").font(.headline).foregroundStyle(NavoTheme.accent) }
                            let address = [customer.street, [customer.postalCode, customer.city].compactMap { $0 }.joined(separator: " ")].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: ", ")
                            if !address.isEmpty { Text(address).font(.subheadline).foregroundStyle(.secondary) }
                            if customer.overdueCount > 0 { Label("\(customer.overdueCount) overdue", systemImage: "exclamationmark.triangle.fill").font(.caption).foregroundStyle(.red) }
                            if let phone = customer.phone, let url = URL(string: "tel:\(phone.filter { !$0.isWhitespace })") { Link(phone, destination: url) }
                        }.padding(.vertical, 5)
                    }
                }
            } else { ProgressView() }
            if let error { Text(error).foregroundStyle(.red) }
        }
        .navigationTitle("Customers")
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                Button { showingAssignment = true } label: { Image(systemName: "link") }.disabled(overview?.capabilities.business != true)
                Button { showingNew = true } label: { Image(systemName: "plus") }.disabled(overview?.capabilities.business != true)
            }
        }
        .task { await load() }.refreshable { await load() }
        .sheet(isPresented: $showingNew) { NavigationStack { NewCustomerView { showingNew = false; Task { await load() } } } }
        .sheet(isPresented: $showingAssignment) { NavigationStack { CustomerAssignmentView(customers: overview?.customers ?? []) { showingAssignment = false } } }
    }
    private func load() async { do { overview = try await api.overview(); error = nil } catch { self.error = error.localizedDescription } }
}

struct NewCustomerView: View {
    @EnvironmentObject private var api: APIClient
    @Environment(\.dismiss) private var dismiss
    let completed: () -> Void
    @State private var name = ""
    @State private var contact = ""
    @State private var email = ""
    @State private var phone = ""
    @State private var street = ""
    @State private var postalCode = ""
    @State private var city = ""
    @State private var country = "DE"
    @State private var notes = ""
    @State private var error: String?

    var body: some View {
        Form {
            Section("Customer") { TextField("Name", text: $name); TextField("Contact person", text: $contact); TextField("Email", text: $email).keyboardType(.emailAddress); TextField("Phone", text: $phone).keyboardType(.phonePad) }
            Section("Address") { TextField("Street", text: $street); TextField("Postal code", text: $postalCode); TextField("City", text: $city); TextField("Country code", text: $country).textInputAutocapitalization(.characters) }
            Section("Notes") { TextField("Notes", text: $notes, axis: .vertical).lineLimit(3...6) }
            if let error { Text(error).foregroundStyle(.red) }
        }
        .navigationTitle("New customer").navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }; ToolbarItem(placement: .confirmationAction) { Button("Save") { save() }.disabled(name.count < 2) } }
    }
    private func save() { Task { do { try await api.createCustomer(name: name, contactName: contact, email: email, phone: phone, street: street, postalCode: postalCode, city: city, country: country, notes: notes); completed(); dismiss() } catch { self.error = error.localizedDescription } } }
}

struct CustomerAssignmentView: View {
    @EnvironmentObject private var api: APIClient
    @Environment(\.dismiss) private var dismiss
    let customers: [ServiceCustomer]
    let completed: () -> Void
    @State private var assetId = ""
    @State private var customerId = ""
    @State private var error: String?

    var body: some View {
        Form {
            Picker("Pass", selection: $assetId) { ForEach(api.assets.filter { $0.archivedAt == nil }) { Text($0.name).tag($0.id) } }
            Picker("Customer", selection: $customerId) { Text("No assignment").tag(""); ForEach(customers) { Text($0.name).tag($0.id) } }
            if let error { Text(error).foregroundStyle(.red) }
        }
        .navigationTitle("Assign customer").navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }; ToolbarItem(placement: .confirmationAction) { Button("Save") { save() }.disabled(assetId.isEmpty) } }
        .onAppear { assetId = api.assets.first(where: { $0.archivedAt == nil })?.id ?? "" }
    }
    private func save() { Task { do { try await api.assignCustomer(assetId: assetId, customerId: customerId.isEmpty ? nil : customerId); completed(); dismiss() } catch { self.error = error.localizedDescription } } }
}

struct WorkspacesView: View {
    @EnvironmentObject private var api: APIClient
    @State private var overview: MobileOverview?
    @State private var showingNew = false
    @State private var error: String?

    var body: some View {
        List {
            if let overview {
                ForEach(overview.workspaces) { workspace in
                    Section {
                        LabeledContent("Type", value: workspaceKind(workspace.kind))
                        LabeledContent("Your role", value: workspace.role?.capitalized ?? "—")
                        ForEach(workspace.members ?? []) { member in
                            VStack(alignment: .leading, spacing: 2) { Text(member.name).font(.headline); Text("\(member.email) · \(member.role.capitalized)").font(.caption).foregroundStyle(.secondary) }
                        }
                        if workspace.kind != "PERSONAL" && (workspace.role == "OWNER" || workspace.role == "ADMIN") {
                            NavigationLink { InviteWorkspaceMemberView(workspace: workspace) } label: { Label("Invite member", systemImage: "person.badge.plus") }
                        }
                    } header: { Text(workspace.name) }
                }
            } else { ProgressView() }
            if let error { Text(error).foregroundStyle(.red) }
        }
        .navigationTitle("Workspaces")
        .toolbar { Button { showingNew = true } label: { Label("New workspace", systemImage: "plus") } }
        .task { await load() }.refreshable { await load() }
        .sheet(isPresented: $showingNew) { NavigationStack { NewWorkspaceView { showingNew = false; Task { await load() } } } }
    }
    private func load() async { do { overview = try await api.overview(); error = nil } catch { self.error = error.localizedDescription } }
}

struct InviteWorkspaceMemberView: View {
    @EnvironmentObject private var api: APIClient
    @Environment(\.dismiss) private var dismiss
    let workspace: Workspace
    @State private var email = ""
    @State private var role = "VIEWER"
    @State private var sent = false
    @State private var error: String?

    var body: some View {
        Form {
            Section("Invitation") {
                TextField("Email", text: $email).keyboardType(.emailAddress).textInputAutocapitalization(.never)
                Picker("Role", selection: $role) { Text("Administrator").tag("ADMIN"); Text("Editor").tag("EDITOR"); Text("Viewer").tag("VIEWER") }
            }
            if sent { Label("Invitation sent", systemImage: "checkmark.circle.fill").foregroundStyle(.green) }
            if let error { Text(error).foregroundStyle(.red) }
        }
        .navigationTitle(workspace.name).navigationBarTitleDisplayMode(.inline)
        .toolbar { Button("Send") { send() }.disabled(!email.contains("@") || sent) }
    }

    private func send() { Task { do { try await api.inviteWorkspaceMember(workspaceId: workspace.id, email: email, role: role); sent = true; error = nil } catch { self.error = error.localizedDescription } } }
}

struct ServiceAccessView: View {
    @EnvironmentObject private var api: APIClient
    let asset: Asset
    @State private var details: AssetDetailsEnvelope?
    @State private var showingInvite = false
    @State private var error: String?

    var body: some View {
        List {
            Section {
                Text("Grant a company or technician time-limited access to record service entries for this pass only.").foregroundStyle(.secondary)
            }
            Section("Active service partners") {
                if details?.serviceAccess?.grants.isEmpty != false { Text("No active service access.").foregroundStyle(.secondary) }
                ForEach(details?.serviceAccess?.grants ?? []) { grant in
                    VStack(alignment: .leading, spacing: 3) {
                        Text(grant.companyName ?? grant.name ?? grant.email ?? "—").font(.headline)
                        Text("\(grant.email ?? "") · \(grant.expiresAt)").font(.caption).foregroundStyle(.secondary)
                    }
                    .swipeActions { Button(role: .destructive) { revoke(grant) } label: { Label("Revoke", systemImage: "person.badge.minus") } }
                }
            }
            Section("Pending invitations") {
                if details?.serviceAccess?.invites.isEmpty != false { Text("No pending service invitations.").foregroundStyle(.secondary) }
                ForEach(details?.serviceAccess?.invites ?? []) { invite in
                    VStack(alignment: .leading, spacing: 3) { Text(invite.email).font(.headline); Text(invite.accessUntil).font(.caption).foregroundStyle(.secondary) }
                        .swipeActions { Button(role: .destructive) { revoke(invite) } label: { Label("Withdraw", systemImage: "xmark.circle") } }
                }
            }
            if let error { Text(error).foregroundStyle(.red) }
        }
        .navigationTitle("Service access")
        .toolbar { Button { showingInvite = true } label: { Label("Invite", systemImage: "person.badge.plus") } }
        .task { await load() }.refreshable { await load() }
        .sheet(isPresented: $showingInvite) { NavigationStack { InviteServicePartnerView(asset: asset) { showingInvite = false; Task { await load() } } } }
    }

    private func load() async { do { details = try await api.assetDetails(id: asset.id); error = nil } catch { self.error = error.localizedDescription } }
    private func revoke(_ grant: ServiceGrant) { Task { do { try await api.revokeServiceGrant(assetId: asset.id, userId: grant.userId); await load() } catch { self.error = error.localizedDescription } } }
    private func revoke(_ invite: ServiceInvite) { Task { do { try await api.revokeServiceInvite(assetId: asset.id, inviteId: invite.id); await load() } catch { self.error = error.localizedDescription } } }
}

struct InviteServicePartnerView: View {
    @EnvironmentObject private var api: APIClient
    @Environment(\.dismiss) private var dismiss
    let asset: Asset
    let completed: () -> Void
    @State private var email = ""
    @State private var accessDays = 30
    @State private var error: String?

    var body: some View {
        Form {
            Section("Service partner") {
                TextField("Email", text: $email).keyboardType(.emailAddress).textInputAutocapitalization(.never)
                Picker("Access duration", selection: $accessDays) { Text("1 day").tag(1); Text("7 days").tag(7); Text("30 days").tag(30); Text("90 days").tag(90); Text("1 year").tag(365) }
            }
            Text("The invitation is bound to this email address and this pass.").font(.footnote).foregroundStyle(.secondary)
            if let error { Text(error).foregroundStyle(.red) }
        }
        .navigationTitle("Invite service partner").navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }; ToolbarItem(placement: .confirmationAction) { Button("Send") { send() }.disabled(!email.contains("@")) } }
    }

    private func send() { Task { do { try await api.inviteServicePartner(assetId: asset.id, email: email, accessDays: accessDays); completed(); dismiss() } catch { self.error = error.localizedDescription } } }
}

struct NewWorkspaceView: View {
    @EnvironmentObject private var api: APIClient
    @Environment(\.dismiss) private var dismiss
    let completed: () -> Void
    @State private var name = ""
    @State private var kind = "HOUSEHOLD"
    @State private var error: String?
    var body: some View {
        Form {
            TextField("Name", text: $name)
            Picker("Type", selection: $kind) { Text("Household").tag("HOUSEHOLD"); Text("Team").tag("TEAM") }
            if let error { Text(error).foregroundStyle(.red) }
        }
        .navigationTitle("New workspace").navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }; ToolbarItem(placement: .confirmationAction) { Button("Save") { Task { do { try await api.createWorkspace(name: name, kind: kind); completed(); dismiss() } catch { self.error = error.localizedDescription } } }.disabled(name.count < 2) } }
    }
}

struct ProfileView: View {
    @EnvironmentObject private var api: APIClient
    @State private var name = ""
    @State private var email = ""
    @State private var accountType = "PRIVATE"
    @State private var company = ""
    @State private var title = ""
    @State private var saved = false
    @State private var error: String?

    var body: some View {
        Form {
            Section("Personal details") { TextField("Name", text: $name); TextField("Email", text: $email).keyboardType(.emailAddress).textInputAutocapitalization(.never) }
            Section("Use") {
                Picker("Profile type", selection: $accountType) { Text("Private").tag("PRIVATE"); Text("Company / technician").tag("PROFESSIONAL") }
                if accountType == "PROFESSIONAL" { TextField("Company", text: $company); TextField("Role / qualification", text: $title) }
            }
            if saved { Label("Profile saved", systemImage: "checkmark.circle.fill").foregroundStyle(.green) }
            if let error { Text(error).foregroundStyle(.red) }
        }
        .navigationTitle("Profile")
        .toolbar { Button("Save") { save() }.disabled(name.count < 2 || !email.contains("@")) }
        .onAppear { let user = api.user; name = user?.name ?? ""; email = user?.email ?? ""; accountType = user?.accountType ?? "PRIVATE"; company = user?.companyName ?? ""; title = user?.professionalTitle ?? "" }
    }
    private func save() { Task { do { try await api.updateProfile(name: name, email: email, accountType: accountType, companyName: company, professionalTitle: title); saved = true; error = nil } catch { self.error = error.localizedDescription } } }
}

struct SettingsView: View {
    @EnvironmentObject private var api: APIClient
    @State private var reminderDays = 30
    @State private var saved = false
    @State private var error: String?

    var body: some View {
        List {
            Section("Reminders") {
                Picker("Reminder window", selection: $reminderDays) { ForEach([7,14,30,60,90,180], id: \.self) { Text("\($0) days").tag($0) } }
                Button("Save reminder settings") { save() }
                if saved { Label("Settings saved", systemImage: "checkmark.circle.fill").foregroundStyle(.green) }
            }
            Section("Account") { NavigationLink("Account & plan") { AccountView() }; NavigationLink("Edit profile") { ProfileView() } }
            Section("Legal") {
                Link("Privacy policy", destination: URL(string: "https://navopass.de/datenschutz")!)
                Link("Terms of use", destination: URL(string: "https://navopass.de/nutzungsbedingungen")!)
            }
            if let error { Text(error).foregroundStyle(.red) }
        }
        .navigationTitle("Settings")
        .onAppear { reminderDays = api.user?.reminderDays ?? 30 }
    }
    private func save() { Task { do { try await api.updateReminder(days: reminderDays); saved = true; error = nil } catch { self.error = error.localizedDescription } } }
}

struct QRLabelsView: View {
    @EnvironmentObject private var api: APIClient
    var body: some View {
        List(api.assets.filter { $0.archivedAt == nil }) { asset in
            NavigationLink { QRCodeView(asset: asset) } label: {
                Label { VStack(alignment: .leading) { Text(asset.name); Text(asset.publicId).font(.caption).foregroundStyle(.secondary) } } icon: { Image(systemName: "qrcode") }
            }
        }
        .navigationTitle("QR labels")
    }
}

private struct SectionCard<Content: View>: View {
    let title: LocalizedStringKey
    let icon: String
    let content: Content

    init(title: LocalizedStringKey, icon: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.icon = icon
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label(title, systemImage: icon).font(.headline)
            Divider()
            content
        }.navoCard()
    }
}

func relativeDeadline(_ days: Int) -> String {
    if days < 0 { return String(localized: "\(abs(days)) days overdue") }
    if days == 0 { return String(localized: "Due today") }
    if days == 1 { return String(localized: "Due tomorrow") }
    return String(localized: "Due in \(days) days")
}

private func workspaceKind(_ value: String) -> String {
    if value == "PERSONAL" { return String(localized: "Personal") }
    if value == "TEAM" { return String(localized: "Team") }
    return String(localized: "Household")
}

private func jobStatus(_ value: String) -> String {
    if value == "IN_PROGRESS" { return String(localized: "In progress") }
    if value == "DONE" { return String(localized: "Done") }
    if value == "CANCELLED" { return String(localized: "Cancelled") }
    return String(localized: "Open")
}

private func formattedDateTime(_ value: String?) -> String? {
    guard let value, let date = NavoDate.isoFormatter.date(from: value) else { return nil }
    return date.formatted(date: .abbreviated, time: .shortened)
}
