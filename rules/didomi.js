// Didomi notice. Written from live captures (tests/e2e/captures/didomi/).
// Order: "disagree" button (unless it is a pay/subscribe option) -> Configure, set every purpose to Disagree, Save -> hide.
(function (root) {
  "use strict";
  const rules = (root.QuietRules = root.QuietRules || []);
  const shown = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
  const PAY = { test: (s) => (root.QuietPhrases ? root.QuietPhrases.isPayLike(s) : true) }; // shared guard (lib/reject-phrases.js)
  rules.push({
    id: "didomi",
    name: "Didomi",
    detect(doc) {
      const host = doc.querySelector("#didomi-host");
      if (!host) return null;
      const el = host.querySelector("#didomi-popup, .didomi-popup-container, #didomi-notice");
      return shown(el) ? el : null;
    },
    async reject(ctx) {
      const doc = ctx.doc;
      const label = (b) => (b.getAttribute("aria-label") || "") + " " + (b.textContent || "");
      const dis = doc.querySelector("#didomi-notice-disagree-button, .didomi-continue-without-agreeing");
      // "Refuse and subscribe" (pay-or-consent): refusing there sends the visitor to a subscription page, so do nothing.
      if (dis && PAY.test(label(dis))) return { outcome: "none", detail: "pay-or-consent" };
      if (dis && ctx.click(dis)) return { outcome: "rejected", detail: "Disagree" };
      let save = doc.querySelector("#btn-toggle-save");
      if (!ctx.visible(save)) {
        const more = doc.querySelector("#didomi-notice-learn-more-button, .didomi-learn-more-button");
        if (!more || !ctx.click(more)) return { outcome: "none", detail: "" };
        save = await ctx.waitFor("#btn-toggle-save", 3000);
        if (!save) return { outcome: "none", detail: "" };
        await ctx.sleep(400);
      }
      // In the purposes list each toggle is a pair of radio-like buttons, "Disagree" first.
      let n = 0;
      for (const grp of doc.querySelectorAll("#didomi-host .didomi-components-radio")) {
        const opts = grp.querySelectorAll(".didomi-components-radio__option");
        if (opts.length >= 2 && opts[0].getAttribute("aria-pressed") !== "true" && ctx.click(opts[0], { force: true })) n++;
      }
      await ctx.sleep(300);
      if (ctx.click(save, { selection: true })) return { outcome: "saved-necessary", detail: "Disagreed to " + n + " purposes, saved" };
      return { outcome: "hidden", detail: "Could not save" };
    },
    hideSelectors: ["#didomi-host"],
  });
})(globalThis);
