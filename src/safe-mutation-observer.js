const NativeMutationObserver = window.MutationObserver;

if (!window.__HROS_SAFE_MUTATION_OBSERVER__) {
  class SafeMutationObserver {
    constructor(callback) {
      this.callback = callback;
      this.target = null;
      this.options = null;
      this.active = false;
      this.native = new NativeMutationObserver((records) => {
        if (!this.active) return;
        this.native.disconnect();
        try {
          this.callback(records, this);
        } finally {
          if (this.active && this.target && this.options) this.native.observe(this.target, this.options);
        }
      });
    }

    observe(target, options) {
      this.target = target;
      this.options = options;
      this.active = true;
      this.native.observe(target, options);
    }

    disconnect() {
      this.active = false;
      this.target = null;
      this.options = null;
      this.native.disconnect();
    }

    takeRecords() {
      return this.native.takeRecords();
    }
  }

  window.MutationObserver = SafeMutationObserver;
  window.__HROS_SAFE_MUTATION_OBSERVER__ = true;
}
