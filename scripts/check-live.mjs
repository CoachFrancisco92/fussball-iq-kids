// Prüft die veröffentlichte App: Liefert die Live-Seite die erwartete Version – und zwar
// HTML, Skripte und Service Worker zusammenpassend? Umgeht den CDN-Cache per Abfrageparameter.
// Aufruf: npm run check:live              (erwartet die Version aus package.json)
//         node scripts/check-live.mjs <url> <version> [maxSekunden]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = (process.argv[2] || 'https://coachfrancisco92.github.io/fussball-iq-kids/').replace(/\/?$/, '/');
const want = process.argv[3] || JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const maxS = Number(process.argv[4] || 300);

async function get(file) {
  const url = base + file + (file.includes('?') ? '&' : '?') + 'cb=' + Date.now();
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${file}: HTTP ${r.status}`);
  return r.text();
}
async function check() {
  const html = await get('index.html');
  const hv = (html.match(/name="app-version" content="([^"]+)"/) || [])[1];
  const problems = [];
  if (hv !== want) problems.push(`index.html meldet ${hv || '(keine Version)'}`);
  if (!html.includes(`app.js?v=${want}`) || !html.includes(`engine.js?v=${want}`)) problems.push('index.html lädt Skripte einer anderen Version');
  const app = await get(`app.js?v=${want}`);
  if (!app.includes(`APP_VERSION = '${want}'`)) problems.push('app.js hat eine andere Version');
  const eng = await get(`engine.js?v=${want}`);
  if (!eng.includes(`VERSION: '${want}'`)) problems.push('engine.js hat eine andere Version');
  const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  for (const src of scripts) {
    if (!src.endsWith(`?v=${want}`)) problems.push(`${src} ist nicht mit Version ${want} verknüpft`);
    try { await get(src); } catch (e) { problems.push(`${src} nicht abrufbar (${e.message})`); }
  }
  const sw = await get('sw.js');
  if (!sw.includes(`fiq-v${want}`)) problems.push('sw.js hat eine andere Version');
  for (const f of ['tests/simulation.test.js', 'package.json']) {
    const r = await fetch(base + f + '?cb=' + Date.now());
    if (r.ok) problems.push(`${f} wird öffentlich ausgeliefert`);
  }
  return problems;
}
const start = Date.now();
let last = [];
while (true) {
  try { last = await check(); } catch (e) { last = [e.message]; }
  if (!last.length) { console.log(`✓ Live-Seite ${base} liefert Version ${want} konsistent aus.`); process.exit(0); }
  if ((Date.now() - start) / 1000 > maxS) break;
  console.log(`… noch nicht aktuell (${last.join('; ')}), neuer Versuch in 15 s`);
  await new Promise((r) => setTimeout(r, 15000));
}
console.error(`✗ Live-Prüfung fehlgeschlagen: ${last.join('; ')}`);
process.exit(1);
