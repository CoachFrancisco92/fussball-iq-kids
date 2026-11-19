# Missionsentwurf B „Freie Bahn!“ (Lernwelt 1)

Stand: 19.11.2026 · Basis V0.3.1 + **M2-Prototyp** (Wegwerf-Kopie, siehe unten) · Entwurf `mission-designer` (Schritt 1, keine Umsetzung)
Prüfskript: `tests/analysis/missionsentwurf/b-freie-bahn.js` (Analyse, kein Test). Aufruf mit Prototyp: `FIQ_ROOT=<Kopie mit M2-Patch> node tests/analysis/missionsentwurf/b-freie-bahn.js --kurz`.

## Kurzfassung
- Das Kind entscheidet nur über **Richtung und Strecke** eines Dribblings (eine Aktion → die App überspringt die Knopfwahl, das Kind tippt direkt aufs Feld). In der Torschusszone bleibt nur „Schießen“. Das fühlt sich deutlich anders an als A (dort: Torwahl).
- **1 gegen N ist mit einem kleinen M2-Patch (3 Stellen, 7 Zeilen) technisch machbar:** 0 Abstürze, 0 hängende Szenen in 2 × 200 Abfolgen je Situation; alle 76 bestehenden Tests bleiben im Prototyp grün (inkl. Referenz Mission 1).
- **Fachlich nur eingeschränkt brauchbar** ohne weitere Engine-Klärungen:
  1. Lange Dribblings werden oft 💭 mit dem Satz „Du bist direkt auf einen Gegner zugelaufen“, obwohl der Ball behalten wird und kein Gegner im Weg war (Befund B-E1). „Strecke“ wird damit unfreiwillig zur Regel „kurz ist gut“: Stern-Anteil 2–4 m bis 100 %, > 8 m 22–53 %.
  2. Die Dribbel-Hilfe führt bei viel Platz an die Seitenlinie statt Richtung Tor (Befund B-E2): Der Hilfe-Weg erreicht das Tor nur in B3 und B4; in B1, B2, B5 endet er an der Angriffsgrenze ohne Abschluss.
  3. B2 „Lücke oder außen herum“ lässt sich mit der bestehenden Bewertung nicht abbilden: Durch die Lücke **und** außen herum sind beide 💭; gut sind nur kurze Stücke (Befund B-E1/B-E3).
- Empfehlung: B erst nach Entscheidung über B-E1/B-E2 bauen; bis dahin B3 und B4 (funktionieren) als Kern, B1/B5 mit Hinweis, B2 zurückstellen.

## M2-Prototyp (Grundlage für M2, exakt so getestet)
Wegwerf-Kopie `git worktree add --detach /tmp/m2proto HEAD`, nur `engine.js` geändert, danach entfernt.
```diff
@@ validateMission
-      need(b >= 2 && r >= 2, 'start: mindestens 2 gegen 2');
+      need(b >= 1 && r >= 1, 'start: mindestens 1 gegen 1');
@@ context(s, last)
     if (s.poss === 'blue') {
+      // M2-Prototyp: „Passen“ nur anbieten, wenn ein Mitspieler existiert
+      const solo = team(s, 'blue').length < 2;
+      const mkB = (type, key, actions) => mk(type, key, solo ? actions.filter((k) => k !== 'passen') : actions);
       const inZone = c.x >= F.W - F.ZONE - 0.3;
-      if (inZone) return mk('abschluss', 'abschluss', ['schiessen', 'passen']);
+      if (inZone) return mkB('abschluss', 'abschluss', ['schiessen', 'passen']);
       if (last && last.kind === 'pass' && last.success && last.team === 'blue') return mk('ohneBall', 'ohneBall', ['freilaufen']);
       const near = team(s, 'red').some((r) => dist(r, c) < 4.5);
-      return near ? mk('angriff', 'angriffDruck', ['passen', 'dribbeln']) : mk('angriff', 'angriffFrei', ['passen', 'dribbeln']);
+      return near ? mkB('angriff', 'angriffDruck', ['passen', 'dribbeln']) : mkB('angriff', 'angriffFrei', ['passen', 'dribbeln']);
@@ bestSpacePass(s)
     const c = carrier(s);
+    if (team(s, c.team).length < 2) return null; // M2-Prototyp: ohne Mitspieler kein Pass in den Raum
```
- (3) war nötig: `situation()` ruft `bestSpacePass` → `spaceContest` greift auf einen Empfänger zu, den es ohne Mitspieler nicht gibt (Absturz bei jeder Bewertung eines Dribblings).
- `passOptions` liefert dann `[]`, `Math.max()` = −∞ → `ok.mate = false`, `ok.pass = false`: keine weitere Änderung nötig. `hint('passen')` wird nie aufgerufen, weil „Passen“ nicht mehr angeboten wird.
- Prüfung im Prototyp: `npm test` 76/76 grün. Ohne Prototyp meldet `E.validateMission` für alle B-Situationen `["start: mindestens 2 gegen 2"]`.
- Für M2 zusätzlich empfehlenswert (nicht im Prototyp): `withAlternatives` nur aus angebotenen Aktionen (siehe A, Befund E1); `lookAnswer` mit Schau-Schritt in 1 gegen N ist ungeprüft (B nutzt `schauSchritt: []`).

