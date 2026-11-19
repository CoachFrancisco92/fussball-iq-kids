# Paket B „Teamverhalten“ – fachliche Vorgaben (Stand 18.11.2026)

**Status: zurückgestellt bis nach dem ersten Kindertest.** Noch nicht entwickelt. Grundlage: `analyse-v0.3.0-konsolidiert` (Analysebericht vom 18.11.2026).

Prioritäten des Product Owners:
1. **Gemeinsames Verteidigen:** Ein Spieler stellt den Ballführenden, ein anderer sichert den Weg zum gefährdeten Tor, ein weiterer berücksichtigt gefährliche Gegenspieler. Die Positionen ergeben sich aus der aktuellen Lage, nicht aus starren Zuordnungen.
2. **Angriffsverhalten:** Nicht gesteuerte Mitspieler reagieren sinnvoll; sie bieten sich gleichzeitig an oder nutzen freie Räume. Position halten ist erlaubt, wenn es taktisch sinnvoll ist.
3. **Freilaufen:** Laufwegqualität und tatsächliche Anspielbarkeit getrennt bewerten. **Zusätzlich:** Eine gute Freilaufbewegung muss nicht dazu führen, dass der Spieler selbst anspielbar wird. Sie kann einen Gegenspieler mitziehen und Platz für einen anderen Spieler oder den Ballführenden schaffen. Das ist bei der Bewertung zu berücksichtigen.
4. **Kontinuierliche Bewegungsabsichten** über die Entscheidungspause hinweg; Zuordnungen unabhängig von der internen Spielerreihenfolge (heute: 141 von 710 Szenen enden anders, wenn die Reihenfolge umgekehrt wird).
5. **Zweikampf** mit Anlaufrichtung und Position relativ zum Ballführenden.

Leitlinien: Themen fachlich getrennt prüfen, technische Abhängigkeiten berücksichtigen; deterministisch, keine unnötig komplexe KI, keine Positionssprünge, Ball- und Spielerbewegung zeitlich konsistent.
Zurückgestellt (C): schwierigkeitsabhängige Reaktionszeiten, längere Spielphasen, komplexere Gegnerverhalten.
