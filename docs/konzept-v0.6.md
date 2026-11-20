# Konzept V0.6: Vom funktionierenden Lernspiel zum überzeugenden Spielerlebnis

Stand 20.11.2026, Basis Release-Kandidat V0.5.1 (`4021969`). Branch `konzept-v0.6`, nur Dokumentation und Analyse-Skripte.
**Keine Implementierung, kein Merge, keine Veröffentlichung, keine Änderung an Referenzen.**

**Kennzeichnung:**
- ✅ funktioniert heute so (gemessen oder im Code belegt)
- 🔶 Konzeptannahme, erst ein Spieltest belegt sie
- 🔧 braucht eine neue Funktion in Engine oder App

**Messgrundlage** (reproduzierbar, Engine unverändert):
- `tests/analysis/v0.6/entscheidungen.js`
  - Spielt jede Mission in jedem Durchlauf mit der Hilfe durch.
  - An **jeder** Entscheidung werden 24 bis 86 mögliche Antworten eines Kindes bewertet **und** ausgespielt: alle Aktionen, Tore, Pass- und Laufziele, Dribbelrichtungen in 15°-Schritten über 3, 5 und 8 m.
  - Einordnung: **Routine** = fast alles ist gut (≥ 60 % der Antworten bekommen einen Stern; bei nur einer Aktion ≥ 45 %). **Musterlösung** = nur eine schmale Lösung (< 8 %). Dazwischen: **echte Entscheidung**.
- `tests/analysis/v0.6/beispiele.js`: Die drei Beispielsituationen aus Abschnitt 7, als Test-Missionen nur im Skript registriert und mit allen typischen Kinder-Wegen durchgespielt.

---

## Die wichtigsten Erkenntnisse in fünf Sätzen
1. **„Freie Bahn!“ besteht zu 83 % aus Routine** (45 von 54 Entscheidungen).
   - Nach der ersten Entscheidung steht in B4, B2 und B6 kein Roter mehr vor dem Ball. Die folgenden Dribblings sind reines Laufen.
   - Die Lückenentscheidung (B6) lässt sich durch kurze Schritte umgehen.
2. **Die zentralen Lernziele fehlen im ersten Durchlauf.**
   - „Welches Tor ist frei?“ zeigt „beide Tore zu, dann passen“ und „noch zu weit, dann näher ran“ erst ab Durchlauf 2.
   - „Freie Bahn!“ zeigt die zu enge Lücke erst ab Durchlauf 2.
3. **In Mission 1 hat das Freilaufen keine Folge.**
   - Alle 48 Laufwege, ob gut oder schlecht, enden identisch: Blau 2 dribbelt selbst in die Schusszone.
   - Die Rückmeldung zur ⭐-Entscheidung lautet trotzdem „… Manchmal klappt es nicht.“
   - Der Start ist in jedem Durchlauf gleich.
4. **Die Rückmeldungen sagen, *was* passiert ist, fast nie *warum*.**
   - Auf dem Hilfeweg hört ein Kind in „Freie Bahn!“ nur zwei verschiedene Sätze.
   - Die Gründe stehen in der Engine bereits zur Verfügung (Raumgewinn, Anschluss, Lücke, Torwächter), werden aber nicht ausgesprochen.
5. **Die Engine kann schon mehr, als die Missionen nutzen.**
   - Zwei der drei Beispielsituationen funktionieren ohne neue Engine-Logik, nur mit anderen Daten.
   - Der wirksamste Eingriff für „weniger Routine“ ist **klein**: eine automatische Anschlussbewegung. Sie hätte in „Freie Bahn!“ genau die 24 Routine-Entscheidungen entfernt und keine einzige echte.

---

## 1. Kritische Bestandsaufnahme

### 1.1 Messwerte je Mission
| Mission | Entscheidungen (alle Durchläufe, mit Hilfe) | Routine | echt | Musterlösung | verschiedene Rückmeldesätze auf dem Hilfeweg |
|---|---|---|---|---|---|
| Welches Tor ist frei? | 21 | 0 | 18 | 3 | 3 |
| Freie Bahn! | 54 | **45** | 9 | 0 | **2** |
| Zusammen sind wir stark! | 5 | 0 | 5 | 0 | 5 |

### 1.2 „Welches Tor ist frei?“
- ✅ **Lernwert vorhanden:** Jede Abschlussentscheidung ist echt. Nur 8 bis 21 % der Antworten sind gut (freies Tor oder freier Freund).
- ✅ **Rückmeldung bei Fehlern gut:** zum Beispiel „Geblockt! Rot 2 stand vor dem Tor. … Das andere Tor war frei.“
- **Lernziele im ersten Durchlauf unvollständig:** Durchlauf 1 ist A1 · A2 · A5 (ein Tor zu, ein Tor zu, beide frei). „Beide zu, dann zum Freund“ (A3) und „zu weit, dann näher ran“ (A4) kommen erst ab Durchlauf 2. Wer einmal spielt, lernt nur die Hälfte.
- **Muster statt Wahrnehmung:**
  - Der Rote vor dem Tor steht in jeder Situation schon vorher sichtbar still.
  - Die Aufgabe reduziert sich auf „tippe das Tor ohne roten Punkt“. Für Fünfjährige ist das richtig, für Neunjährige nach zwei Situationen gelöst.
  - Es gibt keine Situation, in der sich die Lage *während* der eigenen Aktion ändert.
