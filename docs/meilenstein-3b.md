# Meilenstein 3b – Paket D: Dribbelbewertung und Dribbelhilfe (konsolidiert E1–E6)

Stand 19.11.2026, Branch `meilenstein-3b-dribbeln`. **Zur Abnahme vorgelegt.**
- Kein Merge, keine Veröffentlichung.
- Die gültigen Referenzen (Mission 1 v0.3.1, Mission A v0.4.0) bleiben maßgeblich. Die Abweichungen sind nur vorgelegt; Kopien liegen in `tests/golden/historie/`.

## 1. Umgesetzt
| | Regel | Umsetzung (`engine.js`, Texte in `content/texte.js`) |
|---|---|---|
| E1 | Sicherheit | Das Dribbling wird deterministisch mit derselben Simulation vorausgerechnet. Sicher ist es, wenn das Ziel **und** mindestens 3 von 4 Nachbarzielen (±0,5 m) den Ball behalten. Es gibt also nie einen Stern aus einer einzelnen Simulation. |
| E2 | Ausgeführter Weg | Ein Tipp über 8 m wird auf den 8-m-Weg gekappt, den der Spieler läuft. Ein Tipp ins Aus wird aufs Feld gesetzt. |
| E3 | Raumgewinn R2 | Ein sicheres Dribbling bekommt einen Stern mit Grund: **Raumgewinn** ≥ 1 m · **Anschluss**, d. h. in der Folgesituation ist ein Freund frei (vorher keiner) oder das Tor frei · **Ball gesichert**, d. h. nach vorn kein sicherer Weg und kein Freund frei. Sonst gibt es 💭 mit Hinweis. |
| E3 | Anschluss nutzbar | Geprüft wird in der Lage am Szenenende. Das ist genau der nächste Entscheidungsmoment, mit Bild und Positionen, die das Kind sieht. Dort wird mit demselben Modell wie bei der Pass- und Schussbewertung gerechnet. Zusätzliche Engine-Logik war **nicht** nötig. Ein Test belegt: Bei jedem „Anschluss“-Stern wird in der Folgesituation Passen bzw. Schießen angeboten, und der Pass bzw. Schuss bekommt dort ⭐ (Ziel bzw. Stern). |
| E4 | Erklärungen | kurz, nach Ursache, ohne doppeltes „Ball behalten“ (Liste unter der Tabelle). Etiketten nach Grund, z. B. „Vorn war Platz“, „Freund jetzt frei“, „Zu knapp“. |
| E5-a | Mehrere gute Entscheidungen | „Dribbeln war sinnvoll“ gilt, wenn mindestens ein nach E3 gutes Dribbling existiert. Ein freier Freund macht Dribbeln nicht falsch. Die Hilfe folgt weiter dem Lernweg der Mission. |
| E5-b | Torchance-Vorrang | Steht ein Freund frei in der Schusszone und hat freie Schussbahn, ist Dribbeln keine gute Entscheidung, wenn kein sicheres Dribbling selbst mit freiem Schuss endet. Text: „Dein Freund stand frei vor dem Tor – Passen war besser.“ Gibt es beide Torchancen, sind beide ⭐. |
| E6 | Hilfe | Sie zeigt nur nach E3 gute Ziele, robust bei ±0,5 m. Bevorzugt werden Raumgewinn, Schusszone mit freiem Tor, Anschluss und Feldmitte. |
| E6 | Ausweg (Prüfpunkt 5) | Die alte Suche, die einen Ballverlust zeigen konnte, ist **entfernt**. Ohne guten Weg sagt die Hilfe: „Gerade ist es eng. Dribbel vorsichtig weg vom Gegner – sicher ist es nicht.“ Sie zeigt dann den am wenigsten riskanten Weg oder keinen, und kein „Auch gut“. Gibt es nur gute Ziele, die bei ungenauem Tippen kippen, sagt sie: „Dribbel genau dorthin, wo es leuchtet – daneben wird es eng.“ Bedienung unverändert. |
| neu, klein | Mindeststrecke | Unter 1 m ist es kein Dribbling, z. B. ein Tipp in die Ecke, in der der Spieler schon steht. Text: „Das war nur ein kleiner Schritt – dribbel ein Stück weiter.“ Das kam beim Ausweg-Test zum Vorschein (die Hilfe hätte „Stehen bleiben“ als „gut gesichert“ gezeigt). **Bitte mit freigeben.** |

