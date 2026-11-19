# Paket D – Analyse Dribbelbewertung und Dribbelhilfe (Meilenstein 3a)

Stand 19.11.2026, Basis V0.4.0 (`main` 8cfa4c7). **Nur Analyse.** Es gibt keine Änderung an `engine.js`, keine an Referenzen, keinen Merge und keine Veröffentlichung.
Den Lösungsvorschlag habe ich in einer Wegwerf-Kopie geprüft: `tests/analysis/paket-d/prototyp-d1-d2.diff` (nicht angewendet).
Alle Zahlen lassen sich mit den Skripten in `tests/analysis/paket-d/` nachrechnen (Aufrufe am Ende). Die Einzelaufstellung je Entscheidung steht in `docs/paket-d-abweichungen.md`.

## 1. Kurzfassung
- **Grundlage der Prüfung:**
  - 113 Lagen, in denen „Dribbeln“ angeboten wird: Mission 1 (57), Mission A (50) und die Entwurfslagen B1–B5 sowie A4.
  - Je Lage 112–192 Dribbelziele: Richtungen alle 15°, Strecken 2–12 m. Zusammen 14 406 Ziele.
  - Jedes Ziel habe ich vollständig simuliert.
- **Heute ist die Bewertung nie zu großzügig, aber oft falsch streng und falsch erklärt:**
  - 0 Ziele bekommen ⭐ und verlieren dann den Ball.
  - 4 124 Ziele bekommen 💭, obwohl der Ball behalten wird.
  - Der Satz „Du bist direkt auf einen Gegner zugelaufen“ fällt 8 546-mal. Nur in 4 426 Fällen (52 %) stimmt er.
- **Ursache:** Bewertung und Simulation rechnen mit verschiedenen Gegnern.
  - Die Bewertung behandelt jeden Roten vor dem Ball als schnellen Abfänger über den ganzen angetippten Weg.
  - In der Simulation läuft nur der nächste Rote mit und bleibt 1,4 m vor dem Ball stehen. Er greift nie selbst an.
  - Der Ball geht nur verloren, wenn Blau in einen Roten hineinläuft. Das ist die Einsteigerstufe, `pressStop`.
- **Vorschlag D1:**
  - Die Bewertung rechnet das Dribbling deterministisch voraus, genau wie die Simulation, und zwar mit dem tatsächlich ausgeführten Weg (höchstens 8 m).
  - Gut ist ein Dribbling nur, wenn es **sicher** ist (auch bei ±0,5 m daneben getippt) und **sinnvoll**.
  - Sinnvoll heißt: Raumgewinn Richtung Tor, oder Ball sichern, wenn weder nach vorn Platz noch ein Freund frei ist.
  - Die Erklärung nennt den wirklichen Grund.
- **Vorschlag D2:** Die Hilfe wählt unter den guten Dribblings das mit dem meisten Raumgewinn Richtung Tor und Schusszone. Ein Abdriften zur Seitenlinie gibt es nicht mehr.
- **Wirkung auf die veröffentlichten Missionen:** In beiden **ändert sich der Spielverlauf nicht**. Es ändern sich nur Bewertung und gesprochene Rückmeldung bei Dribblings:
  - Mission 1: 25 Entscheidungen. Davon 7 von ⭐ auf 💭 (Rückzug-Dribblings ohne Raumgewinn) und 3 von 💭 auf ⭐. Der Hilfe-Durchlauf bleibt unverändert.
  - Oberfläche von Mission 1: In einem der drei Prüfabläufe (Rückzug-Dribblings) zeigt der Endbildschirm 2 statt 5 von 6 Sternen.
  - Mission A: 12 Entscheidungen in Kinder-Abfolgen, je 3 in beide Richtungen. Hilfe-Wege, feste Spielweisen und die Oberflächen-Mitschrift bleiben unverändert.
