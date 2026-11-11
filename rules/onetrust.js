// OneTrust (Optanon) banner. Written from live captures (tests/e2e/captures/onetrust/): ids are language independent.
// Order: reject-all button -> preference centre (refuse-all / untick optional + save) -> hide.
(function (root) {
  "use strict";
  const rules = (root.QuietRules = root.QuietRules || []);
  const shown = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
  rules.push({
    id: "onetrust",
    name: "OneTrust",
    detect(doc) {
      const b = doc.querySelector("#onetrust-banner-sdk");
      if (shown(b)) return b;
      const pc = doc.querySelector("#onetrust-pc-sdk");
      return shown(pc) ? pc : null;
    },
    async reject(ctx) {
      const doc = ctx.doc;
      const first = doc.querySelector("#onetrust-reject-all-handler, #onetrust-banner-sdk .ot-bnr-reject-all, #onetrust-banner-sdk button.ot-reject-all");
      if (first && ctx.phrases && ctx.phrases.isPayLike(ctx.phrases.buttonText(first))) return { outcome: "none", detail: "pay-or-consent" };
      if (first && ctx.click(first)) return { outcome: "rejected", detail: "Reject all" };
      // Preference centre (may already be open)
      let pc = doc.querySelector("#onetrust-pc-sdk");
      if (!ctx.visible(pc)) {
        const open = doc.querySelector("#onetrust-pc-btn-handler, #onetrust-banner-sdk .ot-sdk-show-settings");
        if (!open || !ctx.click(open)) return { outcome: "none", detail: "" };
        pc = await ctx.waitFor("#onetrust-pc-sdk", 3000);
        if (!pc) return { outcome: "none", detail: "" };
        await ctx.sleep(400);
      }
      const refuse = pc.querySelector(".ot-pc-refuse-all-handler, #ot-pc-refuse-all-handler, button.ot-pc-refuse-all");
      if (refuse && ctx.click(refuse)) return { outcome: "rejected", detail: "Reject all (preference centre)" };
      let n = 0;
      for (const box of pc.querySelectorAll("input[type=checkbox]")) if (ctx.uncheck(box)) n++;
      const save = pc.querySelector(".save-preference-btn-handler, #ot-pc-save, button.ot-pc-save");
      if (save && ctx.click(save, { selection: true })) return { outcome: "saved-necessary", detail: "Unticked " + n + " categories, saved" };
      return { outcome: "hidden", detail: "No reject control found" };
    },
    hideSelectors: ["#onetrust-consent-sdk", ".onetrust-pc-dark-filter"],
  });
})(globalThis);
