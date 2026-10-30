(function (root) {
  "use strict";
  const registry = root.MentorCapabilityRegistry;
  const running = new Map();
  function fail(code) { const error = new Error(code); error.code = code; throw error; }
  async function prepare(text, prior, capabilityId, options) {
    const capability = registry.get(capabilityId);
    if (!capability || capability.type !== "write") fail("UNKNOWN_CAPABILITY");
    if (prior && prior.capabilityId !== capabilityId) fail("STALE_REQUEST");
    if (options?.signal?.aborted) fail("CANCELLED");
    const result = await capability.prepare(text, prior, options);
    if (options?.signal?.aborted) fail("CANCELLED");
    return result;
  }
  async function executeItems(repository, conversationId, task, capability) {
    let current = await repository.setActiveTask(conversationId, { ...task, status: "executing" }, task.version);
    const update = async (index, patch, status) => {
      const items = current.items.map((item, i) => i === index ? { ...item, ...patch } : { ...item });
      current = await repository.setActiveTask(conversationId, { ...current, items, status }, current.version);
    };
    for (let index = 0; index < current.items.length; index++) {
      let started = false;
      try {
        // Repeat domain checks after previous awaits, then persist the attempt
        // before entering the existing adapter. Never replay an uncertain item.
        await capability.preflight(current.items[index]);
        await update(index, { executionStatus: "executing" }, "executing");
        started = true;
        const result = await registry.execute(capability.id, capability.inputFor(current.items[index]), { confirmed: true, authorize: () => true });
        await update(index, { executionStatus: "succeeded", result }, index === current.items.length - 1 ? "succeeded" : "executing");
      } catch (error) {
        const status = current.items.some(item => item.executionStatus === "succeeded") ? "partial" : started ? "uncertain" : "failed";
        await update(index, { executionStatus: started ? "uncertain" : "failed", errorCode: error?.code || "INVENTORY_WRITE_FAILED" }, status).catch(() => {});
        throw error;
      }
    }
    return { task: current };
  }
  async function confirm(repository, conversationId, taskId, expectedVersion = null) {
    const key = `${conversationId}:${taskId}:${expectedVersion ?? "legacy"}`;
    if (running.has(key)) return running.get(key);
    const operation = async () => {
      const task = (await repository.get(conversationId))?.activeTask;
      if (!task || task.id !== taskId) fail("STALE_REQUEST");
      const capability = registry.get(task.capabilityId);
      if (!capability || capability.type !== "write") fail("UNKNOWN_CAPABILITY");
      if (["succeeded", "executing", "uncertain", "partial", "failed"].includes(task.status)) return { task };
      if (task.status !== "proposed") fail("STALE_REQUEST");
      if ((Array.isArray(task.items) && !Number.isInteger(expectedVersion)) || (expectedVersion != null && task.version !== expectedVersion)) fail("STALE_REQUEST");
      await capability.preflight(task);
      if (Array.isArray(task.items)) return executeItems(repository, conversationId, task, capability);
      const executing = await repository.setActiveTask(conversationId, { ...task, status: "executing" }, task.version);
      try {
        const result = await registry.execute(capability.id, capability.inputFor(task), { confirmed: true, authorize: () => true });
        const done = await repository.setActiveTask(conversationId, { ...executing, status: "succeeded", result }, executing.version);
        return { task: done };
      } catch (error) {
        await repository.setActiveTask(conversationId, { ...executing, status: "uncertain" }, executing.version).catch(() => {});
        throw error;
      }
    };
    const promise = operation().finally(() => running.delete(key));
    running.set(key, promise);
    return promise;
  }
  async function dismiss(repository, conversationId, taskId, expectedVersion = null) {
    const task = (await repository.get(conversationId))?.activeTask;
    if (!task || task.id !== taskId || task.status !== "proposed") fail("STALE_REQUEST");
    if (expectedVersion != null && task.version !== expectedVersion) fail("STALE_REQUEST");
    return repository.setActiveTask(conversationId, { ...task, status: "cancelled", ...(task.items ? { items: task.items.map(item => ({ ...item, executionStatus: "cancelled" })) } : {}) }, task.version);
  }
  root.MentorWritePipeline = Object.freeze({ prepare, confirm, dismiss });
})(window);
