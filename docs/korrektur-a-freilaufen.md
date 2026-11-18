# Korrektur A – Freilaufen: Rückmeldung, Etikett und Erklärbild (V0.3.1)

**Fachlich freigegeben vom Product Owner (18.11.2026)**, einschließlich K1. Merge und Veröffentlichung als V0.3.1 werden gesondert freigegeben.
Grundlage: Analyse vom 18.11.2026, Freigabe „A“ durch den Product Owner.

## Änderungshistorie
| Schritt | Commit | Inhalt |
|---|---|---|
| 1 | 7330a9d | Texte, Etiketten, Erklärbild; Ergebnis aus der Lage am Szenenende; Abweichungen vorgelegt |
| 2 | a660e8f | K1: Hilfe beim Freilaufen mit Vorausrechnung; Abweichungen neu vorgelegt |
| 3 | (dieser Stand) | Referenzen `mission1.v0.3.1.json` und `ui-transcript.v0.3.1.json` erzeugt und vollständig gegen die vorgelegten Listen geprüft; Listen und Vorgänger unter `tests/golden/historie/` |

**Abschlussprüfung:**
- **Engine-Referenz:** Gegenüber v0.3.0 sind ausschließlich die vorgelegten Abweichungen enthalten: feste Abläufe „musterweg“ und „geblockt“, Hilfe-Durchlauf und 101 Kinder-Abfolgen.
- **Oberflächen-Mitschrift:** genau die 2 vorgelegten Einträge.
- **Sterne und Bewertungsregeln:** In den 115 geänderten Entscheidungen hat sich kein Stern und keine Wertung von Entscheidung oder Ziel geändert. Zusätzlich habe ich die Bewertung von v0.3.0 und V0.3.1 unabhängig verglichen, über alle Kinder-Entscheidungen und ein Raster von Freilauf-Zielen: 17 496 Bewertungen, 0 Abweichungen bei Stern, Entscheidung, Ziel-Wertung oder Entscheidungstext.

## Was gleich bleibt
- **Bewertung:** Entscheidung, Ziel und Stern sind in allen 112 betroffenen Entscheidungen von Mission 1 unverändert (Stern / Entscheidung / Ziel: 0 / 0 / 0 Änderungen).
- **Spielverlauf:** überall unverändert (keine Abfolge, kein fester Ablauf).
- **Vor der Entscheidung** wird nichts zusätzlich gezeigt. Laufpfeil und Passlinie erscheinen erst im Rückmeldebild nach der Aktion.

## Was sich ändert
1. **Grund „zu weit“ statt „Passweg versperrt“.**
   - Liegt das Ziel mehr als 15 m vom Ball entfernt, lautet der Grund: „Das ist zu weit weg vom Ball – dort kann dich dein Freund schwer erreichen.“
   - Kein Gegner wird hervorgehoben, es wird keine Passlinie gezeigt.
   - Reihenfolge der Gründe: Gegner am Ziel → zu nah → zu weit → Passweg versperrt.
2. **Das Ergebnis kommt aus der tatsächlichen Lage am Ende der Szene.** Das ist genau das Bild, das das Kind sieht, und die Lage seiner nächsten Entscheidung. Vorher folgte die Aussage „Super! Du bist frei“ direkt aus der Bewertung.

   | Fall (Laufziel selbst war in Ordnung) | Ergebnis (gesprochen) |
   |---|---|
   | am Ende anspielbar | „Super! Jetzt bist du anspielbar.“ bzw. „Super! Du bist frei – und dein Freund nutzt den Platz und dribbelt nach vorne.“ (wie bisher) |
   | am Ende nicht anspielbar | **neu:** „Jetzt steht Rot N im Passweg.“, falls der Ballführende losdribbelt zusätzlich „Dein Freund dribbelt dafür nach vorne.“ |
   | bei der Entscheidung versperrt, am Ende frei | **neu:** „Jetzt ist der Weg zu dir frei.“ Begründung **neu:** „Als du losgelaufen bist, stand ein Gegner im Passweg.“ |
   | Laufziel ungünstig (Gegner dort / zu nah / zu weit) | „Dort ist es schwer, angespielt zu werden.“ (wie bisher) |

   Gibt es einen Stern, das Ergebnis klappt aber nicht, folgt die bestehende Rückmeldung „Das war trotzdem eine gute Idee! Manchmal klappt es nicht.“ So bleibt „Entscheidung ≠ Ergebnis“ gewahrt: Der Stern bewertet die Idee und das Laufziel, das Ergebnis beschreibt, was danach passiert ist.
