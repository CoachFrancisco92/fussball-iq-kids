/* Mission „Freie Bahn!“ (Lernwelt 1, Meilenstein 4) – reine Inhaltsdatei, keine Spiellogik.
 * Situationsmission (M1): 1 gegen 1 bzw. 1 gegen 2, kein Mitspieler (M2: nur Dribbeln, in der Schusszone nur Schießen),
 * je Durchlauf 3 Situationen in fester Rotation. Bewertung des Dribbelns: Paket D (E1–E6).
 * Entwurf: docs/missions/freie-bahn.md; Prüfung der Lagen: tests/analysis/freie-bahn/pruefung.js; Bericht: docs/meilenstein-4.md.
 */
(function (root) {
  'use strict';
  const lage = (b1, ...rote) => ({
    ballbesitz: 'b1',
    spieler: [{ id: 'b1', x: b1[0], y: b1[1] }, ...rote.map((r, i) => ({ id: 'r' + (i + 1), x: r[0], y: r[1] }))],
  });
  (root.FIQ_MISSIONS = root.FIQ_MISSIONS || []).push({
    id: 'freie-bahn',
    nummer: 3,
    art: 'lernen',
    symbol: '🏃',
    titel: 'Freie Bahn!',
    untertitel: 'Freie Wege finden',
    merkmale: ['1 gegen 1', '1 gegen 2', 'Dribbeln'],
    lernwelt: 1, // „Ich und der Ball“
    lernziele: [
      'Erkennen, wo kein Gegner ist, und dorthin dribbeln',
      'Einen Gegner umgehen statt auf ihn zuzulaufen – durch die Lücke oder außen herum',
      'Nah am Tor aufs freie Tor schießen',
    ],
    einfuehrung: 'Heute dribbelst du! Schau, wo kein Roter ist, und dribbel dorthin. Nah am Tor schießt du aufs freie Tor.',

    // Blau greift nach rechts an; Tore rechts oben (36|6) und unten (36|18). Jede Situation fragt etwas anderes:
    situationen: [
      // B3: Verfolger hinten – nach vorn ist alles frei: zügig Richtung Tor (rückwärts/quer ohne Grund ist 💭)
      { id: 'B3', start: lage([18, 12], [15.5, 12]) },
      // B4: Gegner frontal – nicht in ihn hinein, sondern seitlich vorbei (oben oder unten, beides gut)
      { id: 'B4', start: lage([17, 12], [23, 12]) },
      // B2: zwei Gegner mit großer Lücke – durch die Lücke ODER außen herum (beides gut)
      { id: 'B2', start: lage([12, 12], [19, 7], [19, 17]) },
      // B6: zwei Gegner dicht beieinander – die Lücke ist zu eng, außen herum ist der freie Weg
      { id: 'B6', start: lage([12, 12], [18.5, 10.6], [18.5, 13.4]) },
      // B5: viel Platz, ein Gegner vor dem unteren Tor – große Stücke Richtung Tor, dann aufs freie (obere) Tor schießen
      { id: 'B5', start: lage([12, 13], [23, 3], [32, 17]) },
    ],
    // Jede Situation 3-mal in 5 Durchläufen, jeder Durchlauf beginnt anders; der erste beginnt mit den 1-gegen-1-Lagen.
    durchlaeufe: [['B3', 'B4', 'B2'], ['B4', 'B5', 'B6'], ['B2', 'B6', 'B3'], ['B5', 'B3', 'B4'], ['B6', 'B2', 'B5']],

    // 5 Dribbel-Entscheidungen je Situation (Hilfe braucht 2–3); erreicht die letzte die Schusszone, folgt noch der Schuss
    phasen: { maxAngriff: 5, verteidigung: 0, abschlussNachGrenze: true },
    schauSchritt: [], // kein Mitspieler
    hilfe: { reihenfolge: ['dribbeln', 'schiessen'], alternativenNennen: false },

    texte: {
      kontext: {
        // ohne Mitspieler: kein „Passen oder dribbeln?“ und kein „welcher Freund frei steht“
        angriffFrei: { title: 'Wohin dribbelst du?', tag: 'Dribbeln', say: 'Wohin dribbelst du? Tippe dorthin, wo kein Roter ist.' },
        angriffDruck: { title: 'Wohin dribbelst du?', tag: 'Dribbeln', say: 'Ein Roter ist nah! Dribbel an ihm vorbei – Richtung Tor.' },
      },
      ende: {
        merksatz: ' Beim Dribbeln schaust du: Wo ist frei? Dorthin dribbelst du – und vor dem Tor schießt du aufs freie Tor.',
      },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
