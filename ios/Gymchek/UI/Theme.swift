import SwiftUI

// The web app's palette and type, so both look like one product.
extension Color {
  static let bg = Color(hex: 0x0A0A0B)
  static let surface = Color(hex: 0x151517)
  static let surface2 = Color(hex: 0x202023)
  static let surface3 = Color(hex: 0x2B2B2F)
  static let line = Color.white.opacity(0.07)
  static let lineStrong = Color.white.opacity(0.16)
  static let ink = Color(hex: 0xF4F4F0)
  static let muted = Color(hex: 0x8E8E94)
  static let faint = Color(hex: 0x55555B)
  static let volt = Color(hex: 0xD4FF3F)
  static let onVolt = Color(hex: 0x0A0A0B)
  static let warn = Color(hex: 0xFF9447)
  static let danger = Color(hex: 0xFF5F5F)
  static let sat = Color(hex: 0x7FB2FF)
  static let sun = Color(hex: 0xFF7B7B)

  init(hex: UInt32) {
    self.init(red: Double((hex >> 16) & 0xFF) / 255, green: Double((hex >> 8) & 0xFF) / 255, blue: Double(hex & 0xFF) / 255)
  }

  /// "#RRGGBB" as stored for parts; grey when it doesn't parse.
  init(css: String) {
    let digits = css.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
    self.init(hex: UInt32(digits, radix: 16) ?? 0x94A3B8)
  }
}

extension Font {
  /// Big italic numbers (the web uses Barlow Condensed; SF's compressed width is the native match).
  static func display(_ size: CGFloat, weight: Font.Weight = .heavy) -> Font {
    .system(size: size, weight: weight).width(.compressed).italic()
  }

  /// Small uppercase labels like "TODAY · 11.20 FRI".
  static func kicker(_ size: CGFloat = 13) -> Font {
    .system(size: size, weight: .bold).width(.condensed)
  }
}

/// Uppercase, letter-spaced label.
struct Kicker: View {
  let text: String
  var size: CGFloat = 13
  var color: Color = .muted

  var body: some View {
    Text(text.uppercased())
      .font(.kicker(size))
      .tracking(size * 0.16)
      .foregroundStyle(color)
  }
}

/// Shrinks a little while pressed, like the web's :active.
struct PressScale: ButtonStyle {
  var scale: CGFloat = 0.97

  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .scaleEffect(configuration.isPressed ? scale : 1)
      .animation(.easeOut(duration: 0.14), value: configuration.isPressed)
  }
}

struct SectionHead: View {
  let title: String
  var trailing: String = ""

  var body: some View {
    HStack(alignment: .firstTextBaseline) {
      Text(title).font(.system(size: 18, weight: .heavy))
      Spacer()
      if !trailing.isEmpty {
        Text(trailing).font(.system(size: 12, weight: .semibold)).foregroundStyle(Color.faint)
      }
    }
  }
}
