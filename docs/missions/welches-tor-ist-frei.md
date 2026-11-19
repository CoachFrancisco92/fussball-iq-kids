# Missionsentwurf A „Welches Tor ist frei?“ (Lernwelt 1)

Stand: 19.11.2026 · Basis V0.3.1 · Entwurf `mission-designer` (Schritt 1, keine Umsetzung) · Branch `missionsentwurf-lernwelt-1`
Prüfskripte: `tests/analysis/missionsentwurf/a-welches-tor.js`, `a3-robustheit.js` (Analyse, keine Tests). Alle Zahlen unten stammen aus diesen Läufen.

## Kurzfassung
- 5 Situationen A1–A5, je Durchlauf 3. **2 gegen 2**, keine Verteidigungsphase. Mit V0.3.1 **ohne Engine-Änderung** simulierbar; `E.validateMission` = `[]` für jede Situation.
- A1, A2, A4, A5 funktionieren wie gedacht. **A3 funktioniert, aber nur in einem schmalen Band** (Mitspieler muss schon in der Torschusszone stehen, siehe A3).
- Hilfe-Weg: 1 Entscheidung (A1, A2, A5), 2 Entscheidungen (A3, A4). Keine Abstürze, keine hängenden Szenen (2 × 200 Abfolgen je Situation).
- Für mehrere Situationen pro Durchlauf wird **M1** benötigt (heute simuliert: jede Situation = eigene Mission im Speicher).

## Rahmen
| Punkt | Festlegung | Begründung |
|---|---|---|
| Spielerzahl | 2 gegen 2 (b1, b2 / r1, r2) | Lernwelt 1 „Ich und der Ball“: ein klares Bild – ein Druckspieler (r1), ein Torwächter (r2). Mit 3 gegen 3 deckt der dritte Rote laut Engine (Deckung 3 m torseitig) den Mitspieler; dann ist A3 nicht mehr „Mitspieler frei“ und das Bild wird unruhig. b2 wird für A3 gebraucht. |
| Phasen | `{ maxAngriff: 3, verteidigung: 0 }` je Situation | 3 reicht für alle Hilfe-Wege (max. 2) und lässt einen Umweg zu. |
| Hilfe | `{ reihenfolge: ['schiessen', 'dribbeln', 'passen'], alternativenNennen: false }` | Lernweg: erst Tor prüfen, sonst näher ran, sonst abspielen. `alternativenNennen: true` ist hier ungeeignet (Engine nennt im Abschluss „Auch gut: Passen oder Dribbeln“, obwohl Dribbeln dort nicht angeboten wird – siehe Befund E1). |
| Schau-Schritt | `[]` | Der Schau-Schritt fragt nach freien **Freunden**, hier geht es um freie **Tore**. |
| Neustarts (Pflicht der Validierung) | `red: { ballbesitz: 'r1', spieler: b1 (25\|10), b2 (25\|16), r1 (33.5\|12), r2 (31\|18) }`, `blue: { ballbesitz: 'b1', spieler: b1 (24\|12), b2 (22\|18), r1 (28\|10), r2 (33\|14) }` | Ohne Verteidigungsphase wird nur `red` benutzt: nach einem Tor stellt die Engine diese Aufstellung (sie ist im Rückmeldebild zu sehen). `blue` wird nie verwendet. Mit M1 sollte nach einem Tor direkt die nächste Situation kommen (Befund E6). |

Feld 36 × 24 m, rote Tore bei (36\|6) „oben“ und (36\|18) „unten“, Torschusszone ab x ≥ 29,7.

## Lernziele
1. Kind: „Ich schaue, vor welchem Tor kein Roter steht, und schieße dorthin.“ – Fachlich: Torabschluss auf das freie Minitor (Torwahl nach Position des Torwächters).
2. Kind: „Wenn ich zu weit weg bin, dribble ich erst näher ran.“ – Fachlich: Torschusszone erkennen, Abschlussposition herstellen.
3. Kind: „Wenn beide Tore zu sind, spiele ich zu meinem freien Freund.“ – Fachlich: Abschluss nicht erzwingen, besser postierten Mitspieler einbinden.

## Situationen (Startlagen, alle Werte in Metern, Ball bei b1)

