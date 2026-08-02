(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else (root.TSVF = root.TSVF || {}).FeatureFlags = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function create(initial) {
    const values = Object.assign(Object.create(null), initial || {});
    return {
      enabled: function (name) { return values[name] === true; },
      get: function (name, fallback) { return Object.prototype.hasOwnProperty.call(values, name) ? values[name] : fallback; },
      set: function (name, value) { values[name] = value; return value; },
      snapshot: function () { return Object.assign({}, values); }
    };
  }
  return { create: create };
});
