// Cookiebot (Cybot) dialog. Written from live captures (tests/e2e/captures/cookiebot/).
// Order: Deny / necessary-only button -> Customize, untick optional, "Allow selection" -> custom templates with
// unticked checkboxes + submit-selected button -> hide.
(function (root) {
  "use strict";
  const rules = (root.QuietRules = root.QuietRules || []);
  const shown = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
  const DECLINE = "#CybotCookiebotDialogBodyButtonDecline, #CybotCookiebotDialogBodyLevelButtonLevelOptinDeclineAll, #CybotCookiebotDialogBodyButtonDeclineAll";
  rules.push({
    id: "cookiebot",
    name: "Cookiebot",
    detect(doc) {
      const d = doc.querySelector("#CybotCookiebotDialog");
      return shown(d) ? d : null;
    },
    async reject(ctx) {
      const dlg = ctx.doc.querySelector("#CybotCookiebotDialog");
      if (!dlg) return { outcome: "none", detail: "" };
      const dec = dlg.querySelector(DECLINE);
      if (dec && ctx.phrases && ctx.phrases.isPayLike(ctx.phrases.buttonText(dec))) return { outcome: "none", detail: "pay-or-consent" };
      if (dec && ctx.click(dec)) return { outcome: "rejected", detail: "Deny" };
      const custom = dlg.querySelector("#CybotCookiebotDialogBodyLevelButtonCustomize, #CybotCookiebotDialogBodyButtonDetails");
      if (custom && ctx.visible(custom)) {
        ctx.click(custom);
        await ctx.sleep(500);
        const dec2 = await ctx.waitFor(DECLINE, 1500, dlg);
        if (dec2 && ctx.click(dec2)) return { outcome: "rejected", detail: "Deny (after Customize)" };
      }
      let n = 0;
      for (const box of dlg.querySelectorAll("input[type=checkbox]")) {
        if (/necessary/i.test(box.id + " " + (box.name || ""))) continue;
        if (ctx.uncheck(box)) n++;
      }
      const sel = dlg.querySelector("#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowallSelection, #CybotCookiebotDialogBodyButtonAcceptSelected, button.submitChosen");
      if (sel && ctx.click(sel, { selection: true, force: false })) return { outcome: "saved-necessary", detail: "Unticked " + n + " categories, saved selection" };
      return { outcome: "hidden", detail: "No reject control found" };
    },
    hideSelectors: ["#CybotCookiebotDialog", "#CybotCookiebotDialogBodyUnderlay"],
  });
})(globalThis);
