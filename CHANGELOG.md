# Changelog

## V0.5.0 – Mission „Freie Bahn!“, A4 und Paket D
### Meilenstein 4: „Freie Bahn!“ und A4
Details: `docs/meilenstein-4.md`.
- Neue Lernmission `missions/freie-bahn.js` (Lernwelt 1, Platz 2 im Lernweg, 🏃): 1 gegen 1 / 1 gegen 2, nur Dribbeln und in der Schusszone Schießen; Situationen B3 (Verfolger hinten), B4 (Gegner frontal), B2 (große Lücke: hindurch **oder** außen herum), B6 (enge Lücke: außen herum, neu), B5 (viel Platz, freies Tor wählen); B1 entfällt (keine eigene Entscheidung mehr). 5 Durchläufe à 3 Situationen.
- „Welches Tor ist frei?“: Situation **A4** (erst in die Schusszone dribbeln, dann schießen; 4 Angriffsentscheidungen, damit auch der Weg über den Pass noch im Torschuss endet), eigene Ansage „Noch zu weit fürs Tor!“ außerhalb der Schusszone, 5 Durchläufe (Durchlauf 1 unverändert).
- Missionsart auf der Karte: 🎓 Lernen / 🏆 Spiel (Datenfeld `art`, nur Kennzeichnung).
- Endbildschirm: Liste der Entscheidungen scrollt bei langen Missionen, „Nochmal“ bleibt ohne Scrollen erreichbar (iPad quer).
- Referenzen (freigegeben 19.11.2026): „Freie Bahn!“ erstmals (`freie-bahn.v0.5.0.json`, `ui-freie-bahn.v0.5.0.json`); Mission A mit A4 neu (`mission-a.v0.5.0.json`, `ui-mission-a.v0.5.0.json`; Vorgänger ohne A4 und Abweichungsliste in `tests/golden/historie/`, geprüft mit `tests/analysis/a4-referenzwechsel-pruefen.js`); Mission 1 unverändert gegenüber der Paket-D-Referenz.

### Meilenstein 3b: Paket D (Dribbelbewertung und -hilfe, E1–E6)
Abgenommen; Referenzen v0.5.0 nach Freigabe neu erzeugt (Vorgänger und Abweichungslisten in `tests/golden/historie/`, geprüft mit `tests/analysis/paket-d/referenzwechsel-pruefen.js`). Details: `docs/meilenstein-3b.md`.
- Mindeststrecke 1 m bezieht sich auf die tatsächlich ausgeführte Bewegung.
- E1/E2: Dribbelbewertung per deterministischer Vorausrechnung des tatsächlich ausgeführten Wegs (max. 8 m) mit Toleranz ±0,5 m.
- E3 (R2): ⭐ nur mit Grund – Raumgewinn ≥ 1 m, Anschluss in der Folgesituation (Freund bzw. Tor jetzt frei) oder Ball sichern ohne Alternative; Mindeststrecke 1 m.
- E4: Erklärungen und Etiketten nach Ursache, kurz, ohne Doppelungen.
- E5-a/-b: Dribbeln sinnvoll, wenn ein gutes Dribbling existiert; Torchance-Vorrang für den Pass zum freien Freund vor dem Tor.
- E6: Dribbelhilfe nur mit guten, robusten Zielen Richtung Tor; ohne guten Weg ehrlicher Hinweis („eng“ / „genau dorthin“).
- Spielverlauf von Mission 1 und Mission A unverändert; Mission 1: 26 Bewertungen geändert (Sterne −4, Ablauf „dribbling“/„Keiner ist frei“ 2 statt 5 von 6 Sternen), Mission A: 12 (Sterne ±0).
- Tests: `tests/dribbeln.test.js`, `tests/e2e/rechenzeit.mjs` (4× CPU-Drosselung, ≤ 150 ms); Abweichungslisten für Mission A (`missionA-abweichungen-*.json`).

