const appState = {
  goals: [
    {
      id: "seed-short-sql",
      type: "short-term",
      title: "Nauciti SQL osnove",
      reason: "Da brze razumem podatke i donosim bolje odluke.",
      category: "Career & Work",
      categoryName: "Karijera i posao",
      subcategory: null,
      subcategoryName: "Nije izabrana",
      customSubcategoryName: "",
      goalType: "Vestina",
      targetDate: null,
      duration: "14 dana",
      frequency: null,
      firstAction: "Prodji SELECT, WHERE i JOIN primere",
      mainMilestone: "",
      successMeasurement: "Mogu samostalno da napisem 10 korisnih SQL upita.",
      mentorAnswers: {},
      finalGoalReason: "Da ojacam tehnicku osnovu za posao.",
      createdAt: "2026-05-19T08:00:00.000Z"
    },
    {
      id: "seed-short-training",
      type: "habit",
      title: "Trening 3x nedeljno",
      reason: "Da imam vise energije i stabilniji ritam.",
      category: "Health & Energy",
      categoryName: "Zdravlje i energija",
      subcategory: null,
      subcategoryName: "Nije izabrana",
      customSubcategoryName: "",
      goalType: "Energija",
      targetDate: null,
      duration: null,
      frequency: "3x nedeljno",
      bestTime: "Popodne",
      firstAction: "Uraditi prvi trening od 30 minuta",
      mainMilestone: "",
      successMeasurement: "Tri treninga svake nedelje tokom mesec dana.",
      mentorAnswers: {},
      finalGoalReason: "Da telo moze da prati moje ambicije.",
      createdAt: "2026-05-19T08:05:00.000Z"
    },
    {
      id: "seed-long-app",
      type: "long-term",
      title: "Napraviti licnu aplikaciju",
      reason: "Da spojim znanje, disciplinu i konkretan projekat.",
      category: "Career & Work",
      categoryName: "Karijera i posao",
      subcategory: null,
      subcategoryName: "Nije izabrana",
      customSubcategoryName: "",
      goalType: "Projekat",
      targetDate: "2026-08-31",
      duration: null,
      frequency: null,
      firstAction: "Definisati funkcionalnosti aplikacije",
      mainMilestone: "Objaviti prvu upotrebljivu verziju",
      successMeasurement: "Aplikacija ima MVP, sacuvane podatke i dnevnu upotrebu.",
      mentorAnswers: {},
      finalGoalReason: "Da imam realan portfolio projekat.",
      createdAt: "2026-05-19T08:10:00.000Z",
      actions: [
        { id: "seed-long-app-action-0", title: "Definisati funkcionalnosti aplikacije", cadence: "Dnevno", completed: false },
        { id: "seed-long-app-action-1", title: "Napraviti osnovnu strukturu projekta", cadence: "Dnevno", completed: false },
        { id: "seed-long-app-action-2", title: "Implementirati prvu funkcionalnost", cadence: "Po planu", completed: false },
        { id: "seed-long-app-action-3", title: "Testirati i popraviti MVP", cadence: "Po planu", completed: false }
      ]
    },
    {
      id: "seed-long-savings",
      type: "long-term",
      title: "Ustedeti 3000 evra",
      reason: "Da napravim sigurnosni fond i mirnije donosim odluke.",
      category: "Finance",
      categoryName: "Finansije",
      subcategory: null,
      subcategoryName: "Nije izabrana",
      customSubcategoryName: "",
      goalType: "Sigurnost",
      targetDate: "2026-12-31",
      duration: null,
      frequency: null,
      firstAction: "Odvojiti prvi iznos na poseban racun",
      mainMilestone: "Dostici 1500 evra do pola puta",
      successMeasurement: "Na posebnom racunu stoji 3000 evra.",
      mentorAnswers: {},
      finalGoalReason: "Da imam stabilniju finansijsku osnovu.",
      createdAt: "2026-05-19T08:15:00.000Z",
      actions: [
        { id: "seed-long-savings-action-0", title: "Izracunati mesecni iznos stednje", cadence: "Jednom", completed: false },
        { id: "seed-long-savings-action-1", title: "Otvoriti poseban stedni prostor", cadence: "Jednom", completed: false },
        { id: "seed-long-savings-action-2", title: "Prebaciti novac prvog u mesecu", cadence: "Mesecno", completed: false },
        { id: "seed-long-savings-action-3", title: "Pregledati troskove svake nedelje", cadence: "Nedeljno", completed: false }
      ]
    }
  ],
  calendarEvents: [],
  slotNotes: {},
  currentView: "month",
  selectedDate: null,
  selectedEventId: null,
  selectedGoalId: null,
  selectedActionId: null,
  selectedGoalNoteId: null,
  selectedSlotHour: null,
  goalFocusTab: "overview",
  selectedCategory: null,
  selectedSubcategory: null,
  customSubcategoryName: "",
  expandedGoalIds: []
};

const TYPE_LABELS = {
  "long-term": "Dugoročni cilj",
  "short-term": "Kratkoročni cilj",
  habit: "Navika"
};

const CATEGORY_LABELS = {
  "Personal Growth": "Lični razvoj",
  "Health & Energy": "Zdravlje i energija",
  "Career & Work": "Karijera i posao",
  Finance: "Finansije",
  "Relationships & Family": "Odnosi i porodica",
  Other: "Ostalo"
};

const MENTOR_INTRO_DEFAULT = {
  title: "Pokreni svoj uspeh",
  text: "Izaberi jednu oblast života i pitanja, kalendar i beleške će pratiti taj fokus."
};

const CATEGORY_MENTOR_INTROS = {
  "Personal Growth": {
    title: "Rast počinje iznutra",
    text: "Lični razvoj ti pomaže da jasnije misliš, sigurnije biraš i svakog dana gradiš verziju sebe kojoj možeš da veruješ."
  },
  "Health & Energy": {
    title: "Energija je temelj",
    text: "Zdravlje daje snagu za sve ostale ciljeve: bolji ritam, više fokusa i telo koje može da prati tvoje ambicije."
  },
  "Career & Work": {
    title: "Usmeri svoj rad",
    text: "Karijera raste kada znaš šta gradiš, koje veštine jačaš i koji sledeći korak ima najveći uticaj."
  },
  Finance: {
    title: "Novac prati plan",
    text: "Finansijski cilj donosi mir, jasnije odluke i osećaj kontrole nad izborima koje praviš danas i sutra."
  },
  "Relationships & Family": {
    title: "Odnosi daju snagu",
    text: "Kvalitetni odnosi traže pažnju, razgovor i vreme; kada ih neguješ, život dobija stabilniji oslonac."
  },
  Other: {
    title: "Tvoj fokus ima prostor",
    text: "Ako cilj ne staje u standardne kategorije, i dalje zaslužuje jasan plan, ritam i način da meriš napredak."
  }
};

const MENTOR_SYMBOL_DEFAULT = {
  image: "icons/lotus-panel-symbol.svg",
  color: "#2f2418",
  size: "min(48%, 170px)",
  yOffset: "-58px"
};

const CATEGORY_MENTOR_SYMBOLS = {
  "Personal Growth": {
    image: "icons/brain-outline-symbol.svg",
    color: "#2f2418",
    size: "min(30.1%, 230px)",
    yOffset: "-55px"
  },
  "Health & Energy": {
    image: "icons/health-panel-symbol.svg",
    color: "#2f2418",
    size: "min(27.2%, 152px)",
    yOffset: "-56px"
  },
  "Career & Work": {
    image: "icons/career-panel-symbol.svg",
    color: "#2f2418",
    size: "min(25.9%, 143.5px)",
    yOffset: "-62px"
  },
  Finance: {
    image: "icons/finance-panel-symbol.svg",
    color: "#2f2418",
    size: "min(22.2%, 123px)",
    yOffset: "-62px"
  },
  "Relationships & Family": {
    image: "icons/relationships-panel-symbol.svg",
    color: "#2f2418",
    size: "min(29.6%, 164px)",
    yOffset: "-55px"
  },
  Other: {
    image: "icons/other-panel-symbol.svg",
    color: "#2f2418",
    size: "min(29%, 196px)",
    yOffset: "-56px"
  }
};

let mentorSymbolImage = MENTOR_SYMBOL_DEFAULT.image;
let mentorSymbolTimer = null;

const TYPE_FROM_LABEL = {
  "Dugoročni cilj": "long-term",
  "Kratkoročni cilj": "short-term",
  Navika: "habit"
};

const FIRST_QUESTION = {
  key: "creationType",
  text: "Da li ovaj fokus želiš da postaviš kao dugoročni cilj, kratkoročni cilj ili naviku?",
  type: "options",
  options: ["Dugoročni cilj", "Kratkoročni cilj", "Navika"]
};

const TYPE_FOLLOW_UP_QUESTIONS = {
  "long-term": [
    { key: "targetDate", text: "Koji datum želiš kao rok ili glavnu tačku provere?", type: "date" }
  ],
  "short-term": [
    { key: "duration", text: "Koliko dugo želiš da traje ovaj prvi intenzivni fokus?", type: "options", options: ["3 dana", "5 dana", "7 dana", "14 dana", "30 dana"] }
  ],
  habit: [
    { key: "frequency", text: "Koliko često realno možeš da ponavljaš ovu naviku?", type: "options", options: ["Dnevno", "3x nedeljno", "Nedeljno"] },
    { key: "bestTime", text: "U kom delu dana ima najviše smisla da je radiš?", type: "options", options: ["Jutro", "Popodne", "Veče"] }
  ]
};

function q(key, text, type, placeholder) {
  return { key, text, type: type || "textarea", placeholder: placeholder || "" };
}

function createQuestionSet(config) {
  return [
    q("title", config.title, "text", config.titlePlaceholder),
    q("purpose", config.purpose),
    q("successMeasurement", config.successMeasurement),
    q("action", config.action)
  ];
}

function sub(id, name, description, icon, goalTypes, config) {
  return {
    id,
    name,
    description,
    icon,
    goalTypes: goalTypes || [],
    questions: createQuestionSet(config)
  };
}

