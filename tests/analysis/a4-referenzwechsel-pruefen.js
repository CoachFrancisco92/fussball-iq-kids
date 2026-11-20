// Prüft beim Referenzwechsel Mission A (Paket D → mit A4, Meilenstein 4): neue Referenz = Vorgänger + GENAU die
// freigegebenen Abweichungen (historie/v0.5.0-a4-missionA-abweichungen.json), nichts sonst. Aufruf: node tests/analysis/a4-referenzwechsel-pruefen.js
const path = require('node:path'), { hash } = require('../golden/trace.js');
const G = path.join(__dirname, '..', 'golden'), H = path.join(G, 'historie');
const A = require(path.join(H, 'mission-a.v0.5.0-paket-d.json')), B = require(path.join(H, 'mission-a.v0.5.0.json')), P = require(path.join(H, 'v0.5.0-a4-missionA-abweichungen.json'));
const bad = [];
if (JSON.stringify(Object.keys(A.styles)) !== JSON.stringify(Object.keys(B.styles))) bad.push('Spielweisen-Liste');
for (const k of Object.keys(A.styles)) { const p = P.styles[k]; if (p ? !(hash(A.styles[k]) === p.alt && hash(B.styles[k]) === p.neu) : JSON.stringify(A.styles[k]) !== JSON.stringify(B.styles[k])) bad.push('Spielweise ' + k); }
for (const k of Object.keys(A.seeds)) { const p = P.seeds[k]; if (p ? !(A.seeds[k] === p.alt && B.seeds[k] === p.neu) : A.seeds[k] !== B.seeds[k]) bad.push('Abfolge ' + k); }
if (bad.length) { console.error('✗ nicht freigegeben:', bad); process.exit(1); }
console.log(`✓ Mission A Engine: nur freigegebene Abweichungen (${Object.keys(P.styles).length} Spielweisen, ${Object.keys(P.seeds).length} Abfolgen), Rest identisch`);
