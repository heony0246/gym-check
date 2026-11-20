import SwiftUI

/// What the exercise sheet is showing.
enum ExerciseRoute: Identifiable, Hashable {
  case pick(date: String)
  case edit(date: String, exId: String)
  case history(exId: String)

  var id: String {
    switch self {
    case .pick(let d): "pick-\(d)"
    case .edit(let d, let e): "edit-\(d)-\(e)"
    case .history(let e): "history-\(e)"
    }
  }
}

/// A picked exercise, with the routine's sets/reps when it came from a routine.
struct ExercisePick: Hashable {
  let id: String
  let rec: RoutineItem?
}

// MARK: - List under the part tiles

struct LogBlock: View {
  @Environment(Store.self) private var store
  let date: String
  @Binding var route: ExerciseRoute?
  /// The row swiped open (one at a time).
  @State private var openRow: String?

  var body: some View {
    VStack(spacing: 6) {
      ForEach(store.logs(on: date), id: \.ex) { entry in
        if let ex = store.exercise(entry.ex) {
          // Tap to edit; swipe left for 수정 / 삭제.
          SwipeRow(id: entry.ex, openId: $openRow, actions: [
            SwipeAction(title: "수정", symbol: "pencil", tint: Color.surface3) { route = .edit(date: date, exId: entry.ex) },
            SwipeAction(title: "삭제", symbol: "trash", tint: Color.danger) {
              withAnimation(.snappy) { store.deleteLog(entry.ex, on: date) }
            },
          ]) {
          Button { route = .edit(date: date, exId: entry.ex) } label: {
            HStack(spacing: 12) {
              VStack(alignment: .leading, spacing: 2) {
                Text(ex.shortName).font(.system(size: 15, weight: .heavy)).lineLimit(1)
                Text(SetMath.summary(ex, entry.sets)).font(.system(size: 13, weight: .semibold)).foregroundStyle(Color.muted).lineLimit(1)
              }
              Spacer()
              Image(systemName: "chevron.right").font(.system(size: 13, weight: .bold)).foregroundStyle(Color.faint)
            }
            .padding(.horizontal, 16)
            .frame(minHeight: 56)
            .background(Color.surface, in: .rect(cornerRadius: 16))
          }
          .buttonStyle(PressScale(scale: 0.98))
          }
          .transition(.opacity.combined(with: .scale(scale: 0.96)))
        }
      }
      let empty = store.logs(on: date).isEmpty
      Button { route = .pick(date: date) } label: {
        HStack(spacing: 6) {
          Image(systemName: "plus").font(.system(size: 14, weight: .bold))
          Text(empty ? "종목·무게 기록하기" : "종목 추가").font(.system(size: 15, weight: .heavy))
          if empty { Text("선택").font(.system(size: 12, weight: .semibold)).foregroundStyle(Color.faint) }
        }
        .foregroundStyle(Color.muted)
        .frame(maxWidth: .infinity, minHeight: 56)
        .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Color.lineStrong, style: StrokeStyle(lineWidth: 1.5, dash: [5, 4])))
      }
      .buttonStyle(PressScale(scale: 0.98))
    }
  }
}

// MARK: - Sheet: picker → set editors, or one editor, or history

struct ExerciseSheet: View {
  let route: ExerciseRoute
  /// Each pushed editor carries the whole queue, so a destination never reads stale state.
  @State private var path: [Step] = []

  struct Step: Hashable {
    let index: Int
    let queue: [ExercisePick]
  }

  var body: some View {
    NavigationStack(path: $path) {
      root
        .navigationDestination(for: Step.self) { step in
          SetEditor(date: date, pick: step.queue[step.index], position: (step.index, step.queue.count)) { advanced in
            if advanced, step.index + 1 < step.queue.count {
              path.append(Step(index: step.index + 1, queue: step.queue))
            } else {
              finish()
            }
          }
        }
    }
    .presentationDragIndicator(.visible)
  }

  @Environment(\.dismiss) private var dismiss
  private func finish() { dismiss() }

  private var date: String {
    switch route {
    case .pick(let d), .edit(let d, _): d
    case .history: Day.key(Day.today())
    }
  }