// Add future categories, subcategories, goal types, and mentor questions here.
// The UI reads this structure directly, so no separate hardcoded flow is needed.
const goalCategories = [
  {
    id: "personal_growth",
    value: "Personal Growth",
    name: "Lični razvoj",
    icon: "icons/brain_icon.svg",
    subcategories: [
      sub("confidence", "Samopouzdanje", "Ojačaj unutrašnju sigurnost, glas i prisustvo.", "icons/brain_icon.svg", ["Društveno samopouzdanje", "Telesno samopouzdanje", "Javni nastup", "Odluke"], {
        title: "Kako bi nazvao/la cilj za svoje samopouzdanje?",
        titlePlaceholder: "Primer: Govorim sigurnije na sastancima",
        purpose: "Zašto ti je baš sada važno da se osećaš sigurnije u sebi?",
        currentState: "U kojim situacijama trenutno najviše sumnjaš u sebe?",
        desiredResult: "Kako bi izgledalo tvoje ponašanje kada bi imao/la više samopouzdanja?",
        timeframe: "Kada želiš da primetiš prvu jasnu promenu u načinu na koji nastupaš?",
        action: "Koju malu vežbu hrabrosti možeš realno da uradiš ove nedelje?",
        obstacle: "Šta te najčešće povuče nazad: strah od greške, mišljenje drugih, perfekcionizam ili nešto četvrto?",
        support: "Koja osoba, rutina ili podsetnik može da ti pomogne da vežbaš sigurniji nastup?",
        successMeasurement: "Po čemu ćeš meriti napredak: broju iniciranih razgovora, javnih istupa, odluka ili nečem drugom?",
        motivation: "Koji osećaj želiš da nosiš kada prestaneš da se umanjuješ?"
      }),
      sub("discipline", "Disciplina", "Izgradi doslednost bez oslanjanja na trenutnu motivaciju.", "icons/personal_development_meditation.svg", ["Jutarnja rutina", "Radni blokovi", "Večernja rutina", "Odvikavanje"], {
        title: "Kako se zove disciplina koju želiš da izgradiš?",
        titlePlaceholder: "Primer: 90 minuta dubokog rada svakog jutra",
        purpose: "Zašto bi veća disciplina promenila kvalitet tvog dana?",
        currentState: "Gde ti disciplina trenutno najčešće pukne?",
        desiredResult: "Kako izgleda dan u kome si ponosan/na na svoju doslednost?",
        timeframe: "Koliko dana želiš da držiš prvi dokaz kontinuiteta?",
        action: "Koji tačan okidač i prvu akciju možeš da vežeš za ovu disciplinu?",
        obstacle: "Šta najčešće ruši ritam: umor, telefon, nered, ljudi ili nejasan plan?",
        support: "Koji sistem će ti olakšati disciplinu: alarm, lista, blokiran telefon, partner odgovornosti?",
        successMeasurement: "Kako ćeš pratiti niz: čekiranje dana, minuta, završenih blokova ili rezultata?",
        motivation: "Kakva osoba postaješ kada održiš obećanje sebi?"
      }),
      sub("mindset", "Mentalni stav", "Promeni način razmišljanja koji vodi odluke i energiju.", "icons/brain_icon.svg", ["Rast", "Otpornost", "Fokus", "Optimizam"], {
        title: "Kako bi nazvao/la promenu mentalnog stava koju želiš?",
        titlePlaceholder: "Primer: Biram rast umesto odustajanja",
        purpose: "Zašto ti je ovaj mentalni pomak važan u ovoj fazi života?",
        currentState: "Koja misao ili uverenje te trenutno najviše ograničava?",
        desiredResult: "Kako želiš da reaguješ kada naiđeš na pritisak ili neuspeh?",
        timeframe: "U kom narednom periodu želiš svesno da vežbaš ovaj novi stav?",
        action: "Koju rečenicu, refleksiju ili odluku možeš da ponavljaš kada se stari obrazac pojavi?",
        obstacle: "Koje situacije će najverovatnije aktivirati stari način razmišljanja?",
        support: "Koje knjige, pitanja, ljudi ili rituali mogu da hrane novi stav?",
        successMeasurement: "Kako ćeš prepoznati da drugačije misliš: kroz dnevnik, odluke, smirenost ili akciju?",
        motivation: "Šta bi ti emotivno značilo da više ne živiš iz tog starog ograničenja?"
      }),
      sub("learning", "Učenje", "Usvoji znanje ili veštinu kroz jasan ritam vežbe.", "icons/brain_icon.svg", ["Jezik", "Kurs", "Knjige", "Tehnička veština"], {
        title: "Koju oblast učenja želiš da pretvoriš u cilj?",
        titlePlaceholder: "Primer: Naučiti osnove JavaScripta",
        purpose: "Zašto je ova veština ili znanje vredno tvog vremena?",
        currentState: "Šta već znaš, a gde se trenutno najviše zaglavljuješ?",
        desiredResult: "Šta želiš da umeš da objasniš, uradiš ili napraviš posle ovog cilja?",
        timeframe: "Do kada želiš da završiš prvi smislen modul, knjigu ili projekat?",
        action: "Koliko vremena i kojim danima možeš realno da posvetiš učenju?",
        obstacle: "Šta ti obično prekine učenje: dosada, previše izvora, manjak vremena ili nejasan plan?",
        support: "Koji kurs, mentor, beleške ili projekat će ti pomoći da učenje ne ostane teorija?",
        successMeasurement: "Kako ćeš testirati napredak: kvizom, projektom, razgovorom ili demonstracijom?",
        motivation: "Koja vrata želiš sebi da otvoriš ovim učenjem?"
      }),
      sub("emotional_balance", "Emocionalna ravnoteža", "Razvij smirenije reakcije, oporavak i samoregulaciju.", "icons/personal_development_meditation.svg", ["Stres", "Anksioznost", "Strpljenje", "Samopodrška"], {
        title: "Kako bi opisao/la cilj za emotivnu ravnotežu?",
        titlePlaceholder: "Primer: Mirnije reagujem pod pritiskom",
        purpose: "Zašto želiš više emocionalne stabilnosti baš sada?",
        currentState: "Koje emocije ili situacije te trenutno najviše izbace iz centra?",
        desiredResult: "Kako bi izgledala tvoja zrelija reakcija u tim trenucima?",
        timeframe: "Kada želiš da primetiš da se brže vraćaš u mir?",
        action: "Koju tehniku regulacije možeš da vežbaš pre nego što postane hitno?",
        obstacle: "Šta te sprečava da zastaneš: impuls, umor, ponos, krivica ili okruženje?",
        support: "Koje navike, razgovori ili stručna podrška mogu da ti daju više prostora?",
        successMeasurement: "Kako ćeš meriti ravnotežu: intenzitet reakcije, vreme oporavka, dnevnik emocija?",
        motivation: "Kakav mir želiš da vratiš sebi i ljudima oko sebe?"
      }),
      sub("spiritual_growth", "Duhovni rast", "Produbi smisao, mir, vrednosti i unutrašnju praksu.", "icons/mentor_lotus.svg", ["Molitva", "Meditacija", "Vrednosti", "Zahvalnost"], {
        title: "Kako želiš da nazoveš svoj duhovni fokus?",
        titlePlaceholder: "Primer: Svakog jutra 10 minuta tišine",
        purpose: "Zašto ti je važno da neguješ dublji osećaj smisla?",
        currentState: "Kako trenutno izgleda tvoja duhovna ili reflektivna praksa?",
        desiredResult: "Šta želiš da osećaš, razumeš ili živiš doslednije?",
        timeframe: "Koliko dugo želiš da neguješ prvi ciklus ove prakse?",
        action: "Koji jednostavan ritual možeš da uvedeš bez pritiska i dokazivanja?",
        obstacle: "Šta te odvaja od mira: žurba, sumnja, buka, nedoslednost ili nešto drugo?",
        support: "Koji tekst, prostor, zajednica ili mentor može da podrži ovu praksu?",
        successMeasurement: "Kako ćeš prepoznati rast: kroz smirenost, odluke, zahvalnost ili prisutnost?",
        motivation: "Koja unutrašnja istina te zove da ostaneš posvećen/a?"
      }),
      sub("creativity", "Kreativnost", "Pokreni stvaranje, izražavanje i završavanje ideja.", "icons/other_target.svg", ["Pisanje", "Muzika", "Dizajn", "Snimanje", "Umetnost"], {
        title: "Koji kreativni cilj želiš da pokreneš?",
        titlePlaceholder: "Primer: Završiti prvu seriju ilustracija",
        purpose: "Zašto ti je važno da ovu ideju izbaciš iz glave u stvaran oblik?",
        currentState: "Gde je projekat sada: ideja, skica, pola gotovo ili blokada?",
        desiredResult: "Šta želiš da postoji na kraju: komad rada, serija, objava, portfolio?",
        timeframe: "Do kada želiš da imaš prvu verziju koju možeš da pokažeš?",
        action: "Koji kreativni blok rada možeš da zakažeš ove nedelje?",
        obstacle: "Šta najčešće koči stvaranje: perfekcionizam, poređenje, umor ili haos ideja?",
        support: "Koji alat, prostor, referenca ili publika će ti pomoći da završiš?",
        successMeasurement: "Kako ćeš meriti napredak: satima stvaranja, završenim delovima ili objavama?",
        motivation: "Šta bi ti značilo da prestaneš da odlažeš sopstveni izraz?"
      })
    ]
  },
  {
    id: "health_energy",
    value: "Health & Energy",
    name: "Zdravlje i energija",
    icon: "icons/health_energy_heart.svg",
    subcategories: [
      sub("gym_strength", "Teretana / Snaga", "Izgradi snagu, mišiće, disciplinu i fizičko samopouzdanje.", "icons/health_energy_heart.svg", ["Mišićna masa", "Gubitak masti", "Snaga", "Izdržljivost", "Mobilnost", "Doslednost"], {
        title: "Šta tačno želiš da popraviš u teretani?",
        titlePlaceholder: "Primer: Trenirati 4 puta nedeljno i ojačati čučanj",
        purpose: "Zašto ti je važno da unaprediš telo i snagu baš sada?",
        currentState: "Kakav je tvoj trenutni nivo forme i kako sada izgleda trening?",
        desiredResult: "Koji rezultat bi te učinio/la ponosnim/om za 30, 60 ili 90 dana?",
        timeframe: "Kada želiš da vidiš prvi merljiv dokaz napretka?",
        action: "Koliko dana nedeljno realno možeš da treniraš i koji tip treninga ti odgovara?",
        obstacle: "Šta bi te moglo zaustaviti: povreda, vreme, motivacija, plan ili ishrana?",
        support: "Koji program, trener, partner ili tracking aplikacija može da ti pomogne?",
        successMeasurement: "Kako ćeš meriti napredak: kilaža, obimi, ponavljanja, težine ili kontinuitet?",
        motivation: "Kako želiš da se osećaš u svom telu kada ostaneš dosledan/na?"
      }),
      sub("weight_loss", "Mršavljenje", "Skini višak kilograma na održiv i zdrav način.", "icons/health_energy_heart.svg", ["Kalorijski deficit", "Kretanje", "Ishrana", "Navike"], {
        title: "Kako želiš da formulišeš cilj mršavljenja?",
        titlePlaceholder: "Primer: Izgubiti 5 kg uz stabilnu energiju",
        purpose: "Zašto ti je važno da smanjiš težinu na zdrav način?",
        currentState: "Kakve su ti sada navike u ishrani, kretanju i praćenju težine?",
        desiredResult: "Koji fizički i energetski rezultat želiš, osim samog broja na vagi?",
        timeframe: "Koji vremenski okvir je realan i zdrav za ovaj rezultat?",
        action: "Koje dve promene možeš da uvedeš bez ekstremnih dijeta?",
        obstacle: "Šta ti najčešće pokvari ritam: glad, stres, slatkiši, društvo ili vikendi?",
        support: "Koji obroci, kupovina, aplikacija ili osoba mogu da ti olakšaju izbor?",
        successMeasurement: "Kako ćeš pratiti napredak: težina, obimi, fotografije, energija ili navike?",
        motivation: "Šta želiš da povratiš kroz ovaj proces: lakoću, zdravlje, samopouzdanje ili kontrolu?"
      }),
      sub("muscle_gain", "Mišićna masa", "Povećaj masu kroz trening, ishranu i oporavak.", "icons/health_energy_heart.svg", ["Hipertrofija", "Snaga", "Ishrana", "Rutina"], {
        title: "Koji cilj za mišićnu masu želiš da postaviš?",
        titlePlaceholder: "Primer: Dobiti 3 kg kvalitetne mase",
        purpose: "Zašto želiš više mišića i snage u ovoj fazi?",
        currentState: "Kako trenutno treniraš i koliko proteina/kalorija okvirno unosiš?",
        desiredResult: "Koje promene želiš da vidiš u izgledu, snazi ili držanju tela?",
        timeframe: "U kom periodu želiš da proceniš prvi ciklus napretka?",
        action: "Koji trening split i obroci su realni za tvoj raspored?",
        obstacle: "Šta bi moglo da ograniči rast: premalo hrane, slab san, preskakanje treninga ili loš plan?",
        support: "Koji plan ishrane, tracker, trener ili partner može da te drži na kursu?",
        successMeasurement: "Kako ćeš meriti masu: telesna težina, obimi, slike, progresivno opterećenje?",
        motivation: "Kakav osećaj snage i prisustva želiš da izgradiš?"
      }),
      sub("nutrition", "Ishrana", "Uredi obroke, energiju i odnos prema hrani.", "icons/health_energy_heart.svg", ["Plan obroka", "Protein", "Manje šećera", "Više energije"], {
        title: "Koju promenu u ishrani želiš da napraviš?",
        titlePlaceholder: "Primer: Pripremati zdrave ručkove 5 dana nedeljno",
        purpose: "Zašto želiš da promeniš način ishrane?",
        currentState: "Kako sada izgledaju tvoji tipični obroci, grickalice i pića?",
        desiredResult: "Šta želiš da se promeni u energiji, telu ili kontroli apetita?",
        timeframe: "Koliko dugo želiš da testiraš novi režim obroka?",
        action: "Koji konkretan obrok, kupovinu ili pripremu možeš prvo da uvedeš?",
        obstacle: "Šta najviše remeti ishranu: nedostatak vremena, glad, dostava, emocije ili posao?",
        support: "Koji recepti, lista kupovine, meal prep ili nutricionista mogu da pomognu?",
        successMeasurement: "Kako ćeš meriti uspeh: broj pripremljenih obroka, energija, težina ili krvne analize?",
        motivation: "Kakav odnos prema hrani želiš da izgradiš?"
      }),
      sub("running_athletics", "Trčanje / Atletika", "Poboljšaj kondiciju, ritam, brzinu i izdržljivost.", "icons/health_energy_heart.svg", ["5K", "10K", "Brzina", "Izdržljivost", "Doslednost"], {
        title: "Koji trkački ili atletski cilj želiš?",
        titlePlaceholder: "Primer: Istrčati 5 km bez pauze",
        purpose: "Zašto ti je važno da poboljšaš kondiciju ili trčanje?",
        currentState: "Koliko trenutno možeš da trčiš i kakav ti je tempo/opterećenje?",
        desiredResult: "Koju distancu, vreme ili osećaj u telu želiš da dostigneš?",
        timeframe: "Do kog datuma ili perioda želiš da testiraš rezultat?",
        action: "Koliko treninga nedeljno možeš da uklopiš bez preopterećenja?",
        obstacle: "Šta može da te zaustavi: bol, vreme, loša oprema, dosada ili nepravilno povećanje intenziteta?",
        support: "Koji plan, patike, ruta, sat ili društvo za trčanje mogu da pomognu?",
        successMeasurement: "Kako ćeš pratiti napredak: distanca, tempo, puls, osećaj ili broj treninga?",
        motivation: "Šta za tebe simbolizuje trenutak kada istrčiš ono što sada deluje teško?"
      }),
      sub("mobility_flexibility", "Mobilnost i fleksibilnost", "Poboljšaj pokret, držanje i osećaj lakoće u telu.", "icons/health_energy_heart.svg", ["Kukovi", "Leđa", "Ramena", "Joga", "Prevencija povreda"], {
        title: "Koju mobilnost ili fleksibilnost želiš da poboljšaš?",
        titlePlaceholder: "Primer: Svako veče 12 minuta mobilnosti za kukove",
        purpose: "Zašto ti je važno da se krećeš lakše i bez zatezanja?",
        currentState: "Gde trenutno osećaš ukočenost, bol ili ograničen pokret?",
        desiredResult: "Koji pokret, položaj ili osećaj u telu želiš da dobiješ?",
        timeframe: "Kada želiš da primetiš veću lakoću u svakodnevnom kretanju?",
        action: "Koju kratku rutinu možeš da radiš i kojim danima?",
        obstacle: "Šta će ti najlakše prekinuti rutinu: zaboravljanje, dosada, bol ili manjak prostora?",
        support: "Koji video, fizioterapeut, joga čas ili podsetnik može da te vodi?",
        successMeasurement: "Kako ćeš meriti napredak: opseg pokreta, bol, fotografija položaja ili kontinuitet?",
        motivation: "Kako želiš da se oseća tvoje telo kada mu konačno daš pažnju?"
      }),
      sub("sleep_recovery", "San i oporavak", "Vrati kvalitet sna, regeneraciju i mirniji ritam.", "icons/health_energy_heart.svg", ["Ranije spavanje", "Dublji san", "Manje ekrana", "Oporavak"], {
        title: "Koji cilj za san i oporavak želiš?",
        titlePlaceholder: "Primer: U krevetu do 23:00 tokom radne nedelje",
        purpose: "Zašto je bolji san sada prioritet za tvoje zdravlje i fokus?",
        currentState: "Kako trenutno izgleda tvoj ritam spavanja, buđenja i oporavka?",
        desiredResult: "Kako želiš da se budiš i funkcionišeš tokom dana?",
        timeframe: "Koliko dugo želiš da testiraš novu večernju rutinu?",
        action: "Koju konkretnu promenu možeš da uvedeš 60 minuta pre spavanja?",
        obstacle: "Šta najčešće krade san: ekran, posao, kasna hrana, stres ili nered u rasporedu?",
        support: "Koji alarm, režim svetla, rutina ili dogovor sa ukućanima može da pomogne?",
        successMeasurement: "Kako ćeš meriti san: sati, kvalitet buđenja, energija, aplikacija ili dnevnik?",
        motivation: "Šta bi ti značilo da se odmaraš bez griže savesti?"
      }),
      sub("energy_management", "Upravljanje energijom", "Rasporedi napor, fokus i odmor pametnije kroz dan.", "icons/health_energy_heart.svg", ["Fokus", "Pauze", "Manje iscrpljenosti", "Ritam dana"], {
        title: "Kako želiš da upravljaš svojom energijom?",
        titlePlaceholder: "Primer: Planirati najteži rad pre podne",
        purpose: "Zašto želiš da zaštitiš energiju umesto da je trošiš nasumično?",
        currentState: "Kada tokom dana imaš najviše energije, a kada najviše padaš?",
        desiredResult: "Kako bi izgledao dan u kome imaš stabilniji fokus i manje iscrpljenosti?",
        timeframe: "Koliko dugo želiš da posmatraš i podešavaš svoj energetski ritam?",
        action: "Koju promenu u rasporedu, pauzama ili obrocima možeš prvo da probaš?",
        obstacle: "Šta ti najviše prazni baterije: ljudi, ekran, haos, obaveze ili premalo sna?",
        support: "Koji kalendar, blokovi fokusa, granice ili ritual pauze mogu da pomognu?",
        successMeasurement: "Kako ćeš meriti energiju: ocenom dana, završenim fokus blokovima ili manje padova?",
        motivation: "Šta želiš da imaš više na kraju dana: mira, prisutnosti, snage ili vremena?"
      })
    ]
  },
  {
    id: "career_work",
    value: "Career & Work",
    name: "Karijera i posao",
    icon: "icons/career_business_briefcase.svg",
    subcategories: [
      sub("new_job", "Novi posao", "Pronađi bolju priliku kroz fokusiranu potragu i pripremu.", "icons/career_business_briefcase.svg", ["Promena firme", "Prvi posao", "Remote posao", "Bolja plata"], {
        title: "Koji cilj za novi posao želiš da postaviš?",
        titlePlaceholder: "Primer: Aplicirati na 20 relevantnih pozicija",
        purpose: "Zašto ti je važno da pronađeš novi posao baš sada?",
        currentState: "Gde si trenutno: CV, portfolio, kontakti, intervjui ili tek istraživanje?",
        desiredResult: "Kakvu ulogu, okruženje i uslove želiš da dobiješ?",
        timeframe: "Do kada želiš da imaš ozbiljne razgovore ili ponudu?",
        action: "Koje konkretne akcije možeš raditi nedeljno: prijave, poruke, priprema, istraživanje?",
        obstacle: "Šta te može kočiti: nejasan profil, strah od odbijanja, slab CV ili manjak vremena?",
        support: "Ko može pregledati CV, preporučiti te ili vežbati intervju sa tobom?",
        successMeasurement: "Kako ćeš meriti potragu: broj kvalitetnih prijava, odgovora, intervjua ili ponuda?",
        motivation: "Šta bi novi posao promenio u tvom svakodnevnom životu?"
      }),
      sub("promotion", "Unapređenje", "Povećaj vidljivost, uticaj i vrednost u trenutnoj ulozi.", "icons/career_business_briefcase.svg", ["Senioritet", "Plata", "Odgovornost", "Vidljivost"], {
        title: "Koji cilj za unapređenje želiš?",
        titlePlaceholder: "Primer: Spremiti argumente za senior poziciju",
        purpose: "Zašto ti je ovo unapređenje važno profesionalno i lično?",
        currentState: "Kako trenutno stojiš sa rezultatima, poverenjem i vidljivošću u timu?",
        desiredResult: "Koji nivo, odgovornost ili priznanje želiš da dostigneš?",
        timeframe: "Kada želiš da pokreneš razgovor ili evaluaciju?",
        action: "Koji rezultati, projekti ili ponašanja treba da postanu vidljivi?",
        obstacle: "Šta može usporiti unapređenje: nejasna očekivanja, komunikacija, politika ili manjak dokaza?",
        support: "Koji menadžer, mentor ili dokumentacija mogu da ojačaju tvoj slučaj?",
        successMeasurement: "Kako ćeš meriti napredak: feedback, završeni projekti, opseg odgovornosti ili dogovor?",
        motivation: "Šta želiš da dokažeš sebi kroz sledeći profesionalni nivo?"
      }),
      sub("skill_development", "Razvoj veštine", "Razvij veštinu koja direktno povećava tvoju vrednost.", "icons/career_business_briefcase.svg", ["Tehnička veština", "Komunikacija", "Analitika", "Menadžment"], {
        title: "Koju poslovnu veštinu želiš da razviješ?",
        titlePlaceholder: "Primer: Naučiti SQL za analitiku",
        purpose: "Zašto je ova veština važna za tvoju karijeru?",
        currentState: "Na kom si nivou sada i gde se vidi najveća rupa?",
        desiredResult: "Šta želiš da možeš samostalno da uradiš kada je savladaš?",
        timeframe: "Do kada želiš da imaš prvi dokaz primene veštine?",
        action: "Koji projekat, kurs ili vežba će te najbrže pomeriti iz teorije u praksu?",
        obstacle: "Šta može zaustaviti razvoj: previše materijala, manjak prakse, strah ili vreme?",
        support: "Koji mentor, dokumentacija, zajednica ili realan zadatak mogu da pomognu?",
        successMeasurement: "Kako ćeš meriti veštinu: projekat, sertifikat, feedback ili bolji rezultat na poslu?",
        motivation: "Kakvu profesionalnu slobodu želiš da dobiješ ovom veštinom?"
      }),
      sub("business_idea", "Biznis ideja", "Pretvori ideju u validiran koncept i prve konkretne korake.", "icons/career_business_briefcase.svg", ["Validacija", "MVP", "Klijenti", "Ponuda"], {
        title: "Kako se zove biznis ideja koju želiš da testiraš?",
        titlePlaceholder: "Primer: Validirati uslugu personalizovanih planova",
        purpose: "Zašto te baš ova ideja dovoljno vuče da je testiraš?",
        currentState: "Šta trenutno imaš: samo ideju, skicu ponude, publiku, prototip ili prve kupce?",
        desiredResult: "Koji dokaz želiš da dobiješ: interesovanje, razgovore, prodaju ili MVP?",
        timeframe: "U kom roku želiš da proveriš da li ideja ima signal tržišta?",
        action: "Koji najmanji test možeš da pokreneš bez velikog ulaganja?",
        obstacle: "Šta može zakočiti test: perfekcionizam, strah od prodaje, nejasna niša ili vreme?",
        support: "Koji ljudi, alati, zajednice ili potencijalni kupci mogu dati iskren signal?",
        successMeasurement: "Kako ćeš meriti validaciju: broj razgovora, prijava, uplata ili ponovljen interes?",
        motivation: "Šta bi za tebe značilo da ova ideja dobije stvaran život?"
      }),
      sub("productivity", "Produktivnost", "Uredi fokus, prioritete i izvršenje bez haotičnog rada.", "icons/career_business_briefcase.svg", ["Fokus blokovi", "Prioriteti", "Manje prokrastinacije", "Planiranje"], {
        title: "Koji produktivni sistem želiš da izgradiš?",
        titlePlaceholder: "Primer: Završavati 3 ključna zadatka dnevno",
        purpose: "Zašto ti je važno da radiš mirnije i efikasnije?",
        currentState: "Kako trenutno planiraš dan i gde najviše curi fokus?",
        desiredResult: "Kako bi izgledao radni dan koji završavaš sa jasnim osećajem napretka?",
        timeframe: "Koliko dugo želiš da testiraš novi sistem produktivnosti?",
        action: "Koji ritual planiranja, fokus blok ili ograničenje možeš odmah da uvedeš?",
        obstacle: "Šta najviše razbija rad: notifikacije, multitasking, tuđi zahtevi ili nejasni prioriteti?",
        support: "Koji alat, kalendar, lista ili dogovor sa timom može da čuva fokus?",
        successMeasurement: "Kako ćeš meriti produktivnost: završeni prioriteti, fokus sati ili manje kašnjenja?",
        motivation: "Šta želiš da osećaš kada prestaneš da juriš sopstveni dan?"
      }),
      sub("portfolio_cv", "Portfolio / CV", "Predstavi iskustvo jasnije, ubedljivije i profesionalnije.", "icons/career_business_briefcase.svg", ["CV", "Portfolio", "LinkedIn", "Case study"], {
        title: "Šta želiš da unaprediš: CV, portfolio ili profesionalni profil?",
        titlePlaceholder: "Primer: Završiti portfolio sa 3 case study-ja",
        purpose: "Zašto ti je važno da se bolje predstaviš tržištu ili timu?",
        currentState: "Šta trenutno postoji i šta deluje slabo, zastarelo ili nejasno?",
        desiredResult: "Kako želiš da te osoba koja pregleda profil razume za 60 sekundi?",
        timeframe: "Do kada želiš da imaš verziju spremnu za slanje?",
        action: "Koji deo prvo treba srediti: strukturu, tekst, projekte, rezultate ili dizajn?",
        obstacle: "Šta te koči: izbor projekata, pisanje o sebi, detalji, perfekcionizam ili manjak dokaza?",
        support: "Ko može dati feedback, primer dobrog profila ili uredničku pomoć?",
        successMeasurement: "Kako ćeš meriti uspeh: završene sekcije, feedback, pozivi na intervju ili konverzija?",
        motivation: "Šta želiš da ljudi konačno vide u tvojoj vrednosti?"
      }),
      sub("freelancing", "Freelance", "Pronađi klijente, ponudu i ritam samostalnog rada.", "icons/career_business_briefcase.svg", ["Prvi klijent", "Ponuda", "Cena", "Stabilan pipeline"], {
        title: "Koji freelance cilj želiš da ostvariš?",
        titlePlaceholder: "Primer: Dobiti prva 2 freelance klijenta",
        purpose: "Zašto želiš da razvijaš freelance rad?",
        currentState: "Gde si sada: nema ponude, imaš portfolio, šalješ poruke ili već radiš sa klijentima?",
        desiredResult: "Kakav tip klijenta, projekata i prihoda želiš da postigneš?",
        timeframe: "Do kada želiš da dobiješ prvi ozbiljan signal ili ugovor?",
        action: "Koji outreach, ponuda ili paket usluge možeš da napraviš ove nedelje?",
        obstacle: "Šta može stati na put: strah od prodaje, cena, nejasna niša, isporuka ili disciplina?",
        support: "Koja mreža, platforma, mentor ili šabloni poruka mogu da pomognu?",
        successMeasurement: "Kako ćeš pratiti napredak: broj poslatih poruka, poziva, ponuda ili prihoda?",
        motivation: "Kakvu slobodu ili dokaz sposobnosti tražiš kroz freelance?"
      }),
      sub("leadership", "Liderstvo", "Razvij uticaj, komunikaciju i odgovornost prema timu.", "icons/career_business_briefcase.svg", ["Delegiranje", "Feedback", "Strategija", "Tim"], {
        title: "Koji liderski cilj želiš da razviješ?",
        titlePlaceholder: "Primer: Voditi timske sastanke jasnije",
        purpose: "Zašto želiš da postaneš bolji lider?",
        currentState: "Gde se trenutno vidi tvoj liderski izazov: komunikacija, poverenje, odluke ili delegiranje?",
        desiredResult: "Kako želiš da ljudi doživljavaju tvoj uticaj i podršku?",
        timeframe: "U kom narednom periodu želiš da vežbaš ovu lidersku promenu?",
        action: "Koje ponašanje možeš da uvedeš u sledeći sastanak ili projekat?",
        obstacle: "Šta bi te moglo vratiti u stari stil: kontrola, izbegavanje konflikta, brzina ili nesigurnost?",
        support: "Koji mentor, feedback, knjiga ili ritual retrospektive može da pomogne?",
        successMeasurement: "Kako ćeš meriti liderstvo: feedback tima, jasnije odluke, manje blokada ili bolji rezultat?",
        motivation: "Kakav lider želiš da postaneš kada niko ne mora da te tera na odgovornost?"
      })
    ]
  },
  {
    id: "finance",
    value: "Finance",
    name: "Finansije",
    icon: "icons/finance_wallet.svg",
    subcategories: [
      sub("saving_money", "Štednja", "Sačuvaj više novca kroz jasne limite i navike.", "icons/finance_wallet.svg", ["Mesečna štednja", "Velika kupovina", "Manje troškova", "Automatska štednja"], {
        title: "Koji cilj štednje želiš da postaviš?",
        titlePlaceholder: "Primer: Uštedeti 1.000 EUR za 6 meseci",
        purpose: "Zašto želiš da sačuvaš ovaj novac?",
        currentState: "Koliko trenutno uspevaš da uštediš i gde novac najčešće ode?",
        desiredResult: "Koji iznos ili osećaj finansijske sigurnosti želiš da dostigneš?",
        timeframe: "Do kada želiš da imaš taj iznos ili stabilnu štednu naviku?",
        action: "Koji trošak, automatski transfer ili pravilo možeš odmah da uvedeš?",
        obstacle: "Šta može pojesti štednju: impulsivne kupovine, izlasci, neplanirani troškovi ili online kupovina?",
        support: "Koji račun, aplikacija, budžet ili osoba može da čuva tvoju odluku?",
        successMeasurement: "Kako ćeš meriti štednju: stanje računa, procenat prihoda, broj meseci bez prekida?",
        motivation: "Kakav mir želiš da kupiš ovom štednjom?"
      }),
      sub("investing", "Investiranje", "Napravi plan za dugoročan rast i razumevanje rizika.", "icons/finance_wallet.svg", ["ETF", "Akcije", "Kripto", "Edukacija", "Dugoročni plan"], {
        title: "Koji investicioni cilj želiš?",
        titlePlaceholder: "Primer: Učiti i investirati 150 EUR mesečno",
        purpose: "Zašto želiš da počneš ili poboljšaš investiranje?",
        currentState: "Šta trenutno znaš, poseduješ ili ne razumeš oko investiranja?",
        desiredResult: "Kakav portfolio, naviku ili nivo znanja želiš da izgradiš?",
        timeframe: "U kom periodu želiš da napraviš prvi disciplinovan investicioni ciklus?",
        action: "Koji prvi korak je najrazumniji: edukacija, izbor platforme, plan rizika ili mala uplata?",
        obstacle: "Šta može biti rizik: impuls, FOMO, nerazumevanje, volatilnost ili prevelik ulog?",
        support: "Koji kredibilni izvori, savetnik, spreadsheet ili pravila mogu da te zaštite?",
        successMeasurement: "Kako ćeš meriti uspeh: redovne uplate, znanje, diverzifikacija ili praćenje plana?",
        motivation: "Kakvu dugoročnu slobodu želiš da gradiš strpljivim novcem?"
      }),
      sub("debt_reduction", "Smanjenje duga", "Napravi plan otplate koji smanjuje pritisak i kamatu.", "icons/finance_wallet.svg", ["Kreditna kartica", "Kredit", "Pozajmice", "Konsolidacija"], {
        title: "Koji dug želiš prvo da smanjiš?",
        titlePlaceholder: "Primer: Otplatiti kreditnu karticu do septembra",
        purpose: "Zašto ti je važno da se oslobodiš ovog duga?",
        currentState: "Koliki je dug, kamata i minimalna mesečna obaveza?",
        desiredResult: "Koji nivo duga ili mesečnog rasterećenja želiš da postigneš?",
        timeframe: "Do kada želiš da otplatiš deo ili ceo dug?",
        action: "Koju dodatnu uplatu, rez troška ili dogovor možeš realno da napraviš?",
        obstacle: "Šta može usporiti otplatu: novi dug, vanredni troškovi, kamate ili izbegavanje brojeva?",
        support: "Koji budžet, savetnik, banka ili osoba od poverenja može pomoći planu?",
        successMeasurement: "Kako ćeš pratiti napredak: preostali dug, kamata, broj uplata ili dug-free datum?",
        motivation: "Šta ćeš emotivno dobiti kada dug prestane da upravlja tvojim mirom?"
      }),
      sub("budgeting", "Budžetiranje", "Daj svakom evru svrhu pre nego što nestane.", "icons/finance_wallet.svg", ["Mesečni budžet", "Troškovi", "Kategorije", "Kontrola"], {
        title: "Kakav budžet želiš da uspostaviš?",
        titlePlaceholder: "Primer: Pratiti sve troškove 30 dana",
        purpose: "Zašto želiš jasniji pregled novca?",
        currentState: "Koliko trenutno znaš gde ti novac odlazi tokom meseca?",
        desiredResult: "Kakav osećaj kontrole i koji finansijski rezultat želiš?",
        timeframe: "Koliko dugo želiš da testiraš prvi budžetski sistem?",
        action: "Koje kategorije, limite ili dnevno praćenje možeš odmah da uvedeš?",
        obstacle: "Šta ti može otežati budžet: zaboravljanje, gotovina, impuls, partner ili neplanirani troškovi?",
        support: "Koja aplikacija, tabela, banka ili nedeljni finansijski pregled može da pomogne?",
        successMeasurement: "Kako ćeš meriti uspeh: manje prekoračenja, tačan tracking, štednja ili mirniji mesec?",
        motivation: "Šta želiš da prestaneš da osećaš kada pogledaš stanje računa?"
      }),
      sub("increasing_income", "Povećanje prihoda", "Pronađi dodatni ili veći izvor prihoda.", "icons/finance_wallet.svg", ["Povišica", "Side hustle", "Prodaja", "Freelance"], {
        title: "Kako želiš da povećaš prihod?",
        titlePlaceholder: "Primer: Napraviti dodatnih 500 EUR mesečno",
        purpose: "Zašto je veći prihod važan za tvoje ciljeve?",
        currentState: "Koje veštine, resurse ili prilike trenutno imaš za dodatni prihod?",
        desiredResult: "Koliki dodatni mesečni iznos želiš i iz kog izvora?",
        timeframe: "Do kada želiš da vidiš prvi dodatni prihod?",
        action: "Koji potez možeš da napraviš: pregovor, ponuda, outreach, prodaja ili novi proizvod?",
        obstacle: "Šta može stati na put: vreme, strah od cene, manjak ideje, energija ili tržište?",
        support: "Koji mentor, platforma, mreža kontakata ili prodajni šablon može pomoći?",
        successMeasurement: "Kako ćeš meriti napredak: prihod, broj ponuda, poziva, kupaca ili stopa konverzije?",
        motivation: "Šta bi ti dodatni prihod omogućio što sada stalno odlažeš?"
      }),
      sub("emergency_fund", "Fond za hitne slučajeve", "Izgradi zaštitni sloj za neplanirane udarce.", "icons/finance_wallet.svg", ["1 mesec troškova", "3 meseca", "6 meseci", "Automatizacija"], {
        title: "Koliki fond za hitne slučajeve želiš?",
        titlePlaceholder: "Primer: Napraviti fond od 3 mesečna troška",
        purpose: "Zašto ti je važno da imaš finansijsku rezervu?",
        currentState: "Koliko trenutno imaš odvojeno za neplanirane situacije?",
        desiredResult: "Koliki iznos bi ti dao/la osećaj osnovne sigurnosti?",
        timeframe: "Do kada želiš da popuniš prvu fazu fonda?",
        action: "Koliko možeš automatski da prebaciš svakog meseca ili nedelje?",
        obstacle: "Šta može ugroziti fond: mešanje sa trošenjem, hitni troškovi, nered u računima?",
        support: "Koji odvojeni račun, pravilo i podsetnik mogu da zaštite fond?",
        successMeasurement: "Kako ćeš meriti napredak: procenat cilja, broj meseci troškova ili kontinuitet uplata?",
        motivation: "Kakav mir želiš da imaš kada se desi nešto neplanirano?"
      }),
      sub("financial_freedom", "Finansijska sloboda", "Definiši dugoročnu sliku nezavisnosti i put do nje.", "icons/finance_wallet.svg", ["Nezavisnost", "Pasivni prihod", "Manje zavisnosti", "Dugoročni plan"], {
        title: "Šta za tebe znači finansijska sloboda?",
        titlePlaceholder: "Primer: Pokriti osnovne troškove pasivnim prihodima",
        purpose: "Zašto te privlači finansijska sloboda, osim samog novca?",
        currentState: "Gde si sada sa prihodima, troškovima, imovinom i obavezama?",
        desiredResult: "Koja konkretna verzija slobode ti je najvažnija u ovoj fazi?",
        timeframe: "Koji horizont želiš da planiraš: 1, 3, 5 ili 10 godina?",
        action: "Koji prvi stub treba graditi: prihod, štednja, investiranje, znanje ili manji troškovi?",
        obstacle: "Šta može odvući plan: lifestyle inflation, dugovi, nejasni brojevi ili nestrpljenje?",
        support: "Koji finansijski model, savetnik, knjige ili mesečni pregled mogu da vode odluke?",
        successMeasurement: "Kako ćeš meriti slobodu: net worth, stopa štednje, pasivni prihod ili meseci pokrića?",
        motivation: "Kako želiš da koristiš vreme kada novac više ne bude jedini pritisak?"
      }),
      sub("business_revenue", "Prihod biznisa", "Povećaj prodaju, zadržavanje i stabilnost prihoda.", "icons/finance_wallet.svg", ["Prodaja", "MRR", "Profit", "Klijenti", "Cena"], {
        title: "Koji cilj prihoda biznisa želiš?",
        titlePlaceholder: "Primer: Povećati mesečni prihod na 5.000 EUR",
        purpose: "Zašto je ovaj prihod važan za sledeću fazu biznisa?",
        currentState: "Koliki su trenutni prihodi, profit i glavni kanali prodaje?",
        desiredResult: "Koji iznos, maržu ili stabilnost želiš da postigneš?",
        timeframe: "Do kada želiš da dostigneš ili validiraš taj nivo prihoda?",
        action: "Koji lever ima najveći smisao: više leadova, bolja ponuda, cena, upsell ili retention?",
        obstacle: "Šta može ograničiti rast: kapacitet, cash flow, prodajni proces, proizvod ili tim?",
        support: "Koji CRM, metrika, mentor, kampanja ili operativni sistem može pomoći?",
        successMeasurement: "Kako ćeš meriti rast: prihod, profit, konverzija, LTV, churn ili broj kupaca?",
        motivation: "Šta ovaj prihod omogućava tebi, timu ili misiji biznisa?"
      })
    ]
  },
  {
    id: "relationships_family",
    value: "Relationships & Family",
    name: "Odnosi i porodica",
    icon: "icons/relationships_family_people.svg",
    subcategories: [
      sub("romantic_relationship", "Romantična veza", "Neguj bliskost, poverenje i zajednički ritam.", "icons/relationships_family_people.svg", ["Bliskost", "Poverenje", "Zajednički plan", "Komunikacija"], {
        title: "Koji cilj želiš za romantičnu vezu?",
        titlePlaceholder: "Primer: Uvesti jedan kvalitetan dejt nedeljno",
        purpose: "Zašto ti je važno da uložiš pažnju u ovu vezu?",
        currentState: "Kako trenutno izgleda bliskost, komunikacija i vreme koje delite?",
        desiredResult: "Kakav odnos želiš da gradite u narednom periodu?",
        timeframe: "Kada želiš da primetite konkretnu promenu u vezi?",
        action: "Koju malu ali jasnu akciju možeš da predložiš ili uradiš ove nedelje?",
        obstacle: "Šta može stati između vas: umor, ego, posao, stare teme ili različite potrebe?",
        support: "Koji razgovor, ritual, terapija, knjiga ili dogovor može da pomogne?",
        successMeasurement: "Kako ćeš meriti napredak: kvalitet razgovora, vreme zajedno, manje konflikata ili osećaj bliskosti?",
        motivation: "Šta želiš da osoba pored tebe oseti kroz tvoju posvećenost?"
      }),
      sub("family_connection", "Porodična povezanost", "Vrati toplinu, pažnju i prisutnost u porodicu.", "icons/relationships_family_people.svg", ["Roditelji", "Braća/sestre", "Šira porodica", "Zajedničko vreme"], {
        title: "Koji porodični odnos želiš da neguješ?",
        titlePlaceholder: "Primer: Pozvati roditelje svake nedelje",
        purpose: "Zašto ti je važno da ovaj porodični odnos bude življi?",
        currentState: "Kako trenutno izgleda kontakt, bliskost ili distanca?",
        desiredResult: "Kakvu povezanost želiš da obnoviš ili izgradiš?",
        timeframe: "U kom periodu želiš da napraviš prve dosledne korake?",
        action: "Koji poziv, susret, poruka ili gest možeš realno da napraviš?",
        obstacle: "Šta može otežati povezanost: vreme, stare rane, ponos, daljina ili obaveze?",
        support: "Koji ritual, zajednički događaj ili posredni razgovor može da olakša kontakt?",
        successMeasurement: "Kako ćeš meriti napredak: učestalost kontakta, kvalitet susreta ili manje napetosti?",
        motivation: "Šta želiš da ostane između vas ako život ubrza još više?"
      }),
      sub("parenting", "Roditeljstvo", "Budi prisutniji, mirniji i dosledniji roditelj.", "icons/relationships_family_people.svg", ["Rutina", "Strpljenje", "Vreme sa decom", "Granice"], {
        title: "Koji roditeljski cilj želiš?",
        titlePlaceholder: "Primer: 20 minuta prisutne igre svakog dana",
        purpose: "Zašto ti je ova promena važna kao roditelju?",
        currentState: "Gde trenutno osećaš najveći izazov u roditeljstvu?",
        desiredResult: "Kako želiš da se tvoje dete oseća pored tebe?",
        timeframe: "Koliko dugo želiš da vežbaš ovu promenu i posmatraš efekat?",
        action: "Koja mala rutina ili reakcija može da napravi najveću razliku?",
        obstacle: "Šta te najviše izbaci: umor, žurba, posao, okidači ili nedoslednost?",
        support: "Koji partner, porodica, knjiga, stručnjak ili raspored može da pomogne?",
        successMeasurement: "Kako ćeš meriti napredak: mirnije reakcije, više prisutnog vremena, manje konflikata?",
        motivation: "Kakvo sećanje želiš da tvoje dete nosi iz ovog perioda?"
      }),
      sub("friendships", "Prijateljstva", "Ojačaj kvalitetne veze i iniciraj više živog kontakta.", "icons/relationships_family_people.svg", ["Održavanje kontakta", "Nova prijateljstva", "Podrška", "Druženja"], {
        title: "Koji cilj želiš za prijateljstva?",
        titlePlaceholder: "Primer: Organizovati 2 druženja mesečno",
        purpose: "Zašto želiš više pažnje da uložiš u prijateljske odnose?",
        currentState: "Kako trenutno izgleda tvoj društveni život i ko ti zaista prija?",
        desiredResult: "Kakav krug prijateljstva želiš da neguješ?",
        timeframe: "U kom periodu želiš da pokreneš više kontakta ili druženja?",
        action: "Kome možeš da se javiš i kakav susret ili poziv možeš da predložiš?",
        obstacle: "Šta te koči: zauzetost, pasivnost, strah od odbijanja ili površnost?",
        support: "Koji zajednički ritual, grupa, aktivnost ili kalendar može da održi kontakt?",
        successMeasurement: "Kako ćeš meriti napredak: broj inicijativa, kvalitet razgovora ili osećaj pripadanja?",
        motivation: "Kakav osećaj zajedništva želiš da vratiš u svoj život?"
      }),
      sub("communication", "Komunikacija", "Govori jasnije, slušaj dublje i smanji nesporazume.", "icons/relationships_family_people.svg", ["Aktivno slušanje", "Iskrenost", "Teški razgovori", "Jasnoća"], {
        title: "Koji komunikacijski cilj želiš?",
        titlePlaceholder: "Primer: Govoriti potrebe bez optuživanja",
        purpose: "Zašto ti je važno da komuniciraš zrelije?",
        currentState: "U kojim razgovorima trenutno najčešće nastane nesporazum?",
        desiredResult: "Kako želiš da zvučiš i slušaš u važnim razgovorima?",
        timeframe: "Kada želiš da primeniš ovu promenu u stvarnom razgovoru?",
        action: "Koju konkretnu rečenicu, pitanje ili pauzu možeš da vežbaš?",
        obstacle: "Šta te skrene: odbrana, prekidanje, ton, pretpostavke ili strah od reakcije?",
        support: "Koji model razgovora, beleška, terapija ili feedback može da pomogne?",
        successMeasurement: "Kako ćeš meriti komunikaciju: manje eskalacija, više jasnoće, bolji feedback?",
        motivation: "Šta želiš da ljudi osete kada razgovaraju sa tobom?"
      }),
      sub("conflict_resolution", "Rešavanje konflikta", "Pretvori tenziju u razumevanje i dogovor.", "icons/relationships_family_people.svg", ["Izvinjenje", "Dogovor", "Teška tema", "Smirivanje"], {
        title: "Koji konflikt ili obrazac želiš da rešiš?",
        titlePlaceholder: "Primer: Razgovor bez dizanja tona",
        purpose: "Zašto je važno da ovaj konflikt ne ostane nerešen?",
        currentState: "Šta se trenutno ponavlja u konfliktu i ko je uključen?",
        desiredResult: "Kakav dogovor, razumevanje ili mir želiš na kraju?",
        timeframe: "Kada želiš da otvoriš ili završiš ovaj razgovor?",
        action: "Koji prvi korak može smanjiti tenziju pre nego što tražiš rešenje?",
        obstacle: "Šta može zapaliti konflikt: ton, stare teme, optužbe, prekidanje ili ponos?",
        support: "Da li bi pomogao posrednik, pravilo razgovora, pisana priprema ili pauza?",
        successMeasurement: "Kako ćeš znati da je konflikt zdravije rešen: dogovor, mirniji ton, promenjeno ponašanje?",
        motivation: "Šta želiš da zaštitiš rešavanjem ovog konflikta?"
      }),
      sub("boundaries", "Granice", "Postavi jasne granice bez krivice i agresije.", "icons/relationships_family_people.svg", ["Vreme", "Emocionalne granice", "Posao", "Porodica", "Digitalno"], {
        title: "Koju granicu želiš da postaviš?",
        titlePlaceholder: "Primer: Ne odgovaram na poslovne poruke posle 19h",
        purpose: "Zašto ti je ova granica potrebna?",
        currentState: "Gde trenutno kažeš da kada zapravo misliš ne?",
        desiredResult: "Kako želiš da izgleda odnos kada granica postane normalna?",
        timeframe: "Kada želiš prvi put jasno da komuniciraš ovu granicu?",
        action: "Koju kratku rečenicu i konkretno pravilo možeš da koristiš?",
        obstacle: "Šta će ti biti najteže: krivica, reakcija drugih, navika ugađanja ili strah od konflikta?",
        support: "Ko može da te podseti, ohrabri ili pomogne da granicu održiš?",
        successMeasurement: "Kako ćeš meriti uspeh: manje iscrpljenosti, više vremena, dosledno ne ili bolji odnos?",
        motivation: "Koji deo sebe želiš da zaštitiš ovom granicom?"
      }),
      sub("quality_time", "Kvalitetno vreme", "Stvori prisutne trenutke koji odnose čine živim.", "icons/relationships_family_people.svg", ["Partner", "Deca", "Porodica", "Prijatelji"], {
        title: "Sa kim želiš više kvalitetnog vremena?",
        titlePlaceholder: "Primer: Nedeljna šetnja bez telefona sa partnerom",
        purpose: "Zašto ti je važno da ovo vreme bude prisutno, a ne samo usputno?",
        currentState: "Kako trenutno provodite vreme i šta mu najviše smanjuje kvalitet?",
        desiredResult: "Kakav osećaj povezanosti želiš posle tih susreta?",
        timeframe: "Koliko često i u kom periodu želiš da uvedeš ovaj ritam?",
        action: "Koju aktivnost možeš da zakažeš odmah i zaštitiš od distrakcija?",
        obstacle: "Šta može ući između: telefoni, umor, posao, logistika ili odlaganje?",
        support: "Koji kalendarski termin, dogovor ili zajednička lista ideja može da pomogne?",
        successMeasurement: "Kako ćeš meriti kvalitet: broj susreta, osećaj bliskosti, razgovori ili manje distrakcija?",
        motivation: "Šta ne želiš da propustiš sa tom osobom?"
      })
    ]
  },
  {
    id: "other",
    value: "Other",
    name: "Ostalo",
    icon: "icons/other_target.svg",
    subcategories: [
      sub("travel", "Putovanje", "Isplaniraj iskustvo, budžet i korake za željenu destinaciju.", "icons/other_target.svg", ["Solo", "Porodično", "Avantura", "Odmor", "Budžet"], {
        title: "Koje putovanje želiš da pretvoriš u cilj?",
        titlePlaceholder: "Primer: Isplanirati 7 dana u Portugalu",
        purpose: "Zašto te ovo putovanje zove baš sada?",
        currentState: "Šta trenutno znaš: destinacija, budžet, datumi, društvo ili samo želja?",
        desiredResult: "Kakvo iskustvo želiš da poneseš sa tog putovanja?",
        timeframe: "Kada želiš da putuješ ili završiš planiranje?",
        action: "Koji prvi praktičan korak treba uraditi: budžet, datumi, prevoz, smeštaj ili ruta?",
        obstacle: "Šta može zaustaviti plan: novac, vreme, dokumenta, društvo ili neodlučnost?",
        support: "Koji alati, ljudi, vodiči ili liste mogu da olakšaju organizaciju?",
        successMeasurement: "Kako ćeš meriti napredak: rezervacije, budžet, plan puta ili spremnost za polazak?",
        motivation: "Šta želiš da osetiš kada konačno budeš tamo?"
      }),
      sub("home_projects", "Kućni projekti", "Sredi prostor kroz konkretan plan, budžet i redosled rada.", "icons/other_target.svg", ["Renoviranje", "Organizacija", "Uređenje", "Popravke"], {
        title: "Koji kućni projekat želiš da završiš?",
        titlePlaceholder: "Primer: Organizovati radni kutak",
        purpose: "Zašto ti je ovaj prostor važan za svakodnevni život?",
        currentState: "U kom stanju je projekat sada i šta najviše smeta?",
        desiredResult: "Kako želiš da prostor izgleda, funkcioniše i utiče na tebe?",
        timeframe: "Do kada želiš da završiš glavnu fazu projekta?",
        action: "Koji prvi zadatak je dovoljno mali da ga pokreneš ovog vikenda?",
        obstacle: "Šta može usporiti projekat: budžet, alat, nered, odluke ili vreme?",
        support: "Koji majstor, član porodice, lista kupovine ili inspiracija može da pomogne?",
        successMeasurement: "Kako ćeš meriti napredak: završene zone, fotografije pre/posle, funkcionalnost ili budžet?",
        motivation: "Kakav osećaj želiš da imaš kada uđeš u taj prostor?"
      }),
      sub("creative_projects", "Kreativni projekti", "Završi nešto što stvaraš za sebe, publiku ili portfolio.", "icons/other_target.svg", ["Pisanje", "Video", "Umetnost", "Muzika", "Digitalni proizvod"], {
        title: "Koji kreativni projekat želiš da završiš?",
        titlePlaceholder: "Primer: Objaviti prvi mini-album",
        purpose: "Zašto ovaj projekat zaslužuje da bude završen?",
        currentState: "Šta trenutno postoji i šta još nedostaje?",
        desiredResult: "Šta tačno treba da postoji na kraju prve verzije?",
        timeframe: "Do kada želiš da imaš verziju spremnu za deljenje?",
        action: "Koji deo možeš završiti u sledećem kreativnom bloku?",
        obstacle: "Šta će te najviše iskušavati: perfekcionizam, poređenje, rasipanje ideja ili manjak vremena?",
        support: "Koji alat, feedback osoba, rok ili zajednica može da podrži završavanje?",
        successMeasurement: "Kako ćeš meriti napredak: završene scene, stranice, pesme, objave ili feedback?",
        motivation: "Šta želiš da kažeš svetu ili sebi kroz ovaj projekat?"
      }),
      sub("lifestyle", "Životni stil", "Dizajniraj ritam dana, okruženje i navike koje ti više odgovaraju.", "icons/other_target.svg", ["Minimalizam", "Digitalno", "Ritam dana", "Balans"], {
        title: "Koji deo životnog stila želiš da promeniš?",
        titlePlaceholder: "Primer: Vikendi bez poslovnih obaveza",
        purpose: "Zašto trenutni način života traži promenu?",
        currentState: "Šta u tvom svakodnevnom ritmu trenutno ne radi za tebe?",
        desiredResult: "Kako želiš da izgleda običan dan ili nedelja kada promena uspe?",
        timeframe: "Koliko dugo želiš da testiraš novi životni ritam?",
        action: "Koju jednu promenu možeš da uvedeš bez velikog resetovanja života?",
        obstacle: "Šta može vratiti stari ritam: obaveze, očekivanja, telefon, krivica ili haos?",
        support: "Koji kalendar, granice, prostor ili osoba može da podrži novi ritam?",
        successMeasurement: "Kako ćeš meriti uspeh: energija, slobodno vreme, mir, doslednost ili zadovoljstvo?",
        motivation: "Kakav život želiš da osetiš u običnim danima, ne samo na odmoru?"
      }),
      sub("hobbies", "Hobiji", "Vrati igru, interesovanje i lično vreme u raspored.", "icons/other_target.svg", ["Muzika", "Sport", "Kuvanje", "Fotografija", "Igre"], {
        title: "Koji hobi želiš da neguješ?",
        titlePlaceholder: "Primer: Svirati gitaru 3 puta nedeljno",
        purpose: "Zašto ti je ovaj hobi važan izvan produktivnosti?",
        currentState: "Koliko vremena trenutno daješ ovom hobiju i šta te sprečava?",
        desiredResult: "Šta želiš da umeš, doživiš ili napraviš kroz ovaj hobi?",
        timeframe: "U kom periodu želiš da mu vratiš stabilno mesto u životu?",
        action: "Koji termin, oprema ili prvi mini-projekat može da pokrene kontinuitet?",
        obstacle: "Šta najčešće pojede vreme za hobi: posao, ekran, umor ili osećaj da nije važan?",
        support: "Koji klub, prijatelj, kurs ili prostor može da ga učini lakšim i zabavnijim?",
        successMeasurement: "Kako ćeš meriti napredak: sati, vežbe, završeni komadi ili čisto zadovoljstvo?",
        motivation: "Koji deo sebe želiš ponovo da pustiš da se igra?"
      }),
      sub("personal_experiments", "Lični eksperimenti", "Testiraj novu ideju, identitet ili sistem na ograničen period.", "icons/other_target.svg", ["30 dana", "Rutina", "Digitalni detox", "Novi pristup"], {
        title: "Koji lični eksperiment želiš da pokreneš?",
        titlePlaceholder: "Primer: 30 dana bez društvenih mreža ujutru",
        purpose: "Zašto želiš da testiraš baš ovaj eksperiment?",
        currentState: "Koji trenutni obrazac želiš da posmatraš ili promeniš?",
        desiredResult: "Šta želiš da naučiš, osetiš ili dokažeš posle eksperimenta?",
        timeframe: "Koliko će eksperiment trajati i kada počinje?",
        action: "Koje pravilo eksperimenta mora biti jasno od prvog dana?",
        obstacle: "Šta može iskriviti rezultat: preširoka pravila, zaboravljanje, pritisak okoline ili zamena navike?",
        support: "Koji tracker, dnevnik, partner ili podsetnik može da drži eksperiment čistim?",
        successMeasurement: "Kako ćeš meriti eksperiment: dnevni check-in, rezultat, osećaj ili zaključak?",
        motivation: "Šta te najviše zanima da saznaš o sebi?"
      }),
      sub("custom_goal", "Prilagođeni cilj", "Definiši oblast koja ne spada u ponuđene kategorije.", "icons/other_target.svg", [], {
        title: "Kako želiš da nazoveš ovaj prilagođeni cilj?",
        titlePlaceholder: "Primer: Moj specifičan cilj",
        purpose: "Zašto ti je ova oblast važna i šta bi značilo da joj posvetiš pažnju?",
        currentState: "Gde se trenutno nalaziš u ovoj oblasti i šta je najvažniji kontekst?",
        desiredResult: "Koji konkretan rezultat bi ti pokazao da je cilj uspeo?",
        timeframe: "Kada želiš da vidiš prvi jasan pomak ili završetak?",
        action: "Koje realne akcije možeš preduzeti u prvoj nedelji?",
        obstacle: "Šta bi moglo da te zaustavi ili odvuče pažnju?",
        support: "Koji alati, ljudi, navike ili okruženje mogu da podrže ovaj cilj?",
        successMeasurement: "Kako ćeš znati da napreduješ ako cilj nije standardan?",
        motivation: "Koji lični razlog će te držati uz ovaj cilj kada početni entuzijazam padne?"
      })
    ]
  }
];

