// QS nach Kindertest V0.6.0: Schafft eine Entscheidung neue Handlungsmöglichkeiten – und wie gut ist das wahrnehmbar?
// Je Situation der Lernmissionen (und Mission-1-Start): gute Entscheidungen (Hilfe + gute Alternativen) und typische
// Fehler werden simuliert. Gemessen: Dauer, Gegnerreaktion (Weg in m und px auf dem iPad), neue Möglichkeiten danach
// (freie Tore, freie Pässe, überwundene Gegner), genannte Ursachen, sichtbar gemachte Ursachen, Satzanzahl.
//   node tests/analysis/v0.6/qs-wahrnehmung.js [--json datei]
const fs = require('node:fs');
const E = require('../../helpers/load.js');
const F = E.F;
const PX_PRO_M = 24;          // iPad quer, Lernausschnitt, Entscheidungsansicht (CSS-px, gemessen an Bildschirmfotos)
const PX_PRO_M_BLATT = 19;    // dto. mit offenem Rückmeldeblatt
const SICHTBAR = new Set(['lueckeDurch', 'lueckeZuEng', 'waechterVerschoben', 'waechterErkannt', 'ueberspielt', 'passwegFrei']);
const MAP = { passen: 'pass', schiessen: 'shoot', dribbeln: 'dribble', freilaufen: 'run', erobern: 'press', raum: 'cover' };

