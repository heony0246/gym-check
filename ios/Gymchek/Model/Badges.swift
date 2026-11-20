import Foundation

// Badges, worked out from the records alone (same rules as the web app), so a new
// phone or a restored backup shows the same set.

nonisolated struct BadgeStats: Sendable {
  var total = 0
  var bestStreak = 0
  var bestGoalRun = 0
  var bestMonth = 0
  var fullMonth = false
  var partCounts: [String: Int] = [:]
  var maxPartsDay = 0
  var allParts = false
  var photos = 0
  var perfectWeek = false
  var weekend = false
  var mondays = 0
  var xmas = false
  var newYear = false
  var comeback = false
  var crewWins = 0
  var first: String?
  var months: [String: Int] = [:]
  var years: [String: Int] = [:]
}

nonisolated struct BadgeGroup: Sendable {
  let id: String
  let name: String
  let color: String
  let shape: BadgeShape
}

nonisolated enum BadgeShape: Sendable { case circle, square, shield }

nonisolated struct Badge: Identifiable, Sendable {
  let id: String
  let group: String
  let num: String
  let unit: String
  let name: String
  let desc: String
  var color: String?
  var rainbow = false
  var current = false
  let progress: @Sendable (BadgeStats) -> (Int, Int)

  func earned(_ s: BadgeStats) -> Bool { let (n, goal) = progress(s); return n >= goal }
}

