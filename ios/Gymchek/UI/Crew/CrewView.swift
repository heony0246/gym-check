import SwiftUI

/// The 크루 tab: this week's race on proven days, today's proof photos, invites.
struct CrewView: View {
  @Environment(Store.self) private var store
  @State private var model = CrewModel()
  @State private var viewing: ProofKey?
  @State private var shooting = false
  @State private var askLeave = false
  @State private var notice: String?
  @State private var name = ""
  @State private var code = ""

  struct ProofKey: Identifiable, Hashable {
    let userId: String
    let date: String
    var id: String { "\(userId)/\(date)" }
  }

  private var todayKey: String { Day.key(Day.today()) }

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: 0) {
          content
        }
        .padding(.horizontal, 18)
        .padding(.top, 12)
        .padding(.bottom, 32)
      }
      .background(Color.bg)
      .refreshable { await model.load(store) }
      .toolbar(.hidden, for: .navigationBar)
    }
    .task(id: store.account?.userId) {
      model.reset()
      if store.isLoggedIn { await model.load(store) }
    }
    .sheet(item: $viewing) { key in ProofViewer(model: model, key: key) }
    .fullScreenCover(isPresented: $shooting, onDismiss: { Task { await model.loadBoard(store) } }) {
      CameraView(date: todayKey)
    }
    .confirmationDialog("'\(model.board?.crew.name ?? "")' 크루에서 나갈까요?", isPresented: $askLeave, titleVisibility: .visible) {
      Button("나가기", role: .destructive) { Task { notice = await model.leave(store: store) } }
    }
    .alert(notice ?? "", isPresented: Binding(get: { notice != nil }, set: { if !$0 { notice = nil } })) {
      Button("확인", role: .cancel) {}
    }
  }

  // MARK: States

  @ViewBuilder private var content: some View {
    if !store.isLoggedIn {
      head("크루")
      intro
      VStack(alignment: .leading, spacing: 12) {
        Text("로그인하고 시작해요").font(.system(size: 15, weight: .bold))
        NavigationLink { LoginView() } label: {
          Text("로그인 · 아이디 만들기").font(.system(size: 16, weight: .heavy)).foregroundStyle(Color.onVolt)
            .frame(maxWidth: .infinity, minHeight: 52).background(Color.volt, in: .rect(cornerRadius: 16))
        }
      }
      .padding(16)
      .background(Color.surface, in: .rect(cornerRadius: 18))
    } else if model.list == nil {
      head("크루")
      status
    } else if model.list?.isEmpty == true || model.manage {
      head(model.list?.isEmpty == true ? "크루" : "크루 추가")
      if model.list?.isEmpty == true { intro }
      forms
      if model.list?.isEmpty == false {
        Button("돌아가기") { model.manage = false }
          .font(.system(size: 15, weight: .bold)).foregroundStyle(Color.muted)
          .frame(maxWidth: .infinity, minHeight: 44)
          .padding(.top, 12)
      }
    } else if let board = model.board, board.crew.id == model.current?.id {
      boardView(board)
    } else {
      head(model.current?.name ?? "크루")
      chips
      status
    }
  }

  @ViewBuilder private var status: some View {
    VStack(spacing: 12) {
      if model.error.isEmpty {
        ProgressView().tint(Color.muted)
      } else {
        Text(model.error).font(.system(size: 14, weight: .semibold)).foregroundStyle(Color.muted)
        Button("다시 시도") { Task { await model.load(store) } }.font(.system(size: 14, weight: .heavy))
      }
    }
    .frame(maxWidth: .infinity, minHeight: 200)
  }

  private func head(_ title: String, kicker: String = "Crew", invite: CrewDTO? = nil) -> some View {
    HStack(alignment: .bottom) {
      VStack(alignment: .leading, spacing: 4) {
        Kicker(text: kicker, color: .volt)
        Text(title).font(.system(size: 30, weight: .heavy)).tracking(-1).lineLimit(1)
      }
      Spacer()
      if let invite {
        ShareLink(item: inviteText(invite)) {
          Text("초대").font(.system(size: 13, weight: .heavy)).foregroundStyle(Color.ink)
            .padding(.horizontal, 16).frame(height: 36).background(Color.surface2, in: .capsule)
        }
      }
    }
    .padding(.bottom, 16)
  }

  private func inviteText(_ c: CrewDTO) -> String {
    "짐첵 '\(c.name)' 크루에서 같이 오운완 인증해요! 초대 코드 \(c.code)\nhttps://heony0246.github.io/gym-check/?crew=\(c.code)"
  }

  private var intro: some View {
    (Text("친구끼리 이번 주 ") + Text("오운완 인증").bold().foregroundStyle(Color.volt) + Text(" 횟수로 겨뤄요"))
      .font(.system(size: 14, weight: .semibold))
      .foregroundStyle(Color.muted)
      .padding(.bottom, 16)
  }

  @ViewBuilder private var chips: some View {
    if let list = model.list, list.count > 1 {
      ScrollView(.horizontal, showsIndicators: false) {
        HStack(spacing: 6) {
          ForEach(list) { c in
            let on = c.id == model.current?.id
            Button { model.pick(c.id, store: store) } label: {
              Text(c.name).font(.system(size: 14, weight: .bold))
                .foregroundStyle(on ? Color.onVolt : Color.ink)
                .padding(.horizontal, 14).frame(height: 34)
                .background(on ? Color.volt : Color.surface2, in: .capsule)
            }
            .buttonStyle(.plain)
          }
        }
      }
      .padding(.bottom, 16)
    }
  }

  // MARK: Create / join

  private var forms: some View {
    VStack(alignment: .leading, spacing: 10) {
      SectionHead(title: "크루 만들기", trailing: "New")
      HStack(spacing: 8) {
        field("크루 이름 (예: 아침반)", text: $name)
          .onChange(of: name) { _, v in if v.count > 12 { name = String(v.prefix(12)) } }
        actionButton("만들기", primary: true) {
          let n = name.trimmingCharacters(in: .whitespaces)
          guard !n.isEmpty else { notice = "크루 이름을 정해 주세요"; return }
          notice = await model.create(name: n, store: store)
          name = ""
        }
      }
      SectionHead(title: "초대 코드로 들어가기", trailing: "Join").padding(.top, 16)
      HStack(spacing: 8) {
        field("6자리 코드", text: $code)
          .textInputAutocapitalization(.characters)
          .autocorrectionDisabled()
          .onChange(of: code) { _, v in if v.count > 6 { code = String(v.prefix(6)) } }
        actionButton("들어가기", primary: false) {
          notice = await model.join(code: code, store: store)
          code = ""
        }
      }
    }
  }

  private func field(_ prompt: String, text: Binding<String>) -> some View {
    TextField(prompt, text: text)
      .font(.system(size: 16, weight: .semibold))
      .padding(.horizontal, 14)
      .frame(height: 50)
      .background(Color.surface, in: .rect(cornerRadius: 12))
      .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Color.lineStrong))
  }

  private func actionButton(_ label: String, primary: Bool, action: @escaping () async -> Void) -> some View {
    Button {
      guard !model.busy else { return }
      model.busy = true
      Task { await action(); model.busy = false }
    } label: {
      Text(label).font(.system(size: 15, weight: .heavy))
        .foregroundStyle(primary ? Color.onVolt : Color.ink)
        .padding(.horizontal, 18).frame(height: 50)
        .background(primary ? Color.volt : Color.surface2, in: .rect(cornerRadius: 12))
    }
    .buttonStyle(PressScale())
  }

  // MARK: Board

  private struct Row: Identifiable {
    let member: BoardMember
    let count: Int
    let days: Set<String>
    let today: Proof?
    var rank = 0
    var id: String { member.id }
  }

  private func rows(_ b: Board, week: WeekRange) -> [Row] {
    var out = b.members.map { m in
      let mine = b.proofs.filter { $0.userId == m.id }
      return Row(member: m, count: Set(mine.map(\.date)).count, days: Set(mine.map(\.date)), today: mine.first { $0.date == todayKey })
    }
    .sorted { $0.count != $1.count ? $0.count > $1.count : ($0.member.isMe && !$1.member.isMe) }
    var rank = 0
    for i in out.indices {
      if i == 0 || out[i].count != out[i - 1].count { rank = i + 1 }
      out[i].rank = rank
    }
    return out
  }

  @ViewBuilder private func boardView(_ b: Board) -> some View {
    let week = WeekRange()
    let rows = rows(b, week: week)
    let best = rows.first?.count ?? 0
    let proven = rows.filter { $0.today != nil }
    let me = rows.first { $0.member.isMe }

    head(b.crew.name, kicker: "Crew · \(b.crew.members ?? b.members.count)명", invite: b.crew)
    chips
    if b.members.count < 2 {
      (Text("아직 혼자예요. ") + Text("초대").bold().foregroundStyle(Color.volt) + Text("로 친구를 불러보세요"))
        .font(.system(size: 14, weight: .semibold)).foregroundStyle(Color.muted).padding(.bottom, 16)
    }

    SectionHead(title: "이번 주 순위", trailing: "\(shortDay(week.from)) – \(shortDay(week.to))").padding(.bottom, 10)
    VStack(spacing: 0) {
      ForEach(rows) { r in
        let lead = best > 0 && r.count == best
        HStack(spacing: 12) {
          Text("\(r.rank)").font(.display(22)).foregroundStyle(lead ? Color.volt : Color.muted).frame(width: 22)
          HStack(spacing: 6) {
            Text("@\(r.member.handle)").font(.system(size: 15, weight: .bold)).lineLimit(1)
            if r.member.isMe {
              Text("나").font(.system(size: 11, weight: .heavy)).foregroundStyle(Color.onVolt)
                .padding(.horizontal, 6).padding(.vertical, 2).background(Color.volt, in: .capsule)
            }
          }
          Spacer(minLength: 6)
          HStack(spacing: 4) {
            ForEach(week.days, id: \.self) { d in
              Circle()
                .fill(r.days.contains(d) ? Color.volt : d > todayKey ? Color.clear : r.member.isMe ? Color.surface3 : Color.surface2)
                .overlay(Circle().strokeBorder(d == todayKey && !r.days.contains(d) ? Color.volt : d > todayKey ? Color.lineStrong : .clear, lineWidth: 1))
                .frame(width: 9, height: 9)
            }
          }
          (Text("\(r.count)").font(.display(20)) + Text("일").font(.system(size: 12, weight: .bold)).foregroundStyle(Color.muted))
            .frame(width: 40, alignment: .trailing)
        }
        .padding(.horizontal, 14)
        .frame(minHeight: 52)
        .background(r.member.isMe ? Color.surface2 : .clear)
        .overlay(alignment: .top) { Rectangle().fill(Color.line).frame(height: 1) }
      }
    }
    .background(Color.surface, in: .rect(cornerRadius: 18))
    .clipShape(.rect(cornerRadius: 18))
    if let last = b.lastWeek, !last.winners.isEmpty {
      Text("🏆 지난주 1등 \(last.winners.map { "@\($0)" }.joined(separator: ", ")) · \(last.best)일")
        .font(.system(size: 13, weight: .bold)).foregroundStyle(Color.muted).padding(.top, 10)
    }

    HStack(alignment: .firstTextBaseline) {
      (Text("오늘 인증 ").font(.system(size: 18, weight: .heavy)) + Text("\(proven.count)").font(.display(20)).foregroundStyle(Color.volt))
      Spacer()
      Kicker(text: "Today", size: 11)
    }
    .padding(.top, 28)
    .padding(.bottom, 10)
    if proven.isEmpty {
      Text("아직 아무도 없어요").font(.system(size: 13, weight: .semibold)).foregroundStyle(Color.faint)
    } else {
      ScrollView(.horizontal, showsIndicators: false) {
        HStack(spacing: 10) {
          ForEach(proven) { r in
            if let p = r.today {
              Button { viewing = ProofKey(userId: p.userId, date: p.date) } label: { proofCard(p, handle: r.member.handle) }
                .buttonStyle(PressScale())
            }
          }
        }
        .padding(.horizontal, 18)
      }
      .padding(.horizontal, -18)
    }
    if me?.today == nil {
      Button { shooting = true } label: {
        Label(store.attended(todayKey) ? "오운완 찍고 인증하기" : "운동 체크하고 오운완으로 인증하기", systemImage: "camera.fill")
          .font(.system(size: 16, weight: .heavy)).foregroundStyle(Color.onVolt)
          .frame(maxWidth: .infinity, minHeight: 56).background(Color.volt, in: .rect(cornerRadius: 16))
      }
      .buttonStyle(PressScale(scale: 0.98))
      .padding(.top, 14)
    }
    Text("오운완을 저장하면 자동 인증돼요 · 놓친 날도 그날 찍은 사진이면 돼요\n인증 사진은 나와 같은 크루에 있는 사람만 볼 수 있어요")
      .font(.system(size: 12, weight: .semibold)).foregroundStyle(Color.faint)
      .padding(.top, 12)

    VStack(spacing: 0) {
      manageRow("초대 코드") { Text(b.crew.code).font(.display(22)).foregroundStyle(Color.volt).textSelection(.enabled) }
      manageRow("다른 크루 만들기·들어가기") {
        Button("추가") { model.manage = true }.font(.system(size: 14, weight: .heavy))
      }
      manageRow("이 크루에서 나가기") {
        Button("나가기", role: .destructive) { askLeave = true }.font(.system(size: 14, weight: .heavy)).foregroundStyle(Color.danger)
      }
    }
    .background(Color.surface, in: .rect(cornerRadius: 18))
    .padding(.top, 24)
  }

  private func proofCard(_ p: Proof, handle: String) -> some View {
    ZStack(alignment: .bottomLeading) {
      AuthImage(path: p.image)
        .frame(width: 128, height: 170)
        .clipped()
      LinearGradient(colors: [.clear, .black.opacity(0.7)], startPoint: .center, endPoint: .bottom)
      VStack(alignment: .leading, spacing: 2) {
        Text("@\(handle)").font(.system(size: 12, weight: .heavy)).foregroundStyle(.white).lineLimit(1)
        Text("🔥 \(p.fires)" + (p.comments > 0 ? "  💬 \(p.comments)" : ""))
          .font(.system(size: 11, weight: .bold)).foregroundStyle(p.fired ? Color.volt : .white.opacity(0.8))
      }
      .padding(10)
    }
    .frame(width: 128, height: 170)
    .clipShape(.rect(cornerRadius: 14))
  }

  private func manageRow(_ label: String, @ViewBuilder trailing: () -> some View) -> some View {
    HStack {
      Text(label).font(.system(size: 15, weight: .semibold))
      Spacer()
      trailing()
    }
    .padding(.horizontal, 16)
    .frame(minHeight: 52)
    .overlay(alignment: .bottom) { Rectangle().fill(Color.line).frame(height: 1) }
  }
}

