# Ausbauplan Missionskatalog (Stand 19.11.2026, Basis V0.4.0)

**Zur Entscheidung vorgelegt.** Dies ist eine reine Analyse. Es gibt keine Implementierung, keinen Merge und keine Veröffentlichung.
Grundlagen:
- `docs/paket-b-vorgaben.md`;
- `docs/entwicklungsplan-lernwelt-1.md` (Paket D);
- `docs/korrektur-a-freilaufen.md` (K2, K3);
- `docs/meilenstein-1.md` (Torplan-Befund);
- `docs/missions/freie-bahn.md`;
- `engine.js` v0.4.0.

## 1. Kurzfassung
- **Zwei Missionsarten:**
  - **Lernmissionen** üben genau eine Entscheidung. Sie haben 4–5 kurze Situationen, 3 davon pro Durchlauf, mit 1–2 Entscheidungen je Situation.
  - **Spielmissionen** verbinden mehrere Fähigkeiten im zusammenhängenden Spielverlauf, wie „Zusammen sind wir stark!“.
  - Eine Spielmission schließt jeweils eine Lernwelt ab.
- **Katalog:** 6 Missionen.
  - Jede Lernmission hat eine eigene Entscheidungsart: Tor wählen, Dribbelweg wählen, Aktion wählen, Laufweg ohne Ball wählen, Rollen in der Abwehr verteilen.
  - Später kommt eine zweite Spielmission als Abschluss dazu.
- **Kleinste Engine-Schritte:** Jede neue Mission braucht genau **ein** abgegrenztes Paket. Eine große Überarbeitung vorab ist nicht nötig.
- **Empfehlung für die nächsten zwei Missionen:** **„Freie Bahn!“** und **„Pass oder Dribbling?“**.
  - Beide hängen nur am selben kleinen Paket **D1/D2** (Dribbelbewertung an die Simulation angleichen, Dribbelhilfe Richtung Tor).
  - Dasselbe Paket schaltet auch **A4** für „Welches Tor ist frei?“ frei.
  - Ein Paket ergibt also zwei Missionen und eine Situation.

## 2. Zwei Missionsarten
| | Lernmission | Spielmission |
|---|---|---|
| Ziel | eine Entscheidung verstehen und sicher treffen | mehrere Fähigkeiten im Spielfluss verbinden |
| Ablauf | Situationsmission (M1): 4–5 Situationen, 3 pro Durchlauf, feste Rotation, nahtloser Wechsel | Phasen (Angriff → Verteidigung), Neustarts, 5–8 Entscheidungen |
| Dauer | 1–2 Minuten | 3–4 Minuten |
| Erfolg | schnell, nach 1–2 Entscheidungen ein Tor bzw. Ballgewinn | Gesamtergebnis und Sterne je Entscheidung |
| Hilfe | zeigt den Lernweg der Mission zuerst | wie heute: beste gute Aktion |
| Beispiel | „Welches Tor ist frei?“ | „Zusammen sind wir stark!“ |

Technischer Aufwand der Unterscheidung:
- **Daten:** ein Feld `art: 'lernen' | 'spiel'` in der Missionsdatei.
- **Startbildschirm:** Die Karte zeigt die Art mit eigenem Symbol und vorgelesenem Zusatz, z. B. „Spiel“.
- **Engine:** keine Änderung. Beide Arten nutzen schon heute dieselbe Engine (M1 bzw. Phasen).

Vorschlag: Das Feld wird mit der nächsten Mission eingeführt, als Paket S.

## 3. Katalog und Lernpfad
Die Reihenfolge im Lernpfad (Startbildschirm) folgt fachlich. Die Reihenfolge der Entwicklung folgt den technischen Abhängigkeiten (Abschnitt 6).

