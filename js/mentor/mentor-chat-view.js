(function (root) {
  "use strict";

  function create({ state, refs, protocol, proposals, safeCode, reportFailure, getLastDiagnostic, locked, language }) {
    const { panel, chatPanel, historyPanel, input, sendButton, cancelButton, history, goals, messageList, status, setup, clarification, clarificationContent = clarification, overviewToggle, historySurface, historyResizeGrip, overviewResizeGrip } = refs;
    let renderedContentKey = null, renderedQuestionKey = null;
    const t = (key, params) => root.MentorI18n.t("mentor." + key, params);
    function enableHeightResize(grip, target) {
      if (!grip || !target) return;
      const resizeTo = height => {
        const limit = Math.max(160, (root.visualViewport?.height || root.innerHeight || 800) - 96);
        target.style.height = Math.min(limit, Math.max(160, height)) + "px";
      };
      grip.addEventListener("pointerdown", event => {
        if (event.button !== 0) return;
        event.preventDefault();
        const initialHeight = target.getBoundingClientRect().height;
        const initialY = event.clientY;
        grip.setPointerCapture(event.pointerId);
        const move = current => {
          if (current.pointerId === event.pointerId) resizeTo(initialHeight + initialY - current.clientY);
        };
        const stop = current => {
          if (current.pointerId !== event.pointerId) return;
          grip.removeEventListener("pointermove", move);
          grip.removeEventListener("pointerup", stop);
          grip.removeEventListener("pointercancel", stop);
        };
        grip.addEventListener("pointermove", move);
        grip.addEventListener("pointerup", stop);
        grip.addEventListener("pointercancel", stop);
      });
      grip.addEventListener("keydown", event => {
        if (!["ArrowUp", "ArrowDown"].includes(event.key)) return;
        event.preventDefault();
        resizeTo(target.getBoundingClientRect().height + (event.key === "ArrowUp" ? 24 : -24));
      });
    }
    enableHeightResize(historyResizeGrip, historySurface);
    enableHeightResize(overviewResizeGrip, clarification);
    // VisualViewport follows the mobile keyboard without locking the module behind chat.
    if (root.visualViewport) {
      const updateViewport = () => {
        panel.style.setProperty("--mentor-viewport-height", root.visualViewport.height + "px");
        panel.style.setProperty("--mentor-keyboard-offset", Math.max(0, root.innerHeight - root.visualViewport.height - root.visualViewport.offsetTop) + "px");
      };
      root.visualViewport.addEventListener("resize", updateViewport, { passive: true });
      root.visualViewport.addEventListener("scroll", updateViewport, { passive: true });
      updateViewport();
    }
    function element(tag, text, className) {
      const node = document.createElement(tag);
      if (text != null) node.textContent = text;
      if (className) node.className = className;
      return node;
    }
    function button(action, text, messageId, className = "ghost-btn") {
      const node = element("button", text, className);
      node.type = "button";
      node.dataset.mentorAction = action;
      if (messageId) node.dataset.messageId = messageId;
      return node;
    }
    function choiceList(messageId, choices, busy, binding = {}) {
      const list = element("div", null, "mentor-choice-list");
      list.dataset.panel = "mentor-choice-list";
      choices.forEach((choice, index) => {
        const label = `${index + 1}. ${choice.name}`;
        const control = button("fill-choice", label, messageId, "mentor-choice-button");
        control.dataset.mentorChoiceValue = choice.value || label;
        control.dataset.mentorChoiceKind = binding.kind;
        if (binding.task) {
          control.dataset.taskId = binding.task.id;
          control.dataset.taskVersion = String(binding.task.version);
          control.dataset.mentorQuestionId = binding.task.pendingCorrectionText ? "correction" : binding.task.pendingItemId || "single";
        }
        if (binding.readTask) control.dataset.mentorReadCapability = binding.readTask.capabilityId;
        control.disabled = busy;
        list.append(control);
      });
      return list;
    }
    function renderControls() {
      input.disabled = !state.ready;
      sendButton.disabled = !state.ready || Boolean(state.run) || state.choiceBusy || state.proposalBusy.size > 0 || locked() || !input.value.trim();
      cancelButton.classList.toggle("hidden", !state.run);
      history.disabled = !state.ready || state.navigationBusy || state.choiceBusy || state.proposalBusy.size > 0;
      panel.querySelectorAll("button[data-mentor-action='fill-choice']").forEach(control => { control.disabled = Boolean(state.run || state.choiceBusy || state.navigationBusy || state.proposalBusy.size || locked()); });
      status.dataset.error = String(Boolean(state.error));
      status.textContent = state.error ? t("errors." + state.error) : state.run ? t("thinking") : state.proposalBusy.size ? t("actions.saving") : locked() ? t("busyElsewhere") : "";
      const diagnostic = state.error ? getLastDiagnostic() : null;
      if (diagnostic?.code === state.error) status.textContent += " " + t("actions.errorReference", {reference:[diagnostic.stage,diagnostic.name,diagnostic.code,diagnostic.location].filter(Boolean).join(" / ")});
      setup.textContent = state.setupNeeded ? t("setup") : "";
    }
    function renderLabels() {
      panel.querySelectorAll("[data-mentor-i18n]").forEach(node => { node.textContent = t(node.dataset.mentorI18n); });
      panel.querySelectorAll("[data-mentor-label]").forEach(node => { node.setAttribute("aria-label", t(node.dataset.mentorLabel)); });
      input.placeholder = t("placeholder");
      renderLauncher();
      renderControls();
    }
    function renderHistory() {
      history.replaceChildren(...state.conversations.map(conversation => {
        const option = element("option", conversation.title || t("untitled"));
        option.value = conversation.id;
        return option;
      }));
      history.value = state.activeId || "";
    }
    function renderGoals() {
      const previous = goals.value;
      const empty = element("option", t("noGoal"));
      empty.value = "";
      goals.replaceChildren(empty, ...proposals.listGoals().map(goal => {
        const option = element("option", goal.title);
        option.value = goal.id;
        return option;
      }));
      if (Array.from(goals.options).some(option => option.value === previous)) goals.value = previous;
    }
    function renderProposal(message) {
      const p = protocol.validateProposal(message.proposal);
      const card = element("section", null, "mentor-proposal");
      card.dataset.panel = "mentor-goal-proposal";
      card.append(element("small", t("proposal")), element("h3", p.title));
      const details = element("dl");
      const values = {
        type: root.typeLabel?.(p.type) || root.MentorI18n.t("builder.typeLabels." + ({ "long-term": "longTerm", "short-term": "shortTerm", habit: "habit" })[p.type]),
        category: root.categoryLabel(p.category), reason: p.reason, firstAction: p.firstAction,
        mainMilestone: p.mainMilestone, successMeasurement: p.successMeasurement, targetDate: p.targetDate,
        duration: p.duration, frequency: p.frequency, bestTime: p.bestTime,
        priority: t("priority" + ({ low: "Low", medium: "Medium", high: "High" })[p.priority])
      };
      Object.entries(values).forEach(([key, value]) => {
        if (value) details.append(element("dt", t(key)), element("dd", value));
      });
      card.append(details);
      for (const [key, rows] of [["tasks", p.tasks], ["milestones", p.milestones]]) {
        if (!rows.length) continue;
        card.append(element("strong", t(key)));
        const list = element("ul");
        rows.forEach(row => list.append(element("li", typeof row === "string" ? row : row.title + (row.cadence ? " · " + row.cadence : ""))));
        card.append(list);
      }
      const saved = root.MentorData.repositories.goals.getById(proposals.goalId(message.id));
      const actions = element("div", null, "mentor-proposal-actions");
      if (saved || message.proposalStatus === "approved") {
        actions.append(element("strong", t("approved")), button("open-goals", t("openGoals")));
      } else if (message.proposalStatus === "dismissed") {
        actions.append(element("span", t("dismissed")));
      } else {
        card.append(element("p", t("proposalNote")));
        const busy = state.proposalBusy.has(message.id);
        const approve = button("approve", t(busy ? "saving" : "approve"), message.id, "btn");
        const dismiss = button("dismiss", t("dismiss"), message.id);
        approve.disabled = dismiss.disabled = busy;
        actions.append(approve, dismiss);
      }
      card.append(actions);
      return card;
    }
    function renderClarification(latest) {
      if (!clarification) return null;
      const task = state.conversation?.activeTask;
      const write = task?.status === "collecting" && latest?.writeTask?.id === task.id;
      const read = !write && latest?.readTask?.candidates?.length ? latest.readTask : null;
      clarification.classList.toggle("hidden", !write && !read);
      clarification.inert = !write && !read;
      if (!write && !read) { clarificationContent.replaceChildren(); renderedQuestionKey = null; return null; }
      const pending = write ? task.items?.find(item => item.id === task.pendingItemId) || task : null;
      const choices = write ? root.MentorCapabilityRegistry?.get(task.capabilityId)?.pendingChoices?.(task) || root.MentorNutritionInventoryResolver.pendingChoices(task) || [] : read.candidates;
      const locationChoices = write && choices.some(choice => choice.value?.startsWith("__mentor_location__:"));
      const key = [state.activeId, latest.id, write ? task.version : read.capabilityId, language()].join(":");
      if (key === renderedQuestionKey) {
        clarification.querySelectorAll("button[data-mentor-action='fill-choice']").forEach(control => { control.disabled = Boolean(state.run || state.choiceBusy || state.navigationBusy || state.proposalBusy.size || locked()); });
        return latest.id;
      }
      const oldScroll = clarification.scrollTop;
      const heading = element("h3", t("clarification.title"), "mentor-clarification-title"); heading.id = "mentorClarificationTitle";
      const body = element("div", null, "mentor-clarification-body");
      if (write && task.items?.length && !task.pendingCorrectionText) body.append(element("p", t("clarification.currentItem", { index: task.items.indexOf(pending) + 1, name: pending.foodName || t("clarification.unnamed") }), "mentor-clarification-current"));
      const questionText = task?.capabilityId === "nutrition.food.create" && write ? task.question || latest.text : choices.length ? t(task?.pendingCorrectionText && write ? "clarification.chooseItem" : locationChoices ? "clarification.chooseLocation" : pending?.batchChoices ? "clarification.chooseBatch" : "clarification.chooseFood") : (write ? pending?.question : null) || latest.text;
      const question = element("p", questionText, "mentor-clarification-question"); question.id = "mentorClarificationQuestion"; question.tabIndex = -1;
      question.setAttribute("aria-live", "polite"); question.setAttribute("aria-atomic", "true");
      body.append(question);
      if (choices.length) body.append(choiceList(latest.id, choices, Boolean(state.run || state.choiceBusy || state.navigationBusy || state.proposalBusy.size || locked()), write ? { kind: "write", task } : { kind: "read", readTask: read }));
      if (write) {
        body.append(element("h4", t("clarification.items")));
        const list = element("ol", null, "mentor-clarification-items");
        for (const item of task.items || [task]) {
          const row = element("li"); row.dataset.current = String(item.id === pending?.id && !task.pendingCorrectionText);
          row.append(element("strong", item.foodName || t("clarification.unnamed")), element("p", item.preview || `${item.quantity ?? t("nutritionRead.unknown")} ${item.unit || ""}`));
          list.append(row);
        }
        body.append(list);
      }
      clarificationContent.replaceChildren(heading, body);
      clarification.scrollTop = key === renderedQuestionKey ? oldScroll : 0;
      renderedQuestionKey = key;
      return latest.id;
    }
    function renderMessages() {
      const nearBottom = messageList.scrollHeight - messageList.scrollTop - messageList.clientHeight < 90;
      const oldScroll = messageList.scrollTop;
      const fragment = document.createDocumentFragment();
      const overviewCards = [];
      if (!state.rows.length) {
        const empty = element("div", null, "mentor-empty");
        empty.append(element("h2", t("welcome")), element("p", t("welcomeText")));
        fragment.append(empty);
      }
      const lastUserId = state.rows.filter(row => row.role === "user").at(-1)?.id;
      const contentKey = [state.activeId, state.rows.at(-1)?.id, state.conversation?.activeTask?.version].join(":");
      if (contentKey !== renderedContentKey) state.overviewCollapsed = false;
      const clarificationMessageId = renderClarification(state.rows.filter(row => row.role === "assistant").at(-1));
      const lastWriteId = state.rows.filter(row => row.role === "assistant" && row.writeTask?.id === state.conversation?.activeTask?.id).at(-1)?.id;
      for (const message of state.rows) {
        const article = element("article", null, "mentor-message");
        article.tabIndex = -1;
        article.dataset.role = message.role;
        article.dataset.messageId = message.id;
        const meta = element("div", null, "mentor-message-meta");
        const stamp = message.createdAt ? new Date(message.createdAt) : null;
        const validStamp = stamp && Number.isFinite(stamp.getTime());
        const time = element("time", validStamp ? new Intl.DateTimeFormat(language() === "en" ? "en-GB" : "sr-Latn-RS", { hour: "2-digit", minute: "2-digit" }).format(stamp) : t("actions.timeUnknown"));
        if (validStamp) time.dateTime = stamp.toISOString();
        meta.append(element("strong", t(message.role === "user" ? "you" : "title")), time);
        article.append(meta, element("div", message.id === clarificationMessageId ? t("clarification.inSidePanel") : message.text, "mentor-message-text"));
        if (message.goalContext) article.append(element("small", t("sharedGoal", { title: message.goalContext.title }), "mentor-shared-goal"));
        if (message.role === "user" && message.status !== "complete" && message.id === lastUserId && !state.run && !locked()) {
          article.append(element("span", message.errorCode ? t("errors." + safeCode({ code: message.errorCode })) : t("interrupted"), "mentor-message-error"), button("retry", t("retry"), message.id));
        }
        try {
          if (message.proposals?.length) {
            const card = root.MentorActionCards.create(message, { busy: state.proposalBusy, history: root.MentorActionAdapters.history(state.rows) });
            const pending = message.proposals.some(item => !["approved", "dismissed"].includes(message.actionStates?.[item.id]?.status));
            if (pending && clarification) { overviewCards.push(card); article.append(element("small", t("actions.inOverview"), "mentor-shared-goal")); }
            else article.append(card);
          } else if (message.proposal) {
            const card = renderProposal(message);
            if (!message.proposalStatus && clarification) { overviewCards.push(card); article.append(element("small", t("actions.inOverview"), "mentor-shared-goal")); }
            else article.append(card);
          }
          if (message.writeTask && message.id === lastWriteId && message.id !== clarificationMessageId) {
            const task = state.conversation?.activeTask;
            if (task?.id === message.writeTask.id) {
              const card = element("section", null, "mentor-proposal mentor-action-card"); card.dataset.panel = "mentor-write-preview";
              const foodTask = task.capabilityId === "nutrition.food.create";
              card.append(element("strong", task.items ? t("writeInventory.multi.previewTitle") : task.preview || t("writeInventory.collecting")));
              if (foodTask && task.snapshot) card.append(root.MentorNutritionFood.renderPreview(task));
              if (task.items) for (const item of task.items) card.append(element("p", item.preview || t("writeInventory.multi.pending", { name: item.foodName || item.sourceText })));
              if (task.items && ["executing", "succeeded", "partial", "failed", "uncertain", "cancelled"].includes(task.status)) {
                const saved = task.items.filter(item => item.executionStatus === "succeeded").length;
                card.append(element("p", t("writeInventory.multi.result", { saved, total: task.items.length })));
                for (const item of task.items) card.append(element("p", t("writeInventory.multi.outcome", { name: item.foodName || item.sourceText, status: t("writeInventory.multi.status." + item.executionStatus) })));
              }
              if (task.status === "proposed") {
                const approve = button("approve-write", t(foodTask ? "foods.approve" : "writeInventory.approve"), message.id, "btn"); approve.dataset.taskId = task.id;
                const dismiss = button("dismiss-write", t(foodTask ? "foods.dismiss" : "writeInventory.dismiss"), message.id); dismiss.dataset.taskId = task.id;
                approve.dataset.taskVersion = dismiss.dataset.taskVersion = String(task.version);
                approve.disabled = dismiss.disabled = state.proposalBusy.has(task.id);
                card.append(approve, dismiss);
              } else if (["partial", "failed"].includes(task.status)) card.append(element("p", t("writeInventory.multi.stopped")));
              else if (foodTask && task.status === "succeeded" && task.result?.alreadyExists) card.append(element("p", t("foods.existing", { name: task.result.name })));
              else if (["succeeded", "executing", "uncertain", "cancelled"].includes(task.status)) card.append(element("p", t((foodTask ? "foods." : "writeInventory.") + (task.status === "executing" ? "uncertain" : task.status))));
              if (foodTask && task.status === "succeeded" && task.resumeRecipe) {
                const resume = button("resume-recipe", t("actions.resumeRecipe"), message.id); resume.dataset.taskId = task.id; resume.dataset.taskVersion = String(task.version); card.append(resume);
              }
              if (task.status === "proposed" && clarification) { overviewCards.push(card); article.append(element("small", t("actions.inOverview"), "mentor-shared-goal")); }
              else article.append(card);
            }
          }
        } catch (error) {
          state.error = reportFailure(error, "response-render");
          article.append(element("p", t("errors.RENDER"), "mentor-message-error"), button("retry-view", t("actions.retryView"), message.id));
        }
        fragment.append(article);
      }
      clarification?.querySelector("[data-panel='mentor-approvals']")?.remove();
      if (clarification && overviewCards.length) {
        const overview = element("section", null, "mentor-approval-overview");
        overview.dataset.panel = "mentor-approvals";
        const heading = element("h3", t("actions.overview"), "mentor-clarification-title");
        if (!clarificationMessageId) heading.id = "mentorClarificationTitle";
        overview.append(heading, ...overviewCards);
        clarificationContent.append(overview);
      }
      const hasOverview = Boolean(clarificationMessageId || overviewCards.length);
      if (clarification) {
        clarification.classList.toggle("hidden", !hasOverview || state.overviewCollapsed);
        clarification.inert = !hasOverview || state.overviewCollapsed;
      }
      if (overviewToggle) {
        overviewToggle.classList.toggle("hidden", !hasOverview);
        overviewToggle.setAttribute("aria-expanded", String(hasOverview && !state.overviewCollapsed));
        overviewToggle.setAttribute("aria-label", t("actions." + (state.overviewCollapsed ? "expandOverview" : "collapseOverview")));
      }
      overviewResizeGrip?.classList.toggle("hidden", !hasOverview || state.overviewCollapsed);
      messageList.replaceChildren(fragment);
      messageList.scrollTop = nearBottom || contentKey !== renderedContentKey ? messageList.scrollHeight : oldScroll;
      renderedContentKey = contentKey;
      if (state.focusClarification && !state.run) {
        if (!root.MentorUIEvents?.isTextEditingTarget?.(document.activeElement)) {
          if (clarificationMessageId && !state.overviewCollapsed) clarification.querySelector("#mentorClarificationQuestion")?.focus({ preventScroll: true });
          else messageList.lastElementChild?.focus({ preventScroll: true });
        }
        state.focusClarification = false;
      }
    }
    function renderLauncher() {
      const open = panel.dataset.open === "true";
      const minimized = panel.dataset.historyMinimized === "true";
      const launcher = panel.querySelector("#mentorLauncher");
      launcher.setAttribute("aria-expanded", String(open));
      launcher.setAttribute("aria-label", t(!open ? "floating.open" : minimized ? "floating.showHistory" : "floating.close"));
    }
    function setHistoryMinimized(minimized) {
      panel.dataset.historyMinimized = String(Boolean(minimized));
      if (historyPanel) historyPanel.inert = Boolean(minimized);
      if (minimized) {
        panel.querySelector("#mentorChatTools").open = false;
        if (historyPanel?.contains(document.activeElement)) input.focus({ preventScroll: true });
      }
      renderLauncher();
    }
    function setOpen(open) {
      const wasOpen = panel.dataset.open === "true";
      const hadFocus = chatPanel.contains(document.activeElement);
      panel.dataset.open = String(Boolean(open));
      if (open && !wasOpen) setHistoryMinimized(false);
      chatPanel.inert = !open;
      chatPanel.setAttribute("aria-hidden", String(!open));
      renderLauncher();
      if (!open) {
        panel.querySelector("#mentorChatTools").open = false;
        if (hadFocus) panel.querySelector("#mentorLauncher").focus({ preventScroll: true });
      } else if (!wasOpen) {
        if (!input.disabled) input.focus({ preventScroll: true });
        else panel.querySelector("#mentorMinimizeButton").focus({ preventScroll: true });
      }
    }
    return Object.freeze({ renderControls, renderLabels, renderHistory, renderGoals, renderMessages, setOpen, setHistoryMinimized });
  }

  root.MentorChatView = Object.freeze({ create });
})(window);
