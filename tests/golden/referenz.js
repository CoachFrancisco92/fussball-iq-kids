// Gültige Referenzaufnahmen für Mission 1. Wechsel nur nach ausdrücklicher Freigabe, mit CHANGELOG-Eintrag.
// Historie (tests/golden/historie/):
//   v0.2.3 – Trennung Inhalte/Engine (Engine + Oberfläche)
//   v0.2.5 – Hotfix Endlosszene: 10 Abfolgen (docs/hotfix-endlosszene.md)
//   v0.3.0 – Engine-Paket E1–E6: 153 Bewertungen, 3 Ansagen (docs/bewertungsaenderungen-e1.md)
//   v0.3.1 – Korrektur A Freilaufen: 115 Rückmeldungen/Anzeigen, Hilfe-Durchlauf, 2 Ansagen (docs/korrektur-a-freilaufen.md)
//   v0.5.0 – Paket D (Dribbelbewertung/-hilfe, E1–E6): Mission 1 26 Bewertungen + 10 Oberflächen-Einträge, Mission A 12
//            Bewertungen; Spielverlauf unverändert (docs/meilenstein-3b.md). Vorgelegte Listen: historie/v0.5.0-paket-d-*.json,
//            Prüfung: tests/analysis/paket-d/referenzwechsel-pruefen.js. Erzeugt mit Commit 707e9ac (tag = dieser Stand,
//            bis der Release-Tag v0.5.0 existiert).
// Mission „Welches Tor ist frei?“: eigene Referenzen (v0.4.0 in historie/, seit v0.5.0 mit Paket D).
module.exports = {
  file: 'mission1.v0.5.0.json', ui: 'ui-transcript.v0.5.0.json', tag: '707e9ace6aaecdf70b35d647c729acd88c6aaa7f', seit: 'v0.5.0',
  // Mission A v0.5.0 mit A4 und 5 Durchläufen (Meilenstein 4, freigegeben 19.11.2026). Vorgänger ohne A4:
  // historie/mission-a.v0.5.0-paket-d.json, historie/ui-mission-a.v0.5.0-paket-d.json; Liste: historie/v0.5.0-a4-missionA-abweichungen.json
  missionA: { file: 'mission-a.v0.5.0.json', hash: 'ad44e51d0b3147a9', ui: 'ui-mission-a.v0.5.0.json' },
  // „Freie Bahn!“ (Meilenstein 4): Erstaufnahme v0.5.0, freigegeben 19.11.2026
  freieBahn: { file: 'freie-bahn.v0.5.0.json', hash: 'cff2bdfcccb06a4b', ui: 'ui-freie-bahn.v0.5.0.json' },
};
