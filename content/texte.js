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
      // V0.6.2: Ansage passt zur Lage – alle nahen Roten stehen hinter dem Ball
      angriffHinten: { title: 'Was machst du mit dem Ball?', tag: 'Angriff', say: 'Ein Roter ist hinter dir! Schau nach vorn. Passen oder dribbeln?' },
      // V0.6.2: die freien Tore haben sich seit der vorigen Entscheidung verändert – nochmal schauen (ohne Lösung)
      abschlussNochmal: { title: 'Welches Tor ist jetzt frei?', tag: 'Torabschluss', say: 'Schau nochmal: Welches Tor ist jetzt frei?' },
      verteidigungNah: { title: 'Wie schützen wir unser Tor?', tag: 'Verteidigung', say: 'Der Gegner will zu unserem Tor! Wo muss dein Spieler stehen, damit er nicht einfach schießen kann?' },
      verteidigungFern: { title: 'Wer hält den Gegner auf?', tag: 'Verteidigung', say: 'Oh, jetzt greifen die Roten an! Wer kann den Spieler mit dem Ball aufhalten?' },
    },

    // Begriffe (bewusst getrennt, damit sich Aussagen nicht widersprechen):
    //   „steht frei“   = ein Mitspieler, zu dem der Passweg JETZT frei ist (Schau-Schritt, Pass zum Mitspieler)
    //   „freier Raum“  = eine Stelle, zu der ein Mitspieler HINLAUFEN kann und vor dem Gegner da ist (Pass in den Raum)
    //   „freier Platz“ = Platz zum Dribbeln
    // Orientierungshilfe (💡)
    hilfe: {
      passen: 'Schau mal auf den Spieler, der leuchtet. Zwischen euch steht kein Gegner.',
      schiessen: 'Vor diesem Tor steht kein Gegner im Weg.',
      dribbeln: 'Dribbel dorthin, wo kein Gegner im Weg ist.',
      dribbelnEng: 'Gerade ist es eng. Dribbel vorsichtig weg vom Gegner – sicher ist es nicht.',
      dribbelnGenau: 'Dribbel genau dorthin, wo es leuchtet – daneben wird es eng.',
      freilaufen: 'Lauf in den freien Raum, weg vom Gegner. Dann kann dein Freund dich anspielen.',
      freilaufenEng: 'Lauf in den freien Raum, weg vom Gegner. Aber Achtung: Die Gegner laufen mit – vielleicht kann dein Freund dich trotzdem nicht anspielen.',
      freilaufenKeinPlatz: 'Gerade ist es überall eng. Such dir eine Stelle mit Platz – weg von den Gegnern.',
      erobern: 'Der Spieler, der am nächsten am Ball ist, greift an.',
      passenRaum: 'Gerade steht keiner frei. Spiel den Ball in den freien Raum – dein Freund läuft hin und ist zuerst da.',
      auchGut: (wege) => ` Auch gut: ${[].concat(wege).join(' oder ')}.`,
      raum: 'Stell dich zwischen den Gegner und unser Tor.',
    },

    // Bewertung, Teil 1: War die Art der Entscheidung sinnvoll? (👀 Entscheidung)
    erkennen: {
      torchance: 'Du hast die Torchance erkannt.',
      freund: 'Du hast gesehen, dass ein Freund frei war.',
      raum: 'Du hast den freien Raum gesehen, in den dein Freund laufen kann.',
      abspielen: 'Abspielen war eine gute Idee.',
      platz: 'Du hast den freien Platz gesehen.',
      schwierig: 'Eine schwierige Lage – nirgends war es richtig frei.',
      besserSchiessen: 'Ein Tor war frei – Schießen wäre gut gewesen.',
      besserPassStattSchuss: 'Beide Tore waren zugestellt. Ein Pass zu einem freien Freund wäre besser gewesen.',
      besserPass: 'Ein Freund stand frei – ein Pass wäre besser gewesen.',
      besserTorchancePass: 'Dein Freund stand frei vor dem Tor – Passen war besser.',
      besserRaum: 'Ein Pass in den freien Raum, in den dein Freund laufen kann, wäre besser gewesen.',
      dribbelnRaumAuch: 'Den Ball zu behalten war gut. Du hättest ihn auch in den freien Raum spielen können, dein Freund wäre hingelaufen.',
      besserRaumStattSchuss: 'Beide Tore waren zugestellt. Ein Pass in den freien Raum, in den dein Freund laufen kann, wäre besser gewesen.',
      besserDribbelnStattSchuss: 'Beide Tore waren zugestellt. Vor dir war aber Platz zum Dribbeln.',
      besserDribbeln: 'Vor dir war Platz zum Dribbeln.',
      geholfen: 'Du hast deinem Freund geholfen, statt stehen zu bleiben.',
      angreifenRichtig: 'Angreifen war richtig – ein Spieler war nah genug.',
      angreifenZuWeit: 'Der Gegner war weit weg. Besser erst den Weg zum Tor versperren.',
      torGedacht: 'Du hast an unser Tor gedacht.',
    },

    // Bewertung, Teil 2: War das gewählte Ziel sinnvoll? (🎯 Ausführung)
    ausfuehren: {
      wegFrei: (ziel) => `Der Weg zu ${ziel} war frei.`,
      besterPassweg: 'Das war noch der beste Passweg.',
      einGegner: 'Ein Gegner',
      einGegnerKlein: 'ein Gegner',
      wegNah: (gegner, ziel) => `${gegner} stand nah am Weg zu ${ziel}.`,
      andererFreier: ' Ein anderer Freund stand freier.',
      raumWaereGegangen: ' In den freien Raum hätte es geklappt – dein Freund wäre hingelaufen.',
      raumFrei: (freund) => `Der Weg zur freien Stelle war frei – ${freund} kam zuerst hin.`,
      raumKnapp: (gegner, freund) => `Knapp, aber ${freund} kam zuerst hin. ${gegner} war fast genauso schnell.`,
      raumZuKnapp: (gegner) => `Zu knapp! ${gegner} war fast gleichzeitig da.`,
      raumGegnerZuerst: (gegner, freund) => `Dort war ${gegner} schneller als ${freund}.`,
      raumWegNah: (gegner) => `${gegner} stand nah am Weg zur freien Stelle.`,
      freiesTor: 'Du hast das freie Tor gewählt.',
      vorDemTor: (gegner) => `Vor diesem Tor stand ${gegner}.`,
      anderesTorFrei: ' Das andere Tor war frei.',
      freierRaum: 'Du bist in den freien Raum gedribbelt.',
      inGegner: 'Du bist direkt auf einen Gegner zugelaufen.',
      dribbelKnapp: (g) => `Das war knapp – ${g} war ganz nah.`,
      dribbelAnschlussPass: 'Jetzt ist dein Freund frei – gut vorbereitet!',
      dribbelAnschlussTor: 'Jetzt ist das Tor frei – gut vorbereitet!',
      dribbelGesichert: 'Nach vorn war kein Platz – gut gesichert!',
      dribbelNachVorn: 'Nach vorn war Platz – dribbel Richtung Tor.',
      dribbelFreund: 'Ein Freund stand frei – ein Pass bringt euch weiter.',
      dribbelZuKurz: 'Das war nur ein kleiner Schritt – dribbel ein Stück weiter.',
      gegnerDazwischen: (g) => (g ? `Dribbel weiter weg von ${g}.` : 'Dribbel weiter weg vom Gegner.'),
      gelaufenFrei: 'Du bist in einen freien Raum gelaufen.',
      gelaufenBesetzt: 'Dort stand schon ein Gegner.',
      gelaufenZuNah: 'Das war zu nah am Ball – dein Freund braucht Platz.',
      gelaufenZu: 'Von dort war der Passweg versperrt.',
      gelaufenZuWeit: 'Das ist zu weit weg vom Ball – dort kann dich dein Freund schwer erreichen.',
      gelaufenZuBeimStart: 'Als du losgelaufen bist, stand ein Gegner im Passweg.',
      naechsterGreift: 'Der Spieler am nächsten am Ball greift an.',
      wegWeit: (spieler) => `Der Weg war weit. ${spieler} war näher am Ball.`,
      zwischenTor: 'Du stehst zwischen Gegner und Tor.',
      torOffen: 'Der Weg zum Tor blieb offen.',
    },

    // V0.6a: belegte Ursachen – nur verwendet, wenn die Simulation sie nachweist (engine.js: ursachen()).
    // Kurz, konkret, für Fünfjährige verständlich.
    ursache: {
      torOben: 'obere', torUnten: 'untere',
      ueberspielt: (g) => `Du bist an ${g} vorbei!`,
      ueberspieltZwei: (g1, g2) => `Du bist an ${g1} und ${g2} vorbei!`,
      gegnerHinterDir: (g) => `${g} war hinter dir. Vor dir war Platz!`,
      vornPlatz: 'Vor dir war Platz!',
      lueckeDurch: (g1, g2) => `Die Lücke zwischen ${g1} und ${g2} war breit genug!`,
      lueckeZuEng: (g1, g2) => `Die Lücke zwischen ${g1} und ${g2} war zu eng.`,
      aussenPlatz: 'Außen herum war Platz.',
      passwegFrei: (f, g) => (g ? `Jetzt ist ${f} frei – ${g} steht nicht mehr im Weg!` : `Jetzt ist ${f} frei!`),
      waechterVerschoben: (g, tor) => `${g} ist vor das ${tor} Tor gelaufen.`,
      anderesFrei: (tor) => `Das ${tor} Tor war frei.`,
      waechterErkannt: (g, torZu) => `${g} ist vor das ${torZu} Tor gelaufen – und du hast das freie Tor gesehen!`,
      anderesTorZu: (g) => `Vor dem anderen Tor stand ${g} – du hast das freie gewählt.`,
      freundDribbelt: (f) => `${f} hatte aber selbst Platz und ist nach vorn gedribbelt.`,
      gegnerMitgelaufen: (g) => `${g} ist mitgelaufen.`,
      gegnerSchoss: (g) => `${g} hat schnell geschossen.`,
      // V0.6.2: veränderte Torlage seit der vorigen Entscheidung (reiner Vorher/Nachher-Vergleich, keine Ursache)
      nachAktion: { dribble: 'dem Dribbling', pass: 'dem Pass' },   // sonst ohne Aktion: „Jetzt war …“
      toreVeraendertJetzt: (tor) => `Jetzt war das ${tor} Tor frei – du hast nochmal geschaut!`,
      torJetztZuJetzt: (tor) => `Jetzt war das ${tor} Tor zu.`,
      toreVeraendert: (akt, tor) => `Nach ${akt} war das ${tor} Tor frei – du hast nochmal geschaut!`,
      torJetztZu: (akt, tor) => `Nach ${akt} war das ${tor} Tor zu.`,
    },

    // Hotfix V0.6.1: Anzeige und Aussprache getrennt. Angezeigt wird „Toooor!“ / „TOOOR!“; die Sprachausgabe sagt „Tor!“
    // (gedehntes „Toooor“ klang auf dem iPad teils wie „Tour“). Wird auf jeden gesprochenen Text angewendet (app.js → say).
    sprechtext: (text) => String(text).replace(/\bto{2,}r!/gi, 'Tor!'),

    // Bewertung, Teil 3: Was ist passiert? (Ergebnis)
    ergebnis: {
      torKurz: 'Toooor!',
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
      laufJetztFrei: 'Jetzt ist der Weg zu dir frei.',
      laufZu: (gegner) => `Jetzt steht ${gegner} im Passweg.`,
      laufZuDribbel: ' Dein Freund dribbelt dafür nach vorne.',
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
      trotzdemGut: 'Das war trotzdem eine gute Idee!',
      superKurz: 'Super!',
      guteIdeeAber: (idee, warum) => `Gute Idee, ${idee}! Aber schau mal: ${warum}`,
      geklapptAber: 'Hat geklappt! Aber schau mal: ',
      schauMal: 'Schau mal: ',
      // V0.6a P2: Was der Ergebnissatz schon sagt („Rot 2 stand vor dem Tor“), wird in der Erklärung nicht wiederholt.
      ohneWiederholung: (ergebnis, warum) => {
        const saetze = String(warum).split(/(?<=[.!?])\s+/);
        const rest = saetze.filter((x) => { const n = x.match(/Rot \d/); return !(n && / stand /.test(x) && ergebnis.includes(n[0] + ' stand')); });
        return rest.length ? rest.join(' ') : warum;
      },
      ergebnisKurzVor: (ergebnis, grund) => {
        const saetze = String(ergebnis).split(/(?<=[.!?])\s+/);
        // V0.6.2: auch wenn der Grund die veränderte Torlage nennt („… war das untere Tor zu.“) – dann reicht „Geblockt!“
        const rest = saetze.filter((x) => { const n = x.match(/Rot \d/); return !(n && / stand /.test(x) && (grund.includes(n[0]) || / Tor zu\./.test(grund))); });
        return rest.length ? rest.join(' ') : ergebnis;
      },
      tagIdeeGut: 'Gute Idee',
      tagIdeeBesser: 'Andere Idee besser',
      tagZielGut: { shoot: 'Freies Tor', press: 'Richtiger Spieler', cover: 'Gut gestellt', run: 'Guter Platz', sonst: 'Weg frei' },
      tagZielSchlecht: { press: 'Anderer Spieler näher', cover: 'Weg offen', sonst: 'Gegner im Weg' },
      // Freilaufen: Etikett nach dem Grund (Laufziel vs. Passweg)
      tagLaufSchlecht: { besetzt: 'Gegner dort', zuNah: 'Zu nah am Ball', zuWeit: 'Zu weit weg', versperrt: 'Passweg zu' },
      // Dribbeln: Etikett nach dem Grund (Paket D, E3/E4)
      tagDribbel: { raum: 'Weg frei', anschlussPass: 'Freund jetzt frei', anschlussTor: 'Tor jetzt frei', sichern: 'Ball gesichert',
        nachVorn: 'Vorn war Platz', freund: 'Freund war frei', zuKurz: 'Zu kurz', knapp: 'Zu knapp', direkt: 'Gegner im Weg', dazwischen: 'Gegner kam dazu' },
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
      keinerFreiRaumZusatz: ' Gerade steht keiner frei. Aber ein Freund kann in den freien Raum laufen.',
      nochmal: ' Probier\'s nochmal!',
      richtigKeiner: 'Richtig! Gerade ist keiner frei. Dann kannst du mit dem Ball in den freien Platz dribbeln.',
      richtigKeinerRaum: 'Richtig! Gerade steht keiner frei. Du kannst in den freien Platz dribbeln. Oder spiel den Ball in den freien Raum – dein Freund läuft hin.',
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
      neueSituation: 'Neue Situation! Schau genau hin.',
      missionsart: { lernen: '🎓 Lernen', spiel: '🏆 Spiel' },
      neueSituationAnzeige: '🔄 Neue Situation',
      missionGewaehlt: (titel, einfuehrung) => `${titel}${/[.!?]$/.test(titel) ? '' : '.'} ${einfuehrung} Tippe auf Los geht's!`,
      weiterspielen: 'Weiterspielen',
      fertig: 'Fertig',
      vorher: 'Vorher',
      jetzt: 'Jetzt',
      torBlau: 'TOOOR! ⚽',
      torRot: 'Tor für Rot',
      // V0.5.1: Navigation
      neustartFrage: 'Willst du nochmal von vorn anfangen?',
      letzteMission: 'Das war die letzte Mission. Du kannst nochmal spielen oder eine andere Mission aussuchen.',
      naechsteMission: (titel, einfuehrung) => `${titel}${/[.!?]$/.test(titel) ? '' : '.'} ${einfuehrung}`.trim(),
    },

    // V0.6.2: Folge-Moment – erst schauen, dann die Erklärung
    folge: { schau: 'Schau!', dauer: 1400 },

    // V0.6a P4: Lernergebnis je Situation (Stern = Kernleistung geschafft; mit Hilfe = voller Stern + 💡)
    lern: {
      titel: { torWaehlen: 'Freies Tor finden', andereLoesung: 'Beide Tore zu', nochmalSchauen: 'Nochmal schauen', platzVorDir: 'Platz vor dir', vorbei: 'Am Gegner vorbei', luecke: 'Lücke oder außen herum', angriff: 'Angriff', verteidigung: 'Abwehr' },
      geschafft: {
        torWaehlen: 'Geschafft: Du hast das freie Tor gefunden!',
        andereLoesung: 'Geschafft: Beide Tore waren zu – und du hast eine andere Lösung gefunden!',
        nochmalSchauen: 'Geschafft: Du hast nochmal geschaut und das freie Tor gefunden!',
        platzVorDir: 'Geschafft: Du hast den Platz vor dir genutzt!',
        vorbei: 'Geschafft: Du bist am Gegner vorbeigekommen!',
        luecke: 'Geschafft: Du hast einen sicheren Weg an den Gegnern vorbei gefunden!',
        angriff: 'Geschafft: Im Angriff hast du gut entschieden!',
        verteidigung: 'Geschafft: In der Abwehr hast du gut entschieden!',
      },
      nochNicht: {
        torWaehlen: 'Das üben wir nochmal: Schau vor dem Schuss, welches Tor frei ist.',
        andereLoesung: 'Das üben wir nochmal: Wenn beide Tore zu sind – steht ein Freund frei?',
        nochmalSchauen: 'Das üben wir nochmal: Nach dem Dribbeln nochmal schauen – welches Tor ist jetzt frei?',
        platzVorDir: 'Das üben wir nochmal: Der Gegner ist hinter dir – vor dir ist Platz.',
        vorbei: 'Das üben wir nochmal: Dribbel am Gegner vorbei – oben oder unten.',
        luecke: 'Das üben wir nochmal: Ist die Lücke breit genug? Sonst außen herum.',
        angriff: 'Das üben wir nochmal: Schau, wo frei ist, bevor du entscheidest.',
        verteidigung: 'Das üben wir nochmal: Schütze zuerst den Weg zu unserem Tor.',
      },
      geschafftKurz: 'Aufgabe geschafft!', // gesprochen (die Ursache hat die Rückmeldung schon genannt); angezeigt wird der ganze Satz
      mitHilfe: 'mit Hilfe',
      situationNochmal: 'Nochmal',
      situationNochmalAnsage: 'Die gleiche Situation nochmal von vorn!',
      kurzZurueck: 'Nochmal',
      kurzHoeren: 'Nochmal hören',
      vorbeiMoment: 'Vorbei!',
    },

    // Missionsende
    ende: {
      lob: (gut, anzahl) => (gut >= anzahl - 1 ? 'Super gespielt!' : gut >= 2 ? 'Gut gemacht!' : 'Toll, dass du es probiert hast!'),
      sterne: (gut, anzahl) => ` Du hast ${gut} von ${anzahl} Sternen.`,
      spielstand: (blau, rot) => `Blau ${blau} : ${rot} Rot`,
      erkannt: (sofort, anzahl) => `  ·  👀 ${sofort}/${anzahl} sofort erkannt`,
      // V0.6a P4: Sterne je Lernsituation
      sterneSituationen: (gut, anzahl) => ` Du hast ${gut} von ${anzahl} Aufgaben geschafft.`,
      zaehler: (gut, anzahl, hilfe) => `⭐ ${gut} von ${anzahl} geschafft` + (hilfe ? `  ·  💡 ${hilfe} mit Hilfe` : ''),
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
