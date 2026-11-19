// Verhaltensgleichheit Mission 1: Die Engine muss exakt dasselbe liefern wie die gültige Referenzaufnahme
// (tests/golden/referenz.js) – Entscheidungsmomente, Ansagen, Bewertung in drei Teilen, Rückmeldungen, Erklärungen,
// Ereignisse, Positionen, Phasen. Erzeugt mit tests/golden/trace.js; angepasst nur nach ausdrücklicher Freigabe.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs'), path = require('node:path');
const E = require('./helpers/load.js');
const { traceAll, hash } = require('./golden/trace.js');
const REF = require('./golden/referenz.js');
const REF_HASH = '7dade21ad5c16c25';
const ref = require('./golden/' + REF.file);
const now = traceAll(E);

// Vorgelegte, noch nicht freigegebene Abweichungen (tests/golden/abweichungen-*.json, erzeugt mit diff.js).
// Der Test ist nur grün, wenn GENAU diese Abweichungen auftreten: Altwert = Referenz, Neuwert = aktueller Stand.
// Nach Freigabe: Referenz neu erzeugen, Datei nach tests/golden/historie/ verschieben.
const dir = path.join(__dirname, 'golden');
const pending = { scripted: {}, hinted: null, seeds: {}, spielverlaufGeaendert: [] };
for (const f of fs.readdirSync(dir).filter((n) => /^abweichungen-.*\.json$/.test(n))) {
  const p = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  Object.assign(pending.scripted, p.scripted); Object.assign(pending.seeds, p.seeds);
  if (p.hinted) pending.hinted = p.hinted; pending.spielverlaufGeaendert.push(...(p.spielverlaufGeaendert || []));
}
const same = (name, refVal, nowVal, p) => {
  if (!p) return assert.deepStrictEqual(nowVal, refVal, name);
  assert.strictEqual(hash(refVal), p.alt, `${name}: Referenz passt nicht zur vorgelegten Abweichung`);
  assert.strictEqual(hash(nowVal), p.neu, `${name}: Abweichung anders als vorgelegt (abweichungen-*.json)`);
};

for (const name of Object.keys(ref.scripted)) {
  test(`Mission 1 identisch zur Referenz ${REF.seit} (bis auf vorgelegte Abweichungen): Ablauf „${name}“`, () => same(name, ref.scripted[name], now.scripted[name], pending.scripted[name]));
}
test(`Mission 1 identisch zur Referenz ${REF.seit} (bis auf vorgelegte Abweichungen): Durchlauf mit der Hilfe`, () => same('Hilfe', ref.hinted, now.hinted, pending.hinted));
test(`Mission 1 identisch zur Referenz ${REF.seit} (bis auf vorgelegte Abweichungen): 200 erzeugte Kinder-Abfolgen`, () => {
  const diff = Object.keys(ref.seeds).filter((k) => ref.seeds[k] !== now.seeds[k]);
  const listed = Object.keys(pending.seeds);
  assert.deepStrictEqual(diff, listed.filter((k) => diff.includes(k)), 'nicht vorgelegte Abweichungen');
  assert.deepStrictEqual(listed.filter((k) => !diff.includes(k)), [], 'vorgelegte Abweichungen treten nicht mehr auf');
  for (const k of listed) assert.deepStrictEqual([ref.seeds[k], now.seeds[k]], [pending.seeds[k].alt, pending.seeds[k].neu], `Abfolge ${k}`);
});
test('Referenzdatei unverändert; jede vorgelegte Abweichungsliste nennt Spielverlaufsänderungen und ihren Bericht', () => {
  assert.strictEqual(hash(ref), REF_HASH, REF.file + ' wurde verändert');
  // Ob sich der Spielverlauf geändert hat, ermittelt diff.js gegen den Referenz-Stand und schreibt es in die Liste;
  // hier wird geprüft, dass diese Angabe und der zugehörige Bericht vorhanden sind.
  for (const f of fs.readdirSync(dir).filter((n) => /^abweichungen-.*\.json$/.test(n) && !/-ui\.json$/.test(n))) {
    const p = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    assert.ok(Array.isArray(p.spielverlaufGeaendert), `${f}: Angabe zum Spielverlauf fehlt`);
    assert.ok(p.bericht && fs.existsSync(path.join(__dirname, '..', p.bericht)), `${f}: Bericht ${p.bericht} fehlt`);
  }
});