- **Rückmeldung bei Erfolg allgemein:** Auf dem Hilfeweg kommt immer „Toooor! Der Weg war frei. Super gemacht!“. Sie nennt weder das Tor noch den Roten, der das andere zugestellt hat.

### 1.3 „Freie Bahn!“
- **Routine:**
  - In jeder Dribbel-Entscheidung bekommen 38 bis 49 % aller Richtungen einen Stern, quer über den ganzen vorderen Halbkreis (−60° bis +90°).
  - Der Schuss ist in 4 von 5 Situationen zu 100 % gut, weil beide Tore frei sind.
- **Anschlussdribblings ohne Gegner:**
  - B4, B2, B6: Die erste Hilfe-Entscheidung überspielt die Roten, Rote vor dem Ball von 1 bzw. 2 auf 0.
  - Danach folgen ein bis zwei Dribblings ohne jeden Roten vor dem Ball.
  - B3 (Roter hinter dem Ball) besteht nur aus Routine.
- **Lücke umgehbar:** In B6 sind 15 der 24 ⭐-Antworten der ersten Entscheidung kurze Dribblings, die niemanden überspielen. Das Kind muss sich nicht zwischen Lücke und außen entscheiden.
- **Gegner ohne Spannung:**
  - ✅ (Code) Der nächste Rote läuft auf 1,4 m heran und bleibt stehen. Er greift nie an.
  - Ein Ballverlust entsteht nur, wenn das Kind näher als 0,95 m an ihn heran dribbelt.
  - „Vorbei sein“ erlebt man deshalb nicht: Es gibt kein Ereignis, keinen Ton, keinen Satz. Der Rote läuft danach sichtbar hinterher.
- **Rückmeldung:** In fast jeder Dribbel-Entscheidung kommt „Gut gedribbelt – du hast den Ball behalten! Super gemacht!“. Der Grund (zum Beispiel Kennzeichen „Weg frei“) steht nur als Textchip im Blatt, für Fünfjährige unlesbar.

### 1.4 „Zusammen sind wir stark!“ (Mission 1)
- ✅ **Echte Entscheidungen:** fünf Stück mit 30 / 15 / 8 / 48 / 48 % guten Antworten. Die Verteidigungsrückmeldungen sind konkret: „Du hast Druck gemacht! …“, „Ball erobert! …“.
- **Freilaufen ohne Folge:**
  - Alle 48 geprüften Laufwege, 7 gute und 41 schwache, enden mit derselben Folge: Blau 2 dribbelt selbst von (24|6) nach (31|2).
  - Die Entscheidung ändert am Spiel nichts.
  - Zur ⭐-Entscheidung hört das Kind: „Jetzt steht Rot 2 im Passweg. Dein Freund dribbelt dafür nach vorne. Das war trotzdem eine gute Idee! Manchmal klappt es nicht.“
  - Das ist doppelt problematisch: Das Lob widerspricht dem Ergebnis, und „manchmal“ ist in einer deterministischen Simulation falsch.
- **Muster:** Der Start ist in jedem Durchlauf identisch; „Nochmal“ spielt dieselbe Lage. Die Lösung „Pass zu Blau 2“ wird nach dem zweiten Mal auswendig gespielt.

### 1.5 Querschnitt: Sterne, Hilfe, Inszenierung
- ✅ **Entscheidung und Ergebnis werden getrennt erklärt**, wo sie auseinanderfallen. Beispiel: Ein knapper Pass kommt an, die App sagt „Der Pass ist angekommen! … Aber schau mal: Rot 3 stand nah am Weg zu Blau 3.“ Der Mechanismus ist richtig und muss bleiben.
- **Ein Stern heißt heute immer auch Erfolg:**
  - In Mission A und „Freie Bahn!“ gibt es keine ⭐-Antwort, die misslingt. Die Bewertung verlangt robuste Wege, und die Simulation ist deterministisch.
  - Das Kind lernt also nie „gute Idee, aber diesmal hat der Gegner reagiert“. Das ist für Fünfjährige in Ordnung. Für Ältere fehlt eine Ebene, siehe Abschnitt 8, Zweikampf.
- **Sterne für Routine und mit Hilfe:**
  - Sterne gibt es je Entscheidung, in „Freie Bahn!“ also 10 bis 12, überwiegend für Routine.
  - Mit 💡 gibt es den vollen Stern: `usedHint` wird erfasst, aber nicht verwendet.
  - Sterne lassen sich so „abholen“, ohne die Situation verstanden zu haben.
- **Inszenierung:**
  - Spieler mit Radius 0,85 m auf einem Feld von 36 × 24 m; im 1 gegen 1 wirkt das Feld leer.
  - Die Spieler bewegen sich ohne Laufanimation.
  - Das Rückmeldeblatt ist textlastig.
  - Fortschritt und Endstand werden je Entscheidung gezählt.
  - Die Sprachausgabe ist synthetisch. Seit V0.5.1 ist sie zuverlässig, sie wiederholt aber viel.

