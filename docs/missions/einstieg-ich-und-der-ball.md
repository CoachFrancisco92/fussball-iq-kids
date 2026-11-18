# Missionsentwurf: „Freie Bahn!“ – Einstieg Lernwelt 1 „Ich und der Ball“

Status: **Entwurf zur gemeinsamen Prüfung** (mission-designer, 2026-11-18). Grundlage: Engine 0.2.4, alle Ergebnisse aus headless Durchläufen (`tests/golden/trace.js` → `playMission`), Mission nur im Speicher registriert. `E.validateMission` → `[]`.

## 1. Kurzfassung
- **Idee:** Das Kind hat den Ball. Vor ihm steht nur **ein** Gegner, oben. Unten ist Platz. Es entscheidet: Wohin mit dem Ball? Nah am Tor: Auf welches Tor schieße ich?
- **Lernziel:** „Ich sehe, wo Platz ist, und nehme den Ball dorthin mit – nah am Tor schieße ich aufs freie Tor.“
- **Kein Technik- oder Dribbeltraining:** Geübt wird das Wahrnehmen (Wo steht der Gegner? Wo ist frei?) und die Wahl zwischen Passen und Dribbeln, Richtung und Tor. Gelungene Technik wird nicht abgefragt.
- **Einfacher als Mission 1:** Musterweg 3 statt 5 Entscheidungen, kein Freilaufen, kein Schau-Schritt, nur ein Gegner vor dem Ball, kein Gegner näher als 7 m.
- **Ehrliche Einschränkung:** Passen ist im ersten Moment absichtlich nicht frei. Sonst würde die Hilfe der Engine immer den Pass zeigen (Abschnitt 10).

## 2. Lernziel und Lernprinzipien (max. 2)
**Lernziel (altersgerecht):** „Ich schaue, wo Platz ist, bevor ich losgehe.“

| # | Lernprinzip | Kindersatz |
|---|---|---|
| P1 | Platz erkennen und nutzen: Ist vor mir frei, nehme ich den Ball mit – weg vom Gegner, nicht auf ihn zu. | „Ist vor dir Platz? Dann nimm den Ball mit!“ |
| P2 | Freies Tor erkennen: Nah am Tor schieße ich auf das Tor, vor dem kein Gegner steht. | „Schieß aufs Tor, vor dem keiner steht!“ |

Der kurze Verteidigungsmoment am Ende ist **kein eigenes Lernprinzip**. Die Engine schreibt ihn vor (Abschnitt 10). Er soll nur leicht sein und Spaß machen.

## 3. Abgrenzung zu Mission 1
| Merkmal | Mission 1 „Zusammen sind wir stark!“ | Einstieg „Freie Bahn!“ |
|---|---|---|
| Lernwelt | 2 (mit Verteidigung) | 1 |
| Lernziele | 3 | 2 |
| Entscheidungen im Musterweg | 5 (Pass, Freilaufen, Schuss, Erobern, Weg versperren) | **3** (Dribbeln, Schuss, Erobern) |
| Verschiedene Aktionen im Musterweg | 5 | 3 |
| Schau-Schritt „Wer steht frei?“ | ja, vor jedem Angriff | **aus** |
| Gegner am Start nah am Ball | Rot 1 ca. 4,5 m vor dem Ball, Rot 3 im Passweg | nächster Gegner 7,1 m, **nur ein** Gegner vor dem Ball |
| Was das Kind gleichzeitig beachten muss | 2 Mitspieler + 3 Gegner + Passwege | 1 Gegner vor dir + 2 Tore |
| Phasen | `maxAngriff: 4`, `verteidigung: 2` | `maxAngriff: 3`, `verteidigung: 1` |
| Freilaufen (2-Schritt-Bedienung) | ja | kommt im Musterweg nicht vor |

## 4. Ausgangssituation
Feld 36 × 24 m. Blau greift nach rechts an. Rote Tore bei (36|6) oben und (36|18) unten. Torschusszone ab x ≥ 29,7.

| Spieler | x | y | Rolle in der Lage |
|---|---|---|---|
| **b1 (Ball)** | 25 | 12 | Kind, Mitte, 11 m vor den Toren |
| b2 | 18 | 4,5 | Mitspieler hinten oben, gedeckt |
| b3 | 18 | 19,5 | Mitspieler hinten unten, gedeckt |
| r1 | 32 | 8 | **einziger Gegner vor dem Ball**, oben vor dem oberen Tor |
| r2 | 20 | 7 | deckt b2 (steht im Passweg) |
| r3 | 20 | 17 | deckt b3 (steht im Passweg) |

Das sieht das Kind: Es hat den Ball in der Mitte. Vorne steht nur ein Roter, und zwar oben. Unten vor ihm ist alles frei. Die zwei Freunde sind hinten, neben jedem steht ein Roter.

Auswertung der Startlage (Engine): `situation.ok = {pass: false, shoot: false, dribble: true}`. Passwege b2/b3: Reserve −0,06 s (zu). Aufgabe: `angriffFrei`, weil kein Gegner näher als 4,5 m ist.

