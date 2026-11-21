// V0.6.2 Paket „Wahrnehmung“ im Browser (Touch): Folge-Moment vor der Erklärung, „Schau nochmal“-Ansage, Rückmeldung
// ohne kleineres Spielfeld, Spielfluss auf iPad (quer/hoch) und Handy (quer). Nachgebaute Sprachausgabe mit realistischer
// Dauer (≈ 55 ms je Zeichen), damit Reihenfolge und Zeiten geprüft werden können.
//   node tests/e2e/wahrnehmung.mjs
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  fs.readFile(p, (err, data) => { if (err) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); res.end(data); });
}).listen(0);
const base = `http://localhost:${server.address().port}/`;
const fail = (m) => { throw new Error(m); };
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : {});
const IPAD = { width: 1180, height: 820 }, IPAD_HOCH = { width: 820, height: 1180 }, HANDY = { width: 844, height: 390 };
const fluss = [];

async function open(vp, mission, durchlauf) {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.__log = [];
    const f = { speaking: false, pending: false, paused: false, cur: null,
      speak(u) { const t = performance.now(); window.__log.push({ e: 'start', t: u.text, at: t }); f.speaking = true; const me = { u }; f.cur = me;
        setTimeout(() => { if (f.cur !== me) return; f.cur = null; f.speaking = false; window.__log.push({ e: 'ende', t: u.text, at: performance.now() }); u.onend && u.onend({}); }, 300 + u.text.length * 55); },
      cancel() { if (f.cur) window.__log.push({ e: 'abbruch', t: f.cur.u.text, at: performance.now() }); f.cur = null; f.speaking = false; }, resume() {}, pause() {}, getVoices() { return []; }, addEventListener() {} };
    Object.defineProperty(window, 'speechSynthesis', { value: f, configurable: true });
  });
  await page.goto(base + 'index.html');
  if (durchlauf) await page.evaluate(([m, d]) => { FIQ.mission(m).durchlaeufe.unshift(d); }, [mission, durchlauf]);
  const H = {
    page, errors,
    mode: () => page.evaluate(() => window.__fiq.mode),
    fiq: (k) => page.evaluate((k) => window.__fiq[k], k),
    async wait(m, ms = 20000) { const t = Date.now(); while (Date.now() - t < ms) { if (errors.length) fail('JS-Fehler: ' + errors.join('; ')); const x = await H.mode(); if ([].concat(m).includes(x)) return x; await page.waitForTimeout(20); } fail(`Modus ${m} nicht erreicht (${await H.mode()})`); },
    async tap(sel) { const l = page.locator(sel).first(); await l.scrollIntoViewIfNeeded(); const b = await l.boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); },
    async field(x, y) { const b = await page.$eval('#field', (e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, window.__fiq.view]; }); const k = b[2] / b[3].w; await page.touchscreen.tap(b[0] + (x - b[3].x0) * k, b[1] + (y - b[3].y0) * k); },
    async choose(lbl) { if (!(await page.evaluate(() => !!window.__fiq.sel))) await H.tap(`#actions .act:not(.hint) >> text=${lbl}`); },
    log: () => page.evaluate(() => window.__log.slice()),
    now: () => page.evaluate(() => performance.now()),
    feldPx: () => page.$eval('#field', (e) => e.getBoundingClientRect().width),
    async start() { await H.tap(`#missionList .mcard[data-id="${mission}"]`); await H.tap('#play'); await H.wait('decide'); },
    close: () => ctx.close(),
  };
  return H;
}
/** Folge-Moment: eine kurze neutrale Aufforderung, Blatt verborgen, Feld unverändert; danach Erklärung */
async function pruefeFolge(H, wo) {
  const w0 = await H.feldPx();
  await H.wait('folge'); const t0 = await H.now();
  if (!(await H.page.isHidden('#feedback'))) fail(wo + ': Rückmeldeblatt im Folge-Moment sichtbar');
  const fo = await H.fiq('folge'); if (!fo || !fo.gruende.length) fail(wo + ': Folge-Moment ohne Grund');
  const m = await H.wait(['feedback', 'kurz'], 15000); const t1 = await H.now();
  const log = await H.log();
  const imFolge = log.filter((x) => x.e === 'start' && x.at >= t0 - 50 && x.at < t1 - 30).map((x) => x.t);
  const erlaubte = ['Schau!', 'Schau zum Ball!', 'Schau auf die Tore!', 'Schau auf den Roten!', 'Schau auf die Roten!'];
  if (imFolge.length !== 1 || !erlaubte.includes(imFolge[0]))
    fail(wo + ': Folge-Moment muss eine kurze, neutrale Aufforderung sprechen: ' + imFolge.join(' | '));
  if (log.some((x) => x.e === 'abbruch' && x.t === imFolge[0]))
    fail(wo + ': Folge-Hinweis ohne Kindertipp abgeschnitten');
  if (fo.gruende.includes('ballVerloren') && fo.gruende.length === 1 && imFolge[0] !== 'Schau zum Ball!')
    fail(wo + ': Ballverlust ohne Ballhinweis');
  if (t1 - t0 < 1300) fail(`${wo}: Folge-Moment zu kurz (${Math.round(t1 - t0)} ms)`);
  const w1 = await H.feldPx(); if (w1 < w0 * 0.97) fail(`${wo}: Feld in der Rückmeldung kleiner (${Math.round(w0)} → ${Math.round(w1)} px)`);
  return { m, dauer: Math.round(t1 - t0), fo, hinweis: imFolge[0], w0: Math.round(w0), w1: Math.round(w1) };
}

