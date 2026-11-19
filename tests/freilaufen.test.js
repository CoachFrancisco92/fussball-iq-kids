// Korrektur A: Freilaufen – gesprochene Rückmeldung, Etikett, Erklärbild und Stern widersprechen sich nicht.
// Die Bewertung (Entscheidung/Ziel/Stern) bleibt unverändert; das Ergebnis kommt aus der Lage am Szenenende (= Bild).
const test = require('node:test');
const assert = require('node:assert');
const E = require('./helpers/load.js');
const { playMission, lcg } = require('./golden/trace.js');
const C = E.CFG, T = () => E.texts(E.newState());
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Standardlage „Freilaufen“: Musterweg, nach dem Pass Blau 1 → Blau 2
function runState() {
  const s = E.newState(), m = E.newMission(), ctx = E.context(s, null);
  E.startAction(s, { kind: 'pass', id: 'b2' }); while (!s.ep.done) E.tick(s);
  const fb = E.feedback(s); E.missionAfter(m, s, ctx.type); E.missionApply(m, s);
  assert.deepStrictEqual(E.context(s, { kind: 'pass', success: fb.success, team: 'blue' }).actions, ['freilaufen']);
  return s;
}
function play(s0, a) {
  const s = E.clone(s0), ev = E.evaluate(s0, a);
  E.startAction(s, a); let n = 0; while (!s.ep.done && n++ < 3000) E.tick(s);
  return { s, ev, fb: E.feedback(s) };
}

test('Ziel weiter als 15 m: Grund „zu weit“, nicht „Passweg versperrt“; kein Gegner markiert, keine Passlinie', () => {
  const s0 = runState(), a = { kind: 'run', id: 'b3', x: 10, y: 22 };
  assert.ok(dist(E.carrier(s0), a) > 15);
  const { ev, fb } = play(s0, a);
  assert.strictEqual(ev.good, false);
  assert.strictEqual(fb.exe.why, T().ausfuehren.gelaufenZuWeit);
  assert.doesNotMatch(fb.say, /versperrt/);
  assert.strictEqual(fb.tags.exe.label, 'Zu weit weg');
  assert.strictEqual(fb.explain.key, null); assert.strictEqual(fb.explain.pass, null); assert.strictEqual(fb.explain.ok, false);
});

test('Ziel (21/15): Stern bleibt, aber am Ende steht ein Gegner im Passweg – Ergebnis, Etikett und Bild sagen dasselbe', () => {
  const s0 = runState(), { s, ev, fb } = play(s0, { kind: 'run', id: 'b3', x: 21, y: 15 });
  assert.strictEqual(ev.good, true, 'Bewertung unverändert: Stern');
  assert.strictEqual(fb.good, true);
  assert.strictEqual(E.passOptions(s).find((o) => o.id === 'b3').margin > C.passLaneOk, false);
  assert.match(fb.text, /^Jetzt steht Rot \d im Passweg\./);
  assert.doesNotMatch(fb.say, /anspielbar|Du bist frei/);
  assert.match(fb.say, /trotzdem eine gute Idee/);
  assert.strictEqual(fb.tags.exe.label, 'Guter Platz');
  assert.strictEqual(fb.explain.ok, true, 'Laufpfeil grün: das Laufziel war gut');
  assert.strictEqual(fb.explain.pass.ok, false, 'Passlinie rot');
  assert.strictEqual('Rot ' + E.P(s, fb.explain.key).num, fb.text.match(/Rot \d/)[0], 'markierter Gegner = genannter Gegner');
});

test('Ziel (24/15): frei bei Entscheidung und am Ende – „Du bist frei“, grüne Passlinie, Stern', () => {
  const { s, fb } = play(runState(), { kind: 'run', id: 'b3', x: 24, y: 15 });
  assert.ok(E.passOptions(s).find((o) => o.id === 'b3').margin > C.passLaneOk && fb.good && fb.success);
  assert.match(fb.text, /Du bist frei|anspielbar/);
  assert.strictEqual(fb.explain.pass.ok, true); assert.strictEqual(fb.explain.key, null);
});

