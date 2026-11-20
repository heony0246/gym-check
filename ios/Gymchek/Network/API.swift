import Foundation

nonisolated struct APIError: LocalizedError, Sendable {
  let status: Int
  let message: String
  var errorDescription: String? { message }
}

/// The same server the web app uses.
nonisolated enum API {
  static let base = URL(string: "https://gymchek-api.savetoyou365.workers.dev")!

  /// Sends a request and returns the raw body. `json` is encoded as the request body.
  static func send(_ path: String, method: String = "GET", json: [String: Any]? = nil, token: String?) async throws -> Data {
    var request = URLRequest(url: base.appending(path: path))
    request.httpMethod = method
    request.timeoutInterval = 20
    if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
    if let json {
      request.setValue("application/json", forHTTPHeaderField: "Content-Type")
      request.httpBody = try JSONSerialization.data(withJSONObject: json)
    }
    let data: Data
    let response: URLResponse
    do {
      (data, response) = try await URLSession.shared.data(for: request)
    } catch {
      throw APIError(status: 0, message: "인터넷 연결을 확인해 주세요")
    }
    let status = (response as? HTTPURLResponse)?.statusCode ?? 0
    guard (200..<300).contains(status) else {
      let message = (try? JSONDecoder().decode(ErrorBody.self, from: data))?.error ?? "잠시 후 다시 시도해 주세요"
      throw APIError(status: status, message: message)
    }
    return data
  }

  static func decode<T: Decodable>(_ type: T.Type, _ path: String, method: String = "GET", json: [String: Any]? = nil, token: String?) async throws -> T {
    let data = try await send(path, method: method, json: json, token: token)
    return try JSONDecoder().decode(T.self, from: data)
  }

  private struct ErrorBody: Decodable { let error: String }
}

// Response shapes.
nonisolated struct UserDTO: Decodable, Sendable {
  let id: String
  let handle: String
  let nickname: String
}

nonisolated struct AuthResponse: Decodable, Sendable {
  let user: UserDTO
  let token: String
}

nonisolated struct BackupResponse: Decodable, Sendable {
  let data: AppData?
  let updatedAt: Double
  let photos: [String]
}

nonisolated struct PushResponse: Decodable, Sendable {
  let updatedAt: Double
}
