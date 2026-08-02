/* Content generation.

   The original MVP emitted 10 fixed sentences with the product name substituted
   in, plus 10 unrelated captions. Two problems: every product produced literally
   identical copy, and several templates invented urgency ("this is the last day",
   "TikTok quietly dropped...") that the app's own checklist told you not to claim.

   This version builds 10 complete, shootable video units. Each one pairs a hook
   archetype with a matched caption, a three-beat shot script, overlay text, a
   b-roll note and a CTA — and every template is written to survive the compliance
   scanner in compliance.js. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./rng.js"));
  } else {
    const T = (root.TSVF = root.TSVF || {});
    T.Content = factory(T.Rng);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (Rng) {
  "use strict";

  const ARCHETYPES = [
    {
      id: "curiosity",
      label: "Curiosity gap",
      intent: "Open a loop the viewer needs closed. Withhold the payoff for two seconds.",
      hooks: [
        "I did not expect the {product} to {benefitVerb}.",
        "Nobody mentioned this part of the {product}.",
        "Three days with the {product} and one thing surprised me."
      ],
      captions: [
        "The part I did not expect from the {product}.",
        "Took me a few days to notice this one. {product}"
      ],
      beats: {
        hook: "Hold the {product} just off-centre, half out of frame. Say the hook before it is fully visible.",
        proof: "Reveal the product and demonstrate it in real time — {benefitLower}. No cuts.",
        cta: "Rest the product down, look at camera: \"Details are on the product page.\""
      },
      broll: "Slow reveal from behind an everyday object — keeps the loop open.",
      overlayTop: "wait for it",
      overlayBottom: "{product}"
    },
    {
      id: "objection",
      label: "Objection handling",
      intent: "Name the hesitation out loud before the viewer thinks it. Trust follows.",
      hooks: [
        "I almost skipped the {product} because {objection}.",
        "{objectionCap} — that is what stopped me buying the {product}.",
        "Honest answer on whether the {product} is worth it."
      ],
      captions: [
        "If {objection} is what is stopping you too. {product}",
        "The honest version. {product}"
      ],
      beats: {
        hook: "Talk straight to camera, product visible but not held up. State the objection.",
        proof: "Cut to the product in use — {benefitLower}. Address the objection directly over the top.",
        cta: "\"Check the listing and decide for yourself.\""
      },
      broll: "Unpolished handheld. Over-produced footage undercuts an honesty angle.",
      overlayTop: "{objectionCap}?",
      overlayBottom: "here is the honest answer"
    },
    {
      id: "deal-check",
      label: "Price / coupon check",
      intent: "Point at a verifiable offer. Never invent a deadline.",
      hooks: [
        "Check the coupon before you buy the {product}.",
        "If the {product} is already on your list, check the current price first.",
        "Quick price check on the {product}."
      ],
      captions: [
        "Worth checking the current offer. {product}",
        "Prices move — check before you tap. {product}"
      ],
      beats: {
        hook: "Product centre frame, price overlay visible. Say the hook flat and factual.",
        proof: "Show what you actually get for the money — every included part, laid out.",
        cta: "\"Current price and any coupon are on the product page.\""
      },
      broll: "Flat lay of everything in the box. Reads as value without a claim.",
      overlayTop: "check the coupon",
      overlayBottom: "price shown on the listing"
    },
    {
      id: "social-proof",
      label: "Feed saturation",
      intent: "Borrow the credibility of repeat exposure the viewer has already had.",
      hooks: [
        "The {product} kept showing up on my feed, so I looked into it.",
        "Everyone in {audience} seems to have the {product} right now.",
        "I gave in and tried the {product} everyone is posting."
      ],
      captions: [
        "Finally tried the one that keeps showing up. {product}",
        "{audienceCap} — you have seen this one already."
      ],
      beats: {
        hook: "Scroll-style opening: product already in hand as if mid-conversation.",
        proof: "Demonstrate the main thing it does: {benefitLower}. Let it run long enough to be convincing.",
        cta: "\"Product page has the current details.\""
      },
      broll: "Casual, in-the-moment framing. Should not look scheduled.",
      overlayTop: "seen this one everywhere",
      overlayBottom: "so I tried it"
    },
    {
      id: "problem",
      label: "Problem first",
      intent: "Lead with the pain. The product arrives as the resolution, not the subject.",
      hooks: [
        "If {problem}, this is worth two minutes of your time.",
        "{problemCap}. That is the whole reason I got the {product}.",
        "Still dealing with {problem}? Watch this bit."
      ],
      captions: [
        "For anyone dealing with {problem}. {product}",
        "This fixed the annoying part. {product}"
      ],
      beats: {
        hook: "Show the problem happening. Do not show the product yet.",
        proof: "Introduce the {product} and resolve the problem on camera — {benefitLower}.",
        cta: "\"Everything about it is on the product page.\""
      },
      broll: "The problem shot matters more than the product shot. Make it recognisable.",
      overlayTop: "{problemCap}",
      overlayBottom: "this helped"
    },
    {
      id: "myth-bust",
      label: "Assumption flip",
      intent: "Overturn a belief the viewer holds. Flip an assumption, do not attack a competitor.",
      hooks: [
        "You do not need a complicated setup to {benefitVerb}.",
        "I assumed the {product} would be more effort than it is.",
        "The thing I got wrong about the {product}."
      ],
      captions: [
        "Turns out it is simpler than I thought. {product}",
        "Corrected my own assumption on this one. {product}"
      ],
      beats: {
        hook: "State the assumption to camera with visible confidence.",
        proof: "Immediately contradict it on screen in one unbroken take — {benefitLower}.",
        cta: "\"Judge it from the listing yourself.\""
      },
      broll: "One continuous shot for the contradiction. Cuts read as hiding something.",
      overlayTop: "what I got wrong",
      overlayBottom: "{product}"
    },
    {
      id: "demo",
      label: "Straight demo",
      intent: "No angle. The product doing its job is the whole video.",
      hooks: [
        "Here is the {product} doing the thing, start to finish.",
        "Ten seconds of the {product}, no talking.",
        "{productCap}, unedited."
      ],
      captions: [
        "Just the product doing the thing. {product}",
        "No edits, no talking. {product}"
      ],
      beats: {
        hook: "Product already in motion at frame one. No introduction.",
        proof: "Full uninterrupted run — {benefitLower}. Let the audio be the real sound.",
        cta: "End on the finished result, held still for one second."
      },
      broll: "Locked-off tripod. Real product audio, no music bed.",
      overlayTop: "no edits",
      overlayBottom: "{product}"
    },
    {
      id: "pov",
      label: "POV",
      intent: "Put the viewer inside the moment rather than watching a review.",
      hooks: [
        "POV: you finally stopped putting off {problem}.",
        "POV: the {product} arrived and you are opening it now.",
        "POV: this is the bit of your day the {product} changed."
      ],
      captions: [
        "That specific feeling. {product}",
        "POV for anyone who waited too long. {product}"
      ],
      beats: {
        hook: "First-person camera height. Hands in frame, face out.",
        proof: "Carry the POV through the moment it earns its place — {benefitLower} — without breaking eyeline.",
        cta: "Set the product down in frame and hold."
      },
      broll: "Chest-height camera throughout. Breaking POV kills the format.",
      overlayTop: "POV",
      overlayBottom: "{problemCap}"
    },
    {
      id: "audience-callout",
      label: "Audience callout",
      intent: "Filter hard in the first second. A narrower callout holds better.",
      hooks: [
        "{audienceCap} — this one is for you.",
        "If you are {audience}, stop scrolling for ten seconds.",
        "Made for {audience}, and it shows."
      ],
      captions: [
        "{audienceCap}, this is your one. {product}",
        "Tagging the people this is actually for. {product}"
      ],
      beats: {
        hook: "Point at the lens on the callout word. Direct address.",
        proof: "Show the single most relevant use for that audience — {benefitLower}.",
        cta: "\"Product page has the rest.\""
      },
      broll: "Set dressing should visibly belong to the audience you named.",
      overlayTop: "{audienceCap}",
      overlayBottom: "this one is for you"
    },
    {
      id: "expectation",
      label: "Expectation vs reality",
      intent: "Set a frame, then break it. The gap is the retention.",
      hooks: [
        "What I expected from the {product} versus what showed up.",
        "The {product}: what the listing shows and what you actually get.",
        "Expectation and reality on the {product}."
      ],
      captions: [
        "Expectation vs what turned up. {product}",
        "Side by side, honestly. {product}"
      ],
      beats: {
        hook: "Split screen or hard cut. Expectation on the left, reality on the right.",
        proof: "Hold on reality longer than expectation — {benefitLower} — in the real half.",
        cta: "\"Full details on the product page.\""
      },
      broll: "Match framing across both halves or the comparison does not land.",
      overlayTop: "expectation",
      overlayBottom: "reality"
    }
  ];

  const GENERIC_HASHTAGS = [
    "tiktokshop", "tiktokfinds", "tiktokmademebuyit", "founditontiktok",
    "shopwithme", "smallbusinessfinds", "dealsoftiktok", "musthaves"
  ];

  function lowerFirst(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  function upperFirst(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  /* Turn "Makes frozen desserts at home" into something that reads after
     "I did not expect the X to ..." */
  function toVerbPhrase(benefit) {
    if (!benefit) return "do what it does";
    let b = lowerFirst(benefit.trim().replace(/\.$/, ""));
    b = b.replace(/^(it |this |the product )/, "");
    b = b.replace(/^makes\b/, "make")
         .replace(/^does\b/, "do")
         .replace(/^gives\b/, "give")
         .replace(/^helps\b/, "help")
         .replace(/^saves\b/, "save")
         .replace(/^keeps\b/, "keep")
         .replace(/^works\b/, "work")
         .replace(/^lets\b/, "let")
         .replace(/^has\b/, "have")
         .replace(/^is\b/, "be");
    return b;
  }

  function buildContext(product, index) {
    const benefits = product.benefits && product.benefits.length ? product.benefits : [];
    const primary = benefits.length ? benefits[index % benefits.length] : "";
    const secondary = benefits.length > 1 ? benefits[(index + 1) % benefits.length] : primary;
    const name = product.productName || "this product";
    const audience = product.audience || "";
    const problem = product.problem || "";
    const objection = product.objection || "";

    return {
      product: name,
      productCap: upperFirst(name),
      brand: product.brand || "",
      benefit: primary || "what it is designed to do",
      /* Benefits are typed capitalised ("Makes frozen desserts at home"), so any
         template that splices one mid-sentence must use the lowered form. */
      benefitLower: lowerFirst((primary || "what it is designed to do").replace(/\.$/, "")),
      benefit2: secondary || primary || "what it is designed to do",
      benefitVerb: toVerbPhrase(primary),
      audience: audience ? lowerFirst(audience) : "people who have been looking at this",
      audienceCap: upperFirst(audience || "If this is on your list"),
      problem: problem ? lowerFirst(problem.replace(/\.$/, "")) : "this has been on your list for a while",
      problemCap: upperFirst(problem.replace(/\.$/, "") || "Been putting this off"),
      objection: objection ? lowerFirst(objection.replace(/\.$/, "")) : "I was not sure it was worth it",
      objectionCap: upperFirst(objection.replace(/\.$/, "") || "Not sure it is worth it"),
      offer: product.offer || "",
      price: product.price === null || product.price === undefined ? "" : "$" + product.price.toFixed(2)
    };
  }

  /* Replaces {token} with ctx[token]. Any unknown token collapses to empty and
     the surrounding whitespace is tidied, so no template can ever ship a literal
     "{benefit}" or a double space to the user. Covered by tests. */
  function fill(template, ctx) {
    if (!template) return "";
    return String(template)
      .replace(/\{(\w+)\}/g, function (match, key) {
        const v = ctx[key];
        return v === undefined || v === null ? "" : String(v);
      })
      .replace(/\s{2,}/g, " ")
      .replace(/\s+([.,!?;:])/g, "$1")
      .trim();
  }

  function hashtags(product, rng) {
    const words = String(product.productName || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(function (w) { return w.length > 2; });

    const specific = [];
    if (words.length) specific.push(words.join(""));
    if (product.brand) specific.push(String(product.brand).toLowerCase().replace(/[^a-z0-9]/g, ""));
    words.slice(0, 2).forEach(function (w) { specific.push(w); });

    const pool = rng.shuffle(GENERIC_HASHTAGS).slice(0, 4);
    const all = specific.concat(pool).filter(Boolean);
    const seen = {};
    return all.filter(function (t) {
      if (seen[t] || !t) return false;
      seen[t] = true;
      return true;
    }).slice(0, 7).map(function (t) { return "#" + t; });
  }

  function ctaFor(product) {
    return product.offer
      ? "Check the product page — " + lowerFirst(product.offer.replace(/\.$/, "")) + "."
      : "Check the product page for the current price and availability.";
  }

  /* Returns 10 complete video units. `salt` reshuffles variant selection without
     changing which archetypes are used. */
  function buildVideos(product, salt) {
    const seedBase = (product.productName || "untitled") + "::" + (salt || 0);
    const videos = [];

    ARCHETYPES.forEach(function (arch, i) {
      const rng = Rng.create(seedBase + "::" + arch.id);
      const ctx = buildContext(product, i);
      const hook = fill(rng.pick(arch.hooks), ctx);

      videos.push({
        n: i + 1,
        archetype: arch.id,
        archetypeLabel: arch.label,
        intent: arch.intent,
        hook: hook,
        caption: fill(rng.pick(arch.captions), ctx) + (product.offer ? " " + product.offer : ""),
        script: [
          { t: "0:00–0:02", role: "Hook", direction: fill(arch.beats.hook, ctx), line: hook },
          { t: "0:02–0:07", role: "Proof", direction: fill(arch.beats.proof, ctx), line: fill("Show, do not say: {benefit}.", ctx) },
          { t: "0:07–0:10", role: "CTA", direction: fill(arch.beats.cta, ctx), line: ctaFor(product) }
        ],
        overlay: {
          top: fill(arch.overlayTop, ctx),
          bottom: fill(arch.overlayBottom, ctx)
        },
        broll: fill(arch.broll, ctx),
        cta: ctaFor(product),
        hashtags: hashtags(product, Rng.create(seedBase + "::tags::" + arch.id))
      });
    });

    return videos;
  }

  function postingPlan(videos) {
    /* Two posts a day, alternating archetype family, so you are not testing two
       similar angles back to back. */
    const order = [0, 6, 1, 8, 4, 2, 7, 9, 3, 5];
    return order.map(function (idx, i) {
      return {
        slot: i + 1,
        day: Math.floor(i / 2) + 1,
        time: i % 2 === 0 ? "morning" : "evening",
        video: videos[idx] ? videos[idx].n : null,
        archetype: videos[idx] ? videos[idx].archetypeLabel : null
      };
    });
  }

  return {
    ARCHETYPES: ARCHETYPES,
    toVerbPhrase: toVerbPhrase,
    buildContext: buildContext,
    fill: fill,
    hashtags: hashtags,
    buildVideos: buildVideos,
    postingPlan: postingPlan
  };
});
