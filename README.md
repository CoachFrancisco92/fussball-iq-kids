# ⚽ Fußball-IQ Kids

Ein Fußballspiel mit integriertem Entscheidungstraining für Kinder ab fünf Jahren – keine Quiz-App.
Das Kind erlebt eine echte Spielsituation (3 gegen 3, vier Minitore, Torschusszonen nach DFB-Kinderfußball),
entscheidet per Antippen, und der nächste Spielzustand ergibt sich aus dieser Entscheidung.

**Stand:** Prototyp V0.1 – Mission 1 „Zusammen sind wir stark!“ (fünf Entscheidungsmomente, Angriff und Verteidigung).

## Spielen
- Online: GitHub Pages dieses Repos (Settings → Pages → Branch `main`, Ordner `/`).
- Lokal: `npm start` und http://localhost:8080 öffnen.
- Als App installieren: im Browser „Zum Startbildschirm hinzufügen“ – läuft danach offline.

## Lernschleife
Erkennen → Entscheiden → Erleben → Verstehen → Wiederholen

## Aufbau
| Datei | Inhalt |
|---|---|
| `engine.js` | Deterministische, regelbasierte Simulation: Feld, Spieler, Pass-/Schuss-/Dribbling-Regeln, Gegner- und Mitspieler-Verhalten, Bewertung der Entscheidungsqualität, Hilfe |
| `app.js` | Oberfläche: Canvas-Spielfeld, Tipp-Steuerung, deutsche Sprachausgabe, Rückmeldung, Wiederholen & Vergleichen, Missionsende |
| `index.html` | Layout & Styles |
| `sw.js`, `manifest.webmanifest`, `icon*` | PWA (offline, installierbar) |
| `tests/` | Szenario-Tests der Simulation (`npm test`) |
| `.claude/agents/` | Spezialisierte Entwicklungs-Agenten (Simulations-QA, Missions-Designer) |

## Leitplanken (aus dem Spielkonzept V1.0)
1. **Keine Zufallswerte.** Ob ein Pass ankommt, folgt aus Passweg, Entfernung, Tempo und Positionen. Gleiche Lage + gleiche Entscheidung = gleiches Ergebnis.
2. **Entscheidungsqualität ≠ Ergebnis.** Sterne gibt es für kluge Entscheidungen, nicht für Tore. Ein guter Pass kann abgefangen werden – das Feedback sagt das.
3. **Keine Musterlösung erzwingen.** Nach einer anderen Entscheidung springt das Spiel nicht auf den „richtigen“ Pfad zurück.
4. **Für Fünfjährige bedienbar.** Höchstens 2–3 Aktionen gleichzeitig, alles wird vorgelesen, kein Lesen nötig.
5. **Datenschutz.** Keine Konten, kein Tracking, keine Server-Aufrufe, keine KI zur Laufzeit.

## Simulationsmodell (Kurzfassung)
- Feld 36 × 24 m, Torschusszone 6 m, Minitore 3 m breit, Blau greift nach rechts an.
- Pass 9 m/s, Schuss 13 m/s. Abfangen, wenn ein Verteidiger einen Punkt auf dem Ballweg (Reichweite 0,75 m, Reaktionszeit 0,35 s) vor dem Ball erreicht.
- Rote Verteidigung: der Ballnächste presst (Einsteiger: bleibt 1,4 m entfernt), einer sichert in Tornähe ein Tor, der Rest deckt locker.
- Rot mit Ball: dribbelt aufs freiere Tor, schießt im Schussbereich bei freiem Weg, spielt unter Druck ab, dreht bei versperrtem Weg ab.
- Missionsschritte passen sich dem Spielzustand an (Angriff / Bewegung ohne Ball / Torabschluss / Verteidigung).

## Nächste Schritte
- Test mit Kindern: Versteht das Kind die Situation – oder tippt es sich nur durch?
- Missionen als Daten statt im Code, dann Mission 2 (Lernwelt „Wir spielen zusammen“).
- Leicht variierende Ausgangslagen, damit keine Klickfolge auswendig gelernt wird.
- Später: kurze Sequenzen in langsam laufender Spielzeit; 4 gegen 4.
