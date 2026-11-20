# UX- und Produktreview V0.5.0 mit Verbesserungsplan

Stand 19.11.2026, Basis `main` (`03ec809`, V0.5.0). **Nur Review und Plan.** Keine Implementierung, kein Merge, keine Veröffentlichung. „Pass oder Dribbling?“ ist zurückgestellt.

**Grundlage:**
- Code von `app.js`, `index.html` und `content/texte.js`.
- Aufnahme eines echten Ablaufs in Chromium (iPad 1024×768, Touch) mit protokollierten Sprachaufrufen: `tests/analysis/ux-aufnahme.mjs`.
- Bildschirmfotos aus dieser Aufnahme.

Safari auf dem iPad konnte ich hier nicht direkt prüfen. Die Safari-Punkte stützen sich auf bekannte WebKit-Eigenheiten und gehören in den iPad-Test.

---

## A. Sprachausgabe und Abläufe – Befund
`Voice.say()` ruft **vor jeder Ansage `speechSynthesis.cancel()`** auf (`app.js` Z. 41). Jede neue Ansage bricht also die laufende ab, egal ob das Kind etwas getan hat oder die App nur weiterschaltet.

**Gemessen** (Zeit in ms seit Seitenstart):

| Zeit | Ereignis | Folge |
|---|---|---|
| 1003 | Karte „Freie Bahn!“: Einführung (24 Wörter) | wird nach 65 ms durch „Los geht's“ abgebrochen, weil das Kind tippt; das ist in Ordnung |
| 1068 | „Los geht's! Du spielst mit den Blauen.“ | **immer nach 64 ms abgebrochen**: `play.onclick` startet die Mission mit `setTimeout(…, 50)`, und die erste Ansage bricht ab. **Das Kind hört diesen Satz nie.** |
| 11817 | „Neue Situation! Schau genau hin.“ | nach **1,8 s** abgebrochen (fester Timer in `next()`). Bei Rate 0,95 dauert der Satz etwa 2,2 s, also fehlt das Ende. |

Weitere Stellen mit demselben Muster (Ansage, dann fester Timer, dann neue Ansage mit `cancel`):

| Stelle | Ablauf | Risiko |
|---|---|---|
| Schau-Schritt `onLookAnswer` | Antwort wird angesagt, nach **3,4 s** folgt „Jetzt entscheide …“ | Antworten mit Zusatz („… Zeig, wer frei war“) sind länger als 3,4 s und werden abgeschnitten |
| „Ball im Aus“ | Ansage, nach **2,6 s** die nächste Entscheidung | wird knapp abgeschnitten |
| „Anders probieren“ | Ansage, nach **0,9 s** die Entscheidung | wird praktisch immer abgeschnitten |
| Rückmeldung | ein langer Satz (bis 25 Wörter, etwa 8 s) | bricht ab, sobald das Kind „Weiter“ tippt; das ist richtig, ein Kind wartet aber selten 8 s |
| Gleiche Kontextansage bei jeder Entscheidung | „Ein Roter ist nah! Dribbel an ihm vorbei …“ 2–3-mal pro Situation | wirkt eintönig, „rudimentär“ |

Zwei weitere Fehler im Ablauf:
- **Geisterablauf beim Wechsel zur Übersicht:**
  - 🏠 räumt keine laufenden Timer ab. Wer innerhalb von 1,8 s nach „Weiter“ (Situationswechsel), 2,6 s (Ball im Aus) oder 0,9 s (Anders probieren) auf 🏠 tippt, löst trotzdem `beginDecision` aus.
  - Dann startet hinter dem Startbildschirm eine Entscheidung samt Ansage.
- **Wechsel ohne Ansage:** Töne (`Sfx.goal`, 1,4 s) laufen gleichzeitig mit dem Torjubel-Satz, und der Situationswechsel kommt ohne Pause.

Typische Safari-Eigenheiten (WebKit), die die aktuelle Lösung nicht abfängt:
1. `cancel()` direkt gefolgt von `speak()` lässt die neue Ansage gelegentlich fallen oder beendet sie sofort.
2. `onend` kommt manchmal nicht.
3. Nach einem Wechsel in den Hintergrund bleibt die Sprachausgabe im Pause-Zustand („paused“), ohne `resume()`.
4. Die Stimmenliste kommt verzögert; `voiceschanged` ist unzuverlässig, die ausgewählte Stimme fehlt dann beim ersten Satz.
5. Sehr lange Ansagen werden auf iOS mitunter abgeschnitten.

