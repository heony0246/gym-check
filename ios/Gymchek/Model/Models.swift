import Foundation

// The same shapes the web app saves, so a backup made on the web restores here and
// the other way round. Everything that syncs lives in `AppData`.

nonisolated struct Part: Codable, Hashable, Identifiable, Sendable {
  var id: String
  var name: String
  var color: String
}

/// One logged set: any of weight (kg), reps, time, distance (km).
nonisolated struct LoggedSet: Codable, Hashable, Sendable {
  var w: Double?
  var r: Double?
  var t: Double?
  var d: Double?
}

nonisolated struct LogEntry: Codable, Hashable, Sendable {
  var ex: String
  var sets: [LoggedSet]
}

nonisolated struct CustomExercise: Codable, Hashable, Sendable {
  var id: String
  var name: String
  var part: String
  var kind: String
}

nonisolated struct AppData: Codable, Equatable, Sendable {
  var records: [String: [String]] = [:]
  var parts: [Part] = Part.defaults
  var weeklyGoal: Int = 4
  var photoFormat: String = "orig"
  var logs: [String: [LogEntry]] = [:]
  var customEx: [CustomExercise] = []

  init() {}

  // Older backups (or the web before the exercise log) leave some keys out.
  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    records = try c.decodeIfPresent([String: [String]].self, forKey: .records) ?? [:]
    let decodedParts = try c.decodeIfPresent([Part].self, forKey: .parts) ?? []
    parts = decodedParts.isEmpty ? Part.defaults : decodedParts
    weeklyGoal = min(7, max(1, try c.decodeIfPresent(Int.self, forKey: .weeklyGoal) ?? 4))
    photoFormat = try c.decodeIfPresent(String.self, forKey: .photoFormat) ?? "orig"
    logs = try c.decodeIfPresent([String: [LogEntry]].self, forKey: .logs) ?? [:]
    customEx = try c.decodeIfPresent([CustomExercise].self, forKey: .customEx) ?? []
  }
}

nonisolated struct Account: Codable, Equatable, Sendable {
  var token: String
  var userId: String
  var handle: String
  var nickname: String
  var crewWins: Int?
}

nonisolated struct CloudMeta: Codable, Equatable, Sendable {
  /// The server's `updatedAt` of the backup this phone last matched.
  var syncedAt: Double = 0
  /// Changes made here that the server doesn't have yet.
  var dirty = false
}

/// Everything saved on this phone.
nonisolated struct LocalState: Codable, Sendable {
  var data = AppData()
  var account: Account?
  var cloud = CloudMeta()
}

extension Part {
  nonisolated static let defaults: [Part] = [
    Part(id: "chest", name: "가슴", color: "#FF5D5D"),
    Part(id: "back", name: "등", color: "#4F9BFF"),
    Part(id: "legs", name: "하체", color: "#3DDC97"),
    Part(id: "arms", name: "팔", color: "#FF9F43"),
    Part(id: "shoulders", name: "어깨", color: "#A78BFA"),
    Part(id: "abs", name: "복근", color: "#FFD43B"),
    Part(id: "cardio", name: "유산소", color: "#38D9F5"),
  ]

  /// The English tag shown on built-in part tiles.
  nonisolated static let english: [String: String] = [
    "chest": "CHEST", "back": "BACK", "legs": "LEGS", "arms": "ARMS",
    "shoulders": "SHOULDERS", "abs": "ABS", "cardio": "CARDIO",
  ]

  var englishTag: String { Part.english[id] ?? "" }
}
