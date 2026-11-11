"""Fixtures mirroring the live TrustArc captures (trustarc.com, garmin.com, ibm.com). FIXTURES for the harness."""
PAGE = "<!doctype html><html lang=en><head><meta charset=utf-8><title>%s</title></head><body><h1>%s</h1><p>Page content.</p>%s</body></html>"

TRUSTARC_COM = """<div id="consent_blackbar" lang="en"><div id="truste-consent-track" class="tc-track tc-hide ta-show ta-display-block" role="banner" style="position:fixed;left:0;right:0;bottom:0;background:#fff;padding:20px;z-index:99999">
<div id="trustarc-banner-overlay" class="tc-overlay"></div>
<div id="truste-consent-content" class="tc-content"><div id="truste-consent-text" class="tc-left"><div class="tc-verbiage"><p>This site uses cookies and related technologies for site operation, analytics, and third party advertising purposes as described in our <a href="https://www.trustarc.com/privacy-policy/" target="_blank" id="truste-privacy-button">TrustArc Privacy Notice</a>.</p></div></div>
<div id="truste-consent-buttons" class="tc-right">
<button id="truste-consent-button" class="tc-btn-primary tc-btn-icon" type="button"><span>Accept All</span></button>
<button id="truste-consent-required" class="tc-btn-primary tc-btn-icon" type="button"><span>Reject Optional</span></button>
<button id="truste-show-consent" class="tc-btn-secondary tc-btn-icon" type="button" aria-haspopup="dialog"><span>Manage Settings</span></button>
</div></div></div></div>"""

GARMIN = """<div id="consent_blackbar" lang="en"><div id="truste-consent-track" class="ta-show ta-display-flex" style="position:fixed;left:0;right:0;bottom:0;background:#000;color:#fff;padding:20px;z-index:99999">
<div id="trustarc-banner-overlay"></div><div id="top"><div id="truste-consent-content" style="overflow:hidden"><div id="truste-consent-text" class="truste-messageColumn">
<p>This site uses cookies and related technologies for site operation, analytics, and third party advertising purposes. <a href="https://www.garmin.com/privacy/cookies/policy/" id="truste-cookie-button" class="truste-cookie-link">Privacy Policy</a></p></div>
<div id="truste-consent-buttons" class="truste-buttonsColumn"><button id="truste-consent-button" type="button"><span>ACCEPT</span></button><button id="truste-consent-required" type="button"><span>DECLINE</span></button><button id="truste-show-consent" type="button" aria-haspopup="dialog"><span>Manage Settings</span></button></div></div></div></div></div>"""

FIXTURES = [
    {"name": "trustarc-trustarc.com", "url": "https://trustarc.com/", "html": PAGE % ("TrustArc", "TrustArc", TRUSTARC_COM), "expect_rule": "trustarc", "expect_outcome": "rejected"},
    {"name": "trustarc-garmin.com", "url": "https://www.garmin.com/ro-RO/", "html": PAGE % ("Garmin", "Garmin", GARMIN), "expect_rule": "trustarc", "expect_outcome": "rejected"},
]
