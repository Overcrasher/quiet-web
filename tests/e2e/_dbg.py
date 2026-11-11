import sys,time
sys.path.insert(0,".")
from cdp import Chrome
with Chrome() as c:
    for u,lang in [(a.split("|")[0],(a.split("|")+["en-US"])[1]) for a in sys.argv[1:]]:
        p=c.attach(); p.set_ua(lang)
        try:p.navigate(u,timeout=25)
        except Exception as e: print(u,e);continue
        time.sleep(10)
        print(u,p.evaluate("""JSON.stringify({u:location.href,roots:[...document.querySelectorAll('[id*=usercentrics],[id*=uc-],[class*=qc-cmp]')].slice(0,6).map(e=>e.tagName+'#'+e.id+'.'+(e.className+'').slice(0,40)+' '+JSON.stringify(e.getBoundingClientRect())),qc:!!document.querySelector('.qc-cmp2-container'),ucs:typeof UC_UI!=='undefined'&&UC_UI.isInitialized&&UC_UI.isInitialized()})"""))
        p.close()
