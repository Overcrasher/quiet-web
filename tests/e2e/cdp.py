"""Minimal stdlib-only CDP library for Chrome 157 (headless=new, --remote-debugging-pipe).

Usage:
    from cdp import Chrome
    with Chrome() as c:
        p = c.attach("about:blank")        # Page (flattened session)
        p.set_ua(); p.navigate("https://example.com")
        print(p.evaluate("document.title"))
        p.screenshot("shots/x.png")
"""
import json, os, subprocess, threading, queue, time, base64, shutil, tempfile, itertools

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


class CDPError(Exception):
    pass


class Chrome:
    def __init__(self, extra_args=(), profile=None, headless=True, chrome=CHROME):
        self.profile = profile or tempfile.mkdtemp(prefix="qw-prof-", dir="/private/tmp")
        self._own_profile = profile is None
        # child reads commands on fd3, writes responses on fd4
        to_chrome_r, to_chrome_w = os.pipe()
        from_chrome_r, from_chrome_w = os.pipe()

        # make sure our pipe ends are not 3/4 themselves, then dup2 in the child (non-inheritable
        # originals close on exec; 3/4 made inheritable by dup2). close_fds must stay False.
        to_chrome_r, from_chrome_w = (os.dup(to_chrome_r + 0) if to_chrome_r < 5 else to_chrome_r,
                                      os.dup(from_chrome_w + 0) if from_chrome_w < 5 else from_chrome_w)
        def pre():
            os.dup2(to_chrome_r, 3)
            os.dup2(from_chrome_w, 4)
        args = [chrome, "--remote-debugging-pipe", "--enable-unsafe-extension-debugging",
                "--user-data-dir=" + self.profile, "--no-first-run",
                "--no-default-browser-check", "--window-size=1280,900"]
        if headless:
            args.append("--headless=new")
        args += list(extra_args)
        self.proc = subprocess.Popen(args, preexec_fn=pre, close_fds=False,
                                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        os.close(to_chrome_r); os.close(from_chrome_w)
        self._w = os.fdopen(to_chrome_w, "wb", buffering=0)
        self._r = os.fdopen(from_chrome_r, "rb", buffering=0)
        self._ids = itertools.count(1)
        self._pending = {}
        self._lock = threading.Lock()
        self.events = queue.Queue()          # all events: dict with method/params/sessionId
        self._handlers = []                  # callables(msg) invoked in reader thread
        self._alive = True
        threading.Thread(target=self._read_loop, daemon=True).start()

    # ---- transport
    def _read_loop(self):
        buf = b""
        while True:
            try:
                d = self._r.read(65536)
            except Exception:
                d = b""
            if not d:
                break
            buf += d
            while b"\0" in buf:
                raw, buf = buf.split(b"\0", 1)
                if not raw:
                    continue
                try:
                    m = json.loads(raw)
                except Exception:
                    continue
                if "id" in m:
                    with self._lock:
                        slot = self._pending.pop(m["id"], None)
                    if slot:
                        slot[1].append(m); slot[0].set()
                else:
                    self.events.put(m)
                    for h in list(self._handlers):
                        try: h(m)
                        except Exception: pass
        self._alive = False
        with self._lock:
            for ev, res in self._pending.values():
                ev.set()

    def send(self, method, params=None, session=None, timeout=30):
        i = next(self._ids)
        msg = {"id": i, "method": method, "params": params or {}}
        if session:
            msg["sessionId"] = session
        slot = (threading.Event(), [])
        with self._lock:
            self._pending[i] = slot
        self._w.write(json.dumps(msg).encode() + b"\0")
        if not slot[0].wait(timeout) or not slot[1]:
            raise CDPError("timeout/closed: " + method)
        r = slot[1][0]
        if "error" in r:
            raise CDPError("%s: %s" % (method, r["error"]))
        return r.get("result", {})

    def on(self, handler):
        self._handlers.append(handler)

    # ---- browser-level helpers
    def load_unpacked(self, path):
        """Extensions.loadUnpacked -> extension id (needs --enable-unsafe-extension-debugging)."""
        return self.send("Extensions.loadUnpacked", {"path": path})["id"]

    def targets(self):
        return self.send("Target.getTargets")["targetInfos"]

    def attach(self, url="about:blank"):
        """Create a new tab at url, attach with flatten=True, return a Page."""
        tid = self.send("Target.createTarget", {"url": "about:blank"})["targetId"]
        p = self.attach_target(tid)
        if url and url != "about:blank":
            p.navigate(url)
        return p

    def attach_target(self, target_id):
        sid = self.send("Target.attachToTarget", {"targetId": target_id, "flatten": True})["sessionId"]
        return Page(self, sid, target_id)

    def close(self):
        try:
            if self._alive:
                self.send("Browser.close", timeout=5)
        except Exception:
            pass
        try:
            self.proc.wait(5)
        except Exception:
            self.proc.kill()
        if self._own_profile:
            shutil.rmtree(self.profile, ignore_errors=True)

    def __enter__(self): return self
    def __exit__(self, *a): self.close()


class Page:
    def __init__(self, chrome, session, target_id):
        self.c, self.sid, self.target_id = chrome, session, target_id
        self.events = []                       # events for this session (bounded use)
        chrome.on(self._collect)
        self._fetch_rules = []
        for m in ("Page.enable", "Runtime.enable", "Network.enable"):
            try: self.send(m)
            except CDPError: pass   # service workers have no Page domain

    def _collect(self, m):
        if m.get("sessionId") == self.sid:
            self.events.append(m)
            if len(self.events) > 20000:
                del self.events[:10000]
            if m.get("method") == "Fetch.requestPaused" and self._fetch_rules:
                self._on_paused(m["params"])

    def send(self, method, params=None, timeout=30):
        return self.c.send(method, params, session=self.sid, timeout=timeout)

    def set_ua(self, lang="en-US", width=1280, height=900):
        """Desktop UA without 'HeadlessChrome', viewport 1280x900, Accept-Language."""
        ua = self.c.send("Browser.getVersion")["userAgent"].replace("HeadlessChrome", "Chrome")
        self.send("Emulation.setUserAgentOverride", {"userAgent": ua, "acceptLanguage": lang,
                  "platform": "MacIntel"})
        self.send("Emulation.setDeviceMetricsOverride", {"width": width, "height": height,
                  "deviceScaleFactor": 1, "mobile": False})

    def navigate(self, url, wait=True, timeout=30):
        mark = len(self.events)
        r = self.send("Page.navigate", {"url": url}, timeout=timeout)
        if r.get("errorText"):
            raise CDPError("navigate %s: %s" % (url, r["errorText"]))
        if wait:
            self.wait_event("Page.loadEventFired", timeout=timeout, since=mark)
        return r

    def wait_event(self, method, timeout=30, since=0):
        end = time.time() + timeout
        i = since
        while time.time() < end:
            while i < len(self.events):
                if self.events[i].get("method") == method:
                    return self.events[i]
                i += 1
            time.sleep(0.05)
        return None

    def evaluate(self, expr, await_promise=True, timeout=30):
        """Evaluate JS in the page; returns the JSON-able value (raises on exception)."""
        r = self.send("Runtime.evaluate", {"expression": expr, "returnByValue": True,
                      "awaitPromise": await_promise}, timeout=timeout)
        if "exceptionDetails" in r:
            d = r["exceptionDetails"]
            raise CDPError("JS: " + (d.get("exception", {}).get("description") or d.get("text")))
        return r["result"].get("value")

    def wait_for(self, expr, timeout=12, interval=0.3):
        """Poll JS expression until truthy; returns value or None."""
        end = time.time() + timeout
        while time.time() < end:
            try:
                v = self.evaluate(expr)
                if v:
                    return v
            except CDPError:
                pass
            time.sleep(interval)
        return None

    def screenshot(self, path, full=False):
        r = self.send("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": full})
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        with open(path, "wb") as f:
            f.write(base64.b64decode(r["data"]))
        return path

    # ---- input
    def click_at(self, x, y):
        """Real mouse click (button 1 = left) at viewport coords."""
        self.send("Input.dispatchMouseEvent", {"type": "mouseMoved", "x": x, "y": y})
        self.send("Input.dispatchMouseEvent", {"type": "mousePressed", "x": x, "y": y,
                  "button": "left", "buttons": 1, "clickCount": 1})
        self.send("Input.dispatchMouseEvent", {"type": "mouseReleased", "x": x, "y": y,
                  "button": "left", "buttons": 0, "clickCount": 1})

    def click_js_rect(self, rect_expr):
        """rect_expr: JS expression returning {x,y,width,height} (viewport coords) or null."""
        r = self.evaluate(rect_expr)
        if not r:
            return False
        self.click_at(r["x"] + r["width"] / 2, r["y"] + r["height"] / 2)
        return True

    # ---- DOM (shadow roots / iframes)
    def get_document(self, depth=-1, pierce=True):
        return self.send("DOM.getDocument", {"depth": depth, "pierce": pierce})["root"]

    def outer_html(self, node_id=None, backend_node_id=None):
        p = {"nodeId": node_id} if node_id else {"backendNodeId": backend_node_id}
        return self.send("DOM.getOuterHTML", p)["outerHTML"]

    def find_nodes(self, pred, root=None):
        """Walk a pierced DOM tree (incl. shadowRoots, contentDocument); yield nodes where pred(node)."""
        root = root or self.get_document()
        stack = [root]
        while stack:
            n = stack.pop()
            if pred(n):
                yield n
            for k in ("children", "shadowRoots"):
                stack.extend(n.get(k, []) or [])
            if n.get("contentDocument"):
                stack.append(n["contentDocument"])
            if n.get("templateContent"):
                stack.append(n["templateContent"])

    @staticmethod
    def attrs(node):
        a = node.get("attributes", [])
        return dict(zip(a[::2], a[1::2]))

    def frame_tree(self):
        return self.send("Page.getFrameTree")["frameTree"]

    def isolated_context(self, frame_id):
        """Execution context id of the main world of a frame (for evaluating inside OOP-less iframes)."""
        w = self.send("Page.createIsolatedWorld", {"frameId": frame_id, "worldName": "cdp-lib"})
        return w["executionContextId"]

    def evaluate_in(self, context_id, expr):
        r = self.send("Runtime.evaluate", {"expression": expr, "contextId": context_id,
                      "returnByValue": True, "awaitPromise": True})
        if "exceptionDetails" in r:
            raise CDPError("JS: " + str(r["exceptionDetails"].get("exception", {}).get("description")))
        return r["result"].get("value")

    # ---- Fetch fulfil
    def fetch_fulfill(self, rules):
        """rules: list of (url_substring, body:str|bytes, content_type, status). Matching requests are
        fulfilled with the body, others continue. Call before navigate."""
        self._fetch_rules = rules
        self.send("Fetch.enable", {"patterns": [{"urlPattern": "*"}]})

    def _on_paused(self, p):
        # must not block the reader thread -> worker thread
        threading.Thread(target=self._handle_paused, args=(p,), daemon=True).start()

    def _handle_paused(self, p):
        rid = p["requestId"]; url = p["request"]["url"]
        try:
            for sub, body, ctype, status in self._fetch_rules:
                if sub in url:
                    if isinstance(body, str):
                        body = body.encode()
                    self.c.send("Fetch.fulfillRequest", {"requestId": rid, "responseCode": status,
                                "responseHeaders": [{"name": "Content-Type", "value": ctype}],
                                "body": base64.b64encode(body).decode()}, session=self.sid)
                    return
            self.c.send("Fetch.continueRequest", {"requestId": rid}, session=self.sid)
        except Exception:
            pass

    def network_log(self, since=0):
        """List of (method,url,status|None) seen via Network events since index."""
        out = {}
        for e in self.events[since:]:
            m = e.get("method"); p = e.get("params", {})
            if m == "Network.requestWillBeSent":
                out[p["requestId"]] = [p["request"]["method"], p["request"]["url"], None]
            elif m == "Network.responseReceived" and p["requestId"] in out:
                out[p["requestId"]][2] = p["response"]["status"]
        return [tuple(v) for v in out.values()]

    def close(self):
        try: self.c.send("Target.closeTarget", {"targetId": self.target_id})
        except Exception: pass
