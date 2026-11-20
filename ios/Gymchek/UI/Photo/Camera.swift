import AVFoundation
import SwiftUI

/// The camera session. All AVFoundation work runs on its own serial queue; results come
/// back through the completion handlers.
nonisolated final class CameraController: NSObject, @unchecked Sendable, AVCapturePhotoCaptureDelegate {
  let session = AVCaptureSession()
  private let queue = DispatchQueue(label: "kr.gymchek.camera")
  private let output = AVCapturePhotoOutput()
  private var input: AVCaptureDeviceInput?
  private var configured = false
  private(set) var position: AVCaptureDevice.Position = .back
  private var finish: (@Sendable (Data?) -> Void)?

  /// False in the Simulator and on devices without a camera.
  static var isAvailable: Bool { AVCaptureDevice.default(for: .video) != nil }

  static func requestAccess() async -> Bool {
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized: return true
    case .notDetermined: return await AVCaptureDevice.requestAccess(for: .video)
    default: return false
    }
  }

  func start() {
    queue.async { [self] in
      if !configured { configure(position) }
      if !session.isRunning { session.startRunning() }
    }
  }

  func stop() {
    queue.async { [self] in if session.isRunning { session.stopRunning() } }
  }

  func flip(_ done: @escaping @Sendable (AVCaptureDevice.Position) -> Void) {
    queue.async { [self] in
      let next: AVCaptureDevice.Position = position == .back ? .front : .back
      configure(next)
      done(position)
    }
  }

  private func configure(_ wanted: AVCaptureDevice.Position) {
    guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: wanted),
          let newInput = try? AVCaptureDeviceInput(device: device) else { return }
    session.beginConfiguration()
    session.sessionPreset = .photo
    if let input { session.removeInput(input) }
    if session.canAddInput(newInput) {
      session.addInput(newInput)
      input = newInput
      position = wanted
    } else if let input {
      session.addInput(input)
    }
    if !configured, session.canAddOutput(output) {
      session.addOutput(output)
      output.maxPhotoQualityPrioritization = .quality
    }
    session.commitConfiguration()
    configured = true
  }

  /// Takes a portrait photo; a selfie is saved mirrored, the way the viewfinder showed it.
  func capture(_ done: @escaping @Sendable (Data?) -> Void) {
    queue.async { [self] in
      guard session.isRunning else { done(nil); return }
      if let connection = output.connection(with: .video) {
        if connection.isVideoRotationAngleSupported(90) { connection.videoRotationAngle = 90 }
        if connection.isVideoMirroringSupported {
          connection.automaticallyAdjustsVideoMirroring = false
          connection.isVideoMirrored = position == .front
        }
      }
      let settings = AVCapturePhotoSettings(format: [AVVideoCodecKey: AVVideoCodecType.jpeg])
      settings.photoQualityPrioritization = .balanced
      finish = done
      output.capturePhoto(with: settings, delegate: self)
    }
  }

  func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
    let data = error == nil ? photo.fileDataRepresentation() : nil
    queue.async { [self] in
      finish?(data)
      finish = nil
    }
  }
}

/// The live viewfinder, filling its frame (cropped the same way the saved photo is).
struct CameraPreview: UIViewRepresentable {
  let session: AVCaptureSession

  final class PreviewView: UIView {
    override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
    var previewLayer: AVCaptureVideoPreviewLayer { layer as! AVCaptureVideoPreviewLayer }
  }

  func makeUIView(context: Context) -> PreviewView {
    let view = PreviewView()
    view.backgroundColor = .black
    view.previewLayer.session = session
    view.previewLayer.videoGravity = .resizeAspectFill
    return view
  }

  func updateUIView(_ uiView: PreviewView, context: Context) {}
}