3. **Etiketten** („🎯 …“ im Rückmeldefeld):

   | Fall | Etikett |
   |---|---|
   | Laufziel gut | **Guter Platz** (bisher „Weg frei“, was bei zugestelltem Passweg falsch war) |
   | Gegner am Ziel | **Gegner dort** (bisher „Gegner im Weg“) |
   | zu nah | **Zu nah am Ball** (bisher „Gegner im Weg“) |
   | zu weit | **Zu weit weg** (bisher „Gegner im Weg“) |
   | Passweg versperrt | **Passweg zu** (bisher „Gegner im Weg“) |

4. **Erklärbild** (nur nach der Entscheidung):
   - **Laufpfeil:** grün, wenn das Laufziel gut war, auch wenn der Passweg zu war; rot nur, wenn das Laufziel selbst ungünstig war (Gegner dort, zu nah, zu weit). Bisher war er bei jedem fehlenden Stern rot.
   - **Passlinie** Ball → Läufer: grün, wenn der Läufer im gezeigten Bild anspielbar ist, rot, wenn nicht. Bisher wurde nur eine rote Linie gezeigt, und nur ohne Stern. Die Linie verbindet die Spieler genau dort, wo sie im Bild stehen. Bei ungünstigem Laufziel oder nach Ballverlust erscheint keine Passlinie.
   - **Markierter Gegner:** der Gegner, der im Ergebnistext genannt wird (im Passweg); bei „Gegner dort“ der Gegner am Ziel; bei „zu weit“ und „zu nah“ keiner.

## Auswirkungen auf Mission 1
- Engine-Referenz: 115 Entscheidungen.
  - 112 Freilauf-Entscheidungen in 101 von 200 Abfolgen sowie in den festen Abläufen „musterweg“ und „geblockt“; dort ändern sich nur Ergebnistext, Etikett und Erklärbild.
  - Im **Durchlauf mit der Hilfe** ändert sich der Spielverlauf ab Schritt 2 (K1, siehe unten). Alle Sterne bleiben gleich.
  - Vorgelegt in `tests/golden/abweichungen-a.json`.
- Oberflächen-Mitschrift: 2 Einträge (Ablauf „Rest mit Hilfe“): Hilfetext mit Warnhinweis und Ergebnis „Jetzt steht Rot 2 im Passweg“. Vorgelegt in `tests/golden/abweichungen-a-ui.json`.

### Gesprochene Rückmeldung vorher → nachher (alle 112 Entscheidungen, zusammengefasst)
| Anzahl | vorher | nachher |
|---|---|---|
| 65 | Dort ist es schwer, angespielt zu werden. Gute Idee, dich freizulaufen! Aber schau mal: Von dort war der Passweg versperrt. | Dort ist es schwer, angespielt zu werden. Gute Idee, dich freizulaufen! Aber schau mal: Das ist zu weit weg vom Ball – dort kann dich dein Freund schwer erreichen. |
| 11 | Super! Du bist frei – und dein Freund nutzt den Platz und dribbelt nach vorne. Super gemacht! | Jetzt steht Rot 2 im Passweg. Dein Freund dribbelt dafür nach vorne. Das war trotzdem eine gute Idee! Manchmal klappt es nicht. |
| 10 | Super! Jetzt bist du anspielbar. Super gemacht! | gleich (nur Etikett und Erklärbild geändert) |
| 8 | Dort ist es schwer, angespielt zu werden. Gute Idee, dich freizulaufen! Aber schau mal: Dort stand schon ein Gegner. | gleich (nur Etikett und Erklärbild geändert) |
| 3 | Dort ist es schwer, angespielt zu werden. Gute Idee, dich freizulaufen! Aber schau mal: Von dort war der Passweg versperrt. | Jetzt steht Rot 2 im Passweg. Dein Freund dribbelt dafür nach vorne. Gute Idee, dich freizulaufen! Aber schau mal: Von dort war der Passweg versperrt. |
| 3 | Dort ist es schwer, angespielt zu werden. Gute Idee, dich freizulaufen! Aber schau mal: Von dort war der Passweg versperrt. | Jetzt steht Rot 1 im Passweg. Dein Freund dribbelt dafür nach vorne. Gute Idee, dich freizulaufen! Aber schau mal: Von dort war der Passweg versperrt. |
| 2 | Super! Jetzt bist du anspielbar. Super gemacht! | Jetzt steht Rot 1 im Passweg. Das war trotzdem eine gute Idee! Manchmal klappt es nicht. |
| 2 | Super! Jetzt bist du anspielbar. Super gemacht! | Jetzt steht Rot 3 im Passweg. Das war trotzdem eine gute Idee! Manchmal klappt es nicht. |
| 2 | Dort ist es schwer, angespielt zu werden. Gute Idee, dich freizulaufen! Aber schau mal: Von dort war der Passweg versperrt. | Jetzt steht Rot 1 im Passweg. Gute Idee, dich freizulaufen! Aber schau mal: Von dort war der Passweg versperrt. |
| 2 | Dort ist es schwer, angespielt zu werden. Gute Idee, dich freizulaufen! Aber schau mal: Von dort war der Passweg versperrt. | Jetzt ist der Weg zu dir frei. Gute Idee, dich freizulaufen! Aber schau mal: Als du losgelaufen bist, stand ein Gegner im Passweg. |
| 1 | Super! Du bist frei – und dein Freund nutzt den Platz und dribbelt nach vorne. Super gemacht! | gleich (nur Etikett und Erklärbild geändert) |
| 1 | Dort ist es schwer, angespielt zu werden. Gute Idee, dich freizulaufen! Aber schau mal: Das war zu nah am Ball – dein Freund braucht Platz. | gleich (nur Etikett und Erklärbild geändert) |
| 1 | Dort ist es schwer, angespielt zu werden. Gute Idee, dich freizulaufen! Aber schau mal: Von dort war der Passweg versperrt. | Jetzt steht Rot 3 im Passweg. Gute Idee, dich freizulaufen! Aber schau mal: Von dort war der Passweg versperrt. |
| 1 | Super! Du bist frei – und dein Freund nutzt den Platz und dribbelt nach vorne. Super gemacht! | Jetzt steht Rot 1 im Passweg. Dein Freund dribbelt dafür nach vorne. Das war trotzdem eine gute Idee! Manchmal klappt es nicht. |

