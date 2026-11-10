/* Smistino — service worker
   L'app resta sulla versione installata (funziona anche offline) finché
   non premi "Aggiorna": il tasto compare quando version.json annuncia
   una versione nuova. Non serve cambiare questo file a ogni rilascio. */
const CACHE = 'smistino-app';
const ASSETS = [
  './', './index.html', './css/style.css', './js/app.js', './js/classificatore.js', './js/importa.js', './js/esempi.js',
  './js/aggiornamenti.js', './js/ponte.js', './manifest.webmanifest', './ponte/Codice.gs',
  './icons/logo.svg', './icons/icon-32.png', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  // solo le copie vecchie di QUESTA app: le altre app sullo stesso indirizzo hanno le loro
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k.split('-')[0] === CACHE.split('-')[0]).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function fromNetwork(req, key) {
  return fetch(req).then(res => {
    if (res && (res.ok || res.type === 'opaque')) {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(key || req, copy));
    }
    return res;
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.endsWith('version.json')) return; // controllo aggiornamenti: sempre dalla rete

  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html').then(hit => hit || caches.match(req, { ignoreSearch: true }))
        .then(hit => hit || fromNetwork(req, './index.html'))
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // file dell'app e font: prima la copia installata (le chiamate agli script Google vanno sempre in rete)
  const font = url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com');
  if (url.origin === self.location.origin || font) {
    e.respondWith(
      caches.match(req, { ignoreSearch: url.origin === self.location.origin })
        .then(hit => hit || fromNetwork(req))
        .catch(() => caches.match(req))
    );
  }
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// tocco sulle notifiche (nuovi messaggi, scadenze)
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const d = e.notification.data || {};
  let qs = '';
  if (d.tipo === 'scadenza' && d.id) qs = '?scadenza=' + encodeURIComponent(d.id);
  else if (d.tipo === 'posta') qs = '?vai=posta';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) { c.postMessage(d); return c.focus(); }
      return self.clients.openWindow('./' + qs);
    })
  );
});
