// Pure helpers for newsletter / subscribe popup detection. Classic script: attaches QuietPopups to globalThis.
// Used by newsletter.js and the jsc tests. Needs lib/reject-phrases.js (normalize) loaded first.
(function (root) {
  "use strict";

  // URLs containing any of these (case-insensitive, in path, query or hash) are never touched. Deliberately a plain
  // "contains": "/paypal" and "/payment" are both excluded, as are "/author" (auth) and "/cartoons" (cart). False
  // negatives on those pages are the cheap side of the trade-off.
  const EXCLUDED_WORDS = ["login", "signin", "sign-in", "signup", "register", "checkout", "cart", "basket", "payment", "pay", "account", "auth", "password"];
  const COVERAGE_MIN = 0.30; // strictly greater than this share of the viewport

  // Path + query + hash of an http(s) URL (host excluded), lowercased and percent-decoded when possible.
  function urlTail(url) {
    if (typeof url !== "string") return "";
    const m = /^[a-z][a-z0-9+.\-]*:\/\/[^\/?#]*(.*)$/i.exec(url.trim());
    let tail = m ? m[1] : url;
    try { tail = decodeURIComponent(tail); } catch (e) { /* keep raw */ }
    return tail.toLowerCase();
  }
  function isExcludedUrl(url) {
    if (typeof url !== "string" || !url) return true; // unknown URL: do nothing
    const tail = urlTail(url);
    return EXCLUDED_WORDS.some((w) => tail.indexOf(w) >= 0);
  }

  // Area of rect ({left, top, right, bottom} or {x, y, width, height}) inside the viewport / viewport area (0..1).
  function coverage(rect, vw, vh) {
    if (!rect || !(vw > 0) || !(vh > 0)) return 0;
    const left = typeof rect.left === "number" ? rect.left : rect.x;
    const top = typeof rect.top === "number" ? rect.top : rect.y;
    const right = typeof rect.right === "number" ? rect.right : left + rect.width;
    const bottom = typeof rect.bottom === "number" ? rect.bottom : top + rect.height;
    if (![left, top, right, bottom].every((n) => typeof n === "number" && isFinite(n))) return 0;
    const w = Math.min(right, vw) - Math.max(left, 0);
    const h = Math.min(bottom, vh) - Math.max(top, 0);
    if (w <= 0 || h <= 0) return 0;
    return (w * h) / (vw * vh);
  }
  const isLargeOverlay = (rect, vw, vh) => coverage(rect, vw, vh) > COVERAGE_MIN;

  // Input descriptor: {type, name, id, placeholder, autocomplete, ariaLabel}. Missing fields are fine.
  const str = (v) => (typeof v === "string" ? v.toLowerCase() : "");
  const EMAIL_HINT = /e[\s_\-.]?mail|courriel|correo|posta elettronica|e-posta|adresse mail|adres e/;
  function isEmailInput(d) {
    if (!d) return false;
    const type = str(d.type) || "text";
    if (type === "email") return true;
    if (type !== "text" && type !== "search") return false;
    const ac = str(d.autocomplete);
    if (ac === "email" || ac.indexOf(" email") >= 0) return true;
    return [d.name, d.id, d.placeholder, d.ariaLabel].some((v) => EMAIL_HINT.test(str(v)));
  }
  const PAYMENT_HINT = /card[\s_\-.]?num|cardnumber|cc[\s_\-.]?(num|number|exp|csc)|cvc|cvv|security[\s_\-.]?code|expir/;
  function isPaymentOrPasswordInput(d) {
    if (!d) return false;
    if (str(d.type) === "password") return true;
    const ac = str(d.autocomplete);
    if (ac.indexOf("cc-") >= 0 || ac.indexOf("password") >= 0) return true;
    return [d.name, d.id, d.placeholder, d.ariaLabel].some((v) => PAYMENT_HINT.test(str(v)));
  }
  // inputs: array of descriptors found inside one candidate overlay.
  function overlayInputsOk(inputs) {
    if (!Array.isArray(inputs)) return false;
    return inputs.some(isEmailInput) && !inputs.some(isPaymentOrPasswordInput);
  }

  // Close / dismiss labels (normalised). SYMBOLS are checked on the raw trimmed text.
  const SYMBOLS = ["x", "×", "✕", "✖", "✗", "╳", "⨯", "❌"];
  const CLOSE_WORDS = ["close", "dismiss", "close dialog", "close popup", "close modal", "inchide", "inchidere", "schliessen", "schließen", "fermer", "cerrar", "chiudi", "sluiten", "zamknij"];
  const NO_THANKS = ["no thanks", "no thank you", "not now", "maybe later", "nu multumesc", "nu acum", "nein danke", "nicht jetzt", "non merci", "pas maintenant",
    "no gracias", "ahora no", "no grazie", "nee bedankt", "niet nu", "nie dziekuje", "nie teraz"];
  function isCloseText(raw) {
    if (typeof raw !== "string") return false;
    const t = raw.trim();
    if (!t || t.length > 60) return false;
    if (SYMBOLS.indexOf(t.toLowerCase()) >= 0) return true;
    const n = root.QuietPhrases ? root.QuietPhrases.normalize(t) : t.toLowerCase();
    if (!n) return false;
    const words = n.split(" ").length;
    const p = " " + n + " ";
    if (CLOSE_WORDS.some((w) => {
      const nw = root.QuietPhrases ? root.QuietPhrases.normalize(w) : w;
      return p.indexOf(" " + nw + " ") >= 0;
    }) && words <= 3) return true;
    return NO_THANKS.some((w) => p.indexOf(" " + w + " ") >= 0) && words <= 10;
  }

  // "-1234px" (body.style.top of a position:fixed scroll lock) -> 1234; anything else -> 0.
  function lockedScrollY(topValue, position) {
    if (position !== "fixed") return 0;
    const m = /^(-?\d+(?:\.\d+)?)px$/.exec(typeof topValue === "string" ? topValue.trim() : "");
    if (!m) return 0;
    const v = -parseFloat(m[1]);
    return v > 0 ? v : 0;
  }

  // True if a user gesture happened within `windowMs` before the element appeared (user-opened modals are left alone).
  function userOpened(lastGestureAt, appearedAt, windowMs) {
    if (!(lastGestureAt > 0)) return false;
    const d = appearedAt - lastGestureAt;
    return d >= 0 && d <= windowMs;
  }

  root.QuietPopups = {
    EXCLUDED_WORDS, COVERAGE_MIN,
    isExcludedUrl, coverage, isLargeOverlay, isEmailInput, isPaymentOrPasswordInput, overlayInputsOk, isCloseText, lockedScrollY, userOpened,
  };
})(globalThis);
