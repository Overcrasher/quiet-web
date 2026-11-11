"""RULES-B capture (no extension): python3 captures/rb_capture.py <platform> <name> <url> [lang] [wait_s]
Writes captures/<platform>/<name>.{html,json,png}. html = pierced DOM (shadow roots + iframes incl. OOPIF) of banner-ish subtrees."""
import sys, os, json, time, re
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.dirname(HERE))
from cdp import Chrome, Page

ROOT_SEL = re.compile(r"usercentrics|uc-|truste|consent_blackbar|teconsent|sp_message|sp_choice|message-container|privacy-mgmt|cmp-ui|(^| )cmp|consent-banner|cookie-banner|cookie-notice|cookiebanner|cookie-consent|cookie-bar|cookie_notice|gdpr|consent_mode|cookie-notification", re.I)
VOID = {"input","img","br","hr","meta","link","source"}

def ser(n, out, depth=0, keep=True, budget=[0]):
    t = n.get("nodeType")
    if t == 3:
        s = (n.get("nodeValue") or "").strip()
        if s: out.append(s[:300])
        return
    if t not in (1, 9, 11, 10):
        return
    name = (n.get("nodeName") or "").lower()
    if t == 1:
        if name in ("script", "style", "noscript", "svg", "path", "link", "meta"):
            out.append("<%s…/>" % name); return
        a = n.get("attributes", [])
        at = " ".join('%s="%s"' % (a[i], a[i+1][:160].replace('"', "'")) for i in range(0, len(a), 2))
        out.append("<%s%s>" % (name, (" " + at) if at else ""))
    for sr in n.get("shadowRoots", []) or []:
        out.append("<#shadow-root %s>" % sr.get("shadowRootType"))
        for c in sr.get("children", []) or []: ser(c, out)
        out.append("</#shadow-root>")
    if n.get("templateContent"):
        for c in n["templateContent"].get("children", []) or []: ser(c, out)
    for c in n.get("children", []) or []: ser(c, out)
    if n.get("contentDocument"):
        out.append("<#iframe-document>")
        ser(n["contentDocument"], out)
        out.append("</#iframe-document>")
    if t == 1 and name not in VOID: out.append("</%s>" % name)

def attrs(n):
    a = n.get("attributes", []); return dict(zip(a[::2], a[1::2]))
def text_of(n):
    o = []
    def w(x):
        if x.get("nodeType") == 3: o.append(x.get("nodeValue") or "")
        for c in (x.get("children") or []) + (x.get("shadowRoots") or []): w(c)
    w(n); return re.sub(r"\s+", " ", "".join(o)).strip()

def collect(page, label):
    doc = page.get_document()
    hits = []
    def walk(n, inside=False):
        if n.get("nodeType") == 1:
            a = attrs(n)
            ident = " ".join([a.get("id", ""), a.get("class", ""), a.get("data-testid", "")])
            if not inside and ROOT_SEL.search(ident) and n.get("nodeName", "").lower() not in ("html", "body", "head", "script", "link", "meta", "style"):
                hits.append(n); return
        for c in (n.get("children") or []) + (n.get("shadowRoots") or []):
            walk(c, inside)
        if n.get("contentDocument"): walk(n["contentDocument"], inside)
    walk(doc)
    html, btns = [], []
    for h in hits:
        o = []; ser(h, o)
        html.append("\n".join(o))
    # buttons across whole pierced tree restricted to hits
    for h in hits:
        stack = [h]
        while stack:
            n = stack.pop()
            if n.get("nodeType") == 1:
                nm = n["nodeName"].lower(); a = attrs(n)
                if nm in ("button", "a", "input") or a.get("role") == "button":
                    btns.append({"tag": nm, "text": text_of(n)[:120], "attrs": {k: v[:100] for k, v in a.items()}})
            stack.extend((n.get("children") or []) + (n.get("shadowRoots") or []))
            if n.get("contentDocument"): stack.append(n["contentDocument"])
    return html, btns

def main():
    plat, name, url = sys.argv[1:4]
    lang = sys.argv[4] if len(sys.argv) > 4 else "en-US"
    wait = float(sys.argv[5]) if len(sys.argv) > 5 else 10
    outd = os.path.join(HERE, plat); os.makedirs(outd, exist_ok=True)
    with Chrome() as c:
        p = c.attach(); p.set_ua(lang)
        p.send("Target.setAutoAttach", {"autoAttach": True, "waitForDebuggerOnStart": False, "flatten": True})
        try: p.navigate(url, timeout=30)
        except Exception as e: print("nav", e)
        time.sleep(wait)
        info = {"url": url, "final": p.evaluate("location.href"), "lang": lang,
                "globals": p.evaluate("['OneTrust','Cookiebot','Didomi','__tcfapi','UC_UI','__cmp','_sp_','truste','__uspapi','usercentrics','__ucCmp','ucCmp'].filter(k=>k in window)"),
                "cookies": p.evaluate("document.cookie.split('; ').map(x=>x.split('=')[0])")}
        p.screenshot(os.path.join(outd, name + ".png"))
        html, btns = collect(p, "main")
        # OOPIF targets
        frames = []
        for t in c.targets():
            if t["type"] == "iframe" and t["url"].startswith("http"):
                try:
                    fp = c.attach_target(t["targetId"])
                    fh, fb = collect(fp, t["url"])
                    # whole frame doc if no hits
                    if not fh:
                        o = []; ser(fp.get_document(), o); fh = ["\n".join(o)]
                        fb = []
                        for n in fp.find_nodes(lambda n: n.get("nodeType") == 1 and (n["nodeName"].lower() in ("button", "a") or attrs(n).get("role") == "button")):
                            fb.append({"tag": n["nodeName"].lower(), "text": text_of(n)[:120], "attrs": {k: v[:100] for k, v in attrs(n).items()}})
                    frames.append({"url": t["url"], "html": fh, "buttons": fb})
                except Exception as e:
                    frames.append({"url": t["url"], "error": str(e)[:100]})
        info["buttons"] = btns
        info["frames"] = [{"url": f["url"], "buttons": f.get("buttons"), "error": f.get("error")} for f in frames]
        with open(os.path.join(outd, name + ".html"), "w") as f:
            f.write("<!-- main hits -->\n" + "\n\n".join(html)[:400000])
            for fr in frames:
                f.write("\n\n<!-- OOPIF %s -->\n" % fr["url"] + "\n".join(fr.get("html", []))[:400000])
        with open(os.path.join(outd, name + ".json"), "w") as f: json.dump(info, f, indent=1)
        print(json.dumps({k: info[k] for k in ("final", "globals")}), len(btns), "main buttons;", [(f["url"][:60], len(f.get("buttons") or [])) for f in frames])
main()