// MARK: - Proof viewer

/// One proof full size: 🔥 and the comments.
struct ProofViewer: View {
  @Environment(Store.self) private var store
  @Environment(\.dismiss) private var dismiss
  let model: CrewModel
  let key: CrewView.ProofKey

  @State private var comments: [CommentDTO]?
  @State private var draft = ""
  @State private var sending = false
  @State private var openComment: String?
  @FocusState private var typing: Bool

  var body: some View {
    let proof = model.proof(key.userId, key.date)
    let member = model.board?.members.first { $0.id == key.userId }
    VStack(spacing: 0) {
      HStack {
        VStack(alignment: .leading, spacing: 2) {
          Text("@\(member?.handle ?? "")").font(.system(size: 16, weight: .heavy))
          Text("\(shortDay(key.date)) · \(proof.map { $0.parts.isEmpty ? "오운완" : $0.parts.joined(separator: "·") } ?? "")")
            .font(.system(size: 12, weight: .semibold)).foregroundStyle(Color.muted)
        }
        Spacer()
        Button { dismiss() } label: {
          Image(systemName: "xmark").font(.system(size: 15, weight: .bold)).foregroundStyle(Color.ink)
            .frame(width: 36, height: 36).background(Color.surface2, in: .circle)
        }
        .accessibilityLabel("닫기")
      }
      .padding(16)
      ScrollView {
        VStack(alignment: .leading, spacing: 14) {
          if let proof {
            AuthImage(path: proof.image, contentMode: .fit)
              .frame(maxWidth: .infinity)
              .clipShape(.rect(cornerRadius: 16))
            HStack(spacing: 12) {
              if member?.isMe == true {
                Text("🔥 \(proof.fires)").font(.system(size: 15, weight: .heavy))
                  .padding(.horizontal, 14).frame(height: 38).background(Color.surface2, in: .capsule)
              } else {
                Button { Task { await model.cheer(proof, store: store) } } label: {
                  Text("🔥 \(proof.fires)").font(.system(size: 15, weight: .heavy))
                    .foregroundStyle(proof.fired ? Color.onVolt : Color.ink)
                    .padding(.horizontal, 14).frame(height: 38)
                    .background(proof.fired ? Color.volt : Color.surface2, in: .capsule)
                }
                .buttonStyle(PressScale())
                .sensoryFeedback(.impact(weight: .light), trigger: proof.fired)
              }
              Text("댓글 \(comments?.count ?? proof.comments)").font(.system(size: 13, weight: .bold)).foregroundStyle(Color.muted)
            }
          }
          commentList
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 16)
      }
      .scrollDismissesKeyboard(.interactively)
      composer
    }
    .background(Color.bg)
    .presentationDragIndicator(.visible)
    .task { await loadComments() }
  }

