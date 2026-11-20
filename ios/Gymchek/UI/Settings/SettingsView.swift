import SwiftUI

struct SettingsView: View {
  @Environment(Store.self) private var store
  @State private var askLogout = false
  @State private var unsaved = false
  @State private var askEndOthers = false
  @State private var deleting = false
  @State private var notice: String?

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
              Button("로그아웃", role: .destructive) { askLogout = true }
            }
            VStack(alignment: .leading, spacing: 4) {
              Text("클라우드 저장").font(.system(size: 15, weight: .bold))
              Text(store.cloudStatus.isEmpty ? "기록·사진 자동 저장" : store.cloudStatus)
                .font(.system(size: 12, weight: .medium)).foregroundStyle(Color.muted)
            }
            Button("지금 저장") { Task { await store.sync() } }
            Button("다른 기기에서 로그아웃") { askEndOthers = true }
            Button("계정 삭제", role: .destructive) { deleting = true }
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
      .confirmationDialog("@\(store.account?.handle ?? "")에서 로그아웃할까요?", isPresented: $askLogout, titleVisibility: .visible) {
        Button("로그아웃", role: .destructive) {
          Task { if await !store.logOut() { unsaved = true } }
        }
      } message: {
        Text("기록은 이 폰에 남아요. 다른 아이디로 로그인하면 그 아이디 기록으로 바뀌어요.")
      }
      .alert("아직 서버에 못 올린 기록이 있어요", isPresented: $unsaved) {
        Button("그래도 로그아웃", role: .destructive) { Task { await store.logOut(force: true) } }
        Button("취소", role: .cancel) {}
      } message: {
        Text("지금 로그아웃하고 다른 아이디로 로그인하면 이 폰에서 사라져요.")
      }
      .confirmationDialog("이 폰만 남기고 다른 기기에서 모두 로그아웃할까요?", isPresented: $askEndOthers, titleVisibility: .visible) {
        Button("모두 로그아웃", role: .destructive) {
          Task {
            do { notice = try await store.endOtherSessions() > 0 ? "다른 기기에서 모두 로그아웃했어요" : "로그인된 다른 기기가 없어요" }
            catch { notice = error.localizedDescription }
          }
        }
      }
      .alert(notice ?? "", isPresented: Binding(get: { notice != nil }, set: { if !$0 { notice = nil } })) {
        Button("확인", role: .cancel) {}
      }
      .sheet(isPresented: $deleting) { DeleteAccountView() }
    }
  }
}

/// Deleting the account: the password, or the @handle typed out for an Apple/Kakao-only account.
struct DeleteAccountView: View {
  @Environment(Store.self) private var store
  @Environment(\.dismiss) private var dismiss
  @State private var passwordSet: Bool?
  @State private var input = ""
  @State private var busy = false
  @State private var error: String?
  @State private var confirming = false

  var body: some View {
    NavigationStack {
      Form {
        Section {
          Text("서버에 있는 기록·사진·크루 인증·댓글이 모두 지워지고 되돌릴 수 없어요. 이 폰의 기록은 남아요.")
            .font(.system(size: 14, weight: .medium)).foregroundStyle(Color.muted)
        }
        Section {
          switch passwordSet {
          case .none: ProgressView()
          case .some(true):
            SecureField("비밀번호", text: $input).textContentType(.password)
          case .some(false):
            TextField("확인용으로 @\(store.account?.handle ?? "") 입력", text: $input)
              .textInputAutocapitalization(.never).autocorrectionDisabled()
          }
        }
        Section {
          Button(role: .destructive) { confirming = true } label: {
            Text(busy ? "지우는 중…" : "계정 삭제").font(.system(size: 16, weight: .heavy)).frame(maxWidth: .infinity)
          }
          .disabled(busy || passwordSet == nil || input.trimmingCharacters(in: .whitespaces).isEmpty)
          Button { dismiss() } label: {
            Text("취소").font(.system(size: 16, weight: .bold)).foregroundStyle(Color.ink).frame(maxWidth: .infinity)
          }
        }
      }
      .scrollContentBackground(.hidden)
      .background(Color.bg)
      .navigationTitle("계정 삭제")
      .navigationBarTitleDisplayMode(.inline)
      .task { passwordSet = await store.passwordIsSet() }
      .confirmationDialog("@\(store.account?.handle ?? "") 계정을 지울까요?", isPresented: $confirming, titleVisibility: .visible) {
        Button("계정 삭제", role: .destructive) { Task { await delete() } }
      } message: {
        Text("되돌릴 수 없어요.")
      }
      .alert("지우지 못했어요", isPresented: Binding(get: { error != nil }, set: { if !$0 { error = nil } })) {
        Button("확인", role: .cancel) {}
      } message: {
        Text(error ?? "")
      }
    }
  }

