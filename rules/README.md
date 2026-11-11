# Quiet Web rule files

One file per consent platform in `rules/`, plus `generic.js` which always runs last. Each file is a classic script
(no modules, no imports) loaded by the manifest into every frame (`all_frames`, `match_about_blank`, `document_idle`)
BEFORE `content.js`. A rule registers itself:

```js
(function (root) {
  "use strict";
  const rules = (root.QuietRules = root.QuietRules || []);
  rules.push({
    id: "onetrust",                       // lowercase, unique; "generic" is always ordered last by the engine
    name: "OneTrust",                     // shown in the popup: "Rejected cookies via OneTrust"
    detect(doc) {                         // sync, cheap, no side effects. Return the banner/dialog element, or null.
      return doc.querySelector("#onetrust-banner-sdk");
    },
    async reject(ctx) {                   // only called when detect() returned an element
      const btn = ctx.doc.querySelector("#onetrust-reject-all-handler");
      if (btn && ctx.click(btn)) return { outcome: "rejected", detail: "Reject all" };
      return { outcome: "none", detail: "" };
    },
    hideSelectors: ["#onetrust-consent-sdk"],  // last resort only (see below)
  });
})(globalThis);
```

## Engine contract (content.js)
- Registry: `globalThis.QuietRules` (array). Valid = `id` string, `detect` and `reject` functions. Duplicate ids ignored.
- When it runs: once the service worker says the site is not disabled (`get-site-state`), then at start (0 ms), on `load`,
  and after every DOM mutation on `documentElement` (childList, subtree, and class/style/hidden/aria-hidden attributes),
  debounced 250 ms. It stops after **15 s** or immediately after the first rule returns an outcome other than `"none"`.
- Order: registration order from the manifest, `generic` last. For each rule: `detect(doc)`; falsy -> next rule; element ->
  `reject(ctx)`. Outcome `"none"` (or a thrown error) -> try the next rule. A rule that detected but returned `"none"` is
  retried at most 3 times (MAX_ATTEMPTS) over the observer lifetime, so a banner that is not clickable yet can succeed on a later pass.
- `reject(ctx)` returns `{ outcome, detail }`; `detail` is a short plain string (<=200 chars, shown in the popup).
  - `"rejected"`: a reject-all / necessary-only button was clicked.
  - `"saved-necessary"`: settings opened, every optional category unticked, "Save/Confirm" clicked.
  - `"hidden"`: last resort. Return it ONLY when clicking was impossible; the engine then hides `hideSelectors` (inline
    `display:none !important` on every match + an injected `<style data-quiet-web>`). If nothing matches, the outcome becomes `"none"`.
  - `"none"`: nothing was done.
- Order of preference inside every rule: (1) reject/necessary-only button; (2) settings -> untick every optional category
  (never the strictly-necessary one) -> save; (3) hide. NEVER click anything that accepts.
- `hideSelectors`: array of plain CSS selectors (no `{ } < > ; \`, <= 200 chars). Cover the dialog AND its backdrop/overlay.
  After hiding, the rule cannot restore page scroll; if the platform locks scrolling include the locking class in the rule's reject code (optional).

## ctx helpers
- `ctx.doc`, `ctx.win`, `ctx.phrases` (= `globalThis.QuietPhrases`, lib/reject-phrases.js), `ctx.ruleId`, `ctx.sleep(ms)`.
- `ctx.click(el, opts?)` -> boolean. Refuses null, disabled and invisible elements, and any label that looks like accepting
  (`phrases.mayClickLabel`). `opts.selection:true` allows a "save my selection / allow selection" label (no "all"). `opts.force:true` skips the visibility check.
  Dispatches pointerdown/mousedown/pointerup/mouseup and then `el.click()`.
- `await ctx.waitFor(selector, ms, rootEl?)` -> first VISIBLE match or `null` after `ms` (polls every 100 ms).
- `ctx.visible(el)` -> boolean (connected, `checkVisibility`, non-zero rect, not display:none/visibility:hidden).
- `ctx.uncheck(el)` -> boolean. Clicks a checked checkbox / `aria-checked="true"` switch; ignores disabled, readOnly and `aria-disabled` controls.
- `ctx.log(msg)` -> `console.debug("Quiet Web: [ruleId] msg")`.
- Useful `ctx.phrases` helpers: `normalize`, `matchReject(text)`, `isAcceptLike`, `mayClickLabel`, `consentLanguage`, `isConsentText`,
  `buttonText(el)`, `findRejectButtons(rootEl)` (visible buttons/links whose text is a reject label).
- Shadow DOM: the isolated world can read OPEN shadow roots (`el.shadowRoot`); closed roots are unreachable (hide the host element instead).

## Frames
The same script runs in every frame (top frame + iframes, `match_about_blank`). `detect(doc)` is called per frame with that
frame's document, so a rule for an iframe-hosted banner (Sourcepoint, TrustArc, sometimes Quantcast) simply detects its own
markup inside the frame. A banner whose host iframe is in the top document but whose buttons are in a cross-origin frame is handled by the frame that has the buttons.
The service worker counts a page once for cookies (any frame), so several frames reporting does not inflate counters. Make
`detect` return null in frames that do not contain the banner, and never act on elements of other documents.

## MAIN world (page APIs)
Prefer clicking real buttons. If a platform can only be rejected through its page API (`OneTrust.RejectAll()`, `Cookiebot.decline()`),
add a tiny separate file (e.g. `rules/onetrust-main.js`) registered in the manifest as a `"world": "MAIN"` content script that only
calls the documented function when it receives a `CustomEvent` from the isolated rule; NO generic eval, no strings executed. Add the
file to `manifest.json` and to `tools/package.py`'s file list. Currently no rule uses the main world; list any that do here and in the README.

## Do not copy
Selectors informed by open-source rule sets are fine; copied code is not (DuckDuckGo autoconsent MPL-2.0, Consent-O-Matic MIT).
Write your own logic and credit consulted projects in the README (`<!-- RULES-CREDITS -->`).

## Testing
Real banners are captured under `tests/e2e/captures/<platform>/`; fixtures mirroring them are served on the real hostnames by
`tests/e2e/harness.py` (hook: `RULE_FIXTURES` in `tests/e2e/rule_fixtures.py`).
