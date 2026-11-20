# QS nach dem Kindertest V0.6.0 – Veränderung wahrnehmen, Ursache verstehen

Stand: 20.11.2026, gemessen an V0.6.0 (live, `1335fd9`). Werkzeug: `node tests/analysis/v0.6/qs-wahrnehmung.js`.
Je Situation wurden die Entscheidung der Hilfe, alle Schüsse und Pässe sowie 16 Dribbelziele simuliert, zusammen 290 Entscheidungen. Gemessen wurde jeweils:
- ob danach eine **neue Handlungsmöglichkeit** besteht (Tor frei, Pass frei, Gegner überwunden, Schusszone erreicht),
- ob die Rückmeldung sie nennt,
- ob sie auf dem Feld sichtbar gemacht wird,
- wie stark sich die Gegner bewegen.

## Ergebnis des Kindertests
- Handlungsmöglichkeiten erkennen: ja.
- Motivation: ja.
- Veränderung wahrnehmen: teilweise.
- Ursache verstehen: teilweise.

**Kurzbefund:** Die Simulation erzeugt die Veränderungen fast immer. Sie werden dem Kind aber oft weder **gezeigt** noch **benannt**, und zwar genau in dem Moment, in dem sie entstehen. Am deutlichsten ist das in W1 („nochmal schauen“), dem einzigen Lernziel, das sich direkt um Veränderung dreht.

## Befunde nach Ursache

### A. Unzureichende Konsequenzen in der Simulation
| Situation | Befund (gemessen) |
|---|---|
| Mission 1, Freilaufen | 84 Laufwege getestet, darunter alle guten („Jetzt bist du anspielbar“). Der Ball bleibt **immer** bei Blau 2: Blau 2 dribbelt selbst und spielt nie den Pass zum Freigelaufenen. Die gute Entscheidung hat damit keine erlebbare Folge. |
| Freie Bahn, alle Lagen | Der Torwächter steht fest vor einem Tor. Der eigene Dribbelweg ändert nicht, welches Tor am Ende frei ist (B3, V1: kein Tor öffnet oder schließt sich). Die Torwahl ist darum vom Weg dorthin entkoppelt und wird zur Routine (33 % Routine, fast alle im Abschluss). |
| Welches Tor ist frei? W1/W1m | Die Konsequenz ist da: Nach dem Dribbling (Hilfe) ist das vorher freie Tor zu. Ursache ist aber eine **Mischung** aus Wächterbewegung (3,2 m) und dem eigenen neuen Schusswinkel. Deshalb darf die Rückmeldung nicht „Rot 2 ist rübergelaufen“ sagen; das wäre nicht belegt. |

### B. Schwer wahrnehmbare Bewegungen oder Veränderungen
- **Zeitgleich mit dem eigenen Spieler:** Die Gegner bewegen sich bei Dribblings im Median 3–4 m (≈ 70–95 px auf dem iPad), aber gleichzeitig mit dem eigenen Spieler und in 1,2–2,1 s. Der Blick des Kindes folgt dem Ball.
- **Feld springt beim Öffnen der Rückmeldung:** Das Rückmeldeblatt verkleinert das Feld auf dem iPad um ca. 22 % und verschiebt es (Bildschirmfotos V0.6a). Genau in diesem Moment soll das Kind die Folge betrachten.
- **Vorher/Nachher nur in Einzelfällen:** Der Wächter-Schatten erscheint nur bei der belegten Ursache „Wächter verschoben“. In W1 ist das nach der Hilfe-Entscheidung nie der Fall (0 von 12 guten Dribblings). Ein neu frei gewordenes oder zugegangenes Tor wird **nirgends** markiert.
- **„Vorbei!“-Moment fehlt oft:** In V1 erscheint er nur bei 3 von 9 guten Wegen. Die Erkennung „überspielt“ verlangt, dass Blau weiter vorn steht als der Gegner **am Anfang** stand; kommt der Gegner entgegen, fehlt der Moment. Die Aufgabenbewertung erkennt „vorbei“ dagegen in 9 von 9 Fällen.

