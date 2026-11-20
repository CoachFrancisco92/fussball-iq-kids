# Backlog – Ideen zur späteren Bewertung

Nur Dokumentation. Kein Implementierungsauftrag, keine Änderung am Umfang von V0.6a.

**Herkunft.** Der Benchmark eines Mitbewerbers (Comoleo, 20.11.2026) hat drei Fragen aufgeworfen. Bewertet werden ausschließlich **allgemeine Lern- und Produktprinzipien** für unser eigenes Konzept. Es werden keine fremden Texte, Grafiken, Rätsel oder anderen geschützten Inhalte übernommen; alles Folgende ist eigene Formulierung.

Skalen:
- **Lernwert:** hoch / mittel / gering.
- **Aufwand:** S = bis 2 Tage, M = bis 1 Woche, L = mehr.

## B1 – Kurzer Lernimpuls vor einer neuen Fähigkeit
**Idee.** Bevor eine Lernsituation eine neue Fähigkeit verlangt, zeigt das Spiel eine 5–10 s kurze, vorgelesene Mini-Szene. Beispiel: Der Ball läuft in einer echten Lage einmal am Gegner vorbei. Danach folgt ein Satz wie „Schau: Er ist vorbei!“. Es gibt keine Theorie und keinen Text zum Lesen.

| | Bewertung |
|---|---|
| Lernwert | **mittel bis hoch.** Fünfjährige lernen stark über Nachahmen. Ein gezeigtes Beispiel senkt die Zahl der Fehlversuche bei neuen Lernzielen (L4 eng, W1), die ohne Vorwissen oft zufällig gelöst werden. |
| Gegenargument | Ein vorgezeigter Weg kann zur **Musterlösung** werden: Das Kind kopiert die Richtung, statt die Lage zu lesen. Das widerspricht Leitplanke 3. |
| Aufwand | **M.** Die Wiedergabe gibt es schon (Szenen-Wiedergabe, deterministische Simulation). Neu wären ein Datenfeld je Lernziel (Impulslage ≠ Spiellage), die Ansage und der Einbau in den Ablauf (einmal je Sitzung, überspringbar). |
| Risiken | Wartezeit vor dem Spielen; Musterlösung (siehe oben); Inhalte müssen **eigene, gespiegelte oder andere Lagen** zeigen als die folgende Aufgabe. |
| Voraussetzung | Ergebnis des iPad-Tests V0.6a: Werden L4 eng und W1 ohne Impuls verstanden? |
| Empfehlung | Prüfen nach dem iPad-Test, und nur für Lernziele mit messbar hoher Fehlerquote. Impuls immer in einer **anderen** Lage als die Aufgabe. |

## B2 – Gezielte Wiederholung mit Variation
**Idee.** Wird eine Lernsituation nicht geschafft, folgt später eine **abgewandelte** Lage mit demselben Lernziel statt derselben Aufstellung, zum Beispiel gespiegelt, verschoben oder mit anderem Wächter.

| | Bewertung |
|---|---|
| Lernwert | **hoch.** Erst die Variation zeigt, ob das Prinzip verstanden ist (Transfer) oder nur die Stelle auswendig gelernt wurde. Das passt direkt zu P4: Der Stern verlangt die Kernleistung. |
| Aufwand | **S–M.** Spiegellagen gibt es schon (A3m, W1m, B3m, V1m, L4em, L4bm). Robustheit ±0,5 m und die Kriterien „gelöst“ sind je Lage getestet. Neu wäre eine Regel im Missionsablauf: nicht geschafft → Variante desselben Lernziels einreihen, statt (oder nach) „Nochmal“. |
| Risiken | Frust bei Häufung (mehrere Wiederholungen hintereinander), daher eine Obergrenze. Missionen werden länger. Deterministik bleibt erhalten (feste Regel, kein Zufall). |
| Abgrenzung | „Nochmal“ (V0.6a) wiederholt dieselbe Lage auf Wunsch des Kindes. B2 wäre eine automatische, abgewandelte Wiederholung. |
| Empfehlung | **Erster Kandidat** nach V0.6a, weil der Aufwand gering ist, die Bausteine vorhanden sind und der Lernwert direkt messbar ist. Vorher klären: Ersetzt B2 das „Nochmal“ oder ergänzt es? |

## B3 – Sichtbarer Kompetenzfortschritt (+ optional Hinweis für Eltern)
**Idee.** Erworbene Fähigkeiten werden kindgerecht anerkannt, zum Beispiel ein Bild je Lernziel („Ich finde das freie Tor“), das sich nach mehrfach gelösten Situationen füllt. Optional gibt es einen kurzen Elternhinweis: was das Lernziel ist und wie es im Training aussieht.

| | Bewertung |
|---|---|
| Lernwert | **mittel.** Motivation und Sprache für Eltern und Trainer. Gefahr: Der Fortschritt belohnt Menge statt Entscheidungsqualität. Deshalb nur aus *gelösten* Situationen (P4), nie aus Toren. |
| Aufwand | **M**, mit Elternhinweis **M–L**. Fortschritt über Sitzungen braucht **Speicherung**. Das widerspricht der heutigen Leitplanke „nichts wird gespeichert“; ohne Speicherung bliebe nur die Anzeige innerhalb der Sitzung. |
| Risiken | **Datenschutz:** Nur lokal im Gerät wäre möglich, aber auch das ist eine Grundsatzentscheidung des PO; keine Konten, kein Server. Für Kinder sichtbarer „Rückstand“ kann entmutigen. Elternhinweis = Text zum Lesen, also klar getrennt vom Kinderbereich. |
| Empfehlung | Zuerst eine Produktentscheidung: Darf lokal gespeichert werden? Ohne Speicherung ist nur der Elternhinweis je Mission sinnvoll (statischer Text, kein Tracking). Dieser kleine Teil ist risikoarm und könnte unabhängig kommen. |

## Reihenfolge (Vorschlag)
1. B2 (nach V0.6a-Abnahme).
2. Elternhinweis aus B3 (statisch).
3. B1 nach Auswertung des iPad-Tests.
4. Fortschritt über Sitzungen aus B3 erst nach der Entscheidung zur Speicherung.