  @ViewBuilder private var commentList: some View {
    if let comments {
      if comments.isEmpty {
        Text("첫 댓글을 남겨 보세요").font(.system(size: 13, weight: .semibold)).foregroundStyle(Color.faint)
      }
      ForEach(comments) { c in
        let row = VStack(alignment: .leading, spacing: 3) {
          (Text("@\(c.from.handle) ").font(.system(size: 14, weight: .heavy)) + Text(c.body).font(.system(size: 14, weight: .medium)))
          Text(time(c.createdAt)).font(.system(size: 11, weight: .semibold)).foregroundStyle(Color.faint)
        }
        .padding(.vertical, 6)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.bg)
        // Mine, or on my proof: swipe left to delete.
        if c.canDelete {
          SwipeRow(id: c.id, openId: $openComment, actions: [
            SwipeAction(title: "삭제", symbol: "trash", tint: Color.danger) { Task { await delete(c) } },
          ], cornerRadius: 10) { row }
        } else {
          row
        }
      }
    } else {
      Text("댓글 불러오는 중…").font(.system(size: 13, weight: .semibold)).foregroundStyle(Color.faint)
    }
  }

  private var composer: some View {
    HStack(spacing: 8) {
      TextField("댓글 달기", text: $draft)
        .font(.system(size: 16))
        .focused($typing)
        .submitLabel(.send)
        .onSubmit { Task { await send() } }
        .padding(.horizontal, 14)
        .frame(height: 44)
        .background(Color.surface, in: .rect(cornerRadius: 12))
        .onChange(of: draft) { _, v in if v.count > 200 { draft = String(v.prefix(200)) } }
      Button { Task { await send() } } label: {
        Text("보내기").font(.system(size: 15, weight: .heavy)).foregroundStyle(Color.onVolt)
          .padding(.horizontal, 16).frame(height: 44).background(Color.volt, in: .rect(cornerRadius: 12))
      }
      .disabled(sending || draft.trimmingCharacters(in: .whitespaces).isEmpty)
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 10)
    .background(Color.bg)
    .overlay(alignment: .top) { Rectangle().fill(Color.line).frame(height: 1) }
  }

  private func time(_ ms: Double) -> String {
    let c = Day.calendar.dateComponents([.hour, .minute], from: Date(timeIntervalSince1970: ms / 1000))
    return String(format: "%d:%02d", c.hour ?? 0, c.minute ?? 0)
  }

  private func path(_ suffix: String) -> String { "/api/proofs/\(key.userId)/\(key.date)/\(suffix)" }

  private func loadComments() async {
    guard let token = store.account?.token else { return }
    struct Response: Decodable { let comments: [CommentDTO] }
    let list = (try? await API.decode(Response.self, path("comments"), token: token))?.comments ?? []
    comments = list
    if let p = model.proof(key.userId, key.date) { model.setCommentCount(list.count, for: p) }
  }

  private func send() async {
    let body = draft.trimmingCharacters(in: .whitespaces)
    guard !body.isEmpty, !sending, let token = store.account?.token else { return }
    sending = true
    defer { sending = false }
    struct Response: Decodable { let comment: CommentDTO }
    do {
      let r = try await API.decode(Response.self, path("comments"), method: "POST", json: ["body": body], token: token)
      comments = (comments ?? []) + [r.comment]
      draft = ""
      if let p = model.proof(key.userId, key.date) { model.setCommentCount(comments?.count ?? 0, for: p) }
    } catch {
      draft = body
    }
  }

  private func delete(_ c: CommentDTO) async {
    guard let token = store.account?.token else { return }
    guard (try? await API.send("/api/comments/\(c.id)", method: "DELETE", token: token)) != nil else { return }
    comments = comments?.filter { $0.id != c.id }
    if let p = model.proof(key.userId, key.date) { model.setCommentCount(comments?.count ?? 0, for: p) }
  }
}
