// Mission „Freie Bahn!“ im Browser (iPad-Größe, Touch): Auswahl, alle 5 Durchläufe über „Nochmal“, nur Dribbeln bzw.
// Schießen, gute und schlechte Dribblings mit Erklärung, beide Wege in B2, enge Lücke B6, freies Tor in B5, Hilfe-Wege,
// nahtloser Situationswechsel. Zeichnet eine Mitschrift auf und vergleicht sie mit der Referenz (referenz.js → freieBahn.ui).
// Darunter die Vorlage aus Mission A:
// Mission „Welches Tor ist frei?“ im Browser (iPad-Größe, Touch): Auswahl, alle 4 Durchläufe über „Nochmal“,
// Hilfe und gesprochene Rückmeldungen, A3 komplett (Pass → Annahme → Schuss), A5 beide Tore ⭐, Fehlschüsse mit Erklärung,
// nahtloser Situationswechsel (nächste Startaufstellung sofort sichtbar, angesagt). Zeichnet eine Mitschrift auf und
// vergleicht sie mit der Referenz (tests/golden/referenz.js → missionA.ui).
//   node tests/e2e/mission-a.mjs                 -> prüfen + vergleichen
//   node tests/e2e/mission-a.mjs --write F       -> Mitschrift nach F schreiben (Referenz bzw. vorgelegte Aufnahme erzeugen)
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
const ID = 'freie-bahn';
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
  const log = []; globalThis.__log = log;

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
    if (plan.h.eng || plan.h.genau) fail('Hilfe ohne sicheren Weg: ' + plan.h.say);
    if ((plan.k === 'dribbeln' || plan.k === 'freilaufen') && plan.h.point) taps.push([plan.h.point.x, plan.h.point.y]); // Dribbel- bzw. Laufziel
    for (const t of taps) await field(...t);
    return plan;
  };
  const shoot = async (goal) => { await choose('Schießen'); await field(36, goal === 0 ? 6 : 18); };
  const pass = async (id) => { await choose('Passen'); const q = await page.evaluate((i) => { const p = FIQ.P(window.__fiq.S, i); return [p.x, p.y]; }, id); await field(...q); };
  const expectStar = (fb, star, what) => { if ((fb.fb[4] === '⭐') !== star) fail(`${what}: ${star ? '⭐' : '💭'} erwartet, ist ${fb.fb[4]} – ${fb.fb[0]}`); };
  const end = async (what) => { await waitMode('end'); log.push({ end: what, said: await said(), stars: await page.$$eval('#stars span', (x) => x.map((s) => (s.classList.contains('on') ? '★' : '☆')).join('')), score: await text('#endScore'), msg: await text('#endMsg') }); };

  const dribble = async (x, y) => { await choose('Dribbeln'); await field(x, y); };
  const onlyDribble = async (where) => { const a = await actions(); if (a.length !== 1 || !/Dribbeln/.test(a[0])) fail(`${where}: Aktionen ${a.join(', ')}`); };
  // Hilfe bis zum Tor dieser Situation (max. 6 Entscheidungen), nur ⭐
  const helpToGoal = async (sit) => {
    for (let i = 0; i < 6; i++) { const fb = await (async () => { await viaHint(); return feedback(); })(); expectStar(fb, true, `${sit} Hilfe ${i + 1}`);
      const goal = /Toooor/.test(fb.said.join(' ')); const r = await next(); if (goal) return r; const st = await decision(sit + ' weiter'); if (st.sit !== sit) fail(`${sit}: Situation endet ohne Tor`); }
    fail(sit + ': kein Tor mit der Hilfe');
  };

  // Start: drei Karten, „Freie Bahn!“ antippen (vorgelesen), starten
  log.push({ start: await page.$$eval('#missionList .mcard', (cs) => cs.map((c) => [c.dataset.id, c.querySelector('.num').textContent, c.querySelector('b').textContent, c.querySelector('small').textContent, c.classList.contains('sel')])) });
  await touch(`#missionList .mcard[data-id="${ID}"]`); const gew = await said(); log.push({ gewaehlt: gew });
  if (!/Freie Bahn!/.test(gew.join(' ')) || !/Schau, wo kein Roter ist/.test(gew.join(' '))) fail('Antippen liest nicht vor: ' + gew);
  await touch('#play');

  // Durchlauf 1 (B3 · B4 · B2) mit der Hilfe; in B2 zusätzlich der andere Weg (außen herum)
  let st = await decision('entscheiden'); if (st.sit !== 'B3') fail('Durchlauf 1 beginnt nicht mit B3');
  await onlyDribble('B3'); if (/[Pp]ass|Freund/.test(log[log.length - 1].said.join(' '))) fail('Ansage nennt Passen/Freund');
  await helpToGoal('B3');
  st = await decision('entscheiden'); if (st.sit !== 'B4') fail('B4 erwartet'); await helpToGoal('B4');
  st = await decision('entscheiden'); if (st.sit !== 'B2') fail('B2 erwartet');
  await dribble(19, 22); expectStar(await feedback(), true, 'B2 außen herum (unten)'); await next();
  await decision('B2 weiter'); await helpToGoal('B2');
  await end('Durchlauf 1');
  console.log('✓ Durchlauf 1 (B3 · B4 · B2): nur „Dribbeln“, Ansagen ohne Passen; Hilfe bis zum Tor nur ⭐; in B2 auch außen herum ⭐');

  // Durchlauf 2 (B4 · B5 · B6): B4 frontal in den Gegner 💭 (Ballverlust, Erklärung); B5 aufs zugestellte Tor 💭; B6 enge Lücke 💭, dann außen herum
  await touch('#again');
  st = await decision('entscheiden'); if (st.sit !== 'B4') fail('Durchlauf 2 beginnt nicht mit B4');
  await dribble(25, 12); const f4 = await feedback(); expectStar(f4, false, 'B4 in den Gegner');
  if (!/direkt auf einen Gegner/.test(f4.said.join(' '))) fail('B4: Erklärung fehlt: ' + f4.said); await next();
  st = await decision('entscheiden'); if (st.sit !== 'B5') fail('B5 erwartet');
  for (let i = 0; i < 6; i++) { if ((await actions()).some((a) => /Schießen/.test(a))) break; await viaHint(); expectStar(await feedback(), true, 'B5 Hilfe'); await next(); await decision('B5 weiter'); }
  await choose('Schießen'); await field(36, 18); const f5 = await feedback(); expectStar(f5, false, 'B5 unteres Tor (zugestellt)');
  if (!/Rot 2/.test(f5.said.join(' '))) fail('B5: Erklärung fehlt: ' + f5.said); await next();
  st = await decision('entscheiden'); if (st.sit !== 'B6') fail('B6 erwartet');
  await dribble(20, 12); const f6 = await feedback(); expectStar(f6, false, 'B6 durch die enge Lücke');
  if (!/Dribbel weiter weg von Rot|direkt auf einen Gegner|knapp/.test(f6.said.join(' '))) fail('B6: Erklärung fehlt: ' + f6.said);
  if ((await next()) !== 'end') { st = await state(); if (st.sit === 'B6') { await decision('B6 weiter'); await helpToGoal('B6'); } }
  await end('Durchlauf 2');
  console.log('✓ Durchlauf 2 (B4 · B5 · B6): in den Gegner 💭 mit Erklärung, zugestelltes Tor 💭 mit Erklärung, enge Lücke 💭');

  // Durchläufe 3–5 mit der Hilfe; Rückkehr zu Durchlauf 1
  for (const [d, order] of [[3, ['B2', 'B6', 'B3']], [4, ['B5', 'B3', 'B4']], [5, ['B6', 'B2', 'B5']]]) {
    await touch('#again');
    for (const sit of order) { st = await decision('entscheiden'); if (st.sit !== sit) fail(`Durchlauf ${d}: ${sit} erwartet, ist ${st.sit}`); await helpToGoal(sit); }
    await end('Durchlauf ' + d);
  }
  // Endbildschirm nach 12 Entscheidungen: „Nochmal“ ohne Scrollen erreichbar (iPad quer)
  const again = await page.locator('#again').boundingBox(); if (!again || again.y + again.height > 768) fail('„Nochmal“ außerhalb des Bildschirms: ' + JSON.stringify(again));
  await touch('#again'); st = await decision('entscheiden'); if (st.sit !== 'B3') fail('Nach Durchlauf 5 nicht wieder B3');
  if (errors.length) fail('JS-Fehler: ' + errors.join('; '));
  console.log('✓ Durchläufe 3–5 mit der Hilfe: jede Situation endet mit Tor, nur ⭐; Rückkehr zu Durchlauf 1; keine JavaScript-Fehler' + (process.env.SLOW ? ` (CPU ${process.env.SLOW}× gedrosselt)` : ''));

  const wi = process.argv.indexOf('--write');
  if (wi > 0) { fs.writeFileSync(process.argv[wi + 1], JSON.stringify(log, null, 1)); console.log('Mitschrift geschrieben:', process.argv[wi + 1]); }
  else {
    const J = (x) => JSON.stringify(x), ref = JSON.parse(fs.readFileSync(path.join(here, '..', 'golden', REF.freieBahn.ui), 'utf8'));
    for (let k = 0; k < Math.max(ref.length, log.length); k++) if (J(ref[k]) !== J(log[k])) fail(`Mitschrift weicht ab bei Eintrag ${k}\n  Referenz: ${J(ref[k])}\n  jetzt:    ${J(log[k])}`);
    console.log(`✓ Mitschrift identisch zur Referenz ${REF.freieBahn.ui} (${ref.length} Einträge)`);
  }
  await ctx.close();
} catch (e) { console.error('✗ Freie Bahn:', e.message); if (process.env.DEBUG && globalThis.__log) console.error(JSON.stringify(globalThis.__log.slice(-4))); exit = 1; }
finally { await browser.close(); server.close(); process.exit(exit); }
