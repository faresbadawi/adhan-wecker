// Das Handy als eigenes Gerät: eigene Einstellungen, eigene Gebetszeiten, Alarme auch ohne die Uhr.
// Ist die Uhr erreichbar, gilt ihr Stand (die Handy-Daten werden von ihr übernommen); ohne Uhr antwortet localApi()
// im Format der Uhr, damit die Seiten der App unverändert funktionieren.
import TZDB from './tzdb.json';
import { t } from './i18n.js';
import { kvGet, kvSet, native, hasNative, nativeFetchText } from './native.js';
import { DAILY, KEYS, dayTimes, ensureData, epochOf, addDays, zoned, hm, maxDelay, deviceTz } from './times.js';

// Azan-Stimmen im Handy (liegen in der App bzw. auf dem Server der Web-App); fajr = eigene Fassung für Fajr
export const VOICES = [
  { id: 'alafasy', fajr: true }, { id: 'islam_sobhi', fajr: true },
  { id: 'beautiful', fajr: false }, { id: 'madinah', fajr: false },
];
export const voiceFile = (id, fajr) => { const v = VOICES.find(x => x.id === id) || VOICES[0]; return `${v.id}${fajr && v.fajr ? '_fajr' : ''}.mp3`; };

const five = v => Object.fromEntries(DAILY.map(k => [k, v]));
const DEFAULTS = {
  city: 'Braunschweig', country: 'DE', latitude: 52.2689, longitude: 10.5268, timezone: 'Europe/Berlin',
  method: 3, madhhab: 0, offsets: five(0),
  azan: five(true), azanVolume: five(90), azanDelay: five(0), azanRemind: five(0),
  source: 'calculated', mawaqit: { slug: '', name: '' },
  voice: 'alafasy', alerts: true,
  colors: { main: '#FFFFFF', accent: '#D4AF6A', muted: '#C4B6AE' },
};
const merge = (a, b) => {
  const o = { ...a };
  for (const [k, v] of Object.entries(b || {})) o[k] = v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' ? { ...a[k], ...v } : v;
  return o;
};

let P = null;
export function phone() {
  if (!P) P = merge(DEFAULTS, kvGet('P', {}));
  return P;
}
function persist() { kvSet('P', P); }

// Felder der Uhr, die das Handy übernimmt (Ort, Berechnung, Azan, Quelle) – das Handy-eigene (Stimme) bleibt
const FROM_CLOCK = ['city', 'country', 'latitude', 'longitude', 'method', 'madhhab', 'offsets', 'azan', 'azanVolume', 'azanDelay', 'azanRemind', 'source', 'mawaqit', 'timezone', 'colors'];
export function adoptClock(S) {
  if (!S) return;
  const p = phone();
  const next = { ...p };
  for (const k of FROM_CLOCK) if (S[k] !== undefined) next[k] = S[k];
  const changed = JSON.stringify(next) !== JSON.stringify(p);
  P = next;
  if (changed) persist();
  return changed;
}

// ---------- Status im Format der Uhr
const HOLIDAYS = (m, d) => {
  if (m === 1) return d === 1 ? 'new_year' : d === 10 ? 'ashura' : '';
  if (m === 7) return d === 27 ? 'isra' : '';
  if (m === 9) return d === 1 ? 'ramadan' : d === 27 ? 'qadr' : '';
  if (m === 10) return d >= 1 && d <= 3 ? 'eid_fitr' : '';
  if (m === 12) return d === 9 ? 'arafah' : d >= 10 && d <= 13 ? 'eid_adha' : '';
  return '';
};
const tzOf = p => p.timezone || deviceTz();

