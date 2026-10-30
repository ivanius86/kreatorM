(function () {
  "use strict";

  const FINANCE_MODULE_STATUS = {
    idle: "idle",
    loading: "loading",
    ready: "ready"
  };

  let dashboardInitialized = false;
  let fullFinanceLoadStarted = false;
  let fullDashboardRendered = false;
  let lastRenderedLanguage = "";
  let selectedYear = new Date().getFullYear();

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

  function financeT(key, fallback, params) {
    const fullKey = "finance." + key;
    const translated = window.MentorI18n?.t?.(fullKey, params, fallback);
    return translated && translated !== fullKey ? translated : fallback;
  }

  function overviewT(key, fallback, params) {
    return financeT("static.overview." + key, fallback, params);
  }

  function locale() {
    return window.MentorI18n?.locale || "sr-Latn-RS";
  }

  function escapeHtml(value) {
    if (typeof window.escapeHtml === "function") return window.escapeHtml(value);
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function renderOverviewIcon(name) {
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

  function readFinanceState() {
    try {
      return window.MentorData?.repositories?.finance?.getState?.() || {};
    } catch (error) {
      return {};
    }
  }

  function readAssetState() {
    try {
      const repository = window.MentorData?.repositories?.assets;
      return { assets: repository?.getAssets?.() || [], debts: repository?.getDebts?.() || [] };
    } catch (error) {
      return { assets: [], debts: [] };
    }
  }

  function isDemoRecord(item) {
    return String(item?.id || "").startsWith("demo-") || item?.isDemo === true;
  }

  function financeState() {
    const source = readFinanceState();
    return {
      transactions: normalizeArray(source.transactions).filter((item) => !isDemoRecord(item)),
      cashflowIncomes: normalizeArray(source.cashflowIncomes).filter((item) => !isDemoRecord(item)),
      cashflowExpenses: normalizeArray(source.cashflowExpenses).filter((item) => !isDemoRecord(item)),
      cashflowDebts: normalizeArray(source.cashflowDebts).filter((item) => !isDemoRecord(item)),
      budgets: normalizeArray(source.budgets).filter((item) => !isDemoRecord(item))
    };
  }

  function assetState() {
    const source = readAssetState();
    return {
      assets: normalizeArray(source.assets).filter((item) => !isDemoRecord(item)),
      debts: normalizeArray(source.debts).filter((item) => !isDemoRecord(item))
    };
  }

  function formatMoney(value) {
    return new Intl.NumberFormat(locale(), {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0
    }).format(Number(value || 0));
  }

  function dateFromValue(value) {
    const date = new Date(String(value || "") + "T00:00:00");
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function itemAmount(item, fallbackKey) {
    return Number(item?.amount ?? item?.[fallbackKey] ?? 0) || 0;
  }

  function itemYearlyAmount(item, fallbackKey) {
    const amount = itemAmount(item, fallbackKey);
    const frequency = item?.frequency || "monthly";
    if (frequency === "weekly") return amount * 52;
    if (frequency === "yearly") return amount;
    return amount * 12;
  }

  function itemMonthlyAmount(item, fallbackKey) {
    return itemYearlyAmount(item, fallbackKey) / 12;
  }

  function addDebtPaymentInterval(date, frequency) {
    const next = new Date(date);
    if (frequency === "weekly") next.setDate(next.getDate() + 7);
    else if (frequency === "yearly") next.setFullYear(next.getFullYear() + 1);
    else next.setMonth(next.getMonth() + 1);
    return next;
  }

  function debtAmountForMonth(item, year, monthIndex) {
    const totalDebt = Number(item?.balance || 0);
    const payment = Number(item?.monthly || 0);
    const firstPaymentDate = dateFromValue(item?.startDate) || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const frequency = item?.frequency || "monthly";
    if (totalDebt <= 0 || payment <= 0) return 0;

    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = new Date(year, monthIndex + 1, 0);
    if (frequency === "one-time") return firstPaymentDate >= monthStart && firstPaymentDate <= monthEnd ? totalDebt : 0;

    let paid = 0;
    let total = 0;
    let dueDate = new Date(firstPaymentDate);
    while (dueDate <= monthEnd && paid < totalDebt) {
      const installment = Math.min(payment, totalDebt - paid);
      if (dueDate >= monthStart) total += installment;
      paid += installment;
      dueDate = addDebtPaymentInterval(dueDate, frequency);
    }
    return total;
  }

  function transactionYear(transaction) {
    const date = dateFromValue(transaction.date);
    return date ? date.getFullYear() : null;
  }

  function availableYears(state) {
    const years = new Set([new Date().getFullYear(), selectedYear]);
    state.transactions.forEach((transaction) => {
      const year = transactionYear(transaction);
      if (year) years.add(year);
    });
    return Array.from(years).filter(Boolean).sort((a, b) => b - a);
  }

  function calculateStats(state, assets) {
    const years = availableYears(state);
    if (!years.includes(selectedYear)) selectedYear = years[0] || new Date().getFullYear();

    const yearTransactions = state.transactions.filter((transaction) => transactionYear(transaction) === selectedYear);
    const now = new Date();
    const elapsedMonths = selectedYear < now.getFullYear()
      ? 12
      : selectedYear === now.getFullYear()
      ? now.getMonth() + 1
      : 1;
    const plannedMonthlyIncome = state.cashflowIncomes.reduce((sum, item) => sum + itemMonthlyAmount(item, "amount"), 0);
    const plannedMonthlyExpenses = state.cashflowExpenses.reduce((sum, item) => sum + itemMonthlyAmount(item, "amount"), 0);
    const elapsedMonthData = Array.from({ length: elapsedMonths }, (_, monthIndex) => {
      const monthTransactions = yearTransactions.filter((transaction) => dateFromValue(transaction.date)?.getMonth() === monthIndex);
      const actualIncome = monthTransactions
        .filter((transaction) => transaction.type === "income")
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
      const actualExpenses = monthTransactions
        .filter((transaction) => transaction.type === "expense")
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
      const plannedDebtPayments = state.cashflowDebts
        .reduce((sum, item) => sum + debtAmountForMonth(item, selectedYear, monthIndex), 0);
      return {
        income: plannedMonthlyIncome > 0 ? plannedMonthlyIncome : actualIncome,
        expenses: Math.max(plannedMonthlyExpenses + plannedDebtPayments, actualExpenses)
      };
    });
    const totalIncome = elapsedMonthData.reduce((sum, month) => sum + month.income, 0);
    const totalExpenses = elapsedMonthData.reduce((sum, month) => sum + month.expenses, 0);
    const activeBudgets = state.budgets.filter((budget) => budget.active !== false);
    const budgetLimit = activeBudgets.reduce((sum, budget) => sum + Number(budget.amount || 0), 0);
    const totalAssets = assets.assets.reduce((sum, asset) => sum + Number(asset.value || asset.currentValue || 0), 0);
    const totalDebts = assets.debts.reduce((sum, debt) => sum + Number(debt.remaining || debt.total || debt.value || 0), 0);
    const netWorth = totalAssets - totalDebts;
    const liquidAssets = assets.assets
      .filter((asset) => {
        const type = normalizeText(asset.type);
        return asset.liquidity === "high"
          || ["kes", "cash", "racun", "account", "stednja", "savings", "crypto", "deonice", "stocks"].some((token) => type.includes(token));
      })
      .reduce((sum, asset) => sum + Number(asset.value || asset.currentValue || 0), 0);
    const profileMonth = elapsedMonthData[elapsedMonthData.length - 1] || { income: 0, expenses: 0 };
    const averageMonthlyExpenses = totalExpenses / elapsedMonths;
    const expenseCategories = getExpenseCategoryItems(yearTransactions);
    const fallbackCategory = [...state.cashflowExpenses, ...state.cashflowDebts]
      .sort((a, b) => itemMonthlyAmount(b, b.monthly != null ? "monthly" : "amount") - itemMonthlyAmount(a, a.monthly != null ? "monthly" : "amount"))[0];
    const monthTotals = Array.from({ length: 12 }, (_, monthIndex) => ({
      monthIndex,
      expenses: yearTransactions
        .filter((transaction) => transaction.type === "expense" && dateFromValue(transaction.date)?.getMonth() === monthIndex)
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)
    }));
    const highestExpenseMonth = monthTotals.reduce((highest, item) => item.expenses > highest.expenses ? item : highest, monthTotals[0]);

    return {
      years,
      year: selectedYear,
      totalIncome,
      totalExpenses,
      yearlyDifference: totalIncome - totalExpenses,
      budgetCount: activeBudgets.length,
      budgetLimit,
      totalAssets,
      totalDebts,
      netWorth,
      liquidAssets,
      currentMonthBalance: profileMonth.income - profileMonth.expenses,
      averageMonthlyExpenses,
      highestExpenseCategory: expenseCategories[0]?.category || fallbackCategory?.category || fallbackCategory?.name || "",
      highestExpenseMonth: new Intl.DateTimeFormat(locale(), { month: "long" }).format(new Date(selectedYear, highestExpenseMonth.monthIndex, 1)),
      hasData: Boolean(totalIncome || totalExpenses || totalAssets || totalDebts || activeBudgets.length)
    };
  }

  function renderSummaryCard(card) {
    return `
      <article class="mentor-card finance-overview-summary-card ${escapeHtml(card.tone)}">
        <span class="finance-overview-icon" aria-hidden="true">${renderOverviewIcon(card.icon)}</span>
        <div class="finance-overview-summary-content">
          <span>${escapeHtml(card.title)}</span>
          <strong>${escapeHtml(card.value)}</strong>
        </div>
      </article>
    `;
  }

  function getYearTransactions(state, year) {
    return state.transactions.filter((transaction) => transactionYear(transaction) === year);
  }

  function getExpenseCategoryItems(transactions) {
    const totals = transactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((result, transaction) => {
        const category = transaction.category || "Others";
        result[category] = (result[category] || 0) + Number(transaction.amount || 0);
        return result;
      }, {});
    return Object.entries(totals)
      .map(([category, amount]) => ({ category, amount }))
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }

  function getBestMonth(transactions, year) {
    const monthData = Array.from({ length: 12 }, (_, monthIndex) => {
      const monthTransactions = transactions.filter((transaction) => {
        const date = dateFromValue(transaction.date);
        return date && date.getFullYear() === year && date.getMonth() === monthIndex;
      });
      const income = monthTransactions
        .filter((transaction) => transaction.type === "income")
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
      const expenses = monthTransactions
        .filter((transaction) => transaction.type === "expense")
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
      return {
        monthIndex,
        difference: income - expenses
      };
    });
    const best = monthData.reduce((currentBest, item) => item.difference > currentBest.difference ? item : currentBest, monthData[0]);
    return new Intl.DateTimeFormat(locale(), { month: "short" }).format(new Date(year, best.monthIndex, 1)).replace(".", "");
  }

  function getChartSummary(state, stats) {
    const yearTransactions = getYearTransactions(state, stats.year);
    const expenseItems = getExpenseCategoryItems(yearTransactions);
    const highestExpense = expenseItems[0] || null;
    const lowestExpense = expenseItems.length ? expenseItems[expenseItems.length - 1] : null;
    return {
      highestExpenseLabel: highestExpense ? `${highestExpense.category} (${formatMoney(highestExpense.amount)})` : "-",
      bestMonthLabel: getBestMonth(yearTransactions, stats.year),
      lowestExpenseLabel: lowestExpense ? `${lowestExpense.category} (${formatMoney(lowestExpense.amount)})` : "-"
    };
  }

  function loadingChartText() {
    const language = window.MentorI18n?.getLanguage?.() || "";
    const currentLocale = window.MentorI18n?.locale || "";
    const fallback = language === "en" || String(currentLocale).toLowerCase().startsWith("en") ? "Loading chart" : "Ucitavam grafikon";
    return overviewT("loadingChart", fallback);
  }

  function currentLanguageKey() {
    return [
      window.MentorI18n?.getLanguage?.() || "",
      window.MentorI18n?.locale || ""
    ].join("|");
  }

  function renderChartPanel(stats) {
    return "";
    const state = financeState();
    const summary = getChartSummary(state, stats);

    return `
      <article class="mentor-card finance-overview-chart-panel">
        <div class="finance-overview-panel-head">
          <div>
            <h2>${escapeHtml(overviewT("chartTitleYear", "Prihodi i troskovi kroz godinu"))}</h2>
            <p>${escapeHtml(overviewT("chartSubtitleYear", "Poredjenje mesecnih prihoda i rashoda za {{year}}.", { year: stats.year }))}</p>
          </div>
          <div class="finance-overview-chart-tools">
            <div class="finance-overview-chart-toggle-row">
              <div class="finance-overview-mode-toggle" aria-label="${escapeHtml(overviewT("chartModeAria", "Rezim grafikona"))}">
                <button class="active" type="button" data-finance-dashboard-chart-mode="month" aria-pressed="true"><span class="finance-chart-control-icon calendar" aria-hidden="true"></span>${escapeHtml(overviewT("monthly", "Mesecni"))}</button>
                <button type="button" data-finance-dashboard-chart-mode="day" aria-pressed="false"><span class="finance-chart-control-icon clock" aria-hidden="true"></span>${escapeHtml(overviewT("daily", "Dnevni"))}</button>
              </div>
            </div>
            <div class="finance-overview-legend" aria-label="${escapeHtml(overviewT("chartLegendAria", "Legenda grafikona"))}">
              <label><input type="checkbox" data-finance-dashboard-chart-series="income" checked /><i class="income"></i>${escapeHtml(overviewT("income", "Prihod"))}</label>
              <label><input type="checkbox" data-finance-dashboard-chart-series="expense" checked /><i class="expense"></i>${escapeHtml(overviewT("expense", "Trosak"))}</label>
            </div>
          </div>
        </div>
        <div class="finance-overview-chart finance-dashboard-lite-chart" aria-label="${escapeHtml(overviewT("chartAria", "{{mode}} prihodi i troskovi u evrima", { mode: overviewT("monthly", "Mesecni") }))}">
          <div class="finance-dashboard-chart-loading" role="status" aria-live="polite">
            <span class="finance-dashboard-loading-wallet" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M5 7h13a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a1 1 0 0 1 1-1Z"></path>
                <path d="M7 7V5.5A1.5 1.5 0 0 1 8.5 4H17"></path>
                <path d="M16 13h4"></path>
                <path d="M16.5 13.5h.1"></path>
              </svg>
            </span>
            <strong>${escapeHtml(loadingChartText())}<span class="finance-dashboard-loading-dots" aria-hidden="true"><i></i><i></i><i></i></span></strong>
          </div>
          <div class="finance-overview-chart-inner-bottom">
            <div class="finance-overview-chart-type-toggle" aria-label="${escapeHtml(overviewT("chartTypeAria", "Tip grafikona"))}">
              <button class="active" type="button" data-finance-dashboard-chart-type="line" aria-pressed="true"><span class="finance-chart-type-icon line" aria-hidden="true"><svg viewBox="0 0 28 14" focusable="false"><path d="M2 11 C8 2, 13 2, 14 7 C15 12, 20 12, 26 3"></path><circle cx="14" cy="7" r="2"></circle></svg></span>${escapeHtml(overviewT("line", "Linija"))}</button>
              <button type="button" data-finance-dashboard-chart-type="bar" aria-pressed="false"><span class="finance-chart-type-icon bars" aria-hidden="true"><i></i><i></i><i></i></span>${escapeHtml(overviewT("bars", "Stubovi"))}</button>
            </div>
          </div>
        </div>
        <div class="finance-overview-chart-summary">
          <span>${escapeHtml(overviewT("highestExpenseByCategory", "Najveci trosak po kategoriji"))}: <strong>${escapeHtml(summary.highestExpenseLabel)}</strong></span>
          <span>${escapeHtml(overviewT("bestMonthLabel", "Najbolji mesec"))}: <strong>${escapeHtml(summary.bestMonthLabel)}</strong></span>
          <span>${escapeHtml(overviewT("lowestExpenseByCategory", "Najmanji trosak po kategoriji"))}: <strong>${escapeHtml(summary.lowestExpenseLabel)}</strong></span>
        </div>
      </article>
    `;
  }

  function calculateFinancialStability(stats) {
    if (!stats.hasData) return 0;
    const config = FINANCIAL_STABILITY_CONFIG;
    const savingsRate = stats.totalIncome > 0 ? stats.yearlyDifference / stats.totalIncome : config.minimumSavingsRate;
    const savingsProgress = clamp(
      (savingsRate - config.minimumSavingsRate) / (config.targetSavingsRate - config.minimumSavingsRate),
      0,
      1
    );
    const reserveMonths = stats.averageMonthlyExpenses > 0 ? stats.liquidAssets / stats.averageMonthlyExpenses : 0;
    const reserveProgress = clamp(reserveMonths / config.targetReserveMonths, 0, 1);
    const capitalProgress = stats.netWorth > 0 ? 1 : 0;
    const planningProgress = stats.budgetCount > 0 ? 1 : 0;
    return Math.round(
      savingsProgress * config.cashflowWeight
      + reserveProgress * config.reserveWeight
      + capitalProgress * config.capitalWeight
      + planningProgress * config.planningWeight
    );
  }

  function getFinancialHealth(stats) {
    const score = calculateFinancialStability(stats);
    const reserveMonths = stats.averageMonthlyExpenses > 0 ? stats.liquidAssets / stats.averageMonthlyExpenses : null;
    const savingsRate = stats.totalIncome > 0 ? stats.yearlyDifference / stats.totalIncome : null;
    const level = score >= 80 ? 5 : score >= 60 ? 4 : score >= 40 ? 3 : score >= 20 ? 2 : 1;
    const savingsStatus = savingsRate === null
      ? { label: overviewT("notAvailable", "Nema podataka"), tone: "neutral" }
      : savingsRate >= 0.2
      ? { label: overviewT("savingsStrong", "Dobar ritam"), tone: "positive" }
      : savingsRate >= 0
      ? { label: overviewT("needsAttention", "Potrebna paznja"), tone: "warning" }
      : { label: overviewT("savingsNegative", "Nema prostora za stednju"), tone: "negative" };
    const pressure = stats.yearlyDifference < 0
      ? { label: overviewT("highExpenses", "Visoki troskovi"), tone: "negative" }
      : reserveMonths !== null && reserveMonths < 1
      ? { label: overviewT("lowReserve", "Niska rezerva"), tone: "warning" }
      : savingsRate !== null && savingsRate < 0.1
      ? { label: overviewT("lowSavings", "Niska stednja"), tone: "warning" }
      : { label: overviewT("stableFlow", "Stabilan tok"), tone: "positive" };
    return { score, reserveMonths, savingsStatus, pressure, level };
  }

  function renderFinancialStatusRow(icon, label, value, tone) {
    return `
      <div class="finance-overview-status-row ${escapeHtml(tone || "neutral")}">
        <span class="finance-overview-status-icon" aria-hidden="true">${renderOverviewIcon(icon)}</span>
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
          <span>${renderOverviewIcon("income")}</span><strong>${escapeHtml(overviewT("income", "Prihod"))}</strong><i class="positive"></i>
        </div>
        <div class="finance-overview-avatar-indicator top-right">
          <span>${renderOverviewIcon("expense")}</span><strong>${escapeHtml(overviewT("expensePlural", "Troskovi"))}</strong><i class="negative"></i>
        </div>
        <div class="finance-overview-avatar-indicator bottom-left">
          <span>${renderOverviewIcon("savings")}</span><strong>${escapeHtml(overviewT("savings", "Stednja"))}</strong><i class="positive"></i>
        </div>
        <div class="finance-overview-avatar-indicator bottom-right">
          <span>${renderOverviewIcon("reserve")}</span><strong>${escapeHtml(overviewT("reserve", "Rezerva"))}</strong><i class="warning"></i>
        </div>
        <div class="finance-overview-avatar-halo" aria-hidden="true"></div>
        <img class="finance-overview-avatar-image" src="${avatarSource}" alt="${escapeHtml(overviewT("avatarAlt", "Finansijski avatar u poslovnom odelu"))}" decoding="async" />
      </div>
    `;
  }

  function renderFinancialProfile(stats) {
    const health = getFinancialHealth(stats);
    const reserveValue = health.reserveMonths === null
      ? overviewT("notAvailable", "Nema podataka")
      : overviewT("reserveMonths", "{{count}} meseca", { count: new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(health.reserveMonths) });
    return `
      <article class="mentor-card finance-overview-profile-panel">
        <div class="finance-overview-profile-avatar-column">
          <h2>${escapeHtml(overviewT("financialProfile", "Finansijski profil"))}</h2>
          ${renderFinancialAvatar(health)}
        </div>
        <div class="finance-overview-state-column">
          <h2>${escapeHtml(overviewT("yourFinancialState", "Tvoje finansijsko stanje"))}</h2>
          <div class="finance-overview-stability-card">
            <span>${escapeHtml(overviewT("financialStability", "Finansijska stabilnost"))}</span>
            <strong>${health.score} <small>/ 100</small></strong>
            <div class="finance-overview-stability-track" role="progressbar" aria-label="${escapeHtml(overviewT("financialStability", "Finansijska stabilnost"))}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${health.score}"><span style="width:${health.score}%"></span></div>
          </div>
          <div class="finance-overview-status-list">
            ${renderFinancialStatusRow("clipboard", overviewT("monthlyBalance", "Mesecni balans"), formatMoney(stats.currentMonthBalance), stats.currentMonthBalance < 0 ? "negative" : "positive")}
            ${renderFinancialStatusRow("capital", overviewT("capital", "Kapital"), formatMoney(stats.netWorth), stats.netWorth < 0 ? "negative" : "neutral")}
            ${renderFinancialStatusRow("reserve", overviewT("reserve", "Rezerva"), reserveValue, health.reserveMonths !== null && health.reserveMonths < 1 ? "warning" : "neutral")}
            ${renderFinancialStatusRow("savings", overviewT("savings", "Stednja"), health.savingsStatus.label, health.savingsStatus.tone)}
            ${renderFinancialStatusRow("warning", overviewT("mainPressure", "Glavni pritisak"), health.pressure.label, health.pressure.tone)}
          </div>
        </div>
      </article>
    `;
  }

  function renderInsightPanel(stats) {
    const hasCashflowData = stats.totalIncome > 0 || stats.totalExpenses > 0;
    const title = !hasCashflowData
      ? overviewT("emptySnapshotTitle", "Pregled ceka prve finansijske podatke.")
      : stats.yearlyDifference < 0
      ? overviewT("expensesAboveIncomeTitle", "Troskovi su trenutno veci od prihoda.")
      : overviewT("incomeCoversExpensesTitle", "Prihodi trenutno pokrivaju troskove.");
    const message = !hasCashflowData
      ? overviewT("emptySnapshotMessage", "Dodaj transakcije ili tokove novca da bi mentor prepoznao najvazniji finansijski signal.")
      : overviewT("primaryPressureMessage", "Najvece opterecenje dolazi iz meseca {{month}} i kategorije {{category}}.", {
        month: stats.highestExpenseMonth,
        category: stats.highestExpenseCategory || overviewT("generalExpenses", "Opsti troskovi")
      });
    return `
      <article class="mentor-card finance-overview-mentor-panel finance-overview-mentor-snapshot">
        <div class="finance-overview-panel-head compact">
          <div class="finance-overview-title-with-icon">
            <span class="finance-overview-icon" aria-hidden="true">${renderOverviewIcon("sparkles")}</span>
            <h2>${escapeHtml(overviewT("mentorInsight", "Mentor uvid"))}</h2>
          </div>
        </div>
        <div class="finance-overview-mentor-visual" aria-hidden="true">${renderOverviewIcon(stats.yearlyDifference < 0 ? "expense" : "income")}</div>
        <div class="finance-overview-mentor-copy">
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(message)}</p>
        </div>
        <button class="btn finance-overview-mentor-cta" type="button" data-open-finance-tab="income">
          <span>${escapeHtml(overviewT("viewCashflow", "Pogledaj tokove novca"))}</span><span aria-hidden="true">›</span>
        </button>
      </article>
    `;
  }

  function renderSupportGrid(stats) {
    return `
      <article class="mentor-card finance-overview-budget-panel">
        <div class="finance-overview-panel-head compact">
          <h2>${escapeHtml(overviewT("budgetTitle", "Budzet"))}</h2>
          <p>${escapeHtml(overviewT("budgetSubtitle", "Planirani limiti i mesecna kontrola."))}</p>
        </div>
        <div class="finance-overview-progress-list">
          <div class="finance-overview-progress-item">
            <div><strong>${escapeHtml(overviewT("setBudget", "Postavi budzet"))}</strong><span>${escapeHtml(String(stats.budgetCount))}</span></div>
            <div class="finance-overview-progress-track"><span style="width:${Math.min(100, stats.budgetCount * 18)}%"></span></div>
          </div>
        </div>
        <div class="finance-overview-panel-footer">
          <strong>${escapeHtml(formatMoney(stats.budgetLimit))}</strong>
          <span>${escapeHtml(overviewT("totalPlanned", "ukupno planirano"))}</span>
        </div>
      </article>
      <article class="mentor-card finance-overview-capital-panel">
        <div class="finance-overview-panel-head compact">
          <h2>${escapeHtml(overviewT("capitalDirectionTitle", "Kapital i pravac godine"))}</h2>
          <p>${escapeHtml(overviewT("capitalDirectionSubtitle", "Trenutna slika imovine i finansijskog pravca."))}</p>
        </div>
        <div class="finance-overview-capital-list">
          <span>${escapeHtml(overviewT("totalCapital", "Ukupan kapital"))}: <strong>${escapeHtml(formatMoney(stats.totalAssets))}</strong></span>
          <span>${escapeHtml(overviewT("debts", "Dugovi"))}: <strong>${escapeHtml(formatMoney(stats.totalDebts))}</strong></span>
          <span>${escapeHtml(overviewT("netWorth", "Neto stanje"))}: <strong>${escapeHtml(formatMoney(stats.netWorth))}</strong></span>
        </div>
      </article>
    `;
  }

  function renderFinanceDashboard() {
    const root = document.getElementById("financeOverviewRoot");
    if (!root) return;
    lastRenderedLanguage = currentLanguageKey();

    const state = financeState();
    const assets = assetState();
    const stats = calculateStats(state, assets);
    const summaryCards = [
      {
        title: overviewT("income", "Prihod"),
        value: formatMoney(stats.totalIncome),
        icon: "income",
        tone: "income"
      },
      {
        title: overviewT("expensePlural", "Troskovi"),
        value: formatMoney(stats.totalExpenses),
        icon: "expense",
        tone: "expense"
      },
      {
        title: overviewT("capital", "Kapital"),
        value: formatMoney(stats.netWorth),
        icon: "capital",
        tone: "capital"
      },
      {
        title: overviewT("balance", "Balans"),
        value: formatMoney(stats.yearlyDifference),
        icon: "balance",
        tone: stats.yearlyDifference < 0 ? "balance negative" : "balance positive"
      }
    ];

    root.innerHTML = `
      <header class="finance-overview-hero">
        <div>
          <h1>${escapeHtml(financeT("overview.pageTitle", "Finansijski pregled"))}</h1>
          <p>${escapeHtml(overviewT("snapshotSubtitle", "Brz i jasan pregled tvog trenutnog finansijskog stanja."))}</p>
        </div>
        <div class="finance-overview-top-controls">
          <label class="finance-overview-year-select">
            <span>${escapeHtml(financeT("overview.year", "Godina"))}</span>
            <select aria-label="${escapeHtml(financeT("overview.chooseYear", "Izaberi godinu"))}" data-finance-dashboard-year>
              ${stats.years.map((year) => `<option value="${year}" ${year === stats.year ? "selected" : ""}>${year}</option>`).join("")}
            </select>
          </label>
        </div>
      </header>
      <section class="finance-overview-summary-grid">
        ${summaryCards.map(renderSummaryCard).join("")}
      </section>
      <section class="finance-overview-main-grid">
        ${renderFinancialProfile(stats)}
        ${renderInsightPanel(stats)}
      </section>
    `;

    root.querySelector("[data-finance-dashboard-year]")?.addEventListener("change", (event) => {
      selectedYear = Number(event.target.value) || new Date().getFullYear();
      renderFinanceDashboard();
    });
    root.querySelector("[data-open-finance-tab]")?.addEventListener("click", (event) => {
      const tabName = event.currentTarget.dataset.openFinanceTab || "income";
      window.__mentorPendingFinanceTab = tabName;
      if (typeof window.setFinanceTab === "function") {
        window.setFinanceTab(tabName);
        return;
      }
      setFinanceTabUi(tabName);
      startFullFinanceLoad();
    });
  }

  function setFinanceTabUi(tabName) {
    const nextTab = tabName || "dashboard";
    document.querySelectorAll("[data-finance-tab]").forEach((tab) => {
      const active = tab.dataset.financeTab === nextTab;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll("[data-finance-panel]").forEach((panel) => {
      panel.classList.toggle("hidden", panel.dataset.financePanel !== nextTab);
    });
  }

  function bindFinanceTabs() {
    document.querySelectorAll("[data-finance-tab]").forEach((tab) => {
      if (tab.dataset.dashboardBound === "true") return;
      tab.dataset.dashboardBound = "true";
      tab.addEventListener("click", () => {
        if (window.MentorLazy?.isFeatureLoaded?.("finance")) return;
        const tabName = tab.dataset.financeTab || "dashboard";
        window.__mentorPendingFinanceTab = tabName;
        if (tabName === "dashboard" && !window.MentorLazy?.isFeatureLoaded?.("finance")) {
          setFinanceTabUi("dashboard");
          if (!dashboardInitialized) renderFinanceDashboard();
          startFullFinanceLoad();
          return;
        }
        setFinanceTabUi(tabName);
        window.setFinanceTab?.(tabName);
      });
    });
  }

  function renderFinanceDashboardLanguage() {
    document.querySelector(".finance-folder-tabs")?.setAttribute("aria-label", financeT("aria.tabs", "Finansijski mini tabovi"));
    document.querySelectorAll("[data-finance-tab]").forEach((tab) => {
      const label = Array.from(tab.children).find((child) => child.tagName === "SPAN" && child.getAttribute("aria-hidden") !== "true");
      const tabName = tab.dataset.financeTab;
      if (label) label.textContent = financeT("tabs." + tabName, label.textContent || tabName);
    });
  }

  function startFullFinanceLoad() {
    if (fullFinanceLoadStarted || window.MentorLazy?.isFeatureLoaded?.("finance")) {
      document.body.dataset.financeModuleStatus = FINANCE_MODULE_STATUS.ready;
      return Promise.resolve();
    }

    fullFinanceLoadStarted = true;
    document.body.dataset.financeModuleStatus = FINANCE_MODULE_STATUS.loading;
    return window.MentorLazy?.loadFeature?.("finance")?.then(() => {
      document.body.dataset.financeModuleStatus = FINANCE_MODULE_STATUS.ready;
      if (document.body.dataset.activeView !== "finance") return;
      const pendingTab = window.__mentorPendingFinanceTab || "dashboard";
      if (pendingTab !== "dashboard" && typeof window.setFinanceTab === "function") {
        window.setFinanceTab(pendingTab, { force: true });
        return;
      }
      if (!fullDashboardRendered) {
        window.Finance?.renderActiveFinanceTab?.({ translate: true, skipLiveRefresh: true, updateOverflow: true });
        fullDashboardRendered = true;
      }
    }).catch((error) => {
      fullFinanceLoadStarted = false;
      document.body.dataset.financeModuleStatus = "error";
      console.error(error);
    }) || Promise.resolve();
  }

  function activateFinanceDashboard() {
    const requestedTab = window.__mentorPendingFinanceTab || "dashboard";
    const fullFinanceReady = window.MentorLazy?.isFeatureLoaded?.("finance");

    document.body.dataset.financeModuleStatus = fullFinanceReady
      ? FINANCE_MODULE_STATUS.ready
      : (fullFinanceLoadStarted ? FINANCE_MODULE_STATUS.loading : FINANCE_MODULE_STATUS.idle);

    if (!fullFinanceReady || requestedTab === "dashboard") {
      setFinanceTabUi("dashboard");
    }

    renderFinanceDashboardLanguage();
    bindFinanceTabs();

    if (!dashboardInitialized || lastRenderedLanguage !== currentLanguageKey()) {
      renderFinanceDashboard();
      dashboardInitialized = true;
    }

    if (requestedTab !== "dashboard" && fullFinanceReady && typeof window.setFinanceTab === "function") {
      window.setFinanceTab(requestedTab);
      return;
    }

    if (requestedTab === "dashboard" && fullFinanceReady && !fullDashboardRendered) {
      window.Finance?.renderActiveFinanceTab?.({ translate: true, skipLiveRefresh: true, updateOverflow: true });
      fullDashboardRendered = true;
      return;
    }

    startFullFinanceLoad();
  }

  window.FinanceDashboard = {
    activateFinanceDashboard,
    renderFinanceDashboard,
    renderFinanceDashboardLanguage,
    isInitialized: () => dashboardInitialized
  };
})();
