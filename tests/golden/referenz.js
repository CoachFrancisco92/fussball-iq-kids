// Gültige Referenzaufnahmen für Mission 1. Wechsel nur nach ausdrücklicher Freigabe, mit CHANGELOG-Eintrag.
// Historie (tests/golden/historie/):
//   v0.2.3 – Trennung Inhalte/Engine (Engine + Oberfläche)
//   v0.2.5 – Hotfix Endlosszene: 10 Abfolgen (docs/hotfix-endlosszene.md)
//   v0.3.0 – Engine-Paket E1–E6: 153 Bewertungen, 3 Ansagen (docs/bewertungsaenderungen-e1.md)
//   v0.3.1 – Korrektur A Freilaufen: 115 Rückmeldungen/Anzeigen, Hilfe-Durchlauf, 2 Ansagen (docs/korrektur-a-freilaufen.md)
// Mission „Welches Tor ist frei?“ (Meilenstein 2): eigene Referenzen, erstmals erzeugt mit v0.4.0 (noch nicht freigegeben).
module.exports = {
  file: 'mission1.v0.3.1.json', ui: 'ui-transcript.v0.3.1.json', tag: 'v0.3.1', seit: 'v0.3.1',
  missionA: { file: 'mission-a.v0.4.0.json', hash: '5a323f55a74e95eb', ui: 'ui-mission-a.v0.4.0.json' },
};