- **Wichtige Folgerung für „Pass oder Dribbling?“:**
  - Ein naher Gegner allein macht das Dribbling in der Simulation nicht gefährlich.
  - Eine Bewertung, die zur Simulation passt, kann „Druck → Pass“ deshalb nur verlangen, wenn der Weg nach vorn wirklich versperrt ist.
  - Entscheidung dazu: Abschnitt 7, Punkt E7.

## 2. Ist-Analyse (heutige Engine)
| Quelle | Ziele | Ball behalten | ⭐ trotz Ballverlust | 💭 obwohl behalten | Ziel ⭐ |
|---|---|---|---|---|---|
| Mission 1 | 7 145 | 4 817 | 0 | 2 079 | 2 738 |
| Mission A | 6 122 | 4 140 | 0 | 1 719 | 2 421 |
| B1 / B3 / B4 / B2 / B5 | 952 | 870 | 0 | 235 | 635 |
| A4 | 187 | 153 | 0 | 87 | 66 |

**Die einzelnen Befunde:**
1. **Modell ≠ Simulation:**
   - Ziele, deren Weg nur 1–1,5 m an einem Roten vorbeiführt, verlieren in der Simulation in 3 % der Fälle den Ball. Bewertet werden 80 % davon mit 💭.
   - Ziele mit einem Weg unter 1 m an einem Roten verlieren den Ball in 89 % der Fälle.
2. **„Kurz ist gut“:**
   - Der Anteil der Ziele mit ⭐ fällt mit der Strecke: 2 m 53 %, 4 m 46 %, 6 m 40 %, 8 m 33 %, 10 m 27 %, 12 m 23 %.
   - Den Ball behalten dagegen 74 % bis 60 %.
3. **Angetippt statt ausgeführt:** Von 2 833 Tipps über 8 m wären 86 als ausgeführter 8-m-Weg ⭐, sie werden aber mit 💭 bewertet.
4. **Falsche Erklärung:** In 3 575 der 8 546 Fälle nennt der Text „direkt auf einen Gegner“ einen Grund, den es nicht gibt.
5. **Rückwärts mit Stern:**
   - 4 458 Ziele bekommen ⭐ „in den freien Raum“, obwohl sie keinen Meter Richtung Tor gewinnen, meist zum eigenen Tor hin.
   - Das gilt auch, wenn vorn Platz war oder ein Freund frei stand. In Mission 1 betrifft das z. B. den festen Ablauf „dribbling“ (10|13 → 6|13 → 3|16).
6. **Hilfe driftet zur Seitenlinie:**

   | Lage | Hilfe-Weg | Ergebnis |
   |---|---|---|
   | B1 | 5 Dribblings über (20,4\|23,3) | Tor nach 6 Entscheidungen |
   | B4 | 4 Dribblings bei y = 5,4 | Tor nach 5 Entscheidungen |
   | B2 | entlang y = 0,7 | kein Tor |
   | B5 | entlang y = 23,3 | kein Tor |

   Ursache: fester 5-m-Schritt, die Bewertung kennt die Schusszone nicht, und der Vorwärtsdrang ist nur ein kleiner Zuschlag.
7. **Geringfügig daneben getippt:** 90 % der Ziele bekommen dieselbe Bewertung wie ihre 4 Nachbarpunkte (±0,5 m). Von den ⭐-Zielen haben 97 % mindestens 3 von 4 ⭐-Nachbarn.

## 3. Vorschlag D1 – Dribbelbewertung passt zur Simulation
Die drei Teile bleiben getrennt.

**Ausführung (Ziel), in dieser Reihenfolge:**

