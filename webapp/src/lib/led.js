// RGB-LED der Uhr: jede Änderung geht sofort an die Uhr; Farbe, Helligkeit und an/aus merkt sich das Handy.
// Schnelle Folgen (Schieberegler) werden zusammengefasst: höchstens eine Anfrage gleichzeitig.
import { api, toast } from './store.js';
import { t } from './i18n.js';

// RGB-LED: jede Änderung geht sofort an die Uhr; Farbe und Helligkeit merkt sich das Handy
export function loadLed() {
  // Die LED ist beim Start der Uhr aus; die App merkt sich Farbe und Helligkeit
  try { return { color: '#FF0000', bri: 100, on: false, ...JSON.parse(localStorage.getItem('led') || '{}') }; }
  catch (e) { return { color: '#FF0000', bri: 100, on: false }; }
}
let ledBusy = false, ledNext = null;
export async function ledSend(led) {
  try { localStorage.setItem('led', JSON.stringify(led)); } catch (e) { /* privat */ }
  if (ledBusy) { ledNext = led; return; }
  ledBusy = true;
  const n = parseInt(led.color.slice(1), 16), k = led.on ? led.bri / 100 : 0;
  try { await api('/api/led', { r: Math.round((n >> 16 & 255) * k), g: Math.round((n >> 8 & 255) * k), b: Math.round((n & 255) * k) }); }
  catch (e) { toast(t('offline'), true); }
  ledBusy = false;
  if (ledNext) { const l = ledNext; ledNext = null; ledSend(l); }
}

