/* Claim-risk scanner.

   The original shipped a static 15-item checklist and left you to police your own
   wording — while several of its own generated hooks broke rules on that same
   checklist. This scans real text (both what you typed and what the app generated)
   for the claim categories that actually get TikTok Shop affiliate videos pulled
   or demonetised, and suggests a safer phrasing.

   This is a drafting aid, not legal advice — the UI says so too. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else (root.TSVF = root.TSVF || {}).Compliance = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const RULES = [
    {
      id: "medical",
      category: "Health / medical claim",
      severity: "high",
      pattern: /\b(cure[sd]?|heal[s|ed]?|treat(s|ed|ment)?|prevent[s|ed]?|diagnos\w*|FDA[- ]?approved|clinically proven|medical grade|anti[- ]?bacterial|detox\w*|toxin[s]?|immune boost\w*)\b/gi,
      why: "Implies a medical outcome. Restricted for affiliate content unless the brand is authorised to make the claim.",
      fix: "Describe what the product is or does physically, not what it does to the body."
    },
    {
      id: "weight",
      category: "Weight / body claim",
      severity: "high",
      pattern: /\b(lose (weight|\d+ ?(lbs?|pounds|kg))|weight[- ]?loss|fat[- ]?burn\w*|slim\w*|flatten your|shed (fat|pounds))\b/gi,
      why: "Body-transformation claims are a common takedown trigger and need substantiation.",
      fix: "Drop the outcome claim entirely, or attribute it explicitly to your own single experience."
    },
    {
      id: "earnings",
      category: "Earnings claim",
      severity: "high",
      pattern: /\b(guaranteed? (income|money|profit|earnings)|make \$[\d,]+|passive income|get rich|financial freedom)\b/gi,
      why: "Income claims require substantiation and are heavily policed.",
      fix: "Remove the figure, or state it as your own unrepresentative result."
    },
    {
      id: "absolutes",
      category: "Unprovable absolute",
      severity: "medium",
      pattern: /\b(the )?(best|#1|number one|world'?s (best|greatest)|perfect|flawless|guaranteed|100% (safe|effective|guaranteed)|never fails|always works)\b/gi,
      why: "Superlatives are treated as objective claims you would need to prove.",
      fix: "Swap for a subjective frame: \"my favourite\", \"the one I reach for\"."
    },
    {
      id: "urgency",
      category: "Fabricated urgency",
      severity: "medium",
      pattern: /\b(sale ends (today|tonight|in \d+)|last (day|chance)|only \d+ left|selling out (fast|now)|before it'?s gone|limited time only|hurry)\b/gi,
      why: "Deadline and stock claims must be true at the moment of posting. Most are not, and they age badly on evergreen video.",
      fix: "Point at the listing instead: \"check the current price and stock on the product page\"."
    },
    {
      id: "comparative",
      category: "Competitor disparagement",
      severity: "medium",
      pattern: /\b(better than (the )?[A-Z][\w-]+|beats [A-Z][\w-]+|don'?t (buy|waste your money on) [A-Z][\w-]+|[A-Z][\w-]+ is (a )?(scam|rip[- ]?off|garbage|trash))\b/g,
      why: "Naming and knocking a competitor invites both platform action and brand complaints.",
      fix: "Compare against a generic category rather than a named brand."
    },
    {
      id: "authenticity",
      category: "Authenticity / official status",
      severity: "medium",
      pattern: /\b(official (partner|reseller|distributor)|authoriz?ed (dealer|seller)|sponsored by|in partnership with)\b/gi,
      why: "Only claim a commercial relationship you actually hold, and disclose it properly if you do.",
      fix: "Remove it unless it is true and disclosed with the platform's own disclosure tools."
    },
    {
      id: "disclosure",
      category: "Missing affiliate disclosure",
      severity: "low",
      pattern: null,
      why: "Affiliate content needs a visible disclosure. TikTok's own commission-link flow usually applies one, but check it renders.",
      fix: "Confirm the paid-partnership or commission label is showing before you post."
    }
  ];

  function scanText(text, source) {
    const findings = [];
    if (!text) return findings;
    const s = String(text);

    RULES.forEach(function (rule) {
      if (!rule.pattern) return;
      const re = new RegExp(rule.pattern.source, rule.pattern.flags);
      let m;
      const seen = {};
      while ((m = re.exec(s)) !== null) {
        const phrase = m[0];
        if (seen[phrase.toLowerCase()]) continue;
        seen[phrase.toLowerCase()] = true;
        findings.push({
          ruleId: rule.id,
          category: rule.category,
          severity: rule.severity,
          phrase: phrase,
          source: source || "text",
          why: rule.why,
          fix: rule.fix
        });
        if (m.index === re.lastIndex) re.lastIndex++;
      }
    });

    return findings;
  }

  /* Scans everything: what the user typed, and everything generated from it. */
  function scanPack(pack) {
    let findings = [];
    const p = pack.product || {};

    (p.benefits || []).forEach(function (b, i) {
      findings = findings.concat(scanText(b, "Benefit " + (i + 1)));
    });
    findings = findings.concat(scanText(p.offer, "Offer / urgency"));
    findings = findings.concat(scanText(p.problem, "Problem"));
    findings = findings.concat(scanText(p.objection, "Objection"));

    (pack.videos || []).forEach(function (v) {
      findings = findings.concat(scanText(v.hook, "Video " + v.n + " hook"));
      findings = findings.concat(scanText(v.caption, "Video " + v.n + " caption"));
      findings = findings.concat(scanText(v.overlay.top + " " + v.overlay.bottom, "Video " + v.n + " overlay"));
    });

    const order = { high: 0, medium: 1, low: 2 };
    findings.sort(function (a, b) { return order[a.severity] - order[b.severity]; });

    const counts = { high: 0, medium: 0, low: 0 };
    findings.forEach(function (f) { counts[f.severity]++; });

    return {
      findings: findings,
      counts: counts,
      clean: findings.length === 0,
      reminders: RULES.filter(function (r) { return !r.pattern; }).map(function (r) {
        return { category: r.category, why: r.why, fix: r.fix };
      })
    };
  }

  const CHECKLIST = [
    { group: "Before you shoot", items: [
      "Confirm the shop name matches the official brand or a documented authorised seller.",
      "Screenshot the listing price, coupon, stock and commission rate, with today's date.",
      "Confirm the listing images are the brand's own, not lifted from another product.",
      "Check the commission rate has not changed since you added the product."
    ]},
    { group: "Generating assets", items: [
      "Use the real product photo as the visual reference for every generation.",
      "Reject any frame where the product morphs, bends, leaks, melts or changes label text.",
      "Reject any frame with invented on-screen text or altered branding.",
      "Confirm proportions against the reference photo before you accept a clip.",
      "Export vertical 9:16 at source resolution."
    ]},
    { group: "Editing", items: [
      "Build one 5-second clip, duplicate it, reverse the copy, join for a ~10-second loop.",
      "Keep total length between 8 and 15 seconds.",
      "One hook, one benefit, one call to action. Do not stack claims.",
      "Caption every spoken line — most views are muted.",
      "Vary the hook between uploads instead of reposting the same cut."
    ]},
    { group: "Claims", items: [
      "Every factual claim traces to something on the listing you screenshotted.",
      "No deadline or stock claim unless it is true right now.",
      "No health, medical or body-outcome claims.",
      "Personal experience is framed as personal experience.",
      "Affiliate disclosure is visible on the published post."
    ]},
    { group: "After posting", items: [
      "Log views, product clicks, click-through rate, orders and commission per video.",
      "Compare performance by hook archetype, not just by video.",
      "Keep the dated source screenshots for as long as the video stays up.",
      "Re-verify price and stock weekly while the video is still circulating."
    ]}
  ];

  return { RULES: RULES, CHECKLIST: CHECKLIST, scanText: scanText, scanPack: scanPack };
});
