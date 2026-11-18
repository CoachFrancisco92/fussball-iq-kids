// Szenario-Tests für die Simulation. Ausführen: node --test tests/
const test = require('node:test');
const assert = require('node:assert');
const E = require('./helpers/load.js');

const MAP = { passen: 'pass', schiessen: 'shoot', dribbeln: 'dribble', freilaufen: 'run', erobern: 'press', raum: 'cover' };

/** Spielt eine Folge von Entscheidungen durch. "hint" = Empfehlung der Hilfe befolgen. */
function play(steps) {
  const s = E.newState();
  let last = null;
  const log = [];
  for (const step of steps) {
    const ctx = E.context(s, last);
    let a = step;
    if (step === 'hint') {
      const k = E.recommend(s, ctx.actions);
      const h = E.hint(s, k);
      a = { kind: MAP[k] };
      if (h.ids) a.id = h.ids[0];
      if (h.point) { a.x = h.point.x; a.y = h.point.y; }
      if (h.goal != null) a.goal = h.goal;
    }
    E.startAction(s, a);
    let n = 0;
    while (!s.ep.done && n < 2000) { E.tick(s); n++; }
    assert.ok(s.ep.done, 'Episode muss enden');
    const fb = E.feedback(s);
    log.push({ ctx: ctx.type, a, fb, events: s.ep.events.map((e) => e.type), poss: s.poss, score: { ...s.score } });
    last = { kind: a.kind, success: fb.success, team: 'blue' };
  }
  return { s, log };
}

test('Mission 1: Musterweg aus dem Konzept', () => {
  const { log } = play([{ kind: 'pass', id: 'b2' }, { kind: 'run', id: 'b3', x: 23, y: 14 }, { kind: 'shoot', goal: 0 }, { kind: 'press', id: 'b3' }, { kind: 'cover', id: 'b1', x: 12, y: 6 }]);
  assert.deepStrictEqual(log.map((l) => l.ctx), ['angriff', 'ohneBall', 'abschluss', 'verteidigung', 'verteidigung']);
  assert.ok(log[0].fb.success && log[0].fb.good, 'Pass zu Blau 2 kommt an');
  assert.ok(log[1].events.includes('autoDribble'), 'Blau 2 nutzt den Raum und dribbelt');
  assert.strictEqual(log[2].score.blue, 1, 'Tor ins freie obere Tor');
  assert.ok(log[3].events.includes('redPass'), 'Rot spielt unter Druck ab');
  assert.ok(log.every((l) => l.fb.good), 'alle Entscheidungen gelten als gut');
});

test('Pass auf zugestellten Mitspieler wird abgefangen -> Verteidigung', () => {
  const { log } = play([{ kind: 'pass', id: 'b3' }, 'hint']);
  assert.ok(log[0].events.includes('intercepted'));
  assert.strictEqual(log[0].fb.good, false);
  assert.strictEqual(log[1].ctx, 'verteidigung');
});

test('Schuss aufs bewachte Tor wird geblockt', () => {
  const { log } = play([{ kind: 'pass', id: 'b2' }, { kind: 'run', id: 'b3', x: 23, y: 14 }, { kind: 'shoot', goal: 1 }]);
  assert.ok(log[2].events.includes('blocked'));
  assert.strictEqual(log[2].fb.good, false);
});

test('Dribbling direkt in den Gegner führt zum Ballverlust', () => {
  const { log } = play([{ kind: 'dribble', x: 19, y: 12.5 }]);
  assert.ok(log[0].events.includes('steal'));
});

test('Determinismus: gleiche Entscheidungen = gleiches Ergebnis', () => {
  const steps = [{ kind: 'pass', id: 'b2' }, 'hint', 'hint', 'hint', 'hint'];
  const a = play(steps).s, b = play(steps).s;
  assert.deepStrictEqual(a.players.map((p) => [p.x, p.y]), b.players.map((p) => [p.x, p.y]));
});