## V0.4.0 – Mission „Welches Tor ist frei?“ und Missionsauswahl (Meilenstein 1 + 2, zur Abnahme, unveröffentlicht)
### Meilenstein 2: Mission A „Welches Tor ist frei?“ (Lernwelt 1)
Details, Prüfungen und Robustheit: `docs/meilenstein-2.md`. Keine Änderung an `engine.js`/`app.js` außer der Versionsnummer.
- Neue Datei `missions/welches-tor-ist-frei.js`: 2 gegen 2, Situationen **A1** (oben zu, unten frei), **A2** (unten zu, oben frei), **A3** (beide zu → Pass zum freien Freund, er schießt), **A5** (beide frei, beide Schüsse gleich gut). A4 erst nach Paket D. 4 Durchläufe à 3 Situationen, feste Rotation, jede Situation 3-mal.
- A3-Startlage gegenüber dem Entwurf verschoben (Blau 2 (30,5|19,5), Rot 1 (33,9|11,4)): Ablauf Pass → Annahme → Schuss hält bei jeder Abweichung um ±0,5 m (16/16), ±1 m 14/16.
- Missionseigene Texte: Einführung, Merksatz, kurze neutrale Abschluss-Ansage „Welches Tor ist frei? Schießen oder passen?“ (nur diese Mission).
- Startbildschirm: zwei Karten, „Welches Tor ist frei?“ (🥅) vorausgewählt, Mission 1 als zweite Karte (Platz 2 im Lernweg).
- Bedientext `missionGewaehlt`: kein doppeltes Satzzeichen nach Titeln mit „?“/„!“ („Welches Tor ist frei?.“ → „Welches Tor ist frei?“; ebenso bei Mission 1). Nur die Ansage beim Antippen einer Karte.
- Tests: `tests/mission-a.test.js` (12), Referenzen `tests/golden/mission-a.v0.4.0.json` und `ui-mission-a.v0.4.0.json` (neu), Browser `tests/e2e/mission-a.mjs` (Touch, alle Durchläufe, auch mit `SLOW=6`), Analyse `tests/analysis/a3-robustheit.js`. Browser-Tests von Mission 1 wählen deren Karte jetzt gezielt; Mission-1-Referenzen v0.3.1 unverändert und identisch.

### Meilenstein 1: Testabdeckung und Grundlage M1–M3
Mission 1 unverändert in Spielverlauf, Bewertung, Hilfe und Oberflächen-Mitschrift (Referenzen v0.3.1 bit-gleich; 17 496 Bewertungen, 710 Kontexte und 1 420 Hilfen gegen v0.3.1 verglichen: 0 Abweichungen). Mission 1 unverändert in Spielverlauf, Bewertung, Hilfe und Oberflächen-Mitschrift (Referenzen v0.3.1 bit-gleich; 17 496 Bewertungen, 710 Kontexte und 1 420 Hilfen gegen v0.3.1 verglichen: 0 Abweichungen).
- **M1 Situationen:** `situationen`, `durchlaeufe`, nahtloser Wechsel ohne Neustart-Bild, feste Rotation je Durchlauf; `phasen.abschlussNachGrenze` (Standard aus).
- **M2 Aktionen nach Mitspielern:** ab 1 gegen 1; ohne Mitspieler kein „Passen“ und kein Pass in den Raum; „Auch gut“ nennt nur angebotene Aktionen.
- **M3 Missionsauswahl:** große Karten, Antippen wählt und liest Titel und Einladung vor, empfohlene Reihenfolge (Lernwelt, Nummer), keine Sperren, nichts gespeichert; „Nochmal“ bringt die nächsten Situationen.
- **Neue Testreihen:** `tests/zufallsreihen.test.js` (gestreute Startwerte, gezielte erste Aktionen, Abschluss), `tests/situationen.test.js`, `tests/e2e/auswahl.mjs` (Touch, Sprache). Bisherige Referenzen bleiben unverändert.

## V0.3.1 – Korrektur A: Freilaufen (Rückmeldung, Etikett, Erklärbild)
Fachlich freigegeben. Bewertung und Sterne unverändert (17 496 Bewertungen gegen v0.3.0 verglichen, 0 Abweichungen); Spielverlauf nur beim Befolgen der Hilfe geändert. Details, alle geänderten Texte und die Änderungshistorie: `docs/korrektur-a-freilaufen.md`.
- Grund „zu weit weg vom Ball“ statt „Passweg versperrt“, wenn das Ziel mehr als 15 m entfernt ist.
- Ergebnis beim Freilaufen aus der Lage am Szenenende (= Bild): „Jetzt steht Rot N im Passweg.“ statt „Du bist frei“, wenn der Passweg zu ist.
- Etiketten nach Grund (Guter Platz / Gegner dort / Zu nah am Ball / Zu weit weg / Passweg zu).
- Erklärbild: Laufpfeil zeigt das Laufziel, Passlinie (grün/rot) den Passweg im gezeigten Bild, markiert wird der genannte Gegner.
- Tests `tests/freilaufen.test.js`. Neue Referenzen `tests/golden/mission1.v0.3.1.json`, `ui-transcript.v0.3.1.json` (nur die vorgelegten Abweichungen, geprüft); Abweichungslisten und Vorgänger unter `tests/golden/historie/`. - **Hilfe beim Freilaufen (K1):** wählt nur gut bewertete Laufziele, rechnet die Szene deterministisch voraus und bevorzugt Ziele, die am Ende anspielbar und nicht zentimetergenau sind. Gibt es keines, sagt sie ehrlich, dass die Gegner mitlaufen. In den 53 Freilauf-Lagen sind jetzt 47 statt 9 Empfehlungen am Ende anspielbar. Spielverlauf ändert sich nur beim Befolgen der Hilfe (Hilfe-Durchlauf von Mission 1).

