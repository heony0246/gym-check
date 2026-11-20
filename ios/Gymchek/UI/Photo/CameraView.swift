import Photos
import PhotosUI
import SwiftUI

/// 오운완 camera: the card (date, this year's count, exercises, headline) sits live over
/// the viewfinder, and the shot is saved exactly as it looked.
struct CameraView: View {
  @Environment(Store.self) private var store
  @Environment(\.dismiss) private var dismiss
  @Environment(\.openURL) private var openURL
  /// The day the camera opened for (today, or a past day from the calendar).
  let date: String
  /// A library photo taken on another day moves the card to that day.
  @State private var photoDay: String?

  @State private var camera = CameraController()
  @State private var access: Bool?
  @State private var shot: Shot?
  @State private var picked: PhotosPickerItem?
  @State private var busy = false
  @State private var flash = false
  @State private var front = false

  struct Shot: Identifiable {
    let id = UUID()
    let image: UIImage
    /// The day it was really taken: now for the camera, the EXIF date for a library photo
    /// (nil when the file doesn't say). A crew proof needs it to match the card's day.
    let takenOn: String?
  }

  private var story: Bool { store.data.photoFormat == "story" }
  /// The day on the card and in the calendar.
  private var day: String { photoDay ?? date }

  var body: some View {
    VStack(spacing: 12) {
      topBar
      // Takes whatever height is left (a 9:16 story is taller than some screens allow).
      viewfinder.frame(maxWidth: .infinity, maxHeight: .infinity).layoutPriority(-1)
      bottomBar
    }
    .background(Color.black.ignoresSafeArea())
    .preferredColorScheme(.dark)
    .statusBarHidden()
    .task {
      guard CameraController.isAvailable else { access = false; return }
      access = await CameraController.requestAccess()
      if access == true { camera.start() }
    }
    .onDisappear { camera.stop() }
    .onChange(of: picked) { _, item in
      guard let item else { return }
      Task { await load(item) }
    }
    // The result shows over the camera in the same screen (a second full-screen cover
    // on top of this one loses the top safe area and slides under the Dynamic Island).
    .overlay {
      if let s = shot {
        PhotoResultView(date: day, shot: s, story: story,
                        moveBack: photoDay.map { _ in (date == Day.key(Day.today()) ? "오늘로 바꾸기" : "\(monthDay(date))로 바꾸기", { photoDay = nil }) }) { saved in
          withAnimation(.easeOut(duration: 0.2)) { shot = nil }
          if saved { dismiss() }
        }
        .transition(.opacity)
      }
    }
    .animation(.easeOut(duration: 0.2), value: shot?.id)
  }

  // MARK: Parts

  private var topBar: some View {
    HStack {
      Button { dismiss() } label: {
        Image(systemName: "xmark").font(.system(size: 17, weight: .bold)).foregroundStyle(.white)
          .frame(width: 44, height: 44).background(.white.opacity(0.12), in: .circle)
      }
      .accessibilityLabel("닫기")
      Spacer()
      HStack(spacing: 2) {
        formatButton("기본", "orig")
        formatButton("스토리", "story")
      }
      .padding(3)
      .background(.white.opacity(0.12), in: .capsule)
      Spacer()
      Color.clear.frame(width: 44, height: 44)
    }
    .padding(.horizontal, 16)
    .padding(.top, 8)
  }

  private func formatButton(_ label: String, _ value: String) -> some View {
    let on = store.data.photoFormat == value
    return Button { withAnimation(.snappy(duration: 0.25)) { store.setPhotoFormat(value) } } label: {
      Text(label).font(.system(size: 13, weight: .heavy))
        .foregroundStyle(on ? Color.onVolt : .white)
        .padding(.horizontal, 14).frame(height: 32)
        .background(on ? Color.volt : .clear, in: .capsule)
    }
    .buttonStyle(.plain)
    .accessibilityAddTraits(on ? .isSelected : [])
  }

  private var viewfinder: some View {
    ZStack {
      if access == true {
        CameraPreview(session: camera.session)
      } else {
        noCamera
      }
      CardOverlay(info: store.cardInfo(for: day), story: story)
      if flash { Color.white.transition(.opacity) }
    }
    .aspectRatio(story ? 9.0 / 16.0 : 3.0 / 4.0, contentMode: .fit)
    .clipShape(.rect(cornerRadius: 18))
  }

