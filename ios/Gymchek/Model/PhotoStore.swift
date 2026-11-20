import UIKit

/// 오운완 photos on this phone: one finished JPEG per day plus a small square thumbnail,
/// in Application Support/photos (the same "one per date" model as the web app).
nonisolated enum PhotoStore {
  private static var dir: URL { URL.applicationSupportDirectory.appending(path: "photos", directoryHint: .isDirectory) }
  private static func full(_ key: String) -> URL { dir.appending(path: "\(key).jpg") }
  private static func thumb(_ key: String) -> URL { dir.appending(path: "\(key).thumb.jpg") }

  static func keys() -> Set<String> {
    let names = (try? FileManager.default.contentsOfDirectory(atPath: dir.path(percentEncoded: false))) ?? []
    return Set(names.compactMap { name in
      guard name.hasSuffix(".jpg"), !name.hasSuffix(".thumb.jpg") else { return nil }
      let key = String(name.dropLast(4))
      return Day.date(key) == nil ? nil : key
    })
  }

  static func save(_ jpeg: Data, for key: String) throws {
    try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    try jpeg.write(to: full(key), options: .atomic)
    if let image = UIImage(data: jpeg), let t = makeThumb(image) { try? t.write(to: thumb(key), options: .atomic) }
  }

  static func data(_ key: String) -> Data? { try? Data(contentsOf: full(key)) }
  static func image(_ key: String) -> UIImage? { data(key).flatMap(UIImage.init(data:)) }
  static func thumbnail(_ key: String) -> UIImage? { (try? Data(contentsOf: thumb(key))).flatMap(UIImage.init(data:)) }
  static func fileURL(_ key: String) -> URL { full(key) }

  static func delete(_ key: String) {
    try? FileManager.default.removeItem(at: full(key))
    try? FileManager.default.removeItem(at: thumb(key))
  }

  /// 240px square, a little above centre (where faces usually are).
  private static func makeThumb(_ image: UIImage) -> Data? {
    let w = image.size.width, h = image.size.height
    let s = min(w, h)
    guard s > 0 else { return nil }
    let side: CGFloat = 240
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    return UIGraphicsImageRenderer(size: CGSize(width: side, height: side), format: format).jpegData(withCompressionQuality: 0.8) { _ in
      let k = side / s
      image.draw(in: CGRect(x: -(w - s) / 2 * k, y: -(h - s) * 0.35 * k, width: w * k, height: h * k))
    }
  }

  /// A smaller copy for the crew proof (longest side 1440).
  static func scaled(_ jpeg: Data, maxSide: CGFloat, quality: CGFloat) -> Data? {
    guard let image = UIImage(data: jpeg) else { return nil }
    let k = min(1, maxSide / max(image.size.width, image.size.height))
    let size = CGSize(width: (image.size.width * k).rounded(), height: (image.size.height * k).rounded())
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    return UIGraphicsImageRenderer(size: size, format: format).jpegData(withCompressionQuality: quality) { _ in
      image.draw(in: CGRect(origin: .zero, size: size))
    }
  }
}
