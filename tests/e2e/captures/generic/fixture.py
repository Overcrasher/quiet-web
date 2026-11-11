"""Fixtures for the generic rule: home-grown banners mirrored from live captures (libris.ro, emag.ro, cel.ro) + pay-or-consent (must stay untouched)."""
def page(title, banner):
    return "<!doctype html><html lang=ro><head><meta charset=utf-8><title>%s</title></head><body><h1>%s</h1><p>Continut.</p>%s</body></html>" % (title, title, banner)

LIBRIS = """<div class="modal fade show" id="consent_mode_modal" tabindex="-1" role="dialog" aria-modal="true" style="display:block;position:fixed;left:20%;top:20%;width:60%;background:#fff;padding:20px;z-index:9999"><div class="consent-mode-modal">
<p class="consent-mode-modal-title">Confidențialitatea datelor tale este importantă pentru noi</p>
<p>Folosim cookie-uri pentru a îmbunătăți experiența ta de navigare. Făcând clic pe „Accept toate”, accepți utilizarea cookie-urilor. <a href="/informatiiUtile/politicaCookies">Politica de Cookies</a>.</p>
<div class="consent-mode-modal-btn-accept-ct"><a onclick="return false">Accept toate</a></div><div class="consent-mode-modal-btn-refuz-ct"><a onclick="document.getElementById('consent_mode_modal').remove()">Refuz toate</a></div></div></div>"""

EMAG = """<div class="gdpr-cookie-banner js-gdpr-cookie-banner py-2 px-0" style="position:fixed;left:0;right:0;bottom:0;background:#fff;padding:16px;z-index:9999"><p>Folosim cookie-uri și tehnologii similare pentru a personaliza conținutul. <a href="/cookies">Politica de utilizare Cookie-uri</a></p>
<button type="button">Accept toate</button><button type="button" onclick="this.parentNode.remove()">Refuză toate</button><button type="button">Administrează preferințele</button></div>"""

PAYWALL = """<div id="cookie-notice" role="dialog" style="position:fixed;left:0;right:0;bottom:0;background:#fff;padding:16px;z-index:9999"><p>We use cookies and similar technologies for personalised ads.</p>
<button type="button" onclick="document.title='CLICKED-ACCEPT'">Accept all</button><button type="button" onclick="document.title='CLICKED-PAY'">Reject all and pay</button></div>"""

FIXTURES = [
    {"name": "generic-libris.ro", "url": "https://www.libris.ro/", "html": page("Libris", LIBRIS), "expect_rule": "generic", "expect_outcome": "rejected"},
    {"name": "generic-emag.ro", "url": "https://www.emag.ro/", "html": page("eMAG", EMAG), "expect_rule": "generic", "expect_outcome": "rejected"},
    {"name": "generic-payorconsent", "url": "https://www.express.co.uk/", "html": page("Pay", PAYWALL), "expect_rule": None, "expect_outcome": "none"},
]
