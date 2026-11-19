/* Fußball-IQ Kids – zentrale Sprachsteuerung und Ablauf-Taktgeber (V0.5.1)
 *
 * Eine Stelle für alles, was gesprochen wird, und für alle zeitgesteuerten Übergänge der App.
 *
 * Regeln:
 *  - Ansagen laufen in einer Warteschlange. Eine laufende Ansage wird nur abgebrochen, wenn das Kind
 *    etwas tut (`sofort: true`), bei „Ton aus“ und bei Abbruch (Übersicht, Neustart, Missionswechsel).
 *    Automatische Übergänge hängen ihre Ansage hinten an.
 *  - Arten: anweisung (was das Kind jetzt tun soll), rueckmeldung (Ergebnis/Erklärung),
 *    ansage (Übergang: „Neue Situation“, „Ball im Aus“ …), hinweis (optional, wird verworfen,
 *    wenn gerade etwas anderes läuft, und nie als „relevante Anweisung“ gemerkt).
 *  - Phasen: `phase()` verwirft noch nicht begonnene Ansagen der vorigen Phase. Veraltetes wird nie
 *    nachträglich gesprochen.
 *  - Übergänge: `wennFertig(fn, {min, max})` führt fn aus, sobald nichts mehr gesprochen wird und
 *    mindestens `min` ms vergangen sind; spätestens nach `max` ms (Sicherheitsnetz).
 *  - Fehlt das Ende-Ereignis (Safari), beendet ein Wächter die Ansage nach ihrer geschätzten Dauer,
 *    bricht sie im Sprachsystem ab und macht weiter. Späte Ereignisse alter Ansagen werden ignoriert.
 *  - Alle Ablauf-Timer laufen über `nach()`; `abbrechen()` beendet Sprache, Warteschlange, Timer
 *    und wartende Übergänge vollständig.
 *
 * Kein Zufall, keine Abhängigkeiten. Im Browser: window.FIQSprache, in Node: module.exports.
 */
