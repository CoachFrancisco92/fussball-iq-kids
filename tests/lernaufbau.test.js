// V0.6a P1/P4: Lernaufbau der Lernmissionen – jede Situation vermittelt ihr Lernziel robust, ohne Musterlösung und
// ohne triviale Umgehung. Geprüft mit der echten Engine (Bewertung, Simulation, belegte Ursachen, Lernergebnis).
const test = require('node:test');
const assert = require('node:assert');
const E = require('./helpers/load.js');
const F = E.F;

const MAP = { passen: 'pass', schiessen: 'shoot', dribbeln: 'dribble', freilaufen: 'run', erobern: 'press', raum: 'cover' };
function hintAction(s, ctx) {
  const k = E.recommend(s, ctx.actions), h = E.hint(s, k), a = { kind: MAP[k] };
  if (h.ids) a.id = h.ids[0]; if (h.point) { a.x = h.point.x; a.y = h.point.y; } if (h.goal != null) a.goal = h.goal;
  return a;
}
const run = (s, a) => { E.startAction(s, a); let n = 0; while (!s.ep.done && n++ < 3000) E.tick(s); return E.feedback(s); };
const polar = (o, deg, d) => ({ x: Math.max(0.3, Math.min(F.W - 0.3, o.x + Math.cos((deg * Math.PI) / 180) * d)), y: Math.max(0.3, Math.min(F.H - 0.3, o.y + Math.sin((deg * Math.PI) / 180) * d)) });
const dribbles = (s) => { const c = E.carrier(s), out = []; for (let deg = -150; deg <= 150; deg += 15) for (const d of [3, 5, 8]) out.push({ deg, a: Object.assign({ kind: 'dribble' }, polar(c, deg, d)) }); return out; };

/** Testmission mit genau einer Situation (Lage ggf. verschoben), gleiche Missionseinstellungen wie das Original. */
function einzel(missionId, sit, verschiebe) {
  const m = E.mission(missionId);
  const start = JSON.parse(JSON.stringify(sit.start));
  if (verschiebe) { const p = start.spieler.find((x) => x.id === verschiebe.id); p.x += verschiebe.dx; p.y += verschiebe.dy; }
  const id = `t-${missionId}-${sit.id}`;
  const def = Object.assign({}, m, { id, situationen: [Object.assign({}, sit, { start })], durchlaeufe: [[sit.id]] });
  globalThis.FIQ_MISSIONS = globalThis.FIQ_MISSIONS.filter((x) => x.id !== id).concat([def]);
  return id;
}
/** Ganze Situation spielen: erste Entscheidungen nach plan, danach Hilfe. Liefert Lernergebnis und Schritte. */
function spiele(id, plan = []) {
  const s = E.newState(id, 0), m = E.newMission(id, 0), start = E.lernStart(s), schritte = [];
  let last = null;
  for (let i = 0; !m.done && i < 8; i++) {
    const ctx = E.context(s, last);
    const a = plan[i] ? plan[i](s, ctx) : hintAction(s, ctx);
    const fb = run(s, a);
    schritte.push({ ctxType: ctx.type, kind: a.kind, good: fb.good, ursachen: fb.ursachen, lern: fb.lern, hilfe: !plan[i], fb });
    E.missionAfter(m, s, ctx.type); E.missionApply(m, s);
    last = { kind: a.kind, success: fb.success, team: 'blue' };
  }
  return { ergebnis: E.lernAuswertung(start, schritte), schritte };
}
/** Vermessung der ersten Entscheidung: alle Dribblings mit Stern, nach Ursache sortiert. */
function ersteDribblings(id) {
  const s = E.newState(id, 0), paar = E.lernStart(s).paar;
  const res = { stern: [], durch: [], aussenVorbei: [], ueberspielt: [], nachVornOhne: [], sektoren: new Set(), forward: [] };
  for (const x of dribbles(s)) {
    if (!E.evaluate(s, x.a).good) continue;
    const s2 = E.clone(s); const fb = run(s2, x.a);
    const u = fb.ursachen; res.stern.push(x); res.sektoren.add(Math.round(x.deg / 30) * 30);
    if (u.some((y) => y.typ === 'lueckeDurch')) res.durch.push(x);
    else if (u.some((y) => y.typ === 'ueberspielt' && (!paar || paar.includes(y.gegner)))) res.aussenVorbei.push(x);
    if (u.some((y) => y.typ === 'ueberspielt')) res.ueberspielt.push(x);
    if (fb.lern.dx >= 2) res.forward.push(x);
    if (Math.abs(x.deg) <= 30 && !u.some((y) => y.typ === 'ueberspielt' || y.typ === 'lueckeDurch')) res.nachVornOhne.push(x);
  }
  return res;
}
const breiteDerLuecke = (sit) => { const r = sit.start.spieler.filter((p) => p.id[0] === 'r').sort((a, b) => a.x - b.x).slice(0, 2); return Math.hypot(r[0].x - r[1].x, r[0].y - r[1].y); };

