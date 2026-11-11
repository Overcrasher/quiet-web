// Quiet Web rule: TrustArc (truste) consent banner. Written from live captures (tests/e2e/captures/trustarc/):
// banner #truste-consent-track inside #consent_blackbar, buttons #truste-consent-required (reject / "Reject Optional" /
// "Required only" / "Decline"), #truste-consent-button (accept, never clicked), #truste-show-consent (manage).
(function (root) {
  "use strict";
  const rules = (root.QuietRules = root.QuietRules || []);

  const TRACK = "#truste-consent-track";
  const REJECT_SEL = "#truste-consent-required, button.truste-reject, #truste-reject-button";

  // Pay-or-consent ("Reject all and pay", "Refuser et s'abonner", "Pur-Abo"): such a button is NOT a reject and leads
  // into a subscription flow, so it is never clicked and never counts. Works on QuietPhrases.normalize()d text.
  const payLike = (text) => (root.QuietPhrases ? root.QuietPhrases.isPayLike(text) : true); // shared guard (lib/reject-phrases.js)
  function isShown(doc, el) {
    if (!el) return false;
    try {
      const r = el.getBoundingClientRect();
      if (r.width < 5 || r.height < 5) return false;
      const cs = doc.defaultView.getComputedStyle(el);
      return cs.display !== "none" && cs.visibility !== "hidden";
    } catch (e) { return false; }
  }

  rules.push({
    id: "trustarc",
    name: "TrustArc",
    detect(doc) {
      const track = doc.querySelector(TRACK);
      return track && isShown(doc, track) ? track : null;
    },
    async reject(ctx) {
      const doc = ctx.doc;
      let btn = await ctx.waitFor(REJECT_SEL, 1500);
      if (!btn) {
        // Fallback by label inside the banner ("Reject Optional", "Decline", ...).
        const track = doc.querySelector(TRACK);
        const hit = track ? ctx.phrases.findRejectButtons(track).find((h) => ctx.visible(h.el) && !payLike(h.text)) : null;
        btn = hit ? hit.el : null;
      }
      if (btn && payLike(ctx.phrases.buttonText(btn))) return { outcome: "none", detail: "pay-or-consent" };
      if (btn) {
        const label = ctx.phrases.buttonText(btn);
        if (ctx.click(btn)) {
          await ctx.sleep(400);
          return { outcome: "rejected", detail: label || "Reject optional" };
        }
      }
      // No first-layer reject: the preference centre is a cross-origin popup that cannot be driven reliably.
      return { outcome: "hidden", detail: "No reject button; banner hidden" };
    },
    payLike,
    hideSelectors: ["#trustarc-banner-overlay", "#truste-consent-track", "#consent_blackbar"],
  });
})(globalThis);