const CUSTOM_SUBCATEGORY_ID = "custom_category_goal";

const SUBCATEGORY_SYMBOLS = {
  confidence: "★",
  discipline: "◆",
  mindset: "∞",
  learning: "A",
  emotional_balance: "~",
  spiritual_growth: "✦",
  creativity: "✎",
  gym_strength: "S",
  weight_loss: "↓",
  muscle_gain: "M",
  nutrition: "N",
  running_athletics: "R",
  mobility_flexibility: "↔",
  sleep_recovery: "☾",
  energy_management: "⚡",
  new_job: "J",
  promotion: "↑",
  skill_development: "K",
  business_idea: "B",
  productivity: "P",
  portfolio_cv: "CV",
  freelancing: "F",
  leadership: "L",
  saving_money: "$",
  investing: "%",
  debt_reduction: "-",
  budgeting: "=",
  increasing_income: "+",
  emergency_fund: "!",
  financial_freedom: "∞",
  business_revenue: "↗",
  romantic_relationship: "♥",
  family_connection: "⌂",
  parenting: "P",
  friendships: "F",
  communication: "C",
  conflict_resolution: "↔",
  boundaries: "□",
  quality_time: "T",
  travel: "✈",
  home_projects: "⌂",
  creative_projects: "✎",
  lifestyle: "L",
  hobbies: "H",
  personal_experiments: "?",
  custom_goal: "+"
};

