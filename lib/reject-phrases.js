// Reject-phrase matching, accept-guard and consent-dialog text detection.
// Classic script: attaches QuietPhrases to globalThis. Pure text helpers work in jsc; the DOM helpers at the end
// (buttonText, findRejectButtons) are only used in content scripts. Used by content.js and by the rules in rules/.
(function (root) {
  "use strict";

  // Lowercase, strip diacritics, every non-alphanumeric run becomes one space ("Nu accept!" -> "nu accept").
  function normalize(s) {
    if (typeof s !== "string") return "";
    s = s.toLowerCase();
    try { s = s.normalize("NFD"); } catch (e) { /* old engines */ }
    s = s.replace(/[̀-ͯ]/g, "")
      .replace(/ß/g, "ss").replace(/ł/g, "l").replace(/ø/g, "o").replace(/đ/g, "d")
      .replace(/æ/g, "ae").replace(/œ/g, "oe").replace(/ı/g, "i");
    return s.replace(/[^a-z0-9]+/g, " ").trim();
  }

  // Normalised reject phrases per language. Matching is on whole words inside the (short) button text.
  const REJECT = {
    en: ["reject all", "reject all cookies", "reject", "decline all", "decline", "deny all", "deny", "refuse all", "refuse",
      "necessary only", "only necessary", "only essential", "essential only", "necessary cookies only", "only necessary cookies",
      "only essential cookies", "essential cookies only", "strictly necessary only", "do not accept", "dont accept", "don t accept",
      "continue without accepting", "disagree", "i disagree", "i do not agree", "do not agree", "don t agree", "dont agree", "i don t agree", "reject non essential", "reject optional", "reject non essential cookies"],
    ro: ["respinge tot", "respinge toate", "respinge toate cookie urile", "respinge", "refuz tot", "refuz toate", "refuz",
      "doar necesare", "numai necesare", "doar cookie urile necesare", "doar cele necesare", "doar esentiale",
      "continua fara a accepta", "nu accept", "nu sunt de acord", "refuza toate", "refuza tot", "refuza", "doar cele esentiale", "doar cele necesare", "doar cookie urile necesare", "doar cookie uri necesare", "doar esentiale"],
    de: ["alle ablehnen", "alles ablehnen", "ablehnen", "nur notwendige", "nur erforderliche", "nur essenzielle", "nur essentielle",
      "nur technisch notwendige", "ohne zustimmung fortfahren", "weiter ohne zustimmung", "weiter ohne akzeptieren",
      "nicht akzeptieren", "verweigern", "alle verweigern", "ich lehne ab", "nicht einverstanden"],
    fr: ["tout refuser", "refuser tout", "refuser", "refuser les cookies", "continuer sans accepter", "continuer sans consentir",
      "uniquement necessaires", "uniquement les cookies necessaires", "seulement les cookies necessaires", "cookies necessaires uniquement",
      "je refuse", "ne pas accepter", "refuser tous les cookies", "tout rejeter", "rejeter"],
    es: ["rechazar todo", "rechazar todas", "rechazar todas las cookies", "rechazar", "solo necesarias", "solo las necesarias",
      "solo cookies necesarias", "solo las cookies necesarias", "solo esenciales", "continuar sin aceptar", "no aceptar", "denegar", "denegar todo"],
    it: ["rifiuta tutto", "rifiuta tutti", "rifiuta", "rifiuto", "rifiuta i cookie", "solo necessari", "solo i necessari", "solo cookie necessari",
      "solo essenziali", "continua senza accettare", "non accetto", "non accettare"],
    nl: ["alles weigeren", "alle weigeren", "weigeren", "weiger alles", "alles afwijzen", "afwijzen", "alleen noodzakelijke",
      "alleen functionele", "alleen essentiele", "doorgaan zonder accepteren", "niet accepteren"],
    pl: ["odrzuc wszystkie", "odrzuc wszystko", "odrzuc", "tylko niezbedne", "tylko wymagane", "tylko niezbedne pliki cookie",
      "kontynuuj bez zgody", "nie zgadzam sie", "nie akceptuje"],
  };
  const LANGS = Object.keys(REJECT);

  // Flat list [{lang, phrase}] sorted longest first so "reject all cookies" wins over "reject".
  const FLAT = [];
  for (const lang of LANGS) for (const phrase of REJECT[lang]) FLAT.push({ lang, phrase, words: phrase.split(" ").length });
  FLAT.sort((a, b) => b.phrase.length - a.phrase.length);

  const MAX_BUTTON_CHARS = 80;
  const padded = (n) => " " + n + " ";

  // {lang, phrase} if the text is a reject-style label, else null. Long texts (paragraphs) never match.
  function matchReject(text) {
    const n = normalize(text);
    if (!n || n.length > MAX_BUTTON_CHARS) return null;
    const p = padded(n);
    for (const f of FLAT) if (p.indexOf(" " + f.phrase + " ") >= 0) return { lang: f.lang, phrase: f.phrase };
    return null;
  }

  // Words that mean "yes, accept": prefix matches on word starts (accept -> accepted, accepter, acceptieren ...).
  const ACCEPT_RE = /(^| )(accept|agree|allow|akzeptier|zustimm|einverstanden|erlaub|zulass|accepte|autoris|d accord|acepto|aceptar|permit|de acuerdo|accett|acconsent|consenti|accepteren|akkoord|toesta|akcept|zaakcept|zgadzam|zezw|sunt de acord|de acord|got it|i understand|alles klar)|(^| )(ok|okay)( |$)/;
  const ALL_RE = /(^| )(all|alle|alles|tout|tous|toutes|todo|todas|todos|tutto|tutti|toate|tot|wszystk\w*|alles)( |$)/;
  const SELECTION_RE = /(^| )(selection|selected|choices|choice|preferences|auswahl|ausgewahlte\w*|seleccion|seleccionadas?|selezion\w*|selectie|wybran\w*|selectate|alegerile|alegerea|sauvegarder|save|confirm\w*|confirma\w*|bestatig\w*|speichern|guardar|salva\w*|opslaan|zapisz)( |$)/;

  // Normalised text with every reject phrase removed ("do not accept" -> "", "reject all and accept" -> "and accept").
  function withoutRejects(n) {
    let p = padded(n);
    for (const f of FLAT) {
      const needle = " " + f.phrase + " ";
      while (p.indexOf(needle) >= 0) p = p.split(needle).join("  ");
    }
    return p.replace(/\s+/g, " ").trim();
  }

  // True if the label contains an accept word that is not part of a reject phrase (so "Do not accept" is fine).
  function isAcceptLike(text) {
    return ACCEPT_RE.test(withoutRejects(normalize(text)));
  }

  // "Allow selection" / "Save my choices" style labels: accept-ish words that only apply to the user's current (unticked)
  // selection. Never true when the label also says "all".
  function isSelectionSave(text) {
    const n = normalize(text);
    if (!n || n.length > MAX_BUTTON_CHARS) return false;
    return SELECTION_RE.test(n) && !ALL_RE.test(n);
  }

  // Safe to click as a reject action: matches a reject phrase AND carries no accept word.
  function isRejectClickable(text) {
    return !!matchReject(text) && !isAcceptLike(text);
  }

  // Pay-or-consent ("Reject all and pay", "Refuser et s'abonner", "Pur-Abo"): such a button is NOT a reject, it leads into a
  // subscription flow, so no rule may ever click it (ctx.click enforces this for every rule). Works on normalised text.
  const PAY_RE = /(^| )(pay\w*|paid|subscri\w*|buy|purchase|abon\w*|abo|abos|payer|paye\w*|bezahl\w*|zahl\w*|kaufen|pur|suscri\w*|pagar|pague\w*|abbon\w*|pagare|pagamento|betal\w*|betaal\w*|plat[ae]\w*|platesc\w*|subskry\w*|plac|placi\w*|ad free|werbefrei|premium|membership|member)( |$)/;
  function isPayLike(text) { return PAY_RE.test(normalize(String(text || ""))); }

  // What ctx.click enforces for every click: refuse labels with an accept word unless they are a selection-save label.
  function mayClickLabel(text, allowSelection) {
    if (!isAcceptLike(text)) return true;
    return !!allowSelection && isSelectionSave(text);
  }

  // Consent-dialog text detection. Every language: keywords (normalised substrings).
  const CONSENT = {
    en: ["cookie", "consent", "privacy preferences", "tracking"],
    ro: ["cookie", "consimtamant", "confidentialitate", "module cookie"],
    de: ["cookie", "einwilligung", "datenschutz", "zustimmung"],
    fr: ["cookie", "consentement", "temoins", "confidentialite"],
    es: ["cookie", "consentimiento", "privacidad"],
    it: ["cookie", "consenso", "privacy"],
    nl: ["cookie", "toestemming", "privacy"],
    pl: ["ciastecz", "cookie", "zgod", "prywatnosc"],
  };
  // Language code ("en" ... "pl"), "und" when only the language-neutral word "cookie" is present, or null.
  function consentLanguage(text) {
    const n = normalize(text);
    if (!n) return null;
    // "en" last: its keyword "consent" is a substring of the French/Spanish words for consent.
    for (const lang of LANGS.slice(1).concat("en")) {
      for (const k of CONSENT[lang]) {
        if (k !== "cookie" && n.indexOf(k) >= 0) return lang;
      }
    }
    return n.indexOf("cookie") >= 0 || n.indexOf("ciastecz") >= 0 ? "und" : null;
  }
  function isConsentText(text, minChars) {
    const n = normalize(text);
    if (n.length < (minChars || 0)) return false;
    return consentLanguage(text) !== null;
  }

  // ---- DOM helpers (content scripts only) ----
  function buttonText(el) {
    if (!el) return "";
    const v = (el.innerText || el.textContent || el.value || "").trim();
    if (v) return v.replace(/\s+/g, " ");
    const a = el.getAttribute && (el.getAttribute("aria-label") || el.getAttribute("title"));
    return a ? a.trim() : "";
  }
  // All clickable-looking elements under `rootEl` whose label is clickable as a reject action:
  // [{el, text, match}] (visibility is the caller's business: use ctx.visible).
  function findRejectButtons(rootEl) {
    const out = [];
    if (!rootEl || !rootEl.querySelectorAll) return out;
    const list = rootEl.querySelectorAll("button, a, [role=button], input[type=button], input[type=submit], span[tabindex], div[tabindex]");
    for (const el of list) {
      const text = buttonText(el);
      if (!text) continue;
      const m = matchReject(text);
      if (m && !isAcceptLike(text)) out.push({ el, text, match: m });
    }
    return out;
  }

  root.QuietPhrases = {
    REJECT, CONSENT, LANGS, MAX_BUTTON_CHARS,
    normalize, matchReject, isPayLike, isAcceptLike, isSelectionSave, isRejectClickable, mayClickLabel,
    consentLanguage, isConsentText, buttonText, findRejectButtons,
  };
})(globalThis);
