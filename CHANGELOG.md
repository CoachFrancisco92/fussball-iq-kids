# Changelog

## V0.2.3 – Entwicklungsprozess & Qualitätssicherung (Phase 1)
Keine Änderung am Spielverhalten. Ziel: verlässliche Freigabe und Auslieferung.
- **Veröffentlichung nur nach grünen Tests:** neuer Workflow `CI` (Tests → Paket bauen → Veröffentlichen → Live-Prüfung). Ersetzt den bisherigen Test-Workflow und – nach Umstellung von *Pages → Source* auf „GitHub Actions“ – die testunabhängige Veröffentlichung „Deploy from a branch“.
- **Auslieferung nur der App-Dateien** (`scripts/site-files.json`); Tests, Skripte und Doku sind nicht mehr öffentlich.
- **Versionierung:** `npm run version:set -- X.Y.Z` setzt alle Stellen; Test verlangt einen CHANGELOG-Abschnitt. Korrigiert: V0.2.2 war mit Versionsnummer 0.2.1 veröffentlicht.
- **Rollback:** Workflow „CI“ manuell mit Release-Tag starten; erster Tag wird `v0.2.3`.
- **Live-Prüfung:** `npm run check:live` (auch automatisch nach jeder Veröffentlichung) prüft Version von HTML, Skripten und Service Worker.
- **Stabilere Browser-Tests:** Warten auf Spielzustände statt fester Pausen; Abbruch mit Diagnose statt stillem Ausweichen; auch mit 4-fach gedrosselter CPU grün (`SLOW=4`).
- **Neue Tests:** Auslieferungspaket vollständig/ohne Testdateien, CHANGELOG-Pflicht, nur ein veröffentlichender Workflow mit Test-Abhängigkeit, Probelauf des Versionierungsskripts.
- **Doku:** `CLAUDE.md` (Regeln, Rollen, Definition of Done, Freigabe), `docs/RELEASE.md`, `docs/bestandsaufnahme-2026-11.md`; Agenten `simulation-qa` und `mission-designer` an die tatsächliche Architektur angepasst.

## V0.2.1 – Auslieferung absichern (18.11.2026)
Anlass: Review V0.2 meldete Abstürze (`decNo`, `fbWhy`) und nicht angeschlossene Missionslogik/Hilfe/Schau-Schritt.
**Befund:** Der Code im Repo (Commit 80dcdf0) war korrekt – die gemeldeten Stellen stammen aus V0.1. Geprüft wurde offenbar eine Mischung aus neuer `index.html` und zwischengespeicherter alter `app.js` (passt zu Review-Punkt 4: Live-Seite ≠ Repo). Genau das kann auch auf einem Gerät passieren, deshalb strukturell abgesichert:
- Skripte mit Versionsparameter (`app.js?v=…`) → HTML und JS werden immer als Paar geladen.
- Versionsprüfung beim Start: Passen Seite und Skripte nicht zusammen, lädt die App einmal frisch nach.
- Versionsnummer sichtbar auf dem Startbildschirm.
- Neue Tests: alle von `app.js` genutzten Element-IDs müssen in `index.html` existieren; Versionsnummer in allen Dateien gleich; alle aufgerufenen Engine-Funktionen exportiert.
- **Browser-Ende-zu-Ende-Test** (`npm run test:e2e`, läuft in GitHub Actions): startet die App, Schau-Schritt falsch/richtig, Pass mit Rückmeldung, Anders probieren, Vergleichen, Mission bis zum Ende inkl. Verteidigung, Szenen ansehen – auf Tablet- und Handy-Format, Abbruch bei jedem JavaScript-Fehler.
- Dabei gefunden und behoben: Auf dem Handy quer lagen die Knöpfe des Endbildschirms außerhalb des sichtbaren Bereichs.

## V0.2 – „Intelligenter, nicht größer“ (18.11.2026)
Umsetzung des Reviews zu V0.1. Keine neuen Missionen, Fokus auf die Lernqualität von Mission 1.

**P1 – Bewertungslogik**
- Bewertung in drei Teilen: 👀 *Entscheidung* (war Passen/Dribbeln/Schießen in dieser Lage sinnvoll?), 🎯 *Ausführung* (Ziel: welcher Mitspieler, welches Tor, welcher Raum) und *Ergebnis* (Tor, Ballverlust …) getrennt.
- Fehler aus V0.1 behoben: Ein Schuss/Pass bekam einen Stern, wenn er „der beste von mehreren schlechten“ war. Jetzt: Gibt es eine bessere Aktionsart (z. B. freier Mitspieler statt zwei zugestellter Tore), gibt es keinen Stern.
- Rückmeldungen nennen den entscheidenden Spieler („Rot 3 stand im Weg …“).
- Hilfe (💡) empfiehlt die Aktionsart, die zur Lage passt, nicht mehr stur die erste.

**P1 – Gemeinsames Verteidigen**
- Blaue Spieler ohne Auftrag sichern in der Verteidigung automatisch ab (torseitig zum nächsten freien Gegner), statt stehen zu bleiben. Das Kind steuert weiter einen Spieler pro Entscheidung.

**P1 – Konsequenzen sichtbar machen**
- Geplanter Weg wird beim Ausführen als gestrichelter Pfeil gezeigt.
- Nach der Aktion: grüner/roter Pfeil für Ball- bzw. Laufweg, der entscheidende Gegenspieler wird rot markiert (bzw. der bessere eigene Spieler grün).
- Vergleich „Vorher / Jetzt“ zeigt Ballspur, Erklärungspfeil und spricht den Grund mit.
- Die Rückmeldung liegt jetzt unter (bzw. am Handy quer neben) dem Spielfeld und verdeckt die Szene nicht mehr.

**P2**
- *Erst schauen, dann entscheiden:* Vor Angriffsentscheidungen fragt die App „Welcher Freund steht frei?“. Bei falscher Wahl wird der störende Gegner gezeigt, beim zweiten Fehlversuch die Lösung.
- *Fingerzeig:* Beim ersten Spiel zeigt eine animierte Hand nach kurzer Pause, wo getippt wird.
- *Missionsstruktur:* Angriffsphase (endet bei Ballverlust/Tor, spätestens nach 4 Entscheidungen → „Ball im Aus“) + Verteidigungsphase (2 Entscheidungen, endet früher bei Balleroberung). Jede Mission enthält damit sicher Angriff **und** Verteidigung, ohne frühere Entscheidungen zu verändern.
- *Tippflächen:* Mindestradius 34 px, unabhängig von der Spielfeldgröße.
- *Handy quer:* Bedienleiste rechts neben dem Feld → Spielfeld nutzt die volle Höhe.
- Hinweis- und Aufgabentexte blockieren keine Tipps mehr aufs Feld (Bug aus V0.1).
- Service Worker lädt zuerst aus dem Netz → Updates kommen ohne Neuinstallation an.

**Tests:** 11 Szenario-Tests (neu: Bewertung bei zugestellten Toren, Entscheidung ≠ Ergebnis, Missionsphasen, Absichern in der Verteidigung).

**Offen / bewusst noch nicht umgesetzt**
- Sprachausgabe auf iPhone/iPad muss auf echten Geräten geprüft werden.
- Mission „Zwei laufen zum Ball – wen schickst du zurück?“ (Idee aus dem Review) → eigene Mission in Lernwelt 3.
- Freies Spiel als zweiter Modus, variierende Ausgangslagen, Sequenzen in Zeitlupe.

## V0.1 (18.11.2026)
Erster Prototyp: Mission 1, deterministische Simulation, Wiederholen & Vergleichen, Sprachausgabe, PWA.