const flowState = {
  questions: [FIRST_QUESTION],
  index: 0,
  answers: {},
  pendingValue: "",
  generated: false
};

const categoryStage = document.getElementById("categoryStage");
const categoryCards = Array.from(document.querySelectorAll(".category-option"));
const startGoalBuilderBtn = document.getElementById("startGoalBuilderBtn");
const backToCategoriesBtn = document.getElementById("backToCategoriesBtn");
const builderFlow = document.getElementById("builderFlow");
const chat = document.getElementById("chat");
const answerArea = document.getElementById("answerArea");
const nextBtn = document.getElementById("nextBtn");
const generateBtn = document.getElementById("generateBtn");
const goalReview = document.getElementById("goalReview");
const toggleChatBtn = document.getElementById("toggleChatBtn");
const builderTab = document.getElementById("builderTab");
const plannerTab = document.getElementById("plannerTab");
const builderView = document.getElementById("builderView");
const plannerView = document.getElementById("plannerView");
const categorySelectionCard = document.querySelector(".category-selection-card");
const mentorIntroCard = document.querySelector(".mentor-intro-card");
const subcategoryPanel = document.getElementById("subcategoryPanel");
const subcategoryGrid = document.getElementById("subcategoryGrid");
const selectedCategoryTitle = document.getElementById("selectedCategoryTitle");
const customSubcategoryWrap = document.getElementById("customSubcategoryWrap");
const customSubcategoryInput = document.getElementById("customSubcategoryInput");
const backToMainCategoriesBtn = document.getElementById("backToMainCategoriesBtn");
const mentorIntroTitle = document.getElementById("mentorIntroTitle");
const mentorIntroText = document.getElementById("mentorIntroText");
const liveGoalCardPreview = document.getElementById("liveGoalCardPreview");
const sidebarItems = Array.from(document.querySelectorAll(".sidebar-item"));
const dynamicCategorySymbol = document.getElementById("dynamicCategorySymbol");
const dynamicCategoryLabel = document.getElementById("dynamicCategoryLabel");
let sidebarSymbolImage = "icons/lotus-panel-symbol.svg";
let sidebarSymbolTimer = null;
const SIDEBAR_NAV_SYMBOLS = {
  dashboard: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="black" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11.5 12 5l8 6.5"/><path d="M6.5 10.5V19h4v-5h3v5h4v-8.5"/></g></svg>',
  builder: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="black" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19h5l10-10a2.1 2.1 0 0 0-3-3L6 16z"/><path d="m14 6 4 4"/><path d="M12 19h8"/></g></svg>',
  planner: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="black" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/></g></svg>',
  brainstorming: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="black" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M8 14a5 5 0 1 1 8 0c-.9.8-1.2 1.7-1.2 3H9.2c0-1.3-.3-2.2-1.2-3Z"/><path d="M9.5 20h5M10 17h4M12 3V2M19 8l1-.7M5 8l-1-.7"/></g></svg>',
  finance: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="black" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7h13a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a1 1 0 0 1 1-1Z"/><path d="M7 7V5.5A1.5 1.5 0 0 1 8.5 4H17"/><path d="M16 13h4"/><path d="M16.5 13.5h.1"/></g></svg>',
  journal: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="black" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1Z"/><path d="M8 8h7M8 12h6M8 16h4"/></g></svg>',
  statistics: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="black" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19V9M12 19V5M19 19v-7"/><path d="M4 19h16"/></g></svg>',
  achievements: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="black" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v4a4 4 0 0 1-8 0Z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 12v4M9 20h6M10 16h4"/></g></svg>',
  settings: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="black" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M4.2 7.5l2.6 1.5M17.2 15l2.6 1.5M19.8 7.5 17.2 9M6.8 15l-2.6 1.5"/></g></svg>'
};
const SIDEBAR_VIEW_LABELS = {
  dashboard: "Dashboard",
  builder: "Mentor",
  planner: "Kalendar",
  brainstorming: "Brainstorming",
  finance: "Finansije",
  journal: "Dnevnik",
  statistics: "Statistike",
  achievements: "Achievements",
  settings: "Podešavanja"
};
const appViews = {
  dashboard: document.getElementById("dashboardView"),
  builder: builderView,
  planner: plannerView,
  brainstorming: document.getElementById("brainstormingView"),
  finance: document.getElementById("financeView"),
  journal: document.getElementById("journalView"),
  statistics: document.getElementById("statisticsView"),
  achievements: document.getElementById("achievementsView"),
  settings: document.getElementById("settingsView")
};

