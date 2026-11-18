// Analyse (kein Test): Wirkung des Hotfixes auf die 200 Kinder-Abfolgen von Mission 1 – Szene für Szene
// (Ereignisse, Ergebnis, Bewertung) im Vergleich zum Stand v0.2.4. Aufruf: node tests/analysis/hotfix-impact.js
const path = require('node:path'), fs = require('node:fs'), os = require('node:os');
const { execFileSync } = require('node:child_process');
const root = path.join(__dirname, '..', '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fiq-ref-'));
execFileSync('git', ['worktree', 'add', '-q', '--detach', tmp, 'v0.2.4'], { cwd: root });
let A;
try { A = JSON.parse(execFileSync(process.execPath, ['-e', `const E=require(${JSON.stringify(path.join(tmp, 'tests/helpers/load.js'))});process.stdout.write(JSON.stringify(require(${JSON.stringify(path.join(__dirname, '../golden/diff-seeds.js'))})(E)))`], { maxBuffer: 1e9 })); }
finally { execFileSync('git', ['worktree', 'remove', '--force', tmp], { cwd: root }); }
const B = require('../golden/diff-seeds.js')(require('../helpers/load.js'));
const short = (ev) => ev.join(',').replace(/(redPass,received:r\d,)+/g, (m) => `[${m.split('redPass').length - 1}× Rot-Pass],`);
const rows = [];
for (const seed of Object.keys(A)) {
  const a = A[seed], b = B[seed];
  const i = a.findIndex((x, k) => !b[k] || JSON.stringify(x) !== JSON.stringify(b[k]));
  if (i < 0 && a.length === b.length) continue;
  const x = a[i], y = b[i];
  rows.push({ seed: +seed, szene: i + 1, typ: x.ctx.type, aktion: x.a.kind,
    redPassAlt: x.events.filter((e) => e === 'redPass').length, redPassNeu: y ? y.events.filter((e) => e === 'redPass').length : '–',
    ergebnisAlt: x.fb.text, ergebnisNeu: y ? y.fb.text : '–', sternAlt: x.ev.good, sternNeu: y ? y.ev.good : '–',
    folgeszenenGleich: a.length === b.length && a.slice(i + 1).every((z, k) => JSON.stringify(z.ev) === JSON.stringify(b[i + 1 + k].ev)) });
}
console.log(`${rows.length} von 200 Abfolgen betroffen`);
console.table(rows);
module.exports = { rows };
