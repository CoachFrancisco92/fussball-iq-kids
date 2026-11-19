// Analyse-Hilfe (kein Test) für die Missionsentwürfe „Welches Tor ist frei?“ und „Freie Bahn!“.
// Lädt Texte + Engine aus FIQ_ROOT (Standard: Repo; für 1 gegen N: Wegwerf-Kopie mit M2-Prototyp),
// registriert Situationen als eigene Missionen im Speicher (Simulation von M1) und spielt sie durch.
const path = require('node:path');
const ROOT = process.env.FIQ_ROOT || path.join(__dirname, '..', '..', '..');
require(path.join(ROOT, 'content/texte.js'));
require(path.join(ROOT, 'missions/mission-1.js'));
require(path.join(ROOT, 'engine.js'));
const E = globalThis.FIQ;

function lcg(seed) { let x = seed >>> 0; return () => ((x = (1664525 * x + 1013904223) >>> 0) / 4294967296); }
const r2 = (v) => Math.round(v * 100) / 100;
const MAP = { passen: 'pass', schiessen: 'shoot', dribbeln: 'dribble', freilaufen: 'run', erobern: 'press', raum: 'cover' };

/** Situation als Mission registrieren (Pflichtfelder wie missions/*.js). */
function register(def) {
  const m = Object.assign({ nummer: 90, titel: def.id, lernwelt: 1, lernziele: ['Entwurf'], schauSchritt: [], texte: {} }, def);
  globalThis.FIQ_MISSIONS.push(m);
  return { mission: m, errors: E.validateMission(m) };
}

/** Kinder-Abfolge wie tests/golden/trace.js (childAction). */
function childAction(s, ctx, rnd) {
  const F = E.F, c = E.carrier(s), blues = E.team(s, 'blue');
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const spot = () => ({ x: -5 + rnd() * (F.W + 10), y: -5 + rnd() * (F.H + 10) });
  const k = pick(ctx.actions);
  if (k === 'passen') { if (rnd() < 0.6) return { kind: 'pass', id: pick(blues.filter((b) => b !== c)).id }; return Object.assign({ kind: 'pass' }, spot()); }
  if (k === 'dribbeln') return Object.assign({ kind: 'dribble' }, spot());
  if (k === 'schiessen') return { kind: 'shoot', goal: rnd() < 0.5 ? 0 : 1 };
  if (k === 'freilaufen') return Object.assign({ kind: 'run', id: pick(blues.filter((b) => b !== c)).id }, spot());
  if (k === 'erobern') return { kind: 'press', id: pick(blues).id };
  return Object.assign({ kind: 'cover', id: pick(blues).id }, spot());
}
function hintAction(s, ctx) {
  const k = E.recommend(s, ctx.actions), h = E.hint(s, k);
  const a = { kind: MAP[k] };
  if (h.ids && h.ids.length) a.id = h.ids[0];
  if (h.point) { a.x = r2(h.point.x); a.y = r2(h.point.y); }
  if (h.goal != null) a.goal = h.goal;
  return { a, hint: { k, ziel: h.goal != null ? 'Tor ' + (h.goal === 0 ? 'oben' : 'unten') : h.point ? `(${r2(h.point.x)}|${r2(h.point.y)})` + (h.ids ? ' ' + h.ids.join(',') : '') : h.ids ? h.ids.join(',') : '', say: h.say } };
}
const pos = (s) => s.players.map((p) => `${p.id}(${r2(p.x)}|${r2(p.y)})`).join(' ') + ' Ball:' + (s.ball.owner || '-');

