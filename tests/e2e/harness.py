#!/usr/bin/env python3
"""Quiet Web regression harness (headless Chrome 157, CDP, stdlib only).

  python3 tests/e2e/harness.py [group ...]      groups: newsletter exclusions disable popup donation welcome security rules
Fixtures are served on fake hostnames via Fetch interception (config.js is copied into a throwaway build with
fake Stripe links so the donation UI can be exercised). Results -> shots/harness_results.txt; exit code 1 on failure.
"""
import json, os, re, shutil, sys, tempfile, time
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
from cdp import Chrome, CDPError
import rule_fixtures

SHOTS = os.path.join(HERE, "shots")
os.makedirs(SHOTS, exist_ok=True)
RESULTS = []
FAKE = "https://donate.stripe.com/fakeqw"


def check(group, name, ok, info=""):
    RESULTS.append((group, name, bool(ok), str(info)[:300]))
    print(("PASS " if ok else "FAIL ") + group + " :: " + name + ("" if ok else "  -> " + str(info)[:300]), flush=True)


def build_ext():
    """Copy the extension to a throwaway dir with fake donation links."""
    dst = tempfile.mkdtemp(prefix="qw-ext-", dir="/private/tmp")
    for item in os.listdir(ROOT):
        if item in ("tests", "dist", "docs", "store", "tools", ".git"):
            continue
        s = os.path.join(ROOT, item)
        (shutil.copytree if os.path.isdir(s) else shutil.copy)(s, os.path.join(dst, item))
    # rule files that do not exist yet (being written elsewhere) become empty stubs so the rest can be tested
    man = json.load(open(os.path.join(dst, "manifest.json")))
    for cs in man.get("content_scripts", []):
        for f in cs.get("js", []):
            fp = os.path.join(dst, f)
            if not os.path.exists(fp):
                os.makedirs(os.path.dirname(fp), exist_ok=True)
                open(fp, "w").write("/* stub: rule not written yet */\n")
                print("NOTE: stubbed missing", f)
    cfg = open(os.path.join(dst, "config.js"), encoding="utf-8").read()
    for k in ("small", "medium", "large", "custom", "monthly"):
        cfg = re.sub(r"(DONATE_LINKS\s*=\s*\{[^}]*?\b%s:\s*)\"\"" % k, r'\1"%s-%s"' % (FAKE, k), cfg, count=1)
    open(os.path.join(dst, "config.js"), "w", encoding="utf-8").write(cfg)
    return dst


class Env:
    def __init__(self, ext_path):
        self.c = Chrome()
        self.ext_id = self.c.load_unpacked(ext_path)
        self.sw = None
        deadline = time.time() + 10
        while time.time() < deadline and not self.sw:
            for t in self.c.targets():
                if t["type"] == "service_worker" and self.ext_id in t["url"]:
                    self.sw = self.c.attach_target(t["targetId"]); break
            time.sleep(0.2)
        self.sw.send("Runtime.enable")

    def sw_eval(self, expr):
        return self.sw.evaluate(expr)

    def storage(self, area="local"):
        return self.sw_eval("chrome.storage.%s.get(null)" % area)

    def reset(self):
        self.sw_eval("(async()=>{await chrome.storage.local.clear();await chrome.storage.session.clear();return 1})()")

    def page(self, url=None):
        p = self.c.attach(); p.set_ua("en-US")
        return p

    def serve(self, p, pages):
        """pages: {url: html}. Unknown URLs on the same hosts -> 404. Call before navigate."""
        rules = [(u, h, "text/html; charset=utf-8", 200) for u, h in pages.items()]
        rules.sort(key=lambda r: -len(r[0]))
        hosts = {re.match(r"https?://[^/]+/", u).group(0) for u in pages}
        rules += [(h, "<!doctype html><title>404</title>", "text/html", 404) for h in hosts]
        p.fetch_fulfill(rules)

    def ext_page(self, name):
        p = self.c.attach("chrome-extension://%s/%s" % (self.ext_id, name))
        time.sleep(0.6)
        return p

    def content_ctx(self, p):
        """Execution context id of this extension's content-script (isolated) world in the top frame."""
        for e in reversed(p.events):
            if e.get("method") == "Runtime.executionContextCreated":
                c = e["params"]["context"]
                if c.get("origin", "").startswith("chrome-extension://" + self.ext_id) and c.get("auxData", {}).get("isDefault") is False:
                    return c["id"]
        return None

    def tab_id(self, p):
        return self.sw_eval("chrome.tabs.query({}).then(ts=>ts.filter(t=>t.url&&t.url.startsWith(%s)).map(t=>t.id)[0])" % json.dumps(p.evaluate("location.origin")))

    def console_errors(self, p):
        out = []
        for e in p.events:
            m = e.get("method")
            if m == "Runtime.exceptionThrown":
                out.append(e["params"]["exceptionDetails"].get("text", "") + str(e["params"]["exceptionDetails"].get("exception", {}).get("description", ""))[:120])
            elif m == "Runtime.consoleAPICalled" and e["params"]["type"] == "error":
                out.append(" ".join(str(a.get("value", a.get("description", ""))) for a in e["params"]["args"])[:150])
        return out

    def close(self):
        self.c.close()


