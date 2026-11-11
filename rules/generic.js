// Quiet Web generic fallback rule (always ordered last by the engine). Handles home-grown cookie banners that none of
// the platform rules recognise: it clicks ONLY a button whose label is a reject phrase (QuietPhrases, 8 languages) and
// that sits inside an element which is clearly a consent dialog: visible, mentions cookies/consent in that language,
// and is a dialog (role/aria-modal) or fixed/sticky positioned (itself or an ancestor). It never accepts, never opens
// settings and never hides anything.
(function (root) {
  "use strict";
  const rules = (root.QuietRules = root.QuietRules || []);

  // Cheap candidate query (re-run on DOM changes): dialogs plus elements whose id/class talks about cookies/consent.
  const CANDIDATES = [
    "[role=dialog]", "[role=alertdialog]", "[aria-modal=true]", "dialog[open]",
    "[id*=cookie i]", "[class*=cookie i]", "[id*=consent i]", "[class*=consent i]", "[id*=gdpr i]", "[class*=gdpr i]",
    "[id*=cmp i]", "[class*=cmp-]", "[id*=privacy i]", "[class*=privacy-banner i]", "[class*=cc-window]", "[id*=cookies i]",
  ].join(",");
  const payLike = (text) => (root.QuietPhrases ? root.QuietPhrases.isPayLike(text) : true); // shared guard (lib/reject-phrases.js)
  const MAX_CHARS = 6000;

  function positioned(win, el) {
    for (let n = el, i = 0; n && n.nodeType === 1 && i < 5; n = n.parentElement, i++) {
      let cs; try { cs = win.getComputedStyle(n); } catch (e) { return false; }
      if (cs.position === "fixed" || cs.position === "sticky") return true;
    }
    return false;
  }
  function isDialogEl(el) {
    const role = el.getAttribute && el.getAttribute("role");
    return role === "dialog" || role === "alertdialog" || el.getAttribute("aria-modal") === "true" || el.tagName === "DIALOG";
  }
  function shown(el, small) {
    try {
      if (typeof el.checkVisibility === "function" && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
      const r = el.getBoundingClientRect();
      return small ? r.width > 8 && r.height > 8 : r.width > 40 && r.height > 20;
    } catch (e) { return false; }
  }
  function findRejects(ph, dlg) { return ph.findRejectButtons(dlg); }

  // Plain reject buttons (pay-or-consent ones excluded); `paid` = reject-like buttons that are pay/subscribe options.
  function rejectButtons(ph, dlg) {
    const all = findRejects(ph, dlg).filter((h) => shown(h.el, true));
    return { ok: all.filter((h) => !payLike(h.text)), paid: all.filter((h) => payLike(h.text)) };
  }

  // Smallest consent dialog (so we do not pick <body>-sized wrappers) that has a usable reject button.
  function find(doc) {
    const ph = root.QuietPhrases;
    if (!ph || !doc.body) return null;
    try { if (/\/privacy-manager\//.test(doc.location.pathname)) return null; } catch (e) { /* ignore */ }
    let list;
    try { list = Array.from(doc.querySelectorAll(CANDIDATES)); } catch (e) { return null; }
    let best = null, bestLen = Infinity;
    for (const el of list.slice(0, 200)) {
      if (el === doc.body || el === doc.documentElement || !shown(el)) continue;
      const text = el.innerText || "";
      if (text.length < 25 || text.length > MAX_CHARS || bestLen <= text.length) continue;
      if (!ph.isConsentText(text, 25)) continue;
      if (!(isDialogEl(el) || positioned(doc.defaultView, el))) continue;
      const b = rejectButtons(ph, el);
      if (!b.ok.length && !b.paid.length) continue;
      best = { el, btns: b.ok, paid: b.paid.length }; bestLen = text.length;
    }
    return best;
  }

  rules.push({
    id: "generic",
    name: "Generic banner",
    detect(doc) { const f = find(doc); return f ? f.el : null; },
    async reject(ctx) {
      const f = find(ctx.doc);
      if (!f) return { outcome: "none", detail: "" };
      if (!f.btns.length) return { outcome: "none", detail: "pay-or-consent" };
      for (const h of f.btns) {
        if (ctx.click(h.el)) {
          return { outcome: "rejected", detail: h.text.slice(0, 80) };
        }
      }
      return { outcome: "none", detail: "" };
    },
    payLike,
    hideSelectors: [],
  });
})(globalThis);
