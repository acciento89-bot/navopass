import AVFoundation
import SwiftUI
import UIKit

struct ScannerScreen: View {
    @EnvironmentObject private var api: APIClient
    @State private var scannedPass: ScannedPass?
    @State private var isLoading = false
    @State private var error: String?
    var body: some View {
        ZStack {
            NavoBackground()
            ScrollView {
                VStack(spacing: 22) {
                    PageHeader(eyebrow: "On site", title: "Scan QR code", subtitle: "Open a NavoPass directly at the asset.")
                    ZStack {
                        QRScannerView { value in
                            guard let url = URL(string: value), url.host == "navopass.de" || url.host == "www.navopass.de",
                                  let marker = url.pathComponents.firstIndex(of: "p"), url.pathComponents.indices.contains(marker + 1) else { return }
                            load(publicId: url.pathComponents[marker + 1])
                        }
                        .clipShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
                        .overlay { RoundedRectangle(cornerRadius: 26, style: .continuous).stroke(.white.opacity(0.18)) }
                        Image(systemName: "viewfinder").resizable().scaledToFit().foregroundStyle(.white.opacity(0.78))
                            .frame(width: 150, height: 150).allowsHitTesting(false)
                    }
                    .aspectRatio(1.05, contentMode: .fit)
                    .shadow(color: .black.opacity(0.16), radius: 24, y: 12)
                    Label("Point the camera at a NavoPass QR code.", systemImage: "qrcode.viewfinder")
                        .font(.subheadline).foregroundStyle(.secondary).frame(maxWidth: .infinity, alignment: .leading).navoCard(padding: 15)
                    if isLoading { ProgressView("Loading pass…").frame(maxWidth: .infinity).navoCard(padding: 15) }
                    if let error { Label(error, systemImage: "exclamationmark.triangle.fill").foregroundStyle(.red).frame(maxWidth: .infinity, alignment: .leading).navoCard(padding: 15) }
                }
                .navoPageMargins().padding(.top, 18).padding(.bottom, 110)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .sheet(item: $scannedPass) { item in NavigationStack { ScannedPassView(details: item.details) } }
    }

    private func load(publicId: String) {
        guard !isLoading else { return }
        isLoading = true; error = nil
        Task {
            do { scannedPass = ScannedPass(details: try await api.publicAssetDetails(publicId: publicId)) }
            catch { self.error = error.localizedDescription }
            isLoading = false
        }
    }
}

private struct ScannedPass: Identifiable {
    let id = UUID()
    let details: AssetDetailsEnvelope
}

private struct ScannedPassView: View {
    @Environment(\.dismiss) private var dismiss
    let details: AssetDetailsEnvelope

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 6) {
                    Text(details.asset.category).font(.caption.bold()).foregroundStyle(NavoTheme.accent).textCase(.uppercase)
                    Text(details.asset.name).font(.title2.bold())
                    Text([details.asset.manufacturer, details.asset.model].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " · ")).foregroundStyle(.secondary)
                }.padding(.vertical, 6)
            }
            Section("Product") {
                if let serial = details.asset.serialNumber, !serial.isEmpty { LabeledContent("Serial number", value: serial) }
                if let location = details.asset.location, !location.isEmpty { LabeledContent("Location", value: location) }
                if let warranty = details.asset.warrantyUntil { LabeledContent("Warranty until", value: warranty) }
                if let service = details.asset.nextServiceDate { LabeledContent("Next service", value: service) }
            }
            Section("Shared history") {
                if details.events.isEmpty { Text("No shared history entries.").foregroundStyle(.secondary) }
                ForEach(details.events) { event in VStack(alignment: .leading, spacing: 3) { Text(event.title).font(.headline); Text(event.eventDate).font(.caption).foregroundStyle(.secondary); if let description = event.description { Text(description) } } }
            }
            Section("Shared documents") {
                if details.documents.isEmpty { Text("No shared documents.").foregroundStyle(.secondary) }
                ForEach(details.documents) { document in
                    if let url = URL(string: document.url, relativeTo: URL(string: "https://navopass.de")) { Link(document.title, destination: url) }
                }
            }
        }
        .navigationTitle("NavoPass").navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
    }
}

struct QRScannerView: UIViewRepresentable {
    let onCode: (String) -> Void
    func makeCoordinator() -> Coordinator { Coordinator(onCode: onCode) }
    func makeUIView(context: Context) -> PreviewView { let view = PreviewView(); context.coordinator.start(in: view); return view }
    func updateUIView(_ uiView: PreviewView, context: Context) {}

    final class Coordinator: NSObject, AVCaptureMetadataOutputObjectsDelegate {
        private let session = AVCaptureSession()
        private let onCode: (String) -> Void
        private var lastValue: String?
        init(onCode: @escaping (String) -> Void) { self.onCode = onCode }
        func start(in view: PreviewView) {
            guard let camera = AVCaptureDevice.default(for: .video), let input = try? AVCaptureDeviceInput(device: camera), session.canAddInput(input) else { return }
            session.addInput(input)
            let output = AVCaptureMetadataOutput()
            guard session.canAddOutput(output) else { return }
            session.addOutput(output); output.setMetadataObjectsDelegate(self, queue: .main); output.metadataObjectTypes = [.qr]
            view.layerView.session = session
            Task.detached { [session] in session.startRunning() }
        }
        func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput metadataObjects: [AVMetadataObject], from connection: AVCaptureConnection) {
            guard let code = metadataObjects.first as? AVMetadataMachineReadableCodeObject, let value = code.stringValue, value != lastValue else { return }
            lastValue = value; onCode(value)
        }
    }
}

final class PreviewView: UIView {
    override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
    var layerView: AVCaptureVideoPreviewLayer { layer as! AVCaptureVideoPreviewLayer }
    override init(frame: CGRect) { super.init(frame: frame); layerView.videoGravity = .resizeAspectFill }
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
}