## Konflikte, die ohne weitere Änderung nicht lösbar sind (zur Entscheidung)
**K1 – Hilfe 💡 beim Freilaufen: behoben (Entscheidung des Product Owners: jetzt korrigieren).**
- **Vorher:** Die Hilfe wählte ihren Punkt nach der Momentaufnahme mit starkem Vorwärtsdrang. Wer ihr folgte, war in 44 von 53 Freilauf-Lagen am Szenenende nicht anspielbar.
- **Jetzt** – Auswahl in zwei Stufen, ohne neue Bewertungsregel:
  1. **Kandidaten:** nur Laufziele, die die bestehende Bewertung ohnehin als gut einstuft (Stern). Die Hilfe kann also keinen Stern „herbeiführen“.
  2. **Rangfolge:** Laufqualität, also Platz zum nächsten Gegner, Raumgewinn Richtung Tor und Passweg. Jeder Kandidat wird **deterministisch vorausgerechnet**, das heißt die Szene wird auf einer Kopie zu Ende simuliert. Bevorzugt werden Ziele, an denen der Läufer **am Szenenende anspielbar** ist und an denen auch ein um 0,75 m daneben getippter Punkt noch klappt (kein „zentimetergenauer“ Punkt).
  3. **Gibt es kein solches Ziel**, empfiehlt die Hilfe das beste gute Laufziel und sagt ehrlich: „Lauf in den freien Raum, weg vom Gegner. Aber Achtung: Die Gegner laufen mit – vielleicht kann dein Freund dich trotzdem nicht anspielen.“ Gibt es gar kein gutes Laufziel: „Gerade ist es überall eng. Such dir eine Stelle mit Platz – weg von den Gegnern.“
- **Ergebnis über die 53 Freilauf-Lagen der Kinder-Abfolgen:**

  | | vorher | jetzt |
  |---|---|---|
  | Empfehlung am Szenenende anspielbar | 9 | **47** |
  | ehrlicher Hinweis „Gegner laufen mit“ | 0 | 6, jedes Mal zutreffend |
  | Empfehlung ohne Stern | 0 | 0 |

  Bei 44 der 47 Empfehlungen klappen auch alle vier Nachbarpunkte (±0,75 m), bei 3 drei von vier. Rechenzeit je Hilfe etwa 20 ms (Desktop).
- **Weiterhin nicht möglich (6 Lagen):**
  - 4-mal steht der Ballführende am oberen Rand unter Druck (Gegner 3–6 m entfernt), dribbelt nach dem Lauf los, und sein Gegenspieler läuft neben ihm mit. Am Szenenende steht dieser bei **jedem** guten Laufziel im Passweg (0 von 100–270 Zielen anspielbar). Dazu gehört die **Standardlage des Musterwegs** (Blau 2 auf 24/6, Rot 2 auf 2,1 m): nur 2 von 413 guten Zielen im 0,5-m-Raster sind am Ende anspielbar, eine Lücke von etwa 0,5 m.
  - 2-mal steht der Ballführende in der Ecke bzw. am Rand, und die Gegner schließen alle Passwege (0 von 13 bzw. 0 von 102).
  - Ursache ist in beiden Fällen der Ablauf beim Freilaufen (Paket B4, K3), nicht die Hilfe.