function resetViewDefaults(viewName) {
  if (viewName === "builder") {
    returnToMainCategories();
    showCategoryStage();
    return;
  }

  if (viewName === "planner") {
    window.CalendarPlanner?.resetPlannerView?.();
    return;
  }

  if (viewName === "brainstorming") {
    window.Brainstorming?.resetBrainstormingView?.();
  }
}

function setView(viewName, options) {
  const nextView = appViews[viewName] ? viewName : "dashboard";
  const showBuilder = nextView === "builder";
  const showPlanner = nextView === "planner";
  const appShell = document.querySelector(".app");
  const appTopBefore = appShell ? appShell.getBoundingClientRect().top : null;

  Object.keys(appViews).forEach((key) => {
    appViews[key].classList.toggle("hidden", key !== nextView);
  });

  builderTab.classList.toggle("active", showBuilder);
  plannerTab.classList.toggle("active", showPlanner);
  builderTab.setAttribute("aria-selected", String(showBuilder));
  plannerTab.setAttribute("aria-selected", String(showPlanner));
  document.body.dataset.activeView = nextView;

  sidebarItems.forEach((item) => {
    const isActive = item.dataset.view === nextView;
    item.classList.toggle("active", isActive);
    if (isActive) {
      item.setAttribute("aria-current", "page");
    } else {
      item.removeAttribute("aria-current");
    }
  });

  updateSidebarSymbolForView(nextView);
  if (options && options.reset) resetViewDefaults(nextView);

  if (appTopBefore !== null) {
    requestAnimationFrame(() => {
      const appTopAfter = appShell.getBoundingClientRect().top;
      const delta = appTopAfter - appTopBefore;
      if (Math.abs(delta) > 1) {
        window.scrollBy(0, delta);
      }
    });
  }
}

