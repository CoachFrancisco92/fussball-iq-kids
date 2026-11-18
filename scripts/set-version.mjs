// Setzt die Versionsnummer an allen Stellen gleichzeitig (package.json, index.html, app.js, engine.js, sw.js).
// Aufruf: npm run version:set -- 0.3.0
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const v = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(v || '')) { console.error('Bitte Version im Format X.Y.Z angeben, z. B. 0.3.0'); process.exit(1); }

const edits = {
  'package.json': [[/"version": "[^"]+"/, `"version": "${v}"`]],
  'index.html': [
    [/name="app-version" content="[^"]+"/, `name="app-version" content="${v}"`],
    [/engine\.js\?v=[\d.]+/, `engine.js?v=${v}`],
    [/app\.js\?v=[\d.]+/, `app.js?v=${v}`],
    [/id="ver">Version [\d.]+</, `id="ver">Version ${v}<`],
  ],
  'app.js': [[/APP_VERSION = '[\d.]+'/, `APP_VERSION = '${v}'`]],
  'engine.js': [[/VERSION: '[\d.]+'/, `VERSION: '${v}'`]],
  'sw.js': [
    [/fiq-v[\d.]+/, `fiq-v${v}`],
    [/engine\.js\?v=[\d.]+/, `engine.js?v=${v}`],
    [/app\.js\?v=[\d.]+/, `app.js?v=${v}`],
  ],
};
for (const [file, list] of Object.entries(edits)) {
  const p = path.join(root, file);
  let s = fs.readFileSync(p, 'utf8');
  for (const [re, rep] of list) {
    if (!re.test(s)) { console.error(`${file}: Stelle nicht gefunden (${re})`); process.exit(1); }
    s = s.replace(re, rep);
  }
  fs.writeFileSync(p, s);
}
const cl = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
if (!cl.includes(`## V${v}`)) console.warn(`Hinweis: CHANGELOG.md hat noch keinen Abschnitt "## V${v}" – der Test schlägt fehl, bis er ergänzt ist.`);
console.log(`Version ${v} gesetzt.`);
