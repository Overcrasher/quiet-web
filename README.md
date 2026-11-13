# Quiet Web

A Manifest V3 Chrome extension that automatically says **no** to cookie banners (it only ever clicks reject / "necessary only", never accept)
and closes newsletter / subscribe popups. Everything happens on your device: plain JavaScript, no build step, no libraries,
no network requests. By Quantumbyte Labs.

## Install

1. When published: install from the Chrome Web Store (the store URL is derived from the extension id, nothing is hard-coded).
2. For development, load it unpacked: open `chrome://extensions`, enable **Developer mode**, **Load unpacked**, pick this `quiet-web` folder.
3. Visit a site with a cookie banner. Click the Quiet Web icon to see what was handled on that page.

## How it works

- **Engine** (`content.js`, all frames, `match_about_blank`, `document_idle`): reads the rules that `rules/*.js` register in `globalThis.QuietRules`,
  asks the service worker whether the site is switched off, then tries the rules in order (platform rules first, `generic` last) at idle, on `load`
  and through a debounced `MutationObserver`. It stops after 15 s and right after the first successful action. A rule that detects a banner but fails is
  retried at most 3 times.
- **Rule order of preference**: (1) a "Reject all" / "Necessary only" button; (2) open the settings, untick every optional category (never the strictly
  necessary one), save; (3) only as a last resort hide the banner (outcome `hidden`, counted separately and shown in the popup).
- **Accept guard**: every click goes through `ctx.click`, which refuses any label containing an accept word ("Accept all", "Allow all", "I agree", ...),
  unless it is a "save my selection" label without "all" and the rule opted in with `{selection: true}`.
- **Iframes**: some platforms render in iframes. The rule runs in whichever frame holds the buttons; the service worker counts a page once.
- **Newsletter popups** (`newsletter.js`, top frame only; `dcl-snapshot.js` runs at document_start to remember overlays already on screen at DOMContentLoaded): a fixed element (or absolute with a high z-index / `aria-modal`) covering more than 30 % of the
  viewport, with an email input, that appeared after the page was delivered (not on screen at DOMContentLoaded), with no password or payment field, on a URL that does not contain `login`, `signin`,
  `sign-in`, `signup`, `register`, `checkout`, `cart`, `basket`, `payment`, `pay`, `account`, `auth` or `password` (case-insensitive, path/query/hash),
  and not opened by the user's own click in the last 2 s. It clicks the popup's own close button, otherwise removes the popup and its backdrop, and restores
  scrolling. It watches for 60 s.
- **Pure helpers** (testable with `jsc`): `lib/reject-phrases.js` (normalisation, reject phrases for en/ro/de/fr/es/it/nl/pl, accept guard, consent-dialog text
  detection), `lib/popups.js` (URL exclusion, coverage maths, email/payment predicates, close-text predicate), `lib/stats.js` (counters), `lib/validate.js`,
  `lib/donation.js`, `lib/rating.js`, `lib/growth.js` (store, share and issue URLs).

Rule format and examples: see [`rules/README.md`](rules/README.md).

### Message protocol (content script -> service worker)

| Message | From | Notes |
|---------|------|-------|
| `{type: "get-site-state"}` | any frame | answer `{ok: true, disabled}`; the site is `sender.tab.url`, never a field |
| `{type: "result", kind: "cookie", ruleId, outcome, detail}` | any frame | `outcome` = `rejected` / `saved-necessary` / `hidden` (`none` is never sent) |
| `{type: "result", kind: "popup", ruleId: "newsletter", outcome, detail}` | top frame | `outcome` = `closed` / `removed` |
| `{type: "supporter", sessionId}` | `thanks.js` | only from the exact thanks URL, id `^cs_(live\|test)_[A-Za-z0-9]{20,}$` |

Extension pages only: `{type: "get-popup-state", tabId?}` and `{type: "set-site-disabled", host, disabled}`.

## Files

| File | Purpose |
|------|---------|
| `manifest.json`, `config.js` | MV3 manifest; donation links, amounts and `THANKS_URL` |
| `background.js` | Service worker: validates every message, owns all storage writes, per-tab records |
| `content.js`, `newsletter.js` | Cookie-banner engine; newsletter popup closer |
| `rules/*.js` | One file per consent platform + `generic.js` (written separately, see `rules/README.md`) |
| `thanks.js` | Marks the user as a supporter on the thank-you page |
| `lib/*.js` | Classic scripts on `globalThis` (validate, stats, growth, donation, rating, reject-phrases, popups); `store.js`, `support.js` are ES modules for the pages |
| `popup.*`, `options.*`, `welcome.*` | Extension pages (`welcome.html` opens once, on first install) |
| `icons/`, `tools/make_icons.py` | Icons and their generator |
| `tools/check_release.py`, `tools/package.py` | Release checks and zip builder |
| `docs/`, `PRIVACY.md`, `store/` | GitHub Pages site, privacy policy, store listing |
| `tests/run.js` | Unit tests |

## Security model

Quiet Web is a convenience tool, not a security control.

- The service worker validates every message. Extension pages are recognised by origin; content scripts by `sender.tab` (http/https only). The site always comes
  from `sender.tab.url`, never from the message. Results must have a known `kind`, a matching `outcome`, a slug-shaped `ruleId` and a cleaned `detail`.
  A page is counted once for cookies (first result wins, any frame) and at most 3 popups per page; counters live in the worker only.