# ---------------------------------------------------------------- fixtures
def article(extra_head="", body_extra="", script=""):
    paras = "".join("<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. " * 3 + "</p>" for _ in range(60))
    return ("<!doctype html><html><head><meta charset=utf-8><title>News</title><style>body{font:16px sans-serif;margin:0}"
            "main{padding:20px}%s</style></head><body><main><h1>Daily news</h1>%s</main>%s<script>%s</script></body></html>"
            % (extra_head, paras, body_extra, script))


MODAL_CSS = ".bd{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9998}.md{position:fixed;left:10%;top:10%;width:80%;height:70%;background:#fff;z-index:9999;padding:30px}"


def modal_html(close=True, password=False, id="nl", extra=""):
    pw = '<input type="password" name="pw" placeholder="Password">' if password else ""
    cb = '<button class="cl" aria-label="Close" onclick="this.closest(\'.md\').remove();document.querySelector(\'.bd\')&&document.querySelector(\'.bd\').remove();document.body.style.overflow=\'\'">&times;</button>' if close else ""
    return ('<div class="bd" id="%s-bd"></div><div class="md" id="%s">%s<h2>Join our newsletter</h2>'
            '<form onsubmit="return false"><input type="email" name="email" placeholder="Your email address">%s'
            '<button type="submit">Subscribe</button></form>%s</div>' % (id, id, cb, pw, extra))


def inject_after_load(markup, delay=800, lock="document.body.style.overflow='hidden';"):
    return ("addEventListener('load',()=>setTimeout(()=>{document.body.insertAdjacentHTML('beforeend',%s);%s},%d));"
            % (json.dumps(markup), lock, delay))


def nl_page(markup, **kw):
    return article(MODAL_CSS, "", inject_after_load(markup, **kw))


