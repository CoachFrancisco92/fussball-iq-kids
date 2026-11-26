// Prüft den Referenzwechsel V0.6.0/V0.6.1 → V0.6.2 (freigegeben vom PO am 21.11.2026):
//  - Engine (Mission 1, „Welches Tor ist frei?“, „Freie Bahn!“): neue Referenz = alte + genau die vorgelegten Abweichungen
//    (historie/v0.6.2-{mission1,missionA,freieBahn}-abweichungen.json); in allen vollständig gespeicherten Abläufen unterscheiden
//    sich ausschließlich Sätze (Ansage ctx.title/say, Rückmeldung fb.text/tip/say, Bewertungstexte „why“) – Spielverlauf,
//    Ereignisse, Bewertung (gut/schlecht) und Hilfe sind identisch.
//  - Oberfläche (3 Mitschriften): neue Referenz = alte + genau die vorgelegten Einträge (historie/v0.6.2-ui-*-abweichungen.json),
//    darin zusätzlich ausschließlich die 23 freigegebenen Folge-Hinweise (historie/v0.6.2-ux-folge-freigabe.json, je ein
//    gesprochener Satz „Schau!“ → Engine-Hinweis). Jede andere Änderung schlägt fehl.
//   node tests/analysis/v0.6.2-referenzwechsel-pruefen.js
const fs = require('node:fs');
const path = require('node:path');
const { hash } = require('../golden/trace.js');
const G = path.join(__dirname, '..', 'golden');
const r = (f) => JSON.parse(fs.readFileSync(path.join(G, f), 'utf8'));
const J = (x) => JSON.stringify(x);
const bad = [];

// Nur Sätze entfernen: Ansage, Rückmeldung, Bewertungstexte (why) – alles andere bleibt im Vergleich
const ohneWhy = (y) => { if (Array.isArray(y)) y.forEach(ohneWhy); else if (y && typeof y === 'object') for (const k of Object.keys(y)) { if (k === 'why' && typeof y[k] === 'string') delete y[k]; else ohneWhy(y[k]); } return y; };
const schritt = (y) => { if (y.ctx) { delete y.ctx.title; delete y.ctx.say; } if (y.fb) { delete y.fb.text; delete y.fb.tip; delete y.fb.say; } if (Array.isArray(y.out)) y.out.forEach(schritt); return y; };
const ohneText = (log) => log.map((x) => ohneWhy(schritt(JSON.parse(J(x)))));  // Mission A/„Freie Bahn!“: Durchläufe {out:[Schritte]}
function nurSaetze(name, a, b) {
  if (a.length !== b.length) { bad.push(`${name}: andere Anzahl Schritte`); return [0, 0]; }
  const ta = ohneText(a), tb = ohneText(b); let n = 0;
  ta.forEach((x, i) => { if (J(x) !== J(tb[i])) { const d = Object.keys(x).filter((q) => J(x[q]) !== J(tb[i][q])); bad.push(`${name} #${i}: nicht nur Sätze geändert (${d.join(', ')})`); } else if (J(a[i]) !== J(b[i])) n++; });
  return [a.length, n];
}

