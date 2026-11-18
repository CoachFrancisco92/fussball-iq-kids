// Hilfsmodul für diff.js: erzeugt die vollständigen Logs der 200 Kinder-Abfolgen mit einer gegebenen Engine.
module.exports = (E) => {
  const { playMission, lcg } = require('./trace.js');
  const out = {};
  for (let seed = 1; seed <= 200; seed++) {
    const rnd = lcg(seed);
    out[seed] = playMission(E, (E2, s, ctx) => {
      const F = E2.F, c = E2.carrier(s), blues = E2.team(s, 'blue');
      const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
      const spot = () => ({ x: -5 + rnd() * (F.W + 10), y: -5 + rnd() * (F.H + 10) });
      const k = pick(ctx.actions);
      if (k === 'passen') { if (rnd() < 0.6) return { kind: 'pass', id: pick(blues.filter((b) => b !== c)).id }; return Object.assign({ kind: 'pass' }, spot()); }
      if (k === 'dribbeln') return Object.assign({ kind: 'dribble' }, spot());
      if (k === 'schiessen') return { kind: 'shoot', goal: rnd() < 0.5 ? 0 : 1 };
      if (k === 'freilaufen') return Object.assign({ kind: 'run', id: pick(blues.filter((b) => b !== c)).id }, spot());
      if (k === 'erobern') return { kind: 'press', id: pick(blues).id };
      return Object.assign({ kind: 'cover', id: pick(blues).id }, spot());
    });
  }
  return out;
};
