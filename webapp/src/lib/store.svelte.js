// Gemeinsamer Zustand der App: Einstellungen (S) und Status (ST) der Uhr, dazu Speichern und Hinweise.
// Svelte-Runen: Änderungen an `app` zeichnen alle Seiten automatisch neu.
import { f7 } from 'framework7-svelte';
import { t, lang } from './i18n.js';

export const app = $state({
  S: null,          // /api/settings
  ST: null,         // /api/status
  online: false,
  stBase: 0,        // performance.now() beim letzten Status
  now: 0,           // läuft jede Sekunde weiter (für Uhr und Countdowns)
  installEvt: null, // Chrome-Installationsangebot
});

export async function api(url, body) {
  const opt = body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
  const r = await fetch(url, opt);
  let data = null;
  try { data = await r.json(); } catch (e) { /* leere Antwort */ }
  return { ok: r.ok, status: r.status, data };
}

export function toast(text, err) {
  f7.toast.show({ text, position: 'top', closeTimeout: 2200, cssClass: err ? 'toast-err' : '' });
}

export function confirmBox(text, hint, danger) {
  return new Promise(res => {
    f7.dialog.create({
      title: text,
      text: hint || '',
      buttons: [
        { text: t('cancel'), onClick: () => res(false) },
        { text: t('confirm'), strong: true, color: danger ? 'red' : undefined, onClick: () => res(true) },
      ],
    }).open();
  });
}

// Teil-Einstellungen speichern; die Antwort ist der neue Gesamtstand
export async function save(part, quiet) {
  try {
    const r = await api('/api/settings', part);
    if (r.ok && r.data) { app.S = r.data; applyTheme(app.S.colors); }
    if (!quiet || !r.ok) toast(r.ok ? t('saved') : t('invalid'), !r.ok);
    return r.ok;
  } catch (e) { toast(t('offline'), true); return false; }
}

let saveTimer;
export function saveLater(part) { clearTimeout(saveTimer); saveTimer = setTimeout(() => save(part), 700); }

export async function refreshStatus() {
  try {
    const r = await api('/api/status');
    if (!r.ok) throw new Error();
    app.ST = r.data; app.stBase = performance.now(); app.online = true;
    try { localStorage.setItem('status', JSON.stringify(app.ST)); } catch (e) { /* privat */ }
  } catch (e) { app.online = false; }
}

export async function loadSettings() {
  try {
    const r = await api('/api/settings');
    if (r.ok) { app.S = r.data; applyTheme(app.S.colors); }
  } catch (e) { /* offline */ }
}

// Farben der Uhr übernehmen: Akzent als Framework7-Hauptfarbe, Schrift und Nebenschrift als Variablen
export function applyTheme(c) {
  if (!c || !/^#[0-9a-f]{6}$/i.test(c.accent || '')) return;
  const r = document.documentElement.style;
  r.setProperty('--gold', c.accent);
  r.setProperty('--gold2', `color-mix(in srgb, ${c.accent} 75%, #fff)`);
  r.setProperty('--accent-soft', `color-mix(in srgb, ${c.accent} 18%, transparent)`);
  if (/^#[0-9a-f]{6}$/i.test(c.main || '')) r.setProperty('--text', c.main);
  if (f7 && f7.setColorTheme) f7.setColorTheme(c.accent);
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
export function hijri(h) {
  if (!h || !h.month) return '';
  return `${h.day} ${t('hijri_months')[h.month - 1]} ${h.year} ${lang() === 'ar' ? 'هـ' : 'AH'}`;
}
// Sekunden seit Status-Abruf (für lokal weiterlaufende Uhr und Countdowns); hängt von app.now ab
export const elapsed = () => (app.now, Math.floor((performance.now() - app.stBase) / 1000));
// aktuelle Uhrzeit der Uhr in Sekunden seit Mitternacht
export function nowSec() {
  if (!app.ST || !app.ST.time) return 0;
  const [h, m, s] = app.ST.time.clock.split(':').map(Number);
  return (h * 3600 + m * 60 + s + elapsed()) % 86400;
}
export const pname = k => (k === 'dhuhr' && app.ST && app.ST.prayer && app.ST.prayer.friday ? t('jumuah') : t(k));
export const signal = n => (n >= 3 ? 'strong' : n === 2 ? 'medium' : 'weak');
export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
export const appMode = () => new URLSearchParams(location.search).has('app');