let exit = 0;
try {
  if (!process.env.NUR_FLUSS) {
  // 1) W1 (iPad quer): Dribbling → Folge-Moment (Torlage verändert, Wächter-Spur) → Rückmeldung → „Schau nochmal: … jetzt frei?“
  {
    const H = await open(IPAD, 'welches-tor-ist-frei', ['W1', 'A1']); await H.start();
    await H.choose('Dribbeln'); await H.field(31, 15);
    const r = await pruefeFolge(H, 'W1');
    if (r.hinweis !== 'Schau auf die Tore!') fail('W1: gelb markiertes Tor ohne eindeutigen Tor-Hinweis: ' + r.hinweis);
    if (!r.fo.gruende.includes('toreVeraendert') || !r.fo.tore.length || !r.fo.gegner.includes('r2')) fail('W1: Folge-Moment zeigt nicht Torlage + Wächter: ' + JSON.stringify(r.fo));
    await H.tap('#fbNext'); await H.wait('decide');
    const ctx = await H.fiq('ctx'); if (ctx.say !== 'Schau nochmal: Welches Tor ist jetzt frei? Schießen oder passen?') fail('W1: Ansage nach Veränderung: ' + ctx.say);
    if (/obere|untere/.test(ctx.say + ctx.title)) fail('W1: Ansage verrät das Tor');
    // Schuss aufs jetzt zugestellte Tor: Rückmeldung nennt die Veränderung (rückblickend)
    await H.choose('Schießen'); await H.field(36, 18); await H.wait('feedback');
    const t = await H.page.$eval('#fbTip', (e) => e.textContent); if (!/(Rot 2 ist vor das untere Tor gelaufen|Nach deinem Dribbling war das untere Tor zu)\. Das obere Tor war frei\./.test(t)) fail('W1: Veränderung nicht benannt: ' + t);
    console.log(`✓ W1 iPad: Folge-Moment ${r.dauer} ms mit kurzem Hinweis, Feld ${r.w0}→${r.w1} px; „Schau nochmal: Welches Tor ist jetzt frei?“; Schuss aufs zugestellte Tor: „${t}“`);
    fluss.push({ wo: 'W1 Dribbling (iPad)', folgeMs: r.dauer });
    await H.close();
  }
  // 2) Antippen beendet den Folge-Moment; A3 nach dem Pass ebenfalls „Schau nochmal“
  {
    const H = await open(IPAD, 'welches-tor-ist-frei', ['A3', 'A1']); await H.start();
    await H.choose('Passen'); const p = await H.page.evaluate(() => { const q = FIQ.P(window.__fiq.S, 'b2'); return [q.x, q.y]; }); await H.field(...p);
    await H.wait('folge'); const t0 = await H.now();
    const geradeGesagt = (await H.log()).filter((x) => x.e === 'start').at(-1)?.t;
    if (geradeGesagt !== 'Schau auf die Tore!') fail('A3: Pass öffnet Tor, aber Hinweis fehlt: ' + geradeGesagt);
    await H.field(20, 4); await H.wait('feedback', 3000); const dt = await H.now() - t0;
    if (dt > 900) fail('Antippen beendet den Folge-Moment nicht (' + Math.round(dt) + ' ms)');
    await H.tap('#fbNext'); await H.wait('decide');
    if (!/^Schau nochmal/.test((await H.fiq('ctx')).say)) fail('A3: nach dem Pass keine „Schau nochmal“-Ansage');
    console.log('✓ A3: Antippen beendet den Folge-Moment sofort; nach dem Pass „Schau nochmal: Welches Tor ist jetzt frei?“');
    await H.close();
  }
  // 2b) Navigation im Folge-Moment: ↺ hält ihn an (Abfrage), ✖ setzt fort; 🏠 beendet ihn ohne Geisterablauf
  {
    const H = await open(IPAD, 'welches-tor-ist-frei', ['W1', 'A1']); await H.start();
    await H.choose('Dribbeln'); await H.field(31, 15); await H.wait('folge');
    await H.tap('#restart'); await H.page.waitForTimeout(2600);
    if ((await H.mode()) !== 'folge') fail('Folge-Moment läuft hinter der Neustart-Abfrage weiter: ' + (await H.mode()));
    await H.tap('#confirmNo'); await H.wait('feedback', 8000);
    const H2 = await open(IPAD, 'welches-tor-ist-frei', ['W1', 'A1']); await H2.start();
    await H2.choose('Dribbeln'); await H2.field(31, 15); await H2.wait('folge');
    await H2.tap('#home'); await H2.wait('start'); const t = await H2.now(); await H2.page.waitForTimeout(3000);
    const sp = await H2.fiq('speech');
    if ((await H2.mode()) !== 'start' || (await H2.log()).some((x) => x.e === 'start' && x.at > t + 5) || sp.timers || sp.waiters || sp.cur) fail('🏠 im Folge-Moment: Ablauf läuft weiter ' + JSON.stringify(sp));
    console.log('✓ Folge-Moment: ↺ hält ihn an, ✖ setzt fort; 🏠 beendet ihn ohne Geisterablauf');
    await H.close(); await H2.close();
  }
  // 2c) Der Vergleich darf auf dem Spielfeld Szene für Szene weitergeschaltet werden:
  //     auch zwei Tipps mit 700 ms Abstand an derselben Stelle müssen beide wirken.
  //     In allen anderen Modi bleibt das Feld wie in V0.6.2 bedienbar.
  {
    const H = await open(IPAD, 'welches-tor-ist-frei', ['W1', 'A1']); await H.start();
    await H.choose('Dribbeln'); await H.field(31, 15);
    await H.wait('folge'); await H.field(20, 4); await H.wait('feedback');
    const d0 = await H.fiq('dec');
    await H.tap('#fbRetry'); await H.wait('decide');
    await H.choose('Dribbeln'); await H.field(31, 15);
    await H.wait('folge'); await H.field(20, 4); await H.wait('feedback');
    if (!(await H.page.isVisible('#fbCompare'))) fail('Vergleich nach zwei Versuchen fehlt');
    await H.tap('#fbCompare'); await H.wait('replay');
    if ((await H.fiq('replayIdx')) !== 0) fail('Vergleich muss bei Szene 1 beginnen');
    await H.field(20, 4);
    if ((await H.fiq('replayIdx')) !== 1 || (await H.mode()) !== 'replay')
      fail('Erster Tipp muss genau eine Vergleichsszene weitergehen');
    await H.page.waitForTimeout(700);
    await H.field(20, 4); await H.wait('feedback', 3000);
    if ((await H.fiq('dec')) !== d0) fail('Vergleichstipp darf keine neue Fußballentscheidung auslösen');
    if (!(await H.page.isVisible('#fbCompare'))) fail('Nach Vergleich fehlt die Rückmeldung');
    console.log('✓ Vergleich: jeder Tipp geht genau eine Szene weiter; Rückkehr ohne neue Entscheidung');
    await H.close();
  }
  // 3) Freie Bahn (iPad quer): B3 Routine ohne Folge-Moment, V1 vorbei mit Folge-Moment vor der Kurzrückmeldung; Ansagen passend
  {
    const H = await open(IPAD, 'freie-bahn', ['B3', 'V1']); await H.start();
    const s0 = (await H.fiq('ctx')).say; if (s0 !== 'Ein Roter ist hinter dir. Wohin dribbelst du?') fail('B3: Ansage passt nicht zur Lage: ' + s0);
    const w0 = await H.feldPx();
    await H.field(26, 12); const m = await H.wait(['folge', 'kurz', 'feedback']); if (m === 'folge') fail('B3: Folge-Moment nach Routine-Dribbling');
    if ((await H.feldPx()) < w0 * 0.97) fail('B3: Kurzrückmeldung verkleinert das Feld');
    for (const tS = Date.now(); Date.now() - tS < 60000 && (await H.page.evaluate(() => window.__fiq.S.situation)) === 'B3';) {
      const x = await H.wait(['decide', 'feedback', 'kurz', 'wechsel', 'folge']);
      if (x === 'feedback') { await H.tap('#fbNext'); continue; }
      if (x !== 'decide') { await H.page.waitForTimeout(50); continue; }
      const h = await H.page.evaluate(() => { const S = window.__fiq.S, k = FIQ.recommend(S, window.__fiq.ctx.actions); return FIQ.hint(S, k); });
      if (h.point) await H.field(h.point.x, h.point.y); else await H.field(36, h.goal === 0 ? 6 : 18);
    }
    await H.wait('decide', 20000);
    const s1 = (await H.fiq('ctx')).say; if (!/an ihm vorbei/.test(s1)) fail('V1: Ansage „an ihm vorbei“ fehlt: ' + s1 + ' ' + JSON.stringify(await H.page.evaluate(() => [window.__fiq.S.situation, window.__fiq.dec, window.__fiq.S.players.map((p) => [p.id, +p.x.toFixed(1), +p.y.toFixed(1)])])));
    const wv = await H.feldPx();
    await H.field(26, 8.2); const r = await pruefeFolge(H, 'V1');
    if (r.m !== 'kurz' || !r.fo.gruende.includes('ueberwunden')) fail('V1: Folge-Moment „überwunden“ vor der Kurzrückmeldung erwartet: ' + JSON.stringify(r));
    const k = await H.page.$eval('#kurzText', (e) => e.textContent); if (!/vorbei/.test(k)) fail('V1: Kurzrückmeldung nennt „vorbei“ nicht: ' + k);
    await H.wait('decide', 15000); if ((await H.feldPx()) < wv * 0.97) fail('V1: Feld mit Kurzrückmeldung kleiner');
    console.log(`✓ Freie Bahn iPad: B3 Ansage „hinter dir“, kein Folge-Moment nach Routine; V1 Folge-Moment ${r.dauer} ms, dann „${k}“; Feld bleibt gleich groß`);
    fluss.push({ wo: 'V1 vorbei (iPad)', folgeMs: r.dauer });
    await H.close();
  }
  // 4) Rückmeldung verkleinert das Feld nicht: iPad quer/hoch, Handy quer (L4e enge Lücke 💭, mit Folge-Moment)
  for (const [name, vp] of [['iPad quer', IPAD], ['iPad hoch', IPAD_HOCH], ['Handy quer', HANDY]]) {
    const H = await open(vp, 'freie-bahn', ['L4e', 'L4b']); await H.start();
    const w0 = await H.feldPx();
    await H.field(27, 12); await H.wait(['folge', 'feedback']); await H.wait('feedback');
    const w1 = await H.feldPx(); if (w1 < w0 * 0.97) fail(`${name}: Feld mit Rückmeldung kleiner (${Math.round(w0)} → ${Math.round(w1)} px)`);
    for (const s of ['#fbNext', '#fbRetry']) { const b = await H.page.locator(s).boundingBox(); if (!b || b.y + b.height > vp.height || b.x + b.width > vp.width) fail(`${name}: ${s} nicht erreichbar`); }
    console.log(`✓ ${name}: Feld beim Entscheiden ${Math.round(w0)} px, mit Rückmeldung ${Math.round(w1)} px; Knöpfe erreichbar`);
    await H.close();
  }
  }
  // 5) Spielfluss: Freie Bahn Durchlauf 1 mit der Hilfe – Folge-Momente und Gesamtzeit (iPad, Handy)
  for (const [name, vp] of [['iPad', IPAD], ['Handy', HANDY]]) {
    const H = await open(vp, 'freie-bahn'); await H.start(); const t0 = await H.now(); let folgen = 0, entscheidungen = 0;
    while ((await H.mode()) !== 'end') {
      const x = await H.wait(['decide', 'feedback', 'kurz', 'wechsel', 'folge', 'end'], 30000);
      if (x === 'folge') { folgen++; await H.wait(['feedback', 'kurz']); continue; }
      if (x === 'feedback') { await H.tap('#fbNext'); continue; }
      if (x !== 'decide') { await H.page.waitForTimeout(40); continue; }
      entscheidungen++;
      await H.page.waitForTimeout(500);   // wie ein Kind: nicht im selben Augenblick wie „Weiterspielen“ (Doppeltipp-Sperre)
      const h = await H.page.evaluate(() => { const S = window.__fiq.S, k = FIQ.recommend(S, window.__fiq.ctx.actions); return FIQ.hint(S, k); });
      if (h.point) await H.field(h.point.x, h.point.y); else await H.field(36, h.goal === 0 ? 6 : 18);
      try { await H.wait(['anim', 'folge', 'kurz', 'feedback'], 4000); } catch (e) { fail(`${name}: Tipp ohne Wirkung ${JSON.stringify(h)} sel=${JSON.stringify(await H.fiq('sel'))} ctx=${(await H.fiq('ctx')).actions} taps=${JSON.stringify(await H.fiq('taps'))}`); }
    }
    const sek = Math.round((await H.now()) - t0) / 1000;
    if (H.errors.length) fail('JS-Fehler: ' + H.errors.join('; '));
    console.log(`✓ Spielfluss ${name}: Freie Bahn Durchlauf 1 mit Hilfe – ${entscheidungen} Entscheidungen, ${folgen} Folge-Momente, ${sek.toFixed(1)} s (nachgebaute Sprache)`);
    fluss.push({ wo: 'Freie Bahn D1 ' + name, entscheidungen, folgen, sek });
    await H.close();
  }
  if (process.env.FLUSS) fs.writeFileSync(process.env.FLUSS, JSON.stringify(fluss, null, 1));
} catch (e) { console.error('✗ ' + e.message); exit = 1; }
await browser.close(); server.close();
process.exit(exit);
