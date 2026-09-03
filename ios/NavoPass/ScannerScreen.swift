import AVFoundation
import SwiftUI
import UIKit

struct ScannerScreen: View {
    @State private var scannedURL: URL?
    var body: some View {
        VStack(spacing: 20) {
            QRScannerView { value in
                guard let url = URL(string: value), url.host == "navopass.de" || url.host == "www.navopass.de" else { return }
                scannedURL = url
            }
            .clipShape(RoundedRectangle(cornerRadius: 24)).padding()
            Text("Point the camera at a NavoPass QR code.").foregroundStyle(.secondary)
            if let scannedURL { Link("Open pass", destination: scannedURL).buttonStyle(.borderedProminent) }
        }
        .navigationTitle("Scan QR code")
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