(function (root) {
  'use strict';

  const MAX_TEIL = 200;          // längere Texte werden an Satzgrenzen geteilt (iOS bricht sehr lange Ansagen ab)
  const PAUSE_NACH_ABBRUCH = 80; // ms Abstand zwischen cancel() und speak() (Safari verschluckt sonst die neue Ansage)

  /** Text in Teile von höchstens MAX_TEIL Zeichen, an Satzgrenzen. Kurze Texte bleiben unverändert. */
  function teile(text) {
    if (text.length <= MAX_TEIL) return [text];
    const saetze = text.split(/(?<=[.!?])\s+/);
    const out = [];
    let cur = '';
    for (const s of saetze) {
      if (cur && (cur + ' ' + s).length > MAX_TEIL) { out.push(cur); cur = s; } else cur = cur ? cur + ' ' + s : s;
    }
    if (cur) out.push(cur);
    return out;
  }

  /** Geschätzte Höchstdauer einer Ansage in ms (Wächter für fehlendes Ende-Ereignis). */
  function dauer(text, rate) { return 2500 + Math.round(text.length * 95 / (rate || 1)); }

  function erstelle(env) {
    const synth = env.synth || null;
    const Utt = env.Utterance || null;
    const setT = env.setTimeout || setTimeout;
    const clearT = env.clearTimeout || clearTimeout;
    const now = env.now || (() => Date.now());
    const rate = env.rate || 0.9, pitch = env.pitch || 1.05, lang = env.lang || 'de-DE';
    const log = env.log || (() => {});

    let on = true;
    let epoch = 0;
    let queue = [];            // {text, art, epoch}
    let cur = null;            // laufende Ansage {text, art, epoch, utt, wd, startTimer}
    let relevant = '';         // zuletzt gemerkte Anweisung/Rückmeldung (🔈)
    let lastCancel = -Infinity;
    let halted = false;
    let voice = null;
    const timers = new Set();
    let waiters = [];
    let deferred = [];

    function pickVoice() {
      if (voice || !synth || !env.pickVoice) return voice;
      try { voice = env.pickVoice(synth.getVoices() || []) || null; } catch (e) { voice = null; }
      return voice;
    }

    function aktiv() {
      if (cur) return true;
      try { return !!(synth && (synth.speaking || synth.pending)); } catch (e) { return false; }
    }

    function stoppIntern() {
      queue = [];
      const war = aktiv();
      if (cur) { if (cur.wd) clearT(cur.wd); if (cur.startTimer) clearT(cur.startTimer); log('abbruch', cur.text); cur = null; }
      // Nur abbrechen, wenn wirklich etwas läuft: so bleibt die erste Ansage nach einem Antippen
      // synchron im Tipp-Ereignis (iOS schaltet die Sprachausgabe erst nach einer Nutzeraktion frei).
      if (war && synth) { try { synth.cancel(); } catch (e) {} lastCancel = now(); }
    }

    function starteNaechsten() {
      while (queue.length && queue[0].epoch !== epoch) queue.shift();
      if (!queue.length) { cur = null; pruefe(); return; }
      const item = queue.shift();
      cur = item;
      const warten = PAUSE_NACH_ABBRUCH - (now() - lastCancel);
      if (warten > 0) item.startTimer = setT(() => { item.startTimer = null; if (cur === item) sprich(item); }, warten);
      else sprich(item);
    }

    function sprich(item) {
      if (!synth || !Utt) { cur = null; starteNaechsten(); return; }
      try { if (synth.paused) synth.resume(); } catch (e) {}
      let u;
      try {
        u = new Utt(item.text);
        u.lang = lang; u.rate = rate; u.pitch = pitch;
        const v = pickVoice(); if (v) u.voice = v;
      } catch (e) { cur = null; starteNaechsten(); return; }
      item.utt = u;
      const fertig = () => {
        if (cur !== item) return;                 // spätes Ereignis einer abgebrochenen/alten Ansage
        if (item.wd) clearT(item.wd);
        cur = null; log('ende', item.text);
        starteNaechsten();
      };
      u.onend = fertig; u.onerror = fertig;
      item.wd = setT(() => {
        if (cur !== item) return;
        log('waechter', item.text);
        cur = null;
        try { synth.cancel(); } catch (e) {}       // Ansage sicher beenden, damit sie nicht später weiterläuft
        lastCancel = now();
        starteNaechsten();
      }, dauer(item.text, rate));
      log('start', item.text);
      try { synth.speak(u); } catch (e) { fertig(); }
    }

    function frei() { return !cur && !queue.some((i) => i.epoch === epoch); }

    function pruefe() {
      if (halted) return;
      for (const w of waiters.slice()) if (w.minOk && frei()) ausfuehren(w);
    }
    function ausfuehren(w) {
      const i = waiters.indexOf(w); if (i < 0) return;
      waiters.splice(i, 1);
      if (w.tMin) loesche(w.tMin);
      if (w.tMax) loesche(w.tMax);
      w.fn();
    }

    // ---------------------------------------------------------------- Ablauf-Timer
    function nach(ms, fn) {
      const h = { id: null };
      h.id = setT(() => { timers.delete(h); if (halted) deferred.push(fn); else fn(); }, Math.max(0, ms));
      timers.add(h);
      return h;
    }
    function loesche(h) { if (h && timers.has(h)) { clearT(h.id); timers.delete(h); } }

    const api = {
      /** Ansage. opt: {art, sofort, merken}. */
      sage(text, opt) {
        if (!text) return;
        opt = opt || {};
        const art = opt.art || 'anweisung';
        const merken = opt.merken != null ? opt.merken : art !== 'hinweis';
        if (merken) relevant = text;
        if (!on || !synth) { nach(0, pruefe); return; }
        if (art === 'hinweis' && !opt.sofort && (cur || queue.length)) { log('verworfen', text); return; }
        const items = teile(text).map((t) => ({ text: t, art, epoch }));
        if (opt.sofort) stoppIntern();
        else queue = queue.filter((i) => i.art !== 'hinweis'); // wartende optionale Hinweise weichen
        queue.push(...items);
        if (!cur) starteNaechsten();
      },
      /** Kind hat etwas getan: Sprache und Warteschlange beenden (Timer bleiben). */
      stopp() { stoppIntern(); nach(0, pruefe); },
      /** Neue Phase: noch nicht begonnene Ansagen der vorigen Phase verwerfen. */
      phase() { epoch++; queue = queue.filter((i) => i.epoch === epoch); },
      /** Übersicht, Neustart, Missionswechsel: alles beenden. */
      abbrechen() {
        epoch++;
        stoppIntern();
        for (const h of timers) clearT(h.id);
        timers.clear(); waiters = []; deferred = [];
        halted = false; relevant = '';
      },
      nach, loesche,
      wennFertig(fn, o) {
        o = o || {};
        const w = { fn, minOk: false, tMin: null, tMax: null };
        waiters.push(w);
        w.tMin = nach(o.min || 0, () => { w.tMin = null; w.minOk = true; pruefe(); });
        w.tMax = nach(o.max != null ? o.max : 10000, () => { w.tMax = null; log('sicherheitsnetz', ''); ausfuehren(w); });
        return w;
      },
      frei,
      wiederholen() { if (relevant) api.sage(relevant, { art: 'anweisung', sofort: true, merken: false }); },
      merke(text) { relevant = text || ''; },
      get relevant() { return relevant; },
      halt() { halted = true; },
      weiter() {
        halted = false;
        const d = deferred; deferred = [];
        d.forEach((fn) => fn());
        pruefe();
      },
      ein(v) { on = !!v; if (!on) { stoppIntern(); nach(0, pruefe); } },
      get an() { return on; },
      /** Nach Rückkehr aus dem Hintergrund: Safari bleibt sonst im Pause-Zustand. */
      fortsetzen() { try { if (synth && synth.paused) synth.resume(); } catch (e) {} },
      stimmenGeaendert() { voice = null; pickVoice(); },
      /** Nur für Tests */
      _zustand() { return { epoch, queue: queue.map((i) => i.text), cur: cur ? cur.text : null, timers: timers.size, waiters: waiters.length, halted, deferred: deferred.length }; },
    };
    return api;
  }

  const FIQSprache = { erstelle, teile, dauer, MAX_TEIL, PAUSE_NACH_ABBRUCH };
  if (typeof module !== 'undefined' && module.exports) module.exports = FIQSprache;
  root.FIQSprache = FIQSprache;
})(typeof window !== 'undefined' ? window : globalThis);