  private func delete() async {
    busy = true
    defer { busy = false }
    do {
      if passwordSet == true { try await store.deleteAccount(password: input, confirmHandle: nil) }
      else { try await store.deleteAccount(password: nil, confirmHandle: input) }
      dismiss()
    } catch {
      self.error = error.localizedDescription
      if passwordSet == true { input = "" }
    }
  }
}

/// Apple and Kakao on top (buttons only until the developer accounts exist), ID + password below.
struct LoginView: View {
  @Environment(Store.self) private var store
  @Environment(\.dismiss) private var dismiss
  @State private var signup = false
  @State private var handle = ""
  @State private var password = ""
  @State private var busy = false
  @State private var error: String?
  @State private var pendingProvider: String?
  @State private var switching: Store.PendingLogin?

  var body: some View {
    Form {
      Section {
        VStack(spacing: 10) {
          SocialButton(title: "Apple로 계속하기", symbol: "apple.logo", foreground: .black, background: .white) {
            pendingProvider = "Apple"
          }
          SocialButton(title: "카카오로 계속하기", symbol: "bubble.fill", foreground: .black.opacity(0.85), background: Color(hex: 0xFEE500)) {
            pendingProvider = "카카오"
          }
        }
        .listRowInsets(EdgeInsets())
        .listRowBackground(Color.clear)
      } footer: {
        Text("폰을 바꿔도 기록을 그대로 찾을 수 있어요")
      }
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
    }
    .scrollContentBackground(.hidden)
    .background(Color.bg)
    .navigationTitle(signup ? "아이디 만들기" : "로그인")
    .confirmationDialog(switchTitle, isPresented: Binding(get: { switching != nil }, set: { if !$0 { switching = nil } }), titleVisibility: .visible, presenting: switching) { login in
      Button("@\(login.response.user.handle) 기록으로 바꾸기", role: .destructive) {
        Task { await store.finish(login); dismiss() }
      }
      Button("취소", role: .cancel) { Task { await store.cancel(login) } }
    } message: { login in
      Text("이 폰의 기록이 @\(login.response.user.handle) 것으로 바뀌어요. @\(login.replaces?.handle ?? "") 기록은 서버에 그대로 있어요.")
    }
    .alert("곧 열려요", isPresented: Binding(get: { pendingProvider != nil }, set: { if !$0 { pendingProvider = nil } })) {
      Button("확인", role: .cancel) {}
    } message: {
      Text("\(pendingProvider ?? "") 로그인은 준비 중이에요.\n지금은 아이디로 로그인해 주세요.")
    }
    .alert("로그인하지 못했어요", isPresented: Binding(get: { error != nil }, set: { if !$0 { error = nil } })) {
      Button("확인", role: .cancel) {}
    } message: {
      Text(error ?? "")
    }
  }

  private var switchTitle: String { "이 폰에는 @\(switching?.replaces?.handle ?? "") 기록이 있어요" }

  private func submit() async {
    busy = true
    defer { busy = false }
    let id = handle.trimmingCharacters(in: .whitespaces).lowercased()
    do {
      let login = signup ? try await store.signUp(handle: id, password: password) : try await store.logIn(handle: id, password: password)
      if login.replaces != nil {
        switching = login
      } else {
        await store.finish(login)
        dismiss()
      }
    } catch {
      self.error = error.localizedDescription
      password = ""
    }
  }
}

/// A full-width sign-in button in the provider's own colors.
struct SocialButton: View {
  let title: String
  let symbol: String
  let foreground: Color
  let background: Color
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      HStack(spacing: 8) {
        Image(systemName: symbol).font(.system(size: 17, weight: .semibold))
        Text(title).font(.system(size: 16, weight: .bold))
      }
      .foregroundStyle(foreground)
      .frame(maxWidth: .infinity, minHeight: 52)
      .background(background, in: .rect(cornerRadius: 14))
    }
    .buttonStyle(PressScale(scale: 0.98))
  }
}
