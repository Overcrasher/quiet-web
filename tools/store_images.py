#!/usr/bin/env python3
"""Generates store/images/* for the Chrome Web Store (1280x800 screenshots, promo tiles, store icon).
Real UI is captured from the unpacked extension in headless Chrome (CDP, same plumbing as tests/e2e), then composed on
branded backgrounds by tools/store_common.py layouts. Usage:  python3 tools/store_images.py [capture] [compose]   (default: both)
Raw captures go to tools/store_raw/ (gitignored); final PNGs to store/images/. Throwaway Chrome profiles live in /tmp.
All pages are invented fixtures on a neutral host (www.northline-news.example), served by Fetch interception; the banner
is a generic home-grown cookie dialog handled by the real 'generic' rule. 'Before' shots are the same pages loaded with the
host switched off in Quiet Web (disabledSites), 'after' shots with it on."""
import os, sys, json, time
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from store_common import *

RAW = os.path.join(HERE, "store_raw"); OUT = os.path.join(ROOT, "store", "images")
os.makedirs(RAW, exist_ok=True); os.makedirs(OUT, exist_ok=True)
ICON = os.path.join(ROOT, "icons", "icon128.png")
P = dict(bg="#E0F2FE", ink="#0F172A", muted="#475569", bar="#34D399", accent="#1E293B", dark="#1E293B", hi="#6EE7B7", soft="#D1FAE5",
         rowb="#BAE6FD", d1="#334155", d2="#0F172A", glow="rgba(52,211,153,.30)", glow2="rgba(52,211,153,.30)")
NAME = "Quiet Web"
HOST = "www.northline-news.example"

SYS = "-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif"
def paras(n, extra=""):
    t = ("The council confirmed on Tuesday that the long-awaited riverside path will open to walkers and cyclists before the end of the month, "
         "after two years of delays and a final round of safety checks along the eastern bank. ")
    return "".join("<p>%s%s</p>" % (t, extra) for _ in range(n))
def news(body_extra="", css="", script=""):
    return """<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Northline</title><style>
body{margin:0;font:16px/1.6 Georgia,serif;color:#1F2937;background:#fff}.top{height:56px;border-bottom:1px solid #E5E7EB;display:flex;align-items:center;padding:0 26px;font:800 21px %s;letter-spacing:-.02em;gap:20px}
.top span{font:600 14px %s;color:#6B7280}.wrap{padding:22px 26px}.k{font:700 12px %s;letter-spacing:.09em;color:#0D9488}h1{font-size:34px;line-height:1.12;margin:8px 0 12px;letter-spacing:-.02em}
.hero{height:170px;border-radius:12px;background:linear-gradient(135deg,#7DD3FC,#A7F3D0 60%%,#FDE68A);margin:14px 0}%s</style></head>
<body><div class="top">Northline <span>World &nbsp; Local &nbsp; Science &nbsp; Culture</span></div><div class="wrap"><div class="k">LOCAL</div><h1>Riverside path to open at last, council confirms</h1><div class="hero"></div>%s</div>%s<script>%s</script></body></html>""" % (SYS, SYS, SYS, css, paras(8), body_extra, script)
BANNER = """<div id="cookie-banner" role="dialog" aria-label="Cookie consent" style="position:fixed;left:14px;right:14px;bottom:14px;background:#fff;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.28);border:1px solid #E5E7EB;padding:20px 22px;z-index:9999;font:15px/1.5 %s;color:#1F2937">
<div style="font-weight:800;font-size:18px;margin-bottom:6px">We value your privacy</div>
<div style="color:#4B5563">We and our partners use cookies to personalise ads and measure how the site is used. You can accept all cookies or reject them.</div>
<div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap"><button type="button" style="font:700 15px %s;padding:11px 20px;border-radius:10px;border:0;background:#2563EB;color:#fff">Accept all</button>
<button type="button" onclick="document.getElementById('cookie-banner').remove()" style="font:700 15px %s;padding:11px 20px;border-radius:10px;border:1.5px solid #9CA3AF;background:#fff;color:#111827">Reject all</button>
<button type="button" style="font:600 15px %s;padding:11px 10px;border:0;background:none;color:#2563EB">Manage options</button></div></div>""" % (SYS, SYS, SYS, SYS)
PAYBANNER = BANNER.replace("Reject all</button>", "Reject all and pay</button>").replace("onclick=\"document.getElementById('cookie-banner').remove()\"", "").replace(
    "You can accept all cookies or reject them.", "Accept them, or reject them with a paid, ad-free subscription.").replace('left:14px;right:14px', 'left:20px;width:640px')
