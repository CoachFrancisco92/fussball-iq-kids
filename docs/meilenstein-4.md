# Meilenstein 4 – „Freie Bahn!“ und A4 (Grundlage V0.5.0)

Stand 19.11.2026, Branch `meilenstein-4-freie-bahn` (Basis `meilenstein-3b-dribbeln`). Version 0.5.0. **Zur Abnahme vorgelegt.** Es gibt keinen Merge und keine Veröffentlichung.

## 0. Vorab erledigt (Freigaben aus 3b)
- **Mindeststrecke:** Sie zählt jetzt die tatsächlich ausgeführte Bewegung bis zum Szenenende, nicht die Entfernung zum Tippziel. Ein Test belegt das: Ein 4 m weiter Tipp ins Aus mit nur 0,5 m Bewegung ist „nur ein kleiner Schritt“. Keine aufgezeichnete Entscheidung hat sich dadurch geändert.
- **Referenzen v0.5.0** für Mission 1 und Mission A, erzeugt nach grüner CI von `84644c9`:
  - Geprüft mit `tests/analysis/paket-d/referenzwechsel-pruefen.js`. Die neuen Referenzen enthalten **ausschließlich** die freigegebenen Abweichungen: Mission 1 19 Abfolgen und den Ablauf „dribbling“, Oberfläche Mission 1 10 Einträge, Mission A 12 Abfolgen. Alles andere ist identisch.
  - Vorgänger (v0.3.1, v0.4.0) und Abweichungslisten liegen dauerhaft in `tests/golden/historie/`.

## 1. „Freie Bahn!“ (`missions/freie-bahn.js`)
Lernmission (🎓), Lernwelt 1, Platz 2 im Lernweg, Symbol 🏃. Gespielt wird 1 gegen 1 bzw. 1 gegen 2, ohne Mitspieler. Angeboten wird nur „Dribbeln“, die App wählt es direkt; in der Schusszone nur „Schießen“.
- 5 Durchläufe à 3 Situationen, jede Situation 3-mal. Der erste Durchlauf beginnt mit den 1-gegen-1-Lagen.
- Bis zu 5 Dribblings je Situation; erreicht das letzte die Schusszone, folgt noch der Schuss.
- Hilfe: Dribbeln, dann Schießen.
- Ansagen ohne „Passen“ und „Freund“: „Wohin dribbelst du? Tippe dorthin, wo kein Roter ist.“ bzw. „Ein Roter ist nah! Dribbel an ihm vorbei – Richtung Tor.“
- Merksatz: „Beim Dribbeln schaust du: Wo ist frei? Dorthin dribbelst du – und vor dem Tor schießt du aufs freie Tor.“

### Auswahl der Situationen (mit der Paket-D-Bewertung neu geprüft, `tests/analysis/freie-bahn/pruefung.js`)
| Lage | Entscheidung, die das Kind trifft | gut | schlecht | Hilfe-Weg | robust ±0,5 / ±1 m | Entscheidung |
|---|---|---|---|---|---|---|
| **B3** Verfolger hinten (1:1) | zügig nach vorn statt zurück | jede Vorwärtsrichtung, kurz oder lang | zurück in den Verfolger („direkt auf einen Gegner“), quer ohne Grund („Nach vorn war Platz“) | 2 Dribblings, Tor | 8/8 · 8/8 | übernommen |
| **B4** Gegner frontal (1:1) | seitlich vorbei statt hinein | oben **und** unten vorbei | geradeaus in den Gegner (Ballverlust, „direkt auf einen Gegner“) | 2 Dribblings, Tor | 8/8 · 8/8 | übernommen |
| **B2** große Lücke (1:2) | Lücke **oder** außen herum | beides ⭐, oben wie unten | in einen der Gegner | 3 Dribblings durch die Lücke, Tor | 12/12 · 12/12 | übernommen |
| **B6** enge Lücke (1:2), **neu** | Lücke zu eng → außen herum | außen herum (oben/unten) | durch die Lücke („Dribbel weiter weg von Rot 1“, Ballverlust); bleibt 💭, auch wenn die Gegner ±0,5 m anders stehen | 3 Dribblings außen herum, Tor | 12/12 · 12/12 | neu, als Gegenstück zu B2 |
| **B5** viel Platz (1:2) | große Stücke nach vorn, dann **freies Tor wählen** | ein großes oder zwei kleine Stücke; Schuss aufs obere Tor | Schuss aufs untere Tor (Rot 2 steht davor) | 3 Dribblings, Schuss oben, Tor | 12/12 · 12/12 | übernommen |
| B1 Gegner schräg vorn (1:1) | – | jede Vorwärtsrichtung ⭐ (der Gegner steht weit genug weg) | – | – | – | **entfällt**: Mit der korrigierten Bewertung ist es keine eigene Entscheidung mehr, sondern dasselbe wie B3 |

