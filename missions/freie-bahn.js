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
      'Erkennen, wo vor dir Platz ist, wenn der Gegner hinter dir steht',
      'An einem Gegner vorbeidribbeln',
      'Eine zu enge von einer breiten Lücke unterscheiden: zu eng → außen herum mit Abstand, breit → durch oder sicher außen',
      'Nah am Tor aufs freie Tor schießen',
    ],
    einfuehrung: 'Heute dribbelst du! Schau, wo kein Roter ist, und dribbel dorthin. Nah am Tor schießt du aufs freie Tor.',
    kurzrueckmeldung: true, // V0.6a P3: nach guten Entscheidungen kurze Rückmeldung (zunächst nur in dieser Mission)

    // V0.6a: Lernaufbau B3 → V1 → L4-eng → L4-breit (PO-Freigabe 20.11.2026). Jede Lage mit Torwächter, damit auch der
    // Abschluss eine echte Wahl ist. Prüfwerte: tests/lernaufbau.test.js, docs/v0.6a.md.
    situationen: [
      // B3: Gegner hinter dir, vor dir Platz (bewusst leichter Einstieg), näher am Tor
      { id: 'B3', lernziel: 'platzVorDir', start: lage([22.5, 12], [20, 12], [34.6, 16.6]) },
      { id: 'B3m', lernziel: 'platzVorDir', start: lage([22.5, 12], [20, 12], [34.6, 7.4]) },
      // V1: an einem Gegner vorbei, danach direkt in der Schusszone
      { id: 'V1', lernziel: 'vorbei', start: lage([23.5, 12], [27, 12], [34.6, 16.6]) },
      { id: 'V1m', lernziel: 'vorbei', start: lage([23.5, 12], [27, 12], [34.6, 7.4]) },
      // L4: Lückenpaar aus gleicher Entfernung – eng (2,4 m) und breit (6,8 m); die Bewertung folgt der Geometrie
      { id: 'L4e', lernziel: 'luecke', start: lage([21, 12], [24, 10.8], [24, 13.2], [34.6, 7.4]) },
      { id: 'L4em', lernziel: 'luecke', start: lage([21, 12], [24, 13.2], [24, 10.8], [34.6, 16.6]) },
      { id: 'L4b', lernziel: 'luecke', start: lage([21, 12], [24, 8.6], [24, 15.4], [34.6, 7.4]) },
      { id: 'L4bm', lernziel: 'luecke', start: lage([21, 12], [24, 15.4], [24, 8.6], [34.6, 16.6]) },
      // B5: zwei verteilte Rote, einer schützt das untere Tor – wiedererkennen (ab Durchlauf 3), näher am Tor als bisher
      { id: 'B5', lernziel: 'torWaehlen', start: lage([18, 13], [23, 3], [32, 17]) },
    ],
    durchlaeufe: [['B3', 'V1', 'L4e', 'L4b'], ['B3m', 'V1m', 'L4bm', 'L4em'], ['V1', 'B5', 'L4em', 'L4b'], ['B3m', 'V1m', 'L4e', 'L4bm'], ['B5', 'V1', 'L4b', 'L4em']],

    phasen: { maxAngriff: 5, verteidigung: 0, abschlussNachGrenze: true },
    schauSchritt: [], // kein Mitspieler
    hilfe: { reihenfolge: ['dribbeln', 'schiessen'], alternativenNennen: false },

    texte: {
      kontext: {
        // ohne Mitspieler: kein „Passen oder dribbeln?“ und kein „welcher Freund frei steht“
        angriffFrei: { title: 'Wohin dribbelst du?', tag: 'Dribbeln', say: 'Wohin dribbelst du? Tippe dorthin, wo kein Roter ist.' },
        angriffDruck: { title: 'Wohin dribbelst du?', tag: 'Dribbeln', say: 'Ein Roter ist nah! Dribbel an ihm vorbei – Richtung Tor.' },
        angriffHinten: { title: 'Wohin dribbelst du?', tag: 'Dribbeln', say: 'Ein Roter ist hinter dir. Wohin dribbelst du?' },
      },
      ende: {
        merksatz: ' Beim Dribbeln schaust du: Wo ist frei? Dorthin dribbelst du – und vor dem Tor schießt du aufs freie Tor.',
      },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
