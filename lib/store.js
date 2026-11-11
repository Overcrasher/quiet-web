// Shared storage helpers (ES module, used by background, popup, options).
import "./validate.js"; // classic script: defines globalThis.QuietValidate
import "./stats.js"; // classic script: defines globalThis.QuietStats
const V = globalThis.QuietValidate;

export const DEFAULT_DONATION = Object.freeze({ asked: [], lastAskAt: 0, dontAskAgain: false });

// Reads everything with defaults applied and sanitized (fresh install safe).
export async function getAll() {
  const d = await chrome.storage.local.get(["stats", "disabledSites", "donation", "supporter", "rating"]);
  return {
    stats: V.sanitizeStats(d.stats),
    disabledSites: V.sanitizeSites(d.disabledSites),
    donation: V.sanitizeDonation(d.donation),
    supporter: d.supporter === true,
    rating: V.sanitizeRating(d.rating),
  };
}

// Serializes read-modify-write operations within one context.
let chain = Promise.resolve();
export function mutate(fn) {
  const p = chain.then(fn);
  chain = p.catch(() => {});
  return p;
}
