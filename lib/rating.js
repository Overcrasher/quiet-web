// Pure rating-prompt logic. Classic script on globalThis (popup <script> tag + jsc tests).
(function (root) {
  "use strict";

  const RATING_THRESHOLD = 50; // annoyances handled before the one-time rating card

  // state: stored rating object ({ shown, at }) or undefined; count: annoyances handled; threshold: number.
  function shouldAskRating(state, count, threshold) {
    if (state !== null && typeof state === "object" && state.shown === true) return false;
    if (typeof count !== "number" || !isFinite(count) || typeof threshold !== "number" || !isFinite(threshold)) return false;
    return count >= threshold;
  }

  root.QuietRating = { RATING_THRESHOLD, shouldAskRating };
})(globalThis);