function svgToMaskUrl(svg) {
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

function setSidebarSymbol(image, options) {
  if (!dynamicCategorySymbol) return;

  const nextImage = image || "icons/lotus-panel-symbol.svg";
  const isCategory = Boolean(options && options.isCategory);
  const isNav = Boolean(options && options.isNav);
  dynamicCategorySymbol.classList.toggle("category-symbol", isCategory);
  dynamicCategorySymbol.classList.toggle("nav-symbol", isNav);

  if (nextImage === sidebarSymbolImage) {
    dynamicCategorySymbol.style.setProperty("--sidebar-symbol-image", 'url("' + nextImage + '")');
    return;
  }

  window.clearTimeout(sidebarSymbolTimer);
  dynamicCategorySymbol.classList.remove("symbol-zoom-in");
  dynamicCategorySymbol.classList.add("symbol-zoom-out");

  sidebarSymbolTimer = window.setTimeout(() => {
    sidebarSymbolImage = nextImage;
    dynamicCategorySymbol.style.setProperty("--sidebar-symbol-image", 'url("' + nextImage + '")');
    dynamicCategorySymbol.classList.remove("symbol-zoom-out");
    dynamicCategorySymbol.classList.add("symbol-zoom-in");

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        dynamicCategorySymbol.classList.remove("symbol-zoom-in");
      });
    });
  }, 240);
}