| | b1 (Ball) | b2 | r1 (Druck) | r2 (Torwächter) | Kontext / Aktionen | Schussreserve oben / unten | Pass b2 |
|---|---|---|---|---|---|---|---|
| A1 | 31 \| 12 | 24 \| 19 | 29.5 \| 13.5 | 34.5 \| 7.8 | abschluss: Schießen, Passen | −0,35 (zu) / **0,63** | −0,16 (zu) |
| A2 | 30.5 \| 14.5 | 24 \| 6 | 29 \| 13 | 34 \| 16.7 | abschluss: Schießen, Passen | **0,60** / −0,25 (zu) | −0,18 (zu) |
| A3 | 32 \| 8 | 30 \| 20 | 33.1 \| 10.8 | 34.2 \| 7 | abschluss: Schießen, Passen | −0,12 / −0,17 (beide zu) | **0,26** |
| A4 | 26 \| 12 | 21 \| 19 | 24 \| 9.5 | 34.4 \| 7.9 | angriff: Passen, Dribbeln | – (außerhalb der Zone) | 1,04 |
| A5 | 30.5 \| 13 | 24 \| 6 | 28.5 \| 13 | 34 \| 12 | abschluss: Schießen, Passen | **0,42** / **0,73** | 0,37 |

Schuss gilt als frei ab Reserve > 0,15 s, Pass ab > 0,2 s (Engine-Werte, unverändert). r2 steht in A1–A4 genau dort, wo die Engine den Torwächter hinstellt (2,4 m vor dem näheren Tor Richtung Ball).

### A1 – Torwächter oben, unten frei
- **Lernziel:** „Rot steht vor dem oberen Tor. Unten ist frei!“ – freies Tor nach Torwächterposition wählen.
- **Gut:** Schuss unten. **Weniger gut:** Schuss oben (geblockt), Pass zu b2 (r1 steht im Passweg).

| Weg | Ereignisse | E / Z / ⭐ | gesprochene Rückmeldung (`fb.say`) | Ende |
|---|---|---|---|---|
| **Hilfe/Muster:** Schuss unten | goal | ✓ ✓ ⭐ | „Toooor! Der Weg war frei. Super gemacht!“ | Tor (1) |
| Fehler: Schuss oben | blocked:r2 | ✓ ✗ 💭 | „Geblockt! Rot 2 stand vor dem Tor. Gute Idee, aufs Tor zu schießen! Aber schau mal: Vor diesem Tor stand Rot 2. Das andere Tor war frei.“ | Ballverlust (1) |
| Alternative: Pass zu b2 | intercepted:r1 | ✓ ✗ 💭 | „Oh! Rot 1 stand im Weg und hat den Ball bekommen. Gute Idee, den Ball abzuspielen! Aber schau mal: Rot 1 stand nah am Weg zu Blau 2. In den freien Raum hätte es geklappt – dein Freund wäre hingelaufen.“ | Ballverlust (1) |
| Alternative: Pass in den Raum (28\|20) → Hilfe | received:b2 → Freilaufen b1 (33.5\|15.5) mit autoDribble von b2 → Schuss unten: goal | ✓✗💭 → ⭐ → ⭐ | 1: „Der Pass ist angekommen! Gute Idee, den Ball abzuspielen! Aber schau mal: Rot 1 stand nah am Weg zur freien Stelle.“ | Tor (3) |

Hilfe: Schießen, Ziel Tor unten, „Vor diesem Tor steht kein Gegner im Weg.“

### A2 – Torwächter unten, oben frei (Spiegel von A1, andere Ballposition)
- **Lernziel:** „Jetzt steht Rot unten. Oben ist frei!“ – Torwahl ändert sich mit der Lage, nicht „immer unten“.
- **Gut:** Schuss oben. **Weniger gut:** Schuss unten (geblockt), Pass zu b2 (abgefangen von r1).

| Weg | Ereignisse | E / Z / ⭐ | Rückmeldung | Ende |
|---|---|---|---|---|
| **Hilfe/Muster:** Schuss oben | goal | ✓ ✓ ⭐ | „Toooor! Der Weg war frei. Super gemacht!“ | Tor (1) |
| Fehler: Schuss unten | blocked:r2 | ✓ ✗ 💭 | „Geblockt! Rot 2 stand vor dem Tor. … Das andere Tor war frei.“ | Ballverlust (1) |
| Alternative: Pass zu b2 | intercepted:r1 | ✓ ✗ 💭 | „Oh! Rot 1 stand im Weg … In den freien Raum hätte es geklappt …“ | Ballverlust (1) |

