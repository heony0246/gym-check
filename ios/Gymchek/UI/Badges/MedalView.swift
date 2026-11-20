import SwiftUI

/// One badge medal: circle, rounded square or shield, filled in its group's color when earned.
struct MedalView: View {
  let badge: Badge
  let on: Bool
  var size: CGFloat = 62

  private var group: BadgeGroup { Badges.group(badge.group) }
  private var color: Color { Color(css: badge.color ?? group.color) }

  var body: some View {
    let shape = MedalShape(kind: group.shape)
    ZStack {
      if on {
        if badge.rainbow {
          shape.fill(AngularGradient(colors: [Color(hex: 0xFF5D5D), Color(hex: 0xFF9F43), Color(hex: 0xFFD43B), Color(hex: 0x3DDC97),
                                              Color(hex: 0x38D9F5), Color(hex: 0x4F9BFF), Color(hex: 0xA78BFA), Color(hex: 0xFF5D5D)], center: .center))
        } else {
          shape.fill(color)
        }
        shape.stroke(on ? color : Color.clear, lineWidth: 1.5).padding(-4.5)
      } else if badge.current {
        shape.fill(Color.surface)
        shape.strokeBorder(color, lineWidth: 2)
      } else {
        shape.fill(Color.surface)
        shape.strokeBorder(Color.lineStrong, lineWidth: 1.5)
      }
      VStack(spacing: 1) {
        Text(badge.num)
          .font(.display(size * (badge.num.count >= 4 ? 0.3 : 0.42)))
        Text(badge.unit.uppercased())
          .font(.kicker(size * (badge.unit.count >= 7 ? 0.13 : 0.15)))
          .tracking(size * 0.012)
          .lineLimit(1)
          .minimumScaleFactor(0.6)
      }
      .foregroundStyle(on ? Color.onVolt : badge.current ? color : Color.faint)
      .padding(.horizontal, 4)
    }
    .frame(width: size, height: size)
  }
}

/// The three medal outlines.
struct MedalShape: InsettableShape {
  let kind: BadgeShape
  var inset: CGFloat = 0

  func path(in rect: CGRect) -> Path {
    let r = rect.insetBy(dx: inset, dy: inset)
    switch kind {
    case .circle:
      return Path(ellipseIn: r)
    case .square:
      return Path(roundedRect: r, cornerRadius: r.width * 0.3)
    case .shield:
      var p = Path()
      let c = r.width * 0.24
      p.move(to: CGPoint(x: r.minX + c, y: r.minY))
      p.addLine(to: CGPoint(x: r.maxX - c, y: r.minY))
      p.addQuadCurve(to: CGPoint(x: r.maxX, y: r.minY + c), control: CGPoint(x: r.maxX, y: r.minY))
      p.addLine(to: CGPoint(x: r.maxX, y: r.midY))
      p.addQuadCurve(to: CGPoint(x: r.midX, y: r.maxY), control: CGPoint(x: r.maxX, y: r.maxY - r.height * 0.06))
      p.addQuadCurve(to: CGPoint(x: r.minX, y: r.midY), control: CGPoint(x: r.minX, y: r.maxY - r.height * 0.06))
      p.addLine(to: CGPoint(x: r.minX, y: r.minY + c))
      p.addQuadCurve(to: CGPoint(x: r.minX + c, y: r.minY), control: CGPoint(x: r.minX, y: r.minY))
      p.closeSubpath()
      return p
    }
  }

  func inset(by amount: CGFloat) -> MedalShape { MedalShape(kind: kind, inset: inset + amount) }
}
