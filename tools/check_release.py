#!/usr/bin/env python3
"""Pre-publish checks. Usage: python3 tools/check_release.py [--release]

Fails (exit 1) if a donation link is not an https://buy.stripe.com/ or https://donate.stripe.com/ link, looks like a
test-mode / placeholder link, THANKS_URL is not the expected thanks page, the manifest lacks the matching thanks
content-script match, or lib/validate.js does not contain the same thanks URL.
Also fails if a file listed in the manifest content scripts is missing (rules/*.js included: they are written by the
rules author, so this check keeps flagging them until they exist), if a rules/*.js file is not listed in the manifest,
or if shipped JS uses eval / new Function / innerHTML / network APIs.
With --release at least one EUR link (small, medium, large or custom) must also be set and the icons must exist.
"""
import json, os, re, sys

# Mirrors ALLOWED_DONATION_ORIGINS in lib/support.js.
ALLOWED_ORIGINS = ("https://buy.stripe.com", "https://donate.stripe.com")
EXPECTED_THANKS = "https://overcrasher.github.io/quiet-web/thanks.html"
EXPECTED_MATCH = EXPECTED_THANKS + "?session_id=*"
KEYS = ("small", "medium", "large", "custom", "monthly")
REQUIRED_KEYS = ("small", "medium", "large", "custom")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
release = "--release" in sys.argv
errors = []


def read(rel):
    path = os.path.join(ROOT, rel)
    if not os.path.isfile(path):
        errors.append("%s: file not found" % rel)
        return None
    with open(path, encoding="utf-8") as fh:
        return fh.read()


cfg = read("config.js")
manifest_text = read("manifest.json")
validate = read("lib/validate.js")
manifest = {}
if manifest_text is not None:
    try:
        manifest = json.loads(manifest_text)
    except ValueError as e:
        errors.append("manifest.json: invalid JSON (%s)" % e)


def link_set(name):
    m = re.search(r"export const " + name + r"\s*=\s*\{([^}]*)\}", cfg)
    if not m:
        errors.append("config.js: %s not found" % name)
        return {}
    return dict(re.findall(r'(\w+)\s*:\s*"([^"]*)"', m.group(1)))


if cfg is not None:
    sets = {"DONATE_LINKS": link_set("DONATE_LINKS"), "DONATE_LINKS_USD": link_set("DONATE_LINKS_USD")}
    for name, links in sets.items():
        for key, url in links.items():
            where = "%s.%s" % (name, key)
            if key not in KEYS:
                errors.append("%s: unexpected key (allowed: %s)" % (where, ", ".join(KEYS)))
            if not url:
                continue
            if not url.startswith(tuple(o + "/" for o in ALLOWED_ORIGINS)):
                errors.append("%s: must start with one of %s (got %r)" % (where, ", ".join(o + "/" for o in ALLOWED_ORIGINS), url))
            if "test_" in url:
                errors.append("%s: looks like a Stripe test-mode link (contains 'test_')" % where)
            if re.search(r"TODO|PLACEHOLDER", url, re.I):
                errors.append("%s: contains TODO/PLACEHOLDER" % where)
    if release:
        if not any(sets["DONATE_LINKS"].get(k) for k in ("small", "medium", "large", "custom")):
            errors.append("--release: set at least one EUR link in DONATE_LINKS (small, medium, large or custom)")

    m = re.search(r'export const THANKS_URL\s*=\s*"([^"]*)"', cfg)
    if not m:
        errors.append("config.js: THANKS_URL not found")
    elif m.group(1) != EXPECTED_THANKS:
        errors.append("config.js: THANKS_URL is %r, expected %r" % (m.group(1), EXPECTED_THANKS))

if manifest:
    matches = []
    for cs in manifest.get("content_scripts", []):
        if "thanks.js" in cs.get("js", []):
            matches += cs.get("matches", [])
    if EXPECTED_MATCH not in matches:
        errors.append("manifest.json: no content_scripts match %r for thanks.js (found %r)" % (EXPECTED_MATCH, matches))

if validate is not None and EXPECTED_THANKS not in validate:
    errors.append("lib/validate.js: does not contain thanks URL %r" % EXPECTED_THANKS)

