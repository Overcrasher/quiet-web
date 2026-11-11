// Pure validators / sanitizers. Classic script: attaches QuietValidate to globalThis.
// Used by the service worker (via lib/store.js), the extension pages and the jsc tests.
(function (root) {
  "use strict";

  const SESSION_RE = /^cs_(live|test)_[A-Za-z0-9]{20,}$/;
  const THANKS_PAGE = "https://overcrasher.github.io/quiet-web/thanks.html";
  const MAX_URL = 2048, MAX_DETAIL = 200, MAX_SITES = 1000;
  const BAD_CHARS = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;
  const RULE_ID_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
  const HOST_RE = /^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/;
  const OUTCOMES = { cookie: ["rejected", "saved-necessary", "hidden", "pay-or-consent"], popup: ["closed", "removed"] };

  const isObj = (o) => !!o && typeof o === "object" && !Array.isArray(o);
  const isNum = (n) => typeof n === "number" && isFinite(n);
  const isCount = (n) => isNum(n) && n >= 0 && Math.floor(n) === n;

  function cleanText(s, max) {
    if (typeof s !== "string") return "";
    return s.replace(BAD_CHARS, " ").replace(/\s+/g, " ").trim().slice(0, max || MAX_DETAIL).trim();
  }
  const validSession = (s) => typeof s === "string" && SESSION_RE.test(s);

  // Minimal http(s) URL split (works without the URL class in jsc): {protocol, host, port, path, query, hash} or null.
  function splitUrl(u) {
    if (typeof u !== "string" || u.length > MAX_URL) return null;
    const m = /^(https?):\/\/([^\/?#]*)([^?#]*)(\?[^#]*)?(#.*)?$/i.exec(u);
    if (!m) return null;
    let auth = m[2];
    const at = auth.lastIndexOf("@");
    if (at >= 0) auth = auth.slice(at + 1);
    const pm = /^(.*?)(?::(\d+))?$/.exec(auth);
    const host = pm[1].toLowerCase();
    if (!host || host.charAt(0) === "[") return null;
    return { protocol: m[1].toLowerCase() + ":", host, port: pm[2] || "", path: m[3] || "/", query: m[4] || "", hash: m[5] || "" };
  }
  function isThanksUrl(u) {
    const x = splitUrl(u);
    return !!x && x.protocol === "https:" && x.host === "overcrasher.github.io" && x.port === "" && x.path === "/quiet-web/thanks.html";
  }

  // Lowercase, no leading "www.", valid hostname characters only; "" if invalid.
  function normalizeHost(h) {
    if (typeof h !== "string") return "";
    h = h.trim().toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
    return HOST_RE.test(h) && h.indexOf("..") < 0 ? h : "";
  }
  const validHost = (h) => typeof h === "string" && h !== "" && normalizeHost(h) === h;
  // Site of an http(s) tab URL (never from message fields), or "".
  function hostFromUrl(u) {
    const x = splitUrl(u);
    return x ? normalizeHost(x.host) : "";
  }
  // Disabled list: normalised, valid, unique, sorted, at most MAX_SITES.
  function sanitizeSites(list) {
    const seen = new Set();
    for (const h of Array.isArray(list) ? list : []) {
      const n = normalizeHost(h);
      if (n) seen.add(n);
    }
    return Array.from(seen).sort().slice(0, MAX_SITES);
  }
  function isDisabled(list, host) {
    return !!host && Array.isArray(list) && list.indexOf(host) >= 0;
  }
  function withSite(list, host, disabled) {
    const cur = sanitizeSites(list).filter((h) => h !== host);
    return sanitizeSites(disabled ? cur.concat(host) : cur);
  }

  // Untrusted content-script result -> {kind, ruleId, outcome, detail} or null.
  function validateResult(msg) {
    if (!isObj(msg) || msg.type !== "result") return null;
    const kind = msg.kind;
    if (typeof kind !== "string" || !Object.prototype.hasOwnProperty.call(OUTCOMES, kind)) return null;
    if (typeof msg.ruleId !== "string" || !RULE_ID_RE.test(msg.ruleId)) return null;
    if (typeof msg.outcome !== "string" || OUTCOMES[kind].indexOf(msg.outcome) < 0) return null;
    if (msg.detail !== undefined && msg.detail !== null && typeof msg.detail !== "string") return null;
    return { kind, ruleId: msg.ruleId, outcome: msg.outcome, detail: cleanText(msg.detail, MAX_DETAIL) };
  }
  const validTabId = (n) => isCount(n) && n < 2147483647;

  function sanitizeStats(s) {
    s = isObj(s) ? s : {};
    const t = isObj(s.today) ? s.today : {};
    return {
      cookiesRejected: isCount(s.cookiesRejected) ? s.cookiesRejected : 0,
      cookiesHidden: isCount(s.cookiesHidden) ? s.cookiesHidden : 0,
      popupsClosed: isCount(s.popupsClosed) ? s.popupsClosed : 0,
      today: { date: typeof t.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t.date) ? t.date : "", count: isCount(t.count) ? t.count : 0 },
    };
  }
  function sanitizeDonation(d) {
    d = isObj(d) ? d : {};
    return {
      asked: Array.isArray(d.asked) ? d.asked.filter((n) => isNum(n) && n > 0) : [],
      lastAskAt: isNum(d.lastAskAt) && d.lastAskAt > 0 ? d.lastAskAt : 0,
      dontAskAgain: d.dontAskAgain === true,
    };
  }
  function sanitizeRating(d) {
    d = isObj(d) ? d : {};
    return d.shown === true ? { shown: true, at: isNum(d.at) && d.at > 0 ? d.at : 0 } : { shown: false, at: 0 };
  }
  // Per-tab record held by the service worker (session storage): last cookie result + popup count.
  function sanitizeTabRecord(r) {
    r = isObj(r) ? r : {};
    const c = isObj(r.cookie) ? r.cookie : null;
    const okCookie = c && OUTCOMES.cookie.indexOf(c.outcome) >= 0 && typeof c.ruleId === "string" && RULE_ID_RE.test(c.ruleId);
    return {
      url: typeof r.url === "string" ? r.url.slice(0, MAX_URL) : "",
      cookie: okCookie ? { ruleId: c.ruleId, outcome: c.outcome, detail: cleanText(c.detail, MAX_DETAIL) } : null,
      popups: isCount(r.popups) ? r.popups : 0,
      carry: r.carry === true && !!okCookie, // result kept from before a same-site reload (display only, not a count)
    };
  }

  root.QuietValidate = {
    THANKS_PAGE, MAX_SITES, OUTCOMES,
    cleanText, validSession, splitUrl, isThanksUrl, normalizeHost, validHost, hostFromUrl, sanitizeSites, isDisabled, withSite,
    validateResult, validTabId, sanitizeStats, sanitizeDonation, sanitizeRating, sanitizeTabRecord,
  };
})(globalThis);
