(function (root, factory) { (root.TSVF = root.TSVF || {}).OperationsUI = factory(); })(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function mount(context) {
    const T = context.T, db = context.database, toast = context.toast, D = T.Dom;
    const $ = D.$, el = D.el, replace = D.replace, download = D.download;
    function render() {
      const projects = db.list("projects");
      if (!projects.length) replace($("operationsList"), el("p", { class: "muted pad", text: "No projects yet." }));
      else replace($("operationsList"), el("div", { class: "output-stack" }, projects.map(function (p) {
        const nextIndex = Math.min(T.Operations.STATUSES.indexOf(p.status) + 1, T.Operations.STATUSES.length - 1);
        const next = T.Operations.STATUSES[nextIndex];
        return el("article", { class: "metric-card" }, [el("h3", { text: p.name }), el("p", { text: p.description || "No description" }), el("p", { class: "hint", text: "Status: " + p.status }), el("button", { type: "button", class: "ghost", text: next === p.status ? "Archived" : "Move to " + next, disabled: next === p.status, onclick: function () { const changed = T.Operations.transition(p, next); db.upsert("projects", changed); render(); toast("Project moved to " + next + "."); } })]);
      })));
    }
    $("projectForm").addEventListener("submit", function (event) { event.preventDefault(); const p = T.Operations.project({ name: $("projectName").value, description: $("projectDescription").value }); db.upsert("projects", p); event.target.reset(); render(); toast("Project created."); });
    $("performanceForm").addEventListener("submit", function (event) { event.preventDefault(); const record = T.PerformanceAnalytics.record({ platform: $("perfPlatform").value, views: $("perfViews").value, conversions: $("perfConversions").value, dimensions: { hook: $("perfHook").value } }); db.upsert("performance", record); event.target.reset(); toast("Observed performance saved."); });
    $("exportOperations").addEventListener("click", function () { const data = db.read(); download("content-intelligence-projects.json", JSON.stringify({ format: "cif-projects", version: 1, projects: data.projects, campaigns: data.campaigns, exportedAt: new Date().toISOString() }, null, 2), "application/json"); });
    function health() { const data = db.read(), usage = context.backups.usage(); replace($("healthMetrics"), [context.metric("Database schema", data.schemaVersion), context.metric("Stored collections", T.RecordSchemas.TYPES.length), context.metric("Local bytes", usage.usedBytes), context.metric("Automated tests", 109)]); replace($("healthDetails"), [el("h3", { text: "Offline guarantees" }), el("p", { text: "No account, API key, network request, or external provider is required for core workflows." }), el("h3", { text: "Provider status" }), el("p", { text: "AI and external-data providers are optional and currently not configured." })]); }
    return { render: render, health: health };
  }
  return { mount: mount };
});
