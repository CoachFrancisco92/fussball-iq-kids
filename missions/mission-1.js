/* Mission 1 „Zusammen sind wir stark!“ – reine Inhaltsdatei, keine Spiellogik.
 * Felder: siehe docs/missionen.md. Koordinaten in Metern (Feld 36 × 24, Blau greift nach rechts an).
 * Eine neue Mission = neue Datei nach diesem Muster + <script>-Eintrag in index.html + Eintrag in scripts/site-files.json.
 */
(function (root) {
  'use strict';
  (root.FIQ_MISSIONS = root.FIQ_MISSIONS || []).push({
    id: 'mission-1',
    nummer: 1,
    titel: 'Zusammen sind wir stark!',
    untertitel: 'Erst schauen, dann entscheiden',
    merkmale: ['3 gegen 3', '4 Minitore', 'Angriff + Verteidigung'],
    lernwelt: 2, // „Wir spielen zusammen“ (mit Verteidigungsanteil)
    lernziele: [
      'Einen freien Mitspieler erkennen und anspielen',
      'Sich ohne Ball freilaufen und ein freies Tor wählen',
      'Den Ballführenden unter Druck setzen und den Weg zum Tor versperren',
    ],

    // Ausgangsaufstellung
    start: {
      ballbesitz: 'b1',
      spieler: [
        { id: 'b1', x: 14, y: 13 }, { id: 'b2', x: 24, y: 6 }, { id: 'b3', x: 19, y: 19.5 },
        { id: 'r1', x: 18.5, y: 12.5 }, { id: 'r2', x: 28, y: 13 }, { id: 'r3', x: 18, y: 16.8 },
      ],
      ball: { x: 14.4, y: 13 },
    },

    // Neustarts nach Tor oder Ball im Aus: Aufstellung je Team, das den Ball bekommt
    neustart: {
      red: {
        ballbesitz: 'r1',
        spieler: [
          { id: 'r1', x: 33.5, y: 12 }, { id: 'r2', x: 31, y: 4 }, { id: 'r3', x: 31, y: 20 },
          { id: 'b1', x: 17, y: 11 }, { id: 'b2', x: 24.5, y: 8 }, { id: 'b3', x: 26.5, y: 15 },
        ],
      },
      blue: {
        ballbesitz: 'b1',
        spieler: [
          { id: 'b1', x: 2.5, y: 12 }, { id: 'b2', x: 6, y: 5 }, { id: 'b3', x: 6, y: 19 },
          { id: 'r1', x: 19, y: 12 }, { id: 'r2', x: 13, y: 7 }, { id: 'r3', x: 13, y: 17 },
        ],
      },
    },

    // Phasen: Angriff endet bei Ballverlust/Tor, spätestens nach maxAngriff Entscheidungen (dann „Ball im Aus“).
    // Verteidigung: verteidigung Entscheidungen, endet früher bei Balleroberung oder Gegentor.
    phasen: { maxAngriff: 4, verteidigung: 2 },

    // „Erst schauen, dann entscheiden“ vor diesen Entscheidungsmomenten
    schauSchritt: ['angriff'],

    // Missionseigene Texte (ergänzen bzw. überschreiben content/texte.js)
    texte: {
      ende: {
        merksatz: ' Ihr habt angegriffen und eure Tore beschützt. Denk daran: Wenn ein Freund den Ball hat, kannst du ihm helfen, indem du dich freiläufst!',
      },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