**Neustarts**
| Fall | Aufstellung |
|---|---|
| `red` (nach blauem Tor oder Ball im Aus) | r1 (31\|12) mit Ball, r2 (33\|5), r3 (33\|19); b1 (25,5\|12) **direkt vor dem Ballführenden**, b2 (21\|7), b3 (21\|17) |
| `blue` (nach rotem Tor) | wie Mission 1: b1 (2,5\|12) mit Ball, b2 (6\|5), b3 (6\|19); r1 (19\|12), r2 (13\|7), r3 (13\|17). Nötig für `validateMission`, praktisch ohne Wirkung, weil die Mission nach 1 Verteidigungsentscheidung endet. |

Der Neustart `red` ist absichtlich klar: Ein blauer Spieler steht 5,5 m vor dem Ballführenden und ist eindeutig der nächste.

## 5. Entscheidungsmomente (als Typen, kein Drehbuch)
| # | Moment (Engine-Typ) | Gesprochene Anweisung | Angebotene Aktionen | Was sinnvoll ist und warum |
|---|---|---|---|---|
| 1 | Angriff, frei (`angriff`/`angriffFrei`) | **neu:** „Du hast den Ball! Schau nach vorn: Wo ist Platz? Dribbeln oder passen?“ | ⚽ Passen · 🏃 Dribbeln | Nach unten rechts dribbeln, weg von Rot 1 (P1). Ob direkt bis vors Tor (8 m) oder erst ein Stück (5 m): beides ist sinnvoll. Passen geht hier nicht gut, weil beide Freunde gedeckt sind. |
| 1b | nur wenn das Kind kurz gedribbelt hat: noch einmal Angriff | wie 1 (bzw. `angriffDruck`, **neu**: „Ein Gegner kommt! Schau genau: Wo ist Platz? Oder steht ein Freund frei?“) | ⚽ Passen · 🏃 Dribbeln | weiter in den freien Platz bis vors Tor |
| 2 | Torabschluss (`abschluss`) | vorhanden: „Jetzt kannst du schießen! Schau genau: Welches Tor ist frei?“ | 🥅 Schießen · ⚽ Passen | Aufs untere Tor schießen (P2). Vor dem oberen Tor steht jetzt Rot 1. |
| 3 | Verteidigung (`verteidigung`/`verteidigungFern`) | vorhanden: „Oh, jetzt greifen die Roten an! Wer kann den Spieler mit dem Ball aufhalten?“ | 🛡️ Ball erobern · 🧱 Weg versperren | Blau 1 greift an (er ist am nächsten). Oder ein Spieler stellt sich zwischen Gegner und Tor. Beides wird als gut bewertet. |

Je nach Weg gibt es also **3 Entscheidungen** (Musterweg) oder **4** (zwei kurze Dribblings). Bei frühem Ballverlust sind es 2.

## 6. Verläufe (simuliert, Engine 0.2.4)
Legende: Entscheidung = `rec` („Gute Idee“ / „Andere Idee besser“), Ziel = `exe`, ⭐ = beides gut. Positionen auf 0,1 m gerundet.

### 6.1 Musterweg – „Unten ist Platz“ (3 Entscheidungen, 3 ⭐)
| # | Aktion | Ereignisse | Bewertung | Gesprochene Rückmeldung |
|---|---|---|---|---|
| 1 | Dribbeln nach (30,1\|18,1) | – | gut / gut ⭐ | „Gut gedribbelt – du hast den Ball behalten! Super gemacht!“ |
| 2 | Schuss unteres Tor (1) | `goal` | gut / gut ⭐ | „Toooor! Der Weg war frei. Super gemacht!“ |
| 3 | Ball erobern mit b1 | `redPass`, `received:r2` | gut / gut ⭐ | „Du hast Druck gemacht! Der Gegner musste ausweichen oder abspielen. Super gemacht!“ |

Nach Schritt 1: r1 steht als Torwächter vor dem oberen Tor (34,9\|8,1), r2 rückt nach (25,4\|12,8). Schussweg oben: Reserve −0,04 (zu, Rot 1), unten: +2,15 (frei). Ergebnis Blau 1 : 0, Mission beendet.

### 6.2 Alternative A – zwei kurze Dribblings (**fußballerisch sinnvoll**, ≙ Hilfe-Pfad, 4 Entscheidungen, 4 ⭐)
| # | Aktion | Ereignisse | Bewertung | Rückmeldung |
|---|---|---|---|---|
| 1 | Dribbeln nach (28,2\|15,8) (Hilfe-Punkt) | – | gut / gut ⭐ | „Gut gedribbelt – du hast den Ball behalten! Super gemacht!“ |
| 1b | Dribbeln nach (32,0\|19,0) | – | gut / gut ⭐ | wie oben |
| 2 | Schuss unteres Tor | `goal` | gut / gut ⭐ | „Toooor! Der Weg war frei. Super gemacht!“ |
| 3 | Ball erobern mit b1 | `redPass`, `received:r2` | gut / gut ⭐ | „Du hast Druck gemacht! …“ |

