/* Fußball-IQ Kids – Oberfläche, Steuerung, Sprache, Wiederholen & Vergleichen */
(function () {
  'use strict';
  const E = window.FIQ, F = E.F;
  const MISSION = { title: 'Zusammen sind wir stark!', decisions: 5 };
  const SIM_SPEED = 0.85;

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
        this.v = vs.find((v) => /female|anna|petra|helena|katja|google/i.test(v.name)) || vs[0] || null;
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
  };

  // ------------------------------------------------------------ Spielzustand der Oberfläche
  let S = null;          // Simulationszustand
  let dec = 0;           // aktuelle Entscheidung (0..4)
  let hist = [];         // pro Entscheidung: {snap, ctx, last, attempts[], final}
  let mode = 'start';    // start | decide | anim | feedback | replay | end
  let sel = null;        // {action, step, playerId}
  let hintView = null;   // {ids, goal, point}
  let marker = null;     // Zielmarkierung während der Animation
  let replay = null;     // {queue:[{frames,label}], i, f, acc, onDone}
  let tickCount = 0;

  // ------------------------------------------------------------ Darstellung
  const VIEW = { x0: -2.2, y0: -1.6, w: 40.4, h: 27.2 };
  let scale = 20, offX = 0, offY = 0, dpr = 1;

  function resize() {
    const r = wrap.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    scale = Math.min(r.width / VIEW.w, r.height / VIEW.h);
    const cw = VIEW.w * scale, ch = VIEW.h * scale;
    cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    offX = (r.width - cw) / 2; offY = (r.height - ch) / 2;
    cv.style.left = offX + 'px'; cv.style.top = offY + 'px';
    $('portraitTip').hidden = !(window.innerHeight > window.innerWidth * 1.15);
  }
  const X = (x) => (x - VIEW.x0) * scale * dpr;
  const Y = (y) => (y - VIEW.y0) * scale * dpr;
  const M = (m) => m * scale * dpr;

  function viewFromState(s) {
    return { players: s.players.map((p) => ({ id: p.id, team: p.team, num: p.num, x: p.x, y: p.y })), ball: { x: s.ball.x, y: s.ball.y }, owner: s.ball.owner, score: s.score };
  }
  function viewFromFrame(f, base) {
    const players = base.players.map((p, i) => ({ id: p.id, team: p.team, num: p.num, x: f[i * 2], y: f[i * 2 + 1] }));
    const oi = f[f.length - 1];
    return { players, ball: { x: f[f.length - 3], y: f[f.length - 2] }, owner: oi >= 0 ? players[oi].id : null };
  }

  function drawField(now) {
    const W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    // Rasen
    const stripes = 9;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 ? '#3fa34d' : '#47ad55';
      const x0 = F.W / stripes * i;
      ctx.fillRect(X(x0), Y(-1.6), M(F.W / stripes) + 1, M(VIEW.h));
    }
    ctx.fillStyle = '#3a9747';
    ctx.fillRect(0, 0, X(0), H); ctx.fillRect(X(F.W), 0, W - X(F.W), H);
    // Linien
    ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = M(0.14);
    ctx.strokeRect(X(0), Y(0), M(F.W), M(F.H));
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath(); ctx.moveTo(X(F.W / 2), Y(0)); ctx.lineTo(X(F.W / 2), Y(F.H)); ctx.stroke();
    ctx.beginPath(); ctx.arc(X(F.W / 2), Y(F.H / 2), M(3), 0, Math.PI * 2); ctx.stroke();
    // Torschusszonen
    ctx.setLineDash([M(0.6), M(0.45)]); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = M(0.12);
    [F.ZONE, F.W - F.ZONE].forEach((x) => { ctx.beginPath(); ctx.moveTo(X(x), Y(0)); ctx.lineTo(X(x), Y(F.H)); ctx.stroke(); });
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(37,99,235,.07)'; ctx.fillRect(X(0), Y(0), M(F.ZONE), M(F.H));
    ctx.fillStyle = 'rgba(225,29,72,.07)'; ctx.fillRect(X(F.W - F.ZONE), Y(0), M(F.ZONE), M(F.H));
    // Tore
    F.goals.blue.forEach((g, i) => drawGoal(g, -1, '#2563eb', false));
    F.goals.red.forEach((g, i) => drawGoal(g, 1, '#e11d48', isGoalHighlighted(i, now), i));
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
    ctx.fillRect(X(x), Y(g.y - w / 2), M(depth), M(w));
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = M(0.05);
    for (let k = 0.3; k < w; k += 0.4) { ctx.beginPath(); ctx.moveTo(X(x), Y(g.y - w / 2 + k)); ctx.lineTo(X(x + depth), Y(g.y - w / 2 + k)); ctx.stroke(); }
    ctx.strokeStyle = col; ctx.lineWidth = M(0.2);
    ctx.strokeRect(X(x), Y(g.y - w / 2), M(depth), M(w));
    if (hl) {
      const p = 0.5 + 0.5 * Math.sin(performance.now() / 180);
      ctx.strokeStyle = hl === 'hint' ? `rgba(255,214,10,${0.6 + 0.4 * p})` : `rgba(255,255,255,${0.5 + 0.5 * p})`;
      ctx.lineWidth = M(0.22); ctx.setLineDash([M(0.4), M(0.3)]);
      ctx.beginPath(); ctx.arc(X(g.x), Y(g.y), M(2.3 + p * 0.3), 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
  }

  function drawPlayers(v, opts) {
    const now = performance.now();
    const pulse = 0.5 + 0.5 * Math.sin(now / 170);
    const cand = opts.candidates || [];
    // Schatten
    for (const p of v.players) {
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      ctx.beginPath(); ctx.ellipse(X(p.x + 0.15), Y(p.y + 0.35), M(0.85), M(0.55), 0, 0, Math.PI * 2); ctx.fill();
    }
    for (const p of v.players) {
      const r = 0.85;
      if (v.owner === p.id) {
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), M(r + 0.45), 0, Math.PI * 2); ctx.fill();
      }
      if (cand.includes(p.id)) {
        ctx.strokeStyle = `rgba(255,255,255,${0.55 + 0.45 * pulse})`; ctx.lineWidth = M(0.16);
        ctx.setLineDash([M(0.35), M(0.25)]);
        ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), M(r + 0.55 + pulse * 0.2), 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      }
      if (hintView && hintView.ids && hintView.ids.includes(p.id)) {
        ctx.strokeStyle = `rgba(255,214,10,${0.6 + 0.4 * pulse})`; ctx.lineWidth = M(0.24);
        ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), M(r + 0.75 + pulse * 0.25), 0, Math.PI * 2); ctx.stroke();
      }
      if (opts.selected === p.id) {
        ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = M(0.26);
        ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), M(r + 0.45), 0, Math.PI * 2); ctx.stroke();
      }
      const g = ctx.createRadialGradient(X(p.x - 0.3), Y(p.y - 0.35), M(0.1), X(p.x), Y(p.y), M(r));
      if (p.team === 'blue') { g.addColorStop(0, '#60a5fa'); g.addColorStop(1, '#1d4ed8'); }
      else { g.addColorStop(0, '#fb7185'); g.addColorStop(1, '#be123c'); }
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), M(r), 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = M(0.13); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = `800 ${M(0.95)}px ui-rounded, "SF Pro Rounded", "Nunito", system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(p.num), X(p.x), Y(p.y) + M(0.04));
    }
    // Ball
    const b = v.ball;
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath(); ctx.ellipse(X(b.x + 0.1), Y(b.y + 0.22), M(0.36), M(0.22), 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111'; ctx.lineWidth = M(0.07);
    ctx.beginPath(); ctx.arc(X(b.x), Y(b.y), M(0.38), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(X(b.x), Y(b.y), M(0.13), 0, Math.PI * 2); ctx.fill();
  }

  function drawMarker(pt, color) {
    const p = 0.5 + 0.5 * Math.sin(performance.now() / 160);
    ctx.strokeStyle = color; ctx.lineWidth = M(0.16);
    ctx.beginPath(); ctx.arc(X(pt.x), Y(pt.y), M(0.7 + p * 0.25), 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X(pt.x - 0.4), Y(pt.y)); ctx.lineTo(X(pt.x + 0.4), Y(pt.y));
    ctx.moveTo(X(pt.x), Y(pt.y - 0.4)); ctx.lineTo(X(pt.x), Y(pt.y + 0.4)); ctx.stroke();
  }

  function render() {
    const now = performance.now();
    drawField(now);
    let v;
    if (mode === 'replay' && replay) {
      const item = replay.queue[replay.i];
      v = viewFromFrame(item.frames[Math.min(replay.f, item.frames.length - 1)], viewFromState(S));
    } else if (S) v = viewFromState(S);
    if (!v) return;
    let candidates = [];
    let selected = null;
    if (mode === 'decide' && sel) {
      selected = sel.playerId || null;
      const c = E.carrier(S);
      if (sel.action === 'passen') candidates = S.players.filter((p) => p.team === 'blue' && p !== c).map((p) => p.id);
      if ((sel.action === 'freilaufen') && sel.step === 1) candidates = S.players.filter((p) => p.team === 'blue' && p !== c).map((p) => p.id);
      if ((sel.action === 'erobern' || sel.action === 'raum') && sel.step === 1) candidates = S.players.filter((p) => p.team === 'blue').map((p) => p.id);
    }
    if (hintView && hintView.point && mode === 'decide') drawMarker(hintView.point, 'rgba(255,214,10,.95)');
    if (marker && mode === 'anim') drawMarker(marker, 'rgba(255,255,255,.9)');
    drawPlayers(v, { candidates, selected });
    // Laufweg-Vorschau bei Auswahl
    if (mode === 'replay' && replay) {
      const lab = replay.queue[replay.i].label;
      ctx.font = `800 ${M(1.2)}px ui-rounded, system-ui, sans-serif`;
      const tw = ctx.measureText(lab).width + M(1.6);
      ctx.fillStyle = 'rgba(15,23,42,.75)';
      roundRect(X(F.W / 2) - tw / 2, Y(0.4), tw, M(2), M(1)); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(lab, X(F.W / 2), Y(1.4));
    }
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
      while (replay.acc >= 1) {
        replay.acc -= 1; replay.f++;
        const item = replay.queue[replay.i];
        if (replay.f >= item.frames.length + 20) {
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
    S = E.newState(); dec = 0; hist = []; hintView = null; marker = null;
    $('startScreen').hidden = true; $('endScreen').hidden = true;
    updateScore(); beginDecision(null);
  }

  function beginDecision(last) {
    if (dec >= MISSION.decisions) return endMission();
    const c = E.context(S, last);
    const prev = hist[dec];
    hist[dec] = { snap: E.clone(S), ctx: c, last, attempts: prev ? prev.attempts : [], final: null };
    hist.length = dec + 1;
    mode = 'decide'; sel = null; hintView = null; marker = null;
    updateProgress();
    $('tag').textContent = c.tag;
    $('tag').className = 'tag ' + (c.type === 'verteidigung' ? 'def' : 'att');
    $('title').textContent = c.title;
    $('decNo').textContent = `${dec + 1}/${MISSION.decisions}`;
    $('prompt').hidden = false;
    renderActions(c);
    Voice.say(c.say);
    if (c.actions.length === 1) chooseAction(c.actions[0], true);
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
    if (sel && sel.action === k && !silent) { sel = null; renderActions(hist[dec].ctx); setStepText(''); return; }
    sel = { action: k, step: 1, playerId: null };
    renderActions(hist[dec].ctx);
    const t = STEP_SAY[k][0];
    setStepText(t);
    if (!silent) Voice.say(t);
  }
  function setStepText(t) { $('step').textContent = t; $('step').hidden = !t; }

  function showHint() {
    const c = hist[dec].ctx;
    const k = sel ? sel.action : c.actions[0];
    if (!sel) chooseAction(k, true);
    hintView = E.hint(S, k);
    Voice.say(hintView.say);
    setStepText('💡 ' + hintView.say);
  }

  // ------------------------------------------------------------ Eingabe aufs Spielfeld
  function worldFromEvent(ev) {
    const r = cv.getBoundingClientRect();
    return { x: (ev.clientX - r.left) / scale + VIEW.x0, y: (ev.clientY - r.top) / scale + VIEW.y0 };
  }
  function hitPlayer(pt, filter) {
    let best = null, bd = 1.9;
    for (const p of S.players) { if (filter && !filter(p)) continue; const d = E.dist(p, pt); if (d < bd) { bd = d; best = p; } }
    return best;
  }
  cv.addEventListener('pointerdown', (ev) => {
    if (mode !== 'decide' || !sel) {
      if (mode === 'decide' && !sel) { Voice.say('Tippe zuerst unten auf einen Knopf.'); pulseActions(); }
      return;
    }
    const pt = worldFromEvent(ev);
    const c = E.carrier(S);
    const inField = pt.x > 0.3 && pt.x < F.W - 0.3 && pt.y > 0.3 && pt.y < F.H - 0.3;
    const k = sel.action;
    if (k === 'passen') {
      const p = hitPlayer(pt, (q) => q.team === 'blue' && q !== c);
      if (p) return act({ kind: 'pass', id: p.id }, p);
      if (inField && E.dist(pt, c) > 2) return act({ kind: 'pass', x: pt.x, y: pt.y }, pt);
    } else if (k === 'dribbeln') {
      if (inField && E.dist(pt, c) > 1) return act({ kind: 'dribble', x: pt.x, y: pt.y }, pt);
    } else if (k === 'schiessen') {
      const gi = F.goals.red.map((g) => E.dist(g, pt)).reduce((bi, d, i, arr) => (d < arr[bi] ? i : bi), 0);
      if (E.dist(F.goals.red[gi], pt) < 5 || pt.x > F.W - 4) return act({ kind: 'shoot', goal: gi }, F.goals.red[gi]);
      Voice.say('Tippe auf eines der roten Tore rechts.');
    } else if (k === 'freilaufen' || k === 'raum') {
      if (sel.step === 1) {
        const p = hitPlayer(pt, (q) => q.team === 'blue' && (k === 'raum' || q !== c));
        if (p) { Sfx.tap(); sel.playerId = p.id; sel.step = 2; const t = STEP_SAY[k][1]; setStepText(t); Voice.say(t); }
        return;
      }
      const p = hitPlayer(pt, (q) => q.team === 'blue' && (k === 'raum' || q !== c));
      if (p && E.dist(p, pt) < 1.1 && p.id !== sel.playerId) { sel.playerId = p.id; Sfx.tap(); return; }
      if (inField) return act({ kind: k === 'raum' ? 'cover' : 'run', id: sel.playerId, x: pt.x, y: pt.y }, pt);
    } else if (k === 'erobern') {
      const p = hitPlayer(pt, (q) => q.team === 'blue');
      if (p) return act({ kind: 'press', id: p.id }, null);
    }
  });
  function pulseActions() { const a = $('actions'); a.classList.remove('wiggle'); void a.offsetWidth; a.classList.add('wiggle'); }

  function act(a, mark) {
    Voice.stop(); Sfx.tap();
    hintView = null;
    marker = mark ? { x: mark.x, y: mark.y } : null;
    hist[dec].action = a;
    E.startAction(S, a);
    mode = 'anim'; sel = null; acc = 0;
    $('actions').innerHTML = ''; $('cancel').hidden = true; setStepText('');
    $('prompt').classList.add('dim');
  }

  function finishEpisode() {
    const fb = E.feedback(S);
    const attempt = { frames: S.ep.frames, fb, a: S.ep.a, endState: E.clone(S) };
    const h = hist[dec];
    h.attempts.push(attempt); h.final = attempt;
    mode = 'feedback'; marker = null;
    $('prompt').classList.remove('dim');
    showFeedback(fb, h);
  }

  function showFeedback(fb, h) {
    $('fbIcon').textContent = fb.icon;
    $('fbText').textContent = fb.text;
    $('fbWhy').textContent = (fb.good ? '⭐ ' : '💭 ') + fb.why;
    $('fbWhy').className = 'why ' + (fb.good ? 'good' : 'think');
    $('fbCompare').hidden = h.attempts.length < 2;
    $('fbNext').querySelector('.lbl').textContent = dec + 1 >= MISSION.decisions ? 'Fertig' : 'Weiterspielen';
    $('feedback').hidden = false;
    if (fb.good) Sfx.good();
    updateProgress();
    Voice.say(fb.say);
  }

  function retry() {
    $('feedback').hidden = true;
    const h = hist[dec];
    S = E.clone(h.snap);
    h.final = null;
    updateScore();
    Voice.say('Gleiche Situation – probier etwas anderes!');
    beginDecision(h.last);
  }
  function next() {
    $('feedback').hidden = true;
    const h = hist[dec];
    const last = { kind: h.final.a.kind, success: h.final.fb.success, team: 'blue' };
    dec++;
    beginDecision(last);
  }
  function compare() {
    const h = hist[dec];
    const n = h.attempts.length;
    const a1 = h.attempts[n - 2], a2 = h.attempts[n - 1];
    $('feedback').hidden = true;
    startReplay([
      { frames: a1.frames, label: 'Vorher', say: 'Vorher. ' + a1.fb.text },
      { frames: a2.frames, label: 'Jetzt', say: 'Jetzt. ' + a2.fb.text },
    ], () => { S = E.clone(h.final.endState); $('feedback').hidden = false; mode = 'feedback'; });
    Voice.say('Vorher. ' + a1.fb.text);
  }
  function startReplay(queue, onDone) {
    mode = 'replay';
    replay = { queue, i: 0, f: 0, acc: 0, onDone };
    $('prompt').hidden = true;
    $('skip').hidden = false;
    const done = replay.onDone;
    replay.onDone = () => { $('skip').hidden = true; $('prompt').hidden = mode === 'end'; done(); };
  }

  function endMission() {
    mode = 'end';
    updateProgress();
    const good = hist.filter((h) => h.final && h.final.fb.good).length;
    $('stars').innerHTML = Array.from({ length: MISSION.decisions }, (_, i) => `<span class="${i < good ? 'on' : ''}">★</span>`).join('');
    $('endScore').textContent = `Blau ${S.score.blue} : ${S.score.red} Rot`;
    const lines = [];
    const types = hist.map((h) => h.ctx.type);
    let msg = good >= 4 ? 'Super gespielt!' : good >= 2 ? 'Gut gemacht!' : 'Toll, dass du es probiert hast!';
    if (types.includes('verteidigung') && types.some((t) => t !== 'verteidigung')) msg += ' Ihr habt angegriffen und eure Tore beschützt.';
    msg += ' Denk daran: Wenn ein Freund den Ball hat, kannst du ihm helfen, indem du dich freiläufst!';
    $('endMsg').textContent = msg;
    $('endList').innerHTML = hist.map((h, i) => `<li class="${h.final.fb.good ? 'good' : ''}"><b>${i + 1}</b> ${h.ctx.title} <span>${h.final.fb.good ? '⭐' : '💭'}</span></li>`).join('');
    $('prompt').hidden = true;
    $('endScreen').hidden = false;
    Voice.say(msg + ` Du hast ${good} von ${MISSION.decisions} Sternen.`);
  }
  function highlights() {
    $('endScreen').hidden = true;
    const q = hist.map((h, i) => ({ frames: h.final.frames, label: `${i + 1}. ${h.ctx.title}`, say: '' }));
    startReplay(q, () => { mode = 'end'; $('endScreen').hidden = false; $('prompt').hidden = true; });
    mode = 'replay';
  }

  // ------------------------------------------------------------ Anzeigen
  function updateProgress() {
    const box = $('progress'); box.innerHTML = '';
    for (let i = 0; i < MISSION.decisions; i++) {
      const d = document.createElement('span');
      const h = hist[i];
      d.className = 'dot' + (i === dec && mode !== 'end' ? ' cur' : '') + (h && h.final ? (h.final.fb.good ? ' star' : ' done') : '');
      d.textContent = h && h.final ? (h.final.fb.good ? '★' : '✓') : String(i + 1);
      box.appendChild(d);
    }
  }
  function updateScore() { if (S) $('score').textContent = `${S.score.blue} : ${S.score.red}`; }

  function confetti(teamName) {
    const box = $('confetti'); box.innerHTML = '';
    const cols = teamName === 'blue' ? ['#2563eb', '#60a5fa', '#ffd60a', '#fff'] : ['#e11d48', '#fb7185', '#fff'];
    for (let i = 0; i < 60; i++) {
      const s = document.createElement('i');
      s.style.left = Math.random() * 100 + '%';
      s.style.background = cols[i % cols.length];
      s.style.animationDelay = Math.random() * 0.4 + 's';
      s.style.transform = `rotate(${Math.random() * 360}deg)`;
      box.appendChild(s);
    }
    $('goalBanner').textContent = teamName === 'blue' ? 'TOOOR! ⚽' : 'Tor für Rot';
    $('goalBanner').className = 'goalBanner show ' + teamName;
    setTimeout(() => { box.innerHTML = ''; $('goalBanner').className = 'goalBanner'; }, 1800);
  }

  // ------------------------------------------------------------ Verdrahtung
  $('play').onclick = () => { Sfx.ctx(); Voice.init(); Voice.say('Los geht\'s! Du spielst mit den Blauen.'); setTimeout(startMission, 50); };
  $('again').onclick = () => startMission();
  $('home').onclick = () => { Voice.stop(); mode = 'start'; $('feedback').hidden = true; $('endScreen').hidden = true; $('startScreen').hidden = false; };
  $('home2').onclick = $('home').onclick;
  $('hl').onclick = () => highlights();
  $('fbRetry').onclick = () => retry();
  $('fbNext').onclick = () => next();
  $('fbCompare').onclick = () => compare();
  $('cancel').onclick = () => { sel = null; hintView = null; renderActions(hist[dec].ctx); setStepText(''); };
  $('repeat').onclick = () => Voice.say(hist[dec] ? hist[dec].ctx.say : '');
  $('skip').onclick = () => { if (replay) { const d = replay.onDone; replay = null; d(); } };
  $('sound').onclick = () => { Voice.on = !Voice.on; $('sound').textContent = Voice.on ? '🔊' : '🔇'; if (!Voice.on) Voice.stop(); };

  window.addEventListener('resize', resize);
  resize();
  S = E.newState(); // Hintergrund auf dem Startbildschirm
  updateScore(); updateProgress();
  requestAnimationFrame(loop);

  // PWA: Service Worker (funktioniert nur bei eigenem Hosting, nicht in eingebetteten Vorschauen)
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    try { navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) {}
  }
})();
