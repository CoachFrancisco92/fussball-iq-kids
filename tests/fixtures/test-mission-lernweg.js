// NUR FÜR TESTS: gleiche Aufstellung wie Mission 1, aber anderer Lernweg in der Hilfe (Dribbeln zuerst),
// Hilfe nennt Alternativen, keine Verteidigungsphase. Prüft E2/E3/E5 ohne echte neue Mission.
(function (root) {
  const m1 = root.FIQ_MISSIONS.find((m) => m.id === 'mission-1');
  (root.FIQ_MISSIONS = root.FIQ_MISSIONS || []).push(Object.assign(JSON.parse(JSON.stringify(m1)), {
    id: 'test-lernweg', nummer: 98, titel: 'Test Lernweg', texte: {},
    hilfe: { reihenfolge: ['dribbeln', 'schiessen', 'passen'], alternativenNennen: true },
    phasen: { maxAngriff: 3, verteidigung: 0 }, schauSchritt: [],
  }));
})(globalThis);