## V0.3.0 – Engine-Paket E1–E6 (Bewertung Raumpass, Hilfe-Lernweg, optionale Abwehrphase)
Fachlich freigegeben. Spielverlauf von Mission 1 unverändert; geändert sind Bewertung und Rückmeldetexte in 153 Entscheidungen und 3 Ansagen im Schau-Schritt (vollständig mit Begründung: `docs/bewertungsaenderungen-e1.md`). Nach dem Hotfix gegen v0.2.5 neu gemessen: identisch. Neue Referenzen `tests/golden/mission1.v0.3.0.json`, `ui-transcript.v0.3.0.json` (nur diese Änderungen, geprüft); Vorgänger und Abweichungslisten unter `tests/golden/historie/`.
- **E1 Pass in den Raum:** gut, wenn der Passweg frei ist **und** der Mitspieler vor dem nächsten Gegner ankommt: ab 0,3 s „frei“ (`CFG.spaceReserve`, Hilfe), ab 0,1 s „knapp, aber gut“ (`CFG.spaceReserveMin`, in der Simulation robust gegen 0,1 s schnellere Gegner), darunter „zu knapp“. Keine pauschale 3-m-Regel, Rückpässe nicht abgewertet. Gleiche Zeitrechnung wie die Simulation (`spaceContest`). Rückmeldung nennt den schnelleren Gegner. Folge in Mission 1: 9 Raumpässe ohne Stern (alle mit Ballverlust, v0.2.4 gab dafür einen Stern), 2 mit neuem Stern.
- **E2 Hilfe:** Reihenfolge je Mission (`hilfe.reihenfolge`), optional Alternativen nennen (`hilfe.alternativenNennen`). Empfiehlt nur sinnvolle Aktionen. Mission 1: Reihenfolge wie bisher, Empfehlung in allen 614 geprüften Lagen gleich. Korrigiert: Hilfe zeigte in 2 Lagen auf einen gedeckten Mitspieler und in 2 Lagen einen versperrten Dribbelpunkt.
- **E3 Abwehrphase optional:** `phasen.verteidigung: 0` beendet die Mission nach dem Angriff.
- **E4 Grammatik:** „zur freien Stelle“.
- **E5 Bewertung missionsunabhängig** (Test über alle Lagen).
- **E6 Testlader** lädt Skripte in der Reihenfolge von `index.html`.
- Dribbeln bleibt gut, wenn nur ein Raumpass sicher gewesen wäre (neuer Text, Stern bleibt).
- **Begriffe getrennt:** „steht frei“ (Mitspieler) / „freier Raum“ (dorthin laufen) / „freier Platz“ (dribbeln). Schau-Schritt nennt bei „Keiner ist frei“ den freien Raum, wenn es ihn gibt. Rückmeldung nennt beim Ballverlust den Gegner, der den Ball bekommen hat.
- Analysen: `tests/analysis/lost-stars.js`, `thresholds.js`, `lane-cases.js`; Oberflächen-Abweichungen: `tests/golden/historie/v0.3.0-e1-abweichungen-ui.json`.
- Neue Tests `tests/pass-evaluation.test.js` (13), Analyse `tests/analysis/pass-reserve.js`, Abweichungsbericht `tests/golden/diff.js`.

## V0.2.5 – Hotfix: Szene endet nie (Pass-Pingpong der Gegner)
Behebt einen Fehler aus v0.2.4: Unter Druck spielten sich zwei Gegner den Ball endlos zu; weil das Szenenende wartet, solange der Ball fliegt, blieb die App in der Szene hängen (z. B. Pass von der Startposition auf 17/11, mehrere Verteidigungsszenen). Details: `docs/hotfix-endlosszene.md`.
- Gegner spielen nicht sofort an den zurück, von dem sie den Ball bekommen haben; nach eingeleitetem Szenenende spielt jeder Gegner höchstens noch einmal ab.
- Neue Tests `tests/endlos.test.js` (Regression 17/11 und Verteidigung, Eigenschaftstest über > 3 000 Szenen). Analysen `tests/analysis/hang-search.js`, `hotfix-impact.js`.
- Wirkung auf Mission 1: 10 von 200 Kinder-Abfolgen ändern den Spielverlauf ab der Pingpong-Szene; feste Abläufe, Hilfe-Durchlauf und Oberfläche unverändert. Referenz neu: `tests/golden/mission1.v0.2.5.json` – gegenüber v0.2.3 nur diese 10 Abfolgen geändert (geprüft); alte Referenz und Abweichungsliste unter `tests/golden/historie/`. Oberflächen-Mitschrift unverändert.