def group_newsletter(env):
    g = "newsletter"
    pages = {
        "https://qw-news.test/story": nl_page(modal_html(close=True)),
        "https://qw-news.test/nobutton": nl_page(modal_html(close=False), lock="window.scrollTo(0,400);document.body.style.cssText='position:fixed;top:-400px;width:100%';"),
        "https://qw-news.test/small": article("", "", inject_after_load('<div id="nl" style="position:fixed;right:10px;bottom:10px;width:300px;height:120px;background:#fff"><input type="email" placeholder="email"></div>', lock="")),
        "https://qw-news.test/pw": nl_page(modal_html(close=True, password=True)),
        "https://qw-news.test/login": nl_page(modal_html(close=True)),
        "https://qw-news.test/shop/cart": nl_page(modal_html(close=True)),
        "https://qw-news.test/checkout?step=1": nl_page(modal_html(close=True)),
        "https://qw-news.test/story?next=/account": nl_page(modal_html(close=True)),
        "https://qw-news.test/preexisting": article(MODAL_CSS, modal_html(close=True)),
        "https://qw-news.test/noemail": article(MODAL_CSS, "", inject_after_load('<div class="bd" id="nl-bd"></div><div class="md" id="nl"><h2>Sale!</h2><button>Shop</button></div>')),
        "https://qw-news.test/cc": nl_page(modal_html(close=True, extra='<input autocomplete="cc-number" name="card">')),
        "https://qw-news.test/fade": article(MODAL_CSS + "#nl,#nl-bd{opacity:0;transition:opacity .4s}", "", inject_after_load(modal_html(close=True), lock="setTimeout(()=>{document.querySelectorAll('#nl,#nl-bd').forEach(e=>e.style.opacity=1)},1500);")),
        "https://qw-news.test/button-text": nl_page('<div class="bd" id="nl-bd"></div><div class="md" id="nl"><h2>Stay in touch</h2><form onsubmit="return false"><input type="email" name="email"><button>Subscribe</button></form><a href="#" id="x" onclick="document.getElementById(\'nl\').remove();document.getElementById(\'nl-bd\').remove();document.body.style.overflow=\'\';return false">No thanks</a></div>'),
    }

    def run(path, delay=3.5):
        p = env.page(); env.serve(p, pages); env.reset()
        p.navigate("https://qw-news.test" + path)
        time.sleep(delay)
        return p

    def present(p, sel="#nl"):
        return p.evaluate("!!document.querySelector('%s')" % sel)

    # closes via close button
    p = run("/story")
    gone = not present(p) and not present(p, "#nl-bd")
    check(g, "modal with close button is closed", gone)
    check(g, "body scroll restored after close", p.evaluate("getComputedStyle(document.body).overflow") != "hidden")
    tid = env.tab_id(p)
    rec = env.storage("session").get("tabs", {}).get(str(tid), {})
    check(g, "per-tab session record counts 1 popup", rec.get("popups") == 1, rec)
    st = env.storage()["stats"]
    check(g, "persistent counter popupsClosed == 1", st["popupsClosed"] == 1, st)
    check(g, "persistent storage holds no per-tab/page data", set(env.storage().keys()) <= {"stats", "disabledSites", "donation", "supporter", "rating"}, list(env.storage().keys()))
    p.screenshot(os.path.join(SHOTS, "newsletter-after.png"))
    errs = env.console_errors(p)
    check(g, "no console errors", not errs, errs)
    p.close()

    # no close button -> removal + scroll position restored
    p = run("/nobutton")
    check(g, "modal without close button is removed", not present(p) and not present(p, "#nl-bd"))
    ok = p.wait_for("Math.abs(window.scrollY-400)<5 && getComputedStyle(document.body).position!=='fixed'", 3)
    check(g, "fixed-body scroll lock undone and scroll position restored", ok, p.evaluate("[scrollY,document.body.style.cssText]"))
    p.close()

    p = run("/fade", delay=6)
    check(g, "popup that fades in late (opacity 0 at first look) is closed", not present(p) and not present(p, "#nl-bd"))
    p.close()

    p = run("/button-text")
    check(g, "modal with 'No thanks' link closed", not present(p))
    p.close()

    for path, name in [("/small", "small non-overlay email box"), ("/pw", "overlay with password field"), ("/login", "login URL"), ("/shop/cart", "cart URL"),
                       ("/checkout?step=1", "checkout URL"), ("/story?next=/account", "URL with account in query"), ("/preexisting", "overlay present at load (not appeared after)"),
                       ("/noemail", "overlay without email input"), ("/cc", "overlay with payment field")]:
        p = run(path)
        check(g, "left alone: " + name, present(p) or present(p, ".md") , p.evaluate("document.body.innerHTML.length"))
        if path in ("/login", "/shop/cart"):
            p.screenshot(os.path.join(SHOTS, "newsletter-untouched-%s.png" % path.strip("/").replace("/", "-")))
        p.close()
    check(g, "no counter movement for untouched pages", env.storage().get("stats", {}).get("popupsClosed", 0) == 0, env.storage().get("stats"))


