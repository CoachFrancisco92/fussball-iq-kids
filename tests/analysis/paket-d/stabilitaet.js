// Analyse (kein Test): Wie stabil ist die Ziel-Bewertung bei leicht abweichendem Tipp (±0,5 m)?
// Anteil der Ziele, deren 4 Nachbarpunkte dieselbe Ziel-Bewertung bekommen. FIQ_ROOT=<Engine> node stabilitaet.js /tmp/paketd-lagen.json
const fs = require('node:fs');
const { E, ziele } = require('./common.js');
const L = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const pick = L.filter((l, i) => l.src.startsWith('E-') || i % 5 === 0);
let n = 0, same = 0, flipStar = 0, starN = 0, starStable = 0;
for (const l of pick) for (const z of ziele(l.s).filter((z) => z.d <= 8)) {
  const ex = (p) => E.evaluate(l.s, { kind: 'dribble', x: p.x, y: p.y }).exe.good;
  const e0 = ex(z), nb = [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]].map(([dx, dy]) => ex({ x: z.x + dx, y: z.y + dy }));
  n++; const all = nb.every((v) => v === e0); if (all) same++;
  if (e0) { starN++; if (nb.filter(Boolean).length >= 3) starStable++; }
}
console.log(`Lagen ${pick.length}, Ziele ${n}: Nachbarn gleich bewertet ${Math.round((100 * same) / n)} % · ⭐-Ziele mit ≥ 3 von 4 ⭐-Nachbarn ${Math.round((100 * starStable) / starN)} % (${starStable}/${starN})`);
