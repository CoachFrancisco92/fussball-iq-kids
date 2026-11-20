/* Mission „Welches Tor ist frei?“ (Lernwelt 1, Meilenstein 2) – reine Inhaltsdatei, keine Spiellogik.
 * Situationsmission (M1): 2 gegen 2, keine Verteidigungsphase, je Durchlauf 3 Situationen in fester Rotation.
 * Entwurf und Prüfwerte: docs/missions/welches-tor-ist-frei.md; Robustheit A3: tests/analysis/a3-robustheit.js.
 * A4 (erst näher ran dribbeln, dann schießen) seit Meilenstein 4 – mit der Dribbelbewertung aus Paket D.
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
    art: 'lernen', // Lernmission: eine Entscheidung üben (nur Kennzeichnung auf der Karte)
    lernziele: [
      'Vor dem Schuss schauen, vor welchem Tor kein Gegner steht',
      'Auf das freie Tor schießen',
      'Wenn beide Tore zugestellt sind, zu einem freien Freund passen',
      'Wenn das Tor noch zu weit ist, erst näher ran dribbeln und dann schießen',
      'Nach dem Dribbeln nochmal schauen: Welches Tor ist jetzt frei?',
    ],
    einfuehrung: 'Heute schießt du Tore! Schau vor jedem Schuss genau: Vor welchem Tor steht kein Roter? Dorthin schießt du.',

    // Situationen (Blau greift nach rechts an; Tor oben = (36|6), Tor unten = (36|18))
    situationen: [
      // A1: Tor oben zugestellt (r2), Tor unten frei
      { id: 'A1', lernziel: 'torWaehlen', start: lage([31, 12], [24, 19], [29.5, 13.5], [34.5, 7.8]) },
      // A2: Tor unten zugestellt (r2), Tor oben frei
      { id: 'A2', lernziel: 'torWaehlen', start: lage([30.5, 14.5], [24, 6], [29, 13], [34, 16.7]) },
      // A3: beide Tore zugestellt → Pass zu Blau 2, der in der Torzone steht und schießt.
      // Lage auf Robustheit optimiert (±0,5 m je Spieler: 16/16, ±1 m: 14/16) – siehe docs/meilenstein-2.md.
      { id: 'A3', lernziel: 'andereLoesung', start: lage([32, 8], [30.5, 19.5], [33.9, 11.4], [34.2, 7]) },
      // A3m: A3 gespiegelt (y → 24 − y), V0.6a
      { id: 'A3m', lernziel: 'andereLoesung', start: lage([32, 16], [30.5, 4.5], [33.9, 12.6], [34.2, 17]) },
      // A4: noch zu weit fürs Tor – erst in die Schusszone dribbeln (Rot 1 seitlich vorn), dann aufs freie Tor schießen
      // 4 statt 3 Angriffsentscheidungen: auch der andere gute Weg (Pass zu Blau 2 → Freilaufen → Dribbling) endet noch mit dem
      // Torschuss, statt direkt nach der gelungenen Vorbereitung abzubrechen (Vorgabe PO, Meilenstein 4)
      { id: 'A4', lernziel: 'torWaehlen', start: lage([26, 12], [21, 19], [24, 9.5], [34.4, 7.9]), phasen: { maxAngriff: 4 } },
      // A5: beide Tore frei – beide Schüsse sind gleich gut
      { id: 'A5', lernziel: 'torWaehlen', start: lage([30.5, 13], [24, 6], [28.5, 13], [34, 12]) },
      // V0.6a W1 „Schau nochmal!“: beide Tore wirken frei; beim Hineindribbeln stellt sich Rot 2 vor das untere Tor
      // (vorhandenes Torwächter-Verhalten). Rot 2 bei y = 13,0 (nicht mittig), damit die Lage robust ist (16/16 bei ±0,5 m).
      { id: 'W1', lernziel: 'nochmalSchauen', start: lage([26, 12.5], [21, 19], [23.5, 9.5], [33.6, 13.0]), phasen: { maxAngriff: 4 } },
      { id: 'W1m', lernziel: 'nochmalSchauen', start: lage([26, 11.5], [21, 5], [23.5, 14.5], [33.6, 11.0]), phasen: { maxAngriff: 4 } },
    ],
    // Jede Situation 3-mal in 5 Durchläufen, jeder Durchlauf beginnt anders; danach wieder von vorn.
    // Durchlauf 1 unverändert (A1 · A2 · A5); A4 kommt ab Durchlauf 2 dazu.
    // V0.6a: jeder Durchlauf enthält alle vier Lernschritte (freies Tor erkennen, gespiegelt bzw. zu weit, beide zu,
    // Lage verändert sich). Durchlauf 1 = A1 → A2 → A3 → W1 (PO-Vorgabe); danach Spiegelungen und A4/A5 im Wechsel.
    durchlaeufe: [['A1', 'A2', 'A3', 'W1'], ['A2', 'A5', 'A3m', 'W1m'], ['A4', 'A1', 'A3', 'W1m'], ['A5', 'A2', 'A3m', 'W1'], ['A1', 'A4', 'A3m', 'W1m']],

    phasen: { maxAngriff: 3, verteidigung: 0, abschlussNachGrenze: true },

    // Der Schau-Schritt fragt nach freien Freunden – hier geht es um freie Tore.
    schauSchritt: [],

    // Lernweg: erst Tor prüfen, sonst näher ran, sonst abspielen. Andere gute Wege werden trotzdem als gut bewertet.
    hilfe: { reihenfolge: ['schiessen', 'dribbeln', 'passen'], alternativenNennen: false },

    texte: {
      kontext: {
        // neutral, weil in A3 der Pass die richtige Lösung ist; kurz, weil beim Wechsel schon „Schau genau hin“ kommt
        abschluss: { say: 'Welches Tor ist frei? Schießen oder passen?' },
        // A4: außerhalb der Schusszone – erst näher ran (Standardtexte würden nur zum Passen auffordern)
        angriffFrei: { title: 'Noch zu weit fürs Tor', say: 'Noch zu weit fürs Tor! Dribbel näher ran – oder pass zu deinem Freund.' },
        angriffDruck: { title: 'Noch zu weit fürs Tor', say: 'Noch zu weit fürs Tor! Dribbel am Roten vorbei näher ran – oder pass.' },
      },
      ende: {
        merksatz: ' Vor dem Schuss schaust du: Wo steht kein Roter? Und wenn beide Tore zu sind, hilft dir ein Freund.',
      },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