Damit fragt jede Situation etwas anderes: Tempo nach vorn, Ausweichen, Wahl zwischen zwei guten Wegen, Erkennen einer zu engen Lücke und am Ende die Torwahl. Spiegelungen gibt es nicht.

**Hilfe und Musterlösung:**
- Die Hilfe zeigt einen guten, robusten Weg, meist den direktesten.
- Bewertet werden alle sinnvollen Wege positiv. Im Raster sind in der Startlage 33–43 % der Ziele ⭐, in 11 von 13 Richtungen nach vorn; in B4 nicht geradeaus.
- Die Browser-Prüfung spielt in B2 bewusst „außen herum“ und bekommt ⭐.

## 2. A4 in „Welches Tor ist frei?“
- **A4:** Blau 1 (26|12) ist noch zu weit fürs Tor, Rot 1 (24|9,5) steht seitlich vorn, Blau 2 (21|19). Das Kind dribbelt in die Schusszone und schießt dann aufs freie Tor.
- **Ansage außerhalb der Schusszone** (nur in Mission A): „Noch zu weit fürs Tor! Dribbel am Roten vorbei näher ran – oder pass.“
- **4 statt 3 Angriffsentscheidungen nur in A4** (Vorgabe aus der 3b-Abnahme, Punkt 3):
  - Auch der andere gute Weg, Pass zu Blau 2 → Freilaufen → Dribbling, endet noch mit dem Torschuss.
  - Mit 3 Entscheidungen hätte die Situation direkt nach dem gelungenen Dribbling geendet.
- **Rotation:** 5 Durchläufe à 3 Situationen, jede Situation 3-mal. **Durchlauf 1 bleibt unverändert** (A1 · A2 · A5).

**Prüfungen A4:**
- Hilfe-Weg Dribbling ⭐ → Schuss ⭐ → Tor in der Startlage und bei **jeder** Abweichung eines Spielers um ±0,5 m und ±1 m in x und y: **32/32**.
- Pass zu Blau 2 ist ebenfalls gut, mehrere gute Wege.
- 💭 gibt es für: in Rot 1 hinein dribbeln, zurück dribbeln („Nach vorn war Platz“). Außerhalb der Zone wird kein Schuss angeboten.

**Wirkung auf die bisherigen Situationen A1/A2/A3/A5** (`tests/analysis/a4-vergleich.js`):
- 57 von 60 Situations-Episoden der festen Spielweisen sind identisch zur freigegebenen Referenz.
- Die übrigen 3 (Spielweise „immer passen“, A5) unterscheiden sich **nur in der Ansage** nach einem Rückpass aus der Zone: jetzt „Noch zu weit fürs Tor! …“ statt „Ein Gegner kommt! … Wem spielst du den Ball zu?“. Bewertungen, Rückmeldungen und Positionen sind gleich.
- Die Kinder-Abfolgen ändern sich fast alle (192/200). Ursache ist allein die neue Rotation: Abfolge *n* spielt jetzt Durchlauf *n* mod 5 statt *n* mod 4.
- **Vorgelegt, Referenz nicht ersetzt:**
  - Engine: `tests/golden/missionA-abweichungen-a4.json`.
  - Oberfläche: `tests/golden/ui-mission-a.v0.5.0-a4.json`, 75 Einträge, mit allen 5 Durchläufen und A4.
  - Gegen die freigegebene Referenz geprüft: Durchlauf 1 ist identisch. Der Startbildschirm hat zusätzlich die Karte „Freie Bahn!“, und Mission 1 rückt auf Platz 3.

## 3. Weitere Änderungen
- **Missionsart auf der Karte** (Freigabe aus dem Ausbauplan): Datenfeld `art` und ein kleines Etikett „🎓 Lernen“ (Mission A, Freie Bahn) bzw. „🏆 Spiel“ (Mission 1). Kein Einfluss auf den Ablauf, nicht vorgelesen. `validateMission` prüft den Wert; das ist die einzige, generische Änderung an `engine.js` in diesem Meilenstein (neben der Mindeststrecke).
- **Endbildschirm:** Bei „Freie Bahn!“ entstehen bis zu 12 Entscheidungen. Die Liste schob dabei „Nochmal“ auf dem iPad quer **aus dem Bildschirm**; das ist im Browser-Test aufgefallen. Jetzt scrollt die Liste (max. 34 % der Höhe), und die Knöpfe bleiben sichtbar. Ein Test sichert das ab.
- **Mission 1:**
  - Spielverlauf, Bewertung und Mitschrift sind identisch zur Referenz v0.5.0.
  - Auf dem Startbildschirm ist sie jetzt Karte 3 mit dem Etikett „🏆 Spiel“.
  - In `missions/mission-1.js` ist nur `art: 'spiel'` dazugekommen.

