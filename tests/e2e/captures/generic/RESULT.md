# Generic fallback (live, 2026-11-11, ro-RO)
Home-grown banners (none of the 7 platforms): cel.ro (`#gdprNotice`), libris.ro (`#consent_mode_modal`), emag.ro (`.gdpr-cookie-banner`), fashiondays.ro (`#cookie-notification-banner`). Tried without own banner: evomag.ro, pcgarage.ro. altex.ro = Cookiebot, digi24/zf/profit/antena3/romaniatv = OneTrust.
Captures: `cel.ro|libris.ro|emag.ro|fashiondays.ro.{html,json,png}`. Rule: dialog/fixed/sticky element mentioning cookies in a supported language + a button matching QuietPhrases reject (plus a small local EXTRA list) and not pay/subscribe wording; never accepts, never hides.

| Site | Detected | Outcome | Button clicked | Consent state verified | Notes |
|---|---|---|---|---|---|
| cel.ro | generic | rejected | "Refuza toate" | banner gone | needs EXTRA phrase (lib lacks "refuza") |
| libris.ro | generic | rejected | "Refuz toate" | cookie `ck_consentAgreementV2=denyAll`, banner gone | page reloads after click: per-tab record is cleared by navigation, stats counted (cookiesRejected=1) |
| emag.ro | generic | rejected | "Refuză toate" | cookies `gdpr_consent_type=2` | EXTRA phrase |
| fashiondays.ro | generic | rejected | "Doar cele esențiale" | banner gone | EXTRA phrase |
| express.co.uk, mirror.co.uk (pay-or-consent) | no click | none | nothing ("REJECT ALL AND PAY") | TCF `cmpuishown`, nothing recorded | verified live with the guard |

Fixtures: `fixture.py` (libris, emag, pay-or-consent -> none; pass live). Tests: `tests/run_rules_b.js` (176 pass) covers pay-or-consent labels in 8 languages for all four rules.
