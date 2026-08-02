/* Input parsing and validation.

   The single most important rule here: a BLANK field is `null` (unknown), not 0.
   The original MVP collapsed both to 0, so "I don't know the growth rate" scored
   identically to "growth is flat" — and the score gave no hint which had happened. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else (root.TSVF = root.TSVF || {}).Validation = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const NUMERIC_FIELDS = {
    price: { label: "Price", min: 0, max: 100000, hint: "in dollars" },
    commission: { label: "Commission", min: 0, max: 100, hint: "percent, 0-100" },
    growth: { label: "7-day growth", min: -100, max: 100000, hint: "percent" },
    creators: { label: "Creator count", min: 0, max: 1000000, integer: true },
    rating: { label: "Rating", min: 0, max: 5, hint: "0-5 stars" },
    reviews: { label: "Review count", min: 0, max: 100000000, integer: true }
  };

  const MAX_TEXT = 400;
  const MAX_LINES = 12;

  function parseNumber(raw, spec) {
    if (raw === null || raw === undefined) return { value: null, error: null };
    const s = String(raw).trim().replace(/[$,%\s]/g, "").replace(/,/g, "");
    if (s === "") return { value: null, error: null };
    const n = Number(s);
    if (!Number.isFinite(n)) {
      return { value: null, error: spec.label + " must be a number." };
    }
    if (spec.integer && !Number.isInteger(n)) {
      return { value: Math.round(n), error: null, warning: spec.label + " rounded to " + Math.round(n) + "." };
    }
    if (n < spec.min) return { value: null, error: spec.label + " cannot be below " + spec.min + "." };
    if (n > spec.max) return { value: null, error: spec.label + " cannot be above " + spec.max + "." };
    return { value: n, error: null };
  }

  function cleanText(raw, max) {
    if (raw === null || raw === undefined) return "";
    return String(raw).replace(/\s+/g, " ").trim().slice(0, max || MAX_TEXT);
  }

  function cleanLines(raw) {
    if (!raw) return [];
    return String(raw)
      .split(/\r?\n/)
      .map(function (x) { return cleanText(x, 200); })
      .filter(Boolean)
      .slice(0, MAX_LINES);
  }

  /* Accepts a loose object of raw strings; returns a normalized product plus
     everything that went wrong, so the UI can show errors next to the field. */
  function normalize(raw) {
    const errors = [];
    const warnings = [];
    const product = {};

    Object.keys(NUMERIC_FIELDS).forEach(function (key) {
      const res = parseNumber(raw[key], NUMERIC_FIELDS[key]);
      product[key] = res.value;
      if (res.error) errors.push({ field: key, message: res.error });
      if (res.warning) warnings.push({ field: key, message: res.warning });
    });

    product.productName = cleanText(raw.productName, 120);
    product.brand = cleanText(raw.brand, 80);
    product.offer = cleanText(raw.offer, 240);
    product.audience = cleanText(raw.audience, 160);
    product.problem = cleanText(raw.problem, 200);
    product.objection = cleanText(raw.objection, 200);
    product.benefits = cleanLines(raw.benefits);

    /* Tri-state: true / false / null. A checkbox the user never touched is an
       unverified claim, not a negative one. The UI uses three-way selects. */
    product.adsActive = triState(raw.adsActive);
    product.brandMatch = triState(raw.brandMatch);

    if (!product.productName) {
      errors.push({ field: "productName", message: "Product name is required." });
    }
    if (product.commission !== null && product.commission > 50) {
      warnings.push({ field: "commission", message: "Commission above 50% is unusual — double-check the listing." });
    }
    if (!product.benefits.length) {
      warnings.push({ field: "benefits", message: "Add at least one benefit — generated copy is much weaker without it." });
    }

    return { product: product, errors: errors, warnings: warnings, ok: errors.length === 0 };
  }

  function triState(v) {
    if (v === true || v === "true" || v === "yes") return true;
    if (v === false || v === "false" || v === "no") return false;
    return null;
  }

  return {
    NUMERIC_FIELDS: NUMERIC_FIELDS,
    parseNumber: parseNumber,
    cleanText: cleanText,
    cleanLines: cleanLines,
    triState: triState,
    normalize: normalize
  };
});
