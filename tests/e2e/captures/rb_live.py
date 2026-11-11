"""Live run WITH the extension: python3 captures/rb_live.py <platform> <name> <url> [lang] [wait_s]
Prints: tab status from SW session storage, console lines (Quiet Web / errors), TCF/cookie consent state; saves captures/<platform>/<name>.after.png (+ .before.png)."""
import sys, os, json, time
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.dirname(HERE))
from cdp import Chrome
EXT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
plat, name, url = sys.argv[1:4]
lang = sys.argv[4] if len(sys.argv) > 4 else "en-US"
wait = float(sys.argv[5]) if len(sys.argv) > 5 else 14
outd = os.path.join(HERE, plat)
TC = """new Promise(r=>{ if(typeof __tcfapi!=='function') return r(null); const t=setTimeout(()=>r('timeout'),3000);
 try{__tcfapi('getTCData',2,(d,ok)=>{clearTimeout(t);r(ok&&d?{purposes:d.purpose&&d.purpose.consents,li:d.purpose&&d.purpose.legitimateInterests,status:d.eventStatus,tcString:(d.tcString||'').slice(0,20),nVendors:d.vendor&&d.vendor.consents?Object.values(d.vendor.consents).filter(Boolean).length:null}:{ok})})}catch(e){clearTimeout(t);r('err '+e)} })"""
with Chrome() as c:
    eid = c.load_unpacked(EXT)
    for _ in range(40):  # wait for the SW so the first get-site-state is answered
        if any(t["type"] == "service_worker" and eid in t["url"] for t in c.targets()): break
        time.sleep(0.25)
    time.sleep(1.5)
    p = c.attach(); p.set_ua(lang)
    p.send("Target.setAutoAttach", {"autoAttach": True, "waitForDebuggerOnStart": False, "flatten": True})
    try: p.navigate(url, timeout=30)
    except Exception as e: print("nav", e)
    t0 = time.time(); shot = False
    time.sleep(3); p.screenshot(os.path.join(outd, name + ".before-ext-run.png"))
    time.sleep(wait)
    p.screenshot(os.path.join(outd, name + ".after.png"))
    logs = []
    for e in p.events:
        m = e.get("method"); pr = e.get("params", {})
        if m == "Runtime.consoleAPICalled":
            txt = " ".join(str(a.get("value", a.get("description", ""))) for a in pr.get("args", []))
            if "Quiet Web" in txt or pr.get("type") == "error": logs.append(pr["type"] + ": " + txt[:200])
        if m == "Runtime.exceptionThrown":
            d = pr["exceptionDetails"]; logs.append("EXC: " + str(d.get("exception", {}).get("description") or d.get("text"))[:200])
    print("console:", logs[:12])
    sw = [t for t in c.targets() if t["type"] == "service_worker" and eid in t["url"]]
    if sw:
        s = c.attach_target(sw[0]["targetId"])
        print("SW tabs:", json.dumps(s.evaluate("chrome.storage.session.get('tabs')"))[:600])
        print("SW local:", json.dumps(s.evaluate("chrome.storage.local.get(null)"))[:500])
    else: print("no SW target")
    try: print("TCF:", json.dumps(p.evaluate(TC)))
    except Exception as e: print("TCF err", e)
    try: print("UC:", json.dumps(p.evaluate("""(async()=>{if(typeof UC_UI==='undefined')return null;try{const a=await UC_UI.getServicesBaseInfo();const f=UC_UI.getServicesFullInfo?await UC_UI.getServicesFullInfo():[];return {allAccepted:UC_UI.areAllConsentsAccepted&&UC_UI.areAllConsentsAccepted(),n:f.length,on:f.filter(x=>x.consent&&x.consent.status).map(x=>x.categorySlug).reduce((a,k)=>(a[k]=(a[k]||0)+1,a),{}),off:f.filter(x=>x.consent&&!x.consent.status).map(x=>x.categorySlug).reduce((a,k)=>(a[k]=(a[k]||0)+1,a),{}),essentialOn:f.filter(x=>x.consent&&x.consent.status&&x.consent.isEssential).length,cats:(UC_UI.getCategoriesBaseInfo?UC_UI.getCategoriesBaseInfo():[]).map(x=>x.slug+':'+x.consent.status)}}catch(e){return 'err '+e}})()""")))
    except Exception as e: print("UC err", e)
    ck = c.send("Storage.getCookies")["cookies"]
    keep = [(k["domain"], k["name"], k["value"][:60]) for k in ck if any(x in k["name"].lower() for x in ("euconsent", "consent", "notice_", "truste", "usercentrics", "sp_", "_sp_", "consentuuid", "cmp", "gdpr", "cookie"))]
    print("cookies:", json.dumps(keep)[:1500])
    print("localStorage:", json.dumps(p.evaluate("Object.keys(localStorage).filter(k=>/consent|usercentrics|uc_|sp_|truste|cmp/i.test(k)).map(k=>k+'='+localStorage.getItem(k).slice(0,100))"))[:800])

try:
    pass
except Exception: pass
