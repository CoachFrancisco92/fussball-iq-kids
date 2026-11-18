// Missionsarchitektur: Inhalte getrennt von der Engine, Missionen prüfbar, Engine missionsunabhängig.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const E = require('./helpers/load.js');
require('./fixtures/test-mission.js'); // Testmission zusätzlich registrieren (nur in diesem Testprozess)
const root = path.join(__dirname, '..');
// Quelltext ohne Kommentare (Kommentare dürfen Begriffe wie „Keiner ist frei“ erwähnen)
const code = (f) => fs.readFileSync(path.join(root, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
const engineSrc = code('engine.js');
const appSrc = code('app.js');

/** Alle kindgerichteten Sätze des Textkatalogs (Funktionen mit Platzhaltern aufgerufen) */
function catalogStrings(obj, out = []) {
  for (const v of Object.values(obj)) {
    if (typeof v === 'string') out.push(v);
    else if (typeof v === 'function') out.push(...String(v(' §1 ', ' §2 ')).split(/ §\d /));
    else if (v && typeof v === 'object') catalogStrings(v, out);
  }
  return out.map((x) => x.trim()).filter((x) => x.length >= 12);
}

test('Engine und Oberfläche enthalten keine pädagogischen Texte mehr (alles in content/texte.js)', () => {
  const strings = catalogStrings(globalThis.FIQ_TEXTE);
  assert.ok(strings.length > 80, 'Textkatalog vollständig geladen');
  const inEngine = strings.filter((t) => engineSrc.includes(t));
  const inApp = strings.filter((t) => appSrc.includes(t));
  assert.deepStrictEqual(inEngine, [], 'Texte in engine.js');
  assert.deepStrictEqual(inApp, [], 'Texte in app.js');
});

test('Engine enthält keine Missionsinhalte (Aufstellungen, Phasenzahlen)', () => {
  assert.doesNotMatch(engineSrc, /mkPlayer\('(blue|red)', \d/, 'keine fest eingebauten Spieler');
  assert.doesNotMatch(engineSrc, /set\('[br]\d'/, 'keine fest eingebauten Neustarts');
  assert.doesNotMatch(engineSrc, /maxAttack: \d|defense: \d/, 'keine fest eingebauten Phasen');
  assert.doesNotMatch(appSrc, /LOOK_STEP|'angriff' &&/, 'Schau-Schritt kommt aus der Mission');
});

test('Mission 1 ist gültig und vollständig beschrieben', () => {
  const m = E.mission('mission-1');
  assert.deepStrictEqual(E.validateMission(m), []);
  assert.strictEqual(E.mission().id, 'mission-1', 'Standardmission');
  assert.ok(m.lernziele.length >= 2 && m.titel && m.untertitel && m.merkmale.length);
});

test('Missionsprüfung erkennt fehlerhafte Missionen', () => {
  const ok = E.mission('mission-1');
  const bad = (patch) => E.validateMission(Object.assign(JSON.parse(JSON.stringify(ok)), patch));
  assert.ok(bad({ titel: '' }).length);
  assert.ok(bad({ phasen: { maxAngriff: 0, verteidigung: 2 } }).length);
  assert.ok(bad({ start: { ballbesitz: 'b9', spieler: ok.start.spieler } }).some((e) => /ballbesitz/.test(e)));
  assert.ok(bad({ start: { ballbesitz: 'b1', spieler: [{ id: 'b1', x: 40, y: 5 }, { id: 'b2', x: 5, y: 5 }, { id: 'r1', x: 9, y: 9 }, { id: 'r2', x: 9, y: 3 }] } }).some((e) => /außerhalb/.test(e)));
  assert.ok(bad({ neustart: { red: ok.neustart.blue, blue: ok.neustart.blue } }).some((e) => /Team red/.test(e)));
  assert.ok(bad({ schauSchritt: undefined }).length);
  assert.throws(() => E.newState('gibt-es-nicht'), /Mission nicht gefunden/);
});

test('Neue Mission ohne Änderung der Engine: Testmission läuft mit eigener Aufstellung, eigenen Phasen und Texten', () => {
  const s = E.newState('test-mission');
  assert.strictEqual(s.missionId, 'test-mission');
  assert.strictEqual(E.carrier(s).id, 'b2');
  assert.deepStrictEqual(E.P(s, 'r1') && [E.P(s, 'r1').x, E.P(s, 'r1').y], [20, 12]);
  assert.strictEqual(E.context(s, null).title, 'Testtitel', 'Text-Überschreibung der Mission');
  assert.strictEqual(E.texts('test-mission').ende.merksatz, ' Test-Merksatz.');
  assert.strictEqual(E.lookBefore(s, E.context(s, null)), false, 'Schau-Schritt in dieser Mission aus');
  // Mission 1 bleibt unberührt
  const s1 = E.newState('mission-1');
  assert.strictEqual(E.context(s1, null).title, 'Was machst du mit dem Ball?');
  assert.strictEqual(E.lookBefore(s1, E.context(s1, null)), true);
  // Phasen der Testmission: höchstens 2 Angriffs- + 1 Verteidigungsentscheidung, Neustart aus der Mission
  const m = E.newMission('test-mission');
  assert.deepStrictEqual([m.maxAttack, m.defense], [2, 1]);
  let n = 0;
  for (const a of [{ kind: 'dribble', x: 6, y: 12 }, { kind: 'dribble', x: 4, y: 12 }]) {
    const ctx = E.context(s, null); E.startAction(s, a); while (!s.ep.done) E.tick(s); E.missionAfter(m, s, ctx.type); n++;
  }
  assert.strictEqual(m.note, 'aus');
  E.missionApply(m, s);
  assert.strictEqual(E.carrier(s).id, 'r2', 'Neustart-Aufstellung der Testmission');
  assert.deepStrictEqual([E.P(s, 'r2').x, E.P(s, 'r2').y], [33, 8]);
});

test('Testmission: 50 Kinder-Abfolgen enden sauber, Zustand bleibt gültig, Bewertung dreiteilig', () => {
  const { playMission, lcg } = require('./golden/trace.js');
  for (let seed = 1; seed <= 50; seed++) {
    const rnd = lcg(seed);
    const log = playMission(E, (E2, s, ctx) => {
      const c = E2.carrier(s), blues = E2.team(s, 'blue');
      const k = ctx.actions[Math.floor(rnd() * ctx.actions.length)];
      const map = { passen: { kind: 'pass', id: blues.find((b) => b !== c).id }, dribbeln: { kind: 'dribble', x: rnd() * 36, y: rnd() * 24 }, schiessen: { kind: 'shoot', goal: rnd() < 0.5 ? 0 : 1 }, freilaufen: { kind: 'run', id: blues.find((b) => b !== c).id, x: rnd() * 36, y: rnd() * 24 }, erobern: { kind: 'press', id: blues[0].id }, raum: { kind: 'cover', id: blues[1].id, x: rnd() * 36, y: rnd() * 24 } };
      return map[k];
    }, ['test-mission']);
    assert.ok(log.length >= 1 && log.length <= 3, `Seed ${seed}: ${log.length} Entscheidungen`);
    for (const r of log) {
      assert.ok(typeof r.ev.rec.good === 'boolean' && typeof r.ev.exe.good === 'boolean' && r.fb.text && r.fb.tip, 'dreiteilige Bewertung + Rückmeldung');
      for (const [, x, y] of r.after.p) assert.ok(x >= 0 && x <= E.F.W && y >= 0 && y <= E.F.H);
    }
  }
});

test('Missionsdateien enthalten keine Logik (nur Daten)', () => {
  for (const f of fs.readdirSync(path.join(root, 'missions'))) {
    const src = fs.readFileSync(path.join(root, 'missions', f), 'utf8');
    const body = src.slice(src.indexOf('.push('));
    assert.doesNotMatch(body, /\bif\s*\(|\bfor\s*\(|=>|function\s*\(/, `${f}: keine Logik in Missionsdateien`);
  }
});
