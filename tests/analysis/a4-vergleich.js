// Meilenstein 4 (A4): Bleiben die bisherigen Situationen A1/A2/A3/A5 in Mission A exakt gleich? Vergleicht je Spielweise
// jede Situations-Episode der gültigen Referenz mit derselben Situation im neuen Stand (gleiche Entscheidungen,
// Bewertungen, Rückmeldungen, Ereignisse, Positionen). Unterschiede entstehen nur durch die neue Rotation (A4).
// Aufruf: node tests/analysis/a4-vergleich.js
const E = require('../helpers/load.js');
const REF = require('../golden/referenz.js'), ref = require('../golden/' + REF.missionA.file);
const { traceMissionA } = require('../golden/mission-a.js');
const now = JSON.parse(JSON.stringify(traceMissionA(E)));
const blocks = (runs) => { const out = {}; for (const r of runs) { let cur = null; for (const x of r.out) { if (!cur || cur.sit !== x.sit) { cur = { sit: x.sit, recs: [] }; (out[x.sit] = out[x.sit] || []).push(cur); } const y = JSON.parse(JSON.stringify(x)); delete y.mission; delete y.afterApply; cur.recs.push(y); } } return out; };
let same = 0, diff = 0; const neu = {};
for (const k of Object.keys(ref.styles)) {
  const A = blocks(ref.styles[k]), B = blocks(now.styles[k]);
  for (const sit of Object.keys(B)) {
    if (!A[sit]) { neu[sit] = (neu[sit] || 0) + B[sit].length; continue; }
    const known = new Set(A[sit].map((x) => JSON.stringify(x.recs))); // dieselbe Situation kann in der Referenz je Durchlauf anders verlaufen (z. B. Folge-Ansagen)
    for (const b of B[sit]) { if (known.has(JSON.stringify(b.recs))) same++; else { diff++; console.log('ABWEICHUNG', k, sit, JSON.stringify(b.recs.map((r) => [r.a.kind, r.ev.good, r.fb.say]))); } }
  }
}
console.log(`Situations-Episoden A1/A2/A3/A5 identisch zur Referenz: ${same}, abweichend: ${diff}; neu (A4): ${JSON.stringify(neu)}`);
process.exit(diff ? 1 : 0);
