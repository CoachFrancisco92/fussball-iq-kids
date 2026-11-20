// Prüft den Referenzwechsel V0.5.1 (Oberflächen-Mitschriften), freigegeben vom PO am 19.11.2026:
// neue Referenz = alte Referenz, nur an den freigegebenen Einträgen ersetzt durch den vorgelegten Stand ("neu").
// Jede zusätzliche, nicht vorgelegte Abweichung lässt die Prüfung fehlschlagen.
//   node tests/analysis/v0.5.1-referenzwechsel-pruefen.js
const fs = require('node:fs');
const path = require('node:path');
const G = path.join(__dirname, '..', 'golden');
const r = (f) => JSON.parse(fs.readFileSync(path.join(G, f), 'utf8'));
const J = (x) => JSON.stringify(x);
let ok = true;
const fail = (m) => { console.error('✗ ' + m); ok = false; };

function pruefe(name, alt, neu, liste) {
  if (alt.length !== neu.length) return fail(`${name}: Anzahl Einträge ${alt.length} → ${neu.length}`);
  const L = new Map(liste.map((d) => [d.eintrag, d]));
  let n = 0;
  for (let i = 0; i < alt.length; i++) {
    const d = L.get(i);
    if (d) {
      if (J(d.alt) !== J(alt[i])) return fail(`${name} #${i}: alter Stand ≠ vorgelegtes „alt“`);
      if (J(d.neu) !== J(neu[i])) return fail(`${name} #${i}: neue Referenz ≠ vorgelegtes „neu“`);
      n++;
    } else if (J(alt[i]) !== J(neu[i])) return fail(`${name} #${i}: nicht freigegebene Abweichung\n  alt: ${J(alt[i])}\n  neu: ${J(neu[i])}`);
  }
  console.log(`✓ ${name}: ${alt.length} Einträge, genau ${n} freigegebene Abweichung(en) übernommen, sonst identisch`);
  return n;
}

// Mission 1: drei Abläufe, je Ablauf eine Liste
{
  const alt = r('historie/ui-transcript.v0.5.0.json'), neu = r('historie/ui-transcript.v0.5.1.json'), liste = r('historie/v0.5.1-ui-mission1-abweichungen.json');
  if (J(Object.keys(alt)) !== J(Object.keys(neu))) fail('Mission 1: andere Abläufe');
  let n = 0;
  for (const k of Object.keys(alt)) n += pruefe(`Mission 1 „${k}“`, alt[k], neu[k], liste[k] || []) || 0;
  if (n !== 3) fail(`Mission 1: ${n} statt 3 freigegebene Abweichungen`);
}
{
  const n = pruefe('Mission A', r('historie/ui-mission-a.v0.5.0.json'), r('historie/ui-mission-a.v0.5.1.json'), r('historie/v0.5.1-ui-missionA-abweichungen.json'));
  if (n !== 1) fail(`Mission A: ${n} statt 1`);
}
{
  const liste = r('historie/v0.5.1-ui-freieBahn-abweichungen.json');
  const n = pruefe('Freie Bahn', r('historie/ui-freie-bahn.v0.5.0.json'), r('historie/ui-freie-bahn.v0.5.1.json'), liste);
  if (n !== 50) fail(`Freie Bahn: ${n} statt 50`);
  // freigegeben war ausschließlich: Aktionsknöpfe entfallen
  for (const d of liste) {
    const diff = Object.keys({ ...d.alt, ...d.neu }).filter((k) => J(d.alt[k]) !== J(d.neu[k]));
    if (J(diff) !== '["actions"]' || d.neu.actions.length !== 0) fail(`Freie Bahn #${d.eintrag}: andere Änderung als „Aktionsknöpfe entfallen“`);
  }
}
process.exit(ok ? 0 : 1);
