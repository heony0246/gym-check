import Foundation

nonisolated struct APIError: LocalizedError, Sendable {
  let status: Int
  let message: String
  var errorDescription: String? { message }
}

/// The same server the web app uses.
nonisolated enum API {
  static let base: URL = {
    #if DEBUG
    // Testing against a local worker: defaults write kr.gymchek.app apiBase http://localhost:8787
    if let s = UserDefaults.standard.string(forKey: "apiBase"), let url = URL(string: s) { return url }
    #endif
    return URL(string: "https://gymchek-api.savetoyou365.workers.dev")!
  }()

  /// Sends a request and returns the raw body. `json` is encoded as the request body;
  /// `body` + `contentType` send anything else (a photo, a form).
  static func send(_ path: String, method: String = "GET", json: [String: Any]? = nil,
                   body: Data? = nil, contentType: String? = nil, token: String?) async throws -> Data {
    // Paths may carry a query (?from=…), so they're appended as text, not as a path component.
    guard let url = URL(string: base.absoluteString + path) else { throw APIError(status: 0, message: "주소가 잘못됐어요") }
    var request = URLRequest(url: url)
    request.httpMethod = method
    request.timeoutInterval = body == nil ? 20 : 60
    if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
    if let json {
      request.setValue("application/json", forHTTPHeaderField: "Content-Type")
      request.httpBody = try JSONSerialization.data(withJSONObject: json)
    } else if let body {
      request.setValue(contentType, forHTTPHeaderField: "Content-Type")
      request.httpBody = body
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

  /// multipart/form-data with text fields and one JPEG named "image".
  static func form(fields: [String: String], image: Data, filename: String) -> (Data, String) {
    let boundary = "gymchek-\(UUID().uuidString)"
    var out = Data()
    for (k, v) in fields {
      out.append(Data("--\(boundary)\r\nContent-Disposition: form-data; name=\"\(k)\"\r\n\r\n\(v)\r\n".utf8))
    }
    out.append(Data("--\(boundary)\r\nContent-Disposition: form-data; name=\"image\"; filename=\"\(filename)\"\r\nContent-Type: image/jpeg\r\n\r\n".utf8))
    out.append(image)
    out.append(Data("\r\n--\(boundary)--\r\n".utf8))
    return (out, "multipart/form-data; boundary=\(boundary)")
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

nonisolated struct MeResponse: Decodable, Sendable {
  let passwordSet: Bool?
}

nonisolated struct SessionsResponse: Decodable, Sendable {
  let endedSessions: Int
}
