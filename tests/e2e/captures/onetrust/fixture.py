"""Regression fixtures mirroring real onetrust captures (served on the real hostnames by the harness)."""
import os
HERE = os.path.dirname(os.path.abspath(__file__))


def _page(title, banner):
    filler = "".join("<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>" for _ in range(40))
    return "<!doctype html><html><head><meta charset=utf-8><title>%s</title></head><body><main><h1>%s</h1>%s</main>%s</body></html>" % (title, title, filler, banner)


def _cap(name):
    with open(os.path.join(HERE, name + ".html"), encoding="utf-8") as f:
        return f.read()

FIXTURES = [
    {"name": "onetrust ikea (reject-all on first layer)", "url": "https://www.ikea.com/gb/en/", "html": _page("IKEA", _cap("ikea")),
     "expect_rule": "onetrust", "expect_outcome": "rejected"},
    {"name": "onetrust vodafone.ro (Romanian labels)", "url": "https://www.vodafone.ro/", "html": _page("Vodafone", _cap("vodafone-ro")),
     "expect_rule": "onetrust", "expect_outcome": "rejected"},
    {"name": "onetrust tv2.dk (Danish labels)", "url": "https://www.tv2.dk/", "html": _page("TV 2", _cap("tv2-dk")),
     "expect_rule": "onetrust", "expect_outcome": "rejected"},
]
