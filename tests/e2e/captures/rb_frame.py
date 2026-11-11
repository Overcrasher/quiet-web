"""Helper: python3 captures/rb_frame.py <url> <lang> <js-in-sp-frame> [<js2> ...] : run JS inside the sourcepoint message frame(s) (in-process or OOPIF)."""
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from cdp import Chrome
def frames(t, out=None):
    out = out if out is not None else []
    out.append(t["frame"])
    for c in t.get("childFrames", []) or []: frames(c, out)
    return out
url, lang = sys.argv[1:3]; jss = sys.argv[3:]
with Chrome() as c:
    p = c.attach(); p.set_ua(lang)
    try: p.navigate(url, timeout=30)
    except Exception as e: print("nav", e)
    time.sleep(9)
    def run_all():
        ctxs = []
        for f in frames(p.frame_tree()):
            if "privacy" in f["url"] or "sp_" in f.get("name","") or "index.html" in f["url"] or "sourcepoint" in f["url"] or "sp-" in f["url"]:
                try: ctxs.append((f["url"][:70], lambda e, i=p.isolated_context(f["id"]): p.evaluate_in(i, e)))
                except Exception as e: pass
        for t in c.targets():
            if t["type"] == "iframe" and t["url"].startswith("http"):
                try:
                    fp = c.attach_target(t["targetId"]); ctxs.append((t["url"][:70], fp.evaluate))
                except Exception as e: pass
        return ctxs
    for js in jss:
        if js.startswith("WAIT"): time.sleep(float(js[4:])); continue
        if js.startswith("SHOT:"): p.screenshot(js[5:]); continue
        for name, ev in run_all():
            try: print("[%s] %s" % (name, json.dumps(ev(js))[:3000]))
            except Exception as e: print("[%s] ERR %s" % (name, str(e)[:120]))
