import Foundation

/// Dates as the app stores them: local-time day keys like "2026-11-20", weeks start Monday.
nonisolated enum Day {
  static let calendar: Calendar = {
    var c = Calendar(identifier: .gregorian)
    c.firstWeekday = 2
    c.timeZone = .current
    return c
  }()

  static func today() -> Date { calendar.startOfDay(for: Date()) }

  static func key(_ date: Date) -> String {
    let c = calendar.dateComponents([.year, .month, .day], from: date)
    return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
  }

  static func date(_ key: String) -> Date? {
    let p = key.split(separator: "-").compactMap { Int($0) }
    guard p.count == 3 else { return nil }
    return calendar.date(from: DateComponents(year: p[0], month: p[1], day: p[2]))
  }

  static func add(_ date: Date, days: Int) -> Date {
    calendar.date(byAdding: .day, value: days, to: date) ?? date
  }

  static func startOfWeek(_ date: Date) -> Date {
    let weekday = calendar.component(.weekday, from: date) // 1 = Sunday
    return add(calendar.startOfDay(for: date), days: -((weekday + 5) % 7))
  }

  static func daysBetween(_ a: Date, _ b: Date) -> Int {
    calendar.dateComponents([.day], from: calendar.startOfDay(for: a), to: calendar.startOfDay(for: b)).day ?? 0
  }

  static func daysInYear(_ year: Int) -> Int {
    calendar.range(of: .day, in: .year, for: calendar.date(from: DateComponents(year: year)) ?? Date())?.count ?? 365
  }

  static let weekdaysKR = ["일", "월", "화", "수", "목", "금", "토"]
  static let weekdaysEN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

  /// "11.20 FRI"
  static func kicker(_ date: Date) -> String {
    let c = calendar.dateComponents([.month, .day, .weekday], from: date)
    return String(format: "%02d.%02d %@", c.month ?? 0, c.day ?? 0, weekdaysEN[(c.weekday ?? 1) - 1])
  }
}
