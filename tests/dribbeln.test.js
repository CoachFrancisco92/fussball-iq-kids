// Paket D (Meilenstein 3b, E1/E2/E4/E6): Dribbelbewertung = Vorausrechnung des tatsächlich ausgeführten Wegs mit Toleranz,
// Erklärung nach Ursache, Dribbelhilfe Richtung Tor. Eigenschaften über viele Lagen, unabhängig von Referenzaufnahmen.
const test = require('node:test');
const assert = require('node:assert');
const E = require('./helpers/load.js');
const { lagen, sim, probeState, ENTWURF, MAP, segDist, cap } = require('./helpers/dribbel-lagen.js');
const T = E.texts(E.newState('mission-1')).ausfuehren;
const L = lagen(E, { seeds: 40 });
const ziele = (s, step = 30, dists = [2, 4, 6, 8, 11]) => { const c = E.carrier(s), out = []; for (let a = 0; a < 360; a += step) for (const d of dists) { const r = (a * Math.PI) / 180; out.push({ x: c.x + Math.cos(r) * d, y: c.y + Math.sin(r) * d, d, a }); } return out; };
const dribble = (p) => ({ kind: 'dribble', x: p.x, y: p.y });

test('Lagen: Mission 1, Mission A und alle Entwurfslagen enthalten', () => {
  for (const k of ['M1', 'MA', ...Object.keys(ENTWURF)]) assert.ok(L.some((l) => l.src === k), k);
  assert.ok(L.length >= 30, 'Lagen: ' + L.length);
});

test('Bewertung und Hilfe verändern die Lage nicht (Spielverlauf bleibt unberührt)', () => {
  for (const l of L) {
    const before = JSON.stringify(l.s);
    E.hint(l.s, 'dribbeln'); for (const z of ziele(l.s, 90, [4, 9])) E.evaluate(l.s, dribble(z));
    assert.strictEqual(JSON.stringify(l.s), before, l.src);
  }
});

const SAFE_NO = [T.dribbelNachVorn, T.dribbelFreund, T.dribbelZuKurz];      // sicher, aber nicht sinnvoll (E3) → 💭
const GOOD = [T.freierRaum, T.dribbelAnschlussPass, T.dribbelAnschlussTor, T.dribbelGesichert]; // E3-Gründe → ⭐-Ziel
test('E1: ⭐-Ziel nur, wenn das Ziel UND mindestens 3 von 4 Nachbarzielen (±0,5 m) in der Simulation den Ball behalten – nie ⭐ mit Ballverlust', () => {
  let stars = 0, knapp = 0, sicherNichtSinnvoll = 0;
  for (const l of L) {
    const c = E.carrier(l.s);
    for (const z of ziele(l.s)) {
      const ev = E.evaluate(l.s, dribble(z)), t = cap(E, c, z), main = sim(E, l.s, t);
      const kept = [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]].filter(([dx, dy]) => !sim(E, l.s, cap(E, c, { x: t.x + dx, y: t.y + dy })).lost).length;
      const safe = !main.lost && kept >= 3, where = `${l.src} (${z.x.toFixed(1)}|${z.y.toFixed(1)})`;
      if (ev.exe.good) { stars++; assert.ok(safe, where); assert.ok(GOOD.includes(ev.exe.why), where + ': ' + ev.exe.why); }
      else if (safe) { sicherNichtSinnvoll++; assert.ok(SAFE_NO.includes(ev.exe.why), where + ': ' + ev.exe.why); }
      if (!main.lost && kept < 3) { knapp++; assert.match(ev.exe.why, /^Das war knapp – (Rot|Ein Gegner)/); }
    }
  }
  assert.ok(stars > 300 && knapp > 0 && sicherNichtSinnvoll > 100, `⭐ ${stars}, knapp ${knapp}, sicher aber nicht sinnvoll ${sicherNichtSinnvoll}`);
});

