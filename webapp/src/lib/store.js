// Gemeinsamer Zustand der App: Einstellungen (S) und Status (ST) der Uhr, Speichern, Hinweise und Rückfragen.
// React-Komponenten lesen ihn mit useApp(); jede Änderung zeichnet sie neu.
import { useSyncExternalStore } from 'react';
import { t, lang } from './i18n.js';

let state = {
  S: null,          // /api/settings
  ST: null,         // /api/status
  online: false,
  stBase: 0,        // performance.now() beim letzten Status
  installEvt: null, // Chrome-Installationsangebot
  toast: null,      // { text, err, id }
  ask: null,        // { title, text, danger, resolve }
};
const listeners = new Set();
export function set(part) {
  state = { ...state, ...part };
  listeners.forEach(l => l());
}
export const get = () => state;
const subscribe = l => { listeners.add(l); return () => listeners.delete(l); };
export const useApp = () => useSyncExternalStore(subscribe, get);

// Sekundentakt getrennt vom übrigen Zustand: nur Seiten mit Uhr oder Countdown zeichnen jede Sekunde neu
let now = Date.now();
const tickers = new Set();
setInterval(() => { now = Date.now(); tickers.forEach(l => l()); }, 1000);
export const useNow = () => useSyncExternalStore(l => { tickers.add(l); return () => tickers.delete(l); }, () => now);

export async function api(url, body) {
  const opt = body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
  const r = await fetch(url, opt);
  let data = null;
  try { data = await r.json(); } catch (e) { /* leere Antwort */ }
  return { ok: r.ok, status: r.status, data };
}

let toastId = 0;
export function toast(text, err) { set({ toast: { text, err: !!err, id: ++toastId } }); }

// Rückfrage mit Abbrechen/Bestätigen; liefert true oder false
export function confirmBox(title, text, danger) {
  return new Promise(resolve => set({ ask: { title, text: text || '', danger: !!danger, resolve } }));
}

// Teil-Einstellungen speichern; die Antwort der Uhr ist der neue Gesamtstand
export async function save(part, quiet) {
  try {
    const r = await api('/api/settings', part);
    if (r.ok && r.data) { set({ S: r.data }); applyTheme(r.data.colors); }
    if (!quiet || !r.ok) toast(r.ok ? t('saved') : t('invalid'), !r.ok);
    return r.ok;
  } catch (e) { toast(t('offline'), true); return false; }
}
let saveTimer;
export function saveLater(part, quiet) { clearTimeout(saveTimer); saveTimer = setTimeout(() => save(part, quiet), 700); }

export async function refreshStatus() {
  try {
    const r = await api('/api/status');
    if (!r.ok) throw new Error();
    set({ ST: r.data, stBase: performance.now(), online: true });
    try { localStorage.setItem('status', JSON.stringify(r.data)); } catch (e) { /* privat */ }
  } catch (e) { set({ online: false }); }
}
export async function loadSettings() {
  try {
    const r = await api('/api/settings');
    if (r.ok) { set({ S: r.data }); applyTheme(r.data.colors); }
  } catch (e) { /* offline */ }
}