### 1.6 Fünfjähriger Anfänger und neunjähriges Kind mit Fußballerfahrung
| | 5 bis 6 Jahre | 7 bis 10 Jahre |
|---|---|---|
| Versteht die Aufgabe ohne Hilfe? | Mission A: ja (Hinweis „wo kein Roter steht“). Freie Bahn: ja, aber „irgendwo nach vorn“ reicht. Mission 1: Freilaufen und Raum kaum. | ja, in allen Missionen nach einer Situation |
| Gefordert? | ja, durch Bedienung und Wahrnehmung | **nein**: Mission A nach zwei Situationen gelöst, Freie Bahn zu 83 % Routine, Mission 1 auswendig spielbar |
| Erkennt, *warum* richtig oder falsch? | nur bei Fehlern (gute 💭-Texte) | ebenso; bei Erfolg fehlt die Begründung |
| Was motiviert? | Tor, Ton, Konfetti | Herausforderung, Abwechslung, „ich habe ihn ausgespielt“. Fehlt heute weitgehend. |

Daraus folgt: **Eine Situation braucht eine leichte und eine schwerere Lesart derselben Fähigkeit**, keine zwei getrennten Modi (Abschnitt 6).

---

## 2. Lernmissionen: klarer Lernaufbau
Grundsatz: **verstehen, anwenden, variieren, wiedererkennen.** Jeder Schritt muss im **ersten vollständigen Durchlauf** vorkommen. Die Wiederholungen bringen Spiegelungen und schwerere Lesarten, keine neuen Lernziele.

### 2.1 „Welches Tor ist frei?“
| Schritt | Fähigkeit | Situation | Status |
|---|---|---|---|
| Verstehen | freies Tor erkennen | A1 (oben zu) | ✅ vorhanden |
| Anwenden | zwischen zwei Toren entscheiden, gespiegelt | A2 (unten zu) | ✅ vorhanden |
| Variieren | beide Tore zu, dann zum freien Freund | A3 | ✅ vorhanden, bisher erst in Durchlauf 2 |
| Wiedererkennen | noch zu weit, dann näher ran **und dort neu schauen** | **W1 „Schau nochmal!“** (Abschnitt 7.1) | ✅ mit heutiger Engine möglich, nur neue Daten |

**Vorschlag Durchlauf 1:**
- Einstieg mit A1 · A3 · W1, gut zwei Minuten.
- Ab Durchlauf 2 Spiegelungen: A2 · W1-gespiegelt · A3-gespiegelt. 🔶 Gespiegelte Lagen sind reine Daten, ihre Bewertung muss aber wie bei A3 auf Robustheit geprüft werden.
- A5 (beide frei) bleibt als Entlastung in späteren Durchläufen.

### 2.2 „Freie Bahn!“
| Schritt | Fähigkeit | Situation | Status |
|---|---|---|---|
| Verstehen | freien Raum vor sich erkennen (Gegner hinter mir) | B3 mit Torwächter | 🔶 nur Daten, noch nicht durchgespielt; der Abschluss wird erst mit Torwächter echt |
| Anwenden | an einem Gegner vorbei | V1 (Abschnitt 7.2, Variante) | ✅ Daten |
| Variieren | Lücke zu eng, dann außen **mit Abstand** | L3-eng (Abschnitt 7.2) | ✅ Daten, nicht umgehbar |
| Wiedererkennen | gleiche Entfernung, Lücke breit, dann durch | L3-breit | ✅ Daten |
| (später) Ball sichern | kein Weg nach vorn, dann seitlich oder zurück sichern | B-Sichern | ✅ Bewertung vorhanden (Grund „sichern“), Situation neu |

**Vorschlag Durchlauf 1:** B3 · L3-eng · L3-breit. Das enge und das breite Lückenpaar direkt hintereinander ist der eigentliche Lernmoment: gleiches Bild, andere Antwort.

---

## 3. Weniger Routine, mehr echte Entscheidungen: die Anschlussbewegung 🔧
**Idee:** Das Kind entscheidet nur, wenn es etwas zu entscheiden gibt. Dazwischen spielt das Spiel weiter, sichtbar und nachvollziehbar.

**Regeln:**
1. Jede Situation beginnt mit einer Entscheidung des Kindes. Sie wird nie übersprungen, auch nicht in B3, wo „nach vorn“ der Lernmoment ist.
2. Nach einem Dribbling läuft der Ballführende **automatisch weiter Richtung Schusszone**, solange:
   - kein Roter im Kegel ±45° vor ihm näher als 6 m steht,
   - die Schusszone nicht erreicht ist,
   - in Spielmissionen kein Mitspieler neu anspielbar geworden ist.
3. Eine neue Entscheidung entsteht, sobald eine dieser Bedingungen eintritt. Das ist die „relevante Veränderung“.
4. Die Anschlussbewegung wird **nicht bewertet**. Sie gehört sichtbar zur Folge der vorherigen Entscheidung, angesagt in zwei Wörtern („Freie Bahn!“).
5. Kein künstlicher Erfolg: Steht nach einem schwachen Dribbling ein Gegner nah, gibt es keine Automatik, das Kind muss neu entscheiden.