test('E4: Erklärung nennt die tatsächliche Ursache – „direkt auf einen Gegner“ nur bei Ballverlust mit Weg < 1 m am Gegner', () => {
  const seen = { gut: 0, sicherNicht: 0, knapp: 0, direkt: 0, dazwischen: 0 };
  for (const l of L) {
    const c = E.carrier(l.s), reds = E.team(l.s, 'red');
    for (const z of ziele(l.s)) {
      const ev = E.evaluate(l.s, dribble(z)), t = cap(E, c, z), main = sim(E, l.s, t);
      const into = reds.some((r) => { const sd = segDist(r, c, t); return sd.t > 0.02 && sd.d < 1; });
      if (ev.exe.why === T.inGegner) { seen.direkt++; assert.ok(main.lost && into, `${l.src}: „direkt“ ohne Ballverlust/Gegner im Weg`); }
      else if (/^Dribbel weiter weg vo/.test(ev.exe.why)) { seen.dazwischen++; assert.ok(main.lost && !into); }
      else if (/^Das war knapp/.test(ev.exe.why)) { seen.knapp++; assert.ok(!main.lost); }
      else if (SAFE_NO.includes(ev.exe.why)) { seen.sicherNicht++; assert.ok(!main.lost); }
      else { seen.gut++; assert.ok(GOOD.includes(ev.exe.why), ev.exe.why); assert.ok(!main.lost); }
      // keine doppelte Aussage „Ball behalten“ in der gesprochenen Rückmeldung (nur im Ergebnis-Satz)
      assert.ok(!/behalten/.test(ev.exe.why), 'Ziel-Text wiederholt „behalten“: ' + ev.exe.why);
    }
  }
  for (const k of Object.keys(seen)) assert.ok(seen[k] > 0, `Fall ${k} kommt vor: ${JSON.stringify(seen)}`);
});

test('E2: Ein Tipp über 8 m wird bewertet wie der tatsächlich ausgeführte 8-m-Weg', () => {
  for (const l of L.filter((_, i) => i % 2 === 0)) {
    const c = E.carrier(l.s);
    for (const z of ziele(l.s, 30, [11, 14])) {
      const a = E.evaluate(l.s, dribble(z)), b = E.evaluate(l.s, dribble(cap(E, c, z)));
      assert.deepStrictEqual([a.exe.good, a.exe.why], [b.exe.good, b.exe.why], l.src);
    }
  }
});

test('Bewusst schlechte und zweifelhafte Dribblings (Entwurfslagen)', () => {
  // B4: Gegner frontal 6 m vor dem Ball – geradewegs hindurch ist schlecht, außen vorbei gut
  const b4 = probeState(E, ENTWURF.B4);
  const durch = E.evaluate(b4, { kind: 'dribble', x: 25, y: 12 });
  assert.deepStrictEqual([durch.exe.good, durch.exe.why], [false, T.inGegner]);
  assert.ok(E.evaluate(b4, { kind: 'dribble', x: 23, y: 6 }).exe.good, 'außen vorbei');
  // B2: zwei Gegner – mitten durch die Lücke und außen herum sind beide gut (mehrere sinnvolle Wege)
  const b2 = probeState(E, ENTWURF.B2);
  assert.ok(E.evaluate(b2, { kind: 'dribble', x: 20, y: 12 }).exe.good, 'durch die Lücke');
  assert.ok(E.evaluate(b2, { kind: 'dribble', x: 19, y: 22 }).exe.good, 'außen herum');
  assert.strictEqual(E.evaluate(b2, { kind: 'dribble', x: 19, y: 7.5 }).exe.why, T.inGegner, 'in den Gegner');
  // Tipp weit ins Aus: wird aufs Feld und auf 8 m gekappt, bewertet wie ausgeführt
  const a = E.evaluate(b2, { kind: 'dribble', x: 60, y: -20 }), c = E.carrier(b2);
  assert.deepStrictEqual(a.exe, E.evaluate(b2, dribble(cap(E, c, { x: 60, y: -20 }))).exe);
  // Quer bzw. rückwärts ohne Not (B3: Verfolger hinten, vorn alles frei): sicher, aber nicht sinnvoll (E3)
  const b3 = probeState(E, ENTWURF.B3);
  assert.deepStrictEqual(E.evaluate(b3, { kind: 'dribble', x: 18, y: 4 }).exe, { good: false, why: T.dribbelNachVorn });
  assert.ok(E.evaluate(b3, { kind: 'dribble', x: 24, y: 12 }).exe.good, 'nach vorn');
});