Auch mit eigenen Punkten geht es so: (28,8\|15,2) → (31,5\|18) → Schuss unten führt genauso zu 4 ⭐ und Tor. **Wichtig:** Das klappt nur mit `maxAngriff: 3`. Bei `maxAngriff: 2` kam nach zwei Dribblings „Ball im Aus“, ohne dass das Kind schießen konnte (simuliert).

### 6.3 Alternative B – Pass in den freien Raum (**fußballerisch sinnvoll**, aber die Engine bewertet die Entscheidung als „Andere Idee besser“)
| # | Aktion | Ereignisse | Bewertung | Rückmeldung |
|---|---|---|---|---|
| 1 | Pass in den Raum (30\|18) | `received:b3` (b3 läuft ein) | **nicht gut** / gut | „Der Pass ist angekommen! Hat geklappt! Aber schau mal: Vor dir war Platz zum Dribbeln.“ |
| 2 | b3 schießt aufs untere Tor | `goal` | gut / gut ⭐ | „Toooor! …“ |
| 3 | Ball erobern mit b1 | `redPass` | gut / gut ⭐ | „Du hast Druck gemacht! …“ |

Ein Steilpass in den Lauf ist im echten Fußball eine gute Lösung. Die Engine bewertet die Entscheidung aber nur nach Pässen **zum Mitspieler**, nicht in den Raum. → Offene Frage F3. Außerdem steht im vorhandenen Text ein Grammatikfehler: „Der Weg zu **die freie Stelle** war frei.“ (`ausfuehren.wegFrei` + `freieStelle`, betrifft auch Mission 1).

### 6.4 Alternative C – Dribbeln geradeaus oder nach oben (Entscheidung gut, Ziel nicht gut; **Ergebnis ≠ Entscheidung**)
| Weg | Ereignisse | Bewertung | Rückmeldung |
|---|---|---|---|
| Dribbeln nach (30\|12), dann Schuss unten, Erobern | kein Ballverlust, `goal` | 1: gut / **nicht gut**, 2–3: ⭐ | „Gut gedribbelt – du hast den Ball behalten! Gute Idee, zu dribbeln! Aber schau mal: Du bist direkt auf einen Gegner zugelaufen.“ |
| Dribbeln nach (28,5\|8,5), dann Hilfe | 1b wird zu `angriffDruck`, dann Dribbeln (30,2\|13,2), Schuss unten → `goal` | 1: gut / nicht gut, Rest ⭐ | wie oben |

Das Kind behält den Ball, bekommt aber keinen Stern. Daran sieht es: Glück gehabt, nach unten war mehr Platz.

### 6.5 Alternative D – Dribbeln direkt auf Rot 1 (nicht sinnvoll)
| # | Aktion | Ereignisse | Bewertung | Rückmeldung |
|---|---|---|---|---|
| 1 | Dribbeln nach (32\|8) | `steal:r1`, `evade` | gut / nicht gut | „Rot 1 stand im Weg und hat dir den Ball abgenommen. Gute Idee, zu dribbeln! Aber schau mal: Du bist direkt auf einen Gegner zugelaufen.“ |
| 2 | Verteidigung, `verteidigungNah` („Der Gegner will zu unserem Tor! …“), Hilfe: b2 versperrt den Weg bei (13,1\|6,5) | `evade` | gut / gut ⭐ | „Klasse! Der Gegner kommt nicht vorbei und muss die Richtung ändern. Super gemacht!“ |

### 6.6 Alternative E – Pass zum gedeckten Freund (nicht sinnvoll)
| # | Aktion | Ereignisse | Bewertung | Rückmeldung |
|---|---|---|---|---|
| 1 | Pass zu b2 | `intercepted:r2` | **nicht gut** / gut („noch der beste Passweg“) | „Oh! Rot 2 stand im Weg und hat den Ball bekommen. Schau mal: Vor dir war Platz zum Dribbeln.“ |
| 2 | Ball erobern mit b2 (Hilfe) | `redPass`, `received:r3` | ⭐ | „Du hast Druck gemacht! …“ |

### 6.7 Alternative F – Schuss aufs zugestellte Tor / Pass statt Schuss (Moment 2)
| Aktion in Moment 2 | Ereignisse | Bewertung | Rückmeldung |
|---|---|---|---|
| Schuss oberes Tor (0) | `blocked:r1` | gut / nicht gut | „Geblockt! Rot 1 stand vor dem Tor. Gute Idee, aufs Tor zu schießen! Aber schau mal: Vor diesem Tor stand Rot 1. Das andere Tor war frei.“ |
| Pass zu b3 | `intercepted:r3` | nicht gut / gut | „Oh! Rot 3 stand im Weg und hat den Ball bekommen. Schau mal: Ein Tor war frei – Schießen wäre gut gewesen.“ |

