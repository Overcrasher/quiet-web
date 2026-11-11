"""Cookie-rule regression fixtures mirroring the real captures.

Loads FIXTURES from captures/<platform>/fixture.py. Each entry:
  name, url (real hostname + path, served by Fetch interception), html, expect_rule (id or None),
  expect_outcome ("rejected" | "saved-necessary" | "hidden" | "none"), optional frame_url/frame_html (iframe document),
  optional gone_selector, optional wait (seconds).
"""
import importlib.util, glob, os

HERE = os.path.dirname(os.path.abspath(__file__))
RULE_FIXTURES = []


def register(**kw):
    RULE_FIXTURES.append(kw)


for _f in sorted(glob.glob(os.path.join(HERE, "captures", "*", "fixture.py"))):
    _spec = importlib.util.spec_from_file_location("fx_" + os.path.basename(os.path.dirname(_f)), _f)
    _m = importlib.util.module_from_spec(_spec)
    _spec.loader.exec_module(_m)
    for _fx in _m.FIXTURES:
        _fx.setdefault("platform", os.path.basename(os.path.dirname(_f)))
        RULE_FIXTURES.append(_fx)