Hilfe: Schießen, Tor oben, „Vor diesem Tor steht kein Gegner im Weg.“

### A3 – Beide Tore zu, Freund frei → Pass, dann Abschluss des Freundes
- **Lernziel:** „Beide Tore sind zu. Dein Freund steht frei – spiel zu ihm, dann schießt er!“ – Abschluss nicht erzwingen; besser postierten Mitspieler einbinden.
- **Gut:** Pass zu b2, danach Schuss unten. Auch gut: Pass in den Raum Richtung b2 (z. B. 30\|16). **Weniger gut:** Schuss oben/unten (beide geblockt, Entscheidung ✗: „Beide Tore waren zugestellt. Ein Pass zu einem freien Freund wäre besser gewesen.“).

| Weg | Ereignisse | E / Z / ⭐ | Rückmeldung | Ende |
|---|---|---|---|---|
| **Hilfe/Muster:** Pass b2 → Schuss unten | received:b2 → goal | ⭐ → ⭐ | „Der Pass ist angekommen! Super gemacht!“ → „Toooor! Der Weg war frei. Super gemacht!“ | Tor (2) |
| Gute Alternative: Pass in den Raum (30\|16) → Schuss unten | received:b2 → goal | ⭐ → ⭐ | wie oben | Tor (2) |
| Fehler nach gutem Pass: Pass b2 → Schuss oben | received:b2 → blocked:r1 | ⭐ → ✓✗💭 | 2: „Geblockt! Rot 1 stand vor dem Tor. … Das andere Tor war frei.“ | Ballverlust (2) |
| Fehler: Schuss oben | blocked:r2 | ✗ ✗ 💭 | „Geblockt! Rot 2 stand vor dem Tor. Schau mal: Beide Tore waren zugestellt. Ein Pass zu einem freien Freund wäre besser gewesen.“ | Ballverlust (1) |
| Fehler: Schuss unten | blocked:r1 | ✗ ✗ 💭 | „Geblockt! Rot 1 stand vor dem Tor. Schau mal: Beide Tore waren zugestellt. …“ | Ballverlust (1) |

Hilfe-Weg: (1) Passen, b2 leuchtet, „Schau mal auf den Spieler, der leuchtet. Zwischen euch steht kein Gegner.“ (2) Schießen, Tor unten, „Vor diesem Tor steht kein Gegner im Weg.“
Lage nach dem Pass (simuliert): b2 (30\|20) mit Ball, r1 läuft während des Passes mit und steht bei (31.2\|16.4), r2 (35.0\|8.2) bleibt am oberen Tor → unten frei.

**Prüfung „Pass und anschließender Abschluss“ – ehrliches Ergebnis (`a3-robustheit.js`):**
- Es geht **ohne Erzwingen**, aber nur, wenn der Freund **schon in der Torschusszone steht** (x ≥ 29,7). Nur dann folgt auf den Pass der Moment `abschluss`; sonst kommt `ohneBall` (Freilaufen).
- Raster über die Position von b2 (x 24–35, y 13–23, übrige Spieler wie oben): 83 Lagen „beide Tore zu, Freund frei“. Davon **17** mit direktem Abschluss-Moment und Tor (2 Entscheidungen) – alle bei **x = 30–31**. Bei x ≥ 32 steht r1 im Passweg, bei x ≤ 29 ist b2 außerhalb der Zone: Tor dann nur über den Umweg Pass → **Freilaufen** (b1 läuft, b2 dribbelt automatisch in die Zone) → Schuss (3 Entscheidungen; 33 weitere Lagen), sonst endet die Situation an der Angriffsgrenze.
- Der Umweg über Freilaufen ist Stoff von Lernwelt 2 und passt nicht zu A. **A3 hängt also an einem schmalen Band (≈ 1,5 m in x).** Engine-Grund: Der Kontext „nach erfolgreichem Pass → Freilaufen“ ist fest; die Zone-Ausnahme greift nur bei x ≥ 29,7. Kein Engine-Wunsch für A nötig, solange die Startlage im Band bleibt; bei Feinjustierung der Lage A3 immer mit `a3-robustheit.js` gegenprüfen.
- 3 gegen 3 geprüft: Steht der dritte Rote dort, wo die Engine ihn hinstellt (Deckung von b2), ist der Pass zu b2 nicht mehr frei (Reserve −0,01) und die Hilfe empfiehlt b3. Deshalb 2 gegen 2.

