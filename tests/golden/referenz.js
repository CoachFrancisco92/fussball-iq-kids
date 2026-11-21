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
//   v0.5.1 – Oberflächen-Mitschriften aller drei Missionen (Sprachsteuerung/Navigation/Einzelaktion, freigegeben 19.11.2026):
//            Mission 1 3 Einträge (Schlussansage „letzte Mission“), Mission A 1, „Freie Bahn!“ 50 (Aktionsknöpfe entfallen bei
//            Einzelaktion). Engine-Referenzen unverändert. Vorgänger: historie/ui-*.v0.5.0.json; Listen: historie/v0.5.1-ui-*-abweichungen.json;
//            Prüfung: tests/analysis/v0.5.1-referenzwechsel-pruefen.js.
//   v0.6.0 – V0.6a (freigegeben 20.11.2026): Mission 1 nur Rückmeldesätze (P2) und Oberfläche (P4 zwei Aufgabenfelder),
//            Simulation und Bewertung der Einzelaktionen unverändert; Mission A und „Freie Bahn!“ neue Situationen (P1),
//            Lernergebnis je Situation (P4), Kurzrückmeldung in „Freie Bahn!“ (P3). Vorgänger: historie/*.v0.5.0.json,
//            historie/ui-*.v0.5.1.json; Listen: historie/v0.6.0-*.json; Prüfung: tests/analysis/v0.6.0-referenzwechsel-pruefen.js.
//            tag = fc736a8 (Engine-Stand, aus dem die Referenzen erzeugt wurden).
//   v0.6.1 – Hotfix Toraussprache (freigegeben 20.11.2026): nur Oberflächen-Mitschriften, gesprochen „Tor!“ statt
//            „Toooor!“ (36 Einträge); Engine-Referenzen unverändert v0.6.0. Vorgänger: historie/ui-*.v0.6.0.json;
//            Listen: historie/v0.6.1-*.json; Prüfung: tests/analysis/v0.6.1-referenzwechsel-pruefen.js.
//   v0.6.2 – Paket „Wahrnehmung“ + Minimal-UX (freigegeben 21.11.2026): Engine-Referenzen nur Sätze (Rückmeldungen, Ansagen,
//            Bewertungstexte; Spielverlauf, Bewertung und Hilfe unverändert); Oberflächen-Mitschriften = die sechs vorgelegten
//            V0.6.2-Listen + 23 gesprochene Folge-Hinweise (docs/v0.6.2-ux-minimal.md). Vorgänger: historie/*.v0.6.0.json,
//            historie/ui-*.v0.6.1.json; Listen: historie/v0.6.2-*.json; Prüfung: tests/analysis/v0.6.2-referenzwechsel-pruefen.js.
//            tag = 6c015af (Stand, aus dem die Referenzen erzeugt wurden).
module.exports = {
  file: 'mission1.v0.6.2.json', ui: 'ui-transcript.v0.6.2.json', tag: '6c015afcb077ac8476f0d92323ec483fb6e14157', seit: 'v0.6.2',
  // Mission A v0.5.0 mit A4 und 5 Durchläufen (Meilenstein 4, freigegeben 19.11.2026). Vorgänger ohne A4:
  // historie/mission-a.v0.5.0-paket-d.json, historie/ui-mission-a.v0.5.0-paket-d.json; Liste: historie/v0.5.0-a4-missionA-abweichungen.json
  missionA: { file: 'mission-a.v0.6.2.json', hash: 'bae427949999a35e', ui: 'ui-mission-a.v0.6.2.json' },
  // „Freie Bahn!“ (Meilenstein 4): Erstaufnahme v0.5.0, freigegeben 19.11.2026
  freieBahn: { file: 'freie-bahn.v0.6.2.json', hash: '1b55e520237946c4', ui: 'ui-freie-bahn.v0.6.2.json' },
};