**Gesprochene Ziel-Texte beim Dribbeln:**
- ⭐:
  - „Du bist in den freien Raum gedribbelt.“
  - „Jetzt ist dein Freund frei – gut vorbereitet!“
  - „Jetzt ist das Tor frei – gut vorbereitet!“
  - „Nach vorn war kein Platz – gut gesichert!“
- 💭, aber der Ball blieb sicher:
  - „Nach vorn war Platz – dribbel Richtung Tor.“
  - „Ein Freund stand frei – ein Pass bringt euch weiter.“
  - „Das war nur ein kleiner Schritt …“
- 💭, unsicher oder verloren:
  - „Das war knapp – Rot 1 war ganz nah.“
  - „Du bist direkt auf einen Gegner zugelaufen.“ (nur bei Ballverlust mit Weg < 1 m am Gegner)
  - „Dribbel weiter weg von Rot 2.“

## 2. Konsolidierter Abweichungsbericht (E1–E6)
Einzelaufstellung aller 38 Entscheidungen: `docs/meilenstein-3b-abweichungen.md`.

| | Mission 1 (gegen v0.3.1) | Mission A (gegen v0.4.0) |
|---|---|---|
| **Spielverlauf** (Positionen, Ereignisse, Phasen, Ergebnisse) | **unverändert** | **unverändert** |
| Hilfe-Durchlauf | unverändert | unverändert, alle 4 Durchläufe |
| feste Abläufe / Spielweisen | „dribbling“ (Rückzug 10\|13 → 6\|13 → 3\|16 → 3\|20) geändert | alle 5 × 4 unverändert |
| Kinder-Abfolgen geändert | 19 von 200 | 12 von 200 |
| geänderte Entscheidungen | 26 | 12 |
| ⭐ → 💭 | 7 Rückzug-Dribblings ohne Raumgewinn, vorn war Platz (3 im festen Ablauf, 4 in Abfolgen) | 3 (A2, A3, A5: Rückzug) |
| 💭 → ⭐ | 3, waren falsch als „direkt auf einen Gegner“ bewertet | 3 (ebenso) |
| neue Erklärung, Stern bleibt 💭 | 9 (Aufschlüsselung unten) | 4 |
| nur interner Text, gesprochen gleich | 7 | 2 |
| **Sterne gesamt** | **−4** | **±0** |
| Oberflächen-Mitschrift | 10 Einträge im Ablauf „Keiner ist frei, Ball im Aus, Verteidigung“ (derselbe Rückzug); die anderen beiden Abläufe identisch | identisch (49 Einträge) |

Die 9 neuen Erklärungen in Mission 1:

| Fälle | vorher | nachher |
|---|---|---|
| 4 | „direkt auf einen Gegner“ | „Nach vorn war Platz …“ |
| 2 | „Ein Freund stand frei – Pass besser“ | Erkennen jetzt gut (E5-a), Ziel „Nach vorn war Platz …“ |
| 1 | „direkt auf einen Gegner“ | „knapp – Rot 3 war ganz nah“ |
| 1 | „direkt auf einen Gegner“ | „Dribbel weiter weg von Rot 2“ |
| 1 | „direkt auf einen Gegner“ | **Torchance-Vorrang:** „Dein Freund stand frei vor dem Tor – Passen war besser.“ |

**Oberfläche von Mission 1, Ablauf „Keiner ist frei“:** Die 4 Rückzug-Dribblings sagen jetzt: „Gut gedribbelt – du hast den Ball behalten! Gute Idee, zu dribbeln! Aber schau mal: Nach vorn war Platz – dribbel Richtung Tor.“
- Etikett: „✗ 🎯 Vorn war Platz“.
- Der Endbildschirm zeigt **2 statt 5 von 6 Sternen** („Gut gemacht!“ statt „Super gespielt!“).

**Unterschied zum Zwischenstand 3b:** Von den dort freigegebenen 7 zusätzlichen Sternen in Mission 1 bleiben mit E3 3. Die anderen 4 waren sichere Dribblings ohne Raumgewinn bei freiem Weg nach vorn. Sie bekommen jetzt 💭 „Nach vorn war Platz“ statt der falschen Aussage „direkt auf einen Gegner“. In Mission A gilt dasselbe: Aus 5 zusätzlichen werden 3, dazu kommen 3 Rückzüge ⭐ → 💭.

