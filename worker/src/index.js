// 짐첵 social API: accounts with a unique @handle and a password, Instagram-style
// follow/following, daily check-ins, 오운완 photo posts and 🔥 reactions.
// Data in D1, photos in R2. Each account also has a private cloud backup in R2
// (its records as one JSON, plus one photo per date) so a new phone gets everything back.

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_BACKUP_BYTES = 1024 * 1024;
const MAX_BACKUP_PHOTO_BYTES = 6 * 1024 * 1024;
const PAGE_SIZE = 20;
const GRID_PAGE_SIZE = 30;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// 3–20 of a-z 0-9 . _ ; no dot at either end.
const HANDLE_RE = /^(?!\.)(?!.*\.$)[a-z0-9._]{3,20}$/;
// PBKDF2 rounds for new passwords. Kept per user, so it can be raised later;
// 50k stays well inside the free plan's 10 ms CPU limit.
const PW_ITER = 50000;
const PW_MIN = 6;
const PW_MAX = 64;
// Failed logins per handle before a 15-minute lockout.
const LOGIN_MAX_FAILS = 10;
const LOGIN_LOCK_SECONDS = 900;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request.headers.get('Origin'), env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    let res;
    try {
      res = await route(request, env);
    } catch (e) {
      if (e instanceof HttpError) {
        res = json({ error: e.message }, e.status);
      } else {
        console.error(JSON.stringify({ message: 'unhandled error', path: new URL(request.url).pathname, error: String((e && e.stack) || e) }));
        res = json({ error: '서버에 문제가 생겼어요' }, 500);
      }
    }
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    return res;
  },
};

function corsHeaders(origin, env) {
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!origin || !allowed.includes(origin)) return { Vary: 'Origin' };
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization,Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const m = request.method;
  let p;

  if (m === 'GET' && (p = path.match(/^\/img\/([A-Za-z0-9-]{20,80})$/))) return getImage(env, p[1]);
  if (m === 'POST' && path === '/api/users') return createUser(request, env);
  if (m === 'POST' && path === '/api/login') return login(request, env);

  const me = await authenticate(request, env);
  if (m === 'GET' && path === '/api/me') return json({ user: me });
  if (m === 'PATCH' && path === '/api/me') return updateMe(request, env, me);
  if (m === 'PUT' && path === '/api/me/password') return changePassword(request, env, me);
  if (m === 'DELETE' && path === '/api/session') return logout(env, me);
  if (m === 'GET' && path === '/api/backup') return getBackup(env, me);
  if (m === 'PUT' && path === '/api/backup') return putBackup(request, env, me);
  if ((p = path.match(/^\/api\/backup\/photos\/(\d{4}-\d{2}-\d{2})$/))) {
    if (m === 'GET') return getBackupPhoto(env, me, p[1]);
    if (m === 'PUT') return putBackupPhoto(request, env, me, p[1]);
    if (m === 'DELETE') return deleteBackupPhoto(env, me, p[1]);
  }
  if (m === 'GET' && path === '/api/search') return search(env, me, url);
  if (m === 'GET' && path === '/api/feed') return feed(env, me, url);
  if (m === 'GET' && path === '/api/today') return todayList(env, me, url);
  if (m === 'PUT' && path === '/api/days') return putDays(request, env, me);
  if (m === 'PUT' && (p = path.match(/^\/api\/days\/(\d{4}-\d{2}-\d{2})$/))) return putDay(request, env, me, p[1]);
  if (m === 'POST' && path === '/api/posts') return createPost(request, env, me);
  if (m === 'GET' && (p = path.match(/^\/api\/posts\/([\w-]+)$/))) return getPost(env, me, p[1]);
  if (m === 'DELETE' && (p = path.match(/^\/api\/posts\/([\w-]+)$/))) return deletePost(env, me, p[1]);
  if (m === 'POST' && (p = path.match(/^\/api\/posts\/([\w-]+)\/fire$/))) return toggleFire(env, me, p[1]);
  if ((m === 'PUT' || m === 'DELETE') && (p = path.match(/^\/api\/follows\/([a-z0-9._]+)$/))) return setFollow(env, me, p[1], m === 'PUT');
  if (m === 'GET' && (p = path.match(/^\/api\/users\/([a-z0-9._]+)$/))) return profile(env, me, p[1], url);
  if (m === 'GET' && (p = path.match(/^\/api\/users\/([a-z0-9._]+)\/posts$/))) return userPosts(env, me, p[1], url);
  if (m === 'GET' && (p = path.match(/^\/api\/users\/([a-z0-9._]+)\/(followers|following)$/))) return followList(env, me, p[1], p[2]);
  throw new HttpError(404, '없는 주소예요');
}