## Rahmen
| Punkt | Festlegung | Begründung |
|---|---|---|
| Spielerzahl | B1, B3, B4: **1 gegen 1**; B2, B5: **1 gegen 2** | Vorgabe PO. |
| Phasen | `{ maxAngriff: 5, verteidigung: 0 }` je Situation | 5 Dribbel-Entscheidungen inkl. Abschluss; bei 4 erreichte selbst ein guter Weg (B3, Start x = 14) das Tor nicht (Hilfe-Schritt fest 5 m, 3 × 5 m endet bei x = 29, 0,7 m vor der Zone). |
| Hilfe | `{ reihenfolge: ['dribbeln', 'schiessen'], alternativenNennen: false }` | Dribbeln ist das Thema; im Abschluss gibt es nur Schießen. |
| Schau-Schritt | `[]` | Kein Mitspieler. |
| Neustarts (Pflicht) | `red: { ballbesitz: 'r1', spieler: b1 (24\|12), r1 (33\|12) [, r2 (31\|18)] }`, `blue: { ballbesitz: 'b1', spieler: b1 (4\|12), r1 (16\|12) [, r2 (22\|18)] }` | Wie A: nur `red` wird nach einem Tor gestellt, `blue` nie (M1). |
| Texte | `kontext.angriffFrei`/`angriffDruck` **müssen** überschrieben werden (siehe Texte) | Standardtexte sagen „Passen oder dribbeln?“ bzw. „welcher Freund frei steht“ – im 1 gegen N falsch. |

## Lernziele
1. Kind: „Ich dribble dorthin, wo kein Roter ist.“ – Fachlich: Dribbelrichtung nach freiem Raum wählen (weg vom Gegner, am Gegner vorbei).
2. Kind: „Ich überlege, wie weit ich laufe.“ – Fachlich: Strecke dosieren (Raumgewinn vs. Sicherheit).
3. Kind: „Nah am Tor schieße ich aufs freie Tor.“ – Abschluss nach dem Dribbling.

## Situationen (Startlagen in Metern, Ball bei b1, Kontext immer `angriff` mit nur „Dribbeln“)
| | b1 (Ball) | r1 | r2 | Idee | Raster Startlage: ⭐-Anteil (alle Ziele / im 8-m-Kreis) | ⭐ nach Strecke 2–4 / 4–6 / 6–8 / > 8 m | ⭐-Richtungen (von 8 Sektoren à 45°) |
|---|---|---|---|---|---|---|---|
| B1 | 17 \| 14 | 22 \| 9 | – | Gegner oben vorn, unten frei | 46 % / 69 % | 94 / 69 / 58 / 39 % | 9* |
| B3 | 18 \| 12 | 15.5 \| 12 | – | Verfolger 2,5 m hinten | 54 % / 58 % | 56 / 59 / 58 / 53 % | 5 |
| B4 | 17 \| 12 | 23 \| 12 | – | Gegner frontal | 51 % / 64 % | 86 / 59 / 58 / 46 % | 9* |
| B2 | 12 \| 12 | 19 \| 7 | 19 \| 17 | Lücke zwischen zwei Gegnern oder außen herum | 31 % / 60 % | 100 / 58 / 44 / 22 % | 9* |
| B5 | 12 \| 13 | 23 \| 3 | 32 \| 17 | viel Platz: ein großes oder zwei kleine Stücke | 48 % / 96 % | 100 / 100 / 92 / 34 % | 9* |
\* Sektorzahl gerundet über `atan2/45°` (−4…4) – 9 bedeutet „in jede Richtung gibt es ein gutes Ziel“.
Raster: alle Dribbelziele im 1-m-Raster (Tipp > 2 m vom Ball, 796 Ziele), jedes vollständig simuliert. In keiner Lage gab es „⭐ trotz Ballverlust“ (Bewertung ist nie zu großzügig). Umgekehrt „💭, obwohl der Ball behalten wurde“ in der Startlage: B1 323, B3 188, B4 288, B2 366, B5 357 Ziele.