test('Hilfe führt nie zu einem Absturz (alle Wege mit Hilfe)', () => {
  const { log } = play(['hint', 'hint', 'hint', 'hint', 'hint']);
  assert.strictEqual(log.length, 5);
});

function place(s, map) {
  for (const [id, [x, y]] of Object.entries(map)) { const p = E.P(s, id); p.x = p.tx = x; p.y = p.ty = y; }
  const c = E.carrier(s); s.ball.x = c.x; s.ball.y = c.y;
}

test('Bewertung: Schuss bei zwei zugestellten Toren gibt keinen Stern, auch wenn er der "bessere" ist', () => {
  const s = E.newState();
  place(s, { b1: [31, 12], b2: [24, 12], b3: [20, 20], r1: [33.5, 9], r2: [33.5, 15], r3: [8, 3] });
  const ev = E.evaluate(s, { kind: 'shoot', goal: 0 });
  assert.strictEqual(ev.good, false);
  assert.strictEqual(ev.rec.good, false, 'Erkennen: Passen wäre besser gewesen');
  assert.match(ev.rec.why, /Pass/);
  assert.strictEqual(E.recommend(s, ['schiessen', 'passen']), 'passen');
});

test('Bewertung: guter Pass bleibt gut, auch wenn er abgefangen würde (Entscheidung ≠ Ergebnis)', () => {
  const s = E.newState();
  const ev = E.evaluate(s, { kind: 'pass', id: 'b2' });
  assert.ok(ev.rec.good && ev.exe.good);
});

test('Mission: nach 4 Angriffsentscheidungen folgt sicher die Verteidigung', () => {
  const s = E.newState();
  const m = E.newMission();
  let last = null, n = 0;
  // Ballsicherndes Dribbling weg vom Gegner: Blau behält den Ball über 4 Entscheidungen
  const steps = [{ kind: 'dribble', x: 10, y: 13 }, { kind: 'dribble', x: 6, y: 13 }, { kind: 'dribble', x: 3, y: 16 }, { kind: 'dribble', x: 3, y: 20 }];
  for (const a of steps) {
    const ctx = E.context(s, last);
    E.startAction(s, a);
    while (!s.ep.done && n++ < 5000) E.tick(s);
    const fb = E.feedback(s);
    E.missionAfter(m, s, ctx.type);
    last = { kind: a.kind, success: fb.success, team: 'blue' };
  }
  assert.strictEqual(m.phase, 'defense');
  assert.strictEqual(m.note, 'aus');
  E.missionApply(m, s);
  assert.strictEqual(s.poss, 'red');
  assert.strictEqual(E.context(s, last).type, 'verteidigung');
});

test('Mission: Ballverlust beendet die Angriffsphase, Balleroberung beendet die Mission', () => {
  const s = E.newState();
  const m = E.newMission();
  const run = (a) => { const ctx = E.context(s, null); E.startAction(s, a); let n = 0; while (!s.ep.done && n++ < 3000) E.tick(s); E.missionAfter(m, s, ctx.type); };
  run({ kind: 'pass', id: 'b3' }); // wird abgefangen
  assert.strictEqual(m.phase, 'defense');
  run({ kind: 'press', id: 'b1' });
  run({ kind: 'press', id: 'b1' });
  assert.ok(m.done);
});

test('Verteidigung: Mitspieler ohne Auftrag sichern ab (bleiben nicht stehen)', () => {
  const { s } = play([{ kind: 'pass', id: 'b3' }]); // Ballverlust -> Rot hat den Ball
  const before = E.P(s, 'b2');
  const b2 = { x: before.x, y: before.y };
  E.startAction(s, { kind: 'press', id: 'b1' });
  for (let i = 0; i < 90; i++) E.tick(s);
  assert.ok(E.dist(E.P(s, 'b2'), b2) > 1, 'Blau 2 bewegt sich in eine Sicherungsposition');
});
