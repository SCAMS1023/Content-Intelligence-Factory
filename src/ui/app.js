/* UI wiring. All rendering goes through TSVF.Dom, which never writes user data
   as markup. */
(function () {
  "use strict";

  const T = window.TSVF;
  const { el, clear, replace, $, $$, copyText, download } = T.Dom;

  const store = T.Store.create();
  const backups = T.BackupService.create();
  const tiktokServices = T.TikTokShopServices.create(T);
  let sharedDatabase = null;
  try {
    sharedDatabase = T.DatabaseRepository.create(window.localStorage);
    T.LegacyMigration.run(window.localStorage, sharedDatabase);
  } catch (storageError) {
    /* The legacy Store already falls back to memory in private/file modes.
       Shared persistence is an extension, so failure must never block boot. */
    sharedDatabase = T.DatabaseRepository.create(T.VersionedStorage.memoryAdapter());
  }

  const state = {
    pack: null,
    tab: "videos",
    salt: 0,
    view: "workbench",
    lastDeleted: null
  };

  const FIELD_IDS = [
    "productName", "brand", "price", "commission", "growth", "creators",
    "rating", "reviews", "brandMatch", "adsActive", "benefits", "problem",
    "objection", "offer", "audience"
  ];

  const SAMPLE = {
    productName: "Ninja CREAMi",
    brand: "Ninja",
    price: "59.99",
    commission: "12",
    growth: "125",
    creators: "142",
    rating: "4.6",
    reviews: "3200",
    brandMatch: "true",
    adsActive: "true",
    benefits: "Makes frozen desserts at home\nMultiple texture settings\nEasy countertop use",
    problem: "store-bought ice cream is expensive",
    objection: "I thought it would be hard to clean",
    offer: "Coupon shown on the product page",
    audience: "families and dessert lovers"
  };

  /* ------------------------------------------------------------- helpers */

  function readForm() {
    const raw = {};
    FIELD_IDS.forEach(function (id) {
      const node = $(id);
      raw[id] = node ? node.value : "";
    });
    return raw;
  }

  function writeForm(raw) {
    FIELD_IDS.forEach(function (id) {
      const node = $(id);
      if (node) node.value = raw && raw[id] !== undefined ? raw[id] : "";
    });
    updatePayoutLine();
  }

  function money(n) {
    return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  let toastTimer = null;
  function toast(message, tone) {
    const node = $("toast");
    node.textContent = message;
    node.className = "toast" + (tone ? " toast-" + tone : "");
    node.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { node.hidden = true; }, 3200);
  }

  function clearErrors() {
    $$(".err").forEach(function (n) { n.textContent = ""; });
    $$(".field").forEach(function (n) { n.classList.remove("has-error"); });
  }

  function showErrors(errors) {
    errors.forEach(function (e) {
      const node = $("err-" + e.field);
      if (node) {
        node.textContent = e.message;
        const field = node.closest(".field");
        if (field) field.classList.add("has-error");
      }
    });
    if (errors.length) {
      const first = $(errors[0].field);
      if (first) first.focus();
    }
  }

  function updatePayoutLine() {
    const res = T.Validation.normalize(readForm());
    const d = T.Scoring.commissionDollars(res.product);
    const line = $("payoutLine");
    if (d === null) {
      line.textContent = "";
      line.hidden = true;
    } else {
      line.hidden = false;
      replace(line, [
        el("span", { class: "payout-amount", text: money(d) }),
        " commission per sale"
      ]);
    }
  }

  /* ------------------------------------------------------------ generate */

  function generate(salt) {
    const raw = readForm();
    const res = T.Validation.normalize(raw);
    clearErrors();

    if (!res.ok) {
      showErrors(res.errors);
      toast(res.errors.length + " field" + (res.errors.length > 1 ? "s need" : " needs") + " fixing.", "warn");
      return;
    }
    if (res.warnings.length) showErrors(res.warnings);

    state.salt = salt === undefined ? state.salt : salt;
    state.pack = T.Pack.build(res.product, { salt: state.salt, projection: readProjectionOpts() });

    store.saveDraft(raw);
    $("emptyState").hidden = true;
    $("resultsBody").hidden = false;
    renderScore();
    renderTab();
    $("scoreAnnounce").textContent =
      "Scored " + state.pack.opportunity.value + " out of 100, " +
      state.pack.opportunity.rating.label + ", confidence " +
      state.pack.opportunity.confidencePct + " percent.";
  }

  function readProjectionOpts() {
    const views = Number(String($("projViews").value).replace(/[^\d.]/g, "")) || 10000;
    const ctr = (Number(String($("projCtr").value).replace(/[^\d.]/g, "")) || 0) / 100;
    const cvr = (Number(String($("projCvr").value).replace(/[^\d.]/g, "")) || 0) / 100;
    return { views: views, ctr: ctr, cvr: cvr };
  }

  /* -------------------------------------------------------------- score */

  function renderScore() {
    const o = state.pack.opportunity;

    $("scoreValue").textContent = o.value;
    const ratingNode = $("ratingLabel");
    ratingNode.textContent = o.rating.label;
    ratingNode.dataset.tone = o.rating.tone;
    $("dial").dataset.tone = o.rating.tone;

    const arc = $("dialArc");
    const circumference = 2 * Math.PI * 52;
    arc.style.strokeDasharray = String(circumference);
    arc.style.strokeDashoffset = String(circumference * (1 - o.value / 100));

    $("confidenceValue").textContent = o.confidencePct + "%";
    $("confidenceBar").style.width = o.confidencePct + "%";
    $("confidenceNote").textContent = o.confidencePct === 100
      ? "Every factor was evaluated."
      : o.available + " of " + o.totalWeight + " rubric points could be evaluated from what you entered.";

    replace($("kpis"), [
      kpi("Per sale", o.commissionDollars === null ? "—" : money(o.commissionDollars)),
      kpi("Price", state.pack.product.price === null ? "—" : money(state.pack.product.price)),
      kpi("Growth", state.pack.product.growth === null ? "—" : state.pack.product.growth + "%"),
      kpi("Creators", state.pack.product.creators === null ? "—" : state.pack.product.creators.toLocaleString("en-US"))
    ]);

    replace($("flags"), o.flags.map(function (f) {
      return el("div", { class: "flag flag-" + f.level }, [
        el("span", { class: "flag-tag", text: f.level === "block" ? "Stop" : f.level === "warn" ? "Caution" : "Note" }),
        el("span", { text: f.message })
      ]);
    }));

    replace($("breakdown"), o.breakdown.map(function (b) {
      const pct = b.status === "observed" ? (b.points / b.weight) * 100 : 0;
      return el("div", { class: "factor" + (b.status === "unknown" ? " is-unknown" : "") }, [
        el("div", { class: "factor-head" }, [
          el("span", { class: "factor-label", text: b.label }),
          el("span", { class: "factor-points", text: b.status === "observed"
            ? (Math.round(b.points * 10) / 10) + " / " + b.weight
            : "unknown · " + b.weight + " pts excluded" })
        ]),
        el("div", { class: "factor-bar" }, [
          el("span", { style: { width: pct + "%" } })
        ]),
        b.display ? el("p", { class: "factor-observed", text: b.display }) : null,
        el("p", { class: "factor-why", text: b.status === "unknown" ? (b.note || b.why) : b.why }),
        b.status === "observed" && b.note ? el("p", { class: "factor-note", text: b.note }) : null
      ]);
    }));

    renderProjection();
  }

  function kpi(label, value) {
    return el("div", { class: "kpi" }, [
      el("span", { class: "kpi-label", text: label }),
      el("strong", { class: "kpi-value", text: value })
    ]);
  }

  function renderProjection() {
    const out = $("projectionOut");
    if (!state.pack) return;
    const p = T.Scoring.projectEarnings(state.pack.opportunity.commissionDollars, readProjectionOpts());
    state.pack.projection = p;
    if (!p) {
      out.textContent = "Enter a price and commission rate to project earnings.";
      return;
    }
    replace(out, [
      p.views.toLocaleString("en-US") + " views → ",
      el("strong", { text: p.clicks.toLocaleString("en-US") + " clicks" }),
      " → ",
      el("strong", { text: p.orders + " orders" }),
      " → ",
      el("strong", { class: "accent", text: money(p.revenue) }),
      " commission."
    ]);
  }

  /* --------------------------------------------------------------- tabs */

  function renderTab() {
    const panel = $("tabpanel");
    if (!state.pack) return;
    panel.setAttribute("aria-labelledby", "tab-" + state.tab);

    const counts = state.pack.compliance.counts;
    const total = counts.high + counts.medium + counts.low;
    const badge = $("complianceCount");
    badge.hidden = total === 0;
    badge.textContent = String(total);
    badge.className = "pill " + (counts.high ? "pill-danger" : "pill-warn");

    if (state.tab === "videos") return replace(panel, state.pack.videos.map(videoCard));
    if (state.tab === "prompts") return replace(panel, state.pack.videos.map(promptCard));
    if (state.tab === "plan") return replace(panel, planView());
    if (state.tab === "compliance") return replace(panel, complianceView());
    if (state.tab === "checklist") return replace(panel, checklistView());
  }

  function copyButton(getText, label) {
    return el("button", {
      type: "button",
      class: "mini",
      onclick: function (e) {
        const btn = e.currentTarget;
        copyText(getText()).then(function (ok) {
          btn.textContent = ok ? "Copied" : "Press Ctrl+C";
          setTimeout(function () { btn.textContent = label || "Copy"; }, 1400);
        });
      }
    }, label || "Copy");
  }

  function videoCard(v) {
    return el("article", { class: "card" }, [
      el("header", { class: "card-head" }, [
        el("span", { class: "card-n", text: "#" + v.n }),
        el("span", { class: "card-type", text: v.archetypeLabel }),
        copyButton(function () {
          return v.hook + "\n\n" + v.caption + "\n\n" + v.hashtags.join(" ");
        }, "Copy")
      ]),
      el("p", { class: "card-intent", text: v.intent }),
      el("p", { class: "hook", text: v.hook }),

      el("div", { class: "card-block" }, [
        el("span", { class: "card-label", text: "Caption" }),
        el("p", { class: "mono-ish", text: v.caption }),
        el("p", { class: "tags", text: v.hashtags.join("  ") })
      ]),

      el("div", { class: "card-block" }, [
        el("span", { class: "card-label", text: "Shot script" }),
        el("ol", { class: "beats" }, v.script.map(function (s) {
          return el("li", {}, [
            el("span", { class: "beat-time", text: s.t }),
            el("div", {}, [
              el("strong", { text: s.role + " — " }),
              el("span", { text: s.direction }),
              s.line ? el("p", { class: "beat-line", text: "“" + s.line + "”" }) : null
            ])
          ]);
        }))
      ]),

      el("div", { class: "card-grid" }, [
        el("div", {}, [
          el("span", { class: "card-label", text: "On-screen text" }),
          el("p", { class: "overlay-preview" }, [
            el("span", { text: v.overlay.top }),
            el("span", { class: "overlay-bottom", text: v.overlay.bottom })
          ])
        ]),
        el("div", {}, [
          el("span", { class: "card-label", text: "B-roll note" }),
          el("p", { text: v.broll })
        ])
      ])
    ]);
  }

  function promptCard(v) {
    const p = v.prompts;
    return el("article", { class: "card" }, [
      el("header", { class: "card-head" }, [
        el("span", { class: "card-n", text: "#" + v.n }),
        el("span", { class: "card-type", text: p.angleLabel + " shot" }),
        copyButton(function () {
          return "IMAGE\n" + p.image + "\n\nVIDEO\n" + p.video + "\n\nVOICEOVER\n" + p.voiceover;
        }, "Copy")
      ]),
      promptBlock("Image prompt", p.image),
      promptBlock("Video prompt", p.video),
      promptBlock("Voiceover", p.voiceover),
      promptBlock("Text overlay", p.overlay)
    ]);
  }

  function promptBlock(label, value) {
    return el("div", { class: "card-block" }, [
      el("div", { class: "block-head" }, [
        el("span", { class: "card-label", text: label }),
        copyButton(function () { return value; })
      ]),
      el("pre", { class: "prompt", text: value })
    ]);
  }

  function planView() {
    const byDay = {};
    state.pack.postingPlan.forEach(function (s) {
      (byDay[s.day] = byDay[s.day] || []).push(s);
    });
    return [
      el("p", { class: "hint" }, "Two posts a day for five days, deliberately alternating between angle families so you are not testing two similar hooks back to back. Track results by archetype, not just by video."),
      el("div", { class: "plan" }, Object.keys(byDay).map(function (day) {
        return el("div", { class: "plan-day" }, [
          el("h3", { text: "Day " + day }),
          el("ul", {}, byDay[day].map(function (s) {
            const v = state.pack.videos[s.video - 1];
            return el("li", {}, [
              el("span", { class: "plan-time", text: s.time }),
              el("div", {}, [
                el("strong", { text: "#" + s.video + " " + s.archetype }),
                el("p", { class: "muted", text: v ? v.hook : "" })
              ])
            ]);
          }))
        ]);
      }))
    ];
  }

  function complianceView() {
    const c = state.pack.compliance;
    const nodes = [
      el("p", { class: "hint" }, "Scans both what you typed and everything generated from it for the claim categories that get affiliate videos pulled. A drafting aid — not legal advice.")
    ];

    if (c.clean) {
      nodes.push(el("div", { class: "clean-banner" }, [
        el("strong", { text: "No flagged phrases." }),
        el("p", { text: "Nothing in your inputs or the generated copy trips a claim rule. Still confirm every price and stock statement against the live listing." })
      ]));
    } else {
      nodes.push(el("div", { class: "sev-summary" }, [
        c.counts.high ? el("span", { class: "pill pill-danger", text: c.counts.high + " high" }) : null,
        c.counts.medium ? el("span", { class: "pill pill-warn", text: c.counts.medium + " medium" }) : null,
        c.counts.low ? el("span", { class: "pill", text: c.counts.low + " low" }) : null
      ]));
      nodes.push(el("div", {}, c.findings.map(function (f) {
        return el("div", { class: "finding finding-" + f.severity }, [
          el("div", { class: "finding-head" }, [
            el("span", { class: "sev", text: f.severity }),
            el("span", { class: "finding-cat", text: f.category }),
            el("span", { class: "finding-src", text: f.source })
          ]),
          el("p", { class: "finding-phrase" }, [el("q", { text: f.phrase })]),
          el("p", { class: "muted", text: f.why }),
          el("p", { class: "finding-fix" }, [el("strong", { text: "Fix: " }), el("span", { text: f.fix })])
        ]);
      })));
    }

    nodes.push(el("div", { class: "reminders" }, c.reminders.map(function (r) {
      return el("div", { class: "finding finding-low" }, [
        el("div", { class: "finding-head" }, [
          el("span", { class: "sev", text: "check" }),
          el("span", { class: "finding-cat", text: r.category })
        ]),
        el("p", { class: "muted", text: r.why }),
        el("p", { class: "finding-fix" }, [el("strong", { text: "Do: " }), el("span", { text: r.fix })])
      ]);
    })));

    return nodes;
  }

  function checklistView() {
    return state.pack.checklist.map(function (group, gi) {
      return el("div", { class: "check-group" }, [
        el("h3", { text: group.group }),
        el("ul", { class: "checklist" }, group.items.map(function (item, ii) {
          const id = "chk-" + gi + "-" + ii;
          return el("li", {}, [
            el("input", { type: "checkbox", id: id }),
            el("label", { for: id, text: item })
          ]);
        }))
      ]);
    });
  }

  /* ------------------------------------------------------------ library */

  function renderLibraryCount() {
    $("libraryCount").textContent = String(store.listLibrary().length);
  }

  function sortedLibrary() {
    const list = store.listLibrary().slice();
    const mode = $("librarySort").value;
    const num = function (v) { return v === null || v === undefined ? -Infinity : v; };
    if (mode === "score") list.sort(function (a, b) { return b.opportunity.value - a.opportunity.value; });
    else if (mode === "payout") list.sort(function (a, b) { return num(b.opportunity.commissionDollars) - num(a.opportunity.commissionDollars); });
    else if (mode === "name") list.sort(function (a, b) { return String(a.product.productName).localeCompare(String(b.product.productName)); });
    else list.sort(function (a, b) { return String(b.savedAt).localeCompare(String(a.savedAt)); });
    return list;
  }

  function renderLibrary() {
    renderLibraryCount();
    const list = sortedLibrary();
    const target = $("libraryList");

    if (!list.length) {
      replace(target, el("p", { class: "muted pad", text: "No saved products yet. Generate a pack and press “Save to library”." }));
    } else {
      replace(target, el("div", { class: "lib-table", role: "table" }, [
        el("div", { class: "lib-row lib-head", role: "row" }, [
          el("span", { role: "columnheader", text: "Product" }),
          el("span", { role: "columnheader", text: "Score" }),
          el("span", { role: "columnheader", text: "Conf." }),
          el("span", { role: "columnheader", text: "Per sale" }),
          el("span", { role: "columnheader", text: "Claims" }),
          el("span", { role: "columnheader", text: "" })
        ])
      ].concat(list.map(libraryRow))));
    }

    const trash = store.listTrash();
    $("trashPanel").hidden = trash.length === 0;
    replace($("trashList"), trash.map(function (t) {
      return el("div", { class: "trash-row" }, [
        el("span", { text: t.entry.product.productName }),
        el("span", { class: "muted", text: "deleted " + new Date(t.deletedAt).toLocaleString("en-US") }),
        el("button", {
          type: "button", class: "mini",
          onclick: function () {
            store.restore(t.entry.id);
            renderLibrary();
            toast("Restored.");
          }
        }, "Restore")
      ]);
    }));
  }

  function libraryRow(entry) {
    const o = entry.opportunity;
    const claims = entry.compliance.counts;
    return el("div", { class: "lib-row", role: "row" }, [
      el("span", { role: "cell" }, [
        el("strong", { text: entry.product.productName }),
        entry.product.brand ? el("small", { class: "muted", text: " " + entry.product.brand }) : null
      ]),
      el("span", { role: "cell" }, [
        el("span", { class: "score-chip", dataset: { tone: o.rating.tone }, text: String(o.value) })
      ]),
      el("span", { role: "cell", class: "muted", text: o.confidencePct + "%" }),
      el("span", { role: "cell", text: o.commissionDollars === null ? "—" : money(o.commissionDollars) }),
      el("span", { role: "cell" }, claims.high
        ? el("span", { class: "pill pill-danger", text: String(claims.high) })
        : claims.medium
          ? el("span", { class: "pill pill-warn", text: String(claims.medium) })
          : el("span", { class: "muted", text: "clean" })),
      el("span", { role: "cell", class: "lib-actions" }, [
        el("button", {
          type: "button", class: "mini",
          onclick: function () { openEntry(entry); }
        }, "Open"),
        el("button", {
          type: "button", class: "mini danger",
          onclick: function () {
            const res = store.remove(entry.id);
            if (res.ok) {
              renderLibrary();
              toast("Moved to trash — restore it below.", "warn");
            }
          }
        }, "Delete")
      ])
    ]);
  }

  function openEntry(entry) {
    const p = entry.product;
    writeForm({
      productName: p.productName || "",
      brand: p.brand || "",
      price: p.price === null ? "" : p.price,
      commission: p.commission === null ? "" : p.commission,
      growth: p.growth === null ? "" : p.growth,
      creators: p.creators === null ? "" : p.creators,
      rating: p.rating === null ? "" : p.rating,
      reviews: p.reviews === null ? "" : p.reviews,
      brandMatch: p.brandMatch === null ? "" : String(p.brandMatch),
      adsActive: p.adsActive === null ? "" : String(p.adsActive),
      benefits: (p.benefits || []).join("\n"),
      problem: p.problem || "",
      objection: p.objection || "",
      offer: p.offer || "",
      audience: p.audience || ""
    });
    setView("workbench");
    generate(entry.salt || 0);
    if (state.pack) state.pack.id = entry.id;
    toast("Loaded " + p.productName + ".");
  }

  /* ---------------------------------------------------------------- view */

  function setView(view) {
    state.view = view;
    $("view-workbench").hidden = view !== "workbench";
    $("view-library").hidden = view !== "library";
    $$(".viewbtn").forEach(function (b) {
      const on = b.dataset.view === view;
      b.classList.toggle("is-active", on);
      if (on) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    if (view === "library") renderLibrary();
  }

  function setTab(tab, focus) {
    state.tab = tab;
    $$(".tab").forEach(function (b) {
      const on = b.dataset.tab === tab;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    });
    renderTab();
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const prefs = store.getPrefs();
    prefs.theme = theme;
    store.setPrefs(prefs);
  }

  /* ------------------------------------------------------------- events */

  $("productForm").addEventListener("submit", function (e) {
    e.preventDefault();
    generate();
  });

  $("resetForm").addEventListener("click", function () {
    writeForm({});
    clearErrors();
    store.clearDraft();
    state.pack = null;
    $("resultsBody").hidden = true;
    $("emptyState").hidden = false;
    $("draftNote").textContent = "";
    $("productName").focus();
  });

  function loadSample() {
    writeForm(SAMPLE);
    generate(0);
    toast("Sample loaded.");
  }
  $("loadSample").addEventListener("click", loadSample);
  $("emptySample").addEventListener("click", loadSample);

  $("reshuffle").addEventListener("click", function () {
    if (!state.pack) return;
    generate(state.salt + 1);
    toast("New copy variants generated.");
  });

  /* Roving-tabindex arrow navigation, per the ARIA tabs pattern. */
  $$(".tab").forEach(function (btn, i, all) {
    btn.addEventListener("click", function () { setTab(btn.dataset.tab); });
    btn.addEventListener("keydown", function (e) {
      let next = null;
      if (e.key === "ArrowRight") next = all[(i + 1) % all.length];
      else if (e.key === "ArrowLeft") next = all[(i - 1 + all.length) % all.length];
      else if (e.key === "Home") next = all[0];
      else if (e.key === "End") next = all[all.length - 1];
      if (next) {
        e.preventDefault();
        setTab(next.dataset.tab, true);
      }
    });
  });

  $$(".viewbtn").forEach(function (b) {
    b.addEventListener("click", function () { setView(b.dataset.view); });
  });

  ["projViews", "projCtr", "projCvr"].forEach(function (id) {
    $(id).addEventListener("input", renderProjection);
  });

  ["price", "commission"].forEach(function (id) {
    $(id).addEventListener("input", updatePayoutLine);
  });

  $("copyTab").addEventListener("click", function () {
    if (!state.pack) return;
    copyText(T.Exporters.tabText(state.pack, state.tab)).then(function (ok) {
      toast(ok ? "Copied this tab as plain text." : "Copy blocked by the browser — select the text and press Ctrl+C.", ok ? null : "warn");
    });
  });

  $("saveToLibrary").addEventListener("click", function () {
    if (!state.pack) return;
    const res = store.savePack(state.pack);
    if (!res.ok) {
      toast("Could not save — browser storage is full or blocked.", "warn");
      return;
    }
    state.pack.id = res.entry.id;
    renderLibraryCount();
    toast(res.replaced ? "Updated in library." : "Saved to library.");
  });

  $("downloadCsv").addEventListener("click", function () {
    if (!state.pack) return;
    download(T.Exporters.safeName(state.pack, "videos.csv"), T.Exporters.videosCsv(state.pack), "text/csv");
  });

  $("downloadMd").addEventListener("click", function () {
    if (!state.pack) return;
    download(T.Exporters.safeName(state.pack, "pack.md"), T.Exporters.markdown(state.pack), "text/markdown");
  });

  $("downloadJson").addEventListener("click", function () {
    if (!state.pack) return;
    download(T.Exporters.safeName(state.pack, "pack.json"), T.Exporters.json(state.pack), "application/json");
  });

  $("printPack").addEventListener("click", function () { window.print(); });

  $("librarySort").addEventListener("change", renderLibrary);

  $("exportLibrary").addEventListener("click", function () {
    const list = store.listLibrary();
    if (!list.length) {
      toast("Library is empty.", "warn");
      return;
    }
    download("tiktok_shop_library.csv", T.Exporters.libraryCsv(list), "text/csv");
  });

  $("exportBackup").addEventListener("click", function () {
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      download("content-intelligence-factory-backup-" + stamp + ".json", backups.exportText(), "application/json");
      toast("Full local backup exported.");
    } catch (error) { toast(error.message || String(error), "warn"); }
  });

  $("importBackup").addEventListener("click", function () { $("backupFile").click(); });
  $("backupFile").addEventListener("change", function (event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (file.size > T.BackupService.MAX_IMPORT_BYTES) { toast("Backup exceeds the 4 MB safety limit.", "warn"); event.target.value = ""; return; }
    const reader = new FileReader();
    reader.onload = function () {
      const result = backups.restore(String(reader.result || ""));
      if (!result.ok) toast("Backup rejected: " + result.error, "warn");
      else { toast("Backup restored. Reloading…"); setTimeout(function () { window.location.reload(); }, 500); }
      event.target.value = "";
    };
    reader.onerror = function () { toast("The backup file could not be read.", "warn"); event.target.value = ""; };
    reader.readAsText(file);
  });

  $("emptyTrash").addEventListener("click", function () {
    const n = store.listTrash().length;
    if (!n) return;
    if (!window.confirm("Permanently delete " + n + " item" + (n > 1 ? "s" : "") + " from the trash? This cannot be undone.")) return;
    store.emptyTrash();
    renderLibrary();
    toast("Trash emptied.");
  });

  $("themeToggle").addEventListener("click", function () {
    const current = document.documentElement.dataset.theme;
    const next = current === "light" ? "dark" : current === "dark" ? "auto" : "light";
    applyTheme(next);
    toast("Theme: " + next);
  });

  /* Autosave the draft so a refresh does not lose typed work. */
  let draftTimer = null;
  FIELD_IDS.forEach(function (id) {
    const node = $(id);
    if (!node) return;
    node.addEventListener("input", function () {
      clearTimeout(draftTimer);
      draftTimer = setTimeout(function () {
        store.saveDraft(readForm());
        $("draftNote").textContent = "Draft saved locally.";
      }, 600);
    });
  });

  /* ---------------------------------------------------------------- boot */

  (function boot() {
    const prefs = store.getPrefs();
    document.documentElement.dataset.theme = prefs.theme || "auto";

    if (!store.isPersistent()) {
      toast("Browser storage is unavailable — the library will not survive a refresh.", "warn");
    }

    const draft = store.loadDraft();
    if (draft && draft.productName) {
      writeForm(draft);
      $("draftNote").textContent = "Restored your last draft.";
    }

    renderLibraryCount();
    setView("workbench");
    updatePayoutLine();
  })();
})();
