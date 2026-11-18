# Missionen und Texte pflegen

Seit V0.2.4 sind Spielinhalte von der Simulation getrennt. **Für eine neue Mission wird `engine.js` nicht geändert.**

## Wo liegt was?
| Inhalt | Datei | Wer pflegt |
|---|---|---|
| Aufstellungen, Neustarts, Phasen, Lernziele, Schau-Schritt, missionseigene Texte | `missions/<id>.js` | Missionsentwurf (`mission-designer`) → Hauptsitzung |
| Alle Ansagen, Rückmeldungen, Bedientexte (missionsübergreifend) | `content/texte.js` | Hauptsitzung, fachlich geprüft durch Reviewer |
| Simulation, Gegnerverhalten, Bewertungslogik, Wahrnehmungslogik, Phasenablauf | `engine.js` | Hauptsitzung; Änderungen nur mit Testnachweis für alle Missionen |
| Darstellung, Eingabe, Sprache, Ablauf | `app.js` | Hauptsitzung |

## Aufbau einer Missionsdatei
```js
(root.FIQ_MISSIONS = root.FIQ_MISSIONS || []).push({
  id: 'mission-2', nummer: 2,
  titel: '…', untertitel: '…', merkmale: ['3 gegen 3', …],   // Startbildschirm
  lernwelt: 3, lernziele: ['…', '…'],
  start:    { ballbesitz: 'b1', spieler: [{ id: 'b1', x, y }, … { id: 'r3', x, y }], ball: { x, y } /* optional */ },
  neustart: { red: { ballbesitz: 'r1', spieler: [...] }, blue: { ballbesitz: 'b1', spieler: [...] } },
  phasen:   { maxAngriff: 4, verteidigung: 2 },   // verteidigung: 0 = keine Abwehrphase, Ende nach dem Angriff
  hilfe:    { reihenfolge: ['schiessen', 'passen', 'dribbeln'], alternativenNennen: false }, // optional: Lernweg der Hilfe
  schauSchritt: ['angriff'],          // vor welchen Momenten „Erst schauen“ kommt; [] = aus
  texte:    { … }                     // optional: überschreibt Einträge aus content/texte.js
});
```
- Spieler-ids: `b1…b9` (Blau), `r1…r9` (Rot); Reihenfolge der Liste = Reihenfolge in der Simulation.
- Feld 36 × 24 m, Blau greift nach rechts an, Torschusszone 6 m.
- Nur Daten – keine Bedingungen, Schleifen oder Funktionen (wird getestet).
- `E.validateMission(m)` prüft Pflichtfelder, Feldgrenzen, Ballbesitz und Neustarts; ungültige Missionen starten nicht.

## Neue Mission einbinden (Checkliste)
1. Entwurf durch `mission-designer` (`docs/missions/<id>.md`): Lernziele, Startlage, Musterweg + 2 Alternativen.
2. `missions/<id>.js` anlegen; Startlage per headless Durchlauf prüfen.
3. `<script src="missions/<id>.js?v=…">` in `index.html` **vor** `engine.js`, Datei in `scripts/site-files.json` und im Service Worker.
4. Szenario-Tests für Musterweg und Alternativen (`simulation-qa`); bestehende Tests für Mission 1 bleiben unverändert grün.
5. Auswahl mehrerer Missionen in der Oberfläche ist noch **nicht** gebaut (derzeit startet die erste registrierte Mission).

## Texte ändern
- Texte stehen ausschließlich in `content/texte.js` (bzw. im Feld `texte` einer Mission).
- **Jede Textänderung an Mission 1 ist eine Verhaltensänderung:** Die Referenztests (`tests/golden.test.js`, `tests/e2e/transcript.mjs`) schlagen an. Das ist gewollt. Nach Freigabe werden die Referenzen bewusst neu erzeugt (`tests/golden/trace.js` bzw. `transcript.mjs --write`) und die Änderung im CHANGELOG benannt.

## Hilfe und Bewertung
- `hilfe.reihenfolge` legt fest, welche **gute** Aktion die Hilfe zuerst empfiehlt (Lernweg). Ohne Angabe: Schießen, Passen, Dribbeln. Passen steht dabei zuerst für einen freien Mitspieler; ein Pass in den Raum wird nur empfohlen, wenn in der Reihenfolge sonst nichts Sinnvolles geht.
- `hilfe.alternativenNennen: true` ergänzt „Auch gut: …“ mit den anderen guten Aktionen.
- Die **Bewertung** ist davon unabhängig und für alle Missionen gleich.
