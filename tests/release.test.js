// Release-Regeln: Auslieferungspaket vollständig, Version dokumentiert, Veröffentlichung nur über die CI.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.join(__dirname, '..');
const read = (f, base = root) => fs.readFileSync(path.join(base, f), 'utf8');
const { files } = JSON.parse(read('scripts/site-files.json'));
const version = JSON.parse(read('package.json')).version;

test('Auslieferungspaket: alle Dateien existieren, alles Referenzierte ist enthalten', () => {
  for (const f of files) assert.ok(fs.existsSync(path.join(root, f)), `${f} fehlt`);
  const html = read('index.html');
  const refs = [...html.matchAll(/(?:src|href)="([^"#:]+?)(?:\?[^"]*)?"/g)].map((m) => m[1]).filter((r) => !r.startsWith('http'));
  const manifest = JSON.parse(read('manifest.webmanifest'));
  const sw = read('sw.js');
  const swFiles = [...sw.matchAll(/'\.\/([^'?]*)(?:\?[^']*)?'/g)].map((m) => m[1] || 'index.html');
  for (const r of [...refs, ...manifest.icons.map((i) => i.src), ...swFiles]) assert.ok(files.includes(r), `${r} wird verwendet, ist aber nicht im Auslieferungspaket`);
  for (const f of files.filter((f) => f !== 'sw.js')) assert.ok(swFiles.includes(f), `${f} fehlt im Offline-Cache des Service Workers`);
});

test('Auslieferungspaket enthält keine Tests, Skripte oder Doku', () => {
  for (const f of files) assert.ok(!/^(tests|scripts|docs|\.claude|\.github)\//.test(f) && !/\.md$/.test(f) && f !== 'package.json', `${f} gehört nicht in die Auslieferung`);
});

test(`CHANGELOG dokumentiert die aktuelle Version ${version}`, () => {
  assert.ok(read('CHANGELOG.md').includes(`## V${version}`), `Abschnitt "## V${version}" fehlt in CHANGELOG.md`);
});

test('Veröffentlichung nur über einen Workflow und nur nach bestandenen Tests', () => {
  const dir = path.join(root, '.github/workflows');
  const wfs = fs.readdirSync(dir).map((f) => ({ f, s: fs.readFileSync(path.join(dir, f), 'utf8') }));
  const deploying = wfs.filter((w) => /deploy-pages|upload-pages-artifact|gh-pages|peaceiris/.test(w.s));
  assert.strictEqual(deploying.length, 1, 'genau ein Workflow darf veröffentlichen');
  const ci = deploying[0].s;
  const deployJob = ci.slice(ci.indexOf('\n  deploy:'), ci.indexOf('\n  live-check:'));
  assert.match(deployJob, /needs: test/, 'Veröffentlichen muss von den Tests abhängen');
  assert.match(deployJob, /refs\/heads\/main/, 'automatisch nur von main');
  assert.match(ci, /check-live\.mjs/, 'Live-Prüfung nach dem Veröffentlichen');
  assert.match(ci, /if: failure\(\)[\s\S]*Wiederherstellen/, 'bei roter Live-Prüfung Anleitung zur Wiederherstellung');
  assert.match(ci, /path: \.release-tools/, 'Rollback auch für ältere Stände (Werkzeuge aus main)');
  assert.match(ci, /\.release-tools\/scripts\/pack\.sh/, 'Verpacken mit der Paketliste des jeweiligen Stands');
  const tagJob = ci.slice(ci.indexOf('\n  tag:'));
  assert.match(tagJob, /needs: live-check/, 'Tag erst nach grüner Live-Prüfung');
});

test('set-version ändert alle Stellen konsistent (Probelauf in Kopie)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fiq-'));
  for (const f of ['package.json', 'index.html', 'app.js', 'engine.js', 'sw.js', 'CHANGELOG.md']) fs.copyFileSync(path.join(root, f), path.join(tmp, f));
  fs.mkdirSync(path.join(tmp, 'scripts'));
  fs.copyFileSync(path.join(root, 'scripts/set-version.mjs'), path.join(tmp, 'scripts/set-version.mjs'));
  execFileSync(process.execPath, [path.join(tmp, 'scripts/set-version.mjs'), '9.8.7'], { stdio: 'pipe' });
  const all = ['index.html', 'app.js', 'engine.js', 'sw.js'].map((f) => read(f, tmp)).join('\n');
  assert.strictEqual(JSON.parse(read('package.json', tmp)).version, '9.8.7');
  assert.ok(!all.includes(version + "'") && !all.includes('v=' + version) && !all.includes(`content="${version}"`), 'alte Version übrig');
  for (const n of ['APP_VERSION = \'9.8.7\'', "VERSION: '9.8.7'", 'fiq-v9.8.7', 'app.js?v=9.8.7', 'engine.js?v=9.8.7', 'content="9.8.7"', 'Version 9.8.7']) assert.ok(all.includes(n), `${n} fehlt`);
  fs.rmSync(tmp, { recursive: true, force: true });
});
