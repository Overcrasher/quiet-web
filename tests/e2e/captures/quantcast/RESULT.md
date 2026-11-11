# Quantcast Choice (qc-cmp2)
Sources consulted: none (rule written from the live captures in this folder; no code from autoconsent / Consent-O-Matic). Verified headless Chrome 157, EU machine, extension loaded via Extensions.loadUnpacked, fresh profile, `verify_a.py`. After-screenshots: `<site>-after.png`.

| site | detected | outcome | consent state verified | notes |
|---|---|---|---|---|
| bleepingcomputer.com | yes | rejected (DISAGREE on layer 1) | TCF getTCData: purpose.consents {} , useractioncomplete | |
| quantcast.com | yes | rejected (More options, then #reject-all-btn) | purpose.consents {} | layer 1 has only More options + Agree |
| mirror.co.uk | yes | quantcast rule: none (only "Reject all and pay") | purpose.consents {} (from generic.js click) | rule.js declines pay buttons; generic.js clicked REJECT ALL AND PAY |
| express.co.uk | yes | same as mirror | same | layer 1: "Reject and Pay" (.pp-pay), More Options, I Accept |

Container #qc-cmp2-container has height 0 (children are fixed); detection uses #qc-cmp2-ui. Never an iframe in these captures.
