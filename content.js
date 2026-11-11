// Quiet Web cookie-banner engine (content script, all frames). It registers no rules itself: it runs the rules that
// rules/*.js pushed into globalThis.QuietRules (see rules/README.md). Content scripts never touch storage: the site
// state and every result go through the service worker.
//
// All DOM access goes through `env` so the logic can be tested with stubs (tests/run.js). The auto-start at the bottom
// only runs inside a real extension content script.
(function (root) {
  "use strict";

  const MAX_RUN_MS = 15000;      // stop observing after 15 s
  const DEBOUNCE_MS = 250;       // MutationObserver debounce
  const MAX_ATTEMPTS = 3;        // detect-but-failed attempts per rule
  const OUTCOMES = ["rejected", "saved-necessary", "hidden", "none"];

  // Valid rules only; "generic" always last, otherwise registration (manifest) order.
  function orderRules(list) {
    const ok = (Array.isArray(list) ? list : []).filter((r) => r && typeof r.id === "string" && typeof r.detect === "function" && typeof r.reject === "function");
    const seen = new Set();
    const uniq = ok.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
    return uniq.filter((r) => r.id !== "generic").concat(uniq.filter((r) => r.id === "generic"));
  }
  // CSS selectors from a rule's hideSelectors: plain strings only, no braces / angle brackets / semicolons / backslashes.
  function safeSelectors(list) {
    return (Array.isArray(list) ? list : []).filter((s) => typeof s === "string" && s.length > 0 && s.length <= 200 && !/[{}<>;\\]/.test(s));
  }
  function normalizeResult(res) {
    const outcome = res && typeof res.outcome === "string" && OUTCOMES.indexOf(res.outcome) >= 0 ? res.outcome : "none";
    const detail = res && typeof res.detail === "string" ? res.detail.slice(0, 200) : "";
    return { outcome, detail };
  }

  // env: { doc, win, send(msg) -> Promise<response>, rules, setTimeout, clearTimeout, now(), Observer (MutationObserver|null), phrases }
  function createEngine(env) {
    const doc = env.doc, win = env.win;
    const rules = orderRules(env.rules);
    const phrases = env.phrases || root.QuietPhrases;
    const attempts = {};
    let started = false, stopped = false, running = false, rerun = false, timer = null, deadline = null, observer = null;
    let startedAt = 0, stopReason = "", payReported = false, payRule = null;

    const log = (msg) => { try { if (env.log) env.log(String(msg).slice(0, 300)); } catch (e) { /* ignore */ } };
    const sleep = (ms) => new Promise((res) => env.setTimeout(res, ms));

    function visible(el) {
      if (!el || el.isConnected === false) return false;
      try {
        if (typeof el.checkVisibility === "function" && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
        const r = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
        if (r && r.width === 0 && r.height === 0) return false;
        const cs = win.getComputedStyle ? win.getComputedStyle(el) : null;
        if (cs && (cs.display === "none" || cs.visibility === "hidden")) return false;
      } catch (e) { return false; }
      return true;
    }

    function makeCtx(rule) {
      return {
        doc, win, phrases, ruleId: rule.id, sleep,
        visible,
        // Clicks a real element. Refuses invisible/disabled elements and any label with an accept word, unless
        // opts.selection is set and the label is a "save my selection" label without "all" (e.g. "Allow selection").
        click(el, opts) {
          if (!el || typeof el.click !== "function" || el.disabled) return false;
          if (!(opts && opts.force) && !visible(el)) return false;
          const label = phrases ? phrases.buttonText(el) : "";
          // Pay-or-consent buttons ("Reject and pay/subscribe") are never clicked, whatever the rule asks for.
          if (!phrases || phrases.isPayLike(label)) { log("refused to click pay/subscribe label: " + label); return false; }
          if (phrases && !phrases.mayClickLabel(label, !!(opts && opts.selection))) { log("refused to click accept-like label: " + label); return false; }
          try {
            for (const t of ["pointerdown", "mousedown", "pointerup", "mouseup"]) {
              const Ev = t.indexOf("pointer") === 0 && win.PointerEvent ? win.PointerEvent : win.MouseEvent;
              if (Ev) el.dispatchEvent(new Ev(t, { bubbles: true, cancelable: true, view: win }));
            }
            el.click();
          } catch (e) { log("click failed: " + e); return false; }
          return true;
        },
        // First VISIBLE element matching selector (under root, default document), polling until ms elapsed. null on timeout.
        async waitFor(selector, ms, rootEl) {
          const end = env.now() + (typeof ms === "number" ? ms : 3000);
          for (;;) {
            let list = [];
            try { list = Array.from((rootEl || doc).querySelectorAll(selector)); } catch (e) { return null; }
            const hit = list.find(visible);
            if (hit) return hit;
            if (env.now() >= end) return null;
            await sleep(100);
          }
        },
        // Unticks a checkbox / switch if it is on. Never touches disabled or read-only controls (strictly necessary ones).
        // Returns true if it changed something.
        uncheck(el) {
          if (!el || el.disabled || el.readOnly || el.getAttribute && el.getAttribute("aria-disabled") === "true") return false;
          const isBox = el.type === "checkbox";
          const on = isBox ? el.checked === true : el.getAttribute && el.getAttribute("aria-checked") === "true";
          if (!on) return false;
          try { el.click(); } catch (e) { return false; }
          return true;
        },
        log: (m) => log("[" + rule.id + "] " + m),
      };
    }

    // Last resort: hide via an injected <style> (document level) plus inline display:none on the matches (page CSP can
    // block injected style elements). Returns the number of hidden elements (0 = nothing matched, nothing changed).
    function hide(rule) {
      const sels = safeSelectors(rule.hideSelectors);
      if (!sels.length) return 0;
      let count = 0;
      for (const s of sels) {
        let list = [];
        try { list = Array.from(doc.querySelectorAll(s)); } catch (e) { continue; }
        for (const el of list) {
          try { el.style.setProperty("display", "none", "important"); count++; } catch (e) { /* ignore */ }
        }
      }
      if (!count) return 0;
      try {
        const st = doc.createElement("style");
        st.setAttribute("data-quiet-web", "hidden");
        st.textContent = sels.map((s) => s + "{display:none !important}").join("\n");
        (doc.head || doc.documentElement).appendChild(st);
      } catch (e) { /* ignore */ }
      return count;
    }

    function report(rule, res) {
      return Promise.resolve(env.send({ type: "result", kind: "cookie", ruleId: rule.id, outcome: res.outcome, detail: res.detail })).catch(() => {});
    }

    function stop(reason) {
      if (stopped) return;
      stopped = true; stopReason = reason;
      if (observer) { try { observer.disconnect(); } catch (e) { /* ignore */ } observer = null; }
      if (timer) env.clearTimeout(timer);
      if (deadline) env.clearTimeout(deadline);
      timer = deadline = null;
    }

    async function pass() {
      if (stopped) return;
      if (running) { rerun = true; return; }
      running = true;
      try {
        for (const rule of rules) {
          if (stopped) break;
          if ((attempts[rule.id] || 0) >= MAX_ATTEMPTS) continue;
          let el = null;
          try { el = rule.detect(doc); } catch (e) { log("detect failed in " + rule.id + ": " + e); continue; }
          if (!el) continue;
          attempts[rule.id] = (attempts[rule.id] || 0) + 1;
          let res;
          try { res = normalizeResult(await rule.reject(makeCtx(rule))); } catch (e) { log("reject failed in " + rule.id + ": " + e); continue; }
          if (res.outcome === "none" && /^pay-or-consent/.test(res.detail)) { payRule = rule; continue; }
          if (res.outcome === "hidden" && !hide(rule)) res = { outcome: "none", detail: "" };
          if (res.outcome === "none") continue;
          await report(rule, res);
          stop("handled:" + rule.id);
          return;
        }
        // Nothing could be answered, but a banner only offers "reject and pay": tell the popup (not counted).
        if (payRule && !payReported && !stopped) {
          payReported = true;
          await Promise.resolve(env.send({ type: "result", kind: "cookie", ruleId: payRule.id, outcome: "pay-or-consent", detail: "" })).catch(() => {});
        }
      } finally {
        running = false;
        if (rerun && !stopped) { rerun = false; schedule(); }
      }
    }

    function schedule(ms) {
      if (stopped) return;
      if (timer) env.clearTimeout(timer);
      timer = env.setTimeout(() => { timer = null; pass(); }, typeof ms === "number" ? ms : DEBOUNCE_MS);
    }

    async function start() {
      if (started) return;
      started = true;
      startedAt = env.now();
      if (!rules.length) { stop("no-rules"); return; }
      // The service worker may not be ready yet (just started / extension just loaded): retry with backoff.
      let st = null;
      for (const wait of [0, 250, 500, 1000, 2000]) {
        if (wait) await sleep(wait);
        try { st = await env.send({ type: "get-site-state" }); } catch (e) { st = null; }
        if (st && st.ok === true) break;
        st = null;
      }
      if (!st || st.disabled === true) { stop(st && st.disabled === true ? "disabled" : "no-state"); return; }
      if (stopped) return;
      schedule(0);
      if (doc.readyState !== "complete") win.addEventListener("load", () => schedule(0), { once: true });
      if (env.Observer && doc.documentElement) {
        observer = new env.Observer(() => schedule());
        observer.observe(doc.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "hidden", "aria-hidden"] });
      }
      deadline = env.setTimeout(() => stop("timeout"), MAX_RUN_MS);
    }

    return { start, pass, stop, orderedRules: () => rules.map((r) => r.id), state: () => ({ started, stopped, running, stopReason, attempts: Object.assign({}, attempts) }), startedAt: () => startedAt };
  }

  root.QuietEngine = { MAX_RUN_MS, DEBOUNCE_MS, MAX_ATTEMPTS, orderRules, safeSelectors, normalizeResult, createEngine };

  // Auto-start inside a real extension content script only.
  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id && typeof document !== "undefined" && document.documentElement) {
    const ct = document.contentType;
    if (!ct || ct === "text/html" || ct === "application/xhtml+xml") {
      createEngine({
        doc: document, win: window, rules: root.QuietRules, phrases: root.QuietPhrases,
        send: (m) => chrome.runtime.sendMessage(m),
        setTimeout: (f, ms) => setTimeout(f, ms), clearTimeout: (t) => clearTimeout(t),
        now: () => Date.now(), Observer: typeof MutationObserver === "function" ? MutationObserver : null,
        log: (m) => console.debug("Quiet Web: " + m),
      }).start();
    }
  }
})(globalThis);
