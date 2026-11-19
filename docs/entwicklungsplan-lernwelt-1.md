# Entwicklungsplan Lernwelt 1 (Stand 19.11.2026)

**Zur Freigabe vorgelegt.** Fachlich freigegeben sind die Konzepte A1–A3, A5 und die Architektur M1–M3.
Ziel: „Welches Tor ist frei?“ möglichst bald als zweite spielbare Mission; danach „Freie Bahn!“ auf verlässlicher Dribbelgrundlage.

## Vorab-Prüfung: Muss etwas aus Paket D vor Mission A erledigt sein?
- **A1, A2, A3, A5:** nein.
  - Sie beginnen in der Schusszone, die Entscheidung dort lautet Schießen oder Passen; Dribbeln kommt dort gar nicht vor.
  - Nach dem Pass in A3 steht der Freund ebenfalls in der Zone.
- **A4: ja, betroffen** (geprüft in der Startlage, 1-m-Raster, Ziele nach vorn im 8-m-Kreis):
  - 87 Dribbelziele behalten alle den Ball und gewinnen Raum. Nur **38** bekommen einen Stern.
  - **49** werden mit „Du bist direkt auf einen Gegner zugelaufen“ abgewertet.
  - **32** davon führen sogar in die Zone vor ein freies Tor.
  - Die Situation würde genau das Falsche lehren („nur kurze oder bestimmte Wege“). Ein eigens passender Hilfe-Weg würde das nur verdecken.
- **Empfehlung:** Mission A zunächst mit **A1, A2, A3, A5** veröffentlichen. Mit vier Situationen und drei pro Durchlauf bleibt die Abwechslung erhalten. **A4 kommt mit Paket D** dazu. So hängt Mission A nicht an einer Bewertungsänderung, die auch Mission 1 betrifft.

## Meilensteine
Jeder Meilenstein liegt auf einem eigenen Branch. Am Ende jedes Meilensteins steht eine Zusammenfassung mit Ihrer Freigabe, erst danach folgen Merge und Veröffentlichung.

### 1. Testabdeckung und technische Grundlage M1–M3
**1a – Neue Testreihen** (zusätzlich zu den bisherigen; die alten Referenzen bleiben unverändert als historische Basis)
- Gestreute Startwerte: Zufallszahlen über eine Mischfunktion statt der linearen Startwerte 1–200. Die Verteilung der ersten Aktion wird geprüft (Passen, Dribbeln, Schießen und Alternativen je Kontext angemessen vertreten).
- Gezielte Abfolgen: Jede angebotene Aktion wird in jedem Kontext einmal als **erste** Entscheidung durchgespielt.
- Auswertung getrennt: eigene Testdatei mit Eigenschaftsprüfungen, also ohne Referenzaufnahme, damit keine geänderte Bewertung „mitgeschluckt“ wird:
  - keine Abstürze und keine hängenden Szenen;
  - Stern = Bewertung vor der Aktion;
  - Rückmeldung passt zum Bild;
  - die Hilfe empfiehlt nur angebotene, gut bewertete Aktionen.
- Was die neuen Reihen erstmals sichtbar machen, wird dokumentiert. Wird ein Fehler gefunden, ändere ich nichts daran ohne Ihre Freigabe.

**1b – M2: Aktionen nach verfügbaren Mitspielern**
- „Passen“ und Pass in den Raum nur mit Mitspieler; die Prüfung erlaubt 1 gegen N (Entwurf B, 3 Stellen).
- Die Hilfe nennt als „Auch gut“ nur angebotene Aktionen.

**1c – M1: mehrere Situationen pro Mission**
- Daten: `situationen` und `durchlaeufe`. Ende einer Situation bei Tor, Ballverlust oder Angriffsgrenze, danach direkt die nächste Startaufstellung, **ohne Zwischenbild** einer Neustart-Aufstellung.
- Erreicht die letzte erlaubte Entscheidung die Schusszone, **folgt noch der Abschluss**.
- Der Durchlauf zählt in der Sitzung mit und wählt die Situationen in fester Reihenfolge.

**1d – M3: Missionsauswahl**
- Große Karten mit Symbol und vorgelesenem Titel beim Antippen; die empfohlene Reihenfolge ist sichtbar (Nummer und Weg); keine Sperren, nichts wird gespeichert.
- Endbildschirm: „Nochmal (neue Situationen)“ und „Andere Mission“.