nonisolated enum Badges {
  static let groups: [BadgeGroup] = [
    BadgeGroup(id: "days", name: "누적 출석", color: "#D4FF3F", shape: .circle),
    BadgeGroup(id: "streak", name: "연속 출석", color: "#FF8A3D", shape: .square),
    BadgeGroup(id: "goal", name: "주간 목표", color: "#7FB2FF", shape: .shield),
    BadgeGroup(id: "month", name: "한 달", color: "#B794FF", shape: .circle),
    BadgeGroup(id: "parts", name: "부위", color: "#D4FF3F", shape: .square),
    BadgeGroup(id: "photo", name: "오운완 사진", color: "#F4F4F0", shape: .circle),
    BadgeGroup(id: "special", name: "스페셜", color: "#FFD43B", shape: .shield),
    BadgeGroup(id: "crew", name: "크루 1등", color: "#FF8FB1", shape: .square),
    BadgeGroup(id: "monthly", name: "월간 챌린지", color: "#D4FF3F", shape: .circle),
    BadgeGroup(id: "season", name: "시즌", color: "#38D9F5", shape: .shield),
  ]

  static func group(_ id: String) -> BadgeGroup { groups.first { $0.id == id } ?? groups[0] }

  private static func flag(_ v: Bool) -> (Int, Int) { (v ? 1 : 0, 1) }

  static let fixed: [Badge] = {
    var out: [Badge] = []
    for (n, name, desc) in [(1, "첫 출석", "헬스장 첫 체크"), (10, "", ""), (25, "", ""), (50, "", ""), (75, "", ""), (100, "", ""),
                            (150, "", ""), (200, "", ""), (300, "", ""), (365, "365일", "누적 1년치 출석"), (500, "", ""), (1000, "", "")] {
      out.append(Badge(id: "days\(n)", group: "days", num: "\(n)", unit: n == 1 ? "Day" : "Days",
                       name: name.isEmpty ? "\(n)일" : name, desc: desc.isEmpty ? "누적 \(n)일 출석" : desc) { ($0.total, n) })
    }
    for (n, desc) in [(3, "3일 연달아 출석"), (5, "5일 연달아 출석"), (7, "일주일 내내 출석"), (10, "10일 연달아 출석"),
                      (14, "2주 내내 출석"), (21, "3주 내내 출석"), (30, "한 달 내내 출석")] {
      out.append(Badge(id: "streak\(n)", group: "streak", num: "\(n)", unit: "Streak", name: "\(n)일 연속", desc: desc) { ($0.bestStreak, n) })
    }
    for (n, name, desc) in [(1, "주간 목표 달성", "한 주 목표 처음 달성"), (2, "", "2주 내리 목표 달성"), (4, "", "한 달 내리 목표 달성"),
                            (8, "", "두 달 내리 목표 달성"), (12, "", "석 달 내리 목표 달성"), (26, "", "반년 내리 목표 달성"), (52, "", "1년 내내 목표 달성")] {
      out.append(Badge(id: "goal\(n)", group: "goal", num: "\(n)", unit: n == 1 ? "Week" : "Weeks",
                       name: name.isEmpty ? "\(n)주 연속 목표" : name, desc: desc) { ($0.bestGoalRun, n) })
    }
    for n in [10, 15, 20, 25] {
      out.append(Badge(id: "month\(n)", group: "month", num: "\(n)", unit: "A month", name: "한 달 \(n)일", desc: "한 달에 \(n)일 출석") { ($0.bestMonth, n) })
    }
    out.append(Badge(id: "monthFull", group: "month", num: "Full", unit: "Month", name: "한 달 개근", desc: "한 달 하루도 안 빠짐") { flag($0.fullMonth) })
    for p in Part.defaults {
      out.append(Badge(id: "part-\(p.id)", group: "parts", num: "30", unit: Part.english[p.id] ?? "", name: "\(p.name) 30번",
                       desc: "\(p.name) 운동 30번", color: p.color) { ($0.partCounts[p.id] ?? 0, 30) })
    }
    out.append(Badge(id: "allParts", group: "parts", num: "All", unit: "Parts", name: "올라운더", desc: "한 주에 모든 부위", rainbow: true) { flag($0.allParts) })
    out.append(Badge(id: "fullDay", group: "parts", num: "4+", unit: "In a day", name: "풀코스", desc: "하루에 4부위 이상") { ($0.maxPartsDay, 4) })
    for (n, name, desc) in [(1, "첫 오운완", "오운완 사진 처음 저장"), (10, "", ""), (30, "", ""), (100, "", "")] {
      out.append(Badge(id: "photo\(n)", group: "photo", num: "\(n)", unit: n == 1 ? "Photo" : "Photos",
                       name: name.isEmpty ? "오운완 \(n)장" : name, desc: desc.isEmpty ? "오운완 사진 \(n)장 저장" : desc) { ($0.photos, n) })
    }
    out += [
      Badge(id: "perfectWeek", group: "special", num: "7/7", unit: "Week", name: "완벽한 한 주", desc: "월~일 7일 모두 출석") { flag($0.perfectWeek) },
      Badge(id: "weekend", group: "special", num: "S+S", unit: "Weekend", name: "주말 반납", desc: "토·일 이틀 다 출석") { flag($0.weekend) },
      Badge(id: "mondays", group: "special", num: "10", unit: "Mondays", name: "월요병 없음", desc: "월요일 출석 10번") { ($0.mondays, 10) },
      Badge(id: "xmas", group: "special", num: "12.25", unit: "Xmas", name: "메리 운동마스", desc: "크리스마스에 출석") { flag($0.xmas) },
      Badge(id: "newYear", group: "special", num: "1.1", unit: "New year", name: "새해 첫 운동", desc: "1월 1일에 출석") { flag($0.newYear) },
      Badge(id: "comeback", group: "special", num: "Back", unit: "Comeback", name: "다시 시작", desc: "2주 넘게 쉬다가 복귀") { flag($0.comeback) },
    ]
    for (n, name, desc) in [(1, "크루 1등", "크루에서 한 주 1등"), (5, "", ""), (10, "", ""), (25, "", "")] {
      out.append(Badge(id: "crewWin\(n)", group: "crew", num: "\(n)", unit: n == 1 ? "Win" : "Wins",
                       name: name.isEmpty ? "크루 1등 \(n)번" : name, desc: desc.isEmpty ? "크루에서 한 주 1등 \(n)번" : desc) { ($0.crewWins, n) })
    }
    return out
  }()

  static let monthGoal = 12
  private static let monthShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  private static let monthColors = ["#7FB2FF", "#B794FF", "#FF8FB1", "#9BE15D", "#3DDC97", "#38D9F5", "#FFD43B", "#FF8A3D", "#FF6B6B", "#FFB067", "#D4FF3F", "#F4F4F0"]
  private static let seasonColors = ["#D4FF3F", "#38D9F5", "#FF8FB1", "#FFD43B", "#B794FF"]

  /// Badges that never run out: one per month since the first check-in, four per season.
  static func timed(_ s: BadgeStats, today: Date = Day.today()) -> [Badge] {
    let start = s.first.flatMap(Day.date) ?? today
    var out: [Badge] = []
    let cal = Day.calendar
    var month = cal.date(from: cal.dateComponents([.year, .month], from: start)) ?? start
    let thisMonth = String(Day.key(today).prefix(7))
    while month <= today {
      let y = cal.component(.year, from: month)
      let m = cal.component(.month, from: month)
      let key = String(format: "%04d-%02d", y, m)
      out.append(Badge(id: "m\(key)", group: "monthly", num: "\(m)", unit: "\(monthShort[m - 1]) \(y)", name: "\(y)년 \(m)월",
                       desc: "\(m)월에 \(monthGoal)일 출석", color: monthColors[m - 1], current: key == thisMonth) { ($0.months[key] ?? 0, monthGoal) })
      month = cal.date(byAdding: .month, value: 1, to: month) ?? today.addingTimeInterval(1)
    }
    let firstYear = cal.component(.year, from: start)
    for y in firstYear...cal.component(.year, from: today) {
      for n in [50, 100, 150, 200] {
        out.append(Badge(id: "s\(y)-\(n)", group: "season", num: "\(n)", unit: "\(y) Season", name: "\(y) 시즌 \(n)일",
                         desc: "\(y)년에 \(n)일 출석", color: seasonColors[y % seasonColors.count]) { ($0.years[String(y)] ?? 0, n) })
      }
    }
    return out
  }

  static func all(_ s: BadgeStats) -> [Badge] { fixed + timed(s) }

  static func earned(_ s: BadgeStats) -> Set<String> { Set(all(s).filter { $0.earned(s) }.map(\.id)) }

  static func stats(_ data: AppData, photos: Int, crewWins: Int) -> BadgeStats {
    var s = BadgeStats()
    s.photos = photos
    s.crewWins = crewWins
    let keys = data.records.filter { !$0.value.isEmpty }.keys.sorted()
    s.total = keys.count
    s.first = keys.first
    var run = 0
    var prev: Date?
    var weeks: [String: (n: Int, parts: Set<String>)] = [:]
    for k in keys {
      guard let d = Day.date(k) else { continue }
      let ids = data.records[k] ?? []
      let gap = prev.map { Day.daysBetween($0, d) } ?? 0
      run = gap == 1 ? run + 1 : 1
      s.bestStreak = max(s.bestStreak, run)
      if gap > 14 { s.comeback = true }
      prev = d
      s.maxPartsDay = max(s.maxPartsDay, ids.count)
      for id in ids { s.partCounts[id, default: 0] += 1 }
      let weekday = Day.calendar.component(.weekday, from: d)
      if weekday == 2 { s.mondays += 1 }
      if weekday == 7, data.records[Day.key(Day.add(d, days: 1))]?.isEmpty == false { s.weekend = true }
      if k.hasSuffix("-12-25") { s.xmas = true }
      if k.hasSuffix("-01-01") { s.newYear = true }
      let wk = Day.key(Day.startOfWeek(d))
      var w = weeks[wk] ?? (0, [])
      w.n += 1
      w.parts.formUnion(ids)
      weeks[wk] = w
      s.months[String(k.prefix(7)), default: 0] += 1
      s.years[String(k.prefix(4)), default: 0] += 1
    }
    var goalRun = 0
    var lastMet: Date?
    for wk in weeks.keys.sorted() {
      guard let w = weeks[wk], let d = Day.date(wk) else { continue }
      if w.n == 7 { s.perfectWeek = true }
      if data.parts.count > 1, data.parts.allSatisfy({ w.parts.contains($0.id) }) { s.allParts = true }
      guard w.n >= data.weeklyGoal else { lastMet = nil; continue }
      goalRun = lastMet.map { Day.daysBetween($0, d) == 7 } == true ? goalRun + 1 : 1
      s.bestGoalRun = max(s.bestGoalRun, goalRun)
      lastMet = d
    }
    s.bestMonth = s.months.values.max() ?? 0
    s.fullMonth = s.months.contains { key, n in
      let parts = key.split(separator: "-").compactMap { Int($0) }
      guard parts.count == 2, let date = Day.calendar.date(from: DateComponents(year: parts[0], month: parts[1])),
            let days = Day.calendar.range(of: .day, in: .month, for: date)?.count else { return false }
      return n == days
    }
    return s
  }
}
