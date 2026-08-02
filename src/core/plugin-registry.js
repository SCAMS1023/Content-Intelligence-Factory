(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else (root.TSVF = root.TSVF || {}).PluginRegistry = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const REQUIRED = ["id", "name", "version", "description", "dependencies", "routes", "services", "storageSchema", "capabilities", "enabled"];
  function validate(plugin) {
    const errors = [];
    if (!plugin || typeof plugin !== "object") return { valid: false, errors: ["plugin must be an object"] };
    REQUIRED.forEach(function (key) { if (!Object.prototype.hasOwnProperty.call(plugin, key)) errors.push("missing " + key); });
    if (plugin.id && !/^[a-z][a-z0-9-]*$/.test(plugin.id)) errors.push("id must be kebab-case");
    ["dependencies", "routes", "capabilities"].forEach(function (key) {
      if (plugin[key] !== undefined && !Array.isArray(plugin[key])) errors.push(key + " must be an array");
    });
    return { valid: errors.length === 0, errors: errors };
  }
  function create(options) {
    const plugins = Object.create(null);
    const events = options && options.events;
    return {
      register: function (plugin) {
        const result = validate(plugin);
        if (!result.valid) throw new Error("Invalid plugin: " + result.errors.join(", "));
        if (plugins[plugin.id]) throw new Error("Plugin already registered: " + plugin.id);
        plugin.dependencies.forEach(function (id) { if (!plugins[id]) throw new Error("Missing plugin dependency: " + id); });
        plugins[plugin.id] = Object.freeze(Object.assign({}, plugin));
        if (events) events.emit("plugin:registered", plugins[plugin.id]);
        return plugins[plugin.id];
      },
      get: function (id) { return plugins[id] || null; },
      list: function (enabledOnly) {
        return Object.keys(plugins).map(function (id) { return plugins[id]; })
          .filter(function (plugin) { return !enabledOnly || plugin.enabled; });
      }
    };
  }
  return { REQUIRED: REQUIRED, validate: validate, create: create };
});