test('E6: Hilfe zeigt ⭐-Ziele, robust bei ungenauem Tippen (≥ 3 von 4 Nachbarzielen ±0,5 m ebenfalls ⭐), meist nach vorn; ohne guten Weg ehrlich „eng“', () => {
  let n = 0, fwd = 0;
  for (const l of L) {
    const h = E.hint(l.s, 'dribbeln'), sit = E.situation(l.s);
    if (h.eng) { assert.strictEqual(sit.dBest < 0 || sit.vorrang, true, l.src); assert.ok(!h.alsoGood); assert.strictEqual(h.say, E.texts(l.s).hilfe.dribbelnEng); if (h.point) assert.ok(!E.evaluate(l.s, dribble(h.point)).exe.good || sit.vorrang); continue; }
    const ev = E.evaluate(l.s, dribble(h.point));
    assert.ok(ev.exe.good, `${l.src}: Hilfeziel ⭐ (${ev.exe.why})`);
    n++;
    const nb = [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]].filter(([dx, dy]) => E.evaluate(l.s, { kind: 'dribble', x: h.point.x + dx, y: h.point.y + dy }).exe.good).length;
    if (h.genau) assert.strictEqual(h.say.startsWith(E.texts(l.s).hilfe.dribbelnGenau), true, 'ehrlicher Hinweis „genau dorthin“');
    else assert.ok(nb >= 3, `${l.src}: Nachbarn ${nb}/4`);
    if (h.point.x > E.carrier(l.s).x + 1) fwd++;
  }
  assert.ok(n >= L.length * 0.8, `Hilfe mit ⭐-Ziel in ${n} von ${L.length} Lagen`);
  assert.ok(fwd >= n * 0.85, `Hilfe nach vorn in ${fwd} von ${n}`);
});

test('E6: Hilfe-Weg in B1–B5 führt ohne Abdriften zur Seitenlinie in höchstens 4 Entscheidungen zum Tor (nur ⭐)', () => {
  for (const k of ['B1', 'B2', 'B3', 'B4', 'B5']) {
    const s = probeState(E, ENTWURF[k], { reihenfolge: ['dribbeln', 'schiessen'] }); let last = null, goal = false, i = 0;
    for (; i < 6 && !goal; i++) {
      const ctx = E.context(s, last), key = E.recommend(s, ctx.actions), h = E.hint(s, key), a = { kind: MAP[key] };
      if (h.point) { a.x = h.point.x; a.y = h.point.y; assert.ok(h.point.y > 2 && h.point.y < E.F.H - 2, `${k}: Seitenlinie (${h.point.y.toFixed(1)})`); }
      if (h.goal != null) a.goal = h.goal;
      assert.ok(E.evaluate(s, a).good, `${k}: Hilfe ⭐ (Schritt ${i + 1})`);
      E.startAction(s, a); let n = 0; while (!s.ep.done && n++ < 3000) E.tick(s);
      goal = s.ep.events.some((e) => e.type === 'goal'); last = { kind: a.kind, success: E.feedback(s).success, team: 'blue' };
    }
    assert.ok(goal && i <= 4, `${k}: Tor nach ${i} Entscheidungen`);
  }
});

