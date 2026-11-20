// Prüft den Referenzwechsel V0.5.x → V0.6.0 (V0.6a, freigegeben vom PO am 20.11.2026):
// Die neuen Referenzen enthalten AUSSCHLIESSLICH die vorgelegten Abweichungen (tests/golden/historie/v0.6.0-*.json).
// Zusätzlich für Mission 1: Simulation und Bewertung der Einzelaktionen unverändert – in den vollständig gespeicherten
// Abläufen (feste Abläufe + Hilfe-Durchlauf) unterscheiden sich nur die gesprochenen/angezeigten Rückmeldesätze
// (fb.tip, fb.say); die 200 Kinder-Abfolgen sind laut diff.js „nur Text, Spielverlauf nirgends geändert“.
//   node tests/analysis/v0.6.0-referenzwechsel-pruefen.js
const fs = require('node:fs');
const path = require('node:path');
const { hash } = require('../golden/trace.js');
const G = path.join(__dirname, '..', 'golden');
const r = (f) => JSON.parse(fs.readFileSync(path.join(G, f), 'utf8'));
const J = (x) => JSON.stringify(x);
const bad = [];

// ---- Mission 1, Engine
{
  const A = r('historie/mission1.v0.5.0.json'), B = r('mission1.v0.6.0.json'), P = r('historie/v0.6.0-mission1-abweichungen.json');
  if (J(P.spielverlaufGeaendert) !== '[]') bad.push('M1: vorgelegte Liste meldet Spielverlaufsänderungen');
  for (const k of Object.keys(A.scripted)) {
    const p = P.scripted[k];
    if (p ? !(hash(A.scripted[k]) === p.alt && hash(B.scripted[k]) === p.neu) : J(A.scripted[k]) !== J(B.scripted[k])) bad.push('M1 Ablauf ' + k);
  }
  if (P.hinted ? !(hash(A.hinted) === P.hinted.alt && hash(B.hinted) === P.hinted.neu) : J(A.hinted) !== J(B.hinted)) bad.push('M1 Hilfe-Durchlauf');
  for (const k of Object.keys(A.seeds)) {
    const p = P.seeds[k];
    if (p ? !(A.seeds[k] === p.alt && B.seeds[k] === p.neu) : A.seeds[k] !== B.seeds[k]) bad.push('M1 Abfolge ' + k);
  }
  // Inhaltlich: ohne die Rückmeldesätze sind alle gespeicherten Schritte identisch (Simulation, Ereignisse, Bewertung, Hilfe)
  const ohneText = (log) => log.map((x) => { const y = JSON.parse(J(x)); delete y.fb.tip; delete y.fb.say; return y; });
  let n = 0, schritte = 0;
  for (const k of Object.keys(A.scripted).concat(['__hilfe'])) {
    const a = k === '__hilfe' ? A.hinted : A.scripted[k], b = k === '__hilfe' ? B.hinted : B.scripted[k];
    if (a.length !== b.length) { bad.push(`M1 ${k}: andere Anzahl Schritte`); continue; }
    const ta = ohneText(a), tb = ohneText(b);
    ta.forEach((x, i) => { schritte++; if (J(x) !== J(tb[i])) { const d = Object.keys(x).filter((q) => J(x[q]) !== J(tb[i][q])); bad.push(`M1 ${k} #${i}: nicht nur Text geändert (${d.join(', ')})`); } else if (J(a[i]) !== J(b[i])) n++; });
  }
  console.log(`Mission 1 Engine: ${Object.keys(P.seeds).length} Abfolgen + ${Object.keys(P.scripted).length} Abläufe + Hilfe laut Freigabe; in ${schritte} gespeicherten Schritten nur Sätze geändert (${n})`);
}
// ---- Mission A und „Freie Bahn!“, Engine (neue Situationen)
for (const [name, alt, neu, liste] of [['Mission A', 'historie/mission-a.v0.5.0.json', 'mission-a.v0.6.0.json', 'historie/v0.6.0-missionA-abweichungen.json'], ['Freie Bahn', 'historie/freie-bahn.v0.5.0.json', 'freie-bahn.v0.6.0.json', 'historie/v0.6.0-freieBahn-abweichungen.json']]) {
  const A = r(alt), B = r(neu), P = r(liste);
  for (const k of Object.keys(A.styles)) { const p = P.styles[k]; if (p ? !(hash(A.styles[k]) === p.alt && hash(B.styles[k]) === p.neu) : J(A.styles[k]) !== J(B.styles[k])) bad.push(`${name} Spielweise ${k}`); }
  if (J(Object.keys(A.styles)) !== J(Object.keys(B.styles))) bad.push(`${name}: andere Spielweisen`);
  for (const k of Object.keys(A.seeds)) { const p = P.seeds[k]; if (p ? !(A.seeds[k] === p.alt && B.seeds[k] === p.neu) : A.seeds[k] !== B.seeds[k]) bad.push(`${name} Abfolge ${k}`); }
  console.log(`${name} Engine: ${Object.keys(P.styles).length} Spielweisen, ${Object.keys(P.seeds).length} Abfolgen laut Freigabe, Rest identisch`);
}
// ---- Oberfläche Mission 1 (Einträge)
{
  const A = r('historie/ui-transcript.v0.5.1.json'), B = r('ui-transcript.v0.6.0.json'), P = r('historie/v0.6.0-ui-mission1-abweichungen.json');
  if (J(Object.keys(A)) !== J(Object.keys(B))) bad.push('UI Mission 1: andere Abläufe');
  let n = 0;
  for (const k of Object.keys(A)) {
    if (A[k].length !== B[k].length) { bad.push('UI Mission 1 Länge ' + k); continue; }
    const L = new Map((P[k] || []).map((d) => [d.eintrag, d]));
    A[k].forEach((e, i) => { const d = L.get(i); if (d) { n++; if (J(d.alt) !== J(e) || J(d.neu) !== J(B[k][i])) bad.push(`UI Mission 1 ${k} #${i}: anders als vorgelegt`); } else if (J(e) !== J(B[k][i])) bad.push(`UI Mission 1 ${k} #${i}: nicht freigegeben`); });
  }
  console.log(`Oberfläche Mission 1: ${n} Einträge laut Freigabe geändert, Rest identisch`);
}
// ---- Oberfläche Mission A und „Freie Bahn!“ (vorgelegte Ersatz-Mitschriften; Ablauf neu durch P1/P3/P4)
const uhash = (x) => require('node:crypto').createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0, 16);
for (const [name, alt, neu, liste] of [['Mission A', 'historie/ui-mission-a.v0.5.1.json', 'ui-mission-a.v0.6.0.json', 'historie/v0.6.0-ui-missionA-ersatz.json'], ['Freie Bahn', 'historie/ui-freie-bahn.v0.5.1.json', 'ui-freie-bahn.v0.6.0.json', 'historie/v0.6.0-ui-freieBahn-ersatz.json']]) {
  const A = r(alt), B = r(neu), P = r(liste);
  if (!P.ersatz || P.altHash !== uhash(A)) bad.push(`UI ${name}: Ersatz-Liste passt nicht zur alten Referenz`);
  if (J(P.neu) !== J(B)) bad.push(`UI ${name}: neue Referenz ≠ vorgelegte Ersatz-Mitschrift`);
  else console.log(`Oberfläche ${name}: neue Referenz = vorgelegte Ersatz-Mitschrift (${A.length} → ${B.length} Einträge)`);
}
// ---- Verweise
{
  const REF = require('../golden/referenz.js');
  if (REF.file !== 'mission1.v0.6.0.json' || REF.ui !== 'ui-transcript.v0.6.0.json') bad.push('referenz.js: Mission 1 zeigt nicht auf v0.6.0');
  if (REF.missionA.file !== 'mission-a.v0.6.0.json' || REF.missionA.hash !== hash(r('mission-a.v0.6.0.json')) || REF.missionA.ui !== 'ui-mission-a.v0.6.0.json') bad.push('referenz.js: Mission A');
  if (REF.freieBahn.file !== 'freie-bahn.v0.6.0.json' || REF.freieBahn.hash !== hash(r('freie-bahn.v0.6.0.json')) || REF.freieBahn.ui !== 'ui-freie-bahn.v0.6.0.json') bad.push('referenz.js: Freie Bahn');
  const offen = fs.readdirSync(G).filter((n) => /abweichungen/.test(n) && n.endsWith('.json'));
  if (offen.length) bad.push('noch offene Abweichungslisten: ' + offen.join(', '));
}
if (bad.length) { console.error('✗ NICHT freigegebene Abweichungen / Fehler:\n  ' + bad.slice(0, 20).join('\n  ')); process.exit(1); }
console.log('✓ Neue Referenzen v0.6.0 enthalten ausschließlich die freigegebenen Abweichungen.');
