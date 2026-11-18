# Bestandsaufnahme Entwicklungsorganisation (18.11.2026)

Grundlage für die weitere Entwicklung. Stand: V0.2.2 auf `main` (Commit `42fe009`).

## Kernaussagen
1. **Technisch solide, organisatorisch dünn.** Simulation deterministisch und gut getestet; Prozess, Freigabe und Rollen kaum geregelt.
2. **Keine weiteren Agenten.** Engpass sind Freigabe-Tor, Trennung von Missionsinhalt/Engine und fehlende Praxistests – nicht fehlende Rollen.
3. **Die zwei vorhandenen Agenten wurden bis dahin nie genutzt** und beschrieben teils eine nicht existierende Architektur (Missionen „als Daten“).

## Befunde

| Bereich | Befund | Bewertung | Maßnahme |
|---|---|---|---|
| Freigabe | GitHub Pages veröffentlichte jeden Push auf `main` – parallel zu den Tests. `bd70e83` war mit roten Tests live. | **kritisch** | Phase 1: Veröffentlichung nur über CI nach grünen Tests |
| Versionierung | Version an 6 Stellen von Hand; V0.2.2 wurde mit Versionsnummer 0.2.1 veröffentlicht | hoch | Phase 1: `npm run version:set`, Test auf CHANGELOG-Eintrag |
| Rollback | keine Tags/Releases | hoch | Phase 1: Tags + Rollback-Workflow |
| Live-Prüfung | niemand prüft die veröffentlichte Seite | hoch | Phase 1: automatische Live-Prüfung |
| Architektur | Engine trennt Simulation/Oberfläche gut; **Missionsinhalt (Aufstellung, Neustarts) und ~40 Texte stecken in `engine.js`**, Wahrnehmungslogik in `app.js` | hoch | Phase 2 |
| Tests | Szenario-, Fuzz-, Konsistenz- und Browser-Tests vorhanden. Lücken: **pädagogische Korrektheit** (nur Stabilität geprüft), Wahrnehmungslogik, Service Worker/Cache, echte Geräte | mittel | Phase 2 (Eigenschaftstests), Praxistest |
| Kinder-UX | Leitplanken dokumentiert, aber nicht systematisch geprüft; kein Test mit Kind oder echtem Gerät | hoch | Praxistest vor neuen Funktionen |
| Rollen | faktisch: Product Owner (Francisco), externer Fach-Reviewer (ChatGPT), Hauptsitzung (Entwicklung) | – | in `CLAUDE.md` festgeschrieben |

## Entscheidungen
- **Keine neuen Agenten.** Kein Orchestrator-Agent (die Hauptsitzung ist der Orchestrator), kein Child-UX-Agent (kann kein Kind beobachten).
- **Bestehende Agenten behalten**, an die reale Architektur angepasst: `simulation-qa` (Tests, Release-Check), `mission-designer` (Missionsentwurf).
- **Nicht einführen:** Build-Tooling/Framework, Staging-Umgebung, PR-Pflicht mit Reviews.
- **Später prüfen:** gemeinsamer „Learning Reviewer“ (Fußball-Didaktik + Kinder-UX), sobald mehrere Missionen parallel entstehen.

## Reihenfolge
1. Phase 1 – Prozess & Qualitätssicherung
2. Phase 2 – Missionsinhalte von der Engine trennen, Wahrnehmungslogik testbar machen
3. Praxistest mit Kind (ohne Erklärung) – erst danach neue Missionen/Funktionen