### C. Unverständliche oder ungünstig platzierte Rückmeldungen
| Situation | Befund |
|---|---|
| **B3/B3m** (Gegner hinter dir) | Die **Ansage widerspricht der Lage**: „Ein Roter ist nah! Dribbel an ihm vorbei – Richtung Tor.“ Der Rote steht aber hinter dem Kind. Das Lernziel „Platz vor dir“ wird so verdeckt. |
| **W1/W1m** nach dem Dribbling | Die Rückmeldung lautet „Super! Vor dir war Platz!“; das jetzt zugestellte Tor wird nicht erwähnt. Danach kommt dieselbe Frage wie überall („Welches Tor ist frei? Schießen oder passen?“), ohne Hinweis, dass sich etwas geändert hat. Das Lernziel „nochmal schauen“ wird nicht ausgelöst. |
| **A3/A3m** nach dem Pass | „Der Weg zu Blau 2 war frei.“ Dass für Blau 2 **jetzt ein Tor frei ist** (die neue Möglichkeit), wird nicht gesagt (2 von 2). |
| **V1, B5** | 6 von 9 (V1) bzw. 10 von 10 (B5) guten Entscheidungen werden nur mit dem allgemeinen „Super! Vor dir war Platz!“ bestätigt. |
| **Torschüsse** | Fast immer derselbe Satz: „Vor dem anderen Tor stand Rot 2 – du hast das freie gewählt.“ Er erklärt die Wahl, nicht die Veränderung. |

### D. Schwächen des Lernaufbaus
- **„Nochmal schauen“ steht nur am Ende** (W1, 1 von 4 Situationen), ohne vorbereitende Situation, in der eine Veränderung zuerst *gezeigt* wird. Das Kind bekommt das Prinzip ohne Anleitung erst in der schwersten Lage.
- **Zusammenhang der Entscheidungen fehlt in „Freie Bahn!“:** Es gibt keine Situation, in der der eigene Weg die nächste Wahl verändert (vgl. A). Die Abfolge „vorbei → Torwahl“ besteht aus zwei unabhängigen Aufgaben.
- **Ja-Bestätigung ohne Vergleich:** Es gibt bei Erfolg keinen Moment „vorher – jetzt“. „Vergleichen“ erscheint nur nach zwei Versuchen derselben Entscheidung.

## Schaffen eigene Entscheidungen neue Handlungsmöglichkeiten – und wird das sichtbar?
| Situation | Neue Möglichkeit entsteht (gute Entscheidungen) | Genannt | Sichtbar gemacht |
|---|---|---|---|
| A3/A3m (Pass) | 2/2 (Tor frei für Blau 2) | 0/2 | 0/2 |
| W1/W1m (Dribbling) | Torlage ändert sich (Hilfe: Tor zu) | 0/12 | 0/12 |
| V1/V1m | 9/9 (Gegner überwunden) | 3/9 | 3/9 |
| L4e/L4em | 4/5 | 1/5 | 1/5 |
| L4b/L4bm | 3/3 | 3/3 | 3/3 |
| B3/B3m, B5 | Schusszone erreicht (1/11, 4/10) | nur allgemein | – |
| Mission 1 Freilaufen | anspielbar ja, Ball kommt nie | allgemein | – |

