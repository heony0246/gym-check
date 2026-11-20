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
  // Characters for the 오운완 photo (stickers/sN.png, cut out from pic/ and pic2/).
  const STICKERS = Array.from({ length: 18 }, (_, i) => `s${i + 1}`);
  const BUILTIN_IDS = new Set(DEFAULT_PARTS.map(p => p.id));
  const CUSTOM_COLORS = ['#F472B6', '#818CF8', '#A3E635', '#2DD4BF', '#FB7185', '#94A3B8', '#E879F9', '#C08457'];
  const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
  const WEEKDAYS_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const MAX_NAME = 8;
  const STALE_DAYS = 7;
  // Bump together with version.json on every release so phones notice the update.
  const APP_VERSION = '1.8.0';
  const CACHE_PREFIX = 'gym-check';

  const svg = (d, w = 2.4) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  const ICON = {
    check: svg('M5 12.5l4.5 4.5L19 7.5', 3.2),
    prev: svg('M15 5l-7 7 7 7'),
    next: svg('M9 5l7 7-7 7'),
    chart: svg('M5 20v-7M12 20V5M19 20v-10', 2.2),
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
    return { version: 1, parts: DEFAULT_PARTS.map(p => ({ ...p })), records: {}, weeklyGoal: 4, lastBackup: null, photoSticker: 's1', photoFormat: 'orig' };
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
    if (src.photoSticker === null || STICKERS.includes(src.photoSticker)) out.photoSticker = src.photoSticker;
    if (src.photoFormat === 'orig' || src.photoFormat === 'story') out.photoFormat = src.photoFormat;
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
    const days = Object.keys(next.records).length;
    const nowDays = Object.keys(state.records).length;
    const msg = `백업 파일: 출석 기록 ${days}일${photos.length ? `, 사진 ${photos.length}장` : ''}\n`
      + `지금 기록(${nowDays}일)을 이 파일 내용으로 바꿀까요?`
      + (photos.length ? '\n사진은 지금 있는 사진에 더해지고, 같은 날짜는 파일 사진으로 바뀌어요.' : '');
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

  const stickerCache = new Map();
  function loadSticker(id) {
    if (!STICKERS.includes(id)) return Promise.resolve(null);
    if (!stickerCache.has(id)) {
      const img = new Image();
      img.src = `stickers/${id}.png`;
      stickerCache.set(id, img.decode().then(() => img).catch(() => { stickerCache.delete(id); return null; }));
    }
    return stickerCache.get(id);
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

  async function composePhoto(src, stickerId, flip, format) {
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

    const [sticker] = await Promise.all([
      stickerId ? loadSticker(stickerId) : null,
      ensurePhotoFonts(headline + dateLine + badgeText),
    ]);

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

    // Bottom right: the chosen character, standing on the bottom edge.
    let textMaxW = W - m * 2;
    if (sticker) {
      const portrait = H >= W;
      const maxH = H * (story ? 0.34 : portrait ? 0.44 : 0.66);
      // Lying/wide poses (crunch) get more width so they don't end up tiny.
      const wide = sticker.naturalWidth > sticker.naturalHeight;
      const maxSW = W * (portrait ? (wide ? 0.46 : 0.36) : (wide ? 0.38 : 0.3));
      const k = Math.min(maxH / sticker.naturalHeight, maxSW / sticker.naturalWidth);
      const sw = sticker.naturalWidth * k;
      const sh = sticker.naturalHeight * k;
      const sx = W - sw - m * 0.5;
      const sy = H - sh - (story ? bottom - 4 * u : m * 0.3);
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.45)';
      ctx.shadowBlur = 3 * u;
      ctx.shadowOffsetY = 0.8 * u;
      ctx.drawImage(sticker, sx, sy, sw, sh);
      ctx.restore();
      textMaxW = sx - m - 2 * u;
    }

    // Bottom left: the headline only, sized to stay clear of the character.
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
    const [sticker] = await Promise.all([
      state.photoSticker ? loadSticker(state.photoSticker) : null,
      ensurePhotoFonts(`${kicker}${mo + 1}월 결산헬스장 간 날출석률최장 연속최다 부위${topText}월화수목금토일GYM CHECK0123456789/%일`),
    ]);

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

    // Character on the right of the big number.
    if (sticker) {
      const k = Math.min(520 / sticker.naturalHeight, 420 / sticker.naturalWidth);
      const sw = sticker.naturalWidth * k;
      const sh = sticker.naturalHeight * k;
      ctx.drawImage(sticker, W - P * 0.6 - sw, 680 - sh, sw, sh);
    }

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
  const photoStickers = $('#photo-stickers');
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

  function renderStickerPicker() {
    syncFormatButtons();
    const cur = state.photoSticker;
    photoStickers.innerHTML =
      `<button class="pe-sticker none" data-action="photo-sticker" data-id="" aria-pressed="${!cur}" aria-label="캐릭터 없이">없음</button>` +
      STICKERS.map((id, i) =>
        `<button class="pe-sticker" data-action="photo-sticker" data-id="${id}" aria-pressed="${cur === id}" aria-label="캐릭터 ${i + 1}"><img src="stickers/${id}-thumb.png" alt="" loading="lazy" decoding="async"></button>`
      ).join('');
    // Bring the remembered pick into view in the scrolling row.
    const picked = photoStickers.querySelector('.pe-sticker[aria-pressed="true"]');
    if (picked) requestAnimationFrame(() => picked.scrollIntoView({ block: 'nearest', inline: 'center' }));
  }

  function pickSticker(id) {
    state.photoSticker = STICKERS.includes(id) ? id : null;
    save();
    photoStickers.querySelectorAll('.pe-sticker').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.id || null) === state.photoSticker)));
    renderPhoto();
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
      const blob = await composePhoto(photoSource, state.photoSticker, photoFlip, state.photoFormat);
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
    renderStickerPicker();
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
    await shareOrDownload(new File([blob], `owoonwan-${key}.jpg`, { type: 'image/jpeg' }));
    const ok = await stored;
    renderCurrent();
    toast(ok ? `${md(key)} 오운완으로 저장했어요` : '앱에 저장하지 못했어요. 사진은 앨범에 저장해 두세요');
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

  // ---------- rendering ----------
  const views = {
    today: $('#view-today'),
    calendar: $('#view-calendar'),
    stats: $('#view-stats'),
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
      <p class="note tight">기록은 이 폰에만 저장돼요. 폰을 바꾸거나 브라우저 데이터를 지우기 전에 꼭 내보내기 해 두세요. 백업 파일에는 기록과 앱에 저장한 오운완 사진이 함께 들어가요.</p>

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

  const RENDER = { today: renderToday, calendar: renderCalendar, stats: renderStats, settings: renderSettings };

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
      case 'import': $('#import-file').click(); break;
      case 'update': manualUpdate(); break;
      case 'photo': startPhoto(); break;
      case 'day-photo-add': startPhoto(ui.sheetDate); break;
      case 'day-photo-share': shareDayPhoto(); break;
      case 'day-photo-delete': deleteDayPhoto(); break;
      case 'photo-retake': $('#photo-input').click(); break;
      case 'photo-save': savePhoto(); break;
      case 'photo-close': closePhoto(); break;
      case 'photo-sticker': pickSticker(el.dataset.id); break;
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
    }
  });

  $('#import-file').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (file) importData(file);
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
  });

  // If the app is left open on screen, roll over to the new day right after midnight.
  function scheduleMidnightRefresh() {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    setTimeout(() => { renderCurrent(); scheduleMidnightRefresh(); }, next - now);
  }



  // ---------- boot ----------
  renderCurrent();
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