/** Kerneigenschaft je Lernziel (für die Robustheitsprüfung) – true, wenn die Lage ihr Lernziel trägt. */
function eigenschaft(missionId, sit, id) {
  const t = sit.lernziel;
  const hilfe = spiele(id);
  if (!hilfe.ergebnis.geloest) return 'Hilfe löst die Situation nicht: ' + hilfe.ergebnis.grund;
  if (t === 'torWaehlen' || t === 'andereLoesung') {
    // an der Kernentscheidung muss es auch eine falsche Wahl geben (sonst keine Entscheidung) – außer bei „beide frei“ (A5)
    const k = hilfe.schritte[hilfe.ergebnis.kern];
    if (t === 'andereLoesung' && k.lern.freieTore.length !== 0) return 'beide Tore müssen zu sein';
    if (t === 'torWaehlen' && sit.id !== 'A5' && k.lern.freieTore.length !== 1) return `genau ein Tor frei erwartet, frei: ${k.lern.freieTore}`;
    return true;
  }
  if (t === 'nochmalSchauen') {
    if (hilfe.ergebnis.grund !== 'veraenderungErkannt') return 'keine Veränderung der Torlage: ' + hilfe.ergebnis.grund;
    // Wer zum vorher freien Tor hin dribbelt und dorthin schießt, wird geblockt (Wächter verschoben)
    const s = E.newState(id, 0), c = E.carrier(s), unten = sit.start.spieler.find((p) => p.id === 'r2').y > 12;
    const r = spiele(id, [() => ({ kind: 'dribble', x: c.x + 5, y: c.y + (unten ? 2.5 : -2.5) }), (s2, ctx) => (ctx.actions.includes('schiessen') ? { kind: 'shoot', goal: unten ? 1 : 0 } : hintAction(s2, ctx))]);
    const schuss = r.schritte.find((x) => x.kind === 'shoot');
    if (!schuss || schuss.good || !schuss.ursachen.some((u) => u.typ === 'waechterVerschoben')) return 'Schuss aufs vorher freie Tor nicht als „Wächter verschoben“ erkannt';
    return true;
  }
  const d = ersteDribblings(id);
  if (t === 'platzVorDir') return d.forward.length >= 3 || 'zu wenige gute Wege nach vorn';
  if (t === 'vorbei') return d.ueberspielt.length >= 4 || `nur ${d.ueberspielt.length} gute Wege vorbei`;
  if (t === 'luecke') {
    const w = breiteDerLuecke(sit);
    if (w < 3.5) {
      if (d.durch.length) return 'enge Lücke: Weg durch die Lücke darf nicht gut sein';
      if (!d.aussenVorbei.length) return 'enge Lücke: kein guter Weg außen herum';
      if (d.nachVornOhne.length) return 'enge Lücke: Entscheidung nach vorn umgehbar';
    } else if (!d.durch.length) return 'breite Lücke: Weg durch die Lücke muss gut sein';
    return true;
  }
  return 'unbekanntes Lernziel ' + t;
}

for (const missionId of ['welches-tor-ist-frei', 'freie-bahn']) {
  const m = E.mission(missionId);

  test(`${m.titel}: jede Situation hat ein Lernziel, jeder Durchlauf enthält jedes Lernziel der Mission`, () => {
    for (const sit of m.situationen) assert.ok(E.LERNZIELE.includes(sit.lernziel), `${sit.id}: lernziel`);
    const ziele = new Set(m.situationen.map((x) => x.lernziel));
    const kern = missionId === 'freie-bahn' ? ['vorbei', 'luecke'] : ['torWaehlen', 'andereLoesung', 'nochmalSchauen'];
    m.durchlaeufe.forEach((d, i) => { const z = new Set(d.map((id) => m.situationen.find((x) => x.id === id).lernziel)); for (const k of kern) assert.ok(z.has(k), `Durchlauf ${i + 1} ohne ${k}`); });
    assert.ok(ziele.size >= kern.length);
  });

  for (const sit of m.situationen) {
    test(`${m.titel} ${sit.id} (${sit.lernziel}): trägt das Lernziel robust (jeder Spieler ±0,5 m)`, () => {
      const base = einzel(missionId, sit);
      assert.strictEqual(eigenschaft(missionId, sit, base), true, `${sit.id} Grundlage`);
      const fehler = [];
      for (const p of sit.start.spieler) for (const [dx, dy] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) {
        const id = einzel(missionId, sit, { id: p.id, dx, dy });
        const e = eigenschaft(missionId, sit, id);
        if (e !== true) fehler.push(`${p.id}${dx ? (dx > 0 ? '+x' : '-x') : dy > 0 ? '+y' : '-y'}: ${e}`);
      }
      assert.deepStrictEqual(fehler, [], `${sit.id}: nicht robust`);
    });
  }
}

test('Freie Bahn: mehrere gute Lösungswege je Kernentscheidung (keine Musterlösung)', () => {
  const m = E.mission('freie-bahn');
  for (const sit of m.situationen.filter((x) => ['vorbei', 'luecke', 'platzVorDir'].includes(x.lernziel))) {
    const d = ersteDribblings(einzel('freie-bahn', sit));
    assert.ok(d.sektoren.size >= 2, `${sit.id}: nur ${d.sektoren.size} Richtung(en) gut`);
  }
});

