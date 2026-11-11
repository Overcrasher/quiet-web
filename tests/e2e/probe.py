"""Probe sites for consent platforms. usage: python3 probe.py url1 url2 ..."""
import sys, json, time, threading
sys.path.insert(0, ".")
from cdp import Chrome
SIG = r"""(()=>{const q=s=>{try{return document.querySelector(s)}catch(e){return null}};
const vis=e=>{if(!e)return false;const r=e.getBoundingClientRect();return r.width>5&&r.height>5};
const o={};
o.onetrust=[q('#onetrust-banner-sdk'),q('#onetrust-consent-sdk')].map(vis).join(',');
o.cookiebot=vis(q('#CybotCookiebotDialog'));
o.didomi=[vis(q('#didomi-host')),vis(q('#didomi-popup')),vis(q('.didomi-popup-container')),!!q('#didomi-host')].join(',');
o.quantcast=[vis(q('.qc-cmp2-container')),!!q('[class*=qc-cmp]')].join(',');
o.trustarc=[vis(q('#truste-consent-track')),vis(q('#consent_blackbar')),!!q('iframe[src*="trustarc"],iframe[src*="truste"]')].join(',');
const uc=q('#usercentrics-root'); o.usercentrics=[!!uc, vis(uc), vis(q('#usercentrics-cmp-ui')), !!(uc&&uc.shadowRoot&&uc.shadowRoot.querySelector('button')), uc?(uc.getBoundingClientRect().height):0].join(',');
o.sourcepoint=[...document.querySelectorAll('iframe')].filter(f=>/sp_message|sourcepoint|privacy-mgmt/.test((f.id||'')+(f.src||''))).map(f=>vis(f)+':'+f.id).join('|');
o.trustarc_if=[...document.querySelectorAll('iframe')].filter(f=>/trustarc|truste/.test(f.src)).length;o.globals=['OneTrust','Cookiebot','Didomi','__tcfapi','UC_UI','__cmp','_sp_','truste'].filter(k=>k in window).join(',');
return o})()"""
def run(c, url, out):
    try:
        p = c.attach(); p.set_ua("en-US")
        try: p.navigate(url, timeout=25)
        except Exception as e: out[url] = "NAV ERR " + str(e)[:80]; p.close(); return
        time.sleep(9)
        out[url] = p.evaluate(SIG) | {"final": p.evaluate("location.href")}
        p.close()
    except Exception as e:
        out[url] = "ERR " + str(e)[:100]
if __name__ == "__main__":
    urls = sys.argv[1:]; out = {}
    with Chrome() as c:
        for i in range(0, len(urls), 6):
            ts = [threading.Thread(target=run, args=(c, u, out)) for u in urls[i:i+6]]
            [t.start() for t in ts]; [t.join() for t in ts]
    for u in urls: print(u, json.dumps(out.get(u)))
