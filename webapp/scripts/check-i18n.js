// Prüft, ob jeder in src/ benutzte Text t('…') in allen drei Sprachen vorhanden ist.
// Aufruf: node scripts/check-i18n.js  (Schlüssel mit Präfix wie 'tone_' werden zur Laufzeit gebildet)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = fileURLToPath(new URL('../src/', import.meta.url));
const code = readFileSync(join(src, 'lib/i18n.js'), 'utf8').replace(/export /g, '') + '\n;globalThis.__T = T;';
(0, eval)(code);
const T = globalThis.__T;
const used = new Set();
const walk = d => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|jsx)$/.test(f)) for (const m of readFileSync(p, 'utf8').matchAll(/\bt\(\s*['"]([a-z0-9_]+)['"]/g)) used.add(m[1]);
  }
};
walk(src);
let missing = 0;
for (const l of Object.keys(T)) {
  const miss = [...used].filter(k => !k.endsWith('_') && !(k in T[l]));
  if (miss.length) { missing += miss.length; console.log(l + ': fehlt ' + miss.join(' ')); }
}
console.log(missing ? `${missing} fehlende Texte` : 'alle Texte vorhanden');
process.exit(missing ? 1 : 0);
