// Vor dem Bauen: alte App-Dateien der Uhr entfernen (Hintergrund-Vorschauen in bg/ bleiben)
import { rmSync } from 'node:fs';

const out = new URL('../../data/www/', import.meta.url);
for (const p of ['assets', 'js', 'css', 'app', 'app.css', 'index.html', 'sw.js', 'manifest.json'])
  rmSync(new URL(p, out), { recursive: true, force: true });
