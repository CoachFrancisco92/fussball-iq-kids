/* Fußball-IQ Kids – Simulations-Engine
 * Deterministische, regelbasierte 3-gegen-3-Simulation (Funino-Spielform, 4 Minitore).
 * Keine Zufallswerte: gleiche Ausgangslage + gleiche Entscheidung = gleiches Ergebnis.
 * Koordinaten in Metern. x nach rechts (Blau greift nach rechts an), y nach unten.
 *
 * Die Engine enthält keine Missionsinhalte und keine Sätze:
 *   - Aufstellungen, Phasen, Ziele:  missions/*.js   (Registrierung in root.FIQ_MISSIONS)
 *   - Pädagogische Texte:            content/texte.js (root.FIQ_TEXTE, je Mission überschreibbar)
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

  // ---------------------------------------------------------------- Missionen & Texte
  const missionList = () => root.FIQ_MISSIONS || [];
  /** Mission nach id; ohne id die erste registrierte Mission. */
  function mission(id) {
    const list = missionList();
    const m = id == null ? list[0] : list.find((x) => x.id === id);
    if (!m) throw new Error('Mission nicht gefunden: ' + (id == null ? '(keine Mission registriert)' : id));
    return m;
  }
  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v) && typeof v !== 'function';
  function merge(base, over) {
    if (!isObj(over)) return base;
    const out = Object.assign({}, base);
    for (const k of Object.keys(over)) out[k] = isObj(base && base[k]) && isObj(over[k]) ? merge(base[k], over[k]) : over[k];
    return out;
  }
  const textCache = {};
  /** Textkatalog für einen Zustand (bzw. eine Mission): content/texte.js + Überschreibungen der Mission. */
  function texts(sOrId) {
    if (!root.FIQ_TEXTE) throw new Error('Textkatalog fehlt (content/texte.js nicht geladen)');
    const id = sOrId && typeof sOrId === 'object' ? sOrId.missionId : sOrId;
    const m = mission(id);
    if (!textCache[m.id] || textCache[m.id].base !== root.FIQ_TEXTE) textCache[m.id] = { base: root.FIQ_TEXTE, t: merge(root.FIQ_TEXTE, m.texte) };
    return textCache[m.id].t;
  }

  /** Prüft eine Missionsdatei auf Vollständigkeit und Plausibilität. Gibt eine Liste von Fehlern zurück. */
  function validateMission(m) {
    const err = [];
    const need = (cond, msg) => { if (!cond) err.push(msg); };
    need(m && typeof m.id === 'string' && m.id, 'id fehlt');
    need(typeof m.titel === 'string' && m.titel, 'titel fehlt');
    need(Array.isArray(m.lernziele) && m.lernziele.length >= 1, 'lernziele fehlen');
    const lineup = (L, where) => {
      need(L && Array.isArray(L.spieler), `${where}: spieler fehlen`);
      if (!L || !Array.isArray(L.spieler)) return;
      const ids = L.spieler.map((p) => p.id);
      need(new Set(ids).size === ids.length, `${where}: Spieler doppelt`);
      for (const p of L.spieler) {
        need(/^[br][1-9]$/.test(p.id), `${where}: ungültige Spieler-id ${p.id}`);
        need(Number.isFinite(p.x) && Number.isFinite(p.y) && p.x > 0 && p.x < F.W && p.y > 0 && p.y < F.H, `${where}: ${p.id} außerhalb des Feldes`);
      }
      need(ids.includes(L.ballbesitz), `${where}: ballbesitz ${L.ballbesitz} ist kein Spieler`);
    };
    lineup(m.start, 'start');
    if (m.start && Array.isArray(m.start.spieler)) {
      const b = m.start.spieler.filter((p) => p.id[0] === 'b').length, r = m.start.spieler.filter((p) => p.id[0] === 'r').length;
      need(b >= 2 && r >= 2, 'start: mindestens 2 gegen 2');
    }
    for (const t of ['red', 'blue']) {
      lineup(m.neustart && m.neustart[t], 'neustart.' + t);
      if (m.neustart && m.neustart[t] && m.start) need((m.neustart[t].ballbesitz || '')[0] === (t === 'red' ? 'r' : 'b'), `neustart.${t}: Ball muss beim Team ${t} sein`);
    }
    need(m.phasen && Number.isInteger(m.phasen.maxAngriff) && m.phasen.maxAngriff >= 1, 'phasen.maxAngriff fehlt');
    need(m.phasen && Number.isInteger(m.phasen.verteidigung) && m.phasen.verteidigung >= 1, 'phasen.verteidigung fehlt');
    need(Array.isArray(m.schauSchritt), 'schauSchritt fehlt (leere Liste = aus)');
    return err;
  }

  function placePlayers(s, lineup) {
    for (const q of lineup.spieler) {
      const p = P(s, q.id);
      p.x = p.tx = q.x; p.y = p.ty = q.y; p.vx = p.vy = 0; p.ctrl = null; p.delay = 0;
    }
  }

  function newState(missionId) {
    const m = mission(missionId);
    const errs = validateMission(m);
    if (errs.length) throw new Error(`Mission ${m.id} ungültig: ${errs.join('; ')}`);
    const players = m.start.spieler.map((q) => mkPlayer(q.id[0] === 'b' ? 'blue' : 'red', Number(q.id.slice(1)), q.x, q.y));
    const owner = players.find((p) => p.id === m.start.ballbesitz);
    const ball = m.start.ball || { x: owner.x, y: owner.y };
    return {
      missionId: m.id,
      players,
      ball: { x: ball.x, y: ball.y, owner: owner.id, flight: null },
      poss: owner.team,
      score: { blue: 0, red: 0 },
      t: 0,
      ai: { goal: 0, next: 0 },
      ep: null,
    };
  }

  function restart(s, teamName) {
    const L = mission(s.missionId).neustart[teamName];
    placePlayers(s, L);
    s.ball.owner = L.ballbesitz;
    s.ball.flight = null;
    const c = carrier(s); s.ball.x = c.x; s.ball.y = c.y;
    s.poss = teamName;
    if (teamName === 'red') redPlan(s);
  }

  // ---------------------------------------------------------------- Entscheidungskontext
  function context(s, last) {
    const c = carrier(s);
    const t = texts(s);
    const mk = (type, key, actions) => Object.assign({ type }, { title: t.kontext[key].title, tag: t.kontext[key].tag }, { actions }, { say: t.kontext[key].say });
    if (s.poss === 'blue') {
      const inZone = c.x >= F.W - F.ZONE - 0.3;
      if (inZone) return mk('abschluss', 'abschluss', ['schiessen', 'passen']);
      if (last && last.kind === 'pass' && last.success && last.team === 'blue') return mk('ohneBall', 'ohneBall', ['freilaufen']);
      const near = team(s, 'red').some((r) => dist(r, c) < 4.5);
      return near ? mk('angriff', 'angriffDruck', ['passen', 'dribbeln']) : mk('angriff', 'angriffFrei', ['passen', 'dribbeln']);
    }
    const pressed = team(s, 'blue').some((b) => dist(b, c) < 3.5);
    return pressed ? mk('verteidigung', 'verteidigungNah', ['raum', 'erobern']) : mk('verteidigung', 'verteidigungFern', ['erobern', 'raum']);
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
      return { ids: [o.id], say: texts(s).hilfe.passen };
    }
    if (actionKey === 'schiessen') {
      const o = shotOptions(s).sort((a, b) => b.margin - a.margin)[0];
      return { goal: o.goal, say: texts(s).hilfe.schiessen };
    }
    if (actionKey === 'dribbeln') {
      let best = null;
      for (let a = -70; a <= 70; a += 10) {
        const r = (a * Math.PI) / 180;
        const pt = clampP({ x: c.x + Math.cos(r) * 5, y: c.y + Math.sin(r) * 5 });
        const m = dribbleLane(s, c, pt).margin + pt.x * 0.02;
        if (!best || m > best.m) best = { m, pt };
      }
      return { point: best.pt, say: texts(s).hilfe.dribbeln };
    }
    if (actionKey === 'freilaufen') {
      const best = bestRunSpot(s);
      return { ids: [best.id], point: best.pt, say: texts(s).hilfe.freilaufen };
    }
    if (actionKey === 'erobern') {
      const b = team(s, 'blue').sort((a, b2) => dist(a, c) - dist(b2, c))[0];
      return { ids: [b.id], say: texts(s).hilfe.erobern };
    }
    if (actionKey === 'raum') {
      const g = F.goals.blue[s.ai.goal];
      const pt = { x: g.x + (c.x - g.x) * 0.4, y: g.y + (c.y - g.y) * 0.4 };
      pt.x = Math.max(3, pt.x);
      const b = team(s, 'blue').sort((a, b2) => dist(a, pt) - dist(b2, pt))[0];
      return { ids: [b.id], point: pt, say: texts(s).hilfe.raum };
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
  const nameOf = (s, id) => { const p = P(s, id); return texts(s).teams[p.team] + ' ' + p.num; };
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
    const E = texts(s).erkennen, X = texts(s).ausfuehren;
    const R = (good, why) => ({ good, why });
    let rec = R(true, ''), exe = R(true, '');
    if (a.kind === 'pass' || a.kind === 'shoot' || a.kind === 'dribble') {
      const sit = situation(s);
      const anyOk = sit.ok.pass || sit.ok.shoot || sit.ok.dribble;
      if (sit.ok[a.kind]) rec = R(true, a.kind === 'shoot' ? E.torchance : a.kind === 'pass' ? E.freund : E.platz);
      else if (!anyOk) rec = R(true, E.schwierig);
      else if (sit.ok.shoot) rec = R(false, E.besserSchiessen);
      else if (sit.ok.pass) rec = R(false, a.kind === 'shoot' ? E.besserPassStattSchuss : E.besserPass);
      else rec = R(false, a.kind === 'shoot' ? E.besserDribbelnStattSchuss : E.besserDribbeln);

      if (a.kind === 'pass') {
        const m = a.id ? sit.passes.find((o) => o.id === a.id).margin : lane(c, a, CFG.passSpeed, team(s, 'red'), CFG.redReact, CFG.reach).margin;
        const target = a.id ? nameOf(s, a.id) : X.freieStelle;
        if (m > CFG.passLaneOk) exe = R(true, X.wegFrei(target));
        else if (!sit.ok.pass && m >= sit.pBest - 0.05) exe = R(true, X.besterPassweg);
        else { const o = a.id ? sit.passes.find((x) => x.id === a.id) : null; const k = (o && o.hit && o.hit.id) || laneKey(s, c, a.id ? P(s, a.id) : a, 'red'); exe = R(false, X.wegNah(k ? nameOf(s, k) : X.einGegner, target) + (sit.ok.pass ? X.andererFreier : '')); }
      } else if (a.kind === 'shoot') {
        const m = sit.shots[a.goal].margin;
        if (m > CFG.shotLaneOk) exe = R(true, X.freiesTor);
        else { const h = sit.shots[a.goal].hit; const k = (h && h.id) || laneKey(s, c, F.goals.red[a.goal], 'red'); exe = R(false, X.vorDemTor(k ? nameOf(s, k) : X.einGegnerKlein) + (sit.shots[1 - a.goal].margin > CFG.shotLaneOk ? X.anderesTorFrei : '')); }
      } else {
        const m = dribbleLane(s, c, a).margin;
        exe = m > 0.2 ? R(true, X.freierRaum) : R(false, X.inGegner);
      }
    } else if (a.kind === 'run') {
      const sc = runSpotScore(s, c, P(s, a.id), a);
      rec = R(true, E.geholfen);
      exe = sc.ok ? R(true, X.gelaufenFrei) : R(false, sc.open < 3.2 ? X.gelaufenBesetzt : sc.d < 3.5 ? X.gelaufenZuNah : X.gelaufenZu);
    } else if (a.kind === 'press') {
      const blues = team(s, 'blue').sort((x, y) => dist(x, c) - dist(y, c));
      rec = dist(blues[0], c) < 8 ? R(true, E.angreifenRichtig) : R(false, E.angreifenZuWeit);
      const okP = a.id === blues[0].id || dist(P(s, a.id), c) - dist(blues[0], c) < 1;
      exe = okP ? R(true, X.naechsterGreift) : R(false, X.wegWeit(nameOf(s, blues[0].id)));
    } else if (a.kind === 'cover') {
      const g = F.goals.blue[s.ai.goal];
      const sd = segDist(a, c, g);
      rec = R(true, E.torGedacht);
      exe = sd.d < 2.2 && sd.t > 0.15 && sd.t < 0.92 ? R(true, X.zwischenTor) : R(false, X.torOffen);
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
    if (isAI && c.team === 'red') {
      s.ai.lastPass = { from: c.id, to: recv.id };
      if (s.ep && s.ep.endT != null) s.ep.endPassers = (s.ep.endPassers || []).concat(c.id);
    }
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
    s.ai.lastPass = null;
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
    // Kein sofortiger Rückpass an den, von dem der Ball gerade kam (sonst Pass-Pingpong zweier Gegner unter Druck)
    const back = s.ai.lastPass && s.ai.lastPass.to === c.id ? s.ai.lastPass.from : null;
    // Ist das Szenenende schon eingeleitet, spielt jeder Gegner höchstens noch einmal ab. So endet jede Szene sicher:
    // höchstens drei weitere Pässe, danach behält der Ballführende den Ball (gültiger Zustand für die nächste Entscheidung).
    const ended = s.ep && s.ep.endT != null && (s.ep.endPassers || []).includes(c.id);
    const passes = () => (ended ? undefined : passOptions(s).filter((o) => o.margin > CFG.passLaneOk && P(s, o.id).x < c.x + 3 && o.id !== back).sort((a, b) => b.margin - a.margin)[0]);
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
    const ep = s.ep, a = ep.a, evs = ep.events, T = texts(s).ergebnis;
    const find = (t) => evs.find((e) => e.type === t);
    const goal = find('goal');
    let success = false, text = '', icon = '';
    if (a.kind === 'pass') {
      const ic = find('intercepted');
      if (ic) { text = T.abgefangen(nameOf(s, ic.by)); icon = '😮'; }
      else { success = true; text = T.passAngekommen; icon = '👍'; }
    } else if (a.kind === 'shoot') {
      if (goal) { success = true; text = T.tor; icon = '🎉'; }
      else { const bl = find('blocked'); text = T.geblockt(bl ? nameOf(s, bl.by) : T.einGegner); icon = '🧤'; }
    } else if (a.kind === 'dribble') {
      const st = find('steal');
      if (st) { text = T.ballAbgenommen(nameOf(s, st.by)); icon = '😮'; }
      else { success = true; text = T.dribbelGut; icon = '👍'; }
    } else if (a.kind === 'run') {
      if (find('steal')) { text = T.laufBallweg; icon = '😮'; }
      else if (ep.eval.good) { success = true; text = find('autoDribble') ? T.laufFreiDribbel : T.laufFrei; icon = '🙌'; }
      else { text = T.laufSchwer; icon = '🤔'; }
    } else if (a.kind === 'press' || a.kind === 'cover') {
      if (goal && goal.team === 'red') { text = T.gegentor; icon = '😬'; }
      else if (find('steal') && s.poss === 'blue') { success = true; text = T.erobert; icon = '💪'; }
      else if (find('blocked')) { success = true; text = T.selbstGeblockt; icon = '🧱'; }
      else if (find('intercepted') && s.poss === 'blue') { success = true; text = T.selbstAbgefangen; icon = '💪'; }
      else if (find('turn') || (a.kind === 'cover' && find('evade') && ep.eval.good)) { success = true; text = T.richtungAendern; icon = '🛡️'; }
      else if (a.kind === 'press' && (find('redPass') || find('evade'))) { success = true; text = T.druckGemacht; icon = '💨'; }
      else if (a.kind === 'cover' && find('redPass') && ep.eval.good) { success = true; text = T.querSpielen; icon = '🛡️'; }
      else if (a.kind === 'cover' && find('redPass')) { success = true; text = T.abgespielt; icon = '👀'; }
      else { text = T.laeuftWeiter; icon = '🤔'; }
    }
    return { success, text, icon, goal: goal ? goal.team : null };
  }

  /** Kindgerechte Rückmeldung (Review V0.2.1, Punkt B): die dreiteilige Bewertung bleibt intern,
   *  gesprochen wird ein kurzer Satz in Kindersprache. */
  function feedback(s) {
    const ev = s.ep.eval, out = outcome(s), a = s.ep.a, T = texts(s).rueckmeldung;
    let tip;
    if (ev.rec.good && ev.exe.good) tip = out.success ? T.super : T.trotzdemGut;
    else if (ev.rec.good) tip = T.guteIdeeAber(T.idee[a.kind], ev.exe.why);
    else tip = (out.success ? T.geklapptAber : T.schauMal) + ev.rec.why;
    const say = out.text + ' ' + tip;
    const zielGut = T.tagZielGut[a.kind] || T.tagZielGut.sonst, zielSchlecht = T.tagZielSchlecht[a.kind] || T.tagZielSchlecht.sonst;
    const tags = {
      rec: { good: ev.rec.good, label: ev.rec.good ? T.tagIdeeGut : T.tagIdeeBesser },
      exe: { good: ev.exe.good, label: ev.exe.good ? zielGut : zielSchlecht },
    };
    return { good: ev.good, success: out.success, icon: out.icon, text: out.text, tip, tags, why: ev.why, rec: ev.rec, exe: ev.exe, say, goal: out.goal, explain: s.ep.explain || null };
  }

  // ---------------------------------------------------------------- Wahrnehmung: „Erst schauen, dann entscheiden“
  /** Bewertet eine Antwort im Schau-Schritt. answerId = angetippter Mitspieler oder null für „Keiner ist frei“.
   *  tries = Anzahl der Antworten einschließlich dieser. Reine Funktion: verändert den Zustand nicht. */
  function lookAnswer(s, answerId, tries) {
    const c = carrier(s), T = texts(s).schau;
    const opts = passOptions(s);
    const free = opts.filter((x) => x.margin > CFG.passLaneOk).sort((a, b) => b.margin - a.margin);
    const r = { right: false, finish: false, say: '', key: null, reveal: null, lane: null, dribblePoint: null };
    if (answerId) {
      const p = P(s, answerId), o = opts.find((x) => x.id === answerId), name = nameOf(s, answerId);
      r.lane = { from: { x: c.x, y: c.y }, to: { x: p.x, y: p.y }, ok: o.margin > CFG.passLaneOk };
      if (o.margin > CFG.passLaneOk) { r.right = r.finish = true; r.reveal = answerId; r.say = T.richtigFrei(name); }
      else {
        const k = laneKey(s, c, p, 'red'); r.key = k;
        r.say = T.imWeg(nameOf(s, k), name);
        if (tries >= 2) { r.finish = true; r.say += free.length ? T.zeigeFrei(nameOf(s, free[0].id)) : T.keinerFreiZusatz; if (free.length) r.reveal = free[0].id; }
        else r.say += T.nochmal;
      }
    } else if (!free.length) {
      r.right = r.finish = true; r.say = T.richtigKeiner;
      r.dribblePoint = hint(s, 'dribbeln').point;
    } else {
      const f = free[0];
      r.say = T.dochFrei(nameOf(s, f.id));
      if (tries >= 2) { r.finish = true; r.reveal = f.id; } else r.say = T.wirklichKeiner;
    }
    return r;
  }
  /** Soll vor diesem Entscheidungsmoment der Schau-Schritt kommen? (Missionseinstellung) */
  const lookBefore = (s, ctx) => mission(s.missionId).schauSchritt.includes(ctx.type);

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
  function newMission(missionId) {
    const m = mission(missionId);
    return { id: m.id, phase: 'attack', att: 0, def: 0, maxAttack: m.phasen.maxAngriff, defense: m.phasen.verteidigung, done: false, note: null };
  }
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
    VERSION: '0.2.5', F, CFG, get ACTIONS() { return root.FIQ_TEXTE.aktionen; }, mission, missions: missionList, texts, validateMission, lookAnswer, lookBefore, newState, context, startAction, tick, feedback, hint, frame, clone, carrier, P, team, dist, evaluate, passOptions, shotOptions, newMission, missionAfter, missionApply, nameOf, laneKey, recommend, situation };
})(typeof window !== 'undefined' ? window : globalThis);
