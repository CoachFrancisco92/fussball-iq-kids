/* Mission „Welches Tor ist frei?“ (Lernwelt 1, Meilenstein 2) – reine Inhaltsdatei, keine Spiellogik.
 * Situationsmission (M1): 2 gegen 2, keine Verteidigungsphase, je Durchlauf 3 Situationen in fester Rotation.
 * Entwurf und Prüfwerte: docs/missions/welches-tor-ist-frei.md; Robustheit A3: tests/analysis/a3-robustheit.js.
 * A4 (Dribbeln bis in die Torzone) ist bewusst nicht enthalten – erst nach Paket D.
 */
(function (root) {
  'use strict';
  const lage = (b1, b2, r1, r2) => ({
    ballbesitz: 'b1',
    spieler: [
      { id: 'b1', x: b1[0], y: b1[1] }, { id: 'b2', x: b2[0], y: b2[1] },
      { id: 'r1', x: r1[0], y: r1[1] }, { id: 'r2', x: r2[0], y: r2[1] },
    ],
  });
  (root.FIQ_MISSIONS = root.FIQ_MISSIONS || []).push({
    id: 'welches-tor-ist-frei',
    nummer: 2,
    symbol: '🥅',
    titel: 'Welches Tor ist frei?',
    untertitel: 'Erst schauen, dann schießen',
    merkmale: ['2 gegen 2', '4 Minitore', 'Torschuss'],
    lernwelt: 1, // „Ich und der Ball“
    lernziele: [
      'Vor dem Schuss schauen, vor welchem Tor kein Gegner steht',
      'Auf das freie Tor schießen',
      'Wenn beide Tore zugestellt sind, zu einem freien Freund passen',
    ],
    einfuehrung: 'Heute schießt du Tore! Schau vor jedem Schuss genau: Vor welchem Tor steht kein Roter? Dorthin schießt du.',

    // Situationen (Blau greift nach rechts an; Tor oben = (36|6), Tor unten = (36|18))
    situationen: [
      // A1: Tor oben zugestellt (r2), Tor unten frei
      { id: 'A1', start: lage([31, 12], [24, 19], [29.5, 13.5], [34.5, 7.8]) },
      // A2: Tor unten zugestellt (r2), Tor oben frei
      { id: 'A2', start: lage([30.5, 14.5], [24, 6], [29, 13], [34, 16.7]) },
      // A3: beide Tore zugestellt → Pass zu Blau 2, der in der Torzone steht und schießt.
      // Lage auf Robustheit optimiert (±0,5 m je Spieler: 16/16, ±1 m: 14/16) – siehe docs/meilenstein-2.md.
      { id: 'A3', start: lage([32, 8], [30.5, 19.5], [33.9, 11.4], [34.2, 7]) },
      // A5: beide Tore frei – beide Schüsse sind gleich gut
      { id: 'A5', start: lage([30.5, 13], [24, 6], [28.5, 13], [34, 12]) },
    ],
    // Jede Situation 3-mal in 4 Durchläufen, jeder Durchlauf beginnt anders; danach wieder von vorn.
    durchlaeufe: [['A1', 'A2', 'A5'], ['A2', 'A3', 'A1'], ['A5', 'A1', 'A3'], ['A3', 'A5', 'A2']],

    phasen: { maxAngriff: 3, verteidigung: 0, abschlussNachGrenze: true },

    // Der Schau-Schritt fragt nach freien Freunden – hier geht es um freie Tore.
    schauSchritt: [],

    // Lernweg: erst Tor prüfen, sonst näher ran, sonst abspielen. Andere gute Wege werden trotzdem als gut bewertet.
    hilfe: { reihenfolge: ['schiessen', 'dribbeln', 'passen'], alternativenNennen: false },

    texte: {
      kontext: {
        // neutral, weil in A3 der Pass die richtige Lösung ist; kurz, weil beim Wechsel schon „Schau genau hin“ kommt
        abschluss: { say: 'Welches Tor ist frei? Schießen oder passen?' },
      },
      ende: {
        merksatz: ' Vor dem Schuss schaust du: Wo steht kein Roter? Und wenn beide Tore zu sind, hilft dir ein Freund.',
      },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