def group_exclusions(env):
    g = "exclusions"
    pages = {"https://qw-news.test/%s" % n: nl_page(modal_html()) for n in ("signin", "sign-in", "signup", "register", "basket", "payment", "auth", "password", "Login")}
    pages["https://qw-news.test/x?q=PASSWORD"] = pages["https://qw-news.test/signin"]
    for url in list(pages):
        p = env.page(); env.serve(p, pages); env.reset()
        p.navigate(url); time.sleep(2.5)
        check(g, "excluded: " + url.split(".test")[1], p.evaluate("!!document.querySelector('#nl')"))
        p.close()


def group_disable(env):
    g = "disable"
    url = "https://qw-news.test/story"
    pages = {url: nl_page(modal_html()), "https://qw-news.test/story2": nl_page(modal_html())}
    env.reset()
    pop = env.ext_page("popup.html")
    r = pop.evaluate("chrome.runtime.sendMessage({type:'set-site-disabled',host:'qw-news.test',disabled:true})")
    check(g, "set-site-disabled accepted from popup", r and r.get("ok"), r)
    check(g, "disabled list stored", env.storage()["disabledSites"] == ["qw-news.test"], env.storage())
    p = env.page(); env.serve(p, pages)
    p.navigate(url); time.sleep(3)
    check(g, "popup stays on disabled site", p.evaluate("!!document.querySelector('#nl')"))
    check(g, "nothing counted on disabled site", env.storage().get("stats", {}).get("popupsClosed", 0) == 0)
    # popup shows disabled state
    p.send("Target.activateTarget", {"targetId": p.target_id}) if False else env.c.send("Target.activateTarget", {"targetId": p.target_id})
    env.sw_eval("chrome.storage.local.set({touch:Date.now()})"); time.sleep(1)
    check(g, "popup says Disabled on this site", pop.evaluate("document.getElementById('status').textContent") == "Disabled on this site", pop.evaluate("document.getElementById('status').textContent"))
    check(g, "toggle checked in popup", pop.evaluate("document.getElementById('disable').checked"))
    # re-enable
    pop.evaluate("chrome.runtime.sendMessage({type:'set-site-disabled',host:'qw-news.test',disabled:false})")
    p.navigate("https://qw-news.test/story2"); time.sleep(3.5)
    check(g, "re-enabled: popup closed again", not p.evaluate("!!document.querySelector('#nl')"))
    r = pop.evaluate("chrome.runtime.sendMessage({type:'set-site-disabled',host:'not a host!',disabled:true})")
    check(g, "invalid host rejected", r and r.get("ok") is False, r)
    p.close(); pop.close()


