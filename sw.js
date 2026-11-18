/* Officina 3D offline: the app shell and the 3D libraries stay in the browser cache.
   Pages: network first (updates arrive), cache when offline. Libraries and fonts: cache first.
   JARVIS's endpoints and the assistant's WebSocket are never cached. Built by crea_sito.py. */
const V = 'officina3d-9a1427a61f';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icona.svg', 'icona-192.png', 'icona-512.png'];
const CDN = ["https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js", "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js", "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/TransformControls.js", "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js", "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/exporters/GLTFExporter.js", "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.0/dist/umd/supabase.js"];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => Promise.all([
    ...SHELL.map(u => c.add(u).catch(() => {})),
    ...CDN.map(u => c.add(new Request(u, {mode: 'cors'})).catch(() => {})),
  ])));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('officina3d-') && k !== V).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.pathname.includes('/api/') || u.pathname.endsWith('/ws')) return;
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(V).then(c => c.put('index.html', cp)); return res; })
      .catch(() => caches.match('index.html')));
    return;
  }
  if (/supabase\.co$/.test(u.host)) return;  // sync and sign-in: always live, never cached
  const lib = u.origin !== location.origin && /cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com/.test(u.host);
  if (lib || u.origin === location.origin) {
    e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => {
      if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); }
      return res;
    })));
  }
});
