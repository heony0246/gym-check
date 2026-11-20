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

struct RootView: View {
  var body: some View {
    TabView {
      Tab("오늘", systemImage: "dumbbell.fill") { TodayView() }
      Tab("달력", systemImage: "calendar") { ComingSoon(title: "달력") }
      Tab("기록", systemImage: "chart.bar.fill") { ComingSoon(title: "기록") }
      Tab("크루", systemImage: "person.2.fill") { ComingSoon(title: "크루") }
      Tab("설정", systemImage: "slider.horizontal.3") { SettingsView() }
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
