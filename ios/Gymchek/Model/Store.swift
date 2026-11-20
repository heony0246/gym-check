import Foundation
import Observation
import os

/// The app's data: saved to a file on the phone, and (when logged in) to the server.
@Observable
final class Store {
  private(set) var data: AppData
  private(set) var account: Account?
  private(set) var cloud: CloudMeta
  /// Short status line for settings ("저장 중…", "마지막 오늘 14:31").
  private(set) var cloudStatus = ""

  @ObservationIgnored private var pushTask: Task<Void, Never>?
  @ObservationIgnored private var syncing = false
  @ObservationIgnored private var lastPull = Date.distantPast
  @ObservationIgnored private let log = Logger(subsystem: "kr.gymchek.app", category: "store")

  private static var fileURL: URL {
    URL.applicationSupportDirectory.appending(path: "state.json")
  }

  init() {
    let saved = (try? Data(contentsOf: Store.fileURL)).flatMap { try? JSONDecoder().decode(LocalState.self, from: $0) }
    data = saved?.data ?? AppData()
    account = saved?.account
    cloud = saved?.cloud ?? CloudMeta()
  }

  var isLoggedIn: Bool { account != nil }

  // MARK: - Saving

  private func persist() {
    let state = LocalState(data: data, account: account, cloud: cloud)
    do {
      try FileManager.default.createDirectory(at: URL.applicationSupportDirectory, withIntermediateDirectories: true)
      try JSONEncoder().encode(state).write(to: Store.fileURL, options: .atomic)
    } catch {
      log.error("save failed: \(error.localizedDescription, privacy: .public)")
    }
  }

  /// Saves a change to the records and, when logged in, sends it up a moment later.
  private func changed() {
    if isLoggedIn { cloud.dirty = true }
    persist()
    schedulePush()
  }

  // MARK: - Queries

  func parts(on key: String) -> [String] { data.records[key] ?? [] }
  func attended(_ key: String) -> Bool { !parts(on: key).isEmpty }

  /// Consecutive attended days ending today (or yesterday if today isn't checked yet).
  func streak(today: Date = Day.today()) -> Int {
    var day = attended(Day.key(today)) ? today : Day.add(today, days: -1)
    var n = 0
    while attended(Day.key(day)) {
      n += 1
      day = Day.add(day, days: -1)
    }
    return n
  }

  func weekCount(today: Date = Day.today()) -> Int {
    let start = Day.startOfWeek(today)
    return (0..<7).filter { i in
      let d = Day.add(start, days: i)
      return d <= today && attended(Day.key(d))
    }.count
  }

  func yearDays(_ year: Int) -> Int {
    let prefix = String(format: "%04d-", year)
    return data.records.filter { $0.key.hasPrefix(prefix) && !$0.value.isEmpty }.count
  }

  /// The last day each part was done, on or before `key`.
  func lastDone(upTo key: String) -> [String: String] {
    var last: [String: String] = [:]
    for (day, ids) in data.records where day <= key {
      for id in ids where (last[id] ?? "") < day { last[id] = day }
    }
    return last
  }

  // MARK: - Changes

  /// Checks or unchecks a part for a day. Returns true when it's now checked.
  @discardableResult
  func toggle(_ partId: String, on key: String) -> Bool {
    var set = Set(parts(on: key))
    let on = !set.contains(partId)
    if on { set.insert(partId) } else { set.remove(partId) }
    let ordered = data.parts.map(\.id).filter(set.contains)
    data.records[key] = ordered.isEmpty ? nil : ordered
    changed()
    return on
  }

  func setWeeklyGoal(_ goal: Int) {
    let g = min(7, max(1, goal))
    guard g != data.weeklyGoal else { return }
    data.weeklyGoal = g
    changed()
  }

  // MARK: - Account

  func logIn(handle: String, password: String) async throws {
    let r = try await API.decode(AuthResponse.self, "/api/login", method: "POST", json: ["handle": handle, "password": password], token: nil)
    await startSession(r, welcome: true)
  }

  func signUp(handle: String, password: String) async throws {
    let r = try await API.decode(AuthResponse.self, "/api/users", method: "POST",
                                 json: ["handle": handle, "nickname": String(handle.prefix(12)), "password": password], token: nil)
    await startSession(r, welcome: false)
  }

