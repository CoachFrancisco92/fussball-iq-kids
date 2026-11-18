// NUR FÜR TESTS – keine echte Mission, wird nicht ausgeliefert.
// Beweist, dass die Engine eine andere Aufstellung, andere Phasen und eigene Texte
// verarbeitet, ohne dass engine.js geändert werden muss.
(function (root) {
  (root.FIQ_MISSIONS = root.FIQ_MISSIONS || []).push({
    id: 'test-mission',
    nummer: 99,
    titel: 'Testmission',
    untertitel: 'nur für automatische Tests',
    merkmale: ['3 gegen 3'],
    lernwelt: 1,
    lernziele: ['Engine-Unabhängigkeit nachweisen'],
    start: {
      ballbesitz: 'b2',
      spieler: [
        { id: 'b1', x: 8, y: 6 }, { id: 'b2', x: 10, y: 12 }, { id: 'b3', x: 8, y: 18 },
        { id: 'r1', x: 20, y: 12 }, { id: 'r2', x: 26, y: 6 }, { id: 'r3', x: 26, y: 18 },
      ],
    },
    neustart: {
      red: { ballbesitz: 'r2', spieler: [{ id: 'r1', x: 30, y: 12 }, { id: 'r2', x: 33, y: 8 }, { id: 'r3', x: 30, y: 18 }, { id: 'b1', x: 20, y: 8 }, { id: 'b2', x: 22, y: 12 }, { id: 'b3', x: 20, y: 16 }] },
      blue: { ballbesitz: 'b2', spieler: [{ id: 'b1', x: 4, y: 6 }, { id: 'b2', x: 3, y: 12 }, { id: 'b3', x: 4, y: 18 }, { id: 'r1', x: 16, y: 12 }, { id: 'r2', x: 14, y: 6 }, { id: 'r3', x: 14, y: 18 }] },
    },
    phasen: { maxAngriff: 2, verteidigung: 1 },
    schauSchritt: [],
    texte: { kontext: { angriffFrei: { title: 'Testtitel' } }, ende: { merksatz: ' Test-Merksatz.' } },
  });
})(globalThis);
