// Oberflächen-Mitschrift: Was sagt und zeigt die App in festen Abläufen?
// Nachweis, dass Mission 1 nach Umbauten für das Kind identisch bleibt.
//   node tests/e2e/transcript.mjs            -> vergleicht mit der gültigen Referenz (tests/golden/referenz.js)
//   node tests/e2e/transcript.mjs --write F  -> schreibt die Mitschrift nach F (Referenz erzeugen)
//   ROOT=/pfad/zum/stand                     -> anderen Stand ausliefern (z. B. alte Version)
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = process.env.ROOT || path.join(here, '..', '..');
const REF = createRequire(import.meta.url)('../golden/referenz.js');
const golden = path.join(here, '..', 'golden', REF.ui);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  fs.readFile(p, (err, data) => { if (err) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); res.end(data); });
}).listen(0);
const base = `http://localhost:${server.address().port}/`;
const fail = (m) => { throw new Error(m); };

async function flow(browser, name, steps) {
  const page = await browser.newPage({ viewport: { width: 1024, height: 700 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.__said = [];
    if (true) { /* V0.5.1: nachgebaute Sprachausgabe, die jede Ansage im selben Moment beendet – die Mitschrift hält jede angeforderte Ansage fest, unabhängig vom Sprachsystem der Umgebung; Zeitverhalten prüft e2e/navigation.mjs */ const fake = { speaking: false, pending: false, paused: false, speak(u) { window.__said.push(u.text); if (u.onend) u.onend({}); }, cancel() {}, resume() {}, pause() {}, getVoices() { return []; }, addEventListener() {} }; Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true }); }
  });
  await page.goto(base + 'index.html', { waitUntil: 'domcontentloaded' });
  const log = [];
  const text = (sel) => page.$eval(sel, (e) => (e.hidden ? '' : e.textContent.trim())).catch(() => '');
  const mode = () => page.evaluate(() => window.__fiq.mode);
  const waitMode = async (m, ms = 25000) => { const t = Date.now(); while (Date.now() - t < ms) { if ((await mode()) === m) return; await page.waitForTimeout(40); } fail(`${name}: warte auf ${m}, ist ${await mode()}`); };
  const until = async (fn, what) => { const t = Date.now(); while (Date.now() - t < 4000) { if (await page.evaluate(fn)) return; await page.waitForTimeout(40); } fail(`${name}: ${what}`); };
  const tap = async (x, y) => { const b = await page.$eval('#field', (e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width]; }); const s = b[2] / 40.4; await page.mouse.click(b[0] + (x + 2.2) * s, b[1] + (y + 1.6) * s); };
  const flush = async (where) => { const said = await /* V0.5.1: erst lesen, wenn die Sprachsteuerung alle angeforderten Ansagen gestartet hat */ (await page.waitForFunction(() => { const s = window.__fiq && window.__fiq.speech; return !s || (!s.cur && !s.queue.length); }, null, { timeout: 5000 }), page.evaluate(() => window.__said.splice(0))); log.push({ where, said, title: await text('#title'), tag: await text('#tag'), step: await text('#step') }); };
  const fb = async () => { await waitMode('feedback'); await flush('feedback'); log.push({ fb: [await text('#fbText'), await text('#fbTip'), await text('#fbRec'), await text('#fbExe'), await text('#fbStar')], compare: await page.isVisible('#fbCompare') }); };
  const choose = async (label) => { if (!(await page.evaluate(() => !!window.__fiq.sel))) await page.locator('#actions .act', { hasText: label }).click(); await until(() => !!window.__fiq.sel, 'Aktion gewählt'); };
  const taps = async (list) => { for (let i = 0; i < list.length; i++) { await tap(...list[i]); if (i < list.length - 1) await until(() => window.__fiq.sel && window.__fiq.sel.step === 2, 'Spieler gewählt'); } };
  const pos = (id) => page.evaluate((i) => { const p = FIQ.P(window.__fiq.S, i); return [p.x, p.y]; }, id);
  const H = { page, waitMode, until, tap, taps, choose, fb, flush, pos, mode };

  // Seit Meilenstein 2 mehrere Missionen: die Mitschrift gilt Mission 1 – deren Karte wird gelesen und gewählt.
  // Die Ansage beim Antippen der Karte prüft e2e/auswahl.mjs; sie wird hier verworfen, damit die Mitschrift ab „Los geht's“
  // mit der Referenz vergleichbar bleibt. Ältere Stände (ROOT=…) haben nur eine Karte ohne data-id.
  const card = (await page.$('.mcard[data-id="mission-1"]')) ? '.mcard[data-id="mission-1"]' : '.mcard';
  log.push({ start: [await text('#startScreen h1'), await text(card + ' b'), await text(card + ' small'), await text(card + ' .chips')] });
  if (card !== '.mcard') { await page.click(card); await page.evaluate(() => window.__said.splice(0)); }
  await page.click('#play');
  for (const st of steps) await st(H);
  await flush('ende');
  log.push({ end: [await text('#stars'), await text('#endScore'), await text('#endMsg'), await text('#endList')] });
  if (errors.length) fail(`${name}: JS-Fehler ${errors.join('; ')}`);
  await page.close();
  return log;
}

