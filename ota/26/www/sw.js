// Service Worker: hält die App-Hülle offline bereit. Gerätedaten (/api) kommen immer frisch von der Uhr.
const CACHE = "azan-wecker-v4";
const ROOT = new URL(self.registration.scope).pathname; // "/" auf der Uhr, bei der Web-App im Netz ggf. "/ordner/"

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Netz zuerst (die Uhr liefert immer den neuesten Stand), bei Fehler aus dem Cache
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith(ROOT + "api/")) return;
  const key = url.pathname === ROOT + "index.html" ? ROOT : url.pathname;
  e.respondWith(fetch(e.request).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)); }
    return res;
  }).catch(() => caches.match(key).then(r => r || caches.match(ROOT))));
});
