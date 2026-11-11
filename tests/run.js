// Run from the quiet-web folder:  jsc tests/run.js
load("lib/validate.js");
load("lib/stats.js");
load("lib/growth.js");
load("lib/donation.js");
load("lib/rating.js");
load("lib/reject-phrases.js");
load("lib/popups.js");
load("content.js");     // no chrome object here: only exposes QuietEngine
load("newsletter.js");  // only exposes QuietNewsletter
for (const n of ["onetrust", "cookiebot", "didomi", "quantcast", "trustarc", "usercentrics", "sourcepoint", "generic"]) load("rules/" + n + ".js");

let pass = 0, fail = 0;
const failures = [];
function eq(name, got, want) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) pass++; else { fail++; failures.push(name + ": got " + g + " want " + w); }
}
const V = QuietValidate, S = QuietStats, G = QuietGrowth, D = QuietDonation, R = QuietRating, P = QuietPhrases, U = QuietPopups, E = QuietEngine, N = QuietNewsletter;

// ---- URL exclusion list
const ex = (u) => U.isExcludedUrl(u);
for (const u of ["https://x.com/login", "https://x.com/Login", "https://x.com/LOGIN?x=1", "https://x.com/user/sign-in", "https://x.com/signin",
  "https://x.com/signup", "https://x.com/register?plan=1", "https://x.com/checkout", "https://x.com/shop/cart", "https://x.com/basket/items",
  "https://x.com/payment", "https://x.com/pay", "https://x.com/account/settings", "https://x.com/oauth/authorize", "https://x.com/auth",
  "https://x.com/password-reset", "https://x.com/?next=/checkout", "https://x.com/a?redirect=%2Flogin", "https://x.com/#/login", "https://x.com/CheckOut/step2"]) {
  eq("excluded " + u, ex(u), true);
}
eq("excluded paypal (documented contains match)", ex("https://x.com/paypal"), true);
eq("excluded author page (auth substring)", ex("https://x.com/author/jane"), true);
for (const u of ["https://news.example.com/world/article-1", "https://example.com/", "https://example.com/?q=news", "https://login.example.com/home",
  "https://example.com/sports/football", "https://example.com/blog/2026/11/quiet"]) {
  eq("allowed " + u, ex(u), false);
}
eq("excluded empty", ex(""), true);
eq("excluded non-string", ex(null), true);
eq("excluded words", U.EXCLUDED_WORDS.length, 13);

// ---- overlay coverage maths (viewport 1000x800)
eq("coverage full", U.coverage({ left: 0, top: 0, right: 1000, bottom: 800 }, 1000, 800), 1);
eq("coverage half", U.coverage({ left: 0, top: 0, right: 500, bottom: 800 }, 1000, 800), 0.5);
eq("coverage partly outside", U.coverage({ left: -500, top: 0, right: 500, bottom: 800 }, 1000, 800), 0.5);
eq("coverage larger than viewport", U.coverage({ left: -50, top: -50, right: 2000, bottom: 2000 }, 1000, 800), 1);
eq("coverage offscreen", U.coverage({ left: 1200, top: 0, right: 1500, bottom: 800 }, 1000, 800), 0);
eq("coverage x/y/width form", U.coverage({ x: 0, y: 0, width: 1000, height: 400 }, 1000, 800), 0.5);
eq("coverage zero viewport", U.coverage({ left: 0, top: 0, right: 10, bottom: 10 }, 0, 800), 0);
eq("coverage null rect", U.coverage(null, 1000, 800), 0);
eq("coverage NaN rect", U.coverage({ left: NaN, top: 0, right: 10, bottom: 10 }, 1000, 800), 0);
eq("overlay exactly 30% is not large", U.isLargeOverlay({ left: 0, top: 0, right: 300, bottom: 800 }, 1000, 800), false);
eq("overlay 30.1% is large", U.isLargeOverlay({ left: 0, top: 0, right: 301, bottom: 800 }, 1000, 800), true);
eq("overlay small modal", U.isLargeOverlay({ left: 300, top: 200, right: 700, bottom: 500 }, 1000, 800), false);
eq("overlay full", U.isLargeOverlay({ left: 0, top: 0, right: 1000, bottom: 800 }, 1000, 800), true);
eq("coverage threshold const", U.COVERAGE_MIN, 0.3);

// ---- email / payment predicates
eq("email type", U.isEmailInput({ type: "email" }), true);
eq("email name", U.isEmailInput({ type: "text", name: "user_email" }), true);
eq("email placeholder", U.isEmailInput({ type: "text", placeholder: "Enter your email address" }), true);
eq("email e-mail", U.isEmailInput({ type: "text", ariaLabel: "Adresse e-mail" }), true);
eq("email autocomplete", U.isEmailInput({ type: "text", autocomplete: "email" }), true);
eq("email correo", U.isEmailInput({ type: "text", placeholder: "Correo electrónico" }), true);
eq("email default type", U.isEmailInput({ name: "email" }), true);
eq("email plain text", U.isEmailInput({ type: "text", name: "q" }), false);
eq("email password", U.isEmailInput({ type: "password", name: "email" }), false);
eq("email checkbox", U.isEmailInput({ type: "checkbox", name: "email_optin" }), false);
eq("email null", U.isEmailInput(null), false);
eq("email empty", U.isEmailInput({}), false);
eq("pay password", U.isPaymentOrPasswordInput({ type: "password" }), true);
eq("pay cc-number", U.isPaymentOrPasswordInput({ type: "text", autocomplete: "cc-number" }), true);
eq("pay cardnumber", U.isPaymentOrPasswordInput({ type: "text", name: "cardnumber" }), true);
eq("pay card_number", U.isPaymentOrPasswordInput({ type: "text", id: "card_number" }), true);
eq("pay cvc", U.isPaymentOrPasswordInput({ type: "text", name: "cvc" }), true);
eq("pay new-password", U.isPaymentOrPasswordInput({ type: "text", autocomplete: "new-password" }), true);
eq("pay email is fine", U.isPaymentOrPasswordInput({ type: "email", name: "email" }), false);
eq("pay null", U.isPaymentOrPasswordInput(null), false);
eq("overlay inputs: email only", U.overlayInputsOk([{ type: "email" }]), true);
eq("overlay inputs: email + password", U.overlayInputsOk([{ type: "email" }, { type: "password" }]), false);
eq("overlay inputs: no email", U.overlayInputsOk([{ type: "text", name: "q" }]), false);
eq("overlay inputs: empty", U.overlayInputsOk([]), false);
eq("overlay inputs: not an array", U.overlayInputsOk(null), false);
eq("overlay inputs: email + card", U.overlayInputsOk([{ type: "email" }, { type: "text", autocomplete: "cc-number" }]), false);

// ---- close button text predicate
for (const t of ["×", "x", "X", "✕", "Close", "close", "Dismiss", "No thanks", "No, thanks", "No thanks, I don't want 10% off", "Maybe later", "Not now",
  "Închide", "Nu, mulțumesc", "Nein danke", "Schließen", "Fermer", "Non merci", "Cerrar", "No gracias", "Chiudi", "No grazie", "Sluiten", "Zamknij", "Close dialog"]) {
  eq("close text " + t, U.isCloseText(t), true);
}
for (const t of ["Subscribe", "Sign up", "Get 10% off", "Close up photo of cats and dogs", "", "   ", "Submit", "Join now"]) {
  eq("not close text " + t, U.isCloseText(t), false);
}
eq("close text non-string", U.isCloseText(undefined), false);
eq("close text too long", U.isCloseText("close".repeat(30)), false);