// Hilfe befolgen (wie ein Kind, das 💡 nutzt)
const viaHint = async (H) => {
  const plan = await H.page.evaluate(() => { const S = window.__fiq.S, c = window.__fiq.ctx; const k = FIQ.recommend(S, c.actions); return { k, h: FIQ.hint(S, k) }; });
  await H.page.click('#actions .hint'); await H.until(() => !!window.__fiq.sel, 'Hilfe');
  const t = []; if (plan.h.ids) t.push(await H.pos(plan.h.ids[0])); if (plan.h.point) t.push([plan.h.point.x, plan.h.point.y]); if (plan.h.goal != null) t.push([36, plan.h.goal === 0 ? 6 : 18]);
  await H.taps(t);
};
const next = async (H) => { await H.page.click('#fbNext'); };
const settle = async (H) => { const t = Date.now(); while (Date.now() - t < 8000) { const m = await H.mode(); if (['decide', 'look', 'end'].includes(m)) return m; await H.page.waitForTimeout(40); } return H.mode(); };
const restViaHint = async (H) => { for (let i = 0; i < 8; i++) { const m = await settle(H); if (m === 'end') return; if (m === 'look') { const id = await H.page.evaluate(() => FIQ.passOptions(window.__fiq.S).sort((a, b) => b.margin - a.margin)[0].id); await H.tap(...(await H.pos(id))); await H.waitMode('decide'); await H.flush('nach Schau-Schritt'); } else await H.flush('entscheiden'); await viaHint(H); await H.fb(); await next(H); } };

const FLOWS = {
  'Schau falsch/richtig, Fehlpass, Wiederholen, Vergleichen, Rest mit Hilfe': [
    async (H) => { await H.waitMode('look'); await H.flush('schau'); await H.tap(19, 19.5); await H.until(() => window.__fiq.look && window.__fiq.look.tries === 1, 'Antwort 1'); await H.flush('schau falsch'); await H.tap(24, 6); await H.waitMode('decide'); await H.flush('schau richtig → entscheiden'); },
    async (H) => { await H.choose('Passen'); await H.flush('Passen gewählt'); await H.taps([[19, 19.5]]); await H.fb(); },
    async (H) => { await H.page.click('#fbRetry'); await H.waitMode('decide'); await H.flush('anders probieren'); await H.choose('Passen'); await H.taps([[24, 6]]); await H.fb(); },
    async (H) => { await H.page.click('#fbCompare'); await H.waitMode('replay'); await H.page.click('#skip'); await H.waitMode('feedback'); await H.flush('nach Vergleich'); await next(H); },
    restViaHint,
    async (H) => { await H.page.click('#hl'); await H.waitMode('replay'); await H.page.click('#skip'); await H.waitMode('end'); },
  ],
  'Keiner ist frei, Ball im Aus, Verteidigung': [
    async (H) => {
      for (const target of [[10, 13], [6, 13], [3, 16], [3, 20]]) {
        const m = await settle(H);
        if (m === 'look') { await H.page.click('#lookNone'); await H.until(() => window.__fiq.look && window.__fiq.look.tries >= 1, 'keiner frei'); await H.flush('keiner frei 1'); if (!(await H.page.evaluate(() => window.__fiq.look.done))) { await H.page.click('#lookNone'); await H.flush('keiner frei 2'); } await H.waitMode('decide'); await H.flush('entscheiden'); }
        await H.choose('Dribbeln'); await H.taps([target]); await H.fb(); await next(H);
      }
    },
    restViaHint,
  ],
  'Falscher Verteidiger und falscher Ort': [
    async (H) => { await H.waitMode('look'); await H.tap(24, 6); await H.waitMode('decide'); await H.choose('Passen'); await H.taps([[19, 19.5]]); await H.fb(); await next(H); },
    async (H) => { await settle(H); await H.flush('verteidigung 1'); await H.choose('Ball erobern'); const far = await H.page.evaluate(() => { const S = window.__fiq.S, c = FIQ.carrier(S); const b = FIQ.team(S, 'blue').sort((a, b2) => FIQ.dist(b2, c) - FIQ.dist(a, c))[0]; return [b.x, b.y]; }); await H.taps([far]); await H.fb(); await next(H); },
    async (H) => { const m = await settle(H); if (m === 'end') return; await H.flush('verteidigung 2'); await H.choose('Weg versperren'); const b = await H.pos('b2'); await H.taps([b, [33, 21]]); await H.fb(); await next(H); },
    restViaHint,
  ],
};

