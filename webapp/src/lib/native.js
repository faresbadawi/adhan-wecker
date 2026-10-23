// Brücke zur Android-App (window.BilalNative) und kleiner Speicher für Handy-Daten.
// Ohne Android-App (Browser, installierte Web-App) läuft alles über localStorage.
export const native = () => (typeof window !== 'undefined' && window.BilalNative) || null;
export const hasNative = () => !!native();

// Handy-Daten dauerhaft speichern (in der Android-App in den SharedPreferences, sonst localStorage);
// die Android-App teilt sie zwischen der Oberfläche aus dem Bündel und der von der Uhr
export function kvGet(key, def = null) {
  try {
    const n = native();
    const v = n ? n.getState(key) : localStorage.getItem('ph:' + key);
    return v ? JSON.parse(v) : def;
  } catch (e) { return def; }
}
export function kvSet(key, val) {
  try {
    const s = JSON.stringify(val);
    const n = native();
    if (n) n.setState(key, s); else localStorage.setItem('ph:' + key, s);
  } catch (e) { /* voll oder gesperrt */ }
}
export function kvDel(key) {
  try { const n = native(); if (n) n.setState(key, ''); else localStorage.removeItem('ph:' + key); } catch (e) { /* egal */ }
}

// Asynchrone Aufrufe der Android-App: sie antwortet über window.__bilalCb(id, ok, text)
const waiting = {};
let nextId = 0;
if (typeof window !== 'undefined') {
  window.__bilalCb = (id, ok, text) => {
    const w = waiting[id];
    if (!w) return;
    delete waiting[id];
    if (ok) w.res(text); else w.rej(new Error(text));
  };
}
// Webseite über die Android-App laden (ohne Browser-Sperre CORS), z. B. die Moscheeseite von Mawaqit
export function nativeFetchText(url) {
  return new Promise((res, rej) => {
    const n = native();
    if (!n) { rej(new Error('no-native')); return; }
    const id = ++nextId;
    waiting[id] = { res, rej };
    setTimeout(() => { if (waiting[id]) { delete waiting[id]; rej(new Error('timeout')); } }, 30000);
    n.fetchText(id, url);
  });
}
