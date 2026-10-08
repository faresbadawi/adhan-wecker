// Vor dem Bauen: alte App-Dateien der Uhr entfernen (Hintergrund-Vorschauen in bg/ bleiben)
// und die beiden Framework7-Stylesheets (links-nach-rechts und rechts-nach-links) bereitlegen.
import { rmSync, copyFileSync, mkdirSync } from 'node:fs';

const out = new URL('../../data/www/', import.meta.url);
for (const p of ['assets', 'js', 'css', 'app.css', 'index.html', 'sw.js', 'manifest.json'])
  rmSync(new URL(p, out), { recursive: true, force: true });

const pub = new URL('../public/css/', import.meta.url);
mkdirSync(pub, { recursive: true });
const f7 = new URL('../node_modules/framework7/', import.meta.url);
copyFileSync(new URL('framework7-bundle.min.css', f7), new URL('f7.css', pub));
copyFileSync(new URL('framework7-bundle-rtl.min.css', f7), new URL('f7-rtl.css', pub));