- `chrome.storage.local` is restricted to trusted contexts (`setAccessLevel`); content scripts never touch storage.
- Rules may only click, untick and (as a last resort) hide through selectors that are filtered (no braces or angle brackets). No remote code, no `eval`,
  no `innerHTML`; `check_release.py` scans for them. No MAIN-world scripts at the moment.
- Strict extension-page CSP; donation links must be on Stripe origins and are opened only from click listeners via `chrome.tabs.create`.
- Nothing is sent anywhere. "Report broken site" only opens a prefilled GitHub issue (host, extension version, what happened) that the user submits.

## Permissions

- `storage`: counters, the list of sites where Quiet Web is off, donation/rating state.
- `tabs`: shows the current site in the popup and lets the worker tie results to a tab and reset them on navigation. No browsing history is read or stored.
- `<all_urls>` host access: cookie banners and popups appear on every kind of site, so the content scripts must run everywhere (including iframes).
  They look only at the page structure to answer the banner and never send page content anywhere.

## Stripe setup

Create Payment Links in Stripe (EUR; optionally again in USD for `DONATE_LINKS_USD`): `small` 3, `medium` 5, `large` 10, `custom` (EUR 1 product with
adjustable quantity, "Pick your own amount") and `monthly` (EUR 2 / month subscription, shown as a small text link; optional). Stripe may issue them on
`buy.stripe.com` or `donate.stripe.com`; both are accepted. Amounts shown on the buttons come from `DONATE_AMOUNTS` in `config.js`.

For every link, under **After payment** choose *Don't show confirmation page* and set the redirect to:

```
https://overcrasher.github.io/quiet-web/thanks.html?session_id={CHECKOUT_SESSION_ID}
```

`thanks.js` sends `{type: "supporter", sessionId}`; the worker sets `supporter: true` only for the exact thanks page and a Stripe-shaped id.
Asks happen once at 100, 500 and 2,000 handled annoyances, at least 30 days apart, never for supporters or after "Don't ask again". A one-time rating card
appears after 50 handled annoyances (never in the same render as the donation banner).

## Tests

From this folder (no node needed):

```
/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc tests/run.js
```

One command runs every jsc assertion (helpers, engine, rules' pay-or-consent guard, manifest). Browser tests (headless Chrome 157, CDP, stdlib Python):

```
python3 tests/e2e/harness.py          # regression: newsletter, exclusions, per-site switch, popup/counters, donation, welcome, security, rule fixtures
python3 tests/e2e/live.py all         # LIVE pass on real sites -> tests/e2e/LIVE-RESULTS.md input (needs internet, EU region recommended)
```

Fixtures mirror real captures (`tests/e2e/captures/<platform>/fixture.py`) and are served on the real hostnames through Fetch interception.

## Packaging

```
python3 tools/check_release.py            # config / manifest / content-script files / locales
python3 tools/check_release.py --release  # also requires at least one EUR link and the icons
python3 tools/package.py                  # dist/quiet-web-1.0.0.zip (runs the release check first)
python3 tools/package.py --skip-release-check   # test builds only
```

`check_release.py` flags every file listed in the manifest content scripts that does not exist (so missing `rules/*.js` are errors) and every
`rules/*.js` that is not listed.

## Selectors informed by ...

Selectors informed by our own live captures (`tests/e2e/captures/`, taken on real sites in the EU with headless Chrome). DuckDuckGo autoconsent (MPL-2.0)
and Consent-O-Matic (MIT) were consulted for knowledge only; no code was copied. Every rule file is our own code.

### Supported consent platforms

OneTrust, Cookiebot, Didomi, Quantcast Choice (InMobi), TrustArc, Usercentrics, Sourcepoint, plus `rules/generic.js`, a last rule that only clicks a visible
reject-style button (en, ro, de, fr, es, it, nl, pl) inside a dialog that talks about cookies or consent. Verified live per platform: see
`tests/e2e/LIVE-RESULTS.md`.

### Pay-or-consent

Some sites only offer "accept" or "reject and pay / subscribe" (a "cookie paywall"). Rejecting there means paying, so Quiet Web never clicks such a button.
One shared helper, `QuietPhrases.isPayLike` (`lib/reject-phrases.js`), recognises pay/subscribe wording in the supported languages; it is enforced inside
`ctx.click` (no rule can bypass it) and checked by the rules that click directly. When a page is pay-or-consent the popup says "This site asks you to pay or
accept cookies. Quiet Web left the choice to you." and nothing is counted.

### Rules and the page world

All eight rules use only real button clicks and DOM reads in the extension's isolated world (open shadow roots are readable: Usercentrics). No rule uses a
`world: "MAIN"` script, no page API is called and nothing is evaluated.

### Page status across reloads

The per-tab status ("Rejected cookies via ...") lives only in `chrome.storage.session`. If the same site reloads right after the consent (some sites do), the last
result is kept for display; it is cleared when the tab goes to another site or closes. Persistent storage keeps counters and per-site settings only.

## Changes

### 1.0.0

- First release: cookie-banner engine with platform rules and a generic reject-button rule, newsletter popup closer, per-site switch, counters, popup,
  options, welcome page, donation and rating prompts, share button, "Report broken site", five store languages.
