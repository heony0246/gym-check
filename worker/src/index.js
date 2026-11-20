// 짐첵 API: accounts with a unique @handle and a password, a private cloud backup per
// account (records as one JSON plus one photo per date, in R2) so a new phone gets
// everything back, and crews: invite-only groups that race each week on days proven
// with that day's 오운완 photo, with 🔥 cheers. (The older feed routes are still here
// but the app no longer uses them.) Data in D1, photos in R2.

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_BACKUP_BYTES = 4 * 1024 * 1024; // records + the sets × kg log
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
const CREW_MAX_MEMBERS = 8;
const CREWS_PER_USER = 5;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

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

  if (m === 'POST' && path === '/api/users') return createUser(request, env);
  if (m === 'POST' && path === '/api/login') return login(request, env);
  if (m === 'POST' && path === '/api/auth/apple') return socialLogin(request, env, 'apple');
  if (m === 'POST' && path === '/api/auth/kakao') return socialLogin(request, env, 'kakao');

  const me = await authenticate(request, env);
  if (m === 'GET' && (p = path.match(/^\/img\/([A-Za-z0-9-]{20,80})$/))) return getImage(env, me, p[1]);
  if (m === 'GET' && path === '/api/me') return getMe(env, me);
  if (m === 'DELETE' && path === '/api/me') return deleteAccount(request, env, me);
  if (m === 'DELETE' && path === '/api/sessions/others') return endOtherSessions(env, me);
  if (m === 'PUT' && (p = path.match(/^\/api\/me\/(apple|kakao)$/))) return linkSocial(request, env, me, p[1]);
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
  if (m === 'GET' && path === '/api/crews') return myCrews(env, me);
  if (m === 'POST' && path === '/api/crews') return createCrew(request, env, me);
  if (m === 'POST' && path === '/api/crews/join') return joinCrew(request, env, me);
  if (m === 'GET' && (p = path.match(/^\/api\/crews\/([\w-]+)$/))) return crewBoard(env, me, p[1], url);
  if (m === 'DELETE' && (p = path.match(/^\/api\/crews\/([\w-]+)\/me$/))) return leaveCrew(env, me, p[1]);
  if ((p = path.match(/^\/api\/proofs\/(\d{4}-\d{2}-\d{2})$/))) {
    if (m === 'PUT') return putProof(request, env, me, p[1]);
    if (m === 'DELETE') return deleteProof(env, me, p[1]);
  }
  if (m === 'POST' && (p = path.match(/^\/api\/proofs\/([\w-]+)\/(\d{4}-\d{2}-\d{2})\/cheer$/))) return toggleCheer(env, me, p[1], p[2]);
  if ((p = path.match(/^\/api\/proofs\/([\w-]+)\/(\d{4}-\d{2}-\d{2})\/comments$/))) {
    if (m === 'GET') return listComments(env, me, p[1], p[2]);
    if (m === 'POST') return addComment(request, env, me, p[1], p[2]);
  }
  if (m === 'DELETE' && (p = path.match(/^\/api\/comments\/([\w-]+)$/))) return deleteComment(env, me, p[1]);
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

// ---------- Sign in with Apple / Kakao ----------
// The app sends the provider's token; we check it with the provider and map its
// stable user id to one account. A first-time user also sends the @handle they picked.

const b64urlBytes = str => Uint8Array.from(atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4)), c => c.charCodeAt(0));
const b64urlJson = str => JSON.parse(new TextDecoder().decode(b64urlBytes(str)));

// Apple's public keys rotate rarely; keep them for an hour in this isolate.
let appleKeys = { at: 0, keys: [] };
async function appleKey(kid) {
  if (Date.now() - appleKeys.at > 3600 * 1000 || !appleKeys.keys.some(k => k.kid === kid)) {
    const r = await fetch('https://appleid.apple.com/auth/keys');
    if (!r.ok) throw new HttpError(502, '애플 로그인을 확인하지 못했어요');
    appleKeys = { at: Date.now(), keys: (await r.json()).keys || [] };
  }
  return appleKeys.keys.find(k => k.kid === kid);
}

