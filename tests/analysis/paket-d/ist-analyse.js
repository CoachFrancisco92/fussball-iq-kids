// D1-Ist-Analyse (kein Test): heutige Dribbelbewertung gegen die vollständige Simulation über alle Dribbel-Lagen.
// Aufruf: node tests/analysis/paket-d/ist-analyse.js  → Tabellen; schreibt /tmp/paketd-ist.json
const { E, lagen, ziele, sim, evalNow } = require('./common.js');
const L = lagen(), rows = [];
for (const l of L) for (const z of ziele(l.s)) {
  const ev = evalNow(l.s, z), t = sim(l.s, z);
  const c = E.carrier(l.s), cap = z.d > 8 ? { x: c.x + (z.x - c.x) * 8 / z.d, y: c.y + (z.y - c.y) * 8 / z.d } : null;
  rows.push({ src: l.src, ctx: l.ctx.key, d: z.d, ang: z.ang, rec: ev.rec.good, exe: ev.exe.good, star: ev.good, why: ev.exe.why,
    capExe: cap ? evalNow(l.s, cap).exe.good : null, ...t });
}
require('node:fs').writeFileSync('/tmp/paketd-ist.json', JSON.stringify(rows));
const pct = (a, b) => (b ? Math.round((100 * a) / b) + ' %' : '–');
const grp = (f) => { const g = {}; for (const r of rows) { const k = f(r); (g[k] = g[k] || []).push(r); } return g; };
console.log(`Lagen ${L.length}, Ziele ${rows.length}`);
const tab = [];
for (const [k, rs] of Object.entries(grp((r) => r.src.startsWith('E-') ? r.src : r.src))) {
  const kept = rs.filter((r) => !r.lost), lost = rs.filter((r) => r.lost);
  tab.push({ quelle: k, ziele: rs.length, behalten: kept.length, verloren: lost.length,
    'Ziel ⭐ & verloren': rs.filter((r) => r.exe && r.lost).length,
    'Ziel 💭 & behalten': rs.filter((r) => !r.exe && !r.lost).length,
    'davon Abstand ≥ 1,5 m': rs.filter((r) => !r.exe && !r.lost && r.minD >= 1.5).length });
}
console.table(tab);
// Text „direkt auf einen Gegner“: zutreffend, wenn verloren oder Weg führt bis auf < 1 m an einen Gegner
const inG = rows.filter((r) => !r.exe), wahr = inG.filter((r) => r.lost || r.minD < 1.0);
console.log(`Text „direkt auf einen Gegner“: ${inG.length}, zutreffend ${wahr.length} (${pct(wahr.length, inG.length)}), unzutreffend ${inG.length - wahr.length}`);
// Strecke
console.table(Object.entries(grp((r) => r.d)).map(([d, rs]) => ({ strecke: d + ' m', ziele: rs.length, '⭐ Ziel': pct(rs.filter((r) => r.exe).length, rs.length), behalten: pct(rs.filter((r) => !r.lost).length, rs.length) })));
// über 8 m: angetippt vs ausgeführt
const far = rows.filter((r) => r.d > 8);
console.log(`> 8 m getippt: ${far.length}; Bewertung angetippt ≠ ausgeführt (8 m): ${far.filter((r) => r.exe !== r.capExe).length} (angetippt 💭, ausgeführt wäre ⭐: ${far.filter((r) => !r.exe && r.capExe).length})`);