// ---- scroll restore + user gesture
eq("locked scroll fixed", U.lockedScrollY("-1234px", "fixed"), 1234);
eq("locked scroll fractional", U.lockedScrollY("-12.5px", "fixed"), 12.5);
eq("locked scroll zero", U.lockedScrollY("0px", "fixed"), 0);
eq("locked scroll static", U.lockedScrollY("-100px", "static"), 0);
eq("locked scroll auto", U.lockedScrollY("auto", "fixed"), 0);
eq("locked scroll positive", U.lockedScrollY("100px", "fixed"), 0);
eq("locked scroll undefined", U.lockedScrollY(undefined, "fixed"), 0);
eq("gesture none", U.userOpened(0, 1000, 2000), false);
eq("gesture recent", U.userOpened(500, 1000, 2000), true);
eq("gesture old", U.userOpened(500, 3000, 2000), false);
eq("gesture after element", U.userOpened(1500, 1000, 2000), false);

// ---- normalisation
eq("norm basic", P.normalize("Reject ALL!"), "reject all");
eq("norm diacritics ro", P.normalize("Respinge tot, ȘȚ ăâî"), "respinge tot st aai");
eq("norm eszett", P.normalize("Schließen"), "schliessen");
eq("norm polish", P.normalize("Odrzuć wszystkie, Łódź"), "odrzuc wszystkie lodz");
eq("norm apostrophe", P.normalize("Don't accept"), "don t accept");
eq("norm non-string", P.normalize(null), "");

// ---- reject phrase matching per language
const lang = (t) => { const m = P.matchReject(t); return m ? m.lang : null; };
for (const [t, l] of [["Reject all", "en"], ["Reject All Cookies", "en"], ["Decline", "en"], ["Necessary only", "en"], ["Only essential cookies", "en"], ["Continue without accepting", "en"],
  ["Deny all", "en"], ["Do not accept", "en"],
  ["Respinge tot", "ro"], ["Respinge toate", "ro"], ["Refuz", "ro"], ["Doar necesare", "ro"], ["Continuă fără a accepta", "ro"],
  ["Alle ablehnen", "de"], ["Nur notwendige", "de"], ["Nur notwendige Cookies", "de"], ["Ablehnen", "de"], ["Weiter ohne Zustimmung", "de"],
  ["Tout refuser", "fr"], ["Continuer sans accepter", "fr"], ["Refuser", "fr"], ["Uniquement nécessaires", "fr"],
  ["Rechazar todo", "es"], ["Rechazar todas", "es"], ["Solo necesarias", "es"], ["Continuar sin aceptar", "es"],
  ["Rifiuta tutto", "it"], ["Rifiuta", "it"], ["Solo necessari", "it"], ["Continua senza accettare", "it"],
  ["Alles weigeren", "nl"], ["Weigeren", "nl"], ["Alleen noodzakelijke", "nl"],
  ["Odrzuć wszystkie", "pl"], ["Odrzuć", "pl"], ["Tylko niezbędne", "pl"]]) {
  eq("reject " + t, lang(t), l);
}
for (const t of ["Accept all", "Accept all and continue", "Allow all", "Alle akzeptieren", "Tout accepter", "Aceptar todo", "Accetta tutto", "Alles accepteren",
  "Zaakceptuj wszystkie", "Acceptă tot", "I agree", "OK", "Manage preferences", "Settings", "Save",
  "We and our partners use cookies to store and access information on your device so we can show you personalised content and measure the performance of ads over time."]) {
  eq("not reject " + t.slice(0, 30), P.matchReject(t), null);
}
eq("matchReject non-string", P.matchReject(undefined), null);
eq("matchReject longest phrase wins", P.matchReject("Reject all cookies").phrase, "reject all cookies");
eq("languages covered", P.LANGS, ["en", "ro", "de", "fr", "es", "it", "nl", "pl"]);

// ---- accept guard
for (const t of ["Accept all", "I agree", "Allow all cookies", "Alle akzeptieren", "Tout accepter", "J'accepte", "Aceptar todo", "Accetta tutto", "Alles accepteren",
  "Zaakceptuj wszystkie", "Acceptă tot", "Sunt de acord", "Zgadzam się", "Zustimmen", "Einverstanden", "OK", "Ok, got it", "Allow selection", "Autoriser", "Acepto",
  "Permitir todo", "Consenti", "Accetto", "Reject all and accept necessary"]) {
  eq("accept-like " + t, P.isAcceptLike(t), true);
}
for (const t of ["Reject all", "Do not accept", "Nu accept", "Nicht akzeptieren", "No aceptar", "Non accetto", "Ne pas accepter", "Niet accepteren", "Nie akceptuję",
  "Continue without accepting", "Save my choices", "Settings", "Necessary only", "I disagree", "Nu sunt de acord", "Nicht einverstanden"]) {
  eq("not accept-like " + t, P.isAcceptLike(t), false);
}
eq("clickable reject", P.isRejectClickable("Reject all"), true);
eq("clickable do not accept", P.isRejectClickable("Do not accept"), true);
eq("not clickable accept", P.isRejectClickable("Accept all"), false);
eq("not clickable mixed", P.isRejectClickable("Reject all and accept necessary"), false);
eq("not clickable unknown", P.isRejectClickable("Learn more"), false);
eq("selection save: allow selection", P.isSelectionSave("Allow selection"), true);
eq("selection save: confirm choices", P.isSelectionSave("Confirm my choices"), true);
eq("selection save: allow all is not", P.isSelectionSave("Allow all"), false);
eq("selection save: accept all selected is not", P.isSelectionSave("Accept all selected"), false);
eq("mayClick reject", P.mayClickLabel("Reject all", false), true);
eq("mayClick accept", P.mayClickLabel("Accept all", false), false);
eq("mayClick allow selection default", P.mayClickLabel("Allow selection", false), false);
eq("mayClick allow selection opted in", P.mayClickLabel("Allow selection", true), true);
eq("mayClick allow all opted in", P.mayClickLabel("Allow all", true), false);
eq("mayClick save choices", P.mayClickLabel("Save my choices", false), true);

// ---- consent dialog text detection
eq("consent en cookies", P.isConsentText("We use cookies to improve your experience."), true);
eq("consent en lang", P.consentLanguage("By continuing you give your consent to our cookies."), "en");
eq("consent neutral cookie", P.consentLanguage("We use cookies for stats"), "und");
eq("consent ro", P.consentLanguage("Folosim cookie-uri. Ne dai consimțământul?"), "ro");
eq("consent de", P.consentLanguage("Wir verwenden Cookies. Datenschutz-Einstellungen"), "de");
eq("consent fr", P.consentLanguage("Nous utilisons des cookies. Votre consentement"), "fr");
eq("consent es", P.consentLanguage("Usamos cookies. Su consentimiento"), "es");
eq("consent it", P.consentLanguage("Utilizziamo i cookie. Il tuo consenso"), "it");
eq("consent nl", P.consentLanguage("Wij gebruiken cookies. Uw toestemming"), "nl");
eq("consent pl", P.consentLanguage("Używamy plików cookie. Twoja zgoda"), "pl");
eq("consent pl ciasteczka", P.isConsentText("Ta strona używa ciasteczek"), true);
eq("not consent", P.isConsentText("Welcome to our blog about gardening"), false);
eq("not consent empty", P.isConsentText(""), false);
eq("consent min length", P.isConsentText("Cookies", 20), false);
eq("consent min length ok", P.isConsentText("This site uses cookies for stats", 20), true);
eq("consent non-string", P.isConsentText(null), false);

