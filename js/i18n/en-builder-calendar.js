(function () {
  window.MentorI18nResources = window.MentorI18nResources || {};
  window.MentorI18nResources.en = window.MentorI18nResources.en || {};
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

  function cloneBuilderCatalog(catalog) {
    return JSON.parse(JSON.stringify(catalog || []));
  }
const builderCatalogSr = [
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
        obstacle: "šta te najčešće povuče nazad: strah od greške, mišljenje drugih, perfekcionizam ili nešto četvrto?",
        support: "Koja osoba, rutina ili podsetnik može da ti pomogne da vežbaš sigurniji nastup?",
        successMeasurement: "Po čemu ćeš meriti napredak: broju iniciranih razgovora, javnih istupa, odluka ili nečem drugom?",
        motivation: "Koji osećaj želiš da nosiš kada prestaneš da se umanjuješ"
      }),
      sub("discipline", "Disciplina", "Izgradi doslednost bez oslanjanja na trenutnu motivaciju.", "icons/personal_development_meditation.svg", ["Jutarnja rutina", "Radni blokovi", "Večernja rutina", "Odvikavanje"], {
        title: "Kako se zove disciplina koju želiš da izgradiš",
        titlePlaceholder: "Primer: 90 minuta dubokog rada svakog jutra",
        purpose: "Zašto bi veća disciplina promenila kvalitet tvog dana?",
        currentState: "Gde ti disciplina trenutno najčešće pukne?",
        desiredResult: "Kako izgleda dan u kome si ponosan/na na svoju doslednost?",
        timeframe: "Koliko dana želiš da držiš prvi dokaz kontinuiteta?",
        action: "Koji tačan okidač i prvu akciju možeš da vežeš za ovu disciplinu?",
        obstacle: "šta najčešće ruši ritam: umor, telefon, nered, ljudi ili nejasan plan?",
        support: "Koji sistem će ti olakšati disciplinu: alarm, lista, blokiran telefon, partner odgovornosti?",
        successMeasurement: "Kako ćeš pratiti niz: čekiranje dana, minuta, završenih blokova ili rezultata?",
        motivation: "Kakva osoba postaješ kada održiš obećanje sebi?"
      }),
      sub("mindset", "Mentalni stav", "Promeni način razmišljanja koji vodi odluke i energiju.", "icons/brain_icon.svg", ["Rast", "Otpornost", "Fokus", "Optimizam"], {
        title: "Kako bi nazvao/la promenu mentalnog stava koju želiš",
        titlePlaceholder: "Primer: Biram rast umesto odustajanja",
        purpose: "Zašto ti je ovaj mentalni pomak važan u ovoj fazi života?",
        currentState: "Koja misao ili uverenje te trenutno najviše ograničava?",
        desiredResult: "Kako želiš da reaguješ kada naiđeš na pritisak ili neuspeh?",
        timeframe: "U kom narednom periodu želiš svesno da vežbaš ovaj novi stav?",
        action: "Koju rečenicu, refleksiju ili odluku možeš da ponavljaš kada se stari obrazac pojavi?",
        obstacle: "Koje situacije će najverovatnije aktivirati stari način razmišljanja?",
        support: "Koje knjige, pitanja, ljudi ili rituali mogu da hrane novi stav?",
        successMeasurement: "Kako ćeš prepoznati da drugačije misliš: kroz dnevnik, odluke, smirenost ili akciju?",
        motivation: "šta bi ti emotivno značilo da više ne živiš iz tog starog ograničenja?"
      }),
      sub("learning", "Učenje", "Usvoji znanje ili veštinu kroz jasan ritam vežbe.", "icons/brain_icon.svg", ["Jezik", "Kurs", "Knjige", "Tehnička veština"], {
        title: "Koju oblast učenja želiš da pretvoriš u cilj?",
        titlePlaceholder: "Primer: Naučiti osnove JavaScripta",
        purpose: "Zašto je ova veština ili znanje vredno tvog vremena?",
        currentState: "šta već znaš, a gde se trenutno najviše zaglavljuješ?",
        desiredResult: "šta želiš da umeš da objasniš, uradiš ili napraviš posle ovog cilja?",
        timeframe: "Do kada želiš da završiš prvi smislen modul, knjigu ili projekat?",
        action: "Koliko vremena i kojim danima možeš realno da posvetiš učenju?",
        obstacle: "šta ti obično prekine učenje: dosada, previše izvora, manjak vremena ili nejasan plan?",
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
        obstacle: "šta te sprečava da zastaneš: impuls, umor, ponos, krivica ili okruženje?",
        support: "Koje navike, razgovori ili stručna podrška mogu da ti daju više prostora?",
        successMeasurement: "Kako ćeš meriti ravnotežu: intenzitet reakcije, vreme oporavka, dnevnik emocija?",
        motivation: "Kakav mir želiš da vratiš sebi i ljudima oko sebe?"
      }),
      sub("spiritual_growth", "Duhovni rast", "Produbi smisao, mir, vrednosti i unutrašnju praksu.", "icons/mentor_lotus.svg", ["Molitva", "Meditacija", "Vrednosti", "Zahvalnost"], {
        title: "Kako želiš da nazoveš svoj duhovni fokus?",
        titlePlaceholder: "Primer: Svakog jutra 10 minuta tišine",
        purpose: "Zašto ti je važno da neguješ dublji osećaj smisla?",
        currentState: "Kako trenutno izgleda tvoja duhovna ili reflektivna praksa?",
        desiredResult: "šta želiš da osećaš, razumeš ili živiš doslednije?",
        timeframe: "Koliko dugo želiš da neguješ prvi ciklus ove prakse?",
        action: "Koji jednostavan ritual možeš da uvedeš bez pritiska i dokazivanja?",
        obstacle: "šta te odvaja od mira: žurba, sumnja, buka, nedoslednost ili nešto drugo?",
        support: "Koji tekst, prostor, zajednica ili mentor može da podrži ovu praksu?",
        successMeasurement: "Kako ćeš prepoznati rast: kroz smirenost, odluke, zahvalnost ili prisutnost?",
        motivation: "Koja unutrašnja istina te zove da ostaneš posvećen/a?"
      }),
      sub("creativity", "Kreativnost", "Pokreni stvaranje, izražavanje i završavanje ideja.", "icons/other_target.svg", ["Pisanje", "Muzika", "Dizajn", "Snimanje", "Umetnost"], {
        title: "Koji kreativni cilj želiš da pokreneš",
        titlePlaceholder: "Primer: Završiti prvu seriju ilustracija",
        purpose: "Zašto ti je važno da ovu ideju izbaciš iz glave u stvaran oblik?",
        currentState: "Gde je projekat sada: ideja, skica, pola gotovo ili blokada?",
        desiredResult: "šta želiš da postoji na kraju: komad rada, serija, objava, portfolio?",
        timeframe: "Do kada želiš da imaš prvu verziju koju možeš da pokažeš",
        action: "Koji kreativni blok rada možeš da zakažeš ove nedelje?",
        obstacle: "šta najčešće koči stvaranje: perfekcionizam, poređenje, umor ili haos ideja?",
        support: "Koji alat, prostor, referenca ili publika će ti pomoći da završiš",
        successMeasurement: "Kako ćeš meriti napredak: satima stvaranja, završenim delovima ili objavama?",
        motivation: "šta bi ti značilo da prestaneš da odlažeš sopstveni izraz?"
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
        title: "šta tačno želiš da popraviš u teretani?",
        titlePlaceholder: "Primer: Trenirati 4 puta nedeljno i ojačati čučanj",
        purpose: "Zašto ti je važno da unaprediš telo i snagu baš sada?",
        currentState: "Kakav je tvoj trenutni nivo forme i kako sada izgleda trening?",
        desiredResult: "Koji rezultat bi te učinio/la ponosnim/om za 30, 60 ili 90 dana?",
        timeframe: "Kada želiš da vidiš prvi merljiv dokaz napretka?",
        action: "Koliko dana nedeljno realno možeš da treniraš i koji tip treninga ti odgovara?",
        obstacle: "šta bi te moglo zaustaviti: povreda, vreme, motivacija, plan ili ishrana?",
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
        obstacle: "šta ti najčešće pokvari ritam: glad, stres, slatkiši, društvo ili vikendi?",
        support: "Koji obroci, kupovina, aplikacija ili osoba mogu da ti olakšaju izbor?",
        successMeasurement: "Kako ćeš pratiti napredak: težina, obimi, fotografije, energija ili navike?",
        motivation: "šta želiš da povratiš kroz ovaj proces: lakoću, zdravlje, samopouzdanje ili kontrolu?"
      }),
      sub("muscle_gain", "Mišićna masa", "Povećaj masu kroz trening, ishranu i oporavak.", "icons/health_energy_heart.svg", ["Hipertrofija", "Snaga", "Ishrana", "Rutina"], {
        title: "Koji cilj za mišićnu masu želiš da postaviš",
        titlePlaceholder: "Primer: Dobiti 3 kg kvalitetne mase",
        purpose: "Zašto želiš više mišića i snage u ovoj fazi?",
        currentState: "Kako trenutno treniraš i koliko proteina/kalorija okvirno unosiš",
        desiredResult: "Koje promene želiš da vidiš u izgledu, snazi ili držanju tela?",
        timeframe: "U kom periodu želiš da proceniš prvi ciklus napretka?",
        action: "Koji trening split i obroci su realni za tvoj raspored?",
        obstacle: "šta bi moglo da ograniči rast: premalo hrane, slab san, preskakanje treninga ili loš plan?",
        support: "Koji plan ishrane, tracker, trener ili partner može da te drži na kursu?",
        successMeasurement: "Kako ćeš meriti masu: telesna težina, obimi, slike, progresivno opterećenje?",
        motivation: "Kakav osećaj snage i prisustva želiš da izgradiš"
      }),
      sub("nutrition", "Ishrana", "Uredi obroke, energiju i odnos prema hrani.", "icons/health_energy_heart.svg", ["Plan obroka", "Protein", "Manje šećera", "Više energije"], {
        title: "Koju promenu u ishrani želiš da napraviš",
        titlePlaceholder: "Primer: Pripremati zdrave ručkove 5 dana nedeljno",
        purpose: "Zašto želiš da promeniš način ishrane?",
        currentState: "Kako sada izgledaju tvoji tipični obroci, grickalice i pića?",
        desiredResult: "šta želiš da se promeni u energiji, telu ili kontroli apetita?",
        timeframe: "Koliko dugo želiš da testiraš novi režim obroka?",
        action: "Koji konkretan obrok, kupovinu ili pripremu možeš prvo da uvedeš",
        obstacle: "šta najviše remeti ishranu: nedostatak vremena, glad, dostava, emocije ili posao?",
        support: "Koji recepti, lista kupovine, meal prep ili nutricionista mogu da pomognu?",
        successMeasurement: "Kako ćeš meriti uspeh: broj pripremljenih obroka, energija, težina ili krvne analize?",
        motivation: "Kakav odnos prema hrani želiš da izgradiš"
      }),
      sub("running_athletics", "Trčanje / Atletika", "Poboljšaj kondiciju, ritam, brzinu i izdržljivost.", "icons/health_energy_heart.svg", ["5K", "10K", "Brzina", "Izdržljivost", "Doslednost"], {
        title: "Koji trkački ili atletski cilj želiš",
        titlePlaceholder: "Primer: Istrčati 5 km bez pauze",
        purpose: "Zašto ti je važno da poboljšaš kondiciju ili trčanje?",
        currentState: "Koliko trenutno možeš da trčiš i kakav ti je tempo/opterećenje?",
        desiredResult: "Koju distancu, vreme ili osećaj u telu želiš da dostigneš",
        timeframe: "Do kog datuma ili perioda želiš da testiraš rezultat?",
        action: "Koliko treninga nedeljno možeš da uklopiš bez preopterećenja?",
        obstacle: "šta može da te zaustavi: bol, vreme, loša oprema, dosada ili nepravilno povećanje intenziteta?",
        support: "Koji plan, patike, ruta, sat ili društvo za trčanje mogu da pomognu?",
        successMeasurement: "Kako ćeš pratiti napredak: distanca, tempo, puls, osećaj ili broj treninga?",
        motivation: "šta za tebe simbolizuje trenutak kada istrčiš ono što sada deluje teško?"
      }),
      sub("mobility_flexibility", "Mobilnost i fleksibilnost", "Poboljšaj pokret, držanje i osećaj lakoće u telu.", "icons/health_energy_heart.svg", ["Kukovi", "Leđa", "Ramena", "Joga", "Prevencija povreda"], {
        title: "Koju mobilnost ili fleksibilnost želiš da poboljšaš?",
        titlePlaceholder: "Primer: Svako veče 12 minuta mobilnosti za kukove",
        purpose: "Zašto ti je važno da se krećeš lakše i bez zatezanja?",
        currentState: "Gde trenutno osećaš ukočenost, bol ili ograničen pokret?",
        desiredResult: "Koji pokret, pološaj ili osećaj u telu želiš da dobiješ",
        timeframe: "Kada želiš da primetiš veću lakoću u svakodnevnom kretanju?",
        action: "Koju kratku rutinu možeš da radiš i kojim danima?",
        obstacle: "šta će ti najlakše prekinuti rutinu: zaboravljanje, dosada, bol ili manjak prostora?",
        support: "Koji video, fizioterapeut, joga čas ili podsetnik može da te vodi?",
        successMeasurement: "Kako ćeš meriti napredak: opseg pokreta, bol, fotografija pološaja ili kontinuitet?",
        motivation: "Kako želiš da se oseća tvoje telo kada mu konačno daš pažnju?"
      }),
      sub("sleep_recovery", "San i oporavak", "Vrati kvalitet sna, regeneraciju i mirniji ritam.", "icons/health_energy_heart.svg", ["Ranije spavanje", "Dublji san", "Manje ekrana", "Oporavak"], {
        title: "Koji cilj za san i oporavak želiš",
        titlePlaceholder: "Primer: U krevetu do 23:00 tokom radne nedelje",
        purpose: "Zašto je bolji san sada prioritet za tvoje zdravlje i fokus?",
        currentState: "Kako trenutno izgleda tvoj ritam spavanja, buđenja i oporavka?",
        desiredResult: "Kako želiš da se budiš i funkcionišeš tokom dana?",
        timeframe: "Koliko dugo želiš da testiraš novu večernju rutinu?",
        action: "Koju konkretnu promenu možeš da uvedeš 60 minuta pre spavanja?",
        obstacle: "šta najčešće krade san: ekran, posao, kasna hrana, stres ili nered u rasporedu?",
        support: "Koji alarm, režim svetla, rutina ili dogovor sa ukućanima može da pomogne?",
        successMeasurement: "Kako ćeš meriti san: sati, kvalitet buđenja, energija, aplikacija ili dnevnik?",
        motivation: "šta bi ti značilo da se odmaraš bez griže savesti?"
      }),
      sub("energy_management", "Upravljanje energijom", "Rasporedi napor, fokus i odmor pametnije kroz dan.", "icons/health_energy_heart.svg", ["Fokus", "Pauze", "Manje iscrpljenosti", "Ritam dana"], {
        title: "Kako želiš da upravljaš svojom energijom?",
        titlePlaceholder: "Primer: Planirati najteži rad pre podne",
        purpose: "Zašto želiš da zaštitiš energiju umesto da je trošiš nasumično?",
        currentState: "Kada tokom dana imaš najviše energije, a kada najviše padaš",
        desiredResult: "Kako bi izgledao dan u kome imaš stabilniji fokus i manje iscrpljenosti?",
        timeframe: "Koliko dugo želiš da posmatraš i podešavaš svoj energetski ritam?",
        action: "Koju promenu u rasporedu, pauzama ili obrocima možeš prvo da probaš",
        obstacle: "šta ti najviše prazni baterije: ljudi, ekran, haos, obaveze ili premalo sna?",
        support: "Koji kalendar, blokovi fokusa, granice ili ritual pauze mogu da pomognu?",
        successMeasurement: "Kako ćeš meriti energiju: ocenom dana, završenim fokus blokovima ili manje padova?",
        motivation: "šta želiš da imaš više na kraju dana: mira, prisutnosti, snage ili vremena?"
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
        title: "Koji cilj za novi posao želiš da postaviš",
        titlePlaceholder: "Primer: Aplicirati na 20 relevantnih pozicija",
        purpose: "Zašto ti je važno da pronađeš novi posao baš sada?",
        currentState: "Gde si trenutno: CV, portfolio, kontakti, intervjui ili tek istraživanje?",
        desiredResult: "Kakvu ulogu, okruženje i uslove želiš da dobiješ",
        timeframe: "Do kada želiš da imaš ozbiljne razgovore ili ponudu?",
        action: "Koje konkretne akcije možeš raditi nedeljno: prijave, poruke, priprema, istraživanje?",
        obstacle: "šta te može kočiti: nejasan profil, strah od odbijanja, slab CV ili manjak vremena?",
        support: "Ko može pregledati CV, preporučiti te ili vežbati intervju sa tobom?",
        successMeasurement: "Kako ćeš meriti potragu: broj kvalitetnih prijava, odgovora, intervjua ili ponuda?",
        motivation: "šta bi novi posao promenio u tvom svakodnevnom životu?"
      }),
      sub("promotion", "Unapređenje", "Povećaj vidljivost, uticaj i vrednost u trenutnoj ulozi.", "icons/career_business_briefcase.svg", ["Senioritet", "Plata", "Odgovornost", "Vidljivost"], {
        title: "Koji cilj za unapređenje želiš",
        titlePlaceholder: "Primer: Spremiti argumente za senior poziciju",
        purpose: "Zašto ti je ovo unapređenje važno profesionalno i lično?",
        currentState: "Kako trenutno stojiš sa rezultatima, poverenjem i vidljivošću u timu?",
        desiredResult: "Koji nivo, odgovornost ili priznanje želiš da dostigneš",
        timeframe: "Kada želiš da pokreneš razgovor ili evaluaciju?",
        action: "Koji rezultati, projekti ili ponašanja treba da postanu vidljivi?",
        obstacle: "šta može usporiti unapređenje: nejasna očekivanja, komunikacija, politika ili manjak dokaza?",
        support: "Koji menadžer, mentor ili dokumentacija mogu da ojačaju tvoj slučaj?",
        successMeasurement: "Kako ćeš meriti napredak: feedback, završeni projekti, opseg odgovornosti ili dogovor?",
        motivation: "šta želiš da dokažeš sebi kroz sledeći profesionalni nivo?"
      }),
      sub("skill_development", "Razvoj veštine", "Razvij veštinu koja direktno povećava tvoju vrednost.", "icons/career_business_briefcase.svg", ["Tehnička veština", "Komunikacija", "Analitika", "Menadžment"], {
        title: "Koju poslovnu veštinu želiš da razviješ",
        titlePlaceholder: "Primer: Naučiti SQL za analitiku",
        purpose: "Zašto je ova veština važna za tvoju karijeru?",
        currentState: "Na kom si nivou sada i gde se vidi najveća rupa?",
        desiredResult: "šta želiš da možeš samostalno da uradiš kada je savladaš",
        timeframe: "Do kada želiš da imaš prvi dokaz primene veštine?",
        action: "Koji projekat, kurs ili vežba će te najbrže pomeriti iz teorije u praksu?",
        obstacle: "šta može zaustaviti razvoj: previše materijala, manjak prakse, strah ili vreme?",
        support: "Koji mentor, dokumentacija, zajednica ili realan zadatak mogu da pomognu?",
        successMeasurement: "Kako ćeš meriti veštinu: projekat, sertifikat, feedback ili bolji rezultat na poslu?",
        motivation: "Kakvu profesionalnu slobodu želiš da dobiješ ovom veštinom?"
      }),
      sub("business_idea", "Biznis ideja", "Pretvori ideju u validiran koncept i prve konkretne korake.", "icons/career_business_briefcase.svg", ["Validacija", "MVP", "Klijenti", "Ponuda"], {
        title: "Kako se zove biznis ideja koju želiš da testiraš?",
        titlePlaceholder: "Primer: Validirati uslugu personalizovanih planova",
        purpose: "Zašto te baš ova ideja dovoljno vuče da je testiraš?",
        currentState: "šta trenutno imaš: samo ideju, skicu ponude, publiku, prototip ili prve kupce?",
        desiredResult: "Koji dokaz želiš da dobiješ: interesovanje, razgovore, prodaju ili MVP?",
        timeframe: "U kom roku želiš da proveriš da li ideja ima signal tržišta?",
        action: "Koji najmanji test možeš da pokreneš bez velikog ulaganja?",
        obstacle: "šta može zakočiti test: perfekcionizam, strah od prodaje, nejasna niša ili vreme?",
        support: "Koji ljudi, alati, zajednice ili potencijalni kupci mogu dati iskren signal?",
        successMeasurement: "Kako ćeš meriti validaciju: broj razgovora, prijava, uplata ili ponovljen interes?",
        motivation: "šta bi za tebe značilo da ova ideja dobije stvaran život?"
      }),
      sub("productivity", "Produktivnost", "Uredi fokus, prioritete i izvršenje bez haotičnog rada.", "icons/career_business_briefcase.svg", ["Fokus blokovi", "Prioriteti", "Manje prokrastinacije", "Planiranje"], {
        title: "Koji produktivni sistem želiš da izgradiš",
        titlePlaceholder: "Primer: Završavati 3 ključna zadatka dnevno",
        purpose: "Zašto ti je važno da radiš mirnije i efikasnije?",
        currentState: "Kako trenutno planiraš dan i gde najviše curi fokus?",
        desiredResult: "Kako bi izgledao radni dan koji završavaš sa jasnim osećajem napretka?",
        timeframe: "Koliko dugo želiš da testiraš novi sistem produktivnosti?",
        action: "Koji ritual planiranja, fokus blok ili ograničenje možeš odmah da uvedeš",
        obstacle: "šta najviše razbija rad: notifikacije, multitasking, tuđi zahtevi ili nejasni prioriteti?",
        support: "Koji alat, kalendar, lista ili dogovor sa timom može da čuva fokus?",
        successMeasurement: "Kako ćeš meriti produktivnost: završeni prioriteti, fokus sati ili manje kašnjenja?",
        motivation: "šta želiš da osećaš kada prestaneš da juriš sopstveni dan?"
      }),
      sub("portfolio_cv", "Portfolio / CV", "Predstavi iskustvo jasnije, ubedljivije i profesionalnije.", "icons/career_business_briefcase.svg", ["CV", "Portfolio", "LinkedIn", "Case study"], {
        title: "šta želiš da unaprediš: CV, portfolio ili profesionalni profil?",
        titlePlaceholder: "Primer: Završiti portfolio sa 3 case study-ja",
        purpose: "Zašto ti je važno da se bolje predstaviš tržištu ili timu?",
        currentState: "šta trenutno postoji i šta deluje slabo, zastarelo ili nejasno?",
        desiredResult: "Kako želiš da te osoba koja pregleda profil razume za 60 sekundi?",
        timeframe: "Do kada želiš da imaš verziju spremnu za slanje?",
        action: "Koji deo prvo treba srediti: strukturu, tekst, projekte, rezultate ili dizajn?",
        obstacle: "šta te koči: izbor projekata, pisanje o sebi, detalji, perfekcionizam ili manjak dokaza?",
        support: "Ko može dati feedback, primer dobrog profila ili uredničku pomoć?",
        successMeasurement: "Kako ćeš meriti uspeh: završene sekcije, feedback, pozivi na intervju ili konverzija?",
        motivation: "šta želiš da ljudi konačno vide u tvojoj vrednosti?"
      }),
      sub("freelancing", "Freelance", "Pronađi klijente, ponudu i ritam samostalnog rada.", "icons/career_business_briefcase.svg", ["Prvi klijent", "Ponuda", "Cena", "Stabilan pipeline"], {
        title: "Koji freelance cilj želiš da ostvariš",
        titlePlaceholder: "Primer: Dobiti prva 2 freelance klijenta",
        purpose: "Zašto želiš da razvijaš freelance rad?",
        currentState: "Gde si sada: nema ponude, imaš portfolio, šalješ poruke ili već radiš sa klijentima?",
        desiredResult: "Kakav tip klijenta, projekata i prihoda želiš da postigneć",
        timeframe: "Do kada želiš da dobiješ prvi ozbiljan signal ili ugovor?",
        action: "Koji outreach, ponuda ili paket usluge možeš da napraviš ove nedelje?",
        obstacle: "šta može stati na put: strah od prodaje, cena, nejasna niša, isporuka ili disciplina?",
        support: "Koja mreža, platforma, mentor ili šabloni poruka mogu da pomognu?",
        successMeasurement: "Kako ćeš pratiti napredak: broj poslatih poruka, poziva, ponuda ili prihoda?",
        motivation: "Kakvu slobodu ili dokaz sposobnosti tražiš kroz freelance?"
      }),
      sub("leadership", "Liderstvo", "Razvij uticaj, komunikaciju i odgovornost prema timu.", "icons/career_business_briefcase.svg", ["Delegiranje", "Feedback", "Strategija", "Tim"], {
        title: "Koji liderski cilj želiš da razviješ",
        titlePlaceholder: "Primer: Voditi timske sastanke jasnije",
        purpose: "Zašto želiš da postaneš bolji lider?",
        currentState: "Gde se trenutno vidi tvoj liderski izazov: komunikacija, poverenje, odluke ili delegiranje?",
        desiredResult: "Kako želiš da ljudi doživljavaju tvoj uticaj i podršku?",
        timeframe: "U kom narednom periodu želiš da vežbaš ovu lidersku promenu?",
        action: "Koje ponašanje možeš da uvedeš u sledeći sastanak ili projekat?",
        obstacle: "šta bi te moglo vratiti u stari stil: kontrola, izbegavanje konflikta, brzina ili nesigurnost?",
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
      sub("saving_money", "štednja", "Sačuvaj više novca kroz jasne limite i navike.", "icons/finance_wallet.svg", ["Mesečna štednja", "Velika kupovina", "Manje troškova", "Automatska štednja"], {
        title: "Koji cilj štednje želiš da postaviš",
        titlePlaceholder: "Primer: Uštedeti 1.000 EUR za 6 meseci",
        purpose: "Zašto želiš da sačuvaš ovaj novac?",
        currentState: "Koliko trenutno uspevaš da uštediš i gde novac najčešće ode?",
        desiredResult: "Koji iznos ili osećaj finansijske sigurnosti želiš da dostigneš",
        timeframe: "Do kada želiš da imaš taj iznos ili stabilnu štednu naviku?",
        action: "Koji trošak, automatski transfer ili pravilo možeš odmah da uvedeš",
        obstacle: "šta može pojesti štednju: impulsivne kupovine, izlasci, neplanirani troškovi ili online kupovina?",
        support: "Koji račun, aplikacija, budžet ili osoba može da čuva tvoju odluku?",
        successMeasurement: "Kako ćeš meriti štednju: stanje računa, procenat prihoda, broj meseci bez prekida?",
        motivation: "Kakav mir želiš da kupiš ovom štednjom?"
      }),
      sub("investing", "Investiranje", "Napravi plan za dugoročan rast i razumevanje rizika.", "icons/finance_wallet.svg", ["ETF", "Akcije", "Kripto", "Edukacija", "Dugoročni plan"], {
        title: "Koji investicioni cilj želiš",
        titlePlaceholder: "Primer: Učiti i investirati 150 EUR mesečno",
        purpose: "Zašto želiš da počneš ili poboljšaš investiranje?",
        currentState: "šta trenutno znaš, poseduješ ili ne razumeš oko investiranja?",
        desiredResult: "Kakav portfolio, naviku ili nivo znanja želiš da izgradiš",
        timeframe: "U kom periodu želiš da napraviš prvi disciplinovan investicioni ciklus?",
        action: "Koji prvi korak je najrazumniji: edukacija, izbor platforme, plan rizika ili mala uplata?",
        obstacle: "šta može biti rizik: impuls, FOMO, nerazumevanje, volatilnost ili prevelik ulog?",
        support: "Koji kredibilni izvori, savetnik, spreadsheet ili pravila mogu da te zaštite?",
        successMeasurement: "Kako ćeš meriti uspeh: redovne uplate, znanje, diverzifikacija ili praćenje plana?",
        motivation: "Kakvu dugoročnu slobodu želiš da gradiš strpljivim novcem?"
      }),
      sub("debt_reduction", "Smanjenje duga", "Napravi plan otplate koji smanjuje pritisak i kamatu.", "icons/finance_wallet.svg", ["Kreditna kartica", "Kredit", "Pozajmice", "Konsolidacija"], {
        title: "Koji dug želiš prvo da smanjić",
        titlePlaceholder: "Primer: Otplatiti kreditnu karticu do septembra",
        purpose: "Zašto ti je važno da se oslobodiš ovog duga?",
        currentState: "Koliki je dug, kamata i minimalna mesečna obaveza?",
        desiredResult: "Koji nivo duga ili mesečnog rasterećenja želiš da postigneć",
        timeframe: "Do kada želiš da otplatiš deo ili ceo dug?",
        action: "Koju dodatnu uplatu, rez troška ili dogovor možeš realno da napraviš",
        obstacle: "šta može usporiti otplatu: novi dug, vanredni troškovi, kamate ili izbegavanje brojeva?",
        support: "Koji budžet, savetnik, banka ili osoba od poverenja može pomoći planu?",
        successMeasurement: "Kako ćeš pratiti napredak: preostali dug, kamata, broj uplata ili dug-free datum?",
        motivation: "šta ćeš emotivno dobiti kada dug prestane da upravlja tvojim mirom?"
      }),
      sub("budgeting", "Budžetiranje", "Daj svakom evru svrhu pre nego što nestane.", "icons/finance_wallet.svg", ["Mesečni budžet", "Troškovi", "Kategorije", "Kontrola"], {
        title: "Kakav budžet želiš da uspostaviš",
        titlePlaceholder: "Primer: Pratiti sve troškove 30 dana",
        purpose: "Zašto želiš jasniji pregled novca?",
        currentState: "Koliko trenutno znaš gde ti novac odlazi tokom meseca?",
        desiredResult: "Kakav osećaj kontrole i koji finansijski rezultat želiš",
        timeframe: "Koliko dugo želiš da testiraš prvi budžetski sistem?",
        action: "Koje kategorije, limite ili dnevno praćenje možeš odmah da uvedeš",
        obstacle: "šta ti može otežati budžet: zaboravljanje, gotovina, impuls, partner ili neplanirani troškovi?",
        support: "Koja aplikacija, tabela, banka ili nedeljni finansijski pregled može da pomogne?",
        successMeasurement: "Kako ćeš meriti uspeh: manje prekoračenja, tačan tracking, štednja ili mirniji mesec?",
        motivation: "šta želiš da prestaneš da osećaš kada pogledaš stanje računa?"
      }),
      sub("increasing_income", "Povećanje prihoda", "Pronađi dodatni ili veći izvor prihoda.", "icons/finance_wallet.svg", ["Povišica", "Side hustle", "Prodaja", "Freelance"], {
        title: "Kako želiš da povećaš prihod?",
        titlePlaceholder: "Primer: Napraviti dodatnih 500 EUR mesečno",
        purpose: "Zašto je veći prihod važan za tvoje ciljeve?",
        currentState: "Koje veštine, resurse ili prilike trenutno imaš za dodatni prihod?",
        desiredResult: "Koliki dodatni mesečni iznos želiš i iz kog izvora?",
        timeframe: "Do kada želiš da vidiš prvi dodatni prihod?",
        action: "Koji potez možeš da napraviš: pregovor, ponuda, outreach, prodaja ili novi proizvod?",
        obstacle: "šta može stati na put: vreme, strah od cene, manjak ideje, energija ili tržište?",
        support: "Koji mentor, platforma, mreža kontakata ili prodajni šablon može pomoći?",
        successMeasurement: "Kako ćeš meriti napredak: prihod, broj ponuda, poziva, kupaca ili stopa konverzije?",
        motivation: "šta bi ti dodatni prihod omogućio što sada stalno odlažeš?"
      }),
      sub("emergency_fund", "Fond za hitne slučajeve", "Izgradi zaštitni sloj za neplanirane udarce.", "icons/finance_wallet.svg", ["1 mesec troškova", "3 meseca", "6 meseci", "Automatizacija"], {
        title: "Koliki fond za hitne slučajeve želiš",
        titlePlaceholder: "Primer: Napraviti fond od 3 mesečna troška",
        purpose: "Zašto ti je važno da imaš finansijsku rezervu?",
        currentState: "Koliko trenutno imaš odvojeno za neplanirane situacije?",
        desiredResult: "Koliki iznos bi ti dao/la osećaj osnovne sigurnosti?",
        timeframe: "Do kada želiš da popuniš prvu fazu fonda?",
        action: "Koliko možeš automatski da prebaciš svakog meseca ili nedelje?",
        obstacle: "šta može ugroziti fond: mešanje sa trošenjem, hitni troškovi, nered u računima?",
        support: "Koji odvojeni račun, pravilo i podsetnik mogu da zaštite fond?",
        successMeasurement: "Kako ćeš meriti napredak: procenat cilja, broj meseci troškova ili kontinuitet uplata?",
        motivation: "Kakav mir želiš da imaš kada se desi nešto neplanirano?"
      }),
      sub("financial_freedom", "Finansijska sloboda", "Definiši dugoročnu sliku nezavisnosti i put do nje.", "icons/finance_wallet.svg", ["Nezavisnost", "Pasivni prihod", "Manje zavisnosti", "Dugoročni plan"], {
        title: "šta za tebe znači finansijska sloboda?",
        titlePlaceholder: "Primer: Pokriti osnovne troškove pasivnim prihodima",
        purpose: "Zašto te privlači finansijska sloboda, osim samog novca?",
        currentState: "Gde si sada sa prihodima, troškovima, imovinom i obavezama?",
        desiredResult: "Koja konkretna verzija slobode ti je najvažnija u ovoj fazi?",
        timeframe: "Koji horizont želiš da planiraš: 1, 3, 5 ili 10 godina?",
        action: "Koji prvi stub treba graditi: prihod, štednja, investiranje, znanje ili manji troškovi?",
        obstacle: "šta može odvući plan: lifestyle inflation, dugovi, nejasni brojevi ili nestrpljenje?",
        support: "Koji finansijski model, savetnik, knjige ili mesečni pregled mogu da vode odluke?",
        successMeasurement: "Kako ćeš meriti slobodu: net worth, stopa štednje, pasivni prihod ili meseci pokrića?",
        motivation: "Kako želiš da koristiš vreme kada novac više ne bude jedini pritisak?"
      }),
      sub("business_revenue", "Prihod biznisa", "Povećaj prodaju, zadržavanje i stabilnost prihoda.", "icons/finance_wallet.svg", ["Prodaja", "MRR", "Profit", "Klijenti", "Cena"], {
        title: "Koji cilj prihoda biznisa želiš",
        titlePlaceholder: "Primer: Povećati mesečni prihod na 5.000 EUR",
        purpose: "Zašto je ovaj prihod važan za sledeću fazu biznisa?",
        currentState: "Koliki su trenutni prihodi, profit i glavni kanali prodaje?",
        desiredResult: "Koji iznos, maržu ili stabilnost želiš da postigneć",
        timeframe: "Do kada želiš da dostigneš ili validiraš taj nivo prihoda?",
        action: "Koji lever ima najveći smisao: više leadova, bolja ponuda, cena, upsell ili retention?",
        obstacle: "šta može ograničiti rast: kapacitet, cash flow, prodajni proces, proizvod ili tim?",
        support: "Koji CRM, metrika, mentor, kampanja ili operativni sistem može pomoći?",
        successMeasurement: "Kako ćeš meriti rast: prihod, profit, konverzija, LTV, churn ili broj kupaca?",
        motivation: "šta ovaj prihod omogućava tebi, timu ili misiji biznisa?"
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
        obstacle: "šta može stati između vas: umor, ego, posao, stare teme ili različite potrebe?",
        support: "Koji razgovor, ritual, terapija, knjiga ili dogovor može da pomogne?",
        successMeasurement: "Kako ćeš meriti napredak: kvalitet razgovora, vreme zajedno, manje konflikata ili osećaj bliskosti?",
        motivation: "šta želiš da osoba pored tebe oseti kroz tvoju posvećenost?"
      }),
      sub("family_connection", "Porodična povezanost", "Vrati toplinu, pažnju i prisutnost u porodicu.", "icons/relationships_family_people.svg", ["Roditelji", "Braća/sestre", "šira porodica", "Zajedničko vreme"], {
        title: "Koji porodični odnos želiš da neguješ",
        titlePlaceholder: "Primer: Pozvati roditelje svake nedelje",
        purpose: "Zašto ti je važno da ovaj porodični odnos bude življi?",
        currentState: "Kako trenutno izgleda kontakt, bliskost ili distanca?",
        desiredResult: "Kakvu povezanost želiš da obnoviš ili izgradiš",
        timeframe: "U kom periodu želiš da napraviš prve dosledne korake?",
        action: "Koji poziv, susret, poruka ili gest možeš realno da napraviš",
        obstacle: "šta može otežati povezanost: vreme, stare rane, ponos, daljina ili obaveze?",
        support: "Koji ritual, zajednički događaj ili posredni razgovor može da olakša kontakt?",
        successMeasurement: "Kako ćeš meriti napredak: učestalost kontakta, kvalitet susreta ili manje napetosti?",
        motivation: "šta želiš da ostane između vas ako život ubrza još više?"
      }),
      sub("parenting", "Roditeljstvo", "Budi prisutniji, mirniji i dosledniji roditelj.", "icons/relationships_family_people.svg", ["Rutina", "Strpljenje", "Vreme sa decom", "Granice"], {
        title: "Koji roditeljski cilj želiš",
        titlePlaceholder: "Primer: 20 minuta prisutne igre svakog dana",
        purpose: "Zašto ti je ova promena važna kao roditelju?",
        currentState: "Gde trenutno osećaš najveći izazov u roditeljstvu?",
        desiredResult: "Kako želiš da se tvoje dete oseća pored tebe?",
        timeframe: "Koliko dugo želiš da vežbaš ovu promenu i posmatraš efekat?",
        action: "Koja mala rutina ili reakcija može da napravi najveću razliku?",
        obstacle: "šta te najviše izbaci: umor, žurba, posao, okidači ili nedoslednost?",
        support: "Koji partner, porodica, knjiga, stručnjak ili raspored može da pomogne?",
        successMeasurement: "Kako ćeš meriti napredak: mirnije reakcije, više prisutnog vremena, manje konflikata?",
        motivation: "Kakvo sećanje želiš da tvoje dete nosi iz ovog perioda?"
      }),
      sub("friendships", "Prijateljstva", "Ojačaj kvalitetne veze i iniciraj više živog kontakta.", "icons/relationships_family_people.svg", ["Održavanje kontakta", "Nova prijateljstva", "Podrška", "Druženja"], {
        title: "Koji cilj želiš za prijateljstva?",
        titlePlaceholder: "Primer: Organizovati 2 druženja mesečno",
        purpose: "Zašto želiš više pažnje da uložiš u prijateljske odnose?",
        currentState: "Kako trenutno izgleda tvoj društveni život i ko ti zaista prija?",
        desiredResult: "Kakav krug prijateljstva želiš da neguješ",
        timeframe: "U kom periodu želiš da pokreneš više kontakta ili druženja?",
        action: "Kome možeš da se javiš i kakav susret ili poziv možeš da predložiš?",
        obstacle: "šta te koči: zauzetost, pasivnost, strah od odbijanja ili površnost?",
        support: "Koji zajednički ritual, grupa, aktivnost ili kalendar može da održi kontakt?",
        successMeasurement: "Kako ćeš meriti napredak: broj inicijativa, kvalitet razgovora ili osećaj pripadanja?",
        motivation: "Kakav osećaj zajedništva želiš da vratiš u svoj život?"
      }),
      sub("communication", "Komunikacija", "Govori jasnije, slušaj dublje i smanji nesporazume.", "icons/relationships_family_people.svg", ["Aktivno slušanje", "Iskrenost", "Teški razgovori", "Jasnoća"], {
        title: "Koji komunikacijski cilj želiš",
        titlePlaceholder: "Primer: Govoriti potrebe bez optuživanja",
        purpose: "Zašto ti je važno da komuniciraš zrelije?",
        currentState: "U kojim razgovorima trenutno najčešće nastane nesporazum?",
        desiredResult: "Kako želiš da zvučiš i slušaš u važnim razgovorima?",
        timeframe: "Kada želiš da primeniš ovu promenu u stvarnom razgovoru?",
        action: "Koju konkretnu rečenicu, pitanje ili pauzu možeš da vežbaš",
        obstacle: "šta te skrene: odbrana, prekidanje, ton, pretpostavke ili strah od reakcije?",
        support: "Koji model razgovora, beleška, terapija ili feedback može da pomogne?",
        successMeasurement: "Kako ćeš meriti komunikaciju: manje eskalacija, više jasnoće, bolji feedback?",
        motivation: "šta želiš da ljudi osete kada razgovaraju sa tobom?"
      }),
      sub("conflict_resolution", "Rešavanje konflikta", "Pretvori tenziju u razumevanje i dogovor.", "icons/relationships_family_people.svg", ["Izvinjenje", "Dogovor", "Teška tema", "Smirivanje"], {
        title: "Koji konflikt ili obrazac želiš da rešić",
        titlePlaceholder: "Primer: Razgovor bez dizanja tona",
        purpose: "Zašto je važno da ovaj konflikt ne ostane nerešen?",
        currentState: "šta se trenutno ponavlja u konfliktu i ko je uključen?",
        desiredResult: "Kakav dogovor, razumevanje ili mir želiš na kraju?",
        timeframe: "Kada želiš da otvoriš ili završiš ovaj razgovor?",
        action: "Koji prvi korak može smanjiti tenziju pre nego što tražiš rešenje?",
        obstacle: "šta može zapaliti konflikt: ton, stare teme, optužbe, prekidanje ili ponos?",
        support: "Da li bi pomogao posrednik, pravilo razgovora, pisana priprema ili pauza?",
        successMeasurement: "Kako ćeš znati da je konflikt zdravije rešen: dogovor, mirniji ton, promenjeno ponašanje?",
        motivation: "šta želiš da zaštitiš rešavanjem ovog konflikta?"
      }),
      sub("boundaries", "Granice", "Postavi jasne granice bez krivice i agresije.", "icons/relationships_family_people.svg", ["Vreme", "Emocionalne granice", "Posao", "Porodica", "Digitalno"], {
        title: "Koju granicu želiš da postaviš",
        titlePlaceholder: "Primer: Ne odgovaram na poslovne poruke posle 19h",
        purpose: "Zašto ti je ova granica potrebna?",
        currentState: "Gde trenutno kažeš da kada zapravo misliš ne?",
        desiredResult: "Kako želiš da izgleda odnos kada granica postane normalna?",
        timeframe: "Kada želiš prvi put jasno da komuniciraš ovu granicu?",
        action: "Koju kratku rečenicu i konkretno pravilo možeš da koristiš",
        obstacle: "šta će ti biti najteže: krivica, reakcija drugih, navika ugađanja ili strah od konflikta?",
        support: "Ko može da te podseti, ohrabri ili pomogne da granicu održić",
        successMeasurement: "Kako ćeš meriti uspeh: manje iscrpljenosti, više vremena, dosledno ne ili bolji odnos?",
        motivation: "Koji deo sebe želiš da zaštitiš ovom granicom?"
      }),
      sub("quality_time", "Kvalitetno vreme", "Stvori prisutne trenutke koji odnose čine živim.", "icons/relationships_family_people.svg", ["Partner", "Deca", "Porodica", "Prijatelji"], {
        title: "Sa kim želiš više kvalitetnog vremena?",
        titlePlaceholder: "Primer: Nedeljna Šetnja bez telefona sa partnerom",
        purpose: "Zašto ti je važno da ovo vreme bude prisutno, a ne samo usputno?",
        currentState: "Kako trenutno provodite vreme i šta mu najviše smanjuje kvalitet?",
        desiredResult: "Kakav osećaj povezanosti želiš posle tih susreta?",
        timeframe: "Koliko često i u kom periodu želiš da uvedeš ovaj ritam?",
        action: "Koju aktivnost možeš da zakažeš odmah i zaštitiš od distrakcija?",
        obstacle: "šta može ući između: telefoni, umor, posao, logistika ili odlaganje?",
        support: "Koji kalendarski termin, dogovor ili zajednička lista ideja može da pomogne?",
        successMeasurement: "Kako ćeš meriti kvalitet: broj susreta, osećaj bliskosti, razgovori ili manje distrakcija?",
        motivation: "šta ne želiš da propustiš sa tom osobom?"
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
        currentState: "šta trenutno znaš: destinacija, budžet, datumi, društvo ili samo želja?",
        desiredResult: "Kakvo iskustvo želiš da poneseš sa tog putovanja?",
        timeframe: "Kada želiš da putuješ ili završiš planiranje?",
        action: "Koji prvi praktičan korak treba uraditi: budžet, datumi, prevoz, smeštaj ili ruta?",
        obstacle: "šta može zaustaviti plan: novac, vreme, dokumenta, društvo ili neodlučnost?",
        support: "Koji alati, ljudi, vodiči ili liste mogu da olakšaju organizaciju?",
        successMeasurement: "Kako ćeš meriti napredak: rezervacije, budžet, plan puta ili spremnost za polazak?",
        motivation: "šta želiš da osetiš kada konačno budeš tamo?"
      }),
      sub("home_projects", "Kućni projekti", "Sredi prostor kroz konkretan plan, budžet i redosled rada.", "icons/other_target.svg", ["Renoviranje", "Organizacija", "Uređenje", "Popravke"], {
        title: "Koji kućni projekat želiš da završić",
        titlePlaceholder: "Primer: Organizovati radni kutak",
        purpose: "Zašto ti je ovaj prostor važan za svakodnevni život?",
        currentState: "U kom stanju je projekat sada i šta najviše smeta?",
        desiredResult: "Kako želiš da prostor izgleda, funkcioniše i utiče na tebe?",
        timeframe: "Do kada želiš da završiš glavnu fazu projekta?",
        action: "Koji prvi zadatak je dovoljno mali da ga pokreneš ovog vikenda?",
        obstacle: "šta može usporiti projekat: budžet, alat, nered, odluke ili vreme?",
        support: "Koji majstor, član porodice, lista kupovine ili inspiracija može da pomogne?",
        successMeasurement: "Kako ćeš meriti napredak: završene zone, fotografije pre/posle, funkcionalnost ili budžet?",
        motivation: "Kakav osećaj želiš da imaš kada uđeš u taj prostor?"
      }),
      sub("creative_projects", "Kreativni projekti", "Završi nešto što stvaraš za sebe, publiku ili portfolio.", "icons/other_target.svg", ["Pisanje", "Video", "Umetnost", "Muzika", "Digitalni proizvod"], {
        title: "Koji kreativni projekat želiš da završić",
        titlePlaceholder: "Primer: Objaviti prvi mini-album",
        purpose: "Zašto ovaj projekat zaslužuje da bude završen?",
        currentState: "šta trenutno postoji i šta još nedostaje?",
        desiredResult: "šta tačno treba da postoji na kraju prve verzije?",
        timeframe: "Do kada želiš da imaš verziju spremnu za deljenje?",
        action: "Koji deo možeš završiti u sledećem kreativnom bloku?",
        obstacle: "šta će te najviše iskušavati: perfekcionizam, poređenje, rasipanje ideja ili manjak vremena?",
        support: "Koji alat, feedback osoba, rok ili zajednica može da podrži završavanje?",
        successMeasurement: "Kako ćeš meriti napredak: završene scene, stranice, pesme, objave ili feedback?",
        motivation: "šta želiš da kažeš svetu ili sebi kroz ovaj projekat?"
      }),
      sub("lifestyle", "životni stil", "Dizajniraj ritam dana, okruženje i navike koje ti više odgovaraju.", "icons/other_target.svg", ["Minimalizam", "Digitalno", "Ritam dana", "Balans"], {
        title: "Koji deo životnog stila želiš da promeniš",
        titlePlaceholder: "Primer: Vikendi bez poslovnih obaveza",
        purpose: "Zašto trenutni način života traži promenu?",
        currentState: "šta u tvom svakodnevnom ritmu trenutno ne radi za tebe?",
        desiredResult: "Kako želiš da izgleda običan dan ili nedelja kada promena uspe?",
        timeframe: "Koliko dugo želiš da testiraš novi životni ritam?",
        action: "Koju jednu promenu možeš da uvedeš bez velikog resetovanja života?",
        obstacle: "šta može vratiti stari ritam: obaveze, očekivanja, telefon, krivica ili haos?",
        support: "Koji kalendar, granice, prostor ili osoba može da podrži novi ritam?",
        successMeasurement: "Kako ćeš meriti uspeh: energija, slobodno vreme, mir, doslednost ili zadovoljstvo?",
        motivation: "Kakav život želiš da osetiš u običnim danima, ne samo na odmoru?"
      }),
      sub("hobbies", "Hobiji", "Vrati igru, interesovanje i lično vreme u raspored.", "icons/other_target.svg", ["Muzika", "Sport", "Kuvanje", "Fotografija", "Igre"], {
        title: "Koji hobi želiš da neguješ",
        titlePlaceholder: "Primer: Svirati gitaru 3 puta nedeljno",
        purpose: "Zašto ti je ovaj hobi važan izvan produktivnosti?",
        currentState: "Koliko vremena trenutno daješ ovom hobiju i šta te sprečava?",
        desiredResult: "šta želiš da umeš, doživiš ili napraviš kroz ovaj hobi?",
        timeframe: "U kom periodu želiš da mu vratiš stabilno mesto u životu?",
        action: "Koji termin, oprema ili prvi mini-projekat može da pokrene kontinuitet?",
        obstacle: "šta najčešće pojede vreme za hobi: posao, ekran, umor ili osećaj da nije važan?",
        support: "Koji klub, prijatelj, kurs ili prostor može da ga učini lakšim i zabavnijim?",
        successMeasurement: "Kako ćeš meriti napredak: sati, vežbe, završeni komadi ili čisto zadovoljstvo?",
        motivation: "Koji deo sebe želiš ponovo da pustiš da se igra?"
      }),
      sub("personal_experiments", "Lični eksperimenti", "Testiraj novu ideju, identitet ili sistem na ograničen period.", "icons/other_target.svg", ["30 dana", "Rutina", "Digitalni detox", "Novi pristup"], {
        title: "Koji lični eksperiment želiš da pokreneš",
        titlePlaceholder: "Primer: 30 dana bez društvenih mreža ujutru",
        purpose: "Zašto želiš da testiraš baš ovaj eksperiment?",
        currentState: "Koji trenutni obrazac želiš da posmatraš ili promeniš",
        desiredResult: "šta želiš da naučiš, osetiš ili dokažeš posle eksperimenta?",
        timeframe: "Koliko će eksperiment trajati i kada počinje?",
        action: "Koje pravilo eksperimenta mora biti jasno od prvog dana?",
        obstacle: "šta može iskriviti rezultat: preširoka pravila, zaboravljanje, pritisak okoline ili zamena navike?",
        support: "Koji tracker, dnevnik, partner ili podsetnik može da drži eksperiment čistim?",
        successMeasurement: "Kako ćeš meriti eksperiment: dnevni check-in, rezultat, osećaj ili zaključak?",
        motivation: "šta te najviše zanima da saznaš o sebi?"
      }),
      sub("custom_goal", "Prilagođeni cilj", "Definiši oblast koja ne spada u ponuđene kategorije.", "icons/other_target.svg", [], {
        title: "Kako želiš da nazoveš ovaj prilagođeni cilj?",
        titlePlaceholder: "Primer: Moj specifičan cilj",
        purpose: "Zašto ti je ova oblast važna i šta bi značilo da joj posvetiš pažnju?",
        currentState: "Gde se trenutno nalaziš u ovoj oblasti i šta je najvažniji kontekst?",
        desiredResult: "Koji konkretan rezultat bi ti pokazao da je cilj uspeo?",
        timeframe: "Kada želiš da vidiš prvi jasan pomak ili završetak?",
        action: "Koje realne akcije možeš preduzeti u prvoj nedelji?",
        obstacle: "šta bi moglo da te zaustavi ili odvuče pažnju?",
        support: "Koji alati, ljudi, navike ili okruženje mogu da podrže ovaj cilj?",
        successMeasurement: "Kako ćeš znati da napreduješ ako cilj nije standardan?",
        motivation: "Koji lični razlog će te držati uz ovaj cilj kada početni entuzijazam padne?"
      })
    ]
  }
];

  const builderCategoryNamesEn = {
    "Personal Growth": "Personal Growth",
    "Health & Energy": "Health & Energy",
    "Career & Work": "Career & Work",
    Finance: "Finance",
    "Relationships & Family": "Relationships & Family",
    Other: "Other"
  };

  function titleFromId(id) {
    return String(id || "")
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function createEnglishQuestion(question, subcategoryName) {
    const textByKey = {
      title: "What goal do you want to create for " + subcategoryName + "?",
      purpose: "Why does this goal matter to you right now?",
      successMeasurement: "How will you know that you are making real progress?",
      action: "What is the first realistic action you can take this week?"
    };

    return {
      key: question.key,
      text: textByKey[question.key] || "What would help you define this goal more clearly?",
      type: question.type,
      placeholder: question.key === "title" ? "Example: Build a clear " + subcategoryName.toLowerCase() + " goal" : ""
    };
  }

  function createEnglishBuilderCatalog(catalog) {
    return cloneBuilderCatalog(catalog).map((category) => ({
      ...category,
      name: builderCategoryNamesEn[category.value] || titleFromId(category.id),
      subcategories: (category.subcategories || []).map((subcategory) => {
        const name = titleFromId(subcategory.id);
        return {
          ...subcategory,
          name,
          description: "Build a clear and realistic goal for " + name.toLowerCase() + ".",
          goalTypes: subcategory.goalTypes && subcategory.goalTypes.length
            ? ["Focus", "Routine", "Milestone", "Consistency"]
            : [],
          questions: (subcategory.questions || []).map((question) => createEnglishQuestion(question, name))
        };
      })
    }));
  }

  const builderCatalogEn = createEnglishBuilderCatalog(builderCatalogSr);


  
  Object.assign(window.MentorI18nResources.en, {
      builder: {
        catalog: builderCatalogEn,
        intro: {
          title: "Start your success",
          text: "Choose one life area and the questions, calendar, and notes will follow that focus."
        },
        category: {
          title: "Choose a goal category",
          text: "First choose the main area. Then we pick a narrower focus so Mentor asks the right questions.",
          back: "Back to categories"
        },
        subcategory: {
          title: "Subcategories",
          text: "Choose a specific area so the questions feel mentored, not generic."
        },
        categoryIntros: {
          personalGrowth: {
            title: "Growth starts inside",
            text: "Personal growth helps you think more clearly, choose with more confidence, and build a version of yourself you can trust."
          },
          healthEnergy: {
            title: "Energy is the foundation",
            text: "Health gives strength to every other goal: better rhythm, more focus, and a body that can support your ambitions."
          },
          careerWork: {
            title: "Direct your work",
            text: "A career grows when you know what you are building, which skills you are strengthening, and which next step matters most."
          },
          finance: {
            title: "Money follows a plan",
            text: "A financial goal brings calm, clearer decisions, and a stronger sense of control over the choices you make today and tomorrow."
          },
          relationshipsFamily: {
            title: "Relationships give strength",
            text: "Quality relationships need attention, conversation, and time; when you nurture them, life gains a steadier base."
          },
          other: {
            title: "Your focus has room",
            text: "If a goal does not fit standard categories, it still deserves a clear plan, rhythm, and a way to measure progress."
          }
        },
        customSubcategory: {
          label: "What do you want to call your area?",
          placeholder: "Example: Specific personal project",
          directName: "Continue without subcategory",
          directDescription: "Skip the narrower focus and create a goal directly in {{category}}.",
          directTitle: "What do you want to call your goal in {{category}}?",
          directTitlePlaceholder: "Example: My personal goal",
          directPurpose: "Why does this personal area matter right now?",
          directCurrentState: "Where are you right now in this area, and what context matters most?",
          directDesiredResult: "Which result would show you that this goal worked?",
          directTimeframe: "When do you want to see the first clear movement or completion?",
          directAction: "Which realistic actions can you take in the first week?",
          directObstacle: "What could stop you or pull your attention away?",
          directSupport: "Which tools, people, habits, or environment can support this goal?",
          directSuccessMeasurement: "How will you know you are making progress if the goal is not standard?",
          directMotivation: "Which personal reason will keep you with this goal when the early excitement drops?"
        },
        start: "Continue to goal creator",
        generate: "Generate goal",
        cardTitle: "Goal card",
        titleFallback: "Goal name",
        noSubcategory: "Not selected",
        inputPlaceholder: "Write an answer",
        typeLabels: {
          longTerm: "Long-term goal",
          shortTerm: "Short-term goal",
          habit: "Habit"
        },
        execution: {
          habit: "Habit",
          shortTerm: "Focus block",
          longTerm: "Milestone"
        },
        live: {
          goalType: "Goal type",
          focus: "Focus",
          execution: "Execution",
          frequency: "Frequency",
          time: "Time",
          description: "Goal description"
        },
        goalKind: {
          personalGrowth: "Personal goal",
          healthEnergy: "Physical goal",
          careerWork: "Intellectual goal",
          finance: "Financial goal",
          relationshipsFamily: "Emotional goal",
          other: "Personal goal"
        },
        review: {
          title: "Goal overview",
          type: "Type",
          category: "Category",
          subcategory: "Subcategory",
          name: "Name",
          why: "Why",
          firstStep: "First step",
          successMeasure: "Success measure",
          openCalendar: "Open calendar",
          newGoal: "Create new goal",
          changeCategory: "Change category"
        },
        metric: {
          targetDate: "Target date",
          duration: "Duration",
          frequency: "Frequency"
        },
        messages: {
          complete: "Great. From your answers I can now create a goal overview.",
          fillingCard: "The goal card fills in while you answer the questions.",
          intro: "Let's build the goal through questions that belong to this exact area.",
          selected: "Selected:",
          saved: "The goal was saved with its category, subcategory, focus, and answers. You can now schedule it in the calendar.",
          saveFailed: "The goal was not saved permanently. Please try again.",
          showChat: "Show chat",
          hideChat: "Hide chat"
        },
        questions: {
          creationType: "Do you want to set this focus as a long-term goal, a short-term goal, or a habit?",
          targetDate: "Which date do you want as the deadline or main check-in point?",
          duration: "How long should this first focused sprint last?",
          frequency: "How often can you realistically repeat this habit?",
          bestTime: "Which part of the day makes the most sense for it?",
          focus: "Which focus best describes this goal in the area: {{name}}?",
          options: {
            threeDays: "3 days",
            fiveDays: "5 days",
            sevenDays: "7 days",
            fourteenDays: "14 days",
            thirtyDays: "30 days",
            daily: "Daily",
            threeWeekly: "3x weekly",
            weekly: "Weekly",
            morning: "Morning",
            afternoon: "Afternoon",
            evening: "Evening"
          }
        },
        browser: {
          title: "My goals",
          text: "Manage goals and drag actions into the calendar.",
          create: "+ Create new goal",
          type: "Goal type",
          all: "All goals",
          personal: "Personal",
          intellectual: "Intellectual",
          physical: "Physical",
          financial: "Financial",
          business: "Business",
          noDate: "No date selected",
          emptyDay: "Click a day in the calendar to see scheduled goals."
        }
      },
      calendar: {
        columns: {
          all: "All goals",
          personal: "Personal",
          intellectual: "Intellectual",
          physical: "Physical",
          financial: "Financial",
          business: "Business"
        },
        modes: {
          month: "Month",
          week: "Week",
          day: "Day"
        },
        weekdays: {
          monShort: "Mon",
          tueShort: "Tue",
          wedShort: "Wed",
          thuShort: "Thu",
          friShort: "Fri",
          satShort: "Sat",
          sunShort: "Sun"
        },
        tabs: {
          overview: "Overview",
          actions: "Actions",
          notes: "Notes",
          stats: "Statistics",
          edit: "Edit"
        },
        labels: {
          today: "Today",
          noDateSelected: "No date selected",
          clickDay: "Click a day in the calendar to see scheduled goals.",
          noEventsForDate: "There are no scheduled goals for this date yet.",
          category: "Category",
          subcategory: "Subcategory",
          time: "Time",
          title: "Title",
          type: "Type",
          date: "Date",
          action: "Action",
          notes: "Notes",
          focus: "Focus",
          why: "Why",
          successMeasure: "Success measure",
          rhythm: "Rhythm",
          goal: "Goal",
          goalName: "Goal name",
          targetDate: "Target date",
          duration: "Duration / scope",
          frequency: "Frequency",
          totalProgress: "Total progress",
          status: "Status",
          tasks: "tasks",
          completed: "completed",
          remaining: "remaining",
          inCalendar: "in calendar",
          stats: "Statistics",
          nextFocus: "Next focus",
          nextCalendar: "Next in calendar",
          overviewGoal: "Goal overview",
          overviewEvent: "Calendar entry overview",
          eventActions: "Actions for this entry",
          taskActions: "Actions for task: {{title}}",
          chooseTask: "Choose a task",
          emptyTask: "Choose a task from the left panel.",
          thisEvent: "this entry",
          task: "task",
          noReason: "This entry does not have a reason yet.",
          notScheduled: "Not scheduled",
          noDeadline: "no deadline",
          noDeadlineTitle: "No deadline",
          fromTo: "From {{from}} to {{to}}",
          daily: "Daily",
          once: "Once",
          planned: "Planned",
          focusBlock: "Focus block",
          habit: "Habit",
          milestone: "Milestone",
          minutes30: "30 min",
          focusLower: "focus",
          dailyLower: "daily",
          until: "until {{date}}",
          emptyDetails: "Click a goal in the calendar to see details.",
          goalView: "Goal view",
          noGoalsFilter: "No goals in this filter.",
          createGoalEmpty: "Create a goal in the creator and it will appear here.",
          noShortGoals: "No short-term goals for the {{filter}} filter.",
          shortTermGoals: "Short-term goals",
          longTermGoals: "Long-term goals",
          longTermEmpty: "Long-term goals will appear here with drag & drop actions.",
          newGoalFallback: "New goal",
          longGoalFallback: "Long-term goal",
          calendarView: "Calendar view",
          dragGoal: "Drag a goal into the calendar.",
          initialAction: "Initial action",
          dayHint: "Click an hour for notes. Click an event to edit notes for that goal.",
          newAction: "New action",
          moreEvents: "+{{count}} more"
        },
        notes: {
          emptyExcerpt: "Empty note",
          title: "Note name",
          placeholderGoal: "Write a note for this goal...",
          placeholderEvent: "Write a note for this calendar entry...",
          add: "Add note",
          delete: "Delete note",
          list: "Notes list",
          headingGoal: "Notes",
          headingEvent: "Entry notes",
          newTitle: "New note",
          defaultTitle: "Note",
          duplicate: "A note with this name already exists."
        },
        actions: {
          previousPeriod: "Previous period",
          nextPeriod: "Next period",
          removeFromCalendar: "Remove from calendar",
          saveChanges: "Save changes",
          deleteFromCalendar: "Delete from calendar",
          deleteGoal: "Delete goal",
          editGoal: "Edit goal",
          editEvent: "Edit calendar entry",
          cancel: "Cancel",
          addAction: "Add action",
          removeSelectedEvent: "Delete from calendar"
        },
        prompts: {
          executionTime: "Execution time (HH:MM)",
          invalidTime: "Invalid format. Use HH:MM (24h).",
          eventActionTitle: "Action name for this entry",
          taskActionTitle: "Action name for this task",
          actionCadence: "Action rhythm"
        },
        confirm: {
          deleteGoal: "Do you want to delete the goal \"{{title}}\"? Only this goal and its calendar entries will be removed."
        },
        alerts: {
          pastDate: "You can schedule a goal only for today or a future date.",
          movePastDate: "You can move a goal only to today or a future date.",
          goalSaveFailed: "The goal was not saved permanently. Please try again.",
          calendarSaveFailed: "The calendar was not saved permanently. Please try again.",
          calendarLoadFailed: "The calendar could not load its saved data.",
          goalDeleteFailed: "The goal was not deleted. Please try again.",
          shortLimit: "The short-term goal limit is full. Remove a previous scheduled entry before adding it again.",
          weeklyLimit: "The weekly limit is full ({{limit}} of {{limit}}). Remove an entry from that week before adding it again."
        }
      }
  });
})();
