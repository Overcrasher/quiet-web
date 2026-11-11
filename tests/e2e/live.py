#!/usr/bin/env python3
"""LIVE pass with the final extension build on real sites. python3 tests/e2e/live.py [cookies|newsletter|all]
Writes LIVE-RESULTS.md (table) and shots/live-<site>-after.png. Banner 'before' screenshots: captures/<platform>/ (taken without the extension)."""
import sys, os, json, time, threading, re
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from cdp import Chrome
ROOT = os.path.dirname(os.path.dirname(HERE))
SHOTS = os.path.join(HERE, "shots"); os.makedirs(SHOTS, exist_ok=True)
GONE = {
 "onetrust": "#onetrust-banner-sdk,#onetrust-pc-sdk", "cookiebot": "#CybotCookiebotDialog", "didomi": "#didomi-popup,#didomi-host .didomi-popup-container",
 "quantcast": "#qc-cmp2-ui", "trustarc": "#truste-consent-track,#consent_blackbar", "usercentrics": "#usercentrics-cmp-ui",
 "sourcepoint": "[id^=sp_message_container]", "generic": "#gdprNotice,#consent_mode_modal,.gdpr-cookie-banner,#cookie-notification-banner",
}
SITES = [
 ("onetrust", "ikea.com/gb", "https://www.ikea.com/gb/en/", "en-GB"), ("onetrust", "vodafone.ro", "https://www.vodafone.ro/", "ro-RO"), ("onetrust", "tv2.dk", "https://www.tv2.dk/", "da-DK"),
 ("cookiebot", "cookiebot.com", "https://www.cookiebot.com/", "en-US"), ("cookiebot", "berlingske.dk", "https://www.berlingske.dk/", "da-DK"), ("cookiebot", "dr.dk", "https://www.dr.dk/", "da-DK"),
 ("didomi", "didomi.io", "https://www.didomi.io/", "en-US"), ("didomi", "20minutes.fr", "https://www.20minutes.fr/", "fr-FR"), ("didomi", "elmundo.es", "https://www.elmundo.es/", "es-ES"),
 ("quantcast", "quantcast.com", "https://www.quantcast.com/", "en-US"), ("quantcast", "bleepingcomputer.com", "https://www.bleepingcomputer.com/", "en-US"),
 ("quantcast", "express.co.uk", "https://www.express.co.uk/", "en-GB"), ("quantcast", "mirror.co.uk", "https://www.mirror.co.uk/", "en-GB"),
 ("trustarc", "trustarc.com", "https://trustarc.com/", "en-US"), ("trustarc", "ibm.com", "https://www.ibm.com/", "en-US"), ("trustarc", "garmin.com", "https://www.garmin.com/", "ro-RO"),
 ("usercentrics", "dm.de", "https://www.dm.de/", "de-DE"), ("usercentrics", "zalando.de", "https://www.zalando.de/", "de-DE"), ("usercentrics", "o2online.de", "https://www.o2online.de/", "de-DE"), ("usercentrics", "fressnapf.de", "https://www.fressnapf.de/", "de-DE"),
 ("sourcepoint", "bbc.com", "https://www.bbc.com/", "en-GB"), ("sourcepoint", "sky.com", "https://www.sky.com/", "en-GB"), ("sourcepoint", "independent.co.uk", "https://www.independent.co.uk/", "en-GB"),
 ("sourcepoint", "theguardian.com", "https://www.theguardian.com/europe", "en-GB"), ("sourcepoint", "spiegel.de", "https://www.spiegel.de/", "de-DE"),
 ("generic", "cel.ro", "https://www.cel.ro/", "ro-RO"), ("generic", "libris.ro", "https://www.libris.ro/", "ro-RO"), ("generic", "emag.ro", "https://www.emag.ro/", "ro-RO"), ("generic", "fashiondays.ro", "https://www.fashiondays.ro/", "ro-RO"),
]
NL = [("newsletter", "minimalistbaker.com", "https://minimalistbaker.com/", "en-US"), ("newsletter", "ambitiouskitchen.com", "https://www.ambitiouskitchen.com/", "en-US")]
NEG = [("login (must stay untouched)", "github.com/login", "https://github.com/login", "en-US"), ("cart (must stay untouched)", "emag.ro/cart", "https://www.emag.ro/cart/products", "ro-RO"),
       ("login (must stay untouched)", "minimalistbaker.com/wp-login", "https://minimalistbaker.com/wp-login.php", "en-US")]
VIS = "(sel)=>[...document.querySelectorAll(sel)].some(e=>{const r=e.getBoundingClientRect();const cs=getComputedStyle(e);return r.width>5&&r.height>5&&cs.display!=='none'&&cs.visibility!=='hidden'})"
OVERLAY = r"""(()=>{const vw=innerWidth,vh=innerHeight;let n=0;for(const el of document.querySelectorAll('body *')){const cs=getComputedStyle(el);if(cs.position!=='fixed'&&cs.position!=='absolute')continue;if(cs.display==='none'||cs.visibility==='hidden')continue;
const r=el.getBoundingClientRect();const w=Math.max(0,Math.min(r.right,vw)-Math.max(r.left,0)),h=Math.max(0,Math.min(r.bottom,vh)-Math.max(r.top,0));if(w*h/(vw*vh)<0.3)continue;
if(el.querySelector('input[type=email],input[name*=email i],input[placeholder*=email i],input[autocomplete=email]')){n++;window.__qwov=(window.__qwov||[]).concat([el.tagName+'#'+el.id+'.'+String(el.className).slice(0,50)+' '+Math.round(w)+'x'+Math.round(h)+' pos='+cs.position+' op='+cs.opacity+' txt='+(el.textContent||'').length])}}return n})()"""