**Gemessene Wirkung** (heutige Durchläufe, Regel nachgerechnet):
- In „Freie Bahn!“ wären von 54 Entscheidungen **24 automatisch** abgelaufen. Das sind 6 statt 10 bis 12 Entscheidungen je Durchlauf.
- Alle 24 waren vorher als Routine eingestuft. **Keine echte Entscheidung geht verloren.**
- Übrig bleibt Routine nur beim Schuss auf zwei freie Tore. Dafür stellen die Daten einen Torwächter auf.

**Technik:**
- Neue, deterministische Engine-Funktion. Es gibt bereits die Mitspieler-Automatik `autoDribble`, die wiederverwendet werden kann.
- App: Ablauf ohne Rückmeldeblatt dazwischen.
- Bewertung unverändert.

**Nicht gemeint:** Laufwege, Pässe oder Schüsse automatisch ausführen, oder einen „richtigen“ Weg vorspielen.

---

## 4. Lernen durch verständliche Konsequenzen
**Aufbau jeder Rückmeldung:**
1. **Was ist passiert?** Das zeigt der Bildschirm, gesprochen in höchstens einem Satz.
2. **Warum?** Eine Ursache aus der Simulation, in einem Satz.
3. Nur bei 💭: **Was wäre besser?**

Bei einem ⭐ ohne Situationsende reicht 1 + 2 als Kurzrückmeldung (V0.6-Richtung des PO).

**Drei Ebenen, die nie vermischt werden:**
| | klappt | misslingt |
|---|---|---|
| **gute Entscheidung, gutes Ziel** ⭐ | „Super! Du bist an Rot 1 vorbei. Jetzt ist der Weg zum Tor frei!“ | (heute nicht möglich, siehe 1.5) „Gute Idee! Rot 1 war diesmal schneller. Nächstes Mal mit mehr Abstand.“ 🔧 erst mit Zweikampf |
| **gute Entscheidung, schwaches Ziel** | „Hat geklappt, aber Rot 3 war ganz nah am Pass. Sicherer war ein Pass in den freien Raum.“ ✅ heute schon ähnlich | „Gute Idee, zu dribbeln! Aber die Lücke war zu eng. Außen war mehr Platz!“ |
| **schwache Entscheidung** | „Der Ball ist noch bei dir, aber nach vorn war viel Platz.“ ✅ heute ähnlich | „Beide Tore waren zu. Dein Freund stand frei!“ ✅ heute ähnlich |

**Konkrete Sätze und ihre Herkunft in der Simulation:**
| Rückmeldung | Bedingung in der Simulation | Status |
|---|---|---|
| „Super! Du bist an Rot 1 vorbeigelaufen!“ | Roter stand bei der Entscheidung im Kegel vor dem Ball, nach der Aktion hinter dem Ball, Ball behalten | 🔧 kleines Engine-Ereignis „überspielt“ |
| „Der Gegner war hinter dir. Vor dir war Platz!“ | kein Roter vor dem Ball, Grund `raum` | ✅ Daten vorhanden, neuer Text |
| „Die Lücke war zu eng. Außen war mehr Platz!“ | Weg zwischen zwei Roten mit Abstand < 3 m, Ballverlust, die Hilfe findet einen robusten Weg außen | 🔧 kleine Erkennung „Lücke“; die Hilfe ist vorhanden |
| „Die Lücke war breit genug!“ | Weg zwischen zwei Roten mit Abstand ≥ 6 m, ⭐ | 🔧 dieselbe Erkennung |
| „Jetzt ist der Weg zum Tor frei!“ | Grund `anschlussTor` | ✅ vorhanden (Paket D), heute nur als Chip |
| „Rot 2 ist vor das untere Tor gelaufen. Oben war frei!“ | Torwächter bei der Entscheidung ≠ beim Schuss, Ziel geblockt | 🔧 Positionsvergleich |
| „Beide Tore waren zu. Dein Freund stand frei!“ | `besserPassStattSchuss` | ✅ vorhanden |
| Mission 1, Freilaufen: „Du bist gut gelaufen. Blau 2 hatte aber selbst Platz und ist nach vorn gedribbelt.“ | Ereignis `autoDribble` | ✅ ersetzt „Manchmal klappt es nicht“; ehrlich, solange das Freilaufen keine Folge hat (Abschnitt 8, B2) |

**Regel:** „Manchmal klappt es nicht“ entfällt überall, wo die Simulation den Grund kennt. Sie kennt ihn immer.

---