### Vorschlag: zuverlässige Sprachsteuerung („Sprecher“, nur `app.js`)
1. **Eine Warteschlange statt sofortigem Abbruch.**
   - `Speaker.say(text, art)` mit drei Arten:
     - **`aktion`**: Antwort auf ein Tippen des Kindes. Bricht ab und spricht sofort.
     - **`ablauf`**: Ansage, die die App selbst auslöst. Wird angehängt und spricht nach der laufenden Ansage.
     - **`hinweis`**: niedrige Priorität, z. B. die Fingerzeig-Hand. Wird verworfen, wenn etwas anderes läuft.
   - Abgebrochen wird **nur** bei einem Tippen des Kindes, bei 🏠, ↺ oder „Ton aus“.
2. **Übergänge warten auf das Satzende.**
   - Situationswechsel, „Ball im Aus“, „Anders probieren“, „Los geht's“ und der Schau-Schritt rufen `Speaker.dann(fn, { min, max })` auf. Weitergeschaltet wird, wenn die Ansage fertig ist, frühestens nach `min` (Bild muss sichtbar sein) und spätestens nach `max` (Sicherheitsnetz).
   - Damit ersetzt die Satzlänge die festen 0,9 / 1,8 / 2,6 / 3,4 s.
3. **Kurze Sätze statt langer.**
   - Die Rückmeldung wird in die Teile Ergebnis, Bewertung und Tipp zerlegt und nacheinander gesprochen.
   - Tippt das Kind „Weiter“, endet sie sauber nach dem laufenden Teil.
   - Einzelteile von höchstens etwa 12 Wörtern vermeiden die iOS-Abschnitte.
4. **Safari-Absicherung.**
   - Nach `cancel()` 80 ms warten, bevor gesprochen wird.
   - Vor jedem Sprechen `resume()`, falls „paused“.
   - Ein Wächter (Wartezeit etwa 75 ms je Zeichen plus 1,5 s) ersetzt ein fehlendes `onend`.
   - Die Stimme wird bei jedem Satz neu ermittelt, solange noch keine deutsche gefunden ist.
   - Die Sprachausgabe wird beim ersten Antippen freigeschaltet (iOS verlangt eine Nutzeraktion).
5. **Kindgerecht.**
   - Rate 0,9 (bisher 0,95), Tonhöhe 1,05 (bisher 1,1).
   - Zwischen zwei Sätzen 250 ms Pause.
   - Die volle Kontextansage gibt es **nur bei der ersten Entscheidung einer Situation**, danach eine kurze Fassung (`sayKurz`, je Mission) oder nur den Ton.
   - 🔈 (Nochmal hören) wiederholt immer die zuletzt gesprochene Anweisung, nicht nur den Kontext.
6. **Zentraler Taktgeber für Timer.**
   - Alle `setTimeout` des Ablaufs laufen über `Ablauf.nach(ms, fn)`.
   - 🏠, ↺ und Missionsende räumen ihn ab. Damit ist der Geisterablauf behoben.

## B. Navigation – Konzept
| Bedarf | Lösung | Wo |
|---|---|---|
| Mission **während des Spiels** neu starten | Knopf **↺** in der Kopfzeile neben 🏠. Er öffnet eine große Abfrage mit zwei Bildknöpfen (✔ „Nochmal von vorn“ / ✖ „Weiterspielen“), gesprochen „Willst du nochmal von vorn anfangen?“. Ein Fehltipp löst so nichts aus. **Gleicher Durchlauf, gleiche Situationen**, Spielstand und Sterne auf null. | Kopfzeile |
| Dieselbe Mission **nach Abschluss** erneut spielen | Knopf **🔁 Nochmal** mit **neuen Situationen** (nächster Durchlauf, wie heute). Bei Mission 1 (keine Durchläufe) bleibt es derselbe Ablauf. | Endbildschirm |
| **Identische** Wiederholung nach Abschluss | kleiner Zweitknopf „↺ Genau so nochmal“ (gleicher Durchlauf), nur bei Missionen mit Durchläufen. Für Kinder ist „Nochmal“ = Abwechslung der Standard. | Endbildschirm, unauffällig |
| Direkt zur **nächsten Mission** | großer Hauptknopf **▶ Nächste: 🏃 Freie Bahn!** mit Symbol und vorgelesenem Titel. Reihenfolge laut Lernpfad, nach der letzten Mission wieder die erste. Startet direkt mit der Einführung, ohne Umweg über die Übersicht. | Endbildschirm |
| Zur **Missionsübersicht** | 🏠 (wie heute, plus Timer-Abräumen). Im Spiel ohne Abfrage, weil nichts gespeichert wird. Die zuletzt gespielte Karte ist vorausgewählt und trägt in dieser Sitzung ein Häkchen („✓ gespielt“). | Kopfzeile, Endbildschirm |
| Szenen ansehen | bleibt als kleiner Knopf 🎬 | Endbildschirm |

