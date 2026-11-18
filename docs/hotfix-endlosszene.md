# Hotfix V0.2.5 – Szene endet nie (Pass-Pingpong der Gegner)

Freigegeben vom Product Owner am 18.11.2026. Neue Referenz `tests/golden/mission1.v0.2.5.json` – gegenüber v0.2.3 ausschließlich die unten genannten 10 Abfolgen geändert (vorgelegte Liste: `tests/golden/historie/v0.2.5-hotfix-abweichungen.json`).

## Fehlerbild
Pass von der Startposition auf 17/11: Rot 1 fängt ab, danach spielen sich Rot 1 und Rot 3 (1,3 m auseinander) den Ball alle ~0,22 s zu. Die Szene endet nie, die App bleibt in der Szene hängen. Gleiches in der Verteidigung (z. B. Kinder-Abfolge 12, „Weg versperren“).
Umfang in v0.2.4 (`node tests/analysis/hang-search.js 4 50`, 340 Lagen, 43 574 Szenen): 39 Verteidigungsszenen; dazu der Angriffsfall 17/11 (feineres Raster: 203 von 25 179 Raumpässen).

## Ursache (zwei zusammenwirkende Punkte)
1. **Gegner-Verhalten (eigentliche Ursache):** Steht ein roter Ballführender unter Druck (Blau näher als 2,2 m), spielt er zum Mitspieler mit dem freiesten Passweg – auch zu dem, von dem er den Ball gerade bekommen hat. Steht derselbe blaue Spieler bei beiden, ist auch der Empfänger sofort unter Druck und spielt zurück: Pingpong ohne Ende.
2. **Szenenende:** Ist das Ende eingeleitet (z. B. 0,6 s nach dem Abfangen), wartet die Szene, solange der Ball fliegt. Jeder neue Pingpong-Pass startet, bevor die Wartezeit abläuft – das Ende wird endlos verschoben.

## Korrektur (`engine.js`, Gegner-KI)
1. **Kein sofortiger Rückpass:** Ein Gegner spielt den Ball nicht direkt an den zurück, von dem er ihn gerade bekommen hat. Unter Druck weicht er dann aus (bestehendes Verhalten „ausweichen“). Fußballerisch: Ein 1-m-Rückpass löst keinen Druck.
2. **Absicherung des Szenenendes:** Nach eingeleitetem Ende spielt jeder Gegner höchstens noch einmal ab. Danach behält der Ballführende den Ball. Damit endet jede Szene nach höchstens drei weiteren Pässen in einem gültigen Zustand (Ball bei einem Spieler, nichts in der Luft). Diese Regel ändert in keinem geprüften Ablauf etwas – sie ist reine Absicherung.
Keine Wartezeit verlängert, kein Abbruch: Die Szene endet über die bestehende Endlogik, der nächste Entscheidungspunkt (z. B. Verteidigung) folgt regulär.

## Tests (`tests/endlos.test.js`, 5 Tests)
- Regression 17/11: Szene endet in < 5 s, Rot 1 fängt ab wie bisher, kein Rückpass, gültiger Ballbesitz, nächste Entscheidung (Verteidigung) gültig und spielbar.
- Regression Verteidigung (Lage aus Kinder-Abfolge 12, 4 Zielpunkte).
- Eigenschaftstest über > 3 000 Szenen aus 60 Abfolgen (Pässe, Dribbeln, Ball erobern, Weg versperren): jede Szene endet, kein sofortiger Rückpass, nach eingeleitetem Ende spielt jeder Gegner höchstens einmal, gültiger Folgezustand.
- Absicherung Szenenende direkt geprüft; Determinismus.
- Gegenprobe: Mit dem Stand v0.2.4 schlagen die drei Regressions-/Eigenschaftstests an.
- Suche nach hängenden Szenen nach dem Fix: 0 von 43 574.

