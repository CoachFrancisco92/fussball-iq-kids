// Mission „Welches Tor ist frei?“ im Browser (iPad-Größe, Touch): Auswahl, alle 4 Durchläufe über „Nochmal“,
// Hilfe und gesprochene Rückmeldungen, A3 komplett (Pass → Annahme → Schuss), A5 beide Tore ⭐, Fehlschüsse mit Erklärung,
// nahtloser Situationswechsel (nächste Startaufstellung sofort sichtbar, angesagt). Zeichnet eine Mitschrift auf und
// vergleicht sie mit der Referenz (tests/golden/referenz.js → missionA.ui).
//   node tests/e2e/mission-a.mjs                 -> prüfen + vergleichen
//   node tests/e2e/mission-a.mjs --write F       -> Mitschrift nach F schreiben (Referenz erzeugen, nur nach Freigabe)
//   SLOW=6 node tests/e2e/mission-a.mjs          -> mit 6-fach gedrosselter CPU (langsames Gerät)
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
const REF = createRequire(import.meta.url)('../golden/referenz.js');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  fs.readFile(p, (err, data) => { if (err) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); res.end(data); });
}).listen(0);
const base = `http://localhost:${server.address().port}/`;
const fail = (m) => { throw new Error(m); };
const ID = 'welches-tor-ist-frei';
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : {});
let exit = 0;