### B1 – Ein Gegner oben, unten frei (1 gegen 1)
- **Lernziel:** „Oben steht Rot. Unten ist der Weg frei – dribble dort vorbei!“
- **Gut:** unten vorbei (kurz 20\|18: ⭐), gerade/schräg kurz. **Weniger gut:** auf den Gegner zu (Ballverlust). **Problem:** unten vorbei **weit** (24\|18) und gerade nach vorn (25\|14) behalten den Ball und führen zum Tor, sind aber 💭.

| Weg | Verlauf (⭐/💭 je Entscheidung, Ereignisse) | gesprochen (Auszug) | Ende |
|---|---|---|---|
| **Hilfe** | (18.7\|18.7)⭐ → (20.4\|23.3)⭐ → (22.1\|23.3)⭐ → (27.1\|23.3)⭐ → (32.1\|23.3)⭐ | 5 × „Gut gedribbelt – du hast den Ball behalten! Super gemacht!“ | **Grenze (5)** – in der Zone angekommen, aber kein Abschluss mehr |
| unten vorbei weit (24\|18) → Hilfe | 💭 → ⭐ → ⭐ → Schuss unten ⭐ goal | 1: „Gut gedribbelt – du hast den Ball behalten! Gute Idee, zu dribbeln! Aber schau mal: Du bist direkt auf einen Gegner zugelaufen.“ | Tor (4) |
| unten vorbei kurz (20\|18) → Hilfe | ⭐ → ⭐ ⭐ ⭐ ⭐ (Seitenlinie) | „Gut gedribbelt …“ | Grenze (5) |
| gerade nach vorn (25\|14) → Hilfe | 💭 → ⭐ → Schuss unten ⭐ goal | wie oben (💭-Satz) | Tor (3) |
| Fehler: auf den Gegner (22\|8.5) | steal:r1 💭 | „Rot 1 stand im Weg und hat dir den Ball abgenommen. Gute Idee, zu dribbeln! Aber schau mal: Du bist direkt auf einen Gegner zugelaufen.“ | Ballverlust (1) |

### B3 – Verfolger von hinten (1 gegen 1) – funktioniert
- **Lernziel:** „Hinter dir läuft ein Roter. Dribble nach vorn weg – er holt dich nicht ein!“
- **Gut:** nach vorn, kurz **oder** weit, gerade oder schräg – alle ⭐ und alle führen zum Tor. **Fehler:** zurück zum Verfolger (Ballverlust).

| Weg | Verlauf | Ende |
|---|---|---|
| **Hilfe** | (23\|12)⭐ → (28\|12)⭐ → (33\|12)⭐ → Schuss oben ⭐ goal | Tor (4) |
| weit nach vorn (26\|12) → Hilfe | ⭐ → ⭐ → Schuss oben ⭐ goal | Tor (3) |
| kurz nach vorn (21\|12) → Hilfe | ⭐ → ⭐ → ⭐ → Schuss oben ⭐ goal | Tor (4) |
| schräg (24\|17) → Hilfe | ⭐ → ⭐ → ⭐ → Schuss unten ⭐ goal | Tor (4) |
| Fehler: zurück (14\|12) | steal:r1 💭 „Rot 1 stand im Weg und hat dir den Ball abgenommen …“ | Ballverlust (1) |
Verfolger-Prüfung (Gegner direkt hinten, 1,5–6 m, Dribbling 4/6/8 m geradeaus): immer ⭐ und Ball behalten; der Verfolger (3,0 m/s) verliert gegen das Dribbling (3,4 m/s) Abstand. Ein Verfolger **schräg** hinten in > 3 m Abstand wird dagegen als Abfänger gerechnet (B-E1).

