// Offline support.
// App files: network first (bypassing the HTTP cache) so a new release shows up the
// next time the app opens; if the network is slow (gym basements) or gone, fall back
// to the saved copy after a few seconds.
// Web fonts: cache first, they never change.
const CACHE = 'gym-check-v3';
const NETWORK_TIMEOUT_MS = 3000;
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
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS.map(url => new Request(url, { cache: 'reload' }))))
  );
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

  if (url.origin === self.location.origin) {
    if (url.pathname.endsWith('/version.json')) return; // always straight from the server
    event.respondWith(networkFirst(event));
  } else if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheFirst(req));
  }
});

// Safari refuses redirected responses for navigations; hand back a clean copy.
function clean(res) {
  if (!res.redirected) return res;
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: res.headers });
}

async function networkFirst(event) {
  const req = event.request;
  const cache = await caches.open(CACHE);
  const network = fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(res => {
    if (res.ok) {
      const copy = clean(res.clone());
      return cache.put(req, copy).then(() => res);
    }
    return res;
  });
  event.waitUntil(network.catch(() => {}));

  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT_MS));
    return clean(await Promise.race([network, timeout]));
  } catch (e) {
    const cached = (await cache.match(req, { ignoreSearch: true }))
      || (req.mode === 'navigate' ? await cache.match('./index.html') : undefined);
    if (cached) return cached;
    // Nothing saved yet: keep waiting for the network.
    return network.then(clean).catch(() => Response.error());
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) await cache.put(req, res.clone());
  return res;
}
