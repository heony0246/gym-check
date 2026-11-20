import SwiftUI

/// Add a part, or rename / recolor / delete one (long-press a tile).
struct PartEditor: View {
  @Environment(Store.self) private var store
  @Environment(\.dismiss) private var dismiss
  /// nil = a new part.
  let partId: String?

  @State private var name = ""
  @State private var color = ""
  @State private var confirmDelete = false
  @FocusState private var nameFocused: Bool

  private static let palette = ["#FF5D5D", "#4F9BFF", "#3DDC97", "#FF9F43", "#A78BFA", "#FFD43B", "#38D9F5", "#F472B6",
                                "#818CF8", "#A3E635", "#2DD4BF", "#FB7185", "#94A3B8", "#E879F9", "#C08457"]

  private var part: Part? { partId.flatMap { id in store.data.parts.first { $0.id == id } } }

  var body: some View {
    NavigationStack {
      VStack(alignment: .leading, spacing: 18) {
        TextField("이름 (예: 수영)", text: $name)
          .font(.system(size: 17, weight: .semibold))
          .padding(.horizontal, 14)
          .frame(height: 50)
          .background(Color.surface, in: .rect(cornerRadius: 12))
          .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(nameFocused ? Color.volt : Color.lineStrong))
          .focused($nameFocused)
          .onChange(of: name) { _, v in if v.count > 8 { name = String(v.prefix(8)) } }
        LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 8), spacing: 14) {
          ForEach(Self.palette, id: \.self) { c in
            Circle().fill(Color(css: c)).frame(width: 30, height: 30)
              .overlay(Circle().strokeBorder(Color.ink, lineWidth: color.uppercased() == c.uppercased() ? 2.5 : 0).padding(-4))
              .onTapGesture { color = c }
          }
        }
        VStack(spacing: 8) {
          Button(action: save) {
            Text(part == nil ? "추가" : "저장").font(.system(size: 16, weight: .heavy)).foregroundStyle(Color.onVolt)
              .frame(maxWidth: .infinity, minHeight: 54).background(Color.volt, in: .rect(cornerRadius: 16))
          }
          // Cancel sits right under the main button, where the thumb already is.
          Button { dismiss() } label: {
            Text("취소").font(.system(size: 16, weight: .bold)).foregroundStyle(Color.ink)
              .frame(maxWidth: .infinity, minHeight: 50).background(Color.surface2, in: .rect(cornerRadius: 16))
          }
        }
        .buttonStyle(PressScale(scale: 0.98))
        if part != nil {
          Button("이 부위 삭제", role: .destructive) { confirmDelete = true }
            .font(.system(size: 15, weight: .bold)).frame(maxWidth: .infinity, minHeight: 44)
        }
        Spacer()
      }
      .padding(18)
      .background(Color.bg)
      .navigationTitle(part == nil ? "부위 추가" : "부위 수정")
      .navigationBarTitleDisplayMode(.inline)
      .confirmationDialog(deleteMessage, isPresented: $confirmDelete, titleVisibility: .visible) {
        Button("지우기", role: .destructive) {
          if let partId { store.deletePart(partId) }
          dismiss()
        }
      }
      .onAppear {
        name = part?.name ?? ""
        color = part?.color ?? store.nextPartColor
        if part == nil { nameFocused = true }
      }
    }
    .presentationDetents([.medium])
  }

  private var deleteMessage: String {
    guard let part else { return "" }
    let uses = store.uses(of: part.id)
    return "'\(part.name)' 부위를 지울까요?" + (uses > 0 ? "\n이 부위 기록 \(uses)회도 같이 지워져요." : "")
  }

  private func save() {
    let trimmed = name.trimmingCharacters(in: .whitespaces)
    guard !trimmed.isEmpty, !store.data.parts.contains(where: { $0.name == trimmed && $0.id != partId }) else { return }
    if let partId { store.updatePart(partId, name: trimmed, color: color) } else { store.addPart(name: trimmed, color: color) }
    dismiss()
  }
}
