// Offline support: answer from cache right away (gyms often have bad signal),
// then refresh the cache from the network in the background.
const CACHE = 'gym-check-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];
// Web fonts (Barlow Condensed, Pretendard) are cached the same way once loaded.
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !FONT_HOSTS.includes(url.hostname)) return;

  const network = fetch(req)
    .then(res => {
      if (!res.ok) return res;
      const copy = res.clone();
      return caches.open(CACHE).then(cache => cache.put(req, copy)).then(() => res);
    })
    .catch(() => null);
  event.waitUntil(network);

  event.respondWith(
    caches.match(req, { ignoreSearch: sameOrigin })
      .then(cached => cached || network)
      .then(res => res || (req.mode === 'navigate' ? caches.match('./index.html') : null))
      .then(res => res || Response.error())
  );
});
