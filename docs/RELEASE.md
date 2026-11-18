# Release-Prozess

Schlank, aber verbindlich. Die Live-Seite wird **ausschließlich** über den Workflow `CI` aktualisiert.

## Ablauf

```
Arbeitspaket-Branch ──► Tests grün (CI) ──► Freigabe Product Owner ──► Merge nach main
      ──► CI: Tests ──► Paket bauen ──► Veröffentlichen ──► Live-Prüfung ──► Tag vX.Y.Z (automatisch)
```

1. **Entwickeln** auf einem eigenen Branch (`phase-…`, `fix-…`, `mission-…`). Die CI testet jeden Push, veröffentlicht aber nichts.
2. **Version setzen:** `npm run version:set -- X.Y.Z` und Abschnitt `## VX.Y.Z` in `CHANGELOG.md` ergänzen. Ohne den CHANGELOG-Eintrag schlagen die Tests fehl.
   - Patch (0.2.**3**): Korrekturen, Prozess, Tests – Verhalten für das Kind unverändert
   - Minor (0.**3**.0): neue Mission, neue Funktion, geändertes Spielverhalten
3. **Lokal prüfen:** `npm run test:all` (Simulation, Konsistenz, Release-Regeln, Browser-Durchlauf).
4. **Freigabe** durch den Product Owner anhand der Zusammenfassung (was, warum, Tests, Risiken).
5. **Merge nach `main`** → CI veröffentlicht nur, wenn alle Tests grün sind, und prüft danach die Live-Seite (HTML, Skripte und Service Worker mit derselben Version; keine Test-/Doku-Dateien öffentlich).
6. **Tag `vX.Y.Z`** setzt die CI automatisch, sobald die Live-Prüfung grün ist. Er ist der Wiederherstellungspunkt für spätere Rollbacks.

## Wiederherstellung (Rollback)

| Situation | Was passiert | Was tun |
|---|---|---|
| Tests rot | nichts wird veröffentlicht, alte Seite bleibt | Ursache auf Branch beheben |
| Veröffentlichen schlägt fehl | GitHub Pages behält den letzten erfolgreichen Stand | erneut versuchen bzw. Ursache beheben |
| **Live-Prüfung rot** | neuer Stand ist online, entspricht aber nicht der Erwartung | **sofort letzten Tag erneut veröffentlichen** (s. u.) – die Zusammenfassung des fehlgeschlagenen Laufs nennt den Tag |

**Letzten freigegebenen Stand erneut veröffentlichen:**
1. Actions → Workflow **CI** → *Run workflow* (Branch `main`)
2. Feld *ref* = letzter Tag, z. B. `v0.2.3` → *Run workflow*
3. Der Lauf testet diesen Stand, veröffentlicht ihn und prüft ihn live.
4. Danach die Ursache auf einem eigenen Branch beheben.

Hinweise:
- Erlaubt sind nur Release-Tags (`vX.Y.Z`). Auch Stände vor Phase 1 lassen sich so veröffentlichen, weil Paketliste und Live-Prüfung immer vom aktuellen `main` kommen.
- Ältester wiederherstellbarer Stand: `v0.2.2` (Commit `42fe009`, letzter Stand vor Phase 1; trägt intern die Versionsnummer 0.2.1).
- **Nicht** per `git revert` auf vor Phase 1 zurückgehen: Das entfernt den Workflow selbst, danach würde nichts mehr veröffentlicht.

## Live-Prüfung manuell
`npm run check:live` – prüft https://coachfrancisco92.github.io/fussball-iq-kids/ gegen die Version aus `package.json`.
Auf dem Gerät: Startbildschirm zeigt „Version X.Y.Z“.

## Einmalige Einstellungen (nur Repository-Inhaber)
| Einstellung | Wert | Warum |
|---|---|---|
| Settings → Pages → *Source* | **GitHub Actions** | schaltet die alte, testunabhängige Veröffentlichung „Deploy from a branch“ ab |
| Settings → Branches → Regel für `main` *(empfohlen)* | „Require status checks to pass“: **Tests** | verhindert Merges mit roten Tests |
| Releases → *Draft a new release* → Tag **`v0.2.2`**, Ziel: Commit `42fe009` *(einmalig, vor dem ersten Release nach Phase 1)* | Wiederherstellungspunkt | Claude-Sitzungen können keine Tags anlegen; ab `v0.2.3` setzt die CI sie selbst |

## Freigabekriterien für einen Kindertest
Ein Stand darf vor ein Kind, wenn: Live-Prüfung grün · Version auf dem Startbildschirm stimmt · auf dem Testgerät einmal komplett durchgespielt (inkl. Ton) · keine offenen Fehler mit Absturz oder Hängenbleiben.
