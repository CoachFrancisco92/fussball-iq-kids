// M1 (mehrere Situationen, Rotation, nahtloser Wechsel, Abschluss nach der Grenze) und M2 (Aktionen nach verfügbaren
// Mitspielern). Mission 1 bleibt davon unberührt (siehe golden/transcript und den Prüfpunkt unten).
const test = require('node:test');
const assert = require('node:assert');
const E = require('./helpers/load.js');
require('./fixtures/test-mission-situationen.js');
const ID = 'test-situationen';
const M = () => E.mission(ID);
const posOf = (s) => s.players.map((p) => [p.id, p.x, p.y]);
const startOf = (sid) => M().situationen.find((x) => x.id === sid).start.spieler.map((q) => [q.id, q.x, q.y]);
function step(s, m, a, last) {
  const ctx = E.context(s, last);
  E.startAction(s, a); let n = 0; while (!s.ep.done && n++ < 3000) E.tick(s);
  assert.ok(s.ep.done, 'Szene endet');
  const fb = E.feedback(s); E.missionAfter(m, s, ctx.type);
  return { ctx, fb, last: { kind: a.kind, success: fb.success, team: 'blue' } };
}

test('M1: Testmission ist gültig; ungültige Situationsdaten werden erkannt', () => {
  assert.deepStrictEqual(E.validateMission(M()), []);
  const bad = (patch) => E.validateMission(Object.assign(JSON.parse(JSON.stringify(M())), patch));
  assert.ok(bad({ durchlaeufe: [['T1', 'X9']] }).some((e) => /durchlaeufe/.test(e)));
  assert.ok(bad({ phasen: { maxAngriff: 3, verteidigung: 1 } }).some((e) => /verteidigung = 0/.test(e)));
  assert.ok(bad({ schauSchritt: ['angriff'] }).some((e) => /Schau-Schritt braucht einen Mitspieler/.test(e)));
  assert.ok(bad({ situationen: [{ id: 'T1', start: { ballbesitz: 'b1', spieler: [{ id: 'b1', x: 10, y: 10 }] } }] }).some((e) => /1 gegen 1/.test(e)));
  assert.ok(bad({ situationen: [{ id: 'T1', start: { ballbesitz: 'r1', spieler: [{ id: 'b1', x: 10, y: 10 }, { id: 'r1', x: 12, y: 10 }] } }] }).some((e) => /Blau hat zu Beginn den Ball/.test(e)));
});

test('M1: Durchläufe wählen ihre Situationen fest und reihum; jeder Durchlauf beginnt anders', () => {
  const firsts = [0, 1, 2, 3].map((n) => E.newState(ID, n).situation);
  assert.deepStrictEqual(firsts, ['T1', 'T2', 'T3', 'T1']);
  assert.deepStrictEqual(E.newMission(ID, 1).sit.order, ['T2', 'T3', 'T1']);
  assert.deepStrictEqual(E.newState(ID, 1), E.newState(ID, 1), 'reproduzierbar');
  // ohne `durchlaeufe`: Reihenfolge rotiert über die Situationsliste
  const m2 = Object.assign(JSON.parse(JSON.stringify(M())), { id: 'test-situationen-rot' }); delete m2.durchlaeufe;
  globalThis.FIQ_MISSIONS.push(m2);
  assert.deepStrictEqual([0, 1, 2].map((n) => E.newMission('test-situationen-rot', n).sit.order[0]), ['T1', 'T2', 'T3']);
});

test('M1: Tor beendet die Situation ohne Neustart-Bild; danach beginnt die nächste Situation exakt in ihrer Startaufstellung', () => {
  const s = E.newState(ID, 0), m = E.newMission(ID, 0);
  const r = step(s, m, { kind: 'shoot', goal: 1 }, null);
  assert.ok(s.ep.events.some((e) => e.type === 'goal'), 'Tor');
  assert.strictEqual(s.score.blue, 1);
  assert.notDeepStrictEqual(posOf(s), startOf('T2'), 'Rückmeldebild zeigt die Torszene');
  assert.ok(Math.abs(E.P(s, 'b1').x - 31) < 2, 'Schütze steht noch am Schussort (kein Neustart)');
  assert.strictEqual(m.note, 'situation'); assert.strictEqual(m.done, false);
  E.missionApply(m, s);
  assert.deepStrictEqual(posOf(s), startOf('T2'));
  assert.strictEqual(s.situation, 'T2'); assert.strictEqual(s.poss, 'blue'); assert.strictEqual(s.ball.owner, 'b1');
  assert.strictEqual(s.score.blue, 1, 'Spielstand bleibt');
  assert.strictEqual(E.context(s, r.last).type, 'abschluss');
});

test('M1: Ballverlust beendet die Situation; nach der letzten Situation ist die Mission zu Ende', () => {
  const s = E.newState(ID, 0), m = E.newMission(ID, 0);
  step(s, m, { kind: 'shoot', goal: 0 }, null);                     // T1: oberes Tor zugestellt → geblockt
  assert.ok(s.ep.events.some((e) => e.type === 'blocked'));
  assert.strictEqual(m.note, 'situation'); E.missionApply(m, s);
  step(s, m, { kind: 'shoot', goal: 0 }, null);                     // T2: oben frei → Tor
  E.missionApply(m, s); assert.strictEqual(s.situation, 'T3');
  step(s, m, { kind: 'dribble', x: 19, y: 12 }, null);              // T3: in den Gegner → Ballverlust
  assert.strictEqual(m.done, true);
});

