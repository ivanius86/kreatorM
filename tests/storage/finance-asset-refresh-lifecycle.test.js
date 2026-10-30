const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function section(file, start, end) {
  const source = fs.readFileSync(path.join(__dirname, "../..", file), "utf8");
  const from = source.indexOf(start), to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `${file}: lifecycle section exists`);
  return source.slice(from, to);
}

function classes(initial = []) {
  const values = new Set(initial);
  return {
    contains: (name) => values.has(name),
    toggle(name, enabled) { if (enabled) values.add(name); else values.delete(name); }
  };
}

test("finance asset interval stops on tab change and on leaving the finance view", async () => {
  const financeView = { classList: classes() };
  const assetPanel = { dataset: { financePanel: "assets" }, classList: classes(["hidden"]) };
  const dashboardPanel = { dataset: { financePanel: "dashboard" }, classList: classes() };
  const tabs = ["dashboard", "assets"].map((name) => ({
    dataset: { financeTab: name }, classList: classes(name === "dashboard" ? ["active"] : []),
    setAttribute() {}
  }));
  const handles = new Set();
  let nextHandle = 1;
  const body = { dataset: { activeView: "finance" } };
  const win = {
    setInterval(callback) { const handle = nextHandle++; handles.add(handle); return handle; },
    clearInterval(handle) { handles.delete(handle); },
    clearTimeout() {}, setTimeout() {}, scrollBy() {}
  };
  const document = {
    body,
    getElementById(id) { return id === "financeView" ? financeView : id === "financeAssetsPanel" ? assetPanel : null; },
    querySelector() { return null; }
  };
  const context = vm.createContext({
    window: win, document, financeTabs: tabs, financePanels: [dashboardPanel, assetPanel],
    scheduledFinanceTabRender: null, scheduleActiveFinanceTabRender() {},
    appViews: { finance: financeView, dashboard: { classList: classes(["hidden"]) } },
    builderTab: { classList: classes(), setAttribute() {} },
    plannerTab: { classList: classes(), setAttribute() {} },
    sidebarItems: [], updateSidebarSymbolForView() {}, activateLazyView: () => Promise.resolve(),
    requestAnimationFrame() {}, refreshLiveAssets() {}
  });
  vm.runInContext("let assetRefreshTimer = null; const ASSET_REFRESH_MS = 300000;", context);
  vm.runInContext(section("finansije.js", "function isFinanceViewVisible()", "function ensureFinanceTabInitialized("), context);
  vm.runInContext(section("finansije.js", "function setFinanceTab(", "function openTransactionModal("), context);
  vm.runInContext("window.Finance = { deactivateAssetRefresh: stopAssetRefreshTimer, activateAssetRefresh: syncAssetRefreshTimer };", context);
  vm.runInContext(section("script.js", "async function setView(", "function svgToMaskUrl("), context);

  context.setFinanceTab("assets");
  assert.equal(handles.size, 1);
  context.setFinanceTab("dashboard");
  assert.equal(handles.size, 0);
  context.setFinanceTab("assets");
  assert.equal(handles.size, 1);
  await context.setView("dashboard");
  assert.equal(handles.size, 0);
  assert.equal(body.dataset.activeView, "dashboard");
});
