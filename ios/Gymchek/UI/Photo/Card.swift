import SwiftUI

/// What the 오운완 card writes on the photo (same layout as the web app's canvas).
struct CardInfo: Equatable {
  /// "2026.11.20 FRI"
  let dateLine: String
  /// Gym days this year up to that date, "30/365".
  let badge: String
  /// "CHEST & BACK DAY"
  let headline: String
  /// Each logged exercise: short name, top set (+ "· 4세트").
  let lifts: [(name: String, best: String)]

  static func == (a: CardInfo, b: CardInfo) -> Bool {
    a.dateLine == b.dateLine && a.badge == b.badge && a.headline == b.headline
      && a.lifts.map(\.name) == b.lifts.map(\.name) && a.lifts.map(\.best) == b.lifts.map(\.best)
  }

  private static let dayEN = ["chest": "CHEST", "back": "BACK", "legs": "LEG", "arms": "ARM", "shoulders": "SHOULDER", "abs": "ABS", "cardio": "CARDIO"]

  /// "CHEST DAY", "CHEST & BACK DAY", "CHEST · BACK · ARM DAY"; custom parts use their own name.
  static func headline(_ parts: [Part]) -> String {
    if parts.isEmpty { return "WORKOUT DONE" }
    if parts.count > 4 { return "FULL BODY DAY" }
    let words = parts.map { dayEN[$0.id] ?? $0.name }
    return words.joined(separator: parts.count == 2 ? " & " : " · ") + " DAY"
  }
}

extension Store {
  func cardInfo(for key: String) -> CardInfo {
    let date = Day.date(key) ?? Day.today()
    let c = Day.calendar.dateComponents([.year, .month, .day, .weekday], from: date)
    let year = c.year ?? 0
    let done = Set(parts(on: key))
    let parts = data.parts.filter { done.contains($0.id) }
    let yearCount = data.records.filter { $0.key.hasPrefix("\(year)-") && $0.key <= key && !$0.value.isEmpty }.count
    let lifts: [(name: String, best: String)] = logs(on: key).compactMap { entry in
      guard let ex = exercise(entry.ex) else { return nil }
      let best = SetMath.best(ex, entry.sets).map { SetMath.text(ex.kind, $0) } ?? ""
      return (ex.shortName, best + (entry.sets.count > 1 ? " · \(entry.sets.count)세트" : ""))
    }
    return CardInfo(
      dateLine: String(format: "%04d.%02d.%02d %@", year, c.month ?? 0, c.day ?? 0, Day.weekdaysEN[(c.weekday ?? 1) - 1]),
      badge: "\(yearCount)/\(Day.daysInYear(year))",
      headline: CardInfo.headline(parts),
      lifts: lifts)
  }
}

/// The card's text and shading, drawn for any frame size. The camera shows it live over
/// the viewfinder and the saved photo gets the very same drawing at full size.
struct CardOverlay: View {
  let info: CardInfo
  let story: Bool

  var body: some View {
    Canvas { ctx, size in CardPainter.draw(info, story: story, in: &ctx, size: size) }
      .allowsHitTesting(false)
      .accessibilityHidden(true)
  }
}

enum CardPainter {
  private static let volt = Color(hex: 0xD4FF3F)

  private static func display(_ size: CGFloat, _ weight: Font.Weight = .heavy) -> Font {
    .system(size: size, weight: weight).width(.compressed).italic()
  }