## 5. Spielerlebnis und visuelle Qualität
| Thema | Befund | Vorschlag (nur was der Übersicht dient) | Status |
|---|---|---|---|
| Kamera und Ausschnitt | ganzes Feld auch im 1 gegen 1 | Lernmissionen zeigen die angreifende Hälfte (x ≥ 12) und zoomen ruhig mit; Spielmissionen bleiben beim ganzen Feld | 🔧 App, Darstellung |
| Spieler | Radius 0,85 m, Kreis ohne Richtung | Darstellung etwa 25 % größer, Blickrichtung, Trikotnummer; die Tippflächen bleiben | 🔧 App |
| Bewegung | Gleiten ohne Animation | Lauf-Wippen, der Ball rollt sichtbar vor dem Fuß, kurzer Schweif beim Dribbling | 🔧 App |
| Gegnerreaktion | Roter gleitet hinterher | sichtbare Absicht: Pfeil oder „Achtung“-Haltung beim Herankommen; beim Überspielen kurzes Stolpern oder Umdrehen | 🔧 App (Ereignis „überspielt“) |
| Erfolgsmomente | Tor-Banner und Konfetti | „Vorbei!“-Moment (0,6 s), Tor mit kurzer Zeitlupe (0,8 s); nichts länger als 1,2 s, Antippen überspringt | 🔧 App |
| Rückmeldung | volles Blatt bei jeder Entscheidung | Kurzrückmeldung bei ⭐ (bereits PO-Richtung), volles Blatt nur bei 💭, Tor oder Situationsende; „Nochmal“ und 🔈 bleiben immer erreichbar | 🔧 App |
| Fortschritt und Abschluss | Punkte und Sterne je Entscheidung | je Situation ein Feld mit Symbol; Ende mit „2 Gegner ausgespielt, 3 Tore“ statt 12 Sternen | 🔧 App |
| Sprache | synthetisch, wiederholend | kürzere Sätze, Aufgabe nur zu Situationsbeginn ganz; später aufgenommene Stimme | ✅ V0.5.1-Grundlage; Aufnahme später |

---

## 6. Zwei Spielerfahrungen: Lernmissionen und Spielmissionen
**Bewertung:** Die Trennung ist richtig, aber zu streng gedacht. Lernmissionen dürfen nicht isolierte Drill-Übungen bleiben, sonst fehlt der Transfer.

**Vorschlag:**
- **Lernmission:**
  - drei bis vier kurze Situationen zu *einer* Fähigkeit, Aufbau wie in Abschnitt 2;
  - **danach eine „Bewährungsszene“** im 3 gegen 3, in der genau diese Fähigkeit vorkommt, aber nicht angekündigt wird. Ein Beispiel ist Abschnitt 7.3 für „vorbei“.
- **Spielmission:**
  - mehrere Startlagen je Durchlauf (✅ technisch vorhanden: Situationen und Durchläufe);
  - kein Lösungsweg erkennbar;
  - die Hilfe spielt nicht endlos Pass und Rückpass (Befund aus 7.3: Die Hilfe kann Pass, Freilaufen, Rückpass ohne Torschuss aneinanderreihen) 🔧.
- **Schwierigkeit ohne Einstellungen:** Wird die Kernentscheidung einer Situation beim ersten Versuch gelöst, wählt der nächste Durchlauf die schwerere Lesart: Spiegelung, zweiter Gegner, Torwächter verschiebt. Nichts wird gespeichert, nur die laufende Sitzung zählt. 🔧 klein

**Verworfen:**
- *Ein* freies Spiel mit eingestreuten Lektionen: zu unübersichtlich für Fünfjährige.
- Wählbare Schwierigkeitsgrade: Kinder wählen „leicht“ oder „Profi“ nicht passend, und es braucht Erklärung.

---

## 7. Drei konkrete Beispielsituationen (mit der Engine geprüft)
Alle Werte stammen aus `tests/analysis/v0.6/beispiele.js` mit unveränderter Engine.
- Blau greift nach rechts an.
- Tore liegen bei (36|6) oben und (36|18) unten.
- Die Schusszone beginnt bei x ≥ 29,7.

### 7.1 „Welches Tor ist frei?“: W1 „Schau nochmal!“
**Ausgangslage:**
- Blau 1 hat den Ball bei (26|12,5), noch außerhalb der Schusszone.
- Blau 2 steht bei (21|19).
- Rot 1 kommt von hinten links (23,5|9,5).
- **Rot 2 steht mittig vor den Toren (33,6|12,4).** Beide Tore sehen frei aus.

**Was das Kind sieht und hört:** Zwei scheinbar freie Tore und die Ansage „Noch zu weit fürs Tor! Dribbel näher ran.“

**Entscheidungen:**
1. **Dribbeln in die Zone** (⭐ 37 von 85 Antworten, 44 %) oder Pass zu Blau 2 (⭐, freier Passweg). Dribbeln direkt auf Rot 1 führt zum Ballverlust.
2. **Abschluss:** Während des Dribblings **läuft Rot 2 vor das untere Tor**. Das ist ✅ vorhandenes Verhalten „Torwächter“: Ab x ≥ 25 stellt er sich 2,4 m vor „sein“ Tor. Danach ist oben frei (0,45 bis 0,92), unten zu.

**Konsequenzen (gemessen):**
| Weg des Kindes | Ergebnis |
|---|---|
| nach unten rein, unten schießen (das Tor, das vorher frei war) | 💭 **Geblockt!** „Vor diesem Tor stand Rot 2. Das andere Tor war frei.“ |
| nach unten rein, nochmal schauen, oben schießen | ⭐ Tor |
| geradeaus rein, oben | ⭐ Tor |
| Pass zu Blau 2 | ⭐ angekommen, Spiel geht weiter |

