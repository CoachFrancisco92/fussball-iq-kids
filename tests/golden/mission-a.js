// Aufzeichnung für Mission „Welches Tor ist frei?“ (Meilenstein 2): alle 4 Durchläufe mit Hilfe, feste Spielweisen,
// 200 erzeugte Kinder-Abfolgen. Grundlage der Referenz tests/golden/<referenz.missionA.file>.
//   node tests/golden/mission-a.js --write tests/golden/mission-a.vX.Y.Z.json   (nur nach Freigabe)
const { hash, lcg } = require('./trace.js');
const ID = 'welches-tor-ist-frei';
const MAP = { passen: 'pass', schiessen: 'shoot', dribbeln: 'dribble', freilaufen: 'run' };
const r6 = (v) => Math.round(v * 1e6) / 1e6;
const snap = (s) => ({ sit: s.situation, p: s.players.map((p) => [p.id, r6(p.x), r6(p.y)]), ball: s.ball.owner, poss: s.poss, score: { ...s.score } });

function hintAction(E, s, ctx) {
  const k = E.recommend(s, ctx.actions), h = E.hint(s, k), a = { kind: MAP[k] };
  if (h.ids) a.id = h.ids[0]; if (h.point) { a.x = h.point.x; a.y = h.point.y; } if (h.goal != null) a.goal = h.goal;
  return { a, hint: { k, say: h.say, goal: h.goal, ids: h.ids } };
}
function childAction(E, s, ctx, rnd) { // wie trace.js, ohne Verteidigungsaktionen (Mission A hat keine)
  const F = E.F, c = E.carrier(s), blues = E.team(s, 'blue'), pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const spot = () => ({ x: -5 + rnd() * (F.W + 10), y: -5 + rnd() * (F.H + 10) });
  const k = pick(ctx.actions);
  if (k === 'passen') return rnd() < 0.6 ? { kind: 'pass', id: pick(blues.filter((b) => b !== c)).id } : Object.assign({ kind: 'pass' }, spot());
  if (k === 'dribbeln') return Object.assign({ kind: 'dribble' }, spot());
  if (k === 'schiessen') return { kind: 'shoot', goal: rnd() < 0.5 ? 0 : 1 };
  return Object.assign({ kind: 'run', id: pick(blues.filter((b) => b !== c)).id }, spot());
}
// Feste Spielweisen eines Kindes (gültig in jedem Kontext; sonst Hilfe)
const STYLES = {
  hilfe: (E, s, ctx) => hintAction(E, s, ctx),
  falschesTor: (E, s, ctx) => (ctx.actions.includes('schiessen') ? { kind: 'shoot', goal: E.shotOptions(s).sort((a, b) => a.margin - b.margin)[0].goal } : hintAction(E, s, ctx)),
  immerOben: (E, s, ctx) => (ctx.actions.includes('schiessen') ? { kind: 'shoot', goal: 0 } : hintAction(E, s, ctx)),
  immerUnten: (E, s, ctx) => (ctx.actions.includes('schiessen') ? { kind: 'shoot', goal: 1 } : hintAction(E, s, ctx)),
  immerPass: (E, s, ctx) => (ctx.actions.includes('passen') ? { kind: 'pass', id: E.team(s, 'blue').find((b) => b !== E.carrier(s)).id } : hintAction(E, s, ctx)),
};

function play(E, durchlauf, chooser) {
  const s = E.newState(ID, durchlauf), m = E.newMission(ID, durchlauf), out = [];
  let last = null;
  for (let i = 0; !m.done && i < 16; i++) {
    const ctx = E.context(s, last);
    let a = chooser(E, s, ctx, i), hint = null;
    if (a && a.a) { hint = a.hint; a = a.a; }
    const ev = E.evaluate(s, a), sit = s.situation;
    E.startAction(s, a);
    let n = 0; while (!s.ep.done && n++ < 3000) E.tick(s);
    const fb = E.feedback(s);
    E.missionAfter(m, s, ctx.type);
    const rec = { sit, ctx: { type: ctx.type, title: ctx.title, say: ctx.say, actions: ctx.actions }, a, hint, ev: { good: ev.good, rec: ev.rec, exe: ev.exe, why: ev.why },
      fb: { good: fb.good, success: fb.success, icon: fb.icon, text: fb.text, tip: fb.tip, say: fb.say, goal: fb.goal },
      events: s.ep.events.map((e) => e.type + (e.by ? ':' + e.by : '')), ticks: n, mission: { att: m.att, done: m.done, note: m.note, next: m.next || null } };
    E.missionApply(m, s);
    rec.afterApply = snap(s);
    out.push(rec);
    last = { kind: a.kind, success: fb.success, team: 'blue' };
  }
  return { out, done: m.done, score: { ...s.score } };
}

function traceMissionA(E) {
  const n = E.mission(ID).durchlaeufe.length, styles = {}, seeds = {};
  for (const [k, f] of Object.entries(STYLES)) styles[k] = Array.from({ length: n }, (_, d) => play(E, d, f));
  for (let seed = 1; seed <= 200; seed++) { const rnd = lcg(seed); seeds[seed] = hash(play(E, seed % n, (E2, s, ctx) => childAction(E2, s, ctx, rnd))); }
  return { styles, seeds };
}
module.exports = { traceMissionA, play, STYLES, hintAction, childAction, ID };

if (require.main === module) {
  // --write <datei>: Referenz erzeugen (nur nach Freigabe).
  // --abweichungen <datei>: Abweichungen gegen die gültige Referenz vorlegen (tests/golden/missionA-abweichungen-<paket>.json);
  //   der Referenztest lässt dann genau diese zu. Ändert keine Referenz.
  const fs = require('node:fs'), E = require('../helpers/load.js');
  const i = process.argv.indexOf('--write'), j = process.argv.indexOf('--abweichungen');
  if (i > 0) { fs.writeFileSync(process.argv[i + 1], JSON.stringify(traceMissionA(E), null, 1)); console.log('geschrieben:', process.argv[i + 1]); }
  else if (j > 0) {
    const REF = require('./referenz.js'), ref = require('./' + REF.missionA.file);
    const now = JSON.parse(JSON.stringify(traceMissionA(E))), out = { grund: process.env.GRUND || 'zur Freigabe vorgelegt', bericht: process.env.BERICHT || '', styles: {}, seeds: {} };
    for (const k of Object.keys(ref.styles)) if (JSON.stringify(ref.styles[k]) !== JSON.stringify(now.styles[k])) out.styles[k] = { alt: hash(ref.styles[k]), neu: hash(now.styles[k]) };
    for (const k of Object.keys(ref.seeds)) if (ref.seeds[k] !== now.seeds[k]) out.seeds[k] = { alt: ref.seeds[k], neu: now.seeds[k] };
    fs.writeFileSync(process.argv[j + 1], JSON.stringify(out, null, 1) + '\n');
    console.log(`Mission A: Spielweisen geändert ${Object.keys(out.styles).length}, Kinder-Abfolgen geändert ${Object.keys(out.seeds).length}/200 → ${process.argv[j + 1]}`);
  } else { console.error('Aufruf: node tests/golden/mission-a.js --write <datei> | --abweichungen <datei>'); process.exit(1); }
}
