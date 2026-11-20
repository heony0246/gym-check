import Foundation
import Observation
import os

/// The app's data: saved to a file on the phone, and (when logged in) to the server.
@Observable
final class Store {
  private(set) var data: AppData
  private(set) var account: Account?
  private(set) var cloud: CloudMeta
  /// Whose records these are (nil: made before any login here).
  private(set) var owner: Owner?
  /// Days with a saved 오운완 photo on this phone.
  private(set) var photoKeys: Set<String> = PhotoStore.keys()
  /// Bumped when a day's photo changes, so thumbnails reload.
  private(set) var photoVersion = 0
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
    owner = saved?.owner ?? saved?.account.map { Owner(id: $0.userId, handle: $0.handle) }
  }

  var isLoggedIn: Bool { account != nil }

  // MARK: - Saving

  private func persist() {
    let state = LocalState(data: data, account: account, cloud: cloud, owner: owner)
    do {
      try FileManager.default.createDirectory(at: URL.applicationSupportDirectory, withIntermediateDirectories: true)
      try JSONEncoder().encode(state).write(to: Store.fileURL, options: .atomic)
    } catch {
      log.error("save failed: \(error.localizedDescription, privacy: .public)")
    }
  }

  /// Saves a change to the records and, when logged in, sends it up a moment later.
  fileprivate func changed() {
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

  /// Weeks this account came first in a crew (the server keeps the count; badges use it).
  func noteCrewWins(_ n: Int) {
    guard var a = account, a.crewWins != n else { return }
    a.crewWins = n
    account = a
    persist()
  }

  /// "orig" (the photo's own shape) or "story" (9:16).
  func setPhotoFormat(_ format: String) {
    guard format == "orig" || format == "story", format != data.photoFormat else { return }
    data.photoFormat = format
    changed()
  }

  // MARK: - Account

  /// A login the server accepted. When this phone holds another account's records,
  /// `replaces` names that account and the user decides before anything changes.
  struct PendingLogin: Identifiable {
    let response: AuthResponse
    let replaces: Owner?
    var id: String { response.token }
  }

  func logIn(handle: String, password: String) async throws -> PendingLogin {
    pending(try await API.decode(AuthResponse.self, "/api/login", method: "POST", json: ["handle": handle, "password": password], token: nil))
  }

  func signUp(handle: String, password: String) async throws -> PendingLogin {
    pending(try await API.decode(AuthResponse.self, "/api/users", method: "POST",
                                 json: ["handle": handle, "nickname": String(handle.prefix(12)), "password": password], token: nil))
  }

  private func pending(_ r: AuthResponse) -> PendingLogin {
    let other = owner.flatMap { $0.id == r.user.id ? nil : $0 }
    return PendingLogin(response: r, replaces: hasLocalData ? other : nil)
  }

  private var hasLocalData: Bool { !data.records.isEmpty || !data.logs.isEmpty }

  /// Starts the session; another account's records leave this phone first (they're in
  /// that account's server copy), so they never get merged into this one.
  func finish(_ login: PendingLogin) async {
    let r = login.response
    if login.replaces != nil {
      data = AppData()
      for key in photoKeys { PhotoStore.delete(key) }
      photoKeys = []
      photoVersion += 1
    }
    owner = Owner(id: r.user.id, handle: r.user.handle)
    account = Account(token: r.token, userId: r.user.id, handle: r.user.handle, nickname: r.user.nickname, crewWins: nil)
    cloud = CloudMeta()
    persist()
    await sync()
  }

  /// The user chose not to switch: drop the session the server just made.
  func cancel(_ login: PendingLogin) async {
    _ = try? await API.send("/api/session", method: "DELETE", token: login.response.token)
  }

  /// Logs out once the server has everything; returns false (and stays logged in) when
  /// it couldn't save and `force` isn't set, since another login would replace this copy.
  @discardableResult
  func logOut(force: Bool = false) async -> Bool {
    guard let token = account?.token else { return true }
    await push()
    if cloud.dirty && !force { return false }
    _ = try? await API.send("/api/session", method: "DELETE", token: token)
    account = nil
    cloud = CloudMeta()
    cloudStatus = ""
    persist()
    return true
  }

  /// Logs out every other phone and browser on this account.
  func endOtherSessions() async throws -> Int {
    guard let token = account?.token else { return 0 }
    return try await API.decode(SessionsResponse.self, "/api/sessions/others", method: "DELETE", token: token).endedSessions
  }

  /// Whether account deletion should ask for a password (an Apple/Kakao-only account has none).
  func passwordIsSet() async -> Bool {
    guard let token = account?.token else { return true }
    return (try? await API.decode(MeResponse.self, "/api/me", token: token))?.passwordSet ?? true
  }

  /// Deletes the account and everything on the server. This phone keeps its records, as nobody's.
  func deleteAccount(password: String?, confirmHandle: String?) async throws {
    guard let token = account?.token else { return }
    var body: [String: Any] = [:]
    if let password { body["password"] = password }
    if let confirmHandle { body["confirm"] = confirmHandle }
    _ = try await API.send("/api/me", method: "DELETE", json: body, token: token)
    account = nil
    owner = nil
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
      await syncPhotos(server: Set(r.photos), token: token)
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

// MARK: - Exercise log, parts, custom exercises

extension Store {
  func exercise(_ id: String) -> Exercise? {
    if let ex = Catalog.byId[id] { return ex }
    return data.customEx.first { $0.id == id }.map { Exercise(id: $0.id, name: $0.name, part: $0.part, equip: "직접 추가", kind: $0.kind) }
  }

  var allExercises: [Exercise] {
    Catalog.exercises + data.customEx.map { Exercise(id: $0.id, name: $0.name, part: $0.part, equip: "직접 추가", kind: $0.kind) }
  }

  func logs(on key: String) -> [LogEntry] { data.logs[key] ?? [] }

  /// Every day an exercise was logged, latest first.
  func history(_ exId: String) -> [(date: String, sets: [LoggedSet])] {
    data.logs.compactMap { key, list in list.first { $0.ex == exId }.map { (key, $0.sets) } }
      .sorted { $0.date > $1.date }
  }

  /// Exercises logged most recently first (for the picker).
  var recentExerciseIds: [String] {
    var last: [String: String] = [:]
    for (key, list) in data.logs { for e in list where (last[e.ex] ?? "") < key { last[e.ex] = key } }
    return last.keys.sorted { last[$0]! > last[$1]! }.prefix(12).map { $0 }
  }

  /// Saves an exercise for a day; logging it also checks its part for that day.
  func saveLog(_ exId: String, sets: [LoggedSet], on key: String) {
    var list = data.logs[key] ?? []
    if let i = list.firstIndex(where: { $0.ex == exId }) { list[i].sets = sets } else { list.append(LogEntry(ex: exId, sets: sets)) }
    data.logs[key] = list
    if let part = exercise(exId)?.part, data.parts.contains(where: { $0.id == part }), !parts(on: key).contains(part) {
      toggle(part, on: key) // saves too
    } else {
      changed()
    }
  }

  func deleteLog(_ exId: String, on key: String) {
    let rest = (data.logs[key] ?? []).filter { $0.ex != exId }
    data.logs[key] = rest.isEmpty ? nil : rest
    changed()
  }

  /// A new exercise typed in the picker. Returns its id.
  func addCustomExercise(name: String, part: String) -> String {
    let id = "u_" + String(Int(Date().timeIntervalSince1970 * 1000), radix: 36)
    data.customEx.append(CustomExercise(id: id, name: String(name.prefix(30)), part: part, kind: "wr"))
    changed()
    return id
  }

  /// Adds a part, or brings back a deleted built-in one under its own id (so its badge counts).
  func addPart(name: String, color: String) {
    if let def = Part.defaults.first(where: { d in d.name == name && !data.parts.contains(where: { $0.id == d.id }) }) {
      data.parts.append(Part(id: def.id, name: def.name, color: color))
    } else {
      data.parts.append(Part(id: "c_" + String(Int(Date().timeIntervalSince1970 * 1000), radix: 36), name: name, color: color))
    }
    changed()
  }

  func updatePart(_ id: String, name: String, color: String) {
    guard let i = data.parts.firstIndex(where: { $0.id == id }) else { return }
    data.parts[i].name = name
    data.parts[i].color = color
    changed()
  }

  /// Removes a part and its check-ins.
  func deletePart(_ id: String) {
    guard data.parts.count > 1 else { return }
    data.parts.removeAll { $0.id == id }
    for (key, ids) in data.records {
      let rest = ids.filter { $0 != id }
      data.records[key] = rest.isEmpty ? nil : rest
    }
    changed()
  }

  func uses(of partId: String) -> Int { data.records.values.filter { $0.contains(partId) }.count }

  var nextPartColor: String {
    let palette = ["#F472B6", "#818CF8", "#A3E635", "#2DD4BF", "#FB7185", "#94A3B8", "#E879F9", "#C08457"]
    let used = Set(data.parts.map { $0.color.uppercased() })
    return palette.first { !used.contains($0.uppercased()) } ?? palette[data.parts.count % palette.count]
  }

  // Badges
  var badgeStats: BadgeStats { Badges.stats(data, photos: photoCount, crewWins: account?.crewWins ?? 0) }

  /// Saved 오운완 photos on this phone (filled in once photos move over).
  var photoCount: Int { photoKeys.count }
}

// MARK: - 오운완 photos

extension Store {
  /// Keeps the finished card for that day, and (logged in) backs it up and, for today,
  /// sends it to the crews as proof. Returns what to tell the user.
  /// `takenOn`: the day the photo was really taken (camera: today; library: its EXIF date).
  func savePhoto(_ jpeg: Data, for key: String, takenOn: String?) async -> String {
    do {
      try PhotoStore.save(jpeg, for: key)
    } catch {
      return "앱에 저장하지 못했어요"
    }
    photoKeys.insert(key)
    photoVersion += 1
    guard let token = account?.token else { return "\(monthDay(key)) 오운완으로 저장했어요" }
    let backedUp = await uploadPhoto(key, token: token)
    var proof: String?
    // Any day of this week can still count for the crew race, if the photo is from that day.
    if Store.inThisWeek(key) { proof = await sendProof(jpeg, for: key, takenOn: takenOn, token: token) }
    let bk = backedUp ? "" : " · 서버 백업은 실패했어요"
    let day = key == Day.key(Day.today()) ? "" : "\(monthDay(key)) "
    switch proof {
    case "ok": return "\(day)오운완 저장 · 크루 인증 완료" + bk
    case "old": return "저장했어요. 크루 인증은 그날 찍은 사진만 돼요" + bk
    case let message?: return "저장했어요. 크루 인증은 못 했어요: \(message)"
    case nil: return backedUp ? "\(monthDay(key)) 오운완으로 저장했어요" : "저장했어요. 서버 백업은 실패했어요"
    }
  }

  func deletePhoto(_ key: String) async {
    PhotoStore.delete(key)
    photoKeys.remove(key)
    photoVersion += 1
    guard let token = account?.token else { return }
    _ = try? await API.send("/api/backup/photos/\(key)", method: "DELETE", token: token)
    if Store.inThisWeek(key) { _ = try? await API.send("/api/proofs/\(key)", method: "DELETE", token: token) }
  }

  /// Monday through today: the days a crew proof can still be for.
  static func inThisWeek(_ key: String) -> Bool {
    key >= WeekRange().from && key <= Day.key(Day.today())
  }

  private func uploadPhoto(_ key: String, token: String) async -> Bool {
    guard let jpeg = PhotoStore.data(key) else { return false }
    return (try? await API.send("/api/backup/photos/\(key)", method: "PUT", body: jpeg, contentType: "image/jpeg", token: token)) != nil
  }

  /// "ok", "old" (the photo isn't from that day, going by its EXIF date), an error
  /// message, or nil when there's no crew.
  private func sendProof(_ jpeg: Data, for key: String, takenOn: String?, token: String) async -> String? {
    struct Crews: Decodable { let crews: [Item]; struct Item: Decodable { let id: String } }
    guard let crews = try? await API.decode(Crews.self, "/api/crews", token: token), !crews.crews.isEmpty else { return nil }
    guard takenOn == key else { return "old" }
    let names = data.parts.filter { parts(on: key).contains($0.id) }.map(\.name)
    guard let small = PhotoStore.scaled(jpeg, maxSide: 1440, quality: 0.85),
          let partsJSON = try? String(data: JSONSerialization.data(withJSONObject: names), encoding: .utf8) else { return "사진을 줄이지 못했어요" }
    let (body, type) = API.form(fields: ["parts": partsJSON], image: small, filename: "\(key).jpg")
    do {
      _ = try await API.send("/api/proofs/\(key)", method: "PUT", body: body, contentType: type, token: token)
      return "ok"
    } catch {
      return error.localizedDescription
    }
  }

  /// Evens out photos with the server: download what's only there, upload what's only here.
  fileprivate func syncPhotos(server: Set<String>, token: String) async {
    for key in server.subtracting(photoKeys).sorted() {
      guard let jpeg = try? await API.send("/api/backup/photos/\(key)", token: token), (try? PhotoStore.save(jpeg, for: key)) != nil else { continue }
      photoKeys.insert(key)
      photoVersion += 1
    }
    for key in photoKeys.subtracting(server).sorted() { _ = await uploadPhoto(key, token: token) }
  }
}
