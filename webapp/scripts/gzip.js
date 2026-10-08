// Nach dem Bauen: JavaScript und CSS packen. Die Uhr liefert x.js.gz aus, wenn x.js angefragt wird
// und nicht vorhanden ist (WebServer: Content-Encoding gzip) – so passt die App bequem in den Speicher.
import { readdirSync, readFileSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = fileURLToPath(new URL('../../data/www/', import.meta.url));
let before = 0, after = 0;
for (const dir of ['assets']) {
  for (const f of readdirSync(join(out, dir))) {
    if (!/\.(js|css)$/.test(f)) continue;
    const p = join(out, dir, f), data = readFileSync(p), gz = gzipSync(data, { level: 9 });
    writeFileSync(p + '.gz', gz);
    rmSync(p);
    before += data.length; after += gz.length;
  }
}
const kb = n => (n / 1024).toFixed(0) + ' KB';
console.log(`gepackt: ${kb(before)} -> ${kb(after)}`);
