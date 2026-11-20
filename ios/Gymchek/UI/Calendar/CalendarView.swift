import SwiftUI

/// The 달력 tab: one month of gym days, part dots under each day, a count per part.
struct CalendarView: View {
  @Environment(Store.self) private var store
  @State private var month = CalendarView.firstOfMonth(Day.today())
  @State private var openDay: DayKey?
  @State private var direction = 1

  struct DayKey: Identifiable { let id: String }

  private var today: Date { Day.today() }
  private var year: Int { Day.calendar.component(.year, from: month) }
  private var monthNumber: Int { Day.calendar.component(.month, from: month) }
  private var isCurrentMonth: Bool { month == Self.firstOfMonth(today) }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 0) {
        header.padding(.bottom, 16)
        monthStat.padding(.bottom, 14)
        grid
        legend.padding(.top, 12)
      }
      .padding(.horizontal, 18)
      .padding(.top, 12)
      .padding(.bottom, 32)
    }
    .background(Color.bg)
    .sheet(item: $openDay) { DaySheet(date: $0.id) }
  }

  // MARK: Header

  private var header: some View {
    HStack(alignment: .bottom) {
      VStack(alignment: .leading, spacing: 4) {
        Kicker(text: "Calendar", color: .volt)
        HStack(alignment: .firstTextBaseline, spacing: 8) {
          Text("\(monthNumber)월").font(.system(size: 30, weight: .heavy)).tracking(-1)
          Text(String(year)).font(.display(20)).foregroundStyle(Color.muted)
        }
        .contentTransition(.numericText(value: Double(monthNumber)))
      }
      Spacer()
      HStack(spacing: 8) {
        if !isCurrentMonth {
          Button("오늘") { go(to: Self.firstOfMonth(today)) }
            .font(.system(size: 13, weight: .heavy))
            .foregroundStyle(Color.ink)
            .padding(.horizontal, 14)
            .frame(height: 36)
            .background(Color.surface2, in: .capsule)
        }
        navButton("chevron.left", label: "이전 달") { shift(-1) }
        navButton("chevron.right", label: "다음 달") { shift(1) }
          .disabled(isCurrentMonth)
          .opacity(isCurrentMonth ? 0.3 : 1)
      }
      .buttonStyle(PressScale())
    }
  }

  private func navButton(_ symbol: String, label: String, action: @escaping () -> Void) -> some View {
    Button(action: action) {
      Image(systemName: symbol)
        .font(.system(size: 15, weight: .bold))
        .foregroundStyle(Color.ink)
        .frame(width: 36, height: 36)
        .background(Color.surface2, in: .circle)
    }
    .accessibilityLabel(label)
  }

  // MARK: Month

  private var daysInMonth: Int { Day.calendar.range(of: .day, in: .month, for: month)?.count ?? 30 }
  /// Blank cells before the 1st (weeks start Monday).
  private var lead: Int { (Day.calendar.component(.weekday, from: month) + 5) % 7 }
  private var keys: [String] { (0..<daysInMonth).map { Day.key(Day.add(month, days: $0)) } }

  private var monthStat: some View {
    let attended = keys.filter { store.attended($0) }.count
    return HStack(alignment: .firstTextBaseline, spacing: 8) {
      Text("\(attended)").font(.display(48)).foregroundStyle(Color.volt)
        .contentTransition(.numericText(value: Double(attended)))
      Text("일 출석").font(.system(size: 15, weight: .heavy))
      Spacer()
      Text("\(isCurrentMonth ? "이번 달" : "\(monthNumber)월") \(daysInMonth)일 중")
        .font(.system(size: 13, weight: .semibold)).foregroundStyle(Color.muted)
    }
  }

  private var grid: some View {
    let columns = Array(repeating: GridItem(.flexible(), spacing: 0), count: 7)
    let todayKey = Day.key(today)
    return VStack(spacing: 0) {
      LazyVGrid(columns: columns, spacing: 0) {
        ForEach(Array(["월", "화", "수", "목", "금", "토", "일"].enumerated()), id: \.offset) { i, name in
          Text(name)
            .font(.system(size: 12, weight: .bold))
            .foregroundStyle(i == 5 ? Color.sat : i == 6 ? Color.sun : Color.muted)
            .padding(.bottom, 10)
        }
        ForEach(0..<lead, id: \.self) { _ in Color.clear.frame(height: 56) }
        ForEach(Array(keys.enumerated()), id: \.element) { i, key in
          DayCell(key: key, number: i + 1, column: (lead + i) % 7, isToday: key == todayKey, future: key > todayKey) {
            openDay = DayKey(id: key)
          }
        }
      }
      .id(month)
      .transition(.asymmetric(insertion: .move(edge: direction > 0 ? .trailing : .leading).combined(with: .opacity),
                              removal: .opacity))
    }
    .padding(EdgeInsets(top: 12, leading: 6, bottom: 8, trailing: 6))
    .background(Color.surface, in: .rect(cornerRadius: 22))
    .clipShape(.rect(cornerRadius: 22))
    // Months change with the ‹ › buttons; a sideways swipe moves between tabs.
  }

  private var legend: some View {
    var counts: [String: Int] = [:]
    for key in keys { for id in store.parts(on: key) { counts[id, default: 0] += 1 } }
    return LazyVGrid(columns: [GridItem(.flexible(), spacing: 22), GridItem(.flexible())], spacing: 0) {
      ForEach(store.data.parts) { part in
        let n = counts[part.id] ?? 0
        HStack(spacing: 9) {
          // The same dot that sits under each date.
          Circle().fill(Color(css: part.color)).frame(width: 7, height: 7)
          Text(part.name).font(.system(size: 14, weight: .bold)).foregroundStyle(n > 0 ? Color.ink : Color.muted).lineLimit(1)
          Spacer(minLength: 4)
          Text("\(n)").font(.display(20)).foregroundStyle(n > 0 ? Color.ink : Color.faint)
        }
        .padding(.vertical, 9)
      }
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 6)
    .background(Color.surface, in: .rect(cornerRadius: 18))
  }

  // MARK: Navigation

  private func shift(_ by: Int) {
    guard let next = Day.calendar.date(byAdding: .month, value: by, to: month) else { return }
    go(to: next)
  }

  private func go(to target: Date) {
    guard target != month, target <= Self.firstOfMonth(today) else { return }
    direction = target > month ? 1 : -1
    withAnimation(.snappy(duration: 0.28)) { month = target }
  }

  static func firstOfMonth(_ date: Date) -> Date {
    Day.calendar.date(from: Day.calendar.dateComponents([.year, .month], from: date)) ?? date
  }
}

