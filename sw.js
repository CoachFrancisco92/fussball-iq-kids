// Offline-Cache für Fußball-IQ Kids: erst Netz (immer aktueller Stand), ohne Netz aus dem Cache.
const CACHE = 'fiq-v0.4.0';
const FILES = ['./', './index.html', './content/texte.js?v=0.4.0', './missions/mission-1.js?v=0.4.0', './missions/welches-tor-ist-frei.js?v=0.4.0', './engine.js?v=0.4.0', './app.js?v=0.4.0', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then((res) => {
    if (res.ok && new URL(e.request.url).origin === location.origin) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html'))));
});
