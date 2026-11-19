# Meilenstein 3b – Paket D: Dribbelbewertung und Dribbelhilfe

Stand 19.11.2026, Branch `meilenstein-3b-dribbeln` (Basis `meilenstein-3a-dribbel-analyse`). **Zur Abnahme vorgelegt.**
Es gibt keinen Merge und keine Veröffentlichung. Die Referenzen sind **nicht** neu erzeugt.

**Umgesetzt:** E1, E2, E4 und E6.
**Nur geprüft, nicht umgesetzt:** E3 und E5 (Kriterienvorschlag in Abschnitt 4). E7 ist zurückgestellt.

## 1. Was umgesetzt ist (`engine.js`, `content/texte.js`)
| | Umsetzung |
|---|---|
| E1 Sicherheit | Das Dribbling wird auf einer Kopie mit derselben Simulation vorausgerechnet. Es gilt nur dann als sicher (⭐-Ziel), wenn das Ziel **und** mindestens 3 von 4 Nachbarzielen (±0,5 m) den Ball behalten. Damit hängt die Bewertung nie am Erfolg einer einzelnen Simulation. Entscheidung, Ziel und Ergebnis bleiben getrennt: Das Erkennen (`situation().ok.dribble`) ist bis zur Entscheidung über E5 **unverändert**. |
| E2 Ausgeführter Weg | Ein Tipp über 8 m wird auf genau den 8-m-Weg gekappt, den der Spieler läuft, und so bewertet. Ein Tipp ins Aus wird wie bisher aufs Feld gesetzt. |
| E4 Erklärungen | Ursache statt Pauschalsatz, kurz und ohne Doppelungen: „Das war knapp – Rot 3 war ganz nah.“ (Ball behalten, aber nicht sicher) · „Du bist direkt auf einen Gegner zugelaufen.“ (nur noch bei Ballverlust mit Weg < 1 m am Gegner) · „Dribbel weiter weg von Rot 2.“ (Ball verloren, weil der Gegner in den Weg kam). „Du bist in den freien Raum gedribbelt.“ bleibt für sichere Dribblings. |
| E6 Hilfe | Sie zeigt nur sichere Ziele, deren Nachbarziele ±0,5 m ebenfalls sicher sind. Bevorzugt werden Raumgewinn, ein Ende in der Schusszone mit freiem Tor, Abstand zum Gegner und die Feldmitte. Gesucht wird nach dem geschätzten Wert, abgebrochen wird, sobald kein Kandidat das beste Ziel mehr übertreffen kann. Gibt es kein sicheres Ziel, bleibt die bisherige Suche als Ausweg. |

Die Vorausrechnung hat keine Nebenwirkung: Bewertung und Hilfe verändern die Lage nicht, das ist per Test belegt. Deshalb kann sich der Spielverlauf nicht ändern.

## 2. Wirkung auf die veröffentlichten Missionen
| | Mission 1 (gegen v0.3.1) | Mission A (gegen v0.4.0) |
|---|---|---|
| Spielverlauf | **unverändert** | **unverändert** |
| Hilfe-Durchlauf / feste Abläufe / Spielweisen | unverändert | unverändert |
| Oberflächen-Mitschrift | unverändert (3 Abläufe) | unverändert (49 Einträge) |
| geänderte Entscheidungen | 10 in 10 der 200 Kinder-Abfolgen | 5 in 5 der 200 Kinder-Abfolgen |
| davon 💭 → ⭐ | 7 (falsch als „direkt auf einen Gegner“ bewertet, Ball behalten) | 5 (ebenso) |
| davon neue Erklärung, weiter 💭 | 2: „knapp – Rot 3 war ganz nah“, „Dribbel weiter weg von Rot 2“ | – |
| nur interner Ziel-Text, gesprochen gleich | 1 (Abfolge 148) | – |
| ⭐ → 💭 | 0 | 0 |

- Vorher hörte das Kind in 7 dieser Fälle einen Widerspruch: „Gut gedribbelt – du hast den Ball behalten! … Aber schau mal: Du bist direkt auf einen Gegner zugelaufen.“ Jetzt hört es „Super gemacht!“.
- Einzelaufstellung: `docs/meilenstein-3b-abweichungen.md`.
- Vorgelegt in `tests/golden/abweichungen-paket-d.json` (Mission 1) und `tests/golden/missionA-abweichungen-paket-d.json` (Mission A).
  - Die Referenztests lassen **genau diese** Abweichungen zu.
  - Für Mission A habe ich diesen Mechanismus neu eingeführt; er funktioniert wie bei Mission 1.
