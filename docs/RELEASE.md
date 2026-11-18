# Release-Prozess

Schlank, aber verbindlich. Die Live-Seite wird **ausschließlich** über den Workflow `CI` aktualisiert.

## Ablauf

```
Arbeitspaket-Branch ──► Tests grün (CI) ──► Freigabe Product Owner ──► Merge nach main
      ──► CI: Tests ──► Paket bauen ──► Veröffentlichen ──► Live-Prüfung ──► Tag vX.Y.Z
```

1. **Entwickeln** auf einem eigenen Branch (`phase-…`, `fix-…`, `mission-…`). Die CI testet jeden Push, veröffentlicht aber nichts.
2. **Version setzen:** `npm run version:set -- X.Y.Z` und Abschnitt `## VX.Y.Z` in `CHANGELOG.md` ergänzen. Ohne den CHANGELOG-Eintrag schlagen die Tests fehl.
   - Patch (0.2.**3**): Korrekturen, Prozess, Tests – Verhalten für das Kind unverändert
   - Minor (0.**3**.0): neue Mission, neue Funktion, geändertes Spielverhalten
3. **Lokal prüfen:** `npm run test:all` (Simulation, Konsistenz, Release-Regeln, Browser-Durchlauf).
4. **Freigabe** durch den Product Owner anhand der Zusammenfassung (was, warum, Tests, Risiken).
5. **Merge nach `main`** → CI veröffentlicht nur, wenn alle Tests grün sind, und prüft danach die Live-Seite (HTML, Skripte und Service Worker mit derselben Version; keine Test-/Doku-Dateien öffentlich).
6. **Tag setzen**, sobald die Live-Prüfung grün ist: `git tag vX.Y.Z && git push origin vX.Y.Z`.

## Rollback
- **Schnell:** Actions → Workflow „CI“ → *Run workflow* (Branch `main`) → Feld *ref* = letzter guter Tag, z. B. `v0.2.3`. Der Tag wird erneut getestet, veröffentlicht und live geprüft.
- **Dauerhaft:** den fehlerhaften Commit auf `main` per `git revert` zurücknehmen (neuer, normaler Release).
- Rollback ist erst ab dem ersten Tag (`v0.2.3`) möglich; davor nur per `git revert`.

## Live-Prüfung manuell
`npm run check:live` – prüft https://coachfrancisco92.github.io/fussball-iq-kids/ gegen die Version aus `package.json`.
Auf dem Gerät: Startbildschirm zeigt „Version X.Y.Z“.

## Einmalige Einstellungen (nur Repository-Inhaber)
| Einstellung | Wert | Warum |
|---|---|---|
| Settings → Pages → *Source* | **GitHub Actions** | schaltet die alte, testunabhängige Veröffentlichung „Deploy from a branch“ ab |
| Settings → Branches → Regel für `main` *(empfohlen)* | „Require status checks to pass“: **Tests** | verhindert Merges mit roten Tests |

## Freigabekriterien für einen Kindertest
Ein Stand darf vor ein Kind, wenn: Live-Prüfung grün · Version auf dem Startbildschirm stimmt · auf dem Testgerät einmal komplett durchgespielt (inkl. Ton) · keine offenen Fehler mit Absturz oder Hängenbleiben.
