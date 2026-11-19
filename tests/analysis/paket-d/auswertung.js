// D1-Auswertung (kein Test): heutige Bewertung (/tmp/paketd-alt.json) gegen Prototyp (/tmp/paketd-neu.json) und Simulation.
const A = require('/tmp/paketd-alt.json'), N = require('/tmp/paketd-neu.json');
const pct = (a, b) => (b ? Math.round((100 * a) / b) + ' %' : '–');
const srcs = ['M1', 'MA', 'E-B1', 'E-B3', 'E-B4', 'E-B2', 'E-B5', 'E-A4'];
const row = (rs, label) => {
  const kept = rs.filter((r) => !r.lost);
  return { [label]: '', ziele: rs.length, behalten: kept.length,
    '⭐ & verloren': rs.filter((r) => r.exe && r.lost).length,
    '💭 & behalten': rs.filter((r) => !r.exe && !r.lost).length,
    'Ziel ⭐': rs.filter((r) => r.exe).length, 'Stern gesamt': rs.filter((r) => r.star).length };
};
console.log('Ziel-Bewertung gegen Simulation (heute | Prototyp)');
console.table(srcs.flatMap((s) => [Object.assign(row(A.filter((r) => r.src === s), 'quelle'), { quelle: s + ' heute' }), Object.assign(row(N.filter((r) => r.src === s), 'quelle'), { quelle: s + ' neu' })]));
const why = (rs) => { const g = {}; for (const r of rs) if (!r.exe) g[r.why] = (g[r.why] || 0) + 1; return g; };
console.log('Gründe 💭 heute:', why(A)); console.log('Gründe 💭 neu:', why(N));
// Text „direkt auf einen Gegner“ zutreffend?
const tx = (rs) => { const t = rs.filter((r) => /direkt auf einen Gegner/.test(r.why)); return `${t.length}, davon verloren ${t.filter((r) => r.lost).length}`; };
console.log('„direkt auf einen Gegner“ heute:', tx(A), '| neu:', tx(N));
// Strecke
const st = {}; for (const [k, rs] of [['heute', A], ['neu', N]]) for (const r of rs) { const o = (st[r.d] = st[r.d] || { strecke: r.d + ' m' }); o[k + ' ⭐'] = (o[k + ' ⭐'] || 0) + (r.exe ? 1 : 0); o.n = (o.n || 0) + 0.5; }
console.table(Object.values(st).map((o) => ({ strecke: o.strecke, 'heute ⭐': pct(o['heute ⭐'], o.n), 'neu ⭐': pct(o['neu ⭐'], o.n) })));
// Richtungen mit ⭐ je Lage (Anzahl 45°-Sektoren) – „mehrere Wege“
const sect = (rs) => { const by = {}; rs.forEach((r, i) => { const k = Math.floor(i / 1); }); return 0; };
// Änderungen Ziel-Bewertung
let up = 0, down = 0, recUp = 0, recDown = 0;
for (let i = 0; i < A.length; i++) { if (!A[i].exe && N[i].exe) up++; if (A[i].exe && !N[i].exe) down++; if (!A[i].rec && N[i].rec) recUp++; if (A[i].rec && !N[i].rec) recDown++; }
console.log(`Ziel 💭→⭐ ${up}, ⭐→💭 ${down}; Erkennen 💭→✓ ${recUp}, ✓→💭 ${recDown}`);
// Wegfall von ⭐: warum?
const dn = {}; for (let i = 0; i < A.length; i++) if (A[i].exe && !N[i].exe) dn[N[i].why] = (dn[N[i].why] || 0) + 1; console.log('⭐→💭 Gründe:', dn);
// Lage: Dribbeln überhaupt sinnvoll (Erkennen-Grundlage)
const lag = (rs) => { const s = new Map(); rs.forEach((r, i) => s.set(r.src + Math.floor(i), r)); return 0; };