  static func draw(_ info: CardInfo, story: Bool, in ctx: inout GraphicsContext, size: CGSize) {
    let W = size.width, H = size.height
    guard W > 0, H > 0 else { return }
    let u = min(W, H) / 100
    let m = 6 * u
    // Instagram lays its own UI over the top and bottom of a story; keep clear of it.
    let top = story ? (H * 0.11).rounded() : m
    let bottom = story ? (H * 0.13).rounded() : m

    // Darken top and bottom so the text reads on any photo.
    ctx.fill(Path(CGRect(x: 0, y: H * 0.45, width: W, height: H * 0.55)),
             with: .linearGradient(Gradient(colors: [.black.opacity(0), .black.opacity(0.75)]),
                                   startPoint: CGPoint(x: 0, y: H * 0.45), endPoint: CGPoint(x: 0, y: H)))
    let topShade = max(H * 0.2, top + 22 * u)
    ctx.fill(Path(CGRect(x: 0, y: 0, width: W, height: topShade)),
             with: .linearGradient(Gradient(colors: [.black.opacity(0.45), .black.opacity(0)]),
                                   startPoint: .zero, endPoint: CGPoint(x: 0, y: topShade)))

    let badgeH = 7.6 * u
    let rowY = top + badgeH / 2
    let unbounded = CGSize(width: CGFloat.greatestFiniteMagnitude, height: .greatestFiniteMagnitude)

    // Top left: the date (with a soft shadow, like the rest of the white text).
    ctx.drawLayer { layer in
      layer.addFilter(.shadow(color: .black.opacity(0.35), radius: u))
      layer.draw(Text(info.dateLine).font(display(5.6 * u, .heavy)).foregroundStyle(.white), at: CGPoint(x: m, y: rowY), anchor: .leading)
    }

    // Top right: this year's count in a lime pill.
    let badgeText = ctx.resolve(Text(info.badge).font(display(5.4 * u, .heavy)).foregroundStyle(Color(hex: 0x0A0A0B)))
    let badgeW = badgeText.measure(in: unbounded).width + 5.6 * u
    let pill = CGRect(x: W - m - badgeW, y: top, width: badgeW, height: badgeH)
    ctx.fill(Path(roundedRect: pill, cornerRadius: badgeH / 2), with: .color(volt))
    ctx.draw(badgeText, at: CGPoint(x: pill.midX, y: rowY + 0.3 * u), anchor: .center)

    let textMaxW = W - m * 2

    // Bottom left: the headline, one line if it fits at a readable size, else two.
    let (size, lines) = fitHeadline(info.headline, maxW: textMaxW, maxSize: 17 * u, minSize: 9 * u, ctx: ctx)
    var y = H - bottom
    ctx.drawLayer { layer in
      layer.addFilter(.shadow(color: .black.opacity(0.35), radius: u))
      for line in lines.reversed() {
        // Canvas text sits on its line box; nudge so the baseline lands on y like the web's.
        layer.draw(Text(line).font(display(size, .black)).foregroundStyle(volt), at: CGPoint(x: m, y: y + size * 0.2), anchor: .bottomLeading)
        y -= size * 0.9
      }
    }

    // Above it: every exercise, name in white and the top set in lime. Many exercises get
    // smaller type, then two columns, so the block stays under ~40% of the photo.
    guard !info.lifts.isEmpty else { return }
    let base = y - 1.4 * u
    let room = min(base - (top + 7.6 * u + 6 * u), H * 0.4)
    var cols = 1
    var rows = info.lifts.count
    var fs = 3.8 * u
    func fits() -> Bool { CGFloat(rows) * fs * 1.45 <= room }
    while !fits() && fs > 2.8 * u { fs -= 0.1 * u }
    if !fits() && info.lifts.count > 1 {
      cols = 2
      rows = (info.lifts.count + 1) / 2
      fs = 3.4 * u
      while !fits() && fs > 2.2 * u { fs -= 0.1 * u }
    }
    let colW = textMaxW / CGFloat(cols)
    ctx.drawLayer { layer in
      layer.addFilter(.shadow(color: .black.opacity(0.35), radius: u))
      for (i, lift) in info.lifts.enumerated() {
        let col = cols == 2 ? i / rows : 0
        let row = cols == 2 ? i % rows : i
        let x0 = m + CGFloat(col) * colW
        let ly = base - CGFloat(rows - 1 - row) * fs * 1.45
        let nameFont = Font.system(size: fs, weight: .bold)
        var label = lift.name
        var resolved = layer.resolve(Text(label).font(nameFont).foregroundStyle(.white))
        while label.count > 1 && resolved.measure(in: unbounded).width > colW * 0.58 {
          label.removeLast()
          resolved = layer.resolve(Text(label.trimmingCharacters(in: .whitespaces) + "…").font(nameFont).foregroundStyle(.white))
        }
        layer.draw(resolved, at: CGPoint(x: x0, y: ly + fs * 0.25), anchor: .bottomLeading)
        if !lift.best.isEmpty {
          let x = x0 + resolved.measure(in: unbounded).width + 1.6 * u
          layer.draw(Text(lift.best).font(display(fs * 1.12, .heavy)).foregroundStyle(volt), at: CGPoint(x: x, y: ly + fs * 0.25), anchor: .bottomLeading)
        }
      }
    }
  }

