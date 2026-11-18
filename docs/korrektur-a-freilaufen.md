# Korrektur A – Freilaufen: Rückmeldung, Etikett und Erklärbild (V0.3.1)

Stand: Branch `korrektur-a-freilaufen`, **zur Freigabe vorgelegt** (nicht gemergt, nicht veröffentlicht).
Grundlage: Analyse vom 18.11.2026, Freigabe „A“ durch den Product Owner.

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
- Engine-Referenz: 112 Freilauf-Entscheidungen in 101 von 200 Abfolgen. Betroffen sind auch die festen Abläufe „musterweg“ und „geblockt“ sowie der Durchlauf mit der Hilfe, dort nur Ergebnistext, Etikett und Erklärbild. Vorgelegt in `tests/golden/abweichungen-a.json`.
- Oberflächen-Mitschrift: 2 Einträge (Ablauf „Rest mit Hilfe“), vorgelegt in `tests/golden/abweichungen-a-ui.json`.

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
**K1 – Die Hilfe 💡 zeigt beim Freilaufen oft Punkte, die am Ende nicht anspielbar sind.**
- Bisher sagte die App in diesen Fällen fälschlich „Du bist frei“.
- Mit der korrekten Rückmeldung hört ein Kind, das der Hilfe folgt, in **44 von 53** Freilauf-Lagen „Jetzt steht Rot N im Passweg … trotzdem eine gute Idee“. Das betrifft auch die Oberflächen-Mitschrift (Ablauf „Rest mit Hilfe“).
- Ursache: Die Hilfe wählt ihren Punkt nach derselben Momentaufnahme wie die Bewertung.
- Lösung: Die Hilfe wählt nur Punkte, die am Szenenende anspielbar sind, berechnet als deterministische Vorausrechnung. Das ändert **nicht die Bewertung**, aber den Spielverlauf, wenn ein Kind der Hilfe folgt (Hilfe-Durchlauf von Mission 1). **Noch nicht umgesetzt – Entscheidung nötig.**

**K2 – Stern, aber das Ergebnis klappt nicht.**
- Das betrifft 32 % der Läufe mit Stern: 2120 Stern-Läufe im Raster, am Szenenende anspielbar sind 68 %.
- Das widerspricht sich nicht (Idee und Laufziel gut, Ergebnis nicht), kommt aber häufig vor.
- Ursache ist die Momentaufnahme in der Bewertung. Gelöst wird das mit B3 (Laufweg und Anspielbarkeit getrennt bewerten), nicht hier.

**K3 – „Jetzt“ bezieht sich auf das Ende der Szene.**
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
  - keine Vorwegnahme: Kontext und Hilfe enthalten kein Erklärbild.
- Referenzen: unverändert; die Abweichungen sind vorgelegt (s. o.).
- Sichtprüfung: Rückmeldebilder für (21/15), (24/15) und (10/22) im Browser aufgenommen.
