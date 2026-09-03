import AVFoundation
import SwiftUI
import UIKit

struct ScannerScreen: View {
    @State private var scannedURL: URL?
    var body: some View {
        ZStack {
            NavoBackground()
            ScrollView {
                VStack(spacing: 22) {
                    PageHeader(eyebrow: "On site", title: "Scan QR code", subtitle: "Open a NavoPass directly at the asset.")
                    ZStack {
                        QRScannerView { value in
                            guard let url = URL(string: value), url.host == "navopass.de" || url.host == "www.navopass.de" else { return }
                            scannedURL = url
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
                    if let scannedURL {
                        Link(destination: scannedURL) {
                            Label("Open pass", systemImage: "arrow.up.right.square.fill").font(.headline).frame(maxWidth: .infinity, minHeight: 52)
                        }.buttonStyle(.borderedProminent).buttonBorderShape(.roundedRectangle(radius: 17))
                    }
                }
                .navoPageMargins().padding(.top, 18).padding(.bottom, 110)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
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
