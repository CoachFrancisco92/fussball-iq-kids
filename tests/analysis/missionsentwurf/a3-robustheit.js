// Analyse (kein Test): A3 „Pass zum freien Mitspieler, dann Abschluss“ – für welche Mitspieler-Positionen klappt der Weg
// Pass → (Kontext abschluss) → freies Tor ohne künstliches Erzwingen? Ausgabe: Raster über die Position von b2.
const H = require('./harness.js');
const { E } = H;
const base = (b2) => [{ id: 'b1', x: 32, y: 8 }, { id: 'b2', x: b2.x, y: b2.y }, { id: 'r1', x: 33.1, y: 10.8 }, { id: 'r2', x: 34.2, y: 7 }];
const rows = []; let n = 0, ok = 0, okZone = 0;
for (let y = 13; y <= 23; y++) {
  let line = String(y).padStart(2) + ' ';
  for (let x = 24; x <= 35; x++) {
    const id = `a3-${x}-${y}`; const sp = base({ x, y });
    H.register({ id, start: { ballbesitz: 'b1', spieler: sp }, neustart: { red: { ballbesitz: 'r1', spieler: sp }, blue: { ballbesitz: 'b1', spieler: sp } }, phasen: { maxAngriff: 3, verteidigung: 0 } });
    const s = E.newState(id); const sit = E.situation(s);
    if (sit.ok.shoot) { line += ' S'; continue; }        // ein Tor wäre für b1 frei – keine A3-Lage
    if (!sit.ok.mate) { line += ' ·'; continue; }        // Mitspieler nicht frei
    n++;
    const r = H.play(id, (s2, ctx, i) => (i === 0 ? { kind: 'pass', id: 'b2' } : H.hintAction(s2, ctx)));
    const second = r.steps[1];
    const zone = second && second.ctx.startsWith('abschluss');
    if (zone) okZone++;
    if (r.end === 'Tor') ok++;
    line += ' ' + (r.end === 'Tor' ? (zone && r.decisions === 2 ? 'T' : 't') : r.end === 'Ballverlust' ? 'x' : '-');
  }
  rows.push(line);
}
console.log('    ' + Array.from({ length: 12 }, (_, i) => String(24 + i).slice(-2).padStart(2)).join(''));
console.log(rows.join('\n'));
console.log(`\nLegende: T = Pass, danach direkt Abschluss-Moment und Tor (2 Entscheidungen); t = Tor erst über Freilaufen/Umweg; x = Ballverlust; - = Grenze; · = Mitspieler nicht frei; S = b1 hätte selbst ein freies Tor`);
console.log(`A3-Lagen (beide Tore zu, Mitspieler frei): ${n}, davon direkt Abschluss-Moment ${okZone}, Tor über Hilfe-Weg ${ok}`);
