// Vergleich einer Oberflächen-Mitschrift (Liste von Einträgen) mit ihrer Referenz – wie e2e/transcript.mjs für Mission 1:
//   --pending-write F  schreibt die Abweichungen nach F (vorlegen, nicht freigeben)
//   sonst: Abweichungen sind nur erlaubt, wenn sie genau so in tests/golden/<praefix>-abweichungen-*.json stehen.
// Die Anzahl der Einträge muss gleich bleiben (sonst hat sich der Ablauf geändert, nicht nur Text/Anzeige).
import fs from 'node:fs';
import path from 'node:path';

export function vergleiche({ ref, log, gdir, praefix, refName, argv = process.argv }) {
  const J = (x) => JSON.stringify(x);
  const pi = argv.indexOf('--pending-write');
  if (pi > 0) {
    if (ref.length !== log.length) throw new Error(`andere Anzahl Einträge (${ref.length} → ${log.length}) – Ablauf geändert, nicht nur Text`);
    const out = [];
    ref.forEach((x, i) => { if (J(x) !== J(log[i])) out.push({ eintrag: i, alt: x, neu: log[i] }); });
    fs.writeFileSync(argv[pi + 1], JSON.stringify(out, null, 1) + '\n');
    return `Abweichungen geschrieben: ${argv[pi + 1]} (${out.length})`;
  }
  const listed = new Map();
  for (const f of fs.readdirSync(gdir).filter((n) => n.startsWith(praefix + '-abweichungen-') && n.endsWith('.json'))) {
    for (const d of JSON.parse(fs.readFileSync(path.join(gdir, f), 'utf8'))) listed.set(d.eintrag, d);
  }
  for (let k = 0; k < Math.max(ref.length, log.length); k++) {
    const d = listed.get(k);
    const ok = d ? J(d.alt) === J(ref[k]) && J(d.neu) === J(log[k]) : J(ref[k]) === J(log[k]);
    if (!ok) throw new Error(`Mitschrift weicht ab bei Eintrag ${k}${d ? ' (anders als vorgelegt)' : ''}\n  Referenz: ${J(ref[k])}\n  jetzt:    ${J(log[k])}`);
  }
  return `Mitschrift identisch zur Referenz ${refName} (${ref.length} Einträge)${listed.size ? ` bis auf ${listed.size} vorgelegte Abweichung(en)` : ''}`;
}