  @ViewBuilder private var root: some View {
    switch route {
    case .pick(let date):
      ExercisePicker(date: date) { picks in
        guard !picks.isEmpty else { return }
        path = [Step(index: 0, queue: picks)]
      }
    case .edit(let date, let exId):
      SetEditor(date: date, pick: ExercisePick(id: exId, rec: nil), position: (0, 1)) { _ in finish() }
    case .history(let exId):
      ExerciseHistory(exId: exId)
    }
  }
}

// MARK: - Picker

struct ExercisePicker: View {
  @Environment(Store.self) private var store
  @Environment(\.dismiss) private var dismiss
  let date: String
  let onConfirm: ([ExercisePick]) -> Void

  @State private var filter = ""
  @State private var query = ""
  @State private var selected: [ExercisePick] = []
  @State private var routineIndex: [String: Int] = [:]

  var body: some View {
    List {
      Section { chips.listRowInsets(EdgeInsets()).listRowBackground(Color.clear) }
      if query.isEmpty {
        ForEach(routineParts, id: \.self) { pid in routineSection(pid) }
      }
      Section(query.isEmpty && !routineParts.isEmpty ? "전체 종목" : "") {
        ForEach(rest) { ex in row(ex, sub: ex.equip + (recent.contains(ex.id) ? " · 최근" : ""), number: nil, rec: nil) }
        if let typed = customName {
          Button {
            let parts = store.parts(on: date)
            let part = filter != "all" && filter != "today" ? filter : parts.count == 1 ? parts[0] : "full"
            let id = store.addCustomExercise(name: typed, part: part)
            selected.append(ExercisePick(id: id, rec: nil))
            query = ""
          } label: {
            Label("'\(typed)' 새 종목으로 추가", systemImage: "plus").foregroundStyle(Color.volt)
          }
        }
      }
    }
    .listStyle(.insetGrouped)
    .scrollContentBackground(.hidden)
    .background(Color.bg)
    .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: "종목 검색")
    .navigationTitle("종목 고르기")
    .navigationBarTitleDisplayMode(.inline)
    .toolbar { ToolbarItem(placement: .cancellationAction) { Button("닫기") { dismiss() } } }
    .safeAreaInset(edge: .bottom) {
      if !selected.isEmpty {
        Button { onConfirm(selected); selected = [] } label: {
          Text("\(selected.count)개 선택 · 확인")
            .font(.system(size: 16, weight: .heavy))
            .foregroundStyle(Color.onVolt)
            .frame(maxWidth: .infinity, minHeight: 54)
            .background(Color.volt, in: .rect(cornerRadius: 16))
        }
        .padding(.horizontal, 18)
        .padding(.bottom, 8)
        .buttonStyle(PressScale(scale: 0.98))
      }
    }
    .onAppear { if filter.isEmpty { filter = store.parts(on: date).isEmpty ? "all" : "today" } }
  }

  private var recent: [String] { store.recentExerciseIds }

  private var chips: some View {
    ScrollView(.horizontal, showsIndicators: false) {
      HStack(spacing: 6) {
        if !store.parts(on: date).isEmpty { chip("today", "오늘 부위") }
        chip("all", "전체")
        ForEach(store.data.parts) { chip($0.id, $0.name) }
        chip("full", "전신")
      }
      .padding(.vertical, 4)
    }
  }

  private func chip(_ id: String, _ label: String) -> some View {
    Button { filter = id } label: {
      Text(label)
        .font(.system(size: 14, weight: .bold))
        .padding(.horizontal, 14)
        .frame(height: 34)
        .foregroundStyle(filter == id ? Color.onVolt : Color.ink)
        .background(filter == id ? Color.volt : Color.surface2, in: .capsule)
    }
    .buttonStyle(.plain)
  }

  /// Parts whose routine shows on top: the chosen part, or every part checked today.
  private var routineParts: [String] {
    let ids = filter == "today" ? store.parts(on: date) : filter == "all" ? [] : [filter]
    return ids.filter { !(Catalog.routines[$0] ?? []).isEmpty }
  }

  private func routine(_ pid: String) -> [RoutineItem] {
    let list = Catalog.routines[pid] ?? []
    guard !list.isEmpty else { return [] }
    return list[(routineIndex[pid] ?? 0) % list.count]
  }

  private func routineSection(_ pid: String) -> some View {
    let label = pid == "full" ? "전신" : (store.data.parts.first { $0.id == pid }?.name ?? "")
    return Section {
      ForEach(Array(routine(pid).enumerated()), id: \.offset) { i, item in
        if let ex = Catalog.byId[item.id] {
          row(ex, sub: "\(SetMath.routineText(ex, item)) · \(ex.equip)", number: i + 1, rec: item)
        }
      }
    } header: {
      HStack {
        Text(label).foregroundStyle(Color.volt) + Text(" 추천 루틴")
        Spacer()
        Button {
          let count = (Catalog.routines[pid] ?? []).count
          var next = routineIndex[pid] ?? 0
          while count > 1 && next == (routineIndex[pid] ?? 0) { next = Int.random(in: 0..<count) }
          withAnimation { routineIndex[pid] = next }
        } label: {
          Label("다른 루틴", systemImage: "arrow.clockwise").font(.system(size: 12, weight: .heavy)).textCase(nil)
        }
      }
    }
    .onAppear {
      if routineIndex[pid] == nil { routineIndex[pid] = Int.random(in: 0..<max(1, (Catalog.routines[pid] ?? []).count)) }
    }
  }

  private var shownInRoutines: Set<String> { Set(routineParts.flatMap { routine($0).map(\.id) }) }

  /// The full list under the routine: filtered, recent first, routine exercises left out.
  private var rest: [Exercise] {
    let q = query.lowercased().replacingOccurrences(of: " ", with: "")
    var pool = store.allExercises
    if !q.isEmpty {
      pool = pool.filter { $0.name.lowercased().replacingOccurrences(of: " ", with: "").contains(q) || $0.equip.replacingOccurrences(of: " ", with: "").contains(q) }
    } else if filter == "today" {
      let parts = store.parts(on: date)
      pool = pool.filter { parts.contains($0.part) }
    } else if filter != "all" {
      pool = pool.filter { $0.part == filter }
    }
    if q.isEmpty { pool = pool.filter { !shownInRoutines.contains($0.id) } }
    let order = Dictionary(uniqueKeysWithValues: recent.enumerated().map { ($1, $0) })
    return pool.enumerated().sorted { (order[$0.element.id] ?? 99, $0.offset) < (order[$1.element.id] ?? 99, $1.offset) }.map(\.element)
  }

  private var customName: String? {
    let typed = String(query.trimmingCharacters(in: .whitespaces).prefix(30))
    return typed.isEmpty || store.allExercises.contains { $0.name == typed } ? nil : typed
  }

  private func row(_ ex: Exercise, sub: String, number: Int?, rec: RoutineItem?) -> some View {
    let isOn = selected.contains { $0.id == ex.id }
    let logged = store.logs(on: date).contains { $0.ex == ex.id }
    return Button {
      if let i = selected.firstIndex(where: { $0.id == ex.id }) { selected.remove(at: i) } else { selected.append(ExercisePick(id: ex.id, rec: rec)) }
    } label: {
      HStack(spacing: 12) {
        if let number { Text("\(number)").font(.display(20)).foregroundStyle(Color.volt).frame(width: 22) }
        VStack(alignment: .leading, spacing: 2) {
          Text(ex.name).font(.system(size: 15, weight: .bold)).foregroundStyle(Color.ink)
          Text(sub).font(.system(size: 12, weight: .semibold)).foregroundStyle(Color.muted)
        }
        Spacer()
        if logged { Text("기록함").font(.system(size: 12, weight: .heavy)).foregroundStyle(Color.volt) }
        ZStack {
          Circle().strokeBorder(isOn ? Color.clear : Color.lineStrong, lineWidth: 1.5)
            .background(Circle().fill(isOn ? Color.volt : .clear))
          if isOn { Image(systemName: "checkmark").font(.system(size: 11, weight: .black)).foregroundStyle(Color.onVolt) }
        }
        .frame(width: 24, height: 24)
      }
      .contentShape(.rect)
    }
    .buttonStyle(.plain)
    .listRowBackground(isOn ? Color.volt.opacity(0.08) : Color.surface)
  }
}

