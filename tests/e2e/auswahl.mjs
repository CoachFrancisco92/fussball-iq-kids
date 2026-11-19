// M3/M1/M2 im Browser: Missionsauswahl (Antippen wählt und liest vor), Start der gewählten Mission, nahtloser
// Situationswechsel ohne Neustart-Bild, kein „Passen“ ohne Mitspieler, „Nochmal“ bringt andere Situationen.
// Mit Touch-Bedienung (iPad-Größe). Testmission wird nur hier per Init-Skript eingespielt.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  fs.readFile(p, (err, data) => { if (err) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); res.end(data); });
}).listen(0);
const base = `http://localhost:${server.address().port}/`;
const fixture = fs.readFileSync(path.join(root, 'tests/fixtures/test-mission-situationen.js'), 'utf8');
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const fail = (m) => { throw new Error(m); };
let exit = 0;

async function open(withTest) {
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript((fx) => {
    window.__said = [];
    if ('speechSynthesis' in window) { const s = speechSynthesis; const orig = s.speak.bind(s); s.speak = (u) => { window.__said.push(u.text); try { orig(u); } catch (e) {} }; }
    if (fx) (0, eval)(fx);
  }, withTest ? fixture : '');
  await page.goto(base + 'index.html');
  const H = {
    page, errors,
    said: () => page.evaluate(() => window.__said.splice(0)),
    mode: () => page.evaluate(() => window.__fiq.mode),
    waitMode: async (m) => { for (let i = 0; i < 500; i++) { if ((await H.mode()) === m) return; await page.waitForTimeout(40); } fail(`Modus ${m} erwartet, ist ${await H.mode()}`); },
    touch: async (sel) => { const b = await page.locator(sel).boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); },
    field: async (x, y) => { const b = await page.$eval('#field', (e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width]; }); const k = b[2] / 40.4; await page.touchscreen.tap(b[0] + (x + 2.2) * k, b[1] + (y + 1.6) * k); },
    until: async (fn, what) => { for (let i = 0; i < 250; i++) { if (await page.evaluate(fn)) return; await page.waitForTimeout(40); } fail('nicht erreicht: ' + what); },
    actions: () => page.$$eval('#actions .act:not(.hint)', (bs) => bs.map((b) => b.textContent.trim())),
  };
  H.choose = async (label) => { if (!(await page.evaluate(() => !!window.__fiq.sel))) await H.touch(`#actions .act:not(.hint) >> text=${label}`); await H.until(() => !!window.__fiq.sel, 'Aktion gewählt'); };
  return H;
}