### 6.8 Varianten im Verteidigungsmoment (nach dem Neustart `red`)
| Aktion | Ereignisse | Bewertung | Rückmeldung |
|---|---|---|---|
| Erobern b1 (Hilfe) | `redPass`, `received:r2` | ⭐ | „Du hast Druck gemacht! …“ |
| Erobern b3 | `redPass`, `received:r3` | gut / nicht gut | „… Gute Idee, den Gegner anzugreifen! Aber schau mal: Der Weg war weit. Blau 1 war näher am Ball.“ |
| Weg versperren b1 bei (20\|10) | `evade` | ⭐ | „Klasse! Der Gegner kommt nicht vorbei und muss die Richtung ändern. Super gemacht!“ |
| Weg versperren b3 bei (30\|20) | `redPass`, `received:r3`, `evade` | gut / nicht gut | „Der Gegner hat abgespielt. Gute Idee, dich in den Weg zu stellen! Aber schau mal: Der Weg zum Tor blieb offen.“ |

**Robustheit:** 200 zufällige Kinder-Abfolgen (Muster aus `tests/golden/trace.js`). Kein Absturz, jede Mission endet. Länge: 2 Entscheidungen in 155 Fällen, 3 in 8 Fällen, 4 in 37 Fällen. Der Moment `ohneBall` (Freilaufen) kam 37-mal vor, nur nach einem Pass in den Raum, der ankam.

## 7. Reaktionen von Mitspielern und Gegnern (so, wie die Simulation sie erzeugt)
- **Rot 1 (vorn):** Wenn der Ball x ≥ 25 erreicht, wird der rote Spieler, der am weitesten hinten steht, zum Torwächter. Er stellt sich 2,4 m vor das Tor, das ihm am nächsten ist (hier oben). Das untere Tor bleibt frei.
- **Rot 2 / Rot 3:** Der Gegner, der dem Ball am nächsten ist, läuft auf den Ballführenden zu (hier r2, er kommt von hinten). Er bleibt dabei 1,4 m Abstand, ist langsamer (3,0 m/s gegen 3,4 m/s beim Dribbeln) und kann nicht tacklen, wenn Blau sich von ihm wegbewegt. Der dritte Rote deckt locker einen Mitspieler (3 m zum Tor hin versetzt).
- **Blaue Mitspieler:** Ohne Auftrag bleiben sie stehen. Bei einem Pass in den Raum läuft der nächste ein (b3). In der Verteidigung sichern sie automatisch zum Tor hin ab.
- **Rot mit Ball (Neustart):** Er dribbelt aufs Tor zu. Unter Druck spielt er ab oder weicht aus. Steht ein Blauer im Weg, ändert er die Richtung (`evade`/`turn`).

## 8. Texte
**Passen unverändert (`content/texte.js`):** `kontext.abschluss`, `kontext.verteidigungFern`, `kontext.verteidigungNah`; `hilfe.dribbeln`, `hilfe.schiessen`, `hilfe.erobern`, `hilfe.raum`; `erkennen.platz`, `besserDribbeln`, `torchance`, `besserSchiessen`; `ausfuehren.freierRaum`, `inGegner`, `freiesTor`, `vorDemTor`, `anderesTorFrei`; alle `ergebnis`-Texte, die vorkommen; `rueckmeldung.*`; `bedienung.ballImAus`, `andersProbieren`; `ende.lob/sterne`.

**Neu als missionseigene Texte (`texte`), nur für diese Mission:**
| Schlüssel | Vorschlag | Grund |
|---|---|---|
| `kontext.angriffFrei` | title „Wo ist Platz?“, say „Du hast den Ball! Schau nach vorn: Wo ist Platz? Dribbeln oder passen?“ | lenkt den Blick auf den Raum (P1). Beide Aktionen werden genannt, also keine Vorgabe. |
| `kontext.angriffDruck` | title „Wo ist Platz?“, say „Ein Gegner kommt! Schau genau: Wo ist Platz? Oder steht ein Freund frei?“ | Der vorhandene Text („Wem spielst du den Ball zu?“) legt den Pass nahe. Das widerspricht Lernwelt 1. |
| `ende.merksatz` | „ Du hast geschaut, wo Platz ist. Ist vor dir frei? Dann nimm den Ball mit! Bist du nah am Tor? Dann schieß aufs freie Tor!“ | Merksatz zu P1 + P2 |
| optional `ausfuehren.inGegner` | „Dort stand ein Gegner. Wo anders war mehr Platz.“ | Der vorhandene Text („direkt auf einen Gegner zugelaufen“) passt bei schrägen Wegen (6.4) nur halb. Entscheidung durch den PO. |

Geprüft: Mit den Überschreibungen bleiben `tag` und die übrigen Felder erhalten (deep merge). Die Mission ist weiter gültig. An Mission 1 ändert sich nichts.

## 9. Wiederholen und aus Konsequenzen lernen (vorhandene Funktionen)
- **Anders probieren:** Die Engine stellt genau dieselbe Lage wieder her. Weil alles deterministisch ist, folgt auf dieselbe Entscheidung immer dieselbe Folge.
- **Vergleichen** (ab 2 Versuchen im selben Moment) – lohnende Paare:
  - Moment 1: Pass zu b2 (abgefangen) ↔ Dribbeln nach unten (Ball behalten)
  - Moment 1: Dribbeln auf Rot 1 (Ball weg) ↔ Dribbeln nach unten
  - Moment 1: kurz (5 m) ↔ lang (8 m) nach unten. Beides gibt ⭐. Daran sieht das Kind: Es gibt mehr als einen guten Weg.
  - Moment 2: oberes Tor (geblockt) ↔ unteres Tor (Tor)
