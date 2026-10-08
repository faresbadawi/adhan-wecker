// Service Worker: hält die App-Hülle offline bereit. Gerätedaten (/api) kommen immer frisch vom Netz.
const CACHE = "azan-clock-v25";
const SHELL = ["/", "/app.css", "/js/app.js", "/js/i18n.js", "/manifest.json",
  "/icons/icon-192.png", "/icons/icon-512.png", "/icons/favicon.png", "/icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Netz zuerst (die Uhr liefert immer den neuesten Stand), bei Fehler aus dem Cache
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  const key = url.pathname === "/index.html" ? "/" : url.pathname;
  e.respondWith(fetch(e.request).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)); }
    return res;
  }).catch(() => caches.match(key).then(r => r || caches.match("/"))));
});
