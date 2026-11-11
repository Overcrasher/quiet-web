// Runs at document_start in the top frame only. At DOMContentLoaded it remembers which email-form overlays are already
// on screen, so newsletter.js can tell "part of the page as delivered" from "popup that appeared afterwards".
// Pure DOM reads, no messages, no storage.
(function (root) {
  "use strict";
  if (typeof window === "undefined" || window.top !== window || !root.document) return;
  const set = new WeakSet();
  const state = (root.QuietDcl = { set, done: false });
  function snap() {
    try {
      const vw = window.innerWidth || 0, vh = window.innerHeight || 0;
      for (const i of Array.from(document.querySelectorAll("input")).slice(0, 80)) {
        const hint = ((i.type || "") + " " + (i.name || "") + " " + (i.id || "") + " " + (i.placeholder || "") + " " + (i.getAttribute("autocomplete") || "")).toLowerCase();
        if (hint.indexOf("email") < 0 && hint.indexOf("e-mail") < 0) continue;
        for (let a = i.parentElement; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
          const cs = getComputedStyle(a);
          if (cs.position !== "fixed" && cs.position !== "absolute") continue;
          if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) continue;
          const r = a.getBoundingClientRect();
          const w = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0)), h = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
          if (vw * vh > 0 && (w * h) / (vw * vh) > 0.3) set.add(a);
        }
      }
    } catch (e) { /* ignore */ }
    state.done = true;
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", snap, { once: true });
  else snap();
})(globalThis);