/// One day: the number (lime when you went), then a dot per part.
private struct DayCell: View {
  @Environment(Store.self) private var store
  let key: String
  let number: Int
  let column: Int
  let isToday: Bool
  let future: Bool
  let open: () -> Void

  var body: some View {
    let ids = store.parts(on: key)
    let parts = store.data.parts.filter { ids.contains($0.id) }
    let on = !ids.isEmpty
    let photo = store.photoKeys.contains(key)
    Button(action: open) {
      VStack(spacing: 4) {
        ZStack {
          if photo {
            DayThumb(key: key).clipShape(.circle).overlay(Circle().fill(.black.opacity(0.25)))
          } else if on { Circle().fill(Color.volt) }
          if isToday {
            Circle().strokeBorder(Color.volt, lineWidth: 2).padding(on ? -4 : 0)
          }
          Text("\(number)")
            .font(.display(18, weight: on ? .heavy : .bold))
            .monospacedDigit()
            .foregroundStyle(photo ? .white : on ? Color.onVolt : isToday ? Color.volt : column == 5 ? Color.sat : column == 6 ? Color.sun : Color.ink)
            .shadow(color: photo ? .black.opacity(0.5) : .clear, radius: 2)
        }
        .frame(width: 34, height: 34)
        HStack(spacing: 3) {
          ForEach(parts.prefix(4)) { Circle().fill(Color(css: $0.color)).frame(width: 5, height: 5) }
        }
        .frame(height: 5)
      }
      .frame(maxWidth: .infinity, minHeight: 56, alignment: .top)
      .padding(.top, 3)
      .contentShape(.rect)
    }
    .buttonStyle(PressScale(scale: 0.9))
    .disabled(future)
    .opacity(future ? 0.28 : 1)
    .accessibilityLabel("\(number)일" + (parts.isEmpty ? "" : ", " + parts.map(\.name).joined(separator: ", ")))
  }
}

// MARK: - Day sheet

/// Fix any past day: tick parts, log exercises.
struct DaySheet: View {
  @Environment(Store.self) private var store
  @Environment(\.dismiss) private var dismiss
  let date: String
  @State private var route: ExerciseRoute?
  @State private var shooting = false
  @State private var askDelete = false

  private var day: Date { Day.date(date) ?? Day.today() }
  private var isToday: Bool { date == Day.key(Day.today()) }