## 4. Tests
| | Ergebnis |
|---|---|
| `npm test` | **135/135**, neu: `tests/freie-bahn.test.js` (14), A4-Tests in `tests/mission-a.test.js` (+4), Mindeststrecke; `npm run test:all` grün |
| Freie Bahn je Situation | B3/B4/B2/B6/B5: gute **und** schlechte Dribblings, beide Wege in B2, enge Lücke in B6 robust, freies Tor in B5 |
| Freie Bahn Hilfe | jede Situation in ≤ 4 Entscheidungen zum Tor, nur ⭐, nie „eng“; Startlagen ±0,5/±1 m je Spieler: Hilfe-Weg weiter nur ⭐ und Tor |
| Freie Bahn schlechte Spielweisen | in den Gegner, rückwärts, quer: nie ⭐; jede Situation und die Mission enden |
| Kinder-Abfolgen | 150 gestreute (Freie Bahn), 300 (Mission A): jede Szene endet, Stern = Bewertung vor der Aktion |
| Referenzen | Mission 1 und Mission A (Durchlauf 1) identisch zu v0.5.0; Freie Bahn Erstaufnahme `freie-bahn.v0.5.0.json` / `ui-freie-bahn.v0.5.0.json` (161 Einträge) |
| Browser/Touch (iPad 1024×768) | `e2e/freie-bahn.mjs`: alle 5 Durchläufe, gute und schlechte Wege, Erklärungen, Situationswechsel ohne Zwischenbild; `e2e/mission-a.mjs` mit A4; `e2e/auswahl.mjs` mit 3 Karten und separater Ansage-Prüfung beim Antippen |
| Offline | alle drei Missionen laden und starten ohne Netz (Cache `fiq-v0.5.0`, 11 Dateien) |
| CPU-Drosselung | 4× (`SLOW=4`): `play`, `mission-a`, `freie-bahn` grün |
| Rechenzeit, 4× gedrosselt | 128 Lagen (Mission 1, Mission A inkl. A4, Freie Bahn alle Durchläufe, Extremfälle): jede Bewertung und jede Hilfe ≤ 150 ms, **max 60–66 ms** (zwei Läufe), Median ≤ 16 ms. Keine längeren Wartezeiten durch die neuen Situationen. |

## 5. Zur Freigabe
1. **„Freie Bahn!“** mit B3, B4, B2, B6 (neu) und B5; B1 entfällt.
2. **A4** mit 4 Angriffsentscheidungen, der neuen Ansage und der neuen Rotation. Die Engine-Abweichungen und die Oberflächen-Aufnahme für Mission A sind vorgelegt.
3. **Erstaufnahme** der Referenzen für „Freie Bahn!“.
4. **Kennzeichnung der Missionsart** und **scrollende Liste auf dem Endbildschirm.**
5. Danach: Mission-A-Referenz mit A4 übernehmen, Merge und V0.5.0. Beides nur mit deiner ausdrücklichen Freigabe.

## 6. Offene Punkte und Risiken
- **Nachsichtige Simulation:** Der mitlaufende Rote greift nicht an. „Gegner umgehen“ lernt das Kind deshalb vor allem in B4 und B6 (Hineinlaufen kostet den Ball) und in B2 (Wahl). „Abstand halten“ hat keine Folgen, das käme mit B5 (Zweikampf), zurückgestellt.
- **Hilfe-Wege** führen meist auf direktem Weg Richtung Tor. Andere sinnvolle Wege bewertet die Mission gleich gut. Einen Wechsel der Hilfe-Wege habe ich bewusst nicht eingebaut, er wäre zufallsähnlich.
- **Kindertest** mit „Freie Bahn!“ steht aus. Zu beobachten: Wird die direkte Auswahl von „Dribbeln“ verstanden? Wird die enge Lücke in B6 erkannt?
- **Echtes iPad** nicht gemessen; nur Chromium mit Drosselung.
