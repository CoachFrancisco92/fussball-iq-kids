// Rechenzeit der Dribbel-Vorausrechnung (Paket D) im Browser mit gedrosselter CPU (Standard 4×, wie ein langsames Tablet).
// Gemessen je Lage, in der „Dribbeln“ angeboten wird (Mission 1 mit Hilfe und mit Kinder-Abfolgen, Mission A,
// Entwurfslagen B1–B5 und A4):
//   – Bewertung eines Dribblings (erste Entscheidung in einer neuen Lage = „kalt“),
//   – Hilfe 💡 „Dribbeln“ (kalt, also ohne vorher bewertete Ziele),
//   – Wiederholung (Hilfe erneut, Bewertung des Hilfeziels, „Wiederholen“ derselben Lage).
// Grenzwert je Messung: 150 ms (Richtwert des Product Owners). Aufruf: node tests/e2e/rechenzeit.mjs [Drosselung]
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
const RATE = Number(process.argv[2] || process.env.SLOW || 4), LIMIT = 150;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  fs.readFile(p, (err, data) => { if (err) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); res.end(data); });
}).listen(0);
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : {});
let exit = 0;
try {
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${server.address().port}/index.html`);
  await page.waitForFunction(() => window.FIQ && window.__fiq);
  // Lagen im Browser erzeugen (ohne Drosselung), dann drosseln und messen
  await page.evaluate(() => {
    const E = window.FIQ, MAP = { passen: 'pass', schiessen: 'shoot', dribbeln: 'dribble', freilaufen: 'run' };
    const L = []; window.__lagen = L;
    const add = (s, ctx) => { if (ctx.actions.includes('dribbeln')) L.push(E.clone(s)); };
    let x = 12345; const rnd = () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
    const play = (id, d, choose) => { const s = E.newState(id, d), m = E.newMission(id, d); let last = null;
      for (let i = 0; i < 14 && !m.done; i++) { const c = E.context(s, last); add(s, c); const a = choose(s, c); if (!a) break;
        E.startAction(s, a); let n = 0; while (!s.ep.done && n++ < 3000) E.tick(s); const fb = E.feedback(s); E.missionAfter(m, s, c.type); E.missionApply(m, s); last = { kind: a.kind, success: fb.success, team: s.poss }; } };
    const hint = (s, c) => { const k = E.recommend(s, c.actions), h = E.hint(s, k), a = { kind: MAP[k] || (k === 'raum' ? 'cover' : 'press') }; if (h.ids && h.ids.length) a.id = h.ids[0]; if (h.point) { a.x = h.point.x; a.y = h.point.y; } if (h.goal != null) a.goal = h.goal; return a; };
    const kid = (s, c) => { const k = c.actions[Math.floor(rnd() * c.actions.length)], blues = E.team(s, 'blue'), cr = E.carrier(s);
      if (k === 'dribbeln') return { kind: 'dribble', x: rnd() * 36, y: rnd() * 24 }; if (k === 'schiessen') return { kind: 'shoot', goal: rnd() < 0.5 ? 0 : 1 };
      if (k === 'passen') return { kind: 'pass', id: blues.find((b) => b !== cr).id }; if (k === 'freilaufen') return { kind: 'run', id: blues.find((b) => b !== cr).id, x: rnd() * 36, y: rnd() * 24 };
      return k === 'erobern' ? { kind: 'press', id: blues[0].id } : { kind: 'cover', id: blues[0].id, x: 8, y: 12 }; };
    play('mission-1', 0, hint);
    for (let i = 0; i < 8; i++) play('mission-1', 0, kid);
    for (let d = 0; d < 4; d++) play('welches-tor-ist-frei', d, kid);
    const P = (id, x, y) => ({ id, x, y });
    const ent = [[P('b1', 17, 14), P('r1', 22, 9)], [P('b1', 18, 12), P('r1', 15.5, 12)], [P('b1', 17, 12), P('r1', 23, 12)], [P('b1', 12, 12), P('r1', 19, 7), P('r2', 19, 17)], [P('b1', 12, 13), P('r1', 23, 3), P('r2', 32, 17)], [P('b1', 26, 12), P('b2', 21, 19), P('r1', 24, 9.5), P('r2', 34.4, 7.9)]];
    ent.forEach((sp, i) => { const id = 'rz-' + i; window.FIQ_MISSIONS.push({ id, nummer: 90 + i, titel: id, lernwelt: 9, lernziele: ['x'], schauSchritt: [], texte: {}, situationen: [{ id: 'P', start: { ballbesitz: 'b1', spieler: sp } }], phasen: { maxAngriff: 5, verteidigung: 0 } }); L.push(E.newState(id, 0)); });
  });
  const n = await page.evaluate(() => window.__lagen.length);
  const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
  const res = await page.evaluate(() => {
    const E = window.FIQ, out = { evalKalt: [], hilfeKalt: [], hilfeWieder: [], evalHilfeziel: [], wiederholen: [] };
    const t = (f) => { const a = performance.now(); f(); return performance.now() - a; };
    window.__lagen.forEach((s, i) => {
      const c = E.carrier(s);
      // abwechselnd: zuerst eine Bewertung (Kind tippt ohne Hilfe) bzw. zuerst die Hilfe – beides „kalt“
      if (i % 2 === 0) out.evalKalt.push(t(() => E.evaluate(s, { kind: 'dribble', x: c.x + 5, y: c.y + (i % 4 === 0 ? 3 : -3) })));
      else { let h; out.hilfeKalt.push(t(() => { h = E.hint(s, 'dribbeln'); })); }
      let h; out.hilfeWieder.push(t(() => { h = E.hint(s, 'dribbeln'); }));
      out.evalHilfeziel.push(t(() => E.evaluate(s, { kind: 'dribble', x: h.point.x, y: h.point.y })));
      out.wiederholen.push(t(() => E.evaluate(E.clone(s), { kind: 'dribble', x: c.x + 5, y: c.y + (i % 4 === 0 ? 3 : -3) }))); // „Wiederholen“: gleiche Lage erneut
    });
    return out;
  });
  const stat = (a) => { const b = a.slice().sort((x, y) => x - y); return { n: b.length, median: Math.round(b[Math.floor(b.length / 2)]), max: Math.round(b[b.length - 1]) }; };
  const rows = Object.fromEntries(Object.entries(res).map(([k, v]) => [k, stat(v)]));
  console.table(rows);
  const over = Object.entries(rows).filter(([, v]) => v.max > LIMIT);
  if (over.length) { console.error(`✗ Rechenzeit bei ${RATE}× Drosselung über ${LIMIT} ms: ${over.map(([k, v]) => `${k} max ${v.max} ms`).join(', ')}`); exit = 1; }
  else console.log(`✓ Rechenzeit bei ${RATE}× gedrosselter CPU in ${n} Lagen: jede Bewertung und jede Hilfe ≤ ${LIMIT} ms (max ${Math.max(...Object.values(rows).map((v) => v.max))} ms)`);
  await ctx.close();
} catch (e) { console.error('✗ Rechenzeit:', e.message); exit = 1; }
finally { await browser.close(); server.close(); process.exit(exit); }