Begriffe in der App: „Nochmal von vorn“ = identisch, „Nochmal“ = neue Situationen, „Nächste Mission“. Das Konzept braucht keine Konten und speichert nichts (Leitplanke).

## C. Spielqualität „Freie Bahn!“ – ehrliche Bewertung
| Frage | Befund |
|---|---|
| Wie abwechslungsreich sind die Entscheidungen? | **Nur die erste Entscheidung jeder Situation ist eine echte Wahl** (ausweichen, Lücke oder außen herum). Danach läuft der Rote 1,4 m hinterher, und die nächsten 1–2 Dribblings sind „geradeaus Richtung Tor tippen“. Von 10–12 Entscheidungen je Durchlauf sind etwa 6 Routine. |
| Erlebt das Kind, dass es einen Gegner ausgespielt hat? | **Nein.** Es gibt keinen Moment „vorbei!“: kein Ereignis, kein Ton, kein Satz. Der Gegner bleibt sichtbar dicht hinter dem Ball, das Bild sagt eher „verfolgt“ als „ausgespielt“. |
| Sind die Gegnerreaktionen überzeugend? | **Nur bedingt.** Der Rote läuft auf 1,4 m heran und bleibt dort stehen. Er greift nie an und versperrt keinen Weg vorausschauend. Ein Gegner, der nicht reagiert, erzeugt keine Spannung. (Zweikampf = B5, zurückgestellt.) |
| Sind die Lückensituationen visuell unterscheidbar? | Geometrisch ja (10 m vs. 2,8 m). Das Bild **erklärt** es aber nicht. Nach dem Ballverlust in B6 heißt es „Dribbel weiter weg von Rot 1“, nicht „Die Lücke war zu eng“. B2 und B6 sehen auf dem großen, leeren Feld ähnlich aus. |
| Wirken die Dribblings repetitiv? | **Ja.** Jede Entscheidung, auch ein Routine-Dribbling mit ⭐, öffnet das volle Rückmeldeblatt mit langem Satz und Knopf „Weiterspielen“. Dazu kommt bei jeder Entscheidung dieselbe Kontextansage. Mit 1 gegen 1 auf dem ganzen Feld und Startpunkten bei x = 12–18 sind bis zum Tor 2–3 gleichförmige Tipps nötig. |
| Bildwirkung | Kleine Spielerkreise (≈ 40 px) auf einem großen leeren Feld, keine Laufanimation; der Ball klebt als Punkt am Spieler. Für 1 gegen 1 wirkt das Feld leer, der Abstand zum Tor groß. |

Wie die Mission interessanter wird, **ohne das Lernziel zu verwässern** (umgesetzt in Plan 1 und 2):
1. **Nur die Entscheidung, die zählt:**
   - Die Startlagen rücken näher ans Geschehen. Die Kernentscheidung (vorbei, Lücke oder außen herum) ist die erste, danach folgen höchstens ein Dribbling und der Schuss.
   - Das ist eine Datenänderung.
2. **„Ausgespielt!“-Moment:**
   - Passiert der Ballführende einen Roten, der vorher zwischen ihm und dem Tor stand, gibt es ein Ereignis: Satz „Du hast Rot 1 ausgespielt!“, Ton und kurzer Effekt am Gegner.
   - Gezählt wird das im Endbildschirm: „2 Gegner ausgespielt“.
