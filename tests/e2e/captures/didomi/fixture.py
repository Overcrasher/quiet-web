"""Regression fixtures mirroring real didomi captures (served on the real hostnames by the harness)."""
import os
HERE = os.path.dirname(os.path.abspath(__file__))


def _page(title, banner):
    filler = "".join("<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>" for _ in range(40))
    return "<!doctype html><html><head><meta charset=utf-8><title>%s</title></head><body><main><h1>%s</h1>%s</main>%s</body></html>" % (title, title, filler, banner)


def _cap(name):
    with open(os.path.join(HERE, name + ".html"), encoding="utf-8") as f:
        return f.read()

FIXTURES = [
    {"name": "didomi didomi.io (I disagree)", "url": "https://www.didomi.io/", "html": _page("Didomi", _cap("didomi-io")),
     "expect_rule": "didomi", "expect_outcome": "rejected"},
    # Pay-or-consent: "Refuser et s'abonner" must NOT be clicked by the didomi rule (outcome none; generic must not click it either).
    {"name": "didomi 20minutes.fr (refuse-and-subscribe, untouched)", "url": "https://www.20minutes.fr/", "html": _page("20 Minutes", _cap("20minutes-fr")),
     "expect_rule": None, "expect_outcome": "none"},
]
