(function (root) {
  "use strict";
  const resources = {
    sr: {
      badge: "VIZUELNI PROTOTIP",
      title: "Tvoje misli, između korica.",
      intro: "Dodirni knjigu i napravi malo prostora za sebe.",
      session: "Probni prostor: tekst ostaje samo dok je ova stranica otvorena. Za svoju kopiju izaberi „Preuzmi tekst“.",
      loading: "Pripremamo knjigu…",
      closed: "Knjiga je spremna. Klikni na korice da je otvoriš.",
      opening: "Knjiga se otvara…",
      open: "Piši slobodno. Obe stranice su tvoje.",
      closing: "Knjiga se zatvara…",
      openAction: "Otvori knjigu",
      closeAction: "Zatvori knjigu",
      stop: "Zaustavi animaciju",
      download: "Preuzmi tekst",
      downloadDone: "Tekst je pripremljen za preuzimanje. U prototipu nema trajnog čuvanja.",
      fallback: "Animacija nije dostupna. Možeš isprobati statičnu knjigu.",
      unavailable: "Slike knjige nisu dostupne. Možeš i dalje isprobati stranice i preuzeti tekst.",
      reduced: "Smanjeno kretanje je uključeno — knjiga se otvara bez animacije.",
      retry: "Pokušaj ponovo",
      leftPage: "Prva stranica",
      rightPage: "Druga stranica",
      leftPlaceholder: "Počni ovde",
      rightPlaceholder: "",
      artwork: "Personalizovana knjiga dnevnika sa zlatnim drvetom na koricama",
      legacy: "Prethodni prikaz dnevnika",
      fileTitle: "KreatorM — probne stranice dnevnika"
    },
    en: {
      badge: "VISUAL PROTOTYPE",
      title: "Your thoughts, between the covers.",
      intro: "Open the book and make a little room for yourself.",
      session: "Practice space: text lasts only while this page stays open. Choose “Download text” to keep your own copy.",
      loading: "Preparing your book…",
      closed: "Your book is ready. Click the cover to open it.",
      opening: "Opening your book…",
      open: "Write freely. Both pages are yours.",
      closing: "Closing your book…",
      openAction: "Open book",
      closeAction: "Close book",
      stop: "Stop animation",
      download: "Download text",
      downloadDone: "Your text is ready to download. This prototype has no permanent storage.",
      fallback: "Animation is unavailable. You can try the static book.",
      unavailable: "Book images are unavailable. You can still try the pages and download your text.",
      reduced: "Reduced motion is enabled — the book opens without animation.",
      retry: "Try again",
      leftPage: "First page",
      rightPage: "Second page",
      leftPlaceholder: "Start here",
      rightPlaceholder: "",
      artwork: "Personal journal book with a golden tree on the cover",
      legacy: "Previous journal view",
      fileTitle: "KreatorM — journal practice pages"
    }
  };
  for (const language of ["sr", "en"]) {
    root.MentorI18n.registerResources(language, "journalBookPrototype", resources[language]);
  }
})(window);