### A4 – Noch zu weit weg → erst näher ran, dann aufs freie Tor
- **Lernziel:** „Von hier kannst du noch nicht schießen. Dribble näher ans Tor!“ – Torschusszone erkennen; Schießen wird außerhalb der Zone nicht angeboten.
- **Gut:** Dribbeln in die Zone weg vom Torwächter (z. B. 29.8\|15.2, 31\|15, 30\|18), dann Schuss unten. **Weniger gut:** Dribbeln Richtung Torwächter (31\|9) oder gerade (31\|12) – Ball bleibt, aber Ziel 💭; Dribbeln in r1 (Ballverlust); Schuss oben nach dem Dribbeln (geblockt). Pass zu b2 ist erlaubt (⭐), führt aber vom Thema weg.

| Weg | Ereignisse | E / Z / ⭐ | Rückmeldung | Ende |
|---|---|---|---|---|
| **Hilfe/Muster:** Dribbeln (29.8\|15.2) → Schuss unten | – → goal | ⭐ → ⭐ | „Gut gedribbelt – du hast den Ball behalten! Super gemacht!“ → „Toooor! …“ | Tor (2) |
| Gute Alternative: Dribbeln (31\|15) bzw. (30\|18) → Schuss unten | – → goal | ⭐ → ⭐ | wie oben | Tor (2) |
| Dribbeln (31\|12) oder (31\|9) → Schuss unten | – → goal | ✓✗💭 → ⭐ | 1: „Gut gedribbelt – du hast den Ball behalten! Gute Idee, zu dribbeln! Aber schau mal: Du bist direkt auf einen Gegner zugelaufen.“ (Befund E3: Text passt nicht, r2 war 4–5 m entfernt) | Tor (2) |
| Kurz dribbeln (28\|12) → Hilfe | ⭐ → Hilfe dribbelt bis (29.69\|16.7) – **0,01 m vor der Zone** → noch ein Dribbling | ⭐⭐⭐ | – | **Grenze (3), kein Abschluss** (Befund E5) |
| Fehler: Dribbeln (31\|15) → Schuss oben | – → blocked:r2 | ⭐ → ✓✗💭 | „Geblockt! Rot 2 stand vor dem Tor. … Das andere Tor war frei.“ | Ballverlust (2) |
| Fehler: Dribbeln in r1 (24\|8) | steal:r1 | ✓ ✗ 💭 | „Rot 1 stand im Weg und hat dir den Ball abgenommen. Gute Idee, zu dribbeln! Aber schau mal: Du bist direkt auf einen Gegner zugelaufen.“ | Ballverlust (1) |

Hilfe: (1) Dribbeln, Punkt (29.8\|15.2), „Dribbel dorthin, wo kein Gegner im Weg ist.“ (2) Schießen, Tor unten, „Vor diesem Tor steht kein Gegner im Weg.“
Dribbel-Raster Startlage (1 m): 796 Ziele, 115 ⭐ (14 %), davon 32 direkt in der Zone; mehrere gute Wege (oben herum ist nicht gut, unten/halbrechts schon).

### A5 – Torwächter in der Mitte → abwägen
- **Ergebnis der Prüfung:** Ein Torwächter mittig vor den Toren (34\|12) sperrt in der Engine **kein** Tor – beide Schusswege sind frei (getestet mit Torwächter x = 33,5–35 und drei Ballpositionen: immer beide Reserven > 0,15). „Abwägen“ heißt hier also: **beide Tore gehen, eines ist freier.**
- **Lernziel:** „Rot steht in der Mitte. Beide Tore sind frei – du darfst wählen!“ – erkennen, dass es mehrere gute Lösungen gibt.
- **Gut:** Schuss unten (freier, Reserve 0,73) **und** Schuss oben (0,42). Pass zu b2 ebenfalls ⭐ (Befund E7).

