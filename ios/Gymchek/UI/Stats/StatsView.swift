import SwiftUI

/// The 기록 tab, in three pages so each one says one thing: 요약 (the season, months,
/// parts), 배지 (what's next, then every badge), 종목 (each lift's best).
struct StatsView: View {
  @Environment(Store.self) private var store
  @State private var year = Day.calendar.component(.year, from: Day.today())
  @State private var route: ExerciseRoute?
  @AppStorage("statsPage") private var page = Page.summary

  enum Page: String, CaseIterable {
    case summary, badges, lifts
    var title: String {
      switch self {
      case .summary: "요약"
      case .badges: "배지"
      case .lifts: "종목"
      }
    }
  }

  private var today: Date { Day.today() }
  private var currentYear: Int { Day.calendar.component(.year, from: today) }
  private var firstYear: Int {
    let years = store.data.records.keys.compactMap { Int($0.prefix(4)) }
    return min(currentYear, years.min() ?? currentYear)
  }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 0) {
        VStack(alignment: .leading, spacing: 4) {
          Kicker(text: "Records", color: .volt)
          Text("기록").font(.system(size: 30, weight: .heavy)).tracking(-1)
        }
        .padding(.bottom, 16)
        pagePicker.padding(.bottom, 24)
        switch page {
        case .summary: summary
        case .badges: BadgesPage()
        case .lifts: lifts
        }
      }
      .padding(.horizontal, 18)
      .padding(.top, 12)
      .padding(.bottom, 32)
    }
    .background(Color.bg)
    .sheet(item: $route) { ExerciseSheet(route: $0) }
    .sensoryFeedback(.selection, trigger: page)
  }

  private var pagePicker: some View {
    HStack(spacing: 2) {
      ForEach(Page.allCases, id: \.self) { p in
        let on = page == p
        Button { withAnimation(.snappy(duration: 0.25)) { page = p } } label: {
          Text(p.title).font(.system(size: 14, weight: .heavy))
            .foregroundStyle(on ? Color.onVolt : Color.muted)
            .frame(maxWidth: .infinity, minHeight: 36)
            .background(on ? Color.volt : .clear, in: .capsule)
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(on ? .isSelected : [])
      }
    }
    .padding(3)
    .background(Color.surface, in: .capsule)
  }

  // MARK: 요약

  private var summary: some View {
    let s = YearStats(records: store.data.records, year: year)
    let badge = store.badgeStats
    let thisMonth = String(Day.key(today).prefix(7))
    let monthDays = store.data.records.filter { $0.key.hasPrefix(thisMonth) && !$0.value.isEmpty }.count
    return VStack(alignment: .leading, spacing: 0) {
      HStack(alignment: .center) {
        Text("\(String(year)) 시즌").font(.system(size: 18, weight: .heavy))
          .contentTransition(.numericText(value: Double(year)))
        Spacer()
        HStack(spacing: 8) {
          yearButton("chevron.left", label: "이전 해", enabled: year > firstYear) { year -= 1 }
          yearButton("chevron.right", label: "다음 해", enabled: year < currentYear) { year += 1 }
        }
      }
      .padding(.bottom, 8)
      hero(s).padding(.bottom, 20)
      HStack(spacing: 8) {
        statTile("이번 달", monthDays, "일")
        statTile("최장 연속", badge.bestStreak, "일")
        statTile("총 출석", badge.total, "일")
      }
      .padding(.bottom, 30)
      block("월별 출석", kicker: "Monthly") { monthBars(s) }
      block("부위별 횟수", kicker: "By part") { partRows(s) }
    }
  }

  private func statTile(_ label: String, _ value: Int, _ unit: String) -> some View {
    VStack(alignment: .leading, spacing: 6) {
      Text(label).font(.system(size: 12, weight: .bold)).foregroundStyle(Color.muted)
      HStack(alignment: .firstTextBaseline, spacing: 2) {
        Text("\(value)").font(.display(30)).contentTransition(.numericText(value: Double(value)))
        Text(unit).font(.system(size: 12, weight: .bold)).foregroundStyle(Color.muted)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(14)
    .background(Color.surface, in: .rect(cornerRadius: 16))
  }

  private func yearButton(_ symbol: String, label: String, enabled: Bool, action: @escaping () -> Void) -> some View {
    Button { withAnimation(.snappy) { action() } } label: {
      Image(systemName: symbol)
        .font(.system(size: 15, weight: .bold))
        .foregroundStyle(Color.ink)
        .frame(width: 36, height: 36)
        .background(Color.surface2, in: .circle)
    }
    .buttonStyle(PressScale())
    .disabled(!enabled)
    .opacity(enabled ? 1 : 0.3)
    .accessibilityLabel(label)
  }

  // MARK: Season

  private func hero(_ s: YearStats) -> some View {
    let total = Day.daysInYear(year)
    let sub: String
    if year == currentYear {
      let elapsed = Day.daysBetween(Day.calendar.date(from: DateComponents(year: year, month: 1, day: 1)) ?? today, today) + 1
      sub = "올해 \(elapsed)일 지났고, 그중 \(s.days)일 갔어요 (\(percent(s.days, elapsed))%)"
    } else {
      sub = "\(String(year))년 출석률 \(percent(s.days, total))%"
    }
    return VStack(alignment: .leading, spacing: 10) {
      HStack(alignment: .firstTextBaseline, spacing: 4) {
        Text("\(s.days)").font(.display(84, weight: .black)).foregroundStyle(Color.volt)
          .contentTransition(.numericText(value: Double(s.days)))
        Text("/\(total)").font(.display(30)).foregroundStyle(Color.muted)
        Text("일 출석").font(.system(size: 15, weight: .heavy)).padding(.leading, 4)
      }
      .lineLimit(1)
      .minimumScaleFactor(0.6)
      // The display face carries a lot of air above its digits.
      .padding(.top, -14)
      ProgressBar(value: Double(s.days) / Double(total))
      Text(sub).font(.system(size: 13, weight: .semibold)).foregroundStyle(Color.muted)
    }
  }

  private func percent(_ n: Int, _ of: Int) -> Int { of > 0 ? Int((Double(n) / Double(of) * 100).rounded()) : 0 }

  // MARK: Blocks

  private func block(_ title: String, kicker: String, @ViewBuilder content: () -> some View) -> some View {
    VStack(alignment: .leading, spacing: 14) {
      HStack(alignment: .firstTextBaseline) {
        Text(title).font(.system(size: 18, weight: .heavy))
        Spacer()
        Kicker(text: kicker, size: 11)
      }
      content()
    }
    .padding(.bottom, 30)
  }

  private func monthBars(_ s: YearStats) -> some View {
    let maxValue = max(10, s.months.max() ?? 0)
    let month = Day.calendar.component(.month, from: today) - 1
    return HStack(alignment: .bottom, spacing: 4) {
      ForEach(0..<12, id: \.self) { i in
        let n = s.months[i]
        let current = year == currentYear && i == month
        let future = year == currentYear && i > month
        VStack(spacing: 7) {
          ZStack(alignment: .bottom) {
            Color.clear
            VStack(spacing: 4) {
              // Only months with days get a number; empty ones are a thin line.
              if n > 0 {
                Text("\(n)").font(.display(13, weight: .bold))
                  .foregroundStyle(current ? Color.volt : Color.muted)
              }
              RoundedRectangle(cornerRadius: 3)
                .fill(n == 0 ? Color.surface2 : current ? Color.volt : Color.ink.opacity(0.55))
                .frame(height: n == 0 ? 3 : max(6, 64 * CGFloat(n) / CGFloat(maxValue)))
                .opacity(future ? 0.4 : 1)
            }
          }
          .frame(height: 84)
          Text("\(i + 1)월").font(.system(size: 10, weight: .bold))
            .foregroundStyle(current ? Color.volt : Color.faint)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity)
      }
    }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel((0..<12).map { "\($0 + 1)월 \(s.months[$0])일" }.joined(separator: ", "))
  }

  private func partRows(_ s: YearStats) -> some View {
    let top = store.data.parts.map { s.parts[$0.id] ?? 0 }.max() ?? 0
    return VStack(spacing: 14) {
      ForEach(store.data.parts) { part in
        let n = s.parts[part.id] ?? 0
        let color = Color(css: part.color)
        HStack(spacing: 12) {
          Text(part.name).font(.system(size: 15, weight: .bold)).lineLimit(1)
            .frame(width: 72, alignment: .leading)
          GeometryReader { g in
            ZStack(alignment: .leading) {
              Capsule().fill(Color.surface2)
              Capsule().fill(color).frame(width: top > 0 ? g.size.width * CGFloat(n) / CGFloat(top) : 0)
            }
          }
          .frame(height: 6)
          Text("\(n)").font(.display(22))
            .foregroundStyle(top > 0 && n == top ? Color.volt : Color.ink)
            .frame(width: 40, alignment: .trailing)
        }
      }
    }
  }

  // MARK: 종목

  private var lifts: some View {
    let rows = liftRows
    return VStack(spacing: 0) {
      HStack(alignment: .firstTextBaseline) {
        Text("종목별 최고 기록").font(.system(size: 18, weight: .heavy))
        Spacer()
        Kicker(text: "\(rows.count)종목", size: 11)
      }
      .padding(.bottom, 8)
      if rows.isEmpty {
        Text("종목을 기록하면 여기 쌓여요")
          .font(.system(size: 13, weight: .semibold)).foregroundStyle(Color.muted)
          .frame(maxWidth: .infinity, alignment: .leading)
          .padding(.top, 12)
      }
      ForEach(rows, id: \.ex.id) { row in
        Button { route = .history(exId: row.ex.id) } label: {
          HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
              Text(row.ex.shortName).font(.system(size: 15, weight: .heavy)).lineLimit(1)
              Text("\(row.count)번 · 마지막 \(shortDay(row.last))").font(.system(size: 12, weight: .semibold)).foregroundStyle(Color.muted)
            }
            Spacer(minLength: 8)
            VStack(alignment: .trailing, spacing: 2) {
              if let best = row.best { Text(SetMath.text(row.ex.kind, best)).font(.system(size: 15, weight: .heavy)) }
              if let orm = SetMath.oneRepMax(row.ex, row.best) {
                Text("1RM \(orm)kg").font(.system(size: 12, weight: .semibold)).foregroundStyle(Color.muted)
              }
            }
          }
          .padding(.vertical, 12)
          .overlay(alignment: .top) { Rectangle().fill(Color.line).frame(height: 1) }
          .contentShape(.rect)
        }
        .buttonStyle(.plain)
      }
    }
  }

  private struct LiftRow {
    let ex: Exercise
    let count: Int
    let last: String
    let best: LoggedSet?
  }

  /// Every exercise ever logged, the most recent first.
  private var liftRows: [LiftRow] {
    var byEx: [String: [(date: String, sets: [LoggedSet])]] = [:]
    for (date, list) in store.data.logs { for e in list { byEx[e.ex, default: []].append((date, e.sets)) } }
    return byEx.compactMap { id, history in
      guard let ex = store.exercise(id), let last = history.map(\.date).max() else { return nil }
      return LiftRow(ex: ex, count: history.count, last: last, best: SetMath.best(ex, history.flatMap(\.sets)))
    }
    .sorted { $0.last > $1.last }
  }
}

