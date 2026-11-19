// Mission „Freie Bahn!“ (Meilenstein 4): Daten, Rotation, je Situation die geforderte Entscheidung (gute und schlechte
// Dribblings), Hilfe-Weg bis zum Tor, Robustheit der Startlagen, vollständige Durchläufe, Texte, Referenzaufnahme.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs'), path = require('node:path');
const E = require('./helpers/load.js');
const { traceFreieBahn, ID } = require('./golden/freie-bahn.js');
const { play } = require('./golden/mission-a.js');
const FB = require('./golden/freie-bahn.js');
const { hash } = require('./golden/trace.js');
const REF = require('./golden/referenz.js');

const M = E.mission(ID);
const X = E.texts(E.newState(ID, 0)).ausfuehren;
const stateAt = (id) => { const d = M.durchlaeufe.findIndex((x) => x[0] === id); const s = E.newState(ID, d); assert.strictEqual(s.situation, id); return s; };
const dr = (s, x, y) => E.evaluate(s, { kind: 'dribble', x, y });
let probeN = 0;
/** Startlage als eigene Situationsmission mit denselben Phasen/Hilfe (für Robustheit) */
function probe(spieler) {
  const id = 'fb-test-' + probeN++;
  globalThis.FIQ_MISSIONS.push(Object.assign({}, M, { id, nummer: 80, situationen: [{ id: 'S', start: { ballbesitz: 'b1', spieler } }], durchlaeufe: undefined }));
  return id;
}
const MAP = { dribbeln: 'dribble', schiessen: 'shoot' };
/** Hilfe-Weg im Missionsablauf (Angriffsgrenze, Abschluss nach Grenze) */
function hilfeWeg(id, d = 0) {
  const s = E.newState(id, d), m = E.newMission(id, d), first = s.situation, log = []; let last = null, goal = false;
  for (let i = 0; i < 10 && !m.done && s.situation === first; i++) {
    const ctx = E.context(s, last), key = E.recommend(s, ctx.actions), h = E.hint(s, key), a = { kind: MAP[key] };
    if (h.point) { a.x = h.point.x; a.y = h.point.y; } if (h.goal != null) a.goal = h.goal;
    const ev = E.evaluate(s, a); E.startAction(s, a); let n = 0; while (!s.ep.done && n++ < 3000) E.tick(s);
    goal = s.ep.events.some((e) => e.type === 'goal');
    log.push({ kind: a.kind, good: ev.good, eng: !!h.eng });
    E.missionAfter(m, s, ctx.type); last = { kind: a.kind, success: E.feedback(s).success, team: 'blue' };
    if (goal) break; E.missionApply(m, s);
  }
  return { goal, log };
}

test('Freie Bahn: gültig, Lernwelt 1 / Platz 3 / Lernmission, 1 gegen 1 und 1 gegen 2, kein Mitspieler, keine Verteidigung', () => {
  assert.deepStrictEqual(E.validateMission(M), []);
  assert.deepStrictEqual([M.lernwelt, M.nummer, M.art], [1, 3, 'lernen']);
  assert.deepStrictEqual(M.situationen.map((x) => x.id), ['B3', 'B4', 'B2', 'B6', 'B5']);
  for (const x of M.situationen) { const b = x.start.spieler.filter((p) => p.id[0] === 'b'), r = x.start.spieler.filter((p) => p.id[0] === 'r'); assert.strictEqual(b.length, 1); assert.ok(r.length >= 1 && r.length <= 2); }
  assert.strictEqual(M.phasen.verteidigung, 0);
  assert.strictEqual(E.mission().id, 'mission-1', 'Standardmission der Engine unverändert');
});

test('Rotation: 5 Durchläufe à 3 Situationen, jede Situation 3-mal, jeder Durchlauf beginnt anders, deterministisch', () => {
  const D = M.durchlaeufe, count = {};
  for (const d of D) { assert.strictEqual(new Set(d).size, 3); d.forEach((id) => { count[id] = (count[id] || 0) + 1; }); }
  assert.deepStrictEqual(count, { B3: 3, B4: 3, B2: 3, B6: 3, B5: 3 });
  assert.strictEqual(new Set(D.map((d) => d[0])).size, D.length);
  for (let n = 0; n < 12; n++) assert.deepStrictEqual(E.newMission(ID, n).sit.order, D[n % D.length]);
});

test('Nur Dribbeln bzw. in der Schusszone nur Schießen; Ansagen ohne „Passen“ und ohne „Freund“', () => {
  for (const x of M.situationen) {
    const s = stateAt(x.id), ctx = E.context(s, null);
    assert.deepStrictEqual(ctx.actions, ['dribbeln'], x.id);
    assert.ok(!/[Pp]ass|Freund/.test(ctx.say), x.id + ': ' + ctx.say);
  }
});

