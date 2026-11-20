import SwiftUI

struct SettingsView: View {
  @Environment(Store.self) private var store

  var body: some View {
    NavigationStack {
      List {
        Section("주간 목표") {
          Stepper(value: Binding(get: { store.data.weeklyGoal }, set: { store.setWeeklyGoal($0) }), in: 1...7) {
            HStack {
              Text("일주일에")
              Spacer()
              Text("\(store.data.weeklyGoal)").font(.display(24)).foregroundStyle(Color.volt)
              Text("회").font(.system(size: 13, weight: .bold))
            }
          }
        }
        Section("계정") {
          if let account = store.account {
            LabeledContent("@\(account.handle)") {
              Button("로그아웃", role: .destructive) { Task { await store.logOut() } }
            }
            VStack(alignment: .leading, spacing: 4) {
              Text("클라우드 저장").font(.system(size: 15, weight: .bold))
              Text(store.cloudStatus.isEmpty ? "기록·사진 자동 저장" : store.cloudStatus)
                .font(.system(size: 12, weight: .medium)).foregroundStyle(Color.muted)
            }
            Button("지금 저장") { Task { await store.sync() } }
          } else {
            NavigationLink("로그인 · 아이디 만들기") { LoginView() }
            Text("로그인하면 기록이 자동 백업돼요")
              .font(.system(size: 12, weight: .medium)).foregroundStyle(Color.muted)
          }
        }
        Section {
          LabeledContent("버전", value: Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "")
        }
      }
      .scrollContentBackground(.hidden)
      .background(Color.bg)
      .navigationTitle("설정")
    }
  }
}

/// ID + password now; Apple and Kakao turn on once their developer accounts are set up.
struct LoginView: View {
  @Environment(Store.self) private var store
  @Environment(\.dismiss) private var dismiss
  @State private var signup = false
  @State private var handle = ""
  @State private var password = ""
  @State private var busy = false
  @State private var error: String?

  var body: some View {
    Form {
      Section {
        Picker("", selection: $signup) {
          Text("로그인").tag(false)
          Text("아이디 만들기").tag(true)
        }
        .pickerStyle(.segmented)
        .listRowBackground(Color.clear)
      }
      Section {
        TextField(signup ? "아이디 (영문·숫자 3~20자)" : "아이디", text: $handle)
          .textInputAutocapitalization(.never)
          .autocorrectionDisabled()
          .textContentType(.username)
        SecureField(signup ? "비밀번호 (6자 이상)" : "비밀번호", text: $password)
          .textContentType(signup ? .newPassword : .password)
      } footer: {
        if signup { Text("비밀번호는 찾을 수 없어요. 꼭 저장해 두세요") }
      }
      Section {
        Button {
          Task { await submit() }
        } label: {
          Text(busy ? "확인 중…" : signup ? "만들기" : "로그인")
            .font(.system(size: 16, weight: .heavy))
            .frame(maxWidth: .infinity)
        }
        .disabled(busy || handle.isEmpty || password.isEmpty)
        .listRowBackground(Color.volt)
        .foregroundStyle(Color.onVolt)
      }
      Section {
        Label("Apple로 계속하기", systemImage: "apple.logo").foregroundStyle(Color.faint)
        Label("카카오로 계속하기", systemImage: "message.fill").foregroundStyle(Color.faint)
      } footer: {
        Text("애플·카카오 로그인은 개발자 등록이 끝나면 켜져요")
      }
    }
    .scrollContentBackground(.hidden)
    .background(Color.bg)
    .navigationTitle(signup ? "아이디 만들기" : "로그인")
    .alert("로그인하지 못했어요", isPresented: Binding(get: { error != nil }, set: { if !$0 { error = nil } })) {
      Button("확인", role: .cancel) {}
    } message: {
      Text(error ?? "")
    }
  }

  private func submit() async {
    busy = true
    defer { busy = false }
    let id = handle.trimmingCharacters(in: .whitespaces).lowercased()
    do {
      if signup { try await store.signUp(handle: id, password: password) } else { try await store.logIn(handle: id, password: password) }
      dismiss()
    } catch {
      self.error = error.localizedDescription
      password = ""
    }
  }
}
