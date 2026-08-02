/* AI image / video prompt construction.

   The original emitted one image prompt and one video prompt, reused verbatim
   across all 10 videos — so the CSV shipped the same prompt ten times. Here each
   video gets its own shot angle, and the fidelity constraints (which are the part
   that actually stops a generator from mangling a real product) are factored out
   so they stay consistent. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else (root.TSVF = root.TSVF || {}).Prompts = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const FIDELITY = "Preserve the real product exactly: shape, proportions, logo placement, control layout, materials, textures and colours must match the reference. Do not redesign, restyle, add or remove parts.";

  const NEGATIVE = [
    "warped or morphing product geometry",
    "invented or altered branding, logos or label text",
    "extra buttons, ports, seams or accessories",
    "floating or detached components",
    "melting, bending, leaking or self-opening behaviour",
    "distorted hands or extra fingers",
    "watermarks, captions or generated on-screen text",
    "cluttered or distracting background"
  ];

  const ANGLES = [
    { id: "hero", label: "Hero", direction: "Centred hero shot at eye level, product filling the middle third of the frame." },
    { id: "in-use", label: "In use", direction: "Product mid-use in a real setting, hands partially visible, natural interaction." },
    { id: "detail", label: "Detail", direction: "Tight detail shot on the feature that delivers the main benefit, shallow depth of field." },
    { id: "context", label: "Context", direction: "Wider environmental shot showing where the product lives day to day." },
    { id: "flat-lay", label: "Flat lay", direction: "Overhead flat lay with everything included in the box arranged cleanly." },
    { id: "before-after", label: "Result", direction: "The finished result the product produces, product just in frame at the edge." }
  ];

  function setting(product) {
    if (product.audience) return "a clean, believable space belonging to " + product.audience;
    return "a clean, believable everyday setting";
  }

  function imagePrompt(product, angle) {
    const a = angle || ANGLES[0];
    const benefits = (product.benefits && product.benefits.length)
      ? product.benefits.join("; ")
      : "its main practical benefit";
    const named = product.brand
      ? "the " + product.productName + " by " + product.brand
      : "the " + product.productName;

    return [
      "Photorealistic vertical 9:16 product photograph of " + named + ".",
      a.direction,
      "Setting: " + setting(product) + ".",
      FIDELITY,
      "Lighting: soft natural window light with realistic contact shadows. Premium commercial product photography, uncluttered composition, shallow but natural depth of field.",
      "Communicate visually: " + benefits + ".",
      "Avoid: " + NEGATIVE.join(", ") + "."
    ].join(" ");
  }

  function videoPrompt(product, angle) {
    const a = angle || ANGLES[0];
    return [
      "Animate this still into a 5-second vertical 9:16 clip.",
      "Camera: slow cinematic push-in with a slight handheld drift, constant focal length, no whip pans or cuts.",
      "Subject: the product stays geometrically stable for the entire clip — " + FIDELITY,
      "Motion allowed: ambient light shift, faint dust motes, natural fabric or steam movement.",
      "Motion forbidden: the product bending, morphing, melting, leaking, opening by itself, changing label text or drifting in scale.",
      "No added text, no new hands entering frame, no scene change.",
      "Shot intent: " + a.direction,
      "End on a clean, still final frame so the clip can be duplicated and reversed into a seamless 10-second loop."
    ].join(" ");
  }

  function voiceover(product, video) {
    const lines = [video.hook];
    if (product.benefits && product.benefits.length) {
      lines.push("What it actually does: " + product.benefits[0].replace(/\.$/, "") + ".");
    }
    lines.push(video.cta);
    return lines.join(" ");
  }

  /* One prompt set per video, cycling angles so a 10-video pack yields visual variety. */
  function buildFor(product, videos) {
    return videos.map(function (v, i) {
      const angle = ANGLES[i % ANGLES.length];
      return {
        n: v.n,
        angle: angle.id,
        angleLabel: angle.label,
        image: imagePrompt(product, angle),
        video: videoPrompt(product, angle),
        overlay: "TOP: " + v.overlay.top + "\nBOTTOM: " + v.overlay.bottom,
        voiceover: voiceover(product, v)
      };
    });
  }

  return {
    FIDELITY: FIDELITY,
    NEGATIVE: NEGATIVE,
    ANGLES: ANGLES,
    imagePrompt: imagePrompt,
    videoPrompt: videoPrompt,
    voiceover: voiceover,
    buildFor: buildFor
  };
});
