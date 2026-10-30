(function (root) {
  "use strict";
  const pending = new Map();
  function fail(code) { const error = new Error(code); error.code = code; throw error; }
  const goalId = messageId => "mentor-goal-" + messageId;
  function repository() { return root.MentorData.repositories.goals; }
  function listGoals() { return repository().getAll().filter(goal => !goal.isTemplateDismissal); }
  function readGoalContext(id) {
    if (!id) return null;
    const goal = repository().getById(id);
    if (!goal || goal.isTemplateDismissal) fail("INVALID_REQUEST");
    return root.MentorChatProtocol.validateRequest({
      requestId: "goal-context-read", language: "en", messages: [{ role: "user", text: "context" }],
      goalContext: { id: String(goal.id), title: goal.title, type: goal.type, category: goal.category, firstAction: goal.firstAction || "", targetDate: goal.targetDate || null }
    }).goalContext;
  }
  function toGoal(proposal, messageId, conversationId) {
    const p = root.MentorChatProtocol.validateProposal(proposal);
    if (!p) fail("INVALID_RESPONSE");
    const id = goalId(messageId);
    const tasks = p.tasks.length ? p.tasks : (p.firstAction ? [{ title: p.firstAction, cadence: p.frequency }] : []);
    return {
      id, type: p.type, title: p.title, reason: p.reason, finalGoalReason: p.reason,
      category: p.category, categoryName: root.categoryLabel?.(p.category) || p.category,
      subcategory: null, subcategoryName: "", customSubcategoryName: "", goalType: "",
      targetDate: p.targetDate, duration: p.duration || null, frequency: p.frequency || null,
      bestTime: p.bestTime, firstAction: p.firstAction || tasks[0]?.title || "",
      mainMilestone: p.mainMilestone || p.milestones[0] || "", successMeasurement: p.successMeasurement,
      priority: p.priority, milestones: p.milestones,
      actions: tasks.map((task, index) => ({ id: id + "-action-" + index, title: task.title, cadence: task.cadence, completed: false, actions: [] })),
      notesList: [], mentorAnswers: {}, mentorSource: { conversationId, messageId },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
  }
  function command(messageId, operation) {
    if (pending.has(messageId)) return pending.get(messageId);
    const run = () => operation();
    const task = Promise.resolve().then(() => root.navigator?.locks?.request
      ? root.navigator.locks.request("mentor-proposal-" + messageId, run) : run())
      .finally(() => pending.delete(messageId));
    pending.set(messageId, task);
    return task;
  }
  async function approve(chatRepository, messageId) {
    return command(messageId, async () => {
      await root.MentorAppReadyPromise;
      const message = await chatRepository.getMessage(messageId);
      if (!message?.proposal || message.proposalStatus === "dismissed") fail("STALE_REQUEST");
      if (!(await chatRepository.get(message.conversationId))) fail("CONVERSATION_DELETED");
      // Recover a durable goal even if storing the chat approval failed previously.
      if (message.proposalStatus === "approved") {
        const saved = repository().getById(goalId(message.id));
        if (!saved) fail("STALE_REQUEST");
        return { goal: saved };
      }
      const saved = await root.MentorGoalsService.createGoalIfAbsent(toGoal(message.proposal, message.id, message.conversationId), root.appState);
      await chatRepository.setProposalStatus(message.id, "approved");
      root.dispatchEvent?.(new root.CustomEvent("mentor:goal-saved", { detail: { goalId: saved.id } }));
      return { goal: saved };
    });
  }
  async function dismiss(chatRepository, messageId) {
    return command(messageId, async () => {
      if (repository().getById(goalId(messageId))) fail("STALE_REQUEST");
      await chatRepository.setProposalStatus(messageId, "dismissed");
    });
  }
  root.MentorGoalProposals = Object.freeze({ goalId, listGoals, readGoalContext, toGoal, approve, dismiss });
})(typeof window !== "undefined" ? window : globalThis);