Vorgelegt in diesen Dateien; die Tests lassen genau diese Abweichungen zu:
- `tests/golden/abweichungen-paket-d.json` (Engine, Mission 1);
- `tests/golden/abweichungen-paket-d-ui.json` (Oberfläche, Mission 1);
- `tests/golden/missionA-abweichungen-paket-d.json` (Mission A).

### Über das Raster (14 406 Dribbelziele in 113 Lagen, je vollständig simuliert)
| | v0.4.0 | konsolidiert |
|---|---|---|
| ⭐ trotz Ballverlust | 0 | **0** |
| Sterne gesamt | 5 417 | 4 296 |
| „direkt auf einen Gegner“ stimmt | 52 % | **100 %** (4 254) |
| ⭐-Gründe | – | Raumgewinn 3 566 · Freund jetzt frei 708 · Tor jetzt frei 9 · gesichert 57 |
| 💭 ohne Ballverlust | 4 124, alle mit falschem Text | „Nach vorn war Platz“ 5 311 · „Freund stand frei“ 23 · „knapp“ 306 |
| ⭐ nach Strecke 2 / 4 / 8 / 12 m | 53 / 46 / 33 / 23 % | 22 / 34 / 32 / 29 % (kein „kurz ist gut“) |
| Erkennen „Dribbeln sinnvoll“ geändert | – | 1 342 Ziele 💭 → ✓ (E5-a) · 133 ✓ → 💭 (Torchance-Vorrang) |

**Robustheit bei ungenauem Tippen (±0,5 m):**
- 87 % der Ziele bewerten alle 4 Nachbarn gleich (v0.4.0: 90 %).
- 95 % der ⭐-Ziele haben mindestens 3 von 4 ⭐-Nachbarn (v0.4.0: 97 %).
- Die Grenzen liegen jetzt dort, wo sich die Lage fachlich ändert: am 1-m-Raumgewinn und am Anschluss.
- Die Hilfe zeigt nur Ziele, deren Nachbarn mindestens 3 von 4 gut sind, oder sagt ehrlich „genau dorthin“.

## 3. Beispiele (alle als Tests in `tests/dribbeln.test.js`)
| Fall | Ergebnis |
|---|---|
| **Seitlich/rückwärts, gut:** eingeklemmt am Rand, kein Freund frei, nach vorn kein sicherer Weg | ⭐ „gut gesichert“ |
| **Seitlich/rückwärts, gut:** Dribbling öffnet einen Passweg | ⭐ „Jetzt ist dein Freund frei – gut vorbereitet!“ (708-mal im Raster) |
| **Seitlich/rückwärts, schlecht:** B3, Verfolger hinten, vorn frei, Dribbling quer oder zurück | 💭 „Nach vorn war Platz – dribbel Richtung Tor.“ |
| **Seitlich/rückwärts, schlecht:** Freund frei, vorn Platz, Dribbling zurück | 💭 |
| Grenzfall 1 m (B5, gleiche Richtung) | 0,8 m → 💭 · 1,3 m → ⭐ |
| **Mehrere gute Aktionen** (X3: Freund frei im Mittelfeld, Platz nach vorn) | Pass ⭐ **und** Dribbling ⭐. Die Hilfe zeigt den Pass (Lernweg). |
| **Beide Torchancen** (Freund frei vor dem Tor, eigenes Dribbling zum freien Schuss möglich; 2 Lagen) | Pass ⭐ **und** Dribbling ⭐, keine Passpflicht |
| **Eindeutig besserer Pass** (X1: Freund frei vor dem Tor, Dribbling erreicht keinen freien Schuss) | Pass ⭐; Dribbling 💭 „Dein Freund stand frei vor dem Tor – Passen war besser.“; Hilfe und „Auch gut“ ohne Dribbeln. **Nutzbar:** In der Folgesituation hat Blau 2 den Ball, der Schuss bekommt ⭐. |
| Pass riskanter als Dribbling (X4) | Pass 💭, Dribbling ⭐, Hilfe empfiehlt Dribbeln (unverändert) |
| Frontal in den Gegner (B4) · Lücke **und** außen herum (B2) · Tipp ins Aus | 💭 „direkt“ · beide ⭐ · gekappt, bewertet wie ausgeführt |
| Kein guter Weg (Ecke) | Hilfe: „Gerade ist es eng …“, kein ⭐-Ziel gezeigt, kein „Auch gut“ |

