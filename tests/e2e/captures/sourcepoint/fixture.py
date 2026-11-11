"""Fixtures mirroring the live Sourcepoint captures. The message is an iframe (real one is cross-origin; here a same-origin URL so Fetch.fulfill on the page session can serve it) inside div#sp_message_container_*.
Each fixture carries `frame_url` + `frame_html`: the harness must also fulfill frame_url with frame_html (text/html)."""
import html as _h

def top(title, frame_doc, fid="1489022", frame_url="https://www.bbc.com/sp-frame/index.html?hasCsp=true&message_id=1489022"):
    return ("<!doctype html><html lang=en><head><meta charset=utf-8><title>%s</title></head><body><h1>%s</h1><p>Page content.</p>"
            '<div id="sp_message_container_%s" aria-modal="true" aria-labelledby="sp_message_iframe_%s" role="dialog" style="display:block;position:fixed;inset:10%% 20%%;z-index:2147483647;background:#fff">'
            '<iframe src="%s" id="sp_message_iframe_%s" title="SP Consent Message" style="width:100%%;height:400px;border:0"></iframe></div></body></html>'
            % (title, title, fid, fid, _h.escape(frame_url, quote=True), fid))

BBC_FRAME = """<!doctype html><html><body><div class="message-container"><p>We use cookies and similar technologies. See our <a class="text-link-0-0-0-4 focusable" href="#">privacy policy</a>.</p>
<button title="Manage options" aria-label="Manage options" class="message-component message-button no-children focusable manage_options sp_choice_type_12">Manage options</button>
<button title="I agree" aria-label="I agree" class="message-component message-button no-children focusable button sp_choice_type_11">I agree</button>
<button title="I do not agree" aria-label="I do not agree" class="message-component message-button no-children focusable button sp_choice_type_13">I do not agree</button></div></body></html>"""

# Pay-or-consent (theguardian.com / spiegel.de): accept + a "subscribe" button (type 9), no plain reject -> engine must leave it alone.
GUARDIAN_FRAME = """<!doctype html><html><body><div class="message-container"><h2>Personalised advertising - it's your choice</h2><p>We use cookies and similar technologies. <a href="#" data-choice="1738679221733" aria-label="137 partners">137 partners</a></p>
<button title="Accept all" aria-label="Accept all" class="message-component message-button no-children focusable btn-primary sp_choice_type_11">Accept all</button>
<button title="Reject all and subscribe" aria-label="Reject all and subscribe" class="message-component message-button no-children focusable btn-primary sp_choice_type_9">Reject all and subscribe</button></div></body></html>"""

FIXTURES = [
    {"name": "sourcepoint-bbc.com", "url": "https://www.bbc.com/", "html": top("BBC", BBC_FRAME), "frame_url": "https://www.bbc.com/sp-frame/index.html?hasCsp=true&message_id=1489022", "frame_html": BBC_FRAME, "expect_rule": "sourcepoint", "expect_outcome": "rejected"},
    {"name": "sourcepoint-guardian-payorconsent", "url": "https://www.theguardian.com/europe", "html": top("Guardian", GUARDIAN_FRAME, "1482251", "https://www.theguardian.com/sp-frame/index.html?hasCsp=true&message_id=1482251"), "frame_url": "https://www.theguardian.com/sp-frame/index.html?hasCsp=true&message_id=1482251", "frame_html": GUARDIAN_FRAME, "expect_rule": None, "expect_outcome": "none"},
]