/// Days, days per month and checks per part in one year.
struct YearStats {
  var days = 0
  var months = Array(repeating: 0, count: 12)
  var parts: [String: Int] = [:]

  init(records: [String: [String]], year: Int) {
    let prefix = "\(year)-"
    for (key, ids) in records where key.hasPrefix(prefix) && !ids.isEmpty {
      days += 1
      if let m = Int(key.dropFirst(5).prefix(2)), (1...12).contains(m) { months[m - 1] += 1 }
      for id in ids { parts[id, default: 0] += 1 }
    }
  }
}

struct ProgressBar: View {
  let value: Double

  var body: some View {
    GeometryReader { g in
      ZStack(alignment: .leading) {
        Capsule().fill(Color.surface2)
        Capsule().fill(Color.volt).frame(width: g.size.width * min(1, max(0, value)))
      }
    }
    .frame(height: 6)
  }
}

// MARK: - Badges

/// 배지: how many so far, the few closest to unlocking, then every badge in a grid.
struct BadgesPage: View {
  @Environment(Store.self) private var store
  @State private var detail: Badge?

  private struct Group: Identifiable {
    let id: String
    let title: String
    let badges: [Badge]
  }

  var body: some View {
    let stats = store.badgeStats
    let groups = makeGroups(stats)
    let all = groups.flatMap(\.badges)
    let earned = all.filter { $0.earned(stats) }.count
    VStack(alignment: .leading, spacing: 0) {
      HStack(alignment: .firstTextBaseline, spacing: 4) {
        Text("\(earned)").font(.display(44)).foregroundStyle(Color.volt)
        Text("/ \(all.count)개 획득").font(.system(size: 15, weight: .bold)).foregroundStyle(Color.muted)
      }
      ProgressBar(value: all.isEmpty ? 0 : Double(earned) / Double(all.count))
        .padding(.top, 8)
        .padding(.bottom, 26)

      let next = nextUp(all, stats)
      if !next.isEmpty {
        Text("다음 배지").font(.system(size: 18, weight: .heavy)).padding(.bottom, 10)
        VStack(spacing: 8) {
          ForEach(next) { b in
            let (n, goal) = b.progress(stats)
            Button { detail = b } label: {
              HStack(spacing: 14) {
                MedalView(badge: b, on: false, size: 46)
                VStack(alignment: .leading, spacing: 6) {
                  HStack {
                    Text(b.name).font(.system(size: 15, weight: .heavy)).foregroundStyle(Color.ink)
                    Spacer()
                    Text("\(n) / \(goal)").font(.system(size: 12, weight: .bold)).foregroundStyle(Color.muted)
                  }
                  ProgressBar(value: Double(n) / Double(max(goal, 1)))
                }
              }
              .padding(12)
              .background(Color.surface, in: .rect(cornerRadius: 16))
            }
            .buttonStyle(PressScale(scale: 0.98))
          }
        }
        .padding(.bottom, 28)
      }

      ForEach(groups) { group in
        let got = group.badges.filter { $0.earned(stats) }.count
        HStack(alignment: .firstTextBaseline) {
          Text(group.title).font(.system(size: 15, weight: .heavy))
          Spacer()
          Text("\(got) / \(group.badges.count)").font(.system(size: 12, weight: .bold)).foregroundStyle(Color.faint)
        }
        .padding(.bottom, 12)
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 4), spacing: 14) {
          ForEach(group.badges) { b in
            let on = b.earned(stats)
            Button { detail = b } label: {
              VStack(spacing: 6) {
                MedalView(badge: b, on: on, size: 58)
                Text(shortName(b))
                  .font(.system(size: 11, weight: .bold))
                  .foregroundStyle(on ? Color.ink : Color.faint)
                  .lineLimit(1)
                  .minimumScaleFactor(0.75)
              }
              .frame(maxWidth: .infinity)
            }
            .buttonStyle(PressScale(scale: 0.94))
            .accessibilityLabel("\(b.name), \(on ? "획득" : "미획득")")
          }
        }
        .padding(.bottom, 26)
      }
    }
    .sheet(item: $detail) { BadgeDetail(badge: $0) }
  }

  /// Under a "2026 시즌" / "월간 챌린지" heading the year is already said: "50일", "11월".
  private func shortName(_ b: Badge) -> String {
    switch b.group {
    case "season": "\(b.num)일"
    case "monthly": "\(b.num)월"
    default: b.name
    }
  }

  /// Unearned badges closest to done, leaving out past months (they can't be earned any more).
  private func nextUp(_ all: [Badge], _ s: BadgeStats) -> [Badge] {
    let thisMonth = "m" + String(Day.key(Day.today()).prefix(7))
    return all
      .filter { !$0.earned(s) && ($0.group != "monthly" || $0.id == thisMonth) }
      .map { b -> (Badge, Double) in let (n, goal) = b.progress(s); return (b, Double(n) / Double(max(goal, 1))) }
      .filter { $0.1 > 0 }
      .sorted { $0.1 > $1.1 }
      .prefix(3)
      .map(\.0)
  }

  private func makeGroups(_ s: BadgeStats) -> [Group] {
    let timed = Badges.timed(s)
    var out = [Group(id: "monthly", title: "월간 챌린지 · 한 달 \(Badges.monthGoal)일", badges: timed.filter { $0.group == "monthly" }.reversed())]
    let seasons = timed.filter { $0.group == "season" }
    let years = Set(seasons.compactMap { $0.unit.split(separator: " ").first.flatMap { Int($0) } }).sorted(by: >)
    for y in years {
      out.append(Group(id: "season\(y)", title: "\(y) 시즌", badges: seasons.filter { $0.unit.hasPrefix("\(y) ") }))
    }
    for g in Badges.groups where g.id != "monthly" && g.id != "season" {
      let list = Badges.fixed.filter { $0.group == g.id }
      if !list.isEmpty { out.append(Group(id: g.id, title: g.name, badges: list)) }
    }
    return out
  }
}

/// One badge up close: what it's for and how far along you are.
struct BadgeDetail: View {
  @Environment(Store.self) private var store
  let badge: Badge

  var body: some View {
    let stats = store.badgeStats
    let (n, goal) = badge.progress(stats)
    let on = n >= goal
    VStack(spacing: 14) {
      MedalView(badge: badge, on: on, size: 110).padding(.top, 28)
      Text(badge.name).font(.system(size: 22, weight: .heavy))
      Text(badge.desc).font(.system(size: 15, weight: .semibold)).foregroundStyle(Color.muted)
      if on {
        Text("획득했어요").font(.system(size: 14, weight: .heavy)).foregroundStyle(Color.volt)
      } else if goal > 1 {
        VStack(spacing: 6) {
          ProgressBar(value: Double(n) / Double(goal))
          Text("\(n.formatted()) / \(goal.formatted())").font(.system(size: 13, weight: .bold)).foregroundStyle(Color.muted)
        }
        .padding(.horizontal, 40)
      }
      Spacer()
    }
    .frame(maxWidth: .infinity)
    .background(Color.bg)
    .presentationDetents([.height(340)])
    .presentationDragIndicator(.visible)
  }
}