test('Breite Lücke: sichere Außenwege sind nicht ausgeschlossen (Bewertung folgt der Geometrie, PO Punkt 7)', () => {
  const m = E.mission('freie-bahn');
  for (const sit of m.situationen.filter((x) => x.lernziel === 'luecke' && breiteDerLuecke(x) >= 5)) {
    const id = einzel('freie-bahn', sit), s = E.newState(id, 0), c = E.carrier(s), paar = E.lernStart(s).paar;
    // Außenweg in zwei Schritten: erst seitlich nach außen, dann vorbei – beide gut, Ball behalten
    const aussen = paar.map((pid) => E.P(s, pid)).sort((a, b) => a.y - b.y)[sit.id.endsWith('m') ? 1 : 0];
    const r = spiele(id, [() => ({ kind: 'dribble', x: c.x + 2.1, y: aussen.y < 12 ? aussen.y - 4.3 : aussen.y + 4.3 }), (s2) => { const c2 = E.carrier(s2); return { kind: 'dribble', x: c2.x + 7, y: c2.y }; }]);
    assert.ok(r.schritte[0].good && r.schritte[1].good, `${sit.id}: sicherer Außenweg nicht gut bewertet`);
    assert.strictEqual(r.ergebnis.geloest, true, `${sit.id}: Außenweg löst die Lückensituation`);
    assert.strictEqual(r.ergebnis.grund, 'aussenHerum');
  }
});

test('Lernergebnis: gute Vorbereitung allein löst keine Lernsituation (PO-Präzisierung P4)', () => {
  const fb = E.mission('freie-bahn'), A = E.mission('welches-tor-ist-frei');
  const sit = (m, id) => m.situationen.find((x) => x.id === id);
  // Lücke eng: nur seitlicher Vorbereitungsschritt mit Stern, danach Ballverlust in der Lücke → nicht gelöst
  { const id = einzel('freie-bahn', sit(fb, 'L4e')), s = E.newState(id, 0), c = E.carrier(s);
    const r = spiele(id, [() => ({ kind: 'dribble', x: c.x + 1.5, y: c.y - 2.6 }), (s2) => { const c2 = E.carrier(s2); return { kind: 'dribble', x: c2.x + 3.5, y: 12 }; }]);
    assert.ok(r.schritte[0].good, 'Vorbereitung ist gut bewertet');
    assert.strictEqual(r.ergebnis.geloest, false, 'aber die Lücke ist nicht gelöst'); }
  // Vorbei: zurück und nicht vorbei → nicht gelöst
  { const id = einzel('freie-bahn', sit(fb, 'V1')), s = E.newState(id, 0), c = E.carrier(s);
    const r = spiele(id, [() => ({ kind: 'dribble', x: c.x + 6, y: c.y })]);
    assert.strictEqual(r.ergebnis.geloest, false); assert.strictEqual(r.ergebnis.grund, 'nichtVorbei'); }
  // Welches Tor: Bei freiem Tor ist ein Pass keine gute Entscheidung – er kann die Torwahl nicht umgehen;
  // gelöst ist die Situation nur, wenn der Schuss aufs freie Tor folgt (Kernleistung = Schuss)
  { const id = einzel('welches-tor-ist-frei', sit(A, 'A1'));
    const r = spiele(id, [() => ({ kind: 'pass', id: 'b2' })]);
    assert.strictEqual(r.schritte[0].good, false, 'Pass statt Schuss aufs freie Tor ist kein Stern');
    const k = r.ergebnis.kern;
    assert.ok(k == null || r.schritte[k].kind === 'shoot', 'Kernleistung ist der Schuss');
    assert.ok(!r.ergebnis.geloest || r.schritte[k].good); }
  // Beide zu: Schuss aufs zugestellte Tor ist nicht gelöst, Pass zum freien Freund ist gelöst
  { const id = einzel('welches-tor-ist-frei', sit(A, 'A3'));
    assert.strictEqual(spiele(id, [() => ({ kind: 'shoot', goal: 0 })]).ergebnis.geloest, false);
    assert.strictEqual(spiele(id, [() => ({ kind: 'pass', id: 'b2' })]).ergebnis.geloest, true); }
  // Schau nochmal: früher Pass, dann Schuss aufs jetzt freie Tor → gelöst (gleichwertige Alternative)
  { const id = einzel('welches-tor-ist-frei', sit(A, 'W1'));
    const r = spiele(id, [() => ({ kind: 'pass', id: 'b2' })]);
    assert.strictEqual(r.ergebnis.geloest, true, 'Pass-Weg mit späterer richtiger Torwahl ist gelöst'); }
  // Mit Hilfe gelöst: voller Erfolg, nur gekennzeichnet
  { const r = spiele(einzel('freie-bahn', sit(fb, 'V1')));
    assert.strictEqual(r.ergebnis.geloest, true); assert.strictEqual(r.ergebnis.hilfe, true); }
});