export function localStatus(now = Date.now()) {
  const p = phone(), tz = tzOf(p);
  const z = zoned(now, tz);
  const today = dayTimes(p, z.y, z.m, z.d);
  const tom = addDays(z.y, z.m, z.d, 1), yes = addDays(z.y, z.m, z.d, -1);
  const tomorrow = dayTimes(p, tom.y, tom.m, tom.d), yesterday = dayTimes(p, yes.y, yes.m, yes.d);
  const m = today.min;
  // nächstes Gebet
  let next = null;
  for (const k of DAILY) {
    const at = m[KEYS.indexOf(k)] * 60;
    if (at > z.sec) { next = { key: k, seconds: at - z.sec }; break; }
  }
  if (!next) next = { key: 'fajr', seconds: tomorrow.min[0] * 60 + 86400 - z.sec };
  // Nacht von Maghrib bis Fajr, letztes Drittel
  let nightStart, nightEnd, sunriseAt;
  if (z.sec < m[0] * 60) { nightStart = yesterday.min[4] - 1440; nightEnd = m[0]; sunriseAt = m[1]; }
  else { nightStart = m[4]; nightEnd = tomorrow.min[0] + 1440; sunriseAt = tomorrow.min[1] + 1440; }
  const last = Math.round(nightStart + (nightEnd - nightStart) * 2 / 3);
  const dow = new Date(Date.UTC(z.y, z.m - 1, z.d, 12)).getUTCDay();
  const times = Object.fromEntries(KEYS.map((k, i) => [k, hm(m[i])]));
  return {
    lang: '', local: true,
    device: { name: 'Bilal', firmware: 'phone', host: '', ip: '', uptime: 0, fsUsed: 0, fsTotal: 0, appUsed: 0, appTotal: 0, appUrl: '' },
    wifi: { connected: false, ssid: '', bars: 0 },
    location: { city: p.city, country: p.country },
    time: { date: `${z.y}-${String(z.m).padStart(2, '0')}-${String(z.d).padStart(2, '0')}`, clock: `${String(Math.floor(z.sec / 3600)).padStart(2, '0')}:${String(Math.floor(z.sec % 3600 / 60)).padStart(2, '0')}:${String(z.sec % 60).padStart(2, '0')}`, weekday: dow },
    prayer: { times, next, hijri: today.hijri, holiday: HOLIDAYS(today.hijri.month, today.hijri.day), friday: dow === 5, source: today.src },
    night: { lastThird: hm(last), fajr: hm(nightEnd), sunrise: hm(sunriseAt), seconds: (last - Math.floor(z.sec / 60)) * 60, alarm: false },
    azan: { playing: false },
  };
}

// ---------- Einstellungen im Format der Uhr
export function localSettings() {
  const p = phone(), tz = tzOf(p);
  const z = zoned(Date.now(), tz);
  const { min } = dayTimes(p, z.y, z.m, z.d);
  return {
    ...p, local: true,
    azanDelayMax: Object.fromEntries(DAILY.map((k, i) => [k, maxDelay(min, i)])),
    volume: 15, brightness: 100, autoDim: false, showNight: true, tahajjud: { on: false, offset: 0 }, nightBrightness: 34, background: 'noir',
    alarms: [], alarmsMax: 0, pages: [], rotate: { seconds: 0, pages: [] },
  };
}
const SETTABLE = ['city', 'country', 'latitude', 'longitude', 'method', 'madhhab', 'offsets', 'azan', 'azanVolume', 'azanDelay', 'azanRemind', 'source', 'mawaqit', 'timezone', 'colors', 'voice', 'alerts'];
export async function saveLocal(part) {
  const p = phone();
  const before = JSON.stringify([p.latitude, p.longitude, p.method, p.madhhab, p.source, p.mawaqit]);
  const next = { ...p };
  for (const k of SETTABLE) {
    if (part[k] === undefined) continue;
    let v = part[k];
    if (k === 'timezone' && v && typeof v === 'object') v = v.name;
    next[k] = v && typeof v === 'object' && !Array.isArray(v) && p[k] && typeof p[k] === 'object' ? { ...p[k], ...v } : v;
  }
  if (!(next.latitude >= -90 && next.latitude <= 90 && next.longitude >= -180 && next.longitude <= 180)) return false;
  if (next.source === 'mawaqit' && !(next.mawaqit && next.mawaqit.slug)) return false;
  if (next.timezone && !TZDB[next.timezone]) next.timezone = p.timezone;
  P = next;
  persist();
  if (before !== JSON.stringify([P.latitude, P.longitude, P.method, P.madhhab, P.source, P.mawaqit])) await ensureData(P);
  return true;
}

// ---------- Moschee (Mawaqit) prüfen – nur über die Android-App möglich
async function resolveMosque(ref) {
  if (!hasNative()) throw new Error('no-native');
  let slug = ref.slug;
  if (!slug && ref.id) {
    const html = await nativeFetchText('https://mawaqit.net/en/id/' + encodeURIComponent(ref.id));
    const m = /rel="canonical"\s+href="https:\/\/mawaqit\.net\/[a-z]{2}\/([^"/?#]+)"/i.exec(html) || /href="https:\/\/mawaqit\.net\/[a-z]{2}\/([^"/?#]+)"\s+rel="canonical"/i.exec(html);
    slug = m && m[1];
  }
  if (!slug) return null;
  const html = await nativeFetchText('https://mawaqit.net/de/' + encodeURIComponent(slug));
  const key = html.indexOf('confData');
  const start = html.indexOf('{', key);
  if (key < 0 || start < 0) return null;
  const pick = k => { const r = new RegExp('"' + k + '"\\s*:\\s*("(?:[^"\\\\]|\\\\.)*"|-?[0-9.]+)').exec(html.slice(start, start + 60000)); try { return r ? JSON.parse(r[1]) : null; } catch (e) { return null; } };
  const name = pick('name');
  if (!name || html.indexOf('"calendar"', start) < 0) return null;
  return { slug, name, country: pick('countryCode') || '', timezone: pick('timezone') || '', lat: pick('latitude') || 0, lon: pick('longitude') || 0 };
}

