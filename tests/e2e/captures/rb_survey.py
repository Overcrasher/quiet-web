"""Find home-grown cookie banners: python3 captures/rb_survey.py lang url..."""
import sys, os, json, time, threading
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from cdp import Chrome
JS = r"""(()=>{const out=[];for(const e of document.querySelectorAll('div,section,aside,form,dialog')){const t=(e.innerText||'');if(t.length<30||t.length>3000||!/cookie|consim|einwillig|zustimm|cookies/i.test(t))continue;const cs=getComputedStyle(e);if(!/fixed|sticky/.test(cs.position)&&e.getAttribute('role')!=='dialog')continue;const r=e.getBoundingClientRect();if(r.width<100||r.height<30)continue;
const bs=[...e.querySelectorAll('button,a,[role=button],input[type=button],input[type=submit]')].map(b=>(b.innerText||b.value||b.getAttribute('aria-label')||'').trim().slice(0,30)).filter(Boolean);out.push({id:e.id,cls:(e.className+'').slice(0,50),len:t.length,btns:bs.slice(0,8)})}
out.sort((a,b)=>a.len-b.len);return {plat:['#onetrust-banner-sdk','#CybotCookiebotDialog','#didomi-host','.qc-cmp2-container','#truste-consent-track','#usercentrics-root','[id^=sp_message_container]'].filter(s=>document.querySelector(s)),hits:out.slice(0,2)}})()"""
res = {}
def run(c, u, lang):
    try:
        p = c.attach(); p.set_ua(lang)
        try: p.navigate(u, timeout=25)
        except Exception as e: res[u] = "nav"; return
        time.sleep(7); res[u] = p.evaluate(JS); p.close()
    except Exception as e: res[u] = "ERR " + str(e)[:60]
lang = sys.argv[1]; urls = sys.argv[2:]
with Chrome() as c:
    for i in range(0, len(urls), 6):
        ts = [threading.Thread(target=run, args=(c, u, lang)) for u in urls[i:i+6]]; [t.start() for t in ts]; [t.join() for t in ts]
for u in urls: print(u, json.dumps(res.get(u), ensure_ascii=False)[:420])
