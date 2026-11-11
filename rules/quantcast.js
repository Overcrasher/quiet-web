// Quantcast Choice / InMobi CMP (qc-cmp2). Written from live captures (tests/e2e/captures/quantcast/).
// First layer often has only "More options" + "Agree"; the second layer has #reject-all-btn.
// Pay-or-consent variants ("Reject and Pay") are never clicked.
(function (root) {
  "use strict";
  const rules = (root.QuietRules = root.QuietRules || []);
  const shown = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
  const PAY = { test: (s) => (root.QuietPhrases ? root.QuietPhrases.isPayLike(s) : true) }; // shared guard (lib/reject-phrases.js)
  rules.push({
    id: "quantcast",
    name: "Quantcast Choice",
    detect(doc) {
      const ui = doc.querySelector("#qc-cmp2-ui");
      return shown(ui) ? ui : null;
    },
    async reject(ctx) {
      const doc = ctx.doc;
      const ph = ctx.phrases;
      const text = (b) => (b.textContent || "").trim();
      const ui = () => doc.querySelector("#qc-cmp2-ui");
      const rejectIn = (container) => {
        const direct = container.querySelector("#reject-all-btn");
        if (direct) return PAY.test(text(direct)) ? null : direct;
        if (!ph) return null;
        return Array.from(container.querySelectorAll("button")).find((b) => ph.matchReject(text(b)) && !PAY.test(text(b))) || null;
      };
      const paid = ui() && ui().querySelector("#reject-all-btn");
      if (paid && PAY.test(text(paid))) return { outcome: "none", detail: "pay-or-consent" };
      let b = ui() && rejectIn(ui());
      if (b && ctx.click(b)) return { outcome: "rejected", detail: text(b) };
      const more = doc.querySelector("#more-options-btn") || (ui() && Array.from(ui().querySelectorAll(".qc-cmp2-summary-buttons button")).find((x) => x.getAttribute("mode") === "secondary" && !ph.matchReject(text(x))));
      if (!more || !ctx.click(more)) return { outcome: "none", detail: "" };
      await ctx.sleep(600);
      for (let i = 0; i < 15; i++) {
        b = ui() && rejectIn(ui());
        if (b && ctx.visible(b)) break;
        await ctx.sleep(200);
      }
      if (b && ctx.click(b)) return { outcome: "rejected", detail: text(b) + " (second layer)" };
      return { outcome: "none", detail: "" };
    },
    hideSelectors: ["#qc-cmp2-container"],
  });
})(globalThis);
