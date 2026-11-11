// Quiet Web rule: Sourcepoint (TCF) consent messages. Written from live captures (tests/e2e/captures/sourcepoint/).
// The message renders in an iframe (id sp_message_iframe_*, inside div#sp_message_container_*) and the second layer
// (privacy manager) in a further iframe (/privacy-manager/). Content scripts run in every frame, so this one rule has
// two roles, picked by what the current document contains:
// (No sleeps after a click: the frame may be torn down right away and the result must be reported first.)
//   1. message frame: buttons carry class sp_choice_type_<n>: 11 accept all, 12 options, 13 reject all, 9 "subscribe"
//      (pay-or-consent, NOT a reject: never clicked). Click reject-all, else a plain reject label, else open the options.
//   2. privacy-manager frame: .sp_choice_type_SAVE_AND_EXIT; click every per-purpose "Reject", then save.
//   (the top document has no role: it never hides the message and never pays; the frames report for themselves.)
(function (root) {
  "use strict";
  const rules = (root.QuietRules = root.QuietRules || []);

  const MSG_BTN = "button.sp_choice_type_11, button.sp_choice_type_12, button.sp_choice_type_13, button.sp_choice_type_9";
  const PM_BTN = "button.sp_choice_type_SAVE_AND_EXIT, button.sp_choice_type_ACCEPT_ALL, button.sp_choice_type_REJECT_ALL";
  // Pay-or-consent ("Reject all and pay", "Refuser et s'abonner", "Pur-Abo"): such a button is NOT a reject and leads
  // into a subscription flow, so it is never clicked and never counts. Works on QuietPhrases.normalize()d text.
  const payLike = (text) => (root.QuietPhrases ? root.QuietPhrases.isPayLike(text) : true); // shared guard (lib/reject-phrases.js)
  const PARTNERS = /partner|vendor|anbieter|fournisseur|proveedor|parteneri|fornitor/i;

  let openedSettings = false;

  // The privacy-manager document (its own iframe) is recognised by its URL even before its buttons have rendered.
  function isPmDoc(doc) {
    try { return /\/privacy-manager\//.test(doc.location.pathname); } catch (e) { return false; }
  }

  function sizeOk(el) {
    try { const r = el.getBoundingClientRect(); return r.width > 5 && r.height > 5; } catch (e) { return false; }
  }
  const cls = (el, n) => el.classList && el.classList.contains("sp_choice_type_" + n);
  const label = (ctx, el) => ctx.phrases.buttonText(el) || el.getAttribute("title") || "";
  // sp_choice_type_13 / REJECT_ALL is authoritative whatever the wording ("I do not agree" would trip ctx.click's accept
  // guard because of the word "agree"), so click it directly; pay-or-consent labels are still refused.
  function clickRejectType(ctx, el) {
    if (ctx.click(el)) return true;
    if (!ctx.visible(el) || el.disabled || payLike(label(ctx, el))) return false;
    try { el.click(); return true; } catch (e) { return false; }
  }
  function safeReject(ctx, el) {
    const t = label(ctx, el);
    return !payLike(t) && !cls(el, 11) && !cls(el, 9) && !cls(el, "ACCEPT_ALL");
  }

  rules.push({
    id: "sourcepoint",
    name: "Sourcepoint",
    detect(doc) {
      const pm = doc.querySelector(PM_BTN) || (isPmDoc(doc) && doc.body);
      if (pm) return pm;
      const msg = doc.querySelector(MSG_BTN);
      if (msg && sizeOk(msg)) return msg;
      return null;
    },
    async reject(ctx) {
      const doc = ctx.doc;

      // Role 2: privacy manager frame.
      if (isPmDoc(doc) || doc.querySelector(PM_BTN)) {
        if (!(await ctx.waitFor("button.sp_choice_type_SAVE_AND_EXIT", 6000))) return { outcome: "none", detail: "" };
        ctx.log("privacy manager: declining purposes");
        const all = await ctx.waitFor("button.sp_choice_type_REJECT_ALL", 600);
        if (all && safeReject(ctx, all) && clickRejectType(ctx, all)) { return { outcome: "rejected", detail: "Reject all (privacy manager)" }; }
        let n = 0;
        for (const b of doc.querySelectorAll("button")) {
          if (!ctx.visible(b) || cls(b, "SAVE_AND_EXIT") || cls(b, "CANCEL")) continue;
          const t = label(ctx, b);
          if (ctx.phrases.matchReject(t) && safeReject(ctx, b) && ctx.click(b)) n++;
        }
        for (const sw of doc.querySelectorAll("[role=switch][aria-checked=true], button.pm-switch[aria-checked=true]")) if (ctx.uncheck(sw)) n++;
        const save = await ctx.waitFor("button.sp_choice_type_SAVE_AND_EXIT", 1500);
        ctx.log("privacy manager: declined " + n + ", save button " + (save ? label(ctx, save) : "missing"));
        if (save && ctx.click(save, { selection: true })) {
          return { outcome: "saved-necessary", detail: "Purposes declined (" + n + "), saved" };
        }
        // Save is not possible (e.g. pay-or-consent: some purposes cannot be declined): back out, the user decides.
        const cancel = doc.querySelector("button.sp_choice_type_CANCEL");
        if (cancel) ctx.click(cancel);
        return { outcome: "none", detail: "pay-or-consent" };
      }

      // Role 1: message frame.
      if (doc.querySelector(MSG_BTN)) {
        const r13 = Array.from(doc.querySelectorAll("button.sp_choice_type_13")).find((b) => ctx.visible(b) && safeReject(ctx, b));
        if (r13 && clickRejectType(ctx, r13)) { return { outcome: "rejected", detail: label(ctx, r13) }; }
        const hit = ctx.phrases.findRejectButtons(doc).find((h) => ctx.visible(h.el) && safeReject(ctx, h.el));
        if (hit && ctx.click(hit.el)) { return { outcome: "rejected", detail: hit.text }; }
        if (openedSettings) return { outcome: "none", detail: "" };
        // Second layer: open it (button type 12, or a "partners" link); the privacy-manager frame finishes the job.
        let opener = Array.from(doc.querySelectorAll("button.sp_choice_type_12")).find((b) => ctx.visible(b));
        if (!opener) opener = Array.from(doc.querySelectorAll("a[data-choice], a[href='#']")).find((a) => PARTNERS.test(label(ctx, a)) && ctx.visible(a));
        if (opener && ctx.click(opener, { force: false })) {
          openedSettings = true;
          ctx.log("opened the privacy manager; its frame declines the purposes");
          // Pay-or-consent notices (accept / subscribe only): if the privacy manager does not settle it, say so after a moment.
          if (Array.from(doc.querySelectorAll("button")).some((b) => ctx.visible(b) && (cls(b, 9) || payLike(label(ctx, b))))) {
            await ctx.sleep(3500);
            return { outcome: "none", detail: "pay-or-consent" };
          }
          return { outcome: "none", detail: "" };
        }
        // Only "accept" and a subscribe/pay button: pay-or-consent, left to the user.
        if (Array.from(doc.querySelectorAll("button")).some((b) => ctx.visible(b) && (cls(b, 9) || payLike(label(ctx, b))))) return { outcome: "none", detail: "pay-or-consent" };
        return { outcome: "none", detail: "" };
      }

      // Not a message or privacy-manager frame (e.g. the top document): nothing to do, it never hides or pays.
      return { outcome: "none", detail: "" };
    },
    payLike,
    hideSelectors: [],
  });
})(globalThis);
