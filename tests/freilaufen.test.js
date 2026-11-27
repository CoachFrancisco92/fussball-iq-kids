// Korrektur A / V0.6c: Freilaufen – gesprochene Rückmeldung, Etikett, Erklärbild und Stern widersprechen sich nicht.
// Die Bewertung (Entscheidung/Ziel/Stern) bleibt unverändert. Seit V0.6c ist das Ergebnis, was der Mitspieler tatsächlich tut:
// Zuspiel (angekommen) oder kein Zuspiel mit dem Grund aus dem gespeicherten Erklärzeitpunkt ep.zuspiel (docs/v0.6c.md).
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

test('Ziel (21/15): Stern bleibt, aber kein Zuspiel – Grund, genannter/markierter Gegner und Passlinie aus dem Erklärzeitpunkt', () => {
  const s0 = runState(), { s, ev, fb } = play(s0, { kind: 'run', id: 'b3', x: 21, y: 15 });
  assert.strictEqual(ev.good, true, 'Bewertung unverändert: Stern');
  assert.strictEqual(fb.good, true); assert.strictEqual(fb.success, false);
  assert.ok(!s.ep.events.some((e) => e.type === 'zuspiel'), 'kein Zuspiel');
  const z = s.ep.zuspiel; assert.ok(z && !z.pass && z.key);
  assert.ok(fb.text.startsWith(T().ergebnis.laufKeinZuspiel[z.grund]('Rot ' + E.P(s, z.key).num)), fb.text);
  assert.doesNotMatch(fb.say, /angespielt|anspielbar|Du bist frei/);
  assert.match(fb.say, /trotzdem eine gute Idee/);
  assert.strictEqual(fb.tags.exe.label, 'Guter Platz');
  assert.strictEqual(fb.explain.ok, true, 'Laufpfeil grün: das Laufziel war gut');
  assert.strictEqual(fb.explain.pass.ok, false, 'Passlinie rot');
  assert.strictEqual(fb.explain.key, z.key, 'markierter Gegner = genannter Gegner');
  assert.deepStrictEqual([fb.explain.pass.from, fb.explain.pass.to], [{ x: z.von.x, y: z.von.y }, { x: z.zu.x, y: z.zu.y }], 'Bild = gespeicherte Positionen');
});

