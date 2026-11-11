# OneTrust
Sources consulted: none (rule written from the live captures in this folder; no code from autoconsent / Consent-O-Matic). Verified headless Chrome 157, EU machine, extension loaded via Extensions.loadUnpacked, fresh profile, `verify_a.py`. After-screenshots: `<site>-after.png`.

| site | detected | outcome | consent state verified | notes |
|---|---|---|---|---|
| ikea.com/gb | yes | rejected (#onetrust-reject-all-handler) | OptanonConsent groups=1:1,2:0,3:0,4:0, intType=2 | |
| vodafone.ro | yes | rejected (Romanian labels, id-based) | groups=1:1,3:0,2:0,4:0, vendors all 0 | |
| tv2.dk | yes | rejected | groups C0001:1, C0003:0, stacks 0 | Page reloads after consent, so the per-tab status record is lost (stats counter incremented) |
| edition.cnn.com | no banner (RO region: opt-out defaults, no banner shown) | n/a | | not a usable test site |

Tried: onetrust.com (SDK present, banner not shown), lufthansa.com (banner), ikea, vodafone.ro, tv2.dk, cnn.com.
Preference-centre fallback (refuse-all / untick + save) is written but not exercised live: every site tested had Reject all on layer 1.