// ---- validators
const SESS = "cs_live_" + "a1B2c3D4e5F6g7H8i9J0k1L2";
eq("session live", V.validSession(SESS), true);
eq("session test", V.validSession("cs_test_" + "A".repeat(24)), true);
eq("session short", V.validSession("cs_live_abc"), false);
eq("session bad prefix", V.validSession("pi_live_" + "a".repeat(24)), false);
eq("session non-string", V.validSession(12345), false);
eq("session injection", V.validSession(SESS + "\n"), false);
eq("thanks exact", V.isThanksUrl("https://overcrasher.github.io/quiet-web/thanks.html?session_id=" + SESS), true);
eq("thanks no query", V.isThanksUrl("https://overcrasher.github.io/quiet-web/thanks.html"), true);
eq("thanks http", V.isThanksUrl("http://overcrasher.github.io/quiet-web/thanks.html?session_id=" + SESS), false);
eq("thanks other path", V.isThanksUrl("https://overcrasher.github.io/quiet-web/index.html"), false);
eq("thanks other repo", V.isThanksUrl("https://overcrasher.github.io/wait-24h/thanks.html"), false);
eq("thanks lookalike host", V.isThanksUrl("https://overcrasher.github.io.evil.com/quiet-web/thanks.html"), false);
eq("thanks userinfo trick", V.isThanksUrl("https://overcrasher.github.io@evil.com/quiet-web/thanks.html"), false);
eq("thanks non-string", V.isThanksUrl(null), false);
eq("hostFromUrl basic", V.hostFromUrl("https://www.Example.com/path?x=1"), "example.com");
eq("hostFromUrl subdomain", V.hostFromUrl("https://news.example.co.uk:8443/a"), "news.example.co.uk");
eq("hostFromUrl userinfo", V.hostFromUrl("https://user:pw@example.com/"), "example.com");
eq("hostFromUrl chrome", V.hostFromUrl("chrome://extensions"), "");
eq("hostFromUrl file", V.hostFromUrl("file:///etc/passwd"), "");
eq("hostFromUrl junk", V.hostFromUrl("not a url"), "");
eq("hostFromUrl non-string", V.hostFromUrl(5), "");
eq("hostFromUrl ipv6 rejected", V.hostFromUrl("http://[::1]/"), "");
eq("normalizeHost www", V.normalizeHost("WWW.Example.com."), "example.com");
eq("normalizeHost bad chars", V.normalizeHost("exa mple.com"), "");
eq("normalizeHost double dot", V.normalizeHost("a..com"), "");
eq("validHost ok", V.validHost("example.com"), true);
eq("validHost uppercase", V.validHost("Example.com"), false);
eq("validHost www", V.validHost("www.example.com"), false);
eq("validHost empty", V.validHost(""), false);
eq("validHost script", V.validHost("<script>"), false);
eq("sanitizeSites", V.sanitizeSites(["b.com", "WWW.a.com", "b.com", "bad host", 7, null]), ["a.com", "b.com"]);
eq("sanitizeSites non-array", V.sanitizeSites("a.com"), []);
eq("sanitizeSites cap", V.sanitizeSites(Array.from({ length: 1200 }, (_, i) => "h" + i + ".com")).length, 1000);
eq("withSite add", V.withSite(["a.com"], "b.com", true), ["a.com", "b.com"]);
eq("withSite remove", V.withSite(["a.com", "b.com"], "a.com", false), ["b.com"]);
eq("withSite add twice", V.withSite(["a.com"], "a.com", true), ["a.com"]);
eq("isDisabled yes", V.isDisabled(["a.com"], "a.com"), true);
eq("isDisabled no", V.isDisabled(["a.com"], "b.com"), false);
eq("isDisabled empty host", V.isDisabled(["a.com"], ""), false);
eq("cleanText control chars", V.cleanText("a\u0000b\u202Ec\n d"), "a b c d");
eq("cleanText truncates", V.cleanText("x".repeat(500), 10), "xxxxxxxxxx");
eq("cleanText non-string", V.cleanText({}), "");

const okRes = { type: "result", kind: "cookie", ruleId: "onetrust", outcome: "rejected", detail: "clicked reject" };
eq("result ok", V.validateResult(okRes), { kind: "cookie", ruleId: "onetrust", outcome: "rejected", detail: "clicked reject" });
eq("result saved-necessary", V.validateResult(Object.assign({}, okRes, { outcome: "saved-necessary" })).outcome, "saved-necessary");
eq("result hidden", V.validateResult(Object.assign({}, okRes, { outcome: "hidden" })).outcome, "hidden");
eq("result popup closed", V.validateResult({ type: "result", kind: "popup", ruleId: "newsletter", outcome: "closed" }).detail, "");
eq("result popup removed", V.validateResult({ type: "result", kind: "popup", ruleId: "newsletter", outcome: "removed" }).outcome, "removed");
eq("result none rejected", V.validateResult(Object.assign({}, okRes, { outcome: "none" })), null);
eq("result popup with cookie outcome", V.validateResult({ type: "result", kind: "popup", ruleId: "newsletter", outcome: "rejected" }), null);
eq("result cookie with popup outcome", V.validateResult(Object.assign({}, okRes, { outcome: "closed" })), null);
eq("result bad kind", V.validateResult(Object.assign({}, okRes, { kind: "other" })), null);
eq("result proto kind", V.validateResult(Object.assign({}, okRes, { kind: "constructor" })), null);
eq("result bad ruleId", V.validateResult(Object.assign({}, okRes, { ruleId: "One Trust!" })), null);
eq("result long ruleId", V.validateResult(Object.assign({}, okRes, { ruleId: "a".repeat(41) })), null);
eq("result bad detail type", V.validateResult(Object.assign({}, okRes, { detail: { a: 1 } })), null);
eq("result detail cleaned", V.validateResult(Object.assign({}, okRes, { detail: "a\u0000" + "b".repeat(300) })).detail.length, 200);
eq("result wrong type", V.validateResult(Object.assign({}, okRes, { type: "supporter" })), null);
eq("result array", V.validateResult([okRes]), null);
eq("result null", V.validateResult(null), null);
eq("result ignores extra site field", Object.keys(V.validateResult(Object.assign({ site: "evil.com" }, okRes))).sort(), ["detail", "kind", "outcome", "ruleId"]);
eq("tabId ok", V.validTabId(12), true);
eq("tabId negative", V.validTabId(-1), false);
eq("tabId float", V.validTabId(1.5), false);
eq("tabId string", V.validTabId("1"), false);
eq("sanitizeStats empty", V.sanitizeStats(undefined), { cookiesRejected: 0, cookiesHidden: 0, popupsClosed: 0, today: { date: "", count: 0 } });
eq("sanitizeStats junk", V.sanitizeStats({ cookiesRejected: -1, cookiesHidden: "3", popupsClosed: 2.5, today: { date: "x", count: -2 } }),
  { cookiesRejected: 0, cookiesHidden: 0, popupsClosed: 0, today: { date: "", count: 0 } });
eq("sanitizeStats good", V.sanitizeStats({ cookiesRejected: 4, cookiesHidden: 1, popupsClosed: 2, today: { date: "2026-11-11", count: 3 } }),
  { cookiesRejected: 4, cookiesHidden: 1, popupsClosed: 2, today: { date: "2026-11-11", count: 3 } });
eq("sanitizeTabRecord empty", V.sanitizeTabRecord(null), { url: "", cookie: null, popups: 0, carry: false });
eq("sanitizeTabRecord bad cookie", V.sanitizeTabRecord({ cookie: { ruleId: "x", outcome: "weird" } }).cookie, null);
eq("sanitizeTabRecord good", V.sanitizeTabRecord({ url: "https://a.com/", cookie: { ruleId: "cookiebot", outcome: "hidden", detail: "d" }, popups: 2 }),
  { url: "https://a.com/", cookie: { ruleId: "cookiebot", outcome: "hidden", detail: "d" }, popups: 2, carry: false });
