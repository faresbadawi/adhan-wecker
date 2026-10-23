// Gebetszeiten auf dem Handy – gleiche Quellen wie die Uhr:
//  1. Moschee (Mawaqit): ganzes Jahr aus der Moscheeseite (nur über die Android-App, wegen der Browser-Sperre CORS)
//  2. Berechnung: Monatskalender von Aladhan (api.aladhan.com), wird nach dem Laden gespeichert
//  3. ohne Netz: eigene Berechnung (adhan-js), kann um 1–2 Minuten von Aladhan abweichen
import * as adhan from 'adhan';
import { kvGet, kvSet, kvDel, hasNative, nativeFetchText } from './native.js';

export const KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
export const DAILY = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const two = n => String(n).padStart(2, '0');
export const hm = m => `${two(Math.floor(((m % 1440) + 1440) % 1440 / 60))}:${two(((m % 60) + 60) % 60)}`;

// ---------- Zeitzone
export const deviceTz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; } };
function parts(ms, tz) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return Object.fromEntries(f.formatToParts(new Date(ms)).map(x => [x.type, x.value]));
}
// Datum und Uhrzeit des Ortes zu einem Zeitpunkt
export function zoned(ms, tz) {
  const p = parts(ms, tz);
  return { y: +p.year, m: +p.month, d: +p.day, sec: +p.hour * 3600 + +p.minute * 60 + +p.second };
}
const offsetMs = (tz, ms) => { const p = parts(ms, tz); return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000; };
// Zeitpunkt (ms) für Datum + Minute seit Mitternacht in der Zeitzone des Ortes
export function epochOf(y, m, d, minutes, tz) {
  const guess = Date.UTC(y, m - 1, d, 0, 0, 0) + minutes * 60000;
  let t = guess - offsetMs(tz, guess);
  t = guess - offsetMs(tz, t);
  return t;
}
export function addDays(y, m, d, n) { const x = new Date(Date.UTC(y, m - 1, d + n, 12)); return { y: x.getUTCFullYear(), m: x.getUTCMonth() + 1, d: x.getUTCDate() }; }

// ---------- Hijri-Datum (Umm al-Qura, wie Aladhan für die meisten Methoden)
export function hijriOf(y, m, d) {
  try {
    const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC' });
    const p = Object.fromEntries(f.formatToParts(new Date(Date.UTC(y, m - 1, d, 12))).map(x => [x.type, x.value]));
    return { day: +p.day, month: +p.month, year: +p.relatedYear || +p.year };
  } catch (e) { return { day: 0, month: 0, year: 0 }; }
}

// ---------- Berechnung (Reserve ohne Netz)
const ANGLES = { 12: [12, 12], 14: [16, 15], 17: [20, 18], 18: [18, 18], 19: [18, 17], 20: [20, 18], 21: [19, 17], 23: [18, 18], 0: [16, 14], 8: [19.5, null] };
function paramsFor(method, school, coords) {
  const M = adhan.CalculationMethod;
  const table = { 3: M.MuslimWorldLeague, 4: M.UmmAlQura, 5: M.Egyptian, 1: M.Karachi, 2: M.NorthAmerica, 7: M.Tehran, 16: M.Dubai, 15: M.MoonsightingCommittee, 9: M.Kuwait, 10: M.Qatar, 11: M.Singapore, 13: M.Turkey };
  let p;
  if (table[method]) p = table[method]();
  else {
    p = M.Other();
    const a = ANGLES[method] || [18, 17];
    p.fajrAngle = a[0];
    if (a[1] != null) p.ishaAngle = a[1]; else p.ishaInterval = 90;
  }
  p.madhab = school === 1 ? adhan.Madhab.Hanafi : adhan.Madhab.Shafi;
  try { p.highLatitudeRule = adhan.HighLatitudeRule.recommended(coords); } catch (e) { /* Standard */ }
  return p;
}
function minutesIn(date, tz) { const p = parts(date.getTime(), tz); return +p.hour * 60 + +p.minute + (+p.second >= 30 ? 1 : 0); }
function calcDay(P, y, m, d) {
  const tz = P.timezone || deviceTz();
  const c = new adhan.Coordinates(P.latitude, P.longitude);
  const pt = new adhan.PrayerTimes(c, new Date(y, m - 1, d, 12), paramsFor(P.method, P.madhhab, c));
  return KEYS.map(k => minutesIn(pt[k], tz));
}

