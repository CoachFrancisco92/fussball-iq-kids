/* Fußball-IQ Kids – Oberfläche, Steuerung, Sprache, Wiederholen & Vergleichen (V0.2) */
(function () {
  'use strict';
  const APP_VERSION = '0.2.1';
  // Schutz gegen gemischte Cache-Stände (neue Seite + altes Skript oder umgekehrt)
  try {
    const htmlV = (document.querySelector('meta[name="app-version"]') || {}).content;
    if (htmlV !== APP_VERSION || (window.FIQ && window.FIQ.VERSION !== APP_VERSION)) {
      if (!sessionStorage.getItem('fiq-reloaded')) { sessionStorage.setItem('fiq-reloaded', '1'); location.reload(); return; }
    } else sessionStorage.removeItem('fiq-reloaded');
  } catch (e) {}
  const E = window.FIQ, F = E.F;
  const SIM_SPEED = 0.85;
  const LOOK_STEP = true;          // „Erst schauen, dann entscheiden“ (Einsteiger)
  const MIN_TAP_PX = 34;           // Mindest-Tippradius in Pixeln (kleine Handys)

  // ------------------------------------------------------------ DOM
  const $ = (id) => document.getElementById(id);
  const cv = $('field'), ctx = cv.getContext('2d');
  const wrap = $('fieldWrap');

  // ------------------------------------------------------------ Sprache & Töne
  const Voice = {
    on: true, v: null,
    init() {
      if (!('speechSynthesis' in window)) return;
      const pick = () => {
        const vs = speechSynthesis.getVoices().filter((v) => /^de/i.test(v.lang));
        this.v = vs.find((v) => /anna|petra|helena|katja|google|female/i.test(v.name)) || vs[0] || null;
      };
      pick();
      speechSynthesis.onvoiceschanged = pick;
    },
    say(t) {
      if (!this.on || !('speechSynthesis' in window) || !t) return;
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(t);
        u.lang = 'de-DE'; u.rate = 0.95; u.pitch = 1.1;
        if (this.v) u.voice = this.v;
        speechSynthesis.speak(u);
      } catch (e) { /* ignorieren */ }
    },
    stop() { try { speechSynthesis.cancel(); } catch (e) {} },
  };
  const Sfx = {
    ac: null,
    ctx() { if (!this.ac) { try { this.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return this.ac; },
    tone(f, d, type, vol, when) {
      const ac = this.ctx(); if (!ac || !Voice.on) return;
      const t = ac.currentTime + (when || 0);
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type || 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(vol || 0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d);
    },
    kick() { this.tone(140, 0.12, 'triangle', 0.25); },
    goal() { this.tone(2100, 0.25, 'sine', 0.12); this.tone(2100, 0.5, 'sine', 0.12, 0.3); [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.12, 0.9 + i * 0.12)); },
    good() { [660, 880].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.12, i * 0.1)); },
    soft() { this.tone(330, 0.25, 'sine', 0.1); },
    tap() { this.tone(900, 0.05, 'sine', 0.06); },
    whistle() { this.tone(2300, 0.18, 'sine', 0.1); this.tone(2300, 0.35, 'sine', 0.1, 0.22); },
  };

  // ------------------------------------------------------------ Zustand der Oberfläche
  let S = null;          // Simulationszustand
  let M = null;          // Missionszustand (Phasen)
  let dec = 0;           // Index der aktuellen Entscheidung
  let hist = [];         // pro Entscheidung: {snap, mission, ctx, last, attempts[], final, look}
  let mode = 'start';    // start | look | decide | anim | feedback | replay | end
  let sel = null;        // {action, step, playerId}
  let hintView = null;   // {ids, goal, point}
  let marker = null;     // Zielmarkierung + geplanter Weg während der Animation
  let explainView = null;// Erklärung nach der Aktion (Ballweg, entscheidender Spieler)
  let lookView = null;   // Schau-Schritt: {wrong:id, key:id, right:id}
  let replay = null;     // {queue:[{frames,label,explain}], i, f, acc, onDone}
  let tickCount = 0;
  let firstRun = true;   // Fingerzeig nur beim ersten Spiel
  let idleTimer = null;

  // ------------------------------------------------------------ Darstellung
  const VIEW = { x0: -2.2, y0: -1.6, w: 40.4, h: 27.2 };
  let scale = 20, dpr = 1;

  function resize() {
    const r = wrap.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    scale = Math.min(r.width / VIEW.w, r.height / VIEW.h);
    const cw = VIEW.w * scale, ch = VIEW.h * scale;
    cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    cv.style.left = (r.width - cw) / 2 + 'px'; cv.style.top = (r.height - ch) / 2 + 'px';
    $('portraitTip').hidden = !(window.innerHeight > window.innerWidth * 1.15);
  }
  const X = (x) => (x - VIEW.x0) * scale * dpr;
  const Y = (y) => (y - VIEW.y0) * scale * dpr;
  const Mm = (m) => m * scale * dpr;
  const FONT = (px) => `800 ${px}px "Baloo 2", ui-rounded, system-ui, sans-serif`;

  function viewFromState(s) {
    return { players: s.players.map((p) => ({ id: p.id, team: p.team, num: p.num, x: p.x, y: p.y })), ball: { x: s.ball.x, y: s.ball.y }, owner: s.ball.owner };
  }
  function viewFromFrame(f, base) {
    const players = base.players.map((p, i) => ({ id: p.id, team: p.team, num: p.num, x: f[i * 2], y: f[i * 2 + 1] }));
    const oi = f[f.length - 1];
    return { players, ball: { x: f[f.length - 3], y: f[f.length - 2] }, owner: oi >= 0 ? players[oi].id : null };
  }

  function drawField() {
    const W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    const stripes = 9;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 ? '#3fa34d' : '#47ad55';
      ctx.fillRect(X(F.W / stripes * i), 0, Mm(F.W / stripes) + 1, H);
    }
    ctx.fillStyle = '#3a9747';
    ctx.fillRect(0, 0, X(0), H); ctx.fillRect(X(F.W), 0, W - X(F.W), H);
    ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = Mm(0.14);
    ctx.strokeRect(X(0), Y(0), Mm(F.W), Mm(F.H));
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath(); ctx.moveTo(X(F.W / 2), Y(0)); ctx.lineTo(X(F.W / 2), Y(F.H)); ctx.stroke();
    ctx.beginPath(); ctx.arc(X(F.W / 2), Y(F.H / 2), Mm(3), 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([Mm(0.6), Mm(0.45)]); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = Mm(0.12);
    [F.ZONE, F.W - F.ZONE].forEach((x) => { ctx.beginPath(); ctx.moveTo(X(x), Y(0)); ctx.lineTo(X(x), Y(F.H)); ctx.stroke(); });
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(37,99,235,.07)'; ctx.fillRect(X(0), Y(0), Mm(F.ZONE), Mm(F.H));
    ctx.fillStyle = 'rgba(225,29,72,.07)'; ctx.fillRect(X(F.W - F.ZONE), Y(0), Mm(F.ZONE), Mm(F.H));
    F.goals.blue.forEach((g) => drawGoal(g, -1, '#2563eb', false));
    F.goals.red.forEach((g, i) => drawGoal(g, 1, '#e11d48', isGoalHighlighted(i)));
  }
  function isGoalHighlighted(i) {
    if (hintView && hintView.goal === i) return 'hint';
    if (mode === 'decide' && sel && sel.action === 'schiessen') return 'pick';
    return false;
  }
  function drawGoal(g, dir, col, hl) {
    const depth = 1.1, w = F.GOAL_W;
    const x = dir < 0 ? g.x - depth : g.x;
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.fillRect(X(x), Y(g.y - w / 2), Mm(depth), Mm(w));
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = Mm(0.05);
    for (let k = 0.3; k < w; k += 0.4) { ctx.beginPath(); ctx.moveTo(X(x), Y(g.y - w / 2 + k)); ctx.lineTo(X(x + depth), Y(g.y - w / 2 + k)); ctx.stroke(); }
    ctx.strokeStyle = col; ctx.lineWidth = Mm(0.2);
    ctx.strokeRect(X(x), Y(g.y - w / 2), Mm(depth), Mm(w));
    if (hl) {
      const p = 0.5 + 0.5 * Math.sin(performance.now() / 180);
      ctx.strokeStyle = hl === 'hint' ? `rgba(255,214,10,${0.6 + 0.4 * p})` : `rgba(255,255,255,${0.5 + 0.5 * p})`;
      ctx.lineWidth = Mm(0.22); ctx.setLineDash([Mm(0.4), Mm(0.3)]);
      ctx.beginPath(); ctx.arc(X(g.x), Y(g.y), Mm(2.3 + p * 0.3), 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
  }

  function ring(x, y, r, color, width, dash) {
    ctx.strokeStyle = color; ctx.lineWidth = Mm(width);
    if (dash) ctx.setLineDash([Mm(0.35), Mm(0.25)]);
    ctx.beginPath(); ctx.arc(X(x), Y(y), Mm(r), 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawPlayers(v, opts) {
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 170);
    const cand = opts.candidates || [];
    for (const p of v.players) {
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      ctx.beginPath(); ctx.ellipse(X(p.x + 0.15), Y(p.y + 0.35), Mm(0.85), Mm(0.55), 0, 0, Math.PI * 2); ctx.fill();
    }
    for (const p of v.players) {
      const r = 0.85;
      if (v.owner === p.id) {
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), Mm(r + 0.45), 0, Math.PI * 2); ctx.fill();
      }
      if (cand.includes(p.id)) ring(p.x, p.y, r + 0.55 + pulse * 0.2, `rgba(255,255,255,${0.55 + 0.45 * pulse})`, 0.16, true);
      if (hintView && hintView.ids && hintView.ids.includes(p.id)) ring(p.x, p.y, r + 0.75 + pulse * 0.25, `rgba(255,214,10,${0.6 + 0.4 * pulse})`, 0.24);
      if (opts.good && opts.good.includes(p.id)) ring(p.x, p.y, r + 0.6 + pulse * 0.25, `rgba(34,197,94,${0.7 + 0.3 * pulse})`, 0.26);
      if (opts.bad && opts.bad.includes(p.id)) ring(p.x, p.y, r + 0.6 + pulse * 0.35, `rgba(255,59,48,${0.7 + 0.3 * pulse})`, 0.28);
      if (opts.selected === p.id) ring(p.x, p.y, r + 0.45, '#ffd60a', 0.26);
      const g = ctx.createRadialGradient(X(p.x - 0.3), Y(p.y - 0.35), Mm(0.1), X(p.x), Y(p.y), Mm(r));
      if (p.team === 'blue') { g.addColorStop(0, '#60a5fa'); g.addColorStop(1, '#1d4ed8'); }
      else { g.addColorStop(0, '#fb7185'); g.addColorStop(1, '#be123c'); }
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), Mm(r), 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = Mm(0.13); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = FONT(Mm(0.95));
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(p.num), X(p.x), Y(p.y) + Mm(0.04));
    }
    const b = v.ball;
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath(); ctx.ellipse(X(b.x + 0.1), Y(b.y + 0.22), Mm(0.36), Mm(0.22), 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111'; ctx.lineWidth = Mm(0.07);
    ctx.beginPath(); ctx.arc(X(b.x), Y(b.y), Mm(0.38), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(X(b.x), Y(b.y), Mm(0.13), 0, Math.PI * 2); ctx.fill();
  }

  function drawMarker(pt, color) {
    const p = 0.5 + 0.5 * Math.sin(performance.now() / 160);
    ctx.strokeStyle = color; ctx.lineWidth = Mm(0.16);
    ctx.beginPath(); ctx.arc(X(pt.x), Y(pt.y), Mm(0.7 + p * 0.25), 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X(pt.x - 0.4), Y(pt.y)); ctx.lineTo(X(pt.x + 0.4), Y(pt.y));
    ctx.moveTo(X(pt.x), Y(pt.y - 0.4)); ctx.lineTo(X(pt.x), Y(pt.y + 0.4)); ctx.stroke();
  }

  /** Pfeil von a nach b (geplanter Weg, Ballweg) */
  function arrow(a, b, color, width, dashed) {
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy);
    if (L < 0.5) return;
    const ux = dx / L, uy = dy / L;
    const end = { x: b.x - ux * 0.9, y: b.y - uy * 0.9 };
    const start = { x: a.x + ux * 1.0, y: a.y + uy * 1.0 };
    ctx.strokeStyle = color; ctx.lineWidth = Mm(width); ctx.lineCap = 'round';
    if (dashed) ctx.setLineDash([Mm(0.55), Mm(0.4)]);
    ctx.beginPath(); ctx.moveTo(X(start.x), Y(start.y)); ctx.lineTo(X(end.x), Y(end.y)); ctx.stroke();
    ctx.setLineDash([]);
    const h = 0.9;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(X(end.x + ux * 0.3), Y(end.y + uy * 0.3));
    ctx.lineTo(X(end.x - ux * h - uy * h * 0.55), Y(end.y - uy * h + ux * h * 0.55));
    ctx.lineTo(X(end.x - ux * h + uy * h * 0.55), Y(end.y - uy * h - ux * h * 0.55));
    ctx.closePath(); ctx.fill();
  }

  /** Erklärung der Konsequenz: grüner/roter Weg + entscheidender Gegenspieler (Review Punkt 1 & 6) */
  function drawExplain(ex) {
    if (!ex) return;
    if (ex.threat) arrow(ex.threat.from, ex.threat.to, 'rgba(255,59,48,.75)', 0.22, true);
    if (ex.pass && !ex.ok) arrow(ex.pass.from, ex.pass.to, 'rgba(255,59,48,.8)', 0.2, true);
    arrow(ex.from, ex.to, ex.ok ? 'rgba(34,197,94,.95)' : 'rgba(255,59,48,.95)', 0.3, false);
  }
  function explainIds(ex) {
    if (!ex || !ex.key) return { good: [], bad: [] };
    return ex.keyGood ? { good: [ex.key], bad: [] } : { good: [], bad: [ex.key] };
  }

  function drawTrail(frames, upto) {
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = Mm(0.12);
    ctx.setLineDash([Mm(0.2), Mm(0.25)]);
    ctx.beginPath();
    for (let i = 0; i <= Math.min(upto, frames.length - 1); i++) {
      const f = frames[i]; const bx = f[f.length - 3], by = f[f.length - 2];
      if (i === 0) ctx.moveTo(X(bx), Y(by)); else ctx.lineTo(X(bx), Y(by));
    }
    ctx.stroke(); ctx.setLineDash([]);
  }

  function label(text) {
    ctx.font = FONT(Mm(1.15));
    const tw = ctx.measureText(text).width + Mm(1.6);
    ctx.fillStyle = 'rgba(15,23,42,.78)';
    roundRect(X(F.W / 2) - tw / 2, Y(0.4), tw, Mm(2), Mm(1)); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, X(F.W / 2), Y(1.4));
  }

  function render() {
    drawField();
    let v, opts = { candidates: [], selected: null, good: [], bad: [] };
    if (mode === 'replay' && replay) {
      const item = replay.queue[replay.i];
      const fi = Math.min(replay.f, item.frames.length - 1);
      v = viewFromFrame(item.frames[fi], viewFromState(S));
      drawTrail(item.frames, fi);
      if (replay.f >= item.frames.length - 1 && item.explain) { drawExplain(item.explain); Object.assign(opts, explainIds(item.explain)); }
    } else if (S) v = viewFromState(S);
    if (!v) return;
    const c = E.carrier(S);
    if (mode === 'look') {
      opts.candidates = lookView && lookView.done ? [] : S.players.filter((p) => p.team === 'blue' && p !== c).map((p) => p.id);
      if (lookView) {
        if (lookView.right) opts.good.push(lookView.right);
        if (lookView.key) opts.bad.push(lookView.key);
        if (lookView.lane) arrow(lookView.lane.from, lookView.lane.to, lookView.lane.ok ? 'rgba(34,197,94,.9)' : 'rgba(255,59,48,.85)', 0.24, true);
      }
    }
    if (mode === 'decide' && sel) {
      opts.selected = sel.playerId || null;
      if (sel.action === 'passen' || (sel.action === 'freilaufen' && sel.step === 1)) opts.candidates = S.players.filter((p) => p.team === 'blue' && p !== c).map((p) => p.id);
      if ((sel.action === 'erobern' || sel.action === 'raum') && sel.step === 1) opts.candidates = S.players.filter((p) => p.team === 'blue').map((p) => p.id);
    }
    if (hintView && hintView.point && mode === 'decide') drawMarker(hintView.point, 'rgba(255,214,10,.95)');
    if (marker && mode === 'anim') {
      if (marker.from && marker.planned) arrow(marker.from, marker, 'rgba(255,255,255,.75)', 0.18, true);
      drawMarker(marker, 'rgba(255,255,255,.9)');
    }
    if (mode === 'feedback' && explainView) { drawExplain(explainView); Object.assign(opts, explainIds(explainView)); }
    drawPlayers(v, opts);
    if (mode === 'replay' && replay) label(replay.queue[replay.i].label);
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // ------------------------------------------------------------ Hauptschleife
  let lastT = performance.now(), acc = 0;
  function loop(t) {
    const dt = Math.min(0.05, (t - lastT) / 1000); lastT = t;
    if (mode === 'anim') {
      acc += dt * SIM_SPEED;
      while (acc >= E.CFG.dt && mode === 'anim') {
        acc -= E.CFG.dt;
        const beforeFlight = S.ball.flight;
        E.tick(S);
        tickCount++;
        if (tickCount % 2 === 0) S.ep.frames.push(E.frame(S));
        if (!beforeFlight && S.ball.flight) Sfx.kick();
        const lastEv = S.ep.events[S.ep.events.length - 1];
        if (lastEv && !lastEv.seen) { lastEv.seen = true; onEvent(lastEv); }
        if (S.ep.done) finishEpisode();
      }
    } else if (mode === 'replay' && replay) {
      replay.acc += dt * SIM_SPEED * 30;
      while (replay && replay.acc >= 1) {
        replay.acc -= 1; replay.f++;
        const item = replay.queue[replay.i];
        if (replay.f >= item.frames.length + 75) { // ~2,5 s Standbild mit Erklärung
          replay.i++; replay.f = 0;
          if (replay.i >= replay.queue.length) { const done = replay.onDone; replay = null; done(); break; }
          Voice.say(replay.queue[replay.i].say || '');
        }
      }
    }
    render();
    requestAnimationFrame(loop);
  }
  function onEvent(e) {
    if (e.type === 'goal') { Sfx.goal(); confetti(e.team); updateScore(); }
    if (e.type === 'steal' || e.type === 'intercepted' || e.type === 'blocked') Sfx.soft();
  }

  // ------------------------------------------------------------ Ablauf der Mission
  function startMission() {
    S = E.newState(); M = E.newMission(); dec = 0; hist = [];
    hintView = null; marker = null; explainView = null;
    $('startScreen').hidden = true; $('endScreen').hidden = true;
    updateScore(); beginDecision(null);
  }

  function beginDecision(last) {
    if (M.done) return endMission();
    const c = E.context(S, last);
    const prev = hist[dec];
    hist[dec] = { snap: E.clone(S), mission: E.clone(M), ctx: c, last, attempts: prev ? prev.attempts : [], final: null, look: prev ? prev.look : null };
    hist.length = dec + 1;
    sel = null; hintView = null; marker = null; explainView = null; lookView = null;
    updateProgress();
    setPrompt(c.tag, c.type === 'verteidigung' ? 'def' : 'att', c.title);
    if (LOOK_STEP && c.type === 'angriff' && !hist[dec].look) return beginLook(c);
    startDecide(c, true);
  }

  function setPrompt(tag, cls, title) {
    $('tag').textContent = tag; $('tag').className = 'tag ' + cls;
    $('title').textContent = title;
    $('prompt').hidden = false;
  }

  function startDecide(c, speak) {
    mode = 'decide';
    setPrompt(c.tag, c.type === 'verteidigung' ? 'def' : 'att', c.title);
    renderActions(c);
    setStepText('');
    if (speak) Voice.say(c.say);
    if (c.actions.length === 1) chooseAction(c.actions[0], true);
    armIdle();
  }

  // ---------- Schau-Schritt: „Erst schauen, dann entscheiden“ (Review V0.1 Punkt 8, V0.2.1 Punkt A)
  // Das Kind tippt den freien Freund an – oder sagt „Keiner ist frei!“. Beides kann richtig sein.
  function beginLook(c) {
    mode = 'look';
    lookView = { tries: 0 };
    setPrompt('Schau hin', 'look', 'Wer steht frei?');
    const box = $('actions'); box.innerHTML = ''; $('cancel').hidden = true;
    const b = document.createElement('button');
    b.className = 'act'; b.id = 'lookNone';
    b.innerHTML = '<span class="ico">🙅</span><span>Keiner ist frei</span>';
    b.onclick = () => { if (mode === 'look' && !(lookView && lookView.done)) { Sfx.tap(); hideHand(); onLookAnswer(null); } };
    box.appendChild(b);
    setStepText('👀 Tippe auf den freien Freund – oder auf „Keiner ist frei“.');
    Voice.say('Schau dich um! Welcher Freund steht frei? Tippe ihn an. Wenn keiner frei ist, tippe auf: Keiner ist frei.');
    armIdle();
  }
  /** p = angetippter Mitspieler oder null für „Keiner ist frei“ */
  function onLookAnswer(p) {
    const c = E.carrier(S);
    const opts = E.passOptions(S);
    const free = opts.filter((x) => x.margin > E.CFG.passLaneOk).sort((a, b) => b.margin - a.margin);
    lookView.tries++;
    lookView.key = null; lookView.right = null; lookView.lane = null;
    let t, right = false, finish = false;
    if (p) {
      const o = opts.find((x) => x.id === p.id);
      const name = E.nameOf(S, p.id);
      lookView.lane = { from: { x: c.x, y: c.y }, to: { x: p.x, y: p.y }, ok: o.margin > E.CFG.passLaneOk };
      if (o.margin > E.CFG.passLaneOk) {
        right = finish = true; lookView.right = p.id;
        t = `Ja! ${name} steht frei. Zwischen euch ist kein Gegner.`;
      } else {
        const k = E.laneKey(S, c, p, 'red'); lookView.key = k;
        t = `Schau genau: ${E.nameOf(S, k)} steht im Weg zu ${name}.`;
        if (lookView.tries >= 2) { finish = true; t += free.length ? ` ${E.nameOf(S, free[0].id)} steht frei.` : ' Gerade ist keiner frei.'; if (free.length) lookView.right = free[0].id; }
        else t += ' Probier\'s nochmal!';
      }
    } else if (!free.length) {
      right = finish = true;
      t = 'Richtig! Gerade ist keiner frei. Dann kannst du mit dem Ball in den freien Platz dribbeln.';
      const h = E.hint(S, 'dribbeln'); hintView = { point: h.point };
    } else {
      const f = free[0];
      t = `Schau nochmal genau: ${E.nameOf(S, f.id)} steht frei.`;
      if (lookView.tries >= 2) { finish = true; lookView.right = f.id; } else { t = 'Schau nochmal genau. Ist wirklich keiner frei?'; }
    }
    if (right) Sfx.good(); else Sfx.soft();
    setStepText((right ? '✅ ' : '👀 ') + t);
    Voice.say(t);
    if (finish) {
      lookView.done = true;
      const b = $('lookNone'); if (b) b.disabled = true;
      hist[dec].look = { right, tries: lookView.tries };
      setTimeout(() => { if (mode === 'look') { lookView = null; const hv = hintView; startDecide(hist[dec].ctx, false); hintView = hv; Voice.say('Und jetzt: Was machst du mit dem Ball?'); } }, 3400);
    }
  }

  function renderActions(c) {
    const box = $('actions'); box.innerHTML = '';
    for (const k of c.actions) {
      const a = E.ACTIONS[k];
      const b = document.createElement('button');
      b.className = 'act' + (sel && sel.action === k ? ' on' : '');
      b.innerHTML = `<span class="ico">${a.icon}</span><span>${a.label}</span>`;
      b.onclick = () => { Sfx.tap(); chooseAction(k); };
      box.appendChild(b);
    }
    const h = document.createElement('button');
    h.className = 'act hint'; h.innerHTML = '<span class="ico">💡</span><span>Hilfe</span>';
    h.onclick = () => showHint();
    box.appendChild(h);
    $('cancel').hidden = !sel;
  }

  const STEP_SAY = {
    passen: ['Tippe auf einen Mitspieler. Oder auf eine freie Stelle.'],
    dribbeln: ['Tippe dorthin, wohin du dribbeln willst.'],
    schiessen: ['Tippe auf ein rotes Tor.'],
    freilaufen: ['Wähle einen blauen Spieler ohne Ball.', 'Wohin soll er laufen? Tippe auf eine freie Stelle.'],
    erobern: ['Welcher blaue Spieler soll den Gegner angreifen? Tippe ihn an.'],
    raum: ['Wähle einen blauen Spieler.', 'Wo soll er sich hinstellen? Tippe auf die Stelle.'],
  };
  function chooseAction(k, silent) {
    if (mode !== 'decide') return;
    hideHand();
    if (sel && sel.action === k && !silent) { sel = null; renderActions(hist[dec].ctx); setStepText(''); return; }
    sel = { action: k, step: 1, playerId: null };
    renderActions(hist[dec].ctx);
    setStepText(STEP_SAY[k][0]);
    if (!silent) Voice.say(STEP_SAY[k][0]);
    armIdle();
  }
  function setStepText(t) { $('step').textContent = t; $('step').hidden = !t; }

  function showHint() {
    const c = hist[dec].ctx;
    const k = E.recommend(S, c.actions);
    if (!sel || sel.action !== k) chooseAction(k, true);
    hintView = E.hint(S, k);
    Voice.say(hintView.say);
    setStepText('💡 ' + hintView.say);
    hist[dec].usedHint = true;
  }

  // ---------- Fingerzeig für das Bedienprinzip (Review Punkt 5)
  function armIdle() {
    clearTimeout(idleTimer); hideHand();
    if (!firstRun && dec > 0) return;
    idleTimer = setTimeout(showHand, dec === 0 ? 3500 : 6000);
  }
  function showHand() {
    const hand = $('hand');
    let targets = [];
    if (mode === 'decide' && !sel) targets = [...document.querySelectorAll('#actions .act:not(.hint)')].map((b) => { const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    else if (mode === 'look' || (mode === 'decide' && sel)) {
      const c = E.carrier(S);
      const r = cv.getBoundingClientRect();
      const list = mode === 'look' || sel.action === 'passen' || sel.action === 'freilaufen' ? S.players.filter((p) => p.team === 'blue' && p !== c) : sel.action === 'schiessen' ? F.goals.red : [];
      targets = list.map((p) => ({ x: r.left + (p.x - VIEW.x0) * scale, y: r.top + (p.y - VIEW.y0) * scale }));
    }
    if (!targets.length) return;
    let i = 0;
    hand.hidden = false;
    const move = () => { const t = targets[i % targets.length]; hand.style.left = t.x + 'px'; hand.style.top = t.y + 'px'; i++; };
    move();
    clearInterval(hand._iv); hand._iv = setInterval(move, 1400);
  }
  function hideHand() { const h = $('hand'); h.hidden = true; clearInterval(h._iv); }

  // ------------------------------------------------------------ Eingabe aufs Spielfeld
  function worldFromEvent(ev) {
    const r = cv.getBoundingClientRect();
    return { x: (ev.clientX - r.left) / scale + VIEW.x0, y: (ev.clientY - r.top) / scale + VIEW.y0 };
  }
  function hitPlayer(pt, filter) {
    let best = null, bd = Math.max(1.9, MIN_TAP_PX / scale);
    for (const p of S.players) { if (filter && !filter(p)) continue; const d = E.dist(p, pt); if (d < bd) { bd = d; best = p; } }
    return best;
  }
  cv.addEventListener('pointerdown', (ev) => {
    const pt = worldFromEvent(ev);
    const c = S && E.carrier(S);
    if (mode === 'look') {
      if (lookView && lookView.done) return;
      const p = hitPlayer(pt, (q) => q.team === 'blue' && q !== c);
      hideHand();
      if (p) onLookAnswer(p); else Voice.say('Tippe auf einen blauen Spieler – oder auf: Keiner ist frei.');
      return;
    }
    if (mode !== 'decide') return;
    if (!sel) { Voice.say('Tippe zuerst unten auf einen Knopf.'); pulseActions(); return; }
    hideHand();
    const inField = pt.x > 0.3 && pt.x < F.W - 0.3 && pt.y > 0.3 && pt.y < F.H - 0.3;
    const k = sel.action;
    if (k === 'passen') {
      const p = hitPlayer(pt, (q) => q.team === 'blue' && q !== c);
      if (p) return act({ kind: 'pass', id: p.id }, p, c);
      if (inField && E.dist(pt, c) > 2) return act({ kind: 'pass', x: pt.x, y: pt.y }, pt, c);
    } else if (k === 'dribbeln') {
      if (inField && E.dist(pt, c) > 1) return act({ kind: 'dribble', x: pt.x, y: pt.y }, pt, c);
    } else if (k === 'schiessen') {
      const gi = F.goals.red.map((g) => E.dist(g, pt)).reduce((bi, d, i, arr) => (d < arr[bi] ? i : bi), 0);
      if (E.dist(F.goals.red[gi], pt) < 5 || pt.x > F.W - 4) return act({ kind: 'shoot', goal: gi }, F.goals.red[gi], c);
      Voice.say('Tippe auf eines der roten Tore rechts.');
    } else if (k === 'freilaufen' || k === 'raum') {
      const filt = (q) => q.team === 'blue' && (k === 'raum' || q !== c);
      if (sel.step === 1) {
        const p = hitPlayer(pt, filt);
        if (p) { Sfx.tap(); sel.playerId = p.id; sel.step = 2; setStepText(STEP_SAY[k][1]); Voice.say(STEP_SAY[k][1]); }
        return;
      }
      const p = hitPlayer(pt, filt);
      if (p && E.dist(p, pt) < 1.1 && p.id !== sel.playerId) { sel.playerId = p.id; Sfx.tap(); return; }
      if (inField) return act({ kind: k === 'raum' ? 'cover' : 'run', id: sel.playerId, x: pt.x, y: pt.y }, pt, E.P(S, sel.playerId));
    } else if (k === 'erobern') {
      const p = hitPlayer(pt, (q) => q.team === 'blue');
      if (p) return act({ kind: 'press', id: p.id }, null);
    }
  });
  function pulseActions() { const a = $('actions'); a.classList.remove('wiggle'); void a.offsetWidth; a.classList.add('wiggle'); }

  function act(a, mark, from) {
    Voice.stop(); Sfx.tap(); hideHand(); clearTimeout(idleTimer);
    hintView = null;
    marker = mark ? { x: mark.x, y: mark.y, from: from ? { x: from.x, y: from.y } : null, planned: true } : null;
    E.startAction(S, a);
    mode = 'anim'; sel = null; acc = 0;
    $('actions').innerHTML = ''; $('cancel').hidden = true; setStepText('');
    $('prompt').classList.add('dim');
  }

  function finishEpisode() {
    const fb = E.feedback(S);
    const ctxType = hist[dec].ctx.type;
    const attempt = { frames: S.ep.frames, fb, a: S.ep.a, endState: null, missionAfter: null };
    E.missionAfter(M, S, ctxType);               // kann bei „Ball im Aus“ einen Neustart auslösen
    attempt.endState = E.clone(S); attempt.missionAfter = E.clone(M);
    const h = hist[dec];
    h.attempts.push(attempt); h.final = attempt;
    mode = 'feedback'; marker = null;
    explainView = fb.explain;
    $('prompt').classList.remove('dim');
    showFeedback(fb, h);
  }

  function chip(el, tag, icon, detail) {
    el.textContent = `${tag.good ? '✓' : '✗'} ${icon} ${tag.label}`;
    el.title = detail || '';
    el.className = 'chip ' + (tag.good ? 'good' : 'bad');
  }
  function showFeedback(fb, h) {
    $('fbIcon').textContent = fb.icon;
    $('fbText').textContent = fb.text;
    $('fbTip').textContent = fb.tip;
    $('fbStar').textContent = fb.good ? '⭐' : '💭';
    $('fbStar').className = 'bigstar ' + (fb.good ? 'on' : '');
    chip($('fbRec'), fb.tags.rec, '💡', fb.rec.why);
    chip($('fbExe'), fb.tags.exe, '🎯', fb.exe.why);
    $('fbCompare').hidden = h.attempts.length < 2;
    $('fbNext').querySelector('.lbl').textContent = M.done ? 'Fertig' : 'Weiterspielen';
    $('feedback').hidden = false;
    if (fb.good) Sfx.good();
    updateProgress();
    Voice.say(fb.say);
  }

  function retry() {
    $('feedback').hidden = true;
    const h = hist[dec];
    S = E.clone(h.snap); M = E.clone(h.mission);
    h.final = null; explainView = null;
    if (h.look && !h.look.right) h.look = null; // Wahrnehmung war falsch -> auch das Schauen wiederholen
    updateScore();
    Voice.say('Gleiche Situation – probier etwas anderes!');
    setTimeout(() => beginDecision(h.last), 900);
  }
  function next() {
    $('feedback').hidden = true;
    explainView = null;
    const h = hist[dec];
    const last = { kind: h.final.a.kind, success: h.final.fb.success, team: 'blue' };
    E.missionApply(M, S);
    dec++;
    if (M.note === 'aus') {
      Sfx.whistle();
      Voice.say('Der Ball ist im Aus. Jetzt haben die Roten den Ball. Pass gut auf unsere Tore auf!');
      setStepText('🏳️ Ball im Aus – jetzt hat Rot den Ball.');
      M.note = null;
      setTimeout(() => beginDecision(last), 2600);
      return;
    }
    beginDecision(last);
  }
  function compare() {
    const h = hist[dec];
    const n = h.attempts.length;
    const a1 = h.attempts[n - 2], a2 = h.attempts[n - 1];
    $('feedback').hidden = true;
    const say = (pre, at) => `${pre}: ${at.fb.say}`;
    startReplay([
      { frames: a1.frames, label: 'Vorher', explain: a1.fb.explain, say: say('Vorher', a1) },
      { frames: a2.frames, label: 'Jetzt', explain: a2.fb.explain, say: say('Jetzt', a2) },
    ], () => { S = E.clone(h.final.endState); explainView = h.final.fb.explain; $('feedback').hidden = false; mode = 'feedback'; });
  }
  function startReplay(queue, onDone) {
    mode = 'replay';
    replay = { queue, i: 0, f: 0, acc: 0, onDone: null };
    $('prompt').hidden = true; $('skip').hidden = false; setStepText('');
    replay.onDone = () => { $('skip').hidden = true; onDone(); $('prompt').hidden = mode === 'end'; };
    Voice.say(queue[0].say || '');
  }

  function endMission() {
    mode = 'end';
    hideHand(); clearTimeout(idleTimer);
    updateProgress();
    const done = hist.filter((h) => h.final);
    const good = done.filter((h) => h.final.fb.good).length;
    const looks = hist.filter((h) => h.look);
    $('stars').innerHTML = done.map((h) => `<span class="${h.final.fb.good ? 'on' : ''}">★</span>`).join('');
    $('endScore').textContent = `Blau ${S.score.blue} : ${S.score.red} Rot` + (looks.length ? `  ·  👀 ${looks.filter((l) => l.right && l.tries === 1).length}/${looks.length} sofort erkannt` : '');
    let msg = good >= done.length - 1 ? 'Super gespielt!' : good >= 2 ? 'Gut gemacht!' : 'Toll, dass du es probiert hast!';
    msg += ' Ihr habt angegriffen und eure Tore beschützt. Denk daran: Wenn ein Freund den Ball hat, kannst du ihm helfen, indem du dich freiläufst!';
    $('endMsg').textContent = msg;
    $('endList').innerHTML = done.map((h, i) => `<li class="${h.final.fb.good ? 'good' : ''}"><b>${h.ctx.type === 'verteidigung' ? '🛡️' : '⚽'}</b> ${h.ctx.title} <span>${h.final.fb.good ? '⭐' : '💭'}</span></li>`).join('');
    $('prompt').hidden = true; setStepText('');
    $('endScreen').hidden = false;
    firstRun = false;
    Voice.say(msg + ` Du hast ${good} von ${done.length} Sternen.`);
  }
  function highlights() {
    $('endScreen').hidden = true;
    const q = hist.filter((h) => h.final).map((h) => ({ frames: h.final.frames, label: h.ctx.title, explain: h.final.fb.explain, say: h.final.fb.text }));
    startReplay(q, () => { mode = 'end'; $('endScreen').hidden = false; });
  }

  // ------------------------------------------------------------ Anzeigen
  function updateProgress() {
    const box = $('progress'); box.innerHTML = '';
    const mk = (cls, txt) => { const d = document.createElement('span'); d.className = cls; d.textContent = txt; box.appendChild(d); };
    const items = hist.map((h, i) => ({ h, i }));
    const att = items.filter((x) => x.h.ctx.type !== 'verteidigung');
    const def = items.filter((x) => x.h.ctx.type === 'verteidigung');
    const dot = (x) => {
      const fin = x.h.final;
      mk('dot' + (x.i === dec && mode !== 'end' && !fin ? ' cur' : '') + (fin ? (fin.fb.good ? ' star' : ' done') : ''), fin ? (fin.fb.good ? '★' : '✓') : '•');
    };
    mk('phase' + (M && M.phase === 'attack' && mode !== 'end' ? ' on' : ''), '⚽');
    att.forEach(dot);
    mk('phase' + (M && M.phase === 'defense' && mode !== 'end' ? ' on' : ''), '🛡️');
    def.forEach(dot);
    const open = M ? Math.max(0, M.defense - def.length) : 2;
    for (let i = 0; i < open && !(M && M.done); i++) mk('dot', '');
  }
  function updateScore() { if (S) $('score').textContent = `${S.score.blue} : ${S.score.red}`; }

  function confetti(teamName) {
    const box = $('confetti'); box.innerHTML = '';
    const cols = teamName === 'blue' ? ['#2563eb', '#60a5fa', '#ffd60a', '#fff'] : ['#e11d48', '#fb7185', '#fff'];
    for (let i = 0; i < 60; i++) {
      const s = document.createElement('i');
      s.style.left = (i * 37) % 100 + '%';
      s.style.background = cols[i % cols.length];
      s.style.animationDelay = (i % 8) * 0.05 + 's';
      box.appendChild(s);
    }
    $('goalBanner').textContent = teamName === 'blue' ? 'TOOOR! ⚽' : 'Tor für Rot';
    $('goalBanner').className = 'goalBanner show ' + teamName;
    setTimeout(() => { box.innerHTML = ''; $('goalBanner').className = 'goalBanner'; }, 1800);
  }

  // ------------------------------------------------------------ Verdrahtung
  $('play').onclick = () => { Sfx.ctx(); Voice.init(); Voice.say('Los geht\'s! Du spielst mit den Blauen.'); setTimeout(startMission, 50); };
  $('again').onclick = () => startMission();
  $('home').onclick = () => { Voice.stop(); hideHand(); mode = 'start'; $('feedback').hidden = true; $('endScreen').hidden = true; $('startScreen').hidden = false; };
  $('home2').onclick = $('home').onclick;
  $('hl').onclick = () => highlights();
  $('fbRetry').onclick = () => retry();
  $('fbNext').onclick = () => next();
  $('fbCompare').onclick = () => compare();
  $('cancel').onclick = () => { sel = null; hintView = null; renderActions(hist[dec].ctx); setStepText(''); };
  $('repeat').onclick = () => Voice.say(mode === 'look' ? 'Welcher Freund steht frei? Tippe ihn an.' : hist[dec] ? hist[dec].ctx.say : '');
  $('skip').onclick = () => { if (replay) { const d = replay.onDone; replay = null; d(); } };
  $('sound').onclick = () => { Voice.on = !Voice.on; $('sound').textContent = Voice.on ? '🔊' : '🔇'; if (!Voice.on) Voice.stop(); };

  window.addEventListener('resize', resize);
  try { new ResizeObserver(() => resize()).observe(wrap); } catch (e) {}
  resize();
  S = E.newState(); M = E.newMission();
  updateScore(); updateProgress();
  requestAnimationFrame(loop);

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    try { navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) {}
  }
  // Testzugriff (nur lesend) für automatisierte Oberflächentests
  window.__fiq = { get mode() { return mode; }, get S() { return S; }, get M() { return M; }, get ctx() { return hist[dec] ? hist[dec].ctx : null; } };
})();