  /// No camera (Simulator), or access was refused: the card still shows, over a plain backdrop.
  private var noCamera: some View {
    ZStack {
      LinearGradient(colors: [Color(hex: 0x2B2B2F), Color(hex: 0x151517)], startPoint: .top, endPoint: .bottom)
      if let access {
        VStack(spacing: 10) {
          Image(systemName: "camera.fill").font(.system(size: 28)).foregroundStyle(Color.muted)
          Text(CameraController.isAvailable && !access ? "카메라 권한이 꺼져 있어요" : "이 기기에선 카메라를 쓸 수 없어요")
            .font(.system(size: 15, weight: .bold)).foregroundStyle(.white)
          if CameraController.isAvailable && !access {
            Button("설정에서 허용하기") { if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) } }
              .font(.system(size: 14, weight: .heavy)).foregroundStyle(Color.volt)
          } else {
            Text("왼쪽 아래에서 사진을 골라 주세요").font(.system(size: 13, weight: .semibold)).foregroundStyle(Color.muted)
          }
        }
        .padding(.bottom, 80)
      }
    }
  }

  private var bottomBar: some View {
    HStack {
      PhotosPicker(selection: $picked, matching: .images) {
        Image(systemName: "photo.on.rectangle").font(.system(size: 20, weight: .semibold)).foregroundStyle(.white)
          .frame(width: 52, height: 52).background(.white.opacity(0.12), in: .circle)
      }
      .accessibilityLabel("사진첩에서 고르기")
      Spacer()
      Button(action: shoot) {
        ZStack {
          Circle().strokeBorder(.white, lineWidth: 4).frame(width: 78, height: 78)
          Circle().fill(.white).frame(width: 64, height: 64).scaleEffect(busy ? 0.85 : 1)
        }
      }
      .buttonStyle(PressScale(scale: 0.92))
      .disabled(access != true || busy)
      .opacity(access == true ? 1 : 0.35)
      .accessibilityLabel("찍기")
      Spacer()
      Button {
        camera.flip { position in Task { @MainActor in front = position == .front } }
      } label: {
        Image(systemName: "arrow.triangle.2.circlepath").font(.system(size: 20, weight: .semibold)).foregroundStyle(.white)
          .frame(width: 52, height: 52).background(.white.opacity(0.12), in: .circle)
          .rotation3DEffect(.degrees(front ? 180 : 0), axis: (x: 0, y: 1, z: 0))
      }
      .disabled(access != true)
      .opacity(access == true ? 1 : 0.35)
      .accessibilityLabel("카메라 전환")
    }
    .padding(.horizontal, 28)
    .padding(.bottom, 12)
    .sensoryFeedback(.impact(weight: .medium), trigger: busy) { _, new in new }
  }

  // MARK: Actions

  private func shoot() {
    busy = true
    withAnimation(.easeOut(duration: 0.08)) { flash = true }
    withAnimation(.easeIn(duration: 0.25).delay(0.08)) { flash = false }
    camera.capture { data in
      Task { @MainActor in
        busy = false
        if let data, let image = UIImage(data: data) { shot = Shot(image: image, takenOn: Day.key(Day.today())) }
      }
    }
  }

  private func load(_ item: PhotosPickerItem) async {
    defer { picked = nil }
    guard let data = try? await item.loadTransferable(type: Data.self), let image = UIImage(data: data) else { return }
    let taken = PhotoDate.day(of: data)
    // Forgot to shoot that day but have a photo from it: it goes to the day it was taken.
    if let taken, taken <= Day.key(Day.today()), taken != day {
      photoDay = taken
    }
    shot = Shot(image: image, takenOn: taken)
  }
}

/// The finished card: save it (to Photos and the app, and to the crews if it's today's) or share it.
struct PhotoResultView: View {
  @Environment(Store.self) private var store
  let date: String
  let shot: CameraView.Shot
  let story: Bool
  /// When the photo's own date moved the card: a way back to the day the camera opened for.
  var moveBack: (label: String, action: () -> Void)?
  let onClose: (_ saved: Bool) -> Void

  @State private var jpeg: Data?
  @State private var shareURL: URL?
  @State private var saving = false
  @State private var message: String?

  private var isToday: Bool { date == Day.key(Day.today()) }

