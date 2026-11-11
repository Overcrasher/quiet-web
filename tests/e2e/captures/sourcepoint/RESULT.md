# Sourcepoint (live, 2026-11-11)
Probe: message iframe `sp_message_iframe_*` on bbc.com, sky.com, spiegel.de, theguardian.com, independent.co.uk, t-online.de (bbc/sky/independent used for rejects). Second layer = another iframe `/privacy-manager/index.html`. Captures: `bbc.com|spiegel.de|theguardian.com.{html,json,png}` (frame DOM included: pierced contentDocument, or OOPIF target for bbc).
Choice classes on buttons: `sp_choice_type_11` accept, `12` options, `13` reject all, `9` SUBSCRIBE (pay-or-consent: never clicked); PM: `SAVE_AND_EXIT`, `ACCEPT_ALL`, `REJECT_ALL`, `CANCEL`. Globals `__tcfapi`, `_sp_`.
Rule = frame-local (content scripts run in the message frame and the PM frame); the top document does nothing (never hides, never pays). No click sleeps (frame is torn down immediately; result must be sent first).

| Site | Detected | Outcome | Button clicked | Consent state verified (__tcfapi getTCData) | Notes |
|---|---|---|---|---|---|
| bbc.com | yes | rejected | "I do not agree" (type 13) | `useractioncomplete`, purpose consents {} , 0 vendors | OOPIF frame; clicked directly because ctx.click's guard treats "agree" as accept |
| sky.com | yes | rejected | "Essential cookies only" | `useractioncomplete`, consents {} | |
| independent.co.uk | yes | rejected | "ESSENTIAL COOKIES ONLY" | `useractioncomplete`, euconsent-v2 set, consents {} | page-owned console errors only |
| theguardian.com | yes | none (pay-or-consent) | nothing; PM opened, save is disabled (purposes cannot be declined), rule cancels | no consent recorded (`cmpuishown`) | only options: Accept all / "Reject all and subscribe" |
| spiegel.de | yes | none (pay-or-consent) | PM opened, 3 purposes declined, save did not register | `cmpuishown`, no consent recorded | "Einwilligen und weiter" / "Jetzt abonnieren" |

Fixtures: `fixture.py` (bbc-style reject = pass, guardian-style pay-only = none; each has `frame_url`/`frame_html`, harness must fulfill the frame too; same-origin URL used because cross-origin frames need auto-attach for Fetch).
Open: spiegel PM path leaves the message open after a failed save (no clean back-out found).
Sources: captures; autoconsent / Consent-O-Matic knowledge only (choice-type numbering confirmed from live DOM).
