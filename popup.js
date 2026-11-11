import { getAll } from "./lib/store.js";
import { renderDonateButtons, bindMonthlyLink, hasDonateLinks } from "./lib/support.js";

const $ = (id) => document.getElementById(id);
const V = globalThis.QuietValidate;
const S = globalThis.QuietStats;
const G = globalThis.QuietGrowth;
const D = globalThis.QuietDonation;
const R = globalThis.QuietRating;
const EXT_ID = chrome.runtime.id;
let state = null;       // stored state (stats, donation, ...)
let site = null;        // answer of the service worker for the current tab
let bannerShown = false;
let ratingShown = false;
let monthlyBound = false;

const handled = () => S.total(state.stats);

// What happened on this page, in words (also used for the prefilled issue).
function describe() {
  if (!site || !site.supported) return "Quiet Web does not run on this page.";
  if (site.disabled) return "Disabled on this site";
  const parts = [];
  if (site.cookie) {
    const via = S.platformName(site.cookie.ruleId);
    if (site.cookie.outcome === "pay-or-consent") parts.push("This site asks you to pay or accept cookies. Quiet Web left the choice to you.");
    else parts.push(site.cookie.outcome === "hidden" ? "Hid the cookie banner as a last resort (" + via + ")" : "Rejected cookies via " + via);
  }
  if (site.popups > 0) parts.push("Closed " + G.pluralize(site.popups, "newsletter popup", "newsletter popups"));
  return parts.length ? parts.join(". ").replace(/\.\./g, ".") : "Nothing to do";
}

function render() {
  const s = state.stats, now = Date.now();
  $("supporter").hidden = !state.supporter;
  const n = handled();
  $("headline").textContent = n + " " + (n === 1 ? "annoyance" : "annoyances") + " handled for you.";
  $("today").textContent = S.todayCount(s, now) + " today";
  $("n-rejected").textContent = String(s.cookiesRejected);
  $("n-hidden").textContent = String(s.cookiesHidden);
  $("n-popups").textContent = String(s.popupsClosed);

  const supported = !!(site && site.supported);
  $("host").textContent = supported ? site.host : "This page";
  const status = $("status");
  status.textContent = describe();
  status.classList.toggle("neutral", !supported || site.disabled || (!site.cookie && !site.popups) || (!site.popups && site.cookie.outcome === "pay-or-consent"));
  const hiddenOutcome = supported && !site.disabled && site.cookie && site.cookie.outcome === "hidden";
  $("detail").hidden = !hiddenOutcome;
  if (hiddenOutcome) {
    $("detail").textContent = "The banner could not be answered with a reject button, so it was only hidden. The site may still treat cookies as not decided." +
      (site.cookie.detail ? " Details: " + site.cookie.detail : "");
  }
  $("siteControls").hidden = !supported;
  if (supported) $("disable").checked = !!site.disabled;
  $("share").hidden = n === 0;
}

async function maybeShowBanner() {
  if (bannerShown || ratingShown || state.supporter) return;
  const now = Date.now();
  const dstate = Object.assign({}, state.donation, { supporter: state.supporter });
  const milestone = D.pickAsk(dstate, handled(), now);
  if (!milestone) return;
  if (!hasDonateLinks()) return;   // unconfigured build: don't burn the milestone
  bannerShown = true;
  const next = D.applyAsk(state.donation, milestone, now);
  state.donation = next;
  await chrome.storage.local.set({ donation: next });
  $("banner-text").textContent = "Quiet Web has handled " + handled() +
    " annoyances for you. Built by one developer, no ads, no tracking. If this helped, a coffee keeps it going.";
  renderDonateButtons($("banner-buttons"), $("banner-note"));
  if (!monthlyBound) { monthlyBound = true; bindMonthlyLink($("banner-monthly")); }
  $("banner").hidden = false;
}

// One-time, quieter than the donation banner, and never in the same render as it.
async function maybeShowRating() {
  if (ratingShown || bannerShown) return;
  if (!R.shouldAskRating(state.rating, handled(), R.RATING_THRESHOLD)) return;
  ratingShown = true;
  const rating = { shown: true, at: Date.now() };
  state.rating = rating;
  await chrome.storage.local.set({ rating });
  $("rating").hidden = false;
}

async function loadSite() {
  try { site = await chrome.runtime.sendMessage({ type: "get-popup-state" }); } catch (e) { site = null; }
  if (!site || site.ok !== true) site = null;
}

async function refresh() {
  state = await getAll();
  await loadSite();
  render();
  await maybeShowBanner();
  await maybeShowRating();
}

function flash(btn, text) {
  const old = btn.dataset.label || btn.textContent;
  btn.dataset.label = old;
  btn.textContent = text;
  setTimeout(() => { btn.textContent = old; }, 1500);
}

function init() {
  $("banner-close").addEventListener("click", () => { $("banner").hidden = true; });
  $("banner-dismiss").addEventListener("click", () => { $("banner").hidden = true; });
  $("banner-never").addEventListener("click", async () => {
    const donation = Object.assign({}, state.donation, { dontAskAgain: true });
    state.donation = donation;
    await chrome.storage.local.set({ donation });
    $("banner").hidden = true;
  });
  $("rating-go").addEventListener("click", () => { chrome.tabs.create({ url: G.reviewsUrl(EXT_ID) }); $("rating").hidden = true; });
  $("rating-no").addEventListener("click", () => { $("rating").hidden = true; });
  $("optionsLink").addEventListener("click", () => { chrome.runtime.openOptionsPage(); window.close(); });

  $("disable").addEventListener("change", async () => {
    if (!site || !site.supported) return;
    const want = $("disable").checked;
    let res = null;
    try { res = await chrome.runtime.sendMessage({ type: "set-site-disabled", host: site.host, disabled: want }); } catch (e) { res = null; }
    if (res && res.ok) { site.disabled = want; render(); $("reload").hidden = false; }
    else { $("disable").checked = !want; }
  });
  $("reload-btn").addEventListener("click", () => {
    if (site && typeof site.tabId === "number") chrome.tabs.reload(site.tabId);
    window.close();
  });
  $("report").addEventListener("click", () => {
    if (!site || !site.supported) return;
    const url = G.issueUrl(site.host, site.version || chrome.runtime.getManifest().version, describe());
    if (G.isIssueUrl(url)) chrome.tabs.create({ url });
  });
  $("share").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(G.shareText(handled(), EXT_ID));
      flash($("share"), "Copied!");
    } catch (e) { flash($("share"), "Copy failed"); }
  });
  chrome.storage.onChanged.addListener((changes, area) => { if (area === "local") refresh(); });
  refresh();
}
init();
