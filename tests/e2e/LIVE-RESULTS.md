# Quiet Web 1.0.0 - LIVE results (2026-11-11)

Final build loaded unpacked in headless Chrome 157 (EU/Romania, fresh profile), sites visited one at a time, ~16 s per site. 'Banner gone' = the platform's banner selector no longer visible (emag.ro and fashiondays.ro use a different home-grown selector than my check, so I looked at the screenshot: banner gone). 'Console errors' = errors that come from the extension. Before-screenshots (without the extension) are in `captures/<platform>/`, after-screenshots in `shots/live-<site>-after.png` (gitignored).

## Cookie banners

| Platform | Site | Rule that acted | Outcome | Detail | Banner gone | Extension console errors |
|---|---|---|---|---|---|---|
| onetrust | ikea.com/gb | onetrust | rejected | Reject all | yes | 0 |
| onetrust | vodafone.ro | onetrust | rejected | Reject all | yes | 0 |
| onetrust | tv2.dk | onetrust | rejected | Reject all | yes | 0 |
| cookiebot | cookiebot.com | cookiebot | rejected | Deny | yes | 0 |
| cookiebot | berlingske.dk | cookiebot | rejected | Deny | yes | 0 |
| cookiebot | dr.dk | cookiebot | saved-necessary | Unticked 0 categories, saved selection | yes | 0 |
| didomi | didomi.io | didomi | rejected | Disagree | yes | 0 |
| didomi | 20minutes.fr | generic | pay-or-consent |  | n/a (pay-or-consent, left alone) | 0 |
| didomi | elmundo.es | generic | pay-or-consent |  | n/a (pay-or-consent, left alone) | 0 |
| quantcast | quantcast.com | quantcast | rejected | REJECT ALL (second layer) | yes | 0 |
| quantcast | bleepingcomputer.com | quantcast | rejected | DISAGREE | yes | 0 |
| quantcast | express.co.uk | generic | pay-or-consent |  | n/a (pay-or-consent, left alone) | 0 |
| quantcast | mirror.co.uk | generic | pay-or-consent |  | n/a (pay-or-consent, left alone) | 0 |
| trustarc | trustarc.com | trustarc | rejected | Reject Optional | yes | 0 |
| trustarc | ibm.com | trustarc | rejected | Required only | yes | 0 |
| trustarc | garmin.com | trustarc | rejected | REFUZARE | yes | 0 |
| usercentrics | dm.de | usercentrics | rejected | Einwilligung ablehnen | yes | 0 |
| usercentrics | zalando.de | usercentrics | rejected | Nur Notwendige | yes | 0 |
| usercentrics | o2online.de | usercentrics | rejected | Verweigern | yes | 0 |
| usercentrics | fressnapf.de | usercentrics | rejected | Nur notwendige Cookies | yes | 0 |
| sourcepoint | bbc.com | sourcepoint | rejected | I do not agree | yes | 0 |
| sourcepoint | sky.com | sourcepoint | rejected | Essential cookies only | yes | 0 |
| sourcepoint | independent.co.uk | sourcepoint | rejected | ESSENTIAL COOKIES ONLY | yes | 0 |
| sourcepoint | theguardian.com | sourcepoint | pay-or-consent |  | n/a (pay-or-consent, left alone) | 0 |
| sourcepoint | spiegel.de | sourcepoint | pay-or-consent |  | n/a (pay-or-consent, left alone) | 0 |
| generic | cel.ro | generic | rejected | Refuza toate | yes | 0 |
| generic | libris.ro | generic | rejected | Refuz toate | yes | 0 |
| generic | emag.ro | generic | rejected | Refuză toate | yes (screenshot) | 0 |
| generic | fashiondays.ro | generic | rejected | Doar cele esențiale | yes (screenshot) | 0 |

Outcome `pay-or-consent` = the site only offers accept or reject-and-pay/subscribe; nothing was clicked, nothing counted, the popup tells the user.

## Newsletter popups and must-not-touch pages

| Page | Kind | Result |
|---|---|---|
| minimalistbaker.com | newsletter | popup closed (counted 1) |
| ambitiouskitchen.com | newsletter | popup closed (counted 1) |
| github.com/login | login (must stay untouched) | untouched (popups counted: 0, no result recorded) |
| emag.ro/cart | cart (must stay untouched) | untouched (popups counted: 0, no result recorded) |
| minimalistbaker.com/wp-login | login (must stay untouched) | untouched (popups counted: 0, no result recorded) |

Notes:
- minimalistbaker.com: popup opens ~20 s after load and only for a foreground tab; closed through its own close button/removal. ambitiouskitchen.com: closed.
- login (github.com/login, minimalistbaker.com/wp-login.php) and cart (emag.ro/cart/products) pages are excluded by URL; the login and cart pages have no overlay anyway, so this also proves nothing on them was removed or counted.
- Running 4 tabs in parallel made 4 of 33 sites flaky (background tabs are throttled by Chrome: trustarc.com, libris.ro, mirror.co.uk, berlingske.dk); the table is from a sequential run, all consistent with the captures. The engine now retries the service-worker handshake with backoff.
- mirror.co.uk, express.co.uk (Quantcast pay-or-consent) and 20minutes.fr, elmundo.es (Didomi pay-or-consent), theguardian.com, spiegel.de (Sourcepoint pay-or-consent) are handled by leaving the choice to the user.
- Known gap: minimalistbaker.com also shows a home-grown consent dialog (Reject All / Manage Settings / Accept All) that no rule answered in this run.
