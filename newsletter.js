// Quiet Web newsletter / subscribe popup closer (content script; acts in the top frame only).
// Heuristic: a fixed (or high z-index absolute) element covering more than 30 % of the viewport, with an email input,
// that appeared AFTER page load, with no password / payment field, on a URL that is not login/checkout-like, and not
// opened by the user's own click. Needs lib/popups.js and lib/reject-phrases.js.
(function (root) {
  "use strict";

  const WATCH_MS = 60000;      // stop observing after 60 s
  const DEBOUNCE_MS = 300;
  const VERIFY_MS = 600;       // after clicking a close button, wait before falling back to removal
  const GESTURE_MS = 2000;     // user-opened modals (contact forms etc.) are left alone
  const MAX_HANDLED = 3;
  const MAX_RETRIES = 8;       // re-checks of a candidate that was not a large visible overlay yet
  const RETRY_MS = 500;
  const SWEEP_MS = 1000;       // slow safety-net scan of visible email inputs
  const MAX_OVERLAY_TEXT = 1500;
  const LOCK_CLASSES = ["no-scroll", "noscroll", "modal-open", "overflow-hidden", "scroll-lock", "scroll-locked", "is-locked", "has-popup", "popup-open", "stop-scrolling"];

  // env: { doc, win, isTop, send, setTimeout, clearTimeout, now, Observer, P (QuietPopups) }
  function createWatcher(env) {
    const doc = env.doc, win = env.win, P = env.P || root.QuietPopups;
    let stopped = false, loaded = doc.readyState === "complete", handled = 0, lastGesture = 0, timer = null, busy = false, observer = null, stopTimer = null;
    const pending = new Map(); // element -> appearedAt
    const tries = new Map();   // element -> re-checks so far (fade-in animations)

    const vw = () => win.innerWidth || doc.documentElement.clientWidth || 0;
    const vh = () => win.innerHeight || doc.documentElement.clientHeight || 0;
    const sleep = (ms) => new Promise((res) => env.setTimeout(res, ms));
    const style = (el) => { try { return win.getComputedStyle(el); } catch (e) { return null; } };
    const rectOf = (el) => { try { return el.getBoundingClientRect(); } catch (e) { return null; } };
    const isVisible = (el) => {
      const cs = style(el), r = rectOf(el);
      return !!cs && !!r && cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity) !== 0 && r.width > 0 && r.height > 0;
    };

    function descriptor(i) {
      const g = (a) => (i.getAttribute ? i.getAttribute(a) || "" : "");
      return { type: i.type || g("type"), name: i.name || g("name"), id: i.id || "", placeholder: g("placeholder"), autocomplete: g("autocomplete"), ariaLabel: g("aria-label") };
    }

    // Is `el` an overlay we may act on? (positioning, size, content; NOT timing / URL, checked by the caller.)
    function isOverlay(el) {
      if (!el || el === doc.body || el === doc.documentElement) return false;
      const cs = style(el);
      if (!cs || (cs.position !== "fixed" && cs.position !== "absolute")) return false;
      if (cs.position === "absolute") {
        const z = parseInt(cs.zIndex, 10);
        const role = el.getAttribute("role"), modal = el.getAttribute("aria-modal");
        if (!(z >= 10) && role !== "dialog" && modal !== "true") return false;
      }
      if (!isVisible(el) || !P.isLargeOverlay(rectOf(el), vw(), vh())) return false;
      if (el.querySelector("main, article, [role=main], nav, footer")) return false; // a page wrapper, not a popup
      if ((el.textContent || "").length > MAX_OVERLAY_TEXT) return false;
      const inputs = Array.from(el.querySelectorAll("input, textarea, select")).map(descriptor);
      return P.overlayInputsOk(inputs);
    }

    // Closest ancestor (or self) of a visible email input that is an overlay.
    function overlayFor(el) {
      const inputs = el.matches && el.matches("input") ? [el] : [];
      if (el.querySelectorAll) for (const i of Array.from(el.querySelectorAll("input")).slice(0, 20)) inputs.push(i);
      for (const input of inputs) {
        if (!P.isEmailInput(descriptor(input)) || !isVisible(input)) continue;
        for (let a = input.parentElement; a && a !== doc.body && a !== doc.documentElement; a = a.parentElement) {
          if (isOverlay(a)) return a;
        }
      }
      return null;
    }

    function findCloseButton(overlay) {
      const all = Array.from(overlay.querySelectorAll("button, [role=button], a, [aria-label], [title], span, div, i, svg")).slice(0, 300);
      const ok = (el) => !el.querySelector("input") && el.type !== "submit" && isVisible(el);
      const byText = all.find((el) => ok(el) && (P.isCloseText(el.textContent || "") || P.isCloseText(el.getAttribute("aria-label") || "") || P.isCloseText(el.getAttribute("title") || "")));
      if (byText) return byText;
      return all.find((el) => {
        const cls = typeof el.className === "string" ? el.className : (el.getAttribute("class") || "");
        if (!/close|dismiss/i.test(cls) || !ok(el)) return false;
        const r = rectOf(el);
        return !!r && r.width <= 90 && r.height <= 90;
      }) || null;
    }

    // Backdrops: sibling overlays covering most of the viewport with no inputs and almost no text.
    function siblingBackdrops(overlay) {
      const out = [];
      const parent = overlay.parentElement;
      if (!parent) return out;
      for (const s of Array.from(parent.children)) {
        if (s === overlay) continue;
        const cs = style(s);
        if (!cs || (cs.position !== "fixed" && cs.position !== "absolute")) continue;
        if (P.coverage(rectOf(s), vw(), vh()) < 0.8 || s.querySelector("input, textarea, select") || (s.textContent || "").trim().length > 50) continue;
        out.push(s);
      }
      return out;
    }

    // Undoes the usual scroll locks left behind: inline overflow hidden, position:fixed + negative top, known classes.
    function restoreScroll() {
      const b = doc.body, h = doc.documentElement;
      for (const el of [h, b]) {
        if (!el || !el.style) continue;
        if (el.style.overflow === "hidden") el.style.overflow = "";
        if (el.style.overflowY === "hidden") el.style.overflowY = "";
        if (el.classList) for (const c of LOCK_CLASSES) el.classList.remove(c);
      }
      if (b && b.style && b.style.position === "fixed") {
        const y = P.lockedScrollY(b.style.top, "fixed");
        for (const p of ["position", "top", "left", "right", "width"]) b.style.removeProperty(p);
        if (y > 0) { try { win.scrollTo(0, y); } catch (e) { /* ignore */ } }
      }
    }

    async function handle(overlay) {
      const btn = findCloseButton(overlay);
      let outcome = "removed";
      if (btn) {
        try { btn.click(); outcome = "closed"; } catch (e) { /* fall through to removal */ }
        await sleep(VERIFY_MS);
        if (overlay.isConnected && isVisible(overlay)) outcome = "removed";
      }
      if (outcome === "removed") {
        for (const bd of siblingBackdrops(overlay)) { try { bd.remove(); } catch (e) { /* ignore */ } }
        try { overlay.remove(); } catch (e) { return; }
      }
      restoreScroll();
      handled++;
      try { await env.send({ type: "result", kind: "popup", ruleId: "newsletter", outcome, detail: "" }); } catch (e) { /* ignore */ }
      if (handled >= MAX_HANDLED) stop();
    }

    async function scan() {
      if (stopped || busy) return;
      busy = true; let retry = false;
      try {
        if (P.isExcludedUrl(win.location.href)) { pending.clear(); return; }
        const items = Array.from(pending.entries());
        pending.clear();
        for (const [el, at] of items) {
          if (stopped || !el.isConnected) continue;
          if (P.userOpened(lastGesture, at, GESTURE_MS)) continue;
          const overlay = overlayFor(el);
          if (overlay && !isPreexisting(overlay)) { await handle(overlay); if (stopped) break; }
          else if (overlay) { /* part of the page as delivered */ }
          else if (el.querySelector && el.querySelector("input") && (tries.get(el) || 0) < MAX_RETRIES) {
            // Popups often fade/scale in: not large or visible yet on the first look. Look again shortly.
            tries.set(el, (tries.get(el) || 0) + 1);
            pending.set(el, at); retry = true;
          }
        }
      } finally { busy = false; if (retry && !stopped) { retry = false; if (timer) env.clearTimeout(timer); timer = env.setTimeout(() => { timer = null; scan(); }, RETRY_MS); } }
    }
    // Safety net for popups that become visible without any mutation we can see (CSS animations, late triggers): once a
    // second, look at visible email inputs. Overlays already on screen when the page finished loading are left alone.
    const preexisting = new WeakSet();
    const firstSeen = new WeakMap();
    function allEmailOverlays() {
      const out = new Set();
      let inputs = [];
      try { inputs = Array.from(doc.querySelectorAll("input")).slice(0, 60); } catch (e) { return out; }
      for (const i of inputs) {
        if (!P.isEmailInput(descriptor(i)) || !isVisible(i)) continue;
        const o = overlayFor(i);
        if (o) out.add(o);
      }
      return out;
    }
    // Overlays on screen at DOMContentLoaded (recorded by dcl-snapshot.js) are part of the page; if that script did not run, fall
    // back to "on screen when we started".
    function snapshot() { for (const o of allEmailOverlays()) preexisting.add(o); }
    function isPreexisting(o) {
      if (preexisting.has(o)) return true;
      const d = root.QuietDcl;
      if (!d || !d.done) return false;
      if (d.set.has(o)) return true;
      for (let a = o.parentElement; a; a = a.parentElement) if (d.set.has(a)) return true;
      return false;
    }
    async function sweep() {
      if (stopped || busy) return;
      if (P.isExcludedUrl(win.location.href)) return;
      busy = true;
      try {
        for (const o of allEmailOverlays()) {
          if (stopped) break;
          if (isPreexisting(o)) continue;
          if (!firstSeen.has(o)) firstSeen.set(o, env.now());
          if (P.userOpened(lastGesture, firstSeen.get(o), GESTURE_MS)) continue;
          await handle(o);
        }
      } finally { busy = false; }
    }
    function sweepLoop() {
      if (stopped) return;
      sweep().then(() => { if (!stopped) env.setTimeout(sweepLoop, SWEEP_MS); });
    }
    function onLoaded() { loaded = true; sweepLoop(); }

    function schedule() {
      if (stopped) return;
      if (timer) env.clearTimeout(timer);
      timer = env.setTimeout(() => { timer = null; scan(); }, DEBOUNCE_MS);
    }

    function queue(el) {
      if (!el || el.nodeType !== 1) return;
      if (!pending.has(el)) pending.set(el, env.now());
    }
    function onMutations(records) {
      if (!loaded || stopped) return;
      for (const r of records) {
        if (r.type === "attributes") queue(r.target);
        else for (const n of Array.from(r.addedNodes || [])) queue(n);
      }
      if (pending.size) schedule();
    }

    function stop() {
      if (stopped) return;
      stopped = true;
      if (observer) { try { observer.disconnect(); } catch (e) { /* ignore */ } observer = null; }
      if (timer) env.clearTimeout(timer);
      if (stopTimer) env.clearTimeout(stopTimer);
      timer = stopTimer = null;
    }

    async function start() {
      if (!env.isTop || P.isExcludedUrl(win.location.href)) { stop(); return; }
      let st = null;
      for (const wait of [0, 250, 500, 1000, 2000]) { // the service worker may still be starting
        if (wait) await sleep(wait);
        try { st = await env.send({ type: "get-site-state" }); } catch (e) { st = null; }
        if (st && st.ok === true) break;
        st = null;
      }
      if (!st || st.disabled === true) { stop(); return; }
      if (stopped) return;
      loaded = loaded || doc.readyState === "complete";
      const gesture = () => { lastGesture = env.now(); };
      for (const t of ["pointerdown", "keydown", "touchstart"]) win.addEventListener(t, (e) => { if (e.isTrusted) gesture(); }, true);
      // The script starts at document_idle: whatever is on screen now is "part of the page"; anything that shows up later is a popup.
      // (A page can take many seconds to fire `load`; waiting for it would miss popups that open meanwhile.)
      if (!root.QuietDcl || !root.QuietDcl.done) snapshot(); // no DOMContentLoaded record: treat what is on screen now as the page
      onLoaded();
      if (env.Observer) {
        observer = new env.Observer(onMutations);
        observer.observe(doc.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "hidden", "aria-hidden"] });
      }
      stopTimer = env.setTimeout(stop, WATCH_MS);
    }

    return { start, stop, scan, queue, isOverlay, overlayFor, findCloseButton, restoreScroll, state: () => ({ stopped, handled, loaded }), markLoaded: () => { loaded = true; }, gesture: (t) => { lastGesture = t; } };
  }

  root.QuietNewsletter = { WATCH_MS, GESTURE_MS, MAX_HANDLED, createWatcher };

  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id && typeof document !== "undefined" && document.documentElement && window.top === window) {
    const ct = document.contentType;
    if (!ct || ct === "text/html" || ct === "application/xhtml+xml") {
      createWatcher({
        doc: document, win: window, isTop: true, P: root.QuietPopups,
        send: (m) => chrome.runtime.sendMessage(m),
        setTimeout: (f, ms) => setTimeout(f, ms), clearTimeout: (t) => clearTimeout(t),
        now: () => Date.now(), Observer: typeof MutationObserver === "function" ? MutationObserver : null,
      }).start();
    }
  }
})(globalThis);