| Weg | Ereignisse | E / Z / ⭐ | Rückmeldung | Ende |
|---|---|---|---|---|
| **Hilfe:** Schuss unten | goal | ⭐ | „Toooor! Der Weg war frei. Super gemacht!“ | Tor (1) |
| Gute Alternative: Schuss oben | goal | ⭐ | gleich | Tor (1) |
| Alternative: Pass zu b2 → Freilaufen → Dribbeln (Hilfe) | received → – → – | ⭐ ⭐ ⭐ | „Der Pass ist angekommen! Super gemacht!“ … | Grenze (3), weg vom Tor |

## Zahl der Entscheidungen und Robustheit (je 200 Abfolgen, `childAction`-Muster)
| | Hilfe-Weg | lcg(seed) wie `trace.js` | „gemischt“ (lcg mit gestreutem Startwert) | Abstürze / Hänger |
|---|---|---|---|---|
| A1 | 1 | 1: 200 · Tor 106, Verlust 94 | 1: 177, 2: 3, 3: 20 · Tor 57, Verlust 133, Grenze 10 | 0 / 0 |
| A2 | 1 | 1: 200 · Tor 94, Verlust 106 | 1: 178, 2: 3, 3: 19 · Tor 59, Verlust 134, Grenze 7 | 0 / 0 |
| A3 | 2 | 1: 200 · Verlust 200 | 1: 116, 2: 52, 3: 32 · Tor 17, Verlust 165, Grenze 18 | 0 / 0 |
| A4 | 2 | 1: 31, 2: 8, 3: 161 · Tor 16, Verlust 128, Grenze 56 | 1: 39, 2: 29, 3: 132 · Tor 14, Verlust 117, Grenze 69 | 0 / 0 |
| A5 | 1 | 1: 200 · Tor 200 | 1: 129, 2: 2, 3: 69 · Tor 118, Verlust 66, Grenze 16 | 0 / 0 |

Wichtig zur Lesart: Bei `lcg(1…200)` liegt der **erste Zufallswert immer zwischen 0,236 und 0,314** → die erste Entscheidung ist in allen 200 Abfolgen die **erste angebotene Aktion** (im Abschluss also immer „Schießen“). Deshalb zusätzlich die gestreute Variante. Das betrifft auch die bestehenden Tests (Befund E8).
Ein Durchlauf mit 3 Situationen dauert damit auf dem Hilfe-Weg 3–5 Entscheidungen, bei Fehlern höchstens 9.

## Reihenfolge und Rotation (deterministisch, Zyklus 5 Durchläufe)
| Durchlauf | Situationen | Idee |
|---|---|---|
| 1 | A1 · A2 · A4 | Einstieg: Torwächter oben/unten, dann „näher ran“ |
| 2 | A5 · A1 · A3 | beide frei; dann bekannt; dann „beide zu → Freund“ |
| 3 | A2 · A4 · A5 | |
| 4 | A1 · A3 · A2 | |
| 5 | A4 · A5 · A3 | ab hier wieder Durchlauf 1 |
Jede Situation kommt in 5 Durchläufen genau 3-mal vor; kein Durchlauf gleicht dem vorigen; Durchlauf n = `(n−1) mod 5`. A3 erst ab Durchlauf 2.

## Ablauf mehrerer Situationen (Anforderung an M1)
- Eine Situation endet, wenn die Engine `m.done` setzt: **Tor** (Rot hat danach den Ball), **Ballverlust** (geblockt, abgefangen, abgenommen) oder **Angriffsgrenze** (3 Entscheidungen). Danach Rückmeldung, dann „Weiter“ → nächste Situation mit **ihrer eigenen Startaufstellung** (kein Neustart aus `neustart`).
- Wiederholen/Vergleichen bleibt je Entscheidung wie heute.
- Vorschlag Datenform (nur Daten, keine Logik): `situationen: [{ id: 'A1', start: {…}, phasen: {…} }, …]`, `durchlaeufe: [['A1','A2','A4'], …]`; `neustart` je Situation optional, solange `verteidigung: 0` (Befund E6).
- Missionsende nach 3 Situationen: Sterne über alle Entscheidungen; Merksatz (unten).

