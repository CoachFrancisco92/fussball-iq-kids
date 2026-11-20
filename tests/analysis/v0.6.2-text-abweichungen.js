// Paket „Wahrnehmung“ (V0.6.2): Nachweis, dass sich in den Engine-Referenzen ALLER drei Missionen nur Texte ändern
// (Ansage ctx.title/ctx.say, Rückmeldung fb.text/fb.tip/fb.say) – Simulation, Ereignisse, Bewertung und Hilfe identisch.
// Vergleicht vollständige Abläufe (nicht nur Prüfsummen) des aktuellen Stands mit dem Basisstand (Standard: main).
//   node tests/analysis/v0.6.2-text-abweichungen.js [basis] [--md datei]
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { execFileSync } = require('node:child_process');
const root = path.join(__dirname, '..', '..');
const basis = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'main';

const DUMP = `
const E = require('./tests/helpers/load.js');
const T = require('./tests/golden/trace.js');
const A = require('./tests/golden/mission-a.js'), FB = require('./tests/golden/freie-bahn.js');
const out = { m1: {}, a: {}, fb: {} };
for (const [k, steps] of Object.entries({ musterweg: 0, abgefangen: 0, geblockt: 0, dribbling: 0 })) {}
const full = T.traceAll(E); out.m1.scripted = full.scripted; out.m1.hinted = full.hinted; out.m1.seeds = {};
for (let seed = 1; seed <= 200; seed++) { const rnd = T.lcg(seed); out.m1.seeds[seed] = T.playMission(E, (E2, s, ctx) => (function (E, s, ctx, rnd) { const F = E.F, c = E.carrier(s), blues = E.team(s, 'blue'); const pick = (arr) => arr[Math.floor(rnd() * arr.length)]; const spot = () => ({ x: -5 + rnd() * (F.W + 10), y: -5 + rnd() * (F.H + 10) }); const k = pick(ctx.actions); if (k === 'passen') { if (rnd() < 0.6) return { kind: 'pass', id: pick(blues.filter((b) => b !== c)).id }; return Object.assign({ kind: 'pass' }, spot()); } if (k === 'dribbeln') return Object.assign({ kind: 'dribble' }, spot()); if (k === 'schiessen') return { kind: 'shoot', goal: rnd() < 0.5 ? 0 : 1 }; if (k === 'freilaufen') return Object.assign({ kind: 'run', id: pick(blues.filter((b) => b !== c)).id }, spot()); if (k === 'erobern') return { kind: 'press', id: pick(blues).id }; return Object.assign({ kind: 'cover', id: pick(blues).id }, spot()); })(E2, s, ctx, rnd)); }
for (const [key, mod] of [['a', A], ['fb', FB]]) {
  const n = E.mission(mod.ID).durchlaeufe.length;
  out[key].styles = {}; for (const [k, f] of Object.entries(mod.STYLES)) out[key].styles[k] = Array.from({ length: n }, (_, d) => A.play(E, d, f, mod.ID));
  out[key].seeds = {}; for (let seed = 1; seed <= 200; seed++) { const rnd = T.lcg(seed); out[key].seeds[seed] = A.play(E, seed % n, (E2, s, ctx) => A.childAction(E2, s, ctx, rnd), mod.ID); }
}
process.stdout.write(JSON.stringify(out));
`;
function dump(dir) { return JSON.parse(execFileSync(process.execPath, ['-e', DUMP], { cwd: dir, maxBuffer: 1 << 30 }).toString()); }

const wt = fs.mkdtempSync(path.join(os.tmpdir(), 'fiq-basis-'));
execFileSync('git', ['worktree', 'add', '--detach', wt, basis], { cwd: root, stdio: 'ignore' });
let alt, neu;
try { alt = dump(wt); neu = dump(root); } finally { execFileSync('git', ['worktree', 'remove', '--force', wt], { cwd: root, stdio: 'ignore' }); }

const TEXT = { ctx: ['title', 'say'], fb: ['text', 'tip', 'say'] };
const ohneText = (x) => { const y = JSON.parse(JSON.stringify(x)); for (const [k, fs2] of Object.entries(TEXT)) if (y[k]) for (const f of fs2) delete y[k][f]; return y; };
const J = (x) => JSON.stringify(x);
const stat = {}, paare = new Map(); let spiel = 0, schritte = 0, geaendert = 0;
function vergleiche(name, A, B) {
  for (const k of Object.keys(A)) {
    const norm = (v) => (Array.isArray(v) ? v.flatMap(norm1) : norm1(v));
    const norm1 = (x) => (Array.isArray(x) ? x : x && Array.isArray(x.out) ? [...x.out, { rest: Object.fromEntries(Object.entries(x).filter(([q]) => q !== 'out')) }] : [x]);
    const a = norm(A[k]), b = norm(B[k]);
    if (a.length !== b.length) { spiel++; continue; }
    a.forEach((x, i) => {
      schritte++;
      if (J(ohneText(x)) !== J(ohneText(b[i]))) { spiel++; return; }
      if (J(x) === J(b[i])) return;
      geaendert++;
      for (const [o, fs2] of Object.entries(TEXT)) for (const f of fs2) if (x[o] && J(x[o][f]) !== J(b[i][o][f])) {
        stat[`${name} ${o}.${f}`] = (stat[`${name} ${o}.${f}`] || 0) + 1;
        if (f === 'say') { const key = `${o}: ${x[o][f]}\n   → ${b[i][o][f]}`; paare.set(key, (paare.get(key) || 0) + 1); }
      }
    });
  }
}
for (const [name, key] of [['Mission 1', 'm1'], ['Mission A', 'a'], ['Freie Bahn', 'fb']]) {
  const A = alt[key], B = neu[key];
  if (key === 'm1') { vergleiche(name, A.scripted, B.scripted); vergleiche(name, { h: A.hinted }, { h: B.hinted }); vergleiche(name, A.seeds, B.seeds); }
  else { vergleiche(name, A.styles, B.styles); vergleiche(name, A.seeds, B.seeds); }
}
const zeilen = [`Basis ${basis}: ${schritte} Schritte verglichen (3 Missionen, feste Spielweisen, Hilfe, je 200 Kinder-Abfolgen)`,
  `Spielverlauf/Bewertung/Hilfe geändert: ${spiel ? spiel + ' ✗' : 'nirgends ✓'}`, `Schritte mit geänderten Sätzen: ${geaendert}`,
  ...Object.entries(stat).map(([k, n]) => `  ${k}: ${n}`), '', `Verschiedene Satzänderungen (Ansage/Rückmeldung): ${paare.size}`,
  ...[...paare].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n}× ${k}`)];
console.log(zeilen.join('\n'));
const mi = process.argv.indexOf('--md'); if (mi > 0) fs.writeFileSync(process.argv[mi + 1], '```\n' + zeilen.join('\n') + '\n```\n');
if (spiel) process.exit(1);
