(() => {
  'use strict';

  // ---------- constants ----------
  const STORE_KEY = 'gymcheck:v1';
  const DEFAULT_PARTS = [
    { id: 'chest', name: '가슴', color: '#FF5D5D' },
    { id: 'back', name: '등', color: '#4F9BFF' },
    { id: 'legs', name: '하체', color: '#3DDC97' },
    { id: 'arms', name: '팔', color: '#FF9F43' },
    { id: 'shoulders', name: '어깨', color: '#A78BFA' },
    { id: 'abs', name: '복근', color: '#FFD43B' },
    { id: 'cardio', name: '유산소', color: '#38D9F5' },
  ];
  const PART_EN = { chest: 'CHEST', back: 'BACK', legs: 'LEGS', arms: 'ARMS', shoulders: 'SHOULDERS', abs: 'ABS', cardio: 'CARDIO' };
  // How each part reads in "___ DAY" on the 오운완 photo.
  const DAY_EN = { chest: 'CHEST', back: 'BACK', legs: 'LEG', arms: 'ARM', shoulders: 'SHOULDER', abs: 'ABS', cardio: 'CARDIO' };
  const VOLT = '#D4FF3F';
  const BUILTIN_IDS = new Set(DEFAULT_PARTS.map(p => p.id));
  const CUSTOM_COLORS = ['#F472B6', '#818CF8', '#A3E635', '#2DD4BF', '#FB7185', '#94A3B8', '#E879F9', '#C08457'];
  const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
  const WEEKDAYS_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const MAX_NAME = 8;
  const STALE_DAYS = 7;
  // Bump together with version.json on every release so phones notice the update.
  const APP_VERSION = '2.0.0';
  const CACHE_PREFIX = 'gym-check';

  const svg = (d, w = 2.4) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  const ICON = {
    check: svg('M5 12.5l4.5 4.5L19 7.5', 3.2),
    prev: svg('M15 5l-7 7 7 7'),
    next: svg('M9 5l7 7-7 7'),
    chart: svg('M5 20v-7M12 20V5M19 20v-10', 2.2),
    refresh: svg('M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7', 2.2),
    search: svg('M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20.5 20.5l-4.6-4.6', 2.2),
    camera: svg('M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.4-2h5l1.4 2h1.6A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5zM12 15.6a3.1 3.1 0 1 0 0-6.2 3.1 3.1 0 0 0 0 6.2z', 2.1),
  };

  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

  // ---------- dates (all local time) ----------
  const pad = n => String(n).padStart(2, '0');
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const daysBetween = (a, b) => Math.round((b - a) / 86400000);
  const daysInYear = y => (new Date(y, 1, 29).getDate() === 29 ? 366 : 365);
  const startOfWeek = d => addDays(d, -((d.getDay() + 6) % 7)); // 월요일 시작
  const firstOfMonth = d => new Date(d.getFullYear(), d.getMonth(), 1);
  const fmtKicker = d => `${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${WEEKDAYS_EN[d.getDay()]}`;
  const fmtLong = d => `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`;
  const fmtDot = d => `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;

  // ---------- state ----------
  function defaultState() {
    return { version: 1, parts: DEFAULT_PARTS.map(p => ({ ...p })), records: {}, weeklyGoal: 4, lastBackup: null, photoFormat: 'orig', social: null };
  }

  // Validates anything that comes from storage or a backup file.
  function normalize(src) {
    if (!src || typeof src !== 'object' || !src.records || typeof src.records !== 'object') {
      throw new Error('헬스 체크 백업 파일이 아니에요');
    }
    const out = defaultState();

    if (Array.isArray(src.parts)) {
      const seen = new Set();
      const parts = [];
      for (const p of src.parts) {
        if (!p || typeof p.id !== 'string' || typeof p.name !== 'string' || seen.has(p.id)) continue;
        seen.add(p.id);
        const def = DEFAULT_PARTS.find(d => d.id === p.id);
        parts.push({
          id: p.id,
          name: def ? def.name : (p.name.trim().slice(0, MAX_NAME) || '부위'),
          color: def ? def.color : (/^#[0-9a-f]{6}$/i.test(p.color) ? p.color : '#94A3B8'),
        });
      }
      DEFAULT_PARTS.forEach((d, i) => {
        if (!seen.has(d.id)) parts.splice(Math.min(i, parts.length), 0, { ...d });
      });
      out.parts = parts;
    }

    const order = out.parts.map(p => p.id);
    for (const [k, v] of Object.entries(src.records)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !Array.isArray(v)) continue;
      const set = new Set(v);
      const arr = order.filter(id => set.has(id));
      if (arr.length) out.records[k] = arr;
    }

    if (Number.isInteger(src.weeklyGoal) && src.weeklyGoal >= 1 && src.weeklyGoal <= 7) out.weeklyGoal = src.weeklyGoal;
    if (src.photoFormat === 'orig' || src.photoFormat === 'story') out.photoFormat = src.photoFormat;
    const so = src.social;
    if (so && typeof so.token === 'string' && so.token.length <= 100 && typeof so.userId === 'string'
      && typeof so.handle === 'string' && typeof so.nickname === 'string') {
      out.social = {
        token: so.token,
        userId: so.userId,
        handle: so.handle.slice(0, 20),
        nickname: so.nickname.slice(0, 12),
        autoPost: so.autoPost !== false,
      };
    }
    if (typeof src.lastBackup === 'string' && !Number.isNaN(Date.parse(src.lastBackup))) out.lastBackup = src.lastBackup;
    return out;
  }

  function load() {
    let raw = null;
    try { raw = localStorage.getItem(STORE_KEY); } catch (e) { return defaultState(); }
    if (!raw) return defaultState();
    try {
      return normalize(JSON.parse(raw));
    } catch (e) {
      // Keep the unreadable copy instead of silently overwriting it.
      try { localStorage.setItem(`${STORE_KEY}:broken`, raw); } catch (_) { /* ignore */ }
      return defaultState();
    }
  }

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      toast('저장하지 못했어요. 저장 공간을 확인해 주세요');
      return false;
    }
  }

  let state = load();
  const ui = {
    tab: 'today',
    calMonth: firstOfMonth(today()),
    statsYear: today().getFullYear(),
    sheetDate: null,
    newColor: null,
    popId: null,
    latestVersion: null,
    updating: false,
    pwForm: false, // settings: the change-password form is open
  };

  // ---------- queries ----------
  const partById = id => state.parts.find(p => p.id === id);
  const dayParts = key => state.records[key] || [];
  const attended = key => dayParts(key).length > 0;

  function lastDoneMap(uptoKey) {
    const m = {};
    for (const [k, arr] of Object.entries(state.records)) {
      if (k > uptoKey) continue;
      for (const id of arr) if (!m[id] || k > m[id]) m[id] = k;
    }
    return m;
  }

  // Consecutive attended days, ending today (or yesterday if today isn't checked yet).
  function streak(t) {
    let d = attended(keyOf(t)) ? t : addDays(t, -1);
    let n = 0;
    while (attended(keyOf(d))) { n++; d = addDays(d, -1); }
    return n;
  }

  function weekCount(t) {
    let n = 0;
    for (let d = startOfWeek(t); d <= t; d = addDays(d, 1)) if (attended(keyOf(d))) n++;
    return n;
  }

  function yearStats(y) {
    const months = Array(12).fill(0);
    const parts = {};
    let days = 0;
    const prefix = `${y}-`;
    for (const [k, arr] of Object.entries(state.records)) {
      if (!k.startsWith(prefix) || !arr.length) continue;
      days++;
      months[Number(k.slice(5, 7)) - 1]++;
      for (const id of arr) parts[id] = (parts[id] || 0) + 1;
    }
    return { days, months, parts };
  }

  // ---------- mutations ----------
  function toggle(key, id) {
    const cur = new Set(dayParts(key));
    const on = !cur.has(id);
    if (on) cur.add(id); else cur.delete(id);
    const arr = state.parts.map(p => p.id).filter(x => cur.has(x));
    if (arr.length) state.records[key] = arr; else delete state.records[key];
    save();
    queueDaySync(key);
    if (on && navigator.vibrate) navigator.vibrate(8);
    return on;
  }

  function nextColor() {
    const used = new Set(state.parts.map(p => p.color.toUpperCase()));
    return CUSTOM_COLORS.find(c => !used.has(c)) || CUSTOM_COLORS[state.parts.length % CUSTOM_COLORS.length];
  }

  function addPart() {
    const input = $('#new-part');
    const name = input.value.trim().slice(0, MAX_NAME);
    if (!name) { input.focus(); return; }
    if (state.parts.some(p => p.name === name)) { toast('이미 있는 부위예요'); return; }
    state.parts.push({ id: `c_${Date.now().toString(36)}`, name, color: ui.newColor || nextColor() });
    ui.newColor = null;
    save();
    renderCurrent();
    toast(`'${name}' 추가했어요`);
  }

  function deletePart(id) {
    const p = partById(id);
    if (!p || BUILTIN_IDS.has(id)) return;
    const uses = Object.values(state.records).filter(a => a.includes(id)).length;
    const msg = `'${p.name}' 부위를 지울까요?` + (uses ? `\n이 부위 기록 ${uses}회도 같이 지워져요.` : '');
    if (!confirm(msg)) return;
    state.parts = state.parts.filter(x => x.id !== id);
    for (const [k, a] of Object.entries(state.records)) {
      const rest = a.filter(x => x !== id);
      if (rest.length) state.records[k] = rest; else delete state.records[k];
    }
    save();
    renderCurrent();
    toast(`'${p.name}' 지웠어요`);
  }

  function setGoal(delta) {
    const g = Math.min(7, Math.max(1, state.weeklyGoal + delta));
    if (g === state.weeklyGoal) return;
    state.weeklyGoal = g;
    save();
    renderCurrent();
  }

  // ---------- backup ----------
  // The backup file carries records and every saved 오운완 photo (as data URLs).
  // Building it is async, and iOS only opens the share sheet straight from a tap,
  // so it's two steps: "내보내기" prepares the file, "저장하기" shares it.
  let exportFile = null;
  let exportInfo = null;
  let exporting = false;

  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  }

  const fmtSize = bytes => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)}MB` : `${Math.max(1, Math.round(bytes / 1024))}KB`);

  async function prepareExport() {
    if (exporting) return;
    exporting = true;
    exportFile = null;
    renderCurrent();
    toast('백업 파일 만드는 중…');
    try {
      const photos = {};
      if ('indexedDB' in window) {
        for (const key of await photoStore.keys()) {
          const blob = await photoStore.full(key);
          if (blob) photos[key] = await blobToDataURL(blob);
        }
      }
      const payload = JSON.stringify({ app: 'gym-check', format: 2, exportedAt: new Date().toISOString(), ...state, photos });
      exportFile = new File([payload], `gym-check-backup-${keyOf(today())}.json`, { type: 'application/json' });
      exportInfo = { photos: Object.keys(photos).length, size: exportFile.size };
      toast('준비됐어요. 저장하기를 눌러 주세요');
    } catch (e) {
      toast('백업 파일을 만들지 못했어요');
    }
    exporting = false;
    renderCurrent();
  }

  async function shareExport() {
    if (!exportFile) return;
    if (!(await shareOrDownload(exportFile))) return; // cancelled: keep the file for another try
    exportFile = null;
    exportInfo = null;
    state.lastBackup = new Date().toISOString();
    save();
    renderCurrent();
    toast('백업 파일을 저장했어요');
  }

  function exportButton(primary = false) {
    if (exportFile) return '<button class="btn primary" data-action="export-share">저장하기</button>';
    return `<button class="btn${primary ? ' primary' : ''}" data-action="export"${exporting ? ' disabled' : ''}>${exporting ? '만드는 중…' : '내보내기'}</button>`;
  }

  async function importData(file) {
    let parsed;
    let next;
    try {
      parsed = JSON.parse(await file.text());
      next = normalize(parsed);
    } catch (e) {
      toast(e instanceof SyntaxError ? '파일을 읽을 수 없어요' : e.message);
      return;
    }
    const photos = parsed.photos && typeof parsed.photos === 'object'
      ? Object.entries(parsed.photos).filter(([k, v]) => /^\d{4}-\d{2}-\d{2}$/.test(k) && typeof v === 'string' && v.startsWith('data:image/'))
      : [];
    // A backup made before signing up has no login: keep the one this phone has.
    if (!next.social && state.social) next.social = state.social;
    const switchesAccount = next.social && (!state.social || next.social.userId !== state.social.userId);
    const days = Object.keys(next.records).length;
    const nowDays = Object.keys(state.records).length;
    const msg = `백업 파일: 출석 기록 ${days}일${photos.length ? `, 사진 ${photos.length}장` : ''}\n`
      + `지금 기록(${nowDays}일)을 이 파일 내용으로 바꿀까요?`
      + (photos.length ? '\n사진은 지금 있는 사진에 더해지고, 같은 날짜는 파일 사진으로 바뀌어요.' : '')
      + (switchesAccount ? `\n피드는 @${next.social.handle} 계정으로 로그인돼요.` : '');
    if (!confirm(msg)) return;
    state = next;
    save();
    ui.statsYear = today().getFullYear();
    renderCurrent();

    let ok = 0;
    for (const [key, url] of photos) {
      try {
        const blob = await (await fetch(url)).blob();
        await storeDayPhoto(key, blob);
        ok++;
      } catch (e) { /* skip a broken photo */ }
      if (photos.length > 2) toast(`사진 가져오는 중… ${ok}/${photos.length}`);
    }
    renderCurrent();
    toast(`기록 ${days}일${photos.length ? `, 사진 ${ok}장` : ''}을 가져왔어요`);
  }

  function downloadFile(file) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  // ---------- 오운완 photo ----------
  // "CHEST DAY", "CHEST & BACK DAY", "CHEST · BACK · ARM DAY"; custom parts use their own name.
  function photoHeadline(parts) {
    if (!parts.length) return 'WORKOUT DONE';
    if (parts.length > 4) return 'FULL BODY DAY';
    const words = parts.map(p => DAY_EN[p.id] || p.name);
    return `${words.join(parts.length === 2 ? ' & ' : ' · ')} DAY`;
  }

  async function loadImage(file) {
    if ('createImageBitmap' in window) {
      try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { /* fall back */ }
    }
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  // Canvas text needs the web fonts loaded first; give up after a moment (offline) and use fallbacks.
  async function ensurePhotoFonts(text) {
    if (!document.fonts || !document.fonts.load) return;
    const loads = [
      document.fonts.load('italic 900 100px "Barlow Condensed"', text),
      document.fonts.load('italic 800 100px "Barlow Condensed"', text),
      document.fonts.load('800 40px "Pretendard Variable"', text),
      document.fonts.load('600 40px "Pretendard Variable"', text),
    ];
    await Promise.race([Promise.all(loads).catch(() => {}), new Promise(r => setTimeout(r, 2500))]);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Largest size (up to maxSize) at which the headline fits; splits onto two lines if it must.
  function fitHeadline(ctx, text, maxW, maxSize, minSize) {
    const font = s => `italic 900 ${s}px "Barlow Condensed", "Pretendard Variable", sans-serif`;
    const fits = (lines, s) => { ctx.font = font(s); return lines.every(l => ctx.measureText(l).width <= maxW); };
    const step = maxSize * 0.04;
    for (let s = maxSize; s >= minSize; s -= step) if (fits([text], s)) return { size: s, lines: [text] };

    const words = text.split(' ');
    let lines = [text];
    let best = Infinity;
    ctx.font = font(maxSize);
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ');
      const b = words.slice(i).join(' ');
      const w = Math.max(ctx.measureText(a).width, ctx.measureText(b).width);
      if (w < best) { best = w; lines = [a, b]; }
    }
    for (let s = maxSize; s >= minSize * 0.6; s -= step) if (fits(lines, s)) return { size: s, lines };
    return { size: minSize * 0.6, lines };
  }

  // ---- selfie detection ----
  // iOS shows the front camera mirrored while shooting but saves the photo un-mirrored,
  // so selfies look flipped. iPhone photos name the lens in EXIF ("... front camera ..."),
  // which lets us flip those back automatically. Best effort: any parse problem → false.
  async function isUnmirroredSelfie(file) {
    try {
      const v = new DataView(await file.slice(0, 256 * 1024).arrayBuffer());
      if (v.getUint16(0) !== 0xFFD8) return false; // not a JPEG
      let off = 2;
      while (off + 10 <= v.byteLength) {
        const marker = v.getUint16(off);
        if ((marker & 0xFF00) !== 0xFF00 || marker === 0xFFDA) return false; // scan data: no EXIF
        if (marker === 0xFFE1 && v.getUint32(off + 4) === 0x45786966) { // APP1 "Exif"
          const { lens, orientation } = readExif(v, off + 10);
          const alreadyMirrored = [2, 4, 5, 7].includes(orientation);
          return /front/i.test(lens) && !alreadyMirrored;
        }
        off += 2 + v.getUint16(off + 2);
      }
    } catch (e) { /* unreadable EXIF */ }
    return false;
  }

  function readExif(v, tiff) {
    const little = v.getUint16(tiff) === 0x4949;
    const u16 = o => v.getUint16(tiff + o, little);
    const u32 = o => v.getUint32(tiff + o, little);
    const entry = (ifd, tag) => {
      const n = u16(ifd);
      for (let i = 0; i < n; i++) if (u16(ifd + 2 + i * 12) === tag) return ifd + 2 + i * 12;
      return -1;
    };
    const ifd0 = u32(4);
    const o = entry(ifd0, 0x0112);
    const orientation = o < 0 ? 1 : u16(o + 8);
    let lens = '';
    const exifPtr = entry(ifd0, 0x8769);
    if (exifPtr >= 0) {
      const l = entry(u32(exifPtr + 8), 0xA434); // LensModel
      if (l >= 0) {
        const count = u32(l + 4);
        const start = count > 4 ? u32(l + 8) : l + 8;
        for (let i = 0; i < count - 1 && i < 120; i++) lens += String.fromCharCode(v.getUint8(tiff + start + i));
      }
    }
    return { lens, orientation };
  }

  // Puts the photo in the frame. Story frames (9:16) take portrait photos edge to edge;
  // wider photos sit full-width over a blurred, darkened copy of themselves.
  function drawPhotoFrame(ctx, src, W, H, flip, story) {
    const pw = src.width;
    const ph = src.height;
    const cover = (dx, dy, dw, dh) => {
      const s = Math.max(dw / pw, dh / ph);
      ctx.drawImage(src, dx + (dw - pw * s) / 2, dy + (dh - ph * s) / 2, pw * s, ph * s);
    };
    ctx.save();
    if (flip) { ctx.translate(W, 0); ctx.scale(-1, 1); }
    if (!story) {
      ctx.drawImage(src, 0, 0, W, H);
    } else if (pw / ph <= 0.8) {
      cover(0, 0, W, H);
    } else {
      ctx.filter = 'blur(40px)';
      cover(-80, -80, W + 160, H + 160);
      ctx.filter = 'none';
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.fillRect(0, 0, W, H);
      const h = W * ph / pw;
      ctx.drawImage(src, 0, (H - h) / 2, W, h);
    }
    ctx.restore();
  }

  async function composePhoto(src, flip, format) {
    const story = format === 'story';
    const t = photoKey ? parseKey(photoKey) : today();
    const tk = keyOf(t);
    const done = new Set(dayParts(tk));
    const parts = state.parts.filter(p => done.has(p.id));
    const headline = photoHeadline(parts);
    const dateLine = `${t.getFullYear()}.${pad(t.getMonth() + 1)}.${pad(t.getDate())} ${WEEKDAYS_EN[t.getDay()]}`;
    // Gym days this year up to and including the photo's date, e.g. "30/365".
    const yearPrefix = `${t.getFullYear()}-`;
    const yearCount = Object.entries(state.records).filter(([k, a]) => k.startsWith(yearPrefix) && k <= tk && a.length).length;
    const badgeText = `${yearCount}/${daysInYear(t.getFullYear())}`;
    const KR = '"Pretendard Variable", sans-serif';

    await ensurePhotoFonts(headline + dateLine + badgeText);

    let W = 1080;
    let H = 1920;
    if (!story) {
      const scale = Math.min(1, 1600 / Math.max(src.width, src.height));
      W = Math.round(src.width * scale);
      H = Math.round(src.height * scale);
    }
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    drawPhotoFrame(ctx, src, W, H, flip, story);

    const u = Math.min(W, H) / 100;
    const m = 6 * u; // side margin
    // Instagram lays its own UI over the top and bottom of a story; keep clear of it.
    const top = story ? Math.round(H * 0.11) : m;
    const bottom = story ? Math.round(H * 0.13) : m;

    // Darken top and bottom so the text reads on any photo.
    let g = ctx.createLinearGradient(0, H * 0.45, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,.75)');
    ctx.fillStyle = g;
    ctx.fillRect(0, H * 0.45, W, H * 0.55);
    const topShade = Math.max(H * 0.2, top + 22 * u);
    g = ctx.createLinearGradient(0, 0, 0, topShade);
    g.addColorStop(0, 'rgba(0,0,0,.45)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, topShade);

    // Top left: date.
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,.35)';
    ctx.shadowBlur = 2 * u;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `italic 800 ${5.6 * u}px "Barlow Condensed", sans-serif`;
    const badgeH = 7.6 * u;
    const rowY = top + badgeH / 2;
    ctx.fillText(dateLine, m, rowY);

    // Top right: this year's count, "30/365".
    ctx.shadowBlur = 0;
    ctx.font = `italic 800 ${5.4 * u}px "Barlow Condensed", ${KR}`;
    const badgeW = ctx.measureText(badgeText).width + 5.6 * u;
    roundRect(ctx, W - m - badgeW, top, badgeW, badgeH, badgeH / 2);
    ctx.fillStyle = VOLT;
    ctx.fill();
    ctx.fillStyle = '#0A0A0B';
    ctx.textAlign = 'center';
    ctx.fillText(badgeText, W - m - badgeW / 2, rowY + 0.3 * u);
    ctx.textAlign = 'left';

    const textMaxW = W - m * 2;

    // Bottom left: the headline.
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,.35)';
    ctx.shadowBlur = 2 * u;
    let y = H - bottom;
    const { size, lines } = fitHeadline(ctx, headline, textMaxW, 17 * u, 9 * u);
    ctx.font = `italic 900 ${size}px "Barlow Condensed", ${KR}`;
    ctx.fillStyle = VOLT;
    for (let i = lines.length - 1; i >= 0; i--) {
      ctx.fillText(lines[i], m, y);
      y -= size * 0.9;
    }

    return canvasToJpeg(canvas);
  }

  function canvasToJpeg(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.92);
    });
  }

  // ---- monthly recap card (1080×1920, story size) ----
  const MONTH_EN = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

  function monthSummary(y, mo) {
    const t = today();
    const tk = keyOf(t);
    const dim = new Date(y, mo + 1, 0).getDate();
    const keys = Array.from({ length: dim }, (_, i) => keyOf(new Date(y, mo, i + 1)));
    const counts = {};
    let days = 0;
    let run = 0;
    let best = 0;
    for (const k of keys) {
      if (k > tk) break;
      const arr = dayParts(k);
      if (arr.length) {
        days++;
        run++;
        best = Math.max(best, run);
        for (const id of arr) counts[id] = (counts[id] || 0) + 1;
      } else {
        run = 0;
      }
    }
    const isCur = y === t.getFullYear() && mo === t.getMonth();
    const elapsed = isCur ? t.getDate() : dim;
    const top = state.parts
      .map(p => ({ p, n: counts[p.id] || 0 }))
      .sort((a, b) => b.n - a.n)[0];
    return { keys, dim, days, best, rate: pct(days, elapsed), top: top && top.n ? top : null, tk };
  }

  async function composeRecap(y, mo) {
    const W = 1080;
    const H = 1920;
    const P = 90;
    const KR = '"Pretendard Variable", sans-serif';
    const s = monthSummary(y, mo);
    const topText = s.top ? `${s.top.p.name} ${s.top.n}회` : '-';
    const kicker = `${MONTH_EN[mo]} ${y} · RECAP`;

    const thumbs = new Map();
    await Promise.all(s.keys.filter(k => photoThumbs.has(k)).map(async k => {
      const img = new Image();
      img.src = photoThumbs.get(k);
      try { await img.decode(); thumbs.set(k, img); } catch (e) { /* skip */ }
    }));
    await ensurePhotoFonts(`${kicker}${mo + 1}월 결산헬스장 간 날출석률최장 연속최다 부위${topText}월화수목금토일GYM CHECK0123456789/%일`);

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0A0A0B';
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W * 0.15, H * 0.2, 0, W * 0.15, H * 0.2, W);
    glow.addColorStop(0, 'rgba(212,255,63,.14)');
    glow.addColorStop(1, 'rgba(212,255,63,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = VOLT;
    ctx.font = `700 40px "Barlow Condensed", ${KR}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '6px';
    ctx.fillText(kicker, P, 200);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.fillStyle = '#F4F4F0';
    ctx.font = `800 84px ${KR}`;
    ctx.fillText(`${mo + 1}월 결산`, P, 300);

    // Big number: days at the gym this month.
    ctx.fillStyle = VOLT;
    ctx.font = `italic 900 330px "Barlow Condensed", ${KR}`;
    const num = String(s.days);
    ctx.fillText(num, P - 8, 610);
    const nw = ctx.measureText(num).width;
    ctx.fillStyle = '#8E8E94';
    ctx.font = `italic 800 92px "Barlow Condensed", ${KR}`;
    ctx.fillText(`/${s.dim}`, P + nw + 4, 610);
    ctx.font = `600 40px ${KR}`;
    ctx.fillText('헬스장 간 날', P, 675);

    // Three stats.
    const stats = [['출석률', `${s.rate}%`], ['최장 연속', `${s.best}일`], ['최다 부위', topText]];
    const colW = (W - P * 2) / 3;
    stats.forEach(([label, value], i) => {
      const x = P + i * colW;
      ctx.fillStyle = '#8E8E94';
      ctx.font = `600 32px ${KR}`;
      ctx.fillText(label, x, 760);
      ctx.fillStyle = '#F4F4F0';
      let size = 64;
      ctx.font = `italic 800 ${size}px "Barlow Condensed", ${KR}`;
      while (ctx.measureText(value).width > colW - 24 && size > 36) {
        size -= 2;
        ctx.font = `italic 800 ${size}px "Barlow Condensed", ${KR}`;
      }
      ctx.fillText(value, x, 832);
    });
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.fillRect(P, 880, W - P * 2, 2);

    // Month calendar: gym days in lime, days with a saved 오운완 photo show the photo.
    const cell = (W - P * 2) / 7;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8E8E94';
    ctx.font = `600 30px ${KR}`;
    '월화수목금토일'.split('').forEach((d, i) => ctx.fillText(d, P + cell * i + cell / 2, 950));
    const lead = (new Date(y, mo, 1).getDay() + 6) % 7;
    const rowH = 112;
    const r = 46;
    ctx.textBaseline = 'middle';
    s.keys.forEach((k, i) => {
      const pos = lead + i;
      const cx = P + (pos % 7) * cell + cell / 2;
      const cy = 1030 + Math.floor(pos / 7) * rowH;
      const on = attended(k);
      const img = thumbs.get(k);
      if (img) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
        ctx.restore();
        ctx.strokeStyle = VOLT;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
        ctx.stroke();
      } else if (on) {
        ctx.fillStyle = VOLT;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0A0A0B';
        ctx.font = `italic 800 38px "Barlow Condensed", ${KR}`;
        ctx.fillText(String(i + 1), cx, cy + 2);
      } else {
        ctx.fillStyle = k > s.tk ? '#2B2B2F' : '#55555B';
        ctx.font = `italic 700 36px "Barlow Condensed", ${KR}`;
        ctx.fillText(String(i + 1), cx, cy + 2);
      }
    });

    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#55555B';
    ctx.font = `700 30px "Barlow Condensed", ${KR}`;
    ctx.fillText('GYM CHECK', W / 2, 1790);
    ctx.textAlign = 'left';

    return canvasToJpeg(canvas);
  }

  const photoEditor = $('#photo-editor');
  const photoPreview = $('#photo-preview');
  const photoLoading = $('#photo-loading');
  const photoSaveBtn = $('#photo-save');
  let photoSource = null; // the picked photo, kept so a new character can be applied without re-picking
  let photoBlob = null;
  let photoUrl = '';
  let photoSeq = 0;
  let photoFlip = false;
  const photoFlipBtn = $('#photo-flip');

  function setPhotoFlip(on) {
    photoFlip = on;
    photoFlipBtn.setAttribute('aria-pressed', String(on));
  }

  let photoKey = null; // the date the photo belongs to

  function startPhoto(key = keyOf(today())) {
    if (!attended(key)) {
      toast(key === keyOf(today()) ? '오늘 한 운동을 먼저 체크해 주세요' : '그날 한 운동을 먼저 체크해 주세요');
      return;
    }
    photoKey = key;
    $('#photo-input').click();
  }

  function syncFormatButtons() {
    document.querySelectorAll('#photo-format button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.format === state.photoFormat)));
  }

  function pickFormat(format) {
    if (format !== 'orig' && format !== 'story') return;
    state.photoFormat = format;
    save();
    syncFormatButtons();
    renderPhoto();
  }

  // Recap mode reuses the photo screen to preview and share a monthly recap card.
  let recapMode = false;
  let recapFile = null;

  async function openRecap() {
    const y = ui.calMonth.getFullYear();
    const mo = ui.calMonth.getMonth();
    if (!monthSummary(y, mo).days) { toast('이 달은 운동 기록이 없어요'); return; }
    recapMode = true;
    recapFile = null;
    photoEditor.classList.add('recap');
    $('#photo-title').textContent = `${mo + 1}월 결산`;
    photoEditor.hidden = false;
    photoPreview.hidden = true;
    photoLoading.hidden = false;
    photoLoading.textContent = '결산 카드 만드는 중…';
    photoSaveBtn.disabled = true;
    try {
      const blob = await composeRecap(y, mo);
      if (!recapMode) return;
      recapFile = new File([blob], `gym-check-${y}-${pad(mo + 1)}.jpg`, { type: 'image/jpeg' });
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      photoUrl = URL.createObjectURL(blob);
      photoPreview.src = photoUrl;
      await photoPreview.decode().catch(() => {});
      photoPreview.hidden = false;
      photoLoading.hidden = true;
      photoSaveBtn.disabled = false;
    } catch (e) {
      photoLoading.textContent = '결산 카드를 만들지 못했어요';
    }
  }

  function syncPhotoControls() {
    syncFormatButtons();
    syncFeedToggle();
  }

  async function renderPhoto() {
    if (!photoSource) return;
    const seq = ++photoSeq;
    photoSaveBtn.disabled = true;
    if (photoPreview.hidden) {
      photoLoading.hidden = false;
      photoLoading.textContent = '사진 만드는 중…';
    }
    try {
      const blob = await composePhoto(photoSource, photoFlip, state.photoFormat);
      if (seq !== photoSeq) return; // a newer pick is already rendering
      photoBlob = blob;
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      photoUrl = URL.createObjectURL(blob);
      photoPreview.src = photoUrl;
      await photoPreview.decode().catch(() => {});
      photoPreview.hidden = false;
      photoLoading.hidden = true;
      photoSaveBtn.disabled = false;
    } catch (e) {
      if (seq !== photoSeq) return;
      photoPreview.hidden = true;
      photoLoading.hidden = false;
      photoLoading.textContent = '사진을 만들지 못했어요. 다른 사진을 골라 주세요';
    }
  }

  async function openPhoto(file) {
    photoEditor.hidden = false;
    photoPreview.hidden = true;
    photoLoading.hidden = false;
    photoLoading.textContent = '사진 만드는 중…';
    photoSaveBtn.disabled = true;
    syncPhotoControls();
    try {
      const img = await loadImage(file);
      if (photoSource && photoSource.close) photoSource.close();
      photoSource = img;
      setPhotoFlip(await isUnmirroredSelfie(file));
    } catch (e) {
      photoLoading.textContent = '이 사진은 열 수 없어요. 다른 사진을 골라 주세요';
      return;
    }
    await renderPhoto();
  }

  function closePhoto() {
    photoEditor.hidden = true;
    photoEditor.classList.remove('recap');
    recapMode = false;
    recapFile = null;
    setPhotoFlip(false);
    photoSeq++;
    photoPreview.removeAttribute('src');
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    if (photoSource && photoSource.close) photoSource.close();
    photoSource = null;
    photoUrl = '';
    photoBlob = null;
  }

  async function savePhoto() {
    if (recapMode) {
      if (recapFile) shareOrDownload(recapFile);
      return;
    }
    if (!photoBlob) return;
    const key = photoKey || keyOf(today());
    const blob = photoBlob;
    // Keep it in the app under its date. Runs alongside the share sheet, which has to
    // open straight from the tap.
    const stored = storeDayPhoto(key, blob, photoSource, photoFlip).then(() => true, () => false);
    const posting = loggedIn() && state.social.autoPost !== false ? postToFeed(key, blob).then(() => true, e => e) : null;
    await shareOrDownload(new File([blob], `owoonwan-${key}.jpg`, { type: 'image/jpeg' }));
    const ok = await stored;
    const posted = posting ? await posting : null;
    renderCurrent();
    if (posted && posted !== true) toast(`피드에 못 올렸어요: ${posted.message}`);
    else if (!ok) toast('앱에 저장하지 못했어요. 사진은 앨범에 저장해 두세요');
    else toast(posted ? `${md(key)} 저장하고 피드에 올렸어요` : `${md(key)} 오운완으로 저장했어요`);
  }

  // ---------- 오운완 photo diary ----------
  // Saved photos live in IndexedDB (localStorage is far too small for images), one per
  // date: 'full' holds the finished JPEG, 'thumb' a small square for the calendar.
  const photoStore = (() => {
    let dbp = null;
    const open = () => {
      if (!dbp) {
        dbp = new Promise((resolve, reject) => {
          const req = indexedDB.open('gymcheck-photos', 1);
          req.onupgradeneeded = () => {
            req.result.createObjectStore('full');
            req.result.createObjectStore('thumb');
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        dbp.catch(() => { dbp = null; });
      }
      return dbp;
    };
    const run = async (stores, mode, work) => {
      const db = await open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(stores, mode);
        let out;
        work(tx, v => { out = v; });
        tx.oncomplete = () => resolve(out);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    };
    return {
      put: (key, full, thumb) => run(['full', 'thumb'], 'readwrite', tx => {
        tx.objectStore('full').put(full, key);
        tx.objectStore('thumb').put(thumb, key);
      }),
      full: key => run('full', 'readonly', (tx, done) => {
        const r = tx.objectStore('full').get(key);
        r.onsuccess = () => done(r.result || null);
      }),
      remove: key => run(['full', 'thumb'], 'readwrite', tx => {
        tx.objectStore('full').delete(key);
        tx.objectStore('thumb').delete(key);
      }),
      keys: () => run('full', 'readonly', (tx, done) => {
        const r = tx.objectStore('full').getAllKeys();
        r.onsuccess = () => done(r.result || []);
      }),
      thumbs: () => run('thumb', 'readonly', (tx, done) => {
        const list = [];
        const c = tx.objectStore('thumb').openCursor();
        c.onsuccess = () => {
          const cur = c.result;
          if (cur) { list.push([cur.key, cur.value]); cur.continue(); } else done(list);
        };
      }),
    };
  })();

  const photoThumbs = new Map(); // date key → object URL of its thumbnail
  let sheetPhoto = { key: null, blob: null, url: '' }; // full photo shown in the day sheet

  function setThumb(key, blob) {
    if (photoThumbs.has(key)) URL.revokeObjectURL(photoThumbs.get(key));
    if (blob) photoThumbs.set(key, URL.createObjectURL(blob));
    else photoThumbs.delete(key);
  }

  function clearSheetPhoto() {
    if (sheetPhoto.url) URL.revokeObjectURL(sheetPhoto.url);
    sheetPhoto = { key: null, blob: null, url: '' };
  }

  async function loadSheetPhoto(key) {
    if (sheetPhoto.key === key) return;
    clearSheetPhoto();
    sheetPhoto.key = key;
    try {
      const blob = await photoStore.full(key);
      if (sheetPhoto.key !== key) return;
      sheetPhoto.blob = blob;
      sheetPhoto.url = blob ? URL.createObjectURL(blob) : '';
    } catch (e) { /* show the thumbnail only */ }
    if (ui.sheetDate === key) renderSheet();
  }

  async function loadPhotoThumbs() {
    if (!('indexedDB' in window)) return;
    try {
      for (const [key, blob] of await photoStore.thumbs()) setThumb(key, blob);
      if (photoThumbs.size) renderCurrent();
    } catch (e) { /* nothing saved yet */ }
  }

  // Square crop a bit above centre, where faces usually are. Made from the original
  // photo (no text on it) when we still have it, otherwise from the finished image.
  async function makeThumb(source, flip = false) {
    const own = source instanceof Blob;
    const img = own ? await loadImage(source) : source;
    const s = Math.min(img.width, img.height);
    const c = document.createElement('canvas');
    c.width = c.height = 240;
    const ctx = c.getContext('2d');
    if (flip) { ctx.translate(240, 0); ctx.scale(-1, 1); }
    ctx.drawImage(img, (img.width - s) / 2, (img.height - s) * 0.35, s, s, 0, 0, 240, 240);
    if (own && img.close) img.close();
    return new Promise((resolve, reject) => c.toBlob(b => (b ? resolve(b) : reject(new Error('thumb'))), 'image/jpeg', 0.8));
  }

  async function storeDayPhoto(key, blob, source, flip) {
    const thumb = await makeThumb(source || blob, flip);
    await photoStore.put(key, blob, thumb);
    setThumb(key, thumb);
    if (sheetPhoto.key === key) clearSheetPhoto();
  }

  async function shareOrDownload(file) {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return true;
      } catch (e) {
        if (e && e.name === 'AbortError') return false;
      }
    }
    downloadFile(file);
    return true;
  }

  function shareDayPhoto() {
    const k = ui.sheetDate;
    if (!k || sheetPhoto.key !== k || !sheetPhoto.blob) return;
    shareOrDownload(new File([sheetPhoto.blob], `owoonwan-${k}.jpg`, { type: 'image/jpeg' }));
  }

  async function deleteDayPhoto() {
    const k = ui.sheetDate;
    if (!k) return;
    if (!confirm(`${fmtLong(parseKey(k))} 오운완 사진을 지울까요?\n앨범에 저장해 둔 사진은 그대로예요.`)) return;
    try {
      await photoStore.remove(k);
    } catch (e) {
      toast('사진을 지우지 못했어요');
      return;
    }
    setThumb(k, null);
    clearSheetPhoto();
    renderCurrent();
    toast('사진을 지웠어요');
  }

  const md = key => { const d = parseKey(key); return `${d.getMonth() + 1}월 ${d.getDate()}일`; };

  // ---------- feed (social) ----------
  // Instagram-style: a unique @handle, follow / following, a feed of 오운완 from
  // people you follow, and a "오늘 간 사람" row. The server is a Cloudflare Worker.
  // Accounts are @handle + password; this device keeps a session token in
  // state.social (so a backup also restores the login).
  const LOCAL_API = ['localhost', '127.0.0.1'].includes(location.hostname);
  const API_BASE = LOCAL_API ? 'http://localhost:8787' : 'https://gymchek-api.savetoyou365.workers.dev';
  const AVATAR_COLORS = ['#FF5D5D', '#4F9BFF', '#3DDC97', '#FF9F43', '#A78BFA', '#FFD43B', '#38D9F5', '#F472B6'];
  const HANDLE_RE = /^(?!\.)(?!.*\.$)[a-z0-9._]{3,20}$/;
  const PW_MIN = 6;

  const loggedIn = () => Boolean(state.social && state.social.token);

  async function api(path, { method = 'GET', body, form } = {}) {
    const headers = {};
    if (loggedIn()) headers.Authorization = `Bearer ${state.social.token}`;
    let payload;
    if (form) payload = form;
    else if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    const sentToken = loggedIn() ? state.social.token : null;
    let res;
    try {
      res = await fetch(API_BASE + path, { method, headers, body: payload });
    } catch (e) {
      throw new Error('인터넷 연결을 확인해 주세요');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401 && sentToken && loggedIn() && state.social.token === sentToken) sessionEnded();
      const err = new Error(data.error || '잠시 후 다시 시도해 주세요');
      err.status = res.status;
      throw err;
    }
    return data;
  }

  function avatarColor(id) {
    let h = 0;
    for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
  }
  const avatar = (id, name, cls = '') => `<span class="avatar${cls}" style="--c:${avatarColor(id)}">${esc([...String(name)][0] || '?')}</span>`;
  const partNames = key => dayParts(key).map(id => partById(id)).filter(Boolean).map(p => p.name);
  const shortDate = key => { const d = parseKey(key); return `${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${WEEKDAYS_EN[d.getDay()]}`; };
  const profileLink = handle => `${location.origin}${location.pathname}?u=${encodeURIComponent(handle)}`;

  // ---- check-in sync: followers see who went today ----
  const daySyncTimers = new Map();
  function queueDaySync(key) {
    if (!loggedIn()) return;
    clearTimeout(daySyncTimers.get(key));
    daySyncTimers.set(key, setTimeout(() => {
      daySyncTimers.delete(key);
      api(`/api/days/${key}`, { method: 'PUT', body: { parts: partNames(key) } }).catch(() => { /* next change retries */ });
    }, 800));
  }

  // Sends this year's check-ins once, so the profile's "올해 출석" is right from day one.
  async function syncYear() {
    const prefix = `${today().getFullYear()}-`;
    const days = {};
    for (const key of Object.keys(state.records)) if (key.startsWith(prefix)) days[key] = partNames(key);
    try { await api('/api/days', { method: 'PUT', body: { days } }); } catch (e) { /* not critical */ }
  }

  // ---- screens: a small stack (feed → profile → post …) with a back button ----
  // mode: which form shows when logged out ('signup' | 'login').
  const social = { stack: [{ view: 'feed' }], busy: false, pendingHandle: null, mode: 'signup', form: { handle: '', nickname: '', password: '' } };
  const top = () => social.stack[social.stack.length - 1];

  function socialPush(entry) {
    social.stack.push(entry);
    renderSocial();
    $('#views').scrollTop = 0;
    loadEntry(entry);
  }

  function socialBack() {
    if (social.stack.length > 1) social.stack.pop();
    renderSocial();
    $('#views').scrollTop = 0;
    const e = top();
    if (e.stale) loadEntry(e);
  }

  function socialHome() {
    social.stack = [social.stack[0]];
    renderSocial();
    loadEntry(social.stack[0], { quiet: true });
  }

  const openProfile = handle => socialPush({ view: 'profile', handle });

  async function loadEntry(e, { quiet = false } = {}) {
    if (!loggedIn() || !e) return;
    e.loading = !quiet || !e.loaded;
    e.error = '';
    e.stale = false;
    if (e === top() && ui.tab === 'social') renderSocial();
    const t = today();
    try {
      if (e.view === 'feed') {
        const [f, td] = await Promise.all([api('/api/feed'), api(`/api/today?date=${keyOf(t)}`)]);
        e.posts = f.posts;
        e.more = f.more;
        e.today = td.users;
      } else if (e.view === 'profile') {
        const [p, g] = await Promise.all([
          api(`/api/users/${encodeURIComponent(e.handle)}?year=${t.getFullYear()}`),
          api(`/api/users/${encodeURIComponent(e.handle)}/posts`),
        ]);
        e.profile = p.profile;
        e.posts = g.posts;
        e.more = g.more;
      } else if (e.view === 'follows') {
        e.users = (await api(`/api/users/${encodeURIComponent(e.handle)}/${e.kind}`)).users;
      } else if (e.view === 'post' && !e.post) {
        e.post = (await api(`/api/posts/${e.id}`)).post;
      }
      e.loaded = true;
    } catch (err) {
      e.error = err.message;
    }
    e.loading = false;
    if (e === top() && ui.tab === 'social') renderSocial();
  }

  async function loadMore() {
    const e = top();
    if (social.busy || !e.posts || !e.posts.length) return;
    social.busy = true;
    try {
      const before = e.posts[e.posts.length - 1].createdAt;
      const path = e.view === 'feed' ? `/api/feed?before=${before}` : `/api/users/${encodeURIComponent(e.handle)}/posts?before=${before}`;
      const r = await api(path);
      e.posts = e.posts.concat(r.posts);
      e.more = r.more;
    } catch (err) {
      toast(err.message);
    }
    social.busy = false;
    renderSocial();
  }

  // Applies a change to every copy of a post held by the screens in the stack.
  function eachPost(id, fn) {
    for (const e of social.stack) {
      if (e.posts) e.posts.forEach(p => { if (p.id === id) fn(p); });
      if (e.post && e.post.id === id) fn(e.post);
    }
  }

  async function firePost(id) {
    let next = null;
    eachPost(id, p => {
      if (next === null) next = !p.fired;
      p.fired = next;
      p.fires += next ? 1 : -1;
    });
    if (next === null) return;
    renderSocial();
    if (next && navigator.vibrate) navigator.vibrate(8);
    try {
      const r = await api(`/api/posts/${id}/fire`, { method: 'POST' });
      eachPost(id, p => { p.fired = r.fired; p.fires = r.fires; });
    } catch (err) {
      eachPost(id, p => { p.fired = !next; p.fires += next ? -1 : 1; });
      toast(err.message);
    }
    renderSocial();
  }

  async function deletePost(id) {
    if (!confirm('이 오운완을 피드에서 지울까요?\n앱에 저장된 사진은 그대로예요.')) return;
    try {
      await api(`/api/posts/${id}`, { method: 'DELETE' });
      for (const e of social.stack) {
        if (e.posts) e.posts = e.posts.filter(p => p.id !== id);
        if (e.profile && e.profile.isMe) e.profile.posts = Math.max(0, e.profile.posts - 1);
      }
      if (top().view === 'post') socialBack();
      else renderSocial();
      toast('지웠어요');
    } catch (err) {
      toast(err.message);
    }
  }

  async function toggleFollow(handle, follow) {
    try {
      const r = await api(`/api/follows/${encodeURIComponent(handle)}`, { method: follow ? 'PUT' : 'DELETE' });
      for (const e of social.stack) {
        if (e.profile && e.profile.handle === handle) { e.profile.followed = r.followed; e.profile.followers = r.followers; }
        if (e.profile && e.profile.isMe) e.profile.following = Math.max(0, e.profile.following + (follow ? 1 : -1));
        (e.users || []).forEach(u => { if (u.handle === handle) u.followed = r.followed; });
      }
      social.stack[0].stale = true; // the feed changes with who you follow
      renderSocial();
    } catch (err) {
      toast(err.message);
    }
  }

  // ---- account ----
  const fieldValue = sel => ($(sel) ? $(sel).value : '');

  function showLoggedOut(handle) {
    social.stack = [{ view: 'feed' }];
    social.mode = 'login';
    social.form = { handle: handle || '', nickname: '', password: '' };
    ui.pwForm = false;
    syncFeedToggle();
    renderCurrent();
  }

  // The server no longer knows this device's token (logged out elsewhere, or an old backup).
  function sessionEnded() {
    const handle = state.social.handle;
    state.social = null;
    save();
    showLoggedOut(handle);
    toast('로그인이 풀렸어요. 다시 로그인해 주세요');
  }

  // Sign up (handle + nickname + password) or log in (handle + password).
  async function submitAuth() {
    if (social.busy) return;
    const login = social.mode === 'login';
    social.form = { // survives re-renders
      handle: fieldValue('#soc-handle'),
      nickname: login ? social.form.nickname : fieldValue('#soc-nickname'),
      password: fieldValue('#soc-password'),
    };
    const handle = social.form.handle.trim().toLowerCase().replace(/^@/, '');
    const nickname = social.form.nickname.trim();
    const password = social.form.password;
    if (!HANDLE_RE.test(handle)) { toast(login ? '아이디를 확인해 주세요' : '아이디는 영문 소문자·숫자·.·_ 로 3~20자예요'); return; }
    if (!login && !nickname) { toast('닉네임을 정해 주세요'); return; }
    if (login && !password) { toast('비밀번호를 입력해 주세요'); return; }
    if (!login && [...password].length < PW_MIN) { toast(`비밀번호는 ${PW_MIN}자 이상이에요`); return; }
    social.busy = true;
    renderSocial();
    try {
      const { user, token } = login
        ? await api('/api/login', { method: 'POST', body: { handle, password } })
        : await api('/api/users', { method: 'POST', body: { handle, nickname, password } });
      state.social = { token, userId: user.id, handle: user.handle, nickname: user.nickname, autoPost: true };
      save();
      social.form = { handle: '', nickname: '', password: '' };
      social.mode = 'signup';
      toast(login ? `@${user.handle}로 로그인했어요` : `@${user.handle}로 시작했어요`);
      social.busy = false;
      syncFeedToggle();
      await syncYear();
      social.stack = [{ view: 'feed' }];
      renderSocial();
      loadEntry(social.stack[0]);
      if (social.pendingHandle) { const h = social.pendingHandle; social.pendingHandle = null; openProfile(h); }
    } catch (err) {
      social.busy = false;
      if (login) social.form.password = '';
      toast(err.message);
      renderSocial();
    }
  }

  async function logOut() {
    if (!loggedIn()) return;
    const handle = state.social.handle;
    if (!confirm(`@${handle}에서 로그아웃할까요?\n다시 들어오려면 아이디와 비밀번호가 필요해요. 출석 기록과 사진은 이 폰에 그대로 있어요.`)) return;
    try { await api('/api/session', { method: 'DELETE' }); } catch (e) { /* the token is dropped here either way */ }
    if (state.social) {
      state.social = null;
      save();
      showLoggedOut(handle);
    }
    toast('로그아웃했어요');
  }

  async function changePassword() {
    const next = fieldValue('#pw-new');
    if ([...next].length < PW_MIN) { toast(`비밀번호는 ${PW_MIN}자 이상이에요`); return; }
    if (next !== fieldValue('#pw-again')) { toast('두 비밀번호가 달라요'); return; }
    const btn = $('#pw-save');
    if (btn) btn.disabled = true;
    try {
      await api('/api/me/password', { method: 'PUT', body: { password: next } });
      ui.pwForm = false;
      renderCurrent();
      toast('비밀번호를 바꿨어요');
    } catch (err) {
      if (btn) btn.disabled = false;
      toast(err.message);
    }
  }

  async function renameMe() {
    const next = prompt('새 닉네임 (12자까지)', state.social.nickname);
    if (next === null || !next.trim()) return;
    try {
      const { user } = await api('/api/me', { method: 'PATCH', body: { nickname: next } });
      state.social.nickname = user.nickname;
      save();
      for (const e of social.stack) {
        if (e.profile && e.profile.isMe) e.profile.nickname = user.nickname;
        (e.posts || []).forEach(p => { if (p.user.id === user.id) p.user.nickname = user.nickname; });
      }
      renderSocial();
      toast('닉네임을 바꿨어요');
    } catch (err) {
      toast(err.message);
    }
  }

  function shareProfile(handle) {
    const text = `짐첵에서 같이 오운완 해요! @${handle}\n${profileLink(handle)}`;
    if (navigator.share) navigator.share({ text }).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => toast('프로필 링크를 복사했어요'), () => toast(profileLink(handle)));
    else toast(profileLink(handle));
  }

  // ---- search (results update without re-rendering the input) ----
  let searchTimer = 0;
  let searchSeq = 0;
  function searchInput(q) {
    clearTimeout(searchTimer);
    const e = top();
    e.q = q;
    searchTimer = setTimeout(async () => {
      const seq = ++searchSeq;
      if (!q.trim()) { e.users = []; renderSearchResults(); return; }
      try {
        const r = await api(`/api/search?q=${encodeURIComponent(q.trim())}`);
        if (seq !== searchSeq) return;
        e.users = r.users;
      } catch (err) {
        e.users = [];
        e.error = err.message;
      }
      renderSearchResults();
    }, 250);
  }

  // ---- posting from the 오운완 screen ----
  async function feedJpeg(blob) {
    const img = await loadImage(blob);
    const k = Math.min(1, 1440 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k);
    c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    if (img.close) img.close();
    return new Promise((resolve, reject) => c.toBlob(b => (b ? resolve(b) : reject(new Error('jpeg'))), 'image/jpeg', 0.85));
  }

  async function postToFeed(key, blob) {
    const form = new FormData();
    form.append('date', key);
    form.append('headline', photoHeadline(dayParts(key).map(id => partById(id)).filter(Boolean)));
    form.append('parts', JSON.stringify(partNames(key)));
    form.append('image', new File([await feedJpeg(blob)], `${key}.jpg`, { type: 'image/jpeg' }));
    const { post } = await api('/api/posts', { method: 'POST', form });
    for (const e of social.stack) {
      if (e.view === 'feed' && e.posts) e.posts.unshift(post);
      if (e.profile && e.profile.isMe) { e.posts = [post].concat(e.posts || []); e.profile.posts++; }
    }
    return post;
  }

  function syncFeedToggle() {
    $('#photo-crew-row').hidden = !loggedIn();
    $('#photo-crew').checked = Boolean(state.social && state.social.autoPost !== false);
  }

  // ---- rendering ----
  function postCard(p) {
    const mine = loggedIn() && p.user.id === state.social.userId;
    return `<article class="post">
      <header class="post-head">
        <button class="post-user" data-action="soc-profile" data-handle="${esc(p.user.handle)}">
          ${avatar(p.user.id, p.user.nickname)}
          <span><b>${esc(p.user.nickname)}</b><small>@${esc(p.user.handle)} · ${shortDate(p.date)}</small></span>
        </button>
        ${mine ? `<button class="text-btn" data-action="post-delete" data-id="${esc(p.id)}">삭제</button>` : ''}
      </header>
      <img class="post-img" src="${esc(API_BASE + p.image)}" alt="${esc(p.user.nickname)}의 오운완" loading="lazy" decoding="async">
      <footer class="post-foot">
        <button class="fire${p.fired ? ' on' : ''}" data-action="post-fire" data-id="${esc(p.id)}" aria-pressed="${p.fired}">🔥 <span>${p.fires}</span></button>
        <span class="post-parts">${esc(p.parts.join(' · '))}</span>
        <span class="post-headline">${esc(p.headline)}</span>
      </footer>
    </article>`;
  }

  const userRow = u => `<div class="user-row">
      <button class="post-user" data-action="soc-profile" data-handle="${esc(u.handle)}">
        ${avatar(u.id, u.nickname)}<span><b>${esc(u.nickname)}</b><small>@${esc(u.handle)}</small></span>
      </button>
      ${u.isMe ? '' : `<button class="btn small${u.followed ? '' : ' primary'}" data-action="${u.followed ? 'soc-unfollow' : 'soc-follow'}" data-handle="${esc(u.handle)}">${u.followed ? '팔로잉' : '팔로우'}</button>`}
    </div>`;

  const subHead = title => `<header class="subhead">
      <button class="icon-btn" data-action="soc-back" aria-label="뒤로">${ICON.prev}</button>
      <h1>${title}</h1>
      <span class="subhead-spacer"></span>
    </header>`;

  const status = e => (e.loading && !e.loaded ? '<p class="crew-empty">불러오는 중…</p>'
    : e.error && !e.loaded ? `<p class="crew-empty">${esc(e.error)}<br><button class="btn" data-action="soc-retry">다시 시도</button></p>` : '');

  function onboardingHtml() {
    const login = social.mode === 'login';
    const f = social.form;
    const label = social.busy ? (login ? '확인 중…' : '만드는 중…') : (login ? '로그인' : '시작하기');
    return `<header class="head"><div><p class="kicker">Feed</p><h1>${login ? '로그인' : '피드'}</h1></div></header>
      <div class="crew-intro">${login
        ? '아이디와 비밀번호로 들어오면 팔로우와 올린 오운완이 그대로 있어요.<br>출석 기록과 사진은 폰에 저장돼서, 새 폰이라면 <b>설정 → 가져오기</b>로 백업을 불러와 주세요.'
        : `아이디를 만들면 친구를 <b>팔로우</b>하고, 서로 <b>오늘 운동했는지</b>랑 <b>오운완 카드</b>를 볼 수 있어요. 🔥로 응원도 하고요.<br>
        누가 몇 kg 들었는지 같은 건 없어요. 그냥 오운완이에요.`}
      </div>
      <form class="auth-form" data-form="soc-auth" novalidate>
        <div class="crew-panel">
          <h2>아이디</h2>
          <div class="field handle-field"><span>@</span><input id="soc-handle" name="username" type="text" maxlength="20" value="${esc(f.handle)}" placeholder="gym_heon" autocapitalize="none" autocomplete="username" autocorrect="off" spellcheck="false" enterkeyhint="next"></div>
          ${login ? '' : '<p class="note">영문 소문자·숫자·마침표(.)·밑줄(_) 3~20자 · 친구가 이걸로 찾아요</p>'}
        </div>
        ${login ? '' : `<div class="crew-panel">
          <h2>닉네임</h2>
          <div class="field"><input id="soc-nickname" type="text" maxlength="12" value="${esc(f.nickname)}" placeholder="피드에 보일 이름" autocomplete="nickname" enterkeyhint="next"></div>
        </div>`}
        <div class="crew-panel">
          <h2>비밀번호</h2>
          <div class="field"><input id="soc-password" name="password" type="password" maxlength="64" value="${esc(f.password)}" placeholder="${login ? '비밀번호' : `${PW_MIN}자 이상`}" autocomplete="${login ? 'current-password' : 'new-password'}" enterkeyhint="go"></div>
          ${login ? '' : '<p class="note">새 폰에서 로그인할 때 써요. 이메일을 받지 않아서 잊어버리면 찾을 수 없어요. 아이폰이 암호를 저장할지 물으면 저장해 두세요.</p>'}
        </div>
        <button class="photo-cta" type="submit"${social.busy ? ' disabled' : ''}><span>${label}</span></button>
      </form>
      <p class="auth-switch">${login ? '처음이에요?' : '이미 아이디가 있어요?'} <button class="link-btn" data-action="soc-mode" data-mode="${login ? 'signup' : 'login'}">${login ? '아이디 만들기' : '로그인'}</button></p>
      ${social.pendingHandle ? `<p class="note">${login ? '로그인하면' : '시작하면'} @${esc(social.pendingHandle)}님 프로필로 이동해요.</p>` : ''}`;
  }

  function feedHtml(e) {
    const me = state.social;
    const today = (e.today || []).map(u => `
      <button class="member on" data-action="soc-profile" data-handle="${esc(u.handle)}">
        ${avatar(u.id, u.nickname)}
        <b>${esc(u.isMe ? '나' : u.nickname)}</b>
        <small>${esc(u.parts.join('·'))}</small>
      </button>`).join('');
    const posts = (e.posts || []).map(postCard).join('');
    const lonely = e.loaded && !(e.posts || []).length;
    return `<header class="head">
        <div><p class="kicker">Feed</p><h1>피드</h1></div>
        <div class="nav">
          <button class="icon-btn" data-action="soc-search" aria-label="친구 찾기">${ICON.search}</button>
          <button class="avatar-btn" data-action="soc-profile" data-handle="${esc(me.handle)}" aria-label="내 프로필">${avatar(me.userId, me.nickname, ' small')}</button>
        </div>
      </header>
      ${status(e)}
      ${e.loaded ? `
      <div class="section-head"><h2>오늘 간 사람 <span class="count">${(e.today || []).length}</span></h2><span class="kicker">Today</span></div>
      ${today ? `<div class="members">${today}</div>` : '<p class="note today-empty">팔로우한 사람 중 오늘 체크한 사람이 아직 없어요.</p>'}
      ${lonely ? `<div class="crew-intro">
          아직 피드가 비어 있어요. 친구 아이디를 <b>검색</b>해서 팔로우하거나, <b>내 프로필 링크</b>를 보내서 서로 팔로우해 보세요.
          <div class="intro-actions">
            <button class="btn primary" data-action="soc-search">친구 찾기</button>
            <button class="btn" data-action="soc-share" data-handle="${esc(me.handle)}">내 프로필 공유</button>
          </div>
        </div>` : posts}
      ${e.more ? `<button class="btn more-btn" data-action="soc-more"${social.busy ? ' disabled' : ''}>더 보기</button>` : ''}` : ''}`;
  }

  function searchHtml(e) {
    return `${subHead('친구 찾기')}
      <div class="field search-field">
        ${ICON.search}
        <input id="soc-search" type="search" placeholder="아이디나 닉네임" value="${esc(e.q || '')}" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="search">
      </div>
      <div id="search-results"></div>`;
  }

  function renderSearchResults() {
    const box = $('#search-results');
    const e = top();
    if (!box || e.view !== 'search') return;
    if (!(e.q || '').trim()) { box.innerHTML = '<p class="crew-empty">친구의 아이디나 닉네임을 입력해 보세요.</p>'; return; }
    box.innerHTML = (e.users || []).length ? e.users.map(userRow).join('') : '<p class="crew-empty">찾는 사람이 없어요.</p>';
  }

  function profileHtml(e) {
    const p = e.profile;
    if (!p) return `${subHead(`@${esc(e.handle)}`)}${status(e)}`;
    const grid = (e.posts || []).map(x => `<button class="grid-item" data-action="soc-post" data-id="${esc(x.id)}"><img src="${esc(API_BASE + x.image)}" alt="" loading="lazy" decoding="async"></button>`).join('');
    return `${subHead(`@${esc(p.handle)}`)}
      <section class="profile">
        ${avatar(p.id, p.nickname, ' large')}
        <div class="profile-main">
          <h2>${esc(p.nickname)}</h2>
          <div class="pstats">
            <div><b class="d">${p.posts}</b><small>오운완</small></div>
            <button data-action="soc-follows" data-kind="followers" data-handle="${esc(p.handle)}"><b class="d">${p.followers}</b><small>팔로워</small></button>
            <button data-action="soc-follows" data-kind="following" data-handle="${esc(p.handle)}"><b class="d">${p.following}</b><small>팔로잉</small></button>
          </div>
        </div>
      </section>
      <p class="pyear">${today().getFullYear()}년 <b class="d">${p.yearDays}</b>일 헬스장 감</p>
      <div class="profile-actions">
        ${p.isMe
          ? `<button class="btn" data-action="soc-share" data-handle="${esc(p.handle)}">프로필 공유</button><button class="btn" data-action="soc-rename">닉네임 바꾸기</button>`
          : `<button class="btn${p.followed ? '' : ' primary'}" data-action="${p.followed ? 'soc-unfollow' : 'soc-follow'}" data-handle="${esc(p.handle)}">${p.followed ? '팔로잉' : '팔로우'}</button><button class="btn" data-action="soc-share" data-handle="${esc(p.handle)}">공유</button>`}
      </div>
      ${grid ? `<div class="grid">${grid}</div>` : `<p class="crew-empty">${p.isMe ? '오운완 사진을 찍을 때 <b>피드에도 올리기</b>를 켜 두면 여기 쌓여요.' : '아직 올린 오운완이 없어요.'}</p>`}
      ${e.more ? `<button class="btn more-btn" data-action="soc-more"${social.busy ? ' disabled' : ''}>더 보기</button>` : ''}`;
  }

  function followsHtml(e) {
    const title = e.kind === 'followers' ? '팔로워' : '팔로잉';
    const body = e.loaded ? ((e.users || []).length ? e.users.map(userRow).join('') : `<p class="crew-empty">아직 ${title}가 없어요.</p>`) : status(e);
    return `${subHead(`@${esc(e.handle)} ${title}`)}${body}`;
  }

  function postViewHtml(e) {
    return `${subHead('오운완')}${e.post ? postCard(e.post) : status(e)}`;
  }

  function renderSocial() {
    const el = views.social;
    if (!loggedIn()) { el.innerHTML = onboardingHtml(); return; }
    const e = top();
    const html = { feed: feedHtml, search: searchHtml, profile: profileHtml, follows: followsHtml, post: postViewHtml }[e.view];
    el.innerHTML = html(e);
    if (e.view === 'search') renderSearchResults();
  }

  // ---------- rendering ----------
  const views = {
    today: $('#view-today'),
    calendar: $('#view-calendar'),
    stats: $('#view-stats'),
    social: $('#view-social'),
    settings: $('#view-settings'),
  };

  function tile(p, on, sub, action) {
    const pop = ui.popId === p.id && on ? ' pop' : '';
    return `<button class="tile${pop}" data-action="${action}" data-id="${esc(p.id)}" aria-pressed="${on}" style="--c:${p.color}">
      <span class="tile-tag">${PART_EN[p.id] || ''}</span>
      <span class="tile-name">${esc(p.name)}</span>
      <span class="tile-foot">${sub}<span class="tile-check" aria-hidden="true">${ICON.check}</span></span>
    </button>`;
  }

  function backupBanner() {
    const n = Object.keys(state.records).length;
    if (n < 7) return '';
    const since = state.lastBackup ? daysBetween(new Date(state.lastBackup), new Date()) : Infinity;
    if (since < 30) return '';
    const text = state.lastBackup ? `백업한 지 ${since}일 지났어요` : `기록 ${n}일 쌓임. 백업해 둘까요?`;
    return `<div class="banner"><span>${text}</span><button class="btn small primary" data-action="export">백업</button></div>`;
  }

  function renderToday() {
    const t = today();
    const tk = keyOf(t);
    const done = new Set(dayParts(tk));
    const last = lastDoneMap(tk);
    const st = streak(t);
    const wk = weekCount(t);
    const goal = state.weeklyGoal;
    const y = t.getFullYear();
    const yDays = yearStats(y).days;
    const met = wk >= goal;

    const doneNames = state.parts.filter(p => done.has(p.id)).map(p => p.name);
    let title = '오늘 어디 털었어요?';
    if (doneNames.length > 3) title = `오늘 ${doneNames.length}부위 완료`;
    else if (doneNames.length) title = `${esc(doneNames.join('·'))} 완료`;

    const ws = startOfWeek(t);
    const week = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(ws, i);
      const k = keyOf(d);
      const on = attended(k);
      const ph = photoThumbs.get(k);
      const cls = ['wk', on && 'on', k === tk && 'today', d > t && 'future', ph && 'photo'].filter(Boolean).join(' ');
      return `<button class="${cls}" data-action="open-day" data-key="${k}"${d > t ? ' disabled' : ''}${ph ? ` style="--ph:url('${ph}')"` : ''} aria-label="${d.getMonth() + 1}월 ${d.getDate()}일${on ? ', 운동함' : ''}${ph ? ', 사진 있음' : ''}">
        <span class="wk-label">${WEEKDAYS[d.getDay()]}</span><span class="wk-dot">${ph ? '' : on ? ICON.check : d.getDate()}</span></button>`;
    }).join('');

    const tiles = state.parts.map(p => {
      const on = done.has(p.id);
      let label;
      let stale = false;
      if (on) label = '오늘 완료';
      else if (!last[p.id]) label = '기록 없음';
      else {
        const n = daysBetween(parseKey(last[p.id]), t);
        label = n === 1 ? '어제 함' : `${n}일 전`;
        stale = n >= STALE_DAYS;
      }
      return tile(p, on, `<span class="tile-sub${stale ? ' stale' : ''}">${label}</span>`, 'toggle-today');
    }).join('');

    views.today.innerHTML = `
      <header class="head">
        <div>
          <p class="kicker">Today · ${fmtKicker(t)}</p>
          <h1>${title}</h1>
        </div>
      </header>

      ${hasUpdate()
        ? `<div class="banner update"><span>새 버전 v${esc(ui.latestVersion)}이 나왔어요</span><button class="btn small primary" data-action="apply-update">업데이트</button></div>`
        : needsReinstall()
          ? '<div class="banner update"><span>아이콘을 다시 추가하면 화면이 꽉 차요</span><button class="btn small primary" data-action="show-fit">방법</button></div>'
          : ''}

      <section class="hero">
        <div class="hero-top">
          <div>
            <p class="kicker">Streak</p>
            <div class="streak${st ? '' : ' zero'}"><span class="d">${st}</span><span class="streak-unit">일 연속</span></div>
          </div>
          <div class="season">
            <p class="kicker">${y} Season</p>
            <span class="d">${yDays}<small>/${daysInYear(y)}</small></span>
          </div>
        </div>
        <div class="week-head">
          <span>이번 주 <small>지난 날도 눌러서 체크</small></span>
          <span class="${met ? 'met' : ''}"><b>${wk}</b> / ${goal}회${met ? ' · 목표 달성' : ''}</span>
        </div>
        <div class="week">${week}</div>
      </section>

      <div class="section-head"><h2>오늘 한 운동</h2><span class="kicker">Workout</span></div>
      <div class="tiles">${tiles}</div>
      ${photoThumbs.has(tk)
        ? `<button class="photo-cta has-photo" data-action="open-day" data-key="${tk}"><img src="${photoThumbs.get(tk)}" alt=""><span>오늘 오운완 보기</span></button>`
        : `<button class="photo-cta${done.size ? '' : ' idle'}" data-action="photo">
        ${ICON.camera}<span>${done.size ? `${esc(photoHeadline(state.parts.filter(p => done.has(p.id))))} 오운완 찍기` : '운동 체크하고 오운완 찍기'}</span>
      </button>`}
      ${backupBanner()}`;
  }

  function renderCalendar() {
    const t = today();
    const tk = keyOf(t);
    const m = ui.calMonth;
    const y = m.getFullYear();
    const mo = m.getMonth();
    const lead = (m.getDay() + 6) % 7;
    const dim = new Date(y, mo + 1, 0).getDate();
    const isCurMonth = y === t.getFullYear() && mo === t.getMonth();
    const atLatest = y > t.getFullYear() || (y === t.getFullYear() && mo >= t.getMonth());

    const counts = {};
    let attendedDays = 0;
    let cells = '';
    for (let i = 0; i < lead; i++) cells += '<span class="day empty" aria-hidden="true"></span>';
    for (let d = 1; d <= dim; d++) {
      const k = keyOf(new Date(y, mo, d));
      const arr = dayParts(k);
      const col = (lead + d - 1) % 7;
      if (arr.length) attendedDays++;
      const names = [];
      let dots = '';
      for (const id of arr) {
        counts[id] = (counts[id] || 0) + 1;
        const p = partById(id);
        if (!p) continue;
        names.push(p.name);
        dots += `<i style="background:${p.color}"></i>`;
      }
      const ph = photoThumbs.get(k);
      const cls = ['day', col === 5 && 'sat', col === 6 && 'sun', arr.length && 'attended', k === tk && 'today', ph && 'photo']
        .filter(Boolean).join(' ');
      cells += `<button class="${cls}" data-action="open-day" data-key="${k}"${k > tk ? ' disabled' : ''}${ph ? ` style="--ph:url('${ph}')"` : ''} aria-label="${mo + 1}월 ${d}일${names.length ? `, ${esc(names.join(', '))}` : ''}${ph ? ', 사진 있음' : ''}">
        <span class="num">${d}</span><span class="dots">${dots}</span></button>`;
    }

    const legend = state.parts.map(p => {
      const n = counts[p.id] || 0;
      return `<div class="legend-row${n ? '' : ' zero'}"><i style="background:${p.color}"></i>${esc(p.name)}<b class="d">${n}</b></div>`;
    }).join('');

    views.calendar.innerHTML = `
      <header class="head">
        <div>
          <p class="kicker">Calendar</p>
          <h1>${mo + 1}월<span class="d">${y}</span></h1>
        </div>
        <div class="nav">
          ${isCurMonth ? '' : '<button class="pill" data-action="cal-today">오늘</button>'}
          <button class="icon-btn" data-action="cal-prev" aria-label="이전 달">${ICON.prev}</button>
          <button class="icon-btn" data-action="cal-next" aria-label="다음 달"${atLatest ? ' disabled' : ''}>${ICON.next}</button>
        </div>
      </header>
      <div class="month-stat">
        <span class="d">${attendedDays}</span><span class="unit">일 출석</span>
        <span class="of">${isCurMonth ? '이번 달' : `${mo + 1}월`} ${dim}일 중</span>
      </div>
      <div class="cal">
        <div class="cal-week" aria-hidden="true">
          <span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span class="sat">토</span><span class="sun">일</span>
        </div>
        <div class="cal-grid">${cells}</div>
      </div>
      <div class="legend">${legend}</div>
      <button class="photo-cta${attendedDays ? '' : ' idle'}" data-action="recap">${ICON.chart}<span>${mo + 1}월 결산 카드 만들기</span></button>
      <p class="note">날짜를 누르면 그날 기록을 고칠 수 있어요. 옆으로 밀면 달이 바뀌어요.</p>`;
  }

  function renderStats() {
    const t = today();
    const curY = t.getFullYear();
    const y = ui.statsYear;
    const { days, months, parts } = yearStats(y);
    const dy = daysInYear(y);
    const years = Object.keys(state.records).map(k => Number(k.slice(0, 4)));
    const minY = Math.min(curY, ...years);

    let sub;
    if (y === curY) {
      const elapsed = daysBetween(new Date(y, 0, 1), t) + 1;
      sub = `올해 ${elapsed}일 지났고, 그중 ${days}일 갔어요 (${pct(days, elapsed)}%)`;
    } else {
      sub = `${y}년 출석률 ${pct(days, dy)}%`;
    }

    const maxM = Math.max(10, ...months);
    const bars = months.map((n, i) => {
      const future = y === curY && i > t.getMonth();
      const cur = y === curY && i === t.getMonth();
      return `<div class="bar-col${cur ? ' current' : ''}${future ? ' future' : ''}">
        <div class="bar-track"><span class="bar-val">${future ? '' : n}</span><i class="bar" style="height:${(n / maxM) * 100}%"></i></div>
        <span class="bar-month">${i + 1}월</span>
      </div>`;
    }).join('');

    const maxP = Math.max(0, ...state.parts.map(p => parts[p.id] || 0));
    const rows = state.parts.map(p => {
      const n = parts[p.id] || 0;
      return `<div class="prow${maxP && n === maxP ? ' top' : ''}">
        <span class="prow-name"><i style="background:${p.color}"></i><span>${esc(p.name)}</span></span>
        <span class="prow-track"><i style="width:${maxP ? (n / maxP) * 100 : 0}%;background:${p.color}"></i></span>
        <span class="prow-count d">${n}</span>
      </div>`;
    }).join('');

    views.stats.innerHTML = `
      <header class="head">
        <div>
          <p class="kicker">Records</p>
          <h1>${y} 시즌</h1>
        </div>
        <div class="nav">
          <button class="icon-btn" data-action="year-prev" aria-label="이전 해"${y <= minY ? ' disabled' : ''}>${ICON.prev}</button>
          <button class="icon-btn" data-action="year-next" aria-label="다음 해"${y >= curY ? ' disabled' : ''}>${ICON.next}</button>
        </div>
      </header>

      <section class="stat-hero">
        <p class="label">헬스장 간 날</p>
        <div class="mega"><span class="d num">${days}</span><span class="d den">/${dy}</span><span class="unit">일</span></div>
        <div class="progress"><i style="width:${(days / dy) * 100}%"></i></div>
        <p class="sub">${sub}</p>
      </section>

      <section class="block">
        <div class="section-head"><h2>월별 출석</h2><span class="kicker">Monthly</span></div>
        <div class="bars">${bars}</div>
      </section>

      <section class="block">
        <div class="section-head"><h2>부위별 횟수</h2><span class="kicker">By part</span></div>
        ${rows}
      </section>`;
  }

  function renderSettings() {
    if (!ui.newColor) ui.newColor = nextColor();
    const goal = state.weeklyGoal;
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

    const partRows = state.parts.map(p => `
      <div class="row">
        <span class="row-label inline"><i class="bar-mark" style="background:${p.color}"></i>${esc(p.name)}</span>
        ${BUILTIN_IDS.has(p.id)
          ? `<span class="tag">${PART_EN[p.id]}</span>`
          : `<button class="text-btn danger" data-action="delete-part" data-id="${esc(p.id)}">삭제</button>`}
      </div>`).join('');

    const swatches = CUSTOM_COLORS.map(c =>
      `<button type="button" class="swatch" style="--c:${c}" data-action="pick-color" data-color="${c}" aria-pressed="${c === ui.newColor}" aria-label="색상 ${c}"></button>`
    ).join('');

    const lastBackup = state.lastBackup ? `마지막 백업 ${fmtDot(new Date(state.lastBackup))}` : '아직 백업한 적 없어요';

    views.settings.innerHTML = `
      <header class="head"><div><p class="kicker">Settings</p><h1>설정</h1></div></header>

      ${needsReinstall() ? `
      <div class="section-head" id="fit-guide"><h2>화면 꽉 채우기</h2><span class="kicker">Fit</span></div>
      <div class="group">
        <p class="install">지금 아이콘은 예전 방식으로 추가돼서 화면 아래가 비어 보여요. 아이콘을 한 번만 다시 추가하면 꽉 차요.<br>
        <b>1</b> 아래 ‘내보내기’로 기록 백업<br>
        <b>2</b> 홈 화면 아이콘을 길게 눌러 삭제 <small>(이때 기록과 사진도 같이 지워져요. 1단계 백업에 사진도 들어가요)</small><br>
        <b>3</b> Safari로 앱 주소를 열고 <b>새로고침(↻) 한 번</b> → 공유 → ‘홈 화면에 추가’<br>
        <b>4</b> 새 아이콘에서 설정 → ‘가져오기’로 백업 불러오기</p>
        <div class="row">
          <span class="row-label">1단계 · 기록 백업</span>
          ${exportButton(true)}
        </div>
      </div>` : ''}

      <div class="section-head"><h2>앱 업데이트</h2><span class="kicker">v${APP_VERSION}</span></div>
      <div class="group">
        <div class="row">
          <span class="row-label">${hasUpdate() ? `새 버전 v${esc(ui.latestVersion)} 나왔어요` : `지금 버전 v${APP_VERSION}`}<small>업데이트해도 기록은 그대로예요</small></span>
          <button class="btn${hasUpdate() ? ' primary' : ''}" data-action="update"${ui.updating ? ' disabled' : ''}>${hasUpdate() ? '업데이트' : '업데이트 확인'}</button>
        </div>
      </div>

      <div class="section-head"><h2>주간 목표</h2><span class="kicker">Goal</span></div>
      <div class="group">
        <div class="row">
          <span class="row-label">일주일에</span>
          <div class="stepper">
            <button data-action="goal-dec" aria-label="목표 줄이기"${goal <= 1 ? ' disabled' : ''}>−</button>
            <output class="d" aria-live="polite">${goal}<small>회</small></output>
            <button data-action="goal-inc" aria-label="목표 늘리기"${goal >= 7 ? ' disabled' : ''}>+</button>
          </div>
        </div>
      </div>

      <div class="section-head"><h2>운동 부위</h2><span class="kicker">Parts</span></div>
      <div class="group">
        ${partRows}
        <form class="add-part" data-form="add-part">
          <div class="row">
            <input id="new-part" type="text" maxlength="${MAX_NAME}" placeholder="부위 추가 (예: 수영)" enterkeyhint="done" autocomplete="off" aria-label="새 부위 이름">
            <button class="btn primary" type="submit">추가</button>
          </div>
          <div class="swatches" role="group" aria-label="색상 선택">${swatches}</div>
        </form>
      </div>

      <div class="section-head"><h2>피드 계정</h2><span class="kicker">Account</span></div>
      <div class="group">
        ${loggedIn() ? `
        <div class="row">
          <span class="row-label">@${esc(state.social.handle)}<small>${esc(state.social.nickname)}</small></span>
          <button class="btn" data-action="soc-logout">로그아웃</button>
        </div>
        ${ui.pwForm ? `
        <form class="pw-form" data-form="pw-change" novalidate>
          <input class="sr-only" type="text" name="username" autocomplete="username" value="${esc(state.social.handle)}" tabindex="-1" aria-hidden="true">
          <input id="pw-new" type="password" maxlength="64" placeholder="새 비밀번호 (${PW_MIN}자 이상)" autocomplete="new-password" enterkeyhint="next" aria-label="새 비밀번호">
          <input id="pw-again" type="password" maxlength="64" placeholder="한 번 더 입력" autocomplete="new-password" enterkeyhint="done" aria-label="새 비밀번호 확인">
          <div class="pw-actions">
            <button type="button" class="btn" data-action="pw-cancel">취소</button>
            <button type="submit" class="btn primary" id="pw-save">바꾸기</button>
          </div>
        </form>` : `
        <div class="row">
          <span class="row-label">비밀번호 바꾸기<small>잊어버렸어도 로그인된 폰에서는 새로 정할 수 있어요</small></span>
          <button class="btn" data-action="pw-open">바꾸기</button>
        </div>`}` : `
        <div class="row">
          <span class="row-label">로그인 안 됨<small>피드에서 아이디를 만들거나 로그인해요</small></span>
          <button class="btn" data-action="soc-goto-login">로그인</button>
        </div>`}
      </div>

      <div class="section-head"><h2>백업</h2><span class="kicker">Backup</span></div>
      <div class="group">
        <div class="row">
          <span class="row-label">기록 내보내기<small>${exportFile ? `준비 완료 · 사진 ${exportInfo.photos}장 · ${fmtSize(exportInfo.size)}` : lastBackup}</small></span>
          ${exportButton()}
        </div>
        <div class="row">
          <span class="row-label">기록 가져오기<small>지금 기록을 백업 파일 내용으로 바꿔요</small></span>
          <button class="btn" data-action="import">가져오기</button>
        </div>
      </div>
      <p class="note tight">기록은 이 폰에만 저장돼요. 폰을 바꾸거나 브라우저 데이터를 지우기 전에 꼭 내보내기 해 두세요. 백업 파일에는 기록, 앱에 저장한 오운완 사진, 피드 로그인이 함께 들어가요.</p>

      ${standalone ? '' : `
      <div class="section-head"><h2>홈 화면에 추가</h2><span class="kicker">Install</span></div>
      <div class="group">
        <p class="install"><b>아이폰</b> Safari 아래 공유 버튼 → ‘홈 화면에 추가’<br><b>안드로이드</b> Chrome 메뉴(⋮) → ‘홈 화면에 추가’</p>
      </div>`}`;
  }

  function renderSheet() {
    const k = ui.sheetDate;
    if (!k) return;
    const d = parseKey(k);
    const done = new Set(dayParts(k));
    const isToday = k === keyOf(today());
    const hasPhoto = photoThumbs.has(k);
    if (hasPhoto && sheetPhoto.key !== k) loadSheetPhoto(k);
    const photoSrc = sheetPhoto.key === k && sheetPhoto.url ? sheetPhoto.url : photoThumbs.get(k);
    const photoBlock = hasPhoto ? `
      <div class="sheet-photo">
        <img src="${photoSrc}" alt="${fmtLong(d)} 오운완 사진">
        <div class="sheet-photo-actions">
          <button class="btn small" data-action="day-photo-share">공유</button>
          <button class="btn small" data-action="day-photo-add">다시 찍기</button>
          <button class="btn small danger" data-action="day-photo-delete">삭제</button>
        </div>
      </div>` : '';
    sheet.innerHTML = `
      <div class="handle" aria-hidden="true"></div>
      <div class="sheet-head">
        <div>
          <p class="kicker">${isToday ? 'Today · ' : ''}${fmtKicker(d)}</p>
          <h2 id="sheet-title">${fmtLong(d)}</h2>
        </div>
        <button class="btn primary" data-action="close-sheet">완료</button>
      </div>
      ${photoBlock}
      <div class="tiles compact">${state.parts.map(p => tile(p, done.has(p.id), '', 'toggle-day')).join('')}</div>
      ${!hasPhoto && done.size ? `<button class="photo-cta" data-action="day-photo-add">${ICON.camera}<span>이날 오운완 사진 추가</span></button>` : ''}
      <p class="note">${done.size ? `${done.size}개 부위 체크됨` : '이날은 기록이 없어요'}</p>`;
  }

  const RENDER = { today: renderToday, calendar: renderCalendar, stats: renderStats, social: renderSocial, settings: renderSettings };

  function renderCurrent() {
    RENDER[ui.tab]();
    if (ui.sheetDate) renderSheet();
    ui.popId = null;
  }

  function setTab(tab) {
    const scroller = $('#views');
    if (ui.tab === tab) { scroller.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    ui.tab = tab;
    for (const [name, el] of Object.entries(views)) el.hidden = name !== tab;
    document.querySelectorAll('.tab').forEach(b => {
      if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    if (tab === 'calendar' && !ui.sheetDate) ui.calMonth = firstOfMonth(today());
    renderCurrent();
    if (tab === 'social') socialHome();
    scroller.scrollTop = 0;
  }

  // ---------- sheet ----------
  const sheet = $('#sheet');
  const backdrop = $('#backdrop');
  let sheetTimer = 0;

  function openSheet(key) {
    clearTimeout(sheetTimer);
    ui.sheetDate = key;
    renderSheet();
    sheet.hidden = false;
    backdrop.hidden = false;
    void sheet.offsetHeight; // commit the closed position before animating
    sheet.classList.add('open');
    backdrop.classList.add('open');
  }

  function closeSheet() {
    if (!ui.sheetDate) return;
    ui.sheetDate = null;
    clearSheetPhoto();
    sheet.classList.remove('open');
    backdrop.classList.remove('open');
    sheetTimer = setTimeout(() => { sheet.hidden = true; backdrop.hidden = true; }, 320);
  }

  // ---------- toast ----------
  let toastTimer = 0;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  // ---------- calendar navigation ----------
  function shiftMonth(delta) {
    const t = today();
    const next = new Date(ui.calMonth.getFullYear(), ui.calMonth.getMonth() + delta, 1);
    if (next > firstOfMonth(t)) return;
    ui.calMonth = next;
    renderCalendar();
  }

  let swipe = null;
  let suppressClickUntil = 0;
  views.calendar.addEventListener('pointerdown', e => {
    if (!e.target.closest('.cal')) return;
    swipe = { x: e.clientX, y: e.clientY };
  });
  views.calendar.addEventListener('pointerup', e => {
    if (!swipe) return;
    const dx = e.clientX - swipe.x;
    const dy = e.clientY - swipe.y;
    swipe = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      suppressClickUntil = Date.now() + 400;
      shiftMonth(dx < 0 ? 1 : -1);
    }
  });
  views.calendar.addEventListener('pointercancel', () => { swipe = null; });

  // ---------- events ----------
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const id = el.dataset.id;

    switch (el.dataset.action) {
      case 'tab':
        setTab(el.dataset.tab);
        break;
      case 'toggle-today':
        ui.popId = toggle(keyOf(today()), id) ? id : null;
        renderCurrent();
        break;
      case 'toggle-day':
        ui.popId = toggle(ui.sheetDate, id) ? id : null;
        renderCurrent();
        break;
      case 'open-day':
        if (Date.now() < suppressClickUntil) return;
        openSheet(el.dataset.key);
        break;
      case 'close-sheet':
        closeSheet();
        break;
      case 'cal-prev': shiftMonth(-1); break;
      case 'cal-next': shiftMonth(1); break;
      case 'cal-today':
        ui.calMonth = firstOfMonth(today());
        renderCalendar();
        break;
      case 'year-prev': ui.statsYear--; renderStats(); break;
      case 'year-next': ui.statsYear++; renderStats(); break;
      case 'goal-dec': setGoal(-1); break;
      case 'goal-inc': setGoal(1); break;
      case 'pick-color':
        ui.newColor = el.dataset.color;
        document.querySelectorAll('.swatch').forEach(s => s.setAttribute('aria-pressed', String(s === el)));
        break;
      case 'delete-part': deletePart(id); break;
      case 'export':
        if (ui.tab !== 'settings') setTab('settings');
        prepareExport();
        break;
      case 'export-share': shareExport(); break;
      case 'photo-format': pickFormat(el.dataset.format); break;
      case 'recap': openRecap(); break;
      case 'soc-mode':
        social.mode = el.dataset.mode === 'login' ? 'login' : 'signup';
        social.form.password = '';
        renderSocial();
        break;
      case 'soc-goto-login':
        social.mode = 'login';
        setTab('social');
        break;
      case 'soc-logout': logOut(); break;
      case 'pw-open':
        ui.pwForm = true;
        renderCurrent();
        requestAnimationFrame(() => { const i = $('#pw-new'); if (i) i.focus(); });
        break;
      case 'pw-cancel':
        ui.pwForm = false;
        renderCurrent();
        break;
      case 'soc-search': socialPush({ view: 'search', q: '', users: [] }); break;
      case 'soc-profile': openProfile(el.dataset.handle); break;
      case 'soc-follows': socialPush({ view: 'follows', handle: el.dataset.handle, kind: el.dataset.kind }); break;
      case 'soc-post': {
        const found = (top().posts || []).find(p => p.id === id);
        socialPush({ view: 'post', id, post: found || null });
        break;
      }
      case 'soc-back': socialBack(); break;
      case 'soc-retry': loadEntry(top()); break;
      case 'soc-more': loadMore(); break;
      case 'soc-follow': toggleFollow(el.dataset.handle, true); break;
      case 'soc-unfollow': toggleFollow(el.dataset.handle, false); break;
      case 'soc-share': shareProfile(el.dataset.handle); break;
      case 'soc-rename': renameMe(); break;
      case 'post-fire': firePost(id); break;
      case 'post-delete': deletePost(id); break;
      case 'import': $('#import-file').click(); break;
      case 'update': manualUpdate(); break;
      case 'photo': startPhoto(); break;
      case 'day-photo-add': startPhoto(ui.sheetDate); break;
      case 'day-photo-share': shareDayPhoto(); break;
      case 'day-photo-delete': deleteDayPhoto(); break;
      case 'photo-retake': $('#photo-input').click(); break;
      case 'photo-save': savePhoto(); break;
      case 'photo-close': closePhoto(); break;
      case 'photo-flip':
        setPhotoFlip(!photoFlip);
        renderPhoto();
        break;
      case 'apply-update': applyUpdate(); break;
      case 'show-fit':
        setTab('settings');
        requestAnimationFrame(() => { const g = $('#fit-guide'); if (g) g.scrollIntoView({ block: 'start' }); });
        break;
    }
  });

  document.addEventListener('submit', e => {
    if (e.target.matches('[data-form="add-part"]')) {
      e.preventDefault();
      addPart();
    } else if (e.target.matches('[data-form="soc-auth"]')) {
      e.preventDefault();
      submitAuth();
    } else if (e.target.matches('[data-form="pw-change"]')) {
      e.preventDefault();
      changePassword();
    }
  });

  $('#import-file').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (file) importData(file);
  });

  $('#photo-crew').addEventListener('change', e => {
    if (!state.social) return;
    state.social.autoPost = e.target.checked;
    save();
  });

  // Account forms: Enter moves to the next field; Enter in the last one submits.
  const NEXT_FIELD = { 'soc-handle': ['#soc-nickname', '#soc-password'], 'soc-nickname': ['#soc-password'], 'pw-new': ['#pw-again'] };
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.isComposing || !NEXT_FIELD[e.target.id]) return;
    const next = NEXT_FIELD[e.target.id].map(s => $(s)).find(Boolean);
    if (!next) return;
    e.preventDefault();
    next.focus();
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'soc-search') searchInput(e.target.value);
    else if (e.target.id === 'soc-handle') social.form.handle = e.target.value = e.target.value.toLowerCase().replace(/\s/g, '');
    else if (e.target.id === 'soc-nickname') social.form.nickname = e.target.value;
    else if (e.target.id === 'soc-password') social.form.password = e.target.value;
  });

  $('#photo-input').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (file) openPhoto(file);
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!photoEditor.hidden) closePhoto();
    else closeSheet();
  });

  // ---------- app updates ----------
  const hasUpdate = () => Boolean(ui.latestVersion && ui.latestVersion !== APP_VERSION);

  // Icons added before v1.3.0 used status-bar-style black-translucent, which iOS saves
  // with the icon. It leaves the bottom of the screen empty (the web view is short by the
  // status bar height) and only re-adding the icon fixes it. Spot that case so the app
  // can explain what to do.
  let safeProbe = null;
  function needsReinstall() {
    if (navigator.standalone !== true) return false;
    if (!safeProbe) {
      safeProbe = document.createElement('div');
      safeProbe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top)';
      document.body.appendChild(safeProbe);
    }
    const top = parseFloat(getComputedStyle(safeProbe).paddingTop) || 0;
    const full = innerHeight >= innerWidth ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
    return top > 20 && full - innerHeight >= top - 2;
  }

  // Returns the version on the server, or null when offline.
  async function fetchLatestVersion() {
    try {
      const res = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return null;
      const { version } = await res.json();
      return typeof version === 'string' ? version : null;
    } catch (e) {
      return null;
    }
  }

  let lastCheck = 0;
  async function checkForUpdate() {
    if (Date.now() - lastCheck < 60_000) return;
    lastCheck = Date.now();
    const latest = await fetchLatestVersion();
    if (!latest || latest === ui.latestVersion) return;
    ui.latestVersion = latest;
    if (hasUpdate() && (ui.tab === 'today' || ui.tab === 'settings')) renderCurrent();
  }

  // Throws away the offline copy and reloads, so the newest files come from the server.
  // Records live in localStorage and are not touched.
  async function applyUpdate() {
    if (ui.updating) return;
    ui.updating = true;
    toast('최신 버전으로 바꾸는 중…');
    try {
      const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
      if (reg) await reg.update().catch(() => {});
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX)).map(k => caches.delete(k)));
      }
    } catch (e) { /* reload anyway */ }
    location.reload();
  }

  async function manualUpdate() {
    if (ui.updating) return;
    const latest = await fetchLatestVersion();
    if (!latest) { toast('인터넷 연결을 확인해 주세요'); return; }
    ui.latestVersion = latest;
    if (hasUpdate()) applyUpdate();
    else { toast(`이미 최신 버전이에요 (v${APP_VERSION})`); renderCurrent(); }
  }

  // The app may stay open past midnight; refresh dates when it comes back.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    renderCurrent();
    checkForUpdate();
    if (ui.tab === 'social') loadEntry(top(), { quiet: true });
  });

  // If the app is left open on screen, roll over to the new day right after midnight.
  function scheduleMidnightRefresh() {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    setTimeout(() => { renderCurrent(); scheduleMidnightRefresh(); }, next - now);
  }



  // ---------- boot ----------
  const linkedHandle = new URLSearchParams(location.search).get('u');
  if (linkedHandle) history.replaceState(null, '', location.pathname);
  renderCurrent();
  if (linkedHandle) {
    const h = linkedHandle.toLowerCase().replace(/^@/, '');
    setTab('social');
    if (loggedIn()) openProfile(h);
    else { social.pendingHandle = h; renderSocial(); }
  }
  loadPhotoThumbs();
  scheduleMidnightRefresh();
  setTimeout(checkForUpdate, 800);

  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  const isLocalDev = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  if ('serviceWorker' in navigator && !isLocalDev) {
    addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => {});
    });
  }
})();
