const V = 'amb-v9', FILES = ['./', 'index.html', 'app.js', 'engine.js', 'form.json', 'cover.jpg', 'splash.jpg', 'symptoms.jpg', 'signs.jpg', 'clinical.jpg', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon.png'];
const tell = m => self.clients.matchAll({ includeUncontrolled: true }).then(cs => cs.forEach(c => c.postMessage(m)));
self.addEventListener('install', e => e.waitUntil((async () => {
  const c = await caches.open(V); let n = 0;
  for (const f of FILES) { await c.add(new Request(f, { cache: 'reload' })); tell({ type: 'progress', pct: Math.round(++n / FILES.length * 100), v: V }); }
})()));
self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