// alle Freilauf-Szenen aus echten Lagen (200 Kinder-Abfolgen) mit Zielen im Raster
function runStates() {
  const out = [], seen = new Set();
  for (let seed = 1; seed <= 200; seed++) {
    const rnd = lcg(seed);
    playMission(E, (E2, s, ctx) => {
      if (ctx.actions.includes('freilaufen')) { const k = JSON.stringify(s.players.map((p) => [p.x.toFixed(1), p.y.toFixed(1)])); if (!seen.has(k)) { seen.add(k); out.push(E2.clone(s)); } }
      const F = E2.F, c = E2.carrier(s), blues = E2.team(s, 'blue'), pick = (x) => x[Math.floor(rnd() * x.length)], spot = () => ({ x: -5 + rnd() * (F.W + 10), y: -5 + rnd() * (F.H + 10) }), k = pick(ctx.actions);
      if (k === 'passen') { if (rnd() < 0.6) return { kind: 'pass', id: pick(blues.filter((b) => b !== c)).id }; return Object.assign({ kind: 'pass' }, spot()); }
      if (k === 'dribbeln') return Object.assign({ kind: 'dribble' }, spot()); if (k === 'schiessen') return { kind: 'shoot', goal: rnd() < 0.5 ? 0 : 1 };
      if (k === 'freilaufen') return Object.assign({ kind: 'run', id: pick(blues.filter((b) => b !== c)).id }, spot()); if (k === 'erobern') return { kind: 'press', id: pick(blues).id };
      return Object.assign({ kind: 'cover', id: pick(blues).id }, spot());
    });
  }
  return out;
}

test('Eigenschaft: Rückmeldung, Etikett, Erklärbild und Stern passen in allen Freilauf-Szenen zusammen', () => {
  const TT = T(), labels = TT.rueckmeldung.tagLaufSchlecht; let n = 0, zu = 0, weit = 0;
  for (const s0 of runStates()) {
    const c = E.carrier(s0);
    for (const r of E.team(s0, 'blue').filter((b) => b !== c)) for (let x = 2; x < 35; x += 4) for (let y = 2; y < 23; y += 4) {
      const a = { kind: 'run', id: r.id, x, y }, { s, ev, fb } = play(s0, a), grund = s.ep.eval.exe.lauf;
      assert.strictEqual(fb.good, ev.good, 'Stern = Bewertung vor der Aktion');
      const zielOk = grund === 'frei' || grund === 'versperrt';
      assert.strictEqual(fb.explain.ok, zielOk, 'Laufpfeil zeigt das Laufziel');
      if (dist(c, { x: s.ep.explain.to.x, y: s.ep.explain.to.y }) > 15 && grund !== 'besetzt') { assert.strictEqual(grund, 'zuWeit'); weit++; }
      if (grund === 'zuWeit') assert.doesNotMatch(fb.say, /versperrt/);
      assert.strictEqual(fb.tags.exe.label, ev.exe.good ? 'Guter Platz' : labels[grund]);
      if (zielOk && !s.ep.events.some((e) => e.type === 'steal')) {
        const free = s.ep.arrival ? E.passOptions(s).find((o) => o.id === 'b3').margin > C.passLaneOk : fb.explain.pass.ok;
        assert.strictEqual(fb.explain.pass.ok, free, 'Passlinie = Lage im Bild');
        assert.strictEqual(fb.success, free, 'Ergebnis = Lage im Bild');
        if (free) assert.doesNotMatch(fb.text, /im Passweg/); else { assert.doesNotMatch(fb.say, /anspielbar|Du bist frei|Weg zu dir frei/); zu++; }
        if (!free) assert.ok(fb.explain.key && fb.text.includes('Rot ' + E.P(s, fb.explain.key).num), 'genannter = markierter Gegner');
        const cc = E.carrier(s), rr = E.P(s, r.id);
        assert.deepStrictEqual([fb.explain.pass.from, fb.explain.pass.to], [{ x: cc.x, y: cc.y }, { x: rr.x, y: rr.y }], 'Passlinie verbindet die Spieler, wie sie im Bild stehen');
      } else assert.strictEqual(fb.explain.pass, null);
      n++;
    }
  }
  assert.ok(n > 1500 && zu > 50 && weit > 50, `${n} Szenen, ${zu} am Ende zu, ${weit} zu weit`);
});

test('Erklärbild entsteht erst durch die Entscheidung (keine Vorwegnahme)', () => {
  const s = runState();
  assert.strictEqual(s.ep.a.kind, 'pass', 'vor der Entscheidung liegt nur das Bild der vorigen Szene vor');
  const ctx = E.context(s, null); assert.ok(!('explain' in ctx));
  const h = E.hint(s, 'freilaufen'); assert.ok(!('explain' in h));
});

