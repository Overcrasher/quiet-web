"""Regression fixtures mirroring real cookiebot captures (served on the real hostnames by the harness)."""
import os
HERE = os.path.dirname(os.path.abspath(__file__))


def _page(title, banner):
    filler = "".join("<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>" for _ in range(40))
    return "<!doctype html><html><head><meta charset=utf-8><title>%s</title></head><body><main><h1>%s</h1>%s</main>%s</body></html>" % (title, title, filler, banner)


def _cap(name):
    with open(os.path.join(HERE, name + ".html"), encoding="utf-8") as f:
        return f.read()

# Minimal mirror of the Cookiebot dialog (real ids/classes from berlingske.dk / cookiebot.com; the full capture is too large).
_DENY = ('<div id="CybotCookiebotDialog"><div id="CybotCookiebotDialogBody"><a id="CybotCookiebotDialogBodyContentTextToggleDetails" href="#">indstillinger</a>'
         '<input type="checkbox" id="CybotCookiebotDialogBodyLevelButtonNecessary" checked disabled>'
         '<input type="checkbox" id="CybotCookiebotDialogBodyLevelButtonMarketing" checked>'
         '<button id="CybotCookiebotDialogBodyButtonDecline" class="CybotCookiebotDialogBodyButton">Kun nødvendige</button>'
         '<button id="CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll" class="CybotCookiebotDialogBodyButton">Tillad alle</button></div></div>')
FIXTURES = [
    {"name": "cookiebot berlingske.dk (necessary-only button)", "url": "https://www.berlingske.dk/", "html": _page("Berlingske", _DENY),
     "expect_rule": "cookiebot", "expect_outcome": "rejected"},
    {"name": "cookiebot dr.dk (custom template, allow-selected with nothing ticked)", "url": "https://www.dr.dk/", "html": _page("DR", _cap("dr-dk")),
     "expect_rule": "cookiebot", "expect_outcome": "saved-necessary"},
]
