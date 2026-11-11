# Privacy Policy – Quiet Web

**No data leaves your device.**

Quiet Web stores only counters (cookie banners rejected, banners hidden, popups closed), per-site settings (the sites where you switched it off) and donation state in your browser's local extension storage (`chrome.storage.local`).

- No analytics, no tracking, no ads, no accounts.
- No server is contacted by the extension. It makes no network requests of its own.
- To find cookie banners and newsletter popups, Quiet Web reads the structure and visible text of pages you visit, on your device only. That content is never stored and never sent anywhere. Page addresses are not stored either; the only per-site data kept is the list of sites you chose to switch off.
- What happened on the page you are viewing (for example "Rejected cookies via a consent platform") is shown in the popup. It is held only in the browser's temporary memory for that open tab and discarded afterwards.
- "Report broken site" opens a prefilled GitHub issue in a new tab (site name, extension version and what happened, nothing else). Nothing is sent unless you submit that issue yourself on GitHub.
- Quiet Web never clicks "Accept" on a cookie banner, and never acts on login, sign-up, checkout, cart, payment or account pages.
- Permissions: `storage` (counters and settings), `tabs` (to show the current site in the popup) and access to all sites (`<all_urls>`), which is unavoidable because banners appear on every kind of site. All processing is local.
- Donation links open in a normal browser tab, at your request. Payments are handled entirely by Stripe on their own page; the extension never sees payment details.
- The optional thank-you page only lets the extension mark you as a supporter locally (a flag stored on your device). It is hosted on GitHub Pages, so visiting it contacts GitHub (their privacy policy applies). The extension itself still sends nothing.

You can erase all data at any time by removing the extension.

Questions: open an issue at https://github.com/Overcrasher/quiet-web/issues.

Publisher: Quantumbyte Labs.