/** Spielt eine Situation bis zum Ende. chooser(s, ctx, i) -> Aktion | {a, hint} | 'hint' */
function play(id, chooser, opt = {}) {
  const s = E.newState(id), m = E.newMission(id);
  let last = null; const steps = []; let hang = false, crash = null;
  try {
    for (let i = 0; !m.done && i < 12; i++) {
      const ctx = E.context(s, last);
      let a = chooser === 'hint' ? hintAction(s, ctx) : chooser(s, ctx, i), hint = null;
      if (a && a.a) { hint = a.hint; a = a.a; }
      const before = opt.verbose ? pos(s) : null;
      E.startAction(s, a);
      let n = 0; while (!s.ep.done && n++ < 3000) E.tick(s);
      if (!s.ep.done) hang = true;
      const fb = E.feedback(s);
      E.missionAfter(m, s, ctx.type);
      steps.push({ ctx: ctx.type + '/' + ctx.actions.join('+'), ctxSay: ctx.say, a, hint, good: fb.good, rec: fb.rec.good, exe: fb.exe.good, say: fb.say,
        events: s.ep.events.map((e) => e.type + (e.by ? ':' + e.by : '')).filter((e) => e !== 'evade'), ticks: n, before, after: opt.verbose ? pos(s) : null });
      E.missionApply(m, s);
      last = { kind: a.kind, success: fb.success, team: 'blue' };
      if (hang) break;
    }
  } catch (e) { crash = e.message; }
  const evs = steps.flatMap((x) => x.events);
  const end = crash ? 'ABSTURZ' : hang ? 'HÄNGT' : evs.includes('goal:undefined') || steps.some((x) => x.events.some((e) => e.startsWith('goal'))) ? 'Tor' : s.poss === 'red' ? 'Ballverlust' : 'Grenze';
  return { steps, end, decisions: steps.length, stars: steps.filter((x) => x.good).length, crash, hang, score: s.score };
}

/** 200 Kinder-Abfolgen. Hinweis: Bei lcg(1…200) liegt der ERSTE Zufallswert immer zwischen 0,236 und 0,314 –
 *  die erste Entscheidung ist damit stets die erste angebotene Aktion. Deshalb zusätzlich „gemischt“:
 *  gleicher Generator, Startwert gestreut (seed · 2654435761). */
function seeds(id, n = 200, gemischt = false) {
  const dist = {}, ends = {}; let crashes = 0, hangs = 0, stars = 0, decs = 0;
  for (let seed = 1; seed <= n; seed++) {
    const rnd = lcg(gemischt ? Math.imul(seed, 2654435761) >>> 0 : seed);
    const r = play(id, (s, ctx) => childAction(s, ctx, rnd));
    dist[r.decisions] = (dist[r.decisions] || 0) + 1; ends[r.end] = (ends[r.end] || 0) + 1;
    if (r.crash) crashes++; if (r.hang) hangs++; stars += r.stars; decs += r.decisions;
  }
  return { entscheidungen: dist, ende: ends, abstuerze: crashes, haenger: hangs, sterneJeEntscheidung: r2(stars / decs) };
}

/** Raster aller Dribbelziele (1 m) in der Startlage: Anteil Stern, Anteil Ballverlust. */
function dribbleGrid(id, filter) {
  const s0 = E.newState(id); const c = E.carrier(s0);
  let n = 0, good = 0, lost = 0, goodLost = 0; const goodPts = [];
  for (let x = 1; x <= 35; x++) for (let y = 1; y <= 23; y++) {
    if (Math.hypot(x - c.x, y - c.y) < 2) continue; // Bedienung: Tipp > 2 m
    if (filter && !filter(x, y, c)) continue;
    const s = E.clone(s0); const ev = E.startAction(s, { kind: 'dribble', x, y });
    let k = 0; while (!s.ep.done && k++ < 3000) E.tick(s);
    const l = s.poss === 'red';
    n++; if (ev.good) { good++; goodPts.push([x, y]); } if (l) lost++; if (ev.good && l) goodLost++;
  }
  return { n, good, anteilStern: r2(good / n), ballverlust: lost, sternTrotzVerlust: goodLost, goodPts };
}

function fmtSteps(r) {
  return r.steps.map((x, i) => `  ${i + 1}. [${x.ctx}] ${JSON.stringify(x.a)}${x.hint ? `  HILFE ${x.hint.k} ${x.hint.ziel} „${x.hint.say}“` : ''}\n     → ${x.events.join(', ')} | E:${x.rec ? '✓' : '✗'} Z:${x.exe ? '✓' : '✗'} ${x.good ? '⭐' : '💭'} „${x.say}“` + (x.after ? `\n     nachher: ${x.after}` : '')).join('\n') + `\n  Ende: ${r.end} (${r.decisions} Entscheidungen, ${r.stars} ⭐)`;
}

module.exports = { E, register, play, seeds, dribbleGrid, fmtSteps, pos, lcg, r2, hintAction };
