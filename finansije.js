// Finansije modul izdvojen iz script.js
// Zadrzava postojece globalne helpere iz script.js: escapeHtml, categoryLabel, setView i app state.

const financeTabs = Array.from(document.querySelectorAll("[data-finance-tab]"));
const financePanels = Array.from(document.querySelectorAll("[data-finance-panel]"));
const financeTabsWrap = document.querySelector(".finance-folder-tabs");
const financeTabsOverflow = document.querySelector(".finance-tabs-overflow");
const financeTabsOverflowToggle = document.getElementById("financeTabsOverflowToggle");
const financeTabsOverflowMenu = document.getElementById("financeTabsOverflowMenu");
const transactionForm = document.getElementById("transactionForm");
const openTransactionModalBtn = document.getElementById("openTransactionModalBtn");
const transactionUploadBtn = document.getElementById("transactionUploadBtn");
const transactionUploadInput = document.getElementById("transactionUploadInput");
const transactionImportModal = document.getElementById("transactionImportModal");
const transactionImportUploadPanel = document.getElementById("transactionImportUploadPanel");
const transactionImportUploadTitle = document.getElementById("transactionImportUploadTitle");
const transactionImportUploadHint = document.getElementById("transactionImportUploadHint");
const transactionImportChooseFileBtn = document.getElementById("transactionImportChooseFileBtn");
const transactionImportToolbar = document.getElementById("transactionImportToolbar");
const transactionImportTitle = document.getElementById("transactionImportTitle");
const transactionImportTemplateInput = document.getElementById("transactionImportTemplate");
const transactionImportTemplateNameInput = document.getElementById("transactionImportTemplateName");
const saveTransactionImportTemplateBtn = document.getElementById("saveTransactionImportTemplateBtn");
const transactionImportSummary = document.getElementById("transactionImportSummary");
const transactionImportMapping = document.getElementById("transactionImportMapping");
const transactionImportPreview = document.getElementById("transactionImportPreview");
const confirmTransactionImportBtn = document.getElementById("confirmTransactionImportBtn");
const transactionModal = document.getElementById("transactionModal");
const transactionEditId = document.getElementById("transactionEditId");
const transactionFormTitle = document.getElementById("transactionFormTitle");
const transactionTypeInput = document.getElementById("transactionType");
const transactionAmountInput = document.getElementById("transactionAmount");
const transactionCategoryInput = document.getElementById("transactionCategory");
const toggleQuickCategoryBtn = document.getElementById("toggleQuickCategoryBtn");
const quickCategoryAdd = document.getElementById("quickCategoryAdd");
const quickCategoryInput = document.getElementById("quickCategoryInput");
const quickCategoryAddBtn = document.getElementById("quickCategoryAddBtn");
const transactionDateInput = document.getElementById("transactionDate");
const transactionNoteInput = document.getElementById("transactionNote");
const transactionLinkedToInput = document.getElementById("transactionLinkedTo");
const transactionBudgetInput = document.getElementById("transactionBudget");
const transactionCashflowLinkInput = document.getElementById("transactionCashflowLink");
const transactionCancelEditBtn = document.getElementById("transactionCancelEditBtn");
const transactionSaveStatus = document.getElementById("transactionSaveStatus");
const transactionIncomeTotal = document.getElementById("transactionIncomeTotal");
const transactionExpenseTotal = document.getElementById("transactionExpenseTotal");
const transactionBalanceTotal = document.getElementById("transactionBalanceTotal");
const transactionDateFilter = document.getElementById("transactionDateFilter");
const transactionTypeFilter = document.getElementById("transactionTypeFilter");
const transactionCategoryFilter = document.getElementById("transactionCategoryFilter");
const transactionLinkedFilter = document.getElementById("transactionLinkedFilter");
const transactionSort = document.getElementById("transactionSort");
const transactionSearchInput = document.getElementById("transactionSearchInput");
const transactionResetFiltersBtn = document.getElementById("transactionResetFiltersBtn");
const transactionList = document.getElementById("transactionList");
const transactionCountLabel = document.getElementById("transactionCountLabel");
const refreshTransactionCategoriesBtn = document.getElementById("refreshTransactionCategoriesBtn");
const deleteSelectedTransactionsBtn = document.getElementById("deleteSelectedTransactionsBtn");
const openCategoryManagerBtn = document.getElementById("openCategoryManagerBtn");
const categoryManagerModal = document.getElementById("categoryManagerModal");
const categoryManagerType = document.getElementById("categoryManagerType");
const categoryManagerInput = document.getElementById("categoryManagerInput");
const categoryManagerAddBtn = document.getElementById("categoryManagerAddBtn");
const categoryManagerList = document.getElementById("categoryManagerList");
const categoryKeywordTitle = document.getElementById("categoryKeywordTitle");
const categoryKeywordHint = document.getElementById("categoryKeywordHint");
const categoryKeywordInput = document.getElementById("categoryKeywordInput");
const categoryKeywordAddBtn = document.getElementById("categoryKeywordAddBtn");
const categoryKeywordList = document.getElementById("categoryKeywordList");
const overviewPeriodEyebrow = document.getElementById("overviewPeriodEyebrow");
const overviewPeriodTitle = document.getElementById("overviewPeriodTitle");
const overviewPeriodSelect = document.getElementById("overviewPeriodSelect");
const overviewChartTypeSelect = document.getElementById("overviewChartTypeSelect");
const overviewCustomDates = document.getElementById("overviewCustomDates");
const overviewStartDate = document.getElementById("overviewStartDate");
const overviewEndDate = document.getElementById("overviewEndDate");
const monthlyOverviewContent = document.getElementById("monthlyOverviewContent");
const cashflowNetHero = document.getElementById("cashflowNetHero");
const cashflowHealthLabel = document.getElementById("cashflowHealthLabel");
const cashflowIncomeTotal = document.getElementById("cashflowIncomeTotal");
const cashflowExpenseTotal = document.getElementById("cashflowExpenseTotal");
const cashflowDebtPayment = document.getElementById("cashflowDebtPayment");
const cashflowBudgetedTotal = document.getElementById("cashflowBudgetedTotal");
const cashflowProjectionStart = document.getElementById("cashflowProjectionStart");
const cashflowProjectionEnd = document.getElementById("cashflowProjectionEnd");
const cashflowAnnualIncome = document.getElementById("cashflowAnnualIncome");
const cashflowAnnualOutflow = document.getElementById("cashflowAnnualOutflow");
const cashflowAnnualNet = document.getElementById("cashflowAnnualNet");
const cashflowProjectionNet = document.getElementById("cashflowProjectionNet");
const cashflowIncludeCapital = document.getElementById("cashflowIncludeCapital");
const cashflowIncludeInvestments = document.getElementById("cashflowIncludeInvestments");
const cashflowIncludeExtraExpenses = document.getElementById("cashflowIncludeExtraExpenses");
const cashflowCapitalOptionAmount = document.getElementById("cashflowCapitalOptionAmount");
const cashflowInvestmentOptionAmount = document.getElementById("cashflowInvestmentOptionAmount");
const cashflowExtraExpenseOptionAmount = document.getElementById("cashflowExtraExpenseOptionAmount");
const cashflowListTitle = document.getElementById("cashflowListTitle");
const cashflowListSubtitle = document.getElementById("cashflowListSubtitle");
const cashflowListTabs = Array.from(document.querySelectorAll("[data-cashflow-list-tab]"));
const cashflowActiveAddBtn = document.getElementById("cashflowActiveAddBtn");
const cashflowUnifiedList = document.getElementById("cashflowUnifiedList");
const cashflowMonthsStrip = document.getElementById("cashflowMonthsStrip");
const cashflowMonthsPrevBtn = document.getElementById("cashflowMonthsPrevBtn");
const cashflowMonthsNextBtn = document.getElementById("cashflowMonthsNextBtn");
const cashflowIncomeModal = document.getElementById("cashflowIncomeModal");
const cashflowExpenseModal = document.getElementById("cashflowExpenseModal");
const cashflowDebtModal = document.getElementById("cashflowDebtModal");
const cashflowIncomeForm = document.getElementById("cashflowIncomeForm");
const cashflowIncomeName = document.getElementById("cashflowIncomeName");
const cashflowIncomeIconSearch = document.getElementById("cashflowIncomeIconSearch");
const cashflowIncomeIconInput = document.getElementById("cashflowIncomeIcon");
const cashflowIncomeIconPreview = document.getElementById("cashflowIncomeIconPreview");
const cashflowIncomeIconResults = document.getElementById("cashflowIncomeIconResults");
const cashflowIncomeCategory = document.getElementById("cashflowIncomeCategory");
const toggleCashflowIncomeCategoryBtn = document.getElementById("toggleCashflowIncomeCategoryBtn");
const cashflowIncomeQuickCategoryAdd = document.getElementById("cashflowIncomeQuickCategoryAdd");
const cashflowIncomeQuickCategoryInput = document.getElementById("cashflowIncomeQuickCategoryInput");
const cashflowIncomeQuickCategoryAddBtn = document.getElementById("cashflowIncomeQuickCategoryAddBtn");
const cashflowIncomeAmount = document.getElementById("cashflowIncomeAmount");
const cashflowIncomeFrequency = document.getElementById("cashflowIncomeFrequency");
const cashflowIncomeWeekday = document.getElementById("cashflowIncomeWeekday");
const cashflowIncomeNote = document.getElementById("cashflowIncomeNote");
const cashflowExpenseForm = document.getElementById("cashflowExpenseForm");
const cashflowExpenseName = document.getElementById("cashflowExpenseName");
const cashflowExpenseIconSearch = document.getElementById("cashflowExpenseIconSearch");
const cashflowExpenseIconInput = document.getElementById("cashflowExpenseIcon");
const cashflowExpenseIconPreview = document.getElementById("cashflowExpenseIconPreview");
const cashflowExpenseIconResults = document.getElementById("cashflowExpenseIconResults");
const cashflowExpenseCategory = document.getElementById("cashflowExpenseCategory");
const toggleCashflowExpenseCategoryBtn = document.getElementById("toggleCashflowExpenseCategoryBtn");
const cashflowExpenseQuickCategoryAdd = document.getElementById("cashflowExpenseQuickCategoryAdd");
const cashflowExpenseQuickCategoryInput = document.getElementById("cashflowExpenseQuickCategoryInput");
const cashflowExpenseQuickCategoryAddBtn = document.getElementById("cashflowExpenseQuickCategoryAddBtn");
const cashflowExpenseAmount = document.getElementById("cashflowExpenseAmount");
const cashflowExpensePaymentStartDay = document.getElementById("cashflowExpensePaymentStartDay");
const cashflowExpensePaymentEndDay = document.getElementById("cashflowExpensePaymentEndDay");
const cashflowExpenseFrequency = document.getElementById("cashflowExpenseFrequency");
const cashflowExpenseWeekday = document.getElementById("cashflowExpenseWeekday");
const cashflowExpenseNote = document.getElementById("cashflowExpenseNote");
const cashflowExpenseFormStatus = document.getElementById("cashflowExpenseFormStatus");
const cashflowDebtForm = document.getElementById("cashflowDebtForm");
const cashflowDebtName = document.getElementById("cashflowDebtName");
const cashflowDebtIconSearch = document.getElementById("cashflowDebtIconSearch");
const cashflowDebtIconInput = document.getElementById("cashflowDebtIcon");
const cashflowDebtIconPreview = document.getElementById("cashflowDebtIconPreview");
const cashflowDebtIconResults = document.getElementById("cashflowDebtIconResults");
const cashflowDebtBalance = document.getElementById("cashflowDebtBalance");
const cashflowDebtMonthly = document.getElementById("cashflowDebtMonthly");
const cashflowDebtStartDate = document.getElementById("cashflowDebtStartDate");
const cashflowDebtFrequency = document.getElementById("cashflowDebtFrequency");
const cashflowDebtWeekday = document.getElementById("cashflowDebtWeekday");
const cashflowDebtNote = document.getElementById("cashflowDebtNote");
const cashflowDebtFormStatus = document.getElementById("cashflowDebtFormStatus");
const openBudgetModalBtn = document.getElementById("openBudgetModalBtn");
const budgetModal = document.getElementById("budgetModal");
const budgetForm = document.getElementById("budgetForm");
const budgetFormTitle = document.getElementById("budgetFormTitle");
const budgetNameInput = document.getElementById("budgetName");
const budgetTypeInput = document.getElementById("budgetType");
const budgetBehaviorInput = document.getElementById("budgetBehavior");
const budgetIconInput = document.getElementById("budgetIcon");
const budgetCategoriesInput = document.getElementById("budgetCategories");
const budgetAmountInput = document.getElementById("budgetAmount");
const budgetPeriodInput = document.getElementById("budgetPeriod");
const budgetRecurringInput = document.getElementById("budgetRecurring");
const budgetLinkedTypeInput = document.getElementById("budgetLinkedType");
const budgetLinkedItemField = document.getElementById("budgetLinkedItemField");
const budgetLinkedItemInput = document.getElementById("budgetLinkedItem");
const budgetPriorityInput = document.getElementById("budgetPriority");
const budgetWarningInput = document.getElementById("budgetWarning");
const budgetNoteInput = document.getElementById("budgetNote");
const budgetCancelBtn = document.getElementById("budgetCancelBtn");
const budgetIncomeTotal = document.getElementById("budgetIncomeTotal");
const budgetPlannedTotal = document.getElementById("budgetPlannedTotal");
const budgetSpentTotal = document.getElementById("budgetSpentTotal");
const budgetFreeTotal = document.getElementById("budgetFreeTotal");
const budgetPeriodFilter = document.getElementById("budgetPeriodFilter");
const budgetTypeFilter = document.getElementById("budgetTypeFilter");
const budgetBehaviorFilter = document.getElementById("budgetBehaviorFilter");
const budgetStatusFilter = document.getElementById("budgetStatusFilter");
const budgetLinkedFilter = document.getElementById("budgetLinkedFilter");
const budgetResetFiltersBtn = document.getElementById("budgetResetFiltersBtn");
const budgetList = document.getElementById("budgetList");
const budgetDetails = document.getElementById("budgetDetails");
const budgetCountLabel = document.getElementById("budgetCountLabel");
const assetSaveStatus = document.getElementById("assetSaveStatus");
const openAssetModalBtn = document.getElementById("openAssetModalBtn");
const assetModal = document.getElementById("assetModal");
const assetForm = document.getElementById("assetForm");
const assetFormTitle = document.getElementById("assetFormTitle");
const assetTrackingModeInput = document.getElementById("assetTrackingMode");
const manualAssetFields = document.getElementById("manualAssetFields");
const liveAssetFields = document.getElementById("liveAssetFields");
const assetNameInput = document.getElementById("assetName");
const assetTypeInput = document.getElementById("assetType");
const assetValueInput = document.getElementById("assetValue");
const assetAutoTrackTransactionsInput = document.getElementById("assetAutoTrackTransactions");
const assetLiveTypeInput = document.getElementById("assetLiveType");
const assetCoinSearchInput = document.getElementById("assetCoinSearch");
const assetCoinResults = document.getElementById("assetCoinResults");
const assetSelectedCoinInput = document.getElementById("assetSelectedCoin");
const assetSymbolInput = document.getElementById("assetSymbol");
const assetProviderIdInput = document.getElementById("assetProviderId");
const assetQuantityInput = document.getElementById("assetQuantity");
const stockManualPriceField = document.getElementById("stockManualPriceField");
const assetManualPriceInput = document.getElementById("assetManualPrice");
const assetPurchaseValueInput = document.getElementById("assetPurchaseValue");
const assetCurrencyInput = document.getElementById("assetCurrency");
const assetLiquidityInput = document.getElementById("assetLiquidity");
const assetLinkedTypeInput = document.getElementById("assetLinkedType");
const assetPriorityInput = document.getElementById("assetPriority");
const assetNoteInput = document.getElementById("assetNote");
const assetCancelBtn = document.getElementById("assetCancelBtn");
const assetFormStatus = document.getElementById("assetFormStatus");
const assetTotalValue = document.getElementById("assetTotalValue");
const assetLiquidAssetsTotal = document.getElementById("assetLiquidAssetsTotal");
const assetInvestmentTotal = document.getElementById("assetInvestmentTotal");
const assetMaterialTotal = document.getElementById("assetMaterialTotal");
const assetModeTabs = Array.from(document.querySelectorAll("[data-asset-mode]"));
const assetTypeFilter = document.getElementById("assetTypeFilter");
const assetLiquidityFilter = document.getElementById("assetLiquidityFilter");
const assetLinkedFilter = document.getElementById("assetLinkedFilter");
const assetStatusFilter = document.getElementById("assetStatusFilter");
const assetSort = document.getElementById("assetSort");
const assetResetFiltersBtn = document.getElementById("assetResetFiltersBtn");
const assetList = document.getElementById("assetList");
const assetDetails = document.getElementById("assetDetails");
const assetCountLabel = document.getElementById("assetCountLabel");
const financialComparisonRoot = document.getElementById("financialComparisonPage");
const financeOverviewRoot = document.getElementById("financeOverviewRoot");

function financeT(key, fallback, params) {
  const fullKey = "finance." + key;
  const translated = window.MentorI18n?.t?.(fullKey, params, fallback);
  return translated && translated !== fullKey ? translated : fallback;
}

function financeLocale() {
  return window.MentorI18n?.locale || "sr-Latn-RS";
}

function financeOverviewT(key, fallback, params) {
  return financeT("static.overview." + key, fallback, params);
}

const TRANSACTION_CATEGORIES = {
  income: ["Plata", "Freelance", "Prodaja", "Investicije", "Poklon", "Ostalo"],
  expense: ["Stanovanje", "Hrana", "Transport", "Zdravlje", "Oprema", "Putovanje", "Restoran", "Edukacija", "Pretplate", "Stednja", "Ostalo"],
  transfer: ["Izmedju racuna", "Ka stednji", "Ka cilju", "Ostalo"]
};
const TRANSACTION_TYPE_LABELS = {
  income: "Prihod",
  expense: "Rashod",
  transfer: "Transfer"
};
const FINANCE_TAB_LABELS = {
  dashboard: "Pregled",
  transactions: "Transakcije",
  income: "Tokovi Novca",
  budget: "Bud\u017eet",
  assets: "Imovina",
  ideas: "Finansijsko pore\u0111enje"
};
const FINANCE_OVERVIEW_MONTHS = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Avg", "Sep", "Okt", "Nov", "Dec"];

function getFinanceTabLabel(tabName) {
  return financeT("tabs." + tabName, FINANCE_TAB_LABELS[tabName] || tabName);
}

function setTextContent(element, text) {
  if (element) element.textContent = text;
}

function setFieldLabel(control, text) {
  setTextContent(control?.closest(".finance-field")?.querySelector("span"), text);
}

function setOptionText(select, value, text) {
  const option = select ? Array.from(select.options).find((item) => item.value === value) : null;
  if (option && !option.hasAttribute("value")) option.value = option.textContent;
  setTextContent(option, text);
}

function setOptionTextAt(select, index, text) {
  const option = select?.options?.[index] || null;
  if (option && !option.hasAttribute("value")) option.value = option.textContent;
  setTextContent(option, text);
}

function setOptionTextsFromIndex(select, labels, startIndex = 0) {
  labels.forEach((label, index) => setOptionTextAt(select, startIndex + index, label));
}

function setButtonText(button, text) {
  setTextContent(button?.querySelector("span"), text);
}

function renderFinanceLanguage() {
  financeTabsWrap?.setAttribute("aria-label", financeT("aria.tabs", "Finansijski mini tabovi"));
  financePanels.forEach((panel) => {
    const panelName = panel.dataset.financePanel;
    panel.setAttribute("aria-label", financeT("aria." + panelName, getFinanceTabLabel(panelName)));
  });
  financeTabs.forEach((tab) => {
    const label = Array.from(tab.children).find((child) => child.tagName === "SPAN" && child.getAttribute("aria-hidden") !== "true");
    setTextContent(label, getFinanceTabLabel(tab.dataset.financeTab));
  });
  setTextContent(financeTabsOverflowToggle?.querySelector("span:first-child"), financeT("tabs.more", "Jo\u0161"));

  setTextContent(document.querySelector("#financeTransactionsPanel .finance-tab-heading small"), financeT("common.journal", "FINANSIJSKI DNEVNIK"));
  setTextContent(document.querySelector("#financeTransactionsPanel .finance-tab-heading h2"), financeT("transactions.title", "Transakcije"));
  setTextContent(document.querySelector("#financeTransactionsPanel .finance-tab-heading p"), financeT("transactions.subtitle", "Prati svoj novac, razumej tokove i donosi bolje odluke - jednostavno."));
  const importTransactionsLabel = financeT("actions.importTransactions", "Uvezi transakcije");
  setTextContent(transactionUploadBtn?.querySelector("span"), importTransactionsLabel);
  transactionUploadBtn?.setAttribute("aria-label", importTransactionsLabel);
  transactionUploadInput?.setAttribute("aria-label", importTransactionsLabel);
  transactionUploadInput?.setAttribute("title", importTransactionsLabel);
  setTextContent(openTransactionModalBtn?.querySelector("span"), financeT("actions.newTransaction", "+ Nova transakcija"));

  setTextContent(transactionModal?.querySelector(".transaction-card-heading small"), financeT("common.quickEntry", "BRZI UNOS"));
  const editingTransaction = Boolean(transactionEditId?.value);
  setTextContent(transactionFormTitle, editingTransaction ? financeT("transactions.editTitle", "Izmena transakcije") : financeT("transactions.newTitle", "Nova transakcija"));
  transactionModal?.querySelector("[data-close-transaction-modal]")?.setAttribute("aria-label", financeT("actions.close", "Zatvori"));
  setFieldLabel(transactionTypeInput, financeT("fields.transactionType", "Tip transakcije"));
  setOptionText(transactionTypeInput, "income", financeT("types.income", "Prihod"));
  setOptionText(transactionTypeInput, "expense", financeT("types.expense", "Rashod"));
  setOptionText(transactionTypeInput, "transfer", financeT("types.transfer", "Transfer"));
  setFieldLabel(transactionAmountInput, financeT("fields.amount", "Iznos"));
  setFieldLabel(transactionCategoryInput, financeT("fields.category", "Kategorija"));
  setTextContent(toggleQuickCategoryBtn?.querySelector("span"), financeT("actions.newShort", "+ Nova"));
  if (quickCategoryInput) quickCategoryInput.placeholder = financeT("placeholders.newCategory", "Nova kategorija");
  setTextContent(quickCategoryAddBtn?.querySelector("span"), financeT("actions.add", "Dodaj"));
  setFieldLabel(transactionDateInput, financeT("fields.date", "Datum"));
  setFieldLabel(transactionNoteInput, financeT("fields.note", "Bele\u0161ka"));
  if (transactionNoteInput) transactionNoteInput.placeholder = financeT("placeholders.optionalNote", "Dodaj bele\u0161ku (opciono)");
  setFieldLabel(transactionLinkedToInput, financeT("fields.linkIdeaGoal", "Pove\u017ei sa idejom ili ciljem"));
  setOptionText(transactionLinkedToInput, "", financeT("options.notLinked", "Nije povezano"));
  setFieldLabel(transactionBudgetInput, financeT("fields.budget", "Bud\u017eet"));
  setOptionText(transactionBudgetInput, "", financeT("options.notLinked", "Nije povezano"));
  setTextContent(transactionCancelEditBtn?.querySelector("span"), financeT("actions.cancelEdit", "Otka\u017ei izmenu"));
  setTextContent(transactionForm?.querySelector('button[type="submit"] span'), financeT("actions.saveTransaction", "Sa\u010duvaj transakciju"));

  setTextContent(transactionImportModal?.querySelector(".transaction-card-heading small"), financeT("common.import", "IMPORT"));
  setTextContent(transactionImportTitle, pendingTransactionImport ? financeT("import.title", "Mapiranje transakcija") : financeT("actions.importTransactions", "Uvezi transakcije"));
  transactionImportModal?.querySelector("[data-close-transaction-import]")?.setAttribute("aria-label", financeT("actions.close", "Zatvori"));
  setTextContent(transactionImportUploadTitle, financeT("import.uploadTitle", "Izaberi fajl za import"));
  setTextContent(transactionImportUploadHint, financeT("import.uploadHint", "Podrzani su CSV, TSV, Excel i PDF exporti. Nakon izbora fajla otvara se mapiranje kolona."));
  setButtonText(transactionImportChooseFileBtn, financeT("import.chooseFile", "Izaberi fajl"));
  setFieldLabel(transactionImportTemplateInput, financeT("import.template", "Template"));
  setFieldLabel(transactionImportTemplateNameInput, financeT("import.templateName", "Naziv novog template-a"));
  if (transactionImportTemplateNameInput) transactionImportTemplateNameInput.placeholder = financeT("placeholders.bankTemplate", "npr. HSBC");
  setButtonText(saveTransactionImportTemplateBtn, financeT("actions.saveTemplate", "Sa\u010duvaj template"));
  setButtonText(transactionImportModal?.querySelector("[data-close-transaction-import].ghost-btn"), financeT("actions.cancel", "Otka\u017ei"));
  setButtonText(confirmTransactionImportBtn, financeT("actions.importMapped", "Uvezi mapirane transakcije"));

  setTextContent(categoryManagerModal?.querySelector("#categoryManagerTitle"), financeT("categories.editTitle", "Uredi kategorije"));
  categoryManagerModal?.querySelector("[data-close-category-manager]")?.setAttribute("aria-label", financeT("actions.close", "Zatvori"));
  setFieldLabel(categoryManagerType, financeT("fields.type", "Tip"));
  setOptionText(categoryManagerType, "income", financeT("types.incomePlural", "Prihodi"));
  setOptionText(categoryManagerType, "expense", financeT("types.expensePlural", "Rashodi"));
  setOptionText(categoryManagerType, "transfer", financeT("types.transferPlural", "Transferi"));
  setFieldLabel(categoryManagerInput, financeT("categories.newCategory", "Nova kategorija"));
  if (categoryManagerInput) categoryManagerInput.placeholder = financeT("placeholders.donations", "npr. Donacije");
  setButtonText(categoryManagerAddBtn, financeT("actions.addCategory", "Dodaj kategoriju"));
  setTextContent(categoryManagerModal?.querySelector(".category-keyword-panel .transaction-card-heading small"), financeT("categories.keywords", "KEYWORDI"));
  setTextContent(categoryKeywordTitle, selectedKeywordCategory?.category || financeT("categories.choose", "Izaberi kategoriju"));
  setTextContent(categoryKeywordHint, financeT("categories.keywordHint", "Keywordi se tra\u017ee u bele\u0161ci, opisu i tipu prilikom importa."));
  if (categoryKeywordInput) categoryKeywordInput.placeholder = financeT("placeholders.keywords", "npr. Bolt Food, Wolt, Lidl");
  setButtonText(categoryKeywordAddBtn, financeT("actions.addKeyword", "Dodaj keyword"));

  document.querySelector(".transaction-summary-grid")?.setAttribute("aria-label", financeT("aria.transactionSummary", "Sa\u017eetak transakcija"));
  const summaryCards = document.querySelectorAll(".transaction-summary-card");
  setTextContent(summaryCards[0]?.querySelector("small"), financeT("types.incomePlural", "Prihodi"));
  setTextContent(summaryCards[0]?.querySelector("span"), financeT("summary.totalThisMonth", "Ukupno ovog meseca"));
  setTextContent(summaryCards[1]?.querySelector("small"), financeT("types.expensePlural", "Rashodi"));
  setTextContent(summaryCards[1]?.querySelector("span"), financeT("summary.totalThisMonth", "Ukupno ovog meseca"));
  setTextContent(summaryCards[2]?.querySelector("small"), financeT("summary.monthBalance", "Stanje meseca"));
  setTextContent(summaryCards[2]?.querySelector("span"), financeT("summary.availableThisMonth", "Raspolo\u017eivo ovog meseca"));

  setFieldLabel(transactionSearchInput, financeT("fields.search", "Pretraga"));
  if (transactionSearchInput) transactionSearchInput.placeholder = financeT("placeholders.searchTransaction", "Keyword, datum ili iznos");
  setButtonText(openCategoryManagerBtn, financeT("categories.editTitle", "Uredi kategorije"));
  setFieldLabel(transactionDateFilter, financeT("fields.date", "Datum"));
  setOptionText(transactionDateFilter, "current-month", financeT("filters.currentMonth", "Ovaj mesec"));
  setOptionText(transactionDateFilter, "last-month", financeT("filters.lastMonth", "Pro\u0161li mesec"));
  setOptionText(transactionDateFilter, "current-week", financeT("filters.currentWeek", "Ova nedelja"));
  setOptionText(transactionDateFilter, "today", financeT("filters.today", "Danas"));
  setOptionText(transactionDateFilter, "all", financeT("options.all", "Sve"));
  setFieldLabel(transactionTypeFilter, financeT("fields.type", "Tip"));
  setOptionText(transactionTypeFilter, "all", financeT("filters.allTypes", "Svi tipovi"));
  setOptionText(transactionTypeFilter, "income", financeT("types.incomePlural", "Prihodi"));
  setOptionText(transactionTypeFilter, "expense", financeT("types.expensePlural", "Rashodi"));
  setOptionText(transactionTypeFilter, "transfer", financeT("types.transferPlural", "Transferi"));
  setFieldLabel(transactionCategoryFilter, financeT("fields.category", "Kategorija"));
  setOptionText(transactionCategoryFilter, "all", financeT("filters.allCategories", "Sve kategorije"));
  setFieldLabel(transactionLinkedFilter, financeT("fields.linkedTo", "Povezano sa"));
  setOptionText(transactionLinkedFilter, "all", financeT("filters.allOptions", "Sve opcije"));
  setOptionText(transactionLinkedFilter, "", financeT("options.notLinked", "Nije povezano"));
  setFieldLabel(transactionSort, financeT("fields.sortBy", "Sortiraj po"));
  setOptionText(transactionSort, "date-desc", financeT("sort.dateDesc", "Datum najnovije"));
  setOptionText(transactionSort, "date-asc", financeT("sort.dateAsc", "Datum najstarije"));
  setOptionText(transactionSort, "amount-desc", financeT("sort.amountDesc", "Iznos najve\u0107i"));
  setOptionText(transactionSort, "amount-asc", financeT("sort.amountAsc", "Iznos najmanji"));
  setButtonText(transactionResetFiltersBtn, financeT("actions.resetFilters", "Resetuj filtere"));
  setTextContent(document.querySelector(".transaction-list-card .transaction-card-heading small"), financeT("common.list", "LISTA"));
  setTextContent(document.querySelector(".transaction-list-card .transaction-card-heading h3"), financeT("transactions.listTitle", "Lista transakcija"));
  refreshTransactionCategoriesBtn?.setAttribute("title", financeT("actions.refreshCategories", "Osve\u017ei kategorije"));
  refreshTransactionCategoriesBtn?.setAttribute("aria-label", financeT("actions.refreshCategories", "Osve\u017ei kategorije"));

  setTextContent(overviewPeriodEyebrow, financeT("static.overview.thisMonth", "OVAJ MESEC"));
  setTextContent(overviewPeriodTitle, financeT("static.overview.monthOverview", "Pregled meseca"));
  setFieldLabel(overviewPeriodSelect, financeT("static.overview.period", "Period"));
  setOptionText(overviewPeriodSelect, "day", financeT("static.periods.day", "Dan"));
  setOptionText(overviewPeriodSelect, "month", financeT("static.periods.month", "Mesec"));
  setOptionText(overviewPeriodSelect, "year", financeT("static.periods.year", "Godina"));
  setOptionText(overviewPeriodSelect, "custom", financeT("static.periods.customDate", "Custom date"));
  setFieldLabel(overviewChartTypeSelect, financeT("static.overview.view", "Prikaz"));
  setOptionText(overviewChartTypeSelect, "list", financeT("static.overview.list", "Lista"));
  setOptionText(overviewChartTypeSelect, "pie", financeT("static.overview.pieChart", "Pie chart"));
  setFieldLabel(overviewStartDate, financeT("static.overview.from", "Od"));
  setFieldLabel(overviewEndDate, financeT("static.overview.to", "Do"));

  setTextContent(document.querySelector("#financeIncomePanel .cashflow-hero-copy small"), financeT("static.cashflow.eyebrow", "TOKOVI NOVCA"));
  setTextContent(document.querySelector("#financeIncomePanel .cashflow-hero-copy h2"), financeT("static.cashflow.title", "Tokovi novca"));
  setTextContent(document.querySelector("#financeIncomePanel .cashflow-hero-copy p"), financeT("static.cashflow.subtitle", "Unesi svoje mesecne prihode, troskove i dugove. Aplikacija samo izracuna koliko ti ostaje."));
  setTextContent(document.querySelector("#financeIncomePanel .cashflow-hero-metric span"), financeT("static.cashflow.remainingMonthly", "Ostaje mesecno"));
  setTextContent(cashflowHealthLabel, financeT("static.cashflow.healthLabel", "Prihodi - troskovi - rate dugova"));
  document.querySelector("#financeIncomePanel .cashflow-summary-grid")?.setAttribute("aria-label", financeT("static.cashflow.monthlyCalculation", "Mesecni obracun"));
  const cashflowSummary = document.querySelectorAll("#financeIncomePanel .cashflow-summary-item span");
  setTextContent(cashflowSummary[0], financeT("static.cashflow.income", "Prihodi"));
  setTextContent(cashflowSummary[1], financeT("static.cashflow.expenses", "Troskovi"));
  setTextContent(cashflowSummary[2], financeT("static.cashflow.debtPayments", "Rate dugova"));
  setTextContent(cashflowSummary[3], financeT("static.cashflow.budgetedThisMonth", "Budzetirano ovog meseca"));
  setTextContent(document.querySelector(".cashflow-projection-panel .transaction-card-heading small"), financeT("static.cashflow.projection", "PROJEKCIJA"));
  setTextContent(document.querySelector(".cashflow-projection-panel .transaction-card-heading h3"), financeT("static.cashflow.periodPlan", "Plan za period"));
  setFieldLabel(cashflowProjectionStart, financeT("static.overview.from", "Od"));
  setFieldLabel(cashflowProjectionEnd, financeT("static.overview.to", "Do"));
  const periodOptions = document.querySelectorAll(".cashflow-period-option");
  document.querySelector(".cashflow-period-options")?.setAttribute("aria-label", financeT("static.cashflow.periodNetOptions", "Dodaci za period neto"));
  setTextContent(periodOptions[0]?.querySelector("span"), financeT("static.cashflow.includeCapital", "Trenutni kapital"));
  setTextContent(periodOptions[1]?.querySelector("span"), financeT("static.cashflow.includeInvestments", "Investicije"));
  setTextContent(periodOptions[2]?.querySelector("span"), financeT("static.cashflow.includeExtraExpenses", "Dodatni rashodi"));
  setTextContent(cashflowAnnualIncome?.closest("article")?.querySelector("span"), financeT("static.cashflow.annualIncome", "Godisnji prihod"));
  setTextContent(cashflowAnnualOutflow?.closest("article")?.querySelector("span"), financeT("static.cashflow.annualExpenses", "Godisnji troskovi"));
  setTextContent(cashflowAnnualNet?.closest("article")?.querySelector("span"), financeT("static.cashflow.annualNet", "Godisnji neto"));
  setTextContent(cashflowProjectionNet?.closest("article")?.querySelector("span"), financeT("static.cashflow.periodNet", "Period neto"));
  setTextContent(document.querySelector(".cashflow-list-panel .cashflow-card-head small"), financeT("static.cashflow.flowsEyebrow", "TOKOVI"));
  document.querySelector(".cashflow-list-toolbar")?.setAttribute("aria-label", financeT("static.cashflow.flowType", "Tip toka novca"));
  setTextContent(document.querySelector('[data-cashflow-list-tab="income"]'), financeT("static.cashflow.income", "Prihodi"));
  setTextContent(document.querySelector('[data-cashflow-list-tab="expense"]'), financeT("static.cashflow.expenses", "Troskovi"));
  setTextContent(document.querySelector('[data-cashflow-list-tab="debt"]'), financeT("static.cashflow.debtsAndPayments", "Dugovi i rate"));
  document.querySelector(".cashflow-month-strip-panel")?.setAttribute("aria-label", financeT("static.cashflow.monthStrip", "Pregled prihoda i troskova po mesecima"));
  cashflowMonthsPrevBtn?.setAttribute("aria-label", financeT("static.cashflow.previousMonth", "Prethodni mesec"));
  cashflowMonthsNextBtn?.setAttribute("aria-label", financeT("static.cashflow.nextMonth", "Sledeci mesec"));

  const configureCashflowModal = (modal, title, titleKey, eyebrowKey, nameInput, nameKey, amountInput, frequencyInput, weekdayInput, noteInput, submitKey) => {
    setTextContent(modal?.querySelector(".transaction-card-heading small"), financeT(eyebrowKey, ""));
    setTextContent(modal?.querySelector(".transaction-card-heading h3"), financeT(titleKey, title));
    modal?.querySelector(".transaction-modal-close")?.setAttribute("aria-label", financeT("actions.close", "Zatvori"));
    setFieldLabel(nameInput, financeT(nameKey, ""));
    setFieldLabel(amountInput, financeT("static.cashflow.amount", "Iznos"));
    setFieldLabel(frequencyInput, financeT("static.cashflow.frequency", "Ucestalost"));
    setOptionText(frequencyInput, "monthly", financeT("static.periods.monthly", "Mesecno"));
    setOptionText(frequencyInput, "weekly", financeT("static.periods.weekly", "Nedeljno"));
    setOptionText(frequencyInput, "yearly", financeT("static.periods.yearly", "Godisnje"));
    setFieldLabel(weekdayInput, financeT("static.cashflow.weekday", "Dan u nedelji"));
    setFieldLabel(noteInput, financeT("static.cashflow.note", "Beleska"));
    setTextContent(modal?.querySelector('[data-close-cashflow-modal] span'), financeT("actions.cancel", "Otkazi"));
    setTextContent(modal?.querySelector('button[type="submit"] span'), financeT(submitKey, financeT("static.cashflow.addContinue", "Dodaj i nastavi")));
  };
  configureCashflowModal(cashflowIncomeModal, "Novi prihod", "static.cashflow.newIncome", "static.cashflow.incomeUpper", cashflowIncomeName, "static.cashflow.incomeName", cashflowIncomeAmount, cashflowIncomeFrequency, cashflowIncomeWeekday, cashflowIncomeNote, "static.cashflow.addContinue");
  configureCashflowModal(cashflowExpenseModal, "Novi trosak", "static.cashflow.newExpense", "static.cashflow.expenseUpper", cashflowExpenseName, "static.cashflow.expenseName", cashflowExpenseAmount, cashflowExpenseFrequency, cashflowExpenseWeekday, cashflowExpenseNote, "static.cashflow.addContinue");
  setFieldLabel(cashflowExpensePaymentStartDay, financeT("static.cashflow.paymentPeriodStart", "Period placanja - od dana"));
  setFieldLabel(cashflowExpensePaymentEndDay, financeT("static.cashflow.paymentPeriodEnd", "Period placanja - do dana"));
  configureCashflowModal(cashflowDebtModal, "Novi dug ili rata", "static.cashflow.newDebtPayment", "static.cashflow.debtUpper", cashflowDebtName, "static.cashflow.debtName", cashflowDebtMonthly, cashflowDebtFrequency, cashflowDebtWeekday, cashflowDebtNote, "static.cashflow.saveDebt");
  setFieldLabel(cashflowIncomeIconSearch, financeT("static.cashflow.symbol", "Simbol"));
  setFieldLabel(cashflowExpenseIconSearch, financeT("static.cashflow.symbol", "Simbol"));
  setFieldLabel(cashflowDebtIconSearch, financeT("static.cashflow.symbol", "Simbol"));
  cashflowIncomeIconSearch?.setAttribute("placeholder", financeT("static.cashflow.symbolSearch", "Pretrazi simbol"));
  cashflowExpenseIconSearch?.setAttribute("placeholder", financeT("static.cashflow.symbolSearch", "Pretrazi simbol"));
  cashflowDebtIconSearch?.setAttribute("placeholder", financeT("static.cashflow.symbolSearch", "Pretrazi simbol"));
  setFieldLabel(cashflowDebtBalance, financeT("static.cashflow.totalDebt", "Ukupan dug"));
  setFieldLabel(cashflowDebtMonthly, financeT("static.cashflow.paymentAmount", "Iznos rate"));
  setFieldLabel(cashflowDebtStartDate, financeT("static.cashflow.firstPaymentDate", "Datum prve rate"));
  setOptionText(cashflowDebtFrequency, "one-time", financeT("static.periods.oneTime", "Jednokratno"));

  setTextContent(document.querySelector("#financeBudgetPanel .finance-tab-heading h2"), financeT("static.budget.title", "Budzet"));
  setTextContent(document.querySelector("#financeBudgetPanel .finance-tab-heading p"), financeT("static.budget.subtitle", "Planiraj gde tvoj novac ide pre nego sto ga potrosis."));
  setTextContent(openBudgetModalBtn?.querySelector("span"), financeT("static.budget.newBudget", "+ Novi budzet"));
  setTextContent(budgetModal?.querySelector(".transaction-card-heading small"), financeT("static.budget.planUpper", "PLAN"));
  setTextContent(budgetFormTitle, financeT("static.budget.formTitle", "Novi budzet"));
  budgetModal?.querySelector(".transaction-modal-close")?.setAttribute("aria-label", financeT("actions.close", "Zatvori"));
  setFieldLabel(budgetNameInput, financeT("static.budget.name", "Naziv budzeta"));
  setFieldLabel(budgetTypeInput, financeT("static.budget.type", "Tip budzeta"));
  const budgetTypeLabels = [
    financeT("budgetTypes.category", "Kategorija"),
    financeT("budgetTypes.categoryGroup", "Grupa kategorija"),
    financeT("budgetTypes.goal", "Cilj"),
    financeT("budgetTypes.idea", "Ideja"),
    financeT("budgetTypes.obligation", "Obaveza")
  ];
  setOptionTextsFromIndex(budgetTypeInput, budgetTypeLabels);
  setFieldLabel(budgetBehaviorInput, financeT("static.budget.behavior", "Nacin budzeta"));
  const budgetBehaviorLabels = [
    financeT("budgetBehavior.spendingLimit", "Limit potrosnje"),
    financeT("budgetBehavior.moneySetAside", "Odvajanje novca"),
    financeT("budgetBehavior.requiredPayment", "Obavezno placanje")
  ];
  setOptionTextsFromIndex(budgetBehaviorInput, budgetBehaviorLabels);
  setFieldLabel(budgetIconInput, financeT("static.budget.symbol", "Simbol"));
  setOptionTextsFromIndex(budgetIconInput, [
    financeT("budgetIcons.food", "Hrana"),
    financeT("budgetIcons.coffee", "Kafa"),
    financeT("budgetIcons.home", "Stanovanje"),
    financeT("budgetIcons.transport", "Transport"),
    financeT("budgetIcons.health", "Zdravlje"),
    financeT("budgetIcons.travel", "Putovanje"),
    financeT("budgetIcons.goal", "Cilj"),
    financeT("budgetIcons.idea", "Ideja"),
    financeT("budgetIcons.obligation", "Obaveza"),
    financeT("budgetIcons.money", "Novac")
  ]);
  setFieldLabel(budgetCategoriesInput, financeT("static.budget.category", "Kategorija"));
  setFieldLabel(budgetAmountInput, financeT("static.budget.amount", "Iznos"));
  setFieldLabel(budgetPeriodInput, financeT("static.budget.period", "Period"));
  setOptionTextAt(budgetPeriodInput, 0, financeT("static.periods.daily", "Dnevno"));
  setOptionTextAt(budgetPeriodInput, 1, financeT("static.periods.weekly", "Nedeljno"));
  setOptionTextAt(budgetPeriodInput, 2, financeT("static.periods.monthly", "Mesecno"));
  setOptionTextAt(budgetPeriodInput, 3, financeT("static.periods.yearly", "Godisnje"));
  setOptionTextAt(budgetPeriodInput, 4, financeT("static.periods.oneTime", "Jednokratno"));
  setFieldLabel(budgetRecurringInput, financeT("static.budget.recurring", "Ponavlja se"));
  setFieldLabel(budgetLinkedTypeInput, financeT("static.budget.linkTo", "Povezi sa"));
  const linkedTypeLabels = [
    financeT("options.notLinked", "Nije povezano"),
    financeT("linkedTypes.goal", "Cilj"),
    financeT("linkedTypes.idea", "Ideja"),
    financeT("linkedTypes.ideaTest", "Test ideje"),
    financeT("linkedTypes.financialComparison", "Finansijsko poredjenje")
  ];
  setOptionTextsFromIndex(budgetLinkedTypeInput, linkedTypeLabels);
  setFieldLabel(budgetLinkedItemInput, financeT("static.budget.availableItems", "Dostupne stavke"));
  setFieldLabel(budgetPriorityInput, financeT("static.budget.priority", "Prioritet"));
  setOptionTextsFromIndex(budgetPriorityInput, [
    financeT("priorities.low", "Nizak"),
    financeT("priorities.medium", "Srednji"),
    financeT("priorities.high", "Visok"),
    financeT("priorities.required", "Obavezno")
  ]);
  setFieldLabel(budgetWarningInput, financeT("static.budget.warning", "Upozorenje"));
  setOptionTextsFromIndex(budgetWarningInput, [
    financeT("budgetWarnings.none", "Bez upozorenja"),
    financeT("budgetWarnings.at50", "Na 50%"),
    financeT("budgetWarnings.at80", "Na 80%"),
    financeT("budgetWarnings.at100", "Na 100%")
  ]);
  setFieldLabel(budgetNoteInput, financeT("static.budget.note", "Beleska"));
  setTextContent(budgetCancelBtn?.querySelector("span"), financeT("actions.cancel", "Otkazi"));
  setTextContent(budgetForm?.querySelector('button[type="submit"] span'), financeT("static.budget.save", "Sacuvaj budzet"));
  document.querySelector("#financeBudgetPanel .budget-summary-grid")?.setAttribute("aria-label", financeT("static.budget.summary", "Sazetak budzeta"));
  const budgetSummary = document.querySelectorAll("#financeBudgetPanel .budget-summary-grid .transaction-summary-card");
  setTextContent(budgetSummary[0]?.querySelector("small"), financeT("static.budget.totalIncome", "Ukupan mesecni prihod"));
  setTextContent(budgetSummary[0]?.querySelector("span"), financeT("static.budget.totalIncomeHint", "Iz Tokova Novca i prihoda"));
  setTextContent(budgetSummary[1]?.querySelector("small"), financeT("static.budget.plannedTotal", "Ukupno budzetirano"));
  setTextContent(budgetSummary[1]?.querySelector("span"), financeT("static.budget.plannedHint", "Aktivni budzeti ovog meseca"));
  setTextContent(budgetSummary[2]?.querySelector("small"), financeT("static.budget.spentTotal", "Potroseno iz budzeta"));
  setTextContent(budgetSummary[2]?.querySelector("span"), financeT("static.budget.spentHint", "Transakcije povezane sa budzetima"));
  setTextContent(budgetSummary[3]?.querySelector("small"), financeT("static.budget.freeTotal", "Slobodno nakon budzeta"));
  setTextContent(budgetSummary[3]?.querySelector("span"), financeT("static.budget.freeHint", "Prihod minus plan"));
  setFieldLabel(budgetPeriodFilter, financeT("static.budget.period", "Period"));
  setOptionText(budgetPeriodFilter, "current-month", financeT("static.periods.currentMonth", "Ovaj mesec"));
  setOptionText(budgetPeriodFilter, "last-month", financeT("static.periods.lastMonth", "Prosli mesec"));
  setOptionText(budgetPeriodFilter, "current-year", financeT("static.periods.currentYear", "Ova godina"));
  setOptionText(budgetPeriodFilter, "custom", financeT("static.periods.custom", "Custom"));
  setFieldLabel(budgetTypeFilter, financeT("static.budget.type", "Tip budzeta"));
  setOptionText(budgetTypeFilter, "all", financeT("static.budget.allTypes", "Svi tipovi"));
  setOptionTextsFromIndex(budgetTypeFilter, budgetTypeLabels, 1);
  setFieldLabel(budgetBehaviorFilter, financeT("static.budget.behavior", "Nacin budzeta"));
  setOptionText(budgetBehaviorFilter, "all", financeT("static.budget.allBehaviors", "Svi"));
  setOptionTextsFromIndex(budgetBehaviorFilter, budgetBehaviorLabels, 1);
  setFieldLabel(budgetStatusFilter, financeT("fields.status", "Status"));
  setOptionText(budgetStatusFilter, "all", financeT("static.budget.allStatuses", "Svi"));
  setOptionTextsFromIndex(budgetStatusFilter, [
    financeT("status.good", "Dobro"),
    financeT("status.nearLimit", "Blizu limita"),
    financeT("status.exceeded", "Prekoraceno"),
    financeT("status.fulfilled", "Ispunjeno"),
    financeT("status.paid", "Placeno"),
    financeT("status.active", "Aktivno")
  ], 1);
  setFieldLabel(budgetLinkedFilter, financeT("fields.linkedTo", "Povezano sa"));
  setOptionText(budgetLinkedFilter, "all", financeT("static.budget.allOptions", "Sve opcije"));
  setOptionTextsFromIndex(budgetLinkedFilter, linkedTypeLabels, 1);
  setTextContent(budgetResetFiltersBtn?.querySelector("span"), financeT("actions.resetFilters", "Resetuj filtere"));
  setTextContent(document.querySelector("#financeBudgetPanel .budget-list-panel .transaction-card-heading small"), financeT("static.budget.plansUpper", "PLANOVI"));
  setTextContent(document.querySelector("#financeBudgetPanel .budget-list-panel .transaction-card-heading h3"), financeT("static.budget.listTitle", "Lista budzeta"));

  setTextContent(document.querySelector("#financeAssetsPanel .finance-tab-heading small"), financeT("common.journal", "FINANSIJSKI DNEVNIK"));
  setTextContent(document.querySelector("#financeAssetsPanel .finance-tab-heading h2"), financeT("static.assets.title", "Imovina"));
  setTextContent(document.querySelector("#financeAssetsPanel .finance-tab-heading p"), financeT("static.assets.assetsOnlySubtitle", "Prati sta posedujes i kolika je vrednost tvoje imovine."));
  setTextContent(openAssetModalBtn?.querySelector("span"), financeT("static.assets.newAsset", "+ Nova imovina"));
  setTextContent(assetModal?.querySelector(".transaction-card-heading small"), financeT("static.assets.assetUpper", "IMOVINA"));
  setTextContent(assetFormTitle, financeT("static.assets.newAssetTitle", "Nova imovina"));
  assetModal?.querySelector(".transaction-modal-close")?.setAttribute("aria-label", financeT("actions.close", "Zatvori"));
  setFieldLabel(assetTrackingModeInput, financeT("static.assets.entryType", "Tip unosa"));
  setOptionText(assetTrackingModeInput, "manual", financeT("static.assets.manualEntry", "Rucni unos"));
  setOptionText(assetTrackingModeInput, "live", financeT("static.assets.investments", "Investicije"));
  setFieldLabel(assetNameInput, financeT("static.assets.name", "Naziv"));
  setFieldLabel(assetTypeInput, financeT("static.assets.assetType", "Tip imovine"));
  setFieldLabel(assetValueInput, financeT("static.assets.value", "Vrednost"));
  setFieldLabel(assetAutoTrackTransactionsInput, financeT("static.assets.trackTransactions", "Prati transakcije"));
  setFieldLabel(assetLiveTypeInput, financeT("static.assets.type", "Tip"));
  setFieldLabel(assetCoinSearchInput, financeT("static.assets.searchInstrument", "Search instrument"));
  setFieldLabel(assetSelectedCoinInput, financeT("static.assets.selectedAsset", "Izabrana imovina"));
  setFieldLabel(assetQuantityInput, financeT("static.assets.quantity", "Kolicina"));
  setFieldLabel(assetManualPriceInput, financeT("static.assets.currentPrice", "Trenutna cena"));
  setFieldLabel(assetPurchaseValueInput, financeT("static.assets.purchaseValue", "Ulozeno / purchase value"));
  setFieldLabel(assetCurrencyInput, financeT("static.assets.displayCurrency", "Valuta prikaza"));
  setOptionText(assetCurrencyInput, "EUR", "€");
  setFieldLabel(assetLiquidityInput, financeT("static.assets.liquidity", "Likvidnost"));
  setFieldLabel(assetLinkedTypeInput, financeT("static.assets.linkedTo", "Povezano sa"));
  setFieldLabel(assetPriorityInput, financeT("static.assets.priority", "Prioritet"));
  setFieldLabel(assetNoteInput, financeT("static.assets.note", "Beleska"));
  setTextContent(assetCancelBtn?.querySelector("span"), financeT("actions.cancel", "Otkazi"));
  setTextContent(assetForm?.querySelector('button[type="submit"] span'), financeT("static.assets.saveAsset", "Sacuvaj imovinu"));
  document.querySelector("#financeAssetsPanel .assets-summary-grid")?.setAttribute("aria-label", financeT("static.assets.summary", "Sazetak imovine"));
  const assetSummary = document.querySelectorAll("#financeAssetsPanel .assets-summary-grid .transaction-summary-card");
  setTextContent(assetSummary[0]?.querySelector("small"), financeT("static.assets.totalAssets", "Ukupna imovina"));
  setTextContent(assetSummary[0]?.querySelector("span"), financeT("static.assets.totalAssetsHint", "Likvidna, investicije i materijalna"));
  setTextContent(assetSummary[1]?.querySelector("small"), financeT("static.assets.liquidAssets", "Likvidna sredstva"));
  setTextContent(assetSummary[1]?.querySelector("span"), financeT("static.assets.liquidHint", "Kes, racuni i stednja"));
  setTextContent(assetSummary[2]?.querySelector("small"), financeT("static.assets.investments", "Investicije"));
  setTextContent(assetSummary[3]?.querySelector("small"), financeT("static.assets.materialAssets", "Materijalna imovina"));
  setTextContent(assetSummary[3]?.querySelector("span"), financeT("static.assets.materialHint", "Nekretnine, vozila, oprema i vrednosti"));
  document.querySelector("#financeAssetsPanel .asset-subtabs")?.setAttribute("aria-label", financeT("static.assets.assetType", "Tip imovine"));
  setTextContent(document.querySelector('[data-asset-mode="liquid"] span'), financeT("static.assets.liquidAssets", "Likvidna sredstva"));
  setTextContent(document.querySelector('[data-asset-mode="live"] span'), financeT("static.assets.investments", "Investicije"));
  setTextContent(document.querySelector('[data-asset-mode="material"] span'), financeT("static.assets.materialAssets", "Materijalna imovina"));
  setFieldLabel(assetTypeFilter, financeT("static.assets.assetType", "Tip imovine"));
  setOptionText(assetTypeFilter, "all", financeT("options.all", "Sve"));
  setFieldLabel(assetLiquidityFilter, financeT("static.assets.liquidity", "Likvidnost"));
  setOptionText(assetLiquidityFilter, "all", financeT("options.all", "Sve"));
  setFieldLabel(assetLinkedFilter, financeT("static.assets.linkedTo", "Povezano sa"));
  setOptionText(assetLinkedFilter, "all", financeT("options.all", "Sve"));
  setFieldLabel(assetStatusFilter, financeT("fields.status", "Status"));
  setOptionText(assetStatusFilter, "all", financeT("options.all", "Sve"));
  setOptionText(assetStatusFilter, "Neaktivno", financeT("status.inactive", "Neaktivno"));
  setFieldLabel(assetSort, financeT("fields.sortBy", "Sortiraj po"));
  setTextContent(assetResetFiltersBtn?.querySelector("span"), financeT("actions.resetFilters", "Resetuj filtere"));
  setTextContent(document.querySelector("#financeAssetsPanel .asset-list-panel .transaction-card-heading small"), financeT("common.list", "LISTA"));
  setTextContent(document.querySelector("#financeAssetsPanel .asset-list-panel .transaction-card-heading h3"), financeT("static.assets.listTitle", "Lista imovine"));

  updateTransactionBulkDeleteButton();
}

function getFinanceCategoryLabel(category) {
  const key = normalizeText(category || "").replace(/[^a-z0-9]+/g, "");
  return financeT("categories.names." + key, category || "", { category });
}

function getFinanceTypeLabel(type) {
  return financeT("types." + type, TRANSACTION_TYPE_LABELS[type] || type);
}

function getBudgetTypeLabel(type) {
  const keyMap = {
    kategorija: "category",
    kategorijagrupa: "categoryGroup",
    cilj: "goal",
    ideja: "idea",
    obaveza: "obligation"
  };
  const key = keyMap[normalizeText(type || "").replace(/[^a-z0-9]+/g, "")];
  return key ? financeT("budgetTypes." + key, type) : (type || "");
}

function getBudgetBehaviorLabel(behavior) {
  const normalized = normalizeText(behavior || "");
  if (normalized === normalizeText("Odvajanje novca")) return financeT("budgetBehavior.moneySetAside", behavior);
  if (normalized === normalizeText("Obavezno placanje") || normalized === normalizeText("Obavezna uplata")) return financeT("budgetBehavior.requiredPayment", behavior);
  return financeT("budgetBehavior.spendingLimit", behavior || "");
}

function getBudgetStatusLabel(status) {
  const normalized = normalizeText(status || "");
  if (normalized === normalizeText("Ispunjeno")) return financeT("status.fulfilled", status);
  if (normalized === normalizeText("Prekoraceno")) return financeT("status.exceeded", status);
  if (normalized === normalizeText("Blizu limita")) return financeT("status.nearLimit", status);
  if (normalized === normalizeText("Limit dostignut")) return financeT("status.limitReached", status);
  if (normalized === normalizeText("Placeno")) return financeT("status.paid", status);
  if (normalized === normalizeText("Aktivno")) return financeT("status.active", status);
  return financeT("status.good", status || "");
}

let selectedFinanceOverviewYear = new Date().getFullYear();
const FINANCIAL_AVATAR_BY_LEVEL = Object.freeze({
  1: "icons/finance-avatar-business.png",
  2: "icons/finance-avatar-business.png",
  3: "icons/finance-avatar-business.png",
  4: "icons/finance-avatar-business.png",
  5: "icons/finance-avatar-business.png"
});
const FINANCIAL_STABILITY_CONFIG = Object.freeze({
  cashflowWeight: 45,
  reserveWeight: 35,
  capitalWeight: 10,
  planningWeight: 10,
  targetReserveMonths: 6,
  minimumSavingsRate: -0.25,
  targetSavingsRate: 0.25
});
let scheduledFinanceTabRender = null;
let financeListenersInitialized = false;
const initializedFinanceTabs = new Set();
const LINKED_OPTIONS = ["Van Life po Evropi", "Putovanje Japan", "Profesionalni setup", "Finansijska sloboda", "Side Hustle"];
const BUDGET_LINKED_ITEMS = {
  "Cilj": ["Put oko Evrope", "Emergency fund", "Novi laptop"],
  "Ideja": ["Van Life", "Bicikl oko Evrope", "Online biznis"],
  "Test ideje": ["7 dana treninga", "Vikend bike test", "Van Life mini test"],
  "Finansijsko poredjenje": ["Van Life vs stan", "Laptop za posao", "Putovanje ili kurs"]
};

function getFinanceOverviewYear() {
  return selectedFinanceOverviewYear || new Date().getFullYear();
}

function getFinanceOverviewYears() {
  const years = new Set([new Date().getFullYear(), selectedFinanceOverviewYear]);
  transactions.forEach((transaction) => {
    const date = new Date((transaction.date || "") + "T00:00:00");
    if (!Number.isNaN(date.getTime())) years.add(date.getFullYear());
  });
  return Array.from(years).filter(Boolean).sort((a, b) => b - a);
}

function getTransactionsForMonth(year, monthIndex) {
  return transactions.filter((transaction) => {
    const date = new Date((transaction.date || "") + "T00:00:00");
    return date.getFullYear() === year && date.getMonth() === monthIndex;
  });
}

function getTransactionsForDay(year, monthIndex, day) {
  return transactions.filter((transaction) => {
    const date = new Date((transaction.date || "") + "T00:00:00");
    return date.getFullYear() === year && date.getMonth() === monthIndex && date.getDate() === day;
  });
}

function getExpenseCategoryExtremes(periodTransactions) {
  const categoryTotals = periodTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((totals, transaction) => {
      const category = transaction.category || "Ostalo";
      totals[category] = (totals[category] || 0) + Number(transaction.amount || 0);
      return totals;
    }, {});
  const items = Object.entries(categoryTotals)
    .map(([category, amount]) => ({ category, amount }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  return {
    highest: items[0] || null,
    lowest: items.length ? items[items.length - 1] : null
  };
}

function getHighestExpenseDay(periodTransactions) {
  const dayTotals = periodTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((totals, transaction) => {
      if (!transaction.date) return totals;
      totals[transaction.date] = (totals[transaction.date] || 0) + Number(transaction.amount || 0);
      return totals;
    }, {});
  return Object.entries(dayTotals)
    .map(([date, amount]) => ({ date, amount }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)[0] || null;
}

function formatFinanceOverviewMonthDay(dateValue) {
  const date = parseCashflowDate(dateValue);
  if (!date) return "-";
  return new Intl.DateTimeFormat(financeLocale(), { day: "numeric", month: "short" }).format(date).replace(".", "");
}

function formatFinanceOverviewWeekday(year, monthIndex, dayValue) {
  const day = Number(dayValue);
  if (!Number.isFinite(day)) return "-";
  const date = new Date(year, monthIndex, day);
  return new Intl.DateTimeFormat(financeLocale(), { weekday: "long" }).format(date);
}

function doesCashflowItemOccurOnDate(item, date) {
  const frequency = item?.frequency || "monthly";
  if (frequency === "weekly") return date.getDay() === Number(item.weekday ?? 1);
  if (frequency === "yearly") return date.getMonth() === 0 && date.getDate() === 1;
  const paymentWindow = getCashflowPaymentWindow(item, date.getFullYear(), date.getMonth());
  return paymentWindow ? date.getDate() >= paymentWindow.startDay && date.getDate() <= paymentWindow.endDay : date.getDate() === 1;
}

function hasCashflowEventOnDate(items, date) {
  return items.some((item) => Number(item.amount ?? item.monthly ?? 0) > 0 && doesCashflowItemOccurOnDate(item, date));
}

function getFinanceDataPoint(label, periodTransactions, forecastTotals) {
  const actualIncome = periodTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const actualExpenses = periodTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const forecastIncome = forecastTotals.incomeTotal;
  const forecastExpenses = forecastTotals.expenseTotal + forecastTotals.debtPaymentTotal;
  const hasActualIncome = periodTransactions.some((transaction) => transaction.type === "income");
  const hasActualExpenses = periodTransactions.some((transaction) => transaction.type === "expense");
  const linkedIncome = periodTransactions
    .filter((transaction) => transaction.type === "income" && getMatchedCashflowOptionForTransaction(transaction)?.type === "income")
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const linkedExpenses = periodTransactions
    .filter((transaction) => transaction.type === "expense")
    .filter((transaction) => ["expense", "debt"].includes(getMatchedCashflowOptionForTransaction(transaction)?.type))
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const income = forecastIncome > 0 ? forecastIncome : actualIncome;
  const expenses = Math.max(forecastExpenses, actualExpenses);

  return {
    month: label,
    income,
    expenses,
    actualIncome,
    actualExpenses,
    forecastIncome,
    forecastExpenses,
    incomeVariance: actualIncome - forecastIncome,
    expenseVariance: actualExpenses - forecastExpenses,
    incomeAnulled: Math.min(linkedIncome, forecastIncome),
    expensesAnulled: Math.min(linkedExpenses, forecastExpenses),
    hasActualIncome,
    hasActualExpenses,
    hasIncomeEvent: hasActualIncome,
    hasExpenseEvent: hasActualExpenses,
    isIncomeForecast: !hasActualIncome,
    isExpenseForecast: !hasActualExpenses,
    isFutureProjection: false
  };
}

function getMonthlyFinanceDataForYear(year) {
  const today = new Date();
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  return Array.from({ length: 12 }, (_, monthIndex) => {
    const month = new Intl.DateTimeFormat(financeLocale(), { month: "short" }).format(new Date(year, monthIndex, 1)).replace(".", "");
    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = new Date(year, monthIndex + 1, 0);
    const monthTransactions = getTransactionsForMonth(year, monthIndex);
    const cashflowTotals = getCashflowPeriodTotals(formatCashflowDateValue(monthStart), formatCashflowDateValue(monthEnd));
    const point = getFinanceDataPoint(month, monthTransactions, cashflowTotals);
    point.hasIncomeEvent = point.hasActualIncome || point.forecastIncome > 0;
    point.hasExpenseEvent = point.hasActualExpenses || point.forecastExpenses > 0;
    point.isFutureProjection = monthStart > currentMonthStart;
    return point;
  });
}

function getDailyFinanceDataForMonth(year, monthIndex) {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const monthStart = new Date(year, monthIndex, 1);

  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const date = new Date(year, monthIndex, day);
    const periodTransactions = transactions.filter((transaction) => {
      const transactionDate = new Date((transaction.date || "") + "T00:00:00");
      return transactionDate >= monthStart && transactionDate <= date;
    });
    const cashflowTotals = getCashflowPeriodTotals(formatCashflowDateValue(monthStart), formatCashflowDateValue(date));
    const point = getFinanceDataPoint(String(day), periodTransactions, cashflowTotals);
    const dayTransactions = getTransactionsForDay(year, monthIndex, day);
    const hasIncomeTransactionToday = dayTransactions.some((transaction) => transaction.type === "income");
    const hasExpenseTransactionToday = dayTransactions.some((transaction) => transaction.type === "expense");
    const hasIncomeCashflowToday = hasCashflowEventOnDate(cashflowIncomes, date);
    const hasExpenseCashflowToday = hasCashflowEventOnDate([...cashflowExpenses, ...cashflowDebts], date);
    const isFutureDay = date > todayStart;
    point.hasIncomeEvent = hasIncomeTransactionToday || hasIncomeCashflowToday;
    point.hasExpenseEvent = hasExpenseTransactionToday || hasExpenseCashflowToday;

    if (isFutureDay) {
      point.income = point.forecastIncome;
      point.expenses = point.forecastExpenses;
      point.isIncomeForecast = true;
      point.isExpenseForecast = true;
      point.isFutureProjection = true;
    }

    return point;
  });
}

function getCashflowLinkOptions() {
  const buildOption = (item, type) => {
    const amountKey = type === "debt" ? "monthly" : "amount";
    const labelType = type === "income"
      ? financeT("static.cashflow.income", "Prihodi")
      : type === "expense"
      ? financeT("static.cashflow.expenses", "Troskovi")
      : financeT("static.cashflow.debtUpper", "DUG");
    return {
      value: `${type}:${item.id}`,
      type,
      id: String(item.id),
      name: item.name || labelType,
      amount: Number(item[amountKey] || 0),
      category: item.category || "",
      label: `${labelType} - ${item.name || labelType}${item.category ? ` / ${item.category}` : ""} (${formatFinanceOverviewMoney(Number(item[amountKey] || 0))})`
    };
  };
  return [
    ...cashflowIncomes.map((item) => buildOption(item, "income")),
    ...cashflowExpenses.map((item) => buildOption(item, "expense")),
    ...cashflowDebts.map((item) => buildOption(item, "debt"))
  ];
}

function getCashflowLinkOption(value) {
  return getCashflowLinkOptions().find((option) => option.value === value) || null;
}

function getMatchedCashflowOptionForTransaction(transaction) {
  const direct = getCashflowLinkOption(transaction.cashflowLink);
  if (direct) return direct;
  const normalizedCategory = normalizeText(transaction.category || "");
  if (normalizedCategory) {
    const categoryMatch = getCashflowLinkOptions().find((option) => {
      if (transaction.type === "income" && option.type !== "income") return false;
      if (transaction.type === "expense" && !["expense", "debt"].includes(option.type)) return false;
      return normalizeText(option.category || "") === normalizedCategory;
    });
    if (categoryMatch) return categoryMatch;
  }
  const haystack = normalizeText([
    transaction.description,
    transaction.note,
    transaction.category,
    transaction.linkedTo
  ].filter(Boolean).join(" "));
  if (!haystack) return null;
  return getCashflowLinkOptions().find((option) => {
    if (transaction.type === "income" && option.type !== "income") return false;
    if (transaction.type === "expense" && !["expense", "debt"].includes(option.type)) return false;
    const name = normalizeText(option.name);
    return name && (haystack.includes(name) || name.includes(haystack));
  }) || null;
}

function renderTransactionCashflowLink(transaction) {
  const option = getMatchedCashflowOptionForTransaction(transaction);
  if (!option) return '<span class="transaction-muted">-</span>';
  return `<span class="transaction-cashflow-link">${escapeHtml(option.name)}</span>`;
}

function updateTransactionCashflowOptions() {
  if (!transactionCashflowLinkInput) return;
  const selected = transactionCashflowLinkInput.value;
  const options = getCashflowLinkOptions();
  transactionCashflowLinkInput.innerHTML = '<option value="">' + escapeHtml(financeT("options.notLinked", "Nije povezano")) + '</option>' + options
    .map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`)
    .join("");
  transactionCashflowLinkInput.value = options.some((option) => option.value === selected) ? selected : "";
}

function getFinanceOverviewBudgetData() {
  return budgets
    .filter((budget) => budget.active !== false)
    .filter((budget) => normalizeText(budget.type) !== normalizeText("Cilj"))
    .filter((budget) => normalizeText(budget.linkedType) !== normalizeText("Cilj"))
    .filter((budget) => normalizeText(budget.behavior) !== normalizeText("Odvajanje novca"))
    .map((budget) => ({
      id: budget.id,
      category: budget.name || budget.categories?.[0] || financeT("static.budget.title", "Budzet"),
      spent: getBudgetUsedAmount(budget),
      limit: Number(budget.amount || 0),
      status: getBudgetStatus(budget)
    }))
    .filter((budget) => budget.limit > 0);
}

function getFinanceGoalTargetAmount(goal) {
  const text = [
    goal?.title,
    goal?.successMeasurement,
    goal?.mainMilestone,
    goal?.reason,
    goal?.finalGoalReason
  ].filter(Boolean).join(" ");
  const match = text.match(/([\d.,]+)\s*(?:EUR|eur|evra|eura|euro)/i);
  if (!match) return 0;
  const rawAmount = String(match[1]);
  const normalizedAmount = rawAmount.includes(",")
    ? rawAmount.replace(/\./g, "").replace(",", ".")
    : rawAmount.replace(/\.(?=\d{3}(?:\D|$))/g, "");
  const amount = Number(normalizedAmount);
  return Number.isFinite(amount) ? amount : 0;
}

function isSavingsFinanceGoal(goal) {
  if (!goal) return false;
  const text = [
    goal.category,
    goal.categoryName,
    goal.subcategory,
    goal.subcategoryName,
    goal.goalType,
    goal.title,
    goal.reason,
    goal.successMeasurement,
    goal.mainMilestone,
    goal.finalGoalReason
  ].filter(Boolean).join(" ");
  const normalized = normalizeText(text);
  return (normalizeText(goal.category) === normalizeText("Finance") || normalizeText(goal.categoryName) === normalizeText("Finansije"))
    && (
      normalized.includes("sted")
      || normalized.includes("savings")
      || normalized.includes("saving")
      || normalized.includes("emergency")
      || normalized.includes("sigurn")
      || normalized.includes("fond")
      || getFinanceGoalTargetAmount(goal) > 0
    );
}

function getMonthsUntilGoalDate(goal) {
  if (!goal?.targetDate) return 12;
  const today = new Date();
  const target = new Date(goal.targetDate + "T00:00:00");
  if (Number.isNaN(target.getTime()) || target <= today) return 1;
  const years = target.getFullYear() - today.getFullYear();
  const months = target.getMonth() - today.getMonth();
  const rawMonths = years * 12 + months + (target.getDate() >= today.getDate() ? 1 : 0);
  return Math.max(1, rawMonths);
}

function getMonthlySavingAmountForGoal(goal, targetAmount) {
  if (!targetAmount || targetAmount <= 0) return 0;
  const months = getMonthsUntilGoalDate(goal);
  return Math.max(1, Math.ceil(targetAmount / months));
}

async function ensureSavingsBudgetForGoal(goal) {
  if (!isSavingsFinanceGoal(goal)) return null;
  const targetAmount = getFinanceGoalTargetAmount(goal);
  const monthlyAmount = getMonthlySavingAmountForGoal(goal, targetAmount);
  if (!monthlyAmount) return null;

  const goalId = String(goal.id || "");
  const existing = budgets.find((budget) => {
    return budget.sourceGoalId === goalId
      || (normalizeText(budget.linkedType) === normalizeText("Cilj") && normalizeText(budget.linkedItem) === normalizeText(goal.title));
  });

  const nextBudget = {
    id: existing?.id || "budget-goal-" + goalId,
    sourceGoalId: goalId,
    name: existing?.name || goal.title,
    type: "Cilj",
    behavior: "Odvajanje novca",
    icon: existing?.icon || "target",
    amount: monthlyAmount,
    targetAmount,
    period: financeT("static.periods.monthly", "Mesecno"),
    categories: existing?.categories?.length ? existing.categories : [financeT("categories.savings", "Stednja")],
    linkedType: "Cilj",
    linkedItem: goal.title,
    priority: existing?.priority || "Srednji",
    warning: existing?.warning || "Na 80%",
    note: existing?.note || `Automatski povezano sa finansijskim ciljem: ${goal.title}`,
    status: existing?.status || "Aktivno",
    recurring: true,
    active: existing?.active !== false,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  budgets = existing
    ? budgets.map((budget) => budget.id === existing.id ? Object.assign({}, budget, nextBudget) : budget)
    : [nextBudget, ...budgets];
  selectedBudgetId = nextBudget.id;
  syncTransactionBudgetLinks();
  if (!await saveFinanceState()) {
    renderBudgetPage();
    if (!document.getElementById("financeDashboardPanel")?.classList.contains("hidden")) renderFinanceOverview();
    return null;
  }
  renderBudgetPage();
  if (!document.getElementById("financeDashboardPanel")?.classList.contains("hidden")) renderFinanceOverview();
  return nextBudget;
}

function getFinanceAppGoals() {
  const state = window.appState;
  if (!state || !Array.isArray(state.goals)) return [];
  return state.goals.filter((goal) => {
    return normalizeText(goal.category) === normalizeText("Finance")
      || normalizeText(goal.categoryName) === normalizeText("Finansije");
  });
}

function findBudgetForFinanceGoal(goal) {
  const goalTitle = normalizeText(goal?.title);
  return budgets.find((budget) => {
    const linked = normalizeText(budget.linkedItem);
    const name = normalizeText(budget.name);
    return linked && goalTitle.includes(linked)
      || linked && linked.includes(goalTitle)
      || name && goalTitle.includes(name)
      || name && name.includes(goalTitle);
  });
}

function getFinanceOverviewGoals() {
  const appGoals = getFinanceAppGoals().map((goal) => {
    const linkedBudget = findBudgetForFinanceGoal(goal);
    const target = getFinanceGoalTargetAmount(goal) || Number(linkedBudget?.targetAmount || linkedBudget?.amount || 0);
    const saved = linkedBudget ? getBudgetUsedAmount(linkedBudget) : 0;
    return {
      id: goal.id,
      name: goal.title || financeOverviewT("defaultGoalName", "Finansijski cilj"),
      target,
      saved,
      monthly: Number(linkedBudget?.amount || 0),
      status: target && saved >= target ? financeOverviewT("completed", "Ispunjeno") : (linkedBudget ? getBudgetStatus(linkedBudget) : financeOverviewT("active", "Aktivno")),
      plannedDate: goal.targetDate ? formatDateLabel(goal.targetDate) : (goal.duration || financeOverviewT("notSet", "Nije postavljeno"))
    };
  });

  const appGoalNames = new Set(appGoals.map((goal) => normalizeText(goal.name)));
  const budgetGoals = budgets
    .filter((budget) => budget.active !== false)
    .filter((budget) => {
      return normalizeText(budget.type) === normalizeText("Cilj")
        || normalizeText(budget.linkedType) === normalizeText("Cilj")
        || normalizeText(budget.behavior) === normalizeText("Odvajanje novca");
    })
    .map((budget) => ({
      id: budget.id,
      name: budget.linkedItem || budget.name || financeOverviewT("defaultGoalName", "Finansijski cilj"),
      target: Number(budget.amount || 0),
      saved: getBudgetUsedAmount(budget),
      monthly: Number(budget.amount || 0),
      status: getBudgetStatus(budget),
      plannedDate: budget.period || financeOverviewT("monthly", "Mesecni")
    }))
    .filter((goal) => goal.target > 0)
    .filter((goal) => !appGoalNames.has(normalizeText(goal.name)));

  return [...appGoals, ...budgetGoals].filter((goal) => goal.target > 0 || goal.monthly > 0);
}

function getFinanceOverviewAssetData() {
  const totals = getAssetTotals();
  return {
    totalCapital: totals.totalAssets,
    netWorth: totals.totalAssets - totals.totalDebts,
    liquidAssets: totals.liquidAssetsTotal,
    materialAssets: totals.materialTotal,
    trackedAssets: totals.investmentTotal,
    totalDebts: totals.totalDebts
  };
}

function getFinanceOverviewStats() {
  const year = getFinanceOverviewYear();
  const monthlyFinanceData = getMonthlyFinanceDataForYear(year);
  const now = new Date();
  const elapsedMonthCount = year < now.getFullYear()
    ? 12
    : year === now.getFullYear()
    ? now.getMonth() + 1
    : 1;
  const elapsedMonthlyFinanceData = monthlyFinanceData.slice(0, elapsedMonthCount);
  const totalIncome = elapsedMonthlyFinanceData.reduce((sum, item) => sum + item.income, 0);
  const totalExpenses = elapsedMonthlyFinanceData.reduce((sum, item) => sum + item.expenses, 0);
  const yearlyDifference = totalIncome - totalExpenses;

  const bestMonth = elapsedMonthlyFinanceData.reduce((best, item) => {
    const currentDifference = item.income - item.expenses;
    const bestDifference = best.income - best.expenses;
    return currentDifference > bestDifference ? item : best;
  }, elapsedMonthlyFinanceData[0]);

  const worstMonth = elapsedMonthlyFinanceData.reduce((worst, item) => {
    const currentDifference = item.income - item.expenses;
    const worstDifference = worst.income - worst.expenses;
    return currentDifference < worstDifference ? item : worst;
  }, elapsedMonthlyFinanceData[0]);
  const highestExpenseMonth = elapsedMonthlyFinanceData.reduce((highest, item) => {
    return item.expenses > highest.expenses ? item : highest;
  }, elapsedMonthlyFinanceData[0]);

  const yearStatus =
    yearlyDifference > 3000
      ? financeOverviewT("yearGrowth", "Godina rasta")
      : yearlyDifference > 0
      ? financeOverviewT("yearStable", "Godina stabilizacije")
      : financeOverviewT("yearExpenseHeavy", "Godina pojacanih troskova");

  return { year, monthlyFinanceData, elapsedMonthlyFinanceData, totalIncome, totalExpenses, yearlyDifference, bestMonth, worstMonth, highestExpenseMonth, yearStatus };
}

function getFinanceOverviewMentorInsights() {
  const stats = getFinanceOverviewStats();
  const budgetOverview = getFinanceOverviewBudgetData();
  const goals = getFinanceOverviewGoals();
  const assetData = getFinanceOverviewAssetData();
  const hasFinanceData = stats.totalIncome > 0 || stats.totalExpenses > 0 || assetData.totalCapital > 0 || budgetOverview.length > 0;
  const insights = [];

  if (!hasFinanceData) {
    insights.push({
      title: financeOverviewT("emptyInsightTitle", "Pregled ceka prve finansijske podatke."),
      message: financeOverviewT("emptyInsightMessage", "Dodaj transakcije, tokove novca, budzet ili imovinu i ovaj ekran ce poceti da sabira tvoju realnu finansijsku sliku."),
      points: [
        financeOverviewT("emptyInsightPointChart", "Za godisnji grafikon koriste se Transakcije i Tokovi novca."),
        financeOverviewT("emptyInsightPointCapital", "Kapital dolazi iz modula Imovina.")
      ],
      actionLabel: financeOverviewT("openCashflow", "Otvori tokove novca"),
      tab: "income"
    });
    return insights;
  }

  insights.push({
    title: stats.yearlyDifference >= 0
      ? financeOverviewT("positiveYearTitle", "Godina trenutno ima pozitivan finansijski pravac.")
      : financeOverviewT("negativeYearTitle", "Godina trenutno trazi kontrolu rashoda."),
    message: stats.yearlyDifference >= 0
      ? financeOverviewT("positiveYearMessage", "Prihodi su veci od troskova za {{amount}}. Najveci rashod je u mesecu {{month}}, pa tu vredi proveriti sta je najvise uticalo na potrosnju.", {
        amount: formatFinanceOverviewMoney(stats.yearlyDifference),
        month: stats.highestExpenseMonth.month
      })
      : financeOverviewT("negativeYearMessage", "Troskovi su veci od prihoda za {{amount}}. Prvi korak je pregled meseca {{month}}, jer tu rashodi najvise opterecuju godinu.", {
        amount: formatFinanceOverviewMoney(Math.abs(stats.yearlyDifference)),
        month: stats.highestExpenseMonth.month
      }),
    points: [
      financeOverviewT("bestMonth", "Najbolji mesec: {{month}}.", { month: stats.bestMonth.month }),
      financeOverviewT("highestExpense", "Najveci trosak: {{month}}.", { month: stats.highestExpenseMonth.month })
    ],
    actionLabel: financeOverviewT("openCashflow", "Otvori tokove novca"),
    tab: "income"
  });

  if (budgetOverview.length) {
    const mostUsedBudget = [...budgetOverview].sort((a, b) => (b.spent / b.limit) - (a.spent / a.limit))[0];
    const percent = mostUsedBudget.limit ? Math.round((mostUsedBudget.spent / mostUsedBudget.limit) * 100) : 0;
    insights.push({
      title: percent >= 80
        ? financeOverviewT("budgetNearLimitTitle", "Jedan budzet je blizu limita.")
        : financeOverviewT("budgetHealthyTitle", "Budzet trenutno daje korisnu kontrolu."),
      message: financeOverviewT("budgetUsageMessage", "{{category}} je na {{percent}}% mesecnog limita. To je najbolja tacka za proveru pre nego sto potrosnja predje plan.", {
        category: mostUsedBudget.category,
        percent
      }),
      points: [
        financeOverviewT("spentPoint", "Potroseno: {{amount}}.", { amount: formatFinanceOverviewMoney(mostUsedBudget.spent) }),
        financeOverviewT("limitPoint", "Limit: {{amount}}.", { amount: formatFinanceOverviewMoney(mostUsedBudget.limit) })
      ],
      actionLabel: financeOverviewT("setBudget", "Postavi budzet"),
      tab: "budget"
    });
  } else {
    insights.push({
      title: financeOverviewT("noBudgetTitle", "Budzet jos nije postavljen."),
      message: financeOverviewT("noBudgetMessage", "Bez budzeta Pregled vidi prihode, troskove i kapital, ali nema mesecne limite koji pomazu da se potrosnja tumaci na vreme."),
      points: [
        financeOverviewT("noBudgetPointPlan", "Budzet povezuje plan sa stvarnim transakcijama."),
        financeOverviewT("noBudgetPointCategories", "Kategorije pomazu da mali ponavljajuci troskovi postanu vidljivi.")
      ],
      actionLabel: financeOverviewT("setBudget", "Postavi budzet"),
      tab: "budget"
    });
  }

  insights.push({
    title: assetData.totalCapital > 0
      ? financeOverviewT("capitalEnteredTitle", "Kapital je unet u finansijsku sliku.")
      : financeOverviewT("capitalMissingTitle", "Kapital jos nije evidentiran."),
    message: assetData.totalCapital > 0
      ? financeOverviewT("capitalEnteredMessage", "Ukupno evidentirana imovina iznosi {{total}}. Likvidna sredstva su {{liquid}}, sto je vazan signal za kratkorocnu sigurnost.", {
        total: formatFinanceOverviewMoney(assetData.totalCapital),
        liquid: formatFinanceOverviewMoney(assetData.liquidAssets)
      })
      : financeOverviewT("capitalMissingMessage", "Kada uneses likvidna sredstva, pracenu i materijalnu imovinu, Pregled ce jasnije pokazati koliko prostora imas za ciljeve i odluke."),
    points: [
      financeOverviewT("liquidAssetsPoint", "Likvidna sredstva: {{amount}}.", { amount: formatFinanceOverviewMoney(assetData.liquidAssets) }),
      financeOverviewT("trackedAssetsPoint", "Pracena imovina: {{amount}}.", { amount: formatFinanceOverviewMoney(assetData.trackedAssets) })
    ],
    actionLabel: financeOverviewT("openAssets", "Otvori imovinu"),
    tab: "assets"
  });

  if (goals.length) {
    insights.push({
      title: financeOverviewT("goalsActiveTitle", "Finansijski ciljevi imaju aktivan plan."),
      message: financeOverviewT("goalsActiveMessage", "{{name}} je povezan sa budzetom i trenutno je na {{percent}}% mesecnog plana.", {
        name: goals[0].name,
        percent: goals[0].target ? Math.round((goals[0].saved / goals[0].target) * 100) : 0
      }),
      points: [
        financeOverviewT("activeGoalsPoint", "Aktivnih ciljeva: {{count}}.", { count: goals.length }),
        financeOverviewT("firstGoalPoint", "Prvi cilj: {{name}}.", { name: goals[0].name })
      ],
      actionLabel: financeOverviewT("viewGoals", "Pogledaj ciljeve"),
      tab: "budget"
    });
  }

  return insights;
}

function getFinanceOverviewCta(stats) {
  const hasData = stats.totalIncome > 0 || stats.totalExpenses > 0;
  if (!hasData) {
    return {
      text: financeOverviewT("noMonthlySignal", "Jos nema dovoljno finansijskih podataka za mesecni signal. Dodaj transakcije ili tokove novca da Pregled moze da prepozna najvazniji obrazac."),
      actionLabel: financeOverviewT("openCashflow", "Otvori tokove novca"),
      tab: "income"
    };
  }
  if (stats.highestExpenseMonth.expenses > stats.highestExpenseMonth.income) {
    return {
      text: financeOverviewT("monthExpenseSignal", "{{month}} pokazuje vece troskove od prihoda. Proveri tokove novca i pronadji kategorije koje mozes smanjiti bez velikog odricanja.", {
        month: stats.highestExpenseMonth.month
      }),
      actionLabel: financeOverviewT("openCashflow", "Otvori tokove novca"),
      tab: "income"
    };
  }
  return {
    text: financeOverviewT("monthBestSignal", "{{month}} trenutno ima najbolji odnos prihoda i rashoda. Pogledaj sta je tada radilo dobro i da li taj ritam mozes ponoviti.", {
      month: stats.bestMonth.month
    }),
    actionLabel: financeOverviewT("openCashflow", "Otvori tokove novca"),
    tab: "income"
  };
}

function renderFinanceOverviewIcon(name) {
  const paths = {
    income: '<path d="M4 17 10 11l4 4 6-8"></path><path d="M15 7h5v5"></path>',
    expense: '<path d="m4 7 6 6 4-4 6 8"></path><path d="M15 17h5v-5"></path>',
    capital: '<path d="M4 10h16"></path><path d="M6 10v8M10 10v8M14 10v8M18 10v8"></path><path d="M3 20h18M12 3l9 5H3l9-5Z"></path>',
    balance: '<path d="M12 4v16M5 7h14"></path><path d="m5 7-3 6h6L5 7Zm14 0-3 6h6l-3-6Z"></path><path d="M8 20h8"></path>',
    savings: '<path d="M5 9a7 7 0 0 1 13-2h3v7h-3a7 7 0 0 1-13-2H3V8h2"></path><path d="M12 7v5M10 9h4"></path>',
    reserve: '<path d="M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-3Z"></path><path d="m9 12 2 2 4-5"></path>',
    clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"></rect><path d="M9 4.5V3h6v3H9V4.5ZM9 11h6M9 15h6"></path>',
    warning: '<path d="M12 4 3 20h18L12 4Z"></path><path d="M12 9v5M12 17h.01"></path>',
    sparkles: '<path d="m12 3 1.4 3.6L17 8l-3.6 1.4L12 13l-1.4-3.6L7 8l3.6-1.4L12 3Z"></path><path d="m5 14 .9 2.1L8 17l-2.1.9L5 20l-.9-2.1L2 17l2.1-.9L5 14Zm14-2 .7 1.3 1.3.7-1.3.7L19 16l-.7-1.3L17 14l1.3-.7L19 12Z"></path>'
  };
  return `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">${paths[name] || paths.balance}</svg>`;
}

function formatFinanceOverviewMoney(value, options = {}) {
  const sign = options.sign && value > 0 ? "+" : "";
  const amount = new Intl.NumberFormat(financeLocale(), { maximumFractionDigits: 0 }).format(value);
  return financeOverviewT("moneyPattern", "{{sign}}{{amount}} €", { sign, amount });
}

function renderFinanceOverviewSummaryCard(card) {
  return `
    <article class="mentor-card finance-overview-summary-card ${card.tone || ""}">
      <span class="finance-overview-icon" aria-hidden="true">${renderFinanceOverviewIcon(card.icon)}</span>
      <div class="finance-overview-summary-content">
        <span>${escapeHtml(card.title)}</span>
        <strong>${escapeHtml(card.value)}</strong>
      </div>
    </article>
  `;
}

function renderFinanceOverviewChart(stats) {
  return "";
  const isDayMode = financeOverviewChartMode === "day";
  const isBarChart = financeOverviewChartType === "bar";
  const showIncomeSeries = financeOverviewVisibleSeries.income;
  const showExpenseSeries = financeOverviewVisibleSeries.expense;
  const dayYear = selectedFinanceOverviewDayDate.getFullYear();
  const dayMonth = selectedFinanceOverviewDayDate.getMonth();
  const chartData = isDayMode ? getDailyFinanceDataForMonth(dayYear, dayMonth) : stats.monthlyFinanceData;
  const chartMonthName = new Intl.DateTimeFormat(financeLocale(), { month: "short" }).format(selectedFinanceOverviewDayDate).replace(".", "");
  const chartTitle = isDayMode
    ? financeOverviewT("chartTitleDay", "Prihodi i troskovi kroz dane")
    : financeOverviewT("chartTitleYear", "Prihodi i troskovi kroz godinu");
  const chartSubtitle = isDayMode
    ? financeOverviewT("chartSubtitleDay", "Dnevni pregled za {{month}} {{year}}.", { month: chartMonthName, year: dayYear })
    : financeOverviewT("chartSubtitleYear", "Poredjenje mesecnih prihoda i rashoda za {{year}}.", { year: stats.year });
  const chartNavLabel = `${chartMonthName} ${dayYear}`;
  const chartWidth = 1160;
  const chartHeight = 420;
  const paddingLeft = 82;
  const paddingRight = 28;
  const paddingTop = 34;
  const paddingBottom = 68;
  const plotWidth = chartWidth - paddingLeft - paddingRight;
  const plotHeight = chartHeight - paddingTop - paddingBottom;
  const plotBottom = paddingTop + plotHeight;
  const maxValue = Math.max(
    0,
    ...chartData.flatMap((item) => [
      item.income,
      item.expenses,
      item.forecastIncome,
      item.forecastExpenses,
      item.actualIncome,
      item.actualExpenses
    ])
  );
  const yAxisMax = Math.max(500, Math.ceil(maxValue / 500) * 500);
  const yTicks = [yAxisMax, Math.round(yAxisMax * 0.75), Math.round(yAxisMax * 0.5), Math.round(yAxisMax * 0.25), 0];
  const getX = (index) => {
    if (isBarChart) return paddingLeft + (plotWidth / Math.max(1, chartData.length)) * (index + 0.5);
    return paddingLeft + (plotWidth / Math.max(1, chartData.length - 1)) * index;
  };
  const getY = (value) => plotBottom - (value / yAxisMax) * plotHeight;
  const getPoints = (key) => chartData.map((item, index) => ({
    x: getX(index),
    y: getY(item[key]),
    value: item[key],
    month: item.month
  }));
  const incomePoints = getPoints("income");
  const expensePoints = getPoints("expenses");
  const summaryData = chartData.filter((item) => {
    return !item.isFutureProjection;
  });
  const effectiveSummaryData = summaryData.length ? summaryData : chartData;
  const chartBest = effectiveSummaryData.reduce((best, item) => (item.income - item.expenses) > (best.income - best.expenses) ? item : best, effectiveSummaryData[0]);
  const chartTransactions = isDayMode
    ? getTransactionsForMonth(dayYear, dayMonth)
    : transactions.filter((transaction) => {
      const date = new Date((transaction.date || "") + "T00:00:00");
      return date.getFullYear() === stats.year;
    });
  const expenseCategoryExtremes = getExpenseCategoryExtremes(chartTransactions);
  const highestExpenseDay = getHighestExpenseDay(chartTransactions);
  const highestExpenseLabel = isDayMode
    ? (highestExpenseDay ? `${formatFinanceOverviewMonthDay(highestExpenseDay.date)} (${formatFinanceOverviewMoney(highestExpenseDay.amount)})` : "-")
    : (expenseCategoryExtremes.highest ? `${expenseCategoryExtremes.highest.category} (${formatFinanceOverviewMoney(expenseCategoryExtremes.highest.amount)})` : "-");
  const lowestExpenseLabel = expenseCategoryExtremes.lowest
    ? `${expenseCategoryExtremes.lowest.category} (${formatFinanceOverviewMoney(expenseCategoryExtremes.lowest.amount)})`
    : "-";
  const bestDayLabel = isDayMode ? formatFinanceOverviewWeekday(dayYear, dayMonth, chartBest.month) : chartBest.month;
  const renderSeriesSegments = (points, type) => {
    return points.slice(0, -1).map((point, index) => {
      const nextPoint = points[index + 1];
      const currentItem = chartData[index];
      const nextItem = chartData[index + 1];
      const isProjection = currentItem.isFutureProjection || nextItem.isFutureProjection;
      if (type === "income" && !showIncomeSeries) return "";
      if (type === "expense" && !showExpenseSeries) return "";
      if (isProjection) return "";
      const controlX = point.x + (nextPoint.x - point.x) / 2;
      const path = `M ${point.x} ${point.y} C ${controlX} ${point.y}, ${controlX} ${nextPoint.y}, ${nextPoint.x} ${nextPoint.y}`;
      return `<path class="finance-overview-series-segment ${type} actual" d="${path}"></path>`;
    }).join("");
  };
  const renderBars = () => {
    const bandWidth = plotWidth / Math.max(1, chartData.length);
    const barWidth = Math.max(5, Math.min(22, (bandWidth - 9) / 2));
    const barGap = 4;
    return chartData.map((item, index) => {
      const x = getX(index);
      const incomeY = getY(item.income);
      const expenseY = getY(item.expenses);
      const incomeClass = item.isFutureProjection ? "forecast" : "actual";
      const expenseClass = item.isFutureProjection ? "forecast" : "actual";
      const shouldRenderIncome = showIncomeSeries && !item.isFutureProjection;
      const shouldRenderExpense = showExpenseSeries && !item.isFutureProjection;
      return `
        ${shouldRenderIncome ? `<rect class="finance-overview-chart-bar income ${incomeClass}" x="${x - barWidth - barGap / 2}" y="${incomeY}" width="${barWidth}" height="${plotBottom - incomeY}"></rect>` : ""}
        ${shouldRenderExpense ? `<rect class="finance-overview-chart-bar expense ${expenseClass}" x="${x + barGap / 2}" y="${expenseY}" width="${barWidth}" height="${plotBottom - expenseY}"></rect>` : ""}
      `;
    }).join("");
  };

  return `
    <article class="mentor-card finance-overview-chart-panel">
      <div class="finance-overview-panel-head">
        <div>
          <h2>${chartTitle}</h2>
          <p>${chartSubtitle}</p>
        </div>
        <div class="finance-overview-chart-tools">
          <div class="finance-overview-chart-toggle-row">
            <div class="finance-overview-mode-toggle" aria-label="${escapeHtml(financeOverviewT("chartModeAria", "Rezim grafikona"))}">
              <button class="${financeOverviewChartMode === "month" ? "active" : ""}" type="button" data-finance-chart-mode="month" aria-pressed="${financeOverviewChartMode === "month"}"><span class="finance-chart-control-icon calendar" aria-hidden="true"></span>${escapeHtml(financeOverviewT("monthly", "Mesecni"))}</button>
              <button class="${financeOverviewChartMode === "day" ? "active" : ""}" type="button" data-finance-chart-mode="day" aria-pressed="${financeOverviewChartMode === "day"}"><span class="finance-chart-control-icon clock" aria-hidden="true"></span>${escapeHtml(financeOverviewT("daily", "Dnevni"))}</button>
            </div>
          </div>
          <div class="finance-overview-legend" aria-label="${escapeHtml(financeOverviewT("chartLegendAria", "Legenda grafikona"))}">
            <label><input type="checkbox" data-finance-chart-series="income" ${showIncomeSeries ? "checked" : ""} /><i class="income"></i>${escapeHtml(financeOverviewT("income", "Prihod"))}</label>
            <label><input type="checkbox" data-finance-chart-series="expense" ${showExpenseSeries ? "checked" : ""} /><i class="expense"></i>${escapeHtml(financeOverviewT("expense", "Trosak"))}</label>
          </div>
        </div>
      </div>
      <div class="finance-overview-chart" aria-label="${escapeHtml(financeOverviewT("chartAria", "{{mode}} prihodi i troskovi u evrima", { mode: isDayMode ? financeOverviewT("daily", "Dnevni") : financeOverviewT("monthly", "Mesecni") }))}">
        ${isDayMode ? `
          <div class="finance-overview-chart-inner-top">
            <div class="finance-overview-chart-nav" aria-label="${escapeHtml(financeOverviewT("chartMonthNavAria", "Navigacija meseca"))}">
              <button type="button" data-finance-chart-month-prev aria-label="${escapeHtml(financeOverviewT("previousMonth", "Prethodni mesec"))}"><</button>
              <strong>${escapeHtml(chartNavLabel)}</strong>
              <button type="button" data-finance-chart-month-next aria-label="${escapeHtml(financeOverviewT("nextMonth", "Sledeci mesec"))}">></button>
            </div>
          </div>
        ` : ""}
        <div class="finance-overview-custom-chart" role="img" aria-label="${escapeHtml(financeOverviewT("chartImageAria", "{{type}} prihoda i rashoda za {{period}}", {
          type: isBarChart ? financeOverviewT("barChart", "Bar chart") : financeOverviewT("lineChart", "Line chart"),
          period: isDayMode ? chartNavLabel : stats.year
        }))}">
          <svg viewBox="0 0 ${chartWidth} ${chartHeight}">
            <g class="finance-overview-y-grid">
              ${yTicks.map((value) => {
                const y = getY(value);
                return `
                  <line class="${value === 0 ? "zero-line" : ""}" x1="${paddingLeft}" y1="${y}" x2="${chartWidth - paddingRight}" y2="${y}"></line>
                  <text x="${paddingLeft - 14}" y="${y + 5}">${formatFinanceOverviewMoney(value)}</text>
                `;
              }).join("")}
            </g>
            <g class="finance-overview-x-grid">
              ${chartData.map((item, index) => {
                const x = getX(index);
                return `
                  <line x1="${x}" y1="${paddingTop}" x2="${x}" y2="${plotBottom}"></line>
                  <text x="${x}" y="${plotBottom + 38}">${escapeHtml(item.month)}</text>
                `;
              }).join("")}
            </g>
            <g class="finance-overview-series-segments">
              ${isBarChart ? renderBars() : `
                ${renderSeriesSegments(incomePoints, "income")}
                ${renderSeriesSegments(expensePoints, "expense")}
              `}
            </g>
            ${isBarChart ? "" : `
              <g class="finance-overview-series-points income">
                ${showIncomeSeries ? incomePoints.map((point) => {
                  const item = chartData.find((candidate) => candidate.month === point.month);
                  if (item?.isFutureProjection) return "";
                  if (isDayMode && !item?.hasIncomeEvent) return "";
                  return `
                  <circle class="${item?.isFutureProjection ? "forecast" : "actual"}" cx="${point.x}" cy="${point.y}" r="6"></circle>
                  <title>${escapeHtml(financeOverviewT("incomeTitle", "{{label}} prihod: {{amount}}", { label: point.month, amount: formatFinanceOverviewMoney(point.value) }))}</title>
                `;
                }).join("") : ""}
              </g>
              <g class="finance-overview-series-points expense">
                ${showExpenseSeries ? expensePoints.map((point) => {
                  const item = chartData.find((candidate) => candidate.month === point.month);
                  if (item?.isFutureProjection) return "";
                  if (isDayMode && !item?.hasExpenseEvent) return "";
                  return `
                  <circle class="${item?.isFutureProjection ? "forecast" : "actual"}" cx="${point.x}" cy="${point.y}" r="6"></circle>
                  <title>${escapeHtml(financeOverviewT("expenseTitle", "{{label}} rashod: {{amount}}", { label: point.month, amount: formatFinanceOverviewMoney(point.value) }))}</title>
                `;
                }).join("") : ""}
              </g>
            `}
            <g class="finance-overview-hover-columns">
              ${chartData.map((item, index) => {
                const x = getX(index);
                const columnWidth = plotWidth / Math.max(1, isBarChart ? chartData.length : chartData.length - 1);
                return `
                  <g class="finance-overview-hover-column">
                    <rect x="${x - columnWidth / 2}" y="${paddingTop}" width="${columnWidth}" height="${plotHeight}"></rect>
                    <foreignObject x="${Math.min(Math.max(x - 92, paddingLeft), chartWidth - paddingRight - 184)}" y="${paddingTop + 8}" width="184" height="132">
                      <div xmlns="http://www.w3.org/1999/xhtml" class="finance-overview-chart-tooltip">
                        <strong>${escapeHtml(item.month)}</strong>
                        <span><i class="${item.isIncomeForecast ? "forecast" : "income"}"></i>${escapeHtml(financeOverviewT("income", "Prihod"))}: ${formatFinanceOverviewMoney(item.income)} ${item.isIncomeForecast ? escapeHtml(financeOverviewT("forecast", "(predvidjeno)")) : escapeHtml(financeOverviewT("actual", "(stvarno)"))}</span>
                        <span><i class="${item.isExpenseForecast ? "forecast" : "expense"}"></i>${escapeHtml(financeOverviewT("expense", "Trosak"))}: ${formatFinanceOverviewMoney(item.expenses)} ${item.isExpenseForecast ? escapeHtml(financeOverviewT("forecast", "(predvidjeno)")) : escapeHtml(financeOverviewT("actual", "(stvarno)"))}</span>
                        <em>${escapeHtml(financeOverviewT("plan", "Plan"))}: ${formatFinanceOverviewMoney(item.forecastIncome)} / ${formatFinanceOverviewMoney(item.forecastExpenses)}</em>
                        <em>${escapeHtml(financeOverviewT("actualLabel", "Stvarno"))}: ${formatFinanceOverviewMoney(item.actualIncome)} / ${formatFinanceOverviewMoney(item.actualExpenses)}</em>
                        <em>${escapeHtml(financeOverviewT("annulled", "Anulirano"))}: ${formatFinanceOverviewMoney(item.incomeAnulled + item.expensesAnulled)}</em>
                      </div>
                    </foreignObject>
                  </g>
                `;
              }).join("")}
            </g>
          </svg>
        </div>
        <div class="finance-overview-chart-inner-bottom">
          <div class="finance-overview-chart-type-toggle" aria-label="${escapeHtml(financeOverviewT("chartTypeAria", "Tip grafikona"))}">
            <button class="${financeOverviewChartType === "line" ? "active" : ""}" type="button" data-finance-chart-type="line" aria-pressed="${financeOverviewChartType === "line"}"><span class="finance-chart-type-icon line" aria-hidden="true"><svg viewBox="0 0 28 14" focusable="false"><path d="M2 11 C8 2, 13 2, 14 7 C15 12, 20 12, 26 3"></path><circle cx="14" cy="7" r="2"></circle></svg></span>${escapeHtml(financeOverviewT("line", "Linija"))}</button>
            <button class="${financeOverviewChartType === "bar" ? "active" : ""}" type="button" data-finance-chart-type="bar" aria-pressed="${financeOverviewChartType === "bar"}"><span class="finance-chart-type-icon bars" aria-hidden="true"><i></i><i></i><i></i></span>${escapeHtml(financeOverviewT("bars", "Stubovi"))}</button>
          </div>
        </div>
      </div>
      <div class="finance-overview-chart-summary">
        <span>${escapeHtml(isDayMode ? financeOverviewT("highestExpenseByDay", "Najveci trosak po danu") : financeOverviewT("highestExpenseByCategory", "Najveci trosak po kategoriji"))}: <strong>${escapeHtml(highestExpenseLabel)}</strong></span>
        <span>${escapeHtml(isDayMode ? financeOverviewT("bestDay", "Najbolji dan") : financeOverviewT("bestMonthLabel", "Najbolji mesec"))}: <strong>${escapeHtml(bestDayLabel)}</strong></span>
        <span>${escapeHtml(financeOverviewT("lowestExpenseByCategory", "Najmanji trosak po kategoriji"))}: <strong>${escapeHtml(lowestExpenseLabel)}</strong></span>
      </div>
    </article>
  `;
}

function getMentorInsightTab(actionLabel) {
  return "transactions";
}

function clampFinanceOverviewValue(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function calculateFinancialStability(stats, assetData, budgetCount) {
  const hasData = stats.totalIncome > 0 || stats.totalExpenses > 0 || assetData.totalCapital > 0 || assetData.totalDebts > 0;
  if (!hasData) return 0;
  const config = FINANCIAL_STABILITY_CONFIG;
  const savingsRate = stats.totalIncome > 0 ? stats.yearlyDifference / stats.totalIncome : config.minimumSavingsRate;
  const savingsProgress = clampFinanceOverviewValue(
    (savingsRate - config.minimumSavingsRate) / (config.targetSavingsRate - config.minimumSavingsRate),
    0,
    1
  );
  const averageMonthlyExpenses = stats.elapsedMonthlyFinanceData.length
    ? stats.totalExpenses / stats.elapsedMonthlyFinanceData.length
    : 0;
  const reserveMonths = averageMonthlyExpenses > 0 ? assetData.liquidAssets / averageMonthlyExpenses : 0;
  const reserveProgress = clampFinanceOverviewValue(reserveMonths / config.targetReserveMonths, 0, 1);
  return Math.round(
    savingsProgress * config.cashflowWeight
    + reserveProgress * config.reserveWeight
    + (assetData.netWorth > 0 ? config.capitalWeight : 0)
    + (budgetCount > 0 ? config.planningWeight : 0)
  );
}

function getFinancialProfileMetrics(stats, assetData) {
  const activeBudgetCount = budgets.filter((budget) => budget.active !== false).length;
  const score = calculateFinancialStability(stats, assetData, activeBudgetCount);
  const averageMonthlyExpenses = stats.elapsedMonthlyFinanceData.length
    ? stats.totalExpenses / stats.elapsedMonthlyFinanceData.length
    : 0;
  const reserveMonths = averageMonthlyExpenses > 0 ? assetData.liquidAssets / averageMonthlyExpenses : null;
  const savingsRate = stats.totalIncome > 0 ? stats.yearlyDifference / stats.totalIncome : null;
  const level = score >= 80 ? 5 : score >= 60 ? 4 : score >= 40 ? 3 : score >= 20 ? 2 : 1;
  const currentYear = new Date().getFullYear();
  const profileMonthIndex = stats.year === currentYear ? new Date().getMonth() : Math.max(0, stats.elapsedMonthlyFinanceData.length - 1);
  const profileMonth = stats.monthlyFinanceData[profileMonthIndex] || { income: 0, expenses: 0 };
  const savingsStatus = savingsRate === null
    ? { label: financeOverviewT("notAvailable", "Nema podataka"), tone: "neutral" }
    : savingsRate >= 0.2
    ? { label: financeOverviewT("savingsStrong", "Dobar ritam"), tone: "positive" }
    : savingsRate >= 0
    ? { label: financeOverviewT("needsAttention", "Potrebna paznja"), tone: "warning" }
    : { label: financeOverviewT("savingsNegative", "Nema prostora za stednju"), tone: "negative" };
  const pressure = stats.yearlyDifference < 0
    ? { label: financeOverviewT("highExpenses", "Visoki troskovi"), tone: "negative" }
    : reserveMonths !== null && reserveMonths < 1
    ? { label: financeOverviewT("lowReserve", "Niska rezerva"), tone: "warning" }
    : savingsRate !== null && savingsRate < 0.1
    ? { label: financeOverviewT("lowSavings", "Niska stednja"), tone: "warning" }
    : { label: financeOverviewT("stableFlow", "Stabilan tok"), tone: "positive" };
  return {
    score,
    level,
    reserveMonths,
    monthlyBalance: profileMonth.income - profileMonth.expenses,
    savingsStatus,
    pressure
  };
}

function renderFinancialStatusRow(icon, label, value, tone) {
  return `
    <div class="finance-overview-status-row ${escapeHtml(tone || "neutral")}">
      <span class="finance-overview-status-icon" aria-hidden="true">${renderFinanceOverviewIcon(icon)}</span>
      <span class="finance-overview-status-label">${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function renderFinancialAvatar(financialHealth) {
  const avatarSource = FINANCIAL_AVATAR_BY_LEVEL[financialHealth.level] || FINANCIAL_AVATAR_BY_LEVEL[1];
  return `
    <div class="finance-overview-avatar-stage" data-financial-avatar-level="${financialHealth.level}">
      <div class="finance-overview-avatar-orbit" aria-hidden="true"></div>
      <div class="finance-overview-avatar-indicator top-left">
        <span>${renderFinanceOverviewIcon("income")}</span><strong>${escapeHtml(financeOverviewT("income", "Prihod"))}</strong><i class="positive"></i>
      </div>
      <div class="finance-overview-avatar-indicator top-right">
        <span>${renderFinanceOverviewIcon("expense")}</span><strong>${escapeHtml(financeOverviewT("expensePlural", "Troskovi"))}</strong><i class="negative"></i>
      </div>
      <div class="finance-overview-avatar-indicator bottom-left">
        <span>${renderFinanceOverviewIcon("savings")}</span><strong>${escapeHtml(financeOverviewT("savings", "Stednja"))}</strong><i class="positive"></i>
      </div>
      <div class="finance-overview-avatar-indicator bottom-right">
        <span>${renderFinanceOverviewIcon("reserve")}</span><strong>${escapeHtml(financeOverviewT("reserve", "Rezerva"))}</strong><i class="warning"></i>
      </div>
      <div class="finance-overview-avatar-halo" aria-hidden="true"></div>
      <img class="finance-overview-avatar-image" src="${avatarSource}" alt="${escapeHtml(financeOverviewT("avatarAlt", "Finansijski avatar u poslovnom odelu"))}" decoding="async" />
    </div>
  `;
}

function renderFinancialProfile(stats, assetData) {
  const health = getFinancialProfileMetrics(stats, assetData);
  const reserveValue = health.reserveMonths === null
    ? financeOverviewT("notAvailable", "Nema podataka")
    : financeOverviewT("reserveMonths", "{{count}} meseca", {
      count: new Intl.NumberFormat(financeLocale(), { maximumFractionDigits: 1 }).format(health.reserveMonths)
    });
  return `
    <article class="mentor-card finance-overview-profile-panel">
      <div class="finance-overview-profile-avatar-column">
        <h2>${escapeHtml(financeOverviewT("financialProfile", "Finansijski profil"))}</h2>
        ${renderFinancialAvatar(health)}
      </div>
      <div class="finance-overview-state-column">
        <h2>${escapeHtml(financeOverviewT("yourFinancialState", "Tvoje finansijsko stanje"))}</h2>
        <div class="finance-overview-stability-card">
          <span>${escapeHtml(financeOverviewT("financialStability", "Finansijska stabilnost"))}</span>
          <strong>${health.score} <small>/ 100</small></strong>
          <div class="finance-overview-stability-track" role="progressbar" aria-label="${escapeHtml(financeOverviewT("financialStability", "Finansijska stabilnost"))}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${health.score}"><span style="width:${health.score}%"></span></div>
        </div>
        <div class="finance-overview-status-list">
          ${renderFinancialStatusRow("clipboard", financeOverviewT("monthlyBalance", "Mesecni balans"), formatFinanceOverviewMoney(health.monthlyBalance), health.monthlyBalance < 0 ? "negative" : "positive")}
          ${renderFinancialStatusRow("capital", financeOverviewT("capital", "Kapital"), formatFinanceOverviewMoney(assetData.netWorth), assetData.netWorth < 0 ? "negative" : "neutral")}
          ${renderFinancialStatusRow("reserve", financeOverviewT("reserve", "Rezerva"), reserveValue, health.reserveMonths !== null && health.reserveMonths < 1 ? "warning" : "neutral")}
          ${renderFinancialStatusRow("savings", financeOverviewT("savings", "Stednja"), health.savingsStatus.label, health.savingsStatus.tone)}
          ${renderFinancialStatusRow("warning", financeOverviewT("mainPressure", "Glavni pritisak"), health.pressure.label, health.pressure.tone)}
        </div>
      </div>
    </article>
  `;
}

function getPrimaryExpenseCategory(year) {
  const yearTransactions = transactions.filter((transaction) => {
    const date = new Date((transaction.date || "") + "T00:00:00");
    return !Number.isNaN(date.getTime()) && date.getFullYear() === year;
  });
  const highestTransactionCategory = getExpenseCategoryExtremes(yearTransactions).highest?.category;
  if (highestTransactionCategory) return highestTransactionCategory;
  const cashflowItem = [...cashflowExpenses, ...cashflowDebts]
    .sort((a, b) => Number(b.amount ?? b.monthly ?? 0) - Number(a.amount ?? a.monthly ?? 0))[0];
  return cashflowItem?.category || cashflowItem?.name || financeOverviewT("generalExpenses", "Opsti troskovi");
}

function renderMentorInsightPanel(stats) {
  const hasCashflowData = stats.totalIncome > 0 || stats.totalExpenses > 0;
  const title = !hasCashflowData
    ? financeOverviewT("emptySnapshotTitle", "Pregled ceka prve finansijske podatke.")
    : stats.yearlyDifference < 0
    ? financeOverviewT("expensesAboveIncomeTitle", "Troskovi su trenutno veci od prihoda.")
    : financeOverviewT("incomeCoversExpensesTitle", "Prihodi trenutno pokrivaju troskove.");
  const message = !hasCashflowData
    ? financeOverviewT("emptySnapshotMessage", "Dodaj transakcije ili tokove novca da bi mentor prepoznao najvazniji finansijski signal.")
    : financeOverviewT("primaryPressureMessage", "Najvece opterecenje dolazi iz meseca {{month}} i kategorije {{category}}.", {
      month: stats.highestExpenseMonth.month,
      category: getPrimaryExpenseCategory(stats.year)
    });
  return `
    <article class="mentor-card finance-overview-mentor-panel finance-overview-mentor-snapshot">
      <div class="finance-overview-panel-head compact">
        <div class="finance-overview-title-with-icon">
          <span class="finance-overview-icon" aria-hidden="true">${renderFinanceOverviewIcon("sparkles")}</span>
          <h2>${escapeHtml(financeOverviewT("mentorInsight", "Mentor uvid"))}</h2>
        </div>
      </div>
      <div class="finance-overview-mentor-visual" aria-hidden="true">${renderFinanceOverviewIcon(stats.yearlyDifference < 0 ? "expense" : "income")}</div>
      <div class="finance-overview-mentor-copy">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(message)}</p>
      </div>
      <button class="btn finance-overview-mentor-cta" type="button" data-open-finance-tab="income">
        <span>${escapeHtml(financeOverviewT("viewCashflow", "Pogledaj tokove novca"))}</span><span aria-hidden="true">›</span>
      </button>
    </article>
  `;
}

function renderBudgetOverviewPanel() {
  const budgetData = getFinanceOverviewBudgetData();
  const totalSpent = budgetData.reduce((sum, item) => sum + item.spent, 0);
  const totalLimit = budgetData.reduce((sum, item) => sum + item.limit, 0);
  return `
    <article class="mentor-card finance-overview-budget-panel">
      <div class="finance-overview-panel-head">
        <div>
          <h2>${escapeHtml(financeOverviewT("currentMonthBudget", "Budzet ovog meseca"))}</h2>
          <p>${escapeHtml(financeOverviewT("currentMonthBudgetSubtitle", "Pregled limita po kategorijama i prostora koji ostaje."))}</p>
        </div>
      </div>
      ${budgetData.length ? `
        <div class="finance-overview-progress-list">
          ${budgetData.map((item) => {
            const percent = Math.min(100, Math.round((item.spent / item.limit) * 100));
            return `
              <div class="finance-overview-progress-item">
                <div><strong>${escapeHtml(item.category)}</strong><span>${formatFinanceOverviewMoney(item.spent)} / ${formatFinanceOverviewMoney(item.limit)}</span><em>${percent}%</em></div>
                <div class="finance-overview-progress-track"><span style="width: ${percent}%"></span></div>
              </div>
            `;
          }).join("")}
        </div>
        <div class="finance-overview-panel-footer">
          <strong>${escapeHtml(financeOverviewT("totalSpent", "Ukupno potroseno: {{spent}} / {{limit}}", { spent: formatFinanceOverviewMoney(totalSpent), limit: formatFinanceOverviewMoney(totalLimit) }))}</strong>
          <button class="ghost-btn" type="button" data-open-finance-tab="budget">${escapeHtml(financeOverviewT("openBudget", "Otvori budzet"))}</button>
        </div>
      ` : `
        <div class="finance-overview-empty-state">
          <div class="finance-overview-icon" aria-hidden="true">-</div>
          <h3>${escapeHtml(financeOverviewT("noBudgetPanelTitle", "Budzet jos nije postavljen"))}</h3>
          <p>${escapeHtml(financeOverviewT("noBudgetPanelMessage", "Budzet ti pomaze da vidis gde novac odlazi, da prepoznas male troskove koji se ponavljaju i da lakse oslobodis prostor za ciljeve."))}</p>
          <button class="ghost-btn" type="button" data-open-finance-tab="budget">${escapeHtml(financeOverviewT("setBudget", "Postavi budzet"))}</button>
        </div>
      `}
    </article>
  `;
}

function renderFinancialGoalsOverviewPanel() {
  const financialGoals = getFinanceOverviewGoals();
  return `
    <article class="mentor-card finance-overview-goals-panel">
      <div class="finance-overview-panel-head">
        <div>
          <h2>${escapeHtml(financeOverviewT("activeFinancialGoals", "Aktivni finansijski ciljevi"))}</h2>
          <p>${escapeHtml(financeOverviewT("activeFinancialGoalsSubtitle", "Ciljevi koji trenutno daju pravac novcu."))}</p>
        </div>
      </div>
      ${financialGoals.length ? `
        <div class="finance-overview-goal-list">
          ${financialGoals.map((goal) => {
            const percent = Math.min(100, Math.round((goal.saved / goal.target) * 100));
            return `
              <div class="finance-overview-goal-card">
                <div class="finance-overview-goal-head">
                  <strong>${escapeHtml(goal.name)}</strong>
                  <span>${escapeHtml(goal.status)}</span>
                </div>
                <div class="finance-overview-goal-meta">
                  <span>${escapeHtml(financeOverviewT("target", "Cilj: {{amount}}", { amount: formatFinanceOverviewMoney(goal.target) }))}</span>
                  <span>${escapeHtml(financeOverviewT("saved", "Izdvojeno: {{amount}}", { amount: formatFinanceOverviewMoney(goal.saved) }))}</span>
                  <span>${escapeHtml(financeOverviewT("monthlyAmount", "Mesecno: {{amount}}", { amount: formatFinanceOverviewMoney(goal.monthly) }))}</span>
                  <span>${escapeHtml(goal.plannedDate)}</span>
                </div>
                <div class="finance-overview-progress-track"><span style="width: ${percent}%"></span></div>
              </div>
            `;
          }).join("")}
        </div>
        <div class="finance-overview-panel-footer end">
          <button class="ghost-btn" type="button" data-open-finance-tab="budget">${escapeHtml(financeOverviewT("viewAllGoals", "Pogledaj sve ciljeve"))}</button>
        </div>
      ` : `
        <div class="finance-overview-empty-state">
          <div class="finance-overview-icon" aria-hidden="true">-</div>
          <h3>${escapeHtml(financeOverviewT("noGoalsTitle", "Nema aktivnih finansijskih ciljeva"))}</h3>
          <p>${escapeHtml(financeOverviewT("noGoalsMessage", "Ciljevi daju pravac novcu. Kada znas za sta odvajas, lakse je razlikovati ono sto ti je vazno od onoga sto samo trosi energiju."))}</p>
          <button class="ghost-btn" type="button" data-open-finance-tab="budget">${escapeHtml(financeOverviewT("createGoal", "Kreiraj cilj"))}</button>
        </div>
      `}
    </article>
  `;
}

function renderCapitalDirectionPanel() {
  const stats = getFinanceOverviewStats();
  const assetData = getFinanceOverviewAssetData();
  const directionText = stats.yearlyDifference >= 0
    ? financeOverviewT("positiveDirectionText", "Prihodi su veci od troskova, pa deo novca moze biti usmeren ka ciljevima ili fondu sigurnosti.")
    : financeOverviewT("negativeDirectionText", "Troskovi su trenutno veci od prihoda, pa je korisno proveriti tokove novca i mesecne obaveze.");
  return `
    <article class="mentor-card finance-overview-capital-panel">
      <div class="finance-overview-panel-head">
        <div>
          <h2>${escapeHtml(financeOverviewT("capitalDirectionTitle", "Kapital i pravac godine"))}</h2>
          <p>${escapeHtml(financeOverviewT("capitalDirectionSubtitle", "Trenutna slika imovine i finansijskog pravca."))}</p>
        </div>
      </div>
      <div class="finance-overview-capital-list">
        <span>${escapeHtml(financeOverviewT("totalCapital", "Ukupan kapital"))}: <strong>${formatFinanceOverviewMoney(assetData.totalCapital)}</strong></span>
        <span>${escapeHtml(financeOverviewT("liquidAssets", "Likvidna sredstva"))}: <strong>${formatFinanceOverviewMoney(assetData.liquidAssets)}</strong></span>
        <span>${escapeHtml(financeOverviewT("materialAssets", "Materijalna imovina"))}: <strong>${formatFinanceOverviewMoney(assetData.materialAssets)}</strong></span>
        <span>${escapeHtml(financeOverviewT("trackedAssets", "Pracena imovina"))}: <strong>${formatFinanceOverviewMoney(assetData.trackedAssets)}</strong></span>
        ${assetData.totalDebts ? `<span>${escapeHtml(financeOverviewT("debts", "Dugovi"))}: <strong>${formatFinanceOverviewMoney(assetData.totalDebts)}</strong></span>` : ""}
      </div>
      <div class="finance-overview-status-box">
        <strong>${escapeHtml(financeOverviewT("yearStatusSentence", "{{year}} je trenutno {{status}}.", { year: stats.year, status: stats.yearStatus.toLowerCase() }))}</strong>
        <p>${directionText}</p>
      </div>
      <button class="ghost-btn" type="button" data-open-finance-tab="assets">${escapeHtml(financeOverviewT("openAssets", "Otvori imovinu"))}</button>
    </article>
  `;
}

function renderFinanceOverview() {
  if (!financeOverviewRoot) return;
  const stats = getFinanceOverviewStats();
  const assetData = getFinanceOverviewAssetData();
  const availableYears = getFinanceOverviewYears();
  const summaryCards = [
    {
      title: financeOverviewT("income", "Prihod"),
      value: formatFinanceOverviewMoney(stats.totalIncome),
      icon: "income",
      tone: "income"
    },
    {
      title: financeOverviewT("expensePlural", "Troskovi"),
      value: formatFinanceOverviewMoney(stats.totalExpenses),
      icon: "expense",
      tone: "expense"
    },
    {
      title: financeOverviewT("capital", "Kapital"),
      value: formatFinanceOverviewMoney(assetData.netWorth),
      icon: "capital",
      tone: "capital"
    },
    {
      title: financeOverviewT("balance", "Balans"),
      value: formatFinanceOverviewMoney(stats.yearlyDifference),
      icon: "balance",
      tone: stats.yearlyDifference < 0 ? "balance negative" : "balance positive"
    }
  ];

  financeOverviewRoot.innerHTML = `
    <header class="finance-overview-hero">
      <div>
        <h1>${escapeHtml(financeT("overview.pageTitle", "Finansijski pregled"))}</h1>
        <p>${escapeHtml(financeOverviewT("snapshotSubtitle", "Brz i jasan pregled tvog trenutnog finansijskog stanja."))}</p>
      </div>
      <div class="finance-overview-top-controls">
        <label class="finance-overview-year-select">
          <span>${escapeHtml(financeT("overview.year", "Godina"))}</span>
          <select aria-label="${escapeHtml(financeT("overview.chooseYear", "Izaberi godinu"))}" data-finance-overview-year>
            ${availableYears.map((year) => `<option value="${year}" ${year === stats.year ? "selected" : ""}>${year}</option>`).join("")}
          </select>
        </label>
      </div>
    </header>
    <section class="finance-overview-summary-grid">
      ${summaryCards.map(renderFinanceOverviewSummaryCard).join("")}
    </section>
    <section class="finance-overview-main-grid">
      ${renderFinancialProfile(stats, assetData)}
      ${renderMentorInsightPanel(stats)}
    </section>
  `;
}
const BUDGET_ICON_OPTIONS = window.MentorIconSystem.budgetIcons;
const BUDGET_ICON_BY_CATEGORY = {
  hrana: "utensils",
  kafa: "coffee",
  restorani: "utensils",
  restoran: "utensils",
  stanovanje: "home",
  transport: "car",
  zdravlje: "heart-pulse",
  putovanje: "plane",
  dugovi: "receipt",
  oprema: "wallet",
  stednja: "target"
};
const todayIso = new Date().toISOString().slice(0, 10);
const IMPORT_TARGET_OPTIONS = [
  { value: "ignore", key: "ignore", label: "Ignori\u0161i" },
  { value: "date", key: "date", label: "Datum" },
  { value: "category", key: "category", label: "Kategorija" },
  { value: "type", key: "type", label: "Tip" },
  { value: "budget", key: "budget", label: "Bud\u017eet" },
  { value: "amount", key: "amount", label: "Iznos" },
  { value: "note", key: "note", label: "Bele\u0161ka" },
  { value: "linkedTo", key: "linkedTo", label: "Povezano sa" },
  { value: "balance", key: "balance", label: "Balance" },
  { value: "state", key: "state", label: "Status" }
];
const DEFAULT_TRANSACTION_IMPORT_TEMPLATES = [
  {
    id: "revolut",
    name: "Revolut",
    locked: true,
    mappings: {
      type: "type",
      product: "ignore",
      "started date": "ignore",
      "completed date": "date",
      description: "note",
      amount: "amount",
      fee: "ignore",
      currency: "ignore",
      state: "state",
      balance: "balance"
    }
  }
];
const savedFinanceState = loadStoredFinanceState();
let transactions = savedFinanceState.transactions;
let cashflowIncomes = savedFinanceState.cashflowIncomes;
let cashflowExpenses = savedFinanceState.cashflowExpenses;
let cashflowDebts = savedFinanceState.cashflowDebts;
let cashflowMonthCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let activeCashflowListType = "expense";
let editingCashflowItem = null;
let cashflowDebtSaveInProgress = false;
let budgets = savedFinanceState.budgets;
let importedTransactionFiles = savedFinanceState.importedTransactionFiles;
let categoryRules = savedFinanceState.categoryRules;
const selectedTransactionIds = new Set();
let pendingTransactionImport = null;
let selectedKeywordCategory = null;
let selectedBudgetId = budgets[0]?.id || null;
let editingBudgetId = null;
let scheduledTransactionListRender = null;
const ASSET_LIQUIDITY_LABELS = { high: "Visoka", medium: "Srednja", low: "Niska" };
const ASSET_ICON_BY_TYPE = {
  Kes: "wallet",
  "Bankovni racun": "landmark",
  Stednja: "piggy-bank",
  Crypto: "coins",
  Deonice: "chart-candlestick",
  Vozilo: "car",
  Oprema: "laptop",
  Nekretnina: "home",
  "Vredne stvari": "badge-check",
  Dug: "receipt",
  Ostalo: "circle-dot"
};
const ASSET_ICON_BY_TYPE_KEY = {
  kes: "wallet",
  bankovniracun: "landmark",
  stednja: "piggy-bank",
  crypto: "coins",
  deonice: "chart-candlestick",
  vozilo: "car",
  oprema: "laptop",
  nekretnina: "home",
  vrednestvari: "badge-check",
  dug: "receipt",
  ostalo: "circle-dot"
};
const ASSET_PRICE_CACHE_MS = 5 * 60 * 1000;
const ASSET_REFRESH_MS = 5 * 60 * 1000;
const LIQUID_ASSET_TYPES = new Set(["Kes", "Bankovni racun", "Stednja"]);
const MATERIAL_ASSET_TYPES = new Set(["Nekretnina", "Vozilo", "Oprema", "Vredne stvari"]);
const LIQUID_ASSET_TYPE_KEYS = new Set(["kes", "bankovniracun", "stednja"]);
const MATERIAL_ASSET_TYPE_KEYS = new Set(["nekretnina", "vozilo", "oprema", "vrednestvari"]);
const savedAssetState = loadStoredAssetState();
let assets = savedAssetState.assets;
let assetDebts = savedAssetState.debts;
const legacyAssetDebtMigrationPending = assetDebts.length > 0;
if (legacyAssetDebtMigrationPending) {
  const existingDebtKeys = new Set(cashflowDebts.map((debt) => [
    normalizeText(debt.name),
    Number(debt.balance || 0),
    Number(debt.monthly || 0)
  ].join("|")));
  const migratedDebts = assetDebts.map((debt) => ({
    id: "cashflow-" + String(debt.id || Date.now()),
    sourceAssetDebtId: String(debt.id || ""),
    name: debt.name || financeT("static.cashflow.debtName", "Dug"),
    icon: "credit-card",
    balance: Number(debt.remainingDebt ?? debt.totalDebt ?? 0),
    monthly: Number(debt.monthlyPayment || 0),
    frequency: "monthly",
    weekday: 1,
    note: debt.notes || "",
    createdAt: debt.createdAt || new Date().toISOString(),
    updatedAt: debt.updatedAt || debt.lastUpdatedAt || new Date().toISOString()
  })).filter((debt) => {
    const key = [normalizeText(debt.name), debt.balance, debt.monthly].join("|");
    if (existingDebtKeys.has(key)) return false;
    existingDebtKeys.add(key);
    return debt.balance > 0;
  });
  if (migratedDebts.length) cashflowDebts = [...migratedDebts, ...cashflowDebts];
}
let selectedAssetId = assets[0]?.id || null;
let editingAssetId = null;
let activeAssetDetailTab = "details";
let activeAssetMode = "liquid";
let assetPriceCache = new Map();
let assetRefreshTimer = null;
let assetSearchTimer = null;
let financialComparisonState = {
  selectedIdeaId: "",
  selectedDirectionId: "",
  selectedReferenceId: "",
  selectedOptionId: null,
  currentCapital: 2000,
  currentCapitalManual: false,
  monthlyContribution: 300,
  goalStartDate: todayIso,
  freeMonthlyAmount: 900,
  freeMonthlySource: "cashflow",
  addPanelOpen: false,
  editingOptionId: null,
  optionDraftName: "",
  optionDraftDirectionId: "",
  optionDraftReferenceId: "",
  optionDraftSecondaryDirectionIds: [],
  optionDraftSecondaryDirectionId: "",
  optionDraftSecondaryReferenceKeys: [],
  optionDraftPriceOverrides: {},
  optionDraftParticipation: 0,
  optionDraftParticipationManual: false,
  options: loadStoredFinancialComparisonOptions(),
  activeSnapshotId: "",
  savedComparisons: loadStoredFinancialComparisonSnapshots()
};

function setFinancialOptionModalLayer(isOpen) {
  document.body?.classList.toggle("financial-option-modal-open", Boolean(isOpen));
}

function loadStoredFinancialComparisonSnapshots() {
  try {
    return (window.MentorData?.repositories?.comparisons?.getSnapshots?.() || []).filter((item) => item && item.ideaId);
  } catch (error) {
    return [];
  }
}

function loadStoredFinancialComparisonOptions() {
  try {
    return (window.MentorData?.repositories?.comparisons?.getOptions?.() || []).filter((item) => item && item.ideaId);
  } catch (error) {
    return [];
  }
}

async function saveStoredFinancialComparisonSnapshots() {
  const repository = window.MentorData?.repositories?.comparisons;
  const result = await window.MentorDomainDurableSave.commit({
    read: () => repository.getSnapshots(),
    next: financialComparisonState.savedComparisons,
    save: (next) => repository.saveSnapshots(next),
    onError: () => showAssetStatus?.(financeT("statusMessages.comparisonSessionOnly", "Poredjenje je sacuvano u sesiji, ali browser nije dozvolio trajno cuvanje."), "danger")
  });
  if (!result.ok) financialComparisonState.savedComparisons = result.value;
  return result.ok;
}

async function saveStoredFinancialComparisonOptions() {
  const repository = window.MentorData?.repositories?.comparisons;
  const result = await window.MentorDomainDurableSave.commit({
    read: () => repository.getOptions(),
    next: financialComparisonState.options,
    save: (next) => repository.saveOptions(next),
    onError: () => showAssetStatus?.(financeT("statusMessages.comparisonSessionOnly", "Poredjenje je sacuvano u sesiji, ali browser nije dozvolio trajno cuvanje."), "danger")
  });
  if (!result.ok) financialComparisonState.options = result.value;
  return result.ok;
}

function syncFinancialComparisonsToDatabase() {
  return window.MentorData?.repositories?.comparisons?.getSnapshot?.() || null;
}

function loadFinancialIdeas() {
  const sourceIdeas = Array.isArray(window.brainstormingState?.ideas) ? window.brainstormingState.ideas : null;
  if (sourceIdeas) return sourceIdeas.map(normalizeFinancialIdea).filter(Boolean);
  try {
    const savedIdeas = window.MentorData?.repositories?.ideas?.getAll?.() || [];
    if (Array.isArray(savedIdeas)) return savedIdeas.map(normalizeFinancialIdea).filter(Boolean);
  } catch (error) {
    return [];
  }
  return [];
}

function normalizeFinancialIdea(idea) {
  if (!idea) return null;
  const directions = getRawIdeaDirections(idea).map((direction) => ({
    id: direction.id,
    ideaId: idea.id,
    name: getFinancialDirectionLabel(direction),
    label: getFinancialDirectionLabel(direction),
    icon: direction.icon || "compass",
    references: Array.isArray(direction.references) ? direction.references.map((reference) => normalizeFinancialReference(reference, direction.id)) : []
  }));
  return {
    id: idea.id,
    name: idea.title || idea.name || "Ideja",
    description: idea.description || "",
    image: idea.image || "icons/finansije-panel.png",
    directions
  };
}

function getFinancialDirectionLabel(direction) {
  const raw = direction?.title || direction?.name || direction?.label || direction?.type || "Pravac";
  return formatFinancialDirectionLabel(raw);
}

function formatFinancialDirectionLabel(value) {
  const raw = String(value || "").trim();
  if (!raw) return "Pravac";
  const readable = raw.includes(":") ? raw.split(":").pop() : raw;
  return readable
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getRawIdeaDirections(idea) {
  const pathData = idea?.pathData || {};
  const directions = Array.isArray(pathData.researchDirections) ? pathData.researchDirections : pathData.directions;
  return Array.isArray(directions) ? directions : [];
}

function normalizeFinancialReference(reference, directionId) {
  const price = getReferenceMoneyValue(reference);
  return {
    id: reference.id,
    directionId,
    title: reference.title || "Referenca",
    description: reference.note || reference.noteTitle || reference.link || "",
    price,
    currency: "EUR",
    image: reference.image || "",
    type: "reference",
    unitValue: reference.unitValue || "",
    unitLabel: reference.unitLabel || reference.unitCustom || reference.unitType || ""
  };
}

function getReferenceMoneyValue(reference) {
  const explicit = reference?.price ?? reference?.amount;
  if (explicit !== undefined && explicit !== null && explicit !== "") {
    const explicitValue = parseMoneyValue(explicit);
    return explicitValue > 0 ? explicitValue : 0;
  }
  const unitLabel = String(reference?.unitLabel || reference?.unitCustom || reference?.unitType || "").toLowerCase();
  const isMoneyUnit = /eur|euro|rsd|din|usd|dollar|gbp|pound/.test(unitLabel);
  if (!isMoneyUnit) return 0;
  return parseMoneyValue(reference?.unitValue);
}

function parseMoneyValue(raw) {
  if (typeof raw === "number") return Number.isFinite(raw) && raw > 0 ? raw : 0;
  const normalized = String(raw).replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : 0;
}


function getFinancialIdea(id) {
  const ideas = getFinancialIdeas();
  return ideas.find((idea) => idea.id === id) || ideas[0] || null;
}

function getFinancialDirection(idea, directionId) {
  return idea?.directions.find((direction) => direction.id === directionId) || idea?.directions[0] || null;
}

function getFinancialReferences(ideaId = financialComparisonState.selectedIdeaId, directionId = financialComparisonState.selectedDirectionId) {
  const idea = getFinancialIdea(ideaId);
  const direction = getFinancialDirection(idea, directionId);
  return direction?.references || [];
}

function getFinancialReference(referenceId, ideaId, directionId) {
  return getFinancialReferences(ideaId, directionId).find((reference) => reference.id === referenceId) || null;
}

function getFinancialVisibleOptions() {
  return financialComparisonState.options.filter((option) => option.ideaId === financialComparisonState.selectedIdeaId);
}

function getFinancialSelectedOption() {
  const visibleOptions = getFinancialVisibleOptions();
  return visibleOptions.find((option) => option.id === financialComparisonState.selectedOptionId) || visibleOptions[0] || null;
}

function getFinancialOptionEntries(option) {
  return Array.isArray(option?.entries) ? option.entries : [];
}

function syncFinancialLiquidAssets() {
  const liquidAssetsTotal = getAssetTotals().liquidAssetsTotal;
  financialComparisonState.availableLiquidAssets = liquidAssetsTotal;
  if (!financialComparisonState.currentCapitalManual) {
    financialComparisonState.currentCapital = liquidAssetsTotal;
  } else {
    financialComparisonState.currentCapital = Math.min(Number(financialComparisonState.currentCapital || 0), liquidAssetsTotal);
  }
  return liquidAssetsTotal;
}


function getFinancialAvailableMonthlyAmount() {
  syncFinancialLiquidAssets();
  return Number(getCashflowPlanTotals?.().result || 0);
}

function syncFinancialFreeMonthlyAmount() {
  financialComparisonState.freeMonthlyAmount = getFinancialAvailableMonthlyAmount();
}

function addFinancialMonths(dateValue, monthCount) {
  const startDate = parseCashflowDate(dateValue) || new Date();
  const result = new Date(startDate);
  result.setMonth(result.getMonth() + Math.max(0, Number(monthCount || 0)));
  return result;
}

function getFinancialCompletionDateLabel(monthsToGoal) {
  if (monthsToGoal == null) return financeT("static.comparison.enterMonthlyContribution", "Unesi mesecno izdvajanje");
  const completionDate = addFinancialMonths(financialComparisonState.goalStartDate || todayIso, monthsToGoal);
  return formatDateLabel(formatCashflowDateValue(completionDate));
}

function getFinancialDefaultParticipation() {
  return Math.max(0, Number(financialComparisonState.currentCapital || 0));
}

function clampFinancialParticipation(value, optionTotalCost = Infinity) {
  const availableParticipation = getFinancialDefaultParticipation();
  return Math.min(Math.max(Number(value || 0), 0), availableParticipation, optionTotalCost);
}

function getFinancialMetrics(option) {
  const optionTotalCost = getFinancialOptionEntries(option).reduce((sum, entry) => sum + getFinancialEntryPrice(option, entry), 0);
  syncFinancialLiquidAssets();
  const currentCapital = Number(financialComparisonState.currentCapital || 0);
  const monthlyContribution = Number(financialComparisonState.monthlyContribution || 0);
  const freeMonthlyAmount = Number(financialComparisonState.freeMonthlyAmount || 0);
  const hasParticipationOverride = option?.participationManual === true
    || (option?.participationManual === undefined && Number(option?.participationOverride || 0) > 0);
  const participationSource = hasParticipationOverride ? Number(option.participationOverride || 0) : getFinancialDefaultParticipation();
  const participationAmount = clampFinancialParticipation(participationSource, optionTotalCost);
  const missingAmount = Math.max(optionTotalCost - participationAmount, 0);
  const monthsToGoal = missingAmount === 0 ? 0 : (monthlyContribution > 0 ? Math.ceil(missingAmount / monthlyContribution) : null);
  const capitalAfter = Math.max(currentCapital - participationAmount, 0);
  const weeklyContribution = monthlyContribution / 4;
  const yearlyContribution = monthlyContribution * 12;
  const monthlyPressureAmount = missingAmount > 0 ? missingAmount / 12 : 0;
  const budgetPressure = freeMonthlyAmount > 0 ? monthlyPressureAmount / freeMonthlyAmount : null;
  return {
    optionTotalCost,
    participationAmount,
    missingAmount,
    monthsToGoal,
    capitalAfter,
    weeklyContribution,
    yearlyContribution,
    monthlyPressureAmount,
    budgetPressure,
    pressureStatus: getFinancialPressureStatus(budgetPressure),
    financialStatus: getFinancialStatus(missingAmount, monthsToGoal),
    completionDateLabel: getFinancialCompletionDateLabel(monthsToGoal)
  };
}

function getFinancialPressureStatus(budgetPressure) {
  if (budgetPressure == null) return { label: financeT("static.comparison.noData", "Nema podatka"), tone: "neutral" };
  const percent = Math.round(budgetPressure * 100);
  if (budgetPressure <= 0.1) return { label: financeT("static.comparison.minimalImpact", "Minimalan uticaj ({{percent}}%)", { percent }), tone: "very-good", percent, level: 1 };
  if (budgetPressure <= 0.2) return { label: financeT("static.comparison.manageable", "Uklopivo ({{percent}}%)", { percent }), tone: "good", percent, level: 2 };
  if (budgetPressure <= 0.35) return { label: financeT("static.comparison.needsPlanning", "Zahteva planiranje ({{percent}}%)", { percent }), tone: "medium", percent, level: 3 };
  if (budgetPressure <= 0.5) return { label: financeT("static.comparison.needsAttention", "Zahteva paznju ({{percent}}%)", { percent }), tone: "high", percent, level: 4 };
  return { label: financeT("static.comparison.needsSeriousPlanning", "Zahteva ozbiljno planiranje ({{percent}}%)", { percent }), tone: "danger", percent, level: 5 };
}

function getFinancialStatus(missingAmount, monthsToGoal) {
  if (missingAmount === 0) return { label: financeT("static.comparison.canStartNow", "Moze odmah"), tone: "good" };
  if (monthsToGoal == null) return { label: financeT("static.comparison.enterContribution", "Unesi izdvajanje"), tone: "danger" };
  if (monthsToGoal <= 3) return { label: financeT("static.comparison.possibleSoon", "Mogu uskoro"), tone: "good" };
  if (monthsToGoal <= 12) return { label: financeT("static.comparison.realisticWithPlan", "Realno uz plan"), tone: "medium" };
  return { label: financeT("static.comparison.longTermGoal", "Dugorocan cilj"), tone: "danger" };
}

function getFinancialResultStatus(metrics) {
  if (!metrics) return { label: financeT("static.comparison.selectOptionShort", "Selektuj opciju."), tone: "neutral" };
  if (metrics.missingAmount === 0) return { label: financeT("static.comparison.canStartNow", "Moze odmah"), tone: "good" };
  if (metrics.pressureStatus.tone === "danger") return { label: financeT("static.comparison.needsSeriousPlanning", "Zahteva ozbiljno planiranje", { percent: "" }).replace(/\s*\(\s*%\s*\)/, ""), tone: "danger" };
  if (metrics.pressureStatus.tone === "high") return { label: financeT("static.comparison.needsAttention", "Zahteva paznju", { percent: "" }).replace(/\s*\(\s*%\s*\)/, ""), tone: "high" };
  if (metrics.monthsToGoal <= 6) return { label: financeT("static.comparison.financiallyEasiest", "Finansijski najlakse"), tone: "good" };
  if (metrics.monthsToGoal <= 18) return { label: financeT("static.comparison.realisticallyAchievable", "Realno ostvarivo"), tone: "medium" };
  return { label: financeT("static.comparison.planningNeeded", "Potrebno planiranje"), tone: "danger" };
}

function getFinancialProgress(value, max) {
  if (!max) return 0;
  return Math.max(6, Math.min(100, Math.round((value / max) * 100)));
}

function getFinancialOptionTone(option, maxMonths) {
  const metrics = getFinancialMetrics(option);
  if (metrics.pressureStatus.tone === "danger" || (metrics.monthsToGoal || 0) > Math.max(18, maxMonths * 0.75)) return "danger";
  if (metrics.pressureStatus.tone === "high") return "high";
  if (metrics.pressureStatus.tone === "medium" || (metrics.monthsToGoal || 0) > 12) return "medium";
  return "good";
}

function getFinancialIdeaIndex() {
  return Math.max(0, getFinancialIdeas().findIndex((idea) => idea.id === financialComparisonState.selectedIdeaId));
}

async function setFinancialIdeaByOffset(offset) {
  const ideas = getFinancialIdeas();
  if (!ideas.length) return;
  updateActiveFinancialComparisonSnapshot();
  const currentIndex = getFinancialIdeaIndex();
  const nextIndex = (currentIndex + offset + ideas.length) % ideas.length;
  const nextIdea = ideas[nextIndex];
  const firstDirection = getFinancialFirstReferenceDirection(nextIdea);
  financialComparisonState.selectedIdeaId = nextIdea.id;
  financialComparisonState.selectedDirectionId = firstDirection?.id || "";
  financialComparisonState.selectedReferenceId = firstDirection?.references?.[0]?.id || "";
  financialComparisonState.selectedOptionId = getFinancialVisibleOptions()[0]?.id || null;
  financialComparisonState.editingOptionId = null;
  financialComparisonState.optionDraftDirectionId = "";
  financialComparisonState.optionDraftReferenceId = "";
  financialComparisonState.optionDraftSecondaryDirectionId = "";
  financialComparisonState.optionDraftSecondaryReferenceKeys = [];
  financialComparisonState.optionDraftPriceOverrides = {};
  financialComparisonState.optionDraftParticipation = getFinancialDefaultParticipation();
  financialComparisonState.optionDraftParticipationManual = false;
  financialComparisonState.addPanelOpen = false;
  if (await persistFinancialComparisonBridge()) renderFinancialComparisonPage();
}

async function openFinancialComparisonForIdea(ideaId) {
  const idea = getFinancialIdea(ideaId);
  if (!idea) return;
  const existingOption = financialComparisonState.options.find((option) => option.ideaId === idea.id);
  const latestSnapshot = [...financialComparisonState.savedComparisons]
    .filter((snapshot) => snapshot.ideaId === idea.id)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0];
  if (!existingOption && latestSnapshot) {
    await loadFinancialComparisonSnapshot(latestSnapshot.id);
    return;
  }
  const firstDirection = getFinancialFirstReferenceDirection(idea);
  financialComparisonState.selectedIdeaId = idea.id;
  financialComparisonState.selectedDirectionId = firstDirection?.id || "";
  financialComparisonState.selectedReferenceId = firstDirection?.references?.[0]?.id || "";
  financialComparisonState.selectedOptionId = existingOption?.id || null;
  financialComparisonState.addPanelOpen = false;
  financialComparisonState.editingOptionId = null;
  renderFinancialComparisonPage();
}

function openFinancialIdeaResearch(ideaId) {
  if (!ideaId) return;
  if (typeof setView === "function") setView("brainstorming");
  if (window.Brainstorming?.openResearchIdeaById) {
    window.Brainstorming.openResearchIdeaById(ideaId);
  }
}

function setFinancialDirection(directionId) {
  financialComparisonState.selectedDirectionId = directionId;
  financialComparisonState.selectedReferenceId = getFinancialReferences(financialComparisonState.selectedIdeaId, directionId)[0]?.id || "";
  renderFinancialComparisonPage();
}

async function updateFinancialNumber(key, value) {
  const nextValue = Math.max(0, Number(value || 0));
  if (key === "currentCapital") {
    const liquidAssetsTotal = syncFinancialLiquidAssets();
    financialComparisonState.currentCapitalManual = true;
    financialComparisonState.currentCapital = Math.min(nextValue, liquidAssetsTotal);
  } else {
    financialComparisonState[key] = nextValue;
  }
  updateActiveFinancialComparisonSnapshot();
  if (await persistFinancialComparisonBridge()) renderFinancialComparisonPage();
}


async function addFinancialReferenceToOption(directionId, referenceId, priceOverride) {
  const option = getFinancialSelectedOption();
  const reference = getFinancialReference(referenceId, option?.ideaId, directionId);
  if (!option || !reference) return;
  option.entries = [...getFinancialOptionEntries(option), {
    id: "entry-" + Date.now(),
    directionId,
    referenceId,
    priceOverride: Number(priceOverride || reference.price || 0)
  }];
  updateActiveFinancialComparisonSnapshot();
  if (await persistFinancialComparisonBridge()) renderFinancialComparisonPage();
}

async function removeFinancialReferenceFromOption(entryId) {
  const option = getFinancialSelectedOption();
  if (!option) return;
  option.entries = getFinancialOptionEntries(option).filter((entry) => entry.id !== entryId);
  updateActiveFinancialComparisonSnapshot();
  if (await persistFinancialComparisonBridge()) renderFinancialComparisonPage();
}

async function deleteFinancialOption(optionId) {
  financialComparisonState.options = financialComparisonState.options.filter((option) => option.id !== optionId);
  financialComparisonState.selectedOptionId = getFinancialVisibleOptions()[0]?.id || null;
  updateActiveFinancialComparisonSnapshot();
  if (await persistFinancialComparisonBridge()) renderFinancialComparisonPage();
}

function getSavedFinancialComparisonsForIdea(ideaId) {
  return financialComparisonState.savedComparisons.filter((item) => item.ideaId === ideaId);
}

function getCurrentFinancialComparisonSnapshotData(base = {}) {
  const idea = getFinancialIdea(financialComparisonState.selectedIdeaId);
  if (!idea) return null;
  const liquidAssets = syncFinancialLiquidAssets();
  const visibleOptions = getFinancialVisibleOptions();
  const selectedOption = getFinancialSelectedOption();
  const selectedMetrics = selectedOption ? getFinancialMetrics(selectedOption) : null;
  return {
    ...base,
    ideaId: idea.id,
    selectedOptionId: financialComparisonState.selectedOptionId,
    currentCapital: financialComparisonState.currentCapital,
    currentCapitalManual: financialComparisonState.currentCapitalManual,
    monthlyContribution: financialComparisonState.monthlyContribution,
    goalStartDate: financialComparisonState.goalStartDate,
    freeMonthlySource: financialComparisonState.freeMonthlySource,
    liquidAssets,
    optionCount: visibleOptions.length,
    selectedCost: selectedMetrics?.optionTotalCost || 0,
    selectedMissing: selectedMetrics?.missingAmount || 0,
    options: JSON.parse(JSON.stringify(visibleOptions))
  };
}

function updateActiveFinancialComparisonSnapshot() {
  if (!financialComparisonState.activeSnapshotId) return;
  const index = financialComparisonState.savedComparisons.findIndex((item) => item.id === financialComparisonState.activeSnapshotId);
  if (index < 0) return;
  const activeSnapshot = financialComparisonState.savedComparisons[index];
  if (activeSnapshot.ideaId !== financialComparisonState.selectedIdeaId) return;
  const updated = getCurrentFinancialComparisonSnapshotData(activeSnapshot);
  if (!updated) return;
  financialComparisonState.savedComparisons[index] = updated;
}

function renumberFinancialComparisonSnapshots(ideaId) {
  let number = 1;
  financialComparisonState.savedComparisons = financialComparisonState.savedComparisons.map((snapshot) => {
    if (snapshot.ideaId !== ideaId) return snapshot;
    return { ...snapshot, number: number++ };
  });
}

async function saveCurrentFinancialComparisonSnapshot() {
  const idea = getFinancialIdea(financialComparisonState.selectedIdeaId);
  if (!idea) return;
  const ideaSnapshots = getSavedFinancialComparisonsForIdea(idea.id);
  const snapshot = getCurrentFinancialComparisonSnapshotData({
    id: "financial-snapshot-" + Date.now(),
    number: ideaSnapshots.length + 1,
    createdAt: new Date().toISOString()
  });
  if (!snapshot) return;
  financialComparisonState.savedComparisons = [...financialComparisonState.savedComparisons, snapshot];
  financialComparisonState.activeSnapshotId = snapshot.id;
  if (await persistFinancialComparisonBridge()) renderFinancialComparisonPage();
}

async function loadFinancialComparisonSnapshot(snapshotId) {
  if (financialComparisonState.activeSnapshotId && financialComparisonState.activeSnapshotId !== snapshotId) {
    updateActiveFinancialComparisonSnapshot();
  }
  const snapshot = financialComparisonState.savedComparisons.find((item) => item.id === snapshotId);
  if (!snapshot) return;
  financialComparisonState.activeSnapshotId = snapshot.id;
  financialComparisonState.selectedIdeaId = snapshot.ideaId;
  financialComparisonState.options = [
    ...financialComparisonState.options.filter((option) => option.ideaId !== snapshot.ideaId),
    ...JSON.parse(JSON.stringify(snapshot.options || []))
  ];
  financialComparisonState.selectedOptionId = snapshot.selectedOptionId || snapshot.options?.[0]?.id || null;
  financialComparisonState.currentCapitalManual = snapshot.currentCapitalManual === true;
  financialComparisonState.currentCapital = Number(snapshot.currentCapital ?? financialComparisonState.currentCapital ?? 0);
  financialComparisonState.monthlyContribution = Number(snapshot.monthlyContribution || financialComparisonState.monthlyContribution || 0);
  financialComparisonState.goalStartDate = snapshot.goalStartDate || financialComparisonState.goalStartDate || todayIso;
  financialComparisonState.freeMonthlySource = snapshot.freeMonthlySource === "capital" ? "capital" : "cashflow";
  financialComparisonState.addPanelOpen = false;
  financialComparisonState.editingOptionId = null;
  const idea = getFinancialIdea(snapshot.ideaId);
  const firstDirection = getFinancialFirstReferenceDirection(idea);
  financialComparisonState.selectedDirectionId = firstDirection?.id || "";
  financialComparisonState.selectedReferenceId = firstDirection?.references?.[0]?.id || "";
  if (await persistFinancialComparisonBridge()) renderFinancialComparisonPage();
}

async function deleteFinancialComparisonSnapshot(snapshotId) {
  const snapshot = financialComparisonState.savedComparisons.find((item) => item.id === snapshotId);
  if (!snapshot) return;
  if (!window.confirm(financeT("static.comparison.deleteSnapshotConfirm", "Obrisati poredjenje {{number}}?", { number: snapshot.number }))) return;
  financialComparisonState.savedComparisons = financialComparisonState.savedComparisons.filter((item) => item.id !== snapshotId);
  if (snapshot?.ideaId) renumberFinancialComparisonSnapshots(snapshot.ideaId);
  if (financialComparisonState.activeSnapshotId === snapshotId) financialComparisonState.activeSnapshotId = "";
  if (await persistFinancialComparisonBridge()) renderFinancialComparisonPage();
}


function renderFinancialInputPanel() {
  const liquidAssets = syncFinancialLiquidAssets();
  return `
    <article class="mentor-card financial-input-panel">
      <div class="financial-panel-title"><small>${escapeHtml(financeT("static.comparison.myInputs", "MOJI UNOSI"))}</small></div>
      <label class="financial-money-input">
        <span><i aria-hidden="true">€</i>${escapeHtml(financeT("static.comparison.liquidAssets", "Likvidna sredstva za koriscenje"))}</span>
        <input data-financial-input="currentCapital" type="number" min="0" max="${liquidAssets}" step="10" value="${financialComparisonState.currentCapital}" />
        <em aria-hidden="true">OK</em>
        <small>${escapeHtml(financeT("static.comparison.availableTotal", "Ukupno dostupno: {{amount}}", { amount: formatMoney(liquidAssets) }))}</small>
      </label>
      <label class="financial-money-input">
        <span><i aria-hidden="true">-&gt;</i>${escapeHtml(financeT("static.comparison.monthlyContribution", "Mesecno izdvajanje"))}</span>
        <input data-financial-input="monthlyContribution" type="number" min="0" step="10" value="${financialComparisonState.monthlyContribution}" />
        <em aria-hidden="true">OK</em>
      </label>
      <label class="financial-money-input financial-date-input">
        <span><i aria-hidden="true">-&gt;</i>${escapeHtml(financeT("static.comparison.goalStartDate", "Start datum cilja"))}</span>
        <input data-financial-date="goalStartDate" type="date" value="${escapeHtml(financialComparisonState.goalStartDate || todayIso)}" />
        <em aria-hidden="true">OK</em>
      </label>
      <p class="financial-updated">${escapeHtml(financeT("static.comparison.lastUpdated", "Poslednje azuriranje: danas u 12:45"))}</p>
    </article>
  `;
}

function renderFinancialResultPanel(option, metrics) {
  if (!option || !metrics) {
    return `<article class="mentor-card financial-result-panel"><div class="financial-panel-title"><small>${escapeHtml(financeT("static.comparison.selectedResult", "REZULTAT SELEKTOVANE OPCIJE"))}</small></div><div class="financial-empty-state compact"><h3>${escapeHtml(financeT("static.comparison.selectOption", "Selektuj opciju da vidis rezultat."))}</h3></div></article>`;
  }
  const completionTone = metrics.monthsToGoal == null ? "danger" : metrics.financialStatus.tone;
  const timeLabel = metrics.monthsToGoal == null ? financeT("static.comparison.noPlan", "Nema plana") : financeT("static.comparison.months", "{{count}} meseci", { count: metrics.monthsToGoal });
  return `
    <article class="mentor-card financial-result-panel">
      <div class="financial-panel-title"><small>${escapeHtml(financeT("static.comparison.selectedResult", "REZULTAT SELEKTOVANE OPCIJE"))}</small></div>
      <div class="financial-result-grid">
        <div><span>${escapeHtml(financeT("static.comparison.participation", "Ucesce"))}</span><strong>${formatMoney(metrics.participationAmount)}</strong></div>
        <div><span>${escapeHtml(financeT("static.comparison.monthlyContribution", "Mesecno izdvajanje"))}</span><strong>${formatMoney(financialComparisonState.monthlyContribution)}</strong></div>
      </div>
      <div class="financial-result-line"><span>${escapeHtml(financeT("static.comparison.planDuration", "Trajanje plana"))}</span><strong>${escapeHtml(timeLabel)}</strong><em>${escapeHtml(financeT("static.comparison.planDurationHint", "Od start datuma do izvrsenja cilja"))}</em></div>
      <div class="financial-payment-box">
        <strong>${escapeHtml(financeT("static.comparison.paymentMethods", "Nacini placanja"))}</strong>
        <span>${escapeHtml(financeT("static.comparison.monthly", "Mesecno"))} <b>${formatMoney(financialComparisonState.monthlyContribution)}</b></span>
        <span>${escapeHtml(financeT("static.comparison.weekly", "Nedeljno"))} <b>${formatMoney(metrics.weeklyContribution)}</b></span>
        <span>${escapeHtml(financeT("static.comparison.yearly", "Godisnje"))} <b>${formatMoney(metrics.yearlyContribution)}</b></span>
      </div>
      <div class="financial-status-row"><span>${escapeHtml(financeT("static.comparison.completionDate", "Datum do ostvarenja"))}</span><strong class="${completionTone}">${escapeHtml(metrics.completionDateLabel)}</strong></div>
    </article>
  `;
}





function renderFinancialComparisonTable(options) {
  if (!options.length) {
    return `<section class="mentor-card financial-bottom-panel"><div class="financial-empty-state"><h3>${escapeHtml(financeT("static.comparison.noOptionsTitle", "Jos nema opcija za poredjenje."))}</h3><p>${escapeHtml(financeT("static.comparison.noOptionsText", "Dodaj pravac iz referenci da bi uporedio finansijsku realnost."))}</p></div></section>`;
  }
  const metricsList = options.map((option) => getFinancialMetrics(option));
  const maxTotal = Math.max(...metricsList.map((metrics) => metrics.optionTotalCost), 1);
  const maxMissing = Math.max(...metricsList.map((metrics) => metrics.missingAmount), 1);
  const maxMonths = Math.max(...metricsList.map((metrics) => metrics.monthsToGoal || 0), 1);
  return `
    <section class="mentor-card financial-bottom-panel">
      <div class="financial-comparison-columns">
        ${options.map((option, index) => {
          const metrics = getFinancialMetrics(option);
          const tone = getFinancialOptionTone(option, maxMonths);
          return `<article class="financial-comparison-column"><h4>${escapeHtml(financeT("static.comparison.option", "OPCIJA"))} ${String.fromCharCode(65 + index)} - ${escapeHtml(getFinancialOptionTitle(option))}</h4>${renderFinancialMetricRow(financeT("static.comparison.totalCost", "Ukupan trosak"), formatMoney(metrics.optionTotalCost), getFinancialProgress(metrics.optionTotalCost, maxTotal), tone)}${renderFinancialMetricRow(financeT("static.comparison.missing", "Nedostaje"), formatMoney(metrics.missingAmount), getFinancialProgress(metrics.missingAmount, maxMissing), metrics.missingAmount ? tone : "good")}${renderFinancialMetricRow(financeT("static.comparison.participation", "Ucesce"), formatMoney(metrics.participationAmount), getFinancialProgress(metrics.participationAmount, Math.max(financialComparisonState.currentCapital, 1)), metrics.participationAmount ? "good" : "medium")}${renderFinancialMetricRow(financeT("static.comparison.monthlyContribution", "Mesecno izdvajanje"), formatMoney(financialComparisonState.monthlyContribution), getFinancialProgress(financialComparisonState.monthlyContribution, Math.max(financialComparisonState.freeMonthlyAmount, 1)), metrics.pressureStatus.tone)}${renderFinancialMetricRow(financeT("static.comparison.completionDate", "Datum ostvarenja"), metrics.monthsToGoal == null ? "-" : metrics.completionDateLabel, getFinancialProgress(metrics.monthsToGoal || 0, maxMonths), tone)}<div class="financial-metric-status"><span>${escapeHtml(financeT("static.comparison.budgetImpact", "Uticaj na budzet"))}</span><strong class="${metrics.pressureStatus.tone}">${escapeHtml(metrics.pressureStatus.label)}</strong></div></article>`;
        }).join("")}
      </div>
    </section>
  `;
}

function renderFinancialMetricRow(label, value, progress, tone) {
  return `<div class="financial-metric-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><i class="${escapeHtml(tone)}"><b style="width:${progress}%"></b></i></div>`;
}

function renderFinancialComparisonPage() {
  setFinancialOptionModalLayer(financialComparisonState.addPanelOpen && Boolean(financialComparisonRoot));
  if (!financialComparisonRoot) return;
  syncFinancialFreeMonthlyAmount();
  const ideas = getFinancialIdeas();
  if (!ideas.length) {
    setFinancialOptionModalLayer(false);
    financialComparisonRoot.innerHTML = '<div class="mentor-card financial-empty-state"><h3>' + escapeHtml(financeT("static.comparison.noIdeasTitle", "Jos nema ideja za poredjenje.")) + '</h3><p>' + escapeHtml(financeT("static.comparison.noIdeasText", "Dodaj ideju u Brainstorming modulu da bi je koristio ovde.")) + '</p></div>';
    return;
  }
  if (!financialComparisonState.selectedIdeaId || !ideas.some((item) => item.id === financialComparisonState.selectedIdeaId)) {
    financialComparisonState.selectedIdeaId = ideas[0].id;
  }
  const idea = getFinancialIdea(financialComparisonState.selectedIdeaId);
  if (!financialComparisonState.selectedDirectionId || !idea?.directions.some((item) => item.id === financialComparisonState.selectedDirectionId)) {
    financialComparisonState.selectedDirectionId = getFinancialFirstReferenceDirection(idea)?.id || "";
  }
  const direction = getFinancialDirection(idea, financialComparisonState.selectedDirectionId);
  if (!idea) {
    setFinancialOptionModalLayer(false);
    return;
  }
  if (!direction) {
    const fallbackIdea = ideas.find((item) => (item.directions || []).some((candidate) => (candidate.references || []).length > 0));
    if (!fallbackIdea) {
      setFinancialOptionModalLayer(false);
      financialComparisonRoot.innerHTML = '<div class="mentor-card financial-empty-state"><h3>' + escapeHtml(financeT("static.comparison.noReferencesTitle", "Jos nema referenci za poredjenje.")) + '</h3><p>' + escapeHtml(financeT("static.comparison.noReferencesText", "Dodaj reference u Brainstorming modulu da bi ih koristio ovde.")) + '</p></div>';
      return;
    }
    financialComparisonState.selectedIdeaId = fallbackIdea.id;
    financialComparisonState.selectedDirectionId = fallbackIdea.directions.find((candidate) => (candidate.references || []).length > 0)?.id || fallbackIdea.directions[0]?.id || "";
    renderFinancialComparisonPage();
    return;
  }
  const references = getFinancialReferences(idea.id, direction.id);
  if (!financialComparisonState.selectedReferenceId || !references.some((item) => item.id === financialComparisonState.selectedReferenceId)) {
    financialComparisonState.selectedReferenceId = references[0]?.id || "";
  }
  const visibleOptions = getFinancialVisibleOptions();
  if (!financialComparisonState.selectedOptionId && visibleOptions[0]) financialComparisonState.selectedOptionId = visibleOptions[0].id;
  const selectedOption = getFinancialSelectedOption();
  const selectedMetrics = selectedOption ? getFinancialMetrics(selectedOption) : null;
  financialComparisonRoot.innerHTML = `
    <section class="financial-hero-grid">
      ${renderFinancialInputPanel()}
      ${renderFinancialIdeaCarousel(idea)}
      ${renderFinancialResultPanel(selectedOption, selectedMetrics)}
    </section>
    ${renderFinancialOptionsPanel(visibleOptions)}
    ${renderFinancialReferencesPanel(idea, direction, references, selectedOption)}
    ${renderFinancialComparisonTable(visibleOptions)}
  `;
  const ideaButton = financialComparisonRoot.querySelector("[data-financial-idea-current]");
  if (ideaButton && !ideaButton.querySelector("strong")) {
    const title = document.createElement("strong");
    title.textContent = idea.name;
    ideaButton.appendChild(title);
  }
}

function renderFinancialComparisonPagePreservingModalScroll() {
  const modalCard = financialComparisonRoot?.querySelector("[data-financial-option-modal] .financial-option-modal-card");
  const scrollTop = modalCard?.scrollTop || 0;
  const scrollLeft = modalCard?.scrollLeft || 0;
  renderFinancialComparisonPage();
  if (!modalCard) return;
  const restoreScroll = () => {
    const nextModalCard = financialComparisonRoot?.querySelector("[data-financial-option-modal] .financial-option-modal-card");
    if (!nextModalCard) return;
    nextModalCard.scrollTop = scrollTop;
    nextModalCard.scrollLeft = scrollLeft;
  };
  restoreScroll();
  window.requestAnimationFrame?.(restoreScroll);
}








function getFinancialDirectionPrimaryReference(direction) {
  return (direction?.references || []).find((reference) => Number(reference.price || 0) > 0)
    || direction?.references?.[0]
    || null;
}

function getFinancialEntryReference(option, entry) {
  const reference = getFinancialReference(entry.referenceId, option.ideaId, entry.directionId);
  if (reference) return reference;
  const direction = getFinancialDirection(getFinancialIdea(option.ideaId), entry.directionId);
  return getFinancialDirectionPrimaryReference(direction);
}

function getFinancialEntryPrice(option, entry) {
  const override = Number(entry.priceOverride);
  const reference = getFinancialEntryReference(option, entry);
  return Number.isFinite(override) && override > 0 ? override : Number(reference?.price || 0);
}


function renderFinancialIdeaCarousel(idea) {
  const ideas = getFinancialIdeas();
  const snapshots = getSavedFinancialComparisonsForIdea(idea.id);
  return `
    <article class="mentor-card financial-idea-panel">
      <div class="financial-carousel single compact">
        <button class="financial-arrow" type="button" data-financial-idea-prev aria-label="${escapeHtml(financeT("static.comparison.previousIdea", "Prethodna ideja"))}">&lt;</button>
        <button class="financial-idea-main compact" type="button" data-financial-idea-current data-financial-open-research="${escapeHtml(idea.id)}" aria-label="${escapeHtml(financeT("static.comparison.openResearchFor", "Otvori istrazivanje za {{name}}", { name: idea.name }))}">
          <img src="${escapeHtml(idea.image)}" alt="" />
        </button>
        <button class="financial-arrow" type="button" data-financial-idea-next aria-label="${escapeHtml(financeT("static.comparison.nextIdea", "Sledeca ideja"))}">&gt;</button>
      </div>
      <div class="financial-dots" aria-label="${escapeHtml(financeT("static.comparison.ideas", "Ideje"))}">
        ${ideas.map((item) => `<button type="button" data-financial-idea="${escapeHtml(item.id)}" class="${item.id === idea.id ? "active" : ""}" aria-label="${escapeHtml(item.name)}"></button>`).join("")}
      </div>
      <div class="financial-saved-strip" aria-label="${escapeHtml(financeT("static.comparison.savedComparisons", "Snimljena poredjenja"))}">
        <button class="financial-save-snapshot" type="button" data-financial-save-snapshot aria-label="${escapeHtml(financeT("static.comparison.saveSnapshot", "Snimi trenutno poredjenje"))}">+</button>
        <div class="financial-snapshot-row">
          ${snapshots.map((snapshot) => {
            const isActiveSnapshot = snapshot.id === financialComparisonState.activeSnapshotId;
            return `<span class="financial-snapshot-chip ${isActiveSnapshot ? "active" : ""}"><button type="button" data-financial-load-snapshot="${escapeHtml(snapshot.id)}">${snapshot.number}</button>${isActiveSnapshot ? `<button type="button" data-financial-delete-snapshot="${escapeHtml(snapshot.id)}" aria-label="${escapeHtml(financeT("static.comparison.removeSnapshot", "Ukloni snimak {{number}}", { number: snapshot.number }))}">x</button>` : ""}</span>`;
          }).join("")}
        </div>
      </div>
    </article>
  `;
}




function getFinancialIdeas() {
  return loadFinancialIdeas().filter((idea) => (idea.directions || []).some((direction) => (direction.references || []).length > 0));
}

function getFinancialFirstReferenceDirection(idea) {
  return (idea?.directions || []).find((direction) => (direction.references || []).length > 0)
    || idea?.directions?.[0]
    || null;
}



function renderFinancialOptionsPanel(options) {
  const slots = [0, 1, 2];
  return `
    <section class="mentor-card financial-options-panel tall">
      <div class="financial-option-grid fixed-slots">
        ${slots.map((slotIndex) => {
          const option = options[slotIndex];
          return option ? renderFinancialOptionCard(option, slotIndex) : `
            <button class="financial-option-empty" type="button" data-financial-toggle-add>
              <span>+</span>
              <strong>${escapeHtml(financeT("static.comparison.option", "OPCIJA"))} ${String.fromCharCode(65 + slotIndex)}</strong>
            </button>
          `;
        }).join("")}
      </div>
      ${financialComparisonState.addPanelOpen ? renderFinancialOptionPickerModal() : ""}
    </section>
  `;
}



function getFinancialReferenceKey(directionId, referenceId) {
  return `${directionId}::${referenceId}`;
}

function getFinancialDraftPrice(key, reference) {
  const override = financialComparisonState.optionDraftPriceOverrides?.[key];
  if (override !== undefined && override !== null && override !== "") return Number(override || 0);
  return Number(reference?.price || 0);
}

function renderFinancialReferencePriceInput(key, reference) {
  return `<input class="financial-reference-price-input" type="number" min="0" step="1" value="${getFinancialDraftPrice(key, reference)}" data-financial-reference-price-override="${escapeHtml(key)}" aria-label="${escapeHtml(financeT("static.comparison.priceForComparison", "Cena za poredjenje"))}" />`;
}

function createFinancialEntryForReference(direction, reference, role, priceOverride) {
  return {
    id: "entry-" + role + "-" + direction.id + "-" + (reference?.id || "ref") + "-" + Date.now() + "-" + Math.round(Math.random() * 1000),
    directionId: direction.id,
    referenceId: reference?.id || "",
    priceOverride: Number(priceOverride ?? reference?.price ?? 0),
    role
  };
}

function resetFinancialOptionDraft() {
  const idea = getFinancialIdea(financialComparisonState.selectedIdeaId);
  const firstDirection = getFinancialFirstReferenceDirection(idea);
  financialComparisonState.editingOptionId = null;
  financialComparisonState.optionDraftDirectionId = firstDirection?.id || "";
  financialComparisonState.optionDraftReferenceId = firstDirection?.references?.[0]?.id || "";
  financialComparisonState.optionDraftSecondaryDirectionId = idea?.directions.find((direction) => direction.id !== firstDirection?.id && (direction.references || []).length > 0)?.id || firstDirection?.id || "";
  financialComparisonState.optionDraftSecondaryDirectionIds = [];
  financialComparisonState.optionDraftSecondaryReferenceKeys = [];
  financialComparisonState.optionDraftPriceOverrides = {};
  financialComparisonState.optionDraftParticipation = getFinancialDefaultParticipation();
  financialComparisonState.optionDraftParticipationManual = false;
}

function openFinancialOptionEditor(optionId) {
  const option = financialComparisonState.options.find((item) => item.id === optionId);
  const entries = getFinancialOptionEntries(option);
  const mainEntry = entries.find((entry) => entry.id === option?.mainEntryId) || entries[0];
  if (!option || !mainEntry) return;
  const secondaryKeys = entries
    .filter((entry) => entry.id !== mainEntry.id)
    .map((entry) => `${entry.directionId}::${entry.referenceId}`)
    .filter((key) => !key.endsWith("::"));
  const priceOverrides = entries.reduce((acc, entry) => {
    if (entry.directionId && entry.referenceId) acc[getFinancialReferenceKey(entry.directionId, entry.referenceId)] = Number(entry.priceOverride || 0);
    return acc;
  }, {});
  financialComparisonState.selectedOptionId = option.id;
  financialComparisonState.editingOptionId = option.id;
  financialComparisonState.optionDraftDirectionId = mainEntry.directionId || "";
  financialComparisonState.optionDraftReferenceId = mainEntry.referenceId || "";
  financialComparisonState.optionDraftSecondaryDirectionId = secondaryKeys[0]?.split("::")[0] || optionDraftFallbackSecondaryDirection(mainEntry.directionId);
  financialComparisonState.optionDraftSecondaryDirectionIds = [];
  financialComparisonState.optionDraftSecondaryReferenceKeys = secondaryKeys;
  financialComparisonState.optionDraftPriceOverrides = priceOverrides;
  const hasParticipationOverride = option.participationManual === true
    || (option.participationManual === undefined && Number(option.participationOverride || 0) > 0);
  financialComparisonState.optionDraftParticipationManual = hasParticipationOverride;
  financialComparisonState.optionDraftParticipation = hasParticipationOverride ? Number(option.participationOverride || 0) : getFinancialDefaultParticipation();
  financialComparisonState.addPanelOpen = true;
  renderFinancialComparisonPage();
}

function optionDraftFallbackSecondaryDirection(mainDirectionId) {
  const idea = getFinancialIdea(financialComparisonState.selectedIdeaId);
  const directions = (idea?.directions || []).filter((direction) => (direction.references || []).length > 0);
  return directions.find((direction) => direction.id !== mainDirectionId)?.id || directions[0]?.id || "";
}

async function addFinancialComparisonOption(mainDirectionId, mainReferenceId, secondaryKeys = [], priceOverrides = financialComparisonState.optionDraftPriceOverrides || {}) {
  const idea = getFinancialIdea(financialComparisonState.selectedIdeaId);
  const mainDirection = getFinancialDirection(idea, mainDirectionId || financialComparisonState.optionDraftDirectionId || financialComparisonState.selectedDirectionId);
  const mainReference = getFinancialReference(mainReferenceId || financialComparisonState.optionDraftReferenceId, idea?.id, mainDirection?.id)
    || getFinancialDirectionPrimaryReference(mainDirection);
  if (!idea || !mainDirection || !mainReference) return;
  const visibleCount = getFinancialVisibleOptions().length;
  const mainEntryKey = getFinancialReferenceKey(mainDirection.id, mainReference.id);
  const mainEntry = createFinancialEntryForReference(mainDirection, mainReference, "main", priceOverrides[mainEntryKey]);
  const secondaryEntries = secondaryKeys.map((key) => {
    const parts = String(key).split("::");
    const direction = getFinancialDirection(idea, parts[0]);
    const reference = getFinancialReference(parts[1], idea.id, parts[0]);
    if (direction?.id === mainDirection.id && reference?.id === mainReference.id) return null;
    return direction && reference ? createFinancialEntryForReference(direction, reference, "secondary", priceOverrides[getFinancialReferenceKey(direction.id, reference.id)]) : null;
  }).filter(Boolean);
  const option = {
    id: financialComparisonState.editingOptionId || "option-" + Date.now(),
    ideaId: idea.id,
    name: mainReference.title || mainDirection.label || "Opcija " + String.fromCharCode(65 + (visibleCount % 26)),
    mainEntryId: mainEntry.id,
    entries: [mainEntry, ...secondaryEntries],
    participationOverride: financialComparisonState.optionDraftParticipationManual ? clampFinancialParticipation(financialComparisonState.optionDraftParticipation) : null,
    participationManual: financialComparisonState.optionDraftParticipationManual === true
  };
  if (option.participationOverride != null) {
    const optionTotalCost = getFinancialOptionEntries(option).reduce((sum, entry) => sum + getFinancialEntryPrice(option, entry), 0);
    option.participationOverride = clampFinancialParticipation(option.participationOverride, optionTotalCost);
  }
  if (financialComparisonState.editingOptionId) {
    financialComparisonState.options = financialComparisonState.options.map((item) => item.id === financialComparisonState.editingOptionId ? option : item);
  } else {
    financialComparisonState.options.push(option);
  }
  financialComparisonState.selectedOptionId = option.id;
  financialComparisonState.editingOptionId = null;
  financialComparisonState.optionDraftDirectionId = "";
  financialComparisonState.optionDraftReferenceId = "";
  financialComparisonState.optionDraftSecondaryDirectionId = "";
  financialComparisonState.optionDraftSecondaryReferenceKeys = [];
  financialComparisonState.optionDraftPriceOverrides = {};
  financialComparisonState.optionDraftParticipation = getFinancialDefaultParticipation();
  financialComparisonState.optionDraftParticipationManual = false;
  financialComparisonState.addPanelOpen = false;
  updateActiveFinancialComparisonSnapshot();
  if (await persistFinancialComparisonBridge()) renderFinancialComparisonPage();
}

function renderFinancialOptionPickerModal() {
  const idea = getFinancialIdea(financialComparisonState.selectedIdeaId);
  const directions = (idea?.directions || []).filter((direction) => (direction.references || []).length > 0);
  const mainDirectionId = financialComparisonState.optionDraftDirectionId || directions[0]?.id || "";
  const mainDirection = getFinancialDirection(idea, mainDirectionId);
  const mainReferences = mainDirection?.references || [];
  const mainReferenceId = financialComparisonState.optionDraftReferenceId || mainReferences[0]?.id || "";
  const secondaryDirectionId = financialComparisonState.optionDraftSecondaryDirectionId
    || directions.find((direction) => direction.id !== mainDirectionId)?.id
    || directions[0]?.id
    || "";
  const secondaryDirection = getFinancialDirection(idea, secondaryDirectionId);
  const secondaryKeys = new Set(financialComparisonState.optionDraftSecondaryReferenceKeys || []);
  const selectedSecondaryReferences = Array.from(secondaryKeys).map((key) => {
    const parts = String(key).split("::");
    const selectedDirection = getFinancialDirection(idea, parts[0]);
    const selectedReference = getFinancialReference(parts[1], idea?.id, parts[0]);
    return selectedDirection && selectedReference ? { direction: selectedDirection, reference: selectedReference } : null;
  }).filter(Boolean);
  return `
    <div class="financial-option-modal" data-financial-option-modal>
      <div class="financial-option-modal-backdrop"></div>
      <article class="mentor-card financial-option-modal-card">
        <div class="financial-option-modal-head">
          <div><small>${escapeHtml(financeT(financialComparisonState.editingOptionId ? "static.comparison.editOptionUpper" : "static.comparison.addOptionUpper", financialComparisonState.editingOptionId ? "UREDI OPCIJU" : "DODAJ OPCIJU"))}</small><h3>${escapeHtml(financeT("static.comparison.chooseReferences", "Izaberi reference za poredjenje"))}</h3></div>
          <label class="financial-option-participation-field">${escapeHtml(financeT("static.comparison.participation", "Ucesce"))}
            <input type="number" min="0" max="${escapeHtml(getFinancialDefaultParticipation())}" step="10" value="${escapeHtml(financialComparisonState.optionDraftParticipation ?? 0)}" placeholder="0" data-financial-option-participation />
          </label>
          <button type="button" data-financial-close-option-modal aria-label="${escapeHtml(financeT("static.comparison.close", "Zatvori"))}">x</button>
        </div>
        <div class="financial-option-picker-section">
          <h4>${escapeHtml(financeT("static.comparison.mainReference", "Glavna referenca"))}</h4>
          <label class="financial-modal-select-row">${escapeHtml(financeT("static.comparison.direction", "Pravac"))}
            <select data-financial-main-direction-select>${directions.map((direction) => `<option value="${escapeHtml(direction.id)}" ${direction.id === mainDirectionId ? "selected" : ""}>${escapeHtml(direction.label || direction.name)}</option>`).join("")}</select>
          </label>
          <div class="financial-direction-choice-grid primary">
            ${mainReferences.map((reference) => `
              <label class="financial-direction-choice ${reference.id === mainReferenceId ? "checked" : ""}">
                <input type="radio" name="financial-main-reference" value="${escapeHtml(reference.id)}" data-financial-main-reference ${reference.id === mainReferenceId ? "checked" : ""} />
                <img src="${escapeHtml(reference.image || idea?.image || "icons/finansije-panel.png")}" alt="" />
                <span><strong>${escapeHtml(reference.title)}</strong><em>${formatMoney(getFinancialDraftPrice(getFinancialReferenceKey(mainDirection.id, reference.id), reference))}</em>${renderFinancialReferencePriceInput(getFinancialReferenceKey(mainDirection.id, reference.id), reference)}</span>
              </label>
            `).join("") || '<p class="financial-muted">' + escapeHtml(financeT("static.comparison.noReferencesInDirection", "Ovaj pravac nema reference.")) + '</p>'}
          </div>
        </div>
        <div class="financial-option-picker-section">
          <h4>${escapeHtml(financeT("static.comparison.additionalReferences", "Dodatne reference"))}</h4>
          <label class="financial-modal-select-row">${escapeHtml(financeT("static.comparison.additionalDirection", "Pravac za dodatne reference"))}
            <select data-financial-secondary-direction-select>${directions.map((direction) => `<option value="${escapeHtml(direction.id)}" ${direction.id === secondaryDirectionId ? "selected" : ""}>${escapeHtml(direction.label || direction.name)}</option>`).join("")}</select>
          </label>
          <div class="financial-direction-choice-grid">
            ${(secondaryDirection?.references || []).map((reference) => {
              const key = `${secondaryDirection.id}::${reference.id}`;
              return `
                <label class="financial-direction-choice ${secondaryKeys.has(key) ? "checked" : ""}">
                  <input type="checkbox" value="${escapeHtml(key)}" data-financial-secondary-reference ${secondaryKeys.has(key) ? "checked" : ""} />
                  <img src="${escapeHtml(reference.image || idea?.image || "icons/finansije-panel.png")}" alt="" />
                  <span><strong>${escapeHtml(reference.title)}</strong><em>${formatMoney(getFinancialDraftPrice(key, reference))}</em>${renderFinancialReferencePriceInput(key, reference)}</span>
                </label>
              `;
            }).join("") || '<p class="financial-muted">' + escapeHtml(financeT("static.comparison.noReferencesInDirection", "Ovaj pravac nema reference.")) + '</p>'}
          </div>
          ${selectedSecondaryReferences.length ? `
            <div class="financial-draft-reference-list">
              ${selectedSecondaryReferences.map((item) => `<span>${escapeHtml(item.reference.title)} <strong>${formatMoney(getFinancialDraftPrice(getFinancialReferenceKey(item.direction.id, item.reference.id), item.reference))}</strong></span>`).join("")}
            </div>
          ` : ""}
        </div>
        <div class="financial-option-modal-actions">
          <button class="ghost-btn" type="button" data-financial-close-option-modal>${escapeHtml(financeT("static.comparison.cancel", "Otkazi"))}</button>
          <button class="btn" type="button" data-financial-create-option>${escapeHtml(financeT(financialComparisonState.editingOptionId ? "static.comparison.saveOption" : "static.comparison.selectOptionButton", financialComparisonState.editingOptionId ? "Sacuvaj opciju" : "Dodaj opciju"))}</button>
        </div>
      </article>
    </div>
  `;
}

function renderFinancialOptionCard(option, index) {
  const idea = getFinancialIdea(option.ideaId);
  const metrics = getFinancialMetrics(option);
  const entries = getFinancialOptionEntries(option);
  const mainEntry = entries.find((entry) => entry.id === option.mainEntryId) || entries[0];
  const mainReference = mainEntry ? getFinancialEntryReference(option, mainEntry) : null;
  const secondaryEntries = entries.filter((entry) => entry.id !== option.mainEntryId && entry.role !== "main");
  return `
    <article class="financial-option-card ${option.id === financialComparisonState.selectedOptionId ? "active" : ""}" data-financial-option="${escapeHtml(option.id)}">
      <button class="financial-option-select" type="button" data-financial-option="${escapeHtml(option.id)}">
        <small>OPCIJA ${String.fromCharCode(65 + index)} - ${escapeHtml(mainReference?.title || option.name)}</small>
        ${option.id === financialComparisonState.selectedOptionId ? `<span class="financial-edit-option" data-financial-edit-option="${escapeHtml(option.id)}" aria-label="${escapeHtml(financeT("static.comparison.editOption", "Uredi opciju"))}">edit</span>` : ""}
        <span class="financial-delete-option" data-financial-delete-option="${escapeHtml(option.id)}" aria-label="${escapeHtml(financeT("actions.delete", "Obrisi"))}">x</span>
        <div class="financial-option-visual">
          <img src="${escapeHtml(mainReference?.image || idea?.image || "icons/finansije-panel.png")}" alt="" />
          <div><strong>${escapeHtml(mainReference?.title || option.name)}</strong><span>${escapeHtml(getFinancialDirection(idea, mainEntry?.directionId)?.label || "")}</span><em>${formatMoney(getFinancialEntryPrice(option, mainEntry))}</em></div>
        </div>
      </button>
      <div class="financial-secondary-list">
        ${secondaryEntries.length ? secondaryEntries.map((entry) => {
          const reference = getFinancialEntryReference(option, entry);
          return `<div class="financial-secondary-item"><span>${escapeHtml(reference?.title || financeT("static.comparison.reference", "Referenca"))}</span><strong>${formatMoney(getFinancialEntryPrice(option, entry))}</strong><button type="button" data-financial-remove-reference="${escapeHtml(entry.id)}">x</button></div>`;
        }).join("") : '<p>' + escapeHtml(financeT("static.comparison.noAdditionalReferences", "Nema dodatnih referenci")) + '</p>'}
      </div>
      <div class="financial-option-foot"><span>${formatMoney(metrics.optionTotalCost)}</span><strong>${escapeHtml(metrics.monthsToGoal == null ? financeT("static.comparison.enterPlan", "Unesi plan") : metrics.completionDateLabel)}</strong><em class="${metrics.pressureStatus.tone}">${escapeHtml(metrics.pressureStatus.label)}</em></div>
    </article>
  `;
}

function renderFinancialReferencesPanel(idea, direction, references, selectedOption) {
  const selectedEntries = getFinancialOptionEntries(selectedOption);
  return `
    <section class="mentor-card financial-references-panel reference-strip-panel">
      ${selectedOption && selectedEntries.length ? `
        <div class="financial-selected-reference-row">
          ${selectedEntries.map((entry) => {
            const reference = getFinancialEntryReference(selectedOption, entry);
            return `<article class="financial-reference-display-card"><img src="${escapeHtml(reference?.image || idea.image || "icons/finance_wallet.svg")}" alt="" /><strong>${escapeHtml(reference?.title || financeT("static.comparison.reference", "Referenca"))}</strong><span>${formatMoney(getFinancialEntryPrice(selectedOption, entry))}</span></article>`;
          }).join("")}
        </div>
      ` : `<div class="financial-empty-state"><h3>${escapeHtml(financeT("static.comparison.selectOptionShort", "Selektuj opciju."))}</h3><p>${escapeHtml(financeT("static.comparison.selectedReferenceHint", "Ovde ce se prikazati slike, nazivi i cene izabranih referenci."))}</p></div>`}
    </section>
  `;
}

function getFinancialOptionTitle(option) {
  const entries = getFinancialOptionEntries(option);
  const mainEntry = entries.find((entry) => entry.id === option?.mainEntryId) || entries[0];
  const reference = mainEntry ? getFinancialEntryReference(option, mainEntry) : null;
  return reference?.title || option?.name || "Opcija";
}

function isFinanceViewVisible() {
  return !document.getElementById("financeView")?.classList.contains("hidden");
}

function isFinanceAssetsActive() {
  return isFinanceViewVisible() && !document.getElementById("financeAssetsPanel")?.classList.contains("hidden") &&
    financeTabs.some((tab) => tab.dataset.financeTab === "assets" && tab.classList.contains("active"));
}

function stopAssetRefreshTimer() {
  window.clearInterval(assetRefreshTimer);
  assetRefreshTimer = null;
}

function syncAssetRefreshTimer() {
  if (!isFinanceAssetsActive()) { stopAssetRefreshTimer(); return; }
  if (assetRefreshTimer !== null) return;
  assetRefreshTimer = window.setInterval(() => {
    if (!isFinanceAssetsActive()) { stopAssetRefreshTimer(); return; }
    refreshLiveAssets(false);
  }, ASSET_REFRESH_MS);
}

function ensureFinanceTabInitialized(tabName) {
  if (initializedFinanceTabs.has(tabName)) return;
  console.time("init:finance:" + tabName);
  if (tabName === "transactions") {
    initTransactionsPage();
  }
  if (tabName === "assets") {
    updateAssetFormMode();
    updateLiveAssetSearchMode();
  }
  if (tabName === "ideas") {
    queueFinanceBackgroundCommit("comparison-cache-init", syncFinancialResearchComparisonCache);
  }
  if (tabName === "budget") {
    queueFinanceBackgroundCommit("transaction-budget-link-init", async () => {
      if (!syncTransactionBudgetLinks()) return true;
      return saveFinanceState();
    });
  }
  initializedFinanceTabs.add(tabName);
  console.timeEnd("init:finance:" + tabName);
}

function renderActiveFinanceTab(options = {}) {
  if (!isFinanceViewVisible()) { stopAssetRefreshTimer(); return; }
  if (options.translate) renderFinanceLanguage();
  const activeTab = financeTabs.find((tab) => tab.classList.contains("active"))?.dataset.financeTab || "dashboard";
  ensureFinanceTabInitialized(activeTab);
  console.time("render:finance:" + activeTab);
  if (activeTab === "dashboard") renderFinanceOverview();
  if (activeTab === "transactions") renderTransactionsPage();
  if (activeTab === "income") renderCashflowPage();
  if (activeTab === "budget") renderBudgetPage();
  if (activeTab === "assets") {
    renderAssetsPage();
    if (!options.skipLiveRefresh) {
      refreshLiveAssets(false);
    }
  }
  syncAssetRefreshTimer();
  if (activeTab === "ideas") renderFinancialComparisonPage();
  if (options.updateOverflow) scheduleFinanceTabsOverflowUpdate();
  console.timeEnd("render:finance:" + activeTab);
}

function scheduleActiveFinanceTabRender(options = {}) {
  window.clearTimeout(scheduledFinanceTabRender);
  scheduledFinanceTabRender = window.setTimeout(() => {
    scheduledFinanceTabRender = null;
    renderActiveFinanceTab(options);
  }, 0);
}

function setFinanceTab(tabName, options = {}) {
  const nextTab = financePanels.some((panel) => panel.dataset.financePanel === tabName) ? tabName : "dashboard";
  const currentTab = financeTabs.find((tab) => tab.classList.contains("active"))?.dataset.financeTab;
  window.__mentorPendingFinanceTab = nextTab;
  financeTabs.forEach((tab) => {
    const isActive = tab.dataset.financeTab === nextTab;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  financePanels.forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.financePanel !== nextTab);
  });

  syncAssetRefreshTimer();

  if (currentTab === nextTab && !options.force) {
    return;
  }
  scheduleActiveFinanceTabRender({ skipLiveRefresh: true });
}

function openTransactionModal() {
  updateTransactionCashflowOptions();
  transactionModal?.classList.remove("hidden");
  transactionAmountInput?.focus();
}

function closeTransactionModal() {
  transactionModal?.classList.add("hidden");
}

let financeTabsOverflowFrame = null;

function setFinanceTabsOverflowOpen(isOpen) {
  if (!financeTabsOverflowToggle || !financeTabsOverflowMenu) return;
  financeTabsOverflowToggle.setAttribute("aria-expanded", String(isOpen));
  financeTabsOverflowMenu.classList.toggle("hidden", !isOpen);
}

function updateFinanceTabsOverflow() {
  if (!financeTabsWrap || !financeTabsOverflow || !financeTabsOverflowMenu) return;

  financeTabs.forEach((tab) => tab.classList.remove("finance-tab-hidden"));
  financeTabsWrap.classList.remove("has-overflow");
  financeTabsOverflow.classList.add("hidden");
  financeTabsOverflowMenu.innerHTML = "";

  const tabBarStyles = window.getComputedStyle(financeTabsWrap);
  const tabGap = Number.parseFloat(tabBarStyles.columnGap || tabBarStyles.gap) || 4;
  const getAvailableTabsWidth = () => {
    const styles = window.getComputedStyle(financeTabsWrap);
    const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
    const paddingRight = Number.parseFloat(styles.paddingRight) || 0;
    return financeTabsWrap.clientWidth - paddingLeft - paddingRight;
  };

  const availableTabsWidth = getAvailableTabsWidth();
  if (appViews.finance?.classList.contains("hidden") || availableTabsWidth < 90) {
    setFinanceTabsOverflowOpen(false);
    return;
  }

  if (availableTabsWidth >= 760) {
    setFinanceTabsOverflowOpen(false);
    return;
  }

  const tabWidths = financeTabs.map((tab) => Math.ceil(tab.offsetWidth));
  const totalTabsWidth = tabWidths.reduce((sum, width) => sum + width, 0) + Math.max(0, financeTabs.length - 1) * tabGap;
  if (totalTabsWidth <= getAvailableTabsWidth()) {
    setFinanceTabsOverflowOpen(false);
    return;
  }

  financeTabsWrap.classList.add("has-overflow");
  const availableWidth = getAvailableTabsWidth();
  const activeTab = financeTabs.find((tab) => tab.classList.contains("active"));
  let usedWidth = totalTabsWidth;
  const hiddenTabs = [];

  for (let index = financeTabs.length - 1; index >= 0 && usedWidth > availableWidth; index -= 1) {
    const tab = financeTabs[index];
    if (tab === activeTab && financeTabs.length - hiddenTabs.length > 1) continue;
    tab.classList.add("finance-tab-hidden");
    hiddenTabs.unshift(tab);
    usedWidth -= tabWidths[index] + tabGap;
  }

  if (hiddenTabs.length) {
    financeTabsOverflow.classList.remove("hidden");
    hiddenTabs.forEach((tab) => {
      const item = document.createElement("button");
      item.type = "button";
      item.setAttribute("role", "menuitem");
      item.dataset.financeOverflowTab = tab.dataset.financeTab;
      item.textContent = getFinanceTabLabel(tab.dataset.financeTab) || tab.textContent.trim();
      item.classList.toggle("active", tab.classList.contains("active"));
      financeTabsOverflowMenu.appendChild(item);
    });
  } else {
    financeTabsWrap.classList.remove("has-overflow");
    setFinanceTabsOverflowOpen(false);
  }
}

function scheduleFinanceTabsOverflowUpdate() {
  window.cancelAnimationFrame(financeTabsOverflowFrame);
  financeTabsOverflowFrame = window.requestAnimationFrame(() => {
    updateFinanceTabsOverflow();
  });
}

function createInitialTransactions() {
  return [];
}

function createInitialBudgets() {
  return [];
}

function enhanceInitialBudgetTransactions(existingTransactions) {
  return Array.isArray(existingTransactions) ? existingTransactions : [];
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const additions = [
    { id: "budget-sample-food-1", date: `${year}-${month}-09`, description: "Prodavnica", type: "expense", category: "Hrana", amount: 45.2, note: "Prodavnica", linkedTo: null, budgetId: "food" },
    { id: "budget-sample-food-2", date: `${year}-${month}-05`, description: "Market", type: "expense", category: "Hrana", amount: 62.8, note: "Market", linkedTo: null, budgetId: "food" },
    { id: "budget-sample-food-3", date: `${year}-${month}-02`, description: "Voce i povrce", type: "expense", category: "Hrana", amount: 28, note: "Voce i povrce", linkedTo: null, budgetId: "food" }
  ];
  const existingIds = new Set(existingTransactions.map((transaction) => String(transaction.id)));
  return [...additions.filter((transaction) => !existingIds.has(String(transaction.id))), ...existingTransactions];
}

function applyStoredTransactionCategories(categories) {
  if (!categories || typeof categories !== "object") return;
  ["income", "expense", "transfer"].forEach((type) => {
    if (!Array.isArray(categories[type]) || !TRANSACTION_CATEGORIES[type]) return;
    categories[type].forEach((category) => {
      if (typeof category !== "string") return;
      const exists = TRANSACTION_CATEGORIES[type].some((item) => item.toLowerCase() === category.toLowerCase());
      if (!exists) TRANSACTION_CATEGORIES[type].push(category);
    });
  });
}

function removeDemoFinanceRecords(items) {
  const demoIds = new Set(["1", "2", "3", "4", "5", "6", "7", "food"]);
  return (Array.isArray(items) ? items : []).filter((item) => {
    const id = String(item?.id || "");
    return !demoIds.has(id) && !id.startsWith("budget-sample-");
  });
}

function loadStoredFinanceState() {
  const emptyState = {
    transactions: enhanceInitialBudgetTransactions(createInitialTransactions()),
    budgets: createInitialBudgets(),
    cashflowIncomes: [],
    cashflowExpenses: [],
    cashflowDebts: [],
    importedTransactionFiles: [],
    categoryRules: {}
  };
  try {
    const stored = window.MentorData?.repositories?.finance?.getState?.();
    if (!stored || typeof stored !== "object" || !Object.keys(stored).length) return emptyState;
    const parsed = fixMojibakeDeep(stored);
    applyStoredTransactionCategories(parsed.categories);
    return {
      transactions: removeDemoFinanceRecords(parsed.transactions),
      budgets: removeDemoFinanceRecords(parsed.budgets),
      cashflowIncomes: Array.isArray(parsed.cashflowIncomes) ? parsed.cashflowIncomes : [],
      cashflowExpenses: Array.isArray(parsed.cashflowExpenses) ? parsed.cashflowExpenses : [],
      cashflowDebts: Array.isArray(parsed.cashflowDebts) ? parsed.cashflowDebts : [],
      importedTransactionFiles: Array.isArray(parsed.importedTransactionFiles) ? parsed.importedTransactionFiles : [],
      categoryRules: parsed.categoryRules && typeof parsed.categoryRules === "object" ? parsed.categoryRules : {}
    };
  } catch (error) {
    return emptyState;
  }
}

async function saveFinanceState() {
  const financeState = {
      transactions,
      budgets,
      cashflowIncomes,
      cashflowExpenses,
      cashflowDebts,
      importedTransactionFiles,
      categoryRules,
      categories: TRANSACTION_CATEGORIES,
      savedAt: new Date().toISOString()
    };
  const repository = window.MentorData?.repositories?.finance;
  const result = await window.MentorDomainDurableSave.commit({
    read: () => repository.getState(),
    next: financeState,
    save: (next) => repository.saveState(next),
    onError: () => showTransactionStatus(financeT("statusMessages.sessionOnly", "Podaci su sacuvani u sesiji, ali browser nije dozvolio trajno lokalno cuvanje."))
  });
  if (!result.ok) {
    const previous = result.value || {};
    transactions = removeDemoFinanceRecords(previous.transactions);
    budgets = removeDemoFinanceRecords(previous.budgets);
    cashflowIncomes = Array.isArray(previous.cashflowIncomes) ? previous.cashflowIncomes : [];
    cashflowExpenses = Array.isArray(previous.cashflowExpenses) ? previous.cashflowExpenses : [];
    cashflowDebts = Array.isArray(previous.cashflowDebts) ? previous.cashflowDebts : [];
    importedTransactionFiles = Array.isArray(previous.importedTransactionFiles) ? previous.importedTransactionFiles : [];
    categoryRules = previous.categoryRules && typeof previous.categoryRules === "object" ? previous.categoryRules : {};
    applyStoredTransactionCategories(previous.categories);
  }
  return result.ok;
}

const financeBackgroundCommitQueue = window.MentorDomainDurableSave.createQueue({
  onError: ({ label, error }) => {
    window.dispatchEvent(new CustomEvent("mentor:finance-background-save-error", {
      detail: {
        label,
        code: error?.code || error?.name || "FINANCE_BACKGROUND_SAVE_FAILED"
      }
    }));
    console.error("Finance background commit failed:", label, error);
  }
});

function queueFinanceBackgroundCommit(label, operation) {
  return financeBackgroundCommitQueue.enqueue(label, async () => {
    const result = await operation();
    if (result === false) throw new Error(`Finance background commit failed: ${label}`);
    return result;
  });
}

function fixMojibake(text) {
  if (!text || typeof text !== "string") return text;
  return text
    .replace(/\u00c5\u00be/g, "\u017e")
    .replace(/\u00c5\u00a1/g, "\u0161")
    .replace(/\u00c4\u2021/g, "\u0107")
    .replace(/\u00c4\u008d/g, "\u010d")
    .replace(/\u00c4\u2018/g, "\u0111")
    .replace(/\u00c2/g, "")
    .replace(/\ufffd\?/g, "\u0107")
    .replace(/\ufffd/g, "");
}

function fixMojibakeDeep(obj) {
  if (!obj) return obj;
  if (typeof obj === "string") return fixMojibake(obj);
  if (Array.isArray(obj)) return obj.map(fixMojibakeDeep);
  if (typeof obj === "object") {
    return Object.entries(obj).reduce((acc, [key, val]) => {
      acc[key] = fixMojibakeDeep(val);
      return acc;
    }, {});
  }
  return obj;
}

function formatMoney(amount) {
  const hasDecimals = Math.round(amount * 100) % 100 !== 0;
  return amount.toLocaleString(financeLocale(), {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0
  }) + " €";
}

function formatTransactionAmount(transaction) {
  if (transaction.type === "income") return "+ " + formatMoney(transaction.amount);
  if (transaction.type === "expense") return "- " + formatMoney(transaction.amount);
  return formatMoney(transaction.amount);
}

function formatDateLabel(dateValue) {
  if (!dateValue) return "";
  const parts = dateValue.split("-");
  if (parts.length !== 3) return dateValue;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function formatShortDateLabel(dateValue) {
  if (!dateValue) return "";
  const parts = dateValue.split("-");
  if (parts.length !== 3) return dateValue;
  return `${parts[2]}.${parts[1]}.${parts[0].slice(-2)}`;
}

function getMonthTransactions() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  return transactions.filter((transaction) => {
    const date = new Date(transaction.date + "T00:00:00");
    return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
  });
}

function isInDateFilter(dateValue, filterValue) {
  if (filterValue === "all") return true;

  const date = new Date(dateValue + "T00:00:00");
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (filterValue === "today") {
    return dateStart.getTime() === todayStart.getTime();
  }

  if (filterValue === "current-month") {
    return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
  }

  if (filterValue === "last-month") {
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return date.getFullYear() === lastMonth.getFullYear() && date.getMonth() === lastMonth.getMonth();
  }

  if (filterValue === "current-week") {
    const day = todayStart.getDay() || 7;
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - day + 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return dateStart >= weekStart && dateStart <= weekEnd;
  }

  return true;
}

function transactionMatchesSearch(transaction, query) {
  const normalizedQuery = normalizeImportRuleText(query);
  if (!normalizedQuery) return true;
  const values = [
    transaction.date,
    formatShortDateLabel(transaction.date),
    transaction.importedAt,
    transaction.type,
    TRANSACTION_TYPE_LABELS[transaction.type],
    transaction.category,
    transaction.amount,
    formatMoney(Number(transaction.amount || 0)),
    transaction.importBalance,
    transaction.description,
    transaction.note,
    transaction.linkedTo,
    getTransactionBudgetLabel(transaction)
  ];
  const haystack = normalizeImportRuleText(values.filter((value) => value !== null && value !== undefined).join(" "));
  return haystack.includes(normalizedQuery);
}

function getFilteredTransactions() {
  const dateFilter = transactionDateFilter?.value || "current-month";
  const typeFilter = transactionTypeFilter?.value || "all";
  const categoryFilter = transactionCategoryFilter?.value || "all";
  const linkedFilter = transactionLinkedFilter?.value ?? "all";
  const sortValue = transactionSort?.value || "date-desc";
  const searchQuery = transactionSearchInput?.value || "";

  const filtered = transactions.filter((transaction) => {
    const matchesDate = isInDateFilter(transaction.date, dateFilter);
    const matchesType = typeFilter === "all" || transaction.type === typeFilter;
    const matchesCategory = categoryFilter === "all" || transaction.category === categoryFilter;
    const linkedValue = transaction.linkedTo || "";
    const matchesLinked = linkedFilter === "all" || linkedValue === linkedFilter;
    const matchesSearch = transactionMatchesSearch(transaction, searchQuery);
    return matchesDate && matchesType && matchesCategory && matchesLinked && matchesSearch;
  });

  return filtered.sort((a, b) => {
    if (sortValue === "date-asc") return a.date.localeCompare(b.date);
    if (sortValue === "amount-desc") return b.amount - a.amount;
    if (sortValue === "amount-asc") return a.amount - b.amount;
    return b.date.localeCompare(a.date);
  });
}

function updateTransactionCategories() {
  if (!transactionCategoryInput) return;
  const type = transactionTypeInput?.value || "income";
  const categories = TRANSACTION_CATEGORIES[type] || [];
  const selected = transactionCategoryInput.value;
  transactionCategoryInput.innerHTML = categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(getFinanceCategoryLabel(category))}</option>`).join("");
  if (categories.includes(selected)) transactionCategoryInput.value = selected;
}

function updateTransactionCategoryFilter() {
  if (!transactionCategoryFilter) return;
  const currentValue = transactionCategoryFilter.value || "all";
  const definedCategories = Object.values(TRANSACTION_CATEGORIES).flat();
  const categories = Array.from(new Set([...definedCategories, ...transactions.map((transaction) => transaction.category)])).sort((a, b) => a.localeCompare(b, "sr"));
  transactionCategoryFilter.innerHTML = '<option value="all">' + escapeHtml(financeT("filters.allCategories", "Sve kategorije")) + '</option>' + categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(getFinanceCategoryLabel(category))}</option>`).join("");
  transactionCategoryFilter.value = categories.includes(currentValue) ? currentValue : "all";
}

async function addTransactionCategory(type, categoryName, options = {}) {
  const category = categoryName.trim();
  if (!category || !TRANSACTION_CATEGORIES[type]) return false;
  const exists = TRANSACTION_CATEGORIES[type].some((item) => item.toLowerCase() === category.toLowerCase());
  if (exists) return false;
  TRANSACTION_CATEGORIES[type].push(category);
  if (options.silent) return true;
  if (!await saveFinanceState()) {
    renderCategoryManager();
    return false;
  }
  updateTransactionCategories();
  updateCashflowIncomeCategories();
  updateCashflowExpenseCategories();
  updateTransactionCategoryFilter();
  renderCategoryManager();
  return true;
}

async function removeTransactionCategory(type, categoryName) {
  if (!TRANSACTION_CATEGORIES[type]) return;
  TRANSACTION_CATEGORIES[type] = TRANSACTION_CATEGORIES[type].filter((item) => item !== categoryName);
  delete categoryRules[`${type}:${categoryName}`];
  const changedTransactionCount = recategorizeTransactionsAfterRuleChange(type, { removedCategory: categoryName });
  if (selectedKeywordCategory?.type === type && selectedKeywordCategory?.category === categoryName) selectedKeywordCategory = null;
  if (!await saveFinanceState()) {
    renderCategoryManager();
    return false;
  }
  updateTransactionCategories();
  updateCashflowIncomeCategories();
  updateCashflowExpenseCategories();
  updateTransactionCategoryFilter();
  renderCategoryManager();
  if (changedTransactionCount) {
    renderTransactionsPage();
    showTransactionStatus(financeT("statusMessages.categoriesRefreshed", "Osvezeno {{count}} kategorija.", { count: changedTransactionCount }));
  }
  return true;
}

function getCategoryRuleKey(type, category) {
  return `${type}:${category}`;
}

function getCategoryKeywords(type, category) {
  const keywords = categoryRules[getCategoryRuleKey(type, category)];
  return Array.isArray(keywords) ? keywords : [];
}

function setCategoryKeywords(type, category, keywords) {
  const key = getCategoryRuleKey(type, category);
  const seenKeywords = new Set();
  const cleanKeywords = keywords
    .map((keyword) => String(keyword || "").trim())
    .filter((keyword) => {
      const normalized = normalizeImportRuleText(keyword);
      if (!normalized || seenKeywords.has(normalized)) return false;
      seenKeywords.add(normalized);
      return true;
    });
  if (cleanKeywords.length) categoryRules[key] = cleanKeywords;
  else delete categoryRules[key];
}

function findCategoryRuleMatch(type, text) {
  const normalizedText = normalizeImportRuleText(text);
  if (!normalizedText) return null;
  const rules = Object.entries(categoryRules)
    .map(([key, keywords]) => {
      const [ruleType, ...categoryParts] = key.split(":");
      return { type: ruleType, category: categoryParts.join(":"), keywords: Array.isArray(keywords) ? keywords : [] };
    })
    .filter((rule) => rule.type === type || rule.type === "all")
    .flatMap((rule) => rule.keywords.map((keyword) => ({ category: rule.category, keyword, normalizedKeyword: normalizeImportRuleText(keyword) })))
    .filter((rule) => rule.normalizedKeyword)
    .sort((a, b) => b.normalizedKeyword.length - a.normalizedKeyword.length);
  const match = rules.find((rule) => normalizedText.includes(rule.normalizedKeyword));
  return match || null;
}

function findCategoryByRules(type, text) {
  return findCategoryRuleMatch(type, text)?.category || "";
}

function getTransactionCategoryRuleText(transaction) {
  return [
    transaction.type,
    transaction.description,
    transaction.note,
    transaction.linkedTo
  ].filter(Boolean).join(" ");
}

function recategorizeTransactionsAfterRuleChange(type, options = {}) {
  const normalizedKeyword = normalizeImportRuleText(options.keyword || "");
  const previousCategory = normalizeText(options.previousCategory || "");
  const removedCategory = normalizeText(options.removedCategory || "");
  let changedCount = 0;

  transactions = transactions.map((transaction) => {
    const sameType = transaction.type === type;
    if (!sameType && type !== "transfer") return transaction;
    const ruleText = getTransactionCategoryRuleText(transaction);
    const normalizedRuleText = normalizeImportRuleText(ruleText);
    const isImported = Boolean(transaction.importedAt) || String(transaction.id || "").startsWith("import-");
    const isRuleManaged = ["keyword", "fallback"].includes(transaction.categorySource) || (!transaction.categorySource && isImported);
    const matchesChangedKeyword = normalizedKeyword && normalizedRuleText.includes(normalizedKeyword);
    const usesRemovedCategory = removedCategory && normalizeText(transaction.category) === removedCategory;
    const usesPreviousRule = previousCategory
      && normalizeText(transaction.category) === previousCategory
      && matchesChangedKeyword;
    if (!sameType && !(isRuleManaged && matchesChangedKeyword)) return transaction;
    if (sameType && !usesRemovedCategory && !(isRuleManaged && (matchesChangedKeyword || usesPreviousRule))) return transaction;

    const match = findCategoryRuleMatch(type, ruleText);
    if (!sameType && !match) return transaction;
    if (!match && !usesRemovedCategory && !transaction.categorySource) return transaction;
    const nextCategory = match?.category || "Ostalo";
    const nextSource = match ? "keyword" : "fallback";
    const nextType = match && type === "transfer" ? "transfer" : transaction.type;
    if (transaction.type === nextType
      && normalizeText(transaction.category) === normalizeText(nextCategory)
      && transaction.categorySource === nextSource
      && transaction.categoryRuleKeyword === (match?.keyword || null)) return transaction;

    changedCount += 1;
    return {
      ...transaction,
      type: nextType,
      category: nextCategory,
      categorySource: nextSource,
      categoryRuleKeyword: match?.keyword || null
    };
  });

  return changedCount;
}

function renderCategoryKeywordPanel() {
  if (!categoryKeywordTitle || !categoryKeywordHint || !categoryKeywordList) return;
  const type = selectedKeywordCategory?.type || categoryManagerType?.value || "expense";
  const category = selectedKeywordCategory?.category || "";
  if (!category) {
    categoryKeywordTitle.textContent = financeT("categories.choose", "Izaberi kategoriju");
    categoryKeywordHint.textContent = financeT("categories.keywordSelectHint", "Klikni Keywordi pored kategorije pa dodaj fraze kao Wolt, Bolt Food ili Lidl.");
    categoryKeywordList.innerHTML = "";
    return;
  }
  const keywords = getCategoryKeywords(type, category);
  categoryKeywordTitle.textContent = category;
  categoryKeywordHint.textContent = financeT("categories.keywordRuleHint", "Ako import sadr\u017ei ove fraze, kategorija \u0107e biti \"{{category}}\". Du\u017ee fraze imaju prednost.", { category });
  categoryKeywordList.innerHTML = keywords.length
    ? keywords.map((keyword, index) => `
      <div class="category-keyword-row">
        <span>${escapeHtml(keyword)}</span>
        <button class="transaction-icon-btn" type="button" data-delete-category-keyword="${index}">${escapeHtml(financeT("actions.delete", "Obri\u0161i"))}</button>
      </div>
    `).join("")
    : `<p class="category-keyword-empty">${escapeHtml(financeT("categories.noKeywords", "Jo\u0161 nema keyworda za ovu kategoriju."))}</p>`;
}

async function addCategoryKeyword() {
  const type = selectedKeywordCategory?.type || categoryManagerType?.value || "expense";
  const category = selectedKeywordCategory?.category;
  const keyword = categoryKeywordInput?.value.trim() || "";
  if (!category || !keyword) return;

  const normalizedKeyword = normalizeImportRuleText(keyword);
  Object.keys(categoryRules).forEach((key) => {
    const [ruleType, ...categoryParts] = key.split(":");
    const ruleCategory = categoryParts.join(":");
    if (ruleType !== type || ruleCategory === category) return;
    setCategoryKeywords(ruleType, ruleCategory, getCategoryKeywords(ruleType, ruleCategory).filter((item) => (
      normalizeImportRuleText(item) !== normalizedKeyword
    )));
  });
  setCategoryKeywords(type, category, [...getCategoryKeywords(type, category), keyword]);
  const changedTransactionCount = recategorizeTransactionsAfterRuleChange(type, { keyword });
  if (!await saveFinanceState()) {
    renderCategoryManager();
    return false;
  }
  if (categoryKeywordInput) categoryKeywordInput.value = "";
  renderCategoryManager();
  if (changedTransactionCount) {
    renderTransactionsPage();
    showTransactionStatus(financeT("statusMessages.categoriesRefreshed", "Osvezeno {{count}} kategorija.", { count: changedTransactionCount }));
  }
  categoryKeywordInput?.focus();
  return true;
}

async function deleteCategoryKeyword(index) {
  const type = selectedKeywordCategory?.type || categoryManagerType?.value || "expense";
  const category = selectedKeywordCategory?.category;
  if (!category) return;
  const keywords = getCategoryKeywords(type, category);
  const removedKeyword = keywords[index];
  if (!removedKeyword) return false;
  setCategoryKeywords(type, category, keywords.filter((_, itemIndex) => itemIndex !== index));
  const changedTransactionCount = recategorizeTransactionsAfterRuleChange(type, {
    keyword: removedKeyword,
    previousCategory: category
  });
  if (!await saveFinanceState()) {
    renderCategoryManager();
    return false;
  }
  renderCategoryManager();
  if (changedTransactionCount) {
    renderTransactionsPage();
    showTransactionStatus(financeT("statusMessages.categoriesRefreshed", "Osvezeno {{count}} kategorija.", { count: changedTransactionCount }));
  }
  return true;
}

function renderCategoryManager() {
  if (!categoryManagerList) return;
  const type = categoryManagerType?.value || "expense";
  const categories = TRANSACTION_CATEGORIES[type] || [];
  if (selectedKeywordCategory && selectedKeywordCategory.type !== type) selectedKeywordCategory = null;
  categoryManagerList.innerHTML = categories.map((category, index) => `
    <div class="category-manager-row ${selectedKeywordCategory?.category === category ? "active" : ""}">
      <span>${escapeHtml(category)}</span>
      <button class="transaction-icon-btn" type="button" data-edit-category-keywords="${escapeHtml(category)}">${escapeHtml(financeT("categories.keywords", "KEYWORDI"))}</button>
      <button class="transaction-icon-btn" type="button" data-delete-category-index="${index}">${escapeHtml(financeT("actions.delete", "Obri\u0161i"))}</button>
    </div>
  `).join("");
  renderCategoryKeywordPanel();
}

function openCategoryManager() {
  renderCategoryManager();
  categoryManagerModal?.classList.remove("hidden");
  categoryManagerInput?.focus();
}

function closeCategoryManager() {
  categoryManagerModal?.classList.add("hidden");
}

async function addQuickCategory() {
  const type = transactionTypeInput?.value || "expense";
  const value = quickCategoryInput?.value || "";
  if (!await addTransactionCategory(type, value)) return;
  if (transactionCategoryInput) transactionCategoryInput.value = value.trim();
  if (quickCategoryInput) quickCategoryInput.value = "";
  quickCategoryAdd?.classList.add("hidden");
}

function updateCashflowIncomeCategories(selectedValue = "") {
  if (!cashflowIncomeCategory) return;
  const currentValue = selectedValue || cashflowIncomeCategory.value;
  const categories = Array.from(new Set([
    ...(TRANSACTION_CATEGORIES.income || []),
    ...cashflowIncomes.map((item) => item.category).filter(Boolean),
    ...transactions.filter((transaction) => transaction.type === "income").map((transaction) => transaction.category).filter(Boolean)
  ])).sort((a, b) => a.localeCompare(b, "sr"));
  cashflowIncomeCategory.innerHTML = categories.map((category) => `<option>${escapeHtml(category)}</option>`).join("");
  if (categories.includes(currentValue)) cashflowIncomeCategory.value = currentValue;
}

function updateCashflowExpenseCategories(selectedValue = "") {
  if (!cashflowExpenseCategory) return;
  const currentValue = selectedValue || cashflowExpenseCategory.value;
  const categories = Array.from(new Set([
    ...(TRANSACTION_CATEGORIES.expense || []),
    ...cashflowExpenses.map((item) => item.category).filter(Boolean),
    ...transactions.filter((transaction) => transaction.type === "expense").map((transaction) => transaction.category).filter(Boolean)
  ])).sort((a, b) => a.localeCompare(b, "sr"));
  cashflowExpenseCategory.innerHTML = categories.map((category) => `<option>${escapeHtml(category)}</option>`).join("");
  if (categories.includes(currentValue)) cashflowExpenseCategory.value = currentValue;
}

async function addCashflowIncomeCategory() {
  const value = cashflowIncomeQuickCategoryInput?.value.trim() || "";
  if (!value) return;
  if (!await addTransactionCategory("income", value)) return;
  updateCashflowIncomeCategories(value);
  if (cashflowIncomeQuickCategoryInput) cashflowIncomeQuickCategoryInput.value = "";
  cashflowIncomeQuickCategoryAdd?.classList.add("hidden");
  cashflowIncomeCategory?.focus();
}

async function addCashflowExpenseCategory() {
  const value = cashflowExpenseQuickCategoryInput?.value.trim() || "";
  if (!value) return;
  if (!await addTransactionCategory("expense", value)) return;
  updateCashflowExpenseCategories(value);
  if (cashflowExpenseQuickCategoryInput) cashflowExpenseQuickCategoryInput.value = "";
  cashflowExpenseQuickCategoryAdd?.classList.add("hidden");
  cashflowExpenseCategory?.focus();
}

function splitDelimitedRows(text, delimiter) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function detectTransactionDelimiter(text) {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim()) || "";
  const candidates = [",", ";", "\t"];
  return candidates
    .map((delimiter) => ({ delimiter, count: splitDelimitedRows(firstLine, delimiter)[0]?.length || 0 }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter || ",";
}

function normalizeColumnName(value) {
  return normalizeText(String(value || ""))
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseImportAmount(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const cleaned = raw
    .replace(/[^\d,.\-()]/g, "")
    .replace(/^\((.*)\)$/, "-$1");
  const commaIndex = cleaned.lastIndexOf(",");
  const dotIndex = cleaned.lastIndexOf(".");
  const decimalSeparator = commaIndex > dotIndex ? "," : ".";
  const normalized = decimalSeparator === ","
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned.replace(/,/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function parseImportDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const isoMatch = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const slashMatch = raw.match(/(\d{1,2})[./](\d{1,2})[./](\d{2,4})/);
  if (slashMatch) {
    const first = Number(slashMatch[1]);
    const second = Number(slashMatch[2]);
    const year = slashMatch[3].length === 2 ? `20${slashMatch[3]}` : slashMatch[3];
    const day = first > 12 ? first : second;
    const month = first > 12 ? second : first;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function parseImportDateTimeKey(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const isoDateTimeMatch = raw.match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (isoDateTimeMatch) {
    return `${isoDateTimeMatch[1]}-${isoDateTimeMatch[2]}-${isoDateTimeMatch[3]} ${String(isoDateTimeMatch[4]).padStart(2, "0")}:${isoDateTimeMatch[5]}:${isoDateTimeMatch[6] || "00"}`;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? parseImportDate(raw) : parsed.toISOString();
}

function normalizeImportRuleText(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, " ").trim();
}

function inferImportedTransactionType(amount, sourceType, description) {
  const normalizedType = normalizeImportRuleText(sourceType);
  const normalizedDescription = normalizeImportRuleText(description);
  const combinedText = `${normalizedType} ${normalizedDescription}`.trim();

  if (normalizedType.includes("topup") || normalizedType.includes("top up") || normalizedDescription.includes("top up")) {
    return "transfer";
  }

  if (normalizedType.includes("exchange") || normalizedDescription.includes("currency exchange")) {
    return "transfer";
  }

  if (normalizedType.includes("transfer")
    || normalizedDescription.includes("transfer to")
    || normalizedDescription.includes("transfer from")) {
    return "transfer";
  }

  if (combinedText.includes("cashback") || normalizedType.includes("card refund") || normalizedDescription.includes("refund")) {
    return "income";
  }

  return amount < 0 ? "expense" : "income";
}

function normalizeMappedTransactionType(value) {
  const normalized = normalizeImportRuleText(value);
  if (["income", "prihod", "credit", "uplata"].includes(normalized)) return "income";
  if (["expense", "rashod", "trosak", "debit"].includes(normalized)) return "expense";
  if (["transfer", "prebacivanje", "prenos"].includes(normalized)) return "transfer";
  return "";
}

function getImportTableData(rows) {
  if (!rows.length) return { headers: [], normalizedHeaders: [], dataRows: [] };
  const headerIndex = rows.findIndex((row) => {
    const headerText = row.map(normalizeColumnName).join(" ");
    return headerText.includes("date") && (headerText.includes("amount") || headerText.includes("paid out") || headerText.includes("paid in"));
  });
  const headerRowIndex = Math.max(headerIndex, 0);
  const headers = rows[headerRowIndex].map((header, index) => String(header || `Kolona ${index + 1}`).trim() || `Kolona ${index + 1}`);
  return {
    headers,
    normalizedHeaders: headers.map(normalizeColumnName),
    dataRows: rows.slice(headerRowIndex + 1)
  };
}

function getMappedRowValues(row, mappings) {
  return row.reduce((values, cell, index) => {
    const target = mappings[index] || "ignore";
    if (target === "ignore") return values;
    if (!values[target]) values[target] = [];
    values[target].push(String(cell || "").trim());
    return values;
  }, {});
}

function getFirstMappedValue(values, key) {
  return (values[key] || []).find((value) => value) || "";
}

function getJoinedMappedValue(values, key) {
  return (values[key] || []).filter(Boolean).join(" | ");
}

function findBudgetIdByName(value) {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) return null;
  return budgets.find((budget) => normalizeText(budget.name) === normalizedValue)?.id || null;
}

function loadCustomTransactionImportTemplates() {
  try {
    const templates = window.MentorData?.repositories?.finance?.getImportTemplates?.() || [];
    return Array.isArray(templates) ? templates : [];
  } catch (error) {
    return [];
  }
}

async function saveCustomTransactionImportTemplates(templates) {
  const repository = window.MentorData?.repositories?.finance;
  return window.MentorDomainDurableSave.commit({
    read: () => repository.getImportTemplates(),
    next: Array.isArray(templates) ? templates : [],
    save: (next) => repository.saveImportTemplates(next),
    onError: () => showTransactionStatus(financeT("statusMessages.sessionOnly", "Podaci su sacuvani u sesiji, ali browser nije dozvolio trajno lokalno cuvanje."))
  });
}

function getTransactionImportTemplates() {
  return [...DEFAULT_TRANSACTION_IMPORT_TEMPLATES, ...loadCustomTransactionImportTemplates()];
}

function getTemplateMappingsForHeaders(template, normalizedHeaders) {
  return normalizedHeaders.reduce((mappings, header, index) => {
    mappings[index] = template?.mappings?.[header] || "ignore";
    return mappings;
  }, {});
}

function createAutoImportMappings(headers, normalizedHeaders) {
  const revolutTemplate = DEFAULT_TRANSACTION_IMPORT_TEMPLATES[0];
  const hasRevolutShape = ["type", "product", "started date", "completed date", "description", "amount", "fee", "currency", "state", "balance"]
    .every((header) => normalizedHeaders.includes(header));
  if (hasRevolutShape) return getTemplateMappingsForHeaders(revolutTemplate, normalizedHeaders);

  return normalizedHeaders.reduce((mappings, header, index) => {
    if (header.includes("completed date") || header.includes("posted date") || header === "date" || header === "datum") mappings[index] = "date";
    else if (header === "amount" || header.includes("amount") || header.includes("paid in") || header.includes("paid out") || header.includes("debit") || header.includes("credit") || header.includes("iznos")) mappings[index] = "amount";
    else if (header.includes("category") || header.includes("kategorija")) mappings[index] = "category";
    else if (header === "type" || header.includes("transaction type") || header === "tip") mappings[index] = "type";
    else if (header.includes("description") || header.includes("merchant") || header.includes("details") || header.includes("memo") || header.includes("narrative") || header.includes("reference") || header.includes("opis")) mappings[index] = "note";
    else if (header.includes("balance") || header.includes("saldo")) mappings[index] = "balance";
    else if (header.includes("state") || header.includes("status")) mappings[index] = "state";
    else if (header.includes("budget") || header.includes("budzet") || header.includes("budzet")) mappings[index] = "budget";
    else if (header.includes("linked") || header.includes("povezano")) mappings[index] = "linkedTo";
    else mappings[index] = "ignore";
    return mappings;
  }, {});
}

function buildImportedTransactionsFromTable(tableData, mappings) {
  const { dataRows } = tableData;

  return dataRows.map((row, index) => {
    const values = getMappedRowValues(row, mappings);
    const state = getFirstMappedValue(values, "state");
    if (state && normalizeText(state) !== "completed") return null;
    const dateValue = getFirstMappedValue(values, "date");
    const date = parseImportDate(dateValue);
    const importedAt = parseImportDateTimeKey(dateValue);
    const rawNote = getJoinedMappedValue(values, "note");
    const sourceType = getFirstMappedValue(values, "type");
    const amountIndex = Object.keys(mappings).find((key) => mappings[key] === "amount" && String(row[Number(key)] || "").trim());
    const amountHeader = amountIndex == null ? "" : tableData.normalizedHeaders[Number(amountIndex)];
    const amountValue = amountIndex == null ? getFirstMappedValue(values, "amount") : row[Number(amountIndex)];
    const balanceValue = getFirstMappedValue(values, "balance");
    let amount = parseImportAmount(amountValue);
    if (amount !== null && amount > 0 && (amountHeader.includes("debit") || amountHeader.includes("paid out") || amountHeader.includes("withdrawal") || amountHeader.includes("outflow"))) amount = -amount;
    if (amount !== null && amount < 0 && (amountHeader.includes("credit") || amountHeader.includes("paid in") || amountHeader.includes("deposit") || amountHeader.includes("inflow"))) amount = Math.abs(amount);
    const importBalance = parseImportAmount(balanceValue);
    if (!date || amount === null || amount === 0) return null;
    const mappedType = normalizeMappedTransactionType(sourceType);
    const inferredType = inferImportedTransactionType(amount, sourceType, rawNote);
    const note = [
      sourceType ? `Type: ${sourceType}` : "",
      rawNote ? `Opis: ${rawNote}` : ""
    ].filter(Boolean).join(" | ");
    const ruleText = [sourceType, rawNote, getJoinedMappedValue(values, "linkedTo")].filter(Boolean).join(" ");
    const transferRuleMatch = findCategoryRuleMatch("transfer", ruleText);
    const type = mappedType || (transferRuleMatch ? "transfer" : inferredType);
    const mappedCategory = getFirstMappedValue(values, "category");
    const categoryRuleMatch = mappedCategory
      ? null
      : (type === "transfer" && transferRuleMatch ? transferRuleMatch : findCategoryRuleMatch(type, ruleText));
    const category = mappedCategory || categoryRuleMatch?.category || "Ostalo";
    addTransactionCategory(type, category, { silent: true });
    const budgetId = findBudgetIdByName(getFirstMappedValue(values, "budget"));
    const transaction = {
      id: `import-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
      date,
      importedAt,
      description: rawNote || category,
      type,
      category,
      categorySource: mappedCategory ? "import" : (categoryRuleMatch ? "keyword" : "fallback"),
      categoryRuleKeyword: categoryRuleMatch?.keyword || null,
      amount: Math.abs(amount),
      importBalance,
      note,
      linkedTo: getFirstMappedValue(values, "linkedTo") || null,
      budgetId,
      cashflowLink: null
    };
    transaction.budgetId = ensureTransactionBudgetLink(transaction);
    return transaction;
  }).filter(Boolean);
}

function decodeTransactionFileText(buffer) {
  const bytes = new Uint8Array(buffer);
  const hasUtf16LeBom = bytes[0] === 255 && bytes[1] === 254;
  const hasUtf16BeBom = bytes[0] === 254 && bytes[1] === 255;
  const decoder = hasUtf16LeBom ? new TextDecoder("utf-16le") : (hasUtf16BeBom ? new TextDecoder("utf-16be") : new TextDecoder("utf-8"));
  return decoder.decode(buffer).replace(/^\uFEFF/, "");
}

async function getFileSha256(buffer) {
  if (!window.crypto?.subtle) return "";
  const digest = await window.crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function buildTransactionImportFingerprint(file, hash) {
  return {
    name: file.name,
    size: file.size,
    lastModified: file.lastModified || null,
    hash,
    importedAt: new Date().toISOString()
  };
}

function hasImportedTransactionFile(fingerprint) {
  return importedTransactionFiles.some((item) => {
    if (fingerprint.hash && item.hash) return item.hash === fingerprint.hash;
    return item.name === fingerprint.name && item.size === fingerprint.size && item.lastModified === fingerprint.lastModified;
  });
}

function rememberImportedTransactionFile(fingerprint) {
  if (hasImportedTransactionFile(fingerprint)) return;
  importedTransactionFiles = [fingerprint, ...importedTransactionFiles].slice(0, 100);
}

function getTransactionDuplicateKey(transaction) {
  return [
    transaction.importedAt || transaction.date || "",
    transaction.type || "",
    normalizeText(transaction.category || ""),
    Number(transaction.amount || 0).toFixed(2),
    transaction.importBalance === null || transaction.importBalance === undefined ? "" : Number(transaction.importBalance || 0).toFixed(2),
    normalizeText(transaction.note || transaction.description || "")
  ].join("|");
}

function filterNewImportedTransactions(importedTransactions) {
  const existingKeys = new Set(transactions.map(getTransactionDuplicateKey));
  return importedTransactions.filter((transaction) => {
    const key = getTransactionDuplicateKey(transaction);
    if (existingKeys.has(key)) return false;
    existingKeys.add(key);
    return true;
  });
}

function loadExternalScript(src, globalName) {
  if (window[globalName]) return Promise.resolve(window[globalName]);
  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window[globalName]));
      existingScript.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => window[globalName] ? resolve(window[globalName]) : reject(new Error("Biblioteka za citanje fajla nije dostupna."));
    script.onerror = () => reject(new Error("Ne mogu da ucitam biblioteku za ovaj format. Probaj CSV export."));
    document.head.appendChild(script);
  });
}

async function parseExcelTransactionRows(buffer) {
  const XLSX = await loadExternalScript("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js", "XLSX");
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
}

async function extractPdfTransactionRows(buffer) {
  const pdfjsLib = await loadExternalScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js", "pdfjsLib");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const rows = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const lines = content.items.reduce((groups, item) => {
      const y = Math.round(item.transform[5]);
      if (!groups[y]) groups[y] = [];
      groups[y].push(item);
      return groups;
    }, {});
    Object.values(lines).forEach((items) => {
      const row = items
        .sort((a, b) => a.transform[4] - b.transform[4])
        .map((item) => item.str.trim())
        .filter(Boolean);
      if (row.length) rows.push(row);
    });
  }

  return rows;
}

async function parseTransactionUploadRows(file, buffer) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  if (["xlsx", "xls"].includes(extension)) return parseExcelTransactionRows(buffer);
  if (extension === "pdf") {
    const pdfRows = await extractPdfTransactionRows(buffer);
    if (pdfRows.length) return pdfRows;
    const text = decodeTransactionFileText(buffer);
    const readableText = text.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ");
    return splitDelimitedRows(readableText, detectTransactionDelimiter(readableText));
  }
  const text = decodeTransactionFileText(buffer);
  const delimiter = extension === "tsv" ? "\t" : detectTransactionDelimiter(text);
  return splitDelimitedRows(text, delimiter);
}

function getCurrentImportMappings() {
  if (!pendingTransactionImport) return {};
  const mappings = {};
  transactionImportMapping?.querySelectorAll("[data-import-column-index]").forEach((select) => {
    mappings[Number(select.dataset.importColumnIndex)] = select.value;
  });
  return mappings;
}

function renderTransactionImportTemplateSelect(selectedId = "auto") {
  if (!transactionImportTemplateInput) return;
  const templates = getTransactionImportTemplates();
  transactionImportTemplateInput.innerHTML = `<option value="auto">${escapeHtml(financeT("import.autoDetect", "Auto prepoznavanje"))}</option>` + templates
    .map((template) => `<option value="${escapeHtml(template.id)}">${escapeHtml(template.name)}</option>`)
    .join("");
  transactionImportTemplateInput.value = templates.some((template) => template.id === selectedId) ? selectedId : "auto";
}

function getImportTargetLabel(option) {
  return financeT("import.targets." + option.key, option.label);
}

function renderImportMappingSelect(index, value) {
  return `<select data-import-column-index="${index}">
    ${IMPORT_TARGET_OPTIONS.map((option) => `<option value="${option.value}" ${option.value === value ? "selected" : ""}>${escapeHtml(getImportTargetLabel(option))}</option>`).join("")}
  </select>`;
}

function renderTransactionImportModal() {
  if (!pendingTransactionImport || !transactionImportSummary || !transactionImportMapping || !transactionImportPreview) return;
  const { file, tableData, mappings } = pendingTransactionImport;
  const rowsForPreview = tableData.dataRows.slice(0, 20);
  renderTransactionImportTemplateSelect(pendingTransactionImport.templateId || "auto");

  transactionImportSummary.innerHTML = `
    <strong>${escapeHtml(file.name)}</strong>
    <span>${escapeHtml(financeT("import.summary", "{{rows}} redova za proveru - {{columns}} kolona", { rows: tableData.dataRows.length, columns: tableData.headers.length }))}</span>
  `;

  transactionImportMapping.innerHTML = `
    <div class="transaction-import-mapping-head">
      <span>${escapeHtml(financeT("import.fileColumn", "Kolona iz fajla"))}</span>
      <span>${escapeHtml(financeT("import.appField", "Polje u aplikaciji"))}</span>
    </div>
    ${tableData.headers.map((header, index) => `
      <label class="transaction-import-map-row">
        <span>${escapeHtml(header)}</span>
        ${renderImportMappingSelect(index, mappings[index] || "ignore")}
      </label>
    `).join("")}
  `;

  transactionImportPreview.innerHTML = `
    <table class="transaction-import-table">
      <thead>
        <tr>${tableData.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rowsForPreview.map((row) => `<tr>${tableData.headers.map((_, index) => `<td>${escapeHtml(row[index] || "")}</td>`).join("")}</tr>`).join("")}
      </tbody>
    </table>
  `;
}

function setTransactionImportModalStage(stage) {
  const hasFile = stage === "mapping";
  setTextContent(transactionImportTitle, hasFile ? financeT("import.title", "Mapiranje transakcija") : financeT("actions.importTransactions", "Uvezi transakcije"));
  transactionImportUploadPanel?.classList.toggle("hidden", hasFile);
  transactionImportToolbar?.classList.toggle("hidden", !hasFile);
  transactionImportSummary?.classList.toggle("hidden", !hasFile);
  transactionImportMapping?.classList.toggle("hidden", !hasFile);
  transactionImportPreview?.classList.toggle("hidden", !hasFile);
  confirmTransactionImportBtn?.classList.toggle("hidden", !hasFile);
  if (!hasFile) {
    if (transactionImportSummary) transactionImportSummary.innerHTML = "";
    if (transactionImportMapping) transactionImportMapping.innerHTML = "";
    if (transactionImportPreview) transactionImportPreview.innerHTML = "";
    if (transactionImportTemplateNameInput) transactionImportTemplateNameInput.value = "";
  }
}

function openTransactionImportStart() {
  pendingTransactionImport = null;
  setTransactionImportModalStage("select");
  transactionImportModal?.classList.remove("hidden");
  transactionImportChooseFileBtn?.focus();
}

function openTransactionImportModal() {
  setTransactionImportModalStage("mapping");
  transactionImportModal?.classList.remove("hidden");
}

function closeTransactionImportModal() {
  pendingTransactionImport = null;
  transactionImportModal?.classList.add("hidden");
  setTransactionImportModalStage("select");
}

async function prepareTransactionImportFile(file) {
  if (!file) return;
  try {
    const buffer = await file.arrayBuffer();
    const hash = await getFileSha256(buffer);
    const rows = await parseTransactionUploadRows(file, buffer);
    const tableData = getImportTableData(rows);
    if (!tableData.headers?.length || !tableData.dataRows?.length) {
      showTransactionStatus(financeT("statusMessages.noImportTable", "Nisam pronasao tabelu u fajlu."));
      return;
    }
    const autoMappings = createAutoImportMappings(tableData.headers, tableData.normalizedHeaders);
    const revolutTemplate = DEFAULT_TRANSACTION_IMPORT_TEMPLATES[0];
    const isRevolut = ["type", "product", "started date", "completed date", "description", "amount", "fee", "currency", "state", "balance"]
      .every((header) => tableData.normalizedHeaders.includes(header));
    pendingTransactionImport = {
      file,
      buffer,
      fingerprint: buildTransactionImportFingerprint(file, hash),
      tableData,
      mappings: autoMappings,
      templateId: isRevolut ? "revolut" : "auto"
    };
    renderTransactionImportModal();
    openTransactionImportModal();
  } catch (error) {
    showTransactionStatus(error.message || financeT("statusMessages.importFailedCsv", "Upload nije uspeo. Probaj CSV export."));
  } finally {
    if (transactionUploadInput) transactionUploadInput.value = "";
  }
}

function applyTransactionImportTemplate(templateId) {
  if (!pendingTransactionImport) return;
  const templates = getTransactionImportTemplates();
  const template = templates.find((item) => item.id === templateId);
  pendingTransactionImport.templateId = template ? template.id : "auto";
  pendingTransactionImport.mappings = template
    ? getTemplateMappingsForHeaders(template, pendingTransactionImport.tableData.normalizedHeaders)
    : createAutoImportMappings(pendingTransactionImport.tableData.headers, pendingTransactionImport.tableData.normalizedHeaders);
  renderTransactionImportModal();
}

async function saveCurrentTransactionImportTemplate() {
  if (!pendingTransactionImport || !transactionImportTemplateNameInput) return;
  const name = transactionImportTemplateNameInput.value.trim();
  if (!name) {
    showTransactionStatus(financeT("statusMessages.templateNameRequired", "Unesi naziv template-a."));
    return;
  }
  const mappingsByHeader = pendingTransactionImport.tableData.normalizedHeaders.reduce((items, header, index) => {
    items[header] = getCurrentImportMappings()[index] || "ignore";
    return items;
  }, {});
  const customTemplates = loadCustomTransactionImportTemplates();
  const id = "custom-" + normalizeColumnName(name).replace(/\s+/g, "-");
  const nextTemplate = { id, name, mappings: mappingsByHeader };
  const nextTemplates = [nextTemplate, ...customTemplates.filter((template) => template.id !== id && normalizeText(template.name) !== normalizeText(name))];
  const saveResult = await saveCustomTransactionImportTemplates(nextTemplates);
  if (!saveResult.ok) return;
  pendingTransactionImport.templateId = id;
  pendingTransactionImport.mappings = getCurrentImportMappings();
  renderTransactionImportModal();
  showTransactionStatus(financeT("statusMessages.templateSaved", "Template \"{{name}}\" je sacuvan.", { name }));
}

async function confirmMappedTransactionImport() {
  if (!pendingTransactionImport) return;
  const mappings = getCurrentImportMappings();
  const importedTransactions = buildImportedTransactionsFromTable(pendingTransactionImport.tableData, mappings);
  if (!importedTransactions.length) {
    showTransactionStatus(financeT("statusMessages.noValidMappedTransactions", "Mapiranje nije pronaslo validne transakcije. Proveri Datum i Iznos."));
    return;
  }
  const newTransactions = filterNewImportedTransactions(importedTransactions);
  if (!newTransactions.length) {
    rememberImportedTransactionFile(pendingTransactionImport.fingerprint);
    if (!await saveFinanceState()) return;
    showTransactionStatus(financeT("statusMessages.allDuplicates", "Sve transakcije iz ovog fajla vec postoje. Nista nije duplirano."));
    closeTransactionImportModal();
    return;
  }
  transactions = [...newTransactions, ...transactions];
  rememberImportedTransactionFile(pendingTransactionImport.fingerprint);
  if (!await saveFinanceState()) {
    renderTransactionsPage();
    return;
  }
  await refreshTrackedAssetsAfterTransactionChange();
  renderTransactionsPage();
  const skippedCount = importedTransactions.length - newTransactions.length;
  showTransactionStatus(skippedCount ? financeT("statusMessages.importedTransactionsSkipped", "Uvezeno {{count}}, preskoceno {{skipped}} duplikata.", { count: newTransactions.length, skipped: skippedCount }) : financeT("statusMessages.importedTransactions", "Uvezeno {{count}} transakcija.", { count: newTransactions.length }));
  closeTransactionImportModal();
}

function validateTransactionForm() {
  const errors = {};
  const amount = Number(transactionAmountInput?.value);

  if (!transactionTypeInput?.value) errors.transactionType = financeT("validation.chooseTransactionType", "Izaberi tip transakcije.");
  if (!transactionAmountInput?.value) errors.transactionAmount = financeT("validation.enterAmount", "Unesi iznos.");
  else if (!Number.isFinite(amount) || amount <= 0) errors.transactionAmount = financeT("validation.amountGreaterThanZero", "Iznos mora biti veci od 0.");
  if (!transactionCategoryInput?.value) errors.transactionCategory = financeT("validation.chooseCategory", "Izaberi kategoriju.");
  if (!transactionDateInput?.value) errors.transactionDate = financeT("validation.chooseDate", "Izaberi datum.");

  document.querySelectorAll("[data-error-for]").forEach((errorEl) => {
    errorEl.textContent = errors[errorEl.dataset.errorFor] || "";
  });

  return Object.keys(errors).length === 0;
}

function clearTransactionForm() {
  transactionForm?.reset();
  if (transactionEditId) transactionEditId.value = "";
  if (transactionFormTitle) transactionFormTitle.textContent = financeT("transactions.newTitle", "Nova transakcija");
  transactionCancelEditBtn?.classList.add("hidden");
  if (transactionTypeInput) transactionTypeInput.value = "expense";
  if (transactionDateInput) transactionDateInput.value = todayIso;
  updateTransactionCategories();
  updateBudgetTransactionOptions();
  updateTransactionCashflowOptions();
  if (transactionCashflowLinkInput) transactionCashflowLinkInput.value = "";
  suggestBudgetForTransaction();
  document.querySelectorAll("[data-error-for]").forEach((errorEl) => {
    errorEl.textContent = "";
  });
}

function showTransactionStatus(message) {
  if (!transactionSaveStatus) return;
  transactionSaveStatus.textContent = message;
  transactionSaveStatus.classList.add("is-visible");
  window.clearTimeout(showTransactionStatus.timer);
  showTransactionStatus.timer = window.setTimeout(() => {
    transactionSaveStatus.classList.remove("is-visible");
  }, 2200);
}

function updateTransactionSummary() {
  const monthTransactions = getMonthTransactions();
  const income = monthTransactions.filter((transaction) => transaction.type === "income").reduce((sum, transaction) => sum + transaction.amount, 0);
  const expense = monthTransactions.filter((transaction) => transaction.type === "expense").reduce((sum, transaction) => sum + transaction.amount, 0);
  const balance = income - expense;

  if (transactionIncomeTotal) transactionIncomeTotal.textContent = "+ " + formatMoney(income);
  if (transactionExpenseTotal) transactionExpenseTotal.textContent = "- " + formatMoney(expense);
  if (transactionBalanceTotal) transactionBalanceTotal.textContent = formatMoney(balance);
}

function renderMonthlyOverview() {
  if (!monthlyOverviewContent) return;
  const monthTransactions = getMonthTransactions();
  const expenses = monthTransactions.filter((transaction) => transaction.type === "expense");
  const totalExpense = expenses.reduce((sum, transaction) => sum + transaction.amount, 0);
  const categoryTotals = expenses.reduce((totals, transaction) => {
    totals[transaction.category] = (totals[transaction.category] || 0) + transaction.amount;
    return totals;
  }, {});
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const biggestCategory = sortedCategories[0]?.[0] || financeT("overview.noExpenses", "Nema rashoda");

  const categoryHtml = sortedCategories.length
    ? sortedCategories.map(([category, amount]) => {
        const percent = totalExpense ? Math.round((amount / totalExpense) * 100) : 0;
        return `<div class="category-progress-item">
          <div><span>${escapeHtml(category)} - ${percent}%</span><span>${formatMoney(amount)}</span></div>
          <span class="category-progress-track"><i style="width:${percent}%"></i></span>
        </div>`;
      }).join("")
    : '<p class="transaction-muted">' + escapeHtml(financeT("overview.noExpensesDisplay", "Nema rashoda za prikaz.")) + '</p>';

  monthlyOverviewContent.innerHTML = `
    <div class="monthly-overview-line"><span>${escapeHtml(financeT("overview.totalExpenses", "Ukupni rashodi"))}</span><strong>${formatMoney(totalExpense)}</strong></div>
    <div class="monthly-overview-line"><span>${escapeHtml(financeT("overview.transactionCount", "Broj transakcija"))}</span><strong>${monthTransactions.length}</strong></div>
    <div class="monthly-overview-line"><span>${escapeHtml(financeT("overview.biggestCategory", "Najveca kategorija"))}</span><strong>${escapeHtml(getFinanceCategoryLabel(biggestCategory))}</strong></div>
    <div class="category-progress-list">${categoryHtml}</div>
  `;
}

function getOverviewRange() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const period = overviewPeriodSelect?.value || "month";

  if (period === "day") {
    return { start: todayStart, end: todayStart, label: financeT("filters.today", "Danas"), eyebrow: financeT("overview.todayUpper", "DANAS") };
  }

  if (period === "week") {
    const day = todayStart.getDay() || 7;
    const start = new Date(todayStart);
    start.setDate(todayStart.getDate() - day + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end, label: financeT("overview.weekOverview", "Pregled nedelje"), eyebrow: financeT("overview.thisWeekUpper", "OVA NEDELJA") };
  }

  if (period === "year") {
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear(), 11, 31),
      label: financeT("filters.currentYear", "Ova godina"),
      eyebrow: financeT("overview.thisYearUpper", "OVA GODINA")
    };
  }

  if (period === "custom") {
    const startValue = overviewStartDate?.value || todayIso;
    const endValue = overviewEndDate?.value || startValue;
    const start = new Date(startValue + "T00:00:00");
    const end = new Date(endValue + "T00:00:00");
    return {
      start: start <= end ? start : end,
      end: start <= end ? end : start,
      label: financeT("overview.customOverview", "Custom pregled"),
      eyebrow: financeT("overview.customDateUpper", "CUSTOM DATE")
    };
  }

  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    label: financeT("filters.currentMonth", "Ovaj mesec"),
    eyebrow: financeT("overview.thisMonthUpper", "OVAJ MESEC")
  };
}

function getTransactionsInRange(range) {
  return transactions.filter((transaction) => {
    const date = new Date(transaction.date + "T00:00:00");
    return date >= range.start && date <= range.end;
  });
}

function getOverviewBarItems(expenses) {
  const period = overviewPeriodSelect?.value || "month";
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Avg", "Sep", "Okt", "Nov", "Dec"];

  if (period === "year") {
    const totals = monthLabels.map((label) => ({ label, amount: 0 }));
    expenses.forEach((transaction) => {
      const date = new Date(transaction.date + "T00:00:00");
      totals[date.getMonth()].amount += transaction.amount;
    });
    return totals.filter((item) => item.amount > 0);
  }

  if (period === "month" || period === "custom") {
    const totals = expenses.reduce((items, transaction) => {
      const label = formatDateLabel(transaction.date).slice(0, 5);
      items[label] = (items[label] || 0) + transaction.amount;
      return items;
    }, {});
    return Object.entries(totals).map(([label, amount]) => ({ label, amount }));
  }

  return expenses.reduce((items, transaction) => {
    const existing = items.find((item) => item.label === transaction.category);
    if (existing) existing.amount += transaction.amount;
    else items.push({ label: transaction.category, amount: transaction.amount });
    return items;
  }, []);
}

function renderOverviewCategories(sortedCategories, totalExpense, chartType, expenses, range) {
  if (!sortedCategories.length) {
    return '<p class="transaction-muted">' + escapeHtml(financeT("overview.noExpensesDisplay", "Nema rashoda za prikaz.")) + '</p>';
  }

  if (chartType === "pie") {
    let offset = 0;
    const colors = ["#9f7b38", "#c49d45", "#637755", "#a34d3f", "#7a6b55", "#b98d6b", "#8a6a3e"];
    const segmentData = [];
    const segments = sortedCategories.map(([category, amount], index) => {
      const percent = totalExpense ? (amount / totalExpense) * 100 : 0;
      const color = colors[index % colors.length];
      const segment = `${color} ${offset}% ${offset + percent}%`;
      segmentData.push({
        category,
        percent: Math.round(percent),
        color,
        start: offset,
        end: offset + percent
      });
      offset += percent;
      return segment;
    }).join(", ");
    const encodedSegments = encodeURIComponent(JSON.stringify(segmentData));

    return `
      <div class="overview-pie-wrap">
        <div class="overview-pie-chart" data-pie-segments="${encodedSegments}" style="background: conic-gradient(${segments})"></div>
        <div class="overview-pie-highlight" aria-hidden="true"></div>
      </div>
      <div class="category-progress-list">
        ${sortedCategories.map(([category, amount], index) => {
          const percent = totalExpense ? Math.round((amount / totalExpense) * 100) : 0;
          const budgetLabel = getOverviewCategoryBudgetLabel(category, amount);
          return `<div class="overview-legend-row" data-overview-category-index="${index}"><i style="background:${colors[index % colors.length]}"></i><span>${escapeHtml(getFinanceCategoryLabel(category))} - ${percent}%</span><em>${escapeHtml(budgetLabel)}</em><strong>${formatMoney(amount)}</strong></div>`;
        }).join("")}
      </div>
    `;
  }

  if (chartType === "bar") {
    const barItems = getOverviewBarItems(expenses);
    if (!barItems.length) {
      return '<p class="transaction-muted">' + escapeHtml(financeT("overview.noExpensesBar", "Nema rashoda za bar chart.")) + '</p>';
    }
    const maxBarAmount = Math.max(...barItems.map((item) => item.amount), 1);
    const axisTopValue = Math.ceil(maxBarAmount);
    return `<div class="overview-vertical-chart">
      <div class="overview-y-axis">
        <span>${formatMoney(axisTopValue)}</span>
        <span>${formatMoney(axisTopValue / 2)}</span>
        <span>${escapeHtml(financeT("overview.zeroMoney", "0 €"))}</span>
      </div>
      <div class="overview-plot">
        <div class="overview-bars">
          ${barItems.map((item, index) => {
            const percent = Math.max(6, Math.round((item.amount / maxBarAmount) * 100));
            return `<div class="overview-bar-column">
              <div class="overview-bar-value">${formatMoney(item.amount)}</div>
              <div class="overview-bar-track">
                <i class="overview-bar-fill bar-color-${index % 5}" style="height:${percent}%"></i>
              </div>
              <strong>${escapeHtml(item.label)}</strong>
            </div>`;
          }).join("")}
        </div>
      </div>
      <div class="overview-range-label">${formatDateLabel(range.start.toISOString().slice(0, 10))} - ${formatDateLabel(range.end.toISOString().slice(0, 10))}</div>
    </div>`;
  }

  const barClass = "category-progress-list";
  return `<div class="${barClass}">
    ${sortedCategories.map(([category, amount]) => {
      const percent = totalExpense ? Math.round((amount / totalExpense) * 100) : 0;
      return `<div class="category-progress-item">
        <div><span>${escapeHtml(category)} - ${percent}%</span><span>${formatMoney(amount)}</span></div>
        <span class="category-progress-track"><i style="width:${percent}%"><em>${percent}%</em></i></span>
      </div>`;
    }).join("")}
  </div>`;
}

function buildOverviewPieGradient(segments, activeIndex = -1) {
  return "conic-gradient(" + segments.map((segment, index) => {
    const color = activeIndex === index ? segment.color : "transparent";
    return `${color} ${segment.start}% ${segment.end}%`;
  }).join(", ") + ")";
}

function setOverviewPieActiveIndex(activeIndex) {
  const pieChart = monthlyOverviewContent?.querySelector(".overview-pie-chart");
  const pieHighlight = monthlyOverviewContent?.querySelector(".overview-pie-highlight");
  if (!pieChart?.dataset.pieSegments) return;
  const segments = JSON.parse(decodeURIComponent(pieChart.dataset.pieSegments));
  if (pieHighlight) {
    pieHighlight.style.background = buildOverviewPieGradient(segments, activeIndex);
    pieHighlight.classList.toggle("active", activeIndex >= 0);
  }
  monthlyOverviewContent?.querySelectorAll("[data-overview-category-index]").forEach((row) => {
    row.classList.toggle("active", Number(row.dataset.overviewCategoryIndex) === activeIndex);
  });
}

function getOverviewPieIndexFromPointer(event, pieChart) {
  const rect = pieChart.getBoundingClientRect();
  const x = event.clientX - rect.left - rect.width / 2;
  const y = event.clientY - rect.top - rect.height / 2;
  const distance = Math.hypot(x, y);
  if (distance > rect.width / 2 || distance < rect.width * 0.06) return -1;
  const angle = (Math.atan2(y, x) * 180 / Math.PI + 450) % 360;
  const percent = angle / 360 * 100;
  const segments = JSON.parse(decodeURIComponent(pieChart.dataset.pieSegments || "[]"));
  return segments.findIndex((segment) => percent >= segment.start && percent < segment.end);
}

function getOverviewCategoryBudgetLabel(category, categoryAmount) {
  const budget = budgets.find((item) => {
    if (!item.active) return false;
    return item.categories?.some((budgetCategory) => normalizeText(budgetCategory) === normalizeText(category));
  });
  if (!budget?.amount) return "";
  return financeT("overview.budgetPercent", "{{percent}}% budzeta", {
    percent: Math.round((categoryAmount / budget.amount) * 100)
  });
}

function renderDynamicOverview() {
  if (!monthlyOverviewContent) return;
  const range = getOverviewRange();
  const periodTransactions = getTransactionsInRange(range);
  const expenses = periodTransactions.filter((transaction) => transaction.type === "expense");
  const totalExpense = expenses.reduce((sum, transaction) => sum + transaction.amount, 0);
  const categoryTotals = expenses.reduce((totals, transaction) => {
    totals[transaction.category] = (totals[transaction.category] || 0) + transaction.amount;
    return totals;
  }, {});
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const biggestCategory = sortedCategories[0]?.[0] || financeT("overview.noExpenses", "Nema rashoda");
  const chartType = overviewChartTypeSelect?.value === "list" ? "list" : "pie";

  if (overviewPeriodTitle) overviewPeriodTitle.textContent = range.label;
  if (overviewPeriodEyebrow) overviewPeriodEyebrow.textContent = range.eyebrow;
  overviewCustomDates?.classList.toggle("hidden", (overviewPeriodSelect?.value || "month") !== "custom");

  monthlyOverviewContent.innerHTML = `
    <div class="monthly-overview-line"><span>${escapeHtml(financeT("fields.period", "Period"))}</span><strong>${formatDateLabel(range.start.toISOString().slice(0, 10))} - ${formatDateLabel(range.end.toISOString().slice(0, 10))}</strong></div>
    <div class="monthly-overview-line"><span>${escapeHtml(financeT("overview.totalExpenses", "Ukupni rashodi"))}</span><strong>${formatMoney(totalExpense)}</strong></div>
    <div class="monthly-overview-line"><span>${escapeHtml(financeT("overview.transactionCount", "Broj transakcija"))}</span><strong>${periodTransactions.length}</strong></div>
    <div class="monthly-overview-line"><span>${escapeHtml(financeT("overview.biggestCategory", "Najveca kategorija"))}</span><strong>${escapeHtml(getFinanceCategoryLabel(biggestCategory))}</strong></div>
    ${renderOverviewCategories(sortedCategories, totalExpense, chartType, expenses, range)}
  `;
}

function countWeekdayInCurrentMonth(weekdayValue) {
  const targetWeekday = Number(weekdayValue);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let day = 1; day <= daysInMonth; day += 1) {
    if (new Date(year, month, day).getDay() === targetWeekday) count += 1;
  }
  return count || 4;
}

function parseCashflowDate(value) {
  if (!value) return null;
  const date = new Date(value + "T00:00:00");
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatCashflowDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCashflowPeriodRange(startValue, endValue) {
  const start = parseCashflowDate(startValue);
  const end = parseCashflowDate(endValue);
  if (!start || !end || end < start) return null;
  return { start, end };
}

function countDaysInRange(start, end) {
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
}

function countWeekdayInRange(weekdayValue, start, end) {
  const targetWeekday = Number(weekdayValue);
  if (!Number.isFinite(targetWeekday)) return 0;
  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    if (cursor.getDay() === targetWeekday) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function countBusinessDaysInRange(start, end) {
  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getDay();
    if (day >= 1 && day <= 5) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function countBusinessDaysInCurrentMonth() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return countBusinessDaysInRange(start, end);
}

function getMonthlyRecurringAmountForRange(amount, start, end) {
  let total = 0;
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const rangeStart = start > monthStart ? start : monthStart;
    const rangeEnd = end < monthEnd ? end : monthEnd;
    if (rangeStart <= rangeEnd) {
      const daysInMonth = monthEnd.getDate();
      total += amount * (countDaysInRange(rangeStart, rangeEnd) / daysInMonth);
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return total;
}

function normalizeCashflowPaymentDay(value) {
  const day = Number(value);
  return Number.isInteger(day) && day >= 1 && day <= 31 ? day : null;
}

function getCashflowPaymentWindow(item, year, monthIndex) {
  const legacyPaymentDate = parseCashflowDate(item?.paymentDate);
  const configuredStartDay = normalizeCashflowPaymentDay(item?.paymentStartDay) ?? (legacyPaymentDate ? legacyPaymentDate.getDate() : null);
  const configuredEndDay = normalizeCashflowPaymentDay(item?.paymentEndDay) ?? (legacyPaymentDate ? legacyPaymentDate.getDate() : null);
  if (!configuredStartDay || !configuredEndDay || configuredEndDay < configuredStartDay) return null;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return {
    startDay: Math.min(configuredStartDay, lastDay),
    endDay: Math.min(configuredEndDay, lastDay)
  };
}

function getMonthlyPaymentAmountForRange(item, amount, start, end) {
  if (!getCashflowPaymentWindow(item, start.getFullYear(), start.getMonth())) return getMonthlyRecurringAmountForRange(amount, start, end);
  let total = 0;
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    const paymentWindow = getCashflowPaymentWindow(item, cursor.getFullYear(), cursor.getMonth());
    const windowStart = new Date(cursor.getFullYear(), cursor.getMonth(), paymentWindow.startDay);
    const windowEnd = new Date(cursor.getFullYear(), cursor.getMonth(), paymentWindow.endDay);
    if (windowStart <= end && windowEnd >= start) total += amount;
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return total;
}

function getCashflowMonthlyAmount(item, amountKey = "amount", cashflowType = "") {
  if (cashflowType === "debt" && item?.startDate) {
    const today = new Date();
    return getCashflowDebtAmountForRange(
      item,
      new Date(today.getFullYear(), today.getMonth(), 1),
      new Date(today.getFullYear(), today.getMonth() + 1, 0)
    );
  }
  const amount = Number(item?.[amountKey] || 0);
  const frequency = item?.frequency || "monthly";
  if (frequency === "weekly" && cashflowType === "income") return (amount / 5) * countBusinessDaysInCurrentMonth();
  if (frequency === "weekly") return amount * countWeekdayInCurrentMonth(item.weekday ?? 1);
  if (frequency === "yearly") return amount / 12;
  return amount;
}

function addDebtPaymentInterval(date, frequency) {
  const next = new Date(date);
  if (frequency === "weekly") next.setDate(next.getDate() + 7);
  else if (frequency === "yearly") next.setFullYear(next.getFullYear() + 1);
  else next.setMonth(next.getMonth() + 1);
  return next;
}

function getCashflowDebtAmountForRange(item, start, end) {
  const totalDebt = Number(item?.balance || 0);
  const payment = Number(item?.monthly || 0);
  const firstPaymentDate = parseCashflowDate(item?.startDate) || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const frequency = item?.frequency || "monthly";

  if (totalDebt <= 0 || payment <= 0) return 0;
  if (frequency === "one-time") {
    return firstPaymentDate >= start && firstPaymentDate <= end ? totalDebt : 0;
  }

  let paid = 0;
  let dueDate = new Date(firstPaymentDate);
  let total = 0;
  while (dueDate <= end && paid < totalDebt) {
    const installment = Math.min(payment, totalDebt - paid);
    if (dueDate >= start) total += installment;
    paid += installment;
    dueDate = addDebtPaymentInterval(dueDate, frequency);
  }
  return total;
}

function getCashflowPeriodAmount(item, amountKey, start, end, cashflowType = "") {
  if (cashflowType === "debt") return getCashflowDebtAmountForRange(item, start, end);
  const amount = Number(item?.[amountKey] || 0);
  const frequency = item?.frequency || "monthly";
  const dayCount = countDaysInRange(start, end);
  if (frequency === "weekly" && cashflowType === "income") return (amount / 5) * countBusinessDaysInRange(start, end);
  if (frequency === "weekly") return amount * countWeekdayInRange(item.weekday ?? 1, start, end);
  if (frequency === "yearly") return (amount / 365.2425) * dayCount;
  if (cashflowType === "expense") return getMonthlyPaymentAmountForRange(item, amount, start, end);
  return getMonthlyRecurringAmountForRange(amount, start, end);
}

function getCashflowPeriodTotals(startValue, endValue) {
  const range = getCashflowPeriodRange(startValue, endValue);
  if (!range) {
    return { incomeTotal: 0, expenseTotal: 0, debtPaymentTotal: 0, budgetSavingTotal: 0, result: 0 };
  }
  const { start, end } = range;
  const incomeTotal = cashflowIncomes.reduce((sum, item) => sum + getCashflowPeriodAmount(item, "amount", start, end, "income"), 0);
  const expenseTotal = cashflowExpenses.reduce((sum, item) => sum + getCashflowPeriodAmount(item, "amount", start, end, "expense"), 0);
  const debtPaymentTotal = cashflowDebts.reduce((sum, item) => sum + getCashflowPeriodAmount(item, "monthly", start, end, "debt"), 0);
  const budgetSavingTotal = getBudgetSavingTotal() * 12 / 365.2425 * countDaysInRange(start, end);
  return {
    incomeTotal,
    expenseTotal,
    debtPaymentTotal,
    budgetSavingTotal,
    result: incomeTotal - expenseTotal - debtPaymentTotal - budgetSavingTotal
  };
}

function getCashflowPlanTotals() {
  const incomeTotal = cashflowIncomes.reduce((sum, item) => sum + getCashflowMonthlyAmount(item, "amount", "income"), 0);
  const expenseTotal = cashflowExpenses.reduce((sum, item) => sum + getCashflowMonthlyAmount(item), 0);
  const debtPaymentTotal = cashflowDebts.reduce((sum, item) => sum + getCashflowMonthlyAmount(item, "monthly", "debt"), 0);
  const budgetSavingTotal = getBudgetSavingTotal();
  return {
    incomeTotal,
    expenseTotal,
    debtPaymentTotal,
    budgetSavingTotal,
    result: incomeTotal - expenseTotal - debtPaymentTotal - budgetSavingTotal
  };
}

function getBudgetSavingTotal() {
  return budgets
    .filter((budget) => budget.active && normalizeText(budget.behavior) === normalizeText("Odvajanje novca"))
    .reduce((sum, budget) => sum + budget.amount, 0);
}

function getBudgetedTotal() {
  return budgets.filter((budget) => budget.active).reduce((sum, budget) => sum + budget.amount, 0);
}

function getBudgetIncomeTotal() {
  const cashflowIncome = cashflowIncomes.reduce((sum, item) => sum + getCashflowMonthlyAmount(item, "amount", "income"), 0);
  const transactionIncome = getMonthTransactions()
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  return cashflowIncome || transactionIncome;
}

function setDefaultCashflowProjectionDates() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear() + 1, now.getMonth(), 0);
  if (cashflowProjectionStart && !cashflowProjectionStart.value) cashflowProjectionStart.value = formatCashflowDateValue(start);
  if (cashflowProjectionEnd && !cashflowProjectionEnd.value) cashflowProjectionEnd.value = formatCashflowDateValue(end);
}

function openDatePicker(input) {
  if (!input || input.disabled || input.readOnly) return;
  input.focus({ preventScroll: true });
  if (typeof input.showPicker !== "function") return;
  try {
    input.showPicker();
  } catch (error) {
    // Some browsers only allow showPicker during a trusted click/keyboard event.
  }
}

function bindDatePickerActivation(input) {
  if (!input) return;
  const field = input.closest(".finance-field");

  input.addEventListener("click", () => openDatePicker(input));
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openDatePicker(input);
  });

  field?.addEventListener("click", (event) => {
    if (event.target === input || input.contains(event.target)) return;
    openDatePicker(input);
  });
}

function getCashflowPeriodComparisonTotals(startValue, endValue) {
  const range = getCashflowPeriodRange(startValue, endValue);
  const assetTotals = getAssetTotals();
  const investmentTotal = assetTotals.investmentTotal;
  const capitalTotal = Math.max(assetTotals.totalAssets - investmentTotal, 0);
  let extraExpenseTotal = 0;

  if (range) {
    extraExpenseTotal = transactions
      .filter((transaction) => transaction.type === "expense")
      .filter((transaction) => {
        const date = new Date(transaction.date + "T00:00:00");
        return date >= range.start && date <= range.end;
      })
      .filter((transaction) => !getMatchedCashflowOptionForTransaction(transaction) && !getTransactionBudget(transaction))
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  }

  return { capitalTotal, investmentTotal, extraExpenseTotal };
}

function getCashflowProjectionNetLabel() {
  const parts = [];
  const baseLabel = financeT("static.cashflow.periodNet", "Period neto");
  if (cashflowIncludeCapital?.checked) parts.push("+ " + financeT("static.cashflow.includeCapital", "Trenutni kapital"));
  if (cashflowIncludeInvestments?.checked) parts.push("+ " + financeT("static.cashflow.includeInvestments", "Investicije"));
  if (cashflowIncludeExtraExpenses?.checked) parts.push("- " + financeT("static.cashflow.includeExtraExpenses", "Dodatni rashodi"));
  return parts.length ? `${baseLabel} ${parts.join(" ")}` : baseLabel;
}

function renderCashflowProjection() {
  setDefaultCashflowProjectionDates();
  const now = new Date();
  const annualStart = formatCashflowDateValue(new Date(now.getFullYear(), 0, 1));
  const annualEnd = formatCashflowDateValue(new Date(now.getFullYear(), 11, 31));
  const annualTotals = getCashflowPeriodTotals(annualStart, annualEnd);
  const periodTotals = getCashflowPeriodTotals(cashflowProjectionStart?.value, cashflowProjectionEnd?.value);
  const comparisonTotals = getCashflowPeriodComparisonTotals(cashflowProjectionStart?.value, cashflowProjectionEnd?.value);
  const annualIncome = annualTotals.incomeTotal;
  const annualOutflow = annualTotals.expenseTotal + annualTotals.debtPaymentTotal + annualTotals.budgetSavingTotal;
  const annualNet = annualTotals.result;
  let periodNet = periodTotals.result;
  if (cashflowIncludeCapital?.checked) periodNet += comparisonTotals.capitalTotal;
  if (cashflowIncludeInvestments?.checked) periodNet += comparisonTotals.investmentTotal;
  if (cashflowIncludeExtraExpenses?.checked) periodNet -= comparisonTotals.extraExpenseTotal;

  if (cashflowCapitalOptionAmount) cashflowCapitalOptionAmount.textContent = "+ " + formatMoney(comparisonTotals.capitalTotal);
  if (cashflowInvestmentOptionAmount) cashflowInvestmentOptionAmount.textContent = "+ " + formatMoney(comparisonTotals.investmentTotal);
  if (cashflowExtraExpenseOptionAmount) cashflowExtraExpenseOptionAmount.textContent = "- " + formatMoney(comparisonTotals.extraExpenseTotal);

  if (cashflowAnnualIncome) cashflowAnnualIncome.textContent = formatMoney(annualIncome);
  if (cashflowAnnualOutflow) cashflowAnnualOutflow.textContent = formatMoney(annualOutflow);
  if (cashflowAnnualNet) {
    cashflowAnnualNet.textContent = formatMoney(annualNet);
    cashflowAnnualNet.classList.toggle("is-negative", annualNet < 0);
  }
  if (cashflowProjectionNet) {
    cashflowProjectionNet.textContent = formatMoney(Math.round(periodNet));
    cashflowProjectionNet.classList.toggle("is-negative", periodNet < 0);
    setTextContent(cashflowProjectionNet.closest("article")?.querySelector("span"), getCashflowProjectionNetLabel());
  }
}

function getCashflowMonthWindowItem(offset) {
  const monthDate = new Date(cashflowMonthCursor.getFullYear(), cashflowMonthCursor.getMonth() + offset, 1);
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const totals = getCashflowPeriodTotals(formatCashflowDateValue(monthStart), formatCashflowDateValue(monthEnd));
  return { monthDate, totals, isActive: offset === 0 };
}

function renderCashflowMonthStrip() {
  if (!cashflowMonthsStrip) return;
  const monthFormatter = new Intl.DateTimeFormat(financeLocale(), { month: "short" });
  const yearFormatter = new Intl.DateTimeFormat(financeLocale(), { year: "numeric" });
  cashflowMonthsStrip.innerHTML = Array.from({ length: 9 }, (_, index) => getCashflowMonthWindowItem(index - 4)).map((item) => {
    const monthName = monthFormatter.format(item.monthDate).replace(".", "");
    const yearLabel = yearFormatter.format(item.monthDate);
    const expenseTotal = item.totals.expenseTotal + item.totals.debtPaymentTotal + item.totals.budgetSavingTotal;
    return `<article class="cashflow-month-tile ${item.isActive ? "active" : ""}">
      <strong>${escapeHtml(monthName)}</strong>
      <span>${escapeHtml(yearLabel)}</span>
      <div class="cashflow-month-metric-stack">
        <div class="cashflow-month-metric">
          <small>${escapeHtml(financeT("static.cashflow.income", "Prihodi").toLowerCase())}</small>
          <em class="income">${formatMoney(item.totals.incomeTotal)}</em>
        </div>
        <div class="cashflow-month-metric">
          <small>${escapeHtml(financeT("static.cashflow.expenses", "Troskovi").toLowerCase())}</small>
          <em class="expense">${formatMoney(expenseTotal)}</em>
        </div>
      </div>
    </article>`;
  }).join("");
  window.requestAnimationFrame(() => {
    const activeTile = cashflowMonthsStrip.querySelector(".cashflow-month-tile.active");
    if (!activeTile) return;
    cashflowMonthsStrip.scrollLeft = activeTile.offsetLeft - (cashflowMonthsStrip.clientWidth - activeTile.clientWidth) / 2;
  });
}

function moveCashflowMonthCursor(direction) {
  cashflowMonthCursor = new Date(cashflowMonthCursor.getFullYear(), cashflowMonthCursor.getMonth() + direction, 1);
  renderCashflowMonthStrip();
}

function loadStoredAssetState() {
  const emptyState = { assets: createInitialAssets(), debts: createInitialAssetDebts() };
  try {
    const parsed = fixMojibakeDeep({
      assets: window.MentorData?.repositories?.assets?.getAssets?.() || [],
      debts: window.MentorData?.repositories?.assets?.getDebts?.() || []
    });
    const demoIds = new Set(["asset-cash", "asset-bank", "asset-btc", "debt-card"]);
    return {
      assets: Array.isArray(parsed.assets) ? parsed.assets.filter((asset) => !demoIds.has(asset.id)) : [],
      debts: Array.isArray(parsed.debts) ? parsed.debts.filter((debt) => !demoIds.has(debt.id)) : []
    };
  } catch (error) {
    return emptyState;
  }
}

async function saveAssetState() {
  const assetState = {
      assets,
      debts: assetDebts,
      savedAt: new Date().toISOString()
    };
  const repository = window.MentorData?.repositories?.assets;
  const result = await window.MentorDomainDurableSave.commit({
    read: () => ({ assets: repository.getAssets(), debts: repository.getDebts() }),
    next: assetState,
    save: (next) => repository.saveState(next),
    onError: () => showAssetStatus(financeT("statusMessages.sessionOnly", "Podaci su sacuvani u sesiji, ali browser nije dozvolio trajno lokalno cuvanje."), "danger")
  });
  if (!result.ok) {
    assets = result.value.assets || [];
    assetDebts = result.value.debts || [];
  }
  return result.ok;
}

function createInitialAssets() {
  return [];
}

function createInitialAssetDebts() {
  return [];
}

function getAssetIconStyle(type) {
  const icon = ASSET_ICON_BY_TYPE_KEY[getAssetTypeKey(type)] || ASSET_ICON_BY_TYPE[type] || ASSET_ICON_BY_TYPE.Ostalo;
  return getBudgetIconStyle(icon);
}

function getAssetAmount(asset) {
  if (asset.trackingMode === "debt") return asset.remainingDebt || 0;
  return asset.currentValue || 0;
}

function getFinancialResearchComparisonOptions(ideaId) {
  const matchingOptions = financialComparisonState.options.filter((option) => option.ideaId === ideaId);
  const latestSnapshot = [...financialComparisonState.savedComparisons]
    .filter((snapshot) => snapshot.ideaId === ideaId)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0];
  const options = matchingOptions.length ? matchingOptions : (Array.isArray(latestSnapshot?.options) ? latestSnapshot.options : []);
  return options.slice(0, 3).map((option, index) => {
    const metrics = getFinancialMetrics(option);
    return {
      id: option.id,
      label: "OPCIJA " + String.fromCharCode(65 + index),
      title: getFinancialOptionTitle(option),
      totalCost: metrics.optionTotalCost,
      missingAmount: metrics.missingAmount,
      participationAmount: metrics.participationAmount,
      capitalAfter: metrics.capitalAfter,
      monthlyContribution: financialComparisonState.monthlyContribution,
      monthsToGoal: metrics.monthsToGoal,
      pressureLabel: metrics.pressureStatus.label,
      pressureTone: metrics.pressureStatus.tone
    };
  });
}

async function syncFinancialResearchComparisonCache() {
  const ideaIds = Array.from(new Set([
    ...financialComparisonState.options.map((option) => option.ideaId),
    ...financialComparisonState.savedComparisons.map((snapshot) => snapshot.ideaId)
  ].filter(Boolean)));
  const ideas = {};
  ideaIds.forEach((ideaId) => {
    ideas[ideaId] = getFinancialResearchComparisonOptions(ideaId);
  });
  const repository = window.MentorData?.repositories?.comparisons;
  const result = await window.MentorDomainDurableSave.commit({
    read: () => repository.getResearchCache(),
    next: {
      updatedAt: new Date().toISOString(),
      ideas
    },
    save: (next) => repository.saveResearchCache(next)
  });
  if (result.ok) window.dispatchEvent(new CustomEvent("financialComparisonUpdated"));
  return result.ok;
}

async function persistFinancialComparisonBridge() {
  if (!await saveStoredFinancialComparisonOptions()) return false;
  if (!await saveStoredFinancialComparisonSnapshots()) return false;
  return syncFinancialResearchComparisonCache();
}

function getAssetTypeKey(type) {
  return normalizeText(fixMojibake(type || "")).replace(/[^a-z0-9]+/g, "");
}

function isLiquidAssetType(type) {
  return LIQUID_ASSET_TYPE_KEYS.has(getAssetTypeKey(type));
}

function isMaterialAssetType(type) {
  return MATERIAL_ASSET_TYPE_KEYS.has(getAssetTypeKey(type));
}

function isManualLiquidAsset(asset) {
  return asset?.trackingMode !== "live" && asset?.trackingMode !== "debt" && isLiquidAssetType(asset?.type);
}

function isAssetTransactionTrackingEnabled(asset) {
  if (!isManualLiquidAsset(asset)) return false;
  if (asset.trackTransactions === true) return true;
  if (asset.trackTransactions === false) return false;
  return normalizeText(asset.status) === normalizeText("Aktivno");
}

function getAssetTrackingStartDate(asset) {
  const value = asset?.transactionTrackingStartDate || asset?.createdAt || asset?.lastUpdatedAt || asset?.updatedAt || "";
  return String(value).slice(0, 10);
}

function getAssetManualBaseValue(asset) {
  const baseValue = Number(asset?.manualBaseValue);
  if (Number.isFinite(baseValue)) return baseValue;
  const currentValue = Number(asset?.currentValue);
  return Number.isFinite(currentValue) ? currentValue : 0;
}

function getTrackedAssetTransactionDelta(asset) {
  const startDate = getAssetTrackingStartDate(asset);
  if (!startDate) return 0;
  return transactions.reduce((sum, transaction) => {
    if (!transaction?.date || transaction.date <= startDate) return sum;
    const amount = Number(transaction.amount || 0);
    if (!Number.isFinite(amount)) return sum;
    if (transaction.type === "income") return sum + amount;
    if (transaction.type === "expense") return sum - amount;
    return sum;
  }, 0);
}

function syncTrackedTransactionAssets() {
  let changed = false;
  const now = new Date().toISOString();
  assets = assets.map((asset) => {
    if (!isManualLiquidAsset(asset)) return asset;
    const trackingEnabled = isAssetTransactionTrackingEnabled(asset);
    const baseValue = getAssetManualBaseValue(asset);
    const nextAsset = Object.assign({}, asset);
    if (nextAsset.manualBaseValue !== baseValue) {
      nextAsset.manualBaseValue = baseValue;
      changed = true;
    }
    if (!nextAsset.transactionTrackingStartDate) {
      nextAsset.transactionTrackingStartDate = getAssetTrackingStartDate(nextAsset) || now.slice(0, 10);
      changed = true;
    }
    const nextStatus = trackingEnabled ? "Aktivno" : "Neaktivno";
    if (nextAsset.status !== nextStatus) {
      nextAsset.status = nextStatus;
      changed = true;
    }
    if (!trackingEnabled) return nextAsset;
    const delta = getTrackedAssetTransactionDelta(nextAsset);
    const currentValue = Math.max(0, baseValue + delta);
    if (Number(nextAsset.currentValue || 0) !== currentValue || nextAsset.transactionDelta !== delta) {
      nextAsset.currentValue = currentValue;
      nextAsset.transactionDelta = delta;
      nextAsset.lastTransactionSyncAt = now;
      nextAsset.updatedAt = now;
      changed = true;
    }
    return nextAsset;
  });
  return changed;
}

function getAssetModeForType(type) {
  if (isMaterialAssetType(type)) return "material";
  return "liquid";
}

function getAssetTotals() {
  syncTrackedTransactionAssets();
  const totalAssets = assets
    .filter((asset) => asset.type !== "Dug")
    .reduce((sum, asset) => sum + getAssetAmount(asset), 0);
  const totalDebts = cashflowDebts.reduce((sum, debt) => sum + Number(debt.balance || 0), 0);
  const liquidAssetsTotal = assets
    .filter((asset) => isLiquidAssetType(asset.type))
    .reduce((sum, asset) => sum + getAssetAmount(asset), 0);
  const investmentTotal = assets
    .filter((asset) => asset.trackingMode === "live")
    .reduce((sum, asset) => sum + getAssetAmount(asset), 0);
  const materialTotal = assets
    .filter((asset) => isMaterialAssetType(asset.type))
    .reduce((sum, asset) => sum + getAssetAmount(asset), 0);
  return { totalAssets, totalDebts, liquidAssetsTotal, investmentTotal, materialTotal };
}

function getVisibleAssetRecords() {
  let records = assets.filter((asset) => isLiquidAssetType(asset.type));
  if (activeAssetMode === "live") {
    records = assets.filter((asset) => asset.trackingMode === "live");
  } else if (activeAssetMode === "material") {
    records = assets.filter((asset) => isMaterialAssetType(asset.type));
  }
  const typeValue = assetTypeFilter?.value || "all";
  const liquidityValue = assetLiquidityFilter?.value || "all";
  const linkedValue = assetLinkedFilter?.value || "all";
  const statusValue = assetStatusFilter?.value || "all";
  const sortValue = assetSort?.value || "value-desc";

  return records.filter((asset) => {
    return (typeValue === "all" || normalizeText(asset.type) === normalizeText(typeValue))
      && (liquidityValue === "all" || asset.liquidity === liquidityValue)
      && (linkedValue === "all" || normalizeText(asset.linkedType || "Nije povezano") === normalizeText(linkedValue))
      && (statusValue === "all" || normalizeText(asset.status) === normalizeText(statusValue));
  }).sort((a, b) => {
    if (sortValue === "value-asc") return getAssetAmount(a) - getAssetAmount(b);
    if (sortValue === "name") return String(a.name).localeCompare(String(b.name), "sr");
    if (sortValue === "created-desc") return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    if (sortValue === "updated-desc") return new Date(b.updatedAt || b.lastUpdatedAt || 0) - new Date(a.updatedAt || a.lastUpdatedAt || 0);
    return getAssetAmount(b) - getAssetAmount(a);
  });
}

function formatAssetDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(financeLocale(), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatRelativeAssetTime(value) {
  if (!value) return financeT("assets.notUpdated", "nije azurirano");
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return financeT("assets.justNow", "upravo sada");
  if (minutes < 60) return financeT("assets.minutesAgo", "pre {{count}} min", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return financeT("assets.hoursAgo", "pre {{count}} h", { count: hours });
  return formatShortDateLabel(new Date(value).toISOString().slice(0, 10));
}

function renderAssetSummary() {
  const totals = getAssetTotals();
  if (assetTotalValue) assetTotalValue.textContent = formatMoney(totals.totalAssets);
  if (assetLiquidAssetsTotal) assetLiquidAssetsTotal.textContent = formatMoney(totals.liquidAssetsTotal);
  if (assetInvestmentTotal) assetInvestmentTotal.textContent = formatMoney(totals.investmentTotal);
  if (assetMaterialTotal) assetMaterialTotal.textContent = formatMoney(totals.materialTotal);
}

function renderAssetList() {
  if (!assetList) return;
  const visibleAssets = getVisibleAssetRecords();
  if (assetCountLabel) assetCountLabel.textContent = financeT("counts.assets", "{{count}} stavki", { count: visibleAssets.length });
  if (!visibleAssets.length) {
    assetList.innerHTML = `<div class="transaction-empty-state asset-empty-state">
      <h3>${escapeHtml(financeT("empty.noAssetsTitle", "Nema stavki za izabrane filtere."))}</h3>
      <p>${escapeHtml(financeT("empty.noAssetsText", "Dodaj imovinu ili resetuj filtere da vidis siru sliku."))}</p>
      <button class="btn" type="button" data-open-first-asset>${escapeHtml(financeT("actions.newAsset", "+ Nova imovina"))}</button>
    </div>`;
    renderAssetDetails(null);
    return;
  }
  if (!visibleAssets.some((asset) => asset.id === selectedAssetId)) selectedAssetId = visibleAssets[0].id;
  assetList.innerHTML = visibleAssets.map((asset) => {
    const isLive = asset.trackingMode === "live";
    const isDebt = asset.trackingMode === "debt";
    const canTrackTransactions = isManualLiquidAsset(asset);
    const tracksTransactions = isAssetTransactionTrackingEnabled(asset);
    const profitClass = (asset.profitLoss || 0) >= 0 ? "positive" : "negative";
    return `<div class="asset-row ${selectedAssetId === asset.id ? "active" : ""}" role="button" tabindex="0" data-select-asset="${escapeHtml(asset.id)}">
      <span class="budget-symbol asset-symbol" style="${getAssetIconStyle(asset.type)}" aria-hidden="true"></span>
      <span class="asset-row-main">
        <span class="asset-row-head"><strong>${escapeHtml(asset.name)}</strong><em>${escapeHtml(asset.type)}</em></span>
        <span class="asset-row-meta">
            ${isLive ? `<span>${escapeHtml(financeT("fields.quantity", "Kolicina"))} <strong>${Number(asset.quantity || 0).toLocaleString(financeLocale(), { maximumFractionDigits: 8 })} ${escapeHtml(asset.symbol || "")}</strong></span>` : ""}
          ${isLive ? `<span>${escapeHtml(financeT("fields.price", "Cena"))} <strong>${formatAssetMoney(asset.currentPrice || 0, asset.currency)}</strong></span>` : ""}
          ${isDebt ? `<span>${escapeHtml(financeT("fields.payment", "Rata"))} <strong>${formatAssetMoney(asset.monthlyPayment || 0, asset.currency)}</strong></span>` : ""}
          <span>${escapeHtml(isDebt ? financeT("fields.remaining", "Preostalo") : financeT("fields.value", "Vrednost"))} <strong>${formatAssetMoney(getAssetAmount(asset), asset.currency)}</strong></span>
          ${isLive ? `<span class="${profitClass}">${escapeHtml(financeT("fields.dailyChange", "Dnevna promena"))} <strong>${formatPercent(asset.dailyChangePercent)}</strong></span>` : ""}
          <span>${escapeHtml(financeT("fields.liquidity", "Likvidnost"))} <strong>${escapeHtml(financeT("liquidity." + asset.liquidity, ASSET_LIQUIDITY_LABELS[asset.liquidity] || asset.liquidity))}</strong></span>
          ${canTrackTransactions ? "" : `<span>${escapeHtml(financeT("fields.status", "Status"))} <strong>${escapeHtml(asset.status)}</strong></span>`}
          ${isLive ? `<span>${escapeHtml(financeT("assets.updated", "Azurirano"))} <strong>${formatRelativeAssetTime(asset.lastUpdatedAt)}</strong></span>` : ""}
        </span>
      </span>
      ${canTrackTransactions ? `<label class="asset-row-track" title="${escapeHtml(financeT("assets.trackTransactionsHint", "Prati stanje kroz transakcije"))}">
        <input type="checkbox" data-toggle-asset-tracking="${escapeHtml(asset.id)}" ${tracksTransactions ? "checked" : ""} aria-label="${escapeHtml(financeT("static.assets.trackTransactions", "Prati transakcije"))}">
        <span>${escapeHtml(tracksTransactions ? financeT("status.active", "Aktivno") : financeT("status.inactive", "Neaktivno"))}</span>
      </label>` : `<span class="asset-row-track-placeholder" aria-hidden="true"></span>`}
      <em class="asset-row-value ${isDebt ? "negative" : ""}">${isDebt ? "-" : ""}${formatAssetMoney(getAssetAmount(asset), asset.currency)}</em>
    </div>`;
  }).join("");
  renderAssetDetails(assets.find((asset) => asset.id === selectedAssetId));
}

function renderAssetDetails(asset) {
  if (!assetDetails) return;
  if (!asset) {
    assetDetails.innerHTML = '<div class="transaction-empty-state"><h3>' + escapeHtml(financeT("assets.chooseAsset", "Izaberi imovinu.")) + '</h3><p>' + escapeHtml(financeT("assets.selectedDetailsHint", "Detalji izabrane stavke ce se prikazati ovde.")) + '</p></div>';
    return;
  }
  const isLive = asset.trackingMode === "live";
  const isDebt = asset.trackingMode === "debt";
  const profitLossPercent = asset.purchaseValue ? ((asset.profitLoss || 0) / asset.purchaseValue) * 100 : 0;
  const linkedLabel = asset.linkedType && asset.linkedType !== "Nije povezano" ? asset.linkedType : "Nije povezano";
  const history = asset.history || [];
  const detailsActive = activeAssetDetailTab !== "history";
  const detailStatusText = `${financeT("fields.status", "Status")}: ${asset.status || "-"}`;
  assetDetails.innerHTML = `
    <div class="budget-detail-head asset-detail-head">
      <div class="budget-detail-title">
        <span class="budget-symbol mini" style="${getAssetIconStyle(asset.type)}" aria-hidden="true"></span>
        <div class="transaction-card-heading"><small>${escapeHtml(financeT("assets.detailsUpper", "DETALJI"))}</small><h3>${escapeHtml(asset.name)}</h3></div>
      </div>
      <div class="budget-actions">
        <button class="transaction-icon-btn" type="button" data-edit-asset="${escapeHtml(asset.id)}">${escapeHtml(financeT("actions.editAsset", "Uredi imovinu"))}</button>
        ${isLive ? `<button class="transaction-icon-btn" type="button" data-refresh-asset="${escapeHtml(asset.id)}">${escapeHtml(financeT("actions.refreshValue", "Azuriraj vrednost"))}</button>` : ""}
        <button class="transaction-icon-btn" type="button" data-link-asset="${escapeHtml(asset.id)}">${escapeHtml(financeT("actions.linkGoal", "Povezi sa ciljem"))}</button>
        <button class="transaction-icon-btn" type="button" data-delete-asset="${escapeHtml(asset.id)}">${escapeHtml(financeT("actions.delete", "Obrisi"))}</button>
      </div>
    </div>
    <div class="asset-detail-tabs-row">
      <div class="asset-detail-tabs" role="tablist" aria-label="${escapeHtml(financeT("assets.details", "Detalji"))}">
        <button class="${detailsActive ? "active" : ""}" type="button" role="tab" aria-selected="${detailsActive}" data-asset-detail-tab="details">${escapeHtml(financeT("assets.details", "Detalji"))}</button>
        <button class="${!detailsActive ? "active" : ""}" type="button" role="tab" aria-selected="${!detailsActive}" data-asset-detail-tab="history">${escapeHtml(financeT("assets.history", "Istorija azuriranja"))}</button>
      </div>
      <span id="assetDetailStatus" class="transaction-save-status asset-detail-status is-visible" data-default-status="${escapeHtml(detailStatusText)}" aria-live="polite">${escapeHtml(detailStatusText)}</span>
    </div>
    <div class="budget-detail-grid asset-detail-grid ${detailsActive ? "" : "hidden"}">
      <span><i class="budget-mini-symbol" style="${getAssetIconStyle(asset.type)}" aria-hidden="true"></i>${escapeHtml(financeT("fields.type", "Tip"))}<strong>${escapeHtml(getFinanceCategoryLabel(asset.type))}</strong></span>
      <span><i class="budget-mini-symbol" style="${getBudgetIconStyle("coins")}" aria-hidden="true"></i>${escapeHtml(financeT("assets.symbol", "Simbol"))}<strong>${escapeHtml(asset.symbol || "-")}</strong></span>
      <span><i class="budget-mini-symbol" style="${getBudgetIconStyle("radio")}" aria-hidden="true"></i>${escapeHtml(financeT("assets.provider", "Provider"))}<strong>${escapeHtml(asset.provider || "-")}</strong></span>
      <span><i class="budget-mini-symbol" style="${getBudgetIconStyle("hash")}" aria-hidden="true"></i>${escapeHtml(financeT("assets.providerAssetId", "Provider Asset ID"))}<strong>${escapeHtml(asset.providerAssetId || "-")}</strong></span>
      <span><i class="budget-mini-symbol" style="${getBudgetIconStyle("scale")}" aria-hidden="true"></i>${escapeHtml(financeT("fields.quantity", "Kolicina"))}<strong>${asset.quantity ? `${Number(asset.quantity).toLocaleString(financeLocale(), { maximumFractionDigits: 8 })} ${escapeHtml(asset.symbol || "")}` : "-"}</strong></span>
      <span><i class="budget-mini-symbol" style="${getBudgetIconStyle("wallet")}" aria-hidden="true"></i>${escapeHtml(financeT("fields.displayCurrency", "Valuta prikaza"))}<strong>${escapeHtml(getCurrencyDisplayLabel(asset.currency || "EUR"))}</strong></span>
      <span><i class="budget-mini-symbol" style="${getBudgetIconStyle("landmark")}" aria-hidden="true"></i>${escapeHtml(financeT("fields.invested", "Ulozeno"))}<strong>${isDebt ? formatAssetMoney(asset.totalDebt || 0, asset.currency) : formatAssetMoney(asset.purchaseValue || 0, asset.currency)}</strong></span>
      <span><i class="budget-mini-symbol" style="${getBudgetIconStyle("activity")}" aria-hidden="true"></i>${escapeHtml(financeT("fields.currentPrice", "Trenutna cena"))}<strong>${isLive ? formatAssetMoney(asset.currentPrice || 0, asset.currency) : "-"}</strong></span>
      <span><i class="budget-mini-symbol" style="${getBudgetIconStyle("circle-dollar-sign")}" aria-hidden="true"></i>${escapeHtml(isDebt ? financeT("fields.remaining", "Preostalo") : financeT("fields.currentValue", "Trenutna vrednost"))}<strong>${formatAssetMoney(getAssetAmount(asset), asset.currency)}</strong></span>
      <span><i class="budget-mini-symbol" style="${getBudgetIconStyle("trending-up")}" aria-hidden="true"></i>${escapeHtml(financeT("fields.profitLoss", "Dobitak/gubitak"))}<strong>${isLive ? `${formatAssetMoney(asset.profitLoss || 0, asset.currency)} (${formatPercent(profitLossPercent)})` : "-"}</strong></span>
      <span><i class="budget-mini-symbol" style="${getBudgetIconStyle("droplets")}" aria-hidden="true"></i>${escapeHtml(financeT("fields.liquidity", "Likvidnost"))}<strong>${escapeHtml(financeT("liquidity." + asset.liquidity, ASSET_LIQUIDITY_LABELS[asset.liquidity] || asset.liquidity))}</strong></span>
      <span><i class="budget-mini-symbol" style="${getBudgetIconStyle("link")}" aria-hidden="true"></i>${escapeHtml(financeT("fields.linkedTo", "Povezano sa"))}<strong>${escapeHtml(linkedLabel === "Nije povezano" ? financeT("options.notLinked", "Nije povezano") : linkedLabel)}</strong></span>
      <span><i class="budget-mini-symbol" style="${getBudgetIconStyle("target")}" aria-hidden="true"></i>${escapeHtml(financeT("fields.priority", "Prioritet"))}<strong>${escapeHtml(asset.priority || "-")}</strong></span>
      <span><i class="budget-mini-symbol" style="${getBudgetIconStyle("badge-check")}" aria-hidden="true"></i>${escapeHtml(financeT("fields.status", "Status"))}<strong>${escapeHtml(asset.status || "-")}</strong></span>
      <span><i class="budget-mini-symbol" style="${getBudgetIconStyle("clock")}" aria-hidden="true"></i>${escapeHtml(financeT("fields.lastUpdated", "Poslednje azuriranje"))}<strong>${formatRelativeAssetTime(asset.lastUpdatedAt)}</strong></span>
      <span><i class="budget-mini-symbol" style="${getBudgetIconStyle("file-text")}" aria-hidden="true"></i>${escapeHtml(financeT("fields.note", "Beleska"))}<strong>${escapeHtml(asset.notes || "-")}</strong></span>
    </div>
    ${asset.refreshError ? `<p class="budget-note danger">${escapeHtml(asset.refreshError)}</p>` : ""}
    <div class="budget-related asset-history ${detailsActive ? "hidden" : ""}">
      <div class="transaction-card-heading"><small>${escapeHtml(financeT("assets.historyUpper", "ISTORIJA"))}</small><h3>${escapeHtml(financeT("assets.history", "Istorija azuriranja"))}</h3></div>
      ${history.length ? `<table class="transaction-table asset-history-table">
        <thead><tr><th>${escapeHtml(financeT("fields.dateTime", "Datum / vreme"))}</th><th>${escapeHtml(financeT("fields.actionDescription", "Akcija / opis"))}</th><th>${escapeHtml(financeT("fields.type", "Tip"))}</th><th>${escapeHtml(financeT("fields.category", "Kategorija"))}</th><th>${escapeHtml(financeT("fields.value", "Vrednost"))}</th></tr></thead>
        <tbody>${history.map((item) => `<tr><td>${formatAssetDate(item.createdAt)}</td><td>${escapeHtml(item.action)}</td><td>${escapeHtml(item.type)}</td><td>${escapeHtml(item.category)}</td><td>${formatAssetMoney(item.value || 0, asset.currency)}</td></tr>`).join("")}</tbody>
      </table>` : `<p class="transaction-muted">${escapeHtml(financeT("empty.noAssetHistory", "Jos nema istorije azuriranja."))}</p>`}
    </div>
  `;
}

function renderAssetsPage() {
  renderAssetSummary();
  renderAssetList();
}

function setAssetMode(mode) {
  activeAssetMode = ["liquid", "live", "material"].includes(mode) ? mode : "liquid";
  assetModeTabs.forEach((tab) => {
    const isActive = tab.dataset.assetMode === activeAssetMode;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
  renderAssetsPage();
  if (activeAssetMode === "live") refreshLiveAssets(false);
}

function resetAssetFilters() {
  if (assetTypeFilter) assetTypeFilter.value = "all";
  if (assetLiquidityFilter) assetLiquidityFilter.value = "all";
  if (assetLinkedFilter) assetLinkedFilter.value = "all";
  if (assetStatusFilter) assetStatusFilter.value = "all";
  if (assetSort) assetSort.value = "value-desc";
  renderAssetsPage();
}

async function toggleAssetTransactionTracking(assetId, enabled) {
  const asset = assets.find((item) => String(item.id) === String(assetId));
  if (!asset || !isManualLiquidAsset(asset)) return;
  const now = new Date().toISOString();
  asset.manualBaseValue = getAssetManualBaseValue(asset);
  asset.trackTransactions = Boolean(enabled);
  asset.status = enabled ? "Aktivno" : "Neaktivno";
  if (enabled && !asset.transactionTrackingStartDate) {
    asset.transactionTrackingStartDate = getAssetTrackingStartDate(asset) || now.slice(0, 10);
  }
  if (!enabled) {
    asset.currentValue = asset.manualBaseValue;
    asset.transactionDelta = 0;
  }
  asset.lastUpdatedAt = now;
  asset.updatedAt = now;
  asset.history = [
    {
      id: "hist-" + Date.now(),
      createdAt: now,
      action: enabled
        ? financeT("assets.trackingEnabled", "Ukljuceno pracenje transakcija")
        : financeT("assets.trackingDisabled", "Iskljuceno pracenje transakcija"),
      type: financeT("assets.liquidityTracking", "Pracenje likvidnosti"),
      category: asset.type,
      value: asset.manualBaseValue
    },
    ...(asset.history || [])
  ].slice(0, 12);
  syncTrackedTransactionAssets();
  selectedAssetId = asset.id;
  if (!await saveAssetState()) {
    renderAssetsPage();
    if (!document.getElementById("financeDashboardPanel")?.classList.contains("hidden")) renderFinanceOverview();
    return false;
  }
  renderAssetsPage();
  if (!document.getElementById("financeDashboardPanel")?.classList.contains("hidden")) renderFinanceOverview();
  showAssetDetailStatus(enabled
    ? financeT("statusMessages.assetTrackingEnabled", "Racun sada prati transakcije.")
    : financeT("statusMessages.assetTrackingDisabled", "Racun vise ne prati transakcije."));
  return true;
}

function openAssetModal(mode, asset = null) {
  assetForm?.reset();
  assetFormStatus?.classList.remove("is-visible", "danger");
  if (assetFormStatus) assetFormStatus.textContent = "";
  clearAssetCoinSelection();
  editingAssetId = asset?.id || null;
  if (assetFormTitle) assetFormTitle.textContent = editingAssetId ? financeT("actions.editAsset", "Uredi imovinu") : financeT("assets.newAsset", "Nova imovina");
  if (assetCurrencyInput) assetCurrencyInput.value = "EUR";
  if (assetTrackingModeInput) assetTrackingModeInput.value = asset?.trackingMode === "live" || mode === "live" ? "live" : "manual";
  if (!asset && mode === "material" && assetTypeInput) assetTypeInput.value = "Nekretnina";
  if (!asset && mode === "liquid" && assetTypeInput) setSelectValueNormalized(assetTypeInput, "Kes", "Keš");
  updateAssetFormMode();
  if (asset) {
    if (assetNameInput) assetNameInput.value = asset.name || "";
    if (assetTypeInput) assetTypeInput.value = asset.type || "Ostalo";
    if (assetValueInput) assetValueInput.value = getAssetManualBaseValue(asset) || getAssetAmount(asset) || "";
    if (assetAutoTrackTransactionsInput) assetAutoTrackTransactionsInput.checked = isAssetTransactionTrackingEnabled(asset);
    if (assetLiveTypeInput) assetLiveTypeInput.value = asset.type === "Deonice" ? "Deonice" : "Crypto";
    updateAssetFormMode();
    if (assetCoinSearchInput) assetCoinSearchInput.value = asset.name || "";
    if (assetSelectedCoinInput) assetSelectedCoinInput.value = asset.name || "";
    if (assetSymbolInput) assetSymbolInput.value = asset.symbol || "";
    if (assetProviderIdInput) assetProviderIdInput.value = asset.providerAssetId || "";
    if (assetQuantityInput) assetQuantityInput.value = asset.quantity || "";
    if (assetManualPriceInput) assetManualPriceInput.value = asset.currentPrice || "";
    if (assetPurchaseValueInput) assetPurchaseValueInput.value = asset.purchaseValue || "";
    if (assetCurrencyInput) assetCurrencyInput.value = asset.currency || "EUR";
    if (assetLiquidityInput) assetLiquidityInput.value = asset.liquidity || "medium";
    if (assetLinkedTypeInput) assetLinkedTypeInput.value = asset.linkedType || "Nije povezano";
    if (assetPriorityInput) assetPriorityInput.value = asset.priority || "Srednji";
    if (assetNoteInput) assetNoteInput.value = asset.notes || "";
  }
  assetModal?.classList.remove("hidden");
  (assetTrackingModeInput?.value === "live" ? assetCoinSearchInput : assetNameInput)?.focus();
}

function closeAssetModal() {
  assetModal?.classList.add("hidden");
  editingAssetId = null;
  assetFormStatus?.classList.remove("is-visible", "danger");
  if (assetFormStatus) assetFormStatus.textContent = "";
  if (assetFormTitle) assetFormTitle.textContent = financeT("assets.newAsset", "Nova imovina");
}

function updateAssetFormMode() {
  const isLive = assetTrackingModeInput?.value === "live";
  manualAssetFields?.classList.toggle("hidden", isLive);
  liveAssetFields?.classList.toggle("hidden", !isLive);
  updateAssetAutoTrackAvailability();
  updateLiveAssetSearchMode();
}

function updateAssetAutoTrackAvailability() {
  const canTrackTransactions = assetTrackingModeInput?.value !== "live" && isLiquidAssetType(assetTypeInput?.value || "");
  const field = assetAutoTrackTransactionsInput?.closest(".finance-field");
  field?.classList.toggle("hidden", !canTrackTransactions);
  if (assetAutoTrackTransactionsInput) {
    assetAutoTrackTransactionsInput.disabled = !canTrackTransactions;
    if (!canTrackTransactions) assetAutoTrackTransactionsInput.checked = false;
  }
}

function clearAssetCoinSelection() {
  if (assetCoinResults) assetCoinResults.innerHTML = "";
  if (assetSelectedCoinInput) assetSelectedCoinInput.value = "";
  if (assetSymbolInput) assetSymbolInput.value = "";
  if (assetProviderIdInput) assetProviderIdInput.value = "";
}

function updateLiveAssetSearchMode() {
  const isStock = assetLiveTypeInput?.value === "Deonice";
  clearAssetCoinSelection();
  if (assetCoinSearchInput) {
    assetCoinSearchInput.value = "";
    assetCoinSearchInput.placeholder = isStock ? "npr. AAPL.US, TSLA.US, MSFT.US" : "npr. ONDO, Bitcoin, Ethereum";
  }
  stockManualPriceField?.classList.toggle("hidden", !isStock);
  if (assetManualPriceInput) assetManualPriceInput.value = "";
  if (assetCurrencyInput && isStock && assetCurrencyInput.value !== "USD") assetCurrencyInput.value = "USD";
  if (assetCurrencyInput && !isStock && assetCurrencyInput.value !== "EUR") assetCurrencyInput.value = "EUR";
}

function showAssetStatus(message, tone) {
  [assetSaveStatus, assetFormStatus].forEach((statusEl) => {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.toggle("danger", tone === "danger");
    statusEl.classList.add("is-visible");
  });
  window.clearTimeout(showAssetStatus.timer);
  showAssetStatus.timer = window.setTimeout(() => {
    assetSaveStatus?.classList.remove("is-visible");
    assetFormStatus?.classList.remove("is-visible");
  }, 3200);
}

function showAssetDetailStatus(message, tone) {
  const statusEl = document.getElementById("assetDetailStatus");
  if (!statusEl) {
    showAssetStatus(message, tone);
    return;
  }
  statusEl.textContent = message;
  statusEl.classList.toggle("danger", tone === "danger");
  statusEl.classList.add("is-visible");
  window.clearTimeout(showAssetDetailStatus.timer);
  showAssetDetailStatus.timer = window.setTimeout(() => {
    const defaultStatus = statusEl.dataset.defaultStatus || "";
    statusEl.textContent = defaultStatus;
    statusEl.classList.remove("danger");
    statusEl.classList.toggle("is-visible", Boolean(defaultStatus));
  }, 3200);
}

function getAssetFormNumber(input) {
  const raw = String(input?.value || "").trim().replace(",", ".");
  const value = Number(raw);
  return Number.isFinite(value) ? value : NaN;
}

function requireAssetText(input, message) {
  const value = input?.value.trim() || "";
  if (value) return value;
  showAssetStatus(message, "danger");
  input?.focus();
  return "";
}

function requirePositiveAssetNumber(input, message) {
  const value = getAssetFormNumber(input);
  if (Number.isFinite(value) && value > 0) return value;
  showAssetStatus(message, "danger");
  input?.focus();
  return NaN;
}

function formatPercent(value) {
  if (!Number.isFinite(Number(value))) return "-";
  const number = Number(value);
  const sign = number > 0 ? "+" : "";
  return `${sign}${number.toLocaleString(financeLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function formatAssetMoney(amount, currency) {
  const safeCurrency = ["EUR", "USD", "GBP"].includes(currency) ? currency : "EUR";
  return new Intl.NumberFormat(financeLocale(), {
    style: "currency",
    currency: safeCurrency,
    minimumFractionDigits: Math.round(Number(amount || 0) * 100) % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  }).format(Number(amount || 0));
}

function getCurrencyDisplayLabel(currency) {
  if (currency === "EUR") return "€";
  return currency || "€";
}

async function fetchJsonWithFallback(urls) {
  let lastError = null;
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("HTTP " + response.status);
      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Nema odgovora.");
}

async function searchCryptoAssets(query) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const encoded = encodeURIComponent(trimmed);
  const data = await fetchJsonWithFallback([
    `/api/assets/crypto/search?query=${encoded}`,
    `https://api.coinpaprika.com/v1/search?q=${encoded}&c=currencies&limit=8`
  ]);
  const currencies = Array.isArray(data) ? data : (data.currencies || []);
  return currencies.slice(0, 8).map((coin) => ({
    provider: coin.provider || "coinpaprika",
    providerAssetId: coin.providerAssetId || coin.id,
    name: coin.name,
    symbol: coin.symbol,
    rank: coin.rank,
    type: coin.type || "coin"
  })).filter((coin) => coin.providerAssetId && coin.name);
}

function normalizeStooqTicker(query) {
  return String(query || "")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();
}

function createStooqTickerSuggestions(query) {
  const ticker = normalizeStooqTicker(query);
  if (ticker.length < 1) return [];
  const hasMarketSuffix = ticker.includes(".");
  const baseTicker = ticker.toUpperCase();
  const suggestions = [
    {
      provider: "manual",
      providerAssetId: ticker,
      name: baseTicker,
      symbol: baseTicker,
      type: "stock"
    }
  ];
  if (!hasMarketSuffix && /^[a-z0-9-]+$/i.test(ticker)) {
    suggestions.unshift({
      provider: "manual",
      providerAssetId: `${ticker}.us`,
      name: `${baseTicker} US`,
      symbol: `${baseTicker}.US`,
      type: "stock"
    });
  }
  return suggestions;
}

async function searchStockAssets(query) {
  const trimmed = query.trim();
  if (trimmed.length < 1) return [];
  return createStooqTickerSuggestions(trimmed);
}

async function getCryptoPrice(providerAssetId, currency) {
  const cacheKey = `coinpaprika:${providerAssetId}:${currency}`;
  const cached = assetPriceCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < ASSET_PRICE_CACHE_MS) return cached.data;
  const encodedId = encodeURIComponent(providerAssetId);
  const encodedCurrency = encodeURIComponent(currency || "EUR");
  const data = await fetchJsonWithFallback([
    `/api/assets/crypto/price?providerAssetId=${encodedId}&currency=${encodedCurrency}`,
    `https://api.coinpaprika.com/v1/tickers/${encodedId}?quotes=${encodedCurrency}`
  ]);
  const quote = data.quotes?.[currency] || data.quotes?.[String(currency).toUpperCase()] || {};
  const price = {
    currentPrice: Number(data.currentPrice ?? quote.price),
    currency: data.currency || currency || "EUR",
    lastUpdatedAt: data.lastUpdatedAt || data.last_updated || new Date().toISOString(),
    dailyChangePercent: Number(data.dailyChangePercent ?? quote.percent_change_24h),
    source: data.source || "coinpaprika"
  };
  if (!Number.isFinite(price.currentPrice)) throw new Error(financeT("assets.priceUnavailable", "Cena trenutno nije mogla biti osvezena."));
  assetPriceCache.set(cacheKey, { data: price, cachedAt: Date.now() });
  return price;
}

async function getLiveAssetPrice(asset) {
  if (asset.type === "Deonice") {
    throw new Error(financeT("assets.stockManualOnly", "Za deonice koristi rucno azuriranje cene."));
  }
  return getCryptoPrice(asset.providerAssetId, asset.currency || "EUR");
}

async function handleAssetInstrumentSearch() {
  const query = assetCoinSearchInput?.value.trim() || "";
  clearAssetCoinSelection();
  const isStock = assetLiveTypeInput?.value === "Deonice";
  if (!assetCoinResults || query.length < (isStock ? 1 : 2)) return;
  const instrumentType = isStock
    ? financeT("assets.stockInstrument", "deonicu")
    : financeT("assets.cryptoInstrument", "crypto imovinu");
  assetCoinResults.innerHTML = `<p class="transaction-muted">${escapeHtml(financeT("assets.searchingInstrument", "Trazim {{type}}...", { type: instrumentType }))}</p>`;
  try {
    const results = isStock ? await searchStockAssets(query) : await searchCryptoAssets(query);
    if (!results.length) {
      assetCoinResults.innerHTML = `<p class="transaction-muted">${escapeHtml(financeT("assets.instrumentNotFound", "Nije pronadjena {{type}} za ovaj unos.", { type: instrumentType }))}</p>`;
      return;
    }
    assetCoinResults.innerHTML = results.map((item) => `<button type="button" data-select-coin="${escapeHtml(item.providerAssetId)}" data-coin-name="${escapeHtml(item.name)}" data-coin-symbol="${escapeHtml(item.symbol || "")}" data-asset-provider="${escapeHtml(item.provider || (isStock ? "manual" : "coinpaprika"))}">
      <strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.symbol || "")}${item.rank ? ` - rank ${escapeHtml(item.rank)}` : ""}</span>
    </button>`).join("");
  } catch (error) {
    assetCoinResults.innerHTML = `<p class="transaction-muted">${escapeHtml(financeT("assets.searchUnavailable", "Cena ili pretraga trenutno nisu dostupni. Pokusaj ponovo."))}</p>`;
  }
}

async function saveAsset(event) {
  event.preventDefault();
  const mode = assetTrackingModeInput?.value === "live" ? "live" : "manual";
  const now = new Date().toISOString();
  if (editingAssetId) {
    const asset = assets.find((item) => item.id === editingAssetId);
    if (!asset) return;
    if (mode === "manual") {
      const name = requireAssetText(assetNameInput, financeT("statusMessages.assetNameRequired", "Unesi naziv imovine."));
      const value = requirePositiveAssetNumber(assetValueInput, financeT("statusMessages.assetValueRequired", "Unesi vrednost imovine vecu od 0."));
      if (!name || !Number.isFinite(value)) return;
      const trackTransactions = Boolean(assetAutoTrackTransactionsInput?.checked);
      Object.assign(asset, {
        name,
        type: assetTypeInput?.value || "Ostalo",
        trackingMode: "manual",
        provider: null,
        providerAssetId: "",
        symbol: "",
        quantity: null,
        unit: "",
        currentPrice: null,
        manualBaseValue: value,
        currentValue: value,
        transactionDelta: 0,
        purchaseValue: 0,
        purchasePrice: null,
        profitLoss: 0,
        dailyChangePercent: null,
        currency: assetCurrencyInput?.value || "EUR",
        liquidity: assetLiquidityInput?.value || "medium",
        linkedType: assetLinkedTypeInput?.value || "Nije povezano",
        priority: assetPriorityInput?.value || "Srednji",
        status: trackTransactions ? "Aktivno" : "Neaktivno",
        trackTransactions,
        transactionTrackingStartDate: asset.transactionTrackingStartDate || asset.createdAt?.slice(0, 10) || now.slice(0, 10),
        notes: assetNoteInput?.value.trim() || "",
        lastUpdatedAt: now,
        updatedAt: now
      });
      asset.history = [{ id: "hist-" + Date.now(), createdAt: now, action: "Izmenjena imovina", type: "Rucni unos", category: asset.type, value }, ...(asset.history || [])];
      syncTrackedTransactionAssets();
      selectedAssetId = asset.id;
      if (!await saveAssetState()) {
        renderAssetsPage();
        return;
      }
      closeAssetModal();
      setAssetMode(getAssetModeForType(asset.type));
      showAssetStatus(financeT("statusMessages.assetUpdated", "Imovina je azurirana."));
      return;
    }

    const providerAssetId = assetProviderIdInput?.value.trim();
    const name = assetSelectedCoinInput?.value.trim();
    const symbol = assetSymbolInput?.value.trim();
    const quantity = getAssetFormNumber(assetQuantityInput);
    const purchaseValue = getAssetFormNumber(assetPurchaseValueInput);
    const manualPrice = getAssetFormNumber(assetManualPriceInput);
    const currency = assetCurrencyInput?.value || "EUR";
    const liveType = assetLiveTypeInput?.value === "Deonice" ? "Deonice" : "Crypto";
    const nextPrice = liveType === "Deonice" ? manualPrice : Number(asset.currentPrice || 0);
    if (!providerAssetId || !name) {
      showAssetStatus(financeT("statusMessages.assetInstrumentRequired", "Izaberi imovinu iz pretrage."), "danger");
      assetCoinSearchInput?.focus();
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      showAssetStatus(financeT("statusMessages.assetQuantityRequired", "Unesi kolicinu vecu od 0."), "danger");
      assetQuantityInput?.focus();
      return;
    }
    if (liveType === "Deonice" && (!Number.isFinite(manualPrice) || manualPrice <= 0)) {
      showAssetStatus(financeT("statusMessages.stockPriceRequired", "Unesi trenutnu cenu deonice."), "danger");
      return;
    }
    const currentValue = quantity * (Number.isFinite(nextPrice) ? nextPrice : 0);
    const invested = Number.isFinite(purchaseValue) ? purchaseValue : 0;
    Object.assign(asset, {
      name,
      type: liveType,
      trackingMode: "live",
      provider: liveType === "Deonice" ? "manual" : "coinpaprika",
      providerAssetId,
      symbol,
      quantity,
      unit: symbol,
      currency,
      manualBaseValue: null,
      purchaseValue: invested,
      purchasePrice: invested && quantity ? invested / quantity : null,
      currentPrice: nextPrice,
      currentValue,
      transactionDelta: 0,
      profitLoss: currentValue - invested,
      liquidity: assetLiquidityInput?.value || "high",
      linkedType: assetLinkedTypeInput?.value || "Nije povezano",
      priority: assetPriorityInput?.value || "Srednji",
      status: "Praceno",
      trackTransactions: false,
      transactionTrackingStartDate: "",
      notes: assetNoteInput?.value.trim() || "",
      lastUpdatedAt: now,
      updatedAt: now
    });
    asset.history = [{ id: "hist-" + Date.now(), createdAt: now, action: "Izmenjena imovina", type: "Izmena", category: liveType, value: currentValue }, ...(asset.history || [])];
    selectedAssetId = asset.id;
    if (!await saveAssetState()) {
      renderAssetsPage();
      return;
    }
    closeAssetModal();
    setAssetMode("live");
    showAssetStatus(financeT("statusMessages.assetUpdated", "Imovina je azurirana."));
    return;
  }
  if (mode === "manual") {
    const name = requireAssetText(assetNameInput, financeT("statusMessages.assetNameRequired", "Unesi naziv imovine."));
    const value = requirePositiveAssetNumber(assetValueInput, financeT("statusMessages.assetValueRequired", "Unesi vrednost imovine vecu od 0."));
    if (!name || !Number.isFinite(value)) return;
    const trackTransactions = Boolean(assetAutoTrackTransactionsInput?.checked);
    const asset = {
      id: "asset-" + Date.now(),
      name,
      type: assetTypeInput?.value || "Ostalo",
      trackingMode: "manual",
      provider: null,
      providerAssetId: "",
      symbol: "",
      quantity: null,
      unit: "",
      currency: assetCurrencyInput?.value || "EUR",
      manualBaseValue: value,
      purchaseValue: 0,
      purchasePrice: null,
      currentPrice: null,
      currentValue: value,
      transactionDelta: 0,
      profitLoss: 0,
      dailyChangePercent: null,
      liquidity: assetLiquidityInput?.value || "medium",
      linkedType: assetLinkedTypeInput?.value || "Nije povezano",
      linkedId: "",
      priority: assetPriorityInput?.value || "Srednji",
      status: trackTransactions ? "Aktivno" : "Neaktivno",
      trackTransactions,
      transactionTrackingStartDate: now.slice(0, 10),
      lastUpdatedAt: now,
      notes: assetNoteInput?.value.trim() || "",
      createdAt: now,
      updatedAt: now,
      history: [{ id: "hist-" + Date.now(), createdAt: now, action: "Dodata imovina", type: "Rucni unos", category: assetTypeInput?.value || "Ostalo", value }]
    };
    assets = [asset, ...assets];
    selectedAssetId = asset.id;
    if (!await saveAssetState()) {
      renderAssetsPage();
      return;
    }
    setAssetMode(getAssetModeForType(asset.type));
    closeAssetModal();
    showAssetStatus(financeT("statusMessages.assetSaved", "Imovina je sacuvana."));
    return;
  }

  const providerAssetId = assetProviderIdInput?.value.trim();
  const name = assetSelectedCoinInput?.value.trim();
  const symbol = assetSymbolInput?.value.trim();
  const quantity = getAssetFormNumber(assetQuantityInput);
  const purchaseValue = getAssetFormNumber(assetPurchaseValueInput);
  const manualPrice = getAssetFormNumber(assetManualPriceInput);
  const currency = assetCurrencyInput?.value || "EUR";
  const liveType = assetLiveTypeInput?.value === "Deonice" ? "Deonice" : "Crypto";
  const provider = liveType === "Deonice" ? "manual" : "coinpaprika";
  if (!providerAssetId || !name) {
    showAssetStatus(financeT("statusMessages.assetInstrumentRequired", "Izaberi imovinu iz pretrage."), "danger");
    assetCoinSearchInput?.focus();
    return;
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    showAssetStatus(financeT("statusMessages.assetQuantityRequired", "Unesi kolicinu vecu od 0."), "danger");
    assetQuantityInput?.focus();
    return;
  }
  if (liveType === "Deonice" && (!Number.isFinite(manualPrice) || manualPrice <= 0)) {
    showAssetStatus(financeT("statusMessages.stockPriceRequired", "Unesi trenutnu cenu deonice."), "danger");
    return;
  }
  const initialPrice = liveType === "Deonice" ? manualPrice : 0;
  const initialValue = quantity * initialPrice;
  const asset = {
    id: "asset-" + Date.now(),
    name,
    type: liveType,
    trackingMode: "live",
    provider,
    providerAssetId,
    symbol,
    quantity,
    unit: symbol,
    currency,
    manualBaseValue: null,
    purchaseValue: Number.isFinite(purchaseValue) ? purchaseValue : 0,
    purchasePrice: Number.isFinite(purchaseValue) && quantity ? purchaseValue / quantity : null,
    currentPrice: initialPrice,
    currentValue: initialValue,
    transactionDelta: 0,
    profitLoss: initialValue - (Number.isFinite(purchaseValue) ? purchaseValue : 0),
    dailyChangePercent: null,
    liquidity: assetLiquidityInput?.value || "high",
    linkedType: assetLinkedTypeInput?.value || "Nije povezano",
    linkedId: "",
    priority: assetPriorityInput?.value || "Srednji",
    status: "Praceno",
    trackTransactions: false,
    transactionTrackingStartDate: "",
    lastUpdatedAt: now,
    notes: assetNoteInput?.value.trim() || "",
    createdAt: now,
    updatedAt: now,
    history: [{ id: "hist-" + Date.now(), createdAt: now, action: `Kupovina ${name}`, type: "Kupovina", category: liveType, value: -Math.abs(Number.isFinite(purchaseValue) ? purchaseValue : 0) }]
  };
  assets = [asset, ...assets];
  selectedAssetId = asset.id;
  if (!await saveAssetState()) {
    renderAssetsPage();
    return;
  }
  closeAssetModal();
  setAssetMode("live");
  if (liveType === "Deonice") {
    showAssetStatus(financeT("statusMessages.stockSavedManual", "Deonica je sacuvana sa rucno unetom cenom."));
  } else {
    showAssetStatus(financeT("statusMessages.assetSavedRefreshing", "Imovina je sacuvana. Povlacim trenutnu cenu..."));
    await refreshSingleLiveAsset(asset.id, true);
  }
}

function handleAssetFormSave(event) {
  event.preventDefault();
  saveAsset(event).catch((error) => {
    showAssetStatus(error?.message || financeT("statusMessages.assetSaveFailed", "Imovina nije sacuvana. Proveri unos i pokusaj ponovo."), "danger");
  });
}

async function refreshSingleLiveAsset(assetId, announce, stillActive = () => true) {
  const asset = assets.find((item) => item.id === assetId && item.trackingMode === "live");
  if (!asset) return;
  if (asset.type === "Deonice") {
    const nextPriceValue = window.prompt(financeT("assets.stockPricePrompt", "Unesi novu cenu za {{name}}:", { name: asset.symbol || asset.name }), asset.currentPrice || "");
    if (nextPriceValue === null) return;
    const nextPrice = Number(String(nextPriceValue).replace(",", "."));
    if (!Number.isFinite(nextPrice) || nextPrice <= 0) {
      showAssetStatus(financeT("statusMessages.priceAboveZero", "Cena mora biti veca od 0."), "danger");
      return;
    }
    const currentValue = (asset.quantity || 0) * nextPrice;
    asset.currentPrice = nextPrice;
    asset.currentValue = currentValue;
    asset.profitLoss = currentValue - (asset.purchaseValue || 0);
    asset.dailyChangePercent = null;
    asset.lastUpdatedAt = new Date().toISOString();
    asset.updatedAt = asset.lastUpdatedAt;
    asset.refreshError = "";
    asset.history = [
      { id: "hist-" + Date.now(), createdAt: asset.lastUpdatedAt, action: "Rucno azurirana cena", type: "Rucni update", category: "Deonice", value: currentValue },
      ...(asset.history || [])
    ].slice(0, 12);
    if (!await saveAssetState()) {
      renderAssetsPage();
      return;
    }
    renderAssetsPage();
    if (announce) showAssetStatus(financeT("statusMessages.stockPriceUpdated", "Cena deonice je rucno azurirana."));
    return;
  }
  try {
    const price = await getLiveAssetPrice(asset);
    if (!stillActive()) return;
    const currentValue = (asset.quantity || 0) * price.currentPrice;
    asset.currentPrice = price.currentPrice;
    asset.currentValue = currentValue;
    asset.profitLoss = currentValue - (asset.purchaseValue || 0);
    asset.dailyChangePercent = Number.isFinite(price.dailyChangePercent) ? price.dailyChangePercent : asset.dailyChangePercent;
    asset.lastUpdatedAt = new Date().toISOString();
    asset.updatedAt = asset.lastUpdatedAt;
    asset.refreshError = "";
    asset.history = [
      { id: "hist-" + Date.now(), createdAt: asset.lastUpdatedAt, action: "Azurirana vrednost", type: "Pracenje", category: asset.type, value: currentValue },
      ...(asset.history || [])
    ].slice(0, 12);
    const saved = await saveAssetState();
    if (saved && announce) showAssetStatus(financeT("statusMessages.valueRefreshed", "Vrednost je osvezena."));
  } catch (error) {
    if (!stillActive()) return;
    asset.refreshError = error?.message || financeT("assets.priceUnavailable", "Cena trenutno nije mogla biti osvezena.");
    await saveAssetState();
    if (announce) showAssetStatus(asset.refreshError, "danger");
  }
  if (stillActive()) renderAssetsPage();
}

async function refreshLiveAssets(announce) {
  if (!announce && !isFinanceAssetsActive()) return;
  const liveAssets = assets.filter((asset) => asset.trackingMode === "live" && asset.type !== "Deonice");
  try {
    const response = await fetch("/api/assets/live/refresh", { method: "POST" });
    if (response.ok) {
      const data = await response.json();
      if (!announce && !isFinanceAssetsActive()) return;
      const refreshedAssets = Array.isArray(data) ? data : (data.assets || []);
      if (refreshedAssets.length) {
        const refreshedById = new Map(refreshedAssets.map((asset) => [asset.id, asset]));
        assets = assets.map((asset) => refreshedById.has(asset.id) ? Object.assign({}, asset, refreshedById.get(asset.id)) : asset);
        if (!await saveAssetState()) {
          if (isFinanceAssetsActive()) renderAssetsPage();
          return;
        }
        if (isFinanceAssetsActive()) renderAssetsPage();
        if (announce) showAssetStatus(financeT("statusMessages.investmentsRefreshed", "Investicije su osvezene."));
        return;
      }
    }
  } catch (error) {
    // Static MVP fallback: refresh each live asset directly through the service layer.
  }
  for (const asset of liveAssets) {
    if (!announce && !isFinanceAssetsActive()) return;
    await refreshSingleLiveAsset(asset.id, false, isFinanceAssetsActive);
  }
  if (announce) showAssetStatus(financeT("statusMessages.trackedAssetsRefreshed", "Pracena imovina je osvezena."));
}

async function deleteAssetRecord(id) {
  assets = assets.filter((asset) => asset.id !== id);
  selectedAssetId = getVisibleAssetRecords()[0]?.id || assets[0]?.id || null;
  if (!await saveAssetState()) {
    renderAssetsPage();
    return;
  }
  renderAssetsPage();
  showAssetStatus(financeT("statusMessages.itemDeleted", "Stavka je obrisana."));
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getBudgetTransactions(budget) {
  const matchesBudget = getBudgetMatcher(budget);
  return getMonthTransactions().filter((transaction) => {
    if (transaction.type !== "expense" && normalizeText(budget.behavior) !== normalizeText("Odvajanje novca")) return false;
    return matchesBudget(transaction);
  });
}

function getBudgetUsedAmount(budget) {
  return getBudgetTransactions(budget).reduce((sum, transaction) => sum + transaction.amount, 0);
}

function getBudgetStatus(budget) {
  const used = getBudgetUsedAmount(budget);
  const ratio = budget.amount ? used / budget.amount : 0;
  if (normalizeText(budget.behavior) === normalizeText("Obavezno placanje")) return used >= budget.amount ? "Placeno" : "Obavezno";
  if (normalizeText(budget.behavior) === normalizeText("Odvajanje novca")) return used >= budget.amount ? "Ispunjeno" : "Aktivno";
  if (ratio > 1) return "Prekoraceno";
  if (ratio === 1) return "Limit dostignut";
  if (ratio >= 0.8) return "Blizu limita";
  return "Dobro";
}

function getBudgetTone(budget) {
  const used = getBudgetUsedAmount(budget);
  const ratio = budget.amount ? used / budget.amount : 0;
  if (ratio > 1) return "danger";
  if (ratio >= 1) return "warning";
  if (ratio >= 0.8) return "warning";
  if (normalizeText(budget.behavior) === normalizeText("Odvajanje novca") && ratio >= 1) return "complete";
  return "good";
}

function getBudgetPercent(budget) {
  const used = getBudgetUsedAmount(budget);
  return budget.amount ? Math.round((used / budget.amount) * 100) : 0;
}

function createBudgetRenderCache() {
  const monthTransactions = getMonthTransactions();
  const budgetMetaById = new Map();
  budgets.forEach((budget) => {
    const matchesBudget = getBudgetMatcher(budget);
    const includesNonExpenses = normalizeText(budget.behavior) === normalizeText("Odvajanje novca");
    const used = monthTransactions.reduce((sum, transaction) => {
      if (transaction.type !== "expense" && !includesNonExpenses) return sum;
      return matchesBudget(transaction) ? sum + transaction.amount : sum;
    }, 0);
    const ratio = budget.amount ? used / budget.amount : 0;
    let tone = "good";
    if (ratio > 1) tone = "danger";
    else if (ratio >= 0.8) tone = "warning";
    else if (includesNonExpenses && ratio >= 1) tone = "complete";
    budgetMetaById.set(String(budget.id), {
      used,
      percent: budget.amount ? Math.round(ratio * 100) : 0,
      tone
    });
  });
  return {
    budgetsById: new Map(budgets.map((budget) => [String(budget.id), budget])),
    budgetMetaById
  };
}

function getBudgetRemaining(budget) {
  return budget.amount - getBudgetUsedAmount(budget);
}

function getDaysLeftInMonth() {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return Math.max(1, end.getDate() - now.getDate() + 1);
}

function getBudgetInsight(budget) {
  const status = getBudgetStatus(budget);
  const tone = getBudgetTone(budget);
  const used = getBudgetUsedAmount(budget);
  const remaining = getBudgetRemaining(budget);
  const percent = getBudgetPercent(budget);
  const categoryLabel = budget.categories?.[0] || budget.name;
  const dailyRoom = remaining / getDaysLeftInMonth();
  const behavior = normalizeText(budget.behavior);

  if (tone === "danger") {
    return {
      tone,
      text: `Prekoracen je plan za ${categoryLabel}. Potroseno je ${formatMoney(used)}, sto je ${percent}% budzeta. Sledeci korak je pauza novih troskova ili korekcija limita.`
    };
  }

  if (status === "Blizu limita") {
    return {
      tone,
      text: `Blizu si limita za ${categoryLabel}. Ostaje ${formatMoney(remaining)} do kraja meseca, oko ${formatMoney(Math.max(0, dailyRoom))} dnevno ako zelis da ostanes u planu.`
    };
  }

  if (status === "Limit dostignut") {
    return {
      tone,
      text: `Limit za ${categoryLabel} je dostignut. Budzet je na 100%, pa svaki sledeci trosak u ovoj kategoriji prelazi mesecni plan.`
    };
  }

  if (status === "Ispunjeno" || status === "Placeno") {
    return {
      tone: "complete",
      text: `${budget.name} je ispunjen za ovaj mesec. Planirani iznos je pokriven i ovaj deo budzeta vise ne trazi dodatnu akciju.`
    };
  }

  if (behavior === normalizeText("Odvajanje novca")) {
    return {
      tone,
      text: `Odvajanje za ${budget.name} ide po planu. Do sada je odvojeno ${formatMoney(used)}, a cilj za mesec je ${formatMoney(budget.amount)}.`
    };
  }

  return {
    tone,
    text: `Kontrola svakodnevnih troskova za ${categoryLabel} ide po planu. Potroseno je ${formatMoney(used)} od ${formatMoney(budget.amount)}, pa budzet jos uvek dobro drzi ritam.`
  };
}

function getBudgetIcon(budget) {
  if (budget?.icon) return budget.icon;
  const categoryKey = normalizeText(budget?.categories?.[0] || "");
  if (BUDGET_ICON_BY_CATEGORY[categoryKey]) return BUDGET_ICON_BY_CATEGORY[categoryKey];
  if (normalizeText(budget?.type) === normalizeText("Cilj")) return "target";
  if (normalizeText(budget?.type) === normalizeText("Ideja")) return "lightbulb";
  if (normalizeText(budget?.type) === normalizeText("Obaveza")) return "receipt";
  return "wallet";
}

function getCategoryIcon(category) {
  const categoryKey = normalizeText(category);
  return BUDGET_ICON_BY_CATEGORY[categoryKey] || "wallet";
}

function normalizeIconName(icon) {
  return String(icon || "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
}

function getBudgetIconStyle(budgetOrIcon) {
  const icon = typeof budgetOrIcon === "string" ? budgetOrIcon : getBudgetIcon(budgetOrIcon);
  const safeIcon = BUDGET_ICON_OPTIONS.includes(icon) ? icon : "wallet";
  const url = window.MentorIconSystem.getIconUrl(safeIcon);
  return `--budget-icon-url: url(&quot;${url}&quot;)`;
}

function getLucideIconStyle(icon, fallback = "wallet") {
  const safeIcon = normalizeIconName(icon) || fallback;
  const finalIcon = /^[a-z0-9-]+$/.test(safeIcon) ? safeIcon : fallback;
  const url = window.MentorIconSystem.getIconUrl(finalIcon);
  return `--budget-icon-url: url(&quot;${url}&quot;)`;
}

function setLucideIconPreview(element, icon, fallback = "wallet") {
  const safeIcon = normalizeIconName(icon) || fallback;
  const finalIcon = /^[a-z0-9-]+$/.test(safeIcon) ? safeIcon : fallback;
  element?.style.setProperty("--budget-icon-url", `url("${window.MentorIconSystem.getIconUrl(finalIcon)}")`);
}

function getCashflowDefaultIcon(type, category) {
  if (type === "income") return "wallet";
  if (type === "debt") return "credit-card";
  return getCategoryIcon(category) || "receipt";
}

function getCashflowItemIcon(item, type) {
  return normalizeIconName(item?.icon) || getCashflowDefaultIcon(type, item?.category);
}

function getCashflowIconPicker(type) {
  const pickers = {
    income: { search: cashflowIncomeIconSearch, input: cashflowIncomeIconInput, preview: cashflowIncomeIconPreview, results: cashflowIncomeIconResults },
    expense: { search: cashflowExpenseIconSearch, input: cashflowExpenseIconInput, preview: cashflowExpenseIconPreview, results: cashflowExpenseIconResults },
    debt: { search: cashflowDebtIconSearch, input: cashflowDebtIconInput, preview: cashflowDebtIconPreview, results: cashflowDebtIconResults }
  };
  return pickers[type] || null;
}

function setCashflowIcon(type, icon) {
  const picker = getCashflowIconPicker(type);
  if (!picker) return;
  const nextIcon = normalizeIconName(icon) || getCashflowDefaultIcon(type);
  if (picker.input) picker.input.value = nextIcon;
  if (picker.search) picker.search.value = nextIcon;
  setLucideIconPreview(picker.preview, nextIcon);
}

function renderCashflowIconResults(type) {
  const picker = getCashflowIconPicker(type);
  if (!picker?.results || !picker.search) return;
  const options = window.MentorIconSystem?.searchIcons(picker.search.value, 48) || [];

  picker.results.innerHTML = options.map((icon) => `<button type="button" role="option" data-cashflow-icon="${escapeHtml(icon)}">
    <i class="cashflow-symbol-preview mini" style="${getLucideIconStyle(icon)}" aria-hidden="true"></i>
    <span>${escapeHtml(icon)}</span>
  </button>`).join("");
  picker.results.classList.toggle("hidden", !options.length);
}

function bindCashflowIconPicker(type) {
  const picker = getCashflowIconPicker(type);
  if (!picker?.search || !picker.input) return;
  setCashflowIcon(type, picker.input.value || getCashflowDefaultIcon(type));

  picker.search.addEventListener("focus", () => {
    picker.search.value = "";
    renderCashflowIconResults(type);
    window.MentorIconSystem?.ensureIconIndex?.()?.then(() => {
      if (document.activeElement === picker.search) renderCashflowIconResults(type);
    });
  });
  picker.search.addEventListener("input", () => {
    renderCashflowIconResults(type);
  });
  picker.search.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      picker.search.value = picker.input.value;
      picker.results?.classList.add("hidden");
      return;
    }
    if (event.key !== "Enter") return;
    const firstResult = picker.results?.querySelector("[data-cashflow-icon]");
    if (!firstResult) return;
    event.preventDefault();
    setCashflowIcon(type, firstResult.dataset.cashflowIcon);
    picker.results?.classList.add("hidden");
  });
  picker.results?.addEventListener("mousedown", (event) => {
    event.preventDefault();
    const option = event.target.closest("[data-cashflow-icon]");
    if (!option) return;
    setCashflowIcon(type, option.dataset.cashflowIcon);
    picker.results.classList.add("hidden");
    picker.search.focus();
  });
  picker.search.addEventListener("blur", () => {
    window.setTimeout(() => {
      picker.results?.classList.add("hidden");
      picker.search.value = picker.input.value;
    }, 140);
  });
}

function getFilteredBudgets() {
  const typeValue = budgetTypeFilter?.value || "all";
  const behaviorValue = budgetBehaviorFilter?.value || "all";
  const statusValue = budgetStatusFilter?.value || "all";
  const linkedValue = budgetLinkedFilter?.value || "all";

  return budgets.filter((budget) => {
    const linkedType = budget.linkedType || "Nije povezano";
    return (typeValue === "all" || normalizeText(budget.type) === normalizeText(typeValue))
      && (behaviorValue === "all" || normalizeText(budget.behavior) === normalizeText(behaviorValue))
      && (statusValue === "all" || normalizeText(getBudgetStatus(budget)) === normalizeText(statusValue))
      && (linkedValue === "all" || normalizeText(linkedType) === normalizeText(linkedValue));
  });
}

function updateBudgetCategoryOptions() {
  if (!budgetCategoriesInput) return;
  const transactionCategories = transactions
    .filter((transaction) => transaction.type === "expense")
    .map((transaction) => transaction.category);
  const categoriesByKey = [...TRANSACTION_CATEGORIES.expense, ...transactionCategories, "Restorani", "Kafa", "Zabava", "Dugovi"].reduce((items, category) => {
    const key = normalizeText(category);
    if (!key || items.has(key)) return items;
    items.set(key, category);
    return items;
  }, new Map());
  const categories = Array.from(categoriesByKey.values())
    .sort((a, b) => a.localeCompare(b, "sr"));
  const selected = budgetCategoriesInput.value;
  budgetCategoriesInput.innerHTML = categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(getFinanceCategoryLabel(category))}</option>`).join("");
  const selectedMatch = categories.find((category) => normalizeText(category) === normalizeText(selected));
  if (selectedMatch) budgetCategoriesInput.value = selectedMatch;
}

function updateBudgetTransactionOptions() {
  if (!transactionBudgetInput) return;
  const selected = transactionBudgetInput.value;
  transactionBudgetInput.innerHTML = '<option value="">' + escapeHtml(financeT("options.notLinked", "Nije povezano")) + '</option>' + budgets.map((budget) => `<option value="${escapeHtml(budget.id)}">${escapeHtml(budget.name)}</option>`).join("");
  transactionBudgetInput.value = budgets.some((budget) => budget.id === selected) ? selected : "";
}

function setSelectValueNormalized(selectEl, value, fallback) {
  if (!selectEl) return;
  const match = Array.from(selectEl.options).find((option) => normalizeText(option.value) === normalizeText(value));
  selectEl.value = match ? match.value : fallback;
}

function suggestBudgetForTransaction() {
  if (!transactionBudgetInput || transactionBudgetInput.value) return;
  const match = findMatchingBudgetForTransaction({
    category: transactionCategoryInput?.value,
    linkedTo: transactionLinkedToInput?.value
  });
  if (match) transactionBudgetInput.value = match.id;
}

function findMatchingBudgetForTransaction(transaction) {
  const category = normalizeText(transactionCategoryInput?.value);
  const linked = normalizeText(transactionLinkedToInput?.value);
  const transactionCategory = normalizeText(transaction?.category || transactionCategoryInput?.value);
  const transactionLinked = normalizeText(transaction?.linkedTo || transactionLinkedToInput?.value);
  return budgets.find((budget) => {
    if (!budget.active) return false;
    const matchesCategory = budget.categories.some((item) => normalizeText(item) === transactionCategory || normalizeText(item) === category);
    const matchesLinked = budget.linkedItem && (transactionLinked.includes(normalizeText(budget.linkedItem)) || linked.includes(normalizeText(budget.linkedItem)));
    return matchesCategory || matchesLinked;
  });
}

function ensureTransactionBudgetLink(transaction) {
  if (transaction.budgetId) return transaction.budgetId;
  const match = findMatchingBudgetForTransaction(transaction);
  return match?.id || null;
}

function getLinkedTransactionBudget(transaction) {
  const directBudget = budgets.find((budget) => budget.id === transaction.budgetId);
  if (directBudget) return directBudget;
  return findMatchingBudgetForTransaction(transaction);
}

function syncTransactionBudgetLinks() {
  let changed = false;
  transactions = transactions.map((transaction) => {
    if (transaction.budgetId) return transaction;
    const budgetId = ensureTransactionBudgetLink(transaction);
    if (budgetId) changed = true;
    return budgetId ? Object.assign({}, transaction, { budgetId }) : transaction;
  });
  return changed;
}

function getBudgetMatcher(budget) {
  const categorySet = new Set(budget.categories.map((category) => normalizeText(category)));
  const linkedNeedle = normalizeText(budget.linkedItem);
  return (transaction) => {
    if (transaction.budgetId && transaction.budgetId === budget.id) return true;
    if (transaction.budgetId && transaction.budgetId !== budget.id) return false;
    const category = normalizeText(transaction.category);
    const linked = normalizeText(transaction.linkedTo);
    return categorySet.has(category) || (linkedNeedle && linked.includes(linkedNeedle));
  };
}

function renderBudgetSummary() {
  const income = getBudgetIncomeTotal();
  const planned = getBudgetedTotal();
  const spent = budgets.reduce((sum, budget) => sum + getBudgetUsedAmount(budget), 0);
  if (budgetIncomeTotal) budgetIncomeTotal.textContent = formatMoney(income);
  if (budgetPlannedTotal) budgetPlannedTotal.textContent = formatMoney(planned);
  if (budgetSpentTotal) budgetSpentTotal.textContent = formatMoney(spent);
  if (budgetFreeTotal) budgetFreeTotal.textContent = formatMoney(income - planned);
}

function renderBudgetList() {
  if (!budgetList) return;
  const visibleBudgets = getFilteredBudgets();
  if (budgetCountLabel) budgetCountLabel.textContent = financeT("counts.budgets", "{{count}} budzeta", { count: visibleBudgets.length });
  if (!visibleBudgets.length) {
    budgetList.innerHTML = `<div class="transaction-empty-state budget-empty-state">
      <h3>${escapeHtml(financeT("empty.noBudgetsTitle", "Jos nemas nijedan budzet."))}</h3>
      <p>${escapeHtml(financeT("empty.noBudgetsText", "Dodaj prvi budzet i odluci gde tvoj novac treba da ide ovog meseca."))}</p>
      <button class="btn" type="button" data-create-first-budget>${escapeHtml(financeT("actions.createFirstBudget", "+ Kreiraj prvi budzet"))}</button>
    </div>`;
    renderBudgetDetails(null);
    return;
  }
  if (!visibleBudgets.some((budget) => budget.id === selectedBudgetId)) selectedBudgetId = visibleBudgets[0].id;
  budgetList.innerHTML = visibleBudgets.map((budget) => {
    const used = getBudgetUsedAmount(budget);
    const remaining = getBudgetRemaining(budget);
    const percent = budget.amount ? Math.round((used / budget.amount) * 100) : 0;
    const tone = getBudgetTone(budget);
    const linkedText = budget.linkedType !== "Nije povezano"
      ? `${financeT("fields.linkedTo", "Povezano sa")}: ${escapeHtml(budget.linkedType)} / ${escapeHtml(budget.linkedItem)}`
      : financeT("options.notLinked", "Nije povezano");
    const behaviorMetric = normalizeText(budget.behavior) === normalizeText("Odvajanje novca")
      ? financeT("budgetBehaviorLabels.saved", "Odvojeno")
      : financeT("budgetBehaviorLabels.spent", "Potroseno");
    return `<button class="budget-card ${selectedBudgetId === budget.id ? "active" : ""}" type="button" data-select-budget="${escapeHtml(budget.id)}">
      <span class="budget-symbol" style="${getBudgetIconStyle(budget)}" aria-hidden="true"></span>
      <div class="budget-card-main">
        <div class="budget-card-head">
          <div>
            <strong>${escapeHtml(budget.name)}</strong>
            <span class="budget-meta-line">
              <span class="budget-chip-row"><em class="budget-chip">${escapeHtml(getBudgetTypeLabel(budget.type))}</em><em class="budget-chip">${escapeHtml(getBudgetBehaviorLabel(budget.behavior))}</em></span>
              <span class="budget-card-metrics">
                <span>${escapeHtml(financeT("fields.budget", "Budzet"))} <strong>${formatMoney(budget.amount)}</strong></span>
                <span>${escapeHtml(behaviorMetric)} <strong>${formatMoney(used)}</strong></span>
                <span>${escapeHtml(financeT("fields.remaining", "Preostalo"))} <strong>${formatMoney(remaining)}</strong></span>
              </span>
            </span>
          </div>
        </div>
        <div class="budget-progress-row">
          <span class="budget-progress ${tone}"><i style="width:${Math.min(percent, 130)}%"></i></span>
          <em>${percent}%</em>
        </div>
        <small>${linkedText}</small>
      </div>
      <em class="budget-status ${tone}">${escapeHtml(getBudgetStatusLabel(getBudgetStatus(budget)))}</em>
    </button>`;
  }).join("");
  renderBudgetDetails(budgets.find((budget) => budget.id === selectedBudgetId));
}
function renderBudgetDetails(budget) {
  if (!budgetDetails) return;
  if (!budget) {
    budgetDetails.innerHTML = '<div class="transaction-empty-state"><h3>' + escapeHtml(financeT("budget.chooseBudget", "Izaberi budzet.")) + '</h3><p>' + escapeHtml(financeT("budget.selectedDetailsHint", "Detalji izabranog budzeta ce se prikazati ovde.")) + '</p></div>';
    return;
  }
  const used = getBudgetUsedAmount(budget);
  const remaining = getBudgetRemaining(budget);
  const linkedLabel = budget.linkedType !== "Nije povezano" ? `${budget.linkedType} / ${budget.linkedItem}` : financeT("options.notLinked", "Nije povezano");
  const relatedTransactions = getBudgetTransactions(budget);
  const insight = getBudgetInsight(budget);
  const behaviorMetric = normalizeText(budget.behavior) === normalizeText("Odvajanje novca")
    ? financeT("budgetBehaviorLabels.saved", "Odvojeno")
    : financeT("budgetBehaviorLabels.spent", "Potroseno");
  budgetDetails.innerHTML = `
    <div class="budget-detail-head">
      <div class="budget-detail-title">
        <span class="budget-symbol mini" style="${getBudgetIconStyle(budget)}" aria-hidden="true"></span>
        <div class="transaction-card-heading"><small>${escapeHtml(financeT("budget.detailsUpper", "DETALJI"))}</small><h3>${escapeHtml(budget.name)}</h3></div>
      </div>
      <div class="budget-actions">
        <button class="transaction-icon-btn" type="button" data-edit-budget="${escapeHtml(budget.id)}">${escapeHtml(financeT("actions.editBudget", "Uredi budzet"))}</button>
        <button class="transaction-icon-btn" type="button" data-pause-budget="${escapeHtml(budget.id)}">${escapeHtml(financeT("actions.pauseBudget", "Pauziraj budzet"))}</button>
        <button class="transaction-icon-btn" type="button" data-delete-budget="${escapeHtml(budget.id)}">${escapeHtml(financeT("actions.delete", "Obrisi"))}</button>
      </div>
    </div>
    <div class="budget-detail-grid">
      <span><i class="budget-mini-symbol" style="${getBudgetIconStyle("wallet")}" aria-hidden="true"></i>${escapeHtml(financeT("fields.budgetType", "Tip budzeta"))}<strong>${escapeHtml(getBudgetTypeLabel(budget.type))}</strong></span>
      <span><i class="budget-mini-symbol" style="${getBudgetIconStyle("receipt")}" aria-hidden="true"></i>${escapeHtml(financeT("fields.period", "Period"))}<strong>${escapeHtml(budget.period)}</strong></span>
      <span><i class="budget-mini-symbol" style="${getBudgetIconStyle("wallet")}" aria-hidden="true"></i>${escapeHtml(financeT("fields.plannedAmount", "Planirani iznos"))}<strong>${formatMoney(budget.amount)}</strong></span>
      <span><i class="budget-mini-symbol" style="${getBudgetIconStyle(budget)}" aria-hidden="true"></i>${escapeHtml(behaviorMetric)}<strong>${formatMoney(used)}</strong></span>
      <span><i class="budget-mini-symbol" style="${getBudgetIconStyle("target")}" aria-hidden="true"></i>${escapeHtml(financeT("fields.remaining", "Preostalo"))}<strong>${formatMoney(remaining)}</strong></span>
      <span><i class="budget-mini-symbol" style="${getBudgetIconStyle("lightbulb")}" aria-hidden="true"></i>${escapeHtml(financeT("fields.linkedTo", "Povezano sa"))}<strong>${escapeHtml(linkedLabel)}</strong></span>
      <span><i class="budget-mini-symbol" style="${getBudgetIconStyle("target")}" aria-hidden="true"></i>${escapeHtml(financeT("fields.priority", "Prioritet"))}<strong>${escapeHtml(budget.priority)}</strong></span>
      <span><i class="budget-mini-symbol" style="${getBudgetIconStyle("receipt")}" aria-hidden="true"></i>${escapeHtml(financeT("fields.warning", "Upozorenje"))}<strong>${escapeHtml(budget.warning)}</strong></span>
    </div>
    <p class="budget-note ${escapeHtml(insight.tone)}">${escapeHtml(insight.text)}</p>
    <div class="budget-related">
      <div class="transaction-card-heading"><small>${escapeHtml(financeT("common.journal", "TRANSAKCIJE"))}</small><h3>${escapeHtml(financeT("budget.linkedTransactions", "Povezane transakcije"))}</h3></div>
      ${relatedTransactions.length ? relatedTransactions.map((transaction) => `<div class="budget-transaction-row">
        <span class="budget-transaction-date">${formatShortDateLabel(transaction.date)}</span>
        <strong class="budget-transaction-description">${escapeHtml(transaction.description || transaction.note || getFinanceCategoryLabel(transaction.category))}</strong>
        <span class="budget-transaction-category"><i class="budget-mini-symbol transaction-category-symbol" style="${getBudgetIconStyle(getCategoryIcon(transaction.category))}" title="${escapeHtml(getFinanceCategoryLabel(transaction.category))}" aria-label="${escapeHtml(getFinanceCategoryLabel(transaction.category))}"></i></span>
        <em class="budget-transaction-amount">- ${formatMoney(transaction.amount)}</em>
      </div>`).join("") : '<p class="transaction-muted">' + escapeHtml(financeT("empty.noRelatedTransactions", "Nema povezanih transakcija za ovaj mesec.")) + '</p>'}
      <button class="budget-all-transactions-link" type="button" data-open-finance-transactions>${escapeHtml(financeT("budget.viewAllTransactions", "Pogledaj sve transakcije"))}</button>
    </div>
  `;
}
function renderBudgetPage() {
  updateBudgetCategoryOptions();
  updateBudgetTransactionOptions();
  renderBudgetSummary();
  renderBudgetList();
}

function openBudgetModal(budget) {
  updateBudgetCategoryOptions();
  editingBudgetId = budget?.id || null;
  if (budgetNameInput) budgetNameInput.value = budget?.name || "";
  setSelectValueNormalized(budgetTypeInput, budget?.type || "Kategorija", "Kategorija");
  setSelectValueNormalized(budgetBehaviorInput, budget?.behavior || "Limit potrosnje", "Limit potrosnje");
  if (budgetIconInput) budgetIconInput.value = getBudgetIcon(budget || { categories: [] });
  if (budgetAmountInput) budgetAmountInput.value = budget?.amount || "";
  setSelectValueNormalized(budgetPeriodInput, budget?.period || "Mesecno", "Mesecno");
  if (budgetRecurringInput) budgetRecurringInput.checked = budget?.recurring !== false;
  setSelectValueNormalized(budgetLinkedTypeInput, budget?.linkedType || "Nije povezano", "Nije povezano");
  updateBudgetLinkedItems();
  if (budgetLinkedItemInput && budget?.linkedItem) budgetLinkedItemInput.value = budget.linkedItem;
  setSelectValueNormalized(budgetPriorityInput, budget?.priority || "Srednji", "Srednji");
  setSelectValueNormalized(budgetWarningInput, budget?.warning || "Na 80%", "Na 80%");
  if (budgetNoteInput) budgetNoteInput.value = budget?.note || "";
  if (budgetCategoriesInput && budget?.categories) {
    Array.from(budgetCategoriesInput.options).forEach((option) => {
      option.selected = budget.categories.some((category) => normalizeText(category) === normalizeText(option.value));
    });
  }
  budgetModal?.classList.remove("hidden");
  budgetNameInput?.focus();
}

function closeBudgetModal() {
  editingBudgetId = null;
  budgetModal?.classList.add("hidden");
}

function updateBudgetLinkedItems() {
  const linkedType = budgetLinkedTypeInput?.value || "Nije povezano";
  const items = BUDGET_LINKED_ITEMS[linkedType] || [];
  budgetLinkedItemField?.classList.toggle("hidden", !items.length);
  if (budgetLinkedItemInput) {
    budgetLinkedItemInput.innerHTML = items.map((item) => `<option>${escapeHtml(item)}</option>`).join("");
  }
}

async function saveBudget(event) {
  event.preventDefault();
  const name = budgetNameInput?.value.trim();
  const amount = Number(budgetAmountInput?.value);
  if (!name || !Number.isFinite(amount) || amount <= 0) return;
  const selectedCategory = budgetCategoriesInput?.value || "Ostalo";
  const categories = [selectedCategory];
  const linkedType = budgetLinkedTypeInput?.value || "Nije povezano";
  const budget = {
    id: editingBudgetId || "budget-" + Date.now(),
    name,
    type: budgetTypeInput?.value || "Kategorija",
    behavior: budgetBehaviorInput?.value || "Limit potrosnje",
    icon: budgetIconInput?.value || getBudgetIcon({ categories }),
    amount,
    period: budgetPeriodInput?.value || "Mesecno",
    categories: categories.length ? categories : ["Ostalo"],
    linkedType,
    linkedItem: linkedType === "Nije povezano" ? "" : (budgetLinkedItemInput?.value || ""),
    priority: budgetPriorityInput?.value || "Srednji",
    warning: budgetWarningInput?.value || "Na 80%",
    note: budgetNoteInput?.value.trim() || "",
    status: "Aktivno",
    recurring: Boolean(budgetRecurringInput?.checked),
    active: true
  };
  budgets = editingBudgetId
    ? budgets.map((item) => item.id === editingBudgetId ? budget : item)
    : [budget, ...budgets];
  selectedBudgetId = budget.id;
  syncTransactionBudgetLinks();
  if (!await saveFinanceState()) {
    renderBudgetPage();
    return;
  }
  editingBudgetId = null;
  budgetForm?.reset();
  closeBudgetModal();
  renderBudgetPage();
}

function resetBudgetFilters() {
  if (budgetPeriodFilter) budgetPeriodFilter.value = "current-month";
  if (budgetTypeFilter) budgetTypeFilter.value = "all";
  if (budgetBehaviorFilter) budgetBehaviorFilter.value = "all";
  if (budgetStatusFilter) budgetStatusFilter.value = "all";
  if (budgetLinkedFilter) budgetLinkedFilter.value = "all";
  renderBudgetPage();
}

function renderCashflowSimpleList(listEl, items, type) {
  if (!listEl) return;
  if (!items.length) {
    listEl.innerHTML = '<p class="cashflow-empty">' + escapeHtml(financeT("empty.noCashflowItems", "Jos nista nije uneto.")) + '</p>';
    return;
  }

  listEl.innerHTML = items.map((item) => {
    const mainAmount = type === "debt" ? item.monthly : item.amount;
    const meta = type === "debt" ? financeT("cashflow.total", "Ukupno") + ": " + formatMoney(item.balance) : financeT("frequency.monthly", "Mesecno");
    return `<div class="cashflow-list-row">
      <div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(meta)}</span></div>
      <em>${formatMoney(mainAmount)}</em>
      <button class="transaction-icon-btn" type="button" data-cashflow-delete="${type}" data-cashflow-id="${item.id}">${escapeHtml(financeT("actions.delete", "Obrisi"))}</button>
    </div>`;
  }).join("");
}

function renderCashflowRecurringList(listEl, items, type) {
  if (!listEl) return;
  if (!items.length) {
    listEl.innerHTML = '<p class="cashflow-empty">' + escapeHtml(financeT("empty.noCashflowItems", "Jos nista nije uneto.")) + '</p>';
    return;
  }

  listEl.innerHTML = items.map((item) => {
    const amountKey = type === "debt" ? "monthly" : "amount";
    const mainAmount = Number(item[amountKey] || 0);
    const monthlyAmount = getCashflowMonthlyAmount(item, amountKey, type);
    const frequency = item.frequency || "monthly";
    const isYearly = frequency === "yearly";
    const isWeekly = (item.frequency || "monthly") === "weekly";
    const periodLabel = isWeekly ? financeT("frequency.weekly", "Nedeljno") : (isYearly ? financeT("frequency.yearly", "Godisnje") : financeT("frequency.monthly", "Mesecno"));
    const weeklyCount = isWeekly ? (type === "income" ? countBusinessDaysInCurrentMonth() : countWeekdayInCurrentMonth(item.weekday ?? 1)) : 1;
    const recurrenceText = isWeekly
      ? (type === "income" ? financeT("cashflow.businessDaysThisMonth", "{{count}} radnih dana ovog meseca", { count: weeklyCount }) : financeT("cashflow.timesThisMonth", "{{count}}x ovog meseca", { count: weeklyCount }))
      : (isYearly ? financeT("cashflow.splitInto12", "podeljeno na 12 meseci") : financeT("cashflow.onceMonthly", "1x mesecno"));
    const metaParts = type === "debt"
      ? [`${financeT("frequency.monthly", "Mesecno")}: ${formatMoney(monthlyAmount)}`]
      : type === "income"
      ? [recurrenceText]
      : [
        `${periodLabel}: ${formatMoney(mainAmount)}`,
        recurrenceText
      ].filter(Boolean);
    const displayAmount = type === "debt" ? Number(item.balance || 0) : monthlyAmount;
    const categoryLine = type === "expense" && item.category ? `<span>${escapeHtml(financeT("fields.category", "Kategorija"))}: ${escapeHtml(getFinanceCategoryLabel(item.category))}</span>` : "";
    const icon = getCashflowItemIcon(item, type);
    return `<div class="cashflow-list-row ${escapeHtml(type)}">
      <span class="cashflow-row-symbol" style="${getLucideIconStyle(icon)}" aria-hidden="true"></span>
      <div class="cashflow-row-copy">
        <strong>${escapeHtml(item.name)}</strong>
        <span class="cashflow-row-meta">${categoryLine}<span>${escapeHtml(metaParts.join(" - "))}</span></span>
        ${item.note ? `<small>${escapeHtml(item.note)}</small>` : ""}
      </div>
      <em>${formatMoney(displayAmount)}</em>
      <div class="cashflow-row-actions">
        <button class="transaction-icon-btn" type="button" data-cashflow-edit="${type}" data-cashflow-id="${item.id}">${escapeHtml(financeT("actions.edit", "Izmeni"))}</button>
        <button class="transaction-icon-btn" type="button" data-cashflow-delete="${type}" data-cashflow-id="${item.id}">${escapeHtml(financeT("actions.delete", "Obrisi"))}</button>
      </div>
    </div>`;
  }).join("");
}

function getCashflowListConfig(type = activeCashflowListType) {
  if (type === "income") {
    return {
      type: "income",
      title: financeT("static.cashflow.monthlyIncome", "Mesecni prihodi"),
      subtitle: "",
      addLabel: financeT("static.cashflow.addIncome", "Dodaj prihod"),
      items: cashflowIncomes,
      modal: cashflowIncomeModal,
      firstInput: cashflowIncomeName
    };
  }
  if (type === "debt") {
    return {
      type: "debt",
      title: financeT("static.cashflow.debtsAndPayments", "Dugovi i rate"),
      subtitle: financeT("static.cashflow.debtsAndPaymentsHint", "Rate i dugovi koji se ponavljaju u mesecnom toku."),
      addLabel: financeT("static.cashflow.addDebt", "Dodaj dug"),
      items: cashflowDebts,
      modal: cashflowDebtModal,
      firstInput: cashflowDebtName
    };
  }
  return {
    type: "expense",
    title: financeT("static.cashflow.monthlyExpenses", "Mesecni troskovi"),
    subtitle: "",
    addLabel: financeT("static.cashflow.addExpense", "Dodaj trosak"),
    items: cashflowExpenses,
    modal: cashflowExpenseModal,
    firstInput: cashflowExpenseName
  };
}

function renderActiveCashflowList() {
  const config = getCashflowListConfig();
  if (cashflowListTitle) cashflowListTitle.textContent = config.title;
  if (cashflowListSubtitle) {
    cashflowListSubtitle.textContent = config.subtitle;
    cashflowListSubtitle.hidden = !config.subtitle;
  }
  setButtonText(cashflowActiveAddBtn, config.addLabel);

  cashflowListTabs.forEach((tab) => {
    const isActive = tab.dataset.cashflowListTab === config.type;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", isActive ? "true" : "false");
    tab.tabIndex = isActive ? 0 : -1;
  });

  renderCashflowRecurringList(cashflowUnifiedList, config.items, config.type);
}

function renderCashflowPage() {
  if (!cashflowNetHero) return;
  const totals = getCashflowPlanTotals();

  cashflowNetHero.textContent = formatMoney(totals.result);
  cashflowNetHero.classList.toggle("is-negative", totals.result < 0);
  if (cashflowHealthLabel) cashflowHealthLabel.textContent = financeT("cashflow.healthLabelFull", "Prihodi - troskovi - rate dugova - budzetirana odvajanja");
  if (cashflowIncomeTotal) cashflowIncomeTotal.textContent = formatMoney(totals.incomeTotal);
  if (cashflowExpenseTotal) cashflowExpenseTotal.textContent = formatMoney(totals.expenseTotal);
  if (cashflowDebtPayment) cashflowDebtPayment.textContent = formatMoney(totals.debtPaymentTotal);
  if (cashflowBudgetedTotal) cashflowBudgetedTotal.textContent = formatMoney(getBudgetedTotal());
  renderCashflowProjection();

  renderActiveCashflowList();
  renderCashflowMonthStrip();
  renderBudgetPage();
}

async function addCashflowItem(type, item) {
  const nextItem = Object.assign({ id: Date.now() + Math.random() }, item);
  if (type === "income") cashflowIncomes = [nextItem, ...cashflowIncomes];
  if (type === "expense") cashflowExpenses = [nextItem, ...cashflowExpenses];
  if (type === "debt") cashflowDebts = [nextItem, ...cashflowDebts];
  if (!await saveFinanceState()) {
    renderCashflowPage();
    return false;
  }
  updateTransactionCashflowOptions();
  renderCashflowPage();
  if (!document.getElementById("financeDashboardPanel")?.classList.contains("hidden")) renderFinanceOverview();
  return true;
}

async function updateCashflowItem(type, id, patch) {
  const updateItem = (item) => String(item.id) === String(id) ? Object.assign({}, item, patch, { id: item.id }) : item;
  if (type === "income") cashflowIncomes = cashflowIncomes.map(updateItem);
  if (type === "expense") cashflowExpenses = cashflowExpenses.map(updateItem);
  if (type === "debt") cashflowDebts = cashflowDebts.map(updateItem);
  if (!await saveFinanceState()) {
    renderCashflowPage();
    return false;
  }
  updateTransactionCashflowOptions();
  renderCashflowPage();
  if (!document.getElementById("financeDashboardPanel")?.classList.contains("hidden")) renderFinanceOverview();
  return true;
}

function getCashflowItemById(type, id) {
  const list = type === "income" ? cashflowIncomes : (type === "debt" ? cashflowDebts : cashflowExpenses);
  return list.find((item) => String(item.id) === String(id)) || null;
}

async function deleteCashflowItem(type, id) {
  if (type === "income") cashflowIncomes = cashflowIncomes.filter((item) => String(item.id) !== String(id));
  if (type === "expense") cashflowExpenses = cashflowExpenses.filter((item) => String(item.id) !== String(id));
  if (type === "debt") cashflowDebts = cashflowDebts.filter((item) => String(item.id) !== String(id));
  if (!await saveFinanceState()) {
    renderCashflowPage();
    return false;
  }
  updateTransactionCashflowOptions();
  renderCashflowPage();
  if (!document.getElementById("financeDashboardPanel")?.classList.contains("hidden")) renderFinanceOverview();
  return true;
}

function getCashflowModalElements(type) {
  if (type === "income") {
    return {
      modal: cashflowIncomeModal,
      form: cashflowIncomeForm,
      title: cashflowIncomeModal?.querySelector(".transaction-card-heading h3"),
      firstInput: cashflowIncomeName,
      nameInput: cashflowIncomeName,
      iconInput: cashflowIncomeIconInput,
      categoryInput: cashflowIncomeCategory,
      amountInput: cashflowIncomeAmount,
      frequencyInput: cashflowIncomeFrequency,
      weekdayInput: cashflowIncomeWeekday,
      noteInput: cashflowIncomeNote,
      newTitle: financeT("static.cashflow.newIncome", "Novi prihod"),
      editTitle: financeT("static.cashflow.editIncome", "Izmeni prihod")
    };
  }
  if (type === "debt") {
    return {
      modal: cashflowDebtModal,
      form: cashflowDebtForm,
      title: cashflowDebtModal?.querySelector(".transaction-card-heading h3"),
      firstInput: cashflowDebtName,
      nameInput: cashflowDebtName,
      iconInput: cashflowDebtIconInput,
      balanceInput: cashflowDebtBalance,
      amountInput: cashflowDebtMonthly,
      startDateInput: cashflowDebtStartDate,
      frequencyInput: cashflowDebtFrequency,
      weekdayInput: cashflowDebtWeekday,
      noteInput: cashflowDebtNote,
      newTitle: financeT("static.cashflow.newDebtPayment", "Novi dug ili rata"),
      editTitle: financeT("static.cashflow.editDebtPayment", "Izmeni dug ili ratu")
    };
  }
  return {
    modal: cashflowExpenseModal,
    form: cashflowExpenseForm,
    title: cashflowExpenseModal?.querySelector(".transaction-card-heading h3"),
    firstInput: cashflowExpenseName,
    nameInput: cashflowExpenseName,
    iconInput: cashflowExpenseIconInput,
    categoryInput: cashflowExpenseCategory,
    amountInput: cashflowExpenseAmount,
    paymentStartDayInput: cashflowExpensePaymentStartDay,
    paymentEndDayInput: cashflowExpensePaymentEndDay,
    frequencyInput: cashflowExpenseFrequency,
    weekdayInput: cashflowExpenseWeekday,
    noteInput: cashflowExpenseNote,
    newTitle: financeT("static.cashflow.newExpense", "Novi trosak"),
    editTitle: financeT("static.cashflow.editExpense", "Izmeni trosak")
  };
}

function setCashflowModalMode(type, isEditing) {
  const elements = getCashflowModalElements(type);
  if (elements.title) elements.title.textContent = isEditing ? elements.editTitle : elements.newTitle;
  const addLabel = type === "debt"
    ? financeT("static.cashflow.saveDebt", "Sacuvaj dug")
    : financeT("static.cashflow.addContinue", "Dodaj i nastavi");
  setTextContent(elements.form?.querySelector('button[type="submit"] span'), isEditing ? financeT("actions.saveChanges", "Sacuvaj izmene") : addLabel);
}

function showCashflowExpenseStatus(message, tone = "danger") {
  if (!cashflowExpenseFormStatus) return;
  cashflowExpenseFormStatus.textContent = message;
  cashflowExpenseFormStatus.classList.toggle("danger", tone === "danger");
  cashflowExpenseFormStatus.classList.add("is-visible");
}

function clearCashflowExpenseStatus() {
  if (!cashflowExpenseFormStatus) return;
  cashflowExpenseFormStatus.textContent = "";
  cashflowExpenseFormStatus.classList.remove("is-visible", "danger");
}

function showCashflowDebtStatus(message, tone = "danger") {
  if (!cashflowDebtFormStatus) return;
  cashflowDebtFormStatus.textContent = message;
  cashflowDebtFormStatus.classList.toggle("danger", tone === "danger");
  cashflowDebtFormStatus.classList.add("is-visible");
}

function clearCashflowDebtStatus() {
  if (!cashflowDebtFormStatus) return;
  cashflowDebtFormStatus.textContent = "";
  cashflowDebtFormStatus.classList.remove("is-visible", "danger");
}

function openCashflowModal(modal, firstInput) {
  if (modal === cashflowIncomeModal) updateCashflowIncomeCategories();
  if (modal === cashflowExpenseModal) updateCashflowExpenseCategories();
  if (modal === cashflowIncomeModal && !cashflowIncomeIconInput?.value) setCashflowIcon("income", getCashflowDefaultIcon("income"));
  if (modal === cashflowExpenseModal && !cashflowExpenseIconInput?.value) setCashflowIcon("expense", getCashflowDefaultIcon("expense", cashflowExpenseCategory?.value));
  if (modal === cashflowDebtModal && !cashflowDebtIconInput?.value) setCashflowIcon("debt", getCashflowDefaultIcon("debt"));
  modal?.classList.remove("hidden");
  firstInput?.focus();
}

function openCashflowAddModal(type) {
  editingCashflowItem = null;
  const elements = getCashflowModalElements(type);
  elements.form?.reset();
  if (type === "debt") clearCashflowDebtStatus();
  if (type === "expense") clearCashflowExpenseStatus();
  if (type === "income") updateCashflowIncomeCategories();
  if (type === "expense") updateCashflowExpenseCategories();
  if (type === "debt" && cashflowDebtStartDate) cashflowDebtStartDate.value = formatCashflowDateValue(new Date());
  setCashflowIcon(type, getCashflowDefaultIcon(type, elements.categoryInput?.value));
  setCashflowModalMode(type, false);
  openCashflowModal(elements.modal, elements.firstInput);
}

function openCashflowEditModal(type, id) {
  const item = getCashflowItemById(type, id);
  if (!item) return;
  const elements = getCashflowModalElements(type);
  if (type === "debt") clearCashflowDebtStatus();
  if (type === "expense") clearCashflowExpenseStatus();
  editingCashflowItem = { type, id };
  if (type === "income") updateCashflowIncomeCategories(item.category);
  if (type === "expense") updateCashflowExpenseCategories(item.category);
  if (elements.nameInput) elements.nameInput.value = item.name || "";
  if (elements.categoryInput) elements.categoryInput.value = item.category || "Ostalo";
  if (elements.balanceInput) elements.balanceInput.value = item.balance || "";
  if (elements.amountInput) elements.amountInput.value = type === "debt" ? (item.monthly || "") : (item.amount || "");
  if (elements.startDateInput) elements.startDateInput.value = item.startDate || "";
  const legacyPaymentDay = parseCashflowDate(item.paymentDate)?.getDate() || "";
  if (elements.paymentStartDayInput) elements.paymentStartDayInput.value = item.paymentStartDay || legacyPaymentDay;
  if (elements.paymentEndDayInput) elements.paymentEndDayInput.value = item.paymentEndDay || legacyPaymentDay;
  if (elements.frequencyInput) elements.frequencyInput.value = item.frequency || "monthly";
  if (elements.weekdayInput) elements.weekdayInput.value = String(item.weekday ?? 1);
  if (elements.noteInput) elements.noteInput.value = item.note || "";
  setCashflowIcon(type, getCashflowItemIcon(item, type));
  setCashflowModalMode(type, true);
  openCashflowModal(elements.modal, elements.firstInput);
}

function closeCashflowModal(modal, form) {
  form?.reset();
  editingCashflowItem = null;
  if (form === cashflowIncomeForm) setCashflowModalMode("income", false);
  if (form === cashflowExpenseForm) setCashflowModalMode("expense", false);
  if (form === cashflowExpenseForm) clearCashflowExpenseStatus();
  if (form === cashflowDebtForm) setCashflowModalMode("debt", false);
  if (form === cashflowIncomeForm) setCashflowIcon("income", getCashflowDefaultIcon("income"));
  if (form === cashflowExpenseForm) setCashflowIcon("expense", getCashflowDefaultIcon("expense", cashflowExpenseCategory?.value));
  if (form === cashflowDebtForm) setCashflowIcon("debt", getCashflowDefaultIcon("debt"));
  if (form === cashflowDebtForm) clearCashflowDebtStatus();
  modal?.classList.add("hidden");
}

function resetCashflowFormForNext(form, firstInput) {
  form?.reset();
  editingCashflowItem = null;
  if (form === cashflowIncomeForm) updateCashflowIncomeCategories();
  if (form === cashflowExpenseForm) updateCashflowExpenseCategories();
  if (form === cashflowIncomeForm) setCashflowModalMode("income", false);
  if (form === cashflowExpenseForm) setCashflowModalMode("expense", false);
  if (form === cashflowDebtForm) setCashflowModalMode("debt", false);
  if (form === cashflowIncomeForm) setCashflowIcon("income", getCashflowDefaultIcon("income"));
  if (form === cashflowExpenseForm) setCashflowIcon("expense", getCashflowDefaultIcon("expense", cashflowExpenseCategory?.value));
  if (form === cashflowDebtForm) setCashflowIcon("debt", getCashflowDefaultIcon("debt"));
  firstInput?.focus();
}

function renderTransactionList() {
  if (!transactionList) return;
  const visibleTransactions = getFilteredTransactions();
  const budgetRenderCache = createBudgetRenderCache();
  const visibleIds = new Set(visibleTransactions.map((transaction) => String(transaction.id)));
  Array.from(selectedTransactionIds).forEach((id) => {
    if (!visibleIds.has(id)) selectedTransactionIds.delete(id);
  });
  updateTransactionBulkDeleteButton();

  if (transactionCountLabel) {
    transactionCountLabel.textContent = financeT("counts.transactions", "{{count}} transakcija", { count: visibleTransactions.length });
  }

  if (!visibleTransactions.length) {
    transactionList.innerHTML = `
      <div class="transaction-empty-state">
        <h3>${escapeHtml(financeT("empty.noTransactionsTitle", "Jos nema transakcija."))}</h3>
        <p>${escapeHtml(financeT("empty.noTransactionsText", "Dodaj prvu transakciju i pocni da gradis jasniju finansijsku sliku."))}</p>
        <button class="btn transaction-empty-action" type="button" data-focus-transaction-form>${escapeHtml(financeT("actions.addTransaction", "Dodaj transakciju"))}</button>
      </div>
    `;
    return;
  }

  transactionList.innerHTML = `
    <table class="transaction-table">
      <thead>
        <tr>
          <th class="transaction-select-cell">
            <input type="checkbox" data-select-visible-transactions aria-label="${escapeHtml(financeT("actions.selectVisibleTransactions", "Izaberi sve vidljive transakcije"))}" ${visibleTransactions.length && visibleTransactions.every((transaction) => selectedTransactionIds.has(String(transaction.id))) ? "checked" : ""}>
          </th>
          <th>${escapeHtml(financeT("fields.date", "Datum"))}</th>
          <th>${escapeHtml(financeT("fields.category", "Kategorija"))}</th>
          <th>${escapeHtml(financeT("fields.type", "Tip"))}</th>
          <th>${escapeHtml(financeT("fields.budget", "Budzet"))}</th>
          <th>${escapeHtml(financeT("fields.cashflow", "Tok novca"))}</th>
          <th>${escapeHtml(financeT("fields.amount", "Iznos"))}</th>
          <th>${escapeHtml(financeT("fields.note", "Beleska"))}</th>
          <th>${escapeHtml(financeT("fields.linkedTo", "Povezano sa"))}</th>
          <th>${escapeHtml(financeT("fields.actions", "Akcije"))}</th>
        </tr>
      </thead>
      <tbody>
        ${visibleTransactions.map((transaction) => `
          <tr>
            <td class="transaction-select-cell" data-label="${escapeHtml(financeT("actions.select", "Izaberi"))}">
              <input type="checkbox" data-select-transaction="${transaction.id}" aria-label="${escapeHtml(financeT("actions.selectTransaction", "Izaberi transakciju"))}" ${selectedTransactionIds.has(String(transaction.id)) ? "checked" : ""}>
            </td>
            <td data-label="${escapeHtml(financeT("fields.date", "Datum"))}">${formatShortDateLabel(transaction.date)}</td>
            <td data-label="${escapeHtml(financeT("fields.category", "Kategorija"))}">${escapeHtml(getFinanceCategoryLabel(transaction.category))}</td>
            <td data-label="${escapeHtml(financeT("fields.type", "Tip"))}"><span class="transaction-type-badge ${transaction.type}">${escapeHtml(getFinanceTypeLabel(transaction.type))}</span></td>
            <td data-label="${escapeHtml(financeT("fields.budget", "Budzet"))}">${renderTransactionBudgetMeter(transaction, budgetRenderCache)}</td>
            <td data-label="${escapeHtml(financeT("fields.cashflow", "Tok novca"))}">${renderTransactionCashflowLink(transaction)}</td>
            <td data-label="${escapeHtml(financeT("fields.amount", "Iznos"))}"><span class="transaction-amount ${transaction.type}">${formatTransactionAmount(transaction)}</span></td>
            <td data-label="${escapeHtml(financeT("fields.note", "Beleska"))}"><span class="transaction-muted">${escapeHtml(transaction.note || "-")}</span></td>
            <td data-label="${escapeHtml(financeT("fields.linkedTo", "Povezano sa"))}"><span class="transaction-muted">${escapeHtml(transaction.linkedTo || financeT("options.notLinked", "Nije povezano"))}</span></td>
            <td data-label="${escapeHtml(financeT("fields.actions", "Akcije"))}">
              <div class="transaction-actions">
                <button class="transaction-icon-btn" type="button" data-edit-transaction="${transaction.id}">${escapeHtml(financeT("actions.edit", "Izmeni"))}</button>
                <button class="transaction-icon-btn" type="button" data-delete-transaction="${transaction.id}">${escapeHtml(financeT("actions.delete", "Obrisi"))}</button>
              </div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function scheduleTransactionListRender(delay = 120) {
  window.clearTimeout(scheduledTransactionListRender);
  scheduledTransactionListRender = window.setTimeout(() => {
    scheduledTransactionListRender = null;
    renderTransactionList();
  }, delay);
}

async function refreshTrackedAssetsAfterTransactionChange() {
  const changed = syncTrackedTransactionAssets();
  if (!changed) return true;
  if (!await saveAssetState()) {
    if (!document.getElementById("financeAssetsPanel")?.classList.contains("hidden")) renderAssetsPage();
    if (!document.getElementById("financeDashboardPanel")?.classList.contains("hidden")) renderFinanceOverview();
    return false;
  }
  if (!document.getElementById("financeAssetsPanel")?.classList.contains("hidden")) renderAssetsPage();
  if (!document.getElementById("financeDashboardPanel")?.classList.contains("hidden")) renderFinanceOverview();
  return true;
}

function renderTransactionsPage() {
  updateTransactionCategoryFilter();
  updateTransactionCashflowOptions();
  updateTransactionSummary();
  renderDynamicOverview();
  renderTransactionList();
}

function getTransactionBudget(transaction, budgetCache = null) {
  const directBudget = transaction.budgetId
    ? (budgetCache?.budgetsById?.get(String(transaction.budgetId)) || budgets.find((budget) => budget.id === transaction.budgetId))
    : null;
  if (directBudget) return directBudget;
  const category = normalizeText(transaction.category);
  const linked = normalizeText(transaction.linkedTo);
  return budgets.find((budget) => {
    const categories = Array.isArray(budget.categories) ? budget.categories : [];
    return categories.some((item) => normalizeText(item) === category)
      || (budget.linkedItem && linked.includes(normalizeText(budget.linkedItem)));
  });
}

function getTransactionBudgetLabel(transaction) {
  const budget = getTransactionBudget(transaction);
  return budget ? budget.name : "";
}

function renderTransactionBudgetMeter(transaction, budgetCache = null) {
  const budget = getTransactionBudget(transaction, budgetCache);
  if (!budget) return '<span class="transaction-budget-empty" aria-hidden="true"></span>';
  const cachedMeta = budgetCache?.budgetMetaById?.get(String(budget.id));
  const percent = cachedMeta ? cachedMeta.percent : getBudgetPercent(budget);
  const tone = cachedMeta ? cachedMeta.tone : getBudgetTone(budget);
  return `<span class="transaction-budget-meter ${tone}" title="${escapeHtml(budget.name)} ${percent}%">
    <i style="width:${Math.min(percent, 100)}%"></i>
    <strong>${escapeHtml(budget.name)}</strong>
    <em>${percent}%</em>
  </span>`;
}

async function saveTransaction(event) {
  event.preventDefault();
  if (!validateTransactionForm()) return;

  const editId = transactionEditId?.value;
  const existingTransaction = editId
    ? transactions.find((item) => String(item.id) === String(editId))
    : null;
  const transaction = {
    ...(existingTransaction || {}),
    id: editId || Date.now(),
    date: transactionDateInput.value,
    description: transactionCategoryInput.value,
    type: transactionTypeInput.value,
    category: transactionCategoryInput.value,
    categorySource: "manual",
    categoryRuleKeyword: null,
    amount: Number(transactionAmountInput.value),
    note: transactionNoteInput.value.trim(),
    linkedTo: transactionLinkedToInput.value || null,
    budgetId: transactionBudgetInput?.value || null,
    cashflowLink: transactionCashflowLinkInput?.value || null
  };
  transaction.budgetId = ensureTransactionBudgetLink(transaction);

  const successMessage = editId
    ? financeT("statusMessages.transactionUpdated", "Transakcija je izmenjena.")
    : financeT("statusMessages.transactionSaved", "Transakcija je sacuvana.");
  if (editId) {
    transactions = transactions.map((item) => String(item.id) === String(editId) ? transaction : item);
  } else {
    transactions = [transaction, ...transactions];
  }

  if (!await saveFinanceState()) {
    renderTransactionsPage();
    return;
  }
  showTransactionStatus(successMessage);
  clearTransactionForm();
  await refreshTrackedAssetsAfterTransactionChange();
  renderTransactionsPage();
  closeTransactionModal();
}

function editTransaction(id) {
  const transaction = transactions.find((item) => String(item.id) === String(id));
  if (!transaction) return;

  if (transactionEditId) transactionEditId.value = transaction.id;
  if (transactionFormTitle) transactionFormTitle.textContent = financeT("transactions.editTitle", "Izmena transakcije");
  if (transactionTypeInput) transactionTypeInput.value = transaction.type;
  updateTransactionCategories();
  if (transactionAmountInput) transactionAmountInput.value = transaction.amount;
  if (transactionCategoryInput) transactionCategoryInput.value = transaction.category;
  if (transactionDateInput) transactionDateInput.value = transaction.date;
  if (transactionNoteInput) transactionNoteInput.value = transaction.note || "";
  if (transactionLinkedToInput) transactionLinkedToInput.value = transaction.linkedTo || "";
  if (transactionBudgetInput) transactionBudgetInput.value = transaction.budgetId || "";
  transactionCancelEditBtn?.classList.remove("hidden");
  openTransactionModal();
  if (transactionCashflowLinkInput) transactionCashflowLinkInput.value = transaction.cashflowLink || "";
}

async function deleteTransaction(id) {
  const confirmed = window.confirm(financeT("confirm.deleteTransaction", "Da li zelis da obrises ovu transakciju?"));
  if (!confirmed) return;
  transactions = transactions.filter((transaction) => String(transaction.id) !== String(id));
  selectedTransactionIds.delete(String(id));
  if (!await saveFinanceState()) {
    renderTransactionsPage();
    return;
  }
  await refreshTrackedAssetsAfterTransactionChange();
  renderTransactionsPage();
  showTransactionStatus(financeT("statusMessages.transactionDeleted", "Transakcija je obrisana."));
}

function updateTransactionBulkDeleteButton() {
  if (!deleteSelectedTransactionsBtn) return;
  const selectedCount = selectedTransactionIds.size;
  deleteSelectedTransactionsBtn.classList.toggle("hidden", selectedCount === 0);
  deleteSelectedTransactionsBtn.textContent = financeT("actions.deleteSelected", "Obrisi izabrane ({{count}})", { count: selectedCount });
}

async function deleteSelectedTransactions() {
  const selectedCount = selectedTransactionIds.size;
  if (!selectedCount) return;
  const confirmed = window.confirm(financeT("confirm.deleteSelectedTransactions", "Da li zelis da obrises {{count}} izabranih transakcija?", { count: selectedCount }));
  if (!confirmed) return;
  transactions = transactions.filter((transaction) => !selectedTransactionIds.has(String(transaction.id)));
  selectedTransactionIds.clear();
  if (!await saveFinanceState()) {
    selectedTransactionIds.clear();
    renderTransactionsPage();
    return;
  }
  await refreshTrackedAssetsAfterTransactionChange();
  renderTransactionsPage();
  showTransactionStatus(financeT("statusMessages.selectedTransactionsDeleted", "Obrisano {{count}} transakcija.", { count: selectedCount }));
}

async function refreshUncategorizedTransactions(options = {}) {
  let changedCount = 0;
  transactions = transactions.map((transaction) => {
    if (["manual", "import"].includes(transaction.categorySource)) return transaction;
    const isImported = Boolean(transaction.importedAt) || String(transaction.id || "").startsWith("import-");
    const isUncategorized = normalizeText(transaction.category) === normalizeText("Ostalo");
    const isRuleManaged = ["keyword", "fallback"].includes(transaction.categorySource);
    if (!isImported && !isUncategorized && !isRuleManaged) return transaction;
    const ruleText = getTransactionCategoryRuleText(transaction);
    const transferMatch = findCategoryRuleMatch("transfer", ruleText);
    const match = transferMatch || findCategoryRuleMatch(transaction.type, ruleText);
    const nextType = transferMatch ? "transfer" : transaction.type;
    if (!match || (transaction.type === nextType && normalizeText(match.category) === normalizeText(transaction.category))) return transaction;
    changedCount += 1;
    const updatedTransaction = Object.assign({}, transaction, {
      type: nextType,
      category: match.category,
      categorySource: "keyword",
      categoryRuleKeyword: match.keyword,
      description: transaction.description || match.category
    });
    updatedTransaction.budgetId = ensureTransactionBudgetLink(updatedTransaction);
    return updatedTransaction;
  });
  if (changedCount) {
    if (!await saveFinanceState()) {
      renderTransactionsPage();
      return;
    }
    renderTransactionsPage();
    if (!options.silent) {
      showTransactionStatus(financeT("statusMessages.categoriesRefreshed", "Osvezeno {{count}} kategorija.", { count: changedCount }));
    }
  } else {
    renderTransactionList();
    if (!options.silent) {
      showTransactionStatus(financeT("statusMessages.noKeywordMatches", "Nema novih keyword poklapanja za promenu kategorije."));
    }
  }
}

function resetTransactionFilters() {
  if (transactionDateFilter) transactionDateFilter.value = "current-month";
  if (transactionTypeFilter) transactionTypeFilter.value = "all";
  if (transactionCategoryFilter) transactionCategoryFilter.value = "all";
  if (transactionLinkedFilter) transactionLinkedFilter.value = "all";
  if (transactionSort) transactionSort.value = "date-desc";
  if (transactionSearchInput) transactionSearchInput.value = "";
  renderTransactionList();
}

function handleTransactionSelectionInput(input) {
  if (!input) return false;
  if (input.matches("[data-select-visible-transactions]")) {
    getFilteredTransactions().forEach((transaction) => {
      const id = String(transaction.id);
      if (input.checked) selectedTransactionIds.add(id);
      else selectedTransactionIds.delete(id);
    });
    renderTransactionList();
    return true;
  }
  if (input.matches("[data-select-transaction]")) {
    const id = String(input.dataset.selectTransaction);
    if (input.checked) selectedTransactionIds.add(id);
    else selectedTransactionIds.delete(id);
    updateTransactionBulkDeleteButton();
    return true;
  }
  return false;
}

function initTransactionsPage() {
  updateTransactionCategories();
  updateCashflowIncomeCategories();
  updateCashflowExpenseCategories();
  updateTransactionCategoryFilter();
  renderTransactionList();
  renderMonthlyOverview();
  renderDynamicOverview();
  void refreshUncategorizedTransactions({ silent: true });
}

console.time("init:finance:listeners");
financeTabs.forEach((tab) => {
  tab.addEventListener("click", () => setFinanceTab(tab.dataset.financeTab));
});

financeTabsOverflowToggle?.addEventListener("click", () => {
  const isOpen = financeTabsOverflowToggle.getAttribute("aria-expanded") === "true";
  setFinanceTabsOverflowOpen(!isOpen);
});
financeTabsOverflowMenu?.addEventListener("click", (event) => {
  const item = event.target.closest("[data-finance-overflow-tab]");
  if (!item) return;
  setFinanceTab(item.dataset.financeOverflowTab);
  setFinanceTabsOverflowOpen(false);
});

financeOverviewRoot?.addEventListener("click", (event) => {
  const tabButton = event.target.closest("[data-open-finance-tab]");

  if (tabButton) setFinanceTab(tabButton.dataset.openFinanceTab);
});

financeOverviewRoot?.addEventListener("change", (event) => {
  const yearSelect = event.target.closest("[data-finance-overview-year]");
  if (!yearSelect) return;
  selectedFinanceOverviewYear = Number(yearSelect.value) || new Date().getFullYear();
  renderFinanceOverview();
});

document.addEventListener("click", (event) => {
  if (!financeTabsOverflow || financeTabsOverflow.classList.contains("hidden")) return;
  if (financeTabsOverflow.contains(event.target)) return;
  setFinanceTabsOverflowOpen(false);
});

financialComparisonRoot?.addEventListener("click", async (event) => {
  if (window.MentorUIEvents?.isTextEditingEvent?.(event)) {
    event.stopPropagation();
    return;
  }
  const previousIdea = event.target.closest("[data-financial-idea-prev]");
  const nextIdea = event.target.closest("[data-financial-idea-next]");
  const openResearch = event.target.closest("[data-financial-open-research]");
  const ideaDot = event.target.closest("[data-financial-idea]");
  const optionButton = event.target.closest(".financial-option-select[data-financial-option]");
  const toggleAdd = event.target.closest("[data-financial-toggle-add]");
  const createOption = event.target.closest("[data-financial-create-option]");
  const closeOptionModal = event.target.closest("[data-financial-close-option-modal]");
  const addReference = event.target.closest("[data-financial-add-reference]");
  const removeReference = event.target.closest("[data-financial-remove-reference]");
  const deleteOption = event.target.closest("[data-financial-delete-option]");
  const editOption = event.target.closest("[data-financial-edit-option]");
  const saveSnapshot = event.target.closest("[data-financial-save-snapshot]");
  const loadSnapshot = event.target.closest("[data-financial-load-snapshot]");
  const deleteSnapshot = event.target.closest("[data-financial-delete-snapshot]");
  const priceOverrideInput = event.target.closest("[data-financial-reference-price-override]");
  const referenceChoice = event.target.closest(".financial-direction-choice");
  const mainReferenceChoice = referenceChoice?.querySelector("[data-financial-main-reference]") ? referenceChoice : null;
  const secondaryReferenceChoice = referenceChoice?.querySelector("[data-financial-secondary-reference]") ? referenceChoice : null;

  if (!priceOverrideInput && mainReferenceChoice) {
    const mainReferenceInput = mainReferenceChoice.querySelector("[data-financial-main-reference]");
    if (!mainReferenceInput) return;
    event.preventDefault();
    financialComparisonState.optionDraftReferenceId = mainReferenceInput.value;
    renderFinancialComparisonPagePreservingModalScroll();
    return;
  }

  if (!priceOverrideInput && secondaryReferenceChoice) {
    const secondaryReferenceInput = secondaryReferenceChoice.querySelector("[data-financial-secondary-reference]");
    if (!secondaryReferenceInput) return;
    event.preventDefault();
    const keys = new Set(financialComparisonState.optionDraftSecondaryReferenceKeys || []);
    if (keys.has(secondaryReferenceInput.value)) keys.delete(secondaryReferenceInput.value);
    else keys.add(secondaryReferenceInput.value);
    financialComparisonState.optionDraftSecondaryReferenceKeys = Array.from(keys);
    renderFinancialComparisonPagePreservingModalScroll();
    return;
  }

  if (deleteSnapshot) {
    await deleteFinancialComparisonSnapshot(deleteSnapshot.dataset.financialDeleteSnapshot);
    return;
  }
  if (loadSnapshot) {
    await loadFinancialComparisonSnapshot(loadSnapshot.dataset.financialLoadSnapshot);
    return;
  }
  if (saveSnapshot) {
    await saveCurrentFinancialComparisonSnapshot();
    return;
  }
  if (previousIdea) {
    await setFinancialIdeaByOffset(-1);
    return;
  }
  if (nextIdea) {
    await setFinancialIdeaByOffset(1);
    return;
  }
  if (openResearch) {
    openFinancialIdeaResearch(openResearch.dataset.financialOpenResearch);
    return;
  }
  if (ideaDot) {
    updateActiveFinancialComparisonSnapshot();
    const idea = getFinancialIdea(ideaDot.dataset.financialIdea);
    if (!idea) return;
    const firstDirection = getFinancialFirstReferenceDirection(idea);
    financialComparisonState.selectedIdeaId = idea.id;
    financialComparisonState.selectedDirectionId = firstDirection?.id || "";
    financialComparisonState.selectedReferenceId = firstDirection?.references?.[0]?.id || "";
    financialComparisonState.selectedOptionId = getFinancialVisibleOptions()[0]?.id || null;
    financialComparisonState.editingOptionId = null;
    financialComparisonState.optionDraftDirectionId = "";
    financialComparisonState.optionDraftReferenceId = "";
    financialComparisonState.optionDraftSecondaryDirectionId = "";
    financialComparisonState.optionDraftSecondaryReferenceKeys = [];
    financialComparisonState.optionDraftPriceOverrides = {};
    financialComparisonState.addPanelOpen = false;
    if (await persistFinancialComparisonBridge()) renderFinancialComparisonPage();
    return;
  }
  if (deleteOption) {
    await deleteFinancialOption(deleteOption.dataset.financialDeleteOption);
    return;
  }
  if (editOption) {
    openFinancialOptionEditor(editOption.dataset.financialEditOption);
    return;
  }
  if (toggleAdd) {
    resetFinancialOptionDraft();
    financialComparisonState.addPanelOpen = true;
    renderFinancialComparisonPage();
    return;
  }
  if (closeOptionModal) {
    financialComparisonState.addPanelOpen = false;
    financialComparisonState.editingOptionId = null;
    financialComparisonState.optionDraftSecondaryDirectionIds = [];
    financialComparisonState.optionDraftSecondaryDirectionId = "";
    financialComparisonState.optionDraftSecondaryReferenceKeys = [];
    financialComparisonState.optionDraftPriceOverrides = {};
    financialComparisonState.optionDraftParticipation = getFinancialDefaultParticipation();
    financialComparisonState.optionDraftParticipationManual = false;
    renderFinancialComparisonPage();
    return;
  }
  if (createOption) {
    const mainDirectionSelect = financialComparisonRoot.querySelector("[data-financial-main-direction-select]");
    const mainReferenceInput = financialComparisonRoot.querySelector("[data-financial-main-reference]:checked");
    const participationInput = financialComparisonRoot.querySelector("[data-financial-option-participation]");
    if (participationInput) {
      financialComparisonState.optionDraftParticipation = clampFinancialParticipation(participationInput.value);
      participationInput.value = financialComparisonState.optionDraftParticipation;
    }
    const priceOverrides = Array.from(financialComparisonRoot.querySelectorAll("[data-financial-reference-price-override]")).reduce((acc, input) => {
      acc[input.dataset.financialReferencePriceOverride] = Math.max(0, Number(input.value || 0));
      return acc;
    }, { ...(financialComparisonState.optionDraftPriceOverrides || {}) });
    const secondaryKeys = Array.from(new Set([
      ...(financialComparisonState.optionDraftSecondaryReferenceKeys || []),
      ...Array.from(financialComparisonRoot.querySelectorAll("[data-financial-secondary-reference]:checked")).map((input) => input.value)
    ]));
    await addFinancialComparisonOption(mainDirectionSelect?.value || financialComparisonState.optionDraftDirectionId, mainReferenceInput?.value || financialComparisonState.optionDraftReferenceId, secondaryKeys, priceOverrides);
    return;
  }
  if (addReference) {
    const directionSelect = financialComparisonRoot.querySelector(".financial-option-card.active [data-financial-select-direction]");
    const referenceSelect = financialComparisonRoot.querySelector("[data-financial-reference-select]");
    const priceInput = financialComparisonRoot.querySelector("[data-financial-reference-price]");
    await addFinancialReferenceToOption(directionSelect?.value || financialComparisonState.selectedDirectionId, referenceSelect?.value, priceInput?.value);
    return;
  }
  if (removeReference) {
    await removeFinancialReferenceFromOption(removeReference.dataset.financialRemoveReference);
    return;
  }
  if (optionButton) {
    financialComparisonState.selectedOptionId = optionButton.dataset.financialOption;
    updateActiveFinancialComparisonSnapshot();
    if (await persistFinancialComparisonBridge()) renderFinancialComparisonPage();
  }
});

financialComparisonRoot?.addEventListener("change", async (event) => {
  const input = event.target.closest("[data-financial-input]");
  const dateInput = event.target.closest("[data-financial-date]");
  const ideaSelect = event.target.closest("[data-financial-select-idea]");
  const directionSelect = event.target.closest("[data-financial-select-direction]");
  const referenceSelect = event.target.closest("[data-financial-reference-select]");
  const optionDirectionSelect = event.target.closest("[data-financial-option-direction]");
  const optionReferenceSelect = event.target.closest("[data-financial-option-reference]");
  const mainDirectionInput = event.target.closest("[data-financial-main-direction]");
  const secondaryDirectionInput = event.target.closest("[data-financial-secondary-direction]");
  const mainDirectionSelect = event.target.closest("[data-financial-main-direction-select]");
  const secondaryDirectionSelect = event.target.closest("[data-financial-secondary-direction-select]");
  const mainReferenceInput = event.target.closest("[data-financial-main-reference]");
  const secondaryReferenceInput = event.target.closest("[data-financial-secondary-reference]");

  if (input) {
    await updateFinancialNumber(input.dataset.financialInput, input.value);
    return;
  }
  if (dateInput) {
    financialComparisonState[dateInput.dataset.financialDate] = dateInput.value || todayIso;
    updateActiveFinancialComparisonSnapshot();
    if (await persistFinancialComparisonBridge()) renderFinancialComparisonPage();
    return;
  }
  if (ideaSelect) {
    updateActiveFinancialComparisonSnapshot();
    const idea = getFinancialIdea(ideaSelect.value);
    if (!idea) return;
    const firstDirection = getFinancialFirstReferenceDirection(idea);
    financialComparisonState.selectedIdeaId = idea.id;
    financialComparisonState.selectedDirectionId = firstDirection?.id || "";
    financialComparisonState.selectedReferenceId = firstDirection?.references?.[0]?.id || "";
    financialComparisonState.selectedOptionId = getFinancialVisibleOptions()[0]?.id || null;
    financialComparisonState.editingOptionId = null;
    financialComparisonState.optionDraftDirectionId = "";
    financialComparisonState.optionDraftReferenceId = "";
    financialComparisonState.optionDraftSecondaryDirectionId = "";
    financialComparisonState.optionDraftSecondaryReferenceKeys = [];
    financialComparisonState.optionDraftPriceOverrides = {};
    financialComparisonState.optionDraftParticipation = getFinancialDefaultParticipation();
    financialComparisonState.optionDraftParticipationManual = false;
    financialComparisonState.addPanelOpen = false;
    if (await persistFinancialComparisonBridge()) renderFinancialComparisonPage();
    return;
  }
  if (directionSelect) setFinancialDirection(directionSelect.value);
  if (referenceSelect) {
    financialComparisonState.selectedReferenceId = referenceSelect.value;
    renderFinancialComparisonPage();
  }
  if (optionDirectionSelect) {
    financialComparisonState.optionDraftDirectionId = optionDirectionSelect.value;
    financialComparisonState.optionDraftReferenceId = getFinancialReferences(financialComparisonState.selectedIdeaId, optionDirectionSelect.value)[0]?.id || "";
    renderFinancialComparisonPage();
    return;
  }
  if (optionReferenceSelect) {
    financialComparisonState.optionDraftReferenceId = optionReferenceSelect.value;
    renderFinancialComparisonPage();
  }
  if (mainDirectionInput) {
    financialComparisonState.optionDraftDirectionId = mainDirectionInput.value;
    financialComparisonState.optionDraftReferenceId = getFinancialReferences(financialComparisonState.selectedIdeaId, mainDirectionInput.value)[0]?.id || "";
    financialComparisonState.optionDraftSecondaryReferenceKeys = (financialComparisonState.optionDraftSecondaryReferenceKeys || [])
      .filter((key) => !String(key).startsWith(mainDirectionInput.value + "::"));
    if (!financialComparisonState.optionDraftParticipationManual) {
      financialComparisonState.optionDraftParticipation = getFinancialDefaultParticipation();
    }
    renderFinancialComparisonPage();
    return;
  }
  if (secondaryDirectionInput) {
    const ids = new Set(financialComparisonState.optionDraftSecondaryDirectionIds || []);
    if (secondaryDirectionInput.checked) ids.add(secondaryDirectionInput.value);
    else ids.delete(secondaryDirectionInput.value);
    financialComparisonState.optionDraftSecondaryDirectionIds = Array.from(ids);
    renderFinancialComparisonPage();
  }
  if (mainDirectionSelect) {
    financialComparisonState.optionDraftDirectionId = mainDirectionSelect.value;
    financialComparisonState.optionDraftReferenceId = getFinancialReferences(financialComparisonState.selectedIdeaId, mainDirectionSelect.value)[0]?.id || "";
    financialComparisonState.optionDraftSecondaryReferenceKeys = (financialComparisonState.optionDraftSecondaryReferenceKeys || [])
      .filter((key) => !String(key).startsWith(mainDirectionSelect.value + "::"));
    if (!financialComparisonState.optionDraftParticipationManual) {
      financialComparisonState.optionDraftParticipation = getFinancialDefaultParticipation();
    }
    renderFinancialComparisonPage();
    return;
  }
  if (secondaryDirectionSelect) {
    financialComparisonState.optionDraftSecondaryDirectionId = secondaryDirectionSelect.value;
    renderFinancialComparisonPage();
    return;
  }
  if (mainReferenceInput) {
    financialComparisonState.optionDraftReferenceId = mainReferenceInput.value;
    renderFinancialComparisonPagePreservingModalScroll();
    return;
  }
  if (secondaryReferenceInput) {
    const keys = new Set(financialComparisonState.optionDraftSecondaryReferenceKeys || []);
    if (secondaryReferenceInput.checked) keys.add(secondaryReferenceInput.value);
    else keys.delete(secondaryReferenceInput.value);
    financialComparisonState.optionDraftSecondaryReferenceKeys = Array.from(keys);
    renderFinancialComparisonPagePreservingModalScroll();
    return;
  }
});

financialComparisonRoot?.addEventListener("input", async (event) => {
  const input = event.target.closest("[data-financial-input]");
  const nameInput = event.target.closest("[data-financial-option-name]");
  const priceOverrideInput = event.target.closest("[data-financial-reference-price-override]");
  const participationInput = event.target.closest("[data-financial-option-participation]");
  if (participationInput) {
    financialComparisonState.optionDraftParticipationManual = true;
    financialComparisonState.optionDraftParticipation = clampFinancialParticipation(participationInput.value);
    if (Number(participationInput.value || 0) > financialComparisonState.optionDraftParticipation) {
      participationInput.value = financialComparisonState.optionDraftParticipation;
    }
    return;
  }
  if (priceOverrideInput) {
    financialComparisonState.optionDraftPriceOverrides = {
      ...(financialComparisonState.optionDraftPriceOverrides || {}),
      [priceOverrideInput.dataset.financialReferencePriceOverride]: Math.max(0, Number(priceOverrideInput.value || 0))
    };
    return;
  }
  if (nameInput) {
    financialComparisonState.optionDraftName = nameInput.value;
    return;
  }
  if (!input) return;
  const inputKey = input.dataset.financialInput;
  const inputValue = Math.max(0, Number(input.value || 0));
  if (inputKey === "currentCapital") {
    const liquidAssetsTotal = syncFinancialLiquidAssets();
    financialComparisonState.currentCapitalManual = true;
    financialComparisonState.currentCapital = Math.min(inputValue, liquidAssetsTotal);
    if (inputValue > liquidAssetsTotal) input.value = financialComparisonState.currentCapital;
    if (financialComparisonState.addPanelOpen && !financialComparisonState.optionDraftParticipationManual) {
      financialComparisonState.optionDraftParticipation = getFinancialDefaultParticipation();
      const participationField = financialComparisonRoot.querySelector("[data-financial-option-participation]");
      if (participationField) {
        participationField.max = getFinancialDefaultParticipation();
        participationField.value = financialComparisonState.optionDraftParticipation;
      }
    } else if (financialComparisonState.addPanelOpen && financialComparisonState.optionDraftParticipationManual) {
      financialComparisonState.optionDraftParticipation = clampFinancialParticipation(financialComparisonState.optionDraftParticipation);
      const participationField = financialComparisonRoot.querySelector("[data-financial-option-participation]");
      if (participationField) {
        participationField.max = getFinancialDefaultParticipation();
        participationField.value = financialComparisonState.optionDraftParticipation;
      }
    }
  } else {
    financialComparisonState[inputKey] = inputValue;
  }
  syncFinancialFreeMonthlyAmount();
  updateActiveFinancialComparisonSnapshot();
  if (!await persistFinancialComparisonBridge()) return;
  const selectedOption = getFinancialSelectedOption();
  const selectedMetrics = selectedOption ? getFinancialMetrics(selectedOption) : null;
  const resultPanel = financialComparisonRoot.querySelector(".financial-result-panel");
  const bottomPanel = financialComparisonRoot.querySelector(".financial-bottom-panel");
  if (resultPanel) resultPanel.outerHTML = renderFinancialResultPanel(selectedOption, selectedMetrics);
  if (bottomPanel) bottomPanel.outerHTML = renderFinancialComparisonTable(getFinancialVisibleOptions());
});

openTransactionModalBtn?.addEventListener("click", () => {
  clearTransactionForm();
  openTransactionModal();
});
transactionUploadBtn?.addEventListener("click", () => {
  openTransactionImportStart();
});
transactionImportChooseFileBtn?.addEventListener("click", () => {
  if (!transactionUploadInput) {
    showTransactionStatus(financeT("statusMessages.importFailedCsv", "Upload nije uspeo. Probaj CSV export."));
    return;
  }
  transactionUploadInput.value = "";
  if (typeof transactionUploadInput.showPicker === "function") {
    try {
      transactionUploadInput.showPicker();
      return;
    } catch (error) {
      // Fall back to click below when showPicker is unavailable for this input state.
    }
  }
  transactionUploadInput.click();
});
transactionUploadInput?.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file) showTransactionStatus(financeT("statusMessages.importReadingFile", "Citam fajl za import..."));
  prepareTransactionImportFile(file);
});
transactionImportModal?.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-transaction-import]")) {
    closeTransactionImportModal();
  }
});
transactionImportTemplateInput?.addEventListener("change", () => {
  applyTransactionImportTemplate(transactionImportTemplateInput.value);
});
saveTransactionImportTemplateBtn?.addEventListener("click", saveCurrentTransactionImportTemplate);
confirmTransactionImportBtn?.addEventListener("click", confirmMappedTransactionImport);
transactionModal?.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-transaction-modal]")) {
    closeTransactionModal();
  }
});
openCategoryManagerBtn?.addEventListener("click", openCategoryManager);
categoryManagerModal?.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-category-manager]")) {
    closeCategoryManager();
  }
});
categoryManagerType?.addEventListener("change", renderCategoryManager);
categoryManagerAddBtn?.addEventListener("click", async () => {
  const type = categoryManagerType?.value || "expense";
  const value = categoryManagerInput?.value || "";
  if (await addTransactionCategory(type, value) && categoryManagerInput) {
    categoryManagerInput.value = "";
    categoryManagerInput.focus();
  }
});
categoryManagerInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    categoryManagerAddBtn?.click();
  }
});
categoryManagerList?.addEventListener("click", async (event) => {
  const deleteButton = event.target.closest("[data-delete-category-index]");
  const type = categoryManagerType?.value || "expense";
  const keywordButton = event.target.closest("[data-edit-category-keywords]");
  if (keywordButton) {
    selectedKeywordCategory = { type, category: keywordButton.dataset.editCategoryKeywords };
    renderCategoryManager();
    categoryKeywordInput?.focus();
    return;
  }
  if (!deleteButton) return;
  const category = TRANSACTION_CATEGORIES[type]?.[Number(deleteButton.dataset.deleteCategoryIndex)];
  if (category && window.confirm(financeT("confirm.deleteCategory", "Da li zelis da obrises kategoriju \"{{category}}\" i njene keyworde?", { category }))) {
    await removeTransactionCategory(type, category);
  }
});
categoryKeywordList?.addEventListener("click", async (event) => {
  const keywordDeleteButton = event.target.closest("[data-delete-category-keyword]");
  if (keywordDeleteButton) await deleteCategoryKeyword(Number(keywordDeleteButton.dataset.deleteCategoryKeyword));
});
categoryKeywordAddBtn?.addEventListener("click", addCategoryKeyword);
categoryKeywordInput?.addEventListener("keydown", async (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    await addCategoryKeyword();
  }
});
toggleQuickCategoryBtn?.addEventListener("click", () => {
  quickCategoryAdd?.classList.toggle("hidden");
  quickCategoryInput?.focus();
});
quickCategoryAddBtn?.addEventListener("click", addQuickCategory);
quickCategoryInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addQuickCategory();
  }
});
toggleCashflowIncomeCategoryBtn?.addEventListener("click", () => {
  cashflowIncomeQuickCategoryAdd?.classList.toggle("hidden");
  cashflowIncomeQuickCategoryInput?.focus();
});
cashflowIncomeQuickCategoryAddBtn?.addEventListener("click", addCashflowIncomeCategory);
cashflowIncomeQuickCategoryInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addCashflowIncomeCategory();
  }
});
toggleCashflowExpenseCategoryBtn?.addEventListener("click", () => {
  cashflowExpenseQuickCategoryAdd?.classList.toggle("hidden");
  cashflowExpenseQuickCategoryInput?.focus();
});
cashflowExpenseQuickCategoryAddBtn?.addEventListener("click", addCashflowExpenseCategory);
cashflowExpenseQuickCategoryInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addCashflowExpenseCategory();
  }
});
transactionTypeInput?.addEventListener("change", () => {
  updateTransactionCategories();
  if (transactionBudgetInput) transactionBudgetInput.value = "";
  suggestBudgetForTransaction();
});
transactionCategoryInput?.addEventListener("change", () => {
  if (transactionBudgetInput) transactionBudgetInput.value = "";
  suggestBudgetForTransaction();
});
transactionLinkedToInput?.addEventListener("change", () => {
  if (transactionBudgetInput) transactionBudgetInput.value = "";
  suggestBudgetForTransaction();
});
transactionForm?.addEventListener("submit", saveTransaction);
transactionForm?.querySelector('button[type="submit"]')?.addEventListener("click", (event) => {
  saveTransaction(event);
});
transactionCancelEditBtn?.addEventListener("click", () => {
  clearTransactionForm();
  closeTransactionModal();
});
transactionDateFilter?.addEventListener("change", renderTransactionList);
transactionTypeFilter?.addEventListener("change", renderTransactionList);
transactionCategoryFilter?.addEventListener("change", renderTransactionList);
transactionLinkedFilter?.addEventListener("change", renderTransactionList);
transactionSort?.addEventListener("change", renderTransactionList);
transactionSearchInput?.addEventListener("input", () => scheduleTransactionListRender());
transactionResetFiltersBtn?.addEventListener("click", resetTransactionFilters);
refreshTransactionCategoriesBtn?.addEventListener("click", refreshUncategorizedTransactions);
overviewPeriodSelect?.addEventListener("change", renderDynamicOverview);
overviewChartTypeSelect?.addEventListener("change", renderDynamicOverview);
overviewStartDate?.addEventListener("change", renderDynamicOverview);
overviewEndDate?.addEventListener("change", renderDynamicOverview);
monthlyOverviewContent?.addEventListener("mousemove", (event) => {
  const pieChart = event.target.closest(".overview-pie-chart");
  if (!pieChart) {
    setOverviewPieActiveIndex(-1);
    return;
  }
  setOverviewPieActiveIndex(getOverviewPieIndexFromPointer(event, pieChart));
});
monthlyOverviewContent?.addEventListener("mouseleave", () => {
  setOverviewPieActiveIndex(-1);
});
cashflowProjectionStart?.addEventListener("change", renderCashflowPage);
cashflowProjectionEnd?.addEventListener("change", renderCashflowPage);
bindDatePickerActivation(cashflowProjectionStart);
bindDatePickerActivation(cashflowProjectionEnd);
bindCashflowIconPicker("income");
bindCashflowIconPicker("expense");
bindCashflowIconPicker("debt");
document.querySelector(".cashflow-period-options")?.addEventListener("click", (event) => {
  if (event.target.closest("input")) return;
  const option = event.target.closest(".cashflow-period-option");
  const checkbox = option?.querySelector('input[type="checkbox"]');
  if (!checkbox) return;
  event.preventDefault();
  checkbox.checked = !checkbox.checked;
  renderCashflowProjection();
});
cashflowIncludeCapital?.addEventListener("change", renderCashflowProjection);
cashflowIncludeInvestments?.addEventListener("change", renderCashflowProjection);
cashflowIncludeExtraExpenses?.addEventListener("change", renderCashflowProjection);
cashflowMonthsPrevBtn?.addEventListener("click", () => moveCashflowMonthCursor(-1));
cashflowMonthsNextBtn?.addEventListener("click", () => moveCashflowMonthCursor(1));
cashflowIncomeCategory?.addEventListener("change", () => {
  if (!cashflowIncomeIconInput?.value || cashflowIncomeIconInput.value === getCashflowDefaultIcon("income")) setCashflowIcon("income", getCashflowDefaultIcon("income", cashflowIncomeCategory.value));
});
cashflowExpenseCategory?.addEventListener("change", () => {
  const defaultExpenseIcon = getCashflowDefaultIcon("expense");
  if (!cashflowExpenseIconInput?.value || ["receipt", "wallet", defaultExpenseIcon].includes(cashflowExpenseIconInput.value)) setCashflowIcon("expense", getCashflowDefaultIcon("expense", cashflowExpenseCategory.value));
});
cashflowListTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    activeCashflowListType = tab.dataset.cashflowListTab || "expense";
    renderActiveCashflowList();
  });
});
cashflowActiveAddBtn?.addEventListener("click", () => {
  const config = getCashflowListConfig();
  openCashflowAddModal(config.type);
});
cashflowIncomeModal?.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-cashflow-modal]")) closeCashflowModal(cashflowIncomeModal, cashflowIncomeForm);
});
cashflowExpenseModal?.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-cashflow-modal]")) closeCashflowModal(cashflowExpenseModal, cashflowExpenseForm);
});
cashflowDebtModal?.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-cashflow-modal]")) closeCashflowModal(cashflowDebtModal, cashflowDebtForm);
});
cashflowIncomeForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = cashflowIncomeName?.value.trim();
  const category = cashflowIncomeCategory?.value || "Ostalo";
  const amount = Number(cashflowIncomeAmount?.value);
  if (!name || !Number.isFinite(amount) || amount <= 0) return;
  const payload = {
    name,
    category,
    icon: normalizeIconName(cashflowIncomeIconInput?.value) || getCashflowDefaultIcon("income", category),
    amount,
    frequency: cashflowIncomeFrequency?.value || "monthly",
    weekday: Number(cashflowIncomeWeekday?.value ?? 1),
    note: cashflowIncomeNote?.value.trim() || ""
  };
  const wasEditing = editingCashflowItem?.type === "income";
  const saved = wasEditing
    ? await updateCashflowItem("income", editingCashflowItem.id, payload)
    : await addCashflowItem("income", payload);
  if (!saved) return;
  if (wasEditing) closeCashflowModal(cashflowIncomeModal, cashflowIncomeForm);
  else resetCashflowFormForNext(cashflowIncomeForm, cashflowIncomeName);
});
cashflowExpenseForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearCashflowExpenseStatus();
  const name = cashflowExpenseName?.value.trim();
  const category = cashflowExpenseCategory?.value || "Ostalo";
  const amount = Number(cashflowExpenseAmount?.value);
  const paymentStartDay = normalizeCashflowPaymentDay(cashflowExpensePaymentStartDay?.value);
  const paymentEndDay = normalizeCashflowPaymentDay(cashflowExpensePaymentEndDay?.value);
  if (!name) {
    showCashflowExpenseStatus(financeT("static.cashflow.enterExpenseName", "Unesi naziv troska."));
    cashflowExpenseName?.focus();
    return;
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    showCashflowExpenseStatus(financeT("static.cashflow.enterExpenseAmount", "Unesi iznos troska veci od 0."));
    cashflowExpenseAmount?.focus();
    return;
  }
  if ((paymentStartDay || paymentEndDay) && (!paymentStartDay || !paymentEndDay || paymentEndDay < paymentStartDay)) {
    showCashflowExpenseStatus(financeT("static.cashflow.enterValidPaymentPeriod", "Unesi oba dana placanja, sa krajem koji nije pre pocetka."));
    (paymentStartDay ? cashflowExpensePaymentEndDay : cashflowExpensePaymentStartDay)?.focus();
    return;
  }
  const payload = {
    name,
    category,
    icon: normalizeIconName(cashflowExpenseIconInput?.value) || getCashflowDefaultIcon("expense", category),
    amount,
    paymentStartDay,
    paymentEndDay,
    paymentDate: "",
    frequency: cashflowExpenseFrequency?.value || "monthly",
    weekday: Number(cashflowExpenseWeekday?.value ?? 1),
    note: cashflowExpenseNote?.value.trim() || ""
  };
  const wasEditing = editingCashflowItem?.type === "expense";
  try {
    const saved = wasEditing
      ? await updateCashflowItem("expense", editingCashflowItem.id, payload)
      : await addCashflowItem("expense", payload);
    if (!saved) {
      showCashflowExpenseStatus(financeT("static.cashflow.expenseSaveFailed", "Trosak nije sacuvan. Pokusaj ponovo."));
      return;
    }
    if (wasEditing) closeCashflowModal(cashflowExpenseModal, cashflowExpenseForm);
    else resetCashflowFormForNext(cashflowExpenseForm, cashflowExpenseName);
  } catch (error) {
    showCashflowExpenseStatus(error?.message || financeT("static.cashflow.expenseSaveFailed", "Trosak nije sacuvan. Pokusaj ponovo."));
  }
});

function bindCashflowSubmitButton(form) {
  const submitButton = form?.querySelector('button[type="submit"]');
  if (!form || !submitButton) return;
  submitButton.addEventListener("click", (event) => {
    event.preventDefault();
    if (typeof form.requestSubmit === "function") form.requestSubmit();
    else form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}

bindCashflowSubmitButton(cashflowIncomeForm);
bindCashflowSubmitButton(cashflowExpenseForm);

async function handleCashflowDebtSave(event) {
  event.preventDefault();
  if (cashflowDebtSaveInProgress) return;
  clearCashflowDebtStatus();
  const name = cashflowDebtName?.value.trim();
  const balance = getAssetFormNumber(cashflowDebtBalance);
  const monthly = getAssetFormNumber(cashflowDebtMonthly);
  const startDate = cashflowDebtStartDate?.value || "";
  if (!name) {
    showCashflowDebtStatus(financeT("validation.enterDebtName", "Unesi naziv duga."));
    cashflowDebtName?.focus();
    return;
  }
  if (!Number.isFinite(balance) || balance <= 0) {
    showCashflowDebtStatus(financeT("validation.debtTotalGreaterThanZero", "Ukupan dug mora biti veci od 0."));
    cashflowDebtBalance?.focus();
    return;
  }
  if (!Number.isFinite(monthly) || monthly <= 0) {
    showCashflowDebtStatus(financeT("validation.debtPaymentGreaterThanZero", "Iznos rate mora biti veci od 0."));
    cashflowDebtMonthly?.focus();
    return;
  }
  if (!parseCashflowDate(startDate)) {
    showCashflowDebtStatus(financeT("validation.chooseDate", "Izaberi datum."));
    cashflowDebtStartDate?.focus();
    return;
  }
  const payload = {
    name,
    icon: normalizeIconName(cashflowDebtIconInput?.value) || getCashflowDefaultIcon("debt"),
    balance,
    monthly,
    startDate,
    frequency: cashflowDebtFrequency?.value || "monthly",
    weekday: Number(cashflowDebtWeekday?.value ?? 1),
    note: cashflowDebtNote?.value.trim() || ""
  };
  const wasEditing = editingCashflowItem?.type === "debt";
  cashflowDebtSaveInProgress = true;
  try {
    const saved = wasEditing
      ? await updateCashflowItem("debt", editingCashflowItem.id, payload)
      : await addCashflowItem("debt", payload);
    if (!saved) {
      showCashflowDebtStatus(financeT("statusMessages.debtSaveFailed", "Dug nije sacuvan. Proveri unos i pokusaj ponovo."));
      return;
    }
    closeCashflowModal(cashflowDebtModal, cashflowDebtForm);
  } catch (error) {
    showCashflowDebtStatus(error?.message || financeT("statusMessages.debtSaveFailed", "Dug nije sacuvan. Proveri unos i pokusaj ponovo."));
  } finally {
    cashflowDebtSaveInProgress = false;
  }
}

cashflowDebtForm?.addEventListener("submit", handleCashflowDebtSave);
cashflowDebtForm?.querySelector('button[type="submit"]')?.addEventListener("click", handleCashflowDebtSave);
openBudgetModalBtn?.addEventListener("click", openBudgetModal);
budgetModal?.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-budget-modal]")) closeBudgetModal();
});
budgetCancelBtn?.addEventListener("click", closeBudgetModal);
budgetLinkedTypeInput?.addEventListener("change", updateBudgetLinkedItems);
budgetForm?.addEventListener("submit", saveBudget);
budgetForm?.querySelector('button[type="submit"]')?.addEventListener("click", (event) => {
  saveBudget(event);
});
budgetPeriodFilter?.addEventListener("change", renderBudgetPage);
budgetTypeFilter?.addEventListener("change", renderBudgetPage);
budgetBehaviorFilter?.addEventListener("change", renderBudgetPage);
budgetStatusFilter?.addEventListener("change", renderBudgetPage);
budgetLinkedFilter?.addEventListener("change", renderBudgetPage);
budgetResetFiltersBtn?.addEventListener("click", resetBudgetFilters);
budgetList?.addEventListener("click", (event) => {
  const createButton = event.target.closest("[data-create-first-budget]");
  const selectButton = event.target.closest("[data-select-budget]");
  if (createButton) openBudgetModal();
  if (selectButton) {
    selectedBudgetId = selectButton.dataset.selectBudget;
    renderBudgetPage();
  }
});
budgetDetails?.addEventListener("click", async (event) => {
  const editButton = event.target.closest("[data-edit-budget]");
  const pauseButton = event.target.closest("[data-pause-budget]");
  const deleteButton = event.target.closest("[data-delete-budget]");
  const transactionsLink = event.target.closest("[data-open-finance-transactions]");
  if (editButton) {
    const budget = budgets.find((item) => item.id === editButton.dataset.editBudget);
    if (budget) openBudgetModal(budget);
  }
  if (transactionsLink) setFinanceTab("transactions");
  if (pauseButton) {
    const budget = budgets.find((item) => item.id === pauseButton.dataset.pauseBudget);
    if (budget) budget.active = !budget.active;
    await saveFinanceState();
    renderBudgetPage();
  }
  if (deleteButton) {
    budgets = budgets.filter((budget) => budget.id !== deleteButton.dataset.deleteBudget);
    selectedBudgetId = budgets[0]?.id || null;
    await saveFinanceState();
    renderBudgetPage();
  }
});
openAssetModalBtn?.addEventListener("click", () => openAssetModal("liquid"));
assetModal?.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-asset-modal]")) closeAssetModal();
});
assetCancelBtn?.addEventListener("click", closeAssetModal);
assetTrackingModeInput?.addEventListener("change", updateAssetFormMode);
assetTypeInput?.addEventListener("change", updateAssetAutoTrackAvailability);
assetAutoTrackTransactionsInput?.closest(".asset-auto-track-field")?.addEventListener("click", (event) => {
  if (!assetAutoTrackTransactionsInput || assetAutoTrackTransactionsInput.disabled) return;
  if (event.target === assetAutoTrackTransactionsInput) return;
  event.preventDefault();
  assetAutoTrackTransactionsInput.checked = !assetAutoTrackTransactionsInput.checked;
});
assetLiveTypeInput?.addEventListener("change", updateLiveAssetSearchMode);
assetCoinSearchInput?.addEventListener("input", () => {
  window.clearTimeout(assetSearchTimer);
  assetSearchTimer = window.setTimeout(handleAssetInstrumentSearch, 280);
});
assetCoinResults?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-select-coin]");
  if (!button) return;
  if (assetProviderIdInput) assetProviderIdInput.value = button.dataset.selectCoin || "";
  if (assetSelectedCoinInput) assetSelectedCoinInput.value = button.dataset.coinName || "";
  if (assetSymbolInput) assetSymbolInput.value = button.dataset.coinSymbol || "";
  if (assetCoinSearchInput) assetCoinSearchInput.value = button.dataset.coinName || "";
  if (assetCoinResults) assetCoinResults.innerHTML = "";
});
assetForm?.addEventListener("submit", handleAssetFormSave);
assetForm?.querySelector('button[type="submit"]')?.addEventListener("click", (event) => {
  handleAssetFormSave(event);
});
assetModeTabs.forEach((tab) => {
  tab.addEventListener("click", () => setAssetMode(tab.dataset.assetMode));
});
assetTypeFilter?.addEventListener("change", renderAssetsPage);
assetLiquidityFilter?.addEventListener("change", renderAssetsPage);
assetLinkedFilter?.addEventListener("change", renderAssetsPage);
assetStatusFilter?.addEventListener("change", renderAssetsPage);
assetSort?.addEventListener("change", renderAssetsPage);
assetResetFiltersBtn?.addEventListener("click", resetAssetFilters);
assetList?.addEventListener("click", (event) => {
  const createButton = event.target.closest("[data-open-first-asset]");
  const trackingControl = event.target.closest(".asset-row-track");
  const selectButton = event.target.closest("[data-select-asset]");
  if (createButton) openAssetModal(activeAssetMode);
  if (trackingControl) {
    event.stopPropagation();
    const trackingInput = trackingControl.querySelector("[data-toggle-asset-tracking]");
    window.setTimeout(() => {
      if (trackingInput) {
        queueFinanceBackgroundCommit(
          "asset-transaction-tracking-toggle",
          () => toggleAssetTransactionTracking(trackingInput.dataset.toggleAssetTracking, trackingInput.checked)
        );
      }
    }, 0);
    return;
  }
  if (selectButton) {
    selectedAssetId = selectButton.dataset.selectAsset;
    renderAssetsPage();
  }
});
assetDetails?.addEventListener("click", async (event) => {
  const tabButton = event.target.closest("[data-asset-detail-tab]");
  const refreshButton = event.target.closest("[data-refresh-asset]");
  const deleteButton = event.target.closest("[data-delete-asset]");
  const linkButton = event.target.closest("[data-link-asset]");
  const editButton = event.target.closest("[data-edit-asset]");
  if (tabButton) {
    activeAssetDetailTab = tabButton.dataset.assetDetailTab === "history" ? "history" : "details";
    renderAssetsPage();
  }
  if (refreshButton) await refreshSingleLiveAsset(refreshButton.dataset.refreshAsset, true);
  if (deleteButton) await deleteAssetRecord(deleteButton.dataset.deleteAsset);
  if (linkButton) showAssetStatus(financeT("statusMessages.linkGoalReady", "Povezivanje sa ciljem je spremno za sledecu backend fazu."));
  if (editButton) {
    const recordId = editButton.dataset.editAsset;
    const asset = assets.find((item) => item.id === recordId);
    if (asset) openAssetModal(asset.trackingMode, asset);
  }
});
document.getElementById("financeIncomePanel")?.addEventListener("click", async (event) => {
  const editButton = event.target.closest("[data-cashflow-edit]");
  const deleteButton = event.target.closest("[data-cashflow-delete]");
  if (editButton) {
    openCashflowEditModal(editButton.dataset.cashflowEdit, editButton.dataset.cashflowId);
    return;
  }
  if (!deleteButton) return;
  const confirmed = window.confirm(financeT("confirm.deleteCashflowItem", "Da li zelis da obrises ovu karticu?"));
  if (!confirmed) return;
  await deleteCashflowItem(deleteButton.dataset.cashflowDelete, deleteButton.dataset.cashflowId);
});
transactionList?.addEventListener("click", async (event) => {
  const selectionInput = event.target.closest("[data-select-visible-transactions], [data-select-transaction]");
  const selectCell = event.target.closest(".transaction-select-cell");
  const editButton = event.target.closest("[data-edit-transaction]");
  const deleteButton = event.target.closest("[data-delete-transaction]");
  const focusButton = event.target.closest("[data-focus-transaction-form]");

  if (selectionInput) {
    handleTransactionSelectionInput(selectionInput);
    event.stopPropagation();
    return;
  }
  if (selectCell && event.target.tagName !== "INPUT") {
    const checkbox = selectCell.querySelector('input[type="checkbox"]');
    if (checkbox) {
      checkbox.checked = !checkbox.checked;
      handleTransactionSelectionInput(checkbox);
    }
    return;
  }
  if (editButton) editTransaction(editButton.dataset.editTransaction);
  if (deleteButton) await deleteTransaction(deleteButton.dataset.deleteTransaction);
  if (focusButton) {
    clearTransactionForm();
    openTransactionModal();
  }
});
transactionList?.addEventListener("change", (event) => {
  handleTransactionSelectionInput(event.target.closest("[data-select-visible-transactions], [data-select-transaction]"));
});
deleteSelectedTransactionsBtn?.addEventListener("click", deleteSelectedTransactions);


window.addEventListener("resize", scheduleFinanceTabsOverflowUpdate);
window.addEventListener("load", scheduleFinanceTabsOverflowUpdate);
window.addEventListener("mentor:languagechange", () => {
  renderFinanceLanguage();
  if (isFinanceViewVisible()) {
    renderActiveFinanceTab({ skipLiveRefresh: true, updateOverflow: true });
  }
});
console.timeEnd("init:finance:listeners");
scheduleFinanceTabsOverflowUpdate();
renderFinanceLanguage();

setFinanceTab("dashboard", { force: true });

if (legacyAssetDebtMigrationPending) {
  queueFinanceBackgroundCommit("asset-debts-to-cashflow", async () => {
    if (!await saveFinanceState()) return false;
    assetDebts = [];
    return saveAssetState();
  });
}

window.setFinanceTab = setFinanceTab;
window.renderFinancialComparisonPage = renderFinancialComparisonPage;
window.getFinancialResearchComparisonOptions = getFinancialResearchComparisonOptions;
window.openFinancialComparisonForIdea = openFinancialComparisonForIdea;
window.renderBudgetPage = renderBudgetPage;
window.renderAssetsPage = renderAssetsPage;
window.renderTransactionsPage = renderTransactionsPage;
window.Finance = Object.assign(window.Finance || {}, {
  deactivateAssetRefresh: stopAssetRefreshTimer,
  activateAssetRefresh: syncAssetRefreshTimer,
  ensureSavingsBudgetForGoal,
  renderFinanceOverview,
  renderActiveFinanceTab
});

