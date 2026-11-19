# Meilenstein 2 – Mission A „Welches Tor ist frei?“

Stand 19.11.2026, Branch `meilenstein-2-mission-a` (Basis `meilenstein-1-grundlage`, Entwürfe aus `missionsentwurf-lernwelt-1` hineingemergt). Version 0.4.0. **Zur Abnahme vorgelegt.** Nicht gemergt, nicht veröffentlicht.

## Umgesetzt
- `missions/welches-tor-ist-frei.js` – nur Daten, **keine Änderung an `engine.js`/`app.js`** (außer Versionsnummer), keine Sonderregeln. Bewertung und Gegnerverhalten unverändert.
- 2 gegen 2, Lernwelt 1, Platz 1 im Lernweg (🥅). Hilfe: Schießen → Dribbeln → Passen, `alternativenNennen: false`, kein Schau-Schritt.

| Situation | b1 (Ball) | b2 | r1 | r2 | Hilfe-Weg |
|---|---|---|---|---|---|
| A1 oben zu, unten frei | (31\|12) | (24\|19) | (29,5\|13,5) | (34,5\|7,8) | Schuss unten |
| A2 unten zu, oben frei | (30,5\|14,5) | (24\|6) | (29\|13) | (34\|16,7) | Schuss oben |
| A3 beide zu | (32\|8) | **(30,5\|19,5)** | **(33,9\|11,4)** | (34,2\|7) | Pass zu Blau 2 → Blau 2 schießt unten |
| A5 beide frei | (30,5\|13) | (24\|6) | (28,5\|13) | (34\|12) | Schuss unten (oben ebenso ⭐) |

Rotation (Durchlauf n = n mod 4, nichts gespeichert): A1·A2·A5 → A2·A3·A1 → A5·A1·A3 → A3·A5·A2. Jede Situation 3-mal, jeder Durchlauf beginnt anders. „Nochmal“ bringt den nächsten Durchlauf.

## Vollständige Abläufe (Engine, alle 4 Durchläufe)
| Spielweise | Ergebnis |
|---|---|
| Hilfe | jeder Durchlauf 3 : 0, nur ⭐ (A3: 2 Entscheidungen) |
| immer falsches Tor | A1/A2/A3 💭 geblockt mit Erklärung, A5 ⭐ |
| immer oben / immer unten | ⭐ genau dort, wo das Tor frei ist; in A5 beide ⭐ |
| immer Pass | A1/A2 💭 (abgefangen), A3 ⭐, A5 ⭐ (Rückpass gut, wie E7) |
| 200 Kinder-Abfolgen (Referenz) + 300 gestreute | jede Szene endet, jeder Durchlauf endet (≤ 12 Entscheidungen), Stern = Bewertung vor der Aktion |

Gesprochen (Auszug): Abschluss „Welches Tor ist frei? Schießen oder passen?“ · Hilfe „Vor diesem Tor steht kein Gegner im Weg.“ / „Schau mal auf den Spieler, der leuchtet. Zwischen euch steht kein Gegner.“ · geblockt „Geblockt! Rot 2 stand vor dem Tor. … Das andere Tor war frei.“ bzw. in A3 „… Beide Tore waren zugestellt. Ein Pass zu einem freien Freund wäre besser gewesen.“ · Wechsel „Neue Situation! Schau genau hin.“ (Anzeige „🔄 Neue Situation“).

## Robustheit A3 (`node tests/analysis/a3-robustheit.js`)
Jeder Spieler einzeln ±0,5 m und ±1 m in x und y (32 Abweichungen). Geprüft: beide Tore zugestellt, Hilfe-Weg Pass ⭐ → Blau 2 im Abschluss → Schuss ⭐ → Tor.

| Startlage | ±0,5 m | ±1 m |
|---|---|---|
| Entwurf (b2 (30\|20), r1 (33,1\|10,8)); b2 auf 30,5 zentriert | 11/16 | 10/16 |
| **umgesetzt** (b2 (30,5\|19,5), r1 (33,9\|11,4)) – Rasterprüfung über 216 Lagen | **16/16** | **14/16** |

Wo der Ablauf übergeht (umgesetzte Lage, ±1 m):
- Blau 2 1 m weiter links (x 29,5) steht außerhalb der Torzone → nach dem Pass erst „Freilaufen“ (⭐), dann Schuss ⭐ und Tor. Ablauf ändert sich, bleibt gut.
- Rot 1 1 m weiter links (x 32,9) steht näher am Passweg → Pass „zu eng“ (💭, kommt aber an), danach Schuss ⭐ und Tor.

Grund im Entwurf: Der Passweg hatte nur 0,22 Reserve (Schwelle 0,2). Rot 1 steht jetzt weiter weg vom Passweg und versperrt das untere Tor trotzdem. Der Test `tests/mission-a.test.js` prüft genau diese Ergebnisse an der konfigurierten Lage.

## Mission 1 unverändert
- Engine-Referenz `mission1.v0.3.1.json` und Mitschrift `ui-transcript.v0.3.1.json` identisch, keine Abweichungslisten, nichts neu erzeugt. `engine.js` gegenüber Meilenstein 1 nur Versionsnummer.
- Browser-Tests von Mission 1 (`play`, `transcript`, `offline`) **wählen jetzt die Karte von Mission 1**, weil Mission A vorausgewählt ist. In `transcript.mjs` wird die Ansage beim Antippen der Karte verworfen (geprüft in `auswahl.mjs`), damit die Mitschrift ab „Los geht's“ vergleichbar bleibt; der Starteintrag liest die Karte von Mission 1 (Inhalt unverändert).
- Sichtbare Änderungen für Mission 1 nur auf dem Startbildschirm: zweite Karte mit Nummer „2“ statt „1“; Ansage beim Antippen ohne doppeltes Satzzeichen.

## Tests
| | Ergebnis |
|---|---|
| `npm test` | 101/101 (neu: `tests/mission-a.test.js`, 12) |
| `e2e/play`, `transcript`, `offline`, `auswahl` | grün; offline beide Missionen startbar |
| `e2e/mission-a.mjs` (iPad 1024×768, Touch) | alle 4 Durchläufe + Rückkehr zu Durchlauf 1, Mitschrift = `ui-mission-a.v0.4.0.json` (49 Einträge) |
| CPU 6× gedrosselt (`SLOW=6`) | `mission-a.mjs` und `play.mjs` grün, ohne längere Wartezeiten |

Neue Referenzen (erstmals erzeugt, zur Freigabe): `tests/golden/mission-a.v0.4.0.json`, `tests/golden/ui-mission-a.v0.4.0.json`, eingetragen in `tests/golden/referenz.js` → `missionA`.

## Offene Punkte / Risiken
1. **A5: Hilfe zeigt nur ein Tor (unten).** Beide Schüsse sind ⭐, das Kind kann das obere Tor ebenso wählen. Beide Tore in der Hilfe zu zeigen wäre eine Änderung an Hilfe/Oberfläche – nicht umgesetzt, Entscheidung PO.
2. A3 hängt an der Torzone (x ≥ 29,7) für Blau 2; getestet und dokumentiert, keine Engine-Änderung nötig.
3. „Immer passen“ in A5: Rückpass ist ⭐ (E7, gewollt); die Situation dauert dann 4 Entscheidungen.
4. Bekannter Befund „veralteter Torplan der Abwehr“ bleibt für Paket B; in Mission A ohne Wirkung (keine Abwehrphase).
5. Kindertest auf dem iPad steht aus (Touch und Sprache nur in Chromium-Emulation geprüft, nicht in Safari).