- **Schau-Schritt:** absichtlich aus (`[]`). Der vorhandene Schau-Schritt fragt „Welcher Freund steht frei?“, das gehört zu Lernwelt 2. Simuliert für die Startlage: Die Antwort „Keiner ist frei“ ist richtig („Richtig! Gerade ist keiner frei. Dann kannst du mit dem Ball in den freien Platz dribbeln.“, Hilfe-Punkt (28,2\|15,8)). Tippt das Kind auf b2 oder b3: „Schau genau: Rot 2 steht im Weg zu Blau 2. Probier's nochmal!“. Er wäre also einschaltbar → Frage F5.
- **Hilfe (💡):** In Moment 1 empfiehlt sie Dribbeln (28,2\|15,8), in Moment 2 das untere Tor, in Moment 3 Erobern mit b1. Der Hilfe-Pfad ergibt 4 ⭐ und ein Tor (6.2).

## 10. Technische Umsetzbarkeit (Engine 0.2.4)
**Geht ohne Engine-Änderung**
- Startlage, Neustarts, Phasen, Schau-Schritt aus, missionseigene Texte: alles reine Daten, `validateMission` = `[]`.
- Musterweg und alle Alternativen oben verhalten sich wie beschrieben (simuliert).
- Anders probieren, Vergleichen und Hilfe funktionieren unverändert. Fortschrittsanzeige und Endbildschirm zählen die Entscheidungen selbst.

**Geht nicht / Abstriche**
| # | Einschränkung | Folge für diese Mission | Alternative |
|---|---|---|---|
| T1 | Die Aktionen je Moment legt `context()` fest (z. B. immer Passen + Dribbeln). | Passen lässt sich nicht ausblenden. Ein Moment „nur Dribbeln oder Schießen“ ist nicht möglich. | Mit der Startlage arbeiten (Freunde gedeckt). Aktionen je Mission einstellbar machen = **Engine-Änderung**. |
| T2 | `recommend()` bevorzugt Schießen > Passen > Dribbeln. | Wäre ein Freund frei, zeigte die Hilfe den Pass statt P1. Deshalb sind die Freunde gedeckt, und Passen ist in Moment 1 nie „Gute Idee“. | So annehmen (Lernwelt 1) oder Vorrang je Mission = **Engine-Änderung**. |
| T3 | Bei der Entscheidung zählen nur Pässe **zum Mitspieler**, nicht in den Raum. | Ein sinnvoller Steilpass (6.3) gilt als „Andere Idee besser“. | Bewertung des Passes in den Raum = **Engine-Änderung** (mit Test für Mission 1). |
| T4 | `verteidigung ≥ 1` ist Pflicht. Nach einem Tor oder nach `maxAngriff` folgt immer Verteidigung. | Die Mission endet nie mit dem Tor. Musterweg mindestens 3 Entscheidungen, mit frühem Ballverlust 2. | Verteidigung auf 1 begrenzen, Neustart `red` leicht machen (umgesetzt). „Nur Angriff“ = **Engine-Änderung** (`validateMission`, `missionAfter`). |
| T5 | Dribbeln höchstens 8 m pro Entscheidung, Hilfe-Dribbeln 5 m. | Der Hilfe-Pfad braucht zwei Dribblings, also `maxAngriff: 3` (bei 2: Ball im Aus vor dem Schuss). | umgesetzt |
| T6 | Bei der Entscheidung (`rec`) zählt beim Dribbeln nicht die Richtung, nur beim Ziel (`exe`). | Jedes Dribbeln hört „Gute Idee, zu dribbeln“. Die Richtung wird über „Aber schau mal …“ zurückgemeldet. | passt pädagogisch, keine Änderung nötig |
| T7 | Pro Mission gibt es nur **eine** Startlage. | Eine gespiegelte Lage (Gegner unten → oben frei) für einen zweiten Durchgang geht nur als zweite Mission. | zweite Missionsdatei, gespiegelt (y → 24 − y). Mehrere Startlagen = **Engine-Änderung**. |
| T8 | Steht der Gegner mittig, gibt es keinen freien Weg über 8 m. Simuliert mit r1 (33\|12): kurze Wege nach oben **und** unten gehen, danach wird es unklar (Hilfe dribbelt in die Ecke, Rückpass, Ball im Aus ohne Schuss, Text „Wem spielst du den Ball zu?“). | Echte Wahl „oben **oder** unten“ ist für den Einstieg zu unruhig. | verworfen; als spätere Mission denkbar |
| T9 | Ein Schau-Schritt mit der Frage „Wo ist Platz?“ (statt „Wer steht frei?“) ist nicht vorhanden. | Schau-Schritt aus | `lookAnswer` erweitern = **Engine-Änderung** |
| T10 | Standardmission = die erste registrierte Mission. `tests/helpers/load.js` lädt `missions/*.js` **alphabetisch**. | Eine Datei `missions/einstieg-….js` käme vor `mission-1.js` und würde in Node zur Standardmission. Dann schlagen Tests an, die `E.newState()` ohne id aufrufen (`missions.test.js` prüft `E.mission().id === 'mission-1'`; `look`, `branches`, `simulation`). | Dateiname, der nach `mission-1.js` sortiert, oder Tests auf ausdrückliche id umstellen (Sache von Hauptsitzung/`simulation-qa`) |