- Archiviert in `tests/golden/historie/`: `mission1.v0.3.1.json`, `ui-transcript.v0.3.1.json`, `mission-a.v0.4.0.json`, `ui-mission-a.v0.4.0.json`. Die gültigen Referenzen sind unverändert.

## 3. Tests
| Test | Ergebnis |
|---|---|
| `npm test` | 110/110 (neu: `tests/dribbeln.test.js`, 9 Tests über 33 Lagen aus Mission 1, Mission A, B1–B5 und A4) |
| Keine Nebenwirkung von Bewertung und Hilfe | ✓ |
| E1: ⭐-Ziel genau dann, wenn Ziel und ≥ 3/4 Nachbarn in einer unabhängigen Simulation den Ball behalten; nie ⭐ mit Ballverlust | ✓ |
| E4: jede Erklärung passt zur Ursache in der Simulation (alle vier Fälle kommen vor) | ✓ |
| E2: Tipp über 8 m = ausgeführter 8-m-Weg | ✓ |
| Bewusst schlechte und zweifelhafte Dribblings: frontal in den Gegner 💭, außen vorbei ⭐, Lücke **und** außen herum ⭐ (B2), Tipp ins Aus gekappt, quer ohne Gegner ⭐ (dokumentiert: E3 offen) | ✓ |
| E6: Hilfe nur ⭐ und robust (≥ 3/4 Nachbarziele ⭐) in allen Lagen, nach vorn ≥ 90 % | ✓ |
| E6: Hilfe-Weg B1–B5 ohne Seitenlinie, Tor in ≤ 4 Entscheidungen (heute B2/B5 kein Tor) | ✓ |
| E6: A4 mit dem Lernweg von Mission A, Startlage und ±0,5 m je Spieler: Dribbeln ⭐ → Schuss ⭐ → Tor 16/16 (heute 10/16) | ✓ |
| Rechenzeit, 4× gedrosselte CPU, 24 Lagen (`tests/e2e/rechenzeit.mjs`, neu in `test:e2e`) | ✓ alle ≤ 150 ms: Bewertung kalt max 25 ms, Hilfe kalt max 53 ms, Hilfe nach einer Bewertung max 89–94 ms, Wiederholen max 32 ms, Median ≤ 26 ms |
| `e2e/play`, `transcript`, `offline`, `auswahl`, `mission-a` | grün; Mitschriften Mission 1 und A identisch |
| CPU 4× gedrosselt (`SLOW=4`): `play`, `mission-a` | grün |

`npm test` dauert 2:27 min statt 1:29 min. Ursache sind die neuen Eigenschaftstests mit vielen Vorausrechnungen.

## 4. Zusatzprüfung E3 und E5 – Kriterien zur Freigabe (noch nicht umgesetzt)
Grundlage ist `tests/analysis/paket-d/e3-e5.js`: 7 452 sichere Dribblings in 113 Lagen (Mission 1, Mission A, Entwürfe).

### E3 – Raumgewinn: Was die Prüfung zeigt
| Art des sicheren Dribblings | Anzahl | vorn wäre ein sicherer Weg gewesen | Freund war frei | schafft einen Anschluss* |
|---|---|---|---|---|
| A Raumgewinn ≥ 1 m | 2 699 | alle | 1 016 | 675 |
| B seitlich unter Druck (Gegner < 2,5 m, \|Δx\| < 1 m) | 1 368 | 1 332 | 564 | 229 |
| C seitlich ohne Druck | 249 | alle | 69 | 0 |
| D rückwärts unter Druck | 2 755 | 2 703 | 1 429 | 319 |
| E rückwärts ohne Druck | 381 | alle | 111 | 0 |

\* **Anschluss geschaffen:** Vorher stand kein Freund frei, nach dem Dribbling ist einer anspielbar. Oder das Dribbling endet in der Schusszone mit freiem Tor.

Zu den fünf Prüfpunkten:
1. **Seitlich ausweichen unter Druck:**
   - In der Simulation löst Ausweichen den Druck **nicht**. Der mitlaufende Rote bleibt in 0 von 1 368 Fällen weiter als 1 m zurück.
   - Fachlich sinnvoll ist es, wenn es danach einen Pass ermöglicht (229) oder es keine Alternative gibt (27).
