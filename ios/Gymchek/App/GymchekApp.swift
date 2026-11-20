import SwiftUI

@main
struct GymchekApp: App {
  @State private var store = Store()
  @Environment(\.scenePhase) private var scenePhase

  var body: some Scene {
    WindowGroup {
      RootView()
        .environment(store)
        .preferredColorScheme(.dark)
        .tint(.volt)
        .task { await store.sync() }
        .onChange(of: scenePhase) { _, phase in
          if phase == .active { Task { await store.syncIfStale() } }
        }
    }
  }
}

/// The five tabs. Swipe sideways to move between them (like KakaoTalk), or tap the bar.
enum AppTab: Int, CaseIterable, Hashable {
  case today, calendar, stats, crew, settings

  var title: String {
    switch self {
    case .today: "오늘"
    case .calendar: "달력"
    case .stats: "기록"
    case .crew: "크루"
    case .settings: "설정"
    }
  }

  var symbol: String {
    switch self {
    case .today: "dumbbell.fill"
    case .calendar: "calendar"
    case .stats: "chart.bar.fill"
    case .crew: "person.2.fill"
    case .settings: "slider.horizontal.3"
    }
  }
}

struct RootView: View {
  @State private var tab: AppTab = .today

  var body: some View {
    // A paging TabView follows the finger between tabs; the bar below is ours.
    TabView(selection: $tab) {
      TodayView().tag(AppTab.today)
      CalendarView().tag(AppTab.calendar)
      StatsView().tag(AppTab.stats)
      CrewView().tag(AppTab.crew)
      SettingsView().tag(AppTab.settings)
    }
    .tabViewStyle(.page(indexDisplayMode: .never))
    .background(Color.bg.ignoresSafeArea())
    .safeAreaInset(edge: .bottom, spacing: 0) { TabBar(selection: $tab) }
    .sensoryFeedback(.selection, trigger: tab)
  }
}

/// The bottom bar: five items in a floating capsule; the current one gets a pill.
struct TabBar: View {
  @Binding var selection: AppTab
  @Namespace private var pill

  var body: some View {
    HStack(spacing: 0) {
      ForEach(AppTab.allCases, id: \.self) { t in
        let on = selection == t
        Button {
          withAnimation(.snappy(duration: 0.3)) { selection = t }
        } label: {
          VStack(spacing: 3) {
            Image(systemName: t.symbol).font(.system(size: 19, weight: .semibold)).frame(height: 24)
            Text(t.title).font(.system(size: 11, weight: .bold))
          }
          .foregroundStyle(on ? Color.volt : Color.ink)
          .frame(maxWidth: .infinity, minHeight: 54)
          .background {
            if on {
              Capsule().fill(Color.white.opacity(0.12)).matchedGeometryEffect(id: "pill", in: pill)
            }
          }
          .contentShape(.rect)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(t.title)
        .accessibilityAddTraits(on ? [.isSelected, .isButton] : .isButton)
      }
    }
    .padding(5)
    .background(barBackground)
    .padding(.horizontal, 16)
    .padding(.bottom, 4)
  }

  @ViewBuilder private var barBackground: some View {
    if #available(iOS 26, *) {
      Capsule().fill(.clear).glassEffect(.regular, in: .capsule)
    } else {
      Capsule().fill(.ultraThinMaterial).overlay(Capsule().strokeBorder(Color.white.opacity(0.08)))
    }
  }
}

/// Tabs still being moved over from the web app.
struct ComingSoon: View {
  let title: String

  var body: some View {
    VStack(spacing: 10) {
      Text(title).font(.system(size: 30, weight: .heavy))
      Text("곧 들어와요").font(.system(size: 14, weight: .semibold)).foregroundStyle(Color.muted)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(Color.bg)
  }
}