**Neue Rückmeldung:** „Rot 2 ist vor das untere Tor gelaufen. Oben war frei!“ (🔧 Positionsvergleich)

**Lernziel:** Nach jeder Bewegung **neu schauen**. Das ist die Fußball-Wahrnehmung schlechthin (Schulterblick).

**Warum besser:** Heute ist das freie Tor vorher sichtbar und ändert sich nie. Hier muss das Kind die Lage zweimal lesen. Für Fünfjährige bleibt sie lösbar: Der Rote steht im Moment des Schusses deutlich vor einem Tor. Für Neunjährige gibt es eine Falle, die man durchschaut.

**Technik:** ✅ nur neue Daten; 🔧 Positionsvergleich für den Rückmeldesatz.

### 7.2 „Freie Bahn!“: L3 „Lücke oder außen?“ (als Paar)
**Ausgangslage, nah dran, damit die Entscheidung nicht umgehbar ist:**
- Blau 1 bei (15,5|12).
- **Eng:** Rot 1 (18,5|10,6) und Rot 2 (18,5|13,4), Lücke 2,8 m.
- **Breit:** Rot 1 (18,5|8,6) und Rot 2 (18,5|15,4), Lücke 6,8 m.
- Torwächter Rot 3 vor dem oberen Tor (34,6|7,4).

**Was das Kind sieht und hört:** Zwei Rote vor sich und „Durch die Lücke oder außen herum?“. In der Rückmeldung zeigt eine Linie zwischen den Roten die Lücke, grün oder rot (🔧 Darstellung).

**Entscheidungen (gemessen):**
| | eng | breit |
|---|---|---|
| Anteil ⭐ der ersten Entscheidung | 11 von 63 (17 %, echte Entscheidung) | 13 von 63 (21 %) |
| durch die Lücke | 💭 Ballverlust („Dribbel weiter weg von Rot 1“) | ⭐ |
| außen **mit Abstand**, zum Beispiel nach (19\|5,5) | ⭐ | 💭 Ballverlust |
| außen zu eng am Gegner (21,5\|7) | 💭 Ballverlust | 💭 Ballverlust |
| kurzer Schritt nach vorn (Entscheidung ausweichen) | 💭 Ballverlust | ⭐ (zulässig, danach Routine) |
| Abschluss | Rot 3 vor dem oberen Tor: oben zu, unten frei, echte Wahl | ebenso |

**Gegnerreaktion:** ✅ Der nähere Rote presst hinterher, der Torwächter rückt vor sein Tor.

**Anschluss:** Nach dem Ausweichen folgten heute zwei Routine-Dribblings bis zur Zone. Mit der Anschlussbewegung (Abschnitt 3) entfallen sie: **zwei Entscheidungen je Situation, beide echt.**

**Rückmeldungen:**
- „Die Lücke war zu eng. Außen war mehr Platz!“
- „Die Lücke war breit genug, mitten durch!“
- „Außen herum heißt: mit Abstand!“
- (🔧 Erkennung „Lücke“)

**Lernziel:** Lücken einschätzen, gleiches Bild mit anderer Antwort. Außen herum geht nur mit Abstand.

**Warum besser:** Heute ist B6 umgehbar (15 von 24 ⭐ ohne Überspielen), und B2 mit der breiten Lücke kommt in anderen Durchläufen. Hier stehen beide Lesarten direkt nebeneinander und lassen sich nicht umgehen.

**Variante V1** (ein Gegner, „vorbei“):
- Blau 1 (23,5|12), Rot 1 (27|12), Torwächter (34,6|16,6).
- 22 von 63 ⭐, **14 davon überspielen Rot 1**. Danach steht das Kind direkt in der Schusszone, Abschluss mit Wahl.
- Das ist die Grundsituation für „an einem Gegner vorbei“.

### 7.3 3 gegen 3: S1 „Lock ihn an, dann spiel ab!“
**Ausgangslage:**
- Blau 1 hat den Ball (17,5|12,5). Blau 2 steht vorn oben in der Schusszone (30|6), Blau 3 unten (24|19,5).
- Rot 1 steht schräg vor Blau 1 im Passweg (20,5|10,5).
- Rot 2 deckt Blau 2 locker (33|7,5), Rot 3 deckt Blau 3 (27|18).

**Was das Kind sieht und hört:** Zwei Freunde, beide ein bisschen gedeckt, und „Wem kannst du helfen? Passen oder dribbeln?“.

