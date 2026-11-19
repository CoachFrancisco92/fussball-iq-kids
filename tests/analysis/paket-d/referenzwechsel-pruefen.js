// Prüft beim Referenzwechsel v0.3.1/v0.4.0 → v0.5.0 (Paket D): neue Referenzen = alte Referenzen + GENAU die
// freigegebenen Abweichungen (Mission A: Stand Paket D ohne A4, seit Meilenstein 4 in historie/) (tests/golden/historie/v0.5.0-paket-d-*.json), nichts sonst. Aufruf: node tests/analysis/paket-d/referenzwechsel-pruefen.js
const { hash } = require('../../golden/trace.js');
const G = require('node:path').join(__dirname, '..', '..', 'golden') + '/'; const H = G + 'historie/';
const r = (f) => require(G + f);
const bad = [];
// Mission 1 Engine
{ const A = r('historie/mission1.v0.3.1.json'), B = r('mission1.v0.5.0.json'), P = r('historie/v0.5.0-paket-d-abweichungen.json');
  for (const k of Object.keys(A.scripted)) { const p = P.scripted[k], same = JSON.stringify(A.scripted[k]) === JSON.stringify(B.scripted[k]);
    if (p ? !(hash(A.scripted[k]) === p.alt && hash(B.scripted[k]) === p.neu) : !same) bad.push('M1 Ablauf ' + k); }
  if (P.hinted ? hash(B.hinted) !== P.hinted.neu : JSON.stringify(A.hinted) !== JSON.stringify(B.hinted)) bad.push('M1 Hilfe');
  for (const k of Object.keys(A.seeds)) { const p = P.seeds[k]; if (p ? !(A.seeds[k] === p.alt && B.seeds[k] === p.neu) : A.seeds[k] !== B.seeds[k]) bad.push('M1 Abfolge ' + k); }
  console.log(`Mission 1 Engine: ${Object.keys(P.seeds).length} Abfolgen + ${Object.keys(P.scripted).length} Ablauf laut Freigabe geändert, Rest identisch`); }
// Mission A Engine
{ const A = r('historie/mission-a.v0.4.0.json'), B = r('historie/mission-a.v0.5.0-paket-d.json'), P = r('historie/v0.5.0-paket-d-missionA-abweichungen.json');
  for (const k of Object.keys(A.styles)) { const p = P.styles[k]; if (p ? hash(B.styles[k]) !== p.neu : JSON.stringify(A.styles[k]) !== JSON.stringify(B.styles[k])) bad.push('MA Spielweise ' + k); }
  for (const k of Object.keys(A.seeds)) { const p = P.seeds[k]; if (p ? !(A.seeds[k] === p.alt && B.seeds[k] === p.neu) : A.seeds[k] !== B.seeds[k]) bad.push('MA Abfolge ' + k); }
  console.log(`Mission A Engine: ${Object.keys(P.seeds).length} Abfolgen laut Freigabe geändert, Rest identisch`); }
// Oberfläche Mission 1
{ const A = r('historie/ui-transcript.v0.3.1.json'), B = r('historie/ui-transcript.v0.5.0.json'), P = r('historie/v0.5.0-paket-d-abweichungen-ui.json'); let n = 0;
  for (const k of Object.keys(A)) { if (A[k].length !== B[k].length) bad.push('UI Länge ' + k); const L = new Map((P[k] || []).map((d) => [d.eintrag, d]));
    A[k].forEach((e, i) => { const d = L.get(i), J = JSON.stringify; if (d) { n++; if (J(d.alt) !== J(e) || J(d.neu) !== J(B[k][i])) bad.push(`UI ${k} ${i}`); } else if (J(e) !== J(B[k][i])) bad.push(`UI ${k} ${i} (nicht freigegeben)`); }); }
  console.log(`Oberfläche Mission 1: ${n} Einträge laut Freigabe geändert, Rest identisch`); }
// Oberfläche Mission A
{ const A = r('historie/ui-mission-a.v0.4.0.json'), B = r('historie/ui-mission-a.v0.5.0-paket-d.json'); if (JSON.stringify(A) !== JSON.stringify(B)) bad.push('UI Mission A'); else console.log('Oberfläche Mission A: identisch'); }
if (bad.length) { console.error('✗ NICHT freigegebene Abweichungen:', bad); process.exit(1); } else console.log('✓ Neue Referenzen enthalten ausschließlich die freigegebenen Abweichungen.');
