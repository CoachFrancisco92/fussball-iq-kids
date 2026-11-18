/* Fußball-IQ Kids – pädagogische Texte (missionsübergreifend)
 * Alle Ansagen, Rückmeldungen und Bedientexte an einer Stelle. Die Engine enthält keine Sätze mehr.
 * Regeln: kurze Sätze, „du“, kein Fachjargon, alles wird vorgelesen. Keine echten Kindernamen.
 * Eine Mission kann einzelne Einträge über ihr Feld `texte` überschreiben (gleiche Struktur).
 * Platzhalter: Funktionen erhalten Namen wie „Rot 3“ bzw. Zahlen und geben den fertigen Satz zurück.
 */
(function (root) {
  'use strict';
  root.FIQ_TEXTE = {
    teams: { blue: 'Blau', red: 'Rot' },

    aktionen: {
      passen: { icon: '⚽', label: 'Passen' },
      dribbeln: { icon: '🏃', label: 'Dribbeln' },
      schiessen: { icon: '🥅', label: 'Schießen' },
      freilaufen: { icon: '👟', label: 'Freilaufen' },
      erobern: { icon: '🛡️', label: 'Ball erobern' },
      raum: { icon: '🧱', label: 'Weg versperren' },
    },

    // Aufgabenstellung je Entscheidungsmoment
    kontext: {
      abschluss: { title: 'Welches Tor ist frei?', tag: 'Torabschluss', say: 'Jetzt kannst du schießen! Schau genau: Welches Tor ist frei?' },
      ohneBall: { title: 'Wo kann ich helfen?', tag: 'Bewegung ohne Ball', say: 'Dein Freund hat den Ball! Wo kannst du hinlaufen, damit du ihm helfen kannst? Tippe auf einen blauen Spieler ohne Ball.' },
      angriffDruck: { title: 'Wem spiele ich den Ball zu?', tag: 'Angriff', say: 'Ein Gegner kommt! Schau mal, welcher Freund frei steht. Wem spielst du den Ball zu?' },
      angriffFrei: { title: 'Was machst du mit dem Ball?', tag: 'Angriff', say: 'Du hast den Ball! Schau dich um. Passen oder dribbeln?' },
      verteidigungNah: { title: 'Wie schützen wir unser Tor?', tag: 'Verteidigung', say: 'Der Gegner will zu unserem Tor! Wo muss dein Spieler stehen, damit er nicht einfach schießen kann?' },
      verteidigungFern: { title: 'Wer hält den Gegner auf?', tag: 'Verteidigung', say: 'Oh, jetzt greifen die Roten an! Wer kann den Spieler mit dem Ball aufhalten?' },
    },

    // Orientierungshilfe (💡)
    hilfe: {
      passen: 'Schau mal auf den Spieler, der leuchtet. Zwischen euch steht kein Gegner.',
      schiessen: 'Vor diesem Tor steht kein Gegner im Weg.',
      dribbeln: 'Dribbel dorthin, wo kein Gegner im Weg ist.',
      freilaufen: 'Lauf in den freien Raum, weg vom Gegner. Dann kann dein Freund dich anspielen.',
      erobern: 'Der Spieler, der am nächsten am Ball ist, greift an.',
      raum: 'Stell dich zwischen den Gegner und unser Tor.',
    },

    // Bewertung, Teil 1: War die Art der Entscheidung sinnvoll? (👀 Entscheidung)
    erkennen: {
      torchance: 'Du hast die Torchance erkannt.',
      freund: 'Du hast gesehen, dass ein Freund frei war.',
      platz: 'Du hast den freien Platz gesehen.',
      schwierig: 'Eine schwierige Lage – nirgends war es richtig frei.',
      besserSchiessen: 'Ein Tor war frei – Schießen wäre gut gewesen.',
      besserPassStattSchuss: 'Beide Tore waren zugestellt. Ein Pass zu einem freien Freund wäre besser gewesen.',
      besserPass: 'Ein Freund stand frei – ein Pass wäre besser gewesen.',
      besserDribbelnStattSchuss: 'Beide Tore waren zugestellt. Vor dir war aber Platz zum Dribbeln.',
      besserDribbeln: 'Vor dir war Platz zum Dribbeln.',
      geholfen: 'Du hast deinem Freund geholfen, statt stehen zu bleiben.',
      angreifenRichtig: 'Angreifen war richtig – ein Spieler war nah genug.',
      angreifenZuWeit: 'Der Gegner war weit weg. Besser erst den Weg zum Tor versperren.',
      torGedacht: 'Du hast an unser Tor gedacht.',
    },

    // Bewertung, Teil 2: War das gewählte Ziel sinnvoll? (🎯 Ausführung)
    ausfuehren: {
      freieStelle: 'die freie Stelle',
      wegFrei: (ziel) => `Der Weg zu ${ziel} war frei.`,
      besterPassweg: 'Das war noch der beste Passweg.',
      einGegner: 'Ein Gegner',
      einGegnerKlein: 'ein Gegner',
      wegNah: (gegner, ziel) => `${gegner} stand nah am Weg zu ${ziel}.`,
      andererFreier: ' Ein anderer Freund stand freier.',
      freiesTor: 'Du hast das freie Tor gewählt.',
      vorDemTor: (gegner) => `Vor diesem Tor stand ${gegner}.`,
      anderesTorFrei: ' Das andere Tor war frei.',
      freierRaum: 'Du bist in den freien Raum gedribbelt.',
      inGegner: 'Du bist direkt auf einen Gegner zugelaufen.',
      gelaufenFrei: 'Du bist in einen freien Raum gelaufen.',
      gelaufenBesetzt: 'Dort stand schon ein Gegner.',
      gelaufenZuNah: 'Das war zu nah am Ball – dein Freund braucht Platz.',
      gelaufenZu: 'Von dort war der Passweg versperrt.',
      naechsterGreift: 'Der Spieler am nächsten am Ball greift an.',
      wegWeit: (spieler) => `Der Weg war weit. ${spieler} war näher am Ball.`,
      zwischenTor: 'Du stehst zwischen Gegner und Tor.',
      torOffen: 'Der Weg zum Tor blieb offen.',
    },

    // Bewertung, Teil 3: Was ist passiert? (Ergebnis)
    ergebnis: {
      abgefangen: (gegner) => `Oh! ${gegner} stand im Weg und hat den Ball bekommen.`,
      passAngekommen: 'Der Pass ist angekommen!',
      tor: 'Toooor! Der Weg war frei.',
      geblockt: (gegner) => `Geblockt! ${gegner} stand vor dem Tor.`,
      einGegner: 'Ein Gegner',
      ballAbgenommen: (gegner) => `${gegner} stand im Weg und hat dir den Ball abgenommen.`,
      dribbelGut: 'Gut gedribbelt – du hast den Ball behalten!',
      laufBallweg: 'Oh, der Gegner hat den Ball erobert.',
      laufFreiDribbel: 'Super! Du bist frei – und dein Freund nutzt den Platz und dribbelt nach vorne.',
      laufFrei: 'Super! Jetzt bist du anspielbar.',
      laufSchwer: 'Dort ist es schwer, angespielt zu werden.',
      gegentor: 'Oh nein, die Roten haben ein Tor geschossen. Der Weg zum Tor war offen.',
      erobert: 'Ball erobert! Jetzt greifen wir an.',
      selbstGeblockt: 'Geblockt! Du hast im Weg gestanden.',
      selbstAbgefangen: 'Abgefangen! Der Ball gehört uns.',
      richtungAendern: 'Klasse! Der Gegner kommt nicht vorbei und muss die Richtung ändern.',
      druckGemacht: 'Du hast Druck gemacht! Der Gegner musste ausweichen oder abspielen.',
      querSpielen: 'Der Gegner kam nicht durch und musste quer spielen.',
      abgespielt: 'Der Gegner hat abgespielt.',
      laeuftWeiter: 'Der Gegner läuft weiter Richtung Tor.',
    },

    // Kindgerechte Zusammenfassung der Bewertung
    rueckmeldung: {
      idee: { pass: 'den Ball abzuspielen', shoot: 'aufs Tor zu schießen', dribble: 'zu dribbeln', run: 'dich freizulaufen', press: 'den Gegner anzugreifen', cover: 'dich in den Weg zu stellen' },
      super: 'Super gemacht!',
      trotzdemGut: 'Das war trotzdem eine gute Idee! Manchmal klappt es nicht.',
      guteIdeeAber: (idee, warum) => `Gute Idee, ${idee}! Aber schau mal: ${warum}`,
      geklapptAber: 'Hat geklappt! Aber schau mal: ',
      schauMal: 'Schau mal: ',
      tagIdeeGut: 'Gute Idee',
      tagIdeeBesser: 'Andere Idee besser',
      tagZielGut: { shoot: 'Freies Tor', press: 'Richtiger Spieler', cover: 'Gut gestellt', sonst: 'Weg frei' },
      tagZielSchlecht: { press: 'Anderer Spieler näher', cover: 'Weg offen', sonst: 'Gegner im Weg' },
    },

    // „Erst schauen, dann entscheiden“
    schau: {
      tag: 'Schau hin',
      title: 'Wer steht frei?',
      knopf: { icon: '🙅', label: 'Keiner ist frei' },
      start: 'Schau dich um! Welcher Freund steht frei? Tippe ihn an. Wenn keiner frei ist, tippe auf: Keiner ist frei.',
      startAnzeige: '👀 Tippe auf den freien Freund – oder auf „Keiner ist frei“.',
      wiederholen: 'Welcher Freund steht frei? Tippe ihn an.',
      danebenGetippt: 'Tippe auf einen blauen Spieler – oder auf: Keiner ist frei.',
      richtigFrei: (freund) => `Ja! ${freund} steht frei. Zwischen euch ist kein Gegner.`,
      imWeg: (gegner, freund) => `Schau genau: ${gegner} steht im Weg zu ${freund}.`,
      zeigeFrei: (freund) => ` ${freund} steht frei.`,
      keinerFreiZusatz: ' Gerade ist keiner frei.',
      nochmal: ' Probier\'s nochmal!',
      richtigKeiner: 'Richtig! Gerade ist keiner frei. Dann kannst du mit dem Ball in den freien Platz dribbeln.',
      dochFrei: (freund) => `Schau nochmal genau: ${freund} steht frei.`,
      wirklichKeiner: 'Schau nochmal genau. Ist wirklich keiner frei?',
      weiter: 'Und jetzt: Was machst du mit dem Ball?',
    },

    // Bedienung
    bedienung: {
      schritte: {
        passen: ['Tippe auf einen Mitspieler. Oder auf eine freie Stelle.'],
        dribbeln: ['Tippe dorthin, wohin du dribbeln willst.'],
        schiessen: ['Tippe auf ein rotes Tor.'],
        freilaufen: ['Wähle einen blauen Spieler ohne Ball.', 'Wohin soll er laufen? Tippe auf eine freie Stelle.'],
        erobern: ['Welcher blaue Spieler soll den Gegner angreifen? Tippe ihn an.'],
        raum: ['Wähle einen blauen Spieler.', 'Wo soll er sich hinstellen? Tippe auf die Stelle.'],
      },
      hilfeKnopf: 'Hilfe',
      zuerstKnopf: 'Tippe zuerst unten auf einen Knopf.',
      toreRechts: 'Tippe auf eines der roten Tore rechts.',
      losGehts: 'Los geht\'s! Du spielst mit den Blauen.',
      andersProbieren: 'Gleiche Situation – probier etwas anderes!',
      ballImAus: 'Der Ball ist im Aus. Jetzt haben die Roten den Ball. Pass gut auf unsere Tore auf!',
      ballImAusAnzeige: '🏳️ Ball im Aus – jetzt hat Rot den Ball.',
      weiterspielen: 'Weiterspielen',
      fertig: 'Fertig',
      vorher: 'Vorher',
      jetzt: 'Jetzt',
      torBlau: 'TOOOR! ⚽',
      torRot: 'Tor für Rot',
    },

    // Missionsende
    ende: {
      lob: (gut, anzahl) => (gut >= anzahl - 1 ? 'Super gespielt!' : gut >= 2 ? 'Gut gemacht!' : 'Toll, dass du es probiert hast!'),
      sterne: (gut, anzahl) => ` Du hast ${gut} von ${anzahl} Sternen.`,
      spielstand: (blau, rot) => `Blau ${blau} : ${rot} Rot`,
      erkannt: (sofort, anzahl) => `  ·  👀 ${sofort}/${anzahl} sofort erkannt`,
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
