// Prüft den Referenzwechsel V0.6.0 → V0.6.1 (Hotfix Toraussprache, freigegeben 20.11.2026):
// Neue Oberflächen-Referenzen = alte + genau die 36 vorgelegten Abweichungen; jede Abweichung ändert ausschließlich
// gesprochene Texte („said“) von „Toooor!“ zu „Tor!“; Engine-Referenzen bleiben v0.6.0.
//   node tests/analysis/v0.6.1-referenzwechsel-pruefen.js
const fs = require('node:fs'), path = require('node:path');
const G = path.join(__dirname, '..', 'golden');
const r = (f) => JSON.parse(fs.readFileSync(path.join(G, f), 'utf8'));
const J = (x) => JSON.stringify(x);
const sprich = (t) => String(t).replace(/\bto{2,}r!/gi, 'Tor!');
const nurAussprache = (e) => { const y = JSON.parse(J(e)); const walk = (o) => { for (const k of Object.keys(o)) { if (k === 'said' && Array.isArray(o[k])) o[k] = o[k].map(sprich); else if (o[k] && typeof o[k] === 'object') walk(o[k]); } }; walk(y); return y; };
const bad = []; let gesamt = 0;
function pruefe(name, A, B, liste) {
  const flows = Array.isArray(A) ? { '': [A, B, liste] } : Object.fromEntries(Object.keys(A).map((k) => [k, [A[k], B[k], liste[k] || []]]));
  if (!Array.isArray(A) && J(Object.keys(A)) !== J(Object.keys(B))) bad.push(name + ': andere Abläufe');
  let n = 0;
  for (const [k, [a, b, l]] of Object.entries(flows)) {
    if (a.length !== b.length) { bad.push(`${name} ${k}: andere Anzahl Einträge`); continue; }
    const L = new Map(l.map((d) => [d.eintrag, d]));
    a.forEach((e, i) => {
      const d = L.get(i);
      if (d) { n++; if (J(d.alt) !== J(e) || J(d.neu) !== J(b[i])) bad.push(`${name} ${k} #${i}: anders als vorgelegt`); if (J(nurAussprache(e)) !== J(b[i])) bad.push(`${name} ${k} #${i}: nicht nur Aussprache`); }
      else if (J(e) !== J(b[i])) bad.push(`${name} ${k} #${i}: nicht freigegeben`);
    });
  }
  gesamt += n; console.log(`${name}: ${n} freigegebene Abweichungen (nur gesprochenes „Tor!“), Rest identisch`);
}
pruefe('Oberfläche Mission 1', r('historie/ui-transcript.v0.6.0.json'), r('ui-transcript.v0.6.1.json'), r('historie/v0.6.1-ui-mission1-abweichungen.json'));
pruefe('Oberfläche Mission A', r('historie/ui-mission-a.v0.6.0.json'), r('ui-mission-a.v0.6.1.json'), r('historie/v0.6.1-ui-missionA-abweichungen.json'));
pruefe('Oberfläche Freie Bahn', r('historie/ui-freie-bahn.v0.6.0.json'), r('ui-freie-bahn.v0.6.1.json'), r('historie/v0.6.1-ui-freieBahn-abweichungen.json'));
const REF = require('../golden/referenz.js');
if (REF.ui !== 'ui-transcript.v0.6.1.json' || REF.missionA.ui !== 'ui-mission-a.v0.6.1.json' || REF.freieBahn.ui !== 'ui-freie-bahn.v0.6.1.json') bad.push('referenz.js: Oberfläche nicht auf v0.6.1');
if (REF.file !== 'mission1.v0.6.0.json' || REF.missionA.file !== 'mission-a.v0.6.0.json' || REF.freieBahn.file !== 'freie-bahn.v0.6.0.json') bad.push('referenz.js: Engine-Referenzen dürfen sich nicht ändern');
if (gesamt !== 36) bad.push(`erwartet 36 Abweichungen, gefunden ${gesamt}`);
const offen = fs.readdirSync(G).filter((n) => /abweichungen/.test(n) && n.endsWith('.json')); if (offen.length) bad.push('offene Listen: ' + offen.join(', '));
if (bad.length) { console.error('✗ ' + bad.slice(0, 20).join('\n  ')); process.exit(1); }
console.log('✓ Referenzwechsel V0.6.1: ausschließlich die 36 freigegebenen Aussprache-Änderungen.');