| Lernpfad | Mission | Art | Lernwelt | Was das Kind entscheidet | Bedienung | Status |
|---|---|---|---|---|---|---|
| 1 | Welches Tor ist frei? | Lernen | 1 Ich und der Ball | **Wohin schießen?** (freies Tor) und, wenn beide zu sind, passen | Tor antippen | live (A4 folgt mit D1) |
| 2 | Freie Bahn! | Lernen | 1 Ich und der Ball | **Wohin dribbeln, wie weit?** (freien Raum erkennen, am Gegner vorbei) | Punkt auf dem Feld antippen, es gibt nur diese eine Aktion | Entwurf vorhanden |
| 3 | Spiel mich an! | Lernen | 2 Wir spielen zusammen | **Wohin laufen ohne Ball?** (anspielbar werden oder Platz schaffen) | eigenen Spieler und Laufziel antippen | neu |
| 4 | Zusammen sind wir stark! | **Spiel** | 2 Wir spielen zusammen | Schauen, passen, dribbeln, freilaufen, verteidigen | wie heute | live |
| 5 | Zusammen verteidigen! | Lernen | 3 Wir verteidigen | **Wer greift an, wer sichert ab?** | zwei Spieler nacheinander antippen | neu |
| 6 | Pass oder Dribbling? | Lernen | 4 Wir werden clever | **Welche Aktion passt jetzt?** (Gegner nah und Freund frei → Pass; Raum frei → Dribbling) | Knopf wählen, dann Ziel | neu |
| (7) | z. B. „Das große Spiel“ | **Spiel** | 5 Wir spielen als Team | Alles kombiniert: Torwahl, Pass oder Dribbling, Freilaufen, gemeinsam verteidigen | wie Mission 1 | Ausblick |

Warum sich die Missionen wirklich unterscheiden: Jede Lernmission fragt etwas anderes, nicht nur in anderer Aufstellung.
- Ziel des Schusses
- Weg des Balls am Fuß
- Weg ohne Ball
- Verteilung der Rollen
- Wahl der Aktionsart

„Pass oder Dribbling?“ steht bewusst in Lernwelt 4. Dort kommt zum ersten Mal ein Abwägen dazu, bei dem **beide Antworten richtig sein können** und die Lage entscheidet.

### Lernziele und Situationsideen je neuer Mission
**Freie Bahn!** (1 gegen 1 und 1 gegen 2, Entwurf `docs/missions/freie-bahn.md`)
- **Lernziele:**
  - dorthin dribbeln, wo kein Roter ist;
  - die Strecke dosieren;
  - nahe am Tor aufs freie Tor schießen.
- **Situationen:**
  - B1: Gegner oben vorn, unten frei;
  - B3: Gegner hinten, Weg frei;
  - B4: Gegner kommt frontal, ausweichen;
  - B5: zwei Gegner mit Lücke;
  - B2 „durch die Lücke oder außen herum“ nur, wenn D3 umgesetzt ist.
- **Erfolg:** Ein Dribbling, dann der Abschluss. Das Tor kommt nach 2–3 Entscheidungen.

**Pass oder Dribbling?** (2 gegen 2 und 3 gegen 2)
- **Lernziele:**
  - Ist ein Gegner nah und ein Freund frei: passen.
  - Ist vor mir Platz: dribbeln.
  - Manchmal ist beides gut.
- **Situationen:**
  - P1: Druck, Freund frei → Pass;
  - P2: kein Druck, Freund gedeckt, Raum vorn → Dribbling;
  - P3: beides gut → beide ⭐;
  - P4: Druck und Freund gedeckt → wegdribbeln oder Pass in den Raum;
  - P5: Freund frei, aber großer Raum vorn → beides gut.
- **Erklärung:** Die Rückmeldung nennt den Grund, z. B. „Rot 1 war ganz nah – darum war der Pass klug.“

**Spiel mich an!** (2 gegen 1 und 3 gegen 2)
- **Lernziele:**
  - in die Lücke laufen, weg vom Gegner;
  - so laufen, dass zwischen Ball und mir kein Gegner steht;
  - mit dem Laufen einen Gegner wegziehen und Platz schaffen.
- **Situationen:**
  - S1: freier Raum seitlich;
  - S2: Gegner steht im Passweg, ein Schritt seitlich reicht;
  - S3: Gegner deckt eng, Lauf in die Tiefe;
  - S4: Lauf zieht Gegner weg, Freund dribbelt durch (PO-Prinzip „Platz schaffen“).
- **Ablauf:** Freilaufen, danach passt das Kind selbst zum Freigelaufenen und schießt.

**Zusammen verteidigen!** (2 gegen 2 und 3 gegen 3, Verteidigung ohne vorherigen Angriff)
- **Lernziele:**
  - Der Nächste greift an.
  - Ein anderer stellt sich zwischen Ball und gefährdetes Tor (Absichern).
  - Gefährliche Gegner nicht allein lassen.