3. **Lücke erklären:**
   - Im Rückmeldebild zeigt eine Linie zwischen den beiden Roten die Lücke, grün (breit genug) oder rot (zu eng).
   - Text: „Die Lücke war zu eng – außen herum war frei.“
4. **Kurze Rückmeldung für Routine-⭐** (siehe D): Der Fluss bleibt erhalten.
5. **Später mit B5:** Der Rote greift an, wenn man zu nah vorbeidribbelt. Erst dann entsteht echte Spannung „schaffe ich es vorbei?“.

## D. Visuelle und spielerische Qualität – Befund und Vorschläge
| Bereich | Befund | Vorschlag |
|---|---|---|
| Rückmeldung | volles Blatt bei jeder Entscheidung, Text-Chips („💡 Gute Idee“, „🎯 Weg frei“) können Fünfjährige nicht lesen | **Kurzrückmeldung** bei ⭐ ohne Situationsende: großer Stern fliegt in die Leiste, Ton, ein kurzer Satz („Super!“, „Ausgespielt!“), automatisch weiter nach Satzende bzw. ≥ 1,2 s; Antippen überspringt. Volles Blatt nur bei 💭, Tor oder Ende der Situation. Die Chips werden Bildzeichen (✔/✖ mit Symbol), der Text dazu nur für Eltern. |
| Kopfzeile | Fortschritt als Punkte je Entscheidung (⚽ • • 🛡️) ist für Kinder nicht lesbar; bei „Freie Bahn!“ bis zu 12 Punkte | Fortschritt **je Situation** (3 große Felder mit Symbol: Tor / Lücke / …), gefüllt mit dem Ergebnis (⚽ Tor, ⭐ Sterne) |
| Endbildschirm | Sterne je Entscheidung (Mission 1: 6, Freie Bahn: bis 12), dazu eine Textliste | **Pro Situation** ein Pokal-Feld mit Sternen; Liste nur für Eltern ausklappbar. Gleiche Darstellung in allen Missionen. |
| Spieler und Ball | kleine Kreise, keine Bewegungsanimation | Spieler um etwa 25 % größer, leichte Laufbewegung (Wippen) und Blickrichtung; Ball rollt sichtbar vor dem Fuß; kurzer Bewegungsschweif beim Dribbling |
| Spielfeld bei Lernmissionen | ganzes Feld, viel Leere bei 1 gegen 1 | **Bildausschnitt** auf die angreifende Hälfte (etwa 60 % des Felds) bei Situationsmissionen; Schusszone dezent markiert |
| Einzelaktion | Bei „Freie Bahn!“ stehen „Dribbeln“ und „✖ Zurück“ da, obwohl es nur eine Aktion gibt | Bei nur einer Aktion keine Knopfleiste; Hinweis „Tippe aufs Feld“ mit Hand-Animation |
| Situationswechsel | nur Text „🔄 Neue Situation“ | kurzer Übergang (Feld blendet, Spieler laufen in 0,6 s auf ihre Plätze), Ansage wird zu Ende gesprochen |
| Motivation | Tor-Banner vorhanden, sonst wenig Belohnung | Konfetti beim Tor, „Ausgespielt“-Zähler, in der Sitzung ✓ auf der Missionskarte; **keine** Speicherung und keine Bestenlisten |

---

## E. Verbesserungsplan
Aufwand S ≤ ½ Tag · M ≈ 1–2 Tage · L > 2 Tage (Entwicklungszeit mit Tests).

