// Verhaltensgleichheit Mission 1: Die Engine muss exakt dasselbe liefern wie Version 0.2.3
// (vor der Trennung von Inhalten und Engine) – Entscheidungsmomente, Ansagen, Bewertung in drei Teilen,
// Rückmeldungen, Erklärungen, Ereignisse, Positionen, Phasen. Referenz: tests/golden/mission1.v0.2.3.json
// Die Referenz wurde mit tests/golden/trace.js aus dem Stand v0.2.3 (engine.js) erzeugt und wird nie angepasst,
// außer eine Verhaltensänderung ist ausdrücklich gewollt und freigegeben.
const test = require('node:test');
const assert = require('node:assert');
const E = require('./helpers/load.js');
const { traceAll } = require('./golden/trace.js');
const REF_HASH = '686075623233f3d3';
const ref = require('./golden/mission1.v0.2.3.json');
const { hash } = require('./golden/trace.js');
const now = traceAll(E);

// Vorgelegte, noch nicht freigegebene Abweichungen (Hotfix Endlosszene). Die Referenz bleibt unverändert.
// Der Test ist nur grün, wenn GENAU diese Abweichungen auftreten: Altwert = Referenz, Neuwert = aktueller Stand.
// Jede weitere oder andere Änderung schlägt an. Nach Freigabe: Referenz neu erzeugen und diese Datei löschen.
const fs = require('node:fs'), path = require('node:path');
const pfile = path.join(__dirname, 'golden', 'abweichungen-hotfix.json');
const pending = fs.existsSync(pfile) ? JSON.parse(fs.readFileSync(pfile, 'utf8')) : { scripted: {}, hinted: null, seeds: {} };
const same = (name, refVal, nowVal, p) => {
  if (!p) return assert.deepStrictEqual(nowVal, refVal, name);
  assert.strictEqual(hash(refVal), p.alt, `${name}: Referenz passt nicht zur vorgelegten Abweichung`);
  assert.strictEqual(hash(nowVal), p.neu, `${name}: Abweichung anders als vorgelegt (abweichungen-hotfix.json)`);
};

for (const name of Object.keys(ref.scripted)) {
  test(`Mission 1 identisch zu v0.2.3 (bis auf vorgelegte Abweichungen): Ablauf „${name}“`, () => same(name, ref.scripted[name], now.scripted[name], pending.scripted[name]));
}
test('Mission 1 identisch zu v0.2.3 (bis auf vorgelegte Abweichungen): Durchlauf mit der Hilfe', () => same('Hilfe', ref.hinted, now.hinted, pending.hinted));
test('Mission 1 identisch zu v0.2.3 (bis auf vorgelegte Abweichungen): 200 erzeugte Kinder-Abfolgen', () => {
  const diff = Object.keys(ref.seeds).filter((k) => ref.seeds[k] !== now.seeds[k]);
  const listed = Object.keys(pending.seeds);
  assert.deepStrictEqual(diff, listed.filter((k) => diff.includes(k)), 'nicht vorgelegte Abweichungen');
  assert.deepStrictEqual(listed.filter((k) => !diff.includes(k)), [], 'vorgelegte Abweichungen treten nicht mehr auf');
  for (const k of listed) assert.deepStrictEqual([ref.seeds[k], now.seeds[k]], [pending.seeds[k].alt, pending.seeds[k].neu], `Abfolge ${k}`);
});
test('Referenzdatei unverändert; Abweichungen mit Spielverlauf sind ausdrücklich als solche vorgelegt', () => {
  assert.strictEqual(hash(ref), REF_HASH, 'mission1.v0.2.3.json wurde verändert');
  // Der Hotfix ändert gewollt den Spielverlauf (Gegner spielen nicht mehr Pingpong). Jede betroffene Abfolge muss in der
  // vorgelegten Liste stehen – die Hashes oben stellen sicher, dass genau diese und keine anderen abweichen.
  assert.deepStrictEqual(Object.keys(pending.seeds).map((k) => 'Abfolge ' + k).filter((x) => !(pending.spielverlaufGeaendert || []).includes(x)), [], 'jede Abweichung als Spielverlaufsänderung dokumentiert');
});
