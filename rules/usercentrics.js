// Quiet Web rule: Usercentrics CMP v2 (#usercentrics-root) and the newer "cmp-ui" build (#usercentrics-cmp-ui).
// Both render into an OPEN shadow root (verified live on dm.de, zalando.de, o2online.de, fressnapf.de); see
// tests/e2e/captures/usercentrics/. Deny buttons: [data-testid=uc-deny-all-button] / button.uc-deny-button (#deny).
(function (root) {
  "use strict";
  const rules = (root.QuietRules = root.QuietRules || []);

  const HOSTS = ["#usercentrics-root", "#usercentrics-cmp-ui"];
  const DENY = "[data-testid=uc-deny-all-button], button.uc-deny-button, button#deny, [data-action-type=deny]";
  const MORE = "[data-testid=uc-customize-anchor], [data-testid=uc-more-button], button.uc-more-button, button#more, [data-action-type=more]";
  const SAVE = "[data-testid=uc-save-button], button.uc-save-button, button#save, [data-action-type=save]";

  // Pay-or-consent ("Reject all and pay", "Refuser et s'abonner", "Pur-Abo"): such a button is NOT a reject and leads
  // into a subscription flow, so it is never clicked and never counts. Works on QuietPhrases.normalize()d text.
  const payLike = (text) => (root.QuietPhrases ? root.QuietPhrases.isPayLike(text) : true); // shared guard (lib/reject-phrases.js)
  function hosts(doc) {
    const out = [];
    for (const s of HOSTS) { const e = doc.querySelector(s); if (e) out.push(e); }
    return out;
  }
  function shadowOf(h) { try { return h.shadowRoot || null; } catch (e) { return null; } }

  rules.push({
    id: "usercentrics",
    name: "Usercentrics",
    detect(doc) {
      for (const h of hosts(doc)) {
        const sr = shadowOf(h);
        if (sr) {
          // The floating privacy button alone is not a banner: require a visible deny/more button or dialog.
          const els = Array.from(sr.querySelectorAll(DENY + ", " + MORE + ", [role=dialog]"));
          const shown = els.find((e) => {
            try { const r = e.getBoundingClientRect(); return r.width > 5 && r.height > 5; } catch (x) { return false; }
          });
          if (shown) return h;
        } else {
          // Closed shadow root: unreachable; only the host can be hidden. Require it to actually take up space.
          try { const r = h.getBoundingClientRect(); if (r.height > 80 && r.width > 200) return h; } catch (e) { /* ignore */ }
        }
      }
      return null;
    },
    async reject(ctx) {
      const host = hosts(ctx.doc).find((h) => h.isConnected);
      if (!host) return { outcome: "none", detail: "" };
      const sr = shadowOf(host);
      if (!sr) return { outcome: "hidden", detail: "Closed shadow root; banner hidden" };

      let btn = await ctx.waitFor(DENY, 1500, sr);
      if (!btn) {
        const hit = ctx.phrases.findRejectButtons(sr).find((h) => ctx.visible(h.el) && !payLike(h.text));
        btn = hit ? hit.el : null;
      }
      if (btn && payLike(ctx.phrases.buttonText(btn))) return { outcome: "none", detail: "pay-or-consent" };
      if (btn) {
        const label = ctx.phrases.buttonText(btn);
        if (ctx.click(btn)) { await ctx.sleep(400); return { outcome: "rejected", detail: label || "Deny" }; }
      }

      // Settings layer: look for a deny-all there, else untick every optional toggle and save.
      const more = await ctx.waitFor(MORE, 800, sr);
      if (more && ctx.click(more)) {
        await ctx.sleep(500);
        const deny2 = await ctx.waitFor(DENY, 1500, sr);
        if (deny2 && ctx.click(deny2)) { await ctx.sleep(400); return { outcome: "rejected", detail: ctx.phrases.buttonText(deny2) || "Deny (settings)" }; }
        let changed = 0;
        for (const t of sr.querySelectorAll("input[type=checkbox], [role=switch]")) if (ctx.uncheck(t)) changed++;
        const save = await ctx.waitFor(SAVE, 1500, sr);
        if (save && ctx.click(save, { selection: true })) {
          await ctx.sleep(400);
          return { outcome: "saved-necessary", detail: "Optional categories off (" + changed + "), saved" };
        }
      }
      return { outcome: "hidden", detail: "No reject path; banner hidden" };
    },
    payLike,
    hideSelectors: ["#usercentrics-root", "#usercentrics-cmp-ui"],
  });
})(globalThis);