MODAL_CSS = ".bd{position:fixed;inset:0;background:rgba(15,23,42,.62);z-index:9998}.md{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(430px,88%);background:#fff;border-radius:18px;z-index:9999;padding:34px 30px 28px;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.4);font-family:" + SYS + "}"
MODAL = """<div class="bd" id="nl-bd"></div><div class="md" id="nl"><button aria-label="Close" onclick="this.closest('.md').remove();document.querySelector('.bd')&&document.querySelector('.bd').remove();document.body.style.overflow=''" style="position:absolute;right:12px;top:8px;border:0;background:none;font-size:28px;color:#6B7280">&times;</button>
<div style="font-size:42px">&#9993;</div><h2 style="margin:6px 0 8px;font-size:26px;letter-spacing:-.02em">Never miss a story</h2><p style="margin:0 0 18px;color:#4B5563;font:15px/1.5 %s">Get the best of Northline in your inbox every morning.</p>
<form onsubmit="return false"><input type="email" name="email" placeholder="Your email address" style="width:100%%;box-sizing:border-box;padding:13px 14px;border:1.5px solid #D1D5DB;border-radius:10px;font-size:16px"><button type="submit" style="margin-top:12px;width:100%%;padding:13px;border:0;border-radius:10px;background:#7C3AED;color:#fff;font:700 16px %s">Subscribe</button></form></div>""" % (SYS, SYS)
def inject(markup, delay=800):
    return "addEventListener('load',()=>setTimeout(()=>{document.body.insertAdjacentHTML('beforeend',%s);document.body.style.overflow='hidden';},%d));" % (json.dumps(markup), delay)
PAGES = {"/story": news(BANNER), "/news": news("", MODAL_CSS, inject(MODAL)), "/pay": news(PAYBANNER)}
def fixture(url):
    if url.startswith("https://%s/" % HOST):
        path = url.split(HOST, 1)[1].split("?")[0]; return PAGES.get(path)
    return None

def capture():
    x = Ext(ROOT, "quietweb-store", fixture, [HOST]); sizes = {}
    try:
        time.sleep(1.5)
        for t in x.cdp.send("Target.getTargets")["targetInfos"]:
            if "/welcome.html" in t["url"]: x.close_tab(t["targetId"])
        today = time.strftime("%Y-%m-%d"); now = int(time.time() * 1000)
        def seed(disabled):
            x.sw_eval("chrome.storage.local.clear().then(()=>chrome.storage.session.clear())")
            x.sw_eval("chrome.storage.local.set(%s)" % json.dumps({"stats": {"cookiesRejected": 163, "cookiesHidden": 9, "popupsClosed": 42, "today": {"date": today, "count": 7}},
                "disabledSites": [HOST] if disabled else [], "rating": {"shown": True, "at": now}, "donation": {"asked": [100, 500], "lastAskAt": now, "dontAskAgain": True}})); time.sleep(0.4)
        def restat():
            x.sw_eval("chrome.storage.local.get('stats').then(d=>chrome.storage.local.set({stats:Object.assign({},d.stats,{cookiesRejected:163,cookiesHidden:9,popupsClosed:42,today:{date:%s,count:7}})}))" % json.dumps(today))
        def visit(path, name, w=545, h=510, delay=4.0, keep=False):
            tid, sid = x.new_tab("https://%s%s" % (HOST, path), w, h, dpr=2, wait=delay)
            x.shot(sid, os.path.join(RAW, name + ".png"))
            if not keep: x.close_tab(tid)
            return tid, sid
        def popup_for(page_tid, name, crop_top=False):
            ptid, psid = x.new_tab("chrome-extension://%s/popup.html" % x.id, 360, 800, dpr=2, fetch=False, wait=1.0)
            x.cdp.send("Target.activateTarget", {"targetId": page_tid}); time.sleep(0.5)
            x.cdp.send("Page.reload", {}, psid); time.sleep(2.0)
            st = x.ev(psid, "document.getElementById('status').textContent", False); print(name, "status:", st, "|", x.ev(psid, "document.getElementById('headline').textContent", False))
            h = x.ev(psid, "Math.ceil(document.body.getBoundingClientRect().height)", False)
            x.shot(psid, os.path.join(RAW, name + ".png"), clip={"x": 0, "y": 0, "width": 360, "height": h}); sizes[name] = [360, h]
            if crop_top:
                hh = x.ev(psid, "Math.ceil(document.querySelector('.hero').getBoundingClientRect().bottom)+4", False)
                x.shot(psid, os.path.join(RAW, name + "-top.png"), clip={"x": 0, "y": 0, "width": 360, "height": hh}); sizes[name + "-top"] = [360, hh]
            x.close_tab(ptid); return st
        seed(True); visit("/story", "cookie-before"); visit("/news", "news-before")
        seed(False); visit("/news", "news-after")
        restat(); ctid, _ = visit("/story", "cookie-after", keep=True)
        restat(); time.sleep(0.5); popup_for(ctid, "popup", crop_top=True); x.close_tab(ctid)
        restat(); ptid, _ = visit("/pay", "pay-page", 1120, 572, keep=True)
        restat(); popup_for(ptid, "popup-pay"); x.close_tab(ptid)
        json.dump(sizes, open(os.path.join(RAW, "sizes.json"), "w")); print(sizes)
    finally:
        x.close()

