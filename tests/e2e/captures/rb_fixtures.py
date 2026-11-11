"""Run captures/<plat>/fixture.py FIXTURES live with the extension: python3 captures/rb_fixtures.py trustarc usercentrics ..."""
import sys, os, json, time, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.dirname(HERE))
from cdp import Chrome
EXT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
def load(plat):
    sp = importlib.util.spec_from_file_location("fx_" + plat, os.path.join(HERE, plat, "fixture.py")); m = importlib.util.module_from_spec(sp); sp.loader.exec_module(m); return m.FIXTURES
with Chrome() as c:
    eid = c.load_unpacked(EXT)
    for _ in range(40):
        if any(t["type"] == "service_worker" and eid in t["url"] for t in c.targets()): break
        time.sleep(.25)
    time.sleep(1.5)
    sw = c.attach_target([t for t in c.targets() if t["type"] == "service_worker" and eid in t["url"]][0]["targetId"])
    for plat in sys.argv[1:]:
        for fx in load(plat):
            sw.evaluate("chrome.storage.session.set({tabs:{}})")
            p = c.attach(); p.set_ua("en-US")
            rules = [(fx["url"].split("//")[1].rstrip("/"), fx["html"], "text/html; charset=utf-8", 200)]
            if fx.get("frame_url"): rules.insert(0, (fx["frame_url"].split("//")[1], fx["frame_html"], "text/html; charset=utf-8", 200))
            p.fetch_fulfill(rules)
            try: p.navigate(fx["url"], timeout=20)
            except Exception as e: print("nav", e)
            time.sleep(6)
            tabs = sw.evaluate("chrome.storage.session.get('tabs')")["tabs"]
            rec = [v["cookie"] for v in tabs.values() if v.get("url", "").startswith(fx["url"][:20])]
            got = rec[0] if rec else None
            ok = (got and got["outcome"] == fx["expect_outcome"] and got["ruleId"] == fx["expect_rule"]) if fx["expect_outcome"] != "none" else got is None
            print("PASS" if ok else "FAIL", fx["name"], got, "title:", p.evaluate("document.title"))
            p.close()