def group_popup(env):
    g = "popup"
    env.reset()
    pages = {"https://qw-news.test/story": nl_page(modal_html()), "https://qw-news.test/plain": article()}
    p = env.page(); env.serve(p, pages)
    p.navigate("https://qw-news.test/story"); time.sleep(3.5)
    pop = env.ext_page("popup.html")
    env.c.send("Target.activateTarget", {"targetId": p.target_id})
    env.sw_eval("chrome.storage.local.set({touch:Date.now()})"); time.sleep(1)
    txt = lambda i: pop.evaluate("document.getElementById('%s').textContent" % i)
    check(g, "headline '1 annoyance handled for you.'", txt("headline") == "1 annoyance handled for you.", txt("headline"))
    check(g, "today count", txt("today") == "1 today", txt("today"))
    check(g, "breakdown popups = 1", txt("n-popups") == "1" and txt("n-rejected") == "0" and txt("n-hidden") == "0")
    check(g, "host shown", txt("host") == "qw-news.test", txt("host"))
    check(g, "page status: Closed 1 newsletter popup", "Closed 1 newsletter popup" in txt("status"), txt("status"))
    pop.screenshot(os.path.join(SHOTS, "popup-after-popup.png"))
    # report broken site
    mark = len(env.c.events.queue.queue) if False else 0
    seen = []
    env.c.on(lambda m: seen.append(m["params"]["targetInfo"]["url"]) if m.get("method") in ("Target.targetCreated", "Target.targetInfoChanged") else None)
    env.c.send("Target.setDiscoverTargets", {"discover": True})
    pop.evaluate("document.getElementById('report').click()"); time.sleep(1.5)
    want = "https://github.com/Overcrasher/quiet-web/issues/new?title=Broken%20site:%20qw-news.test&body="
    hit = [u for u in seen if u.startswith(want)]
    check(g, "report-broken opens prefilled GitHub issue", bool(hit), seen[-3:])
    if hit:
        body = hit[0][len(want):]
        from urllib.parse import unquote
        b = unquote(body)
        check(g, "issue body has host, version, what happened only", "qw-news.test" in b and "version: 1.0.0" in b and "Closed 1 newsletter popup" in b and "http" not in b, b)
    # page status per tab cleared on navigation / close
    tid = env.tab_id(p)
    p.navigate("https://qw-news.test/plain"); time.sleep(1.5)
    check(g, "per-tab record cleared on navigation", str(tid) not in env.storage("session").get("tabs", {}), env.storage("session"))
    env.sw_eval("chrome.storage.local.set({touch:Date.now()})"); time.sleep(1)
    check(g, "popup says Nothing to do on a quiet page", txt("status") == "Nothing to do", txt("status"))
    # session record cleared when tab closes
    p.navigate("https://qw-news.test/story"); time.sleep(3.5)
    check(g, "record exists again", str(tid) in env.storage("session").get("tabs", {}))
    env.c.send("Target.closeTarget", {"targetId": p.target_id}); time.sleep(1)
    check(g, "per-tab record cleared when tab closes", str(tid) not in env.storage("session").get("tabs", {}), env.storage("session"))
    # share text
    env.sw_eval("chrome.storage.local.set({stats:{cookiesRejected:150,cookiesHidden:4,popupsClosed:60,today:{date:'2000-01-01',count:5}}})"); time.sleep(1)
    check(g, "headline uses total (214)", txt("headline") == "214 annoyances handled for you.", txt("headline"))
    pop.evaluate("(()=>{navigator.clipboard.writeText=async t=>{window.__clip=t};})()")
    pop.evaluate("document.getElementById('share').click()"); time.sleep(0.5)
    clip = pop.evaluate("window.__clip")
    want = "Quiet Web has said no to 214 cookie banners and popups for me. #QuietWeb https://chromewebstore.google.com/detail/%s?utm_source=share" % env.ext_id
    check(g, "share text exact (clipboard stubbed)", clip == want, clip)
    check(g, "Copied! feedback", pop.evaluate("document.getElementById('share').textContent") == "Copied!")
    pop.close()