// ---------- Aladhan-Monatskalender
const alKey = (P, y, m) => `al:${(+P.latitude).toFixed(3)}:${(+P.longitude).toFixed(3)}:${P.method}:${P.madhhab}:${y}-${m}`;
const hhmm = s => { const x = /(\d\d):(\d\d)/.exec(s || ''); return x ? +x[1] * 60 + +x[2] : -1; };
async function fetchAladhan(P, y, m) {
  const url = `https://api.aladhan.com/v1/calendar/${y}/${m}?latitude=${P.latitude}&longitude=${P.longitude}&method=${P.method}&school=${P.madhhab}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('aladhan ' + r.status);
  const j = await r.json();
  const days = (j.data || []).map(x => {
    const t = x.timings || {};
    const min = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(k => hhmm(t[k]));
    const h = x.date && x.date.hijri;
    return { min, h: h ? [+h.day, +h.month.number, +h.year] : null };
  });
  if (days.length < 28 || days.some(d => d.min.some(v => v < 0))) throw new Error('aladhan data');
  return days;
}

// ---------- Mawaqit (nur Android-App)
function findConfData(html) {
  const key = html.indexOf('confData');
  if (key < 0) return null;
  const start = html.indexOf('{', key);
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; }
    else if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return html.slice(start, i + 1);
  }
  return null;
}
async function fetchMawaqit(slug) {
  const html = await nativeFetchText('https://mawaqit.net/de/' + encodeURIComponent(slug));
  const raw = findConfData(html);
  if (!raw) throw new Error('mawaqit conf');
  const conf = JSON.parse(raw);
  const cal = conf.calendar;
  if (!Array.isArray(cal) || cal.length < 12) throw new Error('mawaqit calendar');
  // Meist 6 Zeiten [Fajr, Shuruq, Dhuhr, Asr, Maghrib, Isha]; bei 7 Zeiten: Fajr = erste, Rest = die letzten fünf
  const year = cal.map(month => {
    const out = {};
    for (const [day, t] of Object.entries(month || {})) {
      const n = t.length;
      if (n < 6) continue;
      const idx = [0, n - 5, n - 4, n - 3, n - 2, n - 1];
      const min = idx.map(i => hhmm(t[i]));
      if (min.every(v => v >= 0)) out[+day] = min;
    }
    return out;
  });
  return { year, tz: conf.timezone || '' };
}

// ---------- Zugriff
function cachedDay(P, y, m, d) {
  if (P.source === 'mawaqit' && P.mawaqit && P.mawaqit.slug) {
    const c = kvGet(`mq:${P.mawaqit.slug}:${y}`);
    const row = c && c.year && c.year[m - 1] && c.year[m - 1][d];
    if (row) return { min: row, h: null, src: 'mawaqit' };
    return null;
  }
  const c = kvGet(alKey(P, y, m));
  return c && c[d - 1] ? { ...c[d - 1], src: 'aladhan' } : null;
}

// Zeiten eines Tages (Minuten seit Mitternacht im Ort, mit Korrekturen) – sofort, aus Speicher oder Berechnung
export function dayTimes(P, y, m, d) {
  let base = cachedDay(P, y, m, d);
  if (!base) base = { min: calcDay(P, y, m, d), h: null, src: 'calc' };
  const off = P.offsets || {};
  const adj = [off.fajr, 0, off.dhuhr, off.asr, off.maghrib, off.isha].map(v => v || 0);
  const min = base.min.map((v, i) => Math.max(0, Math.min(1439, v + adj[i])));
  const h = base.h ? { day: base.h[0], month: base.h[1], year: base.h[2] } : hijriOf(y, m, d);
  return { min, hijri: h, src: base.src };
}

// Längste sinnvolle Verschiebung des Azans (wie auf der Uhr): Fajr bis kurz vor Sonnenaufgang,
// sonst bis kurz vor dem nächsten Gebet, Isha bis Mitternacht
export function maxDelay(min, i) {
  const own = min[[0, 2, 3, 4, 5][i]];
  const limit = [min[1], min[3], min[4], min[5], 1440][i];
  return Math.max(0, Math.min(240, limit - own - 1));
}

// Daten für die nächsten Monate laden und speichern; false, wenn nichts neu geladen werden konnte
export async function ensureData(P, months = 3) {
  if (!P || P.latitude == null) return false;
  const tz = P.timezone || deviceTz();
  const now = zoned(Date.now(), tz);
  let changed = false;
  const keep = [];
  if (P.source === 'mawaqit' && P.mawaqit && P.mawaqit.slug && hasNative()) {
    for (const y of [now.y, now.y + (now.m >= 11 ? 1 : 0)]) {
      const key = `mq:${P.mawaqit.slug}:${y}`;
      keep.push(key);
      if (kvGet(key) || y !== now.y) continue; // Kalender gilt für das laufende Jahr
      try { kvSet(key, await fetchMawaqit(P.mawaqit.slug)); changed = true; } catch (e) { /* offline */ }
    }
  } else {
    for (let i = 0; i < months; i++) {
      const mm = ((now.m - 1 + i) % 12) + 1, yy = now.y + Math.floor((now.m - 1 + i) / 12);
      const key = alKey(P, yy, mm);
      keep.push(key);
      if (kvGet(key)) continue;
      try { kvSet(key, await fetchAladhan(P, yy, mm)); changed = true; } catch (e) { /* offline */ }
    }
  }
  // Alte oder nicht mehr passende Kalender entfernen
  const idx = kvGet('cacheIdx', []);
  for (const k of idx) if (!keep.includes(k)) kvDel(k);
  kvSet('cacheIdx', keep);
  return changed;
}
