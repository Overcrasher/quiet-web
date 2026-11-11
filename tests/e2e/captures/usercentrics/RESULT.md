# Usercentrics (live, 2026-11-11, de-DE)
Probe: dm.de, zalando.de, o2online.de show `#usercentrics-root` with an OPEN shadow root (reachable from the isolated world, no MAIN-world file needed); fressnapf.de and usercentrics.com use `#usercentrics-cmp-ui` (open shadow root, buttons without data-testid: `button.uc-deny-button#deny`). siemens.com: root present but no banner shown. Not shown from here: mediamarkt.de, saturn.de, idealo.de, check24.de, t3n.de, kicker.de, bosch.com.
Captures: `dm.de|zalando.de|o2online.de|fressnapf.de|usercentrics.com.{html,json,png}` (html = pierced DOM incl. shadow roots). Deny: `[data-testid=uc-deny-all-button]` ("Einwilligung ablehnen" / "Nur Notwendige" / "Verweigern"), cmp-ui: `button.uc-deny-button` ("Nur notwendige Cookies"); first-layer reject exists everywhere. Globals `UC_UI` (+ `__ucCmp` on cmp-ui).

| Site | Detected | Outcome | Button clicked | Consent state verified (UC_UI.getServicesFullInfo) | Notes |
|---|---|---|---|---|---|
| dm.de | yes | rejected | "Einwilligung ablehnen" | essential 10 on; functional 2, marketing 10, custom 4 off | banner gone, no console errors |
| zalando.de | yes | rejected | "Nur Notwendige" | essential 17 on; marketing 31, custom 9 off | banner gone |
| o2online.de | yes | rejected | "Verweigern" | essential 32 on; marketing/functional/custom 26 off | banner gone |
| fressnapf.de | yes (cmp-ui) | rejected | "Nur notwendige Cookies" | localStorage `cookie_consent={"necessary":true,"statistics":false,"marketing":false}` (UC_UI info empty on this build) | banner gone |

Not live-tested: settings fallback (untick + save), closed-shadow-root hide. Fixtures: `fixture.py` (shadow root built by script, pass live).
Sources: captures; autoconsent / Consent-O-Matic consulted for knowledge only.