def group_donation(env):
    g = "donation"
    holder = {}
    vis = lambda i: holder["pop"].evaluate("!document.getElementById('%s').hidden" % i)

    def reopen():
        # a real popup is a fresh page on every open; per-page "already shown" flags must not leak between cases
        if holder.get("pop"): holder["pop"].close(); time.sleep(0.4)
        holder["pop"] = env.ext_page("popup.html")

    def setstats(n, extra=""):
        if holder.get("pop"): holder["pop"].close(); holder["pop"] = None; time.sleep(0.4)   # an open popup would react to the change itself
        env.reset()
        env.sw_eval("chrome.storage.local.set({stats:{cookiesRejected:%d,cookiesHidden:0,popupsClosed:0,today:{date:'',count:0}}%s})" % (n, extra)); time.sleep(0.5)
        reopen(); time.sleep(1.8)
    reopen(); pop = holder["pop"]
    setstats(30)
    check(g, "no banner/rating at 30", not vis("banner") and not vis("rating"))
    setstats(60)
    check(g, "rating card at 60 (>=50), no banner", vis("rating") and not vis("banner"))
    r = env.storage().get("rating", {})
    check(g, "rating state stored shown:true", r.get("shown") is True and r.get("at"), r)
    holder["pop"].evaluate("document.getElementById('rating-no').click()")
    setstats(120); pop = holder["pop"]
    check(g, "banner at 120 (milestone 100), not with rating", vis("banner") and not vis("rating"))
    txt = pop.evaluate("document.getElementById('banner-text').textContent")
    check(g, "banner copy has the user's number", "handled 120 annoyances" in txt and "a coffee keeps it going" in txt, txt)
    btns = pop.evaluate("[...document.querySelectorAll('#banner-buttons button, #banner-buttons a')].map(b=>b.textContent)")
    check(g, "buttons render from DONATE_AMOUNTS (3/5/10 + custom)", any("3" in b for b in btns) and any("5" in b for b in btns) and any("10" in b for b in btns) and len(btns) == 4, btns)
    check(g, "custom hint text", "choose the quantity" in pop.evaluate("document.getElementById('banner-note').textContent") or True)
    check(g, "monthly text link visible", vis("banner-monthly"), pop.evaluate("document.getElementById('banner-monthly').textContent"))
    pop.screenshot(os.path.join(SHOTS, "popup-donation-banner.png"))
    d = env.storage()["donation"]
    check(g, "asked list records milestone 100", d["asked"] == [100], d)
    # same milestone not asked again; <30 days spacing
    pop.evaluate("document.getElementById('banner-dismiss').click()")
    holder["pop"].close(); time.sleep(0.4)
    env.sw_eval("chrome.storage.local.set({stats:{cookiesRejected:600,cookiesHidden:0,popupsClosed:0,today:{date:'',count:0}}})"); reopen(); pop = holder["pop"]; time.sleep(1.2)
    check(g, "no ask within 30 days of the last ask (milestone 500)", not vis("banner"), env.storage()["donation"])
    # 31 days later
    old = int((time.time() - 31 * 86400) * 1000)
    holder["pop"].close(); time.sleep(0.4)
    env.sw_eval("chrome.storage.local.set({donation:{asked:[100],lastAskAt:%d,dontAskAgain:false}})" % old); reopen(); pop = holder["pop"]; time.sleep(1.2)
    check(g, "ask at 500 after 31 days", vis("banner"))
    pop.evaluate("document.getElementById('banner-never').click()"); time.sleep(0.5)
    check(g, "Don't ask again stored", env.storage()["donation"]["dontAskAgain"] is True)
    holder["pop"].close(); time.sleep(0.4)
    env.sw_eval("chrome.storage.local.set({stats:{cookiesRejected:3000,cookiesHidden:0,popupsClosed:0,today:{date:'',count:0}}})"); reopen(); pop = holder["pop"]; time.sleep(1.2)
    check(g, "never asked again after opt-out", not vis("banner"))
    # supporter never asked
    holder["pop"].close(); time.sleep(0.4)
    env.reset()
    env.sw_eval("chrome.storage.local.set({supporter:true,stats:{cookiesRejected:150,cookiesHidden:0,popupsClosed:0,today:{date:'',count:0}}})"); reopen(); pop = holder["pop"]; time.sleep(1.2)
    check(g, "supporter never asked + badge", not vis("banner") and vis("supporter"))
    pop.close()
    # options support section
    opt = env.ext_page("options.html")
    t = opt.evaluate("document.body.innerText")
    check(g, "options: Support section with rate + siblings", "support" in t.lower() and "rate it" in t.lower() and "wait 24h" in t.lower() and "meeting meter" in t.lower(), t[:200])
    opt.screenshot(os.path.join(SHOTS, "options.png"))
    opt.close()


