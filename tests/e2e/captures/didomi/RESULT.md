# Didomi
Sources consulted: none (rule written from the live captures in this folder; no code from autoconsent / Consent-O-Matic). Verified headless Chrome 157, EU machine, extension loaded via Extensions.loadUnpacked, fresh profile, `verify_a.py`. After-screenshots: `<site>-after.png`.

| site | detected | outcome | consent state verified | notes |
|---|---|---|---|---|
| didomi.io | yes | rejected (#didomi-notice-disagree-button) | getUserConsentStatusForAll: all purposes disabled except essential | |
| 20minutes.fr | yes | none, deliberately | untouched | Pay-or-consent: "Refuser et s'abonner". Saving all-Refuser in settings redirects to membre.20minutes.fr/abonnement, so the rule does nothing. NOTE generic.js may still click it |
| elmundo.es | yes (#didomi-popup) | none | untouched | Custom ue-* buttons, "Decline and subscribe" (pay-or-consent) |

Settings fallback (Configure, first radio of each .didomi-components-radio = refuse, #btn-toggle-save) verified by hand-driven simulation on 20minutes.fr (Save becomes enabled), not through the rule. leboncoin.fr: Didomi global but no banner shown.