## V0.2.4 – Missionsarchitektur (Phase 2)
**Für das Kind ändert sich nichts** – nachgewiesen gegen Referenzaufnahmen von v0.2.3. Ziel: Missionen und Texte ohne Eingriff in die Simulation pflegen.
- **Missionen als Daten:** `missions/mission-1.js` enthält Aufstellung, Neustarts, Phasen (`maxAngriff`/`verteidigung`), Lernziele, Schau-Schritt-Einstellung, Startbildschirm-Texte und den Merksatz. Die Engine liest Missionen aus einer Registrierung; `newState(id)`, `newMission(id)`; ohne id die erste Mission.
- **Texte getrennt:** alle Ansagen, Rückmeldungen und Bedientexte in `content/texte.js`, je Mission überschreibbar. `engine.js` und `app.js` enthalten keine kindgerichteten Sätze mehr (wird getestet).
- **Wahrnehmungslogik in der Engine:** `E.lookAnswer()` bewertet die Antworten im Schau-Schritt (rein, deterministisch, unabhängig testbar); `app.js` zeigt nur noch an.
- **Missionsprüfung:** `E.validateMission()` – Pflichtfelder, Feldgrenzen, Ballbesitz, Neustarts; ungültige Missionen starten nicht.
- **Nachweis Verhaltensgleichheit:** Referenzaufnahmen aus v0.2.3 – Engine (`tests/golden/`, 4 Abläufe, Hilfe-Durchlauf, 200 Kinder-Abfolgen inkl. aller Texte, Bewertungen, Positionen) und Oberfläche (`tests/e2e/transcript.mjs`, 3 Abläufe mit allen Ansagen und Anzeigen). Beide schlagen bei einem geänderten Wort bzw. einem verschobenen Spieler an (geprüft).
- **Neue Tests:** Trennung Engine/Inhalte, Missionsprüfung, Testmission mit anderer Aufstellung/Phasen/Texten ohne Engine-Änderung (nur Test, nicht ausgeliefert), Wahrnehmungslogik (7 Tests).
- **Registrierung abgesichert:** Test erkennt jede Missionsdatei, die in `index.html`, Paketliste oder Offline-Cache fehlt, falsche Ladereihenfolge und doppelte Missions-ids.
- **Offline-Test mit echtem Service Worker** (`tests/e2e/offline.mjs`): alle Dateien inkl. Texte und Missionen im Cache, App startet ohne Netz. Dafür registriert die App den Service Worker auch auf `localhost` (nur Entwicklung).
- **Doku:** `docs/missionen.md`; `CLAUDE.md`, Agenten und README an die neue Struktur angepasst.

## V0.2.3 – Entwicklungsprozess & Qualitätssicherung (Phase 1)
Keine Änderung am Spielverhalten. Ziel: verlässliche Freigabe und Auslieferung.
- **Veröffentlichung nur nach grünen Tests:** neuer Workflow `CI` (Tests → Paket bauen → Veröffentlichen → Live-Prüfung). Ersetzt den bisherigen Test-Workflow und – nach Umstellung von *Pages → Source* auf „GitHub Actions“ – die testunabhängige Veröffentlichung „Deploy from a branch“.
- **Auslieferung nur der App-Dateien** (`scripts/site-files.json`); Tests, Skripte und Doku sind nicht mehr öffentlich.
- **Versionierung:** `npm run version:set -- X.Y.Z` setzt alle Stellen; Test verlangt einen CHANGELOG-Abschnitt. Korrigiert: V0.2.2 war mit Versionsnummer 0.2.1 veröffentlicht.
- **Rollback:** Workflow „CI“ manuell mit Release-Tag starten; erster Tag wird `v0.2.3`.
- **Live-Prüfung:** `npm run check:live` (auch automatisch nach jeder Veröffentlichung) prüft Version von HTML, Skripten und Service Worker.
- **Korrektur (Ursache des ersten roten Laufs auf `main`):** Nach „Weiterspielen“ war die App schon bereit für Eingaben, das Spielfeld hatte aber noch einen Frame lang die alte Größe – ein Tipp in diesem Moment lag ~40 px daneben. Das Spielfeld wird jetzt bei jeder Änderung der Bedienleiste sofort neu vermessen. Neuer Browser-Test erkennt solche Verschiebungen.
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