function updateSidebarSymbolForView(viewName) {
  const navSymbol = SIDEBAR_NAV_SYMBOLS[viewName];
  setSidebarSymbol(navSymbol ? svgToMaskUrl(navSymbol) : "icons/lotus-panel-symbol.svg", {
    isCategory: false,
    isNav: Boolean(navSymbol)
  });

  if (dynamicCategoryLabel) {
    dynamicCategoryLabel.textContent = SIDEBAR_VIEW_LABELS[viewName] || "Mentor";
  }
}

function getCategory(value) {
  return goalCategories.find((category) => category.value === value) || null;
}

function categoryColorClass(category) {
  return category ? "category-color-" + category.id : "category-color-other";
}

function createCustomSubcategory(category) {
  const categoryName = category ? category.name : "ovu oblast";
  return {
    id: CUSTOM_SUBCATEGORY_ID,
    name: "Nastavi bez podkategorije",
    description: "Preskoči uži fokus i napravi cilj direktno u kategoriji " + categoryName + ".",
    symbol: "+",
    goalTypes: [],
    isCustomSubcategory: true,
    questions: createQuestionSet({
      title: "Kako želiš da nazoveš svoj cilj u oblasti " + categoryName + "?",
      titlePlaceholder: "Primer: Moj lični cilj",
      purpose: "Zašto ti je ova lična oblast važna baš sada?",
      currentState: "Gde se trenutno nalaziš u ovoj oblasti i šta je najvažniji kontekst?",
      desiredResult: "Koji rezultat bi ti pokazao da je ovaj cilj uspeo?",
      timeframe: "Kada želiš da vidiš prvi jasan pomak ili završetak?",
      action: "Koje realne akcije možeš preduzeti u prvoj nedelji?",
      obstacle: "Šta bi moglo da te zaustavi ili odvuče pažnju?",
      support: "Koji alati, ljudi, navike ili okruženje mogu da podrže ovaj cilj?",
      successMeasurement: "Kako ćeš znati da napreduješ ako cilj nije standardan?",
      motivation: "Koji lični razlog će te držati uz ovaj cilj kada početni entuzijazam padne?"
    })
  };
}

function getVisibleSubcategories(category) {
  if (!category) return [];
  return [createCustomSubcategory(category)].concat(category.subcategories);
}

function getSelectedSubcategory() {
  const category = getCategory(appState.selectedCategory);
  if (!category) return null;
  if (appState.selectedSubcategory === CUSTOM_SUBCATEGORY_ID) return createCustomSubcategory(category);
  return category.subcategories.find((subcategory) => subcategory.id === appState.selectedSubcategory) || null;
}

function isNoSubcategorySelected() {
  return appState.selectedSubcategory === CUSTOM_SUBCATEGORY_ID;
}

function updateMentorIntro() {
  const intro = CATEGORY_MENTOR_INTROS[appState.selectedCategory] || MENTOR_INTRO_DEFAULT;
  const symbol = CATEGORY_MENTOR_SYMBOLS[appState.selectedCategory] || MENTOR_SYMBOL_DEFAULT;
  mentorIntroTitle.textContent = intro.title;
  mentorIntroText.textContent = intro.text;
  updateDynamicCategorySymbol(symbol);

  if (symbol.image === mentorSymbolImage) {
    mentorIntroCard.style.setProperty("--mentor-symbol-color", symbol.color);
    mentorIntroCard.style.setProperty("--mentor-symbol-size", symbol.size);
    mentorIntroCard.style.setProperty("--mentor-symbol-y-offset", symbol.yOffset);
    return;
  }

  window.clearTimeout(mentorSymbolTimer);
  mentorIntroCard.classList.remove("symbol-zoom-in");
  mentorIntroCard.classList.add("symbol-zoom-out");

  mentorSymbolTimer = window.setTimeout(() => {
    mentorSymbolImage = symbol.image;
    mentorIntroCard.style.setProperty("--mentor-symbol-image", 'url("' + symbol.image + '")');
    mentorIntroCard.style.setProperty("--mentor-symbol-color", symbol.color);
    mentorIntroCard.style.setProperty("--mentor-symbol-size", symbol.size);
    mentorIntroCard.style.setProperty("--mentor-symbol-y-offset", symbol.yOffset);

    mentorIntroCard.classList.remove("symbol-zoom-out");
    mentorIntroCard.classList.add("symbol-zoom-in");

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        mentorIntroCard.classList.remove("symbol-zoom-in");
      });
    });
  }, 680);
}

function updateDynamicCategorySymbol(symbol) {
  if (dynamicCategoryLabel) {
    dynamicCategoryLabel.textContent = SIDEBAR_VIEW_LABELS[document.body.dataset.activeView] || "Mentor";
  }
}

function canStartBuilder() {
  if (!appState.selectedCategory || !appState.selectedSubcategory) return false;
  if (appState.selectedSubcategory === "custom_goal") return Boolean(appState.customSubcategoryName.trim());
  return true;
}

function updateSelectedCategoryUI() {
  updateMentorIntro();
  startGoalBuilderBtn.disabled = !canStartBuilder();
  categorySelectionCard.classList.toggle("subcategory-mode", Boolean(appState.selectedCategory));

  const selectedSubcategory = getSelectedSubcategory();
  if (selectedSubcategory && !mentorIntroCard.classList.contains("builder-card-mode")) {
    mentorIntroTitle.textContent = getBuilderPanelTitle();
    mentorIntroText.textContent = selectedSubcategory.description || categoryLabel(appState.selectedCategory);
    mentorIntroText.classList.remove("panel-text-fade");
    void mentorIntroText.offsetWidth;
    mentorIntroText.classList.add("panel-text-fade");
  }

  categoryCards.forEach((card) => {
    const isSelected = card.dataset.category === appState.selectedCategory;
    card.classList.toggle("selected", isSelected);
    card.setAttribute("aria-selected", String(isSelected));
  });

  Array.from(subcategoryGrid.querySelectorAll(".subcategory-option")).forEach((card) => {
    const isSelected = card.dataset.subcategory === appState.selectedSubcategory;
    card.classList.toggle("selected", isSelected);
    card.setAttribute("aria-selected", String(isSelected));
  });

  customSubcategoryWrap.classList.toggle("hidden", appState.selectedSubcategory !== "custom_goal");
}

function renderSubcategories() {
  subcategoryGrid.innerHTML = "";
  const category = getCategory(appState.selectedCategory);

  if (!category) {
    subcategoryPanel.classList.add("hidden");
    return;
  }

  selectedCategoryTitle.textContent = category.name;
  subcategoryPanel.classList.remove("hidden");

  getVisibleSubcategories(category).forEach((subcategory) => {
    const button = document.createElement("button");
    button.className = "subcategory-option " + categoryColorClass(category);
    button.type = "button";
    button.dataset.subcategory = subcategory.id;
    const symbol = subcategory.symbol || SUBCATEGORY_SYMBOLS[subcategory.id] || "•";
    button.innerHTML = [
      '<span class="symbol-icon" aria-hidden="true">' + escapeHtml(symbol) + "</span>",
      "<span>" + escapeHtml(subcategory.name) + "</span>",
      "<small>" + escapeHtml(subcategory.description) + "</small>"
    ].join("");

    button.addEventListener("click", () => {
      appState.selectedSubcategory = subcategory.id;
      updateSelectedCategoryUI();
    });

    subcategoryGrid.appendChild(button);
  });

  updateSelectedCategoryUI();
}

function returnToMainCategories() {
  appState.selectedCategory = null;
  appState.selectedSubcategory = null;
  appState.customSubcategoryName = "";
  customSubcategoryInput.value = "";
  subcategoryGrid.innerHTML = "";
  subcategoryPanel.classList.add("hidden");
  updateSelectedCategoryUI();
}

function showCategoryStage() {
  categoryStage.classList.remove("hidden");
  categoryStage.classList.remove("builder-flow-mode");
  categorySelectionCard.classList.remove("hidden");
  mentorIntroCard.classList.remove("builder-card-mode", "builder-card-reveal");
  liveGoalCardPreview?.classList.add("hidden");
  updateMentorIntro();
  builderFlow.classList.add("hidden");
}

function showBuilderFlow() {
  categoryStage.classList.remove("hidden");
  categoryStage.classList.add("builder-flow-mode");
  categorySelectionCard.classList.add("hidden");
  mentorIntroCard.classList.add("builder-card-mode");
  mentorIntroCard.classList.remove("builder-card-reveal");
  liveGoalCardPreview?.classList.remove("hidden");
  mentorIntroTitle.classList.remove("title-swap-out", "title-swap-in");
  mentorIntroTitle.classList.add("title-swap-out");
  window.setTimeout(() => {
    mentorIntroTitle.textContent = "Kartica cilja";
    mentorIntroTitle.classList.remove("title-swap-out");
    mentorIntroTitle.classList.add("title-swap-in");
  }, 360);
  mentorIntroText.textContent = (CATEGORY_MENTOR_INTROS[appState.selectedCategory] || MENTOR_INTRO_DEFAULT).text;
  renderLiveGoalCardPreview();
  window.setTimeout(() => {
    mentorIntroCard.classList.add("builder-card-reveal");
  }, 600);
  builderFlow.classList.remove("hidden");
}

function addMessage(role, text) {
  const message = document.createElement("div");
  message.className = "msg " + role;
  if (role === "mentor") {
    const symbol = CATEGORY_MENTOR_SYMBOLS[appState.selectedCategory] || MENTOR_SYMBOL_DEFAULT;
    message.innerHTML = [
      '<span class="msg-symbol" aria-hidden="true"><img src="' + escapeHtml(symbol.image || "icons/lotus-panel-symbol.svg") + '" alt="" /></span>',
      '<span class="msg-text">' + escapeHtml(text) + "</span>"
    ].join("");
  } else {
    message.textContent = text;
  }
  chat.appendChild(message);
  chat.scrollTop = chat.scrollHeight;
}

function setNextEnabled(value) {
  nextBtn.disabled = !String(value || "").trim();
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : String(text);
  return div.innerHTML;
}

function dateHuman(isoDate) {
  const date = new Date(isoDate + "T00:00:00");
  return new Intl.DateTimeFormat("sr-Latn-RS", { year: "numeric", month: "short", day: "numeric" }).format(date);
}

function categoryLabel(category) {
  return CATEGORY_LABELS[category] || category || "Ostalo";
}

function subcategoryLabel(goal) {
  if (!goal) return "-";
  if (goal.subcategory === null || goal.subcategory === CUSTOM_SUBCATEGORY_ID || goal.subcategoryName === "Nije izabrana") return "Nije izabrana";
  if (goal.customSubcategoryName) return goal.customSubcategoryName;
  return goal.subcategoryName || goal.subcategory || "-";
}

function getBuilderPanelTitle() {
  const subcategory = getSelectedSubcategory();
  if (subcategory && !isNoSubcategorySelected()) {
    return appState.selectedSubcategory === CUSTOM_SUBCATEGORY_ID && appState.customSubcategoryName
      ? appState.customSubcategoryName
      : subcategory.name;
  }

  return categoryLabel(appState.selectedCategory);
}

function getExecutionLabelFromType(type) {
  if (type === "habit") return "Navika";
  if (type === "short-term") return "Fokus blok";
  if (type === "long-term") return "Milestone";
  return "";
}

function getLiveGoalKind() {
  const kindByCategory = {
    "Personal Growth": "Personalni cilj",
    "Health & Energy": "Fizički cilj",
    "Career & Work": "Intelektualni cilj",
    Finance: "Finansijski cilj",
    "Relationships & Family": "Emotivni cilj",
    Other: "Lični cilj"
  };

  return kindByCategory[appState.selectedCategory] || "Lični cilj";
}

function getLivePreviewAnswers(pendingKey, pendingValue) {
  const answers = Object.assign({}, flowState.answers);
  if (pendingKey && pendingValue) {
    answers[pendingKey] = pendingValue;
  }
  return answers;
}

function liveField(label, value) {
  return '<div class="live-card-field' + (value ? " filled" : "") + '"><dt>' + escapeHtml(label) + '</dt><dd>' + escapeHtml(value || "") + "</dd></div>";
}

