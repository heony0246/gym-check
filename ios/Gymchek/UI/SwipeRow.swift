import SwiftUI
import UIKit

/// A button revealed by swiping a row to the left (수정, 삭제…).
struct SwipeAction: Identifiable {
  let title: String
  let symbol: String
  let tint: Color
  let action: () -> Void
  var id: String { title }
}

/// Swipe left to show actions, like a List row, but for rows inside a ScrollView.
/// Only sideways drags are taken, so the page still scrolls normally. One row open at a
/// time: rows sharing `openId` close each other.
struct SwipeRow<Content: View>: View {
  let id: String
  @Binding var openId: String?
  let actions: [SwipeAction]
  var cornerRadius: CGFloat = 16
  @ViewBuilder let content: Content

  @State private var offset: CGFloat = 0
  @State private var dragStart: CGFloat?

  private let buttonWidth: CGFloat = 74
  private var reveal: CGFloat { CGFloat(actions.count) * buttonWidth }
  private var isOpen: Bool { openId == id }

  var body: some View {
    ZStack(alignment: .trailing) {
      content
        // While open, a tap on the row closes it instead of opening it.
        .overlay {
          if isOpen {
            Color.clear.contentShape(.rect).onTapGesture { close() }
          }
        }
        .offset(x: offset)
        .gesture(HorizontalPan(
          onChange: { dx in
            if dragStart == nil {
              dragStart = offset
              if openId != id { openId = id }
            }
            let x = (dragStart ?? 0) + dx
            // Past the buttons it gets heavier, like iOS.
            offset = x < -reveal ? -reveal + (x + reveal) * 0.25 : min(0, x)
          },
          onEnd: { dx, velocity in
            let projected = (dragStart ?? 0) + dx + velocity * 0.15
            dragStart = nil
            if projected < -reveal / 2 { open() } else { close() }
          }))

      // On top of the row (its tap area doesn't move with the slide), so only while shown.
      HStack(spacing: 0) {
        ForEach(actions) { a in
          Button {
            close()
            a.action()
          } label: {
            VStack(spacing: 4) {
              Image(systemName: a.symbol).font(.system(size: 16, weight: .bold))
              Text(a.title).font(.system(size: 12, weight: .bold))
            }
            .foregroundStyle(a.tint == .volt ? Color.onVolt : .white)
            .frame(width: buttonWidth)
            .frame(maxHeight: .infinity)
            .background(a.tint)
            .contentShape(.rect)
          }
          .buttonStyle(.plain)
        }
      }
      .frame(width: max(0, min(reveal, -offset)), alignment: .leading)
      .clipShape(.rect(cornerRadius: cornerRadius))
      .opacity(offset < -1 ? 1 : 0)
      .allowsHitTesting(offset < -1)
      .accessibilityHidden(true)
    }
    .sensoryFeedback(.selection, trigger: isOpen) { _, new in new }
    .onChange(of: openId) { _, now in
      if now != id && offset != 0 { withAnimation(.snappy(duration: 0.25)) { offset = 0 } }
    }
    .accessibilityElement(children: .contain)
    .accessibilityActions {
      ForEach(actions) { a in Button(a.title, action: a.action) }
    }
  }

  private func open() {
    withAnimation(.snappy(duration: 0.25)) { offset = -reveal }
    openId = id
  }

  private func close() {
    withAnimation(.snappy(duration: 0.25)) { offset = 0 }
    if openId == id { openId = nil }
  }
}

/// A pan that only starts when the finger moves more sideways than up/down, so it
/// doesn't fight the ScrollView it sits in.
struct HorizontalPan: UIGestureRecognizerRepresentable {
  var onChange: (CGFloat) -> Void
  var onEnd: (_ translation: CGFloat, _ velocity: CGFloat) -> Void

  final class Coordinator: NSObject, UIGestureRecognizerDelegate {
    func gestureRecognizerShouldBegin(_ recognizer: UIGestureRecognizer) -> Bool {
      guard let pan = recognizer as? UIPanGestureRecognizer else { return false }
      let v = pan.velocity(in: pan.view)
      return abs(v.x) > abs(v.y) * 1.2
    }
  }

  func makeCoordinator(converter: CoordinateSpaceConverter) -> Coordinator { Coordinator() }

  func makeUIGestureRecognizer(context: Context) -> UIPanGestureRecognizer {
    let pan = UIPanGestureRecognizer()
    pan.delegate = context.coordinator
    return pan
  }

  func handleUIGestureRecognizerAction(_ recognizer: UIPanGestureRecognizer, context: Context) {
    let dx = recognizer.translation(in: recognizer.view).x
    switch recognizer.state {
    case .changed: onChange(dx)
    case .ended, .cancelled, .failed: onEnd(dx, recognizer.velocity(in: recognizer.view).x)
    default: break
    }
  }
}
