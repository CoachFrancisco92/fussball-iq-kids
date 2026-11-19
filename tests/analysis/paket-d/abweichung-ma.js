// Abweichungsbericht Mission A (kein Test): Kinder-Abfolgen und Spielweisen aus tests/golden/mission-a.js mit der Engine
// aus FIQ_ROOT aufzeichnen (--dump) bzw. zwei Aufzeichnungen vergleichen (--diff alt neu). Ändert keine Referenz.
const fs = require('node:fs'), path = require('node:path');
const arg = (k, i = 1) => { const j = process.argv.indexOf(k); return j > 0 ? process.argv[j + i] : null; };
if (arg('--dump')) {
  const { E } = require('./common.js');
  const root = process.env.FIQ_ROOT || path.join(__dirname, '..', '..', '..');
  const ma = require(path.join(root, 'tests/golden/mission-a.js')), { lcg } = require(path.join(root, 'tests/golden/trace.js'));
  const out = { seeds: {}, styles: {} };
  for (let seed = 1; seed <= 200; seed++) { const rnd = lcg(seed); out.seeds[seed] = ma.play(E, seed % 4, (E2, s, ctx) => ma.childAction(E2, s, ctx, rnd)).out; }
  for (const [k, f] of Object.entries(ma.STYLES)) out.styles[k] = [0, 1, 2, 3].map((d) => ma.play(E, d, f).out);
  fs.writeFileSync(arg('--dump'), JSON.stringify(out)); process.exit(0);
}
const A = JSON.parse(fs.readFileSync(arg('--diff'), 'utf8')), B = JSON.parse(fs.readFileSync(arg('--diff', 2), 'utf8'));
const g = {}; let n = 0, game = new Set(), dribbles = 0;
const cmp = (where, x, y) => x.forEach((r, i) => {
  if (r.a.kind === 'dribble') dribbles++;
  const c = y[i]; if (!c) { game.add(where); return; }
  if (JSON.stringify(r.afterApply) !== JSON.stringify(c.afterApply) || JSON.stringify(r.events) !== JSON.stringify(c.events)) game.add(where);
  if (JSON.stringify(r.ev) === JSON.stringify(c.ev) && JSON.stringify(r.fb) === JSON.stringify(c.fb) && JSON.stringify(r.hint) === JSON.stringify(c.hint)) return;
  n++; const k = `${r.sit} ${r.a.kind} ${r.ev.good ? '⭐' : '💭'}→${c.ev.good ? '⭐' : '💭'} | ${r.ev.why || '–'} → ${c.ev.why || '–'}`; g[k] = (g[k] || 0) + 1;
});
for (const s of Object.keys(A.seeds)) cmp('Abfolge ' + s, A.seeds[s], B.seeds[s]);
for (const k of Object.keys(A.styles)) A.styles[k].forEach((r, d) => cmp(`${k}/${d}`, r, B.styles[k][d]));
console.log(`Mission A: Dribblings in den Aufzeichnungen ${dribbles}, geänderte Entscheidungen ${n}, Spielverlauf geändert: ${game.size ? [...game].join(', ') : 'nirgends'}`);
console.log(g);