**Vorschlag Missionsdatensatz** (nur als Dokument, im Speicher geprüft: `validateMission` = `[]`, Musterweg und Hilfe-Pfad wie in Abschnitt 6):
```js
(function (root) {
  'use strict';
  (root.FIQ_MISSIONS = root.FIQ_MISSIONS || []).push({
    id: 'einstieg-ich-und-der-ball',
    nummer: 0, // offen, siehe F8
    titel: 'Freie Bahn!',
    untertitel: 'Wo ist Platz für dich?',
    merkmale: ['3 gegen 3', '4 Minitore', 'Ein Gegner vor dir'],
    lernwelt: 1, // „Ich und der Ball“
    lernziele: [
      'Sehen, wo vor mir Platz ist, und den Ball dorthin mitnehmen – weg vom Gegner',
      'Nah am Tor das Tor wählen, vor dem kein Gegner steht',
    ],
    start: {
      ballbesitz: 'b1',
      spieler: [
        { id: 'b1', x: 25, y: 12 }, { id: 'b2', x: 18, y: 4.5 }, { id: 'b3', x: 18, y: 19.5 },
        { id: 'r1', x: 32, y: 8 }, { id: 'r2', x: 20, y: 7 }, { id: 'r3', x: 20, y: 17 },
      ],
    },
    neustart: {
      red: {
        ballbesitz: 'r1',
        spieler: [
          { id: 'r1', x: 31, y: 12 }, { id: 'r2', x: 33, y: 5 }, { id: 'r3', x: 33, y: 19 },
          { id: 'b1', x: 25.5, y: 12 }, { id: 'b2', x: 21, y: 7 }, { id: 'b3', x: 21, y: 17 },
        ],
      },
      blue: {
        ballbesitz: 'b1',
        spieler: [
          { id: 'b1', x: 2.5, y: 12 }, { id: 'b2', x: 6, y: 5 }, { id: 'b3', x: 6, y: 19 },
          { id: 'r1', x: 19, y: 12 }, { id: 'r2', x: 13, y: 7 }, { id: 'r3', x: 13, y: 17 },
        ],
      },
    },
    phasen: { maxAngriff: 3, verteidigung: 1 },
    schauSchritt: [],
    texte: {
      kontext: {
        angriffFrei: { title: 'Wo ist Platz?', say: 'Du hast den Ball! Schau nach vorn: Wo ist Platz? Dribbeln oder passen?' },
        angriffDruck: { title: 'Wo ist Platz?', say: 'Ein Gegner kommt! Schau genau: Wo ist Platz? Oder steht ein Freund frei?' },
      },
      ende: {
        merksatz: ' Du hast geschaut, wo Platz ist. Ist vor dir frei? Dann nimm den Ball mit! Bist du nah am Tor? Dann schieß aufs freie Tor!',
      },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
```

## 11. Integration in den Missionsablauf (nur Konzept, nicht umsetzen)
1. **Reihenfolge:** Einstieg (Lernwelt 1) → Mission 1 (Lernwelt 2). Später kann eine gespiegelte Einstiegslage als zweite Lernwelt-1-Mission dazukommen (T7).
2. **Bis die Missionsauswahl gebaut ist:** Die Einstiegsmission wird nur eingebunden, wenn klar ist, welche Mission startet. Die App startet heute die erste registrierte Mission (`index.html`-Reihenfolge), die Tests die alphabetisch erste (T10). Beides muss zusammenpassen, sonst ändert sich Mission 1 still, ohne dass es jemand merkt.
3. **Startbildschirm (später):** zwei große Karten mit Bild, Titel wird vorgelesen. Die empfohlene nächste Mission leuchtet. Ohne Lesen bedienbar, max. 2–3 Karten gleichzeitig.
4. **Freischaltung:** Empfehlung: **keine Sperren**. Alle Missionen sind offen, das Spiel schlägt nur die nächste vor (z. B. Knopf „Weiter zur nächsten Mission“ auf dem Endbildschirm). Fortschritt höchstens lokal auf dem Gerät, ohne Konto und ohne Übertragung. Ob überhaupt etwas gespeichert wird, entscheidet der PO (Datenschutz-Leitplanke).
5. **Auslieferung** nach Checkliste `docs/missionen.md`: `<script>` vor `engine.js`, `scripts/site-files.json`, `sw.js`, Szenario-Tests (`simulation-qa`) für 6.1–6.7.

## 12. Offene Fragen für die gemeinsame Prüfung
**Fußballfachlich**
- F1: Ist es richtig, dass beide Freunde gedeckt hinten stehen? Oder wirkt das unnatürlich (Rot verteidigt hinter dem Ball)?
- F2: Reicht „ein Gegner vorn, eine Seite frei“ als Grundlage für Lernwelt 1, oder soll schon der Einstieg eine echte Wahl oben/unten bieten (T8)?
- F3: Soll der Pass in den freien Raum (6.3) als gute Entscheidung zählen? Das hieße Engine-Änderung T3.

