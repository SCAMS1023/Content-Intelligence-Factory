/* Opportunity scoring.

   Differences from the original MVP's scoring:
   - Every factor declares its weight up front, and the breakdown is returned
     so the UI can show *why* a product scored what it did.
   - Unknown inputs are excluded from the denominator and reduce a reported
     `confidence` figure, instead of silently scoring zero.
   - Price is scored as a band, not "more is better". A $349 appliance converts
     far worse on impulse-driven short-form than a $59 one; the original gave
     the $349 item full marks.
   - Findings separate OBSERVED evidence from INFERRED projection. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else (root.TSVF = root.TSVF || {}).Scoring = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function band(value, table) {
    for (let i = 0; i < table.length; i++) {
      if (value >= table[i][0]) return table[i][1];
    }
    return table.length ? table[table.length - 1][1] : 0;
  }

  function commissionDollars(p) {
    if (p.price === null || p.commission === null) return null;
    return p.price * (p.commission / 100);
  }

  const FACTORS = [
    {
      id: "payout",
      label: "Commission per sale",
      weight: 25,
      why: "The single biggest driver of whether volume turns into income.",
      evaluate: function (p) {
        const d = commissionDollars(p);
        if (d === null) return { status: "unknown", note: "Needs both price and commission %." };
        return {
          status: "observed",
          ratio: band(d, [[25, 1], [15, 0.85], [10, 0.7], [6, 0.5], [3, 0.28], [1, 0.1], [0, 0]]),
          display: "$" + d.toFixed(2) + " per sale",
          note: d < 2 ? "Under $2 per sale — needs very high volume to matter." : null
        };
      }
    },
    {
      id: "demand",
      label: "Demand trend (7d)",
      weight: 18,
      why: "Rising sales volume means the algorithm is already pushing the product.",
      evaluate: function (p) {
        if (p.growth === null) return { status: "unknown", note: "Pull the 7-day sales trend from your research tool." };
        return {
          status: "observed",
          ratio: band(p.growth, [[200, 1], [100, 0.85], [50, 0.65], [20, 0.45], [1, 0.25], [0, 0.15], [-Infinity, 0.05]]),
          display: p.growth + "% over 7 days",
          note: p.growth < 0 ? "Declining — demand may already have peaked." : null
        };
      }
    },
    {
      id: "competition",
      label: "Creator competition",
      weight: 18,
      why: "Fewer creators on a product means less crowded feeds for your video.",
      evaluate: function (p) {
        if (p.creators === null) return { status: "unknown", note: "Count creators currently promoting this product." };
        /* Lower is better here, so this reads as ascending cutoffs rather than
           the descending `band` tables used by the other factors. */
        const res = {
          status: "observed",
          display: p.creators + " creators",
          ratio: p.creators <= 50 ? 1
            : p.creators <= 120 ? 0.85
            : p.creators <= 200 ? 0.65
            : p.creators <= 350 ? 0.4
            : p.creators <= 600 ? 0.2
            : 0.05
        };
        if (p.creators <= 5 && (p.growth === null || p.growth <= 0)) {
          res.note = "Almost no creators and no growth signal — could be untested rather than untapped.";
        } else if (p.creators > 600) {
          res.note = "Saturated. You are competing with an established content pile.";
        }
        return res;
      }
    },
    {
      id: "price",
      label: "Price band",
      weight: 12,
      why: "Impulse range converts best. Very cheap starves the payout; very expensive stalls checkout.",
      evaluate: function (p) {
        if (p.price === null) return { status: "unknown", note: "Enter the current listed price." };
        const v = p.price;
        const ratio = v >= 25 && v <= 120 ? 1
          : (v >= 15 && v < 25) || (v > 120 && v <= 200) ? 0.7
          : (v >= 8 && v < 15) || (v > 200 && v <= 350) ? 0.4
          : 0.15;
        return {
          status: "observed",
          ratio: ratio,
          display: "$" + v.toFixed(2),
          note: v > 200 ? "Above the short-form impulse range — expect lower conversion." : (v < 15 ? "Low ticket — payout depends entirely on volume." : null)
        };
      }
    },
    {
      id: "brandMatch",
      label: "Seller authenticity",
      weight: 10,
      why: "Promoting an unauthorized reseller risks takedowns and unpaid commission.",
      evaluate: function (p) {
        if (p.brandMatch === null) return { status: "unknown", note: "Verify the shop name against the official brand." };
        return {
          status: "observed",
          ratio: p.brandMatch ? 1 : 0,
          display: p.brandMatch ? "Brand matches shop" : "Brand does NOT match shop",
          note: p.brandMatch ? null : "Do not promote until you have confirmed the seller is authorized."
        };
      }
    },
    {
      id: "adSupport",
      label: "Brand ad support",
      weight: 9,
      why: "Brand-side ad spend warms the audience your organic video lands on.",
      evaluate: function (p) {
        if (p.adsActive === null) return { status: "unknown", note: "Check whether the brand is running paid placements." };
        return {
          status: "observed",
          ratio: p.adsActive ? 1 : 0.15,
          display: p.adsActive ? "Ads running" : "No ads detected"
        };
      }
    },
    {
      id: "reputation",
      label: "Rating",
      weight: 8,
      why: "Low-rated products generate refunds and clawed-back commission.",
      evaluate: function (p) {
        if (p.rating === null) return { status: "unknown", note: "Enter the listing's star rating." };
        const ratio = p.rating >= 4.6 ? 1
          : p.rating >= 4.3 ? 0.8
          : p.rating >= 4.0 ? 0.55
          : p.rating >= 3.5 ? 0.25
          : 0.05;
        const res = {
          status: "observed",
          ratio: ratio,
          display: p.rating.toFixed(1) + " stars" + (p.reviews !== null ? " (" + p.reviews.toLocaleString("en-US") + " reviews)" : "")
        };
        if (p.rating < 4.0) res.note = "Below 4.0 — expect returns and commission reversals.";
        else if (p.reviews !== null && p.reviews < 20) res.note = "Very few reviews — the rating is not yet reliable.";
        return res;
      }
    }
  ];

  const TOTAL_WEIGHT = FACTORS.reduce(function (a, f) { return a + f.weight; }, 0);

  function rate(score, confidence) {
    if (confidence < 0.4) return { label: "Not enough data", tone: "unknown" };
    if (score >= 80) return { label: "Strong candidate", tone: "strong" };
    if (score >= 60) return { label: "Test candidate", tone: "test" };
    if (score >= 40) return { label: "Weak candidate", tone: "weak" };
    return { label: "Skip for now", tone: "skip" };
  }

  function score(product) {
    const breakdown = [];
    let earned = 0;
    let available = 0;

    FACTORS.forEach(function (f) {
      const r = f.evaluate(product) || { status: "unknown" };
      const row = {
        id: f.id,
        label: f.label,
        why: f.why,
        weight: f.weight,
        status: r.status,
        display: r.display || null,
        note: r.note || null,
        ratio: r.status === "observed" ? Math.max(0, Math.min(1, r.ratio)) : null
      };
      row.points = row.ratio === null ? 0 : row.ratio * f.weight;
      if (r.status === "observed") {
        earned += row.points;
        available += f.weight;
      }
      breakdown.push(row);
    });

    const confidence = TOTAL_WEIGHT ? available / TOTAL_WEIGHT : 0;
    const raw = available > 0 ? (earned / available) * 100 : 0;
    let value = Math.round(raw);

    const flags = [];
    const dollars = commissionDollars(product);

    if (product.brandMatch === false) {
      flags.push({ level: "block", message: "Seller does not match the brand. Verify authorization before promoting — score capped at 39." });
      value = Math.min(value, 39);
    }
    if (dollars !== null && dollars < 2) {
      flags.push({ level: "warn", message: "Payout is under $2 per sale. At a 2% click-through and 3% conversion, 10,000 views earns about $" + (10000 * 0.02 * 0.03 * dollars).toFixed(2) + "." });
    }
    if (product.creators !== null && product.creators > 600) {
      flags.push({ level: "warn", message: "Over 600 creators are already posting this product." });
    }
    if (product.growth !== null && product.growth < 0) {
      flags.push({ level: "warn", message: "Sales are trending down over the last 7 days." });
    }
    if (confidence < 0.6) {
      const missing = breakdown.filter(function (b) { return b.status === "unknown"; }).map(function (b) { return b.label; });
      flags.push({ level: "info", message: "Only " + Math.round(confidence * 100) + "% of the rubric could be evaluated. Missing: " + missing.join(", ") + "." });
    }

    return {
      value: value,
      rating: rate(value, confidence),
      confidence: confidence,
      confidencePct: Math.round(confidence * 100),
      earned: Math.round(earned * 10) / 10,
      available: available,
      totalWeight: TOTAL_WEIGHT,
      commissionDollars: dollars,
      breakdown: breakdown,
      flags: flags
    };
  }

  /* Clearly an INFERRED projection, not observed data. The UI labels it as such. */
  function projectEarnings(dollarsPerSale, opts) {
    const o = opts || {};
    const views = o.views === undefined ? 10000 : o.views;
    const ctr = o.ctr === undefined ? 0.02 : o.ctr;
    const cvr = o.cvr === undefined ? 0.03 : o.cvr;
    if (dollarsPerSale === null || !Number.isFinite(dollarsPerSale)) return null;
    const clicks = views * ctr;
    const orders = clicks * cvr;
    return {
      views: views,
      ctr: ctr,
      cvr: cvr,
      clicks: Math.round(clicks),
      orders: Math.round(orders * 10) / 10,
      revenue: Math.round(orders * dollarsPerSale * 100) / 100,
      basis: "inferred"
    };
  }

  return {
    FACTORS: FACTORS,
    TOTAL_WEIGHT: TOTAL_WEIGHT,
    commissionDollars: commissionDollars,
    score: score,
    projectEarnings: projectEarnings
  };
});