eq("sanitizeDonation junk", V.sanitizeDonation({ asked: ["x", 100], lastAskAt: -1, dontAskAgain: "yes" }), { asked: [100], lastAskAt: 0, dontAskAgain: false });
eq("sanitizeRating junk", V.sanitizeRating({ shown: "yes" }), { shown: false, at: 0 });
eq("sanitizeRating good", V.sanitizeRating({ shown: true, at: 9 }), { shown: true, at: 9 });

// ---- counters
const T0 = new Date(2026, 10, 11, 23, 59, 0).getTime();
const T1 = new Date(2026, 10, 12, 0, 1, 0).getTime();
const s0 = V.sanitizeStats({}), t0 = V.sanitizeTabRecord({});
eq("dateKey local", S.dateKey(T0), "2026-11-11");
eq("dateKey next day", S.dateKey(T1), "2026-11-12");
eq("dateKey padding", S.dateKey(new Date(2026, 0, 5, 12).getTime()), "2026-01-05");
const a1 = S.applyResult(s0, t0, V.validateResult(okRes), T0);
eq("apply rejected counted", [a1.counted, a1.stats.cookiesRejected, a1.stats.cookiesHidden, a1.stats.today], [true, 1, 0, { date: "2026-11-11", count: 1 }]);
eq("apply keeps tab cookie", a1.tab.cookie, { ruleId: "onetrust", outcome: "rejected", detail: "clicked reject" });
eq("apply does not mutate inputs", [s0.cookiesRejected, t0.cookie], [0, null]);
const a2 = S.applyResult(a1.stats, a1.tab, V.validateResult(Object.assign({}, okRes, { ruleId: "generic" })), T0);
eq("apply second cookie result on same page ignored", [a2.counted, a2.stats.cookiesRejected, a2.tab.cookie.ruleId], [false, 1, "onetrust"]);
const a3 = S.applyResult(s0, t0, V.validateResult(Object.assign({}, okRes, { outcome: "saved-necessary" })), T0);
eq("apply saved-necessary counts as rejected", [a3.stats.cookiesRejected, a3.stats.cookiesHidden], [1, 0]);
const a4 = S.applyResult(s0, t0, V.validateResult(Object.assign({}, okRes, { outcome: "hidden" })), T0);
eq("apply hidden counted separately", [a4.stats.cookiesRejected, a4.stats.cookiesHidden], [0, 1]);
let st = s0, tb = t0;
const popupRes = V.validateResult({ type: "result", kind: "popup", ruleId: "newsletter", outcome: "closed" });
for (let i = 0; i < 5; i++) { const o = S.applyResult(st, tb, popupRes, T0); st = o.stats; tb = o.tab; }
eq("apply popups capped per page", [st.popupsClosed, tb.popups, st.today.count], [3, 3, 3]);
const a5 = S.applyResult(a1.stats, a1.tab, popupRes, T1);
eq("apply day rollover resets today", [a5.stats.today, S.total(a5.stats)], [{ date: "2026-11-12", count: 1 }, 2]);
eq("total", S.total({ cookiesRejected: 3, cookiesHidden: 2, popupsClosed: 4 }), 9);
eq("todayCount same day", S.todayCount(a1.stats, T0), 1);
eq("todayCount other day", S.todayCount(a1.stats, T1), 0);
eq("platformName known", S.platformName("quantcast"), "Quantcast Choice");
eq("platformName unknown", S.platformName("acmecmp"), "Acmecmp");
eq("platformName empty", S.platformName(""), "");
eq("samePage fragment", S.samePage("https://a.com/x#a", "https://a.com/x#b"), true);
eq("samePage different", S.samePage("https://a.com/x", "https://a.com/y"), false);

// ---- donation milestones
const DAY = 24 * 60 * 60 * 1000, NOW = 1800000000000;
eq("milestones", D.MILESTONES, [100, 500, 2000]);
eq("ask below first", D.pickAsk({}, 99, NOW), null);
eq("ask at 100", D.pickAsk({}, 100, NOW), 100);
eq("ask highest unasked", D.pickAsk({}, 600, NOW), 500);
eq("ask at 2000", D.pickAsk({ asked: [100, 500] }, 2500, NOW), 2000);
eq("ask not twice", D.pickAsk({ asked: [100] }, 150, NOW), null);
eq("ask gap 30 days", D.pickAsk({ asked: [100], lastAskAt: NOW - 10 * DAY }, 600, NOW), null);
eq("ask after 30 days", D.pickAsk({ asked: [100], lastAskAt: NOW - 31 * DAY }, 600, NOW), 500);
eq("ask supporter", D.pickAsk({ supporter: true }, 600, NOW), null);
eq("ask dont ask again", D.pickAsk({ dontAskAgain: true }, 600, NOW), null);
eq("applyAsk marks lower", D.applyAsk({ asked: [] }, 500, NOW), { asked: [100, 500], lastAskAt: NOW });
eq("applyAsk keeps state", D.applyAsk({ asked: [100], dontAskAgain: false }, 100, NOW).asked, [100]);
eq("availableKeys excludes monthly", D.availableKeys({ small: "https://donate.stripe.com/a", monthly: "https://donate.stripe.com/m" }), ["small"]);
eq("hasMonthly", D.hasMonthly({ monthly: "https://donate.stripe.com/m" }), true);
eq("hasMonthly empty", D.hasMonthly({ monthly: "" }), false);
eq("hasAnyLink monthly only", D.hasAnyLink({ small: "", monthly: "https://donate.stripe.com/m" }), true);
eq("hasAnyLink none", D.hasAnyLink({ small: "", monthly: "" }), false);
eq("usd locale", D.isUsdLocale("en-US"), true);
eq("non-usd locale", D.isUsdLocale("ro-RO"), false);
eq("selectLinks eur default", D.selectLinks("en-US", { small: "a" }, { small: "u" }).currency, "EUR");
eq("selectLinks usd", D.selectLinks("en-US", { small: "a" }, { small: "u", medium: "u", large: "u" }).symbol, "$");

// ---- rating threshold
eq("rating threshold", R.RATING_THRESHOLD, 50);
eq("rating below", R.shouldAskRating(undefined, 49, 50), false);
eq("rating at", R.shouldAskRating(undefined, 50, 50), true);
eq("rating above", R.shouldAskRating({ shown: false, at: 0 }, 51, 50), true);
eq("rating already shown", R.shouldAskRating({ shown: true, at: 5 }, 99, 50), false);
eq("rating NaN", R.shouldAskRating(undefined, NaN, 50), false);
eq("rating bad threshold", R.shouldAskRating(undefined, 60, undefined), false);

// ---- store-URL / share / issue helpers
const ID = "abcdefghijklmnopabcdefghijklmnop";
eq("storeUrl", G.storeUrl(ID), "https://chromewebstore.google.com/detail/" + ID);
eq("reviewsUrl", G.reviewsUrl(ID), "https://chromewebstore.google.com/detail/" + ID + "/reviews");
eq("shareUrl", G.shareUrl(ID), "https://chromewebstore.google.com/detail/" + ID + "?utm_source=share");
eq("shareText", G.shareText(214, ID), "Quiet Web has said no to 214 cookie banners and popups for me. #QuietWeb https://chromewebstore.google.com/detail/" + ID + "?utm_source=share");
eq("validExtensionId ok", G.validExtensionId(ID), true);
eq("validExtensionId bad", G.validExtensionId("short"), false);
const iu = G.issueUrl("example.com", "1.0.0", "Rejected cookies via OneTrust");
eq("issueUrl prefix", iu.indexOf("https://github.com/Overcrasher/quiet-web/issues/new?title=Broken%20site:%20example.com&body="), 0);
eq("issueUrl body", decodeURIComponent(iu.split("&body=")[1]).indexOf("Site: example.com\nQuiet Web version: 1.0.0\nWhat happened: Rejected cookies via OneTrust"), 0);
eq("issueUrl no raw newline", iu.indexOf("\n"), -1);
eq("issueUrl encodes host", G.issueUrl("a&b.com", "1.0.0", "x").indexOf("title=Broken%20site:%20a%26b.com&"), 52);
eq("isIssueUrl", G.isIssueUrl(iu), true);
eq("isIssueUrl other", G.isIssueUrl("https://evil.com/?title=Broken%20site:%20x"), false);
eq("pluralize one", G.pluralize(1, "popup", "popups"), "1 popup");
eq("pluralize many", G.pluralize(2, "popup", "popups"), "2 popups");

