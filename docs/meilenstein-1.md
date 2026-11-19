# Meilenstein 1 – Testabdeckung und Grundlage M1–M3

Stand 19.11.2026, Branch `meilenstein-1-grundlage`. **Zur Abnahme vorgelegt.** Nicht gemergt, nicht veröffentlicht.

## Umgesetzt
| | Was | Wo |
|---|---|---|
| M2 | Mindestens 1 gegen 1. Ohne Mitspieler wird kein „Passen“ und kein Pass in den Raum angeboten. Der Schau-Schritt braucht einen Mitspieler. „Auch gut“ nennt nur angebotene Aktionen. | `engine.js` (`validateMission`, `context`, `bestSpacePass`, `withAlternatives`) |
| M1 | `situationen`, `durchlaeufe`. Ende bei Tor, Ballverlust oder Grenze, dann folgt die nächste Situation in ihrer Startaufstellung. Kein Neustart-Bild nach einem Tor, Spielstand bleibt, keine Vorgeschichte. Feste Rotation je Durchlauf. `phasen.abschlussNachGrenze` (Standard aus). | `engine.js` (`newState`, `newMission`, `missionAfter`, `missionApply`, `loadSituation`) |
| M3 | Startbildschirm mit großer Karte je Mission (mindestens 78 px hoch). Antippen wählt die Mission und liest Titel und Einladung vor („… Tippe auf Los geht's!“). Reihenfolge Lernwelt → Nummer, die Karte zeigt den Platz im empfohlenen Weg (1, 2, …), keine Sperren, nichts gespeichert. Situationswechsel wird angesagt („Neue Situation! Schau genau hin.“). „Nochmal“ bringt die nächste Situationsfolge, 🏠 führt zur Auswahl. Bei nur einer Mission sieht der Startbildschirm aus wie bisher. | `app.js`, `index.html`, `content/texte.js` (3 neue Bedientexte) |

## Mission 1 unverändert
- Referenz Engine `mission1.v0.3.1.json` und Oberflächen-Mitschrift `ui-transcript.v0.3.1.json`: **identisch**. Es gibt keine offenen Abweichungslisten, und keine Referenz wurde neu erzeugt.
- Unabhängiger Vergleich mit v0.3.1, über alle Kinder-Entscheidungen und ein Freilauf-Raster:

  | Geprüft | Anzahl | Abweichungen |
  |---|---|---|
  | Bewertungen | 17 496 | 0 |
  | Entscheidungsmomente | 710 | 0 |
  | Hilfen | 1 420 | 0 |

- Bedienung: Startbildschirm mit einer Karte wie bisher; „Los geht's“, Schau-Schritt und Ablauf unverändert (Browser-Durchläufe und Mitschrift grün).

## Neue Testreihen (zusätzlich, getrennt ausgewertet, ohne Referenzaufnahme)
- `tests/zufallsreihen.test.js`:
  - gestreute Startwerte (splitmix-Mischung), 3 Missionen × 300 Abfolgen;
  - gezielte erste Aktionen in Mission 1: jeder Pass, 5 Pässe in den Raum, 16 Dribblings, je 4 Fortsetzungen;
  - jede Aktion im Abschluss;
  - erste Aktionen in Situationsmissionen.
  - Geprüft werden nur Eigenschaften: Szene endet, Stern = Bewertung beim Start, Hilfe empfiehlt nur Angebotenes, Spieler im Feld, Ball liegt danach bei einem Spieler, Mission endet.
- **Verteilung der ersten Aktion** (gestreut, je 300):

  | Mission | Dribbeln | Passen | Schießen |
  |---|---|---|---|
  | Mission 1 | 162 | 138 | – |
  | Situationsmission | 60 | 131 | 109 |

  Bisher (lcg 1…200): **immer Passen**. Diese Lücke ist als Vergleichstest festgehalten; die alte Reihe bleibt als historische Referenz.
- `tests/situationen.test.js` (8 Tests) mit Testmission `tests/fixtures/test-mission-situationen.js` (A1-, A2- und B3-Lagen, 1 gegen 1).
- `tests/e2e/auswahl.mjs`: Touch-Bedienung in iPad-Größe:
  - Auswahl und Vorlesen;
  - nahtloser Wechsel (Positionen exakt die Startaufstellung der nächsten Situation);
  - 1 gegen 1 ohne „Passen“;
  - Abschluss nach der Grenze;
  - „Nochmal“ und 🏠;
  - keine JavaScript-Fehler.

## Erstmals sichtbar gemachte Befunde (nicht behoben – Freigabe nötig)
1. **Torplan vor dem Start veraltet (Verteidigung).**
   - Rot bestimmt sein Ziel-Tor erst beim Start einer Szene neu. Wird eine Verteidigungsentscheidung **vor** dem Start bewertet, kann die Bewertung abweichen: In den 200 bisherigen Abfolgen ist der Torplan vorher in 61 von 274 Lagen veraltet; die Bewertung weicht 2-mal ab (nur „Weg versperren“), in den gestreuten Reihen 5-mal.
   - **Für das Kind ohne Wirkung:** Stern und Rückmeldung kommen immer aus der Bewertung beim Start, und die Hilfe „Weg versperren“ zeigt in allen 274 Lagen denselben Punkt.
   - **Wirkung auf die Testwerkzeuge:** Die Referenzabläufe zeichnen in `ev` die Bewertung vor dem Start auf und enthalten deshalb an diesen Stellen eine andere Wertung als der Stern.
   - Analyse: `tests/analysis/torplan-vor-start.js`. Vorschlag: im Rahmen von Paket B (Verteidigung) beheben.
2. **Abschluss in Mission 1 kaum durch Zufall erreicht.** Zufällige Kinder kommen selten in die Torschusszone (2 Schüsse in 92 gezielten Abfolgen). Deshalb gibt es einen eigenen gezielten Abschluss-Test über den Hilfe-Weg. Das ist ein Hinweis auf die Testabdeckung, kein Fehler.
3. Keine Abstürze, keine hängenden Szenen und keine Widersprüche zwischen Stern und Bewertung in über 2 700 neuen Entscheidungen.