### 1. Unmittelbar notwendig – V0.5.1
| # | Maßnahme | Nutzen | Aufwand | Auswirkung auf Missionen | Tests |
|---|---|---|---|---|---|
| 1.1 | **Sprachsteuerung** neu (Warteschlange, Abbruch nur bei Kind-Aktion, Übergänge warten auf Satzende, Safari-Absicherung, Rate 0,9) | Ansagen werden nicht mehr abgeschnitten, „Los geht's“ ist hörbar, Übergänge sind nachvollziehbar | M | alle; **kein Text geändert**. Die Mitschriften erfassen gesprochene Sätze und bleiben gleich; die Reihenfolge ist zu prüfen. Zeitpunkte ändern sich. | Unit-Test mit nachgebauter Sprachausgabe (Dauer, fehlendes `onend`, „paused“): kein Satz durch die App abgebrochen; e2e: Zeitstrahl der Ansagen ohne Abbruch bei Situationswechsel, Ball im Aus, Anders probieren, Schau-Schritt; iPad-Prüfliste für Safari |
| 1.2 | **Taktgeber für Timer**, 🏠 räumt ab | kein Geisterablauf hinter dem Startbildschirm | S | alle, Verhalten nur beim Abbrechen | e2e: 🏠 während Situationswechsel, Ball im Aus und Anders probieren → keine weitere Ansage, kein Moduswechsel |
| 1.3 | **↺ Neu starten** im Spiel (kindersichere Abfrage) | vollständiger Neustart ohne Umweg | S | alle; neuer Knopf | e2e Touch: ↺ → Abfrage → ✔ startet denselben Durchlauf, Stand 0:0; ✖ spielt weiter; Fehltipp ohne Folgen |
| 1.4 | **Endbildschirm:** „▶ Nächste Mission“ (Haupt), „🔁 Nochmal“ (neue Situationen), „↺ Genau so nochmal“ (klein), 🏠, 🎬 | direkter Übergang, klare Wiederholung | S | alle; Endbildschirm | e2e: Kette aller drei Missionen über „Nächste“; Nochmal = nächster Durchlauf; Genau so = gleicher Durchlauf; alle Knöpfe ohne Scrollen erreichbar (iPad quer/hoch, Handy) |
| 1.5 | **Einzelaktion ohne Knopfleiste** („Tippe aufs Feld“) | weniger Verwirrung in „Freie Bahn!“ | S | nur Missionen mit einer Aktion („Freie Bahn!“, Abschluss ohne Mitspieler) | e2e Freie Bahn; Mitschrift „Freie Bahn!“ ändert sich in der Aktionsliste → Abweichung vorlegen |

V0.5.1 enthält **keine Bewertungs- und keine Engine-Änderung**. Die Referenzen der Engine bleiben gleich. Oberflächen-Mitschriften ändern sich nur bei 1.5 (Freie Bahn); diese Abweichung wird vorgelegt.

### 2. Nächste Stufe – V0.6 (vor „Pass oder Dribbling?“)
| # | Maßnahme | Nutzen | Aufwand | Auswirkung | Tests |
|---|---|---|---|---|---|
| 2.1 | **Kurzrückmeldung** für ⭐ ohne Situationsende, volles Blatt bei 💭/Tor/Ende | Spielfluss, weniger „Weiterspielen“-Tippen (Freie Bahn: von ~11 auf ~5 je Durchlauf) | M | alle Missionen, Oberfläche; „Anders probieren“ und „Vergleichen“ bleiben über das volle Blatt erreichbar | e2e je Mission; Mitschriften neu (vorlegen); Test: bei 💭 immer volles Blatt |
| 2.2 | **Kurze Kontextansage** nach der ersten Entscheidung einer Situation (`sayKurz`) | weniger Wiederholung, lebendiger | S | Texte aller Missionen (Daten) | Mitschriften (vorlegen); Test: erste Entscheidung volle Ansage, danach kurz |
| 2.3 | **„Freie Bahn!“ neu getaktet:** Startlagen näher, Kernentscheidung zuerst, danach ≤ 1 Dribbling + Schuss | mehr echte Entscheidungen, weniger Routine | S (Daten) | nur „Freie Bahn!“; Referenzen neu (vorlegen) | bestehende Situations-, Robustheits- und Hilfe-Tests; neu: Anteil der ersten Entscheidungen mit echter Wahl |
| 2.4 | **„Ausgespielt!“-Ereignis** (Engine: Roter stand zwischen Ball und Tor und ist danach hinter dem Ball) mit Satz, Ton, Effekt, Zähler | Erfolgserlebnis, Lernziel „Gegner umgehen“ sichtbar | M | Engine-Ereignis ohne Bewertungsänderung; neue Rückmeldetexte bei Dribblings in allen Missionen (Mission 1 vereinzelt) | Eigenschaftstest: Ereignis genau dann, wenn die Geometrie zutrifft; Mitschriften (vorlegen) |
| 2.5 | **Lücken-Erklärung** (Linie zwischen den Roten im Rückmeldebild, Text „Die Lücke war zu eng …“) | B6 wird verständlich | S–M | Text bei Dribbling durch zwei nahe Gegner in allen Missionen | Test: Text genau bei Weg zwischen zwei Roten mit Abstand < 3 m; Sichtprüfung |
| 2.6 | **Fortschritt und Endbildschirm je Situation** (Pokal-Felder, Eltern-Liste ausklappbar) | Orientierung ohne Lesen, einheitlich | M | alle Missionen, Oberfläche | e2e je Mission; Erreichbarkeit der Knöpfe |
| 2.7 | **Bildsprache:** größere Spieler, Laufwippen, rollender Ball, Bildausschnitt für Situationsmissionen, Übergang beim Situationswechsel | lebendiger, klarer | M–L | alle, nur Darstellung | Bildschirmfotos als Sichtreferenz; Rechenzeit/FPS bei 4× Drosselung; Tippziele (Koordinaten) weiter korrekt |
| 2.8 | **Rückmelde-Chips als Bildzeichen**, Text nur für Eltern | kindgerecht | S | alle | Mitschriften (vorlegen) |

