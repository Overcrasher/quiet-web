// Store / share / issue-report URL helpers. Classic script: attaches QuietGrowth to globalThis.
// The store URL is derived from the extension id (passed in so the jsc tests can use a fake one).
(function (root) {
  "use strict";

  const STORE_BASE = "https://chromewebstore.google.com/detail/";
  const ISSUES_NEW = "https://github.com/Overcrasher/quiet-web/issues/new";
  const WAIT24_URL = "https://chromewebstore.google.com/detail/wait-24h/pkgdjohoemjkejcbfbkfobbbjcpdabme";
  const MEETING_METER_URL = "https://chromewebstore.google.com/detail/meeting-meter/ffkniocclnaojfdcoofnjkfnihnpgnlb";
  const ID_RE = /^[a-p]{32}$/;

  const storeUrl = (id) => STORE_BASE + id;
  const reviewsUrl = (id) => storeUrl(id) + "/reviews";
  const shareUrl = (id) => storeUrl(id) + "?utm_source=share";
  const validExtensionId = (id) => typeof id === "string" && ID_RE.test(id);

  function shareText(count, id) {
    return "Quiet Web has said no to " + count + " cookie banners and popups for me. #QuietWeb " + shareUrl(id);
  }

  // Prefilled GitHub issue (nothing is sent automatically): host, extension version, what happened. Nothing else.
  function issueUrl(host, version, what) {
    const body = "Site: " + host + "\nQuiet Web version: " + version + "\nWhat happened: " + what +
      "\n\nWhat went wrong (please describe, e.g. the banner stayed, the page broke):\n";
    return ISSUES_NEW + "?title=Broken%20site:%20" + encodeURIComponent(host) + "&body=" + encodeURIComponent(body);
  }
  function isIssueUrl(u) {
    return typeof u === "string" && u.indexOf(ISSUES_NEW + "?title=Broken%20site:%20") === 0;
  }

  const pluralize = (n, one, many) => n + " " + (n === 1 ? one : many);

  root.QuietGrowth = { STORE_BASE, ISSUES_NEW, WAIT24_URL, MEETING_METER_URL, storeUrl, reviewsUrl, shareUrl, validExtensionId, shareText, issueUrl, isIssueUrl, pluralize };
})(globalThis);