  var body: some View {
    let done = Set(store.parts(on: date))
    ScrollView {
      VStack(alignment: .leading, spacing: 16) {
        HStack(alignment: .top) {
          VStack(alignment: .leading, spacing: 4) {
            Kicker(text: (isToday ? "Today · " : "") + Day.kicker(day), color: .volt)
            Text(longDay(date)).font(.system(size: 24, weight: .heavy)).tracking(-0.6)
          }
          Spacer()
          Button("완료") { dismiss() }
            .font(.system(size: 15, weight: .heavy))
            .foregroundStyle(Color.onVolt)
            .padding(.horizontal, 18)
            .frame(height: 38)
            .background(Color.volt, in: .capsule)
            .buttonStyle(PressScale())
        }
        if store.photoKeys.contains(date) { photoBlock }
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 3), spacing: 8) {
          ForEach(store.data.parts) { part in
            let on = done.contains(part.id)
            Button {
              withAnimation(.easeOut(duration: 0.2)) { _ = store.toggle(part.id, on: date) }
            } label: {
              HStack(spacing: 8) {
                Text(part.name).font(.system(size: 15, weight: .heavy)).lineLimit(1).minimumScaleFactor(0.7)
                Spacer(minLength: 2)
                if on { Image(systemName: "checkmark").font(.system(size: 11, weight: .black)) }
              }
              .foregroundStyle(on ? Color.onVolt : Color.ink)
              .padding(.horizontal, 12)
              .frame(maxWidth: .infinity, minHeight: 50)
              .background(on ? Color.volt : Color.surface, in: .rect(cornerRadius: 14))
            }
            .buttonStyle(PressScale())
            .accessibilityAddTraits(on ? .isSelected : [])
          }
        }
        .sensoryFeedback(.impact(weight: .light), trigger: done)
        LogBlock(date: date, route: $route)
        if !store.photoKeys.contains(date) && !done.isEmpty {
          Button { shooting = true } label: {
            Label("이날 오운완 사진 추가", systemImage: "camera.fill").font(.system(size: 15, weight: .heavy))
              .foregroundStyle(Color.onVolt)
              .frame(maxWidth: .infinity, minHeight: 52).background(Color.volt, in: .rect(cornerRadius: 16))
          }
          .buttonStyle(PressScale(scale: 0.98))
        }
        Text(done.isEmpty ? "이날은 기록이 없어요" : "\(done.count)개 부위 체크됨")
          .font(.system(size: 12, weight: .semibold))
          .foregroundStyle(Color.faint)
          .frame(maxWidth: .infinity)
      }
      .padding(18)
    }
    .background(Color.bg)
    .presentationDetents([.medium, .large])
    .presentationDragIndicator(.visible)
    .presentationBackground(Color.bg)
    .sheet(item: $route) { ExerciseSheet(route: $0) }
    .fullScreenCover(isPresented: $shooting) { CameraView(date: date) }
    .confirmationDialog("\(longDay(date)) 오운완 사진을 지울까요?", isPresented: $askDelete, titleVisibility: .visible) {
      Button("지우기", role: .destructive) { Task { await store.deletePhoto(date) } }
    } message: {
      Text("사진첩에 저장해 둔 사진은 그대로예요.")
    }
  }

  private var photoBlock: some View {
    VStack(spacing: 10) {
      DayPhoto(key: date).clipShape(.rect(cornerRadius: 16))
      HStack(spacing: 8) {
        ShareLink(item: PhotoStore.fileURL(date)) { pill("공유") }
        Button { shooting = true } label: { pill("다시 찍기") }
        Button { askDelete = true } label: { pill("삭제", color: Color.danger) }
      }
      .buttonStyle(PressScale())
    }
  }

  private func pill(_ text: String, color: Color = .ink) -> some View {
    Text(text).font(.system(size: 14, weight: .bold)).foregroundStyle(color)
      .frame(maxWidth: .infinity, minHeight: 40).background(Color.surface2, in: .rect(cornerRadius: 12))
  }
}

/// A day's photo thumbnail (240px square), reloaded when the photo changes.
struct DayThumb: View {
  @Environment(Store.self) private var store
  let key: String
  @State private var image: UIImage?

  var body: some View {
    Color.surface2
      .overlay { if let image { Image(uiImage: image).resizable().scaledToFill() } }
      .clipped()
      .task(id: "\(key)#\(store.photoVersion)") { image = PhotoStore.thumbnail(key) }
  }
}

/// A day's full 오운완 photo.
struct DayPhoto: View {
  @Environment(Store.self) private var store
  let key: String
  @State private var image: UIImage?

  var body: some View {
    Group {
      if let image {
        Image(uiImage: image).resizable().scaledToFit()
      } else {
        Color.surface2.aspectRatio(3.0 / 4.0, contentMode: .fit)
      }
    }
    .task(id: "\(key)#\(store.photoVersion)") { image = PhotoStore.image(key) }
  }
}