  private static func fitHeadline(_ text: String, maxW: CGFloat, maxSize: CGFloat, minSize: CGFloat, ctx: GraphicsContext) -> (CGFloat, [String]) {
    let unbounded = CGSize(width: CGFloat.greatestFiniteMagnitude, height: .greatestFiniteMagnitude)
    func width(_ s: String, _ size: CGFloat) -> CGFloat { ctx.resolve(Text(s).font(display(size, .black))).measure(in: unbounded).width }
    let step = maxSize * 0.04
    var s = maxSize
    while s >= minSize {
      if width(text, s) <= maxW { return (s, [text]) }
      s -= step
    }
    // Two lines, split where they come out most even.
    let words = text.split(separator: " ").map(String.init)
    var lines = [text]
    var best = CGFloat.infinity
    for i in 1..<max(1, words.count) {
      let a = words[..<i].joined(separator: " "), b = words[i...].joined(separator: " ")
      let w = max(width(a, maxSize), width(b, maxSize))
      if w < best { best = w; lines = [a, b] }
    }
    s = maxSize
    while s >= minSize * 0.6 {
      if lines.allSatisfy({ width($0, s) <= maxW }) { return (s, lines) }
      s -= step
    }
    return (minSize * 0.6, lines)
  }
}

/// The photo under the card. A story is 9:16: a tall photo fills it, a wide one sits
/// in the middle over a blurred copy of itself.
struct CardPhoto: View {
  let image: UIImage
  let story: Bool

  var body: some View {
    GeometryReader { g in
      let aspect = image.size.width / max(1, image.size.height)
      if story && aspect > 0.8 {
        ZStack {
          Image(uiImage: image).resizable().scaledToFill().frame(width: g.size.width + 160, height: g.size.height + 160)
            .blur(radius: 40).overlay(Color.black.opacity(0.45))
          Image(uiImage: image).resizable().scaledToFit().frame(width: g.size.width)
        }
        .frame(width: g.size.width, height: g.size.height)
        .clipped()
      } else {
        Image(uiImage: image).resizable().scaledToFill().frame(width: g.size.width, height: g.size.height).clipped()
      }
    }
  }
}

enum CardComposer {
  /// The finished JPEG: the photo at up to 1600px (or 1080×1920 for a story) with the card drawn on.
  @MainActor
  static func compose(_ photo: UIImage, info: CardInfo, story: Bool) -> Data? {
    let pw = photo.size.width * photo.scale, ph = photo.size.height * photo.scale
    let size: CGSize
    if story {
      size = CGSize(width: 1080, height: 1920)
    } else {
      let k = min(1, 1600 / max(pw, ph))
      size = CGSize(width: (pw * k).rounded(), height: (ph * k).rounded())
    }
    let view = ZStack {
      CardPhoto(image: photo, story: story)
      CardOverlay(info: info, story: story)
    }
    .frame(width: size.width, height: size.height)
    .environment(\.colorScheme, .dark)
    let renderer = ImageRenderer(content: view)
    renderer.scale = 1
    renderer.proposedSize = ProposedViewSize(size)
    return renderer.uiImage?.jpegData(compressionQuality: 0.92)
  }
}