// MARK: - Set editor

struct SetEditor: View {
  @Environment(Store.self) private var store
  let date: String
  let pick: ExercisePick
  let position: (index: Int, count: Int)
  /// true = saved or skipped and should move on to the next picked exercise.
  let onDone: (Bool) -> Void

  @State private var rows: [Draft] = []
  @State private var confirmDelete = false
  @FocusState private var focused: Bool

  struct Draft: Identifiable {
    let id = UUID()
    var values: [SetField: String] = [:]
  }

  private var ex: Exercise? { store.exercise(pick.id) }
  private var existing: LogEntry? { store.logs(on: date).first { $0.ex == pick.id } }
  private var last: (date: String, sets: [LoggedSet])? { store.history(pick.id).first { $0.date < date } }
  private var hasNext: Bool { position.index + 1 < position.count }

  var body: some View {
    if let ex {
      ScrollView {
        VStack(alignment: .leading, spacing: 10) {
          if let last {
            Text("지난번 \(shortDay(last.date)) · \(SetMath.summary(ex, last.sets))")
              .font(.system(size: 13, weight: .semibold)).foregroundStyle(Color.muted)
          }
          ForEach($rows) { $row in
            let i = rows.firstIndex { $0.id == row.id } ?? 0
            HStack(spacing: 8) {
              Text("\(i + 1)").font(.display(20)).foregroundStyle(Color.faint).frame(width: 24)
              ForEach(Catalog.fields(ex.kind), id: \.field) { spec in
                HStack(spacing: 6) {
                  TextField(spec.optional ? "-" : "0", text: Binding(get: { row.values[spec.field] ?? "" }, set: { row.values[spec.field] = $0 }))
                    .keyboardType(spec.decimal ? .decimalPad : .numberPad)
                    .multilineTextAlignment(.trailing)
                    .font(.display(22))
                    .focused($focused)
                  Text(spec.unit).font(.system(size: 13, weight: .bold)).foregroundStyle(Color.muted)
                }
                .padding(.horizontal, 12)
                .frame(height: 50)
                .background(Color.surface, in: .rect(cornerRadius: 12))
                .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Color.lineStrong))
              }
              Button { rows.removeAll { $0.id == row.id }; if rows.isEmpty { rows = [Draft()] } } label: {
                Image(systemName: "xmark").font(.system(size: 13, weight: .bold)).foregroundStyle(Color.faint).frame(width: 32, height: 36)
              }
            }
          }
          Button { rows.append(Draft(values: rows.last?.values ?? [:])) } label: {
            Label("세트 추가", systemImage: "plus").font(.system(size: 15, weight: .bold)).frame(maxWidth: .infinity, minHeight: 48)
              .background(Color.surface2, in: .rect(cornerRadius: 14))
          }
          .buttonStyle(PressScale())
          .padding(.top, 4)
          Button(action: save) {
            Text(hasNext ? "저장하고 다음" : "저장").font(.system(size: 16, weight: .heavy)).foregroundStyle(Color.onVolt)
              .frame(maxWidth: .infinity, minHeight: 54).background(Color.volt, in: .rect(cornerRadius: 16))
          }
          .buttonStyle(PressScale(scale: 0.98))
          .padding(.top, 6)
          if hasNext {
            Button("이 종목 건너뛰기") { onDone(true) }.font(.system(size: 14, weight: .semibold)).foregroundStyle(Color.muted).frame(maxWidth: .infinity)
          }
          if existing != nil {
            Button("이 종목 기록 삭제", role: .destructive) { confirmDelete = true }
              .font(.system(size: 15, weight: .bold)).frame(maxWidth: .infinity, minHeight: 44)
          }
        }
        .padding(18)
      }
      .background(Color.bg)
      .navigationTitle(ex.shortName)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .principal) {
          VStack(spacing: 0) {
            Text(ex.shortName).font(.system(size: 16, weight: .heavy))
            Text("\(monthDay(date)) · \(ex.equip)\(position.count > 1 ? " · \(position.index + 1)/\(position.count)" : "")")
              .font(.system(size: 11, weight: .semibold)).foregroundStyle(Color.muted)
          }
        }
        ToolbarItemGroup(placement: .keyboard) { Spacer(); Button("완료") { focused = false } }
      }
      .confirmationDialog("\(monthDay(date)) \(ex.shortName) 기록을 지울까요?", isPresented: $confirmDelete, titleVisibility: .visible) {
        Button("지우기", role: .destructive) { store.deleteLog(pick.id, on: date); onDone(false) }
      }
      .onAppear { if rows.isEmpty { rows = initialRows(ex) } }
    }
  }

  private func initialRows(_ ex: Exercise) -> [Draft] {
    let source = existing?.sets ?? last?.sets ?? pick.rec.map { SetMath.routineSets(ex, $0) } ?? [LoggedSet()]
    return source.map { s in
      var d = Draft()
      for spec in Catalog.fields(ex.kind) {
        let v: Double? = switch spec.field { case .w: s.w; case .r: s.r; case .t: s.t; case .d: s.d }
        if let v { d.values[spec.field] = SetMath.num(v) }
      }
      return d
    }
  }

  private func save() {
    guard let ex else { return }
    let specs = Catalog.fields(ex.kind)
    let sets: [LoggedSet] = rows.compactMap { row in
      var s = LoggedSet()
      for spec in specs {
        let v = Double((row.values[spec.field] ?? "").replacingOccurrences(of: ",", with: "."))
        if let v, v >= 0 {
          switch spec.field { case .w: s.w = v; case .r: s.r = v; case .t: s.t = v; case .d: s.d = v }
        } else if !spec.optional { return nil }
      }
      return s
    }
    guard !sets.isEmpty else { return }
    store.saveLog(pick.id, sets: sets, on: date)
    onDone(true)
  }
}

