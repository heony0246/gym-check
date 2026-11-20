import SwiftUI

// Crews: invite-only groups (up to 8) racing on how many days this week each member
// proved with that day's 오운완 photo. Same server routes as the web app.

nonisolated struct CrewDTO: Decodable, Identifiable, Hashable, Sendable {
  let id: String
  let name: String
  let code: String
  let ownerId: String
  let members: Int?
}

nonisolated struct BoardMember: Decodable, Identifiable, Hashable, Sendable {
  let id: String
  let handle: String
  let isMe: Bool
}

nonisolated struct Proof: Decodable, Hashable, Sendable {
  let userId: String
  let date: String
  let image: String
  let parts: [String]
  var fires: Int
  var fired: Bool
  var comments: Int
}

nonisolated struct Board: Decodable, Sendable {
  let crew: CrewDTO
  let members: [BoardMember]
  var proofs: [Proof]
  let lastWeek: LastWeek?
  let wins: Int?

  struct LastWeek: Decodable, Sendable {
    let best: Int
    let winners: [String]
  }
}

nonisolated struct CommentDTO: Decodable, Identifiable, Hashable, Sendable {
  let id: String
  let body: String
  let createdAt: Double
  let from: From
  let canDelete: Bool

  struct From: Decodable, Hashable, Sendable {
    let id: String
    let handle: String
  }
}

/// This week (Mon–Sun) and last week, as the board asks for them.
nonisolated struct WeekRange: Sendable {
  let from: String, to: String, lastFrom: String, lastTo: String
  let days: [String]

  init(today: Date = Day.today()) {
    let mon = Day.startOfWeek(today)
    from = Day.key(mon)
    to = Day.key(Day.add(mon, days: 6))
    lastFrom = Day.key(Day.add(mon, days: -7))
    lastTo = Day.key(Day.add(mon, days: -1))
    days = (0..<7).map { Day.key(Day.add(mon, days: $0)) }
  }

  var query: String { "?from=\(from)&to=\(to)&lastFrom=\(lastFrom)&lastTo=\(lastTo)" }
}

@Observable
final class CrewModel {
  /// nil until loaded.
  private(set) var list: [CrewDTO]?
  private(set) var currentId: String?
  private(set) var board: Board?
  private(set) var error = ""
  var busy = false
  /// Showing the create / join forms while already in a crew.
  var manage = false

  private static let pickKey = "crewPick"

  var current: CrewDTO? { list?.first { $0.id == currentId } ?? list?.first }

  func reset() {
    list = nil
    currentId = nil
    board = nil
    error = ""
    manage = false
  }

  func load(_ store: Store) async {
    guard let token = store.account?.token else { return }
    struct Response: Decodable { let crews: [CrewDTO]; let wins: Int? }
    do {
      let r = try await API.decode(Response.self, "/api/crews", token: token)
      list = r.crews
      error = ""
      if let wins = r.wins { store.noteCrewWins(wins) }
      if !r.crews.contains(where: { $0.id == currentId }) {
        let saved = UserDefaults.standard.string(forKey: Self.pickKey)
        currentId = r.crews.first { $0.id == saved }?.id ?? r.crews.first?.id
        board = nil
      }
    } catch {
      self.error = error.localizedDescription
    }
    await loadBoard(store)
  }

  func loadBoard(_ store: Store) async {
    guard let token = store.account?.token, let id = currentId else { return }
    do {
      let b = try await API.decode(Board.self, "/api/crews/\(id)\(WeekRange().query)", token: token)
      guard currentId == id else { return }
      board = b
      error = ""
      if let wins = b.wins { store.noteCrewWins(wins) }
    } catch let e as APIError where e.status == 404 {
      // Left or removed meanwhile.
      list = list?.filter { $0.id != id }
      currentId = list?.first?.id
      board = nil
      if currentId != nil { await loadBoard(store) }
    } catch {
      self.error = error.localizedDescription
    }
  }

  func pick(_ id: String, store: Store) {
    currentId = id
    board = nil
    UserDefaults.standard.set(id, forKey: Self.pickKey)
    Task { await loadBoard(store) }
  }

