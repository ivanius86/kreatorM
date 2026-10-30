(function (root) {
  "use strict";
  const panel = document.getElementById("mentorFloatingRoot");
  const chatPanel = document.getElementById("mentorChatPanel");
  const historyPanel = document.querySelector("[data-panel='mentor-history']");
  const input = document.getElementById("mentorMessageInput");
  const sendButton = document.getElementById("mentorSendButton");
  const cancelButton = document.getElementById("mentorCancelButton");
  const history = document.getElementById("mentorConversationSelect");
  const goals = document.getElementById("mentorGoalContext");
  const messageList = document.getElementById("mentorMessages");
  const status = document.getElementById("mentorRequestStatus");
  const setup = document.getElementById("mentorSetupStatus");
  const clarification = document.getElementById("mentorClarificationPanel");
  const clarificationContent = document.getElementById("mentorClarificationContent");
  const overviewToggle = document.getElementById("mentorOverviewToggle");
  const historySurface = document.querySelector(".mentor-history-surface");
  const historyResizeGrip = document.getElementById("mentorHistoryResize");
  const overviewResizeGrip = document.getElementById("mentorOverviewResize");
  const protocol = root.MentorChatProtocol;
  const proposals = root.MentorGoalProposals;
  const state = { repository: null, activeId: null, conversation: null, rows: [], conversations: [], run: null, ready: false, error: null, setupNeeded: false, refreshId: 0, drafts: new Map(), proposalBusy: new Set(), navigationBusy: false, choiceBusy: false, focusClarification: false, overviewCollapsed: false };
  const pendingReplies = new Map();
  let lastDiagnostic = null;
  let leaseTimer;
  const t = (key, params) => root.MentorI18n.t("mentor." + key, params);
  const language = () => root.MentorI18n.getLanguage();
  const ownerId = () => "owner-" + (root.crypto?.randomUUID?.() || Date.now() + "-" + Math.random().toString(36).slice(2));
  function safeCode(error, fallback = "STORAGE") {
    return error?.code && root.MentorI18n.hasTranslation("mentor.errors." + error.code) ? error.code : fallback;
  }
  function errorLocation(error) {
    for (const match of String(error?.stack || "").matchAll(/https?:\/\/[^\s)]+\.js(?:\?[^\s)]*)?:\d+:\d+/g)) {
      const position = match[0].match(/:(\d+):(\d+)$/);
      if (!position) continue;
      try {
        const source = new URL(match[0].slice(0, position.index));
        const path = source.pathname.replace(/^\//, "");
        if (source.origin === root.location.origin && /^(?:js\/)?[a-zA-Z0-9_./-]+\.js$/.test(path)) return path + ":" + position[1] + ":" + position[2];
      } catch (_) { /* Only a same-origin script location is retained. */ }
    }
    return "";
  }
  function reportFailure(error, stage) {
    const names = [error?.name, error?.inner?.name, error?.cause?.name];
    let code;
    if (names.includes("QuotaExceededError")) code = "STORAGE_QUOTA";
    else if (names.some(name => ["SecurityError", "InvalidStateError", "DatabaseClosedError", "MissingAPIError"].includes(name))) code = "STORAGE_BLOCKED";
    else {
      const fallback = ["conversation-reserve", "request-storage", "response-storage", "conversation-release"].includes(stage) ? "STORAGE" : stage === "nutrition-context" ? "MODULE_LOAD" : stage === "request-validation" ? "INVALID_REQUEST" : stage === "response-validation" ? "INVALID_RESPONSE" : ["provider-request", "intelligence-router"].includes(stage) ? "NETWORK" : stage === "response-render" ? "RENDER" : "CLIENT_ERROR";
      code = safeCode(error, fallback);
    }
    const allowedNames = ["Error", "TypeError", "RangeError", "ReferenceError", "SyntaxError", "QuotaExceededError", "SecurityError", "InvalidStateError", "DatabaseClosedError", "UnknownError", "AbortError", "DataCloneError", "TransactionInactiveError", "MentorDataError", "DexieError"];
    const location = errorLocation(error);
    const diagnostic = {stage,code,name:allowedNames.includes(error?.name) ? error.name : "Error",...(location ? {location} : {})};
    if (JSON.stringify(diagnostic) !== JSON.stringify(lastDiagnostic)) {
      root.console?.warn?.("Mentor client diagnostic", diagnostic);
      fetch("/api/mentor/client-diagnostic", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(diagnostic)}).catch(() => {});
    }
    lastDiagnostic = diagnostic;
    return code;
  }
  function locked() { return Boolean(state.conversation?.lease?.expiresAt > Date.now()); }
  const view = root.MentorChatView.create({
    state,
    refs: { panel, chatPanel, historyPanel, input, sendButton, cancelButton, history, goals, messageList, status, setup, clarification, clarificationContent, overviewToggle, historySurface, historyResizeGrip, overviewResizeGrip },
    protocol, proposals, safeCode, reportFailure,
    getLastDiagnostic: () => lastDiagnostic,
    locked, language
  });
  const { renderControls, renderLabels, renderHistory, renderGoals, renderMessages } = view;
  async function refresh() {
    if (!state.ready) return;
    const refreshId = ++state.refreshId;
    const activeId = state.activeId;
    const [conversations, conversation, rows] = await Promise.all([state.repository.list(), state.repository.get(activeId), state.repository.messages(activeId)]);
    if (refreshId !== state.refreshId || activeId !== state.activeId) return;
    if (!conversation) {
      if (state.run?.conversationId === activeId) { state.run.controller.abort(); state.run = null; }
      const next = conversations[0] || await state.repository.create();
      if (refreshId !== state.refreshId || activeId !== state.activeId) return;
      state.activeId = next.id;
      goals.value = "";
      state.error = "CONVERSATION_DELETED";
      return refresh();
    }
    // Restored food previews depend on the same definitions and translations
    // as Nutrition; hydrate them before the first render after a page reload.
    if (conversation.activeTask?.capabilityId === "nutrition.food.create" && conversation.activeTask.snapshot) {
      await root.MentorLazy.loadFeature("nutrition");
      if (refreshId !== state.refreshId || activeId !== state.activeId) return;
    }
    state.conversations = conversations;
    state.conversation = conversation;
    state.rows = rows;
    renderHistory(); renderGoals(); renderMessages(); renderControls();
    clearTimeout(leaseTimer);
    if (locked() && !state.run) leaseTimer = setTimeout(() => refresh().catch(showStorageError), Math.max(1, conversation.lease.expiresAt - Date.now() + 20));
  }
  function showStorageError(error, stage = "interface") { state.error = reportFailure(error, stage); renderControls(); }
  async function cancelActive() {
    const run = state.run;
    if (!run) return;
    state.run = null;
    run.controller.abort();
    if (run.userId) await state.repository.release(run.conversationId, run.userId, run.owner, "CANCELLED");
    state.error = null;
    await refresh();
  }
  async function switchConversation(conversationId) {
    if (!state.ready) return;
    state.navigationBusy = true; renderControls();
    try {
      state.drafts.set(state.activeId, input.value);
      await cancelActive();
      state.activeId = conversationId;
      input.value = state.drafts.get(conversationId) || "";
      goals.value = "";
      state.error = null;
      messageList.scrollTop = messageList.scrollHeight;
      await refresh();
    } finally { state.navigationBusy = false; renderControls(); }
  }
  function staleChoice() { const error = new Error("STALE_REQUEST"); error.code = "STALE_REQUEST"; throw error; }
  async function choiceRequest(conversationId, binding, text) {
    const [conversation, rows] = await Promise.all([state.repository.get(conversationId), state.repository.messages(conversationId)]);
    if (state.activeId !== conversationId || !conversation) staleChoice();
    const latest = rows.filter(row => row.role === "assistant").at(-1);
    if (latest?.id !== binding.messageId) staleChoice();
    let choices, decision;
    if (binding.kind === "write") {
      const task = conversation.activeTask;
      const questionId = task?.pendingCorrectionText ? "correction" : task?.pendingItemId || "single";
      if (!task || task.id !== binding.taskId || task.version !== binding.taskVersion || task.status !== "collecting" || latest.writeTask?.id !== task.id || questionId !== binding.questionId) staleChoice();
      choices = root.MentorCapabilityRegistry.get(task.capabilityId)?.pendingChoices?.(task) || root.MentorNutritionInventoryResolver.pendingChoices(task) || [];
      const capability = root.MentorCapabilityRegistry.get(task.capabilityId);
      if (!capability) staleChoice();
      decision = { mode: "write", capability, input: { text }, prior: task };
    } else if (binding.kind === "read") {
      if (latest.readTask?.capabilityId !== binding.capabilityId) staleChoice();
      choices = latest.readTask.candidates;
      decision = root.MentorIntelligenceRouter.continueRead(latest.readTask, text);
      if (!decision || decision.mode !== "local") staleChoice();
    } else staleChoice();
    const index = choices.findIndex((item, index) => (item.value || `${index + 1}. ${item.name}`) === text);
    if (index < 0) staleChoice();
    return { text, displayText: `${index + 1}. ${choices[index].name}`, decision, binding: { ...binding, value: text }, conversationId };
  }
  async function send(retryId = null, selection = null, options = {}) {
    if (!state.ready || state.run || state.proposalBusy.size > 0 || state.navigationBusy || state.choiceBusy || locked()) return;
    if (selection && selection.conversationId !== state.activeId) return;
    const text = selection?.displayText || options.text || input.value.trim();
    if (!retryId && !text) return;
    const run = { conversationId: state.activeId, owner: ownerId(), userId: null, controller: new AbortController(), stage:"conversation-reserve" };
    const requestLanguage = language();
    const originalInput = input.value;
    state.run = run; state.error = null; renderControls();
    let timeout;
    let timedOut = false;
    try {
      run.stage = "intelligence-router";
      const retryTurn = retryId ? await state.repository.getMessage(retryId) : null;
      if (retryTurn?.localChoice && !["recipe-food", "recipe-resume"].includes(retryTurn.localChoice.kind)) selection = await choiceRequest(run.conversationId, retryTurn.localChoice, retryTurn.localChoice.value || retryTurn.text);
      if (retryTurn?.localChoice?.resumeRecipe && !options.resumeRecipe) options.resumeRecipe = retryTurn.localChoice.resumeRecipe;
      if (retryTurn?.localChoice?.recipeRecovery && !options.recipeRecovery) options.recipeRecovery = retryTurn.localChoice.recipeRecovery;
      const routeText = retryTurn?.text || text;
      const activeTask = state.conversation?.activeTask;
      const explicitMatches = root.MentorCapabilityRegistry.matches(routeText);
      const newIntent = explicitMatches.some(item => item.capability.type === "read" || item.capability.type === "write");
      const lastAssistant = state.rows.filter(row => row.role === "assistant").at(-1);
      const followUp = !newIntent && !/\b(cilj\w*|goal\w*|idej\w*|idea\w*|recep(?:t\w*|at\w*)|recipe\w*|obrok\w*|meal\w*|doruc\w*|ruc\w*|vecer\w*|uzin\w*|palacink\w*)\b/i.test(routeText.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
      const readContinuation = followUp ? root.MentorIntelligenceRouter.continueRead(lastAssistant?.readTask, routeText) : null;
      const activeCapability = activeTask && root.MentorCapabilityRegistry.get(activeTask.capabilityId);
      const writeContinuation = activeCapability?.canContinue ? activeCapability.canContinue(activeTask, routeText) : root.MentorNutritionInventoryResolver?.canContinue?.(activeTask, routeText);
      let decision = selection?.decision || readContinuation || (activeTask && ["collecting", "proposed"].includes(activeTask.status) && (writeContinuation && (!newIntent || activeTask.capabilityId !== "nutrition.food.create") || (!activeTask.items && followUp))
        ? { mode: "write", capability: root.MentorCapabilityRegistry.get(activeTask.capabilityId), input: { text: routeText }, prior: activeTask }
        : await root.MentorIntelligenceRouter.decide(routeText, {
        signal: run.controller.signal,
        followUpInventory: lastAssistant?.capabilityId ? lastAssistant.capabilityId.startsWith("nutrition.inventory.") : lastAssistant?.contextPolicy === "local-only",
        authorizeCloud: () => root.confirm(t("nutritionRead.cloudRoutingPermission"))
      }));
      if (retryTurn?.contextPolicy === "local-only" && decision.mode === "chat") decision = { mode: "clarify", reason: "ambiguous" };
      if (state.run !== run || run.controller.signal.aborted || state.activeId !== run.conversationId || language() !== requestLanguage) return;
      run.stage = "conversation-reserve";
      const turn = await state.repository.reserve(run.conversationId, run.owner, retryId
        ? { retryId, localChoice: selection?.binding || retryTurn?.localChoice || null }
        : { text, goalContext: selection || options.text ? null : proposals.readGoalContext(goals.value), localOnly: decision.mode !== "chat", localChoice: selection?.binding || options.recipeBinding || null });
      run.userId = turn.id;
      if (state.run !== run || run.controller.signal.aborted) {
        await state.repository.release(run.conversationId, turn.id, run.owner, "CANCELLED");
        return;
      }
      if (!retryId && !selection && !options.text && input.value === originalInput) input.value = "";
      run.stage = "conversation-refresh";
      await refresh();
      if (state.run !== run || run.controller.signal.aborted || state.activeId !== run.conversationId || language() !== requestLanguage) return;
      const cached = pendingReplies.get(turn.id);
      if (cached?.language === requestLanguage) {
        run.stage = "response-storage";
        await state.repository.complete(run.conversationId, turn.id, run.owner, cached.response);
        pendingReplies.delete(turn.id);
        return;
      }
      if (decision.mode === "write") {
        run.stage = "nutrition-context";
        let reply, task = null;
        // A freshly validated choice explicitly continues the same local scope;
        // it never grants permission to execute the resulting inventory proposal.
        if (!selection && !root.confirm(t(decision.capability.permissionKey || "writeInventory.readPermission"))) reply = t("writeInventory.readDenied");
        else {
          const prepared = await root.MentorWritePipeline.prepare(selection?.text || turn.text, decision.prior || null, decision.capability.id, { signal: run.controller.signal });
          if (state.run !== run || run.controller.signal.aborted || state.activeId !== run.conversationId || language() !== requestLanguage) return;
          reply = prepared.reply;
          if (prepared.task && options.resumeRecipe) prepared.task.resumeRecipe = options.resumeRecipe;
          task = await state.repository.setActiveTask(run.conversationId, prepared.task, decision.prior?.version ?? activeTask?.version ?? null);
        }
        if (state.run !== run || run.controller.signal.aborted || state.activeId !== run.conversationId) return;
        run.stage = "response-storage";
        await state.repository.complete(run.conversationId, turn.id, run.owner, { reply, proposal: null }, { localOnly: true, writeTask: task });
        return;
      }
      if (decision.mode === "local" || decision.mode === "clarify") {
        run.stage = "nutrition-context";
        let reply, readTask = decision.readTask || null;
        if (decision.mode === "clarify") reply = decision.reason === "chooseFood" ? t("nutritionRead.chooseFood", { options: decision.readTask.candidates.map((item, index) => `${index + 1}. ${item.name}`).join("; ") }) : t("nutritionRead." + decision.reason);
        else {
          try {
            const result = await root.MentorCapabilityRegistry.execute(decision.capability.id, decision.input, {
              signal: run.controller.signal,
              authorize: capability => (selection?.binding.kind === "read" && selection.binding.capabilityId === capability.id) || root.confirm(t("nutritionRead.localPermission", { scope: t("nutritionRead.scope." + capability.id.split(".")[1]) }))
            });
            reply = decision.capability.format(result, requestLanguage);
            if (["nutrition.inventory.getAvailability", "nutrition.food.getProfile"].includes(decision.capability.id) && result.status === "ambiguous_food" && result.total <= result.rows.length) readTask = { capabilityId: decision.capability.id, input: decision.input, candidates: result.rows };
          } catch (error) {
            if (error?.code !== "CAPABILITY_PERMISSION_DENIED") throw error;
            reply = t("nutritionRead.localDenied");
          }
        }
        if (state.run !== run || run.controller.signal.aborted || state.activeId !== run.conversationId) return;
        run.stage = "response-storage";
        await state.repository.complete(run.conversationId, turn.id, run.owner, { reply, proposal: null }, { localOnly: true, capabilityId: decision.mode === "local" ? decision.capability.id : null, readTask });
        return;
      }
      run.stage = "nutrition-context";
      const cloudRows = root.MentorActionAdapters.cloudRows(state.rows);
      const recipeContext = turn.requestSnapshot?.recipeContext || await root.MentorActionAdapters.prepareContext(turn.text, cloudRows);
      const foodContext = turn.requestSnapshot?.foodContext || await root.MentorActionAdapters.prepareFoodContext(turn.text, () => root.confirm(t("foodCatalogShare")));
      const previousAssistant = cloudRows.filter(row => row.role === "assistant" && row.sequence < turn.sequence).at(-1);
      const planningDate = protocol.localDateISO();
      run.stage = "request-context";
      const context = await state.repository.context(run.conversationId, turn.id, true);
      const conversationRows = root.MentorActionAdapters.cloudRows(await state.repository.messages(run.conversationId));
      run.stage = "request-validation";
      const proposedRequest = protocol.validateRequest({ requestId: turn.id + "-" + requestLanguage + "-mealfix3", language: requestLanguage, messages: context, goalContext: turn.goalContext || null, actionHistory: root.MentorActionAdapters.history(cloudRows), recipeContext, foodContext, recipeRecovery: options.recipeRecovery || turn.requestSnapshot?.recipeRecovery || null, conversationConstraints: protocol.conversationConstraints(conversationRows), planningDate, mealPlanDraft: previousAssistant?.mealPlanDraft || null, mealPlanContext: root.MentorActionAdapters.mealPlanContext(turn.text, cloudRows), previousPlan: root.MentorActionAdapters.lastSavedPlan(cloudRows) });
      run.stage = "request-storage";
      const snapshot = await state.repository.setRequestSnapshot(turn.id, proposedRequest);
      const request = { ...snapshot, requestId: proposedRequest.requestId, language: requestLanguage };
      if (state.run !== run || run.controller.signal.aborted) return;
      // A retry retains its persisted message ID and context snapshot.
      timeout = setTimeout(() => { timedOut = true; run.controller.abort(); }, 90000);
      run.stage = "provider-request";
      const result = await root.MentorChatClient.chat(request, run.controller.signal);
      if (state.run !== run || run.controller.signal.aborted || state.activeId !== run.conversationId || language() !== requestLanguage) return;
      run.stage = "response-validation";
      const validated = protocol.validateResponse(result);
      pendingReplies.set(turn.id, {language:requestLanguage,response:validated});
      if (pendingReplies.size > 3) pendingReplies.delete(pendingReplies.keys().next().value);
      run.stage = "response-storage";
      await state.repository.complete(run.conversationId, turn.id, run.owner, validated);
      pendingReplies.delete(turn.id);
    } catch (error) {
      const code = timedOut ? "TIMEOUT" : run.controller.signal.aborted ? "CANCELLED" : reportFailure(error, run.stage);
      if (run.userId) {
        try { await state.repository.release(run.conversationId, run.userId, run.owner, code); }
        catch (releaseError) { const primary = lastDiagnostic; reportFailure(releaseError, "conversation-release"); lastDiagnostic = primary; }
      }
      if (state.run === run) state.error = code;
    } finally {
      clearTimeout(timeout);
      if (state.run === run) { state.run = null; await refresh().catch(error => showStorageError(error, "response-render")); }
    }
  }
  function showMode(mode) {
    if (mode === "manual") return root.setView("builder");
    view.setOpen(true);
    if (state.ready) renderGoals();
  }
  async function handleAction(action, messageId, actionId, taskId, choiceValue, taskVersion, choiceData = {}) {
    if (["research-recipe-food", "substitute-recipe-food", "resume-recipe"].includes(action)) {
      if (state.run || state.navigationBusy || state.choiceBusy || state.proposalBusy.size || locked()) return;
      const conversationId = state.activeId;
      const [conversation, rows] = await Promise.all([state.repository.get(conversationId), state.repository.messages(conversationId)]);
      if (state.activeId !== conversationId || !conversation || conversation.activeTask?.status === "executing") staleChoice();
      if (action === "resume-recipe") {
        const task = conversation.activeTask;
        if (!task || task.id !== taskId || task.version !== Number(taskVersion) || task.status !== "succeeded" || !task.resumeRecipe || rows.filter(row => row.role === "assistant").at(-1)?.id !== messageId) staleChoice();
        const recipeRecovery = { originalText: task.resumeRecipe.originalCommand, missingName: task.resumeRecipe.missingName || "", selectedName: task.result.name };
        await send(null, null, { text: t("actions.resumeRecipeCommand", { recipe: task.resumeRecipe.name, food: task.result.name }), recipeRecovery, recipeBinding: { kind: "recipe-resume", messageId, taskId: task.id, taskVersion: task.version, recipeRecovery } }); return;
      }
      const message = rows.find(row => row.id === messageId), recipe = message?.proposals?.find(item => item.id === actionId && item.action === "createRecipe");
      const index = Number(choiceData.requestIndex), request = Number.isInteger(index) && recipe?.resolutionRequests?.[index];
      if (!request || request.kind !== "missing" || rows.filter(row => row.role === "user").at(-1)?.id !== message.replyTo || ["approved", "dismissed", "executing"].includes(message.actionStates?.[recipe.id]?.status)) staleChoice();
      if (action === "research-recipe-food") {
        const original = rows.find(row => row.id === message.replyTo);
        const resumeRecipe = { name: recipe.name, originalCommand: original.requestSnapshot?.recipeRecovery?.originalText || original.text, missingName: request.name, sourceMessageId: message.id, actionId: recipe.id };
        await send(null, null, { text: t("actions.researchFoodCommand", { name: request.name }), resumeRecipe, recipeBinding: { kind: "recipe-food", messageId, actionId, requestIndex: index, resumeRecipe } });
      } else {
        const candidate = request.candidates.find(item => item.id === choiceData.foodId); if (!candidate) staleChoice();
        const original = rows.find(row => row.id === message.replyTo);
        const recipeRecovery = { originalText: original.requestSnapshot?.recipeRecovery?.originalText || original.text, missingName: request.name, selectedName: candidate.name };
        await send(null, null, { text: t("actions.substituteFoodCommand", { recipe: recipe.name, missing: request.name, replacement: candidate.name }), recipeRecovery, recipeBinding: { kind: "recipe-food", messageId, actionId, requestIndex: index, foodId: candidate.id, recipeRecovery } });
      }
      return;
    }
    if (action === "toggle-chat") {
      if (panel.dataset.open === "true" && panel.dataset.historyMinimized === "true") view.setHistoryMinimized(false);
      else if (panel.dataset.open === "true") view.setOpen(false);
      else showMode("chat");
      return;
    }
    if (action === "minimize") { view.setHistoryMinimized(true); return; }
    if (action === "show-chat") { showMode("chat"); return; }
    if (action === "show-manual") { await showMode("manual"); return; }
    if (!state.ready) return;
    if (action === "toggle-overview") { state.overviewCollapsed = !state.overviewCollapsed; renderMessages(); return; }
    if (action === "fill-choice") {
      if (state.run || state.choiceBusy || state.navigationBusy || state.proposalBusy.size || locked()) return;
      const conversationId = state.activeId;
      const choiceLanguage = language();
      state.choiceBusy = true; renderControls();
      let selection;
      try {
        selection = await choiceRequest(conversationId, {
          kind: choiceData.mentorChoiceKind, messageId,
          taskId, taskVersion: Number(taskVersion), questionId: choiceData.mentorQuestionId,
          capabilityId: choiceData.mentorReadCapability
        }, choiceValue);
      } catch (error) {
        if (state.activeId === conversationId && language() === choiceLanguage) throw error;
      } finally { state.choiceBusy = false; renderControls(); }
      if (!selection || state.activeId !== conversationId || language() !== choiceLanguage) return;
      state.focusClarification = true;
      await send(null, selection);
      return;
    }
    if (action === "retry-view") { state.error = null; await refresh(); return; }
    if (action === "cancel") { await cancelActive(); return; }
    if (action === "retry") { await send(messageId); return; }
    if (action === "open-goals") { await root.setView("planner"); return; }
    if (["approve-write", "dismiss-write"].includes(action)) {
      if (!taskId || state.run || state.proposalBusy.has(taskId)) return;
      state.proposalBusy.add(taskId); state.error = null; renderMessages(); renderControls();
      try {
        if (action === "approve-write") await root.MentorWritePipeline.confirm(state.repository, state.activeId, taskId, Number(taskVersion));
        else await root.MentorWritePipeline.dismiss(state.repository, state.activeId, taskId, Number(taskVersion));
      } catch (error) { state.error = safeCode(error, "INVENTORY_WRITE_FAILED"); }
      finally { state.proposalBusy.delete(taskId); await refresh(); }
      return;
    }
    if (["approve-action", "dismiss-action", "approve-actions", "open-action"].includes(action)) {
      if (state.run || state.proposalBusy.has(actionId) || state.proposalBusy.has(messageId)) return;
      const message = await state.repository.getMessage(messageId);
      if (!message?.proposals?.length) return;
      if (action === "open-action") {
        const target = message.proposals.find(item => item.id === actionId);
        if (target) await root.MentorActionAdapters.open(target, message);
        return;
      }
      const key = action === "approve-actions" ? messageId : actionId;
      state.proposalBusy.add(key); state.error = null; renderMessages(); renderControls();
      try {
        if (action === "approve-actions") {
          await root.MentorActionAdapters.checkPlan(message);
          const ordered = message.proposals.slice().sort((a, b) => Number(a.action === "createMealPlanEntry") - Number(b.action === "createMealPlanEntry"));
          let saved = 0;
          for (const item of ordered) {
            try { const result = await root.MentorActionAdapters.execute(state.repository, messageId, item.id, "approve"); if (result.status === "approved") saved++; }
            catch (error) { state.error = safeCode(error, "ACTION_SAVE"); }
            if (message.intent?.mealPlan) root.MentorActionCards.updateProgress(await state.repository.getMessage(messageId));
          }
          const dismissed = Object.values(message.actionStates || {}).filter(item => item.status === "dismissed").length;
          if (saved + dismissed < ordered.length && !state.error) state.error = "ACTION_SAVE";
        } else await root.MentorActionAdapters.execute(state.repository, messageId, actionId, action === "dismiss-action" ? "dismiss" : "approve");
      } catch (error) { state.error = safeCode(error, "ACTION_SAVE"); }
      finally { state.proposalBusy.delete(key); await refresh(); }
      return;
    }
    if (action === "new") {
      if (state.navigationBusy || state.proposalBusy.size) return;
      const conversation = await state.repository.create();
      await switchConversation(conversation.id); input.focus(); return;
    }
    if (action === "delete") {
      if (state.navigationBusy || state.proposalBusy.size || !root.confirm(t("deleteConfirm"))) return;
      await cancelActive();
      const oldId = state.activeId;
      await state.repository.remove(oldId);
      state.rows.filter(row => row.conversationId === oldId).forEach(row => pendingReplies.delete(row.id));
      state.drafts.delete(oldId);
      const remaining = await state.repository.list();
      const next = remaining[0] || await state.repository.create();
      await switchConversation(next.id); return;
    }
    if (action === "export") {
      const data = await state.repository.export();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = "mentor-conversations-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); return;
    }
    if (["approve", "dismiss"].includes(action)) {
      if (state.proposalBusy.has(messageId)) return;
      state.proposalBusy.add(messageId); state.error = null; renderMessages();
      try {
        if (action === "approve") {
          await proposals.approve(state.repository, messageId);
        } else await proposals.dismiss(state.repository, messageId);
      } catch (error) { state.error = safeCode(error, "GOAL_SAVE"); }
      finally { state.proposalBusy.delete(messageId); await refresh(); }
    }
  }
  // Only actual chat buttons are delegated. Editing controls are terminal UI targets.
  panel.addEventListener("click", event => {
    if (root.MentorUIEvents.isTextEditingEvent(event)) return;
    const control = event.target.closest("button[data-mentor-action]");
    if (!control || !panel.contains(control) || control.disabled) return;
    handleAction(control.dataset.mentorAction, control.dataset.messageId, control.dataset.actionId, control.dataset.taskId, control.dataset.mentorChoiceValue, control.dataset.taskVersion, control.dataset).catch(showStorageError);
  });
  panel.addEventListener("change", event => {
    const control = event.target;
    if (!control.matches?.("select[data-mentor-food-choice]") || !panel.contains(control) || state.run || state.proposalBusy.size) return;
    state.repository.setRecipeChoice(control.dataset.messageId, control.dataset.actionId, Number(control.dataset.requestIndex), control.value).then(() => refresh()).catch(showStorageError);
  });
  history.addEventListener("change", () => switchConversation(history.value).catch(showStorageError));
  input.addEventListener("input", renderControls);
  input.addEventListener("keydown", event => {
    if (event.key !== "Enter" || event.shiftKey || event.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    if (!sendButton.disabled) send().catch(showStorageError);
  });
  document.getElementById("mentorComposer").addEventListener("submit", event => { event.preventDefault(); send().catch(showStorageError); });
  // Keep board shortcuts and outside-click delegates out of this nonmodal surface.
  // Capture-phase board handlers have their own narrow floating-root guard.
  for (const type of ["click", "dblclick", "pointerdown", "pointerup", "mousedown", "mouseup", "touchstart", "touchend", "wheel", "contextmenu", "keydown", "keyup"]) {
    panel.addEventListener(type, event => {
      if (type === "keydown" && event.key === "Escape" && !event.defaultPrevented && !event.isComposing) {
        const tools = document.getElementById("mentorChatTools");
        if (tools.open) { tools.open = false; tools.querySelector("summary").focus({ preventScroll: true }); }
        else view.setOpen(false);
        event.preventDefault();
      }
      event.stopPropagation();
    });
  }
  root.addEventListener("mentor:languagechange", () => {
    cancelActive().then(() => { renderLabels(); renderHistory(); if (state.ready) { renderGoals(); renderMessages(); } }).catch(showStorageError);
  });
  root.addEventListener("focus", () => { if (state.ready) refresh().catch(showStorageError); });
  root.MentorChat = Object.freeze({
    showChat: () => showMode("chat"), showManual: () => showMode("manual"),
    getLastDiagnostic: () => lastDiagnostic ? {...lastDiagnostic} : null,
    activate: () => { if (state.ready) refresh().catch(showStorageError); },
    deactivate: () => view.setOpen(false)
  });
  view.setOpen(false); renderLabels();
  root.MentorChatReadyPromise = Promise.resolve(root.MentorAppReadyPromise).then(async () => {
    state.repository = await new root.MentorConversationsRepository().initialize();
    const conversations = await state.repository.list();
    const conversation = conversations[0] || await state.repository.create();
    state.activeId = conversation.id; state.ready = true;
    await refresh();
    try {
      const result = await root.MentorChatClient.status();
      state.setupNeeded = !result?.configured;
    } catch (_) { state.setupNeeded = true; }
    renderControls();
  }).catch(error => showStorageError(error, "initialization"));
})(window);
