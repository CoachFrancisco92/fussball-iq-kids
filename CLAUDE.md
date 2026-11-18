# CLAUDE.md – Fußball-IQ Kids

Verbindliche Regeln für alle Claude-Sitzungen und Agenten in diesem Repository. Sprache: Deutsch, knapp, umsetzungsorientiert.

## Produkt in einem Satz
Fußballspiel mit Entscheidungstraining für Kinder ab 5 (PWA): Das Kind erlebt eine echte 3-gegen-3-Situation, entscheidet per Antippen, und der nächste Spielzustand folgt aus dieser Entscheidung.

## Leitplanken (nicht verhandelbar)
1. **Deterministisch:** keine Zufallswerte in Engine oder App. Gleiche Lage + gleiche Entscheidung = gleiches Ergebnis.
2. **Entscheidung ≠ Ergebnis:** Bewertet werden *Entscheidung* (Aktionsart), *Ausführung* (Ziel) und *Ergebnis* getrennt. Stern nur bei guter Entscheidung **und** Ausführung.
3. **Keine Musterlösung erzwingen:** Das Spiel reagiert auf jede Entscheidung; es springt nie auf einen „richtigen“ Pfad zurück.
4. **Für Fünfjährige:** max. 2–3 Aktionen gleichzeitig, alles wird vorgelesen, kein Lesen nötig, große Tippflächen.
5. **Datenschutz:** keine Konten, kein Tracking, keine Server-Aufrufe, keine KI zur Laufzeit, **keine echten Kindernamen** in Code, Texten, Tests oder Commits.

## Architektur
| Datei | Verantwortung |
|---|---|
| `engine.js` | Simulation (Feld, Bewegung, Pass/Schuss/Abfangen, Gegner-/Mitspieler-Verhalten), Bewertung, Hilfe, Missionsphasen, Rückmeldungstexte. *Derzeit auch Aufstellung von Mission 1 (`newState`, `restart`) – wird in Phase 2 ausgelagert.* |
| `app.js` | Oberfläche: Canvas, Eingabe, Sprache/Töne, Ablauf (Schau-Schritt, Entscheiden, Rückmeldung, Wiederholen, Vergleichen, Missionsende) |
| `index.html` | Layout und Styles |
| `sw.js`, `manifest.webmanifest`, `icon*` | PWA / Offline |
| `scripts/` | `site-files.json` (Auslieferungsliste), `build-site.mjs`, `set-version.mjs`, `check-live.mjs` |
| `tests/` | `simulation`, `branches` (200 Fehlabfolgen), `dom` (IDs/Version), `release` (Auslieferung/Workflow), `e2e/play.mjs` (Browser) |
| `docs/` | `RELEASE.md` (Release & Rollback), `bestandsaufnahme-2026-11.md` (Grundlagenentscheidungen) |

Kein Framework, kein Build-Tool, keine Laufzeit-Abhängigkeiten. `playwright` ist die einzige Entwicklungs-Abhängigkeit.

## Rollen und Zuständigkeiten
| Rolle | Wer | Zuständig für |
|---|---|---|
| Product Owner | Francisco | Anforderungen, Priorität, **Freigabe jedes Merges nach `main`** |
| Fach-Reviewer | extern (ChatGPT) | Fußball- und Lernqualität; Reviews beziehen sich auf eine Versionsnummer |
| Lead Developer | Claude-Hauptsitzung | Umsetzung, Architektur, Integration, Release-Vorbereitung; ruft die Agenten auf |
| `simulation-qa` (Agent) | Claude-Subagent | Tests ergänzen und ausführen, Leitplanken prüfen, Release-Check |
| `mission-designer` (Agent) | Claude-Subagent | Missionen fachlich entwerfen und gegen die Simulation prüfen |

Es gibt bewusst **keinen** Orchestrator- und **keinen** Kinder-UX-Agenten (Begründung: `docs/bestandsaufnahme-2026-11.md`).
Agenten aufrufen: Nach Änderungen an `engine.js`/`app.js` → `simulation-qa`. Vor dem Bau einer neuen Mission → `mission-designer`.

## Arbeitsregeln
- Jedes Arbeitspaket auf einem **eigenen Branch**. **Nie direkt auf `main` pushen**, nie ohne Freigabe des Product Owners mergen oder veröffentlichen.
- Keine neuen Abhängigkeiten, Frameworks oder Dienste ohne Freigabe.
- Keine neuen Missionen oder Spielfunktionen, wenn der Auftrag sie nicht ausdrücklich nennt.
- Fehlschlagende Tests werden verstanden und behoben – **nie durch Lockern der Tests** „grün gemacht“.
- Änderungen an Bewertung oder Gegnerverhalten: Wirkung auf Mission 1 per Test belegen.
- Versionsnummer nur über `npm run version:set -- X.Y.Z` ändern.

## Definition of Done
Ein Arbeitspaket ist fertig, wenn:
1. `npm run test:all` lokal grün ist und die CI auf dem Branch grün ist,
2. neue/geänderte Logik eigene Tests hat (Simulation: Szenario- oder Eigenschaftstest; Oberfläche: Browser-Durchlauf),
3. die Leitplanken oben eingehalten sind,
4. `CHANGELOG.md` einen Abschnitt für die neue Version hat und die Version gesetzt ist,
5. betroffene Doku (`README.md`, `CLAUDE.md`, Agenten) aktuell ist,
6. dem Product Owner eine Zusammenfassung vorliegt: *Was? Warum? Welche Tests? Risiken/offene Punkte? Auswirkungen?*

## Freigabekriterien
- **Merge nach `main`:** Definition of Done erfüllt + ausdrückliche Freigabe des Product Owners.
- **Live:** automatisch durch die CI, nur nach grünen Tests; danach muss die Live-Prüfung grün sein, dann Tag `vX.Y.Z` setzen.
- **Kindertest:** Kriterien in `docs/RELEASE.md`.