### B4 – Gegner frontal (1 gegen 1) – funktioniert
- **Lernziel:** „Rot kommt direkt auf dich zu. Weich zur Seite aus!“
- **Gut:** schräg oben (21\|6), schräg unten (21\|18), seitlich (17\|18) – alle führen zum Tor. **Fehler:** frontal in den Gegner (Ballverlust).

| Weg | Verlauf | Ende |
|---|---|---|
| **Hilfe** | (17.9\|7.1)⭐ → (22.6\|5.4)⭐ → (27.6\|5.4)⭐ → (32.5\|5.4)⭐ → Schuss oben ⭐ goal | Tor (5) |
| schräg oben (21\|6) | 💭 → ⭐ → ⭐ → Schuss ⭐ goal | Tor (4) |
| schräg unten (21\|18) | 💭 → ⭐ → ⭐ → Schuss ⭐ goal | Tor (4) |
| seitlich (17\|18) | ⭐ ⭐ ⭐ ⭐ → Schuss ⭐ goal | Tor (5) |
| Fehler: frontal (24\|12) | steal:r1 💭 | Ballverlust (1) |
Hinweis: Die Ausweich-Dribblings schräg (≈ 7,2 m) sind 💭 „direkt auf einen Gegner zugelaufen“ – fachlich gerade die richtige Lösung (B-E1).

### B2 – Lücke zwischen zwei Gegnern oder außen herum (1 gegen 2) – funktioniert so nicht
- **Idee:** „Zwei Rote stehen vor dir. Passt du durch die Lücke – oder läufst du außen herum?“
- **Simulation:** durch die Lücke (17\|12), (20\|12), außen oben (17\|2), außen unten (17\|22): **alle 💭**, alle behalten den Ball. Gut sind nur kurze Stücke (2–4 m: 100 % ⭐). Die Hilfe zeigt im ersten Moment selbst ein 💭-Ziel (16.7\|10.3): Sie sucht nur im 5-m-Kreis und findet dort kein gutes Ziel nach vorn (B-E3).
- Hilfe-Weg: 💭 → ⭐ ⭐ ⭐ ⭐ entlang der oberen Seitenlinie → Grenze (5) ohne Abschluss. Alle vier Skriptwege: Grenze (5), je 4 ⭐.
- Zusätzlich: Der zweite Rote hat ohne blaue Mitspieler keine Aufgabe (Deckung braucht einen Mitspieler) und **bleibt stehen**, bis der Ball x ≥ 25 erreicht (dann wird der hinterste Rote Torwächter). Als „stehendes Hindernis“ für Lernwelt 1 brauchbar, aber kein echtes Verhalten (Paket B).
- **Empfehlung:** B2 zurückstellen, bis B-E1 entschieden ist.

### B5 – Viel Platz: ein großes oder zwei kleine Stücke (1 gegen 2)
- **Lernziel:** „Vor dir ist viel Platz! Du kannst ein großes Stück dribbeln oder zwei kleine.“
- **Simulation:** Erstes Stück: groß (20\|13, 8 m) ⭐, klein (14\|13) ⭐ → beide Wege gut. Das zweite große Stück in Richtung Torwächter (28\|13) ist 💭 (Ball bleibt). Weit getippt (32\|13): Die App dribbelt nur 8 m, bewertet wird aber der ganze 20-m-Weg → 💭 (B-E4).

| Weg | Verlauf | Ende |
|---|---|---|
| **Hilfe** | (13.7\|17.7)⭐ → (15.4\|22.4)⭐ → (17.1\|23.3)⭐ → (18.8\|23.3)⭐ → (20.5\|23.3)⭐ | **Grenze (5)**, 8 m vor der Zone |
| zwei große Stücke (20\|13),(28\|13) → Hilfe | ⭐ → 💭 → ⭐ → ⭐ → Schuss oben ⭐ goal | Tor (5) |
| vier kleine Stücke | ⭐ ⭐ 💭 ⭐ ⭐ | Grenze (5) |
| groß schräg, groß (19\|16),(27\|14) → Hilfe | ⭐ → 💭 → ⭐ → ⭐ → Schuss ⭐ goal | Tor (5) |
| sehr weit getippt (32\|13) → Hilfe | 💭 → ⭐ ⭐ ⭐ ⭐ | Grenze (5) |