  /// Returns what to tell the user.
  func create(name: String, store: Store) async -> String {
    guard let token = store.account?.token else { return "" }
    struct Response: Decodable { let crew: CrewDTO }
    do {
      let r = try await API.decode(Response.self, "/api/crews", method: "POST", json: ["name": name], token: token)
      list = (list ?? []) + [r.crew]
      manage = false
      pick(r.crew.id, store: store)
      return "'\(r.crew.name)' 크루를 만들었어요. 친구를 초대해 보세요"
    } catch {
      return error.localizedDescription
    }
  }

  func join(code raw: String, store: Store) async -> String {
    guard let token = store.account?.token else { return "" }
    let code = raw.uppercased().filter { $0.isLetter || $0.isNumber }
    guard code.count == 6 else { return "초대 코드는 6자리예요" }
    struct Response: Decodable { let crew: CrewDTO; let already: Bool? }
    do {
      let r = try await API.decode(Response.self, "/api/crews/join", method: "POST", json: ["code": code], token: token)
      if !(list ?? []).contains(where: { $0.id == r.crew.id }) { list = (list ?? []) + [r.crew] }
      manage = false
      pick(r.crew.id, store: store)
      return r.already == true ? "이미 '\(r.crew.name)' 크루에 있어요" : "'\(r.crew.name)' 크루에 들어왔어요"
    } catch {
      return error.localizedDescription
    }
  }

  func leave(store: Store) async -> String {
    guard let token = store.account?.token, let c = board?.crew else { return "" }
    do {
      _ = try await API.send("/api/crews/\(c.id)/me", method: "DELETE", token: token)
      list = list?.filter { $0.id != c.id }
      currentId = nil
      board = nil
      await load(store)
      return "크루에서 나왔어요"
    } catch {
      return error.localizedDescription
    }
  }

  /// 🔥 on someone's proof, shown at once and settled by the server's answer.
  func cheer(_ proof: Proof, store: Store) async {
    guard let token = store.account?.token, let i = board?.proofs.firstIndex(where: { $0.userId == proof.userId && $0.date == proof.date }) else { return }
    let next = !proof.fired
    board?.proofs[i].fired = next
    board?.proofs[i].fires += next ? 1 : -1
    struct Response: Decodable { let fired: Bool; let fires: Int }
    do {
      let r = try await API.decode(Response.self, "/api/proofs/\(proof.userId)/\(proof.date)/cheer", method: "POST", token: token)
      if let j = board?.proofs.firstIndex(where: { $0.userId == proof.userId && $0.date == proof.date }) {
        board?.proofs[j].fired = r.fired
        board?.proofs[j].fires = r.fires
      }
    } catch {
      if let j = board?.proofs.firstIndex(where: { $0.userId == proof.userId && $0.date == proof.date }) {
        board?.proofs[j].fired = !next
        board?.proofs[j].fires += next ? -1 : 1
      }
    }
  }

  func setCommentCount(_ n: Int, for proof: Proof) {
    if let i = board?.proofs.firstIndex(where: { $0.userId == proof.userId && $0.date == proof.date }) { board?.proofs[i].comments = n }
  }

  func proof(_ userId: String, _ date: String) -> Proof? {
    board?.proofs.first { $0.userId == userId && $0.date == date }
  }
}

/// A crew proof photo. The server only gives it to a logged-in member of a shared crew,
/// so it's fetched with the token and kept in memory.
struct AuthImage: View {
  @Environment(Store.self) private var store
  let path: String
  var contentMode: ContentMode = .fill
  @State private var image: UIImage?

  @MainActor private static var cache: [String: UIImage] = [:]

  var body: some View {
    Group {
      if let image {
        Image(uiImage: image).resizable().aspectRatio(contentMode: contentMode)
      } else {
        Color.surface2.overlay(ProgressView().tint(Color.muted))
      }
    }
    .task(id: path) {
      if let hit = Self.cache[path] { image = hit; return }
      guard let token = store.account?.token,
            let data = try? await API.send(path, token: token),
            let loaded = UIImage(data: data) else { return }
      if Self.cache.count > 60 { Self.cache.removeAll() }
      Self.cache[path] = loaded
      image = loaded
    }
  }
}