  private func startSession(_ r: AuthResponse, welcome: Bool) async {
    account = Account(token: r.token, userId: r.user.id, handle: r.user.handle, nickname: r.user.nickname, crewWins: nil)
    cloud = CloudMeta()
    persist()
    await sync()
  }

  func logOut() async {
    guard let token = account?.token else { return }
    await push()
    _ = try? await API.send("/api/session", method: "DELETE", token: token)
    account = nil
    cloud = CloudMeta()
    cloudStatus = ""
    persist()
  }

  // MARK: - Cloud sync
  // Same rules as the web app: pull, settle differences (replace when this phone has
  // nothing new, merge when both changed), then push.

  func syncIfStale() async {
    if Date().timeIntervalSince(lastPull) > 5 * 60 { await sync() }
  }

  func sync() async {
    guard let token = account?.token, !syncing else { return }
    syncing = true
    defer { syncing = false }
    cloudStatus = "저장 중…"
    do {
      let r = try await API.decode(BackupResponse.self, "/api/backup", token: token)
      lastPull = Date()
      if let server = r.data {
        let first = cloud.syncedAt == 0
        if first || r.updatedAt > cloud.syncedAt {
          let merge = first ? !data.records.isEmpty : cloud.dirty
          data = merge ? merged(data, server) : server
          cloud.syncedAt = r.updatedAt
          cloud.dirty = data != server
          persist()
        }
      } else {
        cloud.dirty = true
      }
      await push()
    } catch let error as APIError where error.status == 401 {
      sessionEnded()
    } catch {
      cloudStatus = "저장 대기 중 · 인터넷이 연결되면 저장돼요"
    }
  }

  private func schedulePush() {
    guard isLoggedIn else { return }
    pushTask?.cancel()
    pushTask = Task {
      try? await Task.sleep(for: .seconds(1.5))
      guard !Task.isCancelled else { return }
      await push()
    }
  }

  private func push() async {
    guard let token = account?.token, cloud.dirty else {
      if isLoggedIn { cloudStatus = Store.savedText(Date()) }
      return
    }
    let sent = data
    do {
      let body = try JSONSerialization.jsonObject(with: JSONEncoder().encode(sent))
      let r = try await API.decode(PushResponse.self, "/api/backup", method: "PUT", json: ["data": body], token: token)
      cloud.syncedAt = r.updatedAt
      if data == sent { cloud.dirty = false } // nothing changed while sending
      persist()
      cloudStatus = Store.savedText(Date())
    } catch let error as APIError where error.status == 401 {
      sessionEnded()
    } catch {
      cloudStatus = "저장 대기 중 · 인터넷이 연결되면 저장돼요"
    }
  }

  /// The server no longer knows this phone's login.
  private func sessionEnded() {
    account = nil
    cloud = CloudMeta()
    cloudStatus = "로그인이 풀렸어요. 다시 로그인해 주세요"
    persist()
  }

  private static func savedText(_ date: Date) -> String {
    let c = Day.calendar.dateComponents([.hour, .minute], from: date)
    return String(format: "기록·사진 자동 저장 · 마지막 오늘 %d:%02d", c.hour ?? 0, c.minute ?? 0)
  }

  /// Both sides changed: keep every check-in and every logged exercise.
  private func merged(_ local: AppData, _ server: AppData) -> AppData {
    var out = local
    for p in server.parts where !out.parts.contains(where: { $0.id == p.id }) { out.parts.append(p) }
    let order = out.parts.map(\.id)
    for key in Set(local.records.keys).union(server.records.keys) {
      let set = Set(local.records[key] ?? []).union(server.records[key] ?? [])
      let ids = order.filter(set.contains)
      out.records[key] = ids.isEmpty ? nil : ids
    }
    for e in server.customEx where !out.customEx.contains(where: { $0.id == e.id }) { out.customEx.append(e) }
    for (key, list) in server.logs {
      let mine = out.logs[key] ?? []
      out.logs[key] = mine + list.filter { e in !mine.contains(where: { $0.ex == e.ex }) }
    }
    return out
  }
}