try {
  // 1) Nur die echten Missionen: drei Karten in Lernpfad-Reihenfolge, die erste ist vorausgewählt; alle wählbar; Missionsart sichtbar
  {
    const H = await open(false);
    const cards = await H.page.$$eval('#missionList .mcard', (cs) => cs.map((c) => ({ id: c.dataset.id, t: c.querySelector('b').textContent, num: c.querySelector('.num').textContent, art: c.querySelector('.art').textContent, sel: c.classList.contains('sel') })));
    const want = [{ id: 'welches-tor-ist-frei', t: 'Welches Tor ist frei?', num: '🥅', art: '🎓 Lernen', sel: true }, { id: 'freie-bahn', t: 'Freie Bahn!', num: '🏃', art: '🎓 Lernen', sel: false }, { id: 'mission-1', t: 'Zusammen sind wir stark!', num: '3', art: '🏆 Spiel', sel: false }];
    if (JSON.stringify(cards) !== JSON.stringify(want)) fail('Startbildschirm: ' + JSON.stringify(cards));
    for (const id of ['welches-tor-ist-frei', 'freie-bahn', 'mission-1']) {
      const box = await H.page.locator(`#missionList .mcard[data-id="${id}"]`).boundingBox();
      if (box.height < 70) fail(`Karte ${id} zu klein zum Antippen: ` + box.height);
    }
    await H.touch('#missionList .mcard[data-id="welches-tor-ist-frei"]');
    const sA = (await H.said()).join(' ');
    if (!/Welches Tor ist frei\?/.test(sA) || !/Vor welchem Tor steht kein Roter/.test(sA) || !/Los geht's/.test(sA)) fail('Antippen Mission A liest nicht vor: ' + sA);
    await H.touch('#missionList .mcard[data-id="freie-bahn"]');
    const sF = (await H.said()).join(' ');
    if (!/Freie Bahn!/.test(sF) || !/Schau, wo kein Roter ist/.test(sF) || !/Los geht's/.test(sF)) fail('Antippen Freie Bahn liest nicht vor: ' + sF);
    await H.touch('#missionList .mcard[data-id="mission-1"]');
    const s1 = (await H.said()).join(' ');
    if (!/Zusammen sind wir stark!/.test(s1) || !/Los geht's/.test(s1)) fail('Antippen liest nicht vor: ' + s1);
    await H.touch('#play'); await H.waitMode('look');
    if ((await H.page.evaluate(() => window.__fiq.S.missionId)) !== 'mission-1') fail('Gewählte Mission 1 nicht gestartet');
    if (H.errors.length) fail('JS-Fehler: ' + H.errors.join('; '));
    console.log('✓ Drei Missionen: „Welches Tor ist frei?“ (🥅), „Freie Bahn!“ (🏃), „Zusammen sind wir stark!“ (3); Missionsart 🎓 Lernen / 🏆 Spiel; Karten groß; Antippen liest Titel und Einladung vor (separat geprüft); gewählte Mission 1 startet mit Schau-Schritt');
    await H.page.context().close();
  }
  // 2) Mit Testmission: Auswahl, Situationswechsel, M2, Nochmal
  {
    const H = await open(true);
    const titles = await H.page.$$eval('#missionList .mcard b', (bs) => bs.map((b) => b.textContent));
    if (titles.join('|') !== 'Welches Tor ist frei?|Freie Bahn!|Test Situationen|Zusammen sind wir stark!') fail('Reihenfolge der Karten (Lernwelt, Nummer): ' + titles.join('|'));
    await H.touch('#missionList .mcard[data-id="mission-1"]');
    const selected = await H.page.$eval('#missionList .mcard.sel', (c) => [c.dataset.id, c.getAttribute('aria-pressed')]);
    if (selected.join() !== 'mission-1,true') fail('Auswahl nicht übernommen: ' + selected);
    if (!(await H.said()).join(' ').includes('Zusammen sind wir stark!')) fail('Mission 1 nicht vorgelesen');
    await H.touch('#missionList .mcard[data-id="test-situationen"]'); await H.said();
    await H.touch('#play'); await H.waitMode('decide');
    if ((await H.page.evaluate(() => window.__fiq.S.situation)) !== 'T1') fail('Durchlauf 1 beginnt nicht mit T1');
    // T1: aufs freie untere Tor
    await H.choose('Schießen'); await H.field(36, 18); await H.waitMode('feedback');
    await H.said();
    await H.touch('#fbNext');
    const afterNext = await H.page.evaluate(() => ({ sit: window.__fiq.S.situation, pos: window.__fiq.S.players.map((p) => [p.id, p.x, p.y]) }));
    const T2 = [['b1', 30.5, 14.5], ['b2', 24, 6], ['r1', 29, 13], ['r2', 34, 16.7]];
    if (afterNext.sit !== 'T2' || JSON.stringify(afterNext.pos) !== JSON.stringify(T2)) fail('Kein nahtloser Wechsel zu T2: ' + JSON.stringify(afterNext));
    await H.waitMode('decide');
    if (!(await H.said()).join(' ').includes('Neue Situation')) fail('Situationswechsel nicht angesagt');
    console.log('✓ Auswahl per Antippen, Reihenfolge Lernwelt → Nummer; nach dem Tor direkt die nächste Situation in ihrer Startaufstellung (kein Neustart-Bild), angesagt');
    // T2: oben frei
    await H.choose('Schießen'); await H.field(36, 6); await H.waitMode('feedback'); await H.touch('#fbNext'); await H.waitMode('decide');
    // T3: 1 gegen 1 – kein Passen
    const acts = await H.actions();
    if (acts.some((a) => /Passen/.test(a)) || !acts.some((a) => /Dribbeln/.test(a))) fail('1 gegen 1 bietet: ' + acts.join(', '));
    await H.choose('Dribbeln'); await H.field(30, 12); await H.waitMode('feedback'); await H.touch('#fbNext'); await H.waitMode('decide');
    const acts2 = await H.actions();
    if (acts2.join() !== '🥅Schießen' && !(acts2.length === 1 && /Schießen/.test(acts2[0]))) fail('Abschluss nach der Grenze fehlt: ' + acts2.join(', '));
    await H.choose('Schießen'); await H.field(36, 6); await H.waitMode('feedback'); await H.touch('#fbNext'); await H.waitMode('end');
    console.log('✓ 1 gegen 1: nur Dribbeln angeboten; nach dem letzten Dribbling in die Zone noch der Abschluss; Mission endet nach 3 Situationen');
    await H.touch('#again'); await H.waitMode('decide');
    if ((await H.page.evaluate(() => window.__fiq.S.situation)) !== 'T2') fail('„Nochmal“ bringt keine anderen Situationen');
    await H.touch('#home');
    await H.until(() => !document.getElementById('startScreen').hidden, 'Startbildschirm');
    if (H.errors.length) fail('JS-Fehler: ' + H.errors.join('; '));
    console.log('✓ „Nochmal“ beginnt mit der nächsten Situationsfolge (T2 …); 🏠 führt zurück zur Missionsauswahl; keine JavaScript-Fehler');
    await H.page.context().close();
  }
} catch (e) { console.error('✗ Auswahl:', e.message); exit = 1; }
finally { await browser.close(); server.close(); process.exit(exit); }