// Verifies an Apple identity token (RS256 JWT) and returns its subject.
async function appleSubject(env, token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new HttpError(401, '애플 로그인 정보가 올바르지 않아요');
  let header;
  let claims;
  try {
    header = b64urlJson(parts[0]);
    claims = b64urlJson(parts[1]);
  } catch (e) {
    throw new HttpError(401, '애플 로그인 정보가 올바르지 않아요');
  }
  if (header.alg !== 'RS256') throw new HttpError(401, '애플 로그인 정보가 올바르지 않아요');
  const jwk = await appleKey(header.kid);
  if (!jwk) throw new HttpError(401, '애플 로그인 정보가 올바르지 않아요');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  const audiences = String(env.APPLE_AUDIENCES || '').split(',').map(x => x.trim()).filter(Boolean);
  if (!ok || claims.iss !== 'https://appleid.apple.com' || !audiences.includes(claims.aud)
    || !(claims.exp * 1000 > Date.now()) || typeof claims.sub !== 'string') {
    throw new HttpError(401, '애플 로그인 정보가 올바르지 않아요');
  }
  return claims.sub;
}

// Checks a Kakao access token was issued for our app and returns the Kakao user id.
async function kakaoSubject(env, token) {
  if (typeof token !== 'string' || !token || token.length > 500) throw new HttpError(401, '카카오 로그인 정보가 올바르지 않아요');
  const r = await fetch('https://kapi.kakao.com/v1/user/access_token_info', { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new HttpError(401, '카카오 로그인 정보가 올바르지 않아요');
  const info = await r.json();
  if (!env.KAKAO_APP_ID || String(info.app_id) !== String(env.KAKAO_APP_ID) || !info.id) {
    throw new HttpError(401, '카카오 로그인 정보가 올바르지 않아요');
  }
  return String(info.id);
}

const SOCIAL_COLUMN = { apple: 'apple_sub', kakao: 'kakao_id' };
const socialSubject = (env, provider, body) => (provider === 'apple' ? appleSubject(env, body.identityToken) : kakaoSubject(env, body.accessToken));

async function socialLogin(request, env, provider) {
  const body = await readJson(request);
  const subject = await socialSubject(env, provider, body);
  const col = SOCIAL_COLUMN[provider];
  const row = await env.DB.prepare(`SELECT id, handle, nickname FROM users WHERE ${col} = ?`).bind(subject).first();
  if (row) return json({ user: row, token: await newSession(env, row.id) });
  // First time with this account: the app asks for an @handle and calls again with it.
  if (!body.handle) return json({ needHandle: true }, 409);
  const handle = cleanHandle(body.handle);
  const user = { id: crypto.randomUUID(), handle, nickname: handle.slice(0, 12) };
  const pw = await hashPassword(randomToken()); // no password until the user sets one
  try {
    await env.DB.prepare(`INSERT INTO users (id, handle, nickname, pw_hash, pw_salt, pw_iter, created_at, pw_set, ${col}) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`)
      .bind(user.id, handle, user.nickname, pw.pw_hash, pw.pw_salt, pw.pw_iter, Date.now(), subject).run();
  } catch (e) {
    if (String(e).includes('UNIQUE')) throw new HttpError(409, '이미 쓰고 있는 아이디예요');
    throw e;
  }
  return json({ user, token: await newSession(env, user.id) }, 201);
}

// Adds Apple / Kakao to the account that's logged in, so either way gets you back in.
async function linkSocial(request, env, me, provider) {
  const subject = await socialSubject(env, provider, await readJson(request));
  const col = SOCIAL_COLUMN[provider];
  const owner = await env.DB.prepare(`SELECT id FROM users WHERE ${col} = ?`).bind(subject).first();
  if (owner && owner.id !== me.id) throw new HttpError(409, '이미 다른 아이디에 연결된 계정이에요');
  await env.DB.prepare(`UPDATE users SET ${col} = ? WHERE id = ?`).bind(subject, me.id).run();
  return getMe(env, me);
}

async function getMe(env, me) {
  const row = await env.DB.prepare('SELECT apple_sub, kakao_id, pw_set FROM users WHERE id = ?').bind(me.id).first();
  return json({
    user: me,
    linked: { apple: Boolean(row && row.apple_sub), kakao: Boolean(row && row.kakao_id) },
    passwordSet: Boolean(row && row.pw_set),
  });
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
// A new password also logs out every other device (someone else may know the old one).
async function changePassword(request, env, me) {
  const body = await readJson(request);
  const pw = await hashPassword(cleanPassword(body.password));
  const [, ended] = await env.DB.batch([
    env.DB.prepare('UPDATE users SET pw_hash = ?, pw_salt = ?, pw_iter = ?, pw_set = 1 WHERE id = ?')
      .bind(pw.pw_hash, pw.pw_salt, pw.pw_iter, me.id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?').bind(me.id, me.tokenHash),
  ]);
  return json({ ok: true, endedSessions: ended.meta.changes });
}

async function logout(env, me) {
  await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(me.tokenHash).run();
  return json({ ok: true });
}

// "다른 기기에서 로그아웃": every session but this one.
async function endOtherSessions(env, me) {
  const r = await env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?').bind(me.id, me.tokenHash).run();
  return json({ ok: true, endedSessions: r.meta.changes });
}

// Deletes the account and everything under it: backup, photos, proofs, comments, cheers,
// crew memberships (a crew passes to its next member, or goes when it's empty).
// Asks for the password, or for the @handle typed out when the account never set one.
async function deleteAccount(request, env, me) {
  const body = await readJson(request);
  const row = await env.DB.prepare('SELECT pw_hash, pw_salt, pw_iter, pw_set FROM users WHERE id = ?').bind(me.id).first();
  if (!row) throw new HttpError(404, '계정을 찾을 수 없어요');
  if (row.pw_set) {
    const ok = typeof body.password === 'string' && body.password && await checkPassword(body.password, row);
    if (!ok) throw new HttpError(403, '비밀번호가 맞지 않아요');
  } else if (String(body.confirm || '').trim().toLowerCase().replace(/^@/, '') !== me.handle) {
    throw new HttpError(403, '아이디를 정확히 입력해 주세요');
  }

  const { results: crews } = await env.DB.prepare(`
    SELECT c.id, c.owner_id FROM crews c JOIN crew_members m ON m.crew_id = c.id AND m.user_id = ?`).bind(me.id).all();
  for (const c of crews) await removeFromCrew(env, c.id, me.id, c.owner_id);

  const keys = [];
  for (const sql of ['SELECT image_key FROM proofs WHERE user_id = ?', 'SELECT image_key FROM posts WHERE user_id = ?']) {
    const { results } = await env.DB.prepare(sql).bind(me.id).all();
    for (const r of results) keys.push(r.image_key);
  }
  let cursor;
  do {
    const page = await env.IMAGES.list({ prefix: backupKey(me.id, ''), cursor, limit: 1000 });
    for (const o of page.objects) keys.push(o.key);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  const id = me.id;
  await env.DB.batch([
    env.DB.prepare('DELETE FROM proof_comments WHERE user_id = ? OR from_id = ?').bind(id, id),
    env.DB.prepare('DELETE FROM cheers WHERE user_id = ? OR from_id = ?').bind(id, id),
    env.DB.prepare('DELETE FROM proofs WHERE user_id = ?').bind(id),
    env.DB.prepare('DELETE FROM crew_wins WHERE user_id = ?').bind(id),
    env.DB.prepare('DELETE FROM fires WHERE user_id = ? OR post_id IN (SELECT id FROM posts WHERE user_id = ?)').bind(id, id),
    env.DB.prepare('DELETE FROM posts WHERE user_id = ?').bind(id),
    env.DB.prepare('DELETE FROM days WHERE user_id = ?').bind(id),
    env.DB.prepare('DELETE FROM follows WHERE follower_id = ? OR followee_id = ?').bind(id, id),
    env.DB.prepare('DELETE FROM login_fails WHERE handle = ?').bind(me.handle),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id),
    env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id),
  ]);
  for (let i = 0; i < keys.length; i += 1000) await env.IMAGES.delete(keys.slice(i, i + 1000));
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

// ---------- crews ----------

function inviteCode() {
  return [...crypto.getRandomValues(new Uint8Array(6))].map(b => CODE_CHARS[b % CODE_CHARS.length]).join('');
}

const winsOf = async (env, userId) =>
  (await env.DB.prepare('SELECT COUNT(*) AS n FROM crew_wins WHERE user_id = ?').bind(userId).first()).n;

async function requireMember(env, crewId, userId) {
  const row = await env.DB.prepare(`
    SELECT c.id, c.name, c.invite_code, c.owner_id FROM crews c
    JOIN crew_members m ON m.crew_id = c.id AND m.user_id = ? WHERE c.id = ?`).bind(userId, crewId).first();
  if (!row) throw new HttpError(404, '크루를 찾을 수 없어요');
  return row;
}

const crewOut = r => ({ id: r.id, name: r.name, code: r.invite_code, ownerId: r.owner_id, members: r.members });

async function myCrews(env, me) {
  const { results } = await env.DB.prepare(`
    SELECT c.id, c.name, c.invite_code, c.owner_id,
      (SELECT COUNT(*) FROM crew_members x WHERE x.crew_id = c.id) AS members
    FROM crews c JOIN crew_members m ON m.crew_id = c.id
    WHERE m.user_id = ? ORDER BY m.joined_at`).bind(me.id).all();
  return json({ crews: results.map(crewOut), wins: await winsOf(env, me.id) });
}

async function countMyCrews(env, userId) {
  return (await env.DB.prepare('SELECT COUNT(*) AS n FROM crew_members WHERE user_id = ?').bind(userId).first()).n;
}

async function createCrew(request, env, me) {
  const body = await readJson(request);
  const name = cleanText(body.name, 12, '크루 이름');
  if (await countMyCrews(env, me.id) >= CREWS_PER_USER) throw new HttpError(400, `크루는 ${CREWS_PER_USER}개까지 들어갈 수 있어요`);
  const id = crypto.randomUUID();
  const now = Date.now();
  for (let attempt = 0; ; attempt++) {
    const code = inviteCode();
    try {
      await env.DB.batch([
        env.DB.prepare('INSERT INTO crews (id, name, invite_code, owner_id, created_at) VALUES (?, ?, ?, ?, ?)').bind(id, name, code, me.id, now),
        env.DB.prepare('INSERT INTO crew_members (crew_id, user_id, joined_at) VALUES (?, ?, ?)').bind(id, me.id, now),
      ]);
      return json({ crew: { id, name, code, ownerId: me.id, members: 1 } }, 201);
    } catch (e) {
      if (attempt >= 3 || !/UNIQUE/i.test(String(e && e.message))) throw e;
    }
  }
}

async function joinCrew(request, env, me) {
  const body = await readJson(request);
  const code = String(body.code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 6) throw new HttpError(400, '초대 코드는 6자리예요');
  const c = await env.DB.prepare(`
    SELECT c.id, c.name, c.invite_code, c.owner_id,
      (SELECT COUNT(*) FROM crew_members x WHERE x.crew_id = c.id) AS members,
      EXISTS (SELECT 1 FROM crew_members x WHERE x.crew_id = c.id AND x.user_id = ?) AS mine
    FROM crews c WHERE c.invite_code = ?`).bind(me.id, code).first();
  if (!c) throw new HttpError(404, '없는 초대 코드예요');
  if (c.mine) return json({ crew: crewOut(c), already: true });
  if (c.members >= CREW_MAX_MEMBERS) throw new HttpError(400, `크루는 ${CREW_MAX_MEMBERS}명까지예요`);
  if (await countMyCrews(env, me.id) >= CREWS_PER_USER) throw new HttpError(400, `크루는 ${CREWS_PER_USER}개까지 들어갈 수 있어요`);
  await env.DB.prepare('INSERT OR IGNORE INTO crew_members (crew_id, user_id, joined_at) VALUES (?, ?, ?)').bind(c.id, me.id, Date.now()).run();
  return json({ crew: crewOut({ ...c, members: c.members + 1 }) });
}

async function leaveCrew(env, me, crewId) {
  const c = await requireMember(env, crewId, me.id);
  await removeFromCrew(env, crewId, me.id, c.owner_id);
  return json({ ok: true });
}

// The crew passes to its longest-standing member, or is deleted once nobody's left.
async function removeFromCrew(env, crewId, userId, ownerId) {
  await env.DB.prepare('DELETE FROM crew_members WHERE crew_id = ? AND user_id = ?').bind(crewId, userId).run();
  const next = await env.DB.prepare('SELECT user_id FROM crew_members WHERE crew_id = ? ORDER BY joined_at LIMIT 1').bind(crewId).first();
  if (!next) {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM crews WHERE id = ?').bind(crewId),
      env.DB.prepare('DELETE FROM crew_wins WHERE crew_id = ?').bind(crewId),
    ]);
  } else if (ownerId === userId) {
    await env.DB.prepare('UPDATE crews SET owner_id = ? WHERE id = ?').bind(next.user_id, crewId).run();
  }
}

// Dates come from the phone (its own time zone): from–to is this week (Mon–Sun),
// lastFrom–lastTo the week before, whose winners get recorded once it's over.
function weekParam(url, name) {
  const v = url.searchParams.get(name) || '';
  if (!DATE_RE.test(v)) throw new HttpError(400, '날짜 형식이 잘못됐어요');
  return v;
}

async function crewBoard(env, me, crewId, url) {
  const c = await requireMember(env, crewId, me.id);
  const from = weekParam(url, 'from');
  const to = weekParam(url, 'to');
  const lastFrom = weekParam(url, 'lastFrom');
  const lastTo = weekParam(url, 'lastTo');
  const { results: members } = await env.DB.prepare(`
    SELECT u.id, u.handle, u.nickname FROM crew_members m JOIN users u ON u.id = m.user_id
    WHERE m.crew_id = ? ORDER BY m.joined_at`).bind(crewId).all();
  const { results: rows } = await env.DB.prepare(`
    SELECT p.user_id, p.date, p.image_key, p.parts,
      (SELECT COUNT(*) FROM cheers h WHERE h.user_id = p.user_id AND h.date = p.date) AS fires,
      EXISTS (SELECT 1 FROM cheers h WHERE h.user_id = p.user_id AND h.date = p.date AND h.from_id = ?) AS fired,
      (SELECT COUNT(*) FROM proof_comments c WHERE c.user_id = p.user_id AND c.date = p.date) AS comments
    FROM proofs p JOIN crew_members m ON m.user_id = p.user_id AND m.crew_id = ?
    WHERE p.date BETWEEN ? AND ?`).bind(me.id, crewId, lastFrom, to).all();

  // Last week's winners: most proven days (at least 1), ties all win, 2+ members.
  const last = {};
  for (const r of rows) if (r.date >= lastFrom && r.date <= lastTo) last[r.user_id] = (last[r.user_id] || 0) + 1;
  const best = Math.max(0, ...Object.values(last));
  const winners = best > 0 && members.length >= 2 ? members.filter(u => last[u.id] === best) : [];
  if (winners.length) {
    await env.DB.batch(winners.map(u =>
      env.DB.prepare('INSERT OR IGNORE INTO crew_wins (crew_id, week, user_id) VALUES (?, ?, ?)').bind(crewId, lastFrom, u.id)));
  }

  const proofs = rows.filter(r => r.date >= from && r.date <= to).map(r => ({
    userId: r.user_id, date: r.date, image: `/img/${r.image_key}`, parts: JSON.parse(r.parts),
    fires: r.fires, fired: Boolean(r.fired), comments: r.comments,
  }));
  return json({
    crew: crewOut({ ...c, members: members.length }),
    members: members.map(u => ({ id: u.id, handle: u.handle, isMe: u.id === me.id })),
    proofs,
    lastWeek: { best, winners: winners.map(u => u.handle) },
    wins: await winsOf(env, me.id),
  });
}

// A proof is for a day of this week by the phone's calendar: the app only sends one when
// the photo's own taken-date (EXIF) is that day, so a forgotten day can still count.
// Up to 8 days back (a week, plus time zones), at most a day and a half ahead.
function checkProofDate(date) {
  const t = Date.parse(`${date}T12:00:00Z`);
  const now = Date.now();
  if (Number.isNaN(t) || t > now + 36 * 3600 * 1000 || t < now - 8 * 24 * 3600 * 1000) {
    throw new HttpError(400, '이번 주에 찍은 사진만 인증할 수 있어요');
  }
}

async function putProof(request, env, me, date) {
  checkProofDate(date);
  const length = Number(request.headers.get('Content-Length') || 0);
  if (length > MAX_IMAGE_BYTES + 64 * 1024) throw new HttpError(413, '사진이 너무 커요');
  let form;
  try {
    form = await request.formData();
  } catch (e) {
    throw new HttpError(400, '요청 형식이 잘못됐어요');
  }
  const image = form.get('image');
  let parts;
  try {
    parts = cleanParts(JSON.parse(String(form.get('parts') || '[]')));
  } catch (e) {
    throw new HttpError(400, '부위 형식이 잘못됐어요');
  }
  if (!image || typeof image === 'string' || image.type !== 'image/jpeg') throw new HttpError(400, 'JPEG 사진만 올릴 수 있어요');
  if (image.size > MAX_IMAGE_BYTES) throw new HttpError(413, '사진이 너무 커요');
  const old = await env.DB.prepare('SELECT image_key FROM proofs WHERE user_id = ? AND date = ?').bind(me.id, date).first();
  const key = crypto.randomUUID();
  await env.IMAGES.put(key, image, { httpMetadata: { contentType: 'image/jpeg' } });
  await env.DB.prepare(`
    INSERT INTO proofs (user_id, date, image_key, parts, created_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (user_id, date) DO UPDATE SET image_key = excluded.image_key, parts = excluded.parts, created_at = excluded.created_at`)
    .bind(me.id, date, key, JSON.stringify(parts), Date.now()).run();
  if (old) await env.IMAGES.delete(old.image_key);
  return json({ proof: { userId: me.id, date, image: `/img/${key}`, parts, fires: 0, fired: false, comments: 0 } });
}

async function deleteProof(env, me, date) {
  const old = await env.DB.prepare('SELECT image_key FROM proofs WHERE user_id = ? AND date = ?').bind(me.id, date).first();
  if (!old) return json({ ok: true });
  await env.DB.batch([
    env.DB.prepare('DELETE FROM proofs WHERE user_id = ? AND date = ?').bind(me.id, date),
    env.DB.prepare('DELETE FROM cheers WHERE user_id = ? AND date = ?').bind(me.id, date),
    env.DB.prepare('DELETE FROM proof_comments WHERE user_id = ? AND date = ?').bind(me.id, date),
  ]);
  await env.IMAGES.delete(old.image_key);
  return json({ ok: true });
}

// The proof exists and the viewer is its owner or shares a crew with them.
async function requireVisibleProof(env, me, userId, date) {
  const shared = userId === me.id || await env.DB.prepare(`
    SELECT 1 FROM crew_members a JOIN crew_members b ON a.crew_id = b.crew_id
    WHERE a.user_id = ? AND b.user_id = ? LIMIT 1`).bind(me.id, userId).first();
  const proof = shared && await env.DB.prepare('SELECT 1 FROM proofs WHERE user_id = ? AND date = ?').bind(userId, date).first();
  if (!proof) throw new HttpError(404, '인증을 찾을 수 없어요');
}

async function toggleCheer(env, me, userId, date) {
  if (userId === me.id) throw new HttpError(400, '내 인증에는 응원할 수 없어요');
  await requireVisibleProof(env, me, userId, date);
  const del = await env.DB.prepare('DELETE FROM cheers WHERE user_id = ? AND date = ? AND from_id = ?').bind(userId, date, me.id).run();
  const fired = del.meta.changes === 0;
  if (fired) await env.DB.prepare('INSERT INTO cheers (user_id, date, from_id) VALUES (?, ?, ?)').bind(userId, date, me.id).run();
  const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM cheers WHERE user_id = ? AND date = ?').bind(userId, date).first();
  return json({ fired, fires: n });
}

const COMMENT_MAX = 200;

async function listComments(env, me, userId, date) {
  await requireVisibleProof(env, me, userId, date);
  const { results } = await env.DB.prepare(`
    SELECT c.id, c.body, c.created_at, u.id AS from_id, u.handle FROM proof_comments c JOIN users u ON u.id = c.from_id
    WHERE c.user_id = ? AND c.date = ? ORDER BY c.created_at LIMIT 200`).bind(userId, date).all();
  return json({
    comments: results.map(r => ({
      id: r.id, body: r.body, createdAt: r.created_at, from: { id: r.from_id, handle: r.handle },
      canDelete: r.from_id === me.id || userId === me.id,
    })),
  });
}

async function addComment(request, env, me, userId, date) {
  await requireVisibleProof(env, me, userId, date);
  const body = cleanText((await readJson(request)).body, COMMENT_MAX, '댓글');
  const id = crypto.randomUUID();
  const now = Date.now();
  await env.DB.prepare('INSERT INTO proof_comments (id, user_id, date, from_id, body, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, userId, date, me.id, body, now).run();
  return json({ comment: { id, body, createdAt: now, from: { id: me.id, handle: me.handle }, canDelete: true } }, 201);
}

async function deleteComment(env, me, id) {
  const c = await env.DB.prepare('SELECT from_id, user_id FROM proof_comments WHERE id = ?').bind(id).first();
  if (!c || (c.from_id !== me.id && c.user_id !== me.id)) throw new HttpError(404, '댓글을 찾을 수 없어요');
  await env.DB.prepare('DELETE FROM proof_comments WHERE id = ?').bind(id).run();
  return json({ ok: true });
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

// Proof photos: only for the owner and people who share a crew with them, checked on
// every request (a copied link is useless without a login in that crew). The old feed's
// photos: only their owner.
async function getImage(env, me, key) {
  const proof = await env.DB.prepare('SELECT user_id, date FROM proofs WHERE image_key = ?').bind(key).first();
  if (proof) {
    await requireVisibleProof(env, me, proof.user_id, proof.date);
  } else {
    const post = await env.DB.prepare('SELECT 1 FROM posts WHERE image_key = ? AND user_id = ?').bind(key, me.id).first();
    if (!post) throw new HttpError(404, '사진이 없어요');
  }
  const obj = await env.IMAGES.get(key);
  if (!obj) throw new HttpError(404, '사진이 없어요');
  // A key never changes its photo, so the app may keep it; nothing shared may.
  return new Response(obj.body, {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=86400' },
  });
}