| Fall | Bewertung | Gesprochen (Vorschlag) |
|---|---|---|
| sicher und Raumgewinn ≥ 1 m Richtung Tor | ⭐ | „Du bist in den freien Raum gedribbelt.“ |
| sicher, nach vorn kein Platz und kein Freund frei | ⭐ | „Nach vorn war kein Platz – du hast den Ball gesichert.“ |
| sicher, aber vorn war Platz | 💭 | „Aber nach vorn war Platz – dribbel Richtung Tor.“ |
| sicher, aber ein Freund stand frei | 💭 | „Aber ein Freund stand frei – ein Pass hätte euch weitergebracht.“ |
| Ball behalten, aber bei ±0,5 m daneben ginge er verloren | 💭 | „Das war knapp: Rot 1 war ganz nah. Mit mehr Abstand ist es sicherer.“ |
| Ballverlust, Weg führt bis auf < 1 m an einen Roten | 💭 | „Du bist direkt auf einen Gegner zugelaufen.“ (stimmt jetzt immer) |
| Ballverlust, ein Roter kommt in den Weg | 💭 | „Rot 2 konnte dir den Ball abnehmen.“ |

Begriffe:
- **sicher:** Der ausgeführte Weg (gekappt auf 8 m) behält in der Vorausrechnung den Ball, und mindestens 3 von 4 Nachbarzielen (±0,5 m) tun das auch. Das ist dieselbe Toleranz wie bei der Freilauf-Hilfe K1. Ein „zentimetergenaues“ Glücksziel gilt so nicht als sicher.
- **Raumgewinn:** Gemessen am Ende der Szene. Er hängt also an dem, was das Kind im Bild sieht.

**Entscheidung (Erkennen):** „Dribbeln war sinnvoll“, wenn es mindestens ein gutes Dribbling gibt, d. h. sicher mit Raumgewinn. Gibt es keins, gilt das auch, wenn sicher und kein Freund frei ist.
- Wie heute können dann mehrere Entscheidungen gut sein, z. B. Pass **und** Dribbling.
- Gesucht wird unter 39 Zielen nach vorn (−90…90°, 3/5/8 m) und 6 Zielen nach hinten (4 m).

**Grundsatz Entscheidung ≠ Ergebnis bleibt erhalten:**
- Ein behaltener Ball ohne Raumgewinn ist kein ⭐, und ein knapp behaltener auch nicht. Erfolgreich heißt also nicht automatisch gut.
- Umgekehrt: Ob ein Weg sicher ist, hängt nicht vom Zufall eines einzelnen Ergebnisses ab, sondern vom Ziel und seinen Nachbarpunkten.

### Wirkung über das Raster (gleiche 14 406 Ziele)
| | heute | Vorschlag |
|---|---|---|
| ⭐ trotz Ballverlust | 0 | 0 |
| „direkt auf einen Gegner“ zutreffend | 4 426 von 8 546 (52 %) | **4 254 von 4 254 (100 %)** |
| ⭐ nach Strecke 2 / 4 / 6 / 8 / 12 m | 53 / 46 / 40 / 33 / 23 % | 16 / 30 / 29 / 28 / 25 % (kein „kurz ist gut“ mehr; kurze Stücke gewinnen oft < 1 m) |
| Vorwärts-Dribblings (≥ 1 m Raumgewinn, behalten) mit ⭐: Mission 1 / A / Entwürfe | 690 von 1 841 / 464 von 1 509 / 248 von 424 | 1 752 / 1 390 / **424 von 424** |
| Dribblings in die Schusszone mit ⭐: Mission 1 / A / A4 | 157 von 259 / 192 von 335 / 11 von 35 | 250 / 331 / **35 von 35** |
| ⭐ ohne Raumgewinn | 4 458 | nur noch „Ball sichern“ ohne Alternative |
| Nachbarn (±0,5 m) gleich bewertet | 90 % | 87 % (Grenzen jetzt am 1-m-Raumgewinn) |
| ⭐-Ziele mit ≥ 3 von 4 ⭐-Nachbarn | 97 % | 95 % |

