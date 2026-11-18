// Szenario-Tests für die Simulation. Ausführen: node --test tests/
const test = require('node:test');
const assert = require('node:assert');
require('../engine.js');
const E = globalThis.FIQ;

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
      const k = ctx.actions[0];
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