2. **Rückwärts unter Druck:** wie bei 1. Abstand gewonnen wird in 0 von 2 755 Fällen. Einen Anschluss schaffen 319, ohne Alternative sind 49.
3. **Unnötig rückwärts bei freiem Weg nach vorn:** 381 Fälle ohne Druck und 2 703 unter Druck, in denen vorn ein sicherer Weg war. Heute sind alle ⭐.
4. **Geringer Raumgewinn mit besserer Anschlussposition:** Bei 0,5–1 m Raumgewinn schaffen 55 von 414 sicheren Dribblings einen Anschluss.
5. **Grenzfälle um 1 m:**

   | Raumgewinn | Dribblings |
   |---|---|
   | 0,5–1 m | 414 |
   | 1–1,5 m | 368 |
   | 1,5–2 m | 447 |

   Eine 0,5-m-Grenze würde zusätzlich 359 Dribblings einen Stern geben, vor allem seitlich unter Druck ohne Anschluss (B: 528 statt 238).

| Regel | ⭐ von 7 452 | A | B | C | D | E |
|---|---|---|---|---|---|---|
| R1 (Vorschlag 3a): ≥ 1 m **oder** Ball sichern ohne Alternative | 2 775 | 2 699 | 27 | 0 | 49 | 0 |
| **R2 (Empfehlung): R1 oder Anschluss geschaffen** | **3 289** | 2 699 | 238 | 0 | 352 | 0 |
| R2 mit 0,5 m statt 1 m | 3 648 | 2 699 | 528 | 69 | 352 | 0 |
| R2 + „Druck gelöst“ (Abstand +1 m) | 3 289 | gleich wie R2, kommt in der Simulation nicht vor | | | | |

**Empfehlung E3 (Regel R2):** Ein sicheres Dribbling ist ⭐, wenn **einer** von drei Gründen zutrifft:

| Grund | Gesprochen bei ⭐ |
|---|---|
| Raumgewinn: mindestens 1 m Richtung Tor | „Du bist in den freien Raum gedribbelt.“ |
| Anschluss geschaffen: danach ist ein Freund frei (vorher keiner) oder das Tor frei | „Jetzt ist dein Freund frei – gut vorbereitet!“ |
| Ball gesichert: nach vorn kein sicherer Weg und kein Freund frei | „Nach vorn war kein Platz – gut, dass du den Ball behalten hast.“ |

Sonst gibt es 💭 mit einem der beiden Hinweise:
- „Nach vorn war Platz – dribbel Richtung Tor.“
- „Ein Freund stand frei – ein Pass bringt euch weiter.“

Begründung:
- Es gibt keinen starren Vorwärtszwang, denn Ausweichen und Rückwärts sind gut, wenn sie etwas bewirken.
- Die Regel ist einfach und für das Kind erklärbar, eine neue Fußball-KI braucht es dafür nicht.
- Die 1-m-Grenze reicht, wenn der Anschluss als zusätzliche Bedingung dazukommt. 0,5 m würde Querbewegungen ohne Zweck belohnen.
- Ein eigener Grund „Druck gelöst“ bringt nichts, weil der Rote auf Einsteigerstufe immer mitläuft.

Erwartete Wirkung, aus der 3a-Analyse hochgerechnet: In Mission 1 verliert der feste Rückzug-Ablauf „dribbling“ Sterne (Endbildschirm 2 statt 5 von 6). In wenigen Kinder-Abfolgen werden Rückzug-Dribblings ⭐ → 💭. Die genaue Liste lege ich vor der Umsetzung vor.

