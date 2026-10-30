(function (root) {
  "use strict";

  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));

  async function commit(options) {
    const repository = options?.repository;
    if (!repository?.getAll || !repository?.replaceAll) throw new TypeError("Ideas repository is required.");
    const previousIdeas = repository.getAll();
    const nextIdeas = clone(options.nextIdeas);
    try {
      const savedIdeas = await repository.replaceAll(nextIdeas);
      options.onSuccess?.(savedIdeas);
      return { ok: true, ideas: clone(savedIdeas), error: null };
    } catch (error) {
      options.onError?.(error);
      return { ok: false, ideas: clone(previousIdeas), error };
    }
  }

  root.MentorIdeasDurableSave = Object.freeze({ commit });
})(typeof window !== "undefined" ? window : globalThis);