// ---- Mission 1, Engine
{
  const A = r('historie/mission1.v0.6.0.json'), B = r('mission1.v0.6.2.json'), P = r('historie/v0.6.2-mission1-abweichungen.json');
  if (J(P.spielverlaufGeaendert) !== '[]') bad.push('M1: vorgelegte Liste meldet Spielverlaufsänderungen');
  if (J(Object.keys(A.scripted)) !== J(Object.keys(B.scripted)) || J(Object.keys(A.seeds)) !== J(Object.keys(B.seeds))) bad.push('M1: andere Abläufe/Abfolgen');
  for (const k of Object.keys(A.scripted)) { const p = P.scripted[k]; if (p ? !(hash(A.scripted[k]) === p.alt && hash(B.scripted[k]) === p.neu) : J(A.scripted[k]) !== J(B.scripted[k])) bad.push('M1 Ablauf ' + k + ': anders als vorgelegt'); }
  if (P.hinted ? !(hash(A.hinted) === P.hinted.alt && hash(B.hinted) === P.hinted.neu) : J(A.hinted) !== J(B.hinted)) bad.push('M1 Hilfe-Durchlauf: anders als vorgelegt');
  for (const k of Object.keys(A.seeds)) { const p = P.seeds[k]; if (p ? !(A.seeds[k] === p.alt && B.seeds[k] === p.neu) : A.seeds[k] !== B.seeds[k]) bad.push('M1 Abfolge ' + k + ': anders als vorgelegt'); }
  let s = 0, n = 0;
  for (const k of Object.keys(A.scripted)) { const [x, y] = nurSaetze('M1 ' + k, A.scripted[k], B.scripted[k]); s += x; n += y; }
  { const [x, y] = nurSaetze('M1 Hilfe', A.hinted, B.hinted); s += x; n += y; }
  console.log(`Mission 1 Engine: ${Object.keys(P.scripted).length} Abläufe${P.hinted ? ' + Hilfe' : ''} + ${Object.keys(P.seeds).length} Abfolgen laut Liste; in ${s} gespeicherten Schritten nur Sätze geändert (${n})`);
}
// ---- Mission A und „Freie Bahn!“, Engine
for (const [name, alt, neu, liste] of [['Mission A', 'historie/mission-a.v0.6.0.json', 'mission-a.v0.6.2.json', 'historie/v0.6.2-missionA-abweichungen.json'], ['Freie Bahn', 'historie/freie-bahn.v0.6.0.json', 'freie-bahn.v0.6.2.json', 'historie/v0.6.2-freieBahn-abweichungen.json']]) {
  const A = r(alt), B = r(neu), P = r(liste);
  if (J(Object.keys(A.styles)) !== J(Object.keys(B.styles)) || J(Object.keys(A.seeds)) !== J(Object.keys(B.seeds))) bad.push(`${name}: andere Spielweisen/Abfolgen`);
  for (const k of Object.keys(A.styles)) { const p = P.styles[k]; if (p ? !(hash(A.styles[k]) === p.alt && hash(B.styles[k]) === p.neu) : J(A.styles[k]) !== J(B.styles[k])) bad.push(`${name} Spielweise ${k}: anders als vorgelegt`); }
  for (const k of Object.keys(A.seeds)) { const p = P.seeds[k]; if (p ? !(A.seeds[k] === p.alt && B.seeds[k] === p.neu) : A.seeds[k] !== B.seeds[k]) bad.push(`${name} Abfolge ${k}: anders als vorgelegt`); }
  let s = 0, n = 0;
  for (const k of Object.keys(A.styles)) { const a = A.styles[k], b = B.styles[k]; if (Array.isArray(a)) { const [x, y] = nurSaetze(`${name} ${k}`, a, b); s += x; n += y; } }
  console.log(`${name} Engine: ${Object.keys(P.styles).length} Spielweisen + ${Object.keys(P.seeds).length} Abfolgen laut Liste; in ${s} gespeicherten Schritten nur Sätze geändert (${n})`);
}
// ---- Oberfläche: vorgelegte Einträge + 23 freigegebene Folge-Hinweise, sonst identisch
const FOLGE = r('historie/v0.6.2-ux-folge-freigabe.json').aenderungen;
const ERLAUBT = new Set(['Schau zum Ball!', 'Schau auf die Tore!', 'Schau auf den Roten!', 'Schau auf die Roten!']);
let folgeGesamt = 0;
for (const [name, key, alt, neu, liste] of [
  ['Oberfläche Mission 1', 'mission1', 'historie/ui-transcript.v0.6.1.json', 'ui-transcript.v0.6.2.json', 'historie/v0.6.2-ui-mission1-abweichungen.json'],
  ['Oberfläche Mission A', 'missionA', 'historie/ui-mission-a.v0.6.1.json', 'ui-mission-a.v0.6.2.json', 'historie/v0.6.2-ui-missionA-abweichungen.json'],
  ['Oberfläche Freie Bahn', 'freieBahn', 'historie/ui-freie-bahn.v0.6.1.json', 'ui-freie-bahn.v0.6.2.json', 'historie/v0.6.2-ui-freieBahn-abweichungen.json']]) {
  const A = r(alt), B = r(neu), L = r(liste);
  const flows = Array.isArray(A) ? { '': [A, B, L] } : Object.fromEntries(Object.keys(A).map((k) => [k, [A[k], B[k], L[k] || []]]));
  if (!Array.isArray(A) && J(Object.keys(A)) !== J(Object.keys(B))) bad.push(name + ': andere Abläufe');
  let n = 0, f = 0;
  for (const [k, [a, b, l]] of Object.entries(flows)) {
    if (!b || a.length !== b.length) { bad.push(`${name} ${k}: andere Anzahl Einträge`); continue; }
    const LM = new Map(l.map((d) => [d.eintrag, d]));
    a.forEach((e, i) => {
      const d = LM.get(i);
      if (!d) { if (J(e) !== J(b[i])) bad.push(`${name} ${k} #${i}: nicht freigegeben`); return; }
      n++;
      if (J(d.alt) !== J(e)) bad.push(`${name} ${k} #${i}: Liste passt nicht zur alten Referenz`);
      const erwartet = JSON.parse(J(d.neu));
      for (const fz of FOLGE.filter((z) => z.mitschrift === key && z.ablauf === k && z.eintrag === i)) {
        if (!erwartet.said || erwartet.said[fz.satz] !== 'Schau!' || !ERLAUBT.has(fz.neu)) { bad.push(`${name} ${k} #${i}: Folge-Freigabe passt nicht`); continue; }
        erwartet.said[fz.satz] = fz.neu; f++;
      }
      if (J(erwartet) !== J(b[i])) bad.push(`${name} ${k} #${i}: anders als freigegeben`);
    });
  }
  folgeGesamt += f;
  console.log(`${name}: ${n} vorgelegte Einträge, davon ${f} mit freigegebenem Folge-Hinweis; Rest identisch`);
}
if (FOLGE.length !== 23 || folgeGesamt !== 23) bad.push(`erwartet 23 Folge-Hinweise, Freigabe ${FOLGE.length}, angewandt ${folgeGesamt}`);
// ---- Verweise und offene Listen
{
  const REF = require('../golden/referenz.js');
  if (REF.file !== 'mission1.v0.6.2.json' || REF.ui !== 'ui-transcript.v0.6.2.json') bad.push('referenz.js: Mission 1 zeigt nicht auf v0.6.2');
  if (REF.missionA.file !== 'mission-a.v0.6.2.json' || REF.missionA.hash !== hash(r('mission-a.v0.6.2.json')) || REF.missionA.ui !== 'ui-mission-a.v0.6.2.json') bad.push('referenz.js: Mission A');
  if (REF.freieBahn.file !== 'freie-bahn.v0.6.2.json' || REF.freieBahn.hash !== hash(r('freie-bahn.v0.6.2.json')) || REF.freieBahn.ui !== 'ui-freie-bahn.v0.6.2.json') bad.push('referenz.js: Freie Bahn');
  const offen = fs.readdirSync(G).filter((x) => /abweichungen/.test(x) && x.endsWith('.json'));
  if (offen.length) bad.push('noch offene Abweichungslisten: ' + offen.join(', '));
}
if (bad.length) { console.error('✗ NICHT freigegebene Abweichungen / Fehler:\n  ' + bad.slice(0, 25).join('\n  ') + (bad.length > 25 ? `\n  … (${bad.length})` : '')); process.exit(1); }
console.log('✓ Referenzwechsel V0.6.2: ausschließlich die sechs freigegebenen Listen und die 23 freigegebenen Folge-Hinweise.');
