// Service Worker der Web-App (automatisch erzeugt): alles offline bereit, Azan-Dateien nach dem ersten Abspielen.
const CACHE = "bilal-pwa-mvlk5mnd";
const SHELL = ["assets/app.js","assets/p-BVNUhOOf-CPT2BVJr.js","assets/p-C1AxSUnp-rYGe6s9V.js","assets/p-Ct2aBEue-DSA0eRZM.js","assets/p-DD92Fw3n-DuL_pGOm.js","assets/p-YNnH1_Hs-DqXwl2AG.js","assets/p-ZjP4CjeZ-DJ1DGIsW.js","assets/style.css","icons/apple-touch-icon.png","icons/favicon.png","icons/icon-192.png","icons/icon-512.png","icons/maskable-512.png","./","manifest.json"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // Aladhan, Karten, Schriften: immer direkt
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
    if (res.ok && url.pathname.includes("/azans/")) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  })));
});