test('E6: A4 mit dem Lernweg von „Welches Tor ist frei?“ – Dribbeln ⭐ → Schuss ⭐ → Tor in der Startlage und bei ±0,5 m je Spieler', () => {
  const hilfe = E.mission('welches-tor-ist-frei').hilfe;
  const run = (sp) => { const s = probeState(E, sp, hilfe), log = []; let last = null;
    for (let i = 0; i < 4; i++) { const ctx = E.context(s, last), key = E.recommend(s, ctx.actions), h = E.hint(s, key), a = { kind: MAP[key] }; if (h.ids && h.ids.length) a.id = h.ids[0]; if (h.point) { a.x = h.point.x; a.y = h.point.y; } if (h.goal != null) a.goal = h.goal;
      const ev = E.evaluate(s, a); E.startAction(s, a); let n = 0; while (!s.ep.done && n++ < 3000) E.tick(s); const g = s.ep.events.some((e) => e.type === 'goal'); log.push(a.kind + (ev.good ? '⭐' : '💭') + (g ? '⚽' : '')); last = { kind: a.kind, success: E.feedback(s).success, team: 'blue' }; if (g) break; }
    return log.join(' '); };
  assert.strictEqual(run(ENTWURF.A4), 'dribble⭐ shoot⭐⚽');
  for (let i = 0; i < ENTWURF.A4.length; i++) for (const ax of ['x', 'y']) for (const d of [-0.5, 0.5]) {
    const sp = ENTWURF.A4.map((p) => ({ ...p })); sp[i][ax] += d;
    assert.strictEqual(run(sp), 'dribble⭐ shoot⭐⚽', `${sp[i].id} ${ax} ${d}`);
  }
});

// ---------------------------------------------------------------- E3 (Regel R2), E5-a/-b, E6-Ausweg
const endState = (s, to) => { const t = E.clone(s); E.startAction(t, dribble(to)); let n = 0; while (!t.ep.done && n++ < 3000) E.tick(t); return t; };

test('E3: Jeder ⭐-Grund trifft in der Folgesituation (nächster Entscheidungsmoment) wirklich zu – Anschluss ist nutzbar', () => {
  const seen = { raum: 0, pass: 0, tor: 0, sichern: 0 };
  for (const l of L) {
    const c = E.carrier(l.s), sit0 = E.situation(l.s);
    for (const z of ziele(l.s)) {
      const ev = E.evaluate(l.s, dribble(z)); if (!ev.exe.good) continue;
      const t = endState(l.s, cap(E, c, z)), c1 = E.carrier(t), ctx = E.context(t, { kind: 'dribble', success: true, team: 'blue' });
      assert.strictEqual(t.poss, 'blue');
      if (ev.exe.why === T.freierRaum) { seen.raum++; assert.ok(c1.x - c.x >= 1, 'Raumgewinn ≥ 1 m'); }
      else if (ev.exe.why === T.dribbelAnschlussPass) {
        seen.pass++; assert.ok(!sit0.ok.mate, 'vorher kein Freund frei');
        assert.ok(ctx.actions.includes('passen'), 'Passen wird angeboten');
        const best = E.passOptions(t).sort((a, b) => b.margin - a.margin)[0];
        assert.ok(E.evaluate(t, { kind: 'pass', id: best.id }).exe.good, 'Pass in der Folgesituation ⭐-Ziel');
      } else if (ev.exe.why === T.dribbelAnschlussTor) {
        seen.tor++; assert.strictEqual(ctx.type, 'abschluss');
        const g = E.shotOptions(t).sort((a, b) => b.margin - a.margin)[0].goal;
        assert.ok(E.evaluate(t, { kind: 'shoot', goal: g }).good, 'freier Schuss in der Folgesituation ⭐');
      } else { seen.sichern++; assert.strictEqual(ev.exe.why, T.dribbelGesichert); assert.ok(!sit0.ok.mate); }
    }
  }
  assert.ok(seen.raum > 100 && seen.pass + seen.tor > 0, JSON.stringify(seen));
});