# Localized store name / summary (Chrome Web Store reads them from manifest.json via _locales).
LOCALES = ("en", "ro", "de", "fr", "es")
NAME_MAX, DESC_MAX = 75, 132
if manifest:
    if manifest.get("default_locale") != "en":
        errors.append("manifest.json: default_locale must be 'en'")
    for key in ("name", "description"):
        if manifest.get(key) != "__MSG_ext%s__" % key.capitalize():
            errors.append("manifest.json: %s must be __MSG_ext%s__" % (key, key.capitalize()))
    if manifest.get("short_name") != "Quiet Web":
        errors.append("manifest.json: short_name must be 'Quiet Web'")
    if manifest.get("action", {}).get("default_title") != "Quiet Web":
        errors.append("manifest.json: action.default_title must be 'Quiet Web'")
    for loc in LOCALES:
        txt = read("_locales/%s/messages.json" % loc)
        if txt is None:
            continue
        try:
            msgs = json.loads(txt)
        except ValueError as e:
            errors.append("_locales/%s/messages.json: invalid JSON (%s)" % (loc, e))
            continue
        if sorted(msgs) != ["extDescription", "extName"]:
            errors.append("_locales/%s/messages.json: must define exactly extName and extDescription (got %s)" % (loc, sorted(msgs)))
        for key, limit in (("extName", NAME_MAX), ("extDescription", DESC_MAX)):
            val = msgs.get(key, {}).get("message", "")
            if not val:
                errors.append("_locales/%s: %s is empty" % (loc, key))
            elif len(val) > limit:
                errors.append("_locales/%s: %s is %d chars (max %d)" % (loc, key, len(val), limit))

# Content-script file list: every file must exist; every rules/*.js must be listed (generic.js last of the rules).
if manifest:
    listed = []
    for cs in manifest.get("content_scripts", []):
        listed += cs.get("js", [])
    for f in listed:
        if not os.path.isfile(os.path.join(ROOT, f)):
            errors.append("manifest.json: content script file not found: %s" % f)
    rules_listed = [f for f in listed if f.startswith("rules/")]
    if rules_listed and rules_listed[-1] != "rules/generic.js":
        errors.append("manifest.json: rules/generic.js must be the LAST rules file")
    rules_dir = os.path.join(ROOT, "rules")
    if os.path.isdir(rules_dir):
        for name in sorted(os.listdir(rules_dir)):
            if name.endswith(".js") and "rules/" + name not in listed:
                errors.append("rules/%s exists but is not listed in the manifest content scripts" % name)
    else:
        errors.append("rules/ folder not found")
    if release:
        for size in (16, 32, 48, 128):
            if not os.path.isfile(os.path.join(ROOT, "icons", "icon%d.png" % size)):
                errors.append("--release: icons/icon%d.png missing" % size)

# Shipped JS: no dynamic code, no innerHTML, no network.
FORBIDDEN = [(r"\beval\s*\(", "eval"), (r"new\s+Function\b", "new Function"), (r"\.innerHTML\b", "innerHTML"), (r"\.outerHTML\s*=", "outerHTML assignment"),
             (r"\bfetch\s*\(", "fetch"), (r"XMLHttpRequest", "XMLHttpRequest"), (r"\bWebSocket\b", "WebSocket"), (r"sendBeacon", "sendBeacon"),
             (r"document\.write\s*\(", "document.write")]
scan = ["background.js", "thanks.js", "content.js", "newsletter.js", "dcl-snapshot.js", "popup.js", "options.js", "welcome.js", "config.js"]
for d in ("lib", "rules"):
    dd = os.path.join(ROOT, d)
    if os.path.isdir(dd):
        scan += [d + "/" + n for n in sorted(os.listdir(dd)) if n.endswith(".js")]
for f in scan:
    text = read(f) if os.path.isfile(os.path.join(ROOT, f)) else None
    if text is None:
        continue
    code = re.sub(r"//[^\n]*", "", text)
    for pat, label in FORBIDDEN:
        if re.search(pat, code):
            errors.append("%s: uses %s" % (f, label))
    if re.search(r"world\s*:\s*[\"']MAIN[\"']", code):
        errors.append("%s: references world MAIN (add MAIN-world scripts deliberately, not by accident)" % f)

if errors:
    print("check_release: FAILED")
    for e in errors:
        print("  - " + e)
    sys.exit(1)
print("check_release: OK" + (" (release)" if release else ""))