## Texte (missionseigene Vorschläge, Feld `texte`)
- Einführung (vorgelesen): „Heute schießt du Tore! Schau vor jedem Schuss genau: Vor welchem Tor steht kein Roter? Dorthin schießt du.“
- Ansage je Situation (optional, M1): A1/A2/A5 „Welches Tor ist frei?“ (vorhandener Text `kontext.abschluss` passt); A4 – vorhandener Text `angriffFrei` („Passen oder dribbeln?“) passt nur halb. Vorschlag `kontext.angriffFrei.say`: „Von hier kannst du noch nicht schießen. Was machst du mit dem Ball?“ (gilt dann für die ganze Mission, auch nach Pässen).
- Merksatz Ende (`ende.merksatz`): „ Vor dem Schuss schaust du: Wo steht kein Roter? Und wenn beide Tore zu sind, hilft dir ein Freund.“
- Kein neuer Rückmeldetext nötig.

## Befunde zur Engine (für Hauptsitzung / Product Owner)
| Nr. | Befund | Wirkung auf A | Zuordnung (Vorschlag) |
|---|---|---|---|
| E1 | `withAlternatives` nennt immer aus `['schiessen','passen','dribbeln']`, nicht aus den angebotenen Aktionen: im Abschluss „Auch gut: Passen oder Dribbeln.“, obwohl Dribbeln dort nicht angeboten wird. | Deshalb `alternativenNennen: false`. | M2 (Aktionslisten bereinigen; gleiche Stelle wie „Passen nur mit Mitspieler“) |
| E3 | Dribbel-Ziel wird 💭 mit „Du bist direkt auf einen Gegner zugelaufen“, obwohl kein Gegner im Weg war: Bewertung rechnet jeden Roten mit 3,5 m/s und 0,1 s Reaktion als Abfänger; in der Simulation läuft nur der Druckspieler (3,0 m/s, stoppt 1,4 m vor dem Ball), der Torwächter bleibt am Tor. | A4: (31\|12), (31\|9) behalten den Ball und führen zum Tor, sind aber 💭. | eigener Prüfpunkt D „Dribbelbewertung und -hilfe“, Wirkung auf Mission 1 belegen; Details im Entwurf B |
| E5 | Hilfe-Dribbeln kennt die Torschusszone nicht (fester 5-m-Schritt): endet bei x = 29,69, 0,01 m vor der Zone. | A4 nach kurzem Dribbling: Grenze ohne Abschluss. | Prüfpunkt D (Hilfe); alternativ M1: „Abschluss zählt nicht zur Angriffsgrenze“ |
| E6 | Nach einem Tor stellt die Engine `neustart.red` (im Rückmeldebild sichtbar); bei `verteidigung: 0` wird `neustart.blue` nie benutzt, ist aber Pflicht. | Nur Optik. | M1 |
| E7 | Bewertung kennt keine Rangfolge guter Aktionen: In A5 ist der Rückpass ⭐, in A1 ist „Passen in den Raum“ eine „gute Idee“, obwohl ein Tor frei ist. So gewollt (E2: andere Wege nicht abwerten). | Hilfe zeigt trotzdem den Schuss. | keine Änderung vorgeschlagen; PO-Info |
| E8 | `lcg(1…200)` liefert als ersten Wert immer 0,236–0,314: In `tests/golden/trace.js`/`branches` ist die **erste** Entscheidung jeder Fehlabfolge immer die erste angebotene Aktion. | Prüfung hier zusätzlich gestreut. | `simulation-qa` (Testgüte), kein Verhaltensthema |
| E9 | Nach erfolgreichem Pass kommt fest `ohneBall`, außer der Empfänger steht in der Zone. | A3 nur im schmalen Band. | Info; kein Wunsch für A |

## Offene Punkte für den Product Owner
1. A3 im schmalen Band akzeptieren (Lage ist geprüft) – oder A3 durch eine Variante „beide zu, Freund frei, Pass ist die Lösung“ ohne anschließenden Abschluss ersetzen?
2. A5 als „beide frei – du darfst wählen“ (statt „Abwägen bei zugestelltem Tor“) bestätigen.
3. E3/E5 entscheiden (betreffen auch Mission 1 und stark Mission B).