**Entscheidungen (gemessen):** Erste Entscheidung 30 von 86 ⭐ (35 %, echte Entscheidung), 16 der ⭐-Dribblings überspielen Rot 1.
| Weg des Kindes | Ergebnis |
|---|---|
| sofort Pass zu Blau 2 | 💭 **abgefangen** von Rot 1 |
| sofort Pass zu Blau 3 | 💭 kommt an, aber knapp, und wird als knapp erklärt (Glück, kein Können) |
| geradeaus in Rot 1 | 💭 Ballverlust |
| **an Rot 1 vorbei** nach (25,5\|13), dann Pass zu Blau 2, dann Schuss | ⭐ ⭐ ⭐ Tor (unten frei, oben zu) |
| an Rot 1 vorbei, dann selbst weiter dribbeln | ⭐ ⭐ Tor (zweiter guter Weg, keine Musterlösung) |
| an Rot 1 vorbei, dann Pass zu Blau 3 | ⭐, danach eine Pass-und-Lauf-Kette ohne Abschluss (Befund zur Hilfe, siehe Abschnitt 6) |

**Gegnerreaktion:** ✅ Rot 1 presst den Ball. Sobald Blau 1 an ihm vorbei ist, ist der Weg zu Blau 2 frei. Das ist das 2-gegen-1-Prinzip.

**Rückmeldungen:**
- nach dem Überspielen: „Super! Du bist an Rot 1 vorbei. Jetzt ist Blau 2 frei!“ (✅ Grund `anschlussPass` vorhanden, heute vom Grund „Raum“ verdeckt; 🔧 Ereignis „überspielt“)
- nach dem Pass: „Blau 2 hatte das untere Tor frei!“
- beim abgefangenen Pass: „Rot 1 stand im Passweg. Erst an ihm vorbei, dann ist der Weg frei!“

**Lernziel:** Einen Gegner binden oder überspielen, um einen Mitspieler freizuspielen. Das ist die Grundidee von Zusammenspiel, und sie verbindet beide Lernmissionen.

**Warum besser:** Mission 1 belohnt heute einen sofortigen Pass, der immer gleich ist. Hier gibt es keinen direkten guten Pass. Die gute Lösung entsteht erst durch die eigene Aktion, und es gibt zwei gute Wege.

**Technik:** ✅ nur Daten; 🔧 Rückmeldesätze; 🔧 die Hilfe soll in Spielmissionen den Abschluss suchen statt Pass-Ketten.

---

## 8. Priorisierter Umsetzungsplan
Bewertung: Lernwert und Spielwert ★ bis ★★★; Aufwand S (≤ ½ Tag) / M (1 bis 2 Tage) / L (> 2 Tage); Risiko für bestehende Missionen.

### A. Unmittelbare Verbesserungen mit hohem Mehrwert (V0.6a)
| # | Maßnahme | Lernwert | Spielwert | Aufwand | Risiko | Überprüfung |
|---|---|---|---|---|---|---|
| A1 | **Lernaufbau im ersten Durchlauf:** Mission A A1 · A3 · W1; Freie Bahn B3 · L3-eng · L3-breit; Torwächter in Freie-Bahn-Lagen; Spiegelungen ab Durchlauf 2 | ★★★ | ★★ | S–M (nur Daten) | Referenzen Mission A und Freie Bahn ändern sich (gewollt), Mission 1 nicht | `entscheidungen.js`: jedes Lernziel in Durchlauf 1; Anteil echter Entscheidungen; Robustheit der Lagen ±0,5 m wie bei A3 |
| A2 | **Rückmeldungen 2.0:** Ursache statt Floskel (Tabelle in Abschnitt 4); „Manchmal klappt es nicht“ entfällt; Grund bei ⭐ gesprochen, nicht nur als Chip; kleine Engine-Erkennungen „überspielt“, „Lücke“, „Wächter verschoben“ | ★★★ | ★★ | M | alle Oberflächen-Mitschriften ändern sich (Texte); Bewertung unverändert | Eigenschaftstests: jeder Satz nur, wenn die Bedingung in der Simulation zutrifft; Anzahl verschiedener Sätze auf dem Hilfeweg ≥ 6 je Mission |
| A3 | **Kurzrückmeldung bei ⭐**, zuerst in „Freie Bahn!“ (PO-Richtung) | ★ | ★★★ | M | nur Oberfläche | e2e: „Nochmal“ und 🔈 bleiben erreichbar; Zeit pro Situation |
| A4 | **Sterne je Situation** (für die Kernentscheidung) statt je Entscheidung; mit 💡 gelöst = halber oder hohler Stern, kein Abzug | ★★ | ★★ | S–M | Endbildschirm aller Missionen | e2e; **PO-Entscheidung nötig** |
| A5 | **Darstellung:** größere Spieler, Ausschnitt für Lernmissionen, Laufanimation, „Vorbei!“-Moment | ★ | ★★★ | M | nur Darstellung, Tippziele prüfen | Bildschirmfotos, Rechenzeit, Tipp-Tests |