test('B3 Verfolger hinten: nach vorn ⭐ (kurz und lang), zurück in den Verfolger 💭, quer ohne Grund 💭', () => {
  const s = stateAt('B3');
  for (const [x, y] of [[21, 12], [26, 12], [30, 16]]) assert.ok(dr(s, x, y).good, `nach vorn (${x}|${y})`);
  assert.deepStrictEqual([dr(s, 14, 12).good, dr(s, 14, 12).exe.why], [false, X.inGegner]);
  assert.deepStrictEqual(dr(s, 18, 6).exe, { good: false, why: X.dribbelNachVorn });
});

test('B4 Gegner frontal: geradewegs hinein 💭, oben UND unten vorbei ⭐', () => {
  const s = stateAt('B4');
  assert.strictEqual(dr(s, 25, 12).exe.why, X.inGegner);
  assert.ok(dr(s, 23, 7).good, 'oben vorbei'); assert.ok(dr(s, 23, 17).good, 'unten vorbei');
});

test('B2 große Lücke: durch die Lücke UND außen herum (oben wie unten) ⭐; in einen Gegner 💭', () => {
  const s = stateAt('B2');
  assert.ok(dr(s, 20, 12).good, 'durch die Lücke');
  assert.ok(dr(s, 18, 2).good, 'außen oben'); assert.ok(dr(s, 19, 22).good, 'außen unten');
  assert.strictEqual(dr(s, 19, 7.5).exe.why, X.inGegner);
});

test('B6 enge Lücke: hindurch 💭 (auch wenn die Gegner 0,5 m anders stehen), außen herum ⭐', () => {
  const s = stateAt('B6');
  assert.strictEqual(dr(s, 20, 12).good, false);
  assert.ok(dr(s, 19, 6).good, 'außen oben'); assert.ok(dr(s, 19, 18).good, 'außen unten');
  const base = M.situationen.find((x) => x.id === 'B6').start.spieler;
  for (const i of [1, 2]) for (const ax of ['x', 'y']) for (const d of [-0.5, 0.5]) {
    const sp = base.map((p) => ({ ...p })); sp[i][ax] += d; const t = E.newState(probe(sp), 0);
    assert.strictEqual(dr(t, 20, 12).good, false, `Lücke ${sp[i].id} ${ax} ${d}`);
    assert.ok(dr(t, 19, 6).good && dr(t, 19, 18).good, `außen herum ${sp[i].id} ${ax} ${d}`);
  }
});

test('B5 viel Platz: ein großes oder zwei kleine Stücke ⭐; am Ende Schuss aufs untere (zugestellte) Tor 💭, oberes ⭐', () => {
  const s = stateAt('B5');
  assert.ok(dr(s, 20, 13).good, 'großes Stück'); assert.ok(dr(s, 16, 13).good, 'kleines Stück');
  const r = hilfeWeg(ID, M.durchlaeufe.findIndex((x) => x[0] === 'B5'));
  assert.ok(r.goal && r.log.every((x) => x.good));
  // dem Hilfe-Weg bis in die Schusszone folgen: dort steht Rot 2 vor dem unteren Tor
  const t = stateAt('B5'); let last = null;
  for (let i = 0; i < 5 && E.context(t, last).type !== 'abschluss'; i++) { const h = E.hint(t, 'dribbeln'); E.startAction(t, { kind: 'dribble', x: h.point.x, y: h.point.y }); let n = 0; while (!t.ep.done && n++ < 3000) E.tick(t); last = { kind: 'dribble', success: true, team: 'blue' }; }
  assert.strictEqual(E.context(t, last).type, 'abschluss');
  const sh0 = E.evaluate(t, { kind: 'shoot', goal: 0 }), sh1 = E.evaluate(t, { kind: 'shoot', goal: 1 });
  assert.ok(sh0.good, 'oberes Tor frei'); assert.strictEqual(sh1.good, false, 'unteres Tor zugestellt');
  assert.match(sh1.why, /Rot 2/);
});

test('Jede Situation: Hilfe-Weg nur ⭐, ohne „eng“, endet mit Tor in höchstens 4 Entscheidungen', () => {
  for (const x of M.situationen) {
    const r = hilfeWeg(ID, M.durchlaeufe.findIndex((d) => d[0] === x.id));
    assert.ok(r.goal, x.id + ': Tor'); assert.ok(r.log.length <= 4, `${x.id}: ${r.log.length} Entscheidungen`);
    assert.ok(r.log.every((l) => l.good && !l.eng), x.id);
  }
});

