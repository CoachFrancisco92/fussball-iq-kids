// D1-Vergleich (kein Test): dieselben Lagen und Ziele wie ist-analyse.js, bewertet mit der Engine aus FIQ_ROOT
// (Prototyp-Kopie). Lagen werden aus der heutigen Engine erzeugt (LAGEN_OUT) bzw. geladen (LAGEN_IN), damit beide
// Versionen exakt dieselben Lagen sehen.
//   node vergleich.js --dump /tmp/paketd-lagen.json                     (heutige Engine)
//   FIQ_ROOT=/tmp/dproto node vergleich.js --run /tmp/paketd-lagen.json   (Prototyp) → /tmp/paketd-neu.json
const fs = require('node:fs');
const { E, lagen, ziele, sim } = require('./common.js');
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
if (arg('--dump')) { fs.writeFileSync(arg('--dump'), JSON.stringify(lagen().map((l) => ({ src: l.src, s: l.s, key: l.ctx.key })))); console.log('Lagen geschrieben'); process.exit(0); }
const L = JSON.parse(fs.readFileSync(arg('--run'), 'utf8'));
const rows = []; let tEval = 0, nEval = 0;
for (const l of L) {
  const t0 = Date.now(); const sit = E.situation(l.s); tEval += Date.now() - t0;
  for (const z of ziele(l.s)) {
    const t1 = Date.now(); const ev = E.evaluate(l.s, { kind: 'dribble', x: z.x, y: z.y }); tEval += Date.now() - t1; nEval++;
    const t = sim(l.s, z);
    rows.push({ src: l.src, d: z.d, ang: z.ang, rec: ev.rec.good, exe: ev.exe.good, star: ev.good, why: ev.exe.why, recWhy: ev.rec.why, okDribble: sit.ok.dribble, ...t });
  }
}
fs.writeFileSync(arg('--out') || '/tmp/paketd-neu.json', JSON.stringify(rows));
console.log(`Lagen ${L.length}, Ziele ${rows.length}, Bewertungszeit Ø ${(tEval / nEval).toFixed(1)} ms je Ziel (inkl. Lage)`);
