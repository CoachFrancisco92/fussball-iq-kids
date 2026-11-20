/* Fußball-IQ Kids – Oberfläche, Steuerung, Sprache, Wiederholen & Vergleichen (V0.2) */
(function () {
  'use strict';
  const APP_VERSION = '0.6.2';
  // Schutz gegen gemischte Cache-Stände (neue Seite + altes Skript oder umgekehrt)
  try {
    const htmlV = (document.querySelector('meta[name="app-version"]') || {}).content;
    if (htmlV !== APP_VERSION || (window.FIQ && window.FIQ.VERSION !== APP_VERSION)) {
      if (!sessionStorage.getItem('fiq-reloaded')) { sessionStorage.setItem('fiq-reloaded', '1'); location.reload(); return; }
    } else sessionStorage.removeItem('fiq-reloaded');
  } catch (e) {}
  const E = window.FIQ, F = E.F;
  // M3: Missionsauswahl. Reihenfolge = empfohlener Weg (Lernwelt, dann Nummer); nichts wird gespeichert.
  const MISSIONS = E.missions().slice().sort((a, b) => (a.lernwelt - b.lernwelt) || (a.nummer - b.nummer));
  let curId = MISSIONS[0].id;
  const runs = {};                              // Durchläufe je Mission in dieser Sitzung (M1: nächste Situationen)
  const played = {};                            // in dieser Sitzung gespielte Missionen (✓ auf der Karte; nichts wird gespeichert)
  const T = () => E.texts(curId);              // Textkatalog inkl. Missions-Texte (content/texte.js)
  const SIM_SPEED = 0.85;
  const MIN_TAP_PX = 34;           // Mindest-Tippradius in Pixeln (kleine Handys)

  // ------------------------------------------------------------ DOM
  const $ = (id) => document.getElementById(id);
  const cv = $('field'), ctx = cv.getContext('2d');
  const wrap = $('fieldWrap');

  // ------------------------------------------------------------ Sprache & Töne
  // V0.5.1: zentrale Sprachsteuerung (sprache.js). Alle Ansagen und alle zeitgesteuerten Übergänge
  // laufen hierüber – keine verstreuten setTimeout mehr im Ablauf.
  const hasSpeech = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  const Sprache = window.FIQSprache.erstelle({
    synth: hasSpeech ? window.speechSynthesis : null,
    Utterance: hasSpeech ? SpeechSynthesisUtterance : null,
    now: () => performance.now(),
    rate: 0.9, pitch: 1.05,
    pickVoice: (all) => {
      const vs = all.filter((v) => /^de/i.test(v.lang));
      return vs.find((v) => /anna|petra|helena|katja|google|female/i.test(v.name)) || vs[0] || null;
    },
  });
  if (hasSpeech) {
    try { speechSynthesis.addEventListener('voiceschanged', () => Sprache.stimmenGeaendert()); } catch (e) {}
    document.addEventListener('visibilitychange', () => { if (!document.hidden) Sprache.fortsetzen(); });
  }
  // Gesprochen wird die Aussprache-Fassung des angezeigten Texts (content/texte.js → sprechtext, z. B. „Toooor!“ → „Tor!“)
  const say = (t, art, sofort, merken) => { const tx = T(); Sprache.sage(tx.sprechtext ? tx.sprechtext(t || '') : t, { art, sofort, merken }); };
  const Sfx = {
    ac: null,
    ctx() { if (!this.ac) { try { this.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return this.ac; },
    tone(f, d, type, vol, when) {
      const ac = this.ctx(); if (!ac || !Sprache.an) return;
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
  let curRun = 0;        // Durchlauf der laufenden Mission (für „Neu starten“ und „Genau so nochmal“)
  let pausiert = false;  // Neustart-Abfrage offen: Simulation und Ablauf stehen
  // V0.6a P4: Lernsituationen – je Situation (Lernmission) bzw. je Feld Angriff/Abwehr (Mission 1)
  let lernStarts = {};   // key -> {start: E.lernStart(...), dec}
  let lernErgebnis = {}; // key -> Ergebnis von E.lernAuswertung (gesetzt, sobald die Situation zu Ende ist)
  let lernView = null;   // P5: sichtbare Ursachen nach der Aktion (Lücke, Wächter vorher, Vorbei-Moment, Passweg)
  let folgeView = null;  // V0.6.2: Folge-Moment {gegner:[{id,von,nach}], tore, gruende, t0} – bleibt bis zur nächsten Entscheidung sichtbar
  let folgeWeiter = null; // V0.6.2: Fortsetzung nach dem Folge-Moment (Antippen überspringt)
  let kurzInfo = null;   // P3: letzte Kurzrückmeldung {fb, dec} – ↶ und 🔈 bis zur nächsten Aktion

  // ------------------------------------------------------------ Darstellung
  const VIEW_GANZ = { x0: -2.2, y0: -1.6, w: 40.4, h: 27.2 };
  // V0.6a P5: ruhige Rahmung – Lernmissionen spielen in der rechten Feldhälfte. Fester Ausschnitt je Mission (wechselt
  // nie innerhalb einer Mission): ganze Feldhöhe mit Linien und beiden Toren, der leere linke Teil entfällt.
  const VIEW_LERNEN = { x0: 6, y0: -0.8, w: 32.0, h: 25.6 };
  const VIEW = { ...VIEW_GANZ };
  function setzeRahmen() {
    const def = MISSIONS.find((m) => m.id === curId), v = def && def.art === 'lernen' && def.situationen ? VIEW_LERNEN : VIEW_GANZ;
    Object.assign(VIEW, v); resize();
  }
  let scale = 20, dpr = 1;

  /** Nach jeder Änderung, die die Höhe von Kopf- oder Bedienleiste ändert, sofort neu vermessen.
   *  Sonst zeigt das Spielfeld bis zum nächsten Frame die alte Größe, obwohl die App schon bereit
   *  für Eingaben ist – ein Tipp in diesem Moment landet daneben (Ursache des roten CI-Laufs e7cb504). */
  function syncLayout() { resize(); }
  // V0.6.2: Die Rückmeldung darf das Spielfeld nicht verkleinern. Im Querformat steht das Rückmeldeblatt deshalb rechts
  // neben dem Feld (wie auf dem Handy quer), wenn das Feld dort mindestens so groß bleibt wie beim Entscheiden.
  let spielScale = 0;
  const feldScale = () => { const r = wrap.getBoundingClientRect(); return Math.min(r.width / VIEW.w, r.height / VIEW.h); };
  function resize() {
    const app = $('app'), blatt = !!($('feedback') && !$('feedback').hidden);
    if (!blatt) { app.classList.remove('blattSeite'); spielScale = feldScale(); }
    else if (!app.classList.contains('blattSeite') && window.innerWidth >= 900 && window.innerWidth / window.innerHeight >= 1.2) {
      app.classList.add('blattSeite');
      if (spielScale && feldScale() < spielScale * 0.97) app.classList.remove('blattSeite');
    }
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
      ctx.beginPath(); ctx.ellipse(X(p.x + 0.15), Y(p.y + 0.4), Mm(R_SPIELER), Mm(R_SPIELER * 0.65), 0, 0, Math.PI * 2); ctx.fill();
    }
    // Ballführender zuletzt gezeichnet: bleibt sichtbar, auch wenn ein Gegner ganz nah ist (größere Spieler überlappen bei 1,4 m)
    const reihe = v.players.slice().sort((a, b) => (a.id === v.owner) - (b.id === v.owner));
    for (const p of reihe) {
      const r = R_SPIELER;
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
      // P5: Blickrichtung – Ballführender schaut in Angriffsrichtung, alle anderen schauen zum Ball
      const w = v.owner === p.id ? (p.team === 'blue' ? 0 : Math.PI) : Math.atan2(v.ball.y - p.y, v.ball.x - p.x);
      const nx = p.x + Math.cos(w) * (r + 0.42), ny = p.y + Math.sin(w) * (r + 0.42);
      ctx.fillStyle = p.team === 'blue' ? '#1e3a8a' : '#881337';
      ctx.beginPath();
      ctx.moveTo(X(nx), Y(ny));
      ctx.lineTo(X(p.x + Math.cos(w + 0.42) * (r - 0.05)), Y(p.y + Math.sin(w + 0.42) * (r - 0.05)));
      ctx.lineTo(X(p.x + Math.cos(w - 0.42) * (r - 0.05)), Y(p.y + Math.sin(w - 0.42) * (r - 0.05)));
      ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = Mm(0.08); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = FONT(Mm(1.15));
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(p.num), X(p.x), Y(p.y) + Mm(0.04));
    }
    drawBall(v);
  }

  // ---------- V0.6.2: Ball als klassischer schwarz-weißer Fußball (2D-Vektorgrafik, nur Darstellung)
  // Grafischer Radius 0,46 m (vorher 0,38 m), mindestens 7 CSS-Pixel; die Spielmechanik (Position, Kollision) bleibt unverändert.
  // Muster: Fünfeck in der Mitte, fünf angeschnittene Fünfecke am Rand, Nähte dazwischen (Sechsecke); unter 9 CSS-Pixeln
  // vereinfacht (ohne Nähte), damit es auch klein als Fußball erkennbar bleibt. Einmal je Pixelgröße
  // vorgezeichnet (Zwischenspeicher) – keine Mehrkosten pro Bild.
  const R_BALL = 0.46, BALL_MIN_CSS = 7;
  const ballCache = new Map();
  function ballSprite(rPx) {
    const key = Math.round(rPx * 2) / 2, ck = key + '@' + dpr;
    if (ballCache.has(ck)) return ballCache.get(ck);
    const pad = 2, size = Math.ceil(key * 2 + pad * 2), c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d'), m = size / 2, R = key, klein = key / dpr < 9;
    const P = (cx, cy, r, rot) => { const pts = []; for (let i = 0; i < 5; i++) { const w = rot + (i * 2 * Math.PI) / 5; pts.push([cx + Math.cos(w) * r, cy + Math.sin(w) * r]); } return pts; };
    const flach = (pts, cx, cy, w, k) => pts.map(([x, y]) => { const dx = x - cx, dy = y - cy, ux = Math.cos(w), uy = Math.sin(w); const a = dx * ux + dy * uy, b = -dx * uy + dy * ux; return [cx + ux * a * k - uy * b, cy + uy * a * k + ux * b]; });
    const poly = (pts) => { g.beginPath(); pts.forEach(([x, y], i) => g[i ? 'lineTo' : 'moveTo'](x, y)); g.closePath(); };
    const grad = g.createRadialGradient(m - R * 0.35, m - R * 0.4, R * 0.1, m, m, R);
    grad.addColorStop(0, '#ffffff'); grad.addColorStop(1, '#d9dee5');
    g.fillStyle = grad; g.beginPath(); g.arc(m, m, R, 0, Math.PI * 2); g.fill();
    g.save(); g.beginPath(); g.arc(m, m, R, 0, Math.PI * 2); g.clip();
    const ink = '#16181c'; g.fillStyle = ink; g.strokeStyle = ink;
    const rot = -Math.PI / 2, pc = R * 0.36, dist = R * 0.9, po = R * 0.34, fk = 0.62;
    const mitte = P(m, m, pc, rot); poly(mitte); g.fill();
    const aussen = [];
    for (let k = 0; k < 5; k++) {
      const w = rot + (k * 2 * Math.PI) / 5, cx = m + Math.cos(w) * dist, cy = m + Math.sin(w) * dist;
      const pts = flach(P(cx, cy, po, w + Math.PI), cx, cy, w, fk); aussen.push(pts); poly(pts); g.fill();
    }
    if (!klein) {
      g.lineWidth = Math.max(1, R * 0.05); g.lineCap = 'round'; g.lineJoin = 'round';
      for (let k = 0; k < 5; k++) {
        const w = rot + (k * 2 * Math.PI) / 5;
        // Naht Mitte-Ecke → innere Ecke des Randfünfecks
        g.beginPath(); g.moveTo(...mitte[k]); g.lineTo(...aussen[k][0]); g.stroke();
        // Sechseck-Außenkante: nächstgelegene Ecken benachbarter Randfünfecke verbinden
        const n = aussen[(k + 1) % 5]; let best = null;
        for (const pa of aussen[k]) for (const pb of n) { const d = Math.hypot(pa[0] - pb[0], pa[1] - pb[1]); if (!best || d < best[0]) best = [d, pa, pb]; }
        g.beginPath(); g.moveTo(...best[1]); g.lineTo(...best[2]); g.stroke();
      }
    }
    g.restore();
    g.lineWidth = Math.max(1, R * 0.09); g.strokeStyle = ink;
    g.beginPath(); g.arc(m, m, R - g.lineWidth / 2, 0, Math.PI * 2); g.stroke();
    const sprite = { c, m };
    if (ballCache.size > 24) ballCache.clear();
    ballCache.set(ck, sprite);
    return sprite;
  }
  // Liegt der Ball beim Ballführenden näher als 1,05 m an dessen Mitte (Simulation: ruhend = Spielermitte, Mission 1 teils
  // 0,4 m davor), zeigen wir ihn vorn am Fuß (1,05 m, wie beim Dribbling) – in Richtung des Balls, bei Ball in der Mitte in
  // Angriffsrichtung. So verdeckt er weder Figur noch Nummer, und der Besitz ist eindeutig. Fliegt er danach los, klingt der
  // Versatz auf den ersten 2 m Flugweg gleichmäßig aus (kein Rücksprung). Reine Darstellung: Simulation, Kollision, Wege unverändert.
  const BALL_VOR = 1.05;
  let ballHalt = null, ballZuletzt = null;
  function ballAnzeige(v) {
    const b = v.ball, o = v.owner && v.players.find((p) => p.id === v.owner);
    if (o) {
      const dx = b.x - o.x, dy = b.y - o.y, d = Math.hypot(dx, dy);
      if (d < BALL_VOR - 0.01) {
        const ux = d > 0.05 ? dx / d : (o.team === 'blue' ? 1 : -1), uy = d > 0.05 ? dy / d : 0;
        const ziel = { x: o.x + ux * BALL_VOR, y: o.y + uy * BALL_VOR };
        ballHalt = { x: b.x, y: b.y, ox: ziel.x - b.x, oy: ziel.y - b.y };
        return ziel;
      }
      ballHalt = null; return b;
    }
    if (ballHalt) {
      const f = Math.max(0, 1 - Math.hypot(b.x - ballHalt.x, b.y - ballHalt.y) / 2);
      if (f > 0) return { x: b.x + ballHalt.ox * f, y: b.y + ballHalt.oy * f };
    }
    return b;
  }
  function drawBall(v) {
    const b = ballAnzeige(v);
    const rPx = Math.max(Mm(R_BALL), BALL_MIN_CSS * dpr);
    ctx.fillStyle = 'rgba(0,0,0,.25)';                                       // Schatten
    ctx.beginPath(); ctx.ellipse(X(b.x) + rPx * 0.2, Y(b.y) + rPx * 0.55, rPx * 0.95, rPx * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    const sp = ballSprite(rPx);
    ballZuletzt = { x: b.x, y: b.y, rCss: rPx / dpr, owner: v.owner || null };
    ctx.drawImage(sp.c, Math.round(X(b.x) - sp.m), Math.round(Y(b.y) - sp.m));
  }

  const R_SPIELER = 1.02; // V0.6a P5: Spieler ca. 20 % größer (vorher 0,85 m; 25 % überdeckt den Ballführenden beim Pressing zu stark); Tippflächen unverändert

  /** P5: belegte Ursachen sichtbar machen (nur nach der Aktion: Rückmeldung und Kurzrückmeldung) */
  function drawLern(lv) {
    if (!lv) return;
    if (lv.passweg) arrow(lv.passweg.from, lv.passweg.to, 'rgba(34,197,94,.9)', 0.24, true);
    if (lv.luecke) {
      const { a, b, ok } = lv.luecke;
      for (const q of [a, b]) ring(q.x, q.y, R_SPIELER, 'rgba(255,255,255,.9)', 0.1, true); // wo das Paar vorher stand
      ctx.strokeStyle = ok ? 'rgba(34,197,94,.95)' : 'rgba(255,59,48,.95)'; ctx.lineWidth = Mm(0.22); ctx.lineCap = 'round';
      ctx.setLineDash([Mm(0.3), Mm(0.22)]);
      ctx.beginPath(); ctx.moveTo(X(a.x), Y(a.y)); ctx.lineTo(X(b.x), Y(b.y)); ctx.stroke(); ctx.setLineDash([]);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      ctx.fillStyle = ok ? 'rgba(34,197,94,.95)' : 'rgba(255,59,48,.95)';
      ctx.beginPath(); ctx.arc(X(mx), Y(my), Mm(0.75), 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = Mm(0.1); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = FONT(Mm(1.05)); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(ok ? '✓' : '✗', X(mx), Y(my) + Mm(0.03));
    }
    if (lv.waechter) {
      // vorher (blasser Schatten) → jetzt
      const { alt, neu } = lv.waechter;
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = Mm(0.12); ctx.setLineDash([Mm(0.25), Mm(0.2)]);
      ctx.fillStyle = 'rgba(190,18,60,.28)';
      ctx.beginPath(); ctx.arc(X(alt.x), Y(alt.y), Mm(R_SPIELER), 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
      arrow(alt, neu, 'rgba(255,255,255,.85)', 0.16, true);
    }
    if (lv.vorbei && lv.vorbei.at) {
      const t = (performance.now() - lv.vorbei.t0) / 600;
      if (t >= 0 && t <= 1) {
        ctx.globalAlpha = 1 - t * t;
        ctx.font = FONT(Mm(1.5)); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = Mm(0.25); ctx.strokeStyle = 'rgba(15,23,42,.8)'; ctx.fillStyle = '#ffd60a';
        const yy = lv.vorbei.at.y - 2 - t * 0.8;
        ctx.strokeText(lv.vorbei.text, X(lv.vorbei.at.x), Y(yy)); ctx.fillText(lv.vorbei.text, X(lv.vorbei.at.x), Y(yy));
        ctx.globalAlpha = 1;
      }
    }
  }
  /** V0.6.2: Folge-Moment zeichnen – woher die beteiligten Roten kamen (Schatten + Spur) und welche Tore sich verändert
   *  haben (neutraler Ring „!“, ohne frei/zu zu verraten). Im Folge-Moment kräftig, danach (Rückmeldung) zurückhaltend. */
  function drawFolge(fv, stark) {
    const a = stark ? 1 : 0.55;
    for (const g of fv.gegner) {
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(190,18,60,.25)'; ctx.strokeStyle = '#fff'; ctx.lineWidth = Mm(0.12); ctx.setLineDash([Mm(0.25), Mm(0.2)]);
      ctx.beginPath(); ctx.arc(X(g.von.x), Y(g.von.y), Mm(R_SPIELER), 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
      if (Math.hypot(g.nach.x - g.von.x, g.nach.y - g.von.y) > R_SPIELER * 1.6) arrow(g.von, g.nach, 'rgba(255,255,255,.95)', 0.2, true);
      ctx.globalAlpha = 1;
    }
    if (stark && fv.tore.length) {
      const t = ((performance.now() - fv.t0) % 900) / 900, puls = 0.75 + 0.25 * Math.sin(t * Math.PI * 2);
      for (const g of fv.tore) {
        const gx = F.goals.red[g].x, gy = F.goals.red[g].y;
        ctx.strokeStyle = 'rgba(255,214,10,' + puls + ')'; ctx.lineWidth = Mm(0.35);
        ctx.beginPath(); ctx.arc(X(gx - 0.2), Y(gy), Mm(1.9), 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#ffd60a'; ctx.beginPath(); ctx.arc(X(gx + 1.1), Y(gy - 2.6), Mm(0.75), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#5c4300'; ctx.font = FONT(Mm(1.1)); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('!', X(gx + 1.1), Y(gy - 2.6) + Mm(0.05));
      }
    }
  }
  /** P5: Darstellung der Ursachen aus der Rückmeldung (fb.ursachen) und der Lage vor der Aktion (S.ep.vorher) */
  function lernViewAus(fb) {
    const v = S.ep && S.ep.vorher; if (!v || !fb.ursachen || !fb.ursachen.length) return null;
    const at = (id) => (v.pos[id] ? { x: v.pos[id][0], y: v.pos[id][1] } : null), jetzt = (id) => { const p = E.P(S, id); return p ? { x: p.x, y: p.y } : null; };
    const lv = {}, U = (t) => fb.ursachen.find((u) => u.typ === t);
    const lu = U('lueckeDurch') || U('lueckeZuEng');
    if (lu) lv.luecke = { a: at(lu.paar[0]), b: at(lu.paar[1]), ok: lu.typ === 'lueckeDurch' };
    const w = U('waechterVerschoben') || U('waechterErkannt');
    if (w && v.prev && v.prev[w.gegner]) lv.waechter = { alt: { x: v.prev[w.gegner][0], y: v.prev[w.gegner][1] }, neu: at(w.gegner) };
    if (U('ueberspielt') && fb.good) { const c = E.carrier(S); if (c) lv.vorbei = { at: { x: c.x, y: c.y }, t0: performance.now(), text: T().lern.vorbeiMoment }; }
    const pw = U('passwegFrei'); if (pw) { const c = E.carrier(S), f = jetzt(pw.freund); if (c && f) lv.passweg = { from: { x: c.x, y: c.y }, to: f }; }
    return Object.keys(lv).length ? lv : null;
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
    // Passlinie (Freilaufen): grün = bei Ankunft anspielbar, rot = Passweg zu. Nur nach der Entscheidung sichtbar.
    if (ex.pass) arrow(ex.pass.from, ex.pass.to, ex.pass.ok ? 'rgba(34,197,94,.85)' : 'rgba(255,59,48,.8)', 0.2, true);
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
    if ((mode === 'feedback' || mode === 'kurz') && explainView) { drawExplain(explainView); Object.assign(opts, explainIds(explainView)); }
    if ((mode === 'folge' || mode === 'feedback' || mode === 'kurz') && folgeView) drawFolge(folgeView, mode === 'folge');
    drawPlayers(v, opts);
    // P5: Ursachen über den Spielern (die Lücke liegt dort, wo die Gegner vorher standen – sonst verdeckt)
    if ((mode === 'feedback' || mode === 'kurz' || mode === 'folge') && lernView) drawLern(mode === 'folge' ? { vorbei: lernView.vorbei } : lernView);
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
    if (pausiert) { /* Abfrage offen: nichts weiterlaufen lassen */ }
    else if (mode === 'anim') {
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
        // ~2,5 s Standbild mit Erklärung; weiter erst, wenn die Ansage zu Ende ist (höchstens ~10 s länger)
        if (replay.f >= item.frames.length + 75 && (Sprache.frei() || replay.f >= item.frames.length + 375)) {
          // Höchstzeit erreicht: noch laufende Ansage der alten Szene beenden (keine verspätete Ansage)
          if (!Sprache.frei()) Sprache.vorrang();
          replay.i++; replay.f = 0;
          if (replay.i >= replay.queue.length) { const done = replay.onDone; replay = null; done(); break; }
          say(replay.queue[replay.i].say || '', 'ansage');
        }
      }
    }
    const tapWeiter = $('tapWeiter');
    const tippen = mode === 'folge' || mode === 'wechsel' || mode === 'kurz' || mode === 'replay' || (mode === 'look' && lookView && lookView.done);
    if (tapWeiter.hidden === !!tippen) tapWeiter.hidden = !tippen;
    if (tippen) tapWeiter.textContent = mode === 'replay' ? 'Tippen: nächste Szene ⏭' : 'Tippen: weiter ⏭';
    tapWeiter.classList.toggle('replay', mode === 'replay');
    render();
    requestAnimationFrame(loop);
  }
  function onEvent(e) {
    if (e.type === 'goal') { Sfx.goal(); confetti(e.team); updateScore(); }
    if (e.type === 'steal' || e.type === 'intercepted' || e.type === 'blocked') Sfx.soft();
  }

  // ------------------------------------------------------------ Ablauf der Mission
  /** Startet die Mission curId im Durchlauf n (Standard: nächster Durchlauf dieser Sitzung).
   *  intro = Ansage vor der ersten Anweisung (wird nicht durch sie abgeschnitten). */
  function startMission(n, intro) {
    Sprache.abbrechen(); hideHand(); closeConfirm(false);
    curRun = n != null ? n : (runs[curId] || 0);
    S = E.newState(curId, curRun); M = E.newMission(curId, curRun); dec = 0; hist = [];
    hintView = null; marker = null; explainView = null; lookView = null; replay = null; sel = null;
    lernStarts = {}; lernErgebnis = {}; lernView = null; folgeView = null; folgeWeiter = null; kurzAus();
    setzeRahmen();
    $('startScreen').hidden = true; $('endScreen').hidden = true; $('feedback').hidden = true; $('skip').hidden = true;
    $('restart').hidden = false; $('prompt').classList.remove('dim');
    updateScore();
    if (intro) say(intro, 'ansage', true);
    beginDecision(null);
  }

  function beginDecision(last) {
    if (M.done) return endMission();
    Sprache.phase();
    const c = E.context(S, last);
    const prev = hist[dec];
    const key = lernKey(c);
    if (!lernStarts[key]) lernStarts[key] = { start: E.lernStart(S, situationsMission() ? null : key), dec };
    hist[dec] = { snap: E.clone(S), mission: E.clone(M), ctx: c, last, attempts: prev ? prev.attempts : [], final: null, look: prev ? prev.look : null, sit: key, usedHint: !!(prev && prev.usedHint) };
    hist.length = dec + 1;
    sel = null; hintView = null; marker = null; explainView = null; lookView = null; lernView = null; folgeView = null; folgeWeiter = null;
    updateProgress();
    setPrompt(c.tag, c.type === 'verteidigung' ? 'def' : 'att', c.title);
    if (E.lookBefore(S, c) && !hist[dec].look) return beginLook(c);
    startDecide(c, true);
  }

  // ---------- V0.6a P4: Lernsituationen
  const missionDef = () => MISSIONS.find((m) => m.id === curId);
  const situationsMission = () => { const d = missionDef(); return !!(d && Array.isArray(d.situationen) && d.situationen.length); };
  /** Schlüssel der Lernsituation: Situation (Lernmission) bzw. Feld Angriff/Abwehr (Mission 1) */
  function lernKey(c) { return situationsMission() ? 'S:' + S.situation : c.type === 'verteidigung' ? 'verteidigung' : 'angriff'; }
  function lernSchritte(key) {
    return hist.filter((h) => h.sit === key && h.final).map((h) => ({ ctxType: h.ctx.type, kind: h.final.a.kind, good: h.final.fb.good, ursachen: h.final.fb.ursachen, lern: h.final.fb.lern, hilfe: !!h.usedHint }));
  }
  function lernAuswerten(key) { const st = lernStarts[key]; return st ? E.lernAuswertung(st.start, lernSchritte(key)) : null; }
  /** Endet mit der eben abgeschlossenen Entscheidung die Lernsituation? (Gegenprobe am geklonten Zustand) */
  function situationEndet(key) {
    const s2 = E.clone(S), m2 = E.clone(M); E.missionApply(m2, s2);
    if (m2.done) return true;
    if (situationsMission()) return m2.note === 'situation' || s2.situation !== S.situation;
    return key === 'angriff' ? m2.phase !== 'attack' : m2.phase !== 'defense';
  }
  const lernTyp = (key) => (lernStarts[key] && lernStarts[key].start.typ) || null;

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
    if (speak) say(c.say, 'anweisung');
    if (c.actions.length === 1) chooseAction(c.actions[0], true);
    armIdle();
  }

  // ---------- Schau-Schritt: „Erst schauen, dann entscheiden“ (Review V0.1 Punkt 8, V0.2.1 Punkt A)
  // Das Kind tippt den freien Freund an – oder sagt „Keiner ist frei!“. Die Bewertung der Antwort
  // liegt in der Engine (E.lookAnswer, unabhängig testbar); hier nur Anzeige, Ton und Ablauf.
  function beginLook(c) {
    const t = T().schau;
    mode = 'look';
    lookView = { tries: 0 };
    setPrompt(t.tag, 'look', t.title);
    const box = $('actions'); box.innerHTML = ''; $('cancel').hidden = true;
    const b = document.createElement('button');
    b.className = 'act'; b.id = 'lookNone';
    b.innerHTML = `<span class="ico">${t.knopf.icon}</span><span>${t.knopf.label}</span>`;
    b.onclick = () => { if (mode === 'look' && !(lookView && lookView.done)) { Sfx.tap(); hideHand(); onLookAnswer(null); } };
    box.appendChild(b);
    setStepText(t.startAnzeige);
    say(t.start, 'anweisung');
    Sprache.merke(t.wiederholen);   // 🔈 im Schau-Schritt: die Frage noch einmal
    armIdle();
  }
  /** p = angetippter Mitspieler oder null für „Keiner ist frei“ */
  function onLookAnswer(p) {
    lookView.tries++;
    const r = E.lookAnswer(S, p ? p.id : null, lookView.tries);
    lookView.key = r.key; lookView.right = r.reveal; lookView.lane = r.lane;
    if (r.dribblePoint) hintView = { point: r.dribblePoint };
    if (r.right) Sfx.good(); else Sfx.soft();
    setStepText((r.right ? '✅ ' : '👀 ') + r.say);
    // Antwort auf ein Antippen: sofort. Solange die Frage offen bleibt, bleibt sie die „relevante“ Ansage für 🔈.
    say(r.say, 'rueckmeldung', true, !!r.finish);
    if (r.finish) {
      lookView.done = true;
      const b = $('lookNone'); if (b) b.disabled = true;
      hist[dec].look = { right: r.right, tries: lookView.tries };
      // weiter, wenn die Antwort zu Ende gesprochen ist (mind. 2 s Bild, höchstens 12 s)
      Sprache.wennFertig(() => { if (mode === 'look') { lookView = null; const hv = hintView; startDecide(hist[dec].ctx, false); hintView = hv; say(T().schau.weiter, 'anweisung'); } }, { min: 2000, max: 12000 });
    }
  }

  function renderActions(c) {
    const box = $('actions'); box.innerHTML = '';
    // V0.5.1: Nur eine Aktion möglich -> keine Aktionsauswahl, nur die Hilfe (Aktion ist schon gewählt)
    const single = c.actions.length === 1;
    box.classList.toggle('single', single);
    for (const k of single ? [] : c.actions) {
      const a = E.ACTIONS[k];
      const b = document.createElement('button');
      b.className = 'act' + (sel && sel.action === k ? ' on' : '');
      b.innerHTML = `<span class="ico">${a.icon}</span><span>${a.label}</span>`;
      b.onclick = () => { Sfx.tap(); chooseAction(k); };
      box.appendChild(b);
    }
    const h = document.createElement('button');
    h.className = 'act hint'; h.innerHTML = `<span class="ico">💡</span><span>${T().bedienung.hilfeKnopf}</span>`;
    h.onclick = () => { if (mode === 'decide') showHint(); };
    box.appendChild(h);
    $('cancel').hidden = !sel || single;
    syncLayout();
  }

  const STEP_SAY = (k) => T().bedienung.schritte[k];
  function chooseAction(k, silent) {
    if (mode !== 'decide') return;
    hideHand();
    if (sel && sel.action === k && !silent) { sel = null; renderActions(hist[dec].ctx); setStepText(''); return; }
    sel = { action: k, step: 1, playerId: null };
    renderActions(hist[dec].ctx);
    setStepText(STEP_SAY(k)[0]);
    if (!silent) say(STEP_SAY(k)[0], 'anweisung', true);
    armIdle();
  }
  function setStepText(t) { $('step').textContent = t; $('step').hidden = !t; syncLayout(); }

  function showHint() {
    const c = hist[dec].ctx;
    const k = E.recommend(S, c.actions);
    if (!sel || sel.action !== k) chooseAction(k, true);
    hintView = E.hint(S, k);
    say(hintView.say, 'anweisung', true);
    setStepText('💡 ' + hintView.say);
    hist[dec].usedHint = true;
  }

  // ---------- Fingerzeig für das Bedienprinzip (Review Punkt 5)
  function armIdle() {
    Sprache.loesche(idleTimer); idleTimer = null; hideHand();
    if (!firstRun && dec > 0) return;
    idleTimer = Sprache.nach(dec === 0 ? 3500 : 6000, showHand);
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
  // V0.5.1: Schnelles Mehrfach-Antippen eines Knopfs (z. B. „Los geht's“, „Weiterspielen“) darf nicht als Tipp aufs
  // Spielfeld darunter zählen – sonst löst ein Doppeltipp ungewollt eine Aktion aus (bei vorgewählter Einzelaktion sofort).
  let lastButtonTap = { t: -1e9, x: 0, y: 0 };
  let lastErzaehlTap = { t: -1e9, x: 0, y: 0 };
  const tapCount = { field: 0, ghost: 0 };   // nur für Tests (lesend über window.__fiq)
  document.addEventListener('pointerdown', (ev) => { if (ev.target && ev.target.closest && ev.target.closest('button')) lastButtonTap = { t: performance.now(), x: ev.clientX, y: ev.clientY }; }, true);
  // Nur ein Geistertipp, wenn (1) kurz nach dem Knopf-Tipp, (2) fast an derselben Stelle UND (3) an jener Stelle
  // inzwischen kein Knopf mehr ist (der Knopf ist durch sein eigenes Antippen verschwunden: „Los geht's“,
  // „Weiterspielen“, ✔ …). Steht dort noch ein Knopf (z. B. die gewählte Aktion), ist der Feld-Tipp bewusst.
  const isGhostTap = (ev) => {
    const dt = performance.now() - lastErzaehlTap.t;
    if (dt < 250 || (dt < 500 && Math.hypot(ev.clientX - lastErzaehlTap.x, ev.clientY - lastErzaehlTap.y) < 48)) return true;
    if (performance.now() - lastButtonTap.t >= 450 || Math.hypot(ev.clientX - lastButtonTap.x, ev.clientY - lastButtonTap.y) >= 48) return false;
    const el = document.elementFromPoint(lastButtonTap.x, lastButtonTap.y);
    return !(el && el.closest && el.closest('button'));
  };
  /** In Erzählphasen darf ein Tipp die nächste Station vorziehen, aber niemals eine Fußballaktion auslösen.
   *  Die Capture-Phase verhindert, dass derselbe Tipp nach dem Zustandswechsel auf dem Canvas weiterspielt. */
  function replayNaechsteSzene() {
    if (mode !== 'replay' || !replay) return false;
    Sprache.stopp();
    const i = replay.i + 1;
    if (i >= replay.queue.length) {
      const fertig = replay.onDone; replay = null; fertig();
    } else {
      replay.i = i; replay.f = 0; replay.acc = 0;
      say(replay.queue[i].say || '', 'ansage', true);
    }
    return true;
  }
  document.addEventListener('pointerdown', (ev) => {
    if (pausiert || !ev.target || !ev.target.closest || ev.target.closest('button, a, input, textarea, select, [role="button"]')) return;
    if (isGhostTap(ev)) return;
    let verbraucht = false;
    if (mode === 'replay') verbraucht = replayNaechsteSzene();
    else if (mode === 'folge' || mode === 'wechsel' || mode === 'kurz' || (mode === 'look' && lookView && lookView.done))
      verbraucht = Sprache.ueberspringen();
    else if (mode === 'feedback' && !Sprache.frei()) { Sprache.stopp(); verbraucht = true; }
    if (verbraucht) {
      lastErzaehlTap = { t: performance.now(), x: ev.clientX, y: ev.clientY };
      ev.preventDefault(); ev.stopPropagation();
    }
  }, true);
  cv.addEventListener('pointerdown', (ev) => {
    if (isGhostTap(ev)) { tapCount.ghost++; return; }
    tapCount.field++;
    const pt = worldFromEvent(ev);
    const c = S && E.carrier(S);
    if (mode === 'look') {
      if (lookView && lookView.done) return;
      const p = hitPlayer(pt, (q) => q.team === 'blue' && q !== c);
      hideHand();
      if (p) onLookAnswer(p); else say(T().schau.danebenGetippt, 'hinweis', true);
      return;
    }
    if (mode !== 'decide') return;
    if (!sel) { say(T().bedienung.zuerstKnopf, 'hinweis', true); pulseActions(); return; }
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
      say(T().bedienung.toreRechts, 'hinweis', true);
    } else if (k === 'freilaufen' || k === 'raum') {
      const filt = (q) => q.team === 'blue' && (k === 'raum' || q !== c);
      if (sel.step === 1) {
        const p = hitPlayer(pt, filt);
        if (p) { Sfx.tap(); sel.playerId = p.id; sel.step = 2; setStepText(STEP_SAY(k)[1]); say(STEP_SAY(k)[1], 'anweisung', true); }
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
    Sprache.stopp(); Sprache.phase(); Sfx.tap(); hideHand(); Sprache.loesche(idleTimer);
    kurzAus();
    hintView = null;
    marker = mark ? { x: mark.x, y: mark.y, from: from ? { x: from.x, y: from.y } : null, planned: true } : null;
    E.startAction(S, a);
    mode = 'anim'; sel = null; acc = 0;
    $('actions').innerHTML = ''; $('cancel').hidden = true; setStepText('');
    $('prompt').classList.add('dim');
  }

  function finishEpisode() {
    const fb = E.feedback(S);
    const fo = E.folge(S);                       // V0.6.2: Folge-Moment? (vor missionAfter – Lage direkt nach der Aktion)
    const ctxType = hist[dec].ctx.type;
    const attempt = { frames: S.ep.frames, fb, a: S.ep.a, endState: null, missionAfter: null };
    E.missionAfter(M, S, ctxType);               // kann bei „Ball im Aus“ einen Neustart auslösen
    attempt.endState = E.clone(S); attempt.missionAfter = E.clone(M);
    const h = hist[dec];
    h.attempts.push(attempt); h.final = attempt;
    marker = null;
    explainView = fb.explain;
    lernView = lernViewAus(fb);
    $('prompt').classList.remove('dim');
    // P4: Lernergebnis, sobald die Situation mit dieser Entscheidung endet
    const endet = situationEndet(h.sit);
    h.lern = endet ? lernAuswerten(h.sit) : null;
    if (h.lern && h.lern.typ) lernErgebnis[h.sit] = h.lern; else delete lernErgebnis[h.sit];
    // V0.6.2: bei bedeutsamer Veränderung zuerst ein stiller Folge-Moment (volles Feld, Spuren der Gegner, veränderte Tore),
    // erst danach die erklärende Rückmeldung. Nach Routineaktionen kein Folge-Moment.
    if (fo.bedeutsam) return folgeMoment(fo, () => zeigeErgebnis(fb, h, endet));
    zeigeErgebnis(fb, h, endet);
  }
  /** V0.6.2: Folge-Moment – das Kind sieht zuerst, was sich verändert hat (ca. 1,4 s, Antippen überspringt). */
  function folgeMoment(fo, danach) {
    mode = 'folge';
    folgeView = { ...fo, t0: performance.now() };
    setPrompt(T().folge.tag, 'look', T().folge.titel);
    const d = dec, weiterNachFolge = () => { if (mode === 'folge' && dec === d) { folgeWeiter = null; danach(); } };
    folgeWeiter = weiterNachFolge;
    Sprache.phase();
    const f = T().folge;
    const grund = fo.gruende.includes('toreVeraendert') ? 'tore' : fo.gruende.includes('ballVerloren') ? 'ball' : 'gegner';
    say(f[grund] || f.schau, 'ansage', false, false);
    const ms = f.dauer || 1400;
    Sprache.wennFertig(weiterNachFolge, { min: ms, max: ms + 6000 });   // kurze Frage zu Ende sprechen; Tippen darf sofort weiter
  }
  function zeigeErgebnis(fb, h, endet) {
    // P3: Kurzrückmeldung (nur Missionen mit kurzrueckmeldung): gute Entscheidung, Situation läuft weiter, kein Tor
    const def = missionDef();
    if (def && def.kurzrueckmeldung === true && fb.good && !endet && !fb.goal) return kurzRueckmeldung(fb);
    mode = 'feedback';
    showFeedback(fb, h);
  }

  // ---------- V0.6a P3: Kurzrückmeldung – Folge sichtbar, ↶ macht die Entscheidung rückgängig, 🔈 wiederholt die Erklärung
  function kurzRueckmeldung(fb) {
    mode = 'kurz';
    kurzInfo = { fb, dec };
    $('kurzText').textContent = '⭐ ' + fb.tip;
    $('kurzHoeren').setAttribute('aria-label', T().lern.kurzHoeren);
    $('kurzZurueck').querySelector('.lbl').textContent = T().lern.kurzZurueck;
    $('kurz').hidden = false; syncLayout();
    Sfx.good(); updateProgress();
    Sprache.phase();
    say(fb.tip, 'rueckmeldung');
    const d = dec;
    // weiter zur nächsten Entscheidung, wenn der Satz zu Ende ist (mind. 1,2 s Bild der Folge); nie eine Entscheidung überspringen
    Sprache.wennFertig(() => { if (mode === 'kurz' && dec === d && !pausiert) weiter(); }, { min: 1200, max: 8000 });
  }
  function kurzAus() { kurzInfo = null; const k = $('kurz'); if (k && !k.hidden) { k.hidden = true; syncLayout(); } }
  function kurzZurueck() {
    if (!kurzInfo || pausiert || !(mode === 'kurz' || mode === 'decide' || mode === 'look')) return;
    const d = kurzInfo.dec; kurzAus();
    Sprache.stopp(); hideHand(); Sprache.loesche(idleTimer);
    mode = 'wechsel'; dec = d; hist.length = d + 1;
    const h = hist[d];
    S = E.clone(h.snap); M = E.clone(h.mission); h.final = null; explainView = null; lernView = null; hintView = null; sel = null;
    if (h.look && !h.look.right) h.look = null;
    $('actions').innerHTML = ''; $('cancel').hidden = true; setStepText('');
    updateScore(); updateProgress();
    say(T().bedienung.andersProbieren, 'ansage', true);
    Sprache.wennFertig(() => beginDecision(h.last), { min: 700, max: 8000 });
  }
  /** P4: nicht geschaffte Situation von vorn (eigene Startaufstellung) */
  function situationNochmal() {
    if (mode !== 'feedback' || $('feedback').hidden) return;
    const key = hist[dec].sit, st = lernStarts[key]; if (!st) return;
    Sprache.stopp(); mode = 'wechsel';
    $('feedback').hidden = true; syncLayout();
    dec = st.dec; hist.length = dec + 1;
    const h = hist[dec];
    S = E.clone(h.snap); M = E.clone(h.mission);
    h.final = null; h.attempts = []; h.usedHint = false; h.look = null; h.lern = null;
    delete lernErgebnis[key]; explainView = null; lernView = null;
    updateScore(); updateProgress();
    say(T().lern.situationNochmalAnsage, 'ansage', true);
    Sprache.wennFertig(() => beginDecision(h.last), { min: 900, max: 8000 });
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
    // P4: Lernergebnis der Situation
    const L = h.lern, TL = T().lern, lern = $('fbLern');
    let lernSatz = '', lernGesagt = '';
    if (L && L.typ && TL.geschafft[L.typ]) {
      // „Die Tore haben sich verändert“ nur, wenn die Simulation das belegt (Grund aus der Aufgabenbewertung)
      const gk = L.typ === 'nochmalSchauen' && L.grund !== 'veraenderungErkannt' && TL.geschafft.nochmalSchauenOhne ? 'nochmalSchauenOhne' : L.typ;
      lernSatz = L.geloest ? TL.geschafft[gk] : TL.nochNicht[L.typ];
      lernGesagt = L.geloest ? TL.geschafftKurz : lernSatz;
      lern.textContent = (L.geloest ? '⭐' + (L.hilfe ? '💡 ' : ' ') : '🔁 ') + lernSatz + (L.geloest && L.hilfe ? ` (${TL.mitHilfe})` : '');
      lern.className = L.geloest ? '' : 'offen';
    }
    lern.hidden = !lernSatz;
    // „Nochmal“ (Situation von vorn) nur, wenn die Situation schon frühere Entscheidungen hatte – sonst ist es dasselbe wie „Anders probieren“
    $('fbSit').hidden = !(L && L.typ && !L.geloest && lernStarts[h.sit] && lernStarts[h.sit].dec < dec);
    $('fbSit').querySelector('.lbl').textContent = TL.situationNochmal;
    $('fbNext').querySelector('.lbl').textContent = M.done ? T().bedienung.fertig : T().bedienung.weiterspielen;
    $('feedback').hidden = false;
    syncLayout();
    if (fb.good) Sfx.good();
    updateProgress();
    Sprache.phase();
    say(fb.say + (lernGesagt ? ' ' + lernGesagt : ''), 'rueckmeldung');
  }

  function retry() {
    if (mode !== 'feedback' || $('feedback').hidden) return;
    Sprache.stopp(); mode = 'wechsel';
    $('feedback').hidden = true; syncLayout();
    const h = hist[dec];
    S = E.clone(h.snap); M = E.clone(h.mission);
    h.final = null; explainView = null;
    if (h.look && !h.look.right) h.look = null; // Wahrnehmung war falsch -> auch das Schauen wiederholen
    updateScore();
    say(T().bedienung.andersProbieren, 'ansage', true);
    Sprache.wennFertig(() => beginDecision(h.last), { min: 700, max: 8000 });
  }
  function next() {
    if (mode !== 'feedback' || $('feedback').hidden) return;   // schnelles Mehrfach-Antippen
    Sprache.stopp();
    weiter();
  }
  /** Zur nächsten Entscheidung (aus der Rückmeldung oder automatisch nach der Kurzrückmeldung) */
  function weiter() {
    kurzAus(); // Kurzrückmeldung auch bei vorgezogenem Übergang zuverlässig ausblenden
    $('feedback').hidden = true;
    explainView = null; lernView = null;
    const h = hist[dec];
    const last = { kind: h.final.a.kind, success: h.final.fb.success, team: 'blue' };
    E.missionApply(M, S);
    dec++;
    if (M.note === 'situation') {
      // M1: nahtlos zur nächsten Situation (eigene Startaufstellung, kein Neustart-Bild)
      mode = 'wechsel';
      say(T().bedienung.neueSituation, 'ansage', true);
      setStepText(T().bedienung.neueSituationAnzeige);
      M.note = null;
      Sprache.wennFertig(() => beginDecision(null), { min: 1200, max: 8000 });
      return;
    }
    if (M.note === 'aus') {
      mode = 'wechsel';
      Sfx.whistle();
      say(T().bedienung.ballImAus, 'ansage', true);
      setStepText(T().bedienung.ballImAusAnzeige);
      M.note = null;
      Sprache.wennFertig(() => beginDecision(last), { min: 1500, max: 12000 });
      return;
    }
    beginDecision(last);
  }
  function compare() {
    if (mode !== 'feedback' || $('feedback').hidden) return;
    Sprache.stopp();
    const h = hist[dec];
    const n = h.attempts.length;
    const a1 = h.attempts[n - 2], a2 = h.attempts[n - 1];
    $('feedback').hidden = true;
    const say = (pre, at) => `${pre}: ${at.fb.say}`;
    startReplay([
      { frames: a1.frames, label: T().bedienung.vorher, explain: a1.fb.explain, say: say(T().bedienung.vorher, a1) },
      { frames: a2.frames, label: T().bedienung.jetzt, explain: a2.fb.explain, say: say(T().bedienung.jetzt, a2) },
    ], () => { S = E.clone(h.final.endState); explainView = h.final.fb.explain; $('feedback').hidden = false; mode = 'feedback'; syncLayout(); });
  }
  function startReplay(queue, onDone) {
    mode = 'replay';
    replay = { queue, i: 0, f: 0, acc: 0, onDone: null };
    $('prompt').hidden = true; $('skip').hidden = false; setStepText('');
    replay.onDone = () => { $('skip').hidden = true; onDone(); $('prompt').hidden = mode === 'end'; syncLayout(); };
    say(queue[0].say || '', 'ansage', true);
  }

  function endMission() {
    mode = 'end';
    hideHand(); Sprache.loesche(idleTimer); Sprache.phase();
    $('restart').hidden = true;
    updateProgress();
    const looks = hist.filter((h) => h.look);
    // V0.6a P4: ein Stern je Lernsituation (geschafft = Kernleistung erbracht; mit Hilfe = voller Stern + 💡)
    const sits = lernUebersicht();
    const good = sits.filter((x) => x.e.geloest).length, mitHilfe = sits.filter((x) => x.e.geloest && x.e.hilfe).length;
    $('stars').innerHTML = sits.map((x) => `<span class="${x.e.geloest ? 'on' : ''}">★</span>`).join('');
    const TE = T().ende, TL = T().lern;
    $('endScore').textContent = TE.spielstand(S.score.blue, S.score.red) + (looks.length ? TE.schauRichtig(looks.filter((l) => l.right && l.tries === 1).length, looks.length) : '') + '  ·  ' + TE.zaehler(good, sits.length, mitHilfe);
    const msg = TE.lob(good, sits.length) + (TE.merksatz || '');
    $('endMsg').textContent = msg;
    $('endList').innerHTML = sits.map((x) => `<li class="${x.e.geloest ? 'good' : ''}"><b>${x.key === 'verteidigung' ? '🛡️' : '⚽'}</b> ${TL.titel[x.e.typ] || ''} <span>${x.e.geloest ? '⭐' + (x.e.hilfe ? '💡' : '') : '✓'}</span></li>`).join('');
    $('prompt').hidden = true; setStepText('');
    firstRun = false;
    runs[curId] = Math.max(runs[curId] || 0, curRun + 1); // „Nochmal“ bringt den nächsten Durchlauf (andere Situationen)
    played[curId] = true;
    // V0.5.1: Wege nach dem Missionsende
    const nx = nextMission();
    const def = MISSIONS.find((m) => m.id === curId);
    $('nextMission').hidden = !nx;
    if (nx) $('nextMission').querySelector('.lbl').textContent = `${nx.symbol || ''} ${nx.titel}`.trim();
    $('endFinal').hidden = !!nx;
    $('same').hidden = !(def && Array.isArray(def.durchlaeufe) && def.durchlaeufe.length > 1);
    $('endScreen').hidden = false;
    say(msg + TE.sterneSituationen(good, sits.length) + (nx ? '' : ' ' + T().bedienung.letzteMission), 'rueckmeldung');
  }
  /** Lernsituationen in Spielreihenfolge mit Ergebnis (nicht abgeschlossene werden zum Ende ausgewertet) */
  function lernUebersicht() {
    const keys = [...new Set(hist.filter((h) => h.final).map((h) => h.sit))];
    return keys.map((key) => ({ key, e: lernErgebnis[key] || lernAuswerten(key) }))
      .filter((x) => x.e && x.e.typ && !(x.key === 'verteidigung' && x.e.kern == null));
  }
  /** Nächste Mission im empfohlenen Weg; nach der letzten keine (kein Sprung zur ersten). */
  function nextMission() {
    const i = MISSIONS.findIndex((m) => m.id === curId);
    return i >= 0 && i < MISSIONS.length - 1 ? MISSIONS[i + 1] : null;
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
    // V0.6a P4: Lernmissionen – ein Punkt je Situation (★ geschafft, ★💡 mit Hilfe, ✓ nicht geschafft, • offen)
    if (M && M.sit && M.sit.order && situationsMission()) {
      const cur = S && S.situation;
      M.sit.order.forEach((sid, i) => {
        const e = lernErgebnis['S:' + sid];
        const istCur = mode !== 'end' && !e && sid === cur && i === M.sit.order.indexOf(cur);
        mk('dot' + (istCur ? ' cur' : '') + (e ? (e.geloest ? ' star' + (e.hilfe ? ' hilfe' : '') : ' done') : ''), e ? (e.geloest ? '★' : '✓') : '•');
      });
      return;
    }
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
    $('goalBanner').textContent = teamName === 'blue' ? T().bedienung.torBlau : T().bedienung.torRot;
    $('goalBanner').className = 'goalBanner show ' + teamName;
    setTimeout(() => { box.innerHTML = ''; $('goalBanner').className = 'goalBanner'; }, 1800);
  }

  // ------------------------------------------------------------ Verdrahtung
  const onStart = () => !$('startScreen').hidden;
  const onEnd = () => mode === 'end' && !$('endScreen').hidden;
  $('play').onclick = () => { if (!onStart()) return; Sfx.ctx(); startMission(null, T().bedienung.losGehts); };
  // Missionsende: „Nochmal“ = nächster Durchlauf (neue Situationen), „Genau so nochmal“ = gleicher Durchlauf
  $('again').onclick = () => { if (onEnd()) startMission(runs[curId] || 0); };
  $('same').onclick = () => { if (onEnd()) startMission(curRun); };
  $('nextMission').onclick = () => {
    const nx = onEnd() && nextMission(); if (!nx) return;
    curId = nx.id; renderStart();
    startMission(null, T().bedienung.naechsteMission(nx.titel, nx.einfuehrung || nx.untertitel || ''));
  };
  function goHome() {
    Sprache.abbrechen(); hideHand(); closeConfirm(false);
    replay = null; mode = 'start'; sel = null; kurzAus(); lernView = null; folgeView = null; folgeWeiter = null;
    $('feedback').hidden = true; $('endScreen').hidden = true; $('skip').hidden = true; $('restart').hidden = true;
    renderStart(); $('startScreen').hidden = false;
  }
  $('home').onclick = goHome;
  $('home2').onclick = goHome;
  $('hl').onclick = () => { if (onEnd()) highlights(); };
  $('fbRetry').onclick = () => retry();
  $('fbNext').onclick = () => next();
  $('fbCompare').onclick = () => compare();
  $('fbSit').onclick = () => situationNochmal();
  $('kurzZurueck').onclick = () => kurzZurueck();
  $('kurzHoeren').onclick = () => { if (kurzInfo) say(kurzInfo.fb.say, 'rueckmeldung', true, false); };
  $('cancel').onclick = () => { if (mode !== 'decide') return; sel = null; hintView = null; renderActions(hist[dec].ctx); setStepText(''); };
  $('repeat').onclick = () => Sprache.wiederholen();
  $('skip').onclick = () => { if (replay) { Sprache.stopp(); const d = replay.onDone; replay = null; d(); } };
  $('sound').onclick = () => { Sprache.ein(!Sprache.an); $('sound').textContent = Sprache.an ? '🔊' : '🔇'; };

  // V0.5.1: Neustart während der Mission – kindersichere Abfrage mit zwei großen Bildknöpfen
  function openConfirm() {
    if (onStart() || mode === 'end' || !$('confirm').hidden) return;
    pausiert = true; Sprache.halt(); hideHand();
    $('confirm').hidden = false;
    say(T().bedienung.neustartFrage, 'hinweis', true);
  }
  function closeConfirm(resume) {
    if ($('confirm').hidden) return;
    $('confirm').hidden = true; pausiert = false;
    if (resume) { Sprache.stopp(); Sprache.wiederholen(); }
    Sprache.weiter();
  }
  $('restart').onclick = openConfirm;
  $('confirmNo').onclick = () => closeConfirm(true);
  $('confirmYes').onclick = () => { if ($('confirm').hidden) return; startMission(curRun); };

  // M3: Startbildschirm – eine große Karte je Mission, Antippen wählt und liest vor (kein Lesen nötig)
  function renderStart() {
    const box = $('missionList'); box.innerHTML = '';
    MISSIONS.forEach((m, i) => {
      const card = document.createElement('button');
      card.type = 'button'; card.className = 'mcard' + (m.id === curId ? ' sel' : ''); card.dataset.id = m.id;
      card.setAttribute('aria-pressed', m.id === curId ? 'true' : 'false');
      // Nummer = Platz im empfohlenen Weg (1, 2, 3 …), damit die Reihenfolge ohne Lesen erkennbar ist
      card.innerHTML = `<div class="num">${m.symbol || i + 1}</div><div><b></b><small></small><div class="chips"></div></div><i class="art"></i>`;
      // Missionsart (Lernen/Spiel): nur Kennzeichnung, kein Einfluss auf den Ablauf
      if (m.art) { const t = T().bedienung.missionsart[m.art]; card.querySelector('.art').textContent = t; card.querySelector('.art').dataset.art = m.art; }
      card.querySelector('b').textContent = m.titel;
      card.querySelector('small').textContent = m.untertitel || '';
      for (const c of m.merkmale || []) { const sp = document.createElement('span'); sp.textContent = c; card.querySelector('.chips').appendChild(sp); }
      if (played[m.id]) card.classList.add('played');
      card.onclick = () => {
        if (!onStart()) return;
        Sfx.ctx(); Sfx.tap();
        curId = m.id; renderStart();
        say(T().bedienung.missionGewaehlt(m.titel, m.einfuehrung || m.untertitel || ''), 'anweisung', true);
      };
      box.appendChild(card);
    });
    box.classList.toggle('single', MISSIONS.length === 1);
  }
  renderStart();

  window.addEventListener('resize', resize);
  try { new ResizeObserver(() => resize()).observe(wrap); } catch (e) {}
  resize();
  S = E.newState(curId, 0); M = E.newMission(curId, 0);
  updateScore(); updateProgress();
  // V0.6.2: Layout folgt dem Rückmeldeblatt (an allen Stellen, die es zeigen oder verbergen)
  new MutationObserver(() => resize()).observe($('feedback'), { attributes: true, attributeFilter: ['hidden'] });
  requestAnimationFrame(loop);

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    try { navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) {}
  }
  // Testzugriff (nur lesend) für automatisierte Oberflächentests
  window.__fiq = { get taps() { return { ...tapCount }; }, get replayIdx() { return replay ? replay.i : -1; }, get dec() { return dec; }, get run() { return curRun; }, get id() { return curId; }, get paused() { return pausiert; }, get relevant() { return Sprache.relevant; }, get speech() { return Sprache._zustand(); }, get mode() { return mode; }, get S() { return S; }, get M() { return M; }, get ctx() { return hist[dec] ? hist[dec].ctx : null; }, get sel() { return sel ? { ...sel } : null; }, get look() { return lookView ? { tries: lookView.tries, done: !!lookView.done } : null; }, get view() { return { ...VIEW }; }, get lern() { return JSON.parse(JSON.stringify(lernErgebnis)); }, get feldScale() { return scale; }, get ball() { return ballZuletzt ? { ...ballZuletzt } : null; }, get blattSeite() { return $('app').classList.contains('blattSeite'); }, get folge() { return folgeView ? { gruende: folgeView.gruende, gegner: folgeView.gegner.map((g) => g.id), tore: folgeView.tore } : null; }, get kurz() { return kurzInfo ? { dec: kurzInfo.dec, tip: kurzInfo.fb.tip } : null; }, get lernView() { return lernView ? Object.keys(lernView) : []; } };
})();
