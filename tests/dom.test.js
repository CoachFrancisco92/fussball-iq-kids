// Konsistenz Oberfläche: jede ID, die app.js anspricht, muss in index.html existieren,
// und alle Dateien müssen dieselbe Version tragen (Schutz gegen HTML/JS-Mischstände).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const engine = fs.readFileSync(path.join(root, 'engine.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

test('alle von app.js verwendeten Element-IDs existieren in index.html', () => {
  const ids = [...new Set([...app.matchAll(/\$\('([\w-]+)'\)/g)].map((m) => m[1]))];
  assert.ok(ids.length > 10);
  const created = new Set([...app.matchAll(/\.id = '([\w-]+)'/g)].map((m) => m[1])); // zur Laufzeit erzeugte Elemente
  const missing = ids.filter((id) => !html.includes(`id="${id}"`) && !created.has(id));
  assert.deepStrictEqual(missing, [], 'fehlende IDs: ' + missing.join(', '));
});

test('Version ist in HTML, Skript-URLs, app.js, engine.js, Service Worker und package.json identisch', () => {
  const v = pkg.version;
  assert.match(html, new RegExp(`name="app-version" content="${v}"`));
  assert.match(html, new RegExp(`engine\\.js\\?v=${v}`));
  assert.match(html, new RegExp(`app\\.js\\?v=${v}`));
  const srcs = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  for (const src of srcs) assert.ok(src.endsWith(`?v=${v}`), `${src} ohne Versionsparameter ${v}`);
  for (const src of srcs) assert.ok(sw.includes(`'./${src}'`), `${src} fehlt im Offline-Cache`);
  assert.match(app, new RegExp(`APP_VERSION = '${v}'`));
  assert.match(engine, new RegExp(`VERSION: '${v}'`));
  assert.match(sw, new RegExp(`fiq-v${v}`));
  assert.match(sw, new RegExp(`app\\.js\\?v=${v}`));
});

test('alle Engine-Funktionen, die app.js aufruft, werden exportiert', () => {
  require('./helpers/load.js');
  const used = [...new Set([...app.matchAll(/\bE\.(\w+)\(/g)].map((m) => m[1]))];
  const missing = used.filter((f) => typeof globalThis.FIQ[f] !== 'function');
  assert.deepStrictEqual(missing, []);
});
