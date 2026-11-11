import sys,time,threading
sys.path.insert(0,".")
from cdp import Chrome
out={}
def run(c,u):
    try:
        p=c.attach(); p.set_ua("de-DE")
        try:p.navigate(u,timeout=25)
        except Exception as e: out[u]="navERR";return
        time.sleep(9)
        out[u]=p.evaluate("""JSON.stringify({u:location.host,root:!!document.querySelector('#usercentrics-root'),sr:(()=>{const r=document.querySelector('#usercentrics-root');return r?(r.shadowRoot?'open':'closed/none')+':'+(r.shadowRoot?r.shadowRoot.querySelectorAll('button').length:0):''})(),cmpui:!!document.querySelector('#usercentrics-cmp-ui'),UC:typeof UC_UI!=='undefined',qc:!!document.querySelector('.qc-cmp2-summary-section'),ta:!!document.querySelector('#truste-consent-track,#consent_blackbar,iframe[src*=truste]')})""")
        p.close()
    except Exception as e: out[u]="ERR "+str(e)[:60]
urls=sys.argv[1:]
with Chrome() as c:
    for i in range(0,len(urls),6):
        ts=[threading.Thread(target=run,args=(c,u)) for u in urls[i:i+6]];[t.start() for t in ts];[t.join() for t in ts]
for u in urls:print(u,out.get(u))