const einzeln = (m, sit) => { const id = 'qs-' + m.id + '-' + sit.id; if (!globalThis.FIQ_MISSIONS.some((x) => x.id === id)) globalThis.FIQ_MISSIONS.push(Object.assign({}, m, { id, situationen: [sit], durchlaeufe: [[sit.id]] })); return id; };
const lage = (s) => {
  const c = E.carrier(s);
  if (!c || c.team !== 'blue') return { tore: [], paesse: [], vor: [], zone: false, ballweg: true };
  return {
    tore: E.shotOptions(s).filter((o) => o.margin > E.CFG.shotLaneOk).map((o) => o.goal),
    paesse: c && c.team === 'blue' ? E.passOptions(s).filter((p) => p.margin > E.CFG.passLaneOk).map((p) => p.id) : [],
    vor: c ? E.team(s, 'red').filter((r) => r.x > c.x + 0.3).map((r) => r.id) : [],
    zone: !!(c && c.x >= F.W - F.ZONE - 0.3),
  };
};
function kandidaten(s, ctx) {
  const out = [], c = E.carrier(s);
  const k = E.recommend(s, ctx.actions), h = E.hint(s, k), a = { kind: MAP[k] };
  if (h.ids) a.id = h.ids[0]; if (h.point) { a.x = h.point.x; a.y = h.point.y; } if (h.goal != null) a.goal = h.goal;
  out.push({ art: 'Hilfe', a });
  if (ctx.actions.includes('schiessen')) for (const g of [0, 1]) out.push({ art: 'Schuss ' + (g ? 'unten' : 'oben'), a: { kind: 'shoot', goal: g } });
  if (ctx.actions.includes('passen')) for (const b of E.team(s, 'blue').filter((x) => x !== c)) out.push({ art: 'Pass ' + b.id, a: { kind: 'pass', id: b.id } });
  if (ctx.actions.includes('dribbeln')) for (let deg = -120; deg <= 120; deg += 30) for (const d of [3, 6]) {
    const x = c.x + Math.cos((deg * Math.PI) / 180) * d, y = c.y + Math.sin((deg * Math.PI) / 180) * d;
    if (x > 0.5 && x < F.W - 0.5 && y > 0.5 && y < F.H - 0.5) out.push({ art: `Dribbeln ${deg}°/${d} m`, a: { kind: 'dribble', x, y } });
  }
  return out;
}
function simuliere(s0, a) {
  const s = E.clone(s0), vorher = lage(s0), start = new Map(s0.players.map((p) => [p.id, { x: p.x, y: p.y }]));
  const weg = new Map();
  E.startAction(s, a); let n = 0;
  const last = new Map(start);
  while (!s.ep.done && n++ < 3000) { E.tick(s); for (const p of s.players) { const l = last.get(p.id); weg.set(p.id, (weg.get(p.id) || 0) + Math.hypot(p.x - l.x, p.y - l.y)); last.set(p.id, { x: p.x, y: p.y }); } }
  const fb = E.feedback(s), nl = lage(s), nachher = s.done || nl.ballweg ? null : nl;
  const roteVersatz = E.team(s, 'red').map((r) => ({ id: r.id, netto: Math.hypot(r.x - start.get(r.id).x, r.y - start.get(r.id).y) }));
  const neu = nachher ? {
    tore: nachher.tore.filter((g) => !vorher.tore.includes(g)),
    paesse: nachher.paesse.filter((id) => !vorher.paesse.includes(id)),
    ueberwunden: vorher.vor.filter((id) => !nachher.vor.includes(id)),
    zone: nachher.zone && !vorher.zone,
    toreZu: vorher.tore.filter((g) => !nachher.tore.includes(g)),
  } : null;
  return { dauer: +(n / 60).toFixed(2), fb, roteVersatz, neu, nachher, tor: !!fb.goal };
}
function analysiere(missionId, sitIds) {
  const m = E.mission(missionId), res = [];
  for (const sit of m.situationen.filter((x) => !sitIds || sitIds.includes(x.id))) {
    const id = einzeln(m, sit), s0 = E.newState(id, 0), ctx = E.context(s0, null);
    const zeilen = [];
    for (const k of kandidaten(s0, ctx)) {
      const ev = E.evaluate(s0, k.a), r = simuliere(s0, k.a);
      const u = r.fb.ursachen.map((x) => x.typ), maxRot = Math.max(...r.roteVersatz.map((x) => x.netto));
      const neueMoeglichkeit = !!(r.neu && (r.neu.tore.length || r.neu.paesse.length || r.neu.ueberwunden.length || r.neu.zone));
      zeilen.push({ art: k.art, gut: ev.good, dauer: r.dauer, maxRotM: +maxRot.toFixed(2), maxRotPx: Math.round(maxRot * PX_PRO_M), tor: r.tor, neu: r.neu, neueMoeglichkeit, ursachen: u, sichtbar: u.filter((t) => SICHTBAR.has(t)), saetze: r.fb.say.split(/(?<=[.!?])\s+/).length, say: r.fb.say });
    }
    const gut = zeilen.filter((z) => z.gut && !z.tor), fehl = zeilen.filter((z) => !z.gut);
    res.push({
      mission: missionId, sit: sit.id, lernziel: sit.lernziel, kandidaten: zeilen.length,
      gute: gut.length,
      guteMitNeuerMoeglichkeit: gut.filter((z) => z.neueMoeglichkeit).length,
      guteOhneGenannteUrsache: gut.filter((z) => !z.ursachen.length).length,
      guteUrsacheNurGesprochen: gut.filter((z) => z.ursachen.length && !z.sichtbar.length).length,
      fehler: fehl.length, fehlerOhneUrsache: fehl.filter((z) => !z.ursachen.length).length,
      gegnerReaktionMedianM: median(zeilen.map((z) => z.maxRotM)), gegnerReaktionMedianPx: median(zeilen.map((z) => z.maxRotPx)),
      dauerMedian: median(zeilen.map((z) => z.dauer)),
      hilfe: zeilen[0],
      zeilen,
    });
  }
  return res;
}
const median = (a) => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : 0; };

const alle = [...analysiere('welches-tor-ist-frei'), ...analysiere('freie-bahn')];
for (const r of alle) {
  const h = r.hilfe;
  console.log(`${r.mission === 'freie-bahn' ? 'FB' : 'A '} ${r.sit.padEnd(5)} ${String(r.lernziel).padEnd(15)} gut ${String(r.gute).padStart(2)}/${String(r.kandidaten).padStart(2)} | neue Möglichkeit ${r.guteMitNeuerMoeglichkeit}/${r.gute} | ohne Ursache ${r.guteOhneGenannteUrsache} | Ursache nur gesprochen ${r.guteUrsacheNurGesprochen} | Fehler ohne Ursache ${r.fehlerOhneUrsache}/${r.fehler} | Rot bewegt (Median) ${r.gegnerReaktionMedianM} m ≈ ${r.gegnerReaktionMedianPx} px | Dauer ${r.dauerMedian} s`);
  console.log(`      Hilfe: ${h.art} → ${h.tor ? 'TOR' : JSON.stringify(h.neu)} | „${h.say}“`);
}
const ji = process.argv.indexOf('--json'); if (ji > 0) fs.writeFileSync(process.argv[ji + 1], JSON.stringify(alle, null, 1));
