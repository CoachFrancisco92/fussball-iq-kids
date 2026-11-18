# ⚽ Fußball-IQ Kids

Ein Fußballspiel mit integriertem Entscheidungstraining für Kinder ab fünf Jahren – keine Quiz-App.
Das Kind erlebt eine echte Spielsituation (3 gegen 3, vier Minitore, Torschusszonen nach DFB-Kinderfußball),
entscheidet per Antippen, und der nächste Spielzustand ergibt sich aus dieser Entscheidung.

**Stand:** V0.2.4 – Mission 1 „Zusammen sind wir stark!“ (Angriffs- und Verteidigungsphase, „Erst schauen, dann entscheiden“). Änderungen: [CHANGELOG.md](CHANGELOG.md).

## Spielen
- Online: https://coachfrancisco92.github.io/fussball-iq-kids/ (Version steht auf dem Startbildschirm)
- Lokal: `npm start` und http://localhost:8080 öffnen.
- Als App installieren: im Browser „Zum Startbildschirm hinzufügen“ – läuft danach offline.

## Lernschleife
Erkennen → Entscheiden → Erleben → Verstehen → Wiederholen

## Aufbau
| Datei | Inhalt |
|---|---|
| `engine.js` | Deterministische, regelbasierte Simulation: Feld, Spieler, Pass-/Schuss-/Dribbling-Regeln, Gegner- und Mitspieler-Verhalten, Bewertung der Entscheidungsqualität, Hilfe, Wahrnehmungslogik – ohne Missionsinhalte und Texte |
| `missions/` | Missionen als Daten (Aufstellung, Phasen, Lernziele) – siehe [docs/missionen.md](docs/missionen.md) |
| `content/texte.js` | alle pädagogischen Texte |
| `app.js` | Oberfläche: Canvas-Spielfeld, Tipp-Steuerung, deutsche Sprachausgabe, Rückmeldung, Wiederholen & Vergleichen, Missionsende |
| `index.html` | Layout & Styles |
| `sw.js`, `manifest.webmanifest`, `icon*` | PWA (offline, installierbar) |
| `tests/` | Simulation, Fehlabfolgen, Oberflächen-/Release-Konsistenz (`npm test`), Browser-Durchlauf (`npm run test:e2e`) |
| `scripts/` | Auslieferungspaket, Versionierung, Live-Prüfung |
| `.claude/agents/` | Entwicklungs-Agenten `simulation-qa`, `mission-designer` |

## Entwicklung
- **Regeln, Rollen, Definition of Done:** [CLAUDE.md](CLAUDE.md)
- **Release, Rollback, Live-Prüfung:** [docs/RELEASE.md](docs/RELEASE.md)
- **Grundlagenentscheidungen:** [docs/bestandsaufnahme-2026-11.md](docs/bestandsaufnahme-2026-11.md)
- Alle Tests: `npm install` einmalig, dann `npm run test:all`

## Leitplanken (aus dem Spielkonzept V1.0)
1. **Keine Zufallswerte.** Ob ein Pass ankommt, folgt aus Passweg, Entfernung, Tempo und Positionen. Gleiche Lage + gleiche Entscheidung = gleiches Ergebnis.
2. **Entscheidungsqualität ≠ Ergebnis.** Bewertet werden 👀 Entscheidung (Aktionsart) und 🎯 Ausführung (Ziel) getrennt vom Ergebnis. Stern nur, wenn beides gut ist – nie für „das Beste von mehreren schlechten“, wenn es eine bessere Aktionsart gab.
3. **Keine Musterlösung erzwingen.** Nach einer anderen Entscheidung springt das Spiel nicht auf den „richtigen“ Pfad zurück.
4. **Für Fünfjährige bedienbar.** Höchstens 2–3 Aktionen gleichzeitig, alles wird vorgelesen, kein Lesen nötig.
5. **Datenschutz.** Keine Konten, kein Tracking, keine Server-Aufrufe, keine KI zur Laufzeit.

## Simulationsmodell (Kurzfassung)
- Feld 36 × 24 m, Torschusszone 6 m, Minitore 3 m breit, Blau greift nach rechts an.
- Pass 9 m/s, Schuss 13 m/s. Abfangen, wenn ein Verteidiger einen Punkt auf dem Ballweg (Reichweite 0,75 m, Reaktionszeit 0,35 s) vor dem Ball erreicht.
- Rote Verteidigung: der Ballnächste presst (Einsteiger: bleibt 1,4 m entfernt), einer sichert in Tornähe ein Tor, der Rest deckt locker.
- Rot mit Ball: dribbelt aufs freiere Tor, schießt im Schussbereich bei freiem Weg, spielt unter Druck ab, dreht bei versperrtem Weg ab.
- Blau ohne Auftrag sichert in der Verteidigung ab (torseitig zum nächsten freien Gegner).
- Missionsschritte passen sich dem Spielzustand an (Angriff / Bewegung ohne Ball / Torabschluss / Verteidigung).
- Lernmission = Angriffsphase (bis Ballverlust/Tor, max. 4) + Verteidigungsphase (2, endet bei Balleroberung).

## Nächste Schritte
- Test mit Kindern (ohne Erklärung): Erkennt das Kind den freien Spieler? Versteht es, warum ein Pass abgefangen wird? Probiert es beim zweiten Versuch bewusst etwas anderes?
- Sprachausgabe auf iPhone/iPad prüfen.
- Missionen als Daten statt im Code, dann Mission „Gemeinsam verteidigen“ (Lernwelt 3).
- Leicht variierende Ausgangslagen, damit keine Klickfolge auswendig gelernt wird.
- Später: kurze Sequenzen in langsam laufender Spielzeit; 4 gegen 4.
