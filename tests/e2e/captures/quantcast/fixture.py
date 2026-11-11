"""Regression fixtures mirroring real quantcast captures (served on the real hostnames by the harness)."""
import os
HERE = os.path.dirname(os.path.abspath(__file__))


def _page(title, banner):
    filler = "".join("<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>" for _ in range(40))
    return "<!doctype html><html><head><meta charset=utf-8><title>%s</title></head><body><main><h1>%s</h1>%s</main>%s</body></html>" % (title, title, filler, banner)


def _cap(name):
    with open(os.path.join(HERE, name + ".html"), encoding="utf-8") as f:
        return f.read()

FIXTURES = [
    {"name": "quantcast bleepingcomputer (DISAGREE on first layer)", "url": "https://www.bleepingcomputer.com/", "html": _page("BleepingComputer", _cap("bleepingcomputer")),
     "expect_rule": "quantcast", "expect_outcome": "rejected"},
    # First layer without reject (More options + Agree): the rule opens More options; in a static fixture no second layer appears -> none.
    {"name": "quantcast quantcast.com (no reject on first layer)", "url": "https://www.quantcast.com/home", "html": _page("Quantcast", _cap("quantcast-com")),
     "expect_rule": None, "expect_outcome": "none"},
    # Pay-or-consent: "Reject and Pay" must never be clicked.
    {"name": "quantcast express.co.uk (Reject and Pay, untouched)", "url": "https://www.express.co.uk/", "html": _page("Express", _cap("express-co-uk")),
     "expect_rule": None, "expect_outcome": "none"},
]