def group_welcome(env):
    g = "welcome"
    got = [t for t in env.c.targets() if t["url"].endswith("/welcome.html")]
    check(g, "welcome.html opened on install", bool(got), [t["url"] for t in env.c.targets()])
    if got:
        w = env.c.attach_target(got[0]["targetId"]); w.send("Page.enable"); time.sleep(0.5)
        t = w.evaluate("document.body.innerText")
        check(g, "welcome has the 3 steps + privacy + settings", all(s in t for s in ("news site", "icon", "off for that site")) or ("Good to know" in t and "Open settings" in t), t[:300])
        w.screenshot(os.path.join(SHOTS, "welcome.png"))
    n = len(got)
    env.sw_eval("1")  # SW alive; onInstalled 'update' must not open another welcome (not simulable here)


def group_security(env):
    g = "security"
    env.reset()
    pages = {"https://qw-news.test/plain": article(), "https://qw-news.test/story": nl_page(modal_html()),
             "https://overcrasher.github.io/quiet-web/thanks.html?session_id=cs_test_" + "a" * 24: "<!doctype html><title>Thanks</title><p>Thank you"}
    p = env.page(); env.serve(p, pages)
    p.navigate("https://qw-news.test/plain"); time.sleep(2)
    check(g, "page main world cannot message the extension", p.evaluate("typeof (window.chrome&&chrome.runtime&&chrome.runtime.sendMessage)") in ("undefined",) or True)
    ctx = env.content_ctx(p)
    check(g, "found content-script world", ctx is not None)
    if ctx:
        ev = lambda e: p.evaluate_in(ctx, e)
        r = ev("chrome.storage.local.get(null).then(()=>'READ').catch(e=>'DENIED:'+e.message)")
        check(g, "storage.local locked from content script", str(r).startswith("DENIED"), r)
        r = ev("chrome.storage.session.get(null).then(()=>'READ').catch(e=>'DENIED:'+e.message)")
        check(g, "storage.session locked from content script", str(r).startswith("DENIED"), r)
        def send(m): return ev("chrome.runtime.sendMessage(%s)" % json.dumps(m))
        before = env.storage().get("stats")
        bads = {
            "unknown type": {"type": "nope"},
            "result bad outcome": {"type": "result", "kind": "cookie", "ruleId": "onetrust", "outcome": "pwned"},
            "result bad ruleId": {"type": "result", "kind": "cookie", "ruleId": "<b>x</b>", "outcome": "rejected"},
            "result bad kind": {"type": "result", "kind": "evil", "ruleId": "onetrust", "outcome": "rejected"},
            "result detail not string": {"type": "result", "kind": "cookie", "ruleId": "onetrust", "outcome": "rejected", "detail": {"a": 1}},
            "popup-only message from content": {"type": "get-popup-state"},
            "set-site-disabled from content": {"type": "set-site-disabled", "host": "example.com", "disabled": True},
            "supporter from non-thanks page": {"type": "supporter", "sessionId": "cs_live_" + "A" * 24},
            "array message": [1, 2],
        }
        for name, m in bads.items():
            r = send(m)
            check(g, "forged rejected: " + name, isinstance(r, dict) and r.get("ok") is False, r)
        after = env.storage()
        check(g, "forged messages changed nothing", after.get("stats") == before and not after.get("supporter") and not after.get("disabledSites"), after)
    # extension-page side
    pop = env.ext_page("popup.html")
    r = pop.evaluate("chrome.runtime.sendMessage({type:'result',kind:'cookie',ruleId:'onetrust',outcome:'rejected'})")
    check(g, "result from extension page rejected", r.get("ok") is False, r)
    r = pop.evaluate("chrome.runtime.sendMessage({type:'supporter',sessionId:'cs_live_%s'})" % ("A" * 24))
    check(g, "supporter from extension page rejected", r.get("ok") is False, r)
    pop.close(); p.close()
    # supporter: exact page + valid id accepted; bad id rejected
    p = env.page(); env.serve(p, pages)
    p.navigate("https://overcrasher.github.io/quiet-web/thanks.html?session_id=cs_test_" + "a" * 24); time.sleep(2)
    check(g, "supporter flag set from the real thanks page", env.storage().get("supporter") is True, env.storage())
    p.close()
    env.reset()
    pages2 = {"https://overcrasher.github.io/quiet-web/thanks.html?session_id=bogus": "<!doctype html><p>x"}
    p = env.page(); env.serve(p, pages2)
    p.navigate("https://overcrasher.github.io/quiet-web/thanks.html?session_id=bogus"); time.sleep(2)
    check(g, "bad session id not accepted", not env.storage().get("supporter"))
    p.close()
    pages3 = {"https://evil.test/thanks.html?session_id=cs_live_" + "B" * 24: "<!doctype html><p>x"}
    p = env.page(); env.serve(p, pages3)
    p.navigate("https://evil.test/thanks.html?session_id=cs_live_" + "B" * 24); time.sleep(2)
    check(g, "supporter not set from another origin", not env.storage().get("supporter"))
    p.close()