  var body: some View {
    VStack(spacing: 12) {
      // The card shrinks to whatever height is left, so a tall story never pushes the buttons off screen.
      Group {
        if let jpeg, let image = UIImage(data: jpeg) {
          Image(uiImage: image).resizable().scaledToFit()
            .clipShape(.rect(cornerRadius: 18))
        } else {
          ProgressView().tint(.white)
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .layoutPriority(-1) // sized last: gets only the height the rest leaves
      dayLine
      if let message {
        Text(message).font(.system(size: 14, weight: .bold)).foregroundStyle(Color.volt).multilineTextAlignment(.center)
          .transition(.opacity)
      }
      HStack(spacing: 10) {
        Button { onClose(false) } label: { secondary("다시 찍기", "arrow.counterclockwise") }
        if let shareURL {
          ShareLink(item: shareURL) { secondary("공유하기", "square.and.arrow.up") }
        } else {
          secondary("공유하기", "square.and.arrow.up").opacity(0.4)
        }
      }
      .buttonStyle(PressScale(scale: 0.98))
      .disabled(saving || message != nil)
      Button(action: save) {
        Text(saving ? "저장 중…" : "저장").font(.system(size: 17, weight: .heavy)).foregroundStyle(Color.onVolt)
          .frame(maxWidth: .infinity, minHeight: 56).background(Color.volt, in: .rect(cornerRadius: 16))
      }
      .buttonStyle(PressScale(scale: 0.98))
      .disabled(jpeg == nil || saving || message != nil)
    }
    .padding(.horizontal, 18)
    .padding(.top, 12)
    .padding(.bottom, 8)
    .background(Color.black.ignoresSafeArea())
    // Recomposed when the day's parts change.
    .task(id: store.cardInfo(for: date)) {
      let data = CardComposer.compose(shot.image, info: store.cardInfo(for: date), story: story)
      jpeg = data
      if let data {
        let url = FileManager.default.temporaryDirectory.appending(path: "owoonwan-\(date).jpg")
        if (try? data.write(to: url, options: .atomic)) != nil { shareURL = url }
      }
    }
  }

  /// Which day this goes to (said out loud when it's not today), and that day's parts to tick.
  private var dayLine: some View {
    VStack(spacing: 8) {
      if !isToday || moveBack != nil {
        HStack(spacing: 10) {
          Text(shot.takenOn == date ? "사진 찍은 날 \(longDay(date))로 올려요" : "\(longDay(date)) 오운완으로 저장돼요")
            .font(.system(size: 13, weight: .bold))
            .foregroundStyle(Color.volt)
          if let moveBack {
            Button(moveBack.label, action: moveBack.action)
              .font(.system(size: 13, weight: .bold))
              .foregroundStyle(.white.opacity(0.7))
              .underline()
          }
        }
      }
      ScrollView(.horizontal, showsIndicators: false) {
        HStack(spacing: 6) {
          ForEach(store.data.parts) { part in
            let on = store.parts(on: date).contains(part.id)
            Button { _ = store.toggle(part.id, on: date) } label: {
              Text(part.name).font(.system(size: 13, weight: .bold))
                .foregroundStyle(on ? Color.onVolt : .white)
                .padding(.horizontal, 12).frame(height: 32)
                .background(on ? Color.volt : .white.opacity(0.12), in: .capsule)
            }
            .buttonStyle(.plain)
            .accessibilityAddTraits(on ? .isSelected : [])
          }
        }
      }
      .disabled(saving || message != nil)
    }
  }

  private func secondary(_ title: String, _ symbol: String) -> some View {
    Label(title, systemImage: symbol)
      .font(.system(size: 15, weight: .bold))
      .foregroundStyle(.white)
      .frame(maxWidth: .infinity, minHeight: 50)
      .background(.white.opacity(0.12), in: .rect(cornerRadius: 14))
  }

  private func save() {
    guard let jpeg else { return }
    saving = true
    Task {
      let inLibrary = await PhotoLibrary.save(jpeg)
      var text = await store.savePhoto(jpeg, for: date, takenOn: shot.takenOn)
      if !inLibrary { text += "\n사진첩 저장은 권한이 없어서 못 했어요" }
      saving = false
      withAnimation { message = text }
      try? await Task.sleep(for: .seconds(inLibrary ? 1.3 : 2.4))
      onClose(true)
    }
  }
}

nonisolated enum PhotoLibrary {
  /// Adds the JPEG to Photos (asks for add-only access the first time).
  static func save(_ jpeg: Data) async -> Bool {
    let status = await PHPhotoLibrary.requestAuthorization(for: .addOnly)
    guard status == .authorized || status == .limited else { return false }
    do {
      try await PHPhotoLibrary.shared().performChanges {
        PHAssetCreationRequest.forAsset().addResource(with: .photo, data: jpeg, options: nil)
      }
      return true
    } catch {
      return false
    }
  }
}

nonisolated enum PhotoDate {
  /// The day a photo was taken, from its EXIF ("2026-11-20"), if it says.
  static func day(of data: Data) -> String? {
    guard let source = CGImageSourceCreateWithData(data as CFData, nil),
          let props = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
          let exif = props[kCGImagePropertyExifDictionary] as? [CFString: Any],
          let original = exif[kCGImagePropertyExifDateTimeOriginal] as? String,
          original.count >= 10 else { return nil }
    return String(original.prefix(10)).replacingOccurrences(of: ":", with: "-")
  }
}