**Pädagogisch**
- F4: Sind 3 Entscheidungen (davon 1 Verteidigung, die die Engine vorschreibt) für Fünfjährige richtig, oder ist der Verteidigungsmoment im Einstieg störend (T4)?
- F5: Schau-Schritt aus lassen, oder einschalten, weil „Keiner ist frei → dribbel in den Platz“ gut zu P1 passt?
- F6: Neue Texte (Abschnitt 8): passt „Wo ist Platz?“ für Fünfjährige, und soll `inGegner` sanfter werden?

**Entscheidungsfreiheit**
- F7: Ist es vertretbar, dass Passen in Moment 1 immer „Andere Idee besser“ bekommt (T1/T2)? Kurzes oder langes Dribbeln und der Weg über zwei Schritte bleiben gleichwertig gut.

**Technik**
- F8: Nummer und Anzeige der Einstiegsmission (`nummer: 0`? „Start“?) und Dateiname bzw. Standardmission (T10).
- F9: Vorhandener Grammatikfehler „Der Weg zu die freie Stelle war frei.“ korrigieren? Das ändert Mission 1 (Referenztests neu erzeugen, nur nach Freigabe).

---

## 13. Überarbeitung nach Grundsatzentscheidung des Product Owners (18.11.2026)
**Entscheidung PO:** Variante B – ein Pass in den freien Raum kann eine gute Entscheidung sein, wenn er aus der Situation heraus sinnvoll ist (Erreichbarkeit, Gegnerpositionen, Risiko des Ballverlusts). **Übergeordnetes Prinzip:** Das Lernziel einer Mission darf andere fußballerisch sinnvolle Entscheidungen nicht künstlich abwerten. Schau-Schritt bleibt aus. Texte freundlich, kurz, für Fünfjährige. Mehrere sinnvolle Wege erwünscht, aber nicht bei jeder Aktion nötig.

### 13.1 Notwendige Engine-Anpassungen (geprüft mit einem Wegwerf-Prototyp außerhalb des Repos)
| # | Anpassung | Kriterien / Inhalt | Auswirkung auf Mission 1 (gemessen) |
|---|---|---|---|
| E1 | **Pass in den Raum situationsbezogen bewerten** | gleiche Zeitlogik wie die Simulation: Ballweg frei · nächster Mitspieler kommt **mit Reserve** (Vorschlag ≥ 0,3 s) vor jedem Gegner an · Zielpunkt nicht im Gedränge (≥ 3 m zum nächsten Gegner) · nicht nach hinten · ≥ 4 m weit | **Spielverlauf unverändert** (0 von 200 Abfolgen). Bewertung ändert sich bei 45 von 710 Entscheidungen: 42 × Pässe in den Raum, die bisher einen Stern bekamen, obwohl kein Mitspieler sie sicher erreichen konnte (bisher wurde nur der Ballweg geprüft – eine **Schwäche in Mission 1**, die E1 behebt); 3 × neue „Pass wäre besser“-Hinweise; 2 × Stern neu. Musterweg und Hilfe-Durchlauf unverändert. Referenzen: `golden` (Ablauf „dribbling“ + 54 Abfolgen) und Oberflächen-Mitschrift (1 von 3 Abläufen) **müssen nach Freigabe neu erzeugt werden**. |
| E1a | **Eigene Texte für Raum-Pässe** | „Du hast den freien Raum für deinen Freund gesehen.“ · „Knapp! {Gegner} wäre fast genauso schnell gewesen.“ · „Dort kommt dein Freund nicht rechtzeitig hin.“ | ohne E1a widersprächen sich Schau-Schritt („Keiner ist frei“) und Rückmeldung („Ein Freund stand frei“) – im Prototyp beobachtet |
| E2 | **Hilfe: Lernweg je Mission** | Missionsfeld (Daten) `hilfe: { reihenfolge: ['dribbeln', 'schiessen', 'passen'] }` – die Hilfe zeigt die erste Aktion der Reihenfolge, **die in der Lage sinnvoll ist**; ein Zusatztext nennt weitere gute Wege („Ein Pass in den Lauf wäre auch gut.“). Standard = heutige Reihenfolge (Schießen > Passen > Dribbeln). | **keine** (Mission 1 nutzt den Standard; Empfehlungen im Hilfe-Durchlauf geprüft identisch) |
| E3 | **Flexible Phasen** | `verteidigung: 0` zulassen → Mission endet nach Tor, Ballverlust oder `maxAngriff` | keine (Mission 1 behält 4 + 2) |
| E4 | Grammatik „zu die freie Stelle“ | eigene Textschlüssel für Raum-Pässe („Der Weg zur freien Stelle war frei.“) | Texte in Mission 1 nur bei Raum-Pässen; zusammen mit E1 neu erzeugen |
| E5 | **Prinzip absichern** | Test: gleiche Lage ⇒ gleiche Bewertung, **unabhängig von der Mission** (Missionen steuern nur Aufstellung, Hilfe-Reihenfolge, Texte – nie die Bewertung) | keine |
| E6 | Standardmission eindeutig (T10) | Testlader übernimmt die Reihenfolge aus `index.html` (eine Quelle für App und Tests) | keine |

