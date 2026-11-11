// Service worker (module). Owns every write to storage: counters, disabled sites, supporter flag.
// Content scripts only send messages; the site always comes from sender.tab.url, never from a message field.
import { getAll, mutate } from "./lib/store.js";

const V = globalThis.QuietValidate; // lib/validate.js (imported through store.js)
const S = globalThis.QuietStats;    // lib/stats.js
const FAIL = { ok: false };

// Content scripts must not read or write storage: only trusted extension pages and this worker.
async function lockStorage() {
  try { await chrome.storage.local.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" }); }
  catch (e) { console.warn("Quiet Web: setAccessLevel failed", e); }
  try { await chrome.storage.session.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" }); }
  catch (e) { /* session storage is trusted-only by default */ }
}
lockStorage();

chrome.runtime.onInstalled.addListener((details) => {
  lockStorage();
  // Welcome page on a fresh install only, never on update/browser update.
  if (details && details.reason === "install") chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
});
chrome.runtime.onStartup.addListener(() => { lockStorage(); });

// ---- per-tab records (session storage: survive worker restarts, cleared with the browser session) ----
async function readTabs() {
  const d = await chrome.storage.session.get("tabs");
  const raw = d && d.tabs && typeof d.tabs === "object" ? d.tabs : {};
  const out = {};
  for (const k of Object.keys(raw)) if (/^\d+$/.test(k)) out[k] = V.sanitizeTabRecord(raw[k]);
  return out;
}
const writeTabs = (tabs) => chrome.storage.session.set({ tabs });

// A new page in a tab (loading, or the URL changed beyond the #fragment) starts with a clean record.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "loading" && typeof changeInfo.url !== "string") return;
  mutate(async () => {
    const tabs = await readTabs();
    const cur = tabs[tabId];
    if (!cur) return;
    if (changeInfo.status !== "loading" && S.samePage(cur.url, changeInfo.url)) return;
    // Same site reloading right after a consent (some sites do): keep the last result for display; other site: clear.
    const kept = S.carryRecord(cur, (tab && tab.url) || changeInfo.url || "", V.hostFromUrl);
    if (kept) tabs[tabId] = V.sanitizeTabRecord(kept); else delete tabs[tabId];
    await writeTabs(tabs);
  }).catch(() => {});
});
chrome.tabs.onRemoved.addListener((tabId) => {
  mutate(async () => {
    const tabs = await readTabs();
    if (!(tabId in tabs)) return;
    delete tabs[tabId];
    await writeTabs(tabs);
  }).catch(() => {});
});

// ---- handlers ----
async function siteState(tabUrl) {
  const host = V.hostFromUrl(tabUrl);
  if (!host) return FAIL;
  const { disabledSites } = await getAll();
  return { ok: true, disabled: V.isDisabled(disabledSites, host) };
}

// A validated result from a content script. Counted at most once per page for cookies (any frame), up to 3 popups.
async function recordResult(msg, tab, tabUrl) {
  const res = V.validateResult(msg);
  const host = V.hostFromUrl(tabUrl);
  if (!res || !host || !V.validTabId(tab.id)) return FAIL;
  return mutate(async () => {
    const { stats, disabledSites } = await getAll();
    if (V.isDisabled(disabledSites, host)) return FAIL;
    const tabs = await readTabs();
    const key = String(tab.id);
    let rec = tabs[key] || V.sanitizeTabRecord({});
    if (rec.url && !S.samePage(rec.url, tabUrl)) rec = V.sanitizeTabRecord(S.carryRecord(rec, tabUrl, V.hostFromUrl) || {}); // missed navigation reset
    rec.url = tabUrl;
    const out = S.applyResult(stats, rec, res, Date.now());
    tabs[key] = out.tab;
    await writeTabs(tabs);
    if (out.counted) await chrome.storage.local.set({ stats: out.stats });
    return { ok: true, counted: out.counted };
  });
}

async function handleContent(msg, ctx) {
  if (msg.type === "supporter") {
    // Cosmetic flag, honour system: only from the real thank-you page with a Stripe-shaped session id.
    if (!V.isThanksUrl(ctx.tabUrl) || !V.validSession(msg.sessionId)) return FAIL;
    await mutate(() => chrome.storage.local.set({ supporter: true }));
    return { ok: true };
  }
  switch (msg.type) {
    case "get-site-state": return siteState(ctx.tabUrl);
    case "result": return recordResult(msg, ctx.tab, ctx.tabUrl);
    default: return FAIL;
  }
}

async function activeTab() {
  const [t] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return t || null;
}

// State for the popup: the site of the tab, whether it is disabled and what happened on this page.
async function popupState(msg) {
  let tab = null;
  if (msg.tabId !== undefined) {
    if (!V.validTabId(msg.tabId)) return FAIL;
    try { tab = await chrome.tabs.get(msg.tabId); } catch (e) { return FAIL; }
  } else tab = await activeTab();
  const version = chrome.runtime.getManifest().version;
  const host = tab ? V.hostFromUrl(tab.url) : "";
  if (!tab || !host) return { ok: true, version, supported: false, tabId: tab && V.validTabId(tab.id) ? tab.id : null };
  const { disabledSites } = await getAll();
  const rec = (await readTabs())[String(tab.id)];
  const same = rec && (S.samePage(rec.url, tab.url) || (rec.carry && V.hostFromUrl(rec.url) === host));
  return {
    ok: true, version, supported: true, tabId: tab.id, host,
    disabled: V.isDisabled(disabledSites, host),
    cookie: same ? rec.cookie : null,
    popups: same ? rec.popups : 0,
  };
}

async function setSiteDisabled(msg) {
  if (!V.validHost(msg.host) || typeof msg.disabled !== "boolean") return FAIL;
  return mutate(async () => {
    const { disabledSites } = await getAll();
    const next = V.withSite(disabledSites, msg.host, msg.disabled);
    if (msg.disabled && next.indexOf(msg.host) < 0) return FAIL; // list full
    await chrome.storage.local.set({ disabledSites: next });
    return { ok: true, disabled: msg.disabled };
  });
}

async function handleExtension(msg) {
  switch (msg.type) {
    case "get-popup-state": return popupState(msg);
    case "set-site-disabled": return setSiteDisabled(msg);
    default: return FAIL;
  }
}

// ---- sender classification ----
// "extension" = our own pages (sender.url on our origin, no tab content script); "content" = a content script
// (sender.tab set, http(s) URL). Anything else is rejected.
function classify(sender) {
  if (!sender || sender.id !== chrome.runtime.id) return null;
  if (typeof sender.url === "string" && sender.url.startsWith("chrome-extension://" + chrome.runtime.id + "/")) {
    return { kind: "extension" };
  }
  if (sender.tab && typeof sender.tab.url === "string" && V.splitUrl(sender.tab.url)) {
    return { kind: "content", tab: sender.tab, tabUrl: sender.tab.url };
  }
  return null;
}

async function handle(msg, sender) {
  const ctx = classify(sender);
  if (!ctx || !msg || typeof msg !== "object" || Array.isArray(msg) || typeof msg.type !== "string") return FAIL;
  return ctx.kind === "content" ? handleContent(msg, ctx) : handleExtension(msg);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handle(msg, sender).then(sendResponse).catch(() => sendResponse(FAIL));
  return true;
});