test('E3: Beispiele seitlich und rückwärts – gut nur mit Grund, sonst 💭 mit Hinweis', () => {
  const P = (id, x, y) => ({ id, x, y });
  // rückwärts/quer ohne Not, vorn frei (B3) → 💭 „Nach vorn war Platz …“
  const b3 = probeState(E, ENTWURF.B3);
  for (const p of [{ x: 14, y: 6 }, { x: 18, y: 18 }]) assert.deepStrictEqual(E.evaluate(b3, dribble(p)).exe, { good: false, why: T.dribbelNachVorn });
  // Freund frei, Dribbling quer/rückwärts → 💭 „Ein Freund stand frei …“ bzw. „Nach vorn war Platz“; nach vorn ⭐
  const x3 = probeState(E, [P('b1', 14, 12), P('b2', 21, 5), P('r1', 15.4, 12.6), P('r2', 30, 18)]);
  assert.strictEqual(E.evaluate(x3, dribble({ x: 10, y: 12 })).exe.good, false);
  assert.ok(E.evaluate(x3, dribble(E.hint(x3, 'dribbeln').point)).good, 'nach vorn ⭐');
  // eingeklemmt am Rand, kein Freund, nach vorn kein sicherer Weg → Ball sichern ist gut (Grund „gesichert“)
  const ecke = probeState(E, [P('b1', 3, 1.2), P('r1', 4.4, 1.3), P('r2', 4.2, 3.0), P('r3', 3.2, 3.6)]);
  const sit = E.situation(ecke);
  if (sit.ok.dribble) { const h = E.hint(ecke, 'dribbeln'); const ev = E.evaluate(ecke, dribble(h.point)); assert.ok(ev.exe.good); assert.ok(GOOD.includes(ev.exe.why)); }
  // unter 1 m ist es kein Dribbling
  const s = probeState(E, ENTWURF.B5), c = E.carrier(s);
  assert.deepStrictEqual(E.evaluate(s, dribble({ x: c.x + 0.5, y: c.y })).exe.why, T.dribbelZuKurz);
});

test('E3: Grenzfall 1 m – Raumgewinn knapp unter 1 m ohne Anschluss ist 💭, ab 1 m ⭐ (gleiches Ziel, nur Strecke verschieden)', () => {
  const s = probeState(E, ENTWURF.B5), c = E.carrier(s); // viel Platz, kein Druck
  const a = E.evaluate(s, dribble({ x: c.x + 0.8, y: c.y + 3 })), b = E.evaluate(s, dribble({ x: c.x + 1.3, y: c.y + 3 }));
  assert.deepStrictEqual([a.exe.good, a.exe.why], [false, T.dribbelNachVorn]);
  assert.deepStrictEqual([b.exe.good, b.exe.why], [true, T.freierRaum]);
});

test('E5-a: Dribbeln ist sinnvoll, sobald ein nach E3 gutes Dribbling existiert – ein freier Freund macht es nicht falsch', () => {
  for (const l of L) {
    const sit = E.situation(l.s), h = E.hint(l.s, 'dribbeln');
    if (sit.ok.dribble) { assert.ok(!h.eng, l.src); const ev = E.evaluate(l.s, dribble(h.point)); assert.ok(ev.good, `${l.src}: Hilfeziel ⭐ (${ev.why})`); }
    else for (const z of ziele(l.s, 60, [4, 8])) assert.strictEqual(E.evaluate(l.s, dribble(z)).rec.good, !E.situation(l.s).ok.pass && !E.situation(l.s).ok.shoot, l.src);
  }
  const P = (id, x, y) => ({ id, x, y });
  const x3 = probeState(E, [P('b1', 14, 12), P('b2', 21, 5), P('r1', 15.4, 12.6), P('r2', 30, 18)]);
  assert.ok(E.situation(x3).ok.mate && E.situation(x3).ok.dribble, 'Freund frei UND Dribbeln sinnvoll');
  assert.ok(E.evaluate(x3, { kind: 'pass', id: 'b2' }).good, 'Pass ⭐');
  assert.ok(E.evaluate(x3, dribble(E.hint(x3, 'dribbeln').point)).good, 'Dribbling ⭐');
  assert.strictEqual(E.recommend(x3, ['passen', 'dribbeln']), 'passen', 'Hilfe folgt weiter dem Lernweg (Passen zuerst)');
});