let exit = 0;
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : {});
try {
  const result = {};
  for (const [name, steps] of Object.entries(FLOWS)) result[name] = await flow(browser, name, steps);
  const wi = process.argv.indexOf('--write');
  if (wi > 0) { fs.writeFileSync(process.argv[wi + 1], JSON.stringify(result, null, 1)); console.log('Mitschrift geschrieben:', process.argv[wi + 1]); }
  else {
    const ref = JSON.parse(fs.readFileSync(golden, 'utf8'));
    const J = (x) => JSON.stringify(x);
    // Vorgelegte, noch nicht freigegebene Abweichungen: genau diese Einträge dürfen abweichen (alt = Referenz, neu = jetzt).
    const pi = process.argv.indexOf('--pending-write');
    if (pi > 0) {
      const out = {};
      for (const name of Object.keys(ref)) {
        const ra = ref[name], rb = result[name] || [];
        if (ra.length !== rb.length) throw new Error(`${name}: andere Anzahl Einträge (${ra.length} → ${rb.length}) – Ablauf geändert, nicht nur Text`);
        ra.forEach((x, i) => { if (J(x) !== J(rb[i])) (out[name] = out[name] || []).push({ eintrag: i, alt: x, neu: rb[i] }); });
      }
      fs.writeFileSync(process.argv[pi + 1], JSON.stringify(out, null, 1) + '\n'); console.log('Abweichungen geschrieben:', process.argv[pi + 1]);
    }
    const gdir = path.join(here, '..', 'golden'), pending = {};
    if (pi < 0) for (const f of fs.readdirSync(gdir).filter((n) => /^abweichungen-.*-ui\.json$/.test(n))) for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(path.join(gdir, f), 'utf8')))) pending[k] = (pending[k] || []).concat(v);
    for (const name of Object.keys(ref)) {
      const ra = ref[name], rb = result[name] || [], listed = new Map((pending[name] || []).map((d) => [d.eintrag, d]));
      const bad = [];
      for (let i = 0; i < Math.max(ra.length, rb.length); i++) {
        const d = listed.get(i);
        if (d ? J(d.alt) !== J(ra[i]) || J(d.neu) !== J(rb[i]) : J(ra[i]) !== J(rb[i])) bad.push(i);
      }
      if (bad.length) {
        const i = bad[0];
        console.error(`✗ ${name}: Abweichung bei Eintrag ${i}${listed.has(i) ? ' (anders als vorgelegt)' : ''}\n  Referenz: ${J(ra[i])}\n  jetzt:    ${J(rb[i])}`); exit = 1;
      } else console.log(`✓ ${name}: identisch zur Referenz ${REF.seit}${listed.size ? ` bis auf ${listed.size} vorgelegte Abweichung(en)` : ''} (${ra.length} Einträge)`);
    }
  }
} catch (e) { console.error('✗', e.message); exit = 1; }
finally { await browser.close(); server.close(); process.exit(exit); }
