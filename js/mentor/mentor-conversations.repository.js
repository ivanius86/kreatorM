(function (root) {
  "use strict";

  function fail(code) { const error = new Error(code); error.code = code; throw error; }
  function id(prefix) {
    return prefix + "-" + (root.crypto?.randomUUID?.() || Date.now().toString(36) + "-" + Math.random().toString(36).slice(2));
  }

  // An isolated Dexie database preserves the established app migration/backup contract.
  class MentorConversationsRepository {
    constructor(options = {}) {
      const Dexie = options.Dexie || root.Dexie;
      this.now = options.now || Date.now;
      this.leaseMs = options.leaseMs || 110000;
      this.db = new Dexie(options.databaseName || "kreatorm_mentor_chat_db", {
        ...(options.indexedDB ? { indexedDB: options.indexedDB, IDBKeyRange: options.IDBKeyRange } : {}),
        addons: []
      });
      this.db.version(1).stores({
        conversations: "id,createdAt,updatedAt",
        messages: "id,conversationId,&[conversationId+sequence],createdAt"
      });
    }
    async initialize() { await this.db.open(); return this; }
    async create() {
      const now = new Date(this.now()).toISOString();
      const conversation = { id: id("conversation"), title: "", createdAt: now, updatedAt: now, nextSequence: 0, lease: null };
      await this.db.conversations.add(conversation);
      return conversation;
    }
    async list() {
      return (await this.db.conversations.toArray()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
    }
    get(conversationId) { return this.db.conversations.get(conversationId); }
    getMessage(messageId) { return this.db.messages.get(messageId); }
    async messages(conversationId) {
      return (await this.db.messages.where("conversationId").equals(conversationId).toArray()).sort((a, b) => a.sequence - b.sequence);
    }
    withConversationLock(conversationId, operation) {
      return root.navigator?.locks?.request ? root.navigator.locks.request("mentor-conversation-" + conversationId, { mode: "exclusive" }, operation) : operation();
    }
    async remove(conversationId) {
      await this.withConversationLock(conversationId, () => this.db.transaction("rw", this.db.conversations, this.db.messages, async () => {
        await this.db.messages.where("conversationId").equals(conversationId).delete();
        await this.db.conversations.delete(conversationId);
      }));
    }
    async reserve(conversationId, owner, { text, goalContext = null, retryId = null, localOnly = false, localChoice = null } = {}) {
      return this.withConversationLock(conversationId, () => this.db.transaction("rw", this.db.conversations, this.db.messages, async () => {
        const conversation = await this.db.conversations.get(conversationId);
        if (!conversation) fail("CONVERSATION_DELETED");
        if (conversation.lease?.expiresAt > this.now()) fail("BUSY");
        if (localChoice) {
          const rows = await this.messages(conversationId);
          const latest = rows.filter(row => row.role === "assistant").at(-1);
          if (!latest || latest.id !== localChoice.messageId || (!retryId && rows.at(-1)?.id !== latest.id)) fail("STALE_REQUEST");
          if (localChoice.kind === "write") {
            const task = conversation.activeTask;
            const questionId = task?.pendingCorrectionText ? "correction" : task?.pendingItemId || "single";
            if (!task || task.id !== localChoice.taskId || task.version !== localChoice.taskVersion || task.status !== "collecting" || latest.writeTask?.id !== task.id || questionId !== localChoice.questionId) fail("STALE_REQUEST");
          } else if (localChoice.kind === "recipe-food") {
            const recipe = latest.proposals?.find(item => item.id === localChoice.actionId && item.action === "createRecipe");
            const request = Number.isInteger(localChoice.requestIndex) && recipe?.resolutionRequests?.[localChoice.requestIndex];
            if (!request || request.kind !== "missing" || ["approved", "dismissed", "executing"].includes(latest.actionStates?.[recipe.id]?.status) || localChoice.foodId && !request.candidates.some(food => food.id === localChoice.foodId)) fail("STALE_REQUEST");
          } else if (localChoice.kind === "recipe-resume") {
            const task = conversation.activeTask;
            if (!task || task.id !== localChoice.taskId || task.version !== localChoice.taskVersion || task.status !== "succeeded" || !task.resumeRecipe || latest.writeTask?.id !== task.id) fail("STALE_REQUEST");
          } else if (localChoice.kind !== "read" || latest.readTask?.capabilityId !== localChoice.capabilityId) fail("STALE_REQUEST");
        }
        if (conversation.lease) {
          await this.db.messages.update(conversation.lease.userId, { status: "error", errorCode: "CANCELLED" });
        }
        const now = new Date(this.now()).toISOString();
        let message;
        if (retryId) {
          message = await this.db.messages.get(retryId);
          const rows = await this.messages(conversationId);
          const lastUser = rows.filter(row => row.role === "user").at(-1);
          if (!message || message.conversationId !== conversationId || message.role !== "user" || lastUser?.id !== message.id || message.status === "complete") fail("STALE_REQUEST");
          message = { ...message, status: "pending", errorCode: null };
          await this.db.messages.put(message);
        } else {
          if (typeof text !== "string" || !text.trim() || text.length > 4000) fail("INVALID_REQUEST");
          message = { id: id("message"), conversationId, sequence: conversation.nextSequence++, role: "user", text: text.trim(), createdAt: now, status: "pending", errorCode: null, goalContext, ...(localOnly ? { contextPolicy: "local-only" } : {}), ...(localChoice ? { localChoice } : {}) };
          await this.db.messages.add(message);
          if (!conversation.title) conversation.title = message.text.slice(0, 60);
        }
        conversation.updatedAt = now;
        conversation.lease = { owner, userId: message.id, expiresAt: this.now() + this.leaseMs };
        await this.db.conversations.put(conversation);
        return message;
      }));
    }
    async complete(conversationId, userId, owner, response, { localOnly = false, capabilityId = null, writeTask = null, readTask = null } = {}) {
      const result = root.MentorChatProtocol.validateResponse(response);
      return this.db.transaction("rw", this.db.conversations, this.db.messages, async () => {
        const conversation = await this.db.conversations.get(conversationId);
        if (!conversation) fail("CONVERSATION_DELETED");
        if (conversation.lease?.owner !== owner || conversation.lease?.userId !== userId) fail("STALE_REQUEST");
        const user = await this.db.messages.get(userId);
        if (!user || user.status !== "pending") fail("STALE_REQUEST");
        const now = new Date(this.now()).toISOString();
        const assistant = { id: userId + "_reply", conversationId, sequence: conversation.nextSequence++, role: "assistant", text: result.reply, proposal: result.proposal, proposals: result.proposals || [], intent: result.intent || null, mealPlanDraft: result.mealPlanDraft || null, actionStates: {}, proposalStatus: null, replyTo: userId, createdAt: now, status: "complete", ...(localOnly ? { contextPolicy: "local-only", ...(capabilityId ? { capabilityId } : {}), ...(writeTask ? { writeTask } : {}), ...(readTask ? { readTask } : {}) } : {}) };
        await this.db.messages.add(assistant);
        await this.db.messages.update(userId, { status: "complete", errorCode: null });
        await this.db.conversations.put({ ...conversation, lease: null, updatedAt: now });
        return assistant;
      });
    }
    async release(conversationId, userId, owner, errorCode = "CANCELLED") {
      return this.db.transaction("rw", this.db.conversations, this.db.messages, async () => {
        const conversation = await this.db.conversations.get(conversationId);
        if (conversation?.lease?.owner !== owner || conversation.lease.userId !== userId) return false;
        await this.db.messages.update(userId, { status: "error", errorCode });
        await this.db.conversations.put({ ...conversation, lease: null });
        return true;
      });
    }
    async setProposalStatus(messageId, proposalStatus) {
      if (!["approved", "dismissed"].includes(proposalStatus)) fail("INVALID_REQUEST");
      await this.db.transaction("rw", this.db.conversations, this.db.messages, async () => {
        const message = await this.db.messages.get(messageId);
        if (!message || !message.proposal || !(await this.db.conversations.get(message.conversationId))) fail("CONVERSATION_DELETED");
        if (message.proposalStatus && message.proposalStatus !== proposalStatus) fail("STALE_REQUEST");
        await this.db.messages.update(messageId, { proposalStatus });
      });
    }
    async setRequestSnapshot(userId, snapshot) {
      const request = root.MentorChatProtocol.validateRequest(snapshot);
      return this.db.transaction("rw", this.db.conversations, this.db.messages, async () => {
        const message = await this.db.messages.get(userId);
        if (!message || !(await this.db.conversations.get(message.conversationId))) fail("CONVERSATION_DELETED");
        if (message.requestSnapshot) return message.requestSnapshot;
        await this.db.messages.update(userId, { requestSnapshot: request });
        return request;
      });
    }
    async setActionState(messageId, actionId, value) {
      if (!["executing", "approved", "dismissed", "failed"].includes(value.status)) fail("INVALID_REQUEST");
      return this.db.transaction("rw", this.db.conversations, this.db.messages, async () => {
        const message = await this.db.messages.get(messageId);
        if (!message || !(await this.db.conversations.get(message.conversationId))) fail("CONVERSATION_DELETED");
        if (!(message.proposals || []).some(action => action.id === actionId)) fail("INVALID_REQUEST");
        const states = message.actionStates || {};
        if (["approved", "dismissed"].includes(states[actionId]?.status)) return states[actionId];
        const next = { status: value.status, entityId: String(value.entityId || "").slice(0, 240), errorCode: String(value.errorCode || "").slice(0, 80), choices: states[actionId]?.choices || {}, updatedAt: new Date(this.now()).toISOString() };
        await this.db.messages.update(messageId, { actionStates: { ...states, [actionId]: next } });
        return next;
      });
    }
    async setRecipeChoice(messageId, actionId, index, foodId) {
      if (!Number.isInteger(index) || index < 0 || index >= 20 || typeof foodId !== "string") fail("INVALID_REQUEST");
      return this.db.transaction("rw", this.db.conversations, this.db.messages, async () => {
        const message = await this.db.messages.get(messageId);
        if (!message || !(await this.db.conversations.get(message.conversationId))) fail("CONVERSATION_DELETED");
        const action = (message.proposals || []).find(item => item.id === actionId && item.action === "createRecipe");
        const request = action?.resolutionRequests?.[index];
        if (!request || request.kind === "missing" || (foodId && !request.candidates.some(item => item.id === foodId))) fail("INVALID_REQUEST");
        const states = message.actionStates || {}, current = states[actionId] || {};
        if (["approved", "dismissed", "executing"].includes(current.status)) fail("STALE_REQUEST");
        const choices = { ...(current.choices || {}) };
        if (foodId) choices[index] = foodId; else delete choices[index];
        const next = { ...current, status: "pending", choices, updatedAt: new Date(this.now()).toISOString() };
        await this.db.messages.update(messageId, { actionStates: { ...states, [actionId]: next } });
        return next;
      });
    }
    async setActiveTask(conversationId, task, expectedVersion = null) {
      return this.withConversationLock(conversationId, () => this.db.transaction("rw", this.db.conversations, async () => {
        const conversation = await this.db.conversations.get(conversationId);
        if (!conversation) fail("CONVERSATION_DELETED");
        const current = conversation.activeTask || null;
        if ((current?.version ?? null) !== expectedVersion) fail("STALE_REQUEST");
        if (current?.status === "executing" && (!task || task.id !== current.id || !["executing", "succeeded", "partial", "uncertain", "failed"].includes(task.status))) fail("BUSY");
        const next = task ? { ...task, version: (current?.version || 0) + 1 } : null;
        await this.db.conversations.put({ ...conversation, activeTask: next, updatedAt: new Date(this.now()).toISOString() });
        return next;
      }));
    }
    async context(conversationId, userId, includeIds = false) {
      const rows = await this.messages(conversationId);
      const current = rows.find(row => row.id === userId && row.role === "user");
      if (!current) fail("STALE_REQUEST");
      if (current.contextPolicy === "local-only") fail("INVALID_REQUEST");
      const replies = new Map(rows.filter(row => row.role === "assistant").map(row => [row.replyTo, row]));
      const pairs = [];
      for (const row of rows) {
        if (row.sequence >= current.sequence) break;
        const reply = replies.get(row.id);
        if (row.role === "user" && row.status === "complete" && row.contextPolicy !== "local-only" && reply && reply.contextPolicy !== "local-only") {
          const summary = includeIds && reply.proposals?.length ? "\nAPP_PROPOSALS: " + JSON.stringify(reply.proposals.map(action => ({ id: action.id, action: action.action, name: action.name || action.title || "", state: reply.actionStates?.[action.id]?.status || "pending", entityId: reply.actionStates?.[action.id]?.entityId || "" }))).slice(0, 2500) : "";
          pairs.push({ role: "user", text: row.text, ...(includeIds ? { id: row.id } : {}) }, { role: "assistant", text: reply.text.slice(0, 9500) + summary, ...(includeIds ? { id: reply.id } : {}) });
        }
      }
      pairs.push({ role: "user", text: current.text, ...(includeIds ? { id: current.id } : {}) });
      return root.MentorChatProtocol.limitContext(pairs);
    }
    async export() {
      return this.db.transaction("r", this.db.conversations, this.db.messages, async () => ({
        format: "mentor-conversations", version: 1, exportedAt: new Date(this.now()).toISOString(),
        conversations: (await this.list()).map(({ lease, ...row }) => row),
        messages: (await this.db.messages.toArray()).sort((a, b) => a.conversationId.localeCompare(b.conversationId) || a.sequence - b.sequence)
      }));
    }
    close() { this.db.close(); }
  }
  root.MentorConversationsRepository = MentorConversationsRepository;
  if (typeof module === "object" && module.exports) module.exports = MentorConversationsRepository;
})(typeof window !== "undefined" ? window : globalThis);
