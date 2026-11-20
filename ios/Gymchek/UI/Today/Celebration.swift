import SwiftUI

/// What the full-screen celebration shows.
struct CheerContent: Identifiable {
  let id = UUID()
  /// "올해 N번째 출석" (the first check-in of the day); nil for badges only.
  let dayCount: Int?
  let meta: String
  let badges: [Badge]
}

struct CelebrationView: View {
  let content: CheerContent
  var onPhoto: (() -> Void)?
  @Environment(\.dismiss) private var dismiss
  @State private var shown = 0
  @State private var appeared = false
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      Spacer()
      if let count = content.dayCount {
        Kicker(text: "\(Day.calendar.component(.year, from: Day.today())) Season · Day \(count)", size: 13, color: .volt)
        Text("\(shown)")
          .font(.display(200, weight: .black))
          .foregroundStyle(Color.volt)
          .contentTransition(.numericText(value: Double(shown)))
          .minimumScaleFactor(0.5)
          .lineLimit(1)
          .padding(.top, 6)
        Text("올해 \(count)번째 출석").font(.system(size: 30, weight: .heavy)).tracking(-1)
        Text(content.meta).font(.system(size: 15, weight: .semibold)).foregroundStyle(Color.muted).padding(.top, 8)
        if !content.badges.isEmpty {
          Divider().overlay(Color.lineStrong).padding(.vertical, 22)
          Kicker(text: "New badge", size: 13, color: .volt).padding(.bottom, 12)
          ForEach(content.badges) { b in
            HStack(spacing: 16) {
              MedalView(badge: b, on: true).scaleEffect(appeared ? 1 : 0.5)
              VStack(alignment: .leading, spacing: 2) {
                Text(b.name).font(.system(size: 18, weight: .heavy))
                Text(b.desc).font(.system(size: 13, weight: .semibold)).foregroundStyle(Color.muted)
              }
            }
            .padding(.leading, 5)
            .padding(.bottom, 12)
          }
        }
      } else {
        Kicker(text: "New badge", size: 13, color: .volt)
        HStack(spacing: 20) {
          ForEach(content.badges) { MedalView(badge: $0, on: true, size: 128).scaleEffect(appeared ? 1 : 0.5) }
        }
        .padding(.vertical, 24)
        .padding(.leading, 5)
        Text(content.badges.map(\.name).joined(separator: " · ")).font(.system(size: 30, weight: .heavy)).tracking(-1)
        Text(content.badges.map(\.desc).joined(separator: " · ")).font(.system(size: 15, weight: .semibold)).foregroundStyle(Color.muted).padding(.top, 8)
      }
      Spacer()
      VStack(spacing: 8) {
        if let onPhoto {
          Button { dismiss(); onPhoto() } label: {
            Label("오운완 찍기", systemImage: "camera").font(.system(size: 16, weight: .heavy)).foregroundStyle(Color.onVolt)
              .frame(maxWidth: .infinity, minHeight: 54).background(Color.volt, in: .rect(cornerRadius: 16))
          }
        }
        Button { dismiss() } label: {
          Text(content.dayCount == nil ? "좋아요" : "닫기").font(.system(size: 16, weight: .heavy))
            .foregroundStyle(content.dayCount == nil ? Color.onVolt : Color.ink)
            .frame(maxWidth: .infinity, minHeight: 52)
            .background(content.dayCount == nil ? Color.volt : Color.surface2, in: .rect(cornerRadius: 16))
        }
      }
      .buttonStyle(PressScale(scale: 0.98))
    }
    .padding(.horizontal, 18)
    .padding(.bottom, 16)
    .background(Color.bg)
    .sensoryFeedback(.success, trigger: appeared)
    .task {
      guard let count = content.dayCount else { withAnimation(.spring(duration: 0.5, bounce: 0.4).delay(0.2)) { appeared = true }; return }
      if reduceMotion { shown = count; appeared = true; return }
      // Count up quickly, ease out at the end.
      let steps = min(count, 30)
      for i in 1...max(1, steps) {
        try? await Task.sleep(for: .milliseconds(Int(20 + Double(i * i) * 0.6)))
        withAnimation(.snappy(duration: 0.12)) { shown = Int((Double(count) * Double(i) / Double(steps)).rounded()) }
      }
      withAnimation(.spring(duration: 0.5, bounce: 0.4)) { appeared = true }
    }
  }
}