## Auswirkungen auf bestehende Abläufe (`node tests/analysis/hotfix-impact.js`)
- Feste Abläufe, Hilfe-Durchlauf und Oberflächen-Mitschrift: **unverändert**.
- **10 von 200 Kinder-Abfolgen** ändern sich – jeweils ab der ersten Szene mit Pingpong (vorher 2–10 rote Pässe, jetzt 1–3). Betroffen: 8 Verteidigungsszenen, 2 Angriffsszenen nach Ballverlust.
- Bewertung der Pingpong-Szene selbst: in allen 10 gleich (wird vor dem Ablauf bestimmt). Ergebnistext anders in 2 Szenen (46: „muss die Richtung ändern“ → „hat abgespielt“; 172 umgekehrt).
- Folgeszenen: In 4 Abfolgen startet die nächste Szene aus einer anderen Lage; dort gibt dieselbe (zufällige) Kinderentscheidung in 1 Fall keinen Stern mehr (Abfolge 12, 5. Szene „Ball erobern“: Weg zum Tor blieb offen). Keine Bewertungsregel geändert.

### Alle geänderten Entscheidungen (17)
| Abfolge | Szene | Aktion | Stern | Ansage alt → neu |
|---|---|---|---|---|
| Abfolge 12 | 4 | Weg versperren | –→– | Der Gegner hat abgespielt. Gute Idee, dich in den Weg zu stellen! Aber schau mal: Der Weg zum Tor blieb offen. → Der Gegner hat abgespielt. Gute Idee, dich in den Weg zu stellen! Aber schau mal: Der Weg zum Tor blieb offen. |
| Abfolge 12 | 5 | Ball erobern | ⭐→– | Ball erobert! Jetzt greifen wir an. Super gemacht! → Der Gegner läuft weiter Richtung Tor. Gute Idee, dich in den Weg zu stellen! Aber schau mal: Der Weg zum Tor blieb offen. |
| Abfolge 24 | 4 | Ball erobern | ⭐→⭐ | Du hast Druck gemacht! Der Gegner musste ausweichen oder abspielen. Super gemacht! → Du hast Druck gemacht! Der Gegner musste ausweichen oder abspielen. Super gemacht! |
| Abfolge 24 | 5 | Ball erobern | –→– | Du hast Druck gemacht! Der Gegner musste ausweichen oder abspielen. Gute Idee, den Gegner anzugreifen! Aber schau mal: Der Weg war weit. Blau 1 war näher am Ball. → Du hast Druck gemacht! Der Gegner musste ausweichen oder abspielen. Gute Idee, den Gegner anzugreifen! Aber schau mal: Der Weg war weit. Blau 3 war näher am Ball. |
| Abfolge 46 | 5 | Weg versperren | –→– | Klasse! Der Gegner kommt nicht vorbei und muss die Richtung ändern. Gute Idee, dich in den Weg zu stellen! Aber schau mal: Der Weg zum Tor blieb offen. → Der Gegner hat abgespielt. Gute Idee, dich in den Weg zu stellen! Aber schau mal: Der Weg zum Tor blieb offen. |
| Abfolge 56 | 4 | Weg versperren | –→– | Der Gegner hat abgespielt. Gute Idee, dich in den Weg zu stellen! Aber schau mal: Der Weg zum Tor blieb offen. → Der Gegner hat abgespielt. Gute Idee, dich in den Weg zu stellen! Aber schau mal: Der Weg zum Tor blieb offen. |
| Abfolge 56 | 5 | Ball erobern | –→– | Klasse! Der Gegner kommt nicht vorbei und muss die Richtung ändern. Gute Idee, den Gegner anzugreifen! Aber schau mal: Der Weg war weit. Blau 3 war näher am Ball. → Du hast Druck gemacht! Der Gegner musste ausweichen oder abspielen. Gute Idee, den Gegner anzugreifen! Aber schau mal: Der Weg war weit. Blau 3 war näher am Ball. |
| Abfolge 74 | 2 | Ball erobern | –→– | Du hast Druck gemacht! Der Gegner musste ausweichen oder abspielen. Gute Idee, den Gegner anzugreifen! Aber schau mal: Der Weg war weit. Blau 1 war näher am Ball. → Du hast Druck gemacht! Der Gegner musste ausweichen oder abspielen. Gute Idee, den Gegner anzugreifen! Aber schau mal: Der Weg war weit. Blau 1 war näher am Ball. |
| Abfolge 74 | 3 | Weg versperren | –→– | Oh nein, die Roten haben ein Tor geschossen. Der Weg zum Tor war offen. Gute Idee, dich in den Weg zu stellen! Aber schau mal: Der Weg zum Tor blieb offen. → Oh nein, die Roten haben ein Tor geschossen. Der Weg zum Tor war offen. Gute Idee, dich in den Weg zu stellen! Aber schau mal: Der Weg zum Tor blieb offen. |
| Abfolge 128 | 2 | Ball erobern | ⭐→⭐ | Du hast Druck gemacht! Der Gegner musste ausweichen oder abspielen. Super gemacht! → Du hast Druck gemacht! Der Gegner musste ausweichen oder abspielen. Super gemacht! |
| Abfolge 128 | 3 | Ball erobern | –→– | Du hast Druck gemacht! Der Gegner musste ausweichen oder abspielen. Gute Idee, den Gegner anzugreifen! Aber schau mal: Der Weg war weit. Blau 1 war näher am Ball. → Oh nein, die Roten haben ein Tor geschossen. Der Weg zum Tor war offen. Gute Idee, den Gegner anzugreifen! Aber schau mal: Der Weg war weit. Blau 1 war näher am Ball. |
| Abfolge 136 | 3 | Ball erobern | ⭐→⭐ | Du hast Druck gemacht! Der Gegner musste ausweichen oder abspielen. Super gemacht! → Du hast Druck gemacht! Der Gegner musste ausweichen oder abspielen. Super gemacht! |
| Abfolge 144 | 3 | Pass in den Raum | –→– | Oh! Rot 2 stand im Weg und hat den Ball bekommen. Schau mal: Ein Tor war frei – Schießen wäre gut gewesen. → Oh! Rot 2 stand im Weg und hat den Ball bekommen. Schau mal: Ein Tor war frei – Schießen wäre gut gewesen. |
| Abfolge 144 | 4 | Weg versperren | –→– | Der Gegner hat abgespielt. Gute Idee, dich in den Weg zu stellen! Aber schau mal: Der Weg zum Tor blieb offen. → Ball erobert! Jetzt greifen wir an. Gute Idee, den Gegner anzugreifen! Aber schau mal: Der Weg war weit. Blau 2 war näher am Ball. |
| Abfolge 172 | 5 | Weg versperren | –→– | Der Gegner hat abgespielt. Gute Idee, dich in den Weg zu stellen! Aber schau mal: Der Weg zum Tor blieb offen. → Klasse! Der Gegner kommt nicht vorbei und muss die Richtung ändern. Gute Idee, dich in den Weg zu stellen! Aber schau mal: Der Weg zum Tor blieb offen. |
| Abfolge 182 | 1 | Pass in den Raum | ⭐→⭐ | Oh! Rot 1 stand im Weg und hat den Ball bekommen. Das war trotzdem eine gute Idee! Manchmal klappt es nicht. → Oh! Rot 1 stand im Weg und hat den Ball bekommen. Das war trotzdem eine gute Idee! Manchmal klappt es nicht. |
| Abfolge 182 | 2 | Ball erobern | –→– | Oh nein, die Roten haben ein Tor geschossen. Der Weg zum Tor war offen. Gute Idee, den Gegner anzugreifen! Aber schau mal: Der Weg war weit. Blau 2 war näher am Ball. → Du hast Druck gemacht! Der Gegner musste ausweichen oder abspielen. Gute Idee, den Gegner anzugreifen! Aber schau mal: Der Weg war weit. Blau 2 war näher am Ball. |
