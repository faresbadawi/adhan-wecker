// Zentrale für die Bilal-Uhren.
//   POST /api/hello            Uhr meldet sich (alle 10 Minuten); Antwort {"update":true}, wenn sie aktualisieren soll
//   GET  /                     Übersichtsseite (Passwort = Geheimnis ADMIN_PASSWORD)
//   GET  /admin/api/clocks     Liste der Uhren          ┐
//   POST /admin/api/update     {"ids":[…]} oder {"all":true}  ├ nur mit Authorization: Bearer <Passwort>
//   POST /admin/api/forget     {"id":"…"}               │
//   GET  /admin/api/interest   Interessenten-Liste       │
//   POST /admin/api/interest/delete {"email":"…"}        ┘
//   POST /api/interest         Produktseite: {"email","lang"} (nur von der Produktseite, gedrosselt)
import PAGE from './page.html';

const MANIFEST = 'https://faresbadawi.github.io/adhan-wecker/ota/manifest.json';
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});
const now = () => Math.floor(Date.now() / 1000);
const clip = (v, n) => String(v ?? '').slice(0, n);

async function sha256(text) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Passwort vergleichen, ohne durch die Laufzeit etwas zu verraten
async function authorized(req, env) {
  const got = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  if (!env.ADMIN_PASSWORD || !got) return false;
  const [a, b] = await Promise.all([sha256(got), sha256(env.ADMIN_PASSWORD)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hello(req, env) {
  let b;
  try { b = await req.json(); } catch { return json({ error: 'json' }, 400); }
  if (!/^[0-9a-f]{12}$/.test(b.id || '') || !/^[0-9a-f]{32}$/.test(b.secret || '')) return json({ error: 'id' }, 400);
  const hash = await sha256(b.secret);
  const row = await env.DB.prepare('SELECT secret_hash, update_wanted FROM clocks WHERE id = ?').bind(b.id).first();
  if (row && row.secret_hash !== hash) return json({ error: 'secret' }, 403);
  const t = now();
  const vals = [clip(b.name, 40), clip(b.city, 60), clip(b.country, 8), clip(b.version, 16), b.build | 0,
    Number.isFinite(b.rssi) ? b.rssi | 0 : null, Number.isFinite(b.uptime) ? b.uptime | 0 : null, t];
  if (!row) {
    await env.DB.prepare(`INSERT INTO clocks (name, city, country, version, build, rssi, uptime, last_seen, id, secret_hash, first_seen)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(...vals, b.id, hash, t).run();
    return json({ update: false });
  }
  // Update-Wunsch wird mit dieser Antwort zugestellt und dann gelöscht
  await env.DB.prepare(`UPDATE clocks SET name = ?, city = ?, country = ?, version = ?, build = ?, rssi = ?, uptime = ?,
    last_seen = ?, update_wanted = 0 WHERE id = ?`).bind(...vals, b.id).run();
  return json({ update: row.update_wanted === 1 });
}

// Produktseite: E-Mail für die Interessenten-Liste. Nur von den eigenen Seiten, höchstens 5 je Stunde und Adresse.
const ORIGINS = ['https://faresbadawi.github.io'];
const cors = req => {
  const o = req.headers.get('origin') || '';
  const ok = ORIGINS.includes(o) || /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$/.test(o);
  return ok ? { 'access-control-allow-origin': o, 'access-control-allow-methods': 'POST', 'access-control-allow-headers': 'content-type', vary: 'origin' } : null;
};
async function interest(req, env) {
  const h = cors(req);
  if (!h) return json({ error: 'origin' }, 403);
  const reply = (data, status = 200) => { const r = json(data, status); for (const [k, v] of Object.entries(h)) r.headers.set(k, v); return r; };
  if (req.method === 'OPTIONS') return reply({});
  let b;
  try { b = await req.json(); } catch { return reply({ error: 'json' }, 400); }
  if (b.website) return reply({ ok: true }); // Falle für Bots: verstecktes Feld ausgefüllt
  const email = String(b.email || '').trim().toLowerCase();
  if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return reply({ error: 'email' }, 400);
  const ipHash = (await sha256('bilal:' + (req.headers.get('cf-connecting-ip') || ''))).slice(0, 16);
  const t = now();
  const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM interest WHERE ip_hash = ? AND created > ?').bind(ipHash, t - 3600).first();
  if (recent && recent.n >= 5) return reply({ error: 'later' }, 429);
  await env.DB.prepare('INSERT OR IGNORE INTO interest (email, lang, created, ip_hash) VALUES (?, ?, ?, ?)')
    .bind(email, clip(b.lang, 4), t, ipHash).run();
  return reply({ ok: true });
}

async function latest() {
  try {
    const r = await fetch(MANIFEST, { cf: { cacheTtl: 120 } });
    const m = await r.json();
    return { build: m.build | 0, version: m.version || '' };
  } catch { return { build: 0, version: '' }; }
}

async function admin(req, env, path) {
  if (!await authorized(req, env)) return json({ error: 'login' }, 401);
  if (path === '/admin/api/clocks' && req.method === 'GET') {
    const [{ results }, l] = await Promise.all([
      env.DB.prepare('SELECT id, name, city, country, version, build, rssi, uptime, first_seen, last_seen, update_wanted FROM clocks ORDER BY name COLLATE NOCASE').all(),
      latest(),
    ]);
    return json({ now: now(), latest: l, clocks: results });
  }
  if (path === '/admin/api/interest' && req.method === 'GET') {
    const { results } = await env.DB.prepare('SELECT email, lang, created FROM interest ORDER BY created DESC').all();
    return json({ interest: results });
  }
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const b = await req.json().catch(() => ({}));
  if (path === '/admin/api/interest/delete') {
    await env.DB.prepare('DELETE FROM interest WHERE email = ?').bind(String(b.email || '')).run();
    return json({ ok: true });
  }
  if (path === '/admin/api/update') {
    if (b.all) await env.DB.prepare('UPDATE clocks SET update_wanted = 1').run();
    else for (const id of (b.ids || []).slice(0, 200)) await env.DB.prepare('UPDATE clocks SET update_wanted = 1 WHERE id = ?').bind(String(id)).run();
    return json({ ok: true });
  }
  if (path === '/admin/api/forget') {
    await env.DB.prepare('DELETE FROM clocks WHERE id = ?').bind(String(b.id || '')).run();
    return json({ ok: true });
  }
  return json({ error: 'not found' }, 404);
}

export default {
  async fetch(req, env) {
    const { pathname } = new URL(req.url);
    if (pathname === '/api/hello' && req.method === 'POST') return hello(req, env);
    if (pathname === '/api/interest' && (req.method === 'POST' || req.method === 'OPTIONS')) return interest(req, env);
    if (pathname.startsWith('/admin/api/')) return admin(req, env, pathname);
    if (pathname === '/' || pathname === '/index.html') {
      return new Response(PAGE, { headers: {
        'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store',
        'content-security-policy': "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'unsafe-inline'; connect-src 'self'",
        'x-frame-options': 'DENY', 'referrer-policy': 'no-referrer',
      } });
    }
    return new Response('Nicht gefunden', { status: 404 });
  },
};