## Hilfe in den Entscheidungsmomenten
Immer „Dribbeln“, Punkt im 5-m-Kreis, gesprochen „Dribbel dorthin, wo kein Gegner im Weg ist.“; im Abschluss „Schießen“, freies Tor, „Vor diesem Tor steht kein Gegner im Weg.“ Punkte je Moment: siehe Spalte „Hilfe“ in den Tabellen. Stern-Anteil im 1-m-Raster je Moment des Hilfe-Wegs (Auszug): B1 46 % → 18 % → 1 % → 12 % → 28 %; B3 54 % → 40 % → 25 %; B4 51 % → 41 % → 34 % → 28 %; B5 48 % → 33 % → 16 % → 9 % → 3 % (an der Seitenlinie wird es eng – Folge der Hilfe-Drift).

## Zahl der Entscheidungen (je 200 Abfolgen, `childAction`-Muster; Abstürze 0, Hänger 0 überall)
| | Hilfe-Weg | lcg(seed) wie `trace.js`: Verteilung 1/2/3/4/5 · Ende | gestreut: Verteilung · Ende |
|---|---|---|---|
| B1 | 5 (Grenze) | 29/38/40/34/59 · Tor 17, Verlust 152, Grenze 31 | 25/49/46/23/57 · Tor 20, Verlust 141, Grenze 39 |
| B3 | 4 (Tor) | 35/56/39/28/42 · Tor 16, Verlust 163, Grenze 21 | 32/65/46/18/39 · Tor 25, Verlust 147, Grenze 28 |
| B4 | 5 (Tor) | 26/43/39/33/59 · Tor 15, Verlust 151, Grenze 34 | 24/50/44/23/59 · Tor 20, Verlust 140, Grenze 40 |
| B2 | 5 (Grenze) | 53/46/29/28/44 · Tor 15, Verlust 161, Grenze 24 | 57/53/28/12/50 · Tor 15, Verlust 159, Grenze 26 |
| B5 | 5 (Grenze) | 12/23/50/42/73 · Tor 15, Verlust 148, Grenze 37 | 14/28/53/26/79 · Tor 9, Verlust 145, Grenze 46 |
(Zufallsziele liegen bis 5 m außerhalb des Feldes; viele Ballverluste sind Läufe in Gegner oder an den Rand.)
Ein Durchlauf mit 2 Situationen: Hilfe-Weg 8–10 Entscheidungen – länger als A, wie gewünscht.

## Reihenfolge und Rotation (Zyklus 5 Durchläufe, je Situation 2-mal)
| Durchlauf | Situationen |
|---|---|
| 1 | B1 · B4 (nur 1 gegen 1) |
| 2 | B3 · B2 |
| 3 | B4 · B5 |
| 4 | B1 · B2 |
| 5 | B3 · B5 |
Ab Durchlauf 2 je eine 1-gegen-1- und eine 1-gegen-2-Situation. Solange B2 zurückgestellt ist: B2 durch B3 bzw. B4 ersetzen (Durchlauf 2: B3 · B5, Durchlauf 4: B1 · B3).

## Ablauf mehrerer Situationen (M1)
Ende einer Situation: Tor, Ballverlust oder Angriffsgrenze (5) → Rückmeldung → nächste Situation mit eigener Startaufstellung. **Vorschlag M1:** Wenn die letzte erlaubte Entscheidung in die Torschusszone führt, folgt noch der Abschluss (B1-Hilfe-Weg endet sonst in der Zone ohne Schuss). Das ändert keine Bewertung.

## Texte (missionseigen, Feld `texte`)
- Einführung: „Heute dribbelst du! Du hast den Ball ganz allein. Schau, wo kein Roter ist, und tippe dorthin, wohin du dribbeln willst.“
- `kontext.angriffFrei`: title „Wohin dribbelst du?“, tag „Freie Bahn“, say „Du hast den Ball! Wo ist der Weg frei? Tippe dorthin, wohin du dribbeln willst.“
- `kontext.angriffDruck`: gleich, say „Achtung, ein Gegner ist nah! Wo ist der Weg frei? Tippe dorthin, wohin du dribbeln willst.“
- `kontext.abschluss.say`: „Du bist nah am Tor! Schau genau: Welches Tor ist frei? Tippe darauf.“
- `ende.merksatz`: „ Beim Dribbeln schaust du: Wo ist kein Roter? Dorthin läufst du mit dem Ball.“
- Nicht passend, aber nicht missionseigen lösbar: „Du bist direkt auf einen Gegner zugelaufen“ bei langen Dribblings ohne Gegner im Weg (B-E1).

