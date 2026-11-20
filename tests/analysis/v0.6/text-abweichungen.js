// V0.6a P2: Klassifiziert die Abweichungen von Mission 1 gegenüber der Referenz (tests/golden/referenz.js).
// Nachweis: Spielverlauf, Stern, Entscheidung, Ziel und Hilfe unverändert – geändert ist nur der gesprochene Satz.
// Ändert keine Referenz. Aufruf: node tests/analysis/v0.6/text-abweichungen.js [--md pfad]
const fs = require('node:fs');
const { changes, gameplayChanged, seedsChanged } = require('../../golden/diff.js');
const felder = new Set(), paare = new Map();
for (const c of changes) {
  for (const k of Object.keys(c.vorher)) if (JSON.stringify(c.vorher[k]) !== JSON.stringify(c.nachher[k])) felder.add(k);
  const key = c.aktion + '\n  alt: ' + c.vorher.gesagt + '\n  neu: ' + c.nachher.gesagt;
  paare.set(key, (paare.get(key) || 0) + 1);
}
const nurText = gameplayChanged.length === 0 && [...felder].every((k) => k === 'gesagt');
const zeilen = [`Mission 1: ${changes.length} geänderte Entscheidungen, ${seedsChanged.length}/200 Kinder-Abfolgen betroffen`,
  `Spielverlauf geändert: ${gameplayChanged.length ? gameplayChanged.join(', ') : 'nirgends'}`,
  `Geänderte Felder: ${[...felder].join(', ') || 'keine'} → ${nurText ? 'NUR TEXT' : 'NICHT NUR TEXT'}`,
  `Verschiedene Satzänderungen: ${paare.size}`, '',
  ...[...paare].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n}× ${k}`)];
console.log(zeilen.join('\n'));
const mi = process.argv.indexOf('--md'); if (mi > 0) fs.writeFileSync(process.argv[mi + 1], '```\n' + zeilen.join('\n') + '\n```\n');
if (!nurText) process.exitCode = 1;
