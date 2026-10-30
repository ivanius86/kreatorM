(function () {
  window.MentorI18nResources = window.MentorI18nResources || {};
  window.MentorI18nResources.sr = window.MentorI18nResources.sr || {};

  Object.assign(window.MentorI18nResources.sr, {
      nav: {
        dashboard: "Dashboard",
        brainstorming: "Brainstorming",
        goalCreator: "Creator ciljeva",
        calendar: "Kalendar",
        finance: "Finansije",
        journal: "Dnevnik",
        statistics: "Statistike",
        achievements: "Achievements",
        nutrition: "Ishrana",
        bodyEnergy: "Body and Energy",
        settings: "Pode\u0161avanja",
        collapseSidebar: "Skupi navigaciju",
        expandSidebar: "Proširi navigaciju"
      },
      common: {
        next: "Dalje",
        cancel: "Otka\u017ei",
        save: "Sa\u010duvaj",
        close: "Zatvori",
        more: "Jo\u0161"
      },
      storage: {
        backupEyebrow: "BACKUP PODATAKA",
        backupTitle: "Backup baze podataka",
        backupDescription: "Sa\u010duvaj kompletnu kopiju podataka ili vrati ranije sa\u010duvan backup.",
        exportAction: "Izvezi backup baze",
        importAction: "Uvezi backup baze",
        backupPreparing: "Priprema kompletnog backup-a...",
        backupReady: "Backup je spreman za preuzimanje.",
        importReading: "Provera i uvoz backup-a...",
        indexedDbImportConfirm: "Uvoz kompletnog ZIP backup-a \u0107e zameniti aktivnu bazu. Pre toga \u0107e automatski biti napravljen i preuzet bezbednosni backup trenutnih podataka. Nastaviti?",
        importConfirm: "Import JSON backup-a ce zameniti trenutne lokalne podatke. Nastaviti?",
        importSuccess: "Backup je importovan.",
        importFailed: "Import nije uspeo.",
        resetConfirm: "Reset ce obrisati mentor_database i vratiti praznu default strukturu. Nastaviti?",
        resetSuccess: "Lokalna baza je resetovana."
      },
      categories: {
        personalGrowth: "Lični razvoj",
        healthEnergy: "Zdravlje i energija",
        careerWork: "Karijera i posao",
        finance: "Finansije",
        relationshipsFamily: "Odnosi i porodica",
        other: "Ostalo"
      },
      dashboard: {
        eyebrow: "DASHBOARD",
        title: "Dobro jutro, Ivan",
        subtitle: "Tvoj miran pregled finansija, ideja i ciljeva za danas.",
        activeGoals: "Aktivni ciljevi",
        morning: {
          eyebrow: "Jutarnji pregled",
          title: "Jedan miran pogled pre akcije",
          text: "Finansije pokazuju prostor, brainstorming čuva ideje, a ciljevi ti govore šta danas zaslužuje pažnju."
        },
        pulse: {
          eyebrow: "Dnevni puls",
          goals: "Cilja",
          routines: "Rutine",
          tasks: "Zadaci"
        },
        finance: {
          title: "Novac kao signal, ne pritisak",
          text: "Danas prati da li troškovi ostaju u ritmu budžeta i da li ima prostora za sledeći mali korak."
        },
        ideas: {
          title: "Ideje koje vredi vratiti na sto",
          text: "Izaberi jednu ideju i napiši sledeći test koji može da se uradi bez velikog rizika.",
          nextTest: "sledeći mini test"
        },
        signals: {
          budgetLabel: "Budžet",
          budgetText: "Hrana pod kontrolom",
          ideasLabel: "Ideje",
          ideasText: "Van Life čeka sledeći test",
          goalsLabel: "Ciljevi",
          goalsText: "3 aktivna pravca"
        },
        goalSamples: {
          intellectual: "Intelektualni razvoj",
          health: "Zdravlje i Energija",
          finance: "Finansijska sloboda"
        }
      },
      journal: {
        eyebrow: "DNEVNIK",
        title: "Dnevna refleksija",
        subtitle: "Tiha stranica za misli, energiju i fokus.",
        previousNotes: "Prethodne beleške",
        placeholder: "Šta danas primećuješ kod sebe?",
        mood: "Raspoloženje",
        energy: "Energija",
        focus: "Fokus",
        calm: "Mirno",
        deepWork: "Dubok rad",
        monday: "Ponedeljak",
        sunday: "Nedelja",
        saturday: "Subota",
        mondayNote: "Dobar tempo, malo više pauza.",
        sundayNote: "Jasniji fokus za narednu sedmicu.",
        saturdayNote: "Završena jedna važna mala stvar."
      },
      bodyEnergy: {
        eyebrow: "BODY AND ENERGY",
        title: "Body and Energy",
        subtitle: "Jasno mesto za trening, oporavak, san i dnevnu energiju.",
        body: {
          title: "Telo",
          text: "Trening i kretanje ce ziveti ovde."
        },
        energy: {
          title: "Energija",
          text: "Dnevni signali energije bice povezani ovde."
        },
        recovery: {
          title: "Oporavak",
          text: "San, odmor i oporavak mogu da rastu iz ove stranice."
        },
        rhythm: {
          title: "Ritam",
          text: "Navike tela mogu da se prate odvojeno od achievements modula."
        }
      },
      statistics: {
        eyebrow: "STATISTIKE",
        title: "Pregled napretka",
        subtitle: "Nedelja, mesec i aktivni ciljevi na jednom mestu.",
        week: "Nedelja",
        month: "Mesec",
        completedTasks: "završenih zadataka",
        averageProgress: "prosečan progres",
        inProgress: "u toku",
        weeklyOverview: "Nedeljni pregled",
        activeGoalsChart: "Aktivni ciljevi"
      },
      achievements: {
        eyebrow: "ACHIEVEMENTS",
        title: "Postignuća i prekretnice",
        subtitle: "Mali dokazi kontinuiteta i završenih ciljeva.",
        focusWeek: {
          title: "7 dana fokusa",
          text: "Streak završen bez prekida."
        },
        firstGoal: {
          title: "Prvi završen cilj",
          text: "Jedan cilj je kompletiran do kraja."
        },
        morningRoutine: {
          title: "Jutarnja rutina",
          text: "Rutina se pojavila 5 puta ove nedelje."
        },
        milestone: {
          title: "Milestone",
          text: "Važna etapa je zaključana."
        }
      },
      settings: {
        eyebrow: "PODEŠAVANJA",
        title: "Mirna kontrola aplikacije",
        subtitle: "Placeholder za buduća podešavanja profila, tema i obaveštenja.",
        warmLook: "Topli premium izgled",
        dailyReminder: "Dnevni podsetnik",
        focusMode: "Fokus režim"
      }
  });
})();