// ---- manifest / config / locales (file checks)
const read = (p) => readFile(p);
const M = JSON.parse(read("manifest.json"));
eq("manifest v3", M.manifest_version, 3);
eq("manifest version", M.version, "1.0.0");
eq("manifest permissions", M.permissions, ["storage", "tabs"]);
eq("manifest host permissions", M.host_permissions, ["<all_urls>"]);
eq("manifest short_name", M.short_name, "Quiet Web");
eq("manifest locale refs", [M.name, M.description, M.default_locale], ["__MSG_extName__", "__MSG_extDescription__", "en"]);
const cs0 = M.content_scripts.find((c) => c.js.indexOf("content.js") >= 0), js0 = cs0.js;
eq("early DCL snapshot script: document_start, top frame", M.content_scripts.filter((c) => c.js.indexOf("dcl-snapshot.js") >= 0).map((c) => [c.run_at, !c.all_frames]), [["document_start", true]]);
eq("cs all_frames", [cs0.all_frames, cs0.match_about_blank, cs0.run_at, cs0.matches], [true, true, "document_idle", ["<all_urls>"]]);
eq("cs generic last of rules", js0.filter((f) => f.indexOf("rules/") === 0).slice(-1)[0], "rules/generic.js");
eq("cs rule files", js0.filter((f) => f.indexOf("rules/") === 0).length, 8);
eq("cs engine order", [js0.indexOf("lib/reject-phrases.js") < js0.indexOf("rules/onetrust.js"), js0.indexOf("rules/generic.js") < js0.indexOf("content.js"), js0.indexOf("content.js") < js0.indexOf("newsletter.js")], [true, true, true]);
eq("cs popups lib before newsletter", js0.indexOf("lib/popups.js") < js0.indexOf("newsletter.js"), true);
eq("cs thanks match", M.content_scripts.find((c) => c.js.indexOf("thanks.js") >= 0).matches, ["https://overcrasher.github.io/quiet-web/thanks.html?session_id=*"]);
eq("no MAIN world scripts", M.content_scripts.some((c) => c.world === "MAIN"), false);
eq("no web_accessible_resources", M.web_accessible_resources, undefined);
eq("csp no unsafe", /unsafe|eval|http/.test(M.content_security_policy.extension_pages), false);
for (const f of js0.filter((f) => f.indexOf("rules/") !== 0)) { let ok = true; try { read(f); } catch (e) { ok = false; } eq("content script exists " + f, ok, true); }
for (const l of ["en", "ro", "de", "fr", "es"]) {
  const m = JSON.parse(read("_locales/" + l + "/messages.json"));
  eq("locale keys " + l, Object.keys(m).sort(), ["extDescription", "extName"]);
  eq("locale name <= 75 " + l, m.extName.message.length <= 75 && m.extName.message.length > 5, true);
  eq("locale description <= 132 " + l, m.extDescription.message.length <= 132 && m.extDescription.message.length > 20, true);
  eq("locale no vendor names " + l, /onetrust|cookiebot|didomi|quantcast|trustarc|usercentrics|sourcepoint/i.test(m.extName.message + m.extDescription.message), false);
}
eq("en name", JSON.parse(read("_locales/en/messages.json")).extName.message, "Quiet Web – Auto-Reject Cookie Banners & Close Popups");
const cfg = read("config.js");
eq("config thanks url", /THANKS_URL = "([^"]*)"/.exec(cfg)[1], V.THANKS_PAGE);
eq("config amounts", /DONATE_AMOUNTS = \{ small: 3, medium: 5, large: 10 \}/.test(cfg), true);
eq("config monthly key", /DONATE_LINKS = \{[^}]*monthly: ""/.test(cfg), true);

// ---- engine (stubbed DOM and timers)
function makeEnv(opts) {
  opts = opts || {};
  const q = []; let t = 0;
  const sent = [];
  const el = (o) => Object.assign({ isConnected: true, disabled: false, clicked: 0, innerText: "", style: { set: {}, setProperty(k, v) { this.set[k] = v; } },
    getBoundingClientRect: () => ({ width: 20, height: 20 }), getAttribute: () => null, dispatchEvent() {},
    click() { this.clicked++; } }, o);
  const doc = {
    readyState: "complete", documentElement: {}, head: { appended: [], appendChild(n) { this.appended.push(n); } },
    qsa: opts.qsa || {},
    querySelectorAll(sel) { return (typeof this.qsa === "function" ? this.qsa(t) : this.qsa)[sel] || []; },
    createElement: () => ({ attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } }),
  };
  const observers = [];
  const env = {
    doc, win: { addEventListener() {}, getComputedStyle: () => ({ display: "block", visibility: "visible" }) },
    rules: opts.rules || [],
    send: opts.send || (async (m) => { sent.push(m); return m.type === "get-site-state" ? { ok: true, disabled: !!opts.disabled } : { ok: true }; }),
    setTimeout: (f, ms) => { const h = { at: t + (ms || 0), f, id: q.length + 1 }; q.push(h); return h; },
    clearTimeout: (h) => { const i = q.indexOf(h); if (i >= 0) q.splice(i, 1); },
    now: () => t,
    Observer: function (cb) { this.cb = cb; this.disconnected = false; this.observe = () => {}; this.disconnect = () => { this.disconnected = true; }; observers.push(this); },
    phrases: P,
  };
  const tick = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
  async function advance(ms) {
    const end = t + ms;
    await tick();
    for (;;) {
      q.sort((a, b) => a.at - b.at);
      const next = q.find((h) => h.at <= end);
      if (!next) break;
      q.splice(q.indexOf(next), 1);
      t = Math.max(t, next.at);
      next.f();
      await tick();
    }
    t = end;
    await tick();
  }
  return { env, sent, el, doc, advance, observers, getT: () => t };
}
const rule = (id, detect, reject, extra) => Object.assign({ id, name: id, detect, reject, hideSelectors: [] }, extra || {});
const results = (h) => h.sent.filter((m) => m.type === "result");

eq("orderRules generic last", E.orderRules([rule("generic", () => 1, async () => 1), rule("onetrust", () => 1, async () => 1), rule("didomi", () => 1, async () => 1)]).map((r) => r.id), ["onetrust", "didomi", "generic"]);
eq("orderRules drops invalid and duplicates", E.orderRules([null, { id: "x" }, rule("a", () => 1, async () => 1), rule("a", () => 1, async () => 1), rule("b", () => 1, async () => 1)]).map((r) => r.id), ["a", "b"]);
eq("orderRules non-array", E.orderRules(undefined), []);
eq("safeSelectors", E.safeSelectors(["#a", "", "x{}", "a;b", 5, ".ok .child", "a".repeat(201), "p\\q", "<x>"]), ["#a", ".ok .child"]);
eq("normalizeResult good", E.normalizeResult({ outcome: "rejected", detail: "d" }), { outcome: "rejected", detail: "d" });
eq("normalizeResult bad", E.normalizeResult({ outcome: "accepted" }), { outcome: "none", detail: "" });
eq("normalizeResult undefined", E.normalizeResult(undefined), { outcome: "none", detail: "" });

