/* Assembles the full production pack from a normalized product. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("./scoring.js"),
      require("./content.js"),
      require("./prompts.js"),
      require("./compliance.js")
    );
  } else {
    const T = (root.TSVF = root.TSVF || {});
    T.Pack = factory(T.Scoring, T.Content, T.Prompts, T.Compliance);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (Scoring, Content, Prompts, Compliance) {
  "use strict";

  const SCHEMA_VERSION = 2;

  function build(product, opts) {
    const o = opts || {};
    const salt = o.salt || 0;
    const videos = Content.buildVideos(product, salt);
    const prompts = Prompts.buildFor(product, videos);

    /* Attach each video's own prompt set so exports never repeat one prompt
       across all ten rows the way the original CSV did. */
    videos.forEach(function (v, i) { v.prompts = prompts[i]; });

    const opportunity = Scoring.score(product);
    const pack = {
      schemaVersion: SCHEMA_VERSION,
      createdAt: o.now || new Date().toISOString(),
      salt: salt,
      product: product,
      opportunity: opportunity,
      projection: Scoring.projectEarnings(opportunity.commissionDollars, o.projection),
      videos: videos,
      postingPlan: Content.postingPlan(videos),
      checklist: Compliance.CHECKLIST
    };

    pack.compliance = Compliance.scanPack(pack);
    return pack;
  }

  return { SCHEMA_VERSION: SCHEMA_VERSION, build: build };
});
