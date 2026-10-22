// Rainbow Stars: speichert die App für die Offline-Nutzung
const CACHE = 'rainbow-stars-v16';
const FILES = ['./', './index.html', './three.min.js', './app.js', './learn.js', './math.js', './rewards.js', './raetsel.js', './profiles.js', './parents.js', './books.js', './needs.js', './worlds/space.js', './worlds/time.js', './content/time.json', './content/space.json', './content/quiz.json', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // geteilte Figuren (Supabase) immer frisch aus dem Netz; die App speichert sie selbst für offline
  const u = new URL(e.request.url);
  if (u.origin !== location.origin && !u.hostname.startsWith('fonts.g')) return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
    if (res.ok && (new URL(e.request.url).origin === location.origin || e.request.url.includes('fonts.g'))) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => hit)));
});