(async () => {
  // happy path
  let h = makeEnv({ rules: [rule("onetrust", () => null, async () => ({ outcome: "rejected" })), rule("didomi", () => ({}), async () => ({ outcome: "saved-necessary", detail: "unticked 3" }))] });
  let eng = E.createEngine(h.env);
  await eng.start(); await h.advance(1000);
  eq("engine asks site state first", h.sent[0], { type: "get-site-state" });
  eq("engine result message shape", h.sent[1], { type: "result", kind: "cookie", ruleId: "didomi", outcome: "saved-necessary", detail: "unticked 3" });
  eq("engine stops after success", [eng.state().stopped, h.sent.length], [true, 2]);
  eq("engine disconnects observer", h.observers[0].disconnected, true);

  // disabled site
  h = makeEnv({ disabled: true, rules: [rule("x", () => { throw new Error("must not run"); }, async () => ({ outcome: "rejected" }))] });
  eng = E.createEngine(h.env); await eng.start(); await h.advance(1000);
  eq("engine disabled: nothing sent but state", h.sent.map((m) => m.type), ["get-site-state"]);
  eq("engine disabled: stopped", eng.state().stopReason, "disabled");

  // SW unreachable
  h = makeEnv({ rules: [rule("x", () => ({}), async () => ({ outcome: "rejected" }))], send: async () => { throw new Error("no worker"); } });
  eng = E.createEngine(h.env); eng.start(); await h.advance(4000);
  eq("engine no state: stopped", eng.state().stopReason, "no-state");
  h = makeEnv({ rules: [rule("x", () => ({}), async () => ({ outcome: "rejected" }))], send: async () => ({ ok: false }) });
  eng = E.createEngine(h.env); eng.start(); await h.advance(4000);
  eq("engine ok:false: stopped", eng.state().stopReason, "no-state");
  // SW not ready for the first two asks: backoff retries, then the rule still runs
  let tries = 0, got = [];
  h = makeEnv({ rules: [rule("x", () => ({}), async () => ({ outcome: "rejected", detail: "late" }))],
    send: async (m) => { got.push(m.type); if (m.type === "get-site-state") { tries++; return tries < 3 ? { ok: false } : { ok: true, disabled: false }; } return { ok: true }; } });
  eng = E.createEngine(h.env); eng.start(); await h.advance(5000);
  eq("engine retries get-site-state with backoff (3 asks) then acts", [tries, got.filter((x) => x === "result").length], [3, 1]);
  h = makeEnv({ rules: [] });
  eng = E.createEngine(h.env); await eng.start();
  eq("engine no rules", [eng.state().stopReason, h.sent.length], ["no-rules", 0]);

  // falls through to next rule on "none"; generic last
  let calls = [];
  h = makeEnv({ rules: [rule("generic", () => ({}), async () => { calls.push("generic"); return { outcome: "rejected", detail: "Reject all" }; }),
    rule("cookiebot", () => ({}), async () => { calls.push("cookiebot"); return { outcome: "none" }; })] });
  eng = E.createEngine(h.env); await eng.start(); await h.advance(1000);
  eq("engine tries platform rule before generic", calls, ["cookiebot", "generic"]);
  eq("engine reports generic", results(h)[0].ruleId, "generic");

  // throwing rule is skipped
  h = makeEnv({ rules: [rule("a", () => { throw new Error("boom"); }, async () => ({ outcome: "rejected" })), rule("b", () => ({}), async () => { throw new Error("boom2"); }), rule("c", () => ({}), async () => ({ outcome: "rejected" }))] });
  eng = E.createEngine(h.env); await eng.start(); await h.advance(1000);
  eq("engine survives throwing rules", results(h).map((m) => m.ruleId), ["c"]);

  // hidden: only with matching elements
  const banner = h.el({});
  h = makeEnv({ qsa: { "#cmp-banner": [banner], ".overlay": [] }, rules: [rule("quantcast", () => ({}), async () => ({ outcome: "hidden", detail: "no reject button" }), { hideSelectors: ["#cmp-banner", ".overlay", "bad{sel}"] })] });
  const banner2 = h.el({}); h.doc.qsa["#cmp-banner"] = [banner2];
  eng = E.createEngine(h.env); await eng.start(); await h.advance(1000);
  eq("hidden outcome reported", results(h)[0], { type: "result", kind: "cookie", ruleId: "quantcast", outcome: "hidden", detail: "no reject button" });
  eq("hidden applies inline display none", banner2.style.set.display, "none");
  eq("hidden injects style element", [h.doc.head.appended.length, h.doc.head.appended[0].attrs["data-quiet-web"], h.doc.head.appended[0].textContent], [1, "hidden", "#cmp-banner{display:none !important}\n.overlay{display:none !important}"]);
  h = makeEnv({ qsa: {}, rules: [rule("quantcast", () => ({}), async () => ({ outcome: "hidden" }), { hideSelectors: ["#nothing"] })] });
  eng = E.createEngine(h.env); await eng.start(); await h.advance(1000);
  eq("hidden with no match is not reported", results(h).length, 0);

  // attempts cap
  let det = 0;
  h = makeEnv({ rules: [rule("a", () => { det++; return {}; }, async () => ({ outcome: "none" }))] });
  eng = E.createEngine(h.env); await eng.start();
  for (let i = 0; i < 6; i++) { h.observers[0].cb([]); await h.advance(400); }
  eq("engine retries a failing rule at most 3 times", det, 3);
  eq("engine reports nothing for none", results(h).length, 0);

  // mutation re-run
  let present = false;
  h = makeEnv({ rules: [rule("a", () => (present ? {} : null), async () => ({ outcome: "rejected" }))] });
  eng = E.createEngine(h.env); await eng.start(); await h.advance(500);
  eq("engine waits while no banner", [eng.state().stopped, results(h).length], [false, 0]);
  present = true; h.observers[0].cb([{}]); await h.advance(500);
  eq("engine reacts to late banner", results(h).length, 1);

  // 15 s limit
  h = makeEnv({ rules: [rule("a", () => null, async () => ({ outcome: "rejected" }))] });
  eng = E.createEngine(h.env); await eng.start(); await h.advance(14000);
  eq("engine still watching at 14 s", eng.state().stopped, false);
  await h.advance(1500);
  eq("engine stops after 15 s", [eng.state().stopReason, h.observers[0].disconnected], ["timeout", true]);
  eq("max run const", E.MAX_RUN_MS, 15000);

  // ctx helpers
  let ctxSeen = null;
  const acceptBtn = h.el({ innerText: "Accept all" }), rejectBtn = h.el({ innerText: "Reject all" }), selBtn = h.el({ innerText: "Allow selection" });
  const hidden = h.el({ innerText: "Reject all", getBoundingClientRect: () => ({ width: 0, height: 0 }) });
  const cb1 = h.el({ type: "checkbox", checked: true }), cb2 = h.el({ type: "checkbox", checked: true, disabled: true }), cb3 = h.el({ type: "checkbox", checked: false });
  const sw = h.el({ getAttribute: (a) => (a === "aria-checked" ? "true" : null) });
  h = makeEnv({ qsa: (t) => ({ ".late": t >= 300 ? [rejectBtn] : [] }), rules: [rule("a", () => ({}), async (ctx) => { ctxSeen = ctx; return { outcome: "none" }; })] });
  eng = E.createEngine(h.env); await eng.start(); await h.advance(100);
  eq("ctx click refuses accept", [ctxSeen.click(acceptBtn), acceptBtn.clicked], [false, 0]);
  eq("ctx click refuses allow selection by default", [ctxSeen.click(selBtn), selBtn.clicked], [false, 0]);
  eq("ctx click allows selection when opted in", [ctxSeen.click(selBtn, { selection: true }), selBtn.clicked], [true, 1]);
  eq("ctx click reject", [ctxSeen.click(rejectBtn), rejectBtn.clicked], [true, 1]);
  eq("ctx click invisible refused", [ctxSeen.click(hidden), hidden.clicked], [false, 0]);
  eq("ctx click force on invisible", [ctxSeen.click(hidden, { force: true }), hidden.clicked], [true, 1]);
  eq("ctx click null", ctxSeen.click(null), false);
  eq("ctx uncheck ticked", [ctxSeen.uncheck(cb1), cb1.clicked], [true, 1]);
  eq("ctx uncheck disabled (strictly necessary)", [ctxSeen.uncheck(cb2), cb2.clicked], [false, 0]);
  eq("ctx uncheck already off", [ctxSeen.uncheck(cb3), cb3.clicked], [false, 0]);
  eq("ctx uncheck aria switch", [ctxSeen.uncheck(sw), sw.clicked], [true, 1]);
  eq("ctx visible", [ctxSeen.visible(rejectBtn), ctxSeen.visible(hidden), ctxSeen.visible(null)], [true, false, false]);
  const t0w = h.getT();
  const found = ctxSeen.waitFor(".late", 1000);
  await h.advance(500);
  eq("ctx waitFor finds late element", (await found) === rejectBtn, true);
  const miss = ctxSeen.waitFor(".never", 300);
  await h.advance(600);
  eq("ctx waitFor times out", await miss, null);
  eq("ctx has log", typeof ctxSeen.log, "function");
  eq("ctx exposes phrases", ctxSeen.phrases === P, true);
  eng.stop("test");

  // ---- newsletter watcher (stubbed DOM)
  const VW = 1000, VH = 800;
  function fe(o) {
    const e = Object.assign({ tagName: "DIV", nodeType: 1, isConnected: true, parentElement: null, kids: [], pos: "static", z: "auto", rect: { left: 0, top: 0, right: 100, bottom: 30, width: 100, height: 30 },
      attrs: {}, textContent: "", className: "", clicks: 0, type: "", name: "", id: "", onClick: null }, o);
    e.children = e.kids;
    e.getBoundingClientRect = () => e.rect;
    e.getAttribute = (a) => (a in e.attrs ? e.attrs[a] : null);
    e.matches = (sel) => sel === "input" && e.tagName === "INPUT";
    const desc = (x) => x.kids.reduce((acc, k) => acc.concat([k], desc(k)), []);
    e.querySelectorAll = (sel) => desc(e).filter((k) => (/^input/.test(sel) ? ["INPUT", "TEXTAREA", "SELECT"].indexOf(k.tagName) >= 0 && (sel !== "input" || k.tagName === "INPUT") : true));
    e.querySelector = (sel) => {
      if (sel === "input") return desc(e).find((k) => k.tagName === "INPUT") || null;
      if (/^main/.test(sel)) return desc(e).find((k) => ["MAIN", "ARTICLE", "NAV", "FOOTER"].indexOf(k.tagName) >= 0) || null;
      return null;
    };
    e.click = () => { e.clicks++; if (e.onClick) e.onClick(); };
    e.remove = () => { e.isConnected = false; if (e.parentElement) e.parentElement.kids.splice(e.parentElement.kids.indexOf(e), 1); };
    return e;
  }
  const add = (parent, child) => { child.parentElement = parent; parent.kids.push(child); return child; };
  function popupScene(opts) {
    opts = opts || {};
    const html = fe({ tagName: "HTML" }), body = fe({ tagName: "BODY" });
    body.style = { position: "", top: "", overflow: "", props: {}, removeProperty(k) { this[k] = ""; } };
    body.classList = { removed: [], remove(c) { this.removed.push(c); } };
    html.style = { overflow: "", removeProperty() {} }; html.classList = { remove() {} };
    add(html, body);
    const wrapper = add(body, fe({ pos: "fixed", z: "9999", rect: opts.rect || { left: 0, top: 0, right: VW, bottom: VH, width: VW, height: VH } }));
    const modal = add(wrapper, fe({ rect: { left: 300, top: 200, right: 700, bottom: 500, width: 400, height: 300 } }));
    add(modal, fe({ tagName: "H2", textContent: "Join our newsletter", rect: { left: 310, top: 210, right: 600, bottom: 240, width: 290, height: 30 } }));
    add(modal, fe({ tagName: "INPUT", type: opts.inputType || "email", name: "email", rect: { left: 310, top: 300, right: 600, bottom: 330, width: 290, height: 30 } }));
    if (opts.password) add(modal, fe({ tagName: "INPUT", type: "password", name: "pw" }));
    let closeBtn = null;
    if (!opts.noClose) closeBtn = add(modal, fe({ tagName: "BUTTON", textContent: "×", rect: { left: 680, top: 205, right: 700, bottom: 225, width: 20, height: 20 }, onClick: () => { if (!opts.closeIsBroken) wrapper.remove(); } }));
    const backdrop = opts.backdrop ? add(body, fe({ pos: "fixed", textContent: "", rect: { left: 0, top: 0, right: VW, bottom: VH, width: VW, height: VH } })) : null;
    const hh = makeEnv({ rules: [] });
    const sent = [];
    const scrolls = [];
    const win = { innerWidth: VW, innerHeight: VH, location: { href: opts.url || "https://news.example.com/story" }, addEventListener() {}, scrollTo: (x, y) => scrolls.push(y),
      getComputedStyle: (el) => ({ position: el.pos, zIndex: String(el.z), display: "block", visibility: "visible", opacity: "1" }) };
    const doc = { readyState: "complete", documentElement: html, body };
    const env = Object.assign({}, hh.env, { doc, win, isTop: true, P: U, send: async (m) => { sent.push(m); return { ok: true, disabled: false }; } });
    const w = N.createWatcher(env);
    return { w, wrapper, modal, closeBtn, backdrop, body, sent, scrolls, hh };
  }
  const runScan = async (sc, t) => { sc.w.queue(sc.wrapper); if (t !== undefined) sc.w.gesture(t); const p = sc.w.scan(); await sc.hh.advance(2000); await p; };

  let sc = popupScene();
  eq("overlay detected", sc.w.isOverlay(sc.wrapper), true);
  eq("overlay climbs from input", sc.w.overlayFor(sc.wrapper) === sc.wrapper, true);
  eq("close button found", sc.w.findCloseButton(sc.wrapper) === sc.closeBtn, true);
  await runScan(sc);
  eq("newsletter: close button clicked, popup counted", [sc.closeBtn.clicks, sc.wrapper.isConnected, sc.sent.filter((m) => m.type === "result")], [1, false, [{ type: "result", kind: "popup", ruleId: "newsletter", outcome: "closed", detail: "" }]]);

  sc = popupScene({ noClose: true, backdrop: true });
  await runScan(sc);
  eq("newsletter: removed without close button", [sc.wrapper.isConnected, sc.sent.filter((m) => m.type === "result")[0].outcome], [false, "removed"]);
  eq("newsletter: backdrop removed too", sc.backdrop.isConnected, false);

  sc = popupScene({ closeIsBroken: true });
  await runScan(sc);
  eq("newsletter: broken close falls back to removal", [sc.wrapper.isConnected, sc.sent.filter((m) => m.type === "result")[0].outcome], [false, "removed"]);

  sc = popupScene({ password: true });
  await runScan(sc);
  eq("newsletter: password field => untouched", [sc.wrapper.isConnected, sc.sent.length], [true, 0]);
  sc = popupScene({ url: "https://shop.example.com/checkout" });
  await runScan(sc);
  eq("newsletter: checkout URL => untouched", [sc.wrapper.isConnected, sc.sent.length], [true, 0]);
  sc = popupScene({ url: "https://example.com/login?next=/" });
  await runScan(sc);
  eq("newsletter: login URL => untouched", sc.wrapper.isConnected, true);
  sc = popupScene({ rect: { left: 0, top: 0, right: 300, bottom: 800, width: 300, height: 800 } });
  await runScan(sc);
  eq("newsletter: 30% overlay => untouched", sc.wrapper.isConnected, true);
  sc = popupScene({ inputType: "text" });
  sc.modal.kids[1].name = "q";
  await runScan(sc);
  eq("newsletter: no email input => untouched", sc.wrapper.isConnected, true);
  sc = popupScene();
  await sc.hh.advance(1000); sc.w.gesture(900); sc.w.queue(sc.wrapper);
  await sc.w.scan(); await sc.hh.advance(2000);
  eq("newsletter: user-opened modal => untouched", [sc.wrapper.isConnected, sc.sent.length], [true, 0]);
  const wrapperPage = popupScene();
  add(wrapperPage.wrapper, fe({ tagName: "MAIN" }));
  eq("newsletter: page wrapper containing <main> is not an overlay", wrapperPage.w.isOverlay(wrapperPage.wrapper), false);
  const absPage = popupScene(); absPage.wrapper.pos = "absolute"; absPage.wrapper.z = "auto";
  eq("newsletter: absolute without z-index/dialog is not an overlay", absPage.w.isOverlay(absPage.wrapper), false);
  absPage.wrapper.attrs["aria-modal"] = "true";
  eq("newsletter: absolute aria-modal is an overlay", absPage.w.isOverlay(absPage.wrapper), true);
  sc = popupScene();
  sc.body.style.position = "fixed"; sc.body.style.top = "-300px"; sc.body.style.overflow = "hidden";
  sc.w.restoreScroll();
  eq("restoreScroll restores position and scrollY", [sc.body.style.position, sc.body.style.overflow, sc.scrolls], ["", "", [300]]);
  eq("watch constants", [N.WATCH_MS, N.GESTURE_MS, N.MAX_HANDLED], [60000, 2000, 3]);


  // ---- pay-or-consent guard (shared helper used by every rule and by ctx.click)
  const PAY = ["REJECT ALL AND PAY", "Reject all and subscribe", "Refuser et s'abonner", "Decline and subscribe", "Jetzt abonnieren", "Ablehnen und bezahlen",
    "Pur-Abo abschließen", "Werbefrei lesen", "Rechazar y suscribirse", "Rechazar y pagar", "Rifiuta e abbonati", "Rifiuta e paga con abbonamento",
    "Weiger en betaal", "Alles weigeren en abonneren", "Respinge și abonează-te", "Respinge si plateste", "Odrzuć i subskrybuj", "Odrzuć i płać",
    "Reject all and subscribe to Guardian Ad-Lite for €5 per month", "Jetzt kaufen", "Buy now", "Subscription", "Accept or pay"];
  const NOTPAY = ["Reject all", "Reject Optional", "Required only", "Decline", "I do not agree", "Alle ablehnen", "Nur notwendige", "Tout refuser",
    "Continuer sans accepter", "Rechazar todo", "Rifiuta tutto", "Alles weigeren", "Odrzuć wszystkie", "Respinge tot", "Refuz", "Einwilligung ablehnen",
    "Ablehnen", "Verweigern", "Nur notwendige Cookies", "Reject all platform cookies", "Do not sell or place my data", "Refuză toate"];
  for (const l of PAY) eq("isPayLike pay: " + l, P.isPayLike(l), true);
  for (const l of NOTPAY) eq("isPayLike ok: " + l, P.isPayLike(l), false);
  for (const r of QuietRules) if (r.payLike) for (const l of PAY.concat(NOTPAY)) eq(r.id + ".payLike agrees with shared: " + l, r.payLike(l), P.isPayLike(l));
  eq("all 8 rules registered", QuietRules.map((r) => r.id), ["onetrust", "cookiebot", "didomi", "quantcast", "trustarc", "usercentrics", "sourcepoint", "generic"]);
  // new reject phrases
  for (const l of ["Refuză toate", "Refuza tot", "Doar cele esențiale", "Doar cookie-urile necesare", "I do not agree", "Do not agree", "Don't agree", "Disagree", "I disagree"]) {
    eq("reject phrase matches: " + l, !!P.matchReject(l), true);
    eq("reject phrase not accept-like: " + l, P.isAcceptLike(l), false);
    eq("reject phrase clickable: " + l, P.isRejectClickable(l), true);
  }
  eq("'I agree' is accept-like", P.isAcceptLike("I agree"), true);
  // engine: ctx.click never clicks pay labels; pay-or-consent is reported (not counted) when nothing else handles the page
  {
    const hh = makeEnv({ rules: [] });
    let clickedCtx = null;
    const r1 = rule("p", () => ({}), async (ctx) => { const b = hh.el({ innerText: "Reject all and pay" }); clickedCtx = [ctx.click(b, { force: true }), b.clicked]; return { outcome: "none", detail: "pay-or-consent" }; });
    hh.env.rules = [r1];
    const e2 = E.createEngine(hh.env); await e2.start(); await hh.advance(1000);
    eq("ctx.click refuses pay-like label even with force", clickedCtx, [false, 0]);
    eq("engine reports pay-or-consent once", results(hh).map((m) => [m.ruleId, m.outcome]), [["p", "pay-or-consent"]]);
    eq("engine keeps watching after pay-or-consent", e2.state().stopped, false);
  }
  eq("validate accepts pay-or-consent result", !!V.validateResult({ type: "result", kind: "cookie", ruleId: "didomi", outcome: "pay-or-consent" }), true);
  eq("validate rejects pay-or-consent for popups", V.validateResult({ type: "result", kind: "popup", ruleId: "newsletter", outcome: "pay-or-consent" }), null);
  {
    const st0 = V.sanitizeStats({}), tab0 = V.sanitizeTabRecord({});
    const a = S.applyResult(st0, tab0, { kind: "cookie", ruleId: "didomi", outcome: "pay-or-consent", detail: "" }, 0);
    eq("pay-or-consent is not counted", [a.counted, S.total(a.stats), a.tab.cookie.outcome], [false, 0, "pay-or-consent"]);
    const b = S.applyResult(a.stats, a.tab, { kind: "cookie", ruleId: "generic", outcome: "rejected", detail: "x" }, 0);
    eq("a real result replaces pay-or-consent and counts", [b.counted, b.stats.cookiesRejected, b.tab.cookie.ruleId], [true, 1, "generic"]);
    const host = V.hostFromUrl;
    const c = S.carryRecord({ url: "https://www.tv2.dk/a", cookie: b.tab.cookie, popups: 2 }, "https://www.tv2.dk/b", host);
    eq("carryRecord same host keeps cookie, drops popups", [c.cookie.ruleId, c.popups, c.carry], ["generic", 0, true]);
    eq("carryRecord other host clears", S.carryRecord({ url: "https://www.tv2.dk/a", cookie: b.tab.cookie, popups: 0 }, "https://example.com/", host), null);
    eq("carryRecord without cookie clears", S.carryRecord({ url: "https://a.com/", cookie: null, popups: 1 }, "https://a.com/x", host), null);
    const d = S.applyResult(b.stats, V.sanitizeTabRecord(c), { kind: "cookie", ruleId: "onetrust", outcome: "rejected", detail: "" }, 0);
    eq("fresh result after a same-site reload counts again and clears carry", [d.counted, d.tab.cookie.ruleId, d.tab.carry], [true, "onetrust", false]);
    eq("sanitizeTabRecord keeps carry only with a cookie", [V.sanitizeTabRecord({ carry: true }).carry, V.sanitizeTabRecord(c).carry], [false, true]);
  }

  print("passed " + pass + ", failed " + fail);
  failures.forEach((f) => print("FAIL " + f));
  if (fail) quit(1);
})().catch((e) => { print("TEST CRASH: " + e + "\n" + (e && e.stack)); quit(2); });
