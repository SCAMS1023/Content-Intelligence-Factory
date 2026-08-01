/* Product library persistence.

   The original had none — a refresh threw away everything you had typed. This
   keeps a draft of the form and a library of scored products in localStorage.

   Deletes are soft: removed entries go to a trash bucket so the UI can offer an
   undo, and nothing is destroyed until the trash is explicitly emptied. The
   storage backend is injectable so it can be tested without a browser. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else (root.TSVF = root.TSVF || {}).Store = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const KEYS = {
    library: "tsvf.library.v2",
    trash: "tsvf.trash.v2",
    draft: "tsvf.draft.v2",
    prefs: "tsvf.prefs.v2"
  };

  const MAX_LIBRARY = 200;
  const MAX_TRASH = 40;

  function memoryStorage() {
    const map = {};
    return {
      __memory: true,
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null; },
      setItem: function (k, v) { map[k] = String(v); },
      removeItem: function (k) { delete map[k]; }
    };
  }

  function create(backend) {
    let store = backend;
    if (!store) {
      try {
        /* Probe rather than trust: private-mode Safari exposes localStorage but
           throws on write, and file:// pages can have it disabled entirely. */
        const probe = "__tsvf_probe__";
        globalThis.localStorage.setItem(probe, "1");
        globalThis.localStorage.removeItem(probe);
        store = globalThis.localStorage;
      } catch (e) {
        store = memoryStorage();
      }
    }

    let lastError = null;

    function read(key, fallback) {
      try {
        const raw = store.getItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        return parsed === null || parsed === undefined ? fallback : parsed;
      } catch (e) {
        lastError = e;
        return fallback;
      }
    }

    function write(key, value) {
      try {
        store.setItem(key, JSON.stringify(value));
        lastError = null;
        return true;
      } catch (e) {
        lastError = e;
        return false;
      }
    }

    function id() {
      return "p_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
    }

    /* Stores a compact summary, not the whole pack — a library of 200 full packs
       would blow the ~5MB localStorage budget. Packs are regenerated on open. */
    function summarize(pack) {
      return {
        id: pack.id || id(),
        savedAt: new Date().toISOString(),
        createdAt: pack.createdAt,
        salt: pack.salt || 0,
        product: pack.product,
        opportunity: {
          value: pack.opportunity.value,
          rating: pack.opportunity.rating,
          confidencePct: pack.opportunity.confidencePct,
          commissionDollars: pack.opportunity.commissionDollars,
          flags: pack.opportunity.flags
        },
        compliance: { counts: pack.compliance.counts, clean: pack.compliance.clean }
      };
    }

    return {
      keys: KEYS,
      lastError: function () { return lastError; },
      isPersistent: function () { return !!store && store.__memory !== true; },

      listLibrary: function () {
        const list = read(KEYS.library, []);
        return Array.isArray(list) ? list : [];
      },

      /* Same product name replaces its previous entry rather than duplicating. */
      savePack: function (pack) {
        const list = this.listLibrary();
        const entry = summarize(pack);
        const key = String(entry.product.productName || "").toLowerCase().trim();
        const idx = list.findIndex(function (e) {
          return String(e.product.productName || "").toLowerCase().trim() === key;
        });
        if (idx >= 0) {
          entry.id = list[idx].id;
          list[idx] = entry;
        } else {
          list.unshift(entry);
        }
        const trimmed = list.slice(0, MAX_LIBRARY);
        const ok = write(KEYS.library, trimmed);
        return { ok: ok, entry: entry, replaced: idx >= 0, error: ok ? null : String(lastError) };
      },

      getEntry: function (entryId) {
        return this.listLibrary().find(function (e) { return e.id === entryId; }) || null;
      },

      /* Soft delete. Returns the entry so the caller can offer an undo. */
      remove: function (entryId) {
        const list = this.listLibrary();
        const idx = list.findIndex(function (e) { return e.id === entryId; });
        if (idx < 0) return { ok: false, entry: null };
        const entry = list[idx];
        list.splice(idx, 1);
        write(KEYS.library, list);
        const trash = read(KEYS.trash, []);
        trash.unshift({ entry: entry, deletedAt: new Date().toISOString(), index: idx });
        write(KEYS.trash, trash.slice(0, MAX_TRASH));
        return { ok: true, entry: entry, index: idx };
      },

      restore: function (entryId) {
        const trash = read(KEYS.trash, []);
        const tIdx = trash.findIndex(function (t) { return t.entry && t.entry.id === entryId; });
        if (tIdx < 0) return { ok: false };
        const rec = trash[tIdx];
        trash.splice(tIdx, 1);
        write(KEYS.trash, trash);
        const list = this.listLibrary();
        const at = Math.min(rec.index === undefined ? 0 : rec.index, list.length);
        list.splice(at, 0, rec.entry);
        write(KEYS.library, list.slice(0, MAX_LIBRARY));
        return { ok: true, entry: rec.entry };
      },

      listTrash: function () {
        const t = read(KEYS.trash, []);
        return Array.isArray(t) ? t : [];
      },

      emptyTrash: function () { return write(KEYS.trash, []); },

      saveDraft: function (raw) { return write(KEYS.draft, raw); },
      loadDraft: function () { return read(KEYS.draft, null); },
      clearDraft: function () { try { store.removeItem(KEYS.draft); return true; } catch (e) { return false; } },

      getPrefs: function () { return read(KEYS.prefs, {}); },
      setPrefs: function (prefs) { return write(KEYS.prefs, prefs || {}); }
    };
  }

  return { KEYS: KEYS, create: create, memoryStorage: memoryStorage };
});
