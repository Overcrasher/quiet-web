"""Fixtures mirroring the live Usercentrics captures. The UI lives in an OPEN shadow root, built by a script like the real SDK does."""
import json

def page(title, host_html, shadow_html):
    return ("<!doctype html><html lang=de><head><meta charset=utf-8><title>%s</title></head><body><h1>%s</h1><p>Inhalt.</p>%s"
            "<script>(function(){var h=document.querySelector('#usercentrics-root,#usercentrics-cmp-ui');var s=h.attachShadow({mode:'open'});s.innerHTML=%s;})();</script></body></html>"
            % (title, title, host_html, json.dumps(shadow_html)))

DM = """<div data-nosnippet="1" data-testid="uc-app-container"><div><button aria-label="Öffnen Privatsphäre-Einstellungen" data-testid="uc-privacy-button" style="position:fixed;left:0;bottom:0"><span>&#9881;</span></button>
<div id="app-focus-lock"><div id="center-layer-focus-lock"><div data-testid="uc-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,.5)"></div>
<div lang="de" role="dialog" aria-modal="true" id="uc-center-container" data-testid="uc-default-wall" style="position:fixed;left:20%;top:20%;width:60%;background:#fff;padding:20px">
<h1 data-testid="uc-heading-title" id="uc-heading-title">Ein Moment für Deine Privatsphäre</h1><div data-testid="uc-message-container"><p>Wir setzen Cookies und ähnliche Technologien ein.</p></div>
<div><button data-testid="uc-accept-all-button">Alles akzeptieren</button><button data-testid="uc-deny-all-button">Einwilligung ablehnen</button><button data-testid="uc-customize-anchor">Einstellungen</button></div></div></div></div></div></div>"""

FRESSNAPF = """<div style="position:fixed;left:0;right:0;bottom:0;background:#fff;padding:20px"><div role="dialog" aria-modal="true" class="cmp"><h2>Diesmal sind die Cookies für dich, nicht für deinen Liebling!</h2><p>Wir verwenden Cookies und andere Technologien.</p>
<footer id="uc-cmp-footer" data-testid="uc-footer"><button data-action="consent" data-action-type="more" class="more uc-more-button" id="more" aria-label="Zu den Einstellungen">Zu den Einstellungen</button>
<button data-action="consent" data-action-type="deny" class="deny uc-deny-button" id="deny" aria-label="Nur notwendige Cookies">Nur notwendige Cookies</button>
<button data-action="consent" data-action-type="accept" class="accept uc-accept-button" id="accept" aria-label="Alles akzeptieren">Alles akzeptieren</button></footer></div></div>"""

FIXTURES = [
    {"name": "usercentrics-dm.de", "url": "https://www.dm.de/", "html": page("dm", '<div id="usercentrics-root" data-created-at="1"></div>', DM), "expect_rule": "usercentrics", "expect_outcome": "rejected"},
    {"name": "usercentrics-fressnapf.de", "url": "https://www.fressnapf.de/", "html": page("fressnapf", '<aside id="usercentrics-cmp-ui" data-nosnippet="1" keyboard-events="true"></aside>', FRESSNAPF), "expect_rule": "usercentrics", "expect_outcome": "rejected"},
]
