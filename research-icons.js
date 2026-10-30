const MentorIconSystem = (() => {
  const providers = {
    tabler: "https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/outline/",
    lucide: "https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/"
  };

  const settings = {
    provider: "lucide",
    colorMode: "gold"
  };

  const categories = [
    {
      value: "health_energy",
      label: "Zdravlje i energija",
      options: [
        ["gym_strength", "Teretana i snaga"],
        ["weight_loss", "Mrsavljenje"],
        ["nutrition", "Ishrana"],
        ["running_athletics", "Trcanje i kardio"],
        ["sleep_recovery", "San i oporavak"],
        ["energy_management", "Upravljanje energijom"],
        ["meditation", "Meditacija"]
      ],
      icons: ["apple", "salad", "carrot", "beef", "egg", "chef-hat", "dumbbell", "biceps-flexed", "activity", "heart-pulse", "bike", "waves", "person-standing", "bed", "moon", "sparkles"]
    },
    {
      value: "personal_development",
      label: "Licni razvoj",
      options: [
        ["discipline", "Disciplina"],
        ["learning", "Ucenje"],
        ["confidence", "Samopouzdanje"],
        ["mindset", "Mentalni stav"],
        ["spiritual_growth", "Duhovni rast"]
      ],
      icons: ["book-open", "graduation-cap", "repeat-2", "brain", "lightbulb", "compass", "target", "sparkles", "flower-2", "sun"]
    },
    {
      value: "career_work",
      label: "Karijera i posao",
      options: [
        ["business_idea", "Biznis ideja"],
        ["productivity", "Produktivnost"],
        ["skill_development", "Razvoj vestine"],
        ["portfolio_cv", "Portfolio / CV"],
        ["leadership", "Liderstvo"]
      ],
      icons: ["briefcase-business", "chart-line", "users", "presentation", "badge-check", "notebook-pen", "rocket", "building-2", "messages-square", "kanban"]
    },
    {
      value: "finance",
      label: "Finansije",
      options: [
        ["budgeting", "Budzetiranje"],
        ["saving_money", "Stednja"],
        ["investing", "Investiranje"],
        ["debt_reduction", "Smanjenje duga"],
        ["business_revenue", "Prihod biznisa"]
      ],
      icons: ["wallet", "coins", "piggy-bank", "chart-no-axes-combined", "landmark", "receipt", "calculator", "hand-coins", "circle-dollar-sign", "scale"]
    },
    {
      value: "relationships",
      label: "Odnosi",
      options: [
        ["romantic_relationship", "Romanticna veza"],
        ["family_connection", "Porodica"],
        ["friendships", "Prijateljstva"],
        ["communication", "Komunikacija"],
        ["boundaries", "Granice"]
      ],
      icons: ["heart", "users", "message-circle-heart", "hand-heart", "house-heart", "baby", "messages-square", "shield-check", "smile", "link"]
    },
    {
      value: "creative_media",
      label: "Kreativa i mediji",
      options: [
        ["cinematography", "Kinematografija"],
        ["video", "Video"],
        ["photography", "Fotografija"],
        ["writing", "Pisanje"],
        ["music", "Muzika"]
      ],
      icons: ["clapperboard", "film", "video", "camera", "aperture", "image", "pen-tool", "notebook-pen", "music", "mic", "headphones", "palette"]
    },
    {
      value: "other",
      label: "Ostalo",
      options: [
        ["lifestyle", "Zivotni stil"],
        ["travel", "Putovanje"],
        ["home_projects", "Kucni projekti"],
        ["hobbies", "Hobiji"],
        ["custom", "Custom pravac"]
      ],
      icons: ["compass", "map", "plane", "home", "hammer", "leaf", "coffee", "gamepad-2", "sparkles", "anchor", "globe", "boxes"]
    }
  ];

  const budgetIcons = ["utensils", "coffee", "home", "car", "heart-pulse", "plane", "target", "lightbulb", "receipt", "wallet", "landmark", "piggy-bank", "coins", "chart-candlestick", "laptop", "circle-dot", "radio", "hash", "scale", "activity", "circle-dollar-sign", "trending-up", "droplets", "link", "badge-check", "clock", "file-text"];

  // One catalog serves direction and finance pickers. Keep saved icon IDs stable.
  const extraIcons = [
    "utensils", "car", "credit-card", "banknote", "shopping-bag", "shopping-cart", "bus", "fuel", "train-front",
    "calendar-days", "clock", "file-text", "laptop", "phone", "smartphone", "monitor", "wifi", "wrench", "plug",
    "circuit-board", "cpu", "gpu", "memory-stick", "hard-drive", "database", "server", "pc-case", "computer",
    "monitor-pc", "keyboard", "mouse", "router", "ethernet-port", "cloud", "cloud-upload", "cloud-download",
    "disc-3", "usb", "cable", "network", "code-2", "terminal", "bot", "battery", "fan",
    "folder", "archive", "save", "shield", "lock", "settings", "printer", "webcam", "speaker", "tablet",
    "globe", "telescope", "microscope", "flask-conical", "puzzle", "layers", "blocks", "package", "truck",
    "badge-euro", "badge-dollar-sign", "car-front", "house", "stethoscope", "ticket", "smartphone-charging",
    "chart-candlestick", "circle-dot", "radio", "hash", "trending-up", "droplets", "circle-dollar-sign"
  ];
  const iconAliases = {
    "circuit-board": "motherboard maticna ploca matična ploča maticna ploca mainboard elektronika",
    gpu: "graphic card graphics card graficka karta grafička karta video card video karta",
    "hard-drive": "storage skladiste skladište disk hdd ssd memorija",
    "memory-stick": "ram memory memorija radna memorija",
    cpu: "processor procesor chip cip čip",
    database: "baza podataka storage skladiste skladište",
    server: "server racunar računar hosting",
    "pc-case": "computer case kuciste kućište racunar računar",
    "monitor-pc": "desktop computer racunar računar kompjuter",
    router: "ruter network mreza mreža internet",
    "ethernet-port": "lan network mreza mreža",
    "cloud-upload": "backup cloud oblak otpremanje",
    "cloud-download": "cloud oblak preuzimanje"
  };
  const featuredIcons = ["circuit-board", "gpu", "hard-drive", "memory-stick", "cpu", "database", "server", "pc-case"];
  let allIcons = Array.from(new Set([...categories.flatMap((category) => category.icons), ...budgetIcons, ...extraIcons])).sort();
  let iconIndexPromise = null;

  function normalizeSearch(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  function searchIcons(query, limit = 48) {
    const term = normalizeSearch(query);
    const words = term.split(/\s+/).filter(Boolean);
    return allIcons.map((icon) => {
      const name = normalizeSearch(icon);
      const aliases = normalizeSearch(iconAliases[icon]);
      if (!words.every((word) => name.includes(word) || aliases.includes(word))) return null;
      const rank = !term ? (featuredIcons.includes(icon) ? 1 : 0) : name === term ? 5 : name.startsWith(term) ? 4 : aliases.startsWith(term) ? 3 : aliases.includes(term) ? 2 : 1;
      return { icon, rank };
    }).filter(Boolean).sort((a, b) => b.rank - a.rank || a.icon.localeCompare(b.icon)).slice(0, limit).map((item) => item.icon);
  }

  function ensureIconIndex() {
    if (iconIndexPromise) return iconIndexPromise;
    if (typeof fetch !== "function") return Promise.resolve(allIcons);
    const urls = [
      "https://data.jsdelivr.com/v1/package/npm/lucide-static@latest/flat",
      "https://unpkg.com/lucide-static@latest/icons/?meta"
    ];
    iconIndexPromise = Promise.allSettled(urls.map((url) => fetch(url).then((response) => response.ok ? response.json() : null)))
      .then((results) => {
        const names = results.filter((result) => result.status === "fulfilled" && result.value)
          .flatMap((result) => (Array.isArray(result.value.files) ? result.value.files : []))
          .map((file) => String(file?.name || file?.path || "").match(/(?:^|\/)icons\/([a-z0-9-]+)\.svg$/)?.[1])
          .filter(Boolean);
        allIcons = Array.from(new Set([...allIcons, ...names])).sort();
        window.MentorIconSystem.allIcons = allIcons;
        return allIcons;
      }).catch(() => allIcons);
    return iconIndexPromise;
  }

  function getCategory(value) {
    return categories.find((category) => category.value === value) || categories[0];
  }

  function getIconUrl(icon, provider = settings.provider) {
    const safeIcon = String(icon || "compass").replace(/[^a-z0-9-]/gi, "").toLowerCase();
    const base = providers[provider] || providers.lucide;
    return base + safeIcon + ".svg";
  }

  function renderIcon(icon, className = "research-external-icon") {
    return '<span class="' + className + '" style="--icon-url: url(&quot;' + getIconUrl(icon) + '&quot;)" aria-hidden="true"></span>';
  }

  function labelForIcon(icon) {
    return String(icon || "").split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  }

  window.MentorIconSystem = {
    categories,
    budgetIcons,
    allIcons,
    settings,
    getCategory,
    getIconUrl,
    renderIcon,
    labelForIcon,
    searchIcons,
    ensureIconIndex
  };

  return window.MentorIconSystem;
})();