// ---------- Antworten im Format der Uhr; null = nicht ohne die Uhr möglich
export async function localApi(url, body) {
  const ok = data => ({ ok: true, status: 200, data });
  switch (url) {
    case '/api/status': return ok(localStatus());
    case '/api/settings':
      if (body === undefined) return ok(localSettings());
      if (!(await saveLocal(body))) return { ok: false, status: 400, data: { error: 'invalid' } };
      return ok(localSettings());
    case '/api/azan/voices': return ok({ list: VOICES.map(v => v.id), selected: phone().voice });
    case '/api/azan/voice':
      if (!VOICES.some(v => v.id === (body && body.id))) return { ok: false, status: 400, data: null };
      await saveLocal({ voice: body.id });
      return ok({ list: VOICES.map(v => v.id), selected: phone().voice });
    case '/api/azan/preview': {
      const id = (body && body.id) || phone().voice;
      playVoice(id, !!(body && body.prayer === 'fajr'));
      return ok({ ok: true });
    }
    case '/api/azan/test': playVoice(phone().voice, !!(body && body.prayer === 'fajr')); return ok({ ok: true });
    case '/api/azan/stop': stopVoice(); return ok({ ok: true });
    case '/api/device/lang': return ok({ ok: true });
    case '/api/device/setup': return ok({ ok: true });
    case '/api/mawaqit/resolve': {
      const m = await resolveMosque(body || {});
      return m ? ok(m) : { ok: false, status: 404, data: null };
    }
    default: return null;
  }
}

// ---------- Azan auf dem Handy abspielen (Vorhören: nur die ersten 5 Sekunden)
const PREVIEW_MS = 5000;
let audio = null, audioTimer = 0;
export function playVoice(id, fajr) {
  const n = native();
  if (n) { n.previewVoice(id, !!fajr); return; } // die Android-App beendet nach 5 Sekunden selbst
  stopVoice();
  audio = new Audio('azans/' + voiceFile(id, fajr));
  audio.play().catch(() => {});
  audioTimer = setTimeout(stopVoice, PREVIEW_MS);
}
export function stopVoice() {
  const n = native();
  if (n) { n.stopPreview(); return; }
  clearTimeout(audioTimer);
  if (audio) { audio.pause(); audio = null; }
}

// ---------- Alarme planen: die nächsten Wochen im Voraus, die Android-App löst sie auch ohne Netz aus
const DAYS_AHEAD = 45;
export function buildSchedule(now = Date.now()) {
  const p = phone(), tz = tzOf(p);
  const z = zoned(now, tz);
  const events = [], prayers = [];
  for (let n = 0; n < DAYS_AHEAD; n++) {
    const d = addDays(z.y, z.m, z.d, n);
    const { min } = dayTimes(p, d.y, d.m, d.d);
    DAILY.forEach((k, i) => {
      const base = min[KEYS.indexOf(k)];
      prayers.push({ t: epochOf(d.y, d.m, d.d, base, tz), k, name: t(k === 'dhuhr' && new Date(Date.UTC(d.y, d.m - 1, d.d, 12)).getUTCDay() === 5 ? 'jumuah' : k), time: hm(base) });
      const prayerName = t(k === 'dhuhr' && new Date(Date.UTC(d.y, d.m - 1, d.d, 12)).getUTCDay() === 5 ? 'jumuah' : k);
      const delay = Math.min((p.azanDelay && p.azanDelay[k]) || 0, maxDelay(min, i));
      const remind = (p.azanRemind && p.azanRemind[k]) || 0;
      if (p.azan[k]) events.push({ t: epochOf(d.y, d.m, d.d, base + delay, tz), kind: 'azan', i, k, title: prayerName, text: `${t('prayer_at')} ${hm(base)} · ${p.city}`, vol: p.azanVolume[k] ?? 90 });
      if (remind) events.push({ t: epochOf(d.y, d.m, d.d, base - remind, tz), kind: 'remind', i, k, title: prayerName, text: `${t('remind_before').replace('{m}', remind)} · ${hm(base)}` });
    });
  }
  events.sort((a, b) => a.t - b.t);
  return { version: 1, tz, voice: p.voice, alerts: p.alerts !== false, events: events.filter(e => e.t > now - 60000), prayers: prayers.filter(e => e.t > now - 3600000), labels: { next: t('next_prayer') } };
}

// Kalender nachladen und den Zeitplan an die Android-App geben (nur dort sinnvoll); gebündelt, damit schnelle Änderungen
// nur einmal zählen
let timer = 0;
export function scheduleSoon() {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    try {
      if (await ensureData(phone()) && typeof window !== 'undefined') window.dispatchEvent(new Event('bilal-data')); // genauere Zeiten da
    } catch (e) { /* offline */ }
    const n = native();
    if (!n) return;
    try { n.setSchedule(JSON.stringify(buildSchedule())); } catch (e) { /* ältere App */ }
  }, 1500);
}