- **Situationen:**
  - V1: Ballführender zentral, ein Tor gefährdet;
  - V2: Ballführender seitlich, Pass droht;
  - V3: zwei Tore gefährdet;
  - V4: Gegner kommt nach Ballverlust frei auf ein Tor zu.
- **Ablauf:** Das Kind wählt zuerst, wer angreift. Danach wählt es, wer absichert, oder die App zeigt das automatische Absichern, und das Kind bewertet „Wer sichert?“. Die Entscheidung trifft der PO in Paket B1 (Abschnitt 5).

## 4. Technische Abhängigkeiten je Mission
| Mission | Braucht | Heute vorhanden | Fehlt (fachlich nötig) |
|---|---|---|---|
| Welches Tor ist frei? + A4 | Dribbeln bis in die Zone | M1–M3 | **D1** (A4: 49 von 87 Ballbehaltungen falsch als „direkt auf einen Gegner“ bewertet) |
| Freie Bahn! | Dribbelbewertung = Simulation, Hilfe Richtung Tor, 1 gegen N | M1–M3, M2 (1 gegen 1) | **D1**, **D2**; D3 nur für B2 |
| Pass oder Dribbling? | verlässliche Bewertung von Pass **und** Dribbling, mehrere gute Lösungen | Passbewertung E1 (geprüft), „Auch gut“-Hinweis | **D1** (sonst wird das Dribbling willkürlich bestraft), **D2** für die Hilfe |
| Spiel mich an! | Laufweg und Anspielbarkeit getrennt bewerten, „Platz schaffen“ zählt | Freilaufen und K1-Hilfe | **B3a**; **M4** (Situation beginnt „ohne Ball“) empfohlen; **B4a** nur, falls die Analyse es zeigt |
| Zusammen verteidigen! | Absichern in der Abwehr, frische Torwahl, Rollen unabhängig von der Spielerreihenfolge | Verteidigung „Angreifen“/„Weg versperren“, automatische Manndeckung | **B1a** inkl. Torplan-Korrektur; **M5** (Situation beginnt in der Verteidigung) |
| Spielmission 2 | alle oben, dazu Mitspieler-Angriffsverhalten und längere Phasen | Phasenablauf | B2, B4 (Rest), ggf. C-Themen |

## 5. Kleinste nötige Korrekturen aus Paket D und B (priorisiert)
Jedes Paket hat diese Eigenschaften:
- eigener Branch;
- Analyse mit Abweichungsbericht für beide veröffentlichten Missionen;
- Umsetzung erst nach Freigabe;
- Prüfung der neuen Regel **über ein Raster von Lagen, nicht nur an den Missionssituationen**. So wird keine Schwäche durch eine präparierte Startlage verdeckt.

| Prio | Paket | Inhalt (nur das) | Ermöglicht | Betrifft veröffentlichte Missionen | Größe |
|---|---|---|---|---|---|
| 1 | **D1 Dribbelbewertung = Simulation** | Abfangmodell wie in der Simulation (nur der Anlaufende, Stopp 1,4 m vor dem Ball); bewertet wird der tatsächlich gelaufene Weg (höchstens 8 m); Text „direkt auf einen Gegner“ nur, wenn das zutrifft (heute in 337 von 767 Fällen falsch) | A4, Freie Bahn!, Pass oder Dribbling? | Mission 1: Dribbel-Sterne und Texte → Abweichungsbericht, Freigabe. Mission A: nur bei Dribblings | M |
| 2 | **D2 Dribbelhilfe Richtung Tor** | Hilfeziel nach Raumgewinn Richtung Tor und Weg in die Schusszone, vorausgerechnet wie K1; kein Abdriften zur Seitenlinie | Hilfe in Freie Bahn! und Pass oder Dribbling? | nur Abläufe, in denen ein Kind der Hilfe folgt | S |
| 3 | **B3a Freilaufen getrennt bewerten** | Idee/Laufweg (Entscheidung) und Ergebnis am Szenenende (anspielbar **oder** Gegner mitgezogen → Platz für den Ballführenden bzw. einen Freund) getrennt; löst K2 | Spiel mich an! | Mission 1: Freilauf-Bewertung und -Texte → Abweichungsbericht | M |
| 4 | **B1a Gemeinsam verteidigen** | Greift ein Blauer an, sichert der passende zweite Blaue torseitig ab, der dritte deckt den gefährlichsten Gegner. Die Rollen ergeben sich aus der Lage, unabhängig von der Spielerreihenfolge. Torplan vor der Bewertung aktualisieren (Befund: 61 von 274 Lagen veraltet). „Weg versperren“ wird relativ zum Angreifenden bewertet. | Zusammen verteidigen! | Mission 1: Verteidigungsphase (Verlauf, Bewertung) → Abweichungsbericht | M–L |
| 5 | B4a Ballführender beim Freilaufen | klare, vorhersehbare Absicht des Ballführenden während des Laufs; löst K3 (86 % → 68 %) | nur falls B3a allein nicht reicht | Mission 1: Spielverlauf | M |
| später | D3 zwei gute Dribbelwege | „Lücke oder außen herum“ (B2) | B2 in Freie Bahn! | gering | S–M |
| später | B2 Angriffsverhalten, B4 Rest (Reihenfolge-Unabhängigkeit gesamt: 141 von 710), B5 Zweikampf, C-Themen | – | Spielmission 2 | Mission 1 | L |