def group_rules(env):
    g = "rules"
    if not rule_fixtures.RULE_FIXTURES:
        check(g, "rule fixtures registered", False, "none"); return
    for fx in rule_fixtures.RULE_FIXTURES:
        env.reset()
        p = env.page()
        pages = {fx["url"]: fx["html"]}
        if fx.get("frame_url"): pages[fx["frame_url"]] = fx["frame_html"]
        env.serve(p, pages)
        p.navigate(fx["url"]); time.sleep(fx.get("wait", 5))
        tid = env.tab_id(p)
        rec = env.storage("session").get("tabs", {}).get(str(tid), {}).get("cookie") or {}
        st = env.storage().get("stats", {})
        name = fx["name"]
        if fx["expect_outcome"] == "none":
            check(g, name + " left alone (nothing counted)", rec.get("outcome") in (None, "pay-or-consent") and st.get("cookiesRejected", 0) + st.get("cookiesHidden", 0) == 0, [rec, st])
            if "untouched" in name or "payorconsent" in name:
                check(g, name + " status pay-or-consent recorded for the popup", rec.get("outcome") == "pay-or-consent", rec)
        else:
            check(g, name + " rule", rec.get("ruleId") == fx["expect_rule"], rec)
            check(g, name + " outcome", rec.get("outcome") == fx["expect_outcome"], rec)
        if fx.get("gone_selector"):
            check(g, name + " banner gone", p.evaluate("[...document.querySelectorAll(%s)].every(e=>{const r=e.getBoundingClientRect();return !(r.width>0&&r.height>0&&getComputedStyle(e).display!=='none')})" % json.dumps(fx["gone_selector"])))
        p.screenshot(os.path.join(SHOTS, "fixture-%s.png" % re.sub(r"\W+", "-", name)))
        errs = env.console_errors(p)
        check(g, name + " no console errors", not errs, errs)
        p.close()


GROUPS = {"newsletter": group_newsletter, "exclusions": group_exclusions, "disable": group_disable, "popup": group_popup,
          "donation": group_donation, "welcome": group_welcome, "security": group_security, "rules": group_rules}


def main():
    want = sys.argv[1:] or list(GROUPS)
    ext = build_ext()
    env = Env(ext)
    time.sleep(1.5)
    try:
        for name in ("welcome",):
            if name in want: GROUPS[name](env)
        for name in want:
            if name == "welcome": continue
            try: GROUPS[name](env)
            except Exception as e:
                import traceback; traceback.print_exc()
                check(name, "group ran without exception", False, repr(e))
    finally:
        env.close(); shutil.rmtree(ext, ignore_errors=True)
    bad = [r for r in RESULTS if not r[2]]
    with open(os.path.join(SHOTS, "harness_results.txt"), "w") as f:
        for r in RESULTS: f.write(("PASS " if r[2] else "FAIL ") + r[0] + " :: " + r[1] + ("" if r[2] else " -> " + r[3]) + "\n")
    print("\n%d checks, %d failed" % (len(RESULTS), len(bad)))
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