**Hilfe-Wege:**
- B1–B5: in 3–4 Entscheidungen zum Tor, nur ⭐, keine Seitenlinie. In v0.4.0 ging es bis zu 6 Entscheidungen an der Seitenlinie entlang, in B2/B5 ohne Tor.
- A4 mit dem Lernweg von Mission A: Dribbeln ⭐ → Schuss ⭐ → Tor in der Startlage und bei ±0,5 m je Spieler, **16/16** (v0.4.0: 10/16).

## 4. Tests und Rechenzeit
| | Ergebnis |
|---|---|
| `npm test` | **116/116**, davon `tests/dribbeln.test.js` 15 Tests über 33 Lagen (Mission 1, Mission A, B1–B5, A4) |
| Eigenschaften | keine Nebenwirkung von Bewertung und Hilfe (Spielverlauf unberührt); nie ⭐ bei Ballverlust; ⭐ nur sicher **und** mit E3-Grund; jede Erklärung passt zur Simulation; kein doppeltes „behalten“; Anschluss in der Folgesituation nutzbar; E2; E5-a; E5-b; Ausweg |
| `npm run test:e2e` | grün: `play`, `transcript` (bis auf die 10 vorgelegten Einträge), `offline`, `auswahl`, `mission-a` (Mitschrift identisch), `rechenzeit` |
| CPU 4× gedrosselt (`SLOW=4`) | `play` und `mission-a` grün |
| **Rechenzeit**, 4× Drosselung, 28 Lagen inkl. ungünstigster Fälle (Ecke ohne sicheren Weg, Torchance-Vorrang) | jede Bewertung und jede Hilfe ≤ 150 ms. Läufe: max **39 ms** bzw. **69 ms**. Hilfe kalt Median 25 ms; Wiederholung (gleiche Lage erneut) max 22–36 ms; Bewertung des Hilfeziels max 19 ms. |
| CI auf dem Branch | grün |

Zur Rechenzeit:
- Für diese Werte habe ich die Suche optimiert: 29 statt 47 Kandidaten, eine engere Obergrenze für den Abbruch der Hilfe-Suche und Zwischenspeicher je Lage. Vorher lag der ungünstigste Fall bei 178 ms.
- Die Ergebnisse sind gleich geblieben; die Tests sind unverändert grün.
- Ein echtes iPad habe ich nicht gemessen.

## 5. Zur Freigabe
1. **Konsolidierte Abweichungen** E1–E6 für Mission 1 und Mission A (Abschnitt 2). Danach erzeuge ich die neuen Referenzen und lege die Abweichungslisten nach `historie/`.
2. **Mindeststrecke 1 m** und die Hilfe-Hinweise „eng“ und „genau dorthin“ (Abschnitt 1).
3. Danach entwickle ich „Freie Bahn!“ und A4 und veröffentliche alles gemeinsam als V0.5.0.

## 6. Risiken und Grenzen
- **Missionsgrenze:** Endet die Angriffsphase nach dieser Entscheidung (Angriffsgrenze der Mission), kommt der Anschluss nicht mehr zum Tragen. Die Bewertung bleibt bewusst missionsunabhängig, wie beim Raumgewinn.
- **Nachsichtige Simulation:** Ausweichen löst den Druck praktisch nie, weil der Rote mitläuft. Seitliche und rückwärtige Dribblings sind deshalb nur mit Anschluss oder ohne Alternative gut. Mehr Druck kommt erst mit B5 (E7, zurückgestellt).
- **Torchance-Vorrang** prüft den freien Schuss von der Position des Freundes im Entscheidungsmoment. Der Test bestätigt in X1, dass er nach dem Pass tatsächlich frei schießen kann. Bei Abweichungen über ein Raster ist das nicht eigens gesichert. Der Vorrang kommt selten vor: einmal in den 200 Kinder-Abfolgen von Mission 1.
- **Testlaufzeit:** `npm test` dauert jetzt etwa 3 Minuten.
