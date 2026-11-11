# TrustArc (live, 2026-11-11, EU machine, headless Chrome 157, extension loaded unpacked)
Probe: trustarc.com, ibm.com, garmin.com show the banner (#consent_blackbar > #truste-consent-track). Others tried without banner: bmw.com, dailymail, telegraph.
Captures (no extension): `trustarc.com|ibm.com|garmin.com.{html,json,png}`. Buttons: `#truste-consent-required` (reject: "Reject Optional" / "Required only" / "Decline"), `#truste-consent-button` (accept), `#truste-show-consent` (manage, not on IBM). Page global `truste`; no `__tcfapi`.

| Site | Detected | Outcome | Button clicked | Consent state verified | Notes |
|---|---|---|---|---|---|
| trustarc.com | yes, trustarc | rejected | "Reject Optional" | cookies `notice_gdpr_prefs=0:`, `notice_preferences=0:`, `cmapi_cookie_privacy=permit_1_required` (accept-all would be `0,1,2:`) | banner gone (trustarc.com.after.png), no extension console output |
| ibm.com | yes, trustarc | rejected | "Required only" | `notice_gdpr_prefs=0:`, `cmapi_cookie_privacy=permit_1_required`, Adobe `general=out` | banner gone; one console TypeError `reading 'ECID'` comes from the page's own script |
| garmin.com (ro-RO) | yes, trustarc | rejected | "DECLINE" | `notice_gdpr_prefs=0:`, `permit 1 required` | banner gone |

Not live-tested: the "Manage Settings" preference-centre popup (rule hides the banner only if no reject button exists). Fixtures: `fixture.py` (2, pass live via rb_fixtures.py).
Sources: own reading of the captures; DuckDuckGo autoconsent (MPL-2.0) / Consent-O-Matic (MIT) consulted for knowledge of the truste ids only, no code copied.
Tools: rb_capture.py (capture), rb_live.py (live with extension), rb_fixtures.py.