Prototyp-Ergebnisse für „Freie Bahn!“ (E1): Pass nach (32|21,5) außen in den Lauf von Blau 3 → **gut** (Reserve 0,43 s). Pass nach (30|18) → **nicht gut, knapp** (Reserve 0,11 s – kam in der Simulation an, war aber riskant: *Ergebnis ≠ Entscheidung*). Pässe zu den gedeckten Freunden → weiter nicht gut. Dribbeln nach unten → weiter ⭐. Ohne E2 würde die Hilfe in Moment 1 den Raum-Pass zeigen (feste Reihenfolge) – daher E2.

### 13.2 Überarbeitete fachliche Empfehlung
1. **Lernziel unverändert** („Ich schaue, wo Platz ist, bevor ich losgehe“), **P1 erweitert:** „Ist vor dir Platz? Nimm den Ball mit – **oder spiel ihn in den Lauf deines Freundes.**“ P2 bleibt.
2. **Moment 1 hat zwei gute Wege:** Dribbeln in den freien Platz (Lernweg, von der Hilfe erklärt) **und** der sichere Pass in den Lauf. Riskante oder zugestellte Pässe bleiben „nicht gut“ – fußballerisch begründet, nicht wegen des Lernziels.
3. **Kein Verteidigungsmoment** im Einstieg (E3, `verteidigung: 0`): Er wäre ein drittes Lernprinzip. Die Mission endet mit Tor, Ballverlust (mit „Anders probieren“) oder nach 3 Angriffsentscheidungen. Umschalten und gemeinsames Verteidigen gehören in Lernwelt 3.
4. **Startlage natürlicher machen (F1):** Rote Spieler stehen torseitig statt hinter dem Ball; die Freunde müssen nicht mehr künstlich zugestellt werden, weil E2 den Lernweg sichert. Neue Lage nach den Engine-Änderungen mit dem `mission-designer` simulieren.

### 13.3 Offene Entscheidungen F1–F9 – Empfehlung
| F | Frage | Empfehlung | Begründung |
|---|---|---|---|
| F1 | Freunde gedeckt hinten, Rot hinter dem Ball? | **Ändern:** Rot torseitig, Freunde natürlich positioniert; nach E1/E2 neu simulieren | wirkte konstruiert; die Zustellung war nur eine Umgehung der Hilfe-Reihenfolge (T2), die E2 löst |
| F2 | Echte Wahl oben/unten schon im Einstieg? | **Nein**, eine freie Seite; gespiegelte Lage als zweite Lernwelt-1-Mission | weniger Informationen gleichzeitig; T8 zeigte, dass die mittige Lage unruhig wird |
| F3 | Raum-Pass als gute Entscheidung? | **Ja, mit Kriterien (E1)** – entschieden | PO-Grundsatz; behebt zugleich die bisherige Überbewertung unerreichbarer Pässe in Mission 1 |
| F4 | Verteidigungsmoment im Einstieg? | **Nein, `verteidigung: 0` (E3)** | max. zwei Lernprinzipien; kleine Engine-Änderung ohne Wirkung auf Mission 1 |
| F5 | Schau-Schritt? | **Aus** – entschieden | die Frage „Wer steht frei?“ gehört zu Lernwelt 2 |
| F6 | Texte („Wo ist Platz?“, sanfteres `inGegner`) | **Ja**, beide als missionseigene Texte; zusätzlich Hilfe-Zusatztext für den zweiten guten Weg | kurz, freundlich; ändert Mission 1 nicht |
| F7 | Passen in Moment 1 nie „gute Idee“? | **Erledigt durch E1/E2** | sicherer Raum-Pass wird gut bewertet; Hilfe erklärt Dribbeln, ohne den Pass abzuwerten |
| F8 | Nummer, Dateiname, Standardmission | id `einstieg-ich-und-der-ball`; Startbildschirm-Kennzeichnung erst mit der Missionsauswahl; **Standardmission über `index.html`-Reihenfolge (E6)**, Mission 1 bleibt vorerst Start | verhindert den stillen Wechsel der Standardmission (T10) |
| F9 | Grammatikfehler korrigieren? | **Ja, zusammen mit E1 (E4)** | ein freigegebener Verhaltenswechsel → einmal Referenzen neu erzeugen statt zweimal |

### 13.4 Vorgeschlagene Reihenfolge (nach Freigabe)
1. **Engine-Paket** (eigener Branch): E1–E6, neue Referenzen für Mission 1 nur nach Freigabe der dokumentierten Abweichungen (Liste der 45 geänderten Bewertungen).
2. **Missionspaket** (eigener Branch): `mission-designer` simuliert die natürlichere Startlage neu; danach Missionsdatei, Szenario-Tests; Einbindung ohne Missionsauswahl erst, wenn die Startmission geklärt ist.
