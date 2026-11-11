"""Find real sites that show a newsletter/subscribe overlay after load (no extension). python3 nlscan.py url..."""
import sys, json, time, threading
sys.path.insert(0, ".")
from cdp import Chrome
PROBE = r"""(()=>{const vw=innerWidth,vh=innerHeight;const out=[];
for(const el of document.querySelectorAll('body *')){const cs=getComputedStyle(el);if(cs.position!=='fixed'&&cs.position!=='absolute')continue;
const r=el.getBoundingClientRect();const w=Math.max(0,Math.min(r.right,vw)-Math.max(r.left,0)),h=Math.max(0,Math.min(r.bottom,vh)-Math.max(r.top,0));
if(w*h/(vw*vh)<0.3)continue;if(cs.display==='none'||cs.visibility==='hidden')continue;
const em=el.querySelector('input[type=email],input[name*=email i],input[placeholder*=email i],input[autocomplete=email]');
if(em)out.push({tag:el.tagName,id:el.id,cls:String(el.className).slice(0,60),cov:Math.round(w*h/(vw*vh)*100),text:(el.innerText||'').slice(0,80)});}
return out})()"""
def run(c, url, out):
    try:
        p = c.attach(); p.set_ua("en-US")
        try: p.navigate(url, timeout=25)
        except Exception as e: out[url] = "NAV"; p.close(); return
        res = []
        for i in range(4):
            time.sleep(4)
            try: res = p.evaluate(PROBE) or res
            except Exception: pass
        out[url] = res
        p.close()
    except Exception as e: out[url] = "ERR " + str(e)[:60]
urls = sys.argv[1:]; out = {}
with Chrome() as c:
    for i in range(0, len(urls), 6):
        ts = [threading.Thread(target=run, args=(c, u, out)) for u in urls[i:i+6]]
        [t.start() for t in ts]; [t.join() for t in ts]
for u in urls: print(u, json.dumps(out.get(u))[:300])
