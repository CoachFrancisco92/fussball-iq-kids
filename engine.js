/* Fußball-IQ Kids – Simulations-Engine V0.1
 * Deterministische, regelbasierte 3-gegen-3-Simulation (Funino-Spielform, 4 Minitore).
 * Keine Zufallswerte: gleiche Ausgangslage + gleiche Entscheidung = gleiches Ergebnis.
 * Koordinaten in Metern. x nach rechts (Blau greift nach rechts an), y nach unten.
 */
(function (root) {
  'use strict';

  // ---------------------------------------------------------------- Spielfeld
  const F = { W: 36, H: 24, ZONE: 6, GOAL_W: 3 };
  F.goals = {
    blue: [{ x: 0, y: 6 }, { x: 0, y: 18 }],      // Tore, die Blau verteidigt
    red: [{ x: F.W, y: 6 }, { x: F.W, y: 18 }],   // Tore, die Rot verteidigt (Blau schießt hierauf)
  };

  // ---------------------------------------------------------------- Parameter (Einsteiger)
  const CFG = {
    dt: 1 / 60,
    blueRun: 4.4, blueDribble: 3.4, blueCover: 2.8,
    redRun: 3.5, redPress: 3.0, redMark: 2.6, redDribble: 3.2, redSupport: 2.4,
    passSpeed: 9, shotSpeed: 13,
    reach: 0.75, blockReach: 1.0,
    redReact: 0.35, blueReact: 0.3,
    pressStop: 1.4,          // so nah gehen rote Verteidiger ran (Einsteiger: etwas Abstand)
    tackleDist: 0.95,        // Blau dribbelt in den Gegner -> Ballverlust
    blueTackleDist: 1.2, blueTackleTime: 0.45,
    markOff: 3.0,            // Einsteiger: lockere Deckung
    shotLaneOk: 0.15, passLaneOk: 0.2,
  };

  // ---------------------------------------------------------------- Helfer
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const unit = (x, y) => { const l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l }; };
  const clampP = (p) => ({ x: Math.max(0.7, Math.min(F.W - 0.7, p.x)), y: Math.max(0.7, Math.min(F.H - 0.7, p.y)) });
  const P = (s, id) => s.players.find((p) => p.id === id);
  const team = (s, t) => s.players.filter((p) => p.team === t);
  const other = (t) => (t === 'blue' ? 'red' : 'blue');
  const carrier = (s) => (s.ball.owner ? P(s, s.ball.owner) : null);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const runSpeed = (p) => (p.team === 'blue' ? CFG.blueRun : CFG.redRun);
  const segDist = (p, a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2));
    return { d: Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)), t };
  };

  /** Kann ein Verteidiger den Ball auf dem Weg from->to erreichen? (deterministisch)
   *  margin = kleinste Zeitreserve (s) der Verteidiger; <=0 heißt: abgefangen. */
  function lane(from, to, speed, defs, react, reach, startS) {
    const L = dist(from, to);
    if (L < 0.05) return { hit: null, margin: 9 };
    const d = { x: (to.x - from.x) / L, y: (to.y - from.y) / L };
    let hit = null, margin = 9;
    for (const df of defs) {
      const spd = runSpeed(df);
      for (let s = startS == null ? 0.6 : startS; s <= L + 1e-6; s += 0.2) {
        const p = { x: from.x + d.x * s, y: from.y + d.y * s };
        const tb = s / speed;
        const gap = dist(df, p) - reach;
        const td = gap <= 0 ? 0 : react + gap / spd;
        const m = td - tb;
        if (m < margin) margin = m;
        if (m <= 0) { if (!hit || tb < hit.t) hit = { id: df.id, x: p.x, y: p.y, t: tb }; break; }
      }
    }
    return { hit, margin };
  }

  // ---------------------------------------------------------------- Zustand
  function mkPlayer(teamName, num, x, y) {
    return { id: (teamName === 'blue' ? 'b' : 'r') + num, team: teamName, num, x, y, tx: x, ty: y, vx: 0, vy: 0, ctrl: null, delay: 0, tackleT: 0 };
  }

  function newState() {
    return {
      players: [
        mkPlayer('blue', 1, 14, 13), mkPlayer('blue', 2, 24, 6), mkPlayer('blue', 3, 19, 19.5),
        mkPlayer('red', 1, 18.5, 12.5), mkPlayer('red', 2, 28, 13), mkPlayer('red', 3, 18, 16.8),
      ],
      ball: { x: 14.4, y: 13, owner: 'b1', flight: null },
      poss: 'blue',
      score: { blue: 0, red: 0 },
      t: 0,
      ai: { goal: 0, next: 0 },
      ep: null,
    };
  }

  function restart(s, teamName) {
    const set = (id, x, y) => { const p = P(s, id); p.x = p.tx = x; p.y = p.ty = y; p.vx = p.vy = 0; p.ctrl = null; p.delay = 0; };
    if (teamName === 'red') {
      set('r1', 33.5, 12); set('r2', 31, 4); set('r3', 31, 20);
      set('b1', 17, 11); set('b2', 24.5, 8); set('b3', 26.5, 15);
      s.ball.owner = 'r1';
    } else {
      set('b1', 2.5, 12); set('b2', 6, 5); set('b3', 6, 19);
      set('r1', 19, 12); set('r2', 13, 7); set('r3', 13, 17);
      s.ball.owner = 'b1';
    }
    s.ball.flight = null;
    const c = carrier(s); s.ball.x = c.x; s.ball.y = c.y;
    s.poss = teamName;
    if (teamName === 'red') redPlan(s);
  }

  // ---------------------------------------------------------------- Entscheidungskontext
  const ACTIONS = {
    passen: { icon: '⚽', label: 'Passen' },
    dribbeln: { icon: '🏃', label: 'Dribbeln' },
    schiessen: { icon: '🥅', label: 'Schießen' },
    freilaufen: { icon: '👟', label: 'Freilaufen' },
    erobern: { icon: '🛡️', label: 'Ball erobern' },
    raum: { icon: '🧱', label: 'Weg versperren' },
  };

  function context(s, last) {
    const c = carrier(s);
    if (s.poss === 'blue') {
      const inZone = c.x >= F.W - F.ZONE - 0.3;
      if (inZone) return { type: 'abschluss', title: 'Welches Tor ist frei?', tag: 'Torabschluss', actions: ['schiessen', 'passen'], say: 'Jetzt kannst du schießen! Schau genau: Welches Tor ist frei?' };
      if (last && last.kind === 'pass' && last.success && last.team === 'blue')
        return { type: 'ohneBall', title: 'Wo kann ich helfen?', tag: 'Bewegung ohne Ball', actions: ['freilaufen'], say: 'Dein Freund hat den Ball! Wo kannst du hinlaufen, damit du ihm helfen kannst? Tippe auf einen blauen Spieler ohne Ball.' };
      const near = team(s, 'red').some((r) => dist(r, c) < 4.5);
      return near
        ? { type: 'angriff', title: 'Wem spiele ich den Ball zu?', tag: 'Angriff', actions: ['passen', 'dribbeln'], say: 'Ein Gegner kommt! Schau mal, welcher Freund frei steht. Wem spielst du den Ball zu?' }
        : { type: 'angriff', title: 'Was machst du mit dem Ball?', tag: 'Angriff', actions: ['passen', 'dribbeln'], say: 'Du hast den Ball! Schau dich um. Passen oder dribbeln?' };
    }
    const pressed = team(s, 'blue').some((b) => dist(b, c) < 3.5);
    return pressed
      ? { type: 'verteidigung', title: 'Wie schützen wir unser Tor?', tag: 'Verteidigung', actions: ['raum', 'erobern'], say: 'Der Gegner will zu unserem Tor! Wo muss dein Spieler stehen, damit er nicht einfach schießen kann?' }
      : { type: 'verteidigung', title: 'Wer hält den Gegner auf?', tag: 'Verteidigung', actions: ['erobern', 'raum'], say: 'Oh, jetzt greifen die Roten an! Wer kann den Spieler mit dem Ball aufhalten?' };
  }

  // ---------------------------------------------------------------- Bewertung & Hilfen
  function passOptions(s) {
    const c = carrier(s);
    const defs = team(s, other(c.team));
    return team(s, c.team).filter((p) => p !== c).map((p) => {
      const r = lane(c, p, CFG.passSpeed, defs, c.team === 'blue' ? CFG.redReact : CFG.blueReact, CFG.reach);
      return { id: p.id, to: { x: p.x, y: p.y }, margin: r.margin, hit: r.hit };
    });
  }
  function shotOptions(s) {
    const c = carrier(s);
    const goals = c.team === 'blue' ? F.goals.red : F.goals.blue;
    const defs = team(s, other(c.team));
    return goals.map((g, i) => {
      const r = lane(c, g, CFG.shotSpeed, defs, c.team === 'blue' ? CFG.redReact : CFG.blueReact, CFG.blockReach);
      return { goal: i, margin: r.margin, hit: r.hit };
    });
  }
  function dribbleLane(s, c, to) {
    // Gegner, von denen man sich wegbewegt, können nicht tacklen (sie folgen nur).
    const dir = unit(to.x - c.x, to.y - c.y);
    const defs = team(s, 'red').filter((r) => {
      const d = dist(r, c);
      const toward = (dir.x * (r.x - c.x) + dir.y * (r.y - c.y)) / (d || 1);
      return !(d < 3 && toward < 0.25);
    });
    return lane(c, to, CFG.blueDribble, defs, 0.1, CFG.tackleDist, 0.3);
  }
  function openness(s, pt, teamName) {
    return Math.min(...team(s, other(teamName)).map((o) => dist(o, pt)));
  }

  /** Welche der angebotenen Aktionen passt zur Situation? (für die Hilfe) */
  function recommend(s, actions) {
    if (s.poss !== 'blue') return actions[0];
    const sit = situation(s);
    const map = { schiessen: 'shoot', passen: 'pass', dribbeln: 'dribble' };
    for (const k of ['schiessen', 'passen', 'dribbeln']) if (actions.includes(k) && sit.ok[map[k]]) return k;
    return actions[0];
  }

  /** Empfohlene Lösung für die Orientierungshilfe (Tutorial). */
  function hint(s, actionKey) {
    const c = carrier(s);
    if (s.poss === 'red') redPlan(s);
    if (actionKey === 'passen') {
      const o = passOptions(s).sort((a, b) => b.margin - a.margin)[0];
      return { ids: [o.id], say: 'Schau mal auf den Spieler, der leuchtet. Zwischen euch steht kein Gegner.' };
    }
    if (actionKey === 'schiessen') {
      const o = shotOptions(s).sort((a, b) => b.margin - a.margin)[0];
      return { goal: o.goal, say: 'Vor diesem Tor steht kein Gegner im Weg.' };
    }
    if (actionKey === 'dribbeln') {
      let best = null;
      for (let a = -70; a <= 70; a += 10) {
        const r = (a * Math.PI) / 180;
        const pt = clampP({ x: c.x + Math.cos(r) * 5, y: c.y + Math.sin(r) * 5 });
        const m = dribbleLane(s, c, pt).margin + pt.x * 0.02;
        if (!best || m > best.m) best = { m, pt };
      }
      return { point: best.pt, say: 'Dribbel dorthin, wo kein Gegner im Weg ist.' };
    }
    if (actionKey === 'freilaufen') {
      const best = bestRunSpot(s);
      return { ids: [best.id], point: best.pt, say: 'Lauf in den freien Raum, weg vom Gegner. Dann kann dein Freund dich anspielen.' };
    }
    if (actionKey === 'erobern') {
      const b = team(s, 'blue').sort((a, b2) => dist(a, c) - dist(b2, c))[0];
      return { ids: [b.id], say: 'Der Spieler, der am nächsten am Ball ist, greift an.' };
    }
    if (actionKey === 'raum') {
      const g = F.goals.blue[s.ai.goal];
      const pt = { x: g.x + (c.x - g.x) * 0.4, y: g.y + (c.y - g.y) * 0.4 };
      pt.x = Math.max(3, pt.x);
      const b = team(s, 'blue').sort((a, b2) => dist(a, pt) - dist(b2, pt))[0];
      return { ids: [b.id], point: pt, say: 'Stell dich zwischen den Gegner und unser Tor.' };
    }
    return {};
  }

  function runSpotScore(s, c, runner, pt) {
    const open = openness(s, pt, 'blue');
    const l = lane(c, pt, CFG.passSpeed, team(s, 'red'), CFG.redReact, CFG.reach).margin;
    const d = dist(c, pt);
    return { open, l, d, ok: open >= 3.2 && l > CFG.passLaneOk && d >= 3.5 && d <= 15 };
  }
  function bestRunSpot(s) {
    const c = carrier(s);
    let best = null;
    for (const p of team(s, 'blue')) {
      if (p === c) continue;
      for (let x = 2; x < F.W - 1; x += 1.5) for (let y = 2; y < F.H - 1; y += 1.5) {
        const pt = { x, y };
        if (dist(p, pt) > 9) continue;
        const sc = runSpotScore(s, c, p, pt);
        const v = (sc.ok ? 10 : 0) + Math.min(sc.open, 6) + Math.min(sc.l, 1) * 2 + (x - c.x) * 0.4 - dist(p, pt) * 0.05;
        if (!best || v > best.v) best = { v, id: p.id, pt };
      }
    }
    return best;
  }

  /** Was bietet die Situation dem Ballführenden? (Grundlage für "Erkennen") */
  function dribbleBest(s) {
    const c = carrier(s);
    let best = null;
    for (let a = -80; a <= 80; a += 10) {
      const r = (a * Math.PI) / 180;
      const pt = clampP({ x: c.x + Math.cos(r) * 5, y: c.y + Math.sin(r) * 5 });
      const m = dribbleLane(s, c, pt).margin;
      if (!best || m > best.m) best = { m, pt };
    }
    return best;
  }
  function situation(s) {
    const c = carrier(s);
    const passes = passOptions(s);
    const pBest = Math.max(...passes.map((o) => o.margin));
    const inZone = c.x >= F.W - F.ZONE - 0.3;
    const shots = inZone ? shotOptions(s) : [];
    const sBest = shots.length ? Math.max(...shots.map((o) => o.margin)) : -9;
    const dBest = dribbleBest(s).m;
    return { passes, pBest, shots, sBest, dBest, inZone,
      ok: { pass: pBest > CFG.passLaneOk, shoot: sBest > CFG.shotLaneOk, dribble: dBest > 0.2 } };
  }
  const nameOf = (s, id) => { const p = P(s, id); return (p.team === 'blue' ? 'Blau ' : 'Rot ') + p.num; };
  /** Gegner, der einem Weg am nächsten steht (für Erklärungen) */
  function laneKey(s, from, to, teamName) {
    let best = null;
    for (const o of team(s, teamName)) { const d = segDist(o, from, to).d; if (!best || d < best.d) best = { id: o.id, d }; }
    return best ? best.id : null;
  }

  /** Bewertung in drei Teilen (Review V0.1, Punkt 2):
   *  erkennen  – war die Art der Entscheidung sinnvoll? (Passen / Dribbeln / Schießen …)
   *  ausfuehren – war das gewählte Ziel sinnvoll? (welcher Mitspieler, welches Tor, welcher Raum)
   *  Das Ergebnis (Tor, Ballverlust …) wird getrennt davon in outcome() ermittelt.
   *  Stern nur, wenn erkennen UND ausfuehren gut sind. */
  function evaluate(s, a) {
    const c = carrier(s);
    const R = (good, why) => ({ good, why });
    let rec = R(true, ''), exe = R(true, '');
    if (a.kind === 'pass' || a.kind === 'shoot' || a.kind === 'dribble') {
      const sit = situation(s);
      const anyOk = sit.ok.pass || sit.ok.shoot || sit.ok.dribble;
      if (sit.ok[a.kind]) rec = R(true, a.kind === 'shoot' ? 'Du hast die Torchance erkannt.' : a.kind === 'pass' ? 'Du hast gesehen, dass ein Freund frei war.' : 'Du hast den freien Platz gesehen.');
      else if (!anyOk) rec = R(true, 'Eine schwierige Lage – nirgends war es richtig frei.');
      else if (sit.ok.shoot) rec = R(false, 'Ein Tor war frei – Schießen wäre gut gewesen.');
      else if (sit.ok.pass) rec = R(false, a.kind === 'shoot' ? 'Beide Tore waren zugestellt. Ein Pass zu einem freien Freund wäre besser gewesen.' : 'Ein Freund stand frei – ein Pass wäre besser gewesen.');
      else rec = R(false, a.kind === 'shoot' ? 'Beide Tore waren zugestellt. Vor dir war aber Platz zum Dribbeln.' : 'Vor dir war Platz zum Dribbeln.');

      if (a.kind === 'pass') {
        const m = a.id ? sit.passes.find((o) => o.id === a.id).margin : lane(c, a, CFG.passSpeed, team(s, 'red'), CFG.redReact, CFG.reach).margin;
        const target = a.id ? nameOf(s, a.id) : 'die freie Stelle';
        if (m > CFG.passLaneOk) exe = R(true, `Der Weg zu ${target} war frei.`);
        else if (!sit.ok.pass && m >= sit.pBest - 0.05) exe = R(true, 'Das war noch der beste Passweg.');
        else { const o = a.id ? sit.passes.find((x) => x.id === a.id) : null; const k = (o && o.hit && o.hit.id) || laneKey(s, c, a.id ? P(s, a.id) : a, 'red'); exe = R(false, `${k ? nameOf(s, k) : 'Ein Gegner'} stand nah am Weg zu ${target}.` + (sit.ok.pass ? ' Ein anderer Freund stand freier.' : '')); }
      } else if (a.kind === 'shoot') {
        const m = sit.shots[a.goal].margin;
        if (m > CFG.shotLaneOk) exe = R(true, 'Du hast das freie Tor gewählt.');
        else { const h = sit.shots[a.goal].hit; const k = (h && h.id) || laneKey(s, c, F.goals.red[a.goal], 'red'); exe = R(false, `Vor diesem Tor stand ${k ? nameOf(s, k) : 'ein Gegner'}.` + (sit.shots[1 - a.goal].margin > CFG.shotLaneOk ? ' Das andere Tor war frei.' : '')); }
      } else {
        const m = dribbleLane(s, c, a).margin;
        exe = m > 0.2 ? R(true, 'Du bist in den freien Raum gedribbelt.') : R(false, 'Du bist direkt auf einen Gegner zugelaufen.');
      }
    } else if (a.kind === 'run') {
      const sc = runSpotScore(s, c, P(s, a.id), a);
      rec = R(true, 'Du hast deinem Freund geholfen, statt stehen zu bleiben.');
      exe = sc.ok ? R(true, 'Du bist in einen freien Raum gelaufen.') : R(false, sc.open < 3.2 ? 'Dort stand schon ein Gegner.' : sc.d < 3.5 ? 'Das war zu nah am Ball – dein Freund braucht Platz.' : 'Von dort war der Passweg versperrt.');
    } else if (a.kind === 'press') {
      const blues = team(s, 'blue').sort((x, y) => dist(x, c) - dist(y, c));
      rec = dist(blues[0], c) < 8 ? R(true, 'Angreifen war richtig – ein Spieler war nah genug.') : R(false, 'Der Gegner war weit weg. Besser erst den Weg zum Tor versperren.');
      const okP = a.id === blues[0].id || dist(P(s, a.id), c) - dist(blues[0], c) < 1;
      exe = okP ? R(true, 'Der Spieler am nächsten am Ball greift an.') : R(false, `Der Weg war weit. ${nameOf(s, blues[0].id)} war näher am Ball.`);
    } else if (a.kind === 'cover') {
      const g = F.goals.blue[s.ai.goal];
      const sd = segDist(a, c, g);
      rec = R(true, 'Du hast an unser Tor gedacht.');
      exe = sd.d < 2.2 && sd.t > 0.15 && sd.t < 0.92 ? R(true, 'Du stehst zwischen Gegner und Tor.') : R(false, 'Der Weg zum Tor blieb offen.');
    }
    const good = rec.good && exe.good;
    return { good, rec, exe, why: !rec.good ? rec.why : exe.why };
  }

  // ---------------------------------------------------------------- Aktionen starten
  function launchFlight(s, from, to, kind, teamName, targetId, result) {
    const L = dist(from, to);
    const speed = kind === 'shot' ? CFG.shotSpeed : CFG.passSpeed;
    s.ball.owner = null;
    s.ball.flight = { fx: from.x, fy: from.y, tx: to.x, ty: to.y, t: 0, dur: Math.max(0.15, L / speed), kind, team: teamName, target: targetId, result };
  }

  function doPass(s, c, a, isAI) {
    const defs = team(s, other(c.team));
    const react = c.team === 'blue' ? CFG.redReact : CFG.blueReact;
    let to, recv;
    if (a.id) { recv = P(s, a.id); to = { x: recv.x, y: recv.y }; recv.ctrl = 'wait'; recv.tx = recv.x; recv.ty = recv.y; }
    else {
      to = clampP(a);
      recv = team(s, c.team).filter((p) => p !== c).sort((x, y) => dist(x, to) - dist(y, to))[0];
      recv.ctrl = 'run'; recv.tx = to.x; recv.ty = to.y; recv.delay = 0.15;
    }
    const r = lane(c, to, CFG.passSpeed, defs, react, CFG.reach);
    let hit = r.hit;
    if (!hit && !a.id) { // Pass in den Raum: Wer ist zuerst am Ball?
      const tArr = Math.max(dist(c, to) / CFG.passSpeed, 0.15 + dist(recv, to) / runSpeed(recv));
      for (const d of defs) {
        const td = react + Math.max(0, dist(d, to) - CFG.reach) / runSpeed(d);
        if (td < tArr - 0.05) { hit = { id: d.id, x: to.x, y: to.y, t: tArr }; break; }
      }
    }
    if (hit) {
      const icp = P(s, hit.id);
      icp.ctrl = 'intercept'; icp.tx = hit.x; icp.ty = hit.y; icp.delay = Math.min(react, 0.25);
      launchFlight(s, c, hit, 'pass', c.team, hit.id, 'intercept');
      if (!a.id) { /* Ball kommt am Zielpunkt an */ s.ball.flight.dur = Math.max(s.ball.flight.dur, hit.t || 0); }
    } else {
      launchFlight(s, c, to, 'pass', c.team, recv.id, 'ok');
      if (!a.id) s.ball.flight.dur = Math.max(s.ball.flight.dur, 0.15 + dist(recv, to) / runSpeed(recv));
    }
    s.ball.flight.from = c.id;
    s.ball.flight.recv = recv.id;
    if (isAI) event(s, c.team === 'red' ? 'redPass' : 'pass');
    else if (s.ep && !s.ep.explain) s.ep.explain = { from: { x: c.x, y: c.y }, to: { x: to.x, y: to.y }, ok: !hit, key: hit ? hit.id : null };
  }

  function doShot(s, c, goalIdx) {
    const goals = c.team === 'blue' ? F.goals.red : F.goals.blue;
    const g = goals[goalIdx];
    const defs = team(s, other(c.team));
    const r = lane(c, g, CFG.shotSpeed, defs, c.team === 'blue' ? CFG.redReact : CFG.blueReact, CFG.blockReach);
    if (r.hit) {
      const b = P(s, r.hit.id);
      b.ctrl = 'intercept'; b.tx = r.hit.x; b.ty = r.hit.y; b.delay = 0.1;
      launchFlight(s, c, r.hit, 'shot', c.team, r.hit.id, 'blocked');
    } else {
      launchFlight(s, c, { x: g.x + (c.team === 'blue' ? 0.6 : -0.6), y: g.y }, 'shot', c.team, null, 'goal');
    }
    s.ball.flight.from = c.id;
    s.ball.flight.goal = goalIdx;
    if (c.team === 'blue' && s.ep && !s.ep.explain) s.ep.explain = { from: { x: c.x, y: c.y }, to: { x: g.x, y: g.y }, ok: !r.hit, key: r.hit ? r.hit.id : null };
  }

  function startAction(s, a) {
    const c = carrier(s);
    if (s.poss === 'red') redPlan(s);
    const ev = evaluate(s, a);
    s.players.forEach((p) => { p.ctrl = null; p.tackleT = 0; p.tx = p.x; p.ty = p.y; });
    s.ep = { a, t: 0, endT: null, events: [], frames: [], startPoss: s.poss, eval: ev, phase: 'main', restart: null };
    switch (a.kind) {
      case 'pass': doPass(s, c, a, false); break;
      case 'shoot': doShot(s, c, a.goal); break;
      case 'dribble': {
        let to = clampP(a);
        const d = dist(c, to);
        if (d > 8) to = { x: c.x + ((to.x - c.x) / d) * 8, y: c.y + ((to.y - c.y) / d) * 8 };
        c.ctrl = 'dribble'; c.tx = to.x; c.ty = to.y;
        s.ep.explain = { from: { x: c.x, y: c.y }, to: { x: to.x, y: to.y }, ok: true, key: ev.exe.good ? null : laneKey(s, c, to, 'red') };
        break;
      }
      case 'run': {
        const p = P(s, a.id); p.ctrl = 'run'; const t = clampP(a); p.tx = t.x; p.ty = t.y;
        s.ep.explain = { from: { x: p.x, y: p.y }, to: t, ok: ev.good, key: ev.good ? null : laneKey(s, c, t, 'red'), pass: { from: { x: c.x, y: c.y }, to: t } };
        break;
      }
      case 'press': {
        const p = P(s, a.id); p.ctrl = 'press';
        s.ep.explain = { from: { x: p.x, y: p.y }, to: { x: c.x, y: c.y }, ok: ev.good, key: ev.good ? null : team(s, 'blue').sort((x, y) => dist(x, c) - dist(y, c))[0].id, keyGood: !ev.good };
        break;
      }
      case 'cover': {
        const p = P(s, a.id); p.ctrl = 'run'; const t = clampP(a); p.tx = t.x; p.ty = t.y;
        const g = F.goals.blue[s.ai.goal];
        s.ep.explain = { from: { x: p.x, y: p.y }, to: t, ok: ev.good, key: c.id, threat: { from: { x: c.x, y: c.y }, to: { x: g.x, y: g.y } } };
        break;
      }
    }
    return ev;
  }

  function event(s, type, extra) {
    if (s.ep) s.ep.events.push(Object.assign({ type, t: s.ep.t }, extra || {}));
  }

  // ---------------------------------------------------------------- Rote Angriffs-KI
  function redPlan(s) {
    const c = carrier(s);
    if (!c || c.team !== 'red') return;
    const m = F.goals.blue.map((g) => lane(c, g, CFG.shotSpeed, team(s, 'blue'), CFG.blueReact, CFG.blockReach).margin);
    s.ai.goal = m[0] >= m[1] ? 0 : 1;
    s.ai.next = 0;
  }

  function redCarrierAI(s, c) {
    if (s.t < s.ai.next) return;
    s.ai.next = s.t + 0.2;
    const blues = team(s, 'blue');
    const nb = blues.reduce((a, b) => (dist(b, c) < dist(a, c) ? b : a));
    const pressured = dist(nb, c) < 2.2;
    const lanes = F.goals.blue.map((g) => lane(c, g, CFG.shotSpeed, blues, CFG.blueReact, CFG.blockReach).margin);
    // 1) Im Schussbereich und Weg frei -> Schuss
    if (c.x <= F.ZONE + 0.2) {
      const gi = lanes[0] >= lanes[1] ? 0 : 1;
      if (lanes[gi] > CFG.shotLaneOk) { event(s, 'redShot'); doShot(s, c, gi); return; }
    }
    const passes = () => passOptions(s).filter((o) => o.margin > CFG.passLaneOk && P(s, o.id).x < c.x + 3).sort((a, b) => b.margin - a.margin)[0];
    // 2) Unter Druck -> abspielen oder ausweichen
    if (pressured) {
      const o = passes();
      if (o) { doPass(s, c, { id: o.id }, true); return; }
      const away = unit(c.x - nb.x, c.y - nb.y);
      const t = clampP({ x: c.x + away.x * 3 - 1, y: c.y + away.y * 3 });
      c.tx = t.x; c.ty = t.y;
      if (s.ai.mode !== 'evade') { s.ai.mode = 'evade'; event(s, 'evade'); }
      return;
    }
    s.ai.mode = 'attack';
    // 3) Kurz vor dem Schussbereich: Weg zum Ziel-Tor versperrt?
    if (c.x < 12 && lanes[s.ai.goal] < CFG.shotLaneOk) {
      const og = 1 - s.ai.goal;
      if (lanes[og] > 0.4) { s.ai.goal = og; event(s, 'turn', { why: 'switch' }); }
      else {
        const o = passes();
        if (o) { doPass(s, c, { id: o.id }, true); return; }
        c.tx = Math.min(F.W - 1, c.x + 4); c.ty = c.y; event(s, 'turn', { why: 'back' }); return;
      }
    }
    // 4) Richtung Tor dribbeln
    const g = F.goals.blue[s.ai.goal];
    c.tx = F.ZONE - 1; c.ty = g.y;
  }

  // ---------------------------------------------------------------- Teamverhalten
  function updateAI(s) {
    const c = carrier(s);
    const fl = s.ball.flight;
    const ballPt = c ? c : fl ? { x: fl.tx, y: fl.ty } : s.ball;
    if (s.poss === 'blue') {
      for (const b of team(s, 'blue')) b.role = null;
      const reds = team(s, 'red').filter((p) => !p.ctrl);
      if (!reds.length) return;
      const presser = reds.slice().sort((a, b) => dist(a, ballPt) - dist(b, ballPt))[0];
      const u = unit(presser.x - ballPt.x, presser.y - ballPt.y);
      if (dist(presser, ballPt) > CFG.pressStop) { presser.tx = ballPt.x + u.x * CFG.pressStop; presser.ty = ballPt.y + u.y * CFG.pressStop; }
      else { presser.tx = presser.x; presser.ty = presser.y; } // nicht zurückweichen
      presser.role = 'press';
      let rest = reds.filter((r) => r !== presser);
      if (ballPt.x >= 25 && rest.length) {
        const guard = rest.slice().sort((a, b) => (F.W - a.x) - (F.W - b.x))[0];
        const gi = dist(guard, F.goals.red[0]) < dist(guard, F.goals.red[1]) ? 0 : 1;
        const g = F.goals.red[gi];
        const v = unit(ballPt.x - g.x, ballPt.y - g.y);
        guard.tx = g.x + v.x * 2.4; guard.ty = g.y + v.y * 2.4; guard.role = 'guard';
        rest = rest.filter((r) => r !== guard);
      }
      const attackers = team(s, 'blue').filter((b) => b !== c && !(fl && fl.recv === b.id && fl.result === 'ok'));
      for (const r of rest) {
        if (!attackers.length) break;
        const b = attackers.slice().sort((a, b2) => dist(a, r) - dist(b2, r))[0];
        const g = dist(b, F.goals.red[0]) < dist(b, F.goals.red[1]) ? F.goals.red[0] : F.goals.red[1];
        const v = unit(g.x - b.x, g.y - b.y);
        r.tx = b.x + v.x * CFG.markOff; r.ty = b.y + v.y * CFG.markOff; r.role = 'mark';
      }
    } else if (s.poss === 'red') {
      if (c && c.team === 'red' && !c.ctrl) redCarrierAI(s, c);
      for (const r of team(s, 'red')) {
        if (r === c || r.ctrl) continue;
        if (fl && fl.recv === r.id) continue;
        r.tx = Math.max(7, ballPt.x - 5); r.ty = r.y; r.role = 'support';
      }
      // Blaue ohne Auftrag sichern ab: torseitig zum nächsten freien Gegner (nicht zum Ball).
      const free = team(s, 'red').filter((r) => r !== c && !(fl && fl.recv === r.id && fl.result === 'ok'));
      const taken = new Set();
      for (const b of team(s, 'blue')) {
        if (b.ctrl) { b.role = null; continue; }
        const cand = free.filter((r) => !taken.has(r.id)).sort((x, y) => dist(x, b) - dist(y, b))[0];
        if (!cand) { b.role = null; b.tx = b.x; b.ty = b.y; continue; }
        taken.add(cand.id);
        const g = dist(cand, F.goals.blue[0]) < dist(cand, F.goals.blue[1]) ? F.goals.blue[0] : F.goals.blue[1];
        const v = unit(g.x - cand.x, g.y - cand.y);
        const t = clampP({ x: cand.x + v.x * 2.4, y: cand.y + v.y * 2.4 });
        b.tx = t.x; b.ty = t.y; b.role = 'cover';
      }
    }
  }

  function speedOf(s, p) {
    const owner = s.ball.owner === p.id;
    if (p.team === 'blue') return owner ? CFG.blueDribble : p.role === 'cover' && !p.ctrl ? CFG.blueCover : CFG.blueRun;
    if (owner) return CFG.redDribble;
    if (p.ctrl === 'intercept') return CFG.redRun;
    if (p.role === 'press' || p.role === 'guard') return CFG.redPress;
    if (p.role === 'support') return CFG.redSupport;
    return CFG.redMark;
  }

  // ---------------------------------------------------------------- Ein Simulationsschritt
  function tick(s) {
    const dt = CFG.dt;
    const ep = s.ep;
    s.t += dt; ep.t += dt;

    // Blaues Pressing: Zielpunkt folgt dem Ballführenden
    for (const p of s.players) if (p.ctrl === 'press') {
      const c = carrier(s);
      if (c && c.team !== p.team) { const u = unit(p.x - c.x, p.y - c.y); p.tx = c.x + u.x * 0.9; p.ty = c.y + u.y * 0.9; }
      else { p.tx = p.x; p.ty = p.y; }
    }
    updateAI(s);

    for (const p of s.players) {
      if (p.delay > 0) { p.delay -= dt; p.vx = p.vy = 0; continue; }
      const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
      const sp = speedOf(s, p);
      if (d < 0.03) { p.vx = p.vy = 0; continue; }
      const step = Math.min(d, sp * dt);
      p.vx = (dx / d) * sp; p.vy = (dy / d) * sp;
      p.x += (dx / d) * step; p.y += (dy / d) * step;
      const q = clampP(p); p.x = q.x; p.y = q.y;
    }

    // Ball
    const fl = s.ball.flight;
    if (fl) {
      fl.t += dt;
      const k = Math.min(1, fl.t / fl.dur);
      s.ball.x = fl.fx + (fl.tx - fl.fx) * k; s.ball.y = fl.fy + (fl.ty - fl.fy) * k;
      if (fl.t >= fl.dur) resolveFlight(s, fl);
    } else if (s.ball.owner) {
      const c = carrier(s);
      const v = Math.hypot(c.vx, c.vy);
      const dir = v > 0.1 ? unit(c.vx, c.vy) : { x: c.team === 'blue' ? 1 : -1, y: 0 };
      s.ball.x = c.x + dir.x * 1.05; s.ball.y = c.y + dir.y * 1.05;
    }

    checkTackles(s, dt);
    episodeLogic(s);
  }

  function resolveFlight(s, fl) {
    s.ball.flight = null;
    if (fl.result === 'goal') {
      s.score[fl.team]++;
      s.ball.x = fl.tx; s.ball.y = fl.ty;
      event(s, 'goal', { team: fl.team, goal: fl.goal });
      s.ep.restart = other(fl.team);
      s.ep.endT = s.ep.t + 1.6;
      s.poss = null;
      return;
    }
    const owner = P(s, fl.target);
    s.ball.owner = owner.id;
    owner.ctrl = null; owner.tx = owner.x; owner.ty = owner.y;
    const prev = s.poss;
    s.poss = owner.team;
    if (fl.kind === 'shot') event(s, 'blocked', { by: owner.id, team: fl.team });
    else if (owner.team === fl.team) event(s, 'received', { by: owner.id, team: fl.team });
    else event(s, 'intercepted', { by: owner.id, team: fl.team });
    if (prev !== s.poss && s.poss === 'red') redPlan(s);
  }

  function checkTackles(s, dt) {
    const c = carrier(s);
    if (!c || s.ball.flight) return;
    for (const d of team(s, other(c.team))) {
      const dd = dist(d, c);
      if (c.team === 'blue') {
        const v = Math.hypot(c.vx, c.vy);
        const toward = v > 0.3 ? (c.vx * (d.x - c.x) + c.vy * (d.y - c.y)) / (v * (dd || 1)) : -1;
        if (dd < 0.7 || (dd < CFG.tackleDist && toward > 0.25)) return steal(s, c, d);
      } else if (d.ctrl === 'press') {
        if (dd < CFG.blueTackleDist) { d.tackleT += dt; if (d.tackleT > CFG.blueTackleTime) return steal(s, c, d); }
      }
    }
  }
  function steal(s, c, d) {
    s.ball.owner = d.id; s.poss = d.team;
    c.ctrl = null; c.tx = c.x; c.ty = c.y;
    d.ctrl = null; d.tx = d.x; d.ty = d.y;
    // Ballverlierer wird kurz "abgeschüttelt"
    const u = unit(c.x - d.x, c.y - d.y); c.tx = c.x + u.x * 1.2; c.ty = c.y + u.y * 1.2;
    event(s, 'steal', { by: d.id, from: c.id });
    if (s.ep && s.ep.a.kind === 'dribble' && s.ep.explain && c.team === 'blue') { s.ep.explain.ok = false; s.ep.explain.key = d.id; }
    if (d.team === 'red') redPlan(s);
  }

  function autoDribble(s) {
    const c = carrier(s);
    if (!c || c.team !== 'blue') return false;
    let best = null;
    for (let y = 2; y <= F.H - 2; y += 1) {
      const pt = { x: F.W - F.ZONE + 1.5, y };
      const m = dribbleLane(s, c, pt).margin - Math.abs(y - c.y) * 0.02;
      if (!best || m > best.m) best = { m, pt };
    }
    if (!best || best.m < 0) return false;
    c.ctrl = 'dribble'; c.tx = best.pt.x; c.ty = best.pt.y;
    return true;
  }

  function episodeLogic(s) {
    const ep = s.ep, a = ep.a;
    if (ep.endT != null) {
      if (s.ball.flight) { ep.endT = Math.max(ep.endT, ep.t + 0.4); return; }
      if (ep.t >= ep.endT) {
        if (ep.restart) { restart(s, ep.restart); ep.restart = null; }
        ep.done = true;
      }
      return;
    }
    const evs = ep.events;
    const has = (t) => evs.some((e) => e.type === t);
    const possChanged = s.poss && s.poss !== ep.startPoss;
    const c = carrier(s);

    if (a.kind === 'pass' || a.kind === 'shoot') {
      if (has('received') || has('intercepted') || has('blocked')) ep.endT = ep.t + 0.6;
    } else if (a.kind === 'dribble') {
      if (has('steal')) ep.endT = ep.t + 0.6;
      else if (c && c.ctrl !== 'dribble') ep.endT = ep.t + 0.2;
      else if (c && dist(c, { x: c.tx, y: c.ty }) < 0.05) { c.ctrl = null; ep.endT = ep.t + 0.3; }
    } else if (a.kind === 'run') {
      const r = P(s, a.id);
      if (possChanged) ep.endT = ep.t + 0.6;
      else if (ep.phase === 'main' && dist(r, { x: r.tx, y: r.ty }) < 0.05) {
        r.ctrl = null;
        ep.phase = autoDribble(s) ? 'auto' : 'hold';
        ep.autoT = ep.t;
        if (ep.phase === 'hold') ep.endT = ep.t + 0.4;
        else event(s, 'autoDribble');
      } else if (ep.phase === 'auto' && c) {
        if (c.x >= F.W - F.ZONE + 0.8 || ep.t - ep.autoT > 2.6 || dist(c, { x: c.tx, y: c.ty }) < 0.05) { c.ctrl = null; c.tx = c.x; c.ty = c.y; ep.endT = ep.t + 0.3; }
      }
      if (ep.t > 8 && ep.endT == null) ep.endT = ep.t;
    } else { // press / cover
      if (possChanged || has('turn')) ep.endT = ep.t + 0.7;
      else if (a.kind === 'cover' && has('evade') && ep.t > 1) ep.endT = ep.t + 0.6;
      else if (evs.some((e) => e.type === 'received' && e.team === 'red') || has('blocked')) ep.endT = ep.t + 0.4;
      else if (ep.t > 7) ep.endT = ep.t;
    }
  }

  // ---------------------------------------------------------------- Ergebnis-Text
  function outcome(s) {
    const ep = s.ep, a = ep.a, evs = ep.events;
    const find = (t) => evs.find((e) => e.type === t);
    const goal = find('goal');
    let success = false, text = '', icon = '';
    if (a.kind === 'pass') {
      const ic = find('intercepted');
      if (ic) { text = `Schau mal! ${nameOf(s, ic.by)} stand im Weg und hat den Ball bekommen.`; icon = '😮'; }
      else { success = true; text = 'Der Pass ist angekommen!'; icon = '👍'; }
    } else if (a.kind === 'shoot') {
      if (goal) { success = true; text = 'Toooor! Der Weg war frei.'; icon = '🎉'; }
      else { const bl = find('blocked'); text = `Geblockt! ${bl ? nameOf(s, bl.by) : 'Ein Gegner'} stand vor dem Tor.`; icon = '🧤'; }
    } else if (a.kind === 'dribble') {
      const st = find('steal');
      if (st) { text = `${nameOf(s, st.by)} stand im Weg und hat dir den Ball abgenommen.`; icon = '😮'; }
      else { success = true; text = 'Gut gedribbelt – du hast den Ball behalten!'; icon = '👍'; }
    } else if (a.kind === 'run') {
      if (find('steal')) { text = 'Oh, der Gegner hat den Ball erobert.'; icon = '😮'; }
      else if (ep.eval.good) { success = true; text = find('autoDribble') ? 'Super! Du bist frei – und dein Freund nutzt den Platz und dribbelt nach vorne.' : 'Super! Jetzt bist du anspielbar.'; icon = '🙌'; }
      else { text = 'Dort ist es schwer, angespielt zu werden.'; icon = '🤔'; }
    } else if (a.kind === 'press' || a.kind === 'cover') {
      if (goal && goal.team === 'red') { text = 'Oh nein, die Roten haben ein Tor geschossen. Der Weg zum Tor war offen.'; icon = '😬'; }
      else if (find('steal') && s.poss === 'blue') { success = true; text = 'Ball erobert! Jetzt greifen wir an.'; icon = '💪'; }
      else if (find('blocked')) { success = true; text = 'Geblockt! Du hast im Weg gestanden.'; icon = '🧱'; }
      else if (find('intercepted') && s.poss === 'blue') { success = true; text = 'Abgefangen! Der Ball gehört uns.'; icon = '💪'; }
      else if (find('turn') || (a.kind === 'cover' && find('evade') && ep.eval.good)) { success = true; text = 'Klasse! Der Gegner kommt nicht vorbei und muss die Richtung ändern.'; icon = '🛡️'; }
      else if (a.kind === 'press' && (find('redPass') || find('evade'))) { success = true; text = 'Du hast Druck gemacht! Der Gegner musste ausweichen oder abspielen.'; icon = '💨'; }
      else if (a.kind === 'cover' && find('redPass') && ep.eval.good) { success = true; text = 'Der Gegner kam nicht durch und musste quer spielen.'; icon = '🛡️'; }
      else if (a.kind === 'cover' && find('redPass')) { success = true; text = 'Der Gegner hat abgespielt.'; icon = '👀'; }
      else { text = 'Der Gegner läuft weiter Richtung Tor.'; icon = '🤔'; }
    }
    return { success, text, icon, goal: goal ? goal.team : null };
  }

  function feedback(s) {
    const ev = s.ep.eval, out = outcome(s);
    let say;
    if (ev.good && out.success) say = out.text + ' ' + ev.why;
    else if (ev.good && !out.success) say = out.text + ' Aber deine Idee war gut! ' + ev.why;
    else if (!ev.good && out.success) say = out.text + ' Hat geklappt – aber schau nochmal: ' + ev.why;
    else say = out.text + ' ' + ev.why;
    return { good: ev.good, success: out.success, icon: out.icon, text: out.text, why: ev.why, rec: ev.rec, exe: ev.exe, say, goal: out.goal, explain: s.ep.explain || null };
  }

  // ---------------------------------------------------------------- Aufnahme für Wiederholung / Vergleich
  function frame(s) {
    const f = [];
    for (const p of s.players) f.push(+p.x.toFixed(2), +p.y.toFixed(2));
    f.push(+s.ball.x.toFixed(2), +s.ball.y.toFixed(2), s.ball.owner ? s.players.findIndex((p) => p.id === s.ball.owner) : -1);
    return f;
  }

  // ---------------------------------------------------------------- Lernmission (Review V0.1, Punkt 4)
  // Angriffsphase: endet bei Ballverlust/Tor, spätestens nach maxAttack Entscheidungen (dann Ball im Aus -> Rot).
  // Verteidigungsphase: defense Entscheidungen, endet früher bei Balleroberung oder Gegentor.
  // So enthält jede Mission sicher Angriff UND Verteidigung, ohne frühere Entscheidungen zu verändern.
  function newMission() { return { phase: 'attack', att: 0, def: 0, maxAttack: 4, defense: 2, done: false, note: null }; }
  function missionAfter(m, s, ctxType) {
    m.note = null;
    if (ctxType === 'verteidigung') m.def++; else m.att++;
    if (m.phase === 'attack') {
      if (s.poss === 'red') m.phase = 'defense';
      else if (m.att >= m.maxAttack) { m.pending = 'red'; m.phase = 'defense'; m.note = 'aus'; }
    } else if (m.def >= m.defense || s.poss === 'blue') m.done = true;
    return m;
  }
  /** Ausstehenden Neustart (Ball im Aus) ausführen – erst wenn das Kind weiterspielt. */
  function missionApply(m, s) { if (m.pending) { restart(s, m.pending); m.pending = null; } }

  root.FIQ = {
    VERSION: '0.2.1', F, CFG, ACTIONS, newState, context, startAction, tick, feedback, hint, frame, clone, carrier, P, team, dist, evaluate, passOptions, shotOptions, newMission, missionAfter, missionApply, nameOf, laneKey, recommend, situation };
})(typeof window !== 'undefined' ? window : globalThis);
