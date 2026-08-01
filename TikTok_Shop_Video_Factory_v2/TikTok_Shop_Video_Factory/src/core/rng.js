/* Deterministic pseudo-randomness.
   Same product name => same variant set, every time. Reshuffling bumps the salt. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else (root.TSVF = root.TSVF || {}).Rng = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /* cyrb53 — fast, well-distributed 53-bit string hash. */
  function hash(str, seed) {
    let h1 = 0xdeadbeef ^ (seed || 0);
    let h2 = 0x41c6ce57 ^ (seed || 0);
    const s = String(str);
    for (let i = 0; i < s.length; i++) {
      const ch = s.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  }

  /* mulberry32 — small, fast, good enough for copy variation. */
  function create(seedInput) {
    let a = (typeof seedInput === "number" ? seedInput : hash(seedInput, 0)) >>> 0;
    function next() {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    return {
      next: next,
      int: function (maxExclusive) {
        return Math.floor(next() * maxExclusive);
      },
      pick: function (list) {
        if (!list || !list.length) return undefined;
        return list[Math.floor(next() * list.length)];
      },
      shuffle: function (list) {
        const out = list.slice();
        for (let i = out.length - 1; i > 0; i--) {
          const j = Math.floor(next() * (i + 1));
          const tmp = out[i];
          out[i] = out[j];
          out[j] = tmp;
        }
        return out;
      }
    };
  }

  return { hash: hash, create: create };
});