test('Robustheit der Startlagen: jeder Spieler ±0,5 m und ±1 m (x und y) – Hilfe-Weg weiter nur ⭐ und Tor', () => {
  for (const x of M.situationen) {
    for (let i = 0; i < x.start.spieler.length; i++) for (const ax of ['x', 'y']) for (const d of [-1, -0.5, 0.5, 1]) {
      const sp = x.start.spieler.map((p) => ({ ...p })); sp[i][ax] += d;
      const r = hilfeWeg(probe(sp));
      assert.ok(r.goal && r.log.every((l) => l.good), `${x.id} ${sp[i].id} ${ax} ${d}`);
    }
  }
});

test('Vollständige Durchläufe mit der Hilfe: alle 5 enden nach 3 Situationen mit 3 Toren, nur ⭐', () => {
  for (let d = 0; d < M.durchlaeufe.length; d++) {
    const r = play(E, d, FB.STYLES.hilfe, ID);
    assert.ok(r.done); assert.deepStrictEqual(r.score, { blue: 3, red: 0 });
    assert.ok(r.out.every((x) => x.fb.good), `Durchlauf ${d}`);
    assert.deepStrictEqual([...new Set(r.out.map((x) => x.sit))], M.durchlaeufe[d]);
  }
});

test('Schlechte Spielweisen: in den Gegner, rückwärts, quer – nie ⭐; jede Situation endet; Mission endet', () => {
  for (const k of ['inDenGegner', 'rueckwaerts', 'quer']) for (let d = 0; d < M.durchlaeufe.length; d++) {
    const r = play(E, d, FB.STYLES[k], ID);
    assert.ok(r.done, `${k}/${d}`);
    assert.ok(r.out.filter((x) => x.a.kind === 'dribble').every((x) => !x.fb.good), `${k}/${d}: kein ⭐`);
    assert.ok(r.out.length <= 3 * (M.phasen.maxAngriff + 1));
  }
});

test('Gemischte Kinder-Abfolgen: jede Szene endet, jeder Durchlauf endet, Stern = Bewertung vor der Aktion', () => {
  const { childAction } = require('./golden/mission-a.js');
  const mixed = (seed) => { let x = (seed * 0x9e3779b9) >>> 0; return () => { x = (x + 0x6d2b79f5) >>> 0; let t = Math.imul(x ^ (x >>> 15), 1 | x); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  for (let seed = 1; seed <= 150; seed++) {
    const rnd = mixed(seed), r = play(E, seed % 5, (E2, s, ctx) => childAction(E2, s, ctx, rnd), ID);
    assert.ok(r.done && r.out.length <= 3 * (M.phasen.maxAngriff + 1), `Abfolge ${seed}`);
    for (const x of r.out) { assert.ok(x.ticks < 3000); assert.strictEqual(x.fb.good, x.ev.good); }
  }
});

// Referenzaufnahme (Erstaufnahme v0.5.0) mit vorgelegten Abweichungen (tests/golden/freieBahn-abweichungen-*.json)
const pending = { styles: {}, seeds: {} };
for (const f of fs.readdirSync(path.join(__dirname, 'golden')).filter((n) => /^freieBahn-abweichungen-.*\.json$/.test(n))) {
  const p = JSON.parse(fs.readFileSync(path.join(__dirname, 'golden', f), 'utf8')); Object.assign(pending.styles, p.styles); Object.assign(pending.seeds, p.seeds);
}
test(`Referenzaufnahme Freie Bahn (${REF.freieBahn.file}): Spielweisen × 5 Durchläufe, 200 Kinder-Abfolgen unverändert (bis auf vorgelegte Abweichungen)`, () => {
  const ref = require('./golden/' + REF.freieBahn.file);
  assert.strictEqual(hash(ref), REF.freieBahn.hash, REF.freieBahn.file + ' wurde verändert');
  const now = JSON.parse(JSON.stringify(traceFreieBahn(E)));
  for (const k of Object.keys(ref.styles)) {
    const p = pending.styles[k];
    if (!p) assert.deepStrictEqual(now.styles[k], ref.styles[k], `Spielweise ${k}`);
    else assert.deepStrictEqual([hash(ref.styles[k]), hash(now.styles[k])], [p.alt, p.neu]);
  }
  const diff = Object.keys(ref.seeds).filter((k) => ref.seeds[k] !== now.seeds[k]);
  assert.deepStrictEqual(diff, Object.keys(pending.seeds).filter((k) => diff.includes(k)), 'nicht vorgelegte Abweichungen');
  assert.deepStrictEqual(Object.keys(pending.seeds).filter((k) => !diff.includes(k)), [], 'vorgelegte Abweichungen treten nicht mehr auf');
});