Mehrere sinnvolle Wege: In B1–B5 bekommen alle Vorwärts-Dribblings ohne Gegner im Weg ⭐. Das sind 5 von 8 Richtungen und jede Strecke von 2 bis 12 m.
- „Durch die Lücke“ **und** „außen herum“ (B2) sind beide gut. **D3 ist damit nicht mehr nötig.**
- Nicht pauschal: Wege rückwärts, quer ohne Grund oder in einen Gegner bleiben 💭. In den Startlagen sind 33–43 % der Ziele ⭐ (heute 54–87 %).

## 4. Vorschlag D2 – Dribbelhilfe Richtung Tor
- **Kandidaten:** nur Ziele, die D1 als gut bewertet. Die Hilfe kann also keinen Stern „herbeiführen“.
- **Rangfolge:**
  1. Raumgewinn;
  2. Ende in der Schusszone mit freiem Tor (+6);
  3. Abstand zum Gegner am Ende;
  4. Zahl sicherer Nachbarpunkte;
  5. leichte Vorliebe für die Feldmitte (gegen das Abdriften).
- **Hilfe-Weg in den Entwurfslagen:**

  | Lage | heute | Vorschlag |
  |---|---|---|
  | B1 | 6 Entscheidungen, Seitenlinie, Tor | 3 Entscheidungen, Tor |
  | B3 | 4, Tor | 3, Tor |
  | B4 | 5, Seitenlinie, Tor | 3, Tor |
  | B2 | 6, Seitenlinie, **kein Tor** | 4, durch die Lücke, Tor |
  | B5 | 6, Seitenlinie, **kein Tor** | 4, Tor |

- **A4 mit dem Lernweg von Mission A** (Dribbeln ⭐ → Schuss ⭐ → Tor):
  - Startlage: heute wie Vorschlag.
  - Bei ±0,5 m je Spieler: heute 10 von 16, **Vorschlag 16 von 16**.

## 5. Abweichungsbericht der veröffentlichten Missionen (Prototyp D1 + D2)
### Mission 1 (gegen Referenz v0.3.1)
- **Spielverlauf geändert: nirgends.** Hilfe-Durchlauf unverändert.
- **Geändert:** 25 Entscheidungen, alle beim Dribbeln: 18 der 200 Kinder-Abfolgen und 4 Schritte des festen Ablaufs „dribbling“.

| Gruppe | Anzahl | vorher → nachher |
|---|---|---|
| Rückzug ohne Raumgewinn, vorn war Platz | 7 | ⭐ „in den freien Raum“ → 💭 „Ball behalten, aber nach vorn war Platz“ (davon 3 im festen Ablauf „dribbling“) |
| zu streng bewertet | 3 | 💭 „direkt auf einen Gegner“ → ⭐ „in den freien Raum“ |
| falsche Erklärung ersetzt (Stern bleibt 💭) | 6 | „direkt auf einen Gegner“ → „nach vorn war Platz“ (4), „knapp: Rot 3 war ganz nah“ (1), „Rot 2 konnte dir den Ball abnehmen“ (1) |
| Erkennen jetzt gut, weil ein sicherer Vorwärtsweg existierte | 2 | 💭 „Ein Freund stand frei – Pass besser“ → „Gute Idee, zu dribbeln“ + Ziel 💭 „nach vorn war Platz“ |
| nur Erkennen-Text geändert (Ballverlust bleibt 💭 „direkt auf einen Gegner“) | 6 | „Den Ball zu behalten war gut. Du hättest ihn auch in den freien Raum spielen können …“ → „Du hast den freien Platz gesehen.“ |
| nur interner Ziel-Text, gesprochen unverändert | 1 | Abfolge 148 |

