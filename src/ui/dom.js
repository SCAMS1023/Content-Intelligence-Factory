/* Safe DOM construction.

   The original built output with `innerHTML` and interpolated the product name
   straight into it, so typing <img src=x onerror=alert(1)> into the name field
   executed script on generate. Nothing in this app writes user data as markup:
   text goes through textContent, and elements are built as nodes. */
(function (root, factory) {
  (root.TSVF = root.TSVF || {}).Dom = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";

  function append(node, child) {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) {
      child.forEach(function (c) { append(node, c); });
      return;
    }
    node.appendChild(child.nodeType ? child : document.createTextNode(String(child)));
  }

  /* el("div", {class: "x", onclick: fn}, ["text", el("b", {}, "bold")]) */
  function el(tag, props, children) {
    const node = document.createElement(tag);
    const p = props || {};

    Object.keys(p).forEach(function (key) {
      const value = p[key];
      if (value === null || value === undefined || value === false) return;

      if (key === "class" || key === "className") {
        node.className = value;
      } else if (key === "text") {
        node.textContent = String(value);
      } else if (key === "dataset") {
        Object.keys(value).forEach(function (d) { node.dataset[d] = value[d]; });
      } else if (key === "style" && typeof value === "object") {
        Object.keys(value).forEach(function (s) { node.style.setProperty(s, value[s]); });
      } else if (key.slice(0, 2) === "on" && typeof value === "function") {
        node.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key === "value") {
        node.value = value;
      } else if (value === true) {
        node.setAttribute(key, "");
      } else {
        node.setAttribute(key, String(value));
      }
    });

    append(node, children);
    return node;
  }

  function svg(tag, props, children) {
    const node = document.createElementNS(SVG_NS, tag);
    const p = props || {};
    Object.keys(p).forEach(function (k) {
      if (p[k] !== null && p[k] !== undefined && p[k] !== false) node.setAttribute(k, String(p[k]));
    });
    (children || []).forEach(function (c) { node.appendChild(c); });
    return node;
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function replace(node, children) {
    clear(node);
    append(node, children);
    return node;
  }

  function $(id) { return document.getElementById(id); }
  function $$(sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); }

  /* navigator.clipboard is unavailable on file:// in most browsers — this app is
     specifically meant to run by double-clicking index.html, so the fallback is
     the path that actually runs for most users, not an edge case. */
  function copyText(value) {
    return new Promise(function (resolve) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(function () { resolve(true); }, function () {
          resolve(legacyCopy(value));
        });
      } else {
        resolve(legacyCopy(value));
      }
    });
  }

  function legacyCopy(value) {
    try {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch (e) {
      return false;
    }
  }

  function download(filename, content, mime) {
    const blob = new Blob([content], { type: mime + ";charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: filename, style: { display: "none" } });
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1500);
  }

  return { el: el, svg: svg, clear: clear, replace: replace, append: append, $: $, $$: $$, copyText: copyText, download: download };
});