## Maßnahmen (priorisiert)
| # | Maßnahme | Art | Pädagogischer Nutzen | Aufwand | Risiken |
|---|---|---|---|---|---|
| **1** | **Ansagen an die tatsächliche Lage koppeln:** B3-Ansage „Der Rote ist hinter dir – vor dir ist Platz!“ (statt „Dribbel an ihm vorbei“). Nach einer Veränderung der freien Tore seit der letzten Entscheidung fragt das Spiel „Schau nochmal: Welches Tor ist **jetzt** frei?“. | Rückmeldung / Lernaufbau | **hoch.** Behebt einen inhaltlichen Widerspruch und löst das Lernziel W1 tatsächlich aus. | **S** (Texte + Kontextbedingung aus vorhandenen Daten) | gering; Text- und Mitschriftabweichungen (vorlegen) |
| **2** | **Neue Möglichkeit benennen (Zustandssatz statt Ursache):** „Jetzt ist das untere Tor frei!“, „Jetzt kann Blau 2 schießen!“, „Jetzt ist das obere Tor zu!“. Das ist ein reiner Vorher/Nachher-Vergleich der Lage, also immer belegt. Dazu „vorbei“ mit demselben Kriterium wie die Aufgabenbewertung erkennen (V1 9/9 statt 3/9). | Rückmeldung | **hoch.** Verbindet Entscheidung und neue Möglichkeit sprachlich (Kriterium „Ursache verstehen“). | **S** | Sätze werden länger, daher Vorrangregel: höchstens ein Zustandssatz. Bewertung bleibt unverändert. |
| **3** | **Folge-Moment vor der Rückmeldung:** Das Endbild bleibt ca. 1 s in voller Größe, mit Spur „von wo nach wo“ für Gegner, die sich ≥ 1 m bewegt haben, und Markierung „Tor jetzt frei ✓ / jetzt zu ✗“. Danach öffnet sich das Blatt, **ohne das Feld zu verkleinern** (Überlagerung am Rand). | Wahrnehmbarkeit / Platzierung | **hoch.** Kriterium „Veränderung wahrnehmen“: Die Veränderung wird gezeigt, bevor geredet wird. | **M** (Darstellung, Ablauf über `sprache.js`-Taktgeber, Layout iPad/Handy) | ca. 1 s mehr je Entscheidung. Blatt darf nichts Wichtiges verdecken. Viele Mitschrift-Abweichungen. |
| **4** | **Mission 1: Freilaufen mit echter Folge:** Gutes Freilaufen führt zum Pass an den Freigelaufenen (statt Dribbling von Blau 2). | Simulation | mittel bis hoch für Mission 1 („meine Entscheidung bewirkt etwas“) | **M** | Ist bereits Teil des freigegebenen Konzepts V0.6c (Mission-1-Überarbeitung), dort umsetzen. Verhaltensänderung bedeutet Referenzwechsel Mission 1. |
| **5** | **Zusammenhängende Lernsituation:** Ein Torwächter reagiert auf die Dribbelrichtung, d. h. der eigene Weg entscheidet, welches Tor frei wird. Dazu eine vorbereitende „Schau, was passiert“-Lage vor W1. | Simulation / Lernaufbau | hoch (Strategie-Leitlinie: eigene Entscheidung verändert Gegner, dadurch neue Möglichkeiten; Transfer) | **M–L** | Neue Spielmechanik, braucht Produktentscheidung. Robustheit und Routine sind neu zu messen. Überschneidet sich mit P6 und V0.6b. |

## Empfehlung für das nächste Entwicklungspaket
**Paket „Wahrnehmung“ (Vorschlag V0.6d) = Maßnahmen 1 + 2 + 3, vor V0.6b und V0.6c.**
- Die drei Maßnahmen zielen direkt auf die beiden Kriterien, die im Kindertest nur „teilweise“ erfüllt waren. Sie setzen bei den Befunden B und C an, die die meisten Fälle betreffen.
- Es gibt **keine neue Spielmechanik**, die Bewertung bleibt unverändert, alle Aussagen sind aus der Simulation belegbar. Damit ist das Risiko gering und der Nutzen schnell im nächsten Kindertest überprüfbar: dieselben vier Fragen, dazu „Was hat sich verändert?“ nach W1 und A3.
- Maßnahme 4 gehört in V0.6c, Maßnahme 5 ist der Einstieg in die neue strategische Leitlinie und sollte danach als eigenes Konzept vorgelegt werden.
- Messbare Abnahmekriterien (Vorschlag):
  - In W1, A3 und V1 nennt jede gute Entscheidung die entstandene Möglichkeit.
  - Jede Veränderung der freien Tore ist vor der Rückmeldung markiert.
  - Das Feld verkleinert sich beim Öffnen der Rückmeldung nicht.
  - 0 widersprüchliche Ansagen (Prüfung Ansage ↔ Lage für alle Situationen).
