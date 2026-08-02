(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else (root.TSVF = root.TSVF || {}).EventBus = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function create(onError) {
    const listeners = Object.create(null);
    function on(type, listener) {
      if (typeof listener !== "function") throw new TypeError("listener must be a function");
      (listeners[type] = listeners[type] || []).push(listener);
      return function unsubscribe() { off(type, listener); };
    }
    function off(type, listener) {
      const list = listeners[type] || [];
      const index = list.indexOf(listener);
      if (index >= 0) list.splice(index, 1);
    }
    function emit(type, payload) {
      (listeners[type] || []).slice().forEach(function (listener) {
        try { listener(payload, type); }
        catch (error) { if (onError) onError(error, type); }
      });
    }
    function clear(type) {
      if (type) delete listeners[type];
      else Object.keys(listeners).forEach(function (key) { delete listeners[key]; });
    }
    return { on: on, off: off, emit: emit, clear: clear };
  }
  return { create: create };
});