- **Sterne gesamt:** 4 weniger (7 weg, 3 neu).
- **Oberflächen-Mitschrift:** 10 Einträge weichen ab, alle im Ablauf „Keiner ist frei, Ball im Aus, Verteidigung“. Die anderen beiden Abläufe sind identisch.
  - Abweichend sind die 4 Dribbel-Rückmeldungen, je mit Anzeige (Einträge 4/5, 8/9, 12/13, 16/17), und der Endbildschirm (24/25). Dieser Ablauf ist derselbe Rückzug wie der feste Ablauf „dribbling“.
  - Eintrag 4 vorher: „Gut gedribbelt – du hast den Ball behalten! Hat geklappt! Aber schau mal: Ein Freund stand frei – ein Pass wäre besser gewesen.“
  - Einträge 8, 12, 16 vorher: „Gut gedribbelt – du hast den Ball behalten! Super gemacht!“
  - Alle vier nachher: „Gut gedribbelt – du hast den Ball behalten! Gute Idee, zu dribbeln! Aber schau mal: Du hast den Ball behalten, aber nach vorn war Platz.“
  - Endbildschirm: „Super gespielt! … Du hast **5** von 6 Sternen.“ → „Gut gemacht! … Du hast **2** von 6 Sternen.“
  - Der Satz zeigt die doppelte Wortwahl aus Risiko 2. In der Umsetzung wird er gekürzt.

### Mission A (gegen Referenz v0.4.0)
- **Spielverlauf geändert: nirgends.** Hilfe-Wege, die 5 festen Spielweisen und die Oberflächen-Mitschrift (49 Einträge) sind unverändert. Mission A startet in der Schusszone, dort gibt es kein Dribbeln.
- **Geändert:** 12 Entscheidungen in 12 der 200 Kinder-Abfolgen. Davon:
  - 3 von ⭐ auf 💭 (Rückzug, vorn war Platz);
  - 3 von 💭 auf ⭐ (falsch als „direkt auf einen Gegner“ bewertet);
  - 6 nur mit neuer Erklärung.

Einzelaufstellung aller 37 Entscheidungen: `docs/paket-d-abweichungen.md`.

### Restliche Tests im Prototyp
Alle Eigenschaftstests bleiben grün:
- jede Szene endet;
- Stern = Bewertung vor der Aktion;
- Hilfe nur mit gut bewerteten Aktionen;
- Missionsunabhängigkeit;
- Robustheit von A3;
- gestreute Reihen.

Rot sind nur die drei Referenztests: Mission 1 „dribbling“, Mission 1 Kinder-Abfolgen und Mission A Kinder-Abfolgen.

## 6. Risiken und offene Punkte
1. **Rechenzeit:**
   - Die Vorausrechnung kostet im Prototyp 80–100 ms je neuer Lage, gemessen am Desktop beim ersten Bewerten bzw. bei der ersten Hilfe. Jede Bewertung kostet etwa 10 ms.
   - `npm test` dauert 3:38 statt 1:29 min.
   - Auf dem iPad ist das spürbar. In der Umsetzung gehört deshalb eine Optimierung dazu: weniger Kandidaten, Abbruch beim ersten guten Vorwärtsweg und Zwischenspeicher je Lage.
   - Abnahmekriterium: Mit 4-fach gedrosselter CPU startet die Entscheidung in ≤ 150 ms.
2. **Doppelte Wortwahl:** „Gut gedribbelt – du hast den Ball behalten! … Du hast den Ball behalten, aber …“. Die Ziel-Texte werden in der Umsetzung verkürzt (Abschnitt 3).
3. **Grenze bei 1 m Raumgewinn:**
   - Die Nachbar-Übereinstimmung sinkt leicht (90 → 87 %). Das betrifft Tipps fast quer zur Spielrichtung.
   - Möglich wäre eine weichere Grenze, z. B. 0,5 m. Mein Vorschlag ist 1 m.
4. **Die Simulation ist nachsichtig:**
   - Der mitlaufende Rote greift nie an. „Ganz nah vorbei“ ist deshalb fast immer sicher.
   - D1 übernimmt das ehrlich und warnt nur über die ±0,5-m-Regel („knapp“).
   - Soll Abstand halten wirklich Folgen haben, braucht es eine kleine Zweikampfregel, z. B. „bleibt Blau 0,45 s näher als 1,2 m, nimmt Rot den Ball“. Das wäre spiegelbildlich zu Blau „Ball erobern“. Es ist ein Teil von B5 und würde den Spielverlauf von Mission 1 ändern. Für „Freie Bahn!“ ist es **nicht** nötig.
