"""Capture a consent banner WITHOUT the extension. usage: python3 capture_a.py platform name url"""
import sys, json, time, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdp import Chrome
ROOT = {"onetrust": "#onetrust-consent-sdk", "cookiebot": "#CybotCookiebotDialog", "didomi": "#didomi-host",
        "quantcast": "#qc-cmp2-container"}
JS = r"""(()=>{const root=document.querySelector(%s);
const vis=e=>{const r=e.getBoundingClientRect();return r.width>2&&r.height>2};
const desc=e=>({tag:e.tagName,id:e.id,cls:String(e.className).slice(0,120),text:(e.innerText||e.value||'').trim().slice(0,80),
 attrs:Object.fromEntries([...e.attributes].filter(a=>/^(data-|aria-|role|type|for|name|value)/.test(a.name)).map(a=>[a.name,a.value.slice(0,80)])),visible:vis(e),disabled:!!e.disabled});
const btns=root?[...root.querySelectorAll('button,a[role=button],a[href],input[type=checkbox],input[type=button],[role=switch],[role=button]')].map(desc):[];
const pw=['OneTrust','OneTrustActiveGroups','OptanonActiveGroups','Cookiebot','Didomi','__tcfapi','__cmp','_qevents'].filter(k=>k in window);
const html=root?root.outerHTML:'';
return {url:location.href,rootFound:!!root,iframes:[...document.querySelectorAll('iframe')].filter(f=>/consent|cmp|cookie|privacy|didomi|onetrust|cybot/i.test(f.id+f.src+f.className)).map(f=>({id:f.id,src:f.src.slice(0,120)})),
 shadowHosts:[...document.querySelectorAll('*')].filter(e=>e.shadowRoot).slice(0,5).map(e=>e.tagName+'#'+e.id),
 globals:pw,cookies:document.cookie.split('; ').map(c=>c.split('=')[0]),buttons:btns,htmlLen:html.length,html:html.slice(0,90000)}})()"""
platform, name, url = sys.argv[1:4]
d = os.path.join(os.path.dirname(os.path.abspath(__file__)), "captures", platform)
os.makedirs(d, exist_ok=True)
with Chrome() as c:
    p = c.attach(); p.set_ua("en-US")
    try: p.navigate(url, timeout=25)
    except Exception as e: print("nav", e)
    time.sleep(9)
    r = p.evaluate(JS % json.dumps(ROOT[platform]))
    html = r.pop("html")
    open(os.path.join(d, name + ".html"), "w").write(html)
    json.dump(r, open(os.path.join(d, name + ".json"), "w"), indent=1)
    p.screenshot(os.path.join(d, name + ".png"))
    print(name, r["rootFound"], r["htmlLen"], r["globals"], r["iframes"], r["shadowHosts"])
    for b in r["buttons"]:
        if b["visible"]: print("  ", b["tag"], b["id"], b["cls"][:40], "|", b["text"][:40], b["attrs"])
