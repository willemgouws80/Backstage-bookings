const CACHE = 'backstage-portal-v3';
const ASSETS = [
  '/portal.html',
  '/New_Backstage_logo.png',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;500;600;700&display=swap',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // Page navigations: network-first so the latest build is always served,
  // with the cached copy as an offline fallback.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.ok && new URL(e.request.url).origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then(c => { try { c.put(e.request, copy); } catch(_) {} });
          }
          return res;
        })
        .catch(() => caches.match(e.request).then(p => p || new Response('Offline', { status: 503, statusText: 'Offline' })))
    );
    return;
  }

  // Everything else: cache-first, and never resolve to undefined.
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).catch(() => new Response('', { status: 404 }))
    )
  );
});