// ---------- helpers ----------

const toHex = bytes => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
const fromHex = hex => new Uint8Array(hex.match(/../g).map(h => parseInt(h, 16)));

async function sha256Hex(text) {
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}

async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256));
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { pw_hash: toHex(await pbkdf2(password, salt, PW_ITER)), pw_salt: toHex(salt), pw_iter: PW_ITER };
}

async function checkPassword(password, row) {
  const got = await pbkdf2(password, fromHex(row.pw_salt), row.pw_iter);
  return crypto.subtle.timingSafeEqual(got, fromHex(row.pw_hash));
}

function cleanPassword(value) {
  const s = typeof value === 'string' ? value : '';
  if ([...s].length < PW_MIN) throw new HttpError(400, `비밀번호는 ${PW_MIN}자 이상이에요`);
  if ([...s].length > PW_MAX) throw new HttpError(400, `비밀번호는 ${PW_MAX}자까지예요`);
  return s;
}

// New device session: the device keeps the token, the table keeps its hash.
async function newSession(env, userId) {
  const token = randomToken();
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, created_at) VALUES (?, ?, ?)')
    .bind(await sha256Hex(token), userId, Date.now()).run();
  return token;
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function readJson(request) {
  try {
    return await request.json();
  } catch (e) {
    throw new HttpError(400, '요청 형식이 잘못됐어요');
  }
}

function cleanText(value, max, field) {
  const s = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if (!s) throw new HttpError(400, `${field}을 입력해 주세요`);
  if ([...s].length > max) throw new HttpError(400, `${field}은 ${max}자까지예요`);
  return s;
}

function cleanHandle(value) {
  const h = String(value || '').trim().toLowerCase().replace(/^@/, '');
  if (!HANDLE_RE.test(h)) throw new HttpError(400, '아이디는 영문 소문자·숫자·마침표(.)·밑줄(_)로 3~20자예요');
  return h;
}

function cleanParts(value) {
  if (!Array.isArray(value)) throw new HttpError(400, '부위 형식이 잘못됐어요');
  return value
    .filter(v => typeof v === 'string')
    .map(v => [...v.trim()].slice(0, 12).join(''))
    .filter(Boolean)
    .slice(0, 20);
}

// Returns the user plus the session's token hash (used to log out this device).
async function authenticate(request, env) {
  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) throw new HttpError(401, '로그인이 필요해요');
  const tokenHash = await sha256Hex(token);
  const user = await env.DB.prepare(`
    SELECT u.id, u.handle, u.nickname FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?`).bind(tokenHash).first();
  if (!user) throw new HttpError(401, '로그인이 풀렸어요. 다시 로그인해 주세요');
  Object.defineProperty(user, 'tokenHash', { value: tokenHash, enumerable: false });
  return user;
}

async function userByHandle(env, handle) {
  const u = await env.DB.prepare('SELECT id, handle, nickname FROM users WHERE handle = ?').bind(handle).first();
  if (!u) throw new HttpError(404, '없는 아이디예요');
  return u;
}

// Shared SELECT for post lists; first bound value is the viewer's id.
const POST_SELECT = `
  SELECT p.id, p.user_id, u.handle, u.nickname, p.date, p.headline, p.parts, p.image_key, p.created_at,
    (SELECT COUNT(*) FROM fires f WHERE f.post_id = p.id) AS fires,
    EXISTS (SELECT 1 FROM fires f WHERE f.post_id = p.id AND f.user_id = ?) AS fired
  FROM posts p JOIN users u ON u.id = p.user_id`;

function postFromRow(r) {
  return {
    id: r.id,
    user: { id: r.user_id, handle: r.handle, nickname: r.nickname },
    date: r.date,
    headline: r.headline,
    parts: JSON.parse(r.parts),
    image: `/img/${r.image_key}`,
    fires: r.fires,
    fired: Boolean(r.fired),
    createdAt: r.created_at,
  };
}