## Befunde zur Engine
| Nr. | Befund | Beleg | Zuordnung (Vorschlag) |
|---|---|---|---|
| B-E0 | 1 gegen N stürzt ohne Patch ab: `validateMission` verlangt 2 gegen 2; ohne Mitspieler wirft `situation()` (über `bestSpacePass`/`spaceContest`) bei jeder Dribbel-Bewertung; „Passen“ wird angeboten. | Prototyp oben | **M2** (Patch wie oben) |
| B-E1 | Bewertungsmodell Dribbeln ≠ Simulation: `dribbleLane` rechnet jeden Roten (außer Verfolgern < 3 m, von denen man wegläuft) mit 3,5 m/s und 0,1 s Reaktion als Abfänger über den **ganzen** Weg. In der Simulation läuft nur der nächste Rote (3,0 m/s) an, stoppt 1,4 m vor dem Ball und nimmt den Ball nur, wenn das Kind auf ihn zuläuft; der Torwächter bleibt am Tor, der zweite Rote im 1 gegen 2 steht. Folge: lange, gute Dribblings 💭 mit dem Satz „Du bist direkt auf einen Gegner zugelaufen.“ | Raster: 188–366 Ziele je Startlage „💭, obwohl Ball behalten“, 0 „⭐ trotz Verlust“; Stern-Anteil sinkt mit der Strecke | eigener Prüfpunkt D „Dribbelbewertung und -hilfe“, kein Missionsthema; Wirkung auf Mission 1 belegen. Mindestens der **Text** ist falsch (kein Gegner „direkt“ im Weg). Ich schlage **keine** neue Regel vor; zu entscheiden ist, ob Modell und Simulation angeglichen werden. |
| B-E2 | Hilfe-Dribbeln wählt das Ziel mit der größten, **nicht gedeckelten** Zeitreserve (+0,02 je m Raumgewinn) in festem 5-m-Abstand → Drift zur Seitenlinie, dort 1,7-m-Schritte; Torschusszone unbekannt (endet bei x = 29,69). | B1, B2, B5: Hilfe-Weg ohne Abschluss | Prüfpunkt D (nur Hilfe; Vorbild: `bestSpacePass` deckelt die Reserve bei 1). Ein Wegwerf-Versuch nur mit gedeckelter Reserve (min(Reserve, 1)) reichte nicht: in allen 4 geprüften Lagen weiter kein Abschluss innerhalb der Grenze. |
| B-E3 | Gibt es im 5-m-Kreis kein gutes Ziel, zeigt die Hilfe ein 💭-Ziel, obwohl kürzere Ziele ⭐ wären; in 1 gegen N gibt es keine andere Aktion, auf die `recommend` ausweichen kann. | B2 Startlage: Hilfe (16.7\|10.3) 💭, 2–4 m: 100 % ⭐ | M2 (1 gegen N) bzw. Prüfpunkt D (Hilfe-Radius) |
| B-E4 | Tipp > 8 m: Ausführung nur 8 m, Bewertung über die ganze Strecke bis zum Tipp. | B5: 207 von 796 Zielen anders bewertet als der tatsächlich gedribbelte 8-m-Punkt; B2 12, B1 40 | M2 bzw. Prüfpunkt D: Bewertung auf den ausgeführten Weg begrenzen (gleiche Rechnung wie die Simulation) |
| B-E5 | Zweiter Roter ohne Aufgabe, solange der Ball x < 25 ist (Deckung braucht einen blauen Mitspieler). | B2, B5 | Paket B (Teamverhalten) |
| B-E6 | Standardtexte „Passen oder dribbeln?“ / „welcher Freund frei steht“ in 1 gegen N falsch. | – | Mission (Texte oben); für weitere 1-gegen-N-Missionen ggf. eigene Kontexttexte in `content/texte.js` (M2) |
| B-E7 | Nach dem letzten erlaubten Dribbling in die Zone kein Abschluss. | B1 Hilfe-Weg | M1 |

## Offene Punkte für den Product Owner
1. B-E1 und B-E2 entscheiden – ohne sie trainiert B eher „kurz dribbeln“ als „Richtung und Strecke wählen“.
2. B2 zurückstellen oder bis zur Klärung als „kurze Stücke durch die Lücke“ umdeuten?
3. M2 wie im Prototyp (7 Zeilen) freigeben; Mission 1 bleibt im Prototyp unverändert (76/76 Tests grün).
