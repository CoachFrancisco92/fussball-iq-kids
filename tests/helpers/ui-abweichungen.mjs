// Vergleich einer Oberflächen-Mitschrift (Liste von Einträgen) mit ihrer Referenz – wie e2e/transcript.mjs für Mission 1:
//   --pending-write F  schreibt die Abweichungen nach F (vorlegen, nicht freigeben)
//   sonst: Abweichungen sind nur erlaubt, wenn sie genau so in tests/golden/<praefix>-abweichungen-*.json stehen.
// Gleiche Anzahl Einträge: Abweichungen je Eintrag. Andere Anzahl (Ablauf geändert, z. B. neue Situationen, V0.6a):
// die ganze neue Mitschrift wird als Ersatz vorgelegt ({ ersatz: true, altHash, neu: [...] }) – gilt nur, solange die
// Referenz unverändert ist (altHash); die Referenz selbst wird erst nach Freigabe neu erzeugt.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const hashOf = (x) => crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0, 16);

export function vergleiche({ ref, log, gdir, praefix, refName, argv = process.argv }) {
  const J = (x) => JSON.stringify(x);
  const pi = argv.indexOf('--pending-write');
  if (pi > 0) {
    if (ref.length !== log.length) {
      fs.writeFileSync(argv[pi + 1], JSON.stringify({ ersatz: true, grund: 'Ablauf geändert (andere Anzahl Einträge) – ganze Mitschrift zur Freigabe vorgelegt', altHash: hashOf(ref), alt: ref.length, neu: log }, null, 1) + '\n');
      return `Ersatz-Mitschrift vorgelegt: ${argv[pi + 1]} (${ref.length} → ${log.length} Einträge)`;
    }
    const out = [];
    ref.forEach((x, i) => { if (J(x) !== J(log[i])) out.push({ eintrag: i, alt: x, neu: log[i] }); });
    fs.writeFileSync(argv[pi + 1], JSON.stringify(out, null, 1) + '\n');
    return `Abweichungen geschrieben: ${argv[pi + 1]} (${out.length})`;
  }
  const listed = new Map();
  for (const f of fs.readdirSync(gdir).filter((n) => n.startsWith(praefix + '-abweichungen-') && n.endsWith('.json'))) {
    const p = JSON.parse(fs.readFileSync(path.join(gdir, f), 'utf8'));
    if (p && p.ersatz) {
      if (p.altHash !== hashOf(ref)) throw new Error(`${f}: Ersatz-Mitschrift passt nicht mehr zur Referenz ${refName}`);
      if (J(p.neu) !== J(log)) { const k = p.neu.findIndex((x, i) => J(x) !== J(log[i])); throw new Error(`Mitschrift weicht von der vorgelegten Ersatz-Mitschrift ${f} ab bei Eintrag ${k < 0 ? p.neu.length : k}\n  vorgelegt: ${J(p.neu[k])}\n  jetzt:     ${J(log[k])}`); }
      return `Mitschrift = vorgelegte Ersatz-Mitschrift ${f} (${refName}: ${ref.length} → ${log.length} Einträge, noch nicht freigegeben)`;
    }
    for (const d of p) listed.set(d.eintrag, d);
  }
  for (let k = 0; k < Math.max(ref.length, log.length); k++) {
    const d = listed.get(k);
    const ok = d ? J(d.alt) === J(ref[k]) && J(d.neu) === J(log[k]) : J(ref[k]) === J(log[k]);
    if (!ok) throw new Error(`Mitschrift weicht ab bei Eintrag ${k}${d ? ' (anders als vorgelegt)' : ''}\n  Referenz: ${J(ref[k])}\n  jetzt:    ${J(log[k])}`);
  }
  return `Mitschrift identisch zur Referenz ${refName} (${ref.length} Einträge)${listed.size ? ` bis auf ${listed.size} vorgelegte Abweichung(en)` : ''}`;
}
