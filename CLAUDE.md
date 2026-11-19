# CLAUDE.md – Fußball-IQ Kids

Verbindliche Regeln für alle Claude-Sitzungen und Agenten in diesem Repository. Sprache: Deutsch, knapp, umsetzungsorientiert.

## Produkt in einem Satz
Fußballspiel mit Entscheidungstraining für Kinder ab 5 (PWA): Das Kind erlebt eine echte 3-gegen-3-Situation, entscheidet per Antippen, und der nächste Spielzustand folgt aus dieser Entscheidung.

## Leitplanken (nicht verhandelbar)
1. **Deterministisch:** keine Zufallswerte in Engine oder App. Gleiche Lage + gleiche Entscheidung = gleiches Ergebnis.
2. **Entscheidung ≠ Ergebnis:** Bewertet werden *Entscheidung* (Aktionsart), *Ausführung* (Ziel) und *Ergebnis* getrennt. Stern nur bei guter Entscheidung **und** Ausführung.
   Die Bewertung ist **missionsunabhängig**: gleiche Lage + gleiche Entscheidung = gleiche Bewertung in jeder Mission. Missionen steuern nur, welchen guten Weg die Hilfe zuerst zeigt (`hilfe`).
3. **Keine Musterlösung erzwingen:** Das Spiel reagiert auf jede Entscheidung; es springt nie auf einen „richtigen“ Pfad zurück.
4. **Für Fünfjährige:** max. 2–3 Aktionen gleichzeitig, alles wird vorgelesen, kein Lesen nötig, große Tippflächen.
5. **Datenschutz:** keine Konten, kein Tracking, keine Server-Aufrufe, keine KI zur Laufzeit, **keine echten Kindernamen** in Code, Texten, Tests oder Commits.

## Architektur
| Datei | Verantwortung |
|---|---|
| `engine.js` | Simulation (Feld, Bewegung, Pass/Schuss/Abfangen, Gegner-/Mitspieler-Verhalten), Bewertung (Entscheidung/Ausführung/Ergebnis), Hilfe, Wahrnehmungslogik (`lookAnswer`), Phasenablauf, Missionsprüfung. **Enthält keine Missionsinhalte und keine Sätze.** |
| `missions/*.js` | eine Datei je Mission: Aufstellungen, Neustarts, Phasen, Lernziele, Schau-Schritt, missionseigene Texte – nur Daten (Format: `docs/missionen.md`) |
| `content/texte.js` | alle pädagogischen Texte (Ansagen, Rückmeldungen, Bedienung), je Mission überschreibbar |
| `app.js` | Oberfläche: Canvas, Eingabe, Sprache/Töne, Ablauf (Schau-Schritt, Entscheiden, Rückmeldung, Wiederholen, Vergleichen, Missionsende) |
| `index.html` | Layout, Styles, Ladereihenfolge: Texte → Missionen → Engine → App |
| `sw.js`, `manifest.webmanifest`, `icon*` | PWA / Offline |
| `scripts/` | `site-files.json` (Auslieferungsliste), `build-site.mjs`, `set-version.mjs`, `check-live.mjs` |
| `tests/` | `simulation`, `branches` (200 Fehlabfolgen), `golden` (Mission 1 ≙ Referenz laut `golden/referenz.js`, vorgelegte Abweichungen in `golden/abweichungen-*.json`, Historie in `golden/historie/`), `endlos` (jede Szene endet), `situationen` (M1/M2 mit Testmission), `mission-a` (Mission „Welches Tor ist frei?“: Situationen, Rotation, Robustheit A3, Referenz laut `golden/referenz.js` → `missionA`), `zufallsreihen` (gestreute Startwerte, gezielte erste Aktionen), `dribbeln` (Paket D: Dribbelbewertung = Vorausrechnung, Erklärungen, Hilfe), `freilaufen`, `pass-evaluation` (Raumpass, Hilfe, Missionsunabhängigkeit), `missions` (Trennung, Testmission), `look` (Wahrnehmung), `dom`, `release`, `e2e/play.mjs`, `e2e/auswahl.mjs` (Missionsauswahl, Situationswechsel, Touch), `e2e/mission-a.mjs` (Mission A, alle Durchläufe, Touch, Mitschrift ≙ Referenz), `e2e/rechenzeit.mjs` (Vorausrechnung ≤ 150 ms bei 4× CPU-Drosselung), `e2e/transcript.mjs` (Oberflächen-Mitschrift ≙ Referenz laut `golden/referenz.js`, vorgelegte Abweichungen in `golden/abweichungen-*-ui.json`) |
| `docs/` | `RELEASE.md`, `missionen.md`, `bestandsaufnahme-2026-11.md` |

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
- **Referenztests nie stillschweigend neu erzeugen.** Schlagen `golden`/`transcript` an, hat sich Verhalten oder Text für das Kind geändert – nur nach Freigabe neu erzeugen und im CHANGELOG benennen. Bis zur Freigabe werden Abweichungen mit `node tests/golden/diff.js --json tests/golden/abweichungen-<paket>.json` (Mission A: `node tests/golden/mission-a.js --abweichungen tests/golden/missionA-abweichungen-<paket>.json`) vorgelegt; der Test lässt dann genau diese zu.
- Neue Missionen ohne Änderung an `engine.js` (Ablauf: `docs/missionen.md`).
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
- **Live:** automatisch durch die CI, nur nach grünen Tests; danach Live-Prüfung; bei Grün setzt die CI den Tag `vX.Y.Z`. Bei roter Live-Prüfung: Wiederherstellung laut `docs/RELEASE.md`.
- **Kindertest:** Kriterien in `docs/RELEASE.md`.
