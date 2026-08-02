/* Exports: JSON, CSV, Markdown, plain text.

   CSV notes — the original had three real problems here:
     1. It wrote the same image_prompt and video_prompt into all 10 rows.
     2. It hardcoded `i < 10`, so it would emit blank rows if the hook count moved.
     3. It joined with "\n" and no BOM, so Excel mangled both the line breaks
        inside quoted cells and any non-ASCII character.
   This writes RFC 4180: CRLF terminators, doubled quotes, UTF-8 BOM. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else (root.TSVF = root.TSVF || {}).Exporters = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const CRLF = "\r\n";
  const BOM = "﻿";

  function csvCell(v) {
    if (v === null || v === undefined) return '""';
    return '"' + String(v).replace(/"/g, '""') + '"';
  }

  function csvRows(rows) {
    return BOM + rows.map(function (r) {
      return r.map(csvCell).join(",");
    }).join(CRLF) + CRLF;
  }

  const VIDEO_COLUMNS = [
    "video", "archetype", "hook", "caption", "hashtags",
    "overlay_top", "overlay_bottom",
    "beat_1_direction", "beat_2_direction", "beat_3_direction",
    "cta", "broll_note", "shot_angle", "image_prompt", "video_prompt", "voiceover"
  ];

  function videosCsv(pack) {
    const rows = [VIDEO_COLUMNS];
    (pack.videos || []).forEach(function (v) {
      const p = v.prompts || {};
      rows.push([
        v.n,
        v.archetypeLabel,
        v.hook,
        v.caption,
        (v.hashtags || []).join(" "),
        v.overlay.top,
        v.overlay.bottom,
        v.script[0].direction,
        v.script[1].direction,
        v.script[2].direction,
        v.cta,
        v.broll,
        p.angleLabel || "",
        p.image || "",
        p.video || "",
        p.voiceover || ""
      ]);
    });
    return csvRows(rows);
  }

  /* One row per product — for ranking a screening batch in a spreadsheet. */
  function libraryCsv(entries) {
    const rows = [[
      "product", "brand", "score", "rating", "confidence_pct",
      "price", "commission_pct", "commission_dollars",
      "growth_7d_pct", "creators", "star_rating", "brand_match", "ads_active",
      "compliance_high", "compliance_medium", "saved_at"
    ]];
    (entries || []).forEach(function (e) {
      const p = e.product || {};
      const o = e.opportunity || {};
      const c = (e.compliance && e.compliance.counts) || {};
      rows.push([
        p.productName, p.brand, o.value,
        o.rating ? o.rating.label : "", o.confidencePct,
        p.price, p.commission,
        o.commissionDollars === null || o.commissionDollars === undefined ? "" : o.commissionDollars.toFixed(2),
        p.growth, p.creators, p.rating,
        p.brandMatch === null ? "unknown" : p.brandMatch,
        p.adsActive === null ? "unknown" : p.adsActive,
        c.high || 0, c.medium || 0, e.savedAt || e.createdAt || ""
      ]);
    });
    return csvRows(rows);
  }

  function json(pack) {
    return JSON.stringify(pack, null, 2);
  }

  function markdown(pack) {
    const p = pack.product;
    const o = pack.opportunity;
    const L = [];

    L.push("# " + p.productName + (p.brand ? " — " + p.brand : ""));
    L.push("");
    L.push("_Production pack generated " + new Date(pack.createdAt).toLocaleString("en-US") + "._");
    L.push("");
    L.push("## Opportunity");
    L.push("");
    L.push("**" + o.value + "/100 — " + o.rating.label + "** (confidence " + o.confidencePct + "%)");
    L.push("");
    L.push("| Factor | Weight | Status | Observed |");
    L.push("| --- | --- | --- | --- |");
    o.breakdown.forEach(function (b) {
      L.push("| " + b.label + " | " + b.weight + " | " +
        (b.status === "observed" ? Math.round(b.points * 10) / 10 + " pts" : "unknown") + " | " +
        (b.display || "—") + " |");
    });
    L.push("");

    if (o.flags.length) {
      L.push("### Flags");
      L.push("");
      o.flags.forEach(function (f) { L.push("- **" + f.level.toUpperCase() + ":** " + f.message); });
      L.push("");
    }

    if (pack.projection) {
      const pr = pack.projection;
      L.push("### Projected earnings (inferred, not observed)");
      L.push("");
      L.push("At " + pr.views.toLocaleString("en-US") + " views, " + (pr.ctr * 100).toFixed(1) +
        "% click-through and " + (pr.cvr * 100).toFixed(1) + "% conversion: ~" + pr.orders +
        " orders, about **$" + pr.revenue.toFixed(2) + "** commission.");
      L.push("");
    }

    L.push("## Videos");
    L.push("");
    pack.videos.forEach(function (v) {
      L.push("### " + v.n + ". " + v.archetypeLabel);
      L.push("");
      L.push("> " + v.hook);
      L.push("");
      L.push("- **Intent:** " + v.intent);
      L.push("- **Caption:** " + v.caption);
      L.push("- **Hashtags:** " + v.hashtags.join(" "));
      L.push("- **Overlay:** top `" + v.overlay.top + "` / bottom `" + v.overlay.bottom + "`");
      L.push("- **B-roll:** " + v.broll);
      L.push("");
      L.push("| Time | Beat | Direction |");
      L.push("| --- | --- | --- |");
      v.script.forEach(function (s) {
        L.push("| " + s.t + " | " + s.role + " | " + s.direction + " |");
      });
      L.push("");
      if (v.prompts) {
        L.push("**Image prompt (" + v.prompts.angleLabel + ")**");
        L.push("");
        L.push("```" );
        L.push(v.prompts.image);
        L.push("```");
        L.push("");
        L.push("**Video prompt**");
        L.push("");
        L.push("```");
        L.push(v.prompts.video);
        L.push("```");
        L.push("");
      }
    });

    L.push("## Posting plan");
    L.push("");
    L.push("| Slot | Day | Time | Video | Angle |");
    L.push("| --- | --- | --- | --- | --- |");
    pack.postingPlan.forEach(function (s) {
      L.push("| " + s.slot + " | " + s.day + " | " + s.time + " | #" + s.video + " | " + s.archetype + " |");
    });
    L.push("");

    L.push("## Claim check");
    L.push("");
    if (pack.compliance.clean) {
      L.push("No flagged phrases in your inputs or the generated copy.");
    } else {
      L.push("| Severity | Phrase | Where | Suggested fix |");
      L.push("| --- | --- | --- | --- |");
      pack.compliance.findings.forEach(function (f) {
        L.push("| " + f.severity + " | `" + f.phrase + "` | " + f.source + " | " + f.fix + " |");
      });
    }
    L.push("");

    L.push("## Checklist");
    L.push("");
    pack.checklist.forEach(function (g) {
      L.push("**" + g.group + "**");
      L.push("");
      g.items.forEach(function (i) { L.push("- [ ] " + i); });
      L.push("");
    });

    return L.join("\n");
  }

  /* Plain text for a single tab — what "Copy" should actually give you.
     The original copied the raw JSON blob, which is not pasteable anywhere useful. */
  function tabText(pack, tab) {
    if (tab === "videos") {
      return pack.videos.map(function (v) {
        return [
          "#" + v.n + " — " + v.archetypeLabel,
          "HOOK: " + v.hook,
          "CAPTION: " + v.caption,
          "HASHTAGS: " + v.hashtags.join(" "),
          "OVERLAY: " + v.overlay.top + " / " + v.overlay.bottom,
          v.script.map(function (s) { return s.t + "  " + s.role + ": " + s.direction; }).join("\n"),
          "CTA: " + v.cta
        ].join("\n");
      }).join("\n\n" + "-".repeat(48) + "\n\n");
    }
    if (tab === "prompts") {
      return pack.videos.map(function (v) {
        return [
          "#" + v.n + " — " + v.prompts.angleLabel,
          "IMAGE:\n" + v.prompts.image,
          "VIDEO:\n" + v.prompts.video,
          "VOICEOVER:\n" + v.prompts.voiceover
        ].join("\n\n");
      }).join("\n\n" + "=".repeat(48) + "\n\n");
    }
    if (tab === "plan") {
      return pack.postingPlan.map(function (s) {
        return "Day " + s.day + " " + s.time + " — video #" + s.video + " (" + s.archetype + ")";
      }).join("\n");
    }
    if (tab === "checklist") {
      return pack.checklist.map(function (g) {
        return g.group.toUpperCase() + "\n" + g.items.map(function (i) { return "[ ] " + i; }).join("\n");
      }).join("\n\n");
    }
    if (tab === "compliance") {
      if (pack.compliance.clean) return "No flagged phrases.";
      return pack.compliance.findings.map(function (f) {
        return "[" + f.severity.toUpperCase() + "] \"" + f.phrase + "\" in " + f.source + "\n  Why: " + f.why + "\n  Fix: " + f.fix;
      }).join("\n\n");
    }
    return markdown(pack);
  }

  function safeName(pack, suffix) {
    const base = String(pack.product.productName || "product")
      .replace(/[^A-Za-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60) || "product";
    return base + "_" + suffix;
  }

  return {
    csvCell: csvCell,
    csvRows: csvRows,
    VIDEO_COLUMNS: VIDEO_COLUMNS,
    videosCsv: videosCsv,
    libraryCsv: libraryCsv,
    json: json,
    markdown: markdown,
    tabText: tabText,
    safeName: safeName
  };
});