try {
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  if (process.env.SLOW) { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.SLOW) }); }
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.__said = [];
    if ('speechSynthesis' in window) { const s = speechSynthesis; const orig = s.speak.bind(s); s.speak = (u) => { window.__said.push(u.text); try { orig(u); } catch (e) {} }; }
  });
  await page.goto(base + 'index.html');
  const mode = () => page.evaluate(() => window.__fiq.mode);
  const waitMode = async (m) => { const t = Date.now(); while (Date.now() - t < 25000) { if (errors.length) fail('JS-Fehler: ' + errors.join('; ')); if ((await mode()) === m) return; await page.waitForTimeout(40); } fail(`Modus ${m} erwartet, ist ${await mode()}`); };
  const until = async (fn, what, arg) => { const t = Date.now(); while (Date.now() - t < 4000) { if (await page.evaluate(fn, arg)) return; await page.waitForTimeout(40); } fail('nicht erreicht: ' + what); };
  const touch = async (sel) => { const b = await page.locator(sel).first().boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); };
  const field = async (x, y) => { const b = await page.$eval('#field', (e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width]; }); const k = b[2] / 40.4; await page.touchscreen.tap(b[0] + (x + 2.2) * k, b[1] + (y + 1.6) * k); };
  const text = (sel) => page.$eval(sel, (e) => (e.hidden ? '' : e.textContent.trim())).catch(() => '');
  const said = () => page.evaluate(() => window.__said.splice(0));
  const actions = () => page.$$eval('#actions .act:not(.hint)', (bs) => bs.map((b) => b.textContent.trim()));
  const state = () => page.evaluate(() => ({ sit: window.__fiq.S.situation, p: window.__fiq.S.players.map((p) => [p.id, +p.x.toFixed(2), +p.y.toFixed(2)]), carrier: FIQ.carrier(window.__fiq.S) && FIQ.carrier(window.__fiq.S).id }));
  const startOf = (id) => page.evaluate(([mid, sid]) => FIQ.mission(mid).situationen.find((x) => x.id === sid).start.spieler.map((p) => [p.id, p.x, p.y]), [ID, id]);
  const log = [];

  const decision = async (where) => { await waitMode('decide'); const st = await state(); log.push({ where, sit: st.sit, said: await said(), title: await text('#title'), tag: await text('#tag'), actions: await actions() }); return st; };
  const choose = async (label) => { if (!(await page.evaluate(() => !!window.__fiq.sel))) await touch(`#actions .act:not(.hint) >> text=${label}`); await until(() => !!window.__fiq.sel, 'Aktion gewählt'); };
  const feedback = async () => {
    await waitMode('feedback');
    const fb = { said: await said(), fb: [await text('#fbText'), await text('#fbTip'), await text('#fbRec'), await text('#fbExe'), await text('#fbStar')] };
    log.push(fb); return fb;
  };
  // Weiter: Bei Situationswechsel muss sofort die neue Startaufstellung zu sehen sein (kein Neustart-Bild), angesagt.
  const next = async () => {
    const before = await state();
    await touch('#fbNext');
    const m = await mode(); if (m === 'end') return 'end';
    const after = await state();
    if (after.sit !== before.sit) {
      const want = await startOf(after.sit);
      if (JSON.stringify(after.p) !== JSON.stringify(want)) fail(`Situationswechsel ${before.sit}→${after.sit}: Aufstellung ${JSON.stringify(after.p)} statt ${JSON.stringify(want)}`);
      if (!(await page.isHidden('#feedback'))) fail('Rückmeldung bleibt beim Situationswechsel stehen');
      const st = await text('#step');
      if (!/Neue Situation/.test(st)) fail('Situationswechsel nicht angezeigt: ' + st);
      log.push({ wechsel: [before.sit, after.sit], step: st });
    }
    return 'weiter';
  };
  const viaHint = async () => {
    const plan = await page.evaluate(() => { const S = window.__fiq.S, c = window.__fiq.ctx, k = FIQ.recommend(S, c.actions); return { k, h: FIQ.hint(S, k) }; });
    await touch('#actions .hint'); await until(() => !!window.__fiq.sel, 'Hilfe wählt Aktion');
    log.push({ hilfe: plan.k, said: await said() });
    const taps = []; if (plan.h.ids) taps.push(await page.evaluate((id) => { const q = FIQ.P(window.__fiq.S, id); return [q.x, q.y]; }, plan.h.ids[0]));
    if (plan.h.goal != null) taps.push([36, plan.h.goal === 0 ? 6 : 18]);
    for (const t of taps) await field(...t);
    return plan;
  };
  const shoot = async (goal) => { await choose('Schießen'); await field(36, goal === 0 ? 6 : 18); };
  const pass = async (id) => { await choose('Passen'); const q = await page.evaluate((i) => { const p = FIQ.P(window.__fiq.S, i); return [p.x, p.y]; }, id); await field(...q); };
  const expectStar = (fb, star, what) => { if ((fb.fb[4] === '⭐') !== star) fail(`${what}: ${star ? '⭐' : '💭'} erwartet, ist ${fb.fb[4]} – ${fb.fb[0]}`); };
  const end = async (what) => { await waitMode('end'); log.push({ end: what, said: await said(), stars: await page.$$eval('#stars span', (x) => x.map((s) => (s.classList.contains('on') ? '★' : '☆')).join('')), score: await text('#endScore'), msg: await text('#endMsg') }); };

  // Start: vorausgewählt, vorlesen, starten
  log.push({ start: await page.$$eval('#missionList .mcard', (cs) => cs.map((c) => [c.dataset.id, c.querySelector('.num').textContent, c.querySelector('b').textContent, c.querySelector('small').textContent, c.classList.contains('sel')])) });
  await touch(`#missionList .mcard[data-id="${ID}"]`); log.push({ gewaehlt: await said() });
  await touch('#play');

  // Durchlauf 1 (A1 · A2 · A5) mit der Hilfe
  for (const sit of ['A1', 'A2', 'A5']) {
    const st = await decision('entscheiden');
    if (st.sit !== sit) fail(`Durchlauf 1: ${sit} erwartet, ist ${st.sit}`);
    if (st.carrier !== 'b1') fail('Blau 1 hat nicht den Ball');
    await viaHint(); expectStar(await feedback(), true, `Hilfe in ${sit}`);
    await next();
  }
  await end('Durchlauf 1');
  console.log('✓ Durchlauf 1 (A1 · A2 · A5) mit der Hilfe: 3 Tore, 3 Sterne, Situationswechsel ohne Zwischenbild und angesagt');

  // Durchlauf 2 (A2 · A3 · A1): A3 komplett – Pass zu Blau 2, Blau 2 nimmt an und schießt (kein Freilaufen)
  await touch('#again');
  let st = await decision('entscheiden'); if (st.sit !== 'A2') fail('„Nochmal“ bringt nicht Durchlauf 2');
  await shoot(0); expectStar(await feedback(), true, 'A2 Tor oben'); await next();
  st = await decision('entscheiden'); if (st.sit !== 'A3') fail('A3 erwartet');
  await pass('b2'); expectStar(await feedback(), true, 'A3 Pass'); await next();
  st = await decision('nach Pass'); if (st.sit !== 'A3' || st.carrier !== 'b2') fail('A3: Blau 2 hat nach dem Pass nicht den Ball: ' + JSON.stringify(st));
  const acts = await actions(); if (!acts.some((a) => /Schießen/.test(a)) || acts.some((a) => /Freilaufen/.test(a))) fail('A3 nach dem Pass: ' + acts.join(', '));
  await viaHint(); expectStar(await feedback(), true, 'A3 Schuss Blau 2'); await next();
  st = await decision('entscheiden'); if (st.sit !== 'A1') fail('A1 erwartet');
  await shoot(1); expectStar(await feedback(), true, 'A1 Tor unten'); await next();
  await end('Durchlauf 2');
  console.log('✓ Durchlauf 2 (A2 · A3 · A1): A3 vollständig – Pass ⭐ → Blau 2 im Abschluss (kein Freilaufen) → Tor ⭐');

  // Durchlauf 3 (A5 · A1 · A3): A5 aufs obere Tor (das, was die Hilfe nicht zeigt) ⭐; Fehlschüsse mit Erklärung
  await touch('#again');
  st = await decision('entscheiden'); if (st.sit !== 'A5') fail('Durchlauf 3 beginnt nicht mit A5');
  await shoot(0); expectStar(await feedback(), true, 'A5 Tor oben'); await next();
  st = await decision('entscheiden'); if (st.sit !== 'A1') fail('A1 erwartet');
  await shoot(0); const b1 = await feedback(); expectStar(b1, false, 'A1 Tor oben (zugestellt)');
  if (!/Rot 2 stand vor dem Tor/.test(b1.said.join(' ')) || !/Das andere Tor war frei/.test(b1.said.join(' '))) fail('A1 Fehlschuss: Erklärung fehlt: ' + b1.said);
  await next();
  st = await decision('entscheiden'); if (st.sit !== 'A3') fail('A3 erwartet');
  await shoot(1); const b3 = await feedback(); expectStar(b3, false, 'A3 Schuss trotz zugestellter Tore');
  if (!/Beide Tore waren zugestellt/.test(b3.said.join(' '))) fail('A3 Fehlschuss: Erklärung fehlt: ' + b3.said);
  await next();
  await end('Durchlauf 3');
  console.log('✓ Durchlauf 3 (A5 · A1 · A3): A5 auch aufs andere freie Tor ⭐; geblockte Schüsse werden verständlich erklärt');

  // Durchlauf 4 (A3 · A5 · A2): A5 aufs untere Tor ⭐ (beide gleich gut), A2 falsches Tor
  await touch('#again');
  st = await decision('entscheiden'); if (st.sit !== 'A3') fail('Durchlauf 4 beginnt nicht mit A3');
  await viaHint(); expectStar(await feedback(), true, 'A3 Hilfe Pass'); await next();
  await decision('nach Pass'); await viaHint(); expectStar(await feedback(), true, 'A3 Hilfe Schuss'); await next();
  st = await decision('entscheiden'); if (st.sit !== 'A5') fail('A5 erwartet');
  await shoot(1); expectStar(await feedback(), true, 'A5 Tor unten'); await next();
  st = await decision('entscheiden'); if (st.sit !== 'A2') fail('A2 erwartet');
  await shoot(1); expectStar(await feedback(), false, 'A2 Tor unten (zugestellt)'); await next();
  await end('Durchlauf 4');
  // Danach wieder Durchlauf 1
  await touch('#again'); st = await decision('entscheiden'); if (st.sit !== 'A1') fail('Nach Durchlauf 4 nicht wieder A1');
  if (errors.length) fail('JS-Fehler: ' + errors.join('; '));
  console.log('✓ Durchlauf 4 (A3 · A5 · A2) und Rückkehr zu Durchlauf 1; keine JavaScript-Fehler' + (process.env.SLOW ? ` (CPU ${process.env.SLOW}× gedrosselt)` : ''));

  const wi = process.argv.indexOf('--write');
  if (wi > 0) { fs.writeFileSync(process.argv[wi + 1], JSON.stringify(log, null, 1)); console.log('Mitschrift geschrieben:', process.argv[wi + 1]); }
  else {
    const ref = JSON.parse(fs.readFileSync(path.join(here, '..', 'golden', REF.missionA.ui), 'utf8'));
    const J = (x) => JSON.stringify(x);
    const i = ref.findIndex((x, k) => J(x) !== J(log[k]));
    if (i >= 0 || ref.length !== log.length) { const k = i >= 0 ? i : Math.min(ref.length, log.length); fail(`Mitschrift weicht ab bei Eintrag ${k}\n  Referenz: ${J(ref[k])}\n  jetzt:    ${J(log[k])}`); }
    console.log(`✓ Mitschrift identisch zur Referenz ${REF.missionA.ui} (${ref.length} Einträge)`);
  }
  await ctx.close();
} catch (e) { console.error('✗ Mission A:', e.message); exit = 1; }
finally { await browser.close(); server.close(); process.exit(exit); }
