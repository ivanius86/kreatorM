(function (root) {
  "use strict";
  const messages = {
    en: {
      sectionOptions: "Sticker options", optionsTarget: "Edit appearance of", wholeSticker: "Whole sticker", optionTitle: "Section title", optionContent: "Description / Content", optionFont: "Font", optionSize: "Size (px)", optionTextColor: "Text color", optionBackground: "Background color", optionBorder: "Border color", inherited: "Inherited", inheritStyle: "Use inherited setting", resetSectionStyle: "Reset section appearance",
      optionTitleBackground: "Title background color",
      editorColors: "Editor colors", editorBackground: "Background", editorSections: "Sections", editorButtons: "Buttons", editorTabs: "Tabs",
      editorBackgroundColor: "Editor background color", editorSectionsColor: "Editor section color", editorButtonsColor: "Editor button color", editorTabsColor: "Editor tab color",
      sectionTitleFont: "Section title font", descriptionFont: "Description font", sectionContentFont: "Content font",
      fonts: { inherit: "Inherited font", Inter: "Inter", Georgia: "Georgia", Arial: "Arial", monospace: "Monospace" },
      eyebrow: "Mentor · Live Sticker Designer", createTitle: "Create your sticker", editTitle: "Edit sticker", preview: "Live sticker", builder: "Sticker builder",
      previewHint: "Your actual sticker. Open and close sections to explore it.", builderHint: "Add, edit and reorder sections. Changes appear immediately.",
      template: "Sticker template", templatesLabel: "Templates", sectionList: "Sections · your order", addSection: "Add section", untitled: "Untitled sticker", unitFillColor: "Unit box fill",
      templates: { custom: "Custom", media: "Media", source: "Source", unit: "Unit", notes: "Notes", av: "A/V" },
      sections: { image: "Image", video: "Video", media: "Media gallery", notes: "Notes / Description", link: "Link / Reference", source: "Source / File", unit: "Unit / Measurement", av: "A/V recording" },
      empty: "Start with Add section. Build a sticker around what matters to you.", emptyImage: "Add an image in the editor.",
      collapse: "Collapse sticker", expand: "Expand sticker", reorder: "Drag to reorder; use the up and down buttons with a keyboard", up: "Move up", down: "Move down", remove: "Remove",
      visible: "Show on sticker", sectionLabel: "Optional section title", upload: "Add or replace files", url: "URL", imageUrl: "Image URL", videoUrl: "Video or website URL", linkTitle: "Link title (optional)",
      open: "Open", openVideo: "Open video", fullscreen: "Full screen", fit: "Image framing", contain: "Fit / Contain", cover: "Crop / Cover", zoom: "Zoom", x: "Horizontal position", y: "Vertical position", rotation: "Rotation", reset: "Reset image framing",
      primary: "Make primary", primarySelected: "Primary", bold: "Bold", italic: "Italic", sourceHint: "PDF, Word and text use existing readers. Other files, including Excel and DWG, are available to download.",
      recordAudio: "Record audio", recordVideo: "Record video", measurement: "Unit", property: "Property name (optional)", dimension: "Measurement type", value: "Value", unit: "Unit", addMeasurement: "Add unit", quantityUnit: "pcs", customUnit: "Custom unit",
      dimensions: { currency: "Price / Currency", length: "Length", mass: "Mass", distance: "Distance", quantity: "Quantity", volume: "Volume", time: "Time", other: "Other" },
      saving: "Saving sticker…", preparing: "Preparing your sticker…", saveFailed: "The sticker could not be saved. Your draft is still here; try again.", invalidFile: "This file is unsupported, empty or too large (25 MB for sources, 100 MB for media).", mediaUnavailable: "Saved media is unavailable.", invalidDocument: "This sticker contains unsupported or unreadable saved sections. Its original data is preserved; editing is unavailable."
    },
    sr: {
      sectionOptions: "Opcije stikera", optionsTarget: "Uredi izgled za", wholeSticker: "Ceo stiker", optionTitle: "Naslov sekcije", optionContent: "Opis / Sadržaj", optionFont: "Font", optionSize: "Veličina (px)", optionTextColor: "Boja teksta", optionBackground: "Boja pozadine", optionBorder: "Boja okvira", inherited: "Nasleđeno", inheritStyle: "Koristi nasleđeno podešavanje", resetSectionStyle: "Vrati nasleđeni izgled sekcije",
      optionTitleBackground: "Boja pozadine naslova",
      editorColors: "Boje editora", editorBackground: "Pozadina", editorSections: "Sekcije", editorButtons: "Dugmad", editorTabs: "Tabovi",
      editorBackgroundColor: "Boja pozadine editora", editorSectionsColor: "Boja sekcija editora", editorButtonsColor: "Boja dugmadi editora", editorTabsColor: "Boja tabova editora",
      sectionTitleFont: "Font naslova sekcije", descriptionFont: "Font opisa", sectionContentFont: "Font sadržaja",
      fonts: { inherit: "Nasleđeni font", Inter: "Inter", Georgia: "Georgia", Arial: "Arial", monospace: "Monospace" },
      eyebrow: "Mentor · Live Sticker Designer", createTitle: "Kreiraj svoj stiker", editTitle: "Uređivanje stikera", preview: "Pregled stikera", builder: "Uređivanje stikera",
      previewHint: "Tvoj stvarni stiker. Otvaraj i skupljaj sekcije za pregled sadržaja.", builderHint: "Dodaj, uredi i reorganizuj sekcije. Promene se odmah prikazuju.",
      template: "Šablon stikera", templatesLabel: "Šabloni", sectionList: "Sekcije · tvoj redosled", addSection: "Dodaj sekciju", untitled: "Stiker bez naslova", unitFillColor: "Boja polja za jedinice",
      templates: { custom: "Custom", media: "Media", source: "Source", unit: "Unit", notes: "Notes", av: "A/V" },
      sections: { image: "Slika", video: "Video", media: "Media galerija", notes: "Beleške / Opis", link: "Link / Referenca", source: "Izvor / Fajl", unit: "Jedinica / Merenje", av: "A/V snimanje" },
      empty: "Počni sa Dodaj sekciju. Sastavi stiker od onoga što ti je važno.", emptyImage: "Dodaj sliku u editoru.",
      collapse: "Skupi stiker", expand: "Proširi stiker", reorder: "Prevuci za promenu redosleda; tastaturom koristi dugmad gore i dole", up: "Pomeri gore", down: "Pomeri dole", remove: "Ukloni",
      visible: "Prikaži na stikeru", sectionLabel: "Naziv sekcije (opciono)", upload: "Dodaj ili zameni fajlove", url: "URL", imageUrl: "URL slike", videoUrl: "URL videa ili stranice", linkTitle: "Naziv linka (opciono)",
      open: "Otvori", openVideo: "Otvori video", fullscreen: "Ceo ekran", fit: "Prikaz slike", contain: "Uklopi / Contain", cover: "Iseci / Cover", zoom: "Uvećanje", x: "Horizontalni položaj", y: "Vertikalni položaj", rotation: "Rotacija", reset: "Vrati početni prikaz slike",
      primary: "Postavi kao glavnu", primarySelected: "Glavna", bold: "Podebljano", italic: "Kurziv", sourceHint: "PDF, Word i tekst koriste postojeće čitače. Ostali fajlovi, uključujući Excel i DWG, dostupni su za preuzimanje.",
      recordAudio: "Snimi audio", recordVideo: "Snimi video", measurement: "Unit", property: "Naziv osobine (opciono)", dimension: "Vrsta merenja", value: "Vrednost", unit: "Jedinica", addMeasurement: "Dodaj unit", quantityUnit: "kom", customUnit: "Druga jedinica",
      dimensions: { currency: "Cena / Valuta", length: "Dužina", mass: "Masa", distance: "Distanca", quantity: "Količina", volume: "Zapremina", time: "Vreme", other: "Ostalo" },
      saving: "Čuvanje stikera…", preparing: "Priprema stikera…", saveFailed: "Stiker nije sačuvan. Tvoje izmene su i dalje ovde; pokušaj ponovo.", invalidFile: "Fajl nije podržan, prazan je ili prevelik (25 MB za izvore, 100 MB za medije).", mediaUnavailable: "Sačuvani medij nije dostupan.", invalidDocument: "Stiker sadrži nepodržane ili nečitljive sačuvane sekcije. Originalni podaci su sačuvani; uređivanje nije dostupno."
    }
  };
  root.MentorI18nResources = root.MentorI18nResources || {};
  Object.entries(messages).forEach(([language, designer]) => {
    const resource = root.MentorI18nResources[language] = root.MentorI18nResources[language] || {};
    resource.research = resource.research || {}; resource.research.designer = designer;
  });
})(window);
