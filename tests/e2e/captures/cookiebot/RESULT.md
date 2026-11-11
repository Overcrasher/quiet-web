# Cookiebot
Sources consulted: none (rule written from the live captures in this folder; no code from autoconsent / Consent-O-Matic). Verified headless Chrome 157, EU machine, extension loaded via Extensions.loadUnpacked, fresh profile, `verify_a.py`. After-screenshots: `<site>-after.png`.

| site | detected | outcome | consent state verified | notes |
|---|---|---|---|---|
| cookiebot.com | yes | rejected (Deny) | Cookiebot.consent: necessary only, method explicit | |
| berlingske.dk | yes | rejected (Kun naedvendige) | consent necessary only, explicit | TCF vendor list present, still plain Deny button |
| dr.dk | yes | saved-necessary (custom "drcc" template inside #CybotCookiebotDialog, no reject button; Tillad udvalgte with nothing ticked) | consent necessary only, explicit | optional boxes were already unticked ("Unticked 0") |

Tried also: nordicsemi.com (no banner). Customize layer on cookiebot.com captured: toggles ids ...LevelButton{Preferences,Statistics,Marketing}Inline, "Allow selection" id ...OptinAllowallSelection; fallback path not exercised live.
