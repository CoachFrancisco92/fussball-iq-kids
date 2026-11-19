// NUR FÜR TESTS: Mission mit mehreren Situationen (M1) und 1 gegen 1 (M2). Lagen angelehnt an die Entwürfe
// „Welches Tor ist frei?“ (A1, A2) und „Freie Bahn!“ (B3). Keine echte Mission, nicht in index.html.
(function (root) {
  const sp = (o) => Object.entries(o).map(([id, [x, y]]) => ({ id, x, y }));
  (root.FIQ_MISSIONS = root.FIQ_MISSIONS || []).push({
    id: 'test-situationen', nummer: 97, titel: 'Test Situationen', untertitel: '', merkmale: [], lernwelt: 1, lernziele: ['Test'],
    situationen: [
      { id: 'T1', start: { ballbesitz: 'b1', spieler: sp({ b1: [31, 12], b2: [24, 19], r1: [29.5, 13.5], r2: [34.5, 7.8] }) } },
      { id: 'T2', start: { ballbesitz: 'b1', spieler: sp({ b1: [30.5, 14.5], b2: [24, 6], r1: [29, 13], r2: [34, 16.7] }) } },
      { id: 'T3', start: { ballbesitz: 'b1', spieler: sp({ b1: [22, 12], r1: [19.5, 12] }) }, phasen: { maxAngriff: 1 } },
    ],
    durchlaeufe: [['T1', 'T2', 'T3'], ['T2', 'T3', 'T1'], ['T3', 'T1', 'T2']],
    phasen: { maxAngriff: 3, verteidigung: 0, abschlussNachGrenze: true },
    hilfe: { reihenfolge: ['schiessen', 'dribbeln', 'passen'], alternativenNennen: true },
    schauSchritt: [], texte: {},
  });
})(globalThis);