def pill(t, c): return '<div style="position:absolute;right:12px;top:6px;z-index:5;background:%s;color:#fff;font:800 12px %s;letter-spacing:.06em;padding:4px 12px;border-radius:999px;box-shadow:0 4px 12px rgba(0,0,0,.25)">%s</div>' % (c, SYS, t)
def split(before, after, popup=None, pw=0, ph=0, bsize=(545, 510)):
    W, H = bsize
    def win(img, label, col, extra=""):
        return '<div style="position:relative;width:%dpx;height:%dpx" class="win">%s<div class="tb"><i></i><i></i><i></i></div><img src="%s" style="width:%dpx;height:%dpx">%s</div>' % (W, H + 38, pill(label, col), img, W, H, extra)
    k = 0.66; pop = ""
    if popup: pop = '<div style="position:absolute;right:12px;bottom:12px;width:%dpx;height:%dpx;border-radius:12px;overflow:hidden;box-shadow:0 14px 36px rgba(0,0,0,.4),0 0 0 1px rgba(15,23,42,.12)"><img src="%s" style="width:100%%;height:100%%"></div>' % (pw * k, ph * k, popup)
    return '<div style="display:flex;gap:30px;align-items:flex-start;width:1120px;height:610px;padding-top:30px">%s%s</div>' % (win(before, "BEFORE", "#EF4444"), win(after, "AFTER", "#059669", pop))
def overlay_frame(page_uri, popup_uri, pw, ph):
    k = 0.9; w, h = round(pw * k), round(ph * k)
    return browser(page_uri, HOST) .replace('</div><img', '</div><img', 1) + '<div style="position:absolute;right:22px;top:58px;width:%dpx;height:%dpx;border-radius:14px;overflow:hidden;box-shadow:0 20px 50px rgba(15,23,42,.4),0 0 0 1px rgba(15,23,42,.1)"><img src="%s" style="width:100%%;height:100%%"></div>' % (w, h, popup_uri)

def compose():
    sizes = json.load(open(os.path.join(RAW, "sizes.json"))); icon = data_uri(ICON)
    U = lambda n: data_uri(os.path.join(RAW, n)); c = Composer()
    try:
        R = lambda html, w, h, name, **k: c.render(html, w, h, os.path.join(OUT, name), **k)
        pw, ph = sizes["popup"]
        R(wide(P, "Cookie banners, answered no.", split(U("cookie-before.png"), U("cookie-after.png"), U("popup.png"), pw, ph), icon), 1280, 800, "screenshot-1-banners.png")
        R(side(P, "214 annoyances handled for you.", U("popup.png"), pw, ph, NAME, icon), 1280, 800, "screenshot-2-popup.png")
        R(wide(P, "Newsletter popups, closed.", split(U("news-before.png"), U("news-after.png")), icon), 1280, 800, "screenshot-3-newsletter.png")
        qw, qh = sizes["popup-pay"]
        R(wide(P, "When a site asks you to pay or accept, you decide.", '<div style="position:relative;width:1120px;height:610px">' + overlay_frame(U("pay-page.png"), U("popup-pay.png"), qw, qh) + '</div>', icon, "h1{font-size:46px}"), 1280, 800, "screenshot-4-pay-or-consent.png")
        tw, th = sizes["popup-top"]
        R(privacy(P, "Everything happens on your device. Nothing is sent anywhere.", [("shield", "Rules run locally in your browser"), ("wifi-off", "No network requests, no tracking"), ("ban", "No accounts, no ads")], U("popup-top.png"), tw, th, icon, NAME), 1280, 800, "screenshot-5-privacy.png")
        R(promo_small(P, NAME, "Auto-reject cookie banners", "Say no to the noise.", icon), 440, 280, "promo-small-440x280.png")
        R(promo_marquee(P, NAME, "Auto-reject cookie banners", "Say no to the noise.", icon, U("popup.png"), pw, ph), 1400, 560, "promo-marquee-1400x560.png")
        R(store_icon(icon), 128, 128, "store-icon-128.png", transparent=True)
    finally:
        c.close()
    print("\n".join(finish_check(OUT)))

if __name__ == "__main__":
    a = sys.argv[1:] or ["capture", "compose"]
    if "capture" in a: capture()
    if "compose" in a: compose()