test('Ziel (30/7): frei bei Ankunft – Blickpause, Zuspiel kommt an, grüne Passlinie, Stern; danach entscheidet das Kind mit dem Empfänger', () => {
  const { s, fb } = play(runState(), { kind: 'run', id: 'b3', x: 30, y: 7 });
  const typen = s.ep.events.map((e) => e.type);
  assert.deepStrictEqual(typen.slice(0, 4), ['blick', 'zuspiel', 'pass', 'received']);
  assert.ok(fb.good && fb.success); assert.strictEqual(fb.text, T().ergebnis.laufAngespielt);
  assert.strictEqual(fb.explain.pass.ok, true); assert.strictEqual(fb.explain.key, null);
  assert.strictEqual(E.carrier(s).id, 'b3');
  assert.ok(['angriff', 'abschluss'].includes(E.context(s, { kind: 'run', success: true, team: 'blue' }).type));
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

test('Eigenschaft: Rückmeldung, Etikett, Erklärbild, Stern und Zuspiel passen in allen Freilauf-Szenen zusammen', () => {
  const TT = T(), labels = TT.rueckmeldung.tagLaufSchlecht, Z = E.ZUSPIEL; let n = 0, pass = 0, kein = 0, weit = 0;
  for (const s0 of runStates()) {
    const c = E.carrier(s0);
    for (const r of E.team(s0, 'blue').filter((b) => b !== c)) for (let x = 2; x < 35; x += 4) for (let y = 2; y < 23; y += 4) {
      const a = { kind: 'run', id: r.id, x, y }, { s, ev, fb } = play(s0, a), grund = s.ep.eval.exe.lauf, evs = s.ep.events;
      assert.strictEqual(fb.good, ev.good, 'Stern = Bewertung vor der Aktion');
      const zielOk = grund === 'frei' || grund === 'versperrt';
      assert.strictEqual(fb.explain.ok, zielOk, 'Laufpfeil zeigt das Laufziel');
      if (dist(c, { x: s.ep.explain.to.x, y: s.ep.explain.to.y }) > 15 && grund !== 'besetzt') { assert.strictEqual(grund, 'zuWeit'); weit++; }
      if (grund === 'zuWeit') assert.doesNotMatch(fb.say, /versperrt/);
      assert.strictEqual(fb.tags.exe.label, ev.exe.good ? 'Guter Platz' : labels[grund]);
      assert.ok(evs.filter((e) => e.type === 'blick').length <= Z.maxBlick, 'höchstens 2 Blickpausen');
      const lost = evs.some((e) => e.type === 'steal'), zsp = evs.find((e) => e.type === 'zuspiel'), z = s.ep.zuspiel;
      if (zsp) {
        // Zuspiel nur nach einer Blickpause und nur unter den objektiven Bedingungen (nie „zu weit“, nie in einen geschlossenen Weg)
        assert.ok(evs.findIndex((e) => e.type === 'blick') < evs.indexOf(zsp));
        assert.ok(z.pass && z.werte.d <= Z.dMax && z.werte.d >= Z.dMin && z.werte.open >= Z.open && z.werte.lane > C.passLaneOk, JSON.stringify(z.werte));
        if (z.werte.richtung === 'rueck') assert.ok(z.werte.mehrwert, 'Rückpass nur mit Mehrwert');
      }
      const rec = evs.some((e) => e.type === 'received' && e.by === r.id);
      if (lost) assert.strictEqual(fb.explain.pass, null);
      else if (rec) {
        pass++;
        assert.ok(fb.success && fb.text === TT.ergebnis.laufAngespielt);
        // nach dem Zuspiel keine Ziel-Kritik im Präsens („Dort stand schon ein Gegner“), sondern auf den Moment des Loslaufens bezogen
        if (!ev.exe.good) assert.match(fb.say, /Als du losgelaufen bist/, fb.say);
        assert.ok(fb.explain.pass.ok && fb.explain.key === null);
      } else if (z) {
        kein++;
        assert.strictEqual(fb.success, false); assert.doesNotMatch(fb.say, /angespielt|anspielbar|Du bist frei|Weg zu dir frei/);
        const nm = z.key ? 'Rot ' + E.P(s, z.key).num : TT.ergebnis.einGegner;
        assert.ok(fb.text.startsWith(TT.ergebnis.laufKeinZuspiel[z.grund](nm)), 'Ergebnis nennt den ausschlaggebenden Grund: ' + fb.text);
        assert.strictEqual(fb.explain.key, z.key, 'genannter = markierter Gegner (auch ohne Passlinie)');
        // nur ein Grund in der Ansage: gilt der Grund der Ziel-Bewertung zum Erklärzeitpunkt noch, wird genau er genannt
        if (z.alle && z.alle.includes(grund)) assert.strictEqual(z.grund, grund, 'ein Grund: Bewertung und Ergebnis nennen denselben');
        if (fb.explain.pass) {
          assert.strictEqual(fb.explain.pass.ok, false);
          assert.deepStrictEqual([fb.explain.pass.from, fb.explain.pass.to], [{ x: z.von.x, y: z.von.y }, { x: z.zu.x, y: z.zu.y }], 'Bild = gespeicherter Zeitpunkt');
        } else assert.strictEqual(zielOk, false);
      }
      n++;
    }
  }
  assert.ok(n > 1500 && pass > 100 && kein > 500 && weit > 50, `${n} Szenen, ${pass} Zuspiele, ${kein} ohne Zuspiel, ${weit} zu weit`);
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
    // V0.6c: Warnung, wenn kein Laufziel robust (≥ 3 von 4 Nachbarn) zum Zuspiel führt – klappt der Punkt selbst doch, dann nur
    // zentimetergenau (höchstens 2 von 4 Nachbarn)
    if (h.eng) {
      eng++; assert.strictEqual(h.say, H.freilaufenEng);
      if (fb.success) assert.ok([[0.75, 0], [-0.75, 0], [0, 0.75], [0, -0.75]].filter(([dx, dy]) => play(s0, { kind: 'run', id: a.id, x: a.x + dx, y: a.y + dy }).fb.success).length < 3, 'Warnung nur, wenn es nicht robust klappt');
      else assert.match(fb.say, /trotzdem eine gute Idee|Gute Idee/);
    }
    else {
      frei++; assert.strictEqual(h.say, H.freilaufen);
      assert.strictEqual(fb.success, true, 'Hilfe sagt „anspielen“ → am Ende anspielbar'); assert.doesNotMatch(fb.text, /im Passweg/);
      const near = [[0.75, 0], [-0.75, 0], [0, 0.75], [0, -0.75]].filter(([dx, dy]) => play(s0, { kind: 'run', id: a.id, x: a.x + dx, y: a.y + dy }).fb.success).length;
      assert.ok(near >= 3, `kein zentimetergenauer Punkt (${near}/4 Nachbarn klappen)`);
    }
  }
  assert.strictEqual(frei + eng, LAGEN.length);
  // V0.6c: „anspielbar“ = Zuspiel kommt tatsächlich an (vorher: Passweg am Szenenende frei, ≥ 45). Gemessen: 39 von 53.
  assert.ok(frei >= 39, `${frei} von ${LAGEN.length} Lagen mit anspielbarer Empfehlung (vor K1: 9; v0.6.2 mit alter Bedeutung: ≥ 45)`);
});

test('K1: Standardlage (Musterweg) – kein sicher anspielbarer Platz, die Hilfe sagt das ehrlich', () => {
  const s0 = runState(), h = E.hint(s0, 'freilaufen');
  assert.strictEqual(h.eng, true);
  const { s, fb } = play(s0, { kind: 'run', id: h.ids[0], x: h.point.x, y: h.point.y });
  assert.ok(fb.good && !fb.success && !s.ep.events.some((e) => e.type === 'zuspiel'), fb.say);
});