**Abnahme**
- Mission 1 ist **in Spielverlauf und Bewertung unverändert**: Referenzen bit-gleich, Bewertungsvergleich gegen V0.3.1 ohne Abweichung.
- Neue Tests für M1 und M2 mit einer Testmission.
- Browser-, Touch-, Offline- und Sprachausgabetests für die Auswahl.
- Veröffentlichung als technische Version **ohne neue Mission** (V0.4.0).

### 2. Mission A „Welches Tor ist frei?“ (A1, A2, A3, A5)
- Missionsdatei mit 4 Situationen und fester Rotation, eigene Texte, Hilfe-Reihenfolge Schießen → Dribbeln → Passen.
- **A3 absichern:**
  - Regressionstest des vollständigen Ablaufs (Pass → Abschluss → Tor).
  - Prüfung leicht veränderter Startlagen: jeder Spieler ±0,5 m und ±1 m. Dokumentiert wird, in welchem Bereich die Szene ihren Zweck erfüllt.
  - Ein Test schlägt an, wenn die eingestellte Lage den Bereich verlässt.
  - Was außerhalb des Bereichs passiert (Freilaufen statt Abschluss), steht weiterhin transparent im Entwurf.
- Eigene Referenzaufnahmen für Mission A: Engine und Oberfläche. Eigenschaftstests: zwei gute Torschüsse in A5, „beide Tore zu“ in A3, Hilfe-Weg mit Stern.
- Kurzer Kindertest mit A nach der Anleitung `docs/kindertest-1.md`.
- **Abnahme:** alle Tests grün, Mission 1 unverändert → Veröffentlichung **V0.4.1**.

### 3. Paket D – Dribbelbewertung und Dribbelhilfe
**3a – Analyse mit Lösungsvorschlägen. Keine Umsetzung, keine Änderung an Referenzen.**
- **Modell gegen Simulation:** Die Bewertung rechnet jeden Roten als schnellen Abfänger über den ganzen Weg. Die Simulation lässt nur den nächsten anlaufen, und der stoppt 1,4 m vor dem Ball.
- **Ausweichen** wird als „direkt auf einen Gegner“ bezeichnet; Text und Bedingung werden getrennt geprüft.
- **Mehr als 8 m getippt:** Ausgeführt werden 8 m, bewertet wird der ganze Weg.
- **Hilfe:** Sie driftet zur Seitenlinie (Reserve ungedeckelt, fester 5-m-Schritt, Schusszone unbekannt) und zeigt ein ungünstiges Ziel, obwohl gute existieren.
- **Mehrere sinnvolle Wege erkennen, ohne pauschal mehr Sterne:** Kriterien wie Raumgewinn, Abstand zum Gegner und Weg zum freien Tor; jeweils geprüft gegen die Simulation einschließlich kleiner Störungen, wie bei der Passbewertung (E1).
- **Grundsatz:** Die Bewertung hängt **nicht** nur vom Ballbesitz am Ende ab (Entscheidung ≠ Ergebnis), sie muss aber mit der Simulation vereinbar sein.
- **Vollständige Auswirkungen auf Mission 1:** Heute stimmt der Text „direkt auf einen Gegner“ in 337 von 767 Fällen nicht. Dazu kommen die neuen Testreihen.

**3b – Umsetzung nach Ihrer Freigabe** mit Abweichungsbericht, wie beim Engine-Paket. Danach wird **A4 in Mission A ergänzt**.

### 4. Mission B „Freie Bahn!“
- B1, B3, B4, B5 nach Paket D erneut simulieren (1 gegen 1, 1 gegen 2). B2 nur, wenn D „Lücke oder außen herum“ als zwei gute Wege anerkennt.
- Dann wie Mission A: Datei, Tests, Referenzen, Kindertest, Veröffentlichung.

## Begrenzung gegen endlose Überarbeitung
- Paket D betrifft nur Dribbelbewertung und Dribbelhilfe. Teamverhalten (Paket B) bleibt außen vor.
- Meilenstein 1 und 2 brauchen **keine** Änderung an Bewertung oder Gegnerverhalten.
- Mission A ist damit ohne Abhängigkeit von D veröffentlichbar.