const userRow = r => ({ id: r.id, handle: r.handle, nickname: r.nickname, followed: Boolean(r.followed), isMe: Boolean(r.is_me) });

// ---------- accounts ----------

async function createUser(request, env) {
  const body = await readJson(request);
  const handle = cleanHandle(body.handle);
  const nickname = cleanText(body.nickname, 12, '닉네임');
  const pw = await hashPassword(cleanPassword(body.password));
  const user = { id: crypto.randomUUID(), handle, nickname };
  try {
    await env.DB.prepare('INSERT INTO users (id, handle, nickname, pw_hash, pw_salt, pw_iter, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(user.id, handle, nickname, pw.pw_hash, pw.pw_salt, pw.pw_iter, Date.now()).run();
  } catch (e) {
    if (String(e).includes('UNIQUE')) throw new HttpError(409, '이미 쓰고 있는 아이디예요');
    throw e;
  }
  return json({ user, token: await newSession(env, user.id) }, 201);
}

async function login(request, env) {
  const body = await readJson(request);
  const handle = String(body.handle || '').trim().toLowerCase().replace(/^@/, '');
  const password = typeof body.password === 'string' ? body.password : '';
  if (!HANDLE_RE.test(handle) || !password || password.length > PW_MAX * 4) throw new HttpError(401, '아이디나 비밀번호가 맞지 않아요');

  const now = Date.now();
  const windowStart = now - LOGIN_LOCK_SECONDS * 1000;
  const fail = await env.DB.prepare('SELECT count FROM login_fails WHERE handle = ? AND first_at > ?').bind(handle, windowStart).first();
  if (fail && fail.count >= LOGIN_MAX_FAILS) throw new HttpError(429, '로그인을 너무 많이 틀렸어요. 15분 뒤에 다시 해 주세요');

  const row = await env.DB.prepare('SELECT id, handle, nickname, pw_hash, pw_salt, pw_iter FROM users WHERE handle = ?').bind(handle).first();
  if (!row || !(await checkPassword(password, row))) {
    // Count within a 15-minute window that starts at the first miss.
    await env.DB.prepare(`
      INSERT INTO login_fails (handle, count, first_at) VALUES (?, 1, ?)
      ON CONFLICT (handle) DO UPDATE SET
        count = CASE WHEN first_at > ? THEN count + 1 ELSE 1 END,
        first_at = CASE WHEN first_at > ? THEN first_at ELSE excluded.first_at END`)
      .bind(handle, now, windowStart, windowStart).run();
    throw new HttpError(401, '아이디나 비밀번호가 맞지 않아요');
  }
  if (fail) await env.DB.prepare('DELETE FROM login_fails WHERE handle = ?').bind(handle).run();
  return json({ user: { id: row.id, handle: row.handle, nickname: row.nickname }, token: await newSession(env, row.id) });
}

// No email on file, so a logged-in device is how you reset a forgotten password.
async function changePassword(request, env, me) {
  const body = await readJson(request);
  const pw = await hashPassword(cleanPassword(body.password));
  await env.DB.prepare('UPDATE users SET pw_hash = ?, pw_salt = ?, pw_iter = ? WHERE id = ?')
    .bind(pw.pw_hash, pw.pw_salt, pw.pw_iter, me.id).run();
  return json({ ok: true });
}

async function logout(env, me) {
  await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(me.tokenHash).run();
  return json({ ok: true });
}

async function updateMe(request, env, me) {
  const body = await readJson(request);
  const nickname = cleanText(body.nickname, 12, '닉네임');
  await env.DB.prepare('UPDATE users SET nickname = ? WHERE id = ?').bind(nickname, me.id).run();
  return json({ user: { ...me, nickname } });
}

// ---------- people ----------

async function search(env, me, url) {
  const q = String(url.searchParams.get('q') || '').trim().replace(/^@/, '').slice(0, 20);
  if (!q) return json({ users: [] });
  const like = q.replace(/[\\%_]/g, c => `\\${c}`);
  const { results } = await env.DB.prepare(`
    SELECT u.id, u.handle, u.nickname, u.id = ? AS is_me,
      EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = ? AND f.followee_id = u.id) AS followed
    FROM users u
    WHERE u.handle LIKE ? ESCAPE '\\' OR u.nickname LIKE ? ESCAPE '\\'
    ORDER BY (u.handle = ?) DESC, (u.handle LIKE ? ESCAPE '\\') DESC, u.handle
    LIMIT 20`).bind(me.id, me.id, `${like.toLowerCase()}%`, `%${like}%`, q.toLowerCase(), `${like.toLowerCase()}%`).all();
  return json({ users: results.map(userRow) });
}

async function profile(env, me, handle, url) {
  const year = /^\d{4}$/.test(url.searchParams.get('year') || '') ? url.searchParams.get('year') : String(new Date().getUTCFullYear());
  const r = await env.DB.prepare(`
    SELECT u.id, u.handle, u.nickname,
      (SELECT COUNT(*) FROM posts WHERE user_id = u.id) AS posts,
      (SELECT COUNT(*) FROM follows WHERE followee_id = u.id) AS followers,
      (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) AS following,
      (SELECT COUNT(*) FROM days WHERE user_id = u.id AND date LIKE ?) AS year_days,
      EXISTS (SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = u.id) AS followed
    FROM users u WHERE u.handle = ?`).bind(`${year}-%`, me.id, handle).first();
  if (!r) throw new HttpError(404, '없는 아이디예요');
  return json({
    profile: {
      id: r.id,
      handle: r.handle,
      nickname: r.nickname,
      posts: r.posts,
      followers: r.followers,
      following: r.following,
      yearDays: r.year_days,
      followed: Boolean(r.followed),
      isMe: r.id === me.id,
    },
  });
}

async function followList(env, me, handle, kind) {
  const u = await userByHandle(env, handle);
  const sql = kind === 'followers'
    ? 'SELECT x.id, x.handle, x.nickname, x.id = ? AS is_me, EXISTS (SELECT 1 FROM follows g WHERE g.follower_id = ? AND g.followee_id = x.id) AS followed FROM follows f JOIN users x ON x.id = f.follower_id WHERE f.followee_id = ? ORDER BY f.created_at DESC LIMIT 200'
    : 'SELECT x.id, x.handle, x.nickname, x.id = ? AS is_me, EXISTS (SELECT 1 FROM follows g WHERE g.follower_id = ? AND g.followee_id = x.id) AS followed FROM follows f JOIN users x ON x.id = f.followee_id WHERE f.follower_id = ? ORDER BY f.created_at DESC LIMIT 200';
  const { results } = await env.DB.prepare(sql).bind(me.id, me.id, u.id).all();
  return json({ users: results.map(userRow) });
}

async function setFollow(env, me, handle, follow) {
  const u = await userByHandle(env, handle);
  if (u.id === me.id) throw new HttpError(400, '나 자신은 팔로우할 수 없어요');
  if (follow) {
    await env.DB.prepare('INSERT OR IGNORE INTO follows (follower_id, followee_id, created_at) VALUES (?, ?, ?)').bind(me.id, u.id, Date.now()).run();
  } else {
    await env.DB.prepare('DELETE FROM follows WHERE follower_id = ? AND followee_id = ?').bind(me.id, u.id).run();
  }
  const { count } = await env.DB.prepare('SELECT COUNT(*) AS count FROM follows WHERE followee_id = ?').bind(u.id).first();
  return json({ followed: follow, followers: count });
}

// ---------- check-ins ----------

async function putDay(request, env, me, date) {
  const body = await readJson(request);
  await env.DB.batch([dayStatement(env, me.id, date, cleanParts(body.parts))]);
  return json({ ok: true });
}

// Bulk upload, used once after signing up so profiles show the whole year.
async function putDays(request, env, me) {
  const body = await readJson(request);
  const entries = Object.entries(body.days || {}).filter(([d]) => DATE_RE.test(d)).slice(0, 400);
  for (let i = 0; i < entries.length; i += 50) {
    await env.DB.batch(entries.slice(i, i + 50).map(([d, parts]) => dayStatement(env, me.id, d, cleanParts(parts))));
  }
  return json({ ok: true, count: entries.length });
}

function dayStatement(env, userId, date, parts) {
  if (!parts.length) return env.DB.prepare('DELETE FROM days WHERE user_id = ? AND date = ?').bind(userId, date);
  return env.DB.prepare(`
    INSERT INTO days (user_id, date, parts, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT (user_id, date) DO UPDATE SET parts = excluded.parts, updated_at = excluded.updated_at`)
    .bind(userId, date, JSON.stringify(parts), Date.now());
}

// Who among the people I follow (and me) checked in on the given day.
async function todayList(env, me, url) {
  const date = url.searchParams.get('date') || '';
  if (!DATE_RE.test(date)) throw new HttpError(400, '날짜 형식이 잘못됐어요');
  const { results } = await env.DB.prepare(`
    SELECT u.id, u.handle, u.nickname, d.parts, u.id = ? AS is_me
    FROM days d JOIN users u ON u.id = d.user_id
    WHERE d.date = ? AND (d.user_id = ? OR d.user_id IN (SELECT followee_id FROM follows WHERE follower_id = ?))
    ORDER BY is_me DESC, d.updated_at DESC
    LIMIT 100`).bind(me.id, date, me.id, me.id).all();
  return json({ users: results.map(r => ({ ...userRow(r), parts: JSON.parse(r.parts) })) });
}

// ---------- posts ----------

async function feed(env, me, url) {
  const before = Number(url.searchParams.get('before')) || Number.MAX_SAFE_INTEGER;
  const { results } = await env.DB.prepare(`${POST_SELECT}
    WHERE (p.user_id = ? OR p.user_id IN (SELECT followee_id FROM follows WHERE follower_id = ?)) AND p.created_at < ?
    ORDER BY p.created_at DESC LIMIT ?`).bind(me.id, me.id, me.id, before, PAGE_SIZE).all();
  return json({ posts: results.map(postFromRow), more: results.length === PAGE_SIZE });
}

async function userPosts(env, me, handle, url) {
  const u = await userByHandle(env, handle);
  const before = Number(url.searchParams.get('before')) || Number.MAX_SAFE_INTEGER;
  const { results } = await env.DB.prepare(`${POST_SELECT}
    WHERE p.user_id = ? AND p.created_at < ?
    ORDER BY p.created_at DESC LIMIT ?`).bind(me.id, u.id, before, GRID_PAGE_SIZE).all();
  return json({ posts: results.map(postFromRow), more: results.length === GRID_PAGE_SIZE });
}

async function getPost(env, me, id) {
  const r = await env.DB.prepare(`${POST_SELECT} WHERE p.id = ?`).bind(me.id, id).first();
  if (!r) throw new HttpError(404, '없는 게시물이에요');
  return json({ post: postFromRow(r) });
}

async function createPost(request, env, me) {
  const length = Number(request.headers.get('Content-Length') || 0);
  if (length > MAX_IMAGE_BYTES + 64 * 1024) throw new HttpError(413, '사진이 너무 커요');
  let form;
  try {
    form = await request.formData();
  } catch (e) {
    throw new HttpError(400, '요청 형식이 잘못됐어요');
  }
  const image = form.get('image');
  const date = String(form.get('date') || '');
  if (!DATE_RE.test(date)) throw new HttpError(400, '날짜 형식이 잘못됐어요');
  const headline = cleanText(form.get('headline'), 60, '제목');
  let parts;
  try {
    parts = cleanParts(JSON.parse(String(form.get('parts') || '[]')));
  } catch (e) {
    throw new HttpError(400, '부위 형식이 잘못됐어요');
  }
  if (!image || typeof image === 'string' || image.type !== 'image/jpeg') throw new HttpError(400, 'JPEG 사진만 올릴 수 있어요');
  if (image.size > MAX_IMAGE_BYTES) throw new HttpError(413, '사진이 너무 커요');

  const id = crypto.randomUUID();
  const imageKey = crypto.randomUUID();
  const now = Date.now();
  await env.IMAGES.put(imageKey, image, { httpMetadata: { contentType: 'image/jpeg' } });
  await env.DB.prepare('INSERT INTO posts (id, user_id, date, headline, parts, image_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, me.id, date, headline, JSON.stringify(parts), imageKey, now).run();
  return json({
    post: { id, user: { id: me.id, handle: me.handle, nickname: me.nickname }, date, headline, parts, image: `/img/${imageKey}`, fires: 0, fired: false, createdAt: now },
  }, 201);
}

async function deletePost(env, me, postId) {
  const post = await env.DB.prepare('SELECT user_id, image_key FROM posts WHERE id = ?').bind(postId).first();
  if (!post) throw new HttpError(404, '없는 게시물이에요');
  if (post.user_id !== me.id) throw new HttpError(403, '내 게시물만 지울 수 있어요');
  await env.DB.batch([
    env.DB.prepare('DELETE FROM fires WHERE post_id = ?').bind(postId),
    env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(postId),
  ]);
  await env.IMAGES.delete(post.image_key);
  return json({ ok: true });
}

async function toggleFire(env, me, postId) {
  const post = await env.DB.prepare('SELECT 1 AS ok FROM posts WHERE id = ?').bind(postId).first();
  if (!post) throw new HttpError(404, '없는 게시물이에요');
  const had = await env.DB.prepare('SELECT 1 AS ok FROM fires WHERE post_id = ? AND user_id = ?').bind(postId, me.id).first();
  if (had) await env.DB.prepare('DELETE FROM fires WHERE post_id = ? AND user_id = ?').bind(postId, me.id).run();
  else await env.DB.prepare('INSERT INTO fires (post_id, user_id) VALUES (?, ?)').bind(postId, me.id).run();
  const { count } = await env.DB.prepare('SELECT COUNT(*) AS count FROM fires WHERE post_id = ?').bind(postId).first();
  return json({ fires: count, fired: !had });
}

// ---------- cloud backup (private to the account) ----------

const backupKey = (userId, name) => `backup/${userId}/${name}`;

// Reads a body whose size the client declared, refusing anything over the limit.
async function readBounded(request, max, tooBig) {
  const length = Number(request.headers.get('Content-Length') || 0);
  if (!length) throw new HttpError(411, '요청 크기를 알 수 없어요');
  if (length > max) throw new HttpError(413, tooBig);
  const buf = await request.arrayBuffer();
  if (buf.byteLength > max) throw new HttpError(413, tooBig);
  return buf;
}

async function getBackup(env, me) {
  const photos = [];
  let cursor;
  do {
    const page = await env.IMAGES.list({ prefix: backupKey(me.id, 'photos/'), cursor, limit: 1000 });
    for (const o of page.objects) {
      const d = o.key.match(/(\d{4}-\d{2}-\d{2})\.jpg$/);
      if (d) photos.push(d[1]);
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  const obj = await env.IMAGES.get(backupKey(me.id, 'state.json'));
  if (!obj) return json({ data: null, updatedAt: 0, photos });
  const { updatedAt, data } = await obj.json();
  return json({ data, updatedAt, photos });
}

async function putBackup(request, env, me) {
  const buf = await readBounded(request, MAX_BACKUP_BYTES, '기록이 너무 커요');
  let body;
  try {
    body = JSON.parse(new TextDecoder().decode(buf));
  } catch (e) {
    throw new HttpError(400, '요청 형식이 잘못됐어요');
  }
  const data = body && body.data;
  if (!data || typeof data !== 'object' || !data.records || typeof data.records !== 'object' || Array.isArray(data.records)) {
    throw new HttpError(400, '기록 형식이 잘못됐어요');
  }
  const updatedAt = Date.now();
  await env.IMAGES.put(backupKey(me.id, 'state.json'), JSON.stringify({ updatedAt, data }), {
    httpMetadata: { contentType: 'application/json' },
  });
  return json({ updatedAt });
}

async function getBackupPhoto(env, me, date) {
  const obj = await env.IMAGES.get(backupKey(me.id, `photos/${date}.jpg`));
  if (!obj) throw new HttpError(404, '사진이 없어요');
  return new Response(obj.body, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store' } });
}

async function putBackupPhoto(request, env, me, date) {
  if (!String(request.headers.get('Content-Type') || '').startsWith('image/jpeg')) throw new HttpError(400, 'JPEG 사진만 올릴 수 있어요');
  const buf = await readBounded(request, MAX_BACKUP_PHOTO_BYTES, '사진이 너무 커요');
  await env.IMAGES.put(backupKey(me.id, `photos/${date}.jpg`), buf, { httpMetadata: { contentType: 'image/jpeg' } });
  return json({ ok: true });
}

async function deleteBackupPhoto(env, me, date) {
  await env.IMAGES.delete(backupKey(me.id, `photos/${date}.jpg`));
  return json({ ok: true });
}

// Feed photo URLs carry a random, unguessable key.
async function getImage(env, key) {
  const obj = await env.IMAGES.get(key);
  if (!obj) throw new HttpError(404, '사진이 없어요');
  return new Response(obj.body, {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
}
