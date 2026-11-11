import { getAll } from "./lib/store.js";
import { renderDonateButtons, bindMonthlyLink } from "./lib/support.js";

const $ = (id) => document.getElementById(id);
const G = globalThis.QuietGrowth;
const EXT_ID = chrome.runtime.id;
let savedTimer;

// Only these exact URLs can be opened from this page (click listeners, chrome.tabs.create).
const ALLOWED_LINKS = [G.storeUrl(EXT_ID), G.WAIT24_URL, G.MEETING_METER_URL];
function bindLink(id, url) {
  $(id).href = url;
  $(id).addEventListener("click", (e) => {
    e.preventDefault();
    if (ALLOWED_LINKS.includes(url)) chrome.tabs.create({ url });
  });
}

function flashSaved() {
  const el = $("saved");
  el.classList.add("show");
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => el.classList.remove("show"), 1400);
}

function renderSites(list) {
  const ul = $("sites");
  ul.textContent = "";
  $("sites-empty").hidden = list.length > 0;
  for (const host of list) {
    const li = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = host;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "secondary";
    b.textContent = "Remove";
    b.setAttribute("aria-label", "Turn Quiet Web back on for " + host);
    b.addEventListener("click", async () => {
      let res = null;
      try { res = await chrome.runtime.sendMessage({ type: "set-site-disabled", host, disabled: false }); } catch (e) { res = null; }
      if (res && res.ok) { flashSaved(); renderSites((await getAll()).disabledSites); }
    });
    li.append(name, b);
    ul.appendChild(li);
  }
}

async function init() {
  bindLink("rate-link", G.storeUrl(EXT_ID));
  bindLink("wait24-link", G.WAIT24_URL);
  bindLink("meter-link", G.MEETING_METER_URL);
  const state = await getAll();
  renderSites(state.disabledSites);
  $("thanks").hidden = !state.supporter;
  const shown = renderDonateButtons($("donate"), $("donate-note"));
  const monthly = bindMonthlyLink($("monthly"));
  if (!shown && !monthly) $("donate-note").textContent = "Donation links not configured yet";
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && "disabledSites" in changes) getAll().then((s) => renderSites(s.disabledSites));
  });
}
init();