function renderLiveGoalCardPreview(pendingKey, pendingValue) {
  if (!liveGoalCardPreview) return;

  const answers = getLivePreviewAnswers(pendingKey, pendingValue);
  const type = TYPE_FROM_LABEL[answers.creationType] || "";
  const title = answers.title || getBuilderPanelTitle() || "Naziv cilja";
  const categoryName = getLiveGoalKind();
  const focus = answers.goalType || getBuilderPanelTitle() || "";
  const frequency = answers.frequency || "";
  const timeValue = answers.bestTime || answers.targetDate || answers.duration || "";
  const description = answers.action || answers.successMeasurement || "";
  const reason = answers.purpose || "";
  const fields = [
    liveField("Tip cilja", TYPE_LABELS[type] || ""),
    liveField("Fokus", focus),
    liveField("Izvršenje", getExecutionLabelFromType(type)),
    liveField("Frekvencija", frequency),
    liveField("Vreme", timeValue)
  ].join("");

  const introText = reason || (CATEGORY_MENTOR_INTROS[appState.selectedCategory] || MENTOR_INTRO_DEFAULT).text;
  if (mentorIntroText.textContent !== introText) {
    mentorIntroText.textContent = introText;
  }

  liveGoalCardPreview.innerHTML = [
    '<div class="live-card-title' + (answers.title ? " filled" : "") + '">' + escapeHtml(title) + "</div>",
    '<div class="live-card-category filled">' + escapeHtml(categoryName) + "</div>",
    '<dl class="live-card-fields">',
    fields,
    "</dl>",
    '<div class="live-card-note' + (description ? " filled" : "") + '"><strong>Opis cilja</strong><span>' + escapeHtml(description) + "</span></div>"
  ].join("");
}

function createId(prefix) {
  return prefix + "-" + Date.now() + "-" + Math.floor(Math.random() * 10000);
}

function renderInputForQuestion(question) {
  answerArea.innerHTML = "";

  if (question.type === "text" || question.type === "date" || question.type === "textarea") {
    const input = question.type === "textarea" ? document.createElement("textarea") : document.createElement("input");
    input.className = question.type === "textarea" ? "text-input mentor-textarea" : "text-input";
    if (question.type !== "textarea") input.type = question.type === "date" ? "date" : "text";
    if (question.type === "textarea") input.rows = 4;
    input.placeholder = question.placeholder || "Upiši odgovor";
    input.autocomplete = "off";

    input.addEventListener("input", () => {
      flowState.pendingValue = input.value.trim();
      setNextEnabled(flowState.pendingValue);
    });

    input.addEventListener("keydown", (event) => {
      if (question.type !== "textarea" && event.key === "Enter" && !nextBtn.disabled) {
        event.preventDefault();
        handleNext();
      }
    });

    answerArea.appendChild(input);
    input.focus();
    return;
  }

  const optionsWrap = document.createElement("div");
  optionsWrap.className = "options";

  question.options.forEach((optionValue) => {
    const button = document.createElement("button");
    button.className = "option";
    button.type = "button";
    button.textContent = optionValue;

    button.addEventListener("click", () => {
      Array.from(optionsWrap.children).forEach((child) => child.classList.remove("selected"));
      button.classList.add("selected");
      flowState.pendingValue = optionValue;
      setNextEnabled(flowState.pendingValue);
    });

    optionsWrap.appendChild(button);
  });

  answerArea.appendChild(optionsWrap);
}

function renderCurrentQuestion() {
  const question = flowState.questions[flowState.index];
  if (!question) {
    nextBtn.classList.add("hidden");
    generateBtn.classList.remove("hidden");
    generateBtn.disabled = false;
    answerArea.innerHTML = "";
    addMessage("mentor", "Odlično. Od tvojih odgovora sada mogu da napravim pregled cilja.");
    return;
  }

  addMessage("mentor", question.text);
  flowState.pendingValue = "";
  setNextEnabled(false);
  renderInputForQuestion(question);
}

function buildQuestionsForSelection() {
  const selectedType = TYPE_FROM_LABEL[flowState.answers.creationType];
  const subcategory = getSelectedSubcategory();
  const goalTypeQuestion = subcategory && subcategory.goalTypes.length
    ? [{ key: "goalType", text: "Koji fokus najbolje opisuje ovaj cilj u oblasti: " + subcategory.name + "?", type: "options", options: subcategory.goalTypes }]
    : [];

  flowState.questions = [FIRST_QUESTION]
    .concat(goalTypeQuestion)
    .concat(subcategory ? subcategory.questions : [])
    .concat(TYPE_FOLLOW_UP_QUESTIONS[selectedType] || []);
}

function handleNext() {
  const question = flowState.questions[flowState.index];
  const answer = String(flowState.pendingValue || "").trim();

  if (!question || !answer) {
    return;
  }

  flowState.answers[question.key] = answer;
  addMessage("user", question.type === "date" ? dateHuman(answer) : answer);

  if (question.key === "creationType") {
    buildQuestionsForSelection();
  }

  flowState.index += 1;
  renderLiveGoalCardPreview();
  renderCurrentQuestion();
}

function buildGoalFromAnswers() {
  const answers = flowState.answers;
  const type = TYPE_FROM_LABEL[answers.creationType];
  const category = getCategory(appState.selectedCategory);
  const subcategory = getSelectedSubcategory();
  const customSubcategoryName = appState.selectedSubcategory === "custom_goal" ? appState.customSubcategoryName.trim() : "";
  const noSubcategory = isNoSubcategorySelected();
  const goal = {
    id: createId("goal"),
    type,
    title: answers.title,
    reason: answers.purpose || "",
    category: appState.selectedCategory,
    categoryName: category ? category.name : categoryLabel(appState.selectedCategory),
    subcategory: noSubcategory ? null : (subcategory ? subcategory.id : null),
    subcategoryName: noSubcategory ? "Nije izabrana" : (customSubcategoryName || (subcategory ? subcategory.name : "")),
    customSubcategoryName,
    goalType: answers.goalType || "",
    targetDate: null,
    duration: null,
    frequency: null,
    firstAction: answers.action,
    mainMilestone: answers.mainMilestone || "",
    successMeasurement: answers.successMeasurement || "",
    mentorAnswers: Object.assign({}, answers),
    finalGoalReason: answers.purpose || "",
    createdAt: new Date().toISOString()
  };

  if (type === "long-term") {
    goal.targetDate = answers.targetDate;
  }
  if (type === "short-term") {
    goal.duration = answers.duration;
  }
  if (type === "habit") {
    goal.frequency = answers.frequency;
    goal.bestTime = answers.bestTime;
  }

  return goal;
}

function goalMetricLabel(goal) {
  if (goal.type === "long-term") return "Ciljni datum";
  if (goal.type === "short-term") return "Trajanje";
  return "Učestalost";
}

function goalMetricValue(goal) {
  if (goal.type === "long-term") return goal.targetDate ? dateHuman(goal.targetDate) : "-";
  if (goal.type === "short-term") return goal.duration || "-";
  return goal.frequency || "-";
}

function renderGoalReview(goal) {
  const metricLabel = goalMetricLabel(goal);
  const metricValue = goalMetricValue(goal);
  const goalTypeHtml = goal.goalType
    ? '<div class="review-item"><small>Fokus</small><p>' + escapeHtml(goal.goalType) + "</p></div>"
    : "";

  goalReview.innerHTML = [
    "<h3>Pregled cilja</h3>",
    '<div class="review-grid">',
    '<div class="review-item"><small>Tip</small><p>' + escapeHtml(TYPE_LABELS[goal.type]) + "</p></div>",
    '<div class="review-item"><small>Kategorija</small><p>' + escapeHtml(categoryLabel(goal.category)) + "</p></div>",
    '<div class="review-item"><small>Podkategorija</small><p>' + escapeHtml(subcategoryLabel(goal)) + "</p></div>",
    goalTypeHtml,
    '<div class="review-item full"><small>Naziv</small><p>' + escapeHtml(goal.title) + "</p></div>",
    '<div class="review-item full"><small>Zašto</small><p>' + escapeHtml(goal.reason || "-") + "</p></div>",
    '<div class="review-item"><small>' + escapeHtml(metricLabel) + "</small><p>" + escapeHtml(metricValue) + "</p></div>",
    '<div class="review-item"><small>Prvi korak</small><p>' + escapeHtml(goal.firstAction) + "</p></div>",
    '<div class="review-item full"><small>Merilo uspeha</small><p>' + escapeHtml(goal.successMeasurement || "-") + "</p></div>",
    "</div>",
    '<div class="review-actions">',
    '<button id="openPlannerBtn" class="ghost-btn review-action-btn" type="button"><span aria-hidden="true">▦</span>Otvori kalendar</button>',
    '<button id="newGoalBtn" class="ghost-btn review-action-btn primary-review-action" type="button"><span aria-hidden="true">◎</span>Kreiraj novi cilj</button>',
    '<button id="changeCategoryBtn" class="ghost-btn review-action-btn" type="button"><span aria-hidden="true">↔</span>Promeni kategoriju</button>',
    "</div>"
  ].join("");

  goalReview.classList.remove("hidden");
  builderFlow.classList.add("chat-collapsed");
  toggleChatBtn.classList.remove("hidden");
  toggleChatBtn.textContent = "Prikaži chat";

  document.getElementById("openPlannerBtn").addEventListener("click", () => setView("planner"));
  document.getElementById("newGoalBtn").addEventListener("click", startBuilderFlow);
  document.getElementById("changeCategoryBtn").addEventListener("click", () => {
    returnToMainCategories();
    showCategoryStage();
  });
}

function startBuilderFlow() {
  flowState.questions = [FIRST_QUESTION];
  flowState.index = 0;
  flowState.answers = {};
  flowState.pendingValue = "";
  flowState.generated = false;

  chat.innerHTML = "";
  builderFlow.classList.remove("chat-collapsed");
  mentorIntroTitle.textContent = getBuilderPanelTitle();
  mentorIntroText.textContent = "Kartica cilja se popunjava dok odgovaraš na pitanja.";
  renderLiveGoalCardPreview();
  toggleChatBtn.classList.add("hidden");
  answerArea.innerHTML = "";
  goalReview.classList.add("hidden");
  goalReview.innerHTML = "";
  nextBtn.classList.remove("hidden");
  nextBtn.disabled = true;
  generateBtn.classList.add("hidden");
  generateBtn.disabled = false;

  const subcategory = getSelectedSubcategory();
  addMessage("mentor", "Hajde da izgradimo cilj kroz pitanja koja pripadaju baš ovoj oblasti.");
  addMessage("mentor", "Izabrano: " + categoryLabel(appState.selectedCategory) + " / " + subcategoryLabel({
    subcategory: isNoSubcategorySelected() ? null : (subcategory ? subcategory.id : null),
    subcategoryName: isNoSubcategorySelected() ? "Nije izabrana" : (subcategory ? subcategory.name : ""),
    customSubcategoryName: appState.selectedSubcategory === "custom_goal" ? appState.customSubcategoryName.trim() : ""
  }));
  if (subcategory && subcategory.description) addMessage("mentor", subcategory.description);
  renderCurrentQuestion();
}

function initCategorySelection() {
  categoryCards.forEach((card) => {
    card.addEventListener("click", () => {
      appState.selectedCategory = card.dataset.category;
      appState.selectedSubcategory = null;
      appState.customSubcategoryName = "";
      customSubcategoryInput.value = "";
      renderSubcategories();
      updateSelectedCategoryUI();
    });
  });

  customSubcategoryInput.addEventListener("input", () => {
    appState.customSubcategoryName = customSubcategoryInput.value.trim();
    updateSelectedCategoryUI();
  });

  backToMainCategoriesBtn.addEventListener("click", returnToMainCategories);

  startGoalBuilderBtn.addEventListener("click", () => {
    if (!canStartBuilder()) return;
    showBuilderFlow();
    startBuilderFlow();
  });
}

nextBtn.addEventListener("click", handleNext);

generateBtn.addEventListener("click", () => {
  if (flowState.generated || !canStartBuilder()) {
    return;
  }

  const goal = buildGoalFromAnswers();
  appState.goals.unshift(goal);
  flowState.generated = true;
  generateBtn.disabled = true;

  renderGoalReview(goal);
  window.CalendarPlanner?.renderGoalPool();
  window.CalendarPlanner?.renderCalendar();
  addMessage("mentor", "Cilj je sačuvan sa kategorijom, podkategorijom, fokusom i odgovorima. Sada ga možeš zakazati u kalendaru.");
});

builderTab.addEventListener("click", () => setView("builder"));
plannerTab.addEventListener("click", () => setView("planner"));
sidebarItems.forEach((item) => {
  item.addEventListener("click", () => setView(item.dataset.view, { reset: true }));
});

backToCategoriesBtn.addEventListener("click", () => {
  setView("builder");
  returnToMainCategories();
  showCategoryStage();
});

toggleChatBtn.addEventListener("click", () => {
  const collapsed = builderFlow.classList.toggle("chat-collapsed");
  toggleChatBtn.textContent = collapsed ? "Prikaži chat" : "Sakrij chat";
});

window.appState = appState;
window.TYPE_LABELS = TYPE_LABELS;
window.CATEGORY_LABELS = CATEGORY_LABELS;
window.goalCategories = goalCategories;
window.escapeHtml = escapeHtml;
window.categoryLabel = categoryLabel;
window.subcategoryLabel = subcategoryLabel;
window.createId = createId;
window.setView = setView;

initCategorySelection();
updateSelectedCategoryUI();
setView("dashboard");
showCategoryStage();