def one(c, eid, sw, kind, name, url, lang, wait, out):
    row = {"kind": kind, "site": name, "url": url}
    try:
        p = c.attach(); p.set_ua(lang)
        p.send("Target.setAutoAttach", {"autoAttach": True, "waitForDebuggerOnStart": False, "flatten": True})
        pre = None
        if kind == "newsletter" or kind.startswith(("login", "cart")):
            c.send("Target.activateTarget", {"targetId": p.target_id})   # visible tab: many popups only fire for a foreground tab
        try: p.navigate(url, timeout=30)
        except Exception as e: row["nav"] = str(e)[:60]
        t0 = time.time()
        if kind == "newsletter" or kind.startswith(("login", "cart")):
            time.sleep(4)
            try: pre = p.evaluate(OVERLAY)
            except Exception: pre = None
        time.sleep(wait)
        tid = sw.evaluate("chrome.tabs.query({}).then(ts=>ts.filter(t=>t.url&&t.url.indexOf(%s)>=0).map(t=>t.id)[0])" % json.dumps(re.sub(r"^https?://", "", url).split("/")[0].replace("www.", ""))) if sw else None
        rec = (sw.evaluate("chrome.storage.session.get('tabs')").get("tabs", {}) or {}).get(str(tid), {}) if tid is not None else {}
        row["status"] = rec
        try: row["overlay_after"] = p.evaluate(OVERLAY)
        except Exception: row["overlay_after"] = None
        row["overlay_before"] = pre
        try: row["ov_desc"] = p.evaluate("window.__qwov||[]")[:4]
        except Exception: pass
        if kind in GONE:
            try: row["banner_visible_after"] = p.evaluate("(%s)(%s)" % (VIS, json.dumps(GONE[kind])))
            except Exception: row["banner_visible_after"] = None
        errs = []
        for e in p.events:
            m = e.get("method"); pr = e.get("params", {})
            if m == "Runtime.consoleAPICalled" and pr.get("type") == "error":
                txt = " ".join(str(a.get("value", a.get("description", ""))) for a in pr.get("args", []))
                if "Quiet Web" in txt or "chrome-extension" in txt: errs.append(txt[:120])
            if m == "Runtime.exceptionThrown":
                d = pr["exceptionDetails"]; s = str(d.get("exception", {}).get("description") or d.get("text"))
                if "chrome-extension://" + eid in s or "chrome-extension://" + eid in str(d.get("url", "")): errs.append(s[:120])
        row["ext_errors"] = errs
        if os.environ.get("QW_DEBUG"):
            row["dbg"] = [" ".join(str(a.get("value", "")) for a in e["params"]["args"])[:160] for e in p.events if e.get("method") == "Runtime.consoleAPICalled" and "QWDBG" in str(e["params"]["args"])]
        p.screenshot(os.path.join(SHOTS, "live-%s-after.png" % re.sub(r"\W+", "-", name)))
        p.close()
    except Exception as e:
        row["error"] = str(e)[:100]
    out.append(row)


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    jobs = []
    if mode in ("cookies", "all"): jobs += [(k, n, u, l, 16) for k, n, u, l in SITES]
    if mode in ("newsletter", "all"): jobs += [(k, n, u, l, 22) for k, n, u, l in NL + NEG]
    only = sys.argv[2].split(",") if len(sys.argv) > 2 else None   # site-name filter: runs them one at a time
    if only: jobs = [j for j in jobs if j[1] in only]
    rows = []
    with Chrome() as c:
        eid = c.load_unpacked(os.environ.get("QW_EXT") or ROOT)
        sw = None
        for _ in range(60):
            for t in c.targets():
                if t["type"] == "service_worker" and eid in t["url"]: sw = c.attach_target(t["targetId"]); break
            if sw: break
            time.sleep(0.25)
        time.sleep(1.5)
        groups = [[j] for j in jobs if j[0] == "newsletter" or j[0].startswith(("login", "cart"))]
        cj = [j for j in jobs if not (j[0] == "newsletter" or j[0].startswith(("login", "cart")))]
        batches = [cj[i:i + (1 if only else 4)] for i in range(0, len(cj), 1 if only else 4)] + groups
        for i, b in enumerate(batches):
            i = i * 4
            ts = [threading.Thread(target=one, args=(c, eid, sw, *j[:4], j[4], rows)) for j in b]
            [t.start() for t in ts]; [t.join() for t in ts]
            print("batch", i // 4 + 1, "done", flush=True)
        stats = sw.evaluate("chrome.storage.local.get(null)") if sw else {}
    json.dump({"rows": rows, "stats": stats}, open(os.path.join(HERE, "live-raw-%s.json" % mode), "w"), indent=1)
    for r in sorted(rows, key=lambda r: [x[1] for x in SITES + NL + NEG].index(r["site"]) if r["site"] in [x[1] for x in SITES + NL + NEG] else 99):
        ck = (r.get("status") or {}).get("cookie") or {}
        print("%-14s %-26s rule=%-12s outcome=%-16s detail=%-30s gone=%s popups=%s ov=%s->%s errs=%s %s" % (
            r["kind"][:14], r["site"], ck.get("ruleId"), ck.get("outcome"), (ck.get("detail") or "")[:30], None if r.get("banner_visible_after") is None else (not r["banner_visible_after"]),
            (r.get("status") or {}).get("popups"), r.get("overlay_before"), r.get("overlay_after"), len(r.get("ext_errors", [])), r.get("error", "")))


if __name__ == "__main__":
    main()