// MARK: - History (from the 기록 tab)

struct ExerciseHistory: View {
  @Environment(Store.self) private var store
  @Environment(\.dismiss) private var dismiss
  let exId: String
  @State private var editing: String?

  var body: some View {
    if let ex = store.exercise(exId) {
      let history = store.history(exId)
      let best = SetMath.best(ex, history.flatMap(\.sets))
      List {
        if let best {
          Section {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
              Kicker(text: "Best", size: 12, color: .volt)
              Text(SetMath.text(ex.kind, best)).font(.display(26))
              if let orm = SetMath.oneRepMax(ex, best) { Text("예상 1RM \(orm)kg").font(.system(size: 13, weight: .bold)).foregroundStyle(Color.muted) }
            }
          }
        }
        Section {
          ForEach(history, id: \.date) { h in
            NavigationLink {
              SetEditor(date: h.date, pick: ExercisePick(id: exId, rec: nil), position: (0, 1)) { _ in }
            } label: {
              VStack(alignment: .leading, spacing: 2) {
                Text(longDay(h.date)).font(.system(size: 15, weight: .bold))
                Text(SetMath.summary(ex, h.sets)).font(.system(size: 13, weight: .semibold)).foregroundStyle(Color.muted)
              }
            }
            .swipeActions(edge: .trailing) {
              Button(role: .destructive) { store.deleteLog(exId, on: h.date) } label: { Label("삭제", systemImage: "trash") }
            }
          }
        }
      }
      .scrollContentBackground(.hidden)
      .background(Color.bg)
      .navigationTitle(ex.shortName)
      .toolbar { ToolbarItem(placement: .cancellationAction) { Button("닫기") { dismiss() } } }
    }
  }
}

// MARK: - Date text

func shortDay(_ key: String) -> String {
  let p = key.split(separator: "-").compactMap { Int($0) }
  return p.count == 3 ? "\(p[1]).\(p[2])" : key
}

func monthDay(_ key: String) -> String {
  let p = key.split(separator: "-").compactMap { Int($0) }
  return p.count == 3 ? "\(p[1])월 \(p[2])일" : key
}

func longDay(_ key: String) -> String {
  guard let d = Day.date(key) else { return key }
  return "\(monthDay(key)) \(Day.weekdaysKR[Day.calendar.component(.weekday, from: d) - 1])요일"
}