### B. Erweiterungen mit größerem Eingriff (V0.6b)
| # | Maßnahme | Lernwert | Spielwert | Aufwand | Risiko | Überprüfung |
|---|---|---|---|---|---|---|
| B1 | **Anschlussbewegung** (Abschnitt 3) | ★★ | ★★★ | M–L (Engine + Ablauf) | Ablauf Freie Bahn und A4/W1 ändert sich; Bewertung unverändert | Eigenschaftstest: nie automatisch, wenn ein Roter im Kegel ist; nachgerechnet entfallen nur Routine-Entscheidungen (heute 24 von 24); deterministisch |
| B2 | **Mission 1 lebendig:** 3 bis 4 Startlagen (S1 aus Abschnitt 7.3 als eine davon); Freilaufen mit Folge: Der Ballführende spielt den freigelaufenen Freund an, statt immer selbst zu dribbeln | ★★★ | ★★★ | M (Daten) + M (Mitspielerentscheidung, Engine) | Mission-1-Referenzen ändern sich deutlich | Messung: Freilaufen ändert die Folge (heute 0 von 48); Startlagen verschieden; Hilfe endet mit Abschluss |
| B3 | **Schwerere Lesart nach Erfolg** in der Sitzung (Spiegelung, zweiter Gegner, wandernder Wächter) | ★★ | ★★ | S–M | gering | e2e: Wechsel nur nach gelöster Kernentscheidung; nichts gespeichert |
| B4 | **Zweikampf leicht:** Wer zu knapp vorbeidribbelt (< 1,5 m), gegen den greift der Rote an. Abstand halten wird sichtbar, Pech wird möglich und erklärbar. | ★★ | ★★★ | M–L | Bewertung Dribbeln (Paket D) und Referenzen aller Missionen | Abweichungsbericht wie bei Paket D; Eigenschaftstests |

### C. Spätere Ausbaustufen (erst nach Spieltests)
- Aufgenommene Sprecherstimme (Texte müssen vorher stabil sein).
- Paket B: Mitspieler laufen sich selbstständig frei, für „Spiel mich an!“.
- „Zusammen verteidigen!“.
- Bewegte Startlagen.
- Rahmen und Figuren (Team, nur in der Sitzung).
- Elternbereich (Sprechtempo).
- **„Pass oder Dribbling?“ erst, wenn A1 bis A3 und B1 im Spieltest überzeugen.** Die Mission profitiert von Anschlussbewegung, Rückmeldungen 2.0 und Bewährungsszene.

### Ausdrücklich **nicht** empfohlen
| Maßnahme | Begründung |
|---|---|
| Zufall oder „Glück“ im Spiel | verletzt die Leitplanke; Pech wird über B4 erklärbar, nicht über Würfeln |
| Freie Echtzeitsteuerung (Joystick, Wischen) | verlagert den Fokus von Entscheidung auf Fingerfertigkeit; für Fünfjährige frustrierend |
| Zeitdruck oder Countdown | Stress statt Wahrnehmung; Druck entsteht besser über nahe Gegner (B4) |
| Punkte, Ranglisten, Belohnungsökonomie | belohnt Sammeln statt Verstehen; widerspricht „keine Speicherung, kein Tracking“ |
| Wählbare Schwierigkeitsmodi | Kinder wählen unpassend; besser automatisch (B3) |
| Hilfe-Nutzung bestrafen (Sterne abziehen) | Kinder würden die Hilfe meiden; besser ehrlich anders markieren (A4) |
| 3D, Kamerafahrten, Partikel ohne Information | kostet Übersicht und Rechenzeit, kein Lernwert |
| KI-Stimme oder Texterzeugung zur Laufzeit | Datenschutz-Leitplanke; nicht deterministisch |
| Vollautomatische Spielzüge über mehrere Aktionen | Zuschauen statt Entscheiden; die Anschlussbewegung bleibt auf freie Dribbelwege begrenzt |
| Weitere Missionen vor V0.6a/b | verteilt Aufwand auf noch nicht überzeugende Grundlagen (PO-Vorgabe) |

### Vorschlag zur Reihenfolge
1. **V0.6a:**
   - A1 + A2 zuerst: der größte Lernwert, meist nur Daten und Texte.
   - Danach A3 + A5 als ein Paket „Spielfluss und Darstellung“.
   - A4 nach PO-Entscheidung.
2. **Spieltest** mit je zwei bis drei Kindern im Alter 5 bis 6 und 8 bis 10, je 5 Minuten, beobachtet:
   - Aufgabe ohne Erklärung verstanden?
   - Will das Kind weiterspielen?
   - Kann es danach sagen, *warum* außen herum oder warum das andere Tor?
3. **V0.6b:** B1, dann B2. B3 und B4 nach dem Spieltest.

---

## 9. Zur Entscheidung durch den PO
1. **Lernaufbau (A1):** Durchlauf 1 neu als Mission A A1 · A3 · W1 und Freie Bahn B3 · L3-eng · L3-breit, mit Torwächter. Einverstanden?
2. **Rückmeldungen 2.0 (A2):** Ursache statt Floskel, „Manchmal klappt es nicht“ entfällt, drei kleine Engine-Erkennungen. Einverstanden?
3. **Sterne (A4):** je Situation statt je Entscheidung? Mit Hilfe gelöst: halber Stern, hohler Stern oder unverändert?
4. **Anschlussbewegung (B1):** grundsätzlich freigeben, mit den Regeln aus Abschnitt 3?
5. **Mission 1 (B2):** mehrere Startlagen, S1 als eine davon, und Freilaufen mit echter Folge?
6. **Bewährungsszene** am Ende jeder Lernmission (Abschnitt 6): weiterverfolgen?