Reihenfolge: 2.1 + 2.2 + 2.3 zuerst (größter Effekt gegen Eintönigkeit), danach 2.4/2.5 (Lernziel sichtbar), dann 2.6–2.8.

### 3. Später, mit den nächsten Missionen
| # | Maßnahme | Nutzen | Aufwand | Wann |
|---|---|---|---|---|
| 3.1 | **Zweikampfregel (B5-mini):** Roter greift an, wenn man zu nah vorbeidribbelt | echte Spannung, Abstand halten hat Folgen | M (Engine) + Abweichungsbericht Mission 1/A | mit „Pass oder Dribbling?“ (dort fachlich nötig) |
| 3.2 | **Aufgenommene Sprecherstimme** (MP3 je fester Satz, Bausteine für „Rot 1“, „Blau 2“) mit Sprachausgabe als Rückfall | deutlich hochwertigerer Klang, gleich auf allen Geräten | L (Texte festlegen, Aufnahme, Offline-Cache ~2–4 MB) | sobald die Texte stabil sind, nach V0.6 |
| 3.3 | **Mitspieler- und Gegnerverhalten** (Paket B: Freilaufen, Absichern) | Grundlage für „Spiel mich an!“ und „Zusammen verteidigen!“ | L | mit diesen Missionen |
| 3.4 | **Rahmen und Figuren:** eigenes Team (Name und Farbe wählen, nur für die Sitzung), kleines Turnier über die Missionen | Motivation, Wiedererkennung | M–L | nach dem Katalog mit 4–5 Missionen |
| 3.5 | **Bewegte Startlagen** (Gegner läuft schon an) und Zeitgefühl | mehr Spiel, Timing lernen | M (Engine-Daten) | mit „Pass oder Dribbling?“/„Spiel mich an!“ |
| 3.6 | **Elternbereich** (Sprechtempo, Lautstärke, Hilfe aus/an), ohne Konto | Anpassung an das Kind | S–M | bei Bedarf nach dem nächsten Praxistest |

## Empfehlung
1. **V0.5.1 jetzt:** 1.1–1.5. Das ist reine App-Logik, die Bewertung bleibt unverändert, Ergebnis nach etwa 2–3 Entwicklungstagen.
2. **iPad-Test V0.5.1** mit einer Prüfliste: Sprachausgabe nicht abgeschnitten, nach Hintergrundwechsel weiter hörbar, Navigation.
3. **V0.6:** 2.1–2.5 als Paket „Spielfluss und Freie Bahn“, danach 2.6–2.8 „Bildsprache“.
4. Danach „Pass oder Dribbling?“ mit 3.1.

## Zur Entscheidung
1. Umfang **V0.5.1** wie unter 1.1–1.5?
2. Navigation: „Nochmal“ = neue Situationen, „Genau so nochmal“ als kleiner Zweitknopf – einverstanden?
3. Neustart im Spiel mit kindersicherer Abfrage (✔/✖) – einverstanden, oder ohne Abfrage?
4. Für V0.6: Kurzrückmeldung für ⭐ in **allen** Missionen oder zunächst nur in „Freie Bahn!“?