test('M1: Bringt die letzte erlaubte Entscheidung den Ball in die Torschusszone, folgt noch der Abschluss', () => {
  const s = E.newState(ID, 2), m = E.newMission(ID, 2);           // T3: maxAngriff 1
  assert.strictEqual(s.situation, 'T3'); assert.strictEqual(m.maxAttack, 1);
  const r = step(s, m, { kind: 'dribble', x: 30, y: 12 }, null);
  assert.ok(E.carrier(s).x >= E.F.W - E.F.ZONE - 0.3, 'in der Zone');
  assert.strictEqual(m.note, null); assert.strictEqual(m.done, false, 'Situation läuft weiter');
  assert.strictEqual(E.context(s, r.last).type, 'abschluss');
  step(s, m, { kind: 'shoot', goal: 0 }, r.last);
  assert.strictEqual(m.note, 'situation', 'nach dem Abschluss ist die Situation vorbei');
  // ohne die Einstellung endet die Situation an der Grenze
  const m3 = Object.assign(JSON.parse(JSON.stringify(M())), { id: 'test-situationen-ohne' }); m3.phasen.abschlussNachGrenze = false;
  globalThis.FIQ_MISSIONS.push(m3);
  const s2 = E.newState(m3.id, 2), mm = E.newMission(m3.id, 2);
  step(s2, mm, { kind: 'dribble', x: 30, y: 12 }, null);
  assert.strictEqual(mm.note, 'situation');
});

test('M2: Ohne Mitspieler wird Passen nie angeboten; Hilfe nennt nur angebotene Aktionen; 1 gegen 1 läuft stabil', () => {
  const lcg = (seed) => { let x = (seed * 2654435761) >>> 0; return () => ((x = (1664525 * x + 1013904223) >>> 0) / 4294967296); };
  let n = 0;
  for (let seed = 1; seed <= 120; seed++) {
    const rnd = lcg(seed), s = E.newState(ID, 2), m = E.newMission(ID, 2); let last = null, k = 0;
    while (!m.done && k++ < 12) {
      const ctx = E.context(s, last), solo = E.team(s, 'blue').length < 2;
      if (solo) assert.ok(!ctx.actions.includes('passen'), 'kein Passen ohne Mitspieler');
      for (const key of ctx.actions) {
        const h = E.hint(s, key);
        (h.alsoGood || []).forEach((g) => assert.ok(ctx.actions.includes(g), `„Auch gut: ${g}“ wird nicht angeboten`));
      }
      assert.ok(ctx.actions.includes(E.recommend(s, ctx.actions)));
      const F = E.F, pick = ctx.actions[Math.floor(rnd() * ctx.actions.length)];
      const a = pick === 'schiessen' ? { kind: 'shoot', goal: rnd() < 0.5 ? 0 : 1 } : pick === 'dribbeln' ? { kind: 'dribble', x: -3 + rnd() * (F.W + 6), y: -3 + rnd() * (F.H + 6) }
        : { kind: 'pass', id: E.team(s, 'blue').find((b) => b !== E.carrier(s)).id };
      const r = step(s, m, a, last); last = r.last; E.missionApply(m, s); n++;
    }
    assert.ok(m.done, 'Mission endet');
  }
  assert.ok(n > 300, `${n} Entscheidungen geprüft`);
});

test('Mission 1 bleibt ohne Situationen: Zustand und Missionsablauf wie bisher', () => {
  const s = E.newState('mission-1'), m = E.newMission('mission-1');
  assert.ok(!('situation' in s)); assert.ok(!('sit' in m));
  assert.strictEqual(m.abschluss, false);
  assert.deepStrictEqual(E.context(s, null).actions, ['passen', 'dribbeln']);
});

test('M1: Nach dem Situationswechsel zählt die Vorgeschichte nicht (kein „Freilaufen“ nach dem Pass der vorigen Situation)', () => {
  const s = E.newState(ID, 0), m = E.newMission(ID, 0);
  // T1: Pass in den Raum zu b2 kommt an → Angriffsgrenze erst nach 3; also: Schuss geblockt nach einem Pass simulieren wir über die Grenze
  const m1 = Object.assign(JSON.parse(JSON.stringify(M())), { id: 'test-situationen-pass' }); m1.situationen[0].phasen = { maxAngriff: 1 }; m1.phasen.abschlussNachGrenze = false;
  globalThis.FIQ_MISSIONS.push(m1);
  const s1 = E.newState(m1.id, 0), mm = E.newMission(m1.id, 0);
  const r = step(s1, mm, { kind: 'pass', x: 28, y: 20 }, null);
  assert.ok(r.fb.success, 'Pass kommt an'); assert.strictEqual(mm.note, 'situation');
  E.missionApply(mm, s1);
  assert.strictEqual(E.context(s1, r.last).type, 'abschluss', 'neue Situation beginnt mit ihrem eigenen Moment');
  assert.ok(s && m);
});
