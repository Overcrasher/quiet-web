"""Live verify WITH extension. usage: python3 verify_a.py platform name url"""
import sys, json, time, os, urllib.parse
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from cdp import Chrome
ROOT = {"onetrust": "#onetrust-banner-sdk", "cookiebot": "#CybotCookiebotDialog", "didomi": "#didomi-popup", "quantcast": "#qc-cmp2-ui"}
API = {"onetrust": "JSON.stringify({groups:window.OptanonActiveGroups,ck:decodeURIComponent((document.cookie.match(/OptanonConsent=([^;]*)/)||[])[1]||'').slice(0,400)})",
 "cookiebot": "JSON.stringify({consent:window.Cookiebot&&Cookiebot.consent,ck:decodeURIComponent((document.cookie.match(/CookieConsent=([^;]*)/)||[])[1]||'').slice(0,300)})",
 "didomi": "JSON.stringify({status:window.Didomi&&Didomi.getUserConsentStatusForAll&&Didomi.getUserConsentStatusForAll(),tok:(document.cookie.match(/didomi_token=([^;]*)/)||[''])[0].slice(0,60)})",
 "quantcast": "new Promise(r=>{try{__tcfapi('getTCData',2,(d,ok)=>r(JSON.stringify({ok,purposeConsents:d&&d.purpose&&d.purpose.consents,status:d&&d.eventStatus,ck:(document.cookie.match(/euconsent-v2=([^;]*)/)||[''])[0].slice(0,40)})))}catch(e){r('noapi '+e)}})"}
platform, name, url = sys.argv[1:4]
import harness
env = harness.Env(harness.build_ext()); c = env.c; ext = env.ext_id
if True:
    p = env.page()
    t0 = time.time()
    try: p.navigate(url, timeout=25)
    except Exception as e: print("nav", e)
    time.sleep(14)
    shown = p.evaluate("(()=>{const e=document.querySelector(%s);if(!e)return 'absent';const r=e.getBoundingClientRect();return r.width>2&&r.height>2?'VISIBLE':'hidden-or-zero'})()" % json.dumps(ROOT[platform]))
    logs = []
    for ev in p.events:
        if ev.get("method") == "Runtime.consoleAPICalled":
            a = " ".join(str(x.get("value", x.get("description", ""))) for x in ev["params"]["args"])
            if "Quiet Web" in a: logs.append(a)
        if ev.get("method") == "Runtime.exceptionThrown":
            d = ev["params"]["exceptionDetails"]; s = json.dumps(d)
            if ext in s: logs.append("EXC " + s[:300])
    try: api = p.evaluate(API[platform])
    except Exception as e: api = "err " + str(e)[:100]
    tabs = env.storage("session")
    cx = env.content_ctx(p)
    try: st = p.evaluate_in(cx, "JSON.stringify({rules:(globalThis.QuietRules||[]).map(r=>r.id)})") if cx else "no content ctx"
    except Exception as e: st = "ctx err"
    tabs = str(tabs) + " | ctx: " + str(st)
    p.screenshot(os.path.join(HERE, "captures", platform, name + "-after.png"))
    print("SITE", name, "| banner:", shown, "\n API:", api, "\n QW logs:", logs, "\n SW tabs:", (tabs or "")[:600])