### E5 – Mehrere gute Entscheidungen: Beispiele (`tests/analysis/paket-d/e5-beispiele.js`)
| Lage | heute | mit Vorschlag |
|---|---|---|
| X1 Freund frei **vor dem Tor** (Blau 2 in der Zone, freier Schuss); Dribbeln sicher, erreicht aber keinen freien Schuss | Pass ⭐, Dribbeln ⭐ | Pass ⭐, Dribbeln 💭 „Dein Freund stand frei vor dem Tor – Passen war besser.“ |
| X2 Dribbeln möglich, aber wenig zweckmäßig: drei Rote vorn, Freund frei; 54 sichere Ziele, nur 13 nach vorn (um die Gegner herum) | Pass ⭐; quer/rückwärts ⭐ (nach E1) | Pass ⭐; quer/rückwärts 💭 „Ein Freund stand frei – ein Pass bringt euch weiter.“ (E3); die 13 Wege nach vorn bleiben ⭐ |
| X3 Pass **und** Dribbling gut: Freund frei im Mittelfeld, Platz nach vorn | Pass ⭐, Dribbeln ⭐ | beide ⭐ (Hilfe zeigt den Pass, Lernweg) |
| X4 Pass riskanter: Rot 1 nah am Passweg; Dribbeln nach vorn sicher | Pass 💭 („Rot 1 stand nah am Weg …“), Dribbeln ⭐; Hilfe empfiehlt Dribbeln | unverändert |

Häufigkeit in 113 Lagen:
- 44 Lagen mit freiem Freund, in 43 davon ist zusätzlich ein sicheres Vorwärts-Dribbling möglich.
- Ein „Torchance-Pass“ (Freund in der Zone mit freiem Schuss) kommt 6-mal vor. In 5 davon führt auch ein Dribbling zum freien Schuss, dort sind beide gut.

**Reicht die bestehende Unterscheidung?** Fast. Entscheidung, Ziel und Hilfe decken X2–X4 ab:
- X2 über das Ziel (E3);
- X3 über mehrere gute Entscheidungen plus Lernweg der Hilfe;
- X4 über die Passbewertung.

Es fehlt **eine** Bedingung für X1. Empfehlung:
- **E5-a:** Das Erkennen „Dribbeln war sinnvoll“ gilt, wenn ein ⭐-Dribbling nach E3 existiert.
- **E5-b, Torchance-Vorrang:** Steht ein Freund frei in der Schusszone mit freiem Tor und erreicht kein sicheres Dribbling selbst einen freien Schuss, ist Dribbeln keine gute Entscheidung. Das ist dieselbe Logik wie heute „Tor frei → Schießen“, nur eine Stufe davor.
- Eine weitergehende Rangfolge („deutlich besserer Pass“) empfehle ich **nicht**. Sie wäre schwer erklärbar und käme einer Musterlösung nahe.

**Hinweis für „Pass oder Dribbling?“ (E7 zurückgestellt):**
- Selbst mit drei Roten vor dem Ball (X2) bleibt in der Simulation ein sicherer Weg um sie herum.
- Situationen, in denen nur der Pass gut ist, entstehen deshalb ehrlich vor allem über E5-b (Freund vor dem Tor) oder über E3 (Freund frei, vorn kein Weg). Einen versperrten Weg zu „bauen“ verdeckt dagegen eher die Nachsicht der Simulation.

## 5. Zur Freigabe
1. **Bewertungsänderungen aus E1/E2/E4/E6** (Abschnitt 2):
   - Danach erzeuge ich die Referenzen neu und lege die Listen nach `historie/`.
   - Nach Freigabe ist der Merge nach `main` als technische Version **ohne neue Mission** möglich. Alternativ: gemeinsam mit „Freie Bahn!“ als V0.5.0.
2. **E3 nach Regel R2**, mit den Texten oben.
3. **E5-a und E5-b.**
4. Danach folgt die Umsetzung von E3/E5, wieder mit vollständigem Abweichungsbericht. Anschließend „Freie Bahn!“ und A4.

## 6. Risiken
- **Rechenzeit:** bei 4-facher Drosselung im Rahmen (max 89–94 ms in zwei Läufen). Ein echtes iPad habe ich nicht gemessen. Die Ergebnisse werden zwischengespeichert (begrenzter Speicher, zurückgesetzt ab 3 000 Einträgen).
- **Nachsichtige Simulation:** „Ganz nah vorbei“ ist meist sicher. D1 sagt das ehrlich und warnt über „knapp“. Folgen für das Abstandhalten kommen erst mit B5 (E7).
- **Erkennen bleibt vorerst beim alten Modell (bis E5):** In seltenen Lagen kann das Erkennen „kein Dribbelweg“ melden, obwohl die Vorausrechnung sichere Ziele findet. Die Hilfe empfiehlt dann trotzdem nur sichere Ziele. Mit E5-a wird beides einheitlich.