5. **Folgelage nicht bewertet:** Ein Dribbling, das direkt vor einem Gegner endet und Raum gewinnt, ist ⭐. Ob die nächste Lage gut ist, bewertet D1 nicht. Das ist bewusst so gehalten, um die Regel klein zu halten.

## 7. Zur Entscheidung (je Gruppe einzeln freigebbar)
| | Gruppe | Empfehlung |
|---|---|---|
| E1 | Sicherheit über die Vorausrechnung mit ±0,5-m-Toleranz | freigeben |
| E2 | Bewertet wird der ausgeführte Weg (8 m) statt des angetippten | freigeben |
| E3 | Raumgewinn-Regel: ⭐ nur mit Raumgewinn ≥ 1 m oder Ball sichern ohne Alternative (betrifft 7 Sterne in Mission 1, 3 in A) | freigeben |
| E4 | Neue Erklärungen (Abschnitt 3, gekürzte Fassung) | freigeben |
| E5 | Erkennen: Dribbeln ist sinnvoll, sobald ein guter Vorwärtsweg existiert, auch wenn ein Freund frei ist (mehrere gute Entscheidungen) | freigeben |
| E6 | Hilfe D2 | freigeben |
| E7 | Für „Pass oder Dribbling?“: (a) Situationen mit wirklich versperrtem Weg nach vorn, ohne Engine-Änderung, **oder** (b) vorher eine kleine Zweikampfregel (B5-mini) mit eigener Analyse und eigenem Abweichungsbericht | jetzt (a) für die Planung; (b) erst nach dem Kindertest mit „Freie Bahn!“ entscheiden |

Nach Freigabe folgt Meilenstein 3b:
- Umsetzung mit Optimierung der Rechenzeit;
- Abweichungsliste mit `tests/golden/diff.js --json tests/golden/abweichungen-paket-d.json`;
- neue Eigenschaftstests:
  - ⭐ verliert nie den Ball;
  - „direkt auf einen Gegner“ nur bei Ballverlust mit Weg < 1 m;
  - die Hilfe erreicht in jeder Lage mit freiem Vorwärtsweg die Zone;
  - die Nachbar-Regel gilt.
- Danach Referenzen neu, aber erst nach Freigabe, und Archivierung in `tests/golden/historie/`.

## Nachrechnen
```
node tests/analysis/paket-d/ist-analyse.js                       # Ist-Zustand gegen Simulation
node tests/analysis/paket-d/vergleich.js --dump /tmp/paketd-lagen.json
node tests/analysis/paket-d/vergleich.js --run /tmp/paketd-lagen.json --out /tmp/paketd-alt.json
git worktree add --detach /tmp/dproto HEAD && (cd /tmp/dproto && git apply <repo>/tests/analysis/paket-d/prototyp-d1-d2.diff)
FIQ_ROOT=/tmp/dproto node tests/analysis/paket-d/vergleich.js --run /tmp/paketd-lagen.json --out /tmp/paketd-neu.json
node tests/analysis/paket-d/auswertung.js                        # Vergleich heute / Vorschlag
[FIQ_ROOT=/tmp/dproto] node tests/analysis/paket-d/hilfeweg.js   # Hilfe-Wege B1–B5, A4
[FIQ_ROOT=/tmp/dproto] node tests/analysis/paket-d/stabilitaet.js /tmp/paketd-lagen.json
(cd /tmp/dproto && node tests/golden/diff.js --md /tmp/abw)      # Mission 1
node tests/analysis/paket-d/abweichung-ma.js --dump /tmp/ma-alt.json; FIQ_ROOT=/tmp/dproto node … --dump /tmp/ma-neu.json; node … --diff /tmp/ma-alt.json /tmp/ma-neu.json
```