- **Hinweis zur Standardlage:** Im Musterweg schafft der Lauf Platz für das Dribbling von Blau 2. Das ist ein echter Erfolg des Freilaufens („Raum schaffen“), den die App heute nur als „Dein Freund dribbelt dafür nach vorne“ erwähnt. Ob das künftig als eigenes Ergebnis zählt, gehört zu Paket B3/B4.
- **Wirkung:** Der Spielverlauf ändert sich **nur, wenn ein Kind der Hilfe folgt**. In Mission 1 betrifft das den Durchlauf mit der Hilfe: In Schritt 2 empfiehlt die Hilfe jetzt Blau 1 → (14/8) mit Warnhinweis statt Blau 3 → (23/14). Danach folgen dieselben Entscheidungen und Ergebnisse, nur mit anderen Positionen: Tor, Druck, Ballgewinn, alle mit Stern. Die 200 Kinder-Abfolgen und die festen Abläufe sind davon nicht betroffen.

**K2 – Stern, aber das Ergebnis klappt nicht** (vorläufig beibehalten, Entscheidung des Product Owners).
- Das betrifft 32 % der Läufe mit Stern: 2120 Stern-Läufe im Raster, am Szenenende anspielbar sind 68 %.
- Das widerspricht sich nicht (Idee und Laufziel gut, Ergebnis nicht), kommt aber häufig vor.
- Ursache ist die Momentaufnahme in der Bewertung. Gelöst wird das mit B3 (Laufweg und Anspielbarkeit getrennt bewerten), nicht hier.

**K3 – „Jetzt“ bezieht sich auf das Ende der Szene** (vorläufig beibehalten).
- Dribbelt der Ballführende nach der Ankunft los, steht am Ende oft sein Gegenspieler direkt neben ihm im Passweg. Bei der Ankunft wären 86 % anspielbar gewesen, am Ende sind es 68 %.
- Gewählt habe ich das Szenenende, weil nur dann Text, Bild und nächste Entscheidung übereinstimmen.
- Eine Prüfung bei der Ankunft würde ein anderes Bild als das gezeigte beschreiben.
- Sauber lösen lässt sich das erst mit B4 (Ablauf beim Freilaufen).

## Tests
- Neu `tests/freilaufen.test.js`:
  - „zu weit“: Grund, Etikett, kein markierter Gegner, keine Passlinie;
  - Ziel (21/15): Stern, aber am Ende zugestellt – Text, Etikett, Bild und genannter Gegner stimmen überein;
  - Ziel (24/15): frei, grüne Linie;
  - **Eigenschaftstest über alle Freilauf-Szenen** (über 1500 aus den 200 Abfolgen): Stern = Bewertung vor der Aktion; Laufpfeil = Laufziel; Etikett = Grund; Ergebnis und Passlinie = Lage im Bild; Linie verbindet die gezeigten Positionen; genannter = markierter Gegner; nie „versperrt“ bei „zu weit“; nie „anspielbar“, wenn der Passweg zu ist;
  - keine Vorwegnahme: Kontext und Hilfe enthalten kein Erklärbild;
  - **K1:** In allen 53 Freilauf-Lagen ist das Hilfe-Ziel gut bewertet. Die Empfehlung ist reproduzierbar und verändert die Lage nicht. „Anspielen“ in der Hilfe bedeutet: am Ende anspielbar, mit mindestens 3 von 4 Nachbarpunkten. Der Warnhinweis kommt nur, wenn es wirklich nicht klappt. Mindestens 45 Lagen haben eine anspielbare Empfehlung (vorher 9). Die Standardlage des Musterwegs erhält den ehrlichen Warnhinweis.
- Referenzen: unverändert; die Abweichungen sind vorgelegt (s. o.).
- Sichtprüfung: Rückmeldebilder für (21/15), (24/15) und (10/22) im Browser aufgenommen.

## Für Paket B festgehalten (Product Owner, 18.11.2026)
Eine gute Freilaufbewegung muss nicht dazu führen, dass der Spieler selbst anspielbar wird. Sie kann einen Gegenspieler mitziehen und so Platz für einen anderen Spieler oder den Ballführenden schaffen (z. B. die Standardlage des Musterwegs, in der der Ballführende den frei gewordenen Raum zum Dribbeln nutzt). Dieses Prinzip ist bei der späteren Bewertung des Freilaufens (B3) zu berücksichtigen.
