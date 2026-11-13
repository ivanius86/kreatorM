(function (root, factory) {
  "use strict";
  const JournalBookAnimation = factory(root);
  if (typeof module === "object" && module.exports) module.exports = JournalBookAnimation;
  else root.JournalBookAnimation = JournalBookAnimation;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";

  const clamp = (value) => Math.max(0, Math.min(1, value));

  class JournalBookAnimation {
    constructor(options = {}) {
      this.frameCount = options.frameCount ?? 24;
      this.duration = options.duration ?? 1000;
      if (!Number.isInteger(this.frameCount) || this.frameCount < 2 || !Number.isFinite(this.duration) || this.duration <= 0) {
        throw new TypeError("Book animation requires at least two frames and a positive duration.");
      }
      this.frameThresholds = options.frameThresholds == null ? null : [...options.frameThresholds];
      if (this.frameThresholds && (this.frameThresholds.length !== this.frameCount - 1 ||
          this.frameThresholds.some((value, index, values) => !Number.isFinite(value) || value <= 0 || value >= 1 ||
            (index > 0 && value <= values[index - 1])))) {
        throw new TypeError("Frame thresholds must be increasing values between zero and one.");
      }
      this.onFrame = options.onFrame || (() => {});
      this.onStateChange = options.onStateChange || (() => {});
      this.requestFrame = options.requestFrame || root.requestAnimationFrame.bind(root);
      this.cancelFrame = options.cancelFrame || root.cancelAnimationFrame.bind(root);
      this.now = options.now || (() => root.performance.now());
      this.reducedMotion = Boolean(options.reducedMotion);
      this.framesAvailable = options.framesAvailable !== false;
      this.progress = 0;
      this.target = 0;
      this.state = "closed";
      this.frameIndex = -1;
      this.frameRequest = null;
      this.lastTime = null;
      this.destroyed = false;
      this.tick = this.tick.bind(this);
      this.render(true);
      this.notify();
    }

    getSnapshot() {
      return {
        state: this.state,
        progress: this.progress,
        frameIndex: this.frameIndex,
        target: this.target,
        animating: this.state === "opening" || this.state === "closing",
        framesAvailable: this.framesAvailable,
        reducedMotion: this.reducedMotion
      };
    }

    render(force = false) {
      const index = this.frameThresholds
        ? this.frameThresholds.filter((threshold) => this.progress >= threshold).length
        : Math.round(this.progress * (this.frameCount - 1));
      if (!force && index === this.frameIndex) return;
      this.frameIndex = index;
      this.onFrame(index, this.progress);
    }

    notify() { this.onStateChange(this.getSnapshot()); }

    stopFrame() {
      if (this.frameRequest !== null) this.cancelFrame(this.frameRequest);
      this.frameRequest = null;
    }

    advance(timestamp) {
      if (this.lastTime === null) return;
      const elapsed = Math.max(0, timestamp - this.lastTime);
      this.lastTime = timestamp;
      const direction = this.target === 1 ? 1 : -1;
      this.progress = clamp(this.progress + direction * elapsed / this.duration);
      this.render();
      if (this.progress === this.target) {
        this.state = this.target === 1 ? "open" : "closed";
        this.lastTime = null;
        this.stopFrame();
        this.notify();
      }
    }

    tick(timestamp) {
      this.frameRequest = null;
      if (this.destroyed || this.lastTime === null) return;
      this.advance(Number.isFinite(timestamp) ? timestamp : this.now());
      if (this.lastTime !== null) this.frameRequest = this.requestFrame(this.tick);
    }

    moveTo(target) {
      if (this.destroyed) return this.getSnapshot();
      if (this.target === target) return this.getSnapshot();
      if (this.lastTime !== null) this.advance(this.now());
      this.stopFrame();
      this.target = target;
      if (this.reducedMotion || !this.framesAvailable || this.progress === target) {
        this.progress = target;
        this.lastTime = null;
        this.state = target === 1 ? "open" : "closed";
        this.render();
        this.notify();
        return this.getSnapshot();
      }
      this.lastTime = this.now();
      this.state = target === 1 ? "opening" : "closing";
      this.notify();
      this.frameRequest = this.requestFrame(this.tick);
      return this.getSnapshot();
    }

    open() { return this.moveTo(1); }
    close() { return this.moveTo(0); }
    toggle() { return this.moveTo(this.target === 1 ? 0 : 1); }

    cancel(options = {}) {
      if (this.destroyed) return this.getSnapshot();
      if (this.lastTime !== null) this.advance(this.now());
      this.stopFrame();
      const target = options.snapTo === "open" ? 1 : options.snapTo === "closed" ? 0 : Math.round(this.progress);
      this.progress = this.target = target;
      this.lastTime = null;
      this.state = target === 1 ? "open" : "closed";
      this.render();
      this.notify();
      return this.getSnapshot();
    }

    setReducedMotion(value) {
      if (this.destroyed) return;
      this.reducedMotion = Boolean(value);
      if (this.reducedMotion && this.lastTime !== null) this.cancel({ snapTo: this.target === 1 ? "open" : "closed" });
      else this.notify();
    }

    setFramesAvailable(value) {
      if (this.destroyed) return;
      this.framesAvailable = Boolean(value);
      if (!this.framesAvailable && this.lastTime !== null) this.cancel({ snapTo: this.target === 1 ? "open" : "closed" });
      else this.notify();
    }

    destroy() {
      if (this.destroyed) return;
      this.stopFrame();
      this.lastTime = null;
      this.destroyed = true;
      this.state = "destroyed";
      this.onFrame = this.onStateChange = () => {};
    }

    static async loadFrames(urls, options = {}) {
      const ImageConstructor = options.ImageCtor || root.Image;
      if (!Array.isArray(urls) || typeof ImageConstructor !== "function") {
        throw new TypeError("Frame loading requires image URLs and an Image constructor.");
      }
      const signal = options.signal;
      const aborted = () => {
        const error = new Error("Book image loading was cancelled.");
        error.name = "AbortError";
        return error;
      };
      const results = await Promise.allSettled(urls.map((url) => new Promise((resolve, reject) => {
        if (signal?.aborted) { reject(aborted()); return; }
        const image = new ImageConstructor();
        let settled = false;
        const cleanup = () => {
          image.onload = image.onerror = null;
          signal?.removeEventListener("abort", onAbort);
        };
        const finish = (error) => {
          if (settled) return;
          settled = true;
          cleanup();
          if (error) reject(error); else resolve(image);
        };
        const onAbort = () => { finish(aborted()); };
        image.onload = async () => {
          try {
            if (typeof image.decode === "function") await image.decode();
            if (signal?.aborted) finish(aborted()); else finish();
          } catch (error) { finish(error); }
        };
        image.onerror = () => finish(new Error("Book frame could not be loaded."));
        signal?.addEventListener("abort", onAbort, { once: true });
        try { image.src = url; }
        catch (error) { finish(error); }
      })));
      const frames = results.map((result) => result.status === "fulfilled" ? result.value : null);
      return {
        frames,
        complete: frames.length > 0 && results.every((result) => result.status === "fulfilled"),
        failedIndices: results.flatMap((result, index) => result.status === "rejected" ? [index] : [])
      };
    }
  }

  return JournalBookAnimation;
});