// Farben der Uhr übernehmen: Akzent wird die Hauptfarbe der App (Ionic "primary")
const rgb = hex => { const n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const mix = (a, b, f) => '#' + a.map((v, i) => Math.round(v + (b[i] - v) * f).toString(16).padStart(2, '0')).join('');
export function applyTheme(c) {
  if (!c || !/^#[0-9a-f]{6}$/i.test(c.accent || '')) return;
  const r = document.documentElement.style, a = rgb(c.accent);
  r.setProperty('--ion-color-primary', c.accent);
  r.setProperty('--ion-color-primary-rgb', a.join(','));
  r.setProperty('--ion-color-primary-contrast', '#17120e');
  r.setProperty('--ion-color-primary-contrast-rgb', '23,18,14');
  r.setProperty('--ion-color-primary-shade', mix(a, [0, 0, 0], 0.12));
  r.setProperty('--ion-color-primary-tint', mix(a, [255, 255, 255], 0.1));
  r.setProperty('--accent-light', mix(a, [255, 255, 255], 0.3));
  if (/^#[0-9a-f]{6}$/i.test(c.main || '')) r.setProperty('--clock-main', c.main);
  try { localStorage.setItem('colors', JSON.stringify(c)); } catch (e) { /* privat */ }
}

// ---------- kleine Helfer für die Seiten
export const locale = () => ({ ar: 'ar-u-nu-latn', de: 'de-DE', en: 'en-GB' }[lang()]);
export const mb = b => (b / 1048576).toFixed(1).replace('.', lang() === 'de' ? ',' : '.') + ' MB';
export const toMin = hm => { const [h, m] = (hm || '0:0').split(':').map(Number); return h * 60 + m; };
export const two = n => String(n).padStart(2, '0');
export function duration(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60);
  return h ? `${h} ${t('hours')} ${m} ${t('minutes')}` : `${m} ${t('minutes')}`;
}
export const hms = sec => `${two(Math.floor(sec / 3600))}:${two(Math.floor(sec % 3600 / 60))}:${two(sec % 60)}`;
export function hijri(h) {
  if (!h || !h.month) return '';
  return `${h.day} ${t('hijri_months')[h.month - 1]} ${h.year} ${lang() === 'ar' ? 'هـ' : 'AH'}`;
}
// Sekunden seit dem letzten Status (Uhr und Countdowns laufen lokal weiter)
export const elapsed = st => Math.floor((performance.now() - st.stBase) / 1000);
// aktuelle Uhrzeit der Uhr in Sekunden seit Mitternacht
export function nowSec(st) {
  if (!st.ST || !st.ST.time) return 0;
  const [h, m, s] = st.ST.time.clock.split(':').map(Number);
  return (h * 3600 + m * 60 + s + elapsed(st)) % 86400;
}
export const pname = (k, ST) => (k === 'dhuhr' && ST && ST.prayer && ST.prayer.friday ? t('jumuah') : t(k));
export const signal = n => (n >= 3 ? 'strong' : n === 2 ? 'medium' : 'weak');
export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
export const appMode = () => new URLSearchParams(location.search).has('app');
// Entfernung in km zwischen zwei Koordinaten
export function km(lat1, lon1, lat2, lon2) {
  const R = 6371, d = Math.PI / 180;
  const a = Math.sin((lat2 - lat1) * d / 2) ** 2 + Math.cos(lat1 * d) * Math.cos(lat2 * d) * Math.sin((lon2 - lon1) * d / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
// Mawaqit-Moschee aus einem Link oder dem ganzen geteilten Text der Mawaqit-App finden.
// Der geteilte Text enthält oft zwei Links: die Moscheeseite (…/en/kocatepe-camii-…) und einen App-Link (…/ar/id/24653).
// Bevorzugt wird die Moscheeseite; sonst die Nummer aus dem App-Link (die Uhr löst sie auf).
const NOT_SLUG = new Set(['id', 'm', 'w', 'mosque', 'search']);
export function parseMawaqit(text) {
  let id = '';
  for (const m of (text || '').matchAll(/mawaqit\.net\/(?:[a-z]{2}\/)?(?:id\/(\d+)|([a-z0-9][a-z0-9._-]*))/gi)) {
    if (m[1]) { id = id || m[1]; continue; }
    const slug = m[2].toLowerCase();
    if (!NOT_SLUG.has(slug)) return { slug };
  }
  return id ? { id } : null;
}

// Moschee bei der Uhr prüfen lassen: liefert {slug, name, country, timezone, lat, lon} oder null
export async function resolveMosque(ref) {
  try {
    const r = await api('/api/mawaqit/resolve', ref);
    if (!r.ok || !r.data || !r.data.slug) return null;
    try { localStorage.setItem('mosque:' + r.data.slug, JSON.stringify(r.data)); } catch (e) { /* privat */ }
    return r.data;
  } catch (e) { return null; }
}
export function cachedMosque(slug) {
  try { return JSON.parse(localStorage.getItem('mosque:' + slug) || 'null'); } catch (e) { return null; }
}
