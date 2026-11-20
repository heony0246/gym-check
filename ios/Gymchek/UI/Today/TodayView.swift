import SwiftUI

/// The 오늘 tab: streak, this week, and one tap per part to check in.
struct TodayView: View {
  @Environment(Store.self) private var store
  @State private var popped: String?

  private var today: Date { Day.today() }
  private var todayKey: String { Day.key(today) }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 0) {
        header
          .padding(.bottom, 20)
        hero
          .padding(.bottom, 28)
        SectionHead(title: "오늘 한 운동", trailing: "꾹 눌러서 수정")
          .padding(.bottom, 12)
        tiles
      }
      .padding(.horizontal, 18)
      .padding(.top, 12)
      .padding(.bottom, 32)
    }
    .background(Color.bg)
    .sensoryFeedback(.impact(weight: .light), trigger: popped)
  }

  // MARK: Header

  private var title: String {
    let done = store.data.parts.filter { store.parts(on: todayKey).contains($0.id) }.map(\.name)
    if done.isEmpty { return "오늘 어디 털었어요?" }
    if done.count > 3 { return "오늘 \(done.count)부위 완료" }
    return done.joined(separator: "·") + " 완료"
  }

  private var header: some View {
    VStack(alignment: .leading, spacing: 6) {
      Kicker(text: "Today · \(Day.kicker(today))", color: .volt)
      Text(title)
        .font(.system(size: 30, weight: .heavy))
        .tracking(-1)
        .contentTransition(.opacity)
    }
  }

  // MARK: Streak card

  private var hero: some View {
    let streak = store.streak(today: today)
    let year = Day.calendar.component(.year, from: today)
    let week = store.weekCount(today: today)
    let goal = store.data.weeklyGoal
    return VStack(spacing: 16) {
      HStack(alignment: .bottom) {
        VStack(alignment: .leading, spacing: 4) {
          Kicker(text: "Streak", size: 12)
          HStack(alignment: .firstTextBaseline, spacing: 6) {
            Text("\(streak)")
              .font(.display(76))
              .foregroundStyle(streak > 0 ? Color.volt : Color.faint)
              .contentTransition(.numericText(value: Double(streak)))
            Text("일 연속").font(.system(size: 16, weight: .heavy))
          }
        }
        Spacer()
        VStack(alignment: .trailing, spacing: 4) {
          Kicker(text: "\(year) Season", size: 12)
          (Text("\(store.yearDays(year))").font(.display(34))
            + Text("/\(Day.daysInYear(year))").font(.display(19)).foregroundStyle(Color.muted))
        }
      }
      Divider().overlay(Color.line)
      VStack(spacing: 12) {
        HStack {
          Text("이번 주").font(.system(size: 13, weight: .bold)).foregroundStyle(Color.muted)
          Spacer()
          Text(week >= goal ? "\(week) / \(goal)회 · 목표 달성" : "\(week) / \(goal)회")
            .font(.system(size: 13, weight: .bold))
            .foregroundStyle(week >= goal ? Color.volt : Color.muted)
        }
        WeekRow(today: today)
      }
    }
    .padding(18)
    .background(Color.surface, in: .rect(cornerRadius: 22))
  }

  // MARK: Part tiles

  private var tiles: some View {
    let done = Set(store.parts(on: todayKey))
    let last = store.lastDone(upTo: todayKey)
    return LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 3), spacing: 8) {
      ForEach(store.data.parts) { part in
        let on = done.contains(part.id)
        PartTile(part: part, on: on, label: label(for: part, on: on, last: last[part.id]), stale: isStale(last[part.id]) && !on)
          .onTapGesture {
            withAnimation(.easeOut(duration: 0.2)) {
              popped = store.toggle(part.id, on: todayKey) ? part.id : nil
            }
          }
      }
    }
  }

  private func label(for part: Part, on: Bool, last: String?) -> String {
    if on { return "오늘 완료" }
    guard let last, let date = Day.date(last) else { return "기록 없음" }
    let n = Day.daysBetween(date, today)
    return n == 1 ? "어제 함" : "\(n)일 전"
  }

  private func isStale(_ last: String?) -> Bool {
    guard let last, let date = Day.date(last) else { return false }
    return Day.daysBetween(date, today) >= 7
  }
}

struct PartTile: View {
  let part: Part
  let on: Bool
  let label: String
  let stale: Bool

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      HStack(spacing: 5) {
        RoundedRectangle(cornerRadius: 1.5).fill(Color(css: part.color)).frame(width: 3, height: 11)
        Text(part.englishTag).font(.kicker(11)).tracking(1.2)
          .foregroundStyle(on ? Color.onVolt.opacity(0.62) : Color.muted)
      }
      Text(part.name)
        .font(.system(size: 22, weight: .heavy))
        .tracking(-0.6)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .padding(.top, 9)
      Spacer(minLength: 14)
      HStack {
        Text(label)
          .font(.system(size: 12, weight: .semibold))
          .foregroundStyle(on ? Color.onVolt.opacity(0.62) : stale ? Color.warn : Color.muted)
          .lineLimit(1)
        Spacer(minLength: 4)
        ZStack {
          Circle().strokeBorder(on ? Color.clear : Color.lineStrong, lineWidth: 1.5)
            .background(Circle().fill(on ? Color.onVolt : Color.clear))
          if on {
            Image(systemName: "checkmark").font(.system(size: 11, weight: .black)).foregroundStyle(Color.volt)
          }
        }
        .frame(width: 22, height: 22)
      }
    }
    .foregroundStyle(on ? Color.onVolt : Color.ink)
    .padding(EdgeInsets(top: 12, leading: 11, bottom: 11, trailing: 11))
    .frame(maxWidth: .infinity, minHeight: 112, alignment: .topLeading)
    .background(on ? Color.volt : Color.surface, in: .rect(cornerRadius: 16))
    .contentShape(.rect(cornerRadius: 16))
    .accessibilityElement(children: .combine)
    .accessibilityAddTraits(on ? [.isButton, .isSelected] : .isButton)
  }
}

/// Mon–Sun circles for the current week.
struct WeekRow: View {
  @Environment(Store.self) private var store
  let today: Date

  var body: some View {
    let start = Day.startOfWeek(today)
    HStack(spacing: 4) {
      ForEach(0..<7, id: \.self) { i in
        let day = Day.add(start, days: i)
        let key = Day.key(day)
        let on = store.attended(key)
        let isToday = day == today
        let future = day > today
        VStack(spacing: 7) {
          Text(Day.weekdaysKR[Day.calendar.component(.weekday, from: day) - 1])
            .font(.system(size: 11, weight: .bold))
            .foregroundStyle(isToday ? Color.volt : Color.muted)
          ZStack {
            if on {
              Circle().fill(Color.volt)
              Image(systemName: "checkmark").font(.system(size: 13, weight: .black)).foregroundStyle(Color.onVolt)
            } else if isToday {
              Circle().strokeBorder(Color.volt, lineWidth: 2)
              Text("\(Day.calendar.component(.day, from: day))").font(.display(16, weight: .bold)).foregroundStyle(Color.volt)
            } else if future {
              Circle().strokeBorder(Color.lineStrong, lineWidth: 1)
              Text("\(Day.calendar.component(.day, from: day))").font(.display(16, weight: .bold)).foregroundStyle(Color.faint)
            } else {
              Circle().fill(Color.surface2)
              Text("\(Day.calendar.component(.day, from: day))").font(.display(16, weight: .bold)).foregroundStyle(Color.muted)
            }
          }
          .frame(width: 36, height: 36)
        }
        .frame(maxWidth: .infinity)
      }
    }
  }
}
