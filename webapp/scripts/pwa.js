// Nach "vite build --mode pwa": Azan-Stimmen dazulegen, Manifest auf relative Pfade stellen und einen Service Worker
// erzeugen, der die ganze App (auch die Azan-Dateien beim ersten Abspielen) offline bereithält.
import { cpSync, readFileSync, writeFileSync, readdirSync, statSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = fileURLToPath(new URL('../../pwa/', import.meta.url));
const muez = fileURLToPath(new URL('../../muezzins/', import.meta.url));
cpSync(muez, join(out, 'azans'), { recursive: true, filter: s => !s.endsWith('.md') });
rmSync(join(out, 'bg'), { recursive: true, force: true });

// Manifest: relative Pfade
const mp = join(out, 'manifest.json');
const m = JSON.parse(readFileSync(mp, 'utf8'));
m.id = './'; m.start_url = './?app=1'; m.scope = './';
for (const i of m.icons || []) i.src = i.src.replace(/^\//, '');
delete m.share_target;
writeFileSync(mp, JSON.stringify(m, null, 2));

// Dateiliste für den Service Worker (ohne die großen Azan-Dateien: sie werden beim ersten Hören gespeichert)
const files = [];
const walk = d => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else files.push(relative(out, p)); } };
walk(out);
const shell = files.filter(f => !f.startsWith('azans/') && f !== 'sw.js').map(f => (f === 'index.html' ? './' : f));
const version = Date.now().toString(36);
const sw = `// Service Worker der Web-App (automatisch erzeugt): alles offline bereit, Azan-Dateien nach dem ersten Abspielen.
const CACHE = "bilal-pwa-${version}";
const SHELL = ${JSON.stringify(shell)};
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
`;
writeFileSync(join(out, 'sw.js'), sw);
console.log('pwa: ' + shell.length + ' Dateien im Offline-Speicher');
