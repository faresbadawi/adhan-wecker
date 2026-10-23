// Darstellung der App: hell, dunkel oder wie das Gerät; Akzentfarbe. Wird auf dem Gerät gemerkt (nicht auf der Uhr).
import { kvGet, kvSet } from './native.js';

export const ACCENTS = {
  gold: '#d4af6a', emerald: '#5fc08b', turquoise: '#5ec4cc', rose: '#e9a27c', silver: '#c3cad3',
};
const rgb = hex => { const n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const mix = (a, b, f) => '#' + a.map((v, i) => Math.round(v + (b[i] - v) * f).toString(16).padStart(2, '0')).join('');

export const getTheme = () => kvGet('appTheme', { mode: 'dark', accent: 'gold' });
export function setTheme(part) { const t = { ...getTheme(), ...part }; kvSet('appTheme', t); applyAppTheme(); return t; }

export function applyAppTheme() {
  const { mode, accent } = getTheme();
  const dark = mode === 'dark' || (mode === 'system' && !(window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches));
  const root = document.documentElement;
  root.dataset.theme = dark ? 'dark' : 'light';
  const hex = ACCENTS[accent] || ACCENTS.gold, a = rgb(hex);
  // im hellen Design die Akzentfarbe etwas dunkler, damit sie auf hellem Grund lesbar bleibt
  const base = dark ? a : rgb(mix(a, [0, 0, 0], 0.32));
  const col = '#' + base.map(v => v.toString(16).padStart(2, '0')).join('');
  const r = root.style;
  r.setProperty('--ion-color-primary', col);
  r.setProperty('--ion-color-primary-rgb', base.join(','));
  r.setProperty('--ion-color-primary-shade', mix(base, [0, 0, 0], 0.12));
  r.setProperty('--ion-color-primary-tint', mix(base, [255, 255, 255], 0.1));
  r.setProperty('--gold', col);
  r.setProperty('--accent-light', dark ? mix(a, [255, 255, 255], 0.3) : mix(base, [0, 0, 0], 0.15));
  const meta = document.querySelector('meta[name=theme-color]');
  if (meta) meta.setAttribute('content', dark ? '#070707' : '#f6f1e7');
}

if (typeof window !== 'undefined' && window.matchMedia) {
  try { matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { if (getTheme().mode === 'system') applyAppTheme(); }); } catch (e) { /* ältere Browser */ }
}
