// Pure counter logic. Classic script: attaches QuietStats to globalThis. Needs lib/validate.js first.
(function (root) {
  "use strict";

  const MAX_POPUPS_PER_PAGE = 3;
  const PLATFORMS = {
    onetrust: "OneTrust", cookiebot: "Cookiebot", didomi: "Didomi", quantcast: "Quantcast Choice", trustarc: "TrustArc",
    usercentrics: "Usercentrics", sourcepoint: "Sourcepoint", generic: "a generic reject button", newsletter: "newsletter rule",
  };

  const pad = (n) => (n < 10 ? "0" : "") + n;
  // Local calendar date "YYYY-MM-DD" of a timestamp.
  function dateKey(ms) {
    const d = new Date(ms);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  const total = (s) => s.cookiesRejected + s.cookiesHidden + s.popupsClosed;
  const todayCount = (s, now) => (s.today && s.today.date === dateKey(now) ? s.today.count : 0);
  function platformName(ruleId) {
    if (typeof ruleId !== "string" || !ruleId) return "";
    if (Object.prototype.hasOwnProperty.call(PLATFORMS, ruleId)) return PLATFORMS[ruleId];
    return ruleId.charAt(0).toUpperCase() + ruleId.slice(1);
  }

  // stats: sanitized stats; tab: sanitized tab record; res: validated result; now: ms.
  // Counts a page once for cookies (first result wins, later frames are ignored), popups up to MAX_POPUPS_PER_PAGE.
  // Returns {stats, tab, counted}. Never mutates its inputs.
  function applyResult(stats, tab, res, now) {
    const s = Object.assign({}, stats, { today: Object.assign({}, stats.today) });
    const t = Object.assign({}, tab);
    let counted = false;
    if (t.carry && res.kind === "cookie") { t.cookie = null; t.carry = false; } // a fresh result replaces the carried one
    if (res.kind === "cookie") {
      if (res.outcome === "pay-or-consent") {
        // Status only, never counted; a real result on the same page replaces it.
        if (!t.cookie) t.cookie = { ruleId: res.ruleId, outcome: res.outcome, detail: "" };
      } else if (!t.cookie || t.cookie.outcome === "pay-or-consent") {
        if (res.outcome === "hidden") s.cookiesHidden++; else s.cookiesRejected++;
        t.cookie = { ruleId: res.ruleId, outcome: res.outcome, detail: res.detail };
        counted = true;
      }
    } else if (res.kind === "popup") {
      if (t.popups < MAX_POPUPS_PER_PAGE) { s.popupsClosed++; t.popups++; counted = true; }
    }
    if (counted) {
      const key = dateKey(now);
      s.today = s.today.date === key ? { date: key, count: s.today.count + 1 } : { date: key, count: 1 };
    }
    return { stats: s, tab: t, counted };
  }

  // Same URL ignoring the #fragment: a fragment-only change is not a new page.
  function samePage(a, b) {
    const strip = (u) => (typeof u === "string" ? u.split("#")[0] : "");
    return strip(a) === strip(b);
  }

  // Records carried over a same-site reload keep their last cookie result for display; anything else starts clean.
  function carryRecord(prev, newUrl, hostOf) {
    const same = prev && prev.cookie && hostOf(prev.url) && hostOf(prev.url) === hostOf(newUrl);
    return same ? { url: newUrl, cookie: prev.cookie, popups: 0, carry: true } : null;
  }

  root.QuietStats = { carryRecord, MAX_POPUPS_PER_PAGE, PLATFORMS, dateKey, total, todayCount, platformName, applyResult, samePage };
})(globalThis);