**Kleine Daten-/Ablauf-Erweiterungen** (Engine, generisch, ohne Bewertungsänderung; Mission 1 bleibt bit-gleich):
- **M4:** Eine Situation darf mit Blau ohne Ball beginnen, Kontext „Freilaufen“, ein blauer Mitspieler hat den Ball. Dann hat „Spiel mich an!“ den Fokus sofort auf dem Laufweg.
  - Alternative ohne M4: Jede Situation beginnt mit einem einfachen Pass. Das ist machbar, aber verwässert den Fokus.
- **M5:** Eine Situation darf mit Rot in Ballbesitz beginnen (nur Verteidigung).
- **S:** Missionsart auf der Karte (siehe Abschnitt 2).

Bewusst **nicht** nötig für die nächsten Missionen:
- B2 (Mitspieler im Angriff);
- B4 vollständig;
- B5 (Zweikampf);
- schwierigkeitsabhängige Reaktionszeiten;
- längere Phasen.

## 6. Empfehlung: die nächsten zwei Missionen
**„Freie Bahn!“ und „Pass oder Dribbling?“**
1. **Ein Paket, zwei Missionen:**
   - D1 und D2 sind klein und klar begrenzt; die Analyse liegt schon vor.
   - Danach ist das Dribbeln überall verlässlich: in Mission 1, Mission A (A4) und beiden neuen Missionen.
2. **Echte Abwechslung:**
   - Freie Bahn! ist die erste Mission, in der das Kind frei aufs Feld tippt (Raum wählen).
   - Pass oder Dribbling? ist die erste, in der **zwei verschiedene Aktionen** je nach Lage richtig sind.
   - Beide unterscheiden sich klar von der Torwahl in A.
3. **Baut auf die Lieblingsmission auf:** Pass oder Dribbling ist die Kernentscheidung von „Zusammen sind wir stark!“, isoliert geübt. Kinder werden dadurch in der Spielmission besser.
4. **Geringstes Risiko für Mission 1:** D1 betrifft nur Dribblings. Die Wirkung wird vollständig vorgelegt, bevor etwas geändert wird.

Alternative, falls Teamspiel Vorrang hat: **„Spiel mich an!“** (B3a + M4) als zweite statt Pass oder Dribbling. „Zusammen verteidigen!“ empfehle ich als vierte neue Mission, weil B1a das größte Paket ist und die Verteidigung von Mission 1 am stärksten berührt.

## 7. Schlanker Release-Plan
Jeder Meilenstein liegt auf einem eigenen Branch. Am Ende steht eine Zusammenfassung an den PO; Merge und Veröffentlichung erfolgen nur nach Freigabe. **Jede Veröffentlichung bringt eine neue Mission.** Engine-Pakete werden nicht einzeln veröffentlicht, sondern mit der Mission, die sie nutzt.

