import Foundation

/// One exercise in the catalog (or one the user added by hand).
nonisolated struct Exercise: Identifiable, Hashable, Sendable {
  let id: String
  let name: String
  let part: String
  let equip: String
  let kind: String

  /// "바벨 로우 (벤트오버 로우)" → "바벨 로우"
  var shortName: String {
    name.replacingOccurrences(of: #"\s*\(.*\)$"#, with: "", options: .regularExpression)
  }
}

/// What a set holds, per exercise kind.
nonisolated enum SetField: String, Sendable {
  case w, r, t, d
}

nonisolated struct FieldSpec: Sendable {
  let field: SetField
  let unit: String
  let decimal: Bool
  let optional: Bool
}

nonisolated struct RoutineItem: Hashable, Sendable {
  let id: String
  let sets: Int
  let range: String
}

/// The exercise list and recommended routines, shared with the web app (catalog.json).
nonisolated enum Catalog {
  static let exercises: [Exercise] = loaded.exercises
  static let byId: [String: Exercise] = Dictionary(uniqueKeysWithValues: exercises.map { ($0.id, $0) })
  static let routines: [String: [[RoutineItem]]] = loaded.routines

  private static let loaded: (exercises: [Exercise], routines: [String: [[RoutineItem]]]) = {
    guard let url = Bundle.main.url(forResource: "catalog", withExtension: "json"),
          let data = try? Data(contentsOf: url),
          let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return ([], [:]) }
    let exercises = (root["exercises"] as? [[String]] ?? []).compactMap { row -> Exercise? in
      row.count == 5 ? Exercise(id: row[0], name: row[1], part: row[2], equip: row[3], kind: row[4]) : nil
    }
    var routines: [String: [[RoutineItem]]] = [:]
    for (part, list) in root["routines"] as? [String: [[[Any]]]] ?? [:] {
      routines[part] = list.map { routine in
        routine.compactMap { item in
          guard item.count == 3, let id = item[0] as? String, let sets = item[1] as? Int else { return nil }
          return RoutineItem(id: id, sets: sets, range: item[2] as? String ?? "")
        }
      }
    }
    return (exercises, routines)
  }()

  static func fields(_ kind: String) -> [FieldSpec] {
    switch kind {
    case "r": [FieldSpec(field: .r, unit: "회", decimal: false, optional: false), FieldSpec(field: .w, unit: "+kg", decimal: true, optional: true)]
    case "t": [FieldSpec(field: .t, unit: "초", decimal: false, optional: false)]
    case "wt": [FieldSpec(field: .w, unit: "kg", decimal: true, optional: false), FieldSpec(field: .t, unit: "초", decimal: false, optional: false)]
    case "cardio": [FieldSpec(field: .t, unit: "분", decimal: false, optional: false), FieldSpec(field: .d, unit: "km", decimal: true, optional: true)]
    default: [FieldSpec(field: .w, unit: "kg", decimal: true, optional: false), FieldSpec(field: .r, unit: "회", decimal: false, optional: false)]
    }
  }
}

// MARK: - Text and records

nonisolated enum SetMath {
  static func num(_ v: Double?) -> String {
    guard let v else { return "" }
    return v.rounded() == v ? String(Int(v)) : String(format: "%g", v)
  }

  /// "60kg × 10", "12회 +5kg", "45초", "30분 · 5km"
  static func text(_ kind: String, _ s: LoggedSet) -> String {
    switch kind {
    case "r": return (s.w ?? 0) > 0 ? "\(num(s.r))회 +\(num(s.w))kg" : "\(num(s.r))회"
    case "t": return "\(num(s.t))초"
    case "wt": return "\(num(s.w))kg · \(num(s.t))초"
    case "cardio": return (s.d ?? 0) > 0 ? "\(num(s.t))분 · \(num(s.d))km" : "\(num(s.t))분"
    default: return "\(num(s.w))kg × \(num(s.r))"
    }
  }

  static func summary(_ ex: Exercise, _ sets: [LoggedSet]) -> String {
    let texts = sets.map { text(ex.kind, $0) }
    guard let first = texts.first else { return "" }
    if texts.allSatisfy({ $0 == first }) { return sets.count > 1 ? "\(first) · \(sets.count)세트" : first }
    return texts.count > 3 ? texts.prefix(3).joined(separator: ", ") + " 외 \(texts.count - 3)세트" : texts.joined(separator: ", ")
  }

  /// Heaviest set for weights, most reps for bodyweight, longest for time, farthest for cardio.
  static func best(_ ex: Exercise, _ sets: [LoggedSet]) -> LoggedSet? {
    sets.max { score(ex, $0) < score(ex, $1) }
  }

  private static func score(_ ex: Exercise, _ s: LoggedSet) -> Double {
    switch ex.kind {
    case "wr": (s.w ?? 0) * 1e4 + (s.r ?? 0)
    case "wt": (s.w ?? 0) * 1e5 + (s.t ?? 0)
    case "r": (s.r ?? 0) * 1e4 + (s.w ?? 0)
    case "cardio": (s.d ?? 0) * 1e5 + (s.t ?? 0)
    default: s.t ?? 0
    }
  }

  static func oneRepMax(_ ex: Exercise, _ s: LoggedSet?) -> Int? {
    guard ex.kind == "wr", let s, let w = s.w, let r = s.r, w > 0, r > 1, r <= 12 else { return nil }
    return Int((w * (1 + r / 30)).rounded())
  }

  /// "4세트 × 8~10회", "3세트 × 45초", "20~30분"
  static func routineText(_ ex: Exercise, _ item: RoutineItem) -> String {
    let range = item.range.replacingOccurrences(of: "-", with: "~")
    if ex.kind == "cardio" { return "\(range)분" }
    let each = range.isEmpty ? "최대" : (ex.kind == "t" || ex.kind == "wt") ? "\(range)초" : "\(range)회"
    return "\(item.sets)세트 × \(each)"
  }

  /// Sets for a first try at a routine exercise, the low end of the range filled in.
  static func routineSets(_ ex: Exercise, _ item: RoutineItem) -> [LoggedSet] {
    let low = Double(item.range.split(separator: "-").first ?? "")
    return (0..<max(1, item.sets)).map { _ in
      var s = LoggedSet()
      if ex.kind == "wr" || ex.kind == "r" { s.r = low } else { s.t = low }
      return s
    }
  }
}
