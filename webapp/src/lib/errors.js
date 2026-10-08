// Fehler der App an die Uhr melden (GET /api/clientlog zeigt die letzten 20) – zur Fehlersuche auf dem Handy.
// Gleiche Meldungen höchstens einmal pro Minute.
const sent = new Map();
export function report(kind, message, stack) {
  const msg = String(message || '').slice(0, 300);
  const key = kind + msg;
  if (Date.now() - (sent.get(key) || 0) < 60000) return;
  sent.set(key, Date.now());
  const body = JSON.stringify({
    k: kind, m: msg, s: String(stack || '').split('\n').slice(0, 4).join(' | ').slice(0, 400),
    p: location.hash, sa: matchMedia('(display-mode: standalone)').matches, ua: navigator.userAgent.replace(/^Mozilla\/5\.0 /, '').slice(0, 110),
  });
  try { fetch('/api/clientlog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {}); } catch (e) { /* egal */ }
}

export function installErrorReporting() {
  window.addEventListener('error', e => report('error', e.message, e.error && e.error.stack));
  window.addEventListener('unhandledrejection', e => {
    const r = e.reason || {};
    if (r.name === 'AbortError') return; // abgebrochene Abfragen sind kein Fehler
    report('promise', r.message || String(r), r.stack);
  });
  // Jeder Start der App: "reload" ohne eigenes Neuladen deutet auf einen Absturz des Tabs hin
  const nav = (performance.getEntriesByType('navigation')[0] || {}).type || '?';
  let own = false;
  try { own = sessionStorage.getItem('ownReload') === '1'; sessionStorage.removeItem('ownReload'); } catch (e) { /* privat */ }
  report('start', `${nav}${own ? ' (eigenes Neuladen)' : ''}`, '');
}

// Für eigenes Neuladen (Sprache, Update) vorher markieren
export function reloadApp() {
  try { sessionStorage.setItem('ownReload', '1'); } catch (e) { /* privat */ }
  location.reload();
}