test('E5-b: Torchance-Vorrang – Freund frei vor dem Tor und kein Dribbling mit eigener freier Schusschance → Passen besser; beide Torchancen → beide ⭐', () => {
  const P = (id, x, y) => ({ id, x, y });
  const x1 = probeState(E, [P('b1', 20, 12), P('b2', 31, 7), P('r1', 21.4, 12.6), P('r2', 34.4, 15.5)]);
  assert.ok(E.situation(x1).vorrang);
  assert.ok(E.evaluate(x1, { kind: 'pass', id: 'b2' }).good, 'Pass ⭐');
  const d = E.evaluate(x1, dribble({ x: 26, y: 9 }));
  assert.deepStrictEqual([d.rec.good, d.rec.why, d.good], [false, E.texts(x1).erkennen.besserTorchancePass, false]);
  assert.strictEqual(E.recommend(x1, ['passen', 'dribbeln']), 'passen');
  assert.ok(!E.goodActions(x1, ['passen', 'dribbeln']).includes('dribbeln'));
  // Torchance nutzbar: Pass kommt an, Blau 2 hat in der Folgesituation einen freien Schuss
  const t = E.clone(x1); E.startAction(t, { kind: 'pass', id: 'b2' }); let n = 0; while (!t.ep.done && n++ < 3000) E.tick(t);
  assert.strictEqual(E.carrier(t).id, 'b2'); const g = E.shotOptions(t).sort((a, b) => b.margin - a.margin)[0].goal;
  assert.ok(E.evaluate(t, { kind: 'shoot', goal: g }).good, 'Schuss nach dem Pass ⭐');
  // beide Wege führen zur freien Schusschance → keine Passpflicht
  for (const sp of [[P('b1', 26.5, 16), P('b2', 31, 7), P('r1', 25, 17.5), P('r2', 34.4, 10.5)], [P('b1', 27, 18), P('b2', 31, 6), P('r1', 25.5, 19), P('r2', 34, 12)]]) {
    const s = probeState(E, sp);
    assert.ok(!E.situation(s).vorrang && E.situation(s).ok.dribble);
    assert.ok(E.evaluate(s, { kind: 'pass', id: 'b2' }).good);
    assert.ok(E.evaluate(s, dribble(E.hint(s, 'dribbeln').point)).good, 'Dribbling zur eigenen Torchance ⭐');
  }
});

test('E6-Ausweg: ohne guten Dribbelweg sagt die Hilfe ehrlich „eng“, zeigt kein riskantes Ziel als sicher, nennt kein „Auch gut“', () => {
  const P = (id, x, y) => ({ id, x, y });
  for (const sp of [[P('b1', 1, 1), P('r1', 2.4, 1.1), P('r2', 1.1, 2.4), P('r3', 2.3, 2.3)], [P('b1', 0.8, 0.8), P('r1', 2.0, 0.9), P('r2', 0.9, 2.0), P('r3', 1.9, 1.9), P('b2', 10, 20), P('r4', 9, 19)]]) {
    const s = probeState(E, sp, { reihenfolge: ['dribbeln', 'passen', 'schiessen'], alternativenNennen: true });
    assert.ok(!E.situation(s).ok.dribble);
    const h = E.hint(s, 'dribbeln');
    assert.ok(h.eng); assert.strictEqual(h.say, E.texts(s).hilfe.dribbelnEng); assert.ok(!h.alsoGood);
    if (h.point) assert.ok(!E.evaluate(s, dribble(h.point)).good);
  }
});