// K1: Hilfe „Freilaufen“ empfiehlt gute Laufziele, die am Szenenende tatsächlich anspielbar sind – oder sagt ehrlich, dass es eng ist
function hintLagen() {
  const out = [], seen = new Set();
  for (let seed = 1; seed <= 200; seed++) {
    const rnd = lcg(seed);
    playMission(E, (E2, s, ctx) => {
      if (ctx.actions.includes('freilaufen')) { const k = JSON.stringify(s.players.map((p) => [p.x.toFixed(1), p.y.toFixed(1)])); if (!seen.has(k)) { seen.add(k); out.push({ s: E2.clone(s), seed }); } }
      const F = E2.F, c = E2.carrier(s), blues = E2.team(s, 'blue'), pick = (x) => x[Math.floor(rnd() * x.length)], spot = () => ({ x: -5 + rnd() * (F.W + 10), y: -5 + rnd() * (F.H + 10) }), k = pick(ctx.actions);
      if (k === 'passen') { if (rnd() < 0.6) return { kind: 'pass', id: pick(blues.filter((b) => b !== c)).id }; return Object.assign({ kind: 'pass' }, spot()); }
      if (k === 'dribbeln') return Object.assign({ kind: 'dribble' }, spot()); if (k === 'schiessen') return { kind: 'shoot', goal: rnd() < 0.5 ? 0 : 1 };
      if (k === 'freilaufen') return Object.assign({ kind: 'run', id: pick(blues.filter((b) => b !== c)).id }, spot()); if (k === 'erobern') return { kind: 'press', id: pick(blues).id };
      return Object.assign({ kind: 'cover', id: pick(blues).id }, spot());
    });
  }
  return out;
}
const LAGEN = hintLagen();

test('K1: Hilfe beim Freilaufen – Empfehlung und spätere Rückmeldung passen in allen Lagen zusammen', () => {
  const H = T().hilfe; let frei = 0, eng = 0;
  for (const { s: s0 } of LAGEN) {
    const before = JSON.stringify(s0), h = E.hint(s0, 'freilaufen');
    assert.strictEqual(JSON.stringify(s0), before, 'Hilfe verändert die Lage nicht');
    assert.deepStrictEqual(E.hint(s0, 'freilaufen'), h, 'reproduzierbar');
    const a = { kind: 'run', id: h.ids[0], x: h.point.x, y: h.point.y };
    const { fb } = play(s0, a);
    assert.strictEqual(fb.good, true, 'empfohlen werden nur Laufziele, die die bestehende Bewertung als gut einstuft (keine neue Regel)');
    if (h.eng) { eng++; assert.strictEqual(h.say, H.freilaufenEng); assert.strictEqual(fb.success, false, 'Warnung nur, wenn es wirklich nicht klappt'); assert.match(fb.say, /trotzdem eine gute Idee/); }
    else {
      frei++; assert.strictEqual(h.say, H.freilaufen);
      assert.strictEqual(fb.success, true, 'Hilfe sagt „anspielen“ → am Ende anspielbar'); assert.doesNotMatch(fb.text, /im Passweg/);
      const near = [[0.75, 0], [-0.75, 0], [0, 0.75], [0, -0.75]].filter(([dx, dy]) => play(s0, { kind: 'run', id: a.id, x: a.x + dx, y: a.y + dy }).fb.success).length;
      assert.ok(near >= 3, `kein zentimetergenauer Punkt (${near}/4 Nachbarn klappen)`);
    }
  }
  assert.strictEqual(frei + eng, LAGEN.length);
  assert.ok(frei >= 45, `${frei} von ${LAGEN.length} Lagen mit anspielbarer Empfehlung (vor K1: 9)`);
});

test('K1: Standardlage (Musterweg) – kein sicher anspielbarer Platz, die Hilfe sagt das ehrlich', () => {
  const s0 = runState(), h = E.hint(s0, 'freilaufen');
  assert.strictEqual(h.eng, true);
  const { fb } = play(s0, { kind: 'run', id: h.ids[0], x: h.point.x, y: h.point.y });
  assert.ok(fb.good && !fb.success && /im Passweg/.test(fb.text), fb.say);
});
