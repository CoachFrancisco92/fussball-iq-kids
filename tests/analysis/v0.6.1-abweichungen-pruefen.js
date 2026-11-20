// Hotfix V0.6.1: Prüft die vorgelegten Oberflächen-Abweichungen. Erlaubt ist NUR: in gesprochenen Texten („said“)
// wird das gedehnte „Toooor!“ zu „Tor!“. Alles Angezeigte (Rückmeldung, Banner, Titel …) bleibt identisch.
//   node tests/analysis/v0.6.1-abweichungen-pruefen.js
const fs = require('node:fs'), path = require('node:path');
const G = path.join(__dirname, '..', 'golden', 'historie'); // seit dem Referenzwechsel V0.6.1 archiviert
const sprich = (t) => String(t).replace(/\bto{2,}r!/gi, 'Tor!');
const erwartet = (e) => { const y = JSON.parse(JSON.stringify(e)); const walk = (o) => { for (const k of Object.keys(o)) { if (k === 'said' && Array.isArray(o[k])) o[k] = o[k].map(sprich); else if (o[k] && typeof o[k] === 'object') walk(o[k]); } }; walk(y); return y; };
const bad = []; let n = 0;
for (const f of fs.readdirSync(G).filter((x) => /^v0\.6\.1-ui-/.test(x) && x.endsWith('.json'))) {
  const p = JSON.parse(fs.readFileSync(path.join(G, f), 'utf8'));
  const listen = Array.isArray(p) ? { '': p } : p;
  for (const [ablauf, l] of Object.entries(listen)) for (const d of l) {
    n++;
    if (JSON.stringify(erwartet(d.alt)) !== JSON.stringify(d.neu)) bad.push(`${f} ${ablauf} #${d.eintrag}: nicht nur die Toraussprache geändert`);
    if (JSON.stringify(d.alt) === JSON.stringify(d.neu)) bad.push(`${f} #${d.eintrag}: leere Abweichung`);
  }
}
if (bad.length) { console.error('✗ ' + bad.join('\n  ')); process.exit(1); }
console.log(`✓ ${n} vorgelegte Abweichungen: ausschließlich gesprochenes „Toooor!“ → „Tor!“, Anzeige unverändert`);