| Meilenstein | Inhalt | Prüfbar abgenommen, wenn … | Release |
|---|---|---|---|
| **3a** D-Analyse kompakt | D1/D2-Vorschlag, vollständiger Abweichungsbericht für Mission 1 und A (vorher → nachher, Sterne, Texte, Hilfe-Weg) | PO entscheidet über jede Abweichungsgruppe | – |
| **3b** D1 + D2 umgesetzt | nach Freigabe | Konsistenz im Raster: Ein Dribbling mit Stern verliert in der Simulation den Ball höchstens in einem freigegebenen Anteil; der Text „direkt auf einen Gegner“ stimmt in allen Fällen; die Hilfe erreicht in jeder Lage mit freiem Weg die Zone; nur freigegebene Abweichungen; Referenzen nach Freigabe neu und archiviert | – |
| **4** Freie Bahn! + A4 | Missionsdatei, A4 in Mission A, Paket S (Missionsart) | Jede Situation ±0,5 m robust; Lernweg mit Hilfe = Tor; Raster: mehrere Richtungen und Strecken mit ⭐ (nicht nur „kurz ist gut“); e2e Touch/offline/gedrosselt; Mission 1 nur mit freigegebenen D-Abweichungen | **V0.5.0** + Kindertest |
| **5** Pass oder Dribbling? | Missionsdatei | Jede Situation: der erwartete gute Weg ⭐, P3/P5 beide ⭐; Robustheit ±0,5 m; „Auch gut“ nennt nur angebotene Aktionen; Mission 1 und A bit-gleich | **V0.6.0** |
| **6** B3a (+ M4) → Spiel mich an! | Analyse mit Abweichungsbericht → Umsetzung → Mission | Raster: anspielbar und Platz geschaffen werden getrennt erkannt; K2-Anteil sinkt nachweisbar; S4 (Platz schaffen) ⭐ ohne Selbst-Anspielbarkeit; Mission 1 nur freigegebene Abweichungen | **V0.7.0** + Kindertest |
| **7** B1a (+ M5) → Zusammen verteidigen! | Analyse → Umsetzung → Mission | Raster: Bei jedem Angriff eines Blauen sichert ein zweiter torseitig ab; Rollen gleich bei umgekehrter Spielerreihenfolge; Torplan nie veraltet (0 von N); Mission 1 nur freigegebene Abweichungen | **V0.8.0** |
| Ausblick | B2/B4/B5 → Spielmission 2 | eigener Plan nach Kindertests | V0.9+ |

Für jede neue Mission gelten wie bei A:
- 4–5 Situationen, davon 3 pro Durchlauf, feste Rotation;
- optional gespiegelte Varianten (oben/unten) als reine Datenvarianten, jede einzeln geprüft;
- eigene Referenzen für Engine und Oberfläche;
- Regressions- und Robustheitstests;
- kurze vorgelesene Ansagen, eine Erklärung pro Rückmeldung.

## 8. Schutz der veröffentlichten Missionen
- Mission 1 und Mission A werden in jedem Meilenstein gegen ihre Referenzen geprüft.
- **Meilensteine 4 und 5:** keine Änderung an Mission 1 und A, außer den in 3b freigegebenen.
- **Pakete D1, B3a und B1a ändern die Bewertung und damit Mission 1:**
  - Jede Wirkung wird vorher im Abweichungsbericht vorgelegt (`tests/golden/diff.js`).
  - Erst nach der gesonderten Freigabe wird umgesetzt, die Referenz neu erzeugt und die alte nach `tests/golden/historie/` archiviert.
- Missionsdaten von Mission 1 und A werden nicht angepasst, um Engine-Änderungen „aufzufangen“. Weicht ihr Verhalten ab, wird es benannt.

## 9. Zur Entscheidung
1. Einverstanden mit Katalog und Lernpfad (Abschnitt 3)? Einverstanden mit „Pass oder Dribbling?“ in Lernwelt 4?
2. Missionsarten Lernen/Spiel einführen (Paket S)?
3. Nächste zwei Missionen: **Freie Bahn! + Pass oder Dribbling?** (Empfehlung) oder Freie Bahn! + Spiel mich an!?
4. Meilenstein 3a (D-Analyse kompakt mit Abweichungsbericht) beauftragen?
5. Für später:
   - M4 (Start ohne Ball) für „Spiel mich an!“ statt Pass-Einstieg?
   - Bei „Zusammen verteidigen!“: Soll das Kind beide Rollen wählen, oder wählt es den Angreifer und das Absichern geschieht automatisch und wird erklärt?
