# Chrome Web Store listing: Quiet Web (v1.0.0)

Everything below is meant to be checked against manifest.json, config.js, background.js, README.md, PRIVACY.md and docs/privacy.html before submitting. Character counts are stated next to each limited field. Copy only what is inside the code blocks.

---

## 1. Name and short description (shipped inside the package)

The store takes the item name (limit 75) and short summary (limit 132) from the package's `_locales/<locale>/messages.json` (`extName`, `extDescription`, referenced from manifest.json as `__MSG_extName__` and `__MSG_extDescription__`). Do NOT paste them in the dashboard. Exact strings and character counts:

| Locale | Name | Chars | Summary | Chars |
|---|---|---|---|---|
| en | Quiet Web – Auto-Reject Cookie Banners & Close Popups | 53 | Automatically says no to cookie banners and closes newsletter popups. Everything happens on your device; nothing is sent anywhere. | 130 |
| ro | Quiet Web – Respinge automat bannerele cookie și închide pop-upurile | 68 | Respinge automat bannerele cookie și închide ferestrele de newsletter. Totul se petrece pe dispozitivul tău; nimic nu e trimis. | 127 |
| de | Quiet Web – Cookie-Banner automatisch ablehnen & Pop-ups schließen | 66 | Lehnt Cookie-Banner automatisch ab und schließt Newsletter-Pop-ups. Alles geschieht auf deinem Gerät; nichts wird gesendet. | 123 |
| fr | Quiet Web – Refus auto des bannières cookies et pop-ups fermés | 62 | Refuse automatiquement les bannières de cookies et ferme les pop-ups de newsletter. Tout reste sur l'appareil ; rien n'est envoyé. | 130 |
| es | Quiet Web – Rechaza cookies automáticamente y cierra pop-ups | 60 | Rechaza automáticamente los banners de cookies y cierra los pop-ups de boletín. Todo ocurre en tu dispositivo; no se envía nada. | 128 |

## 2. Rules for the public descriptions

Do not name sites, brands or consent-platform vendors in any language's public description or summary. The Chrome Web Store flagged that as keyword spam for the sister extension Wait 24h (violation 'Yellow Argon', Nov 2026). Brand and site names are fine in the reviewer notes and permission justifications only. Quiet Web's public text contains none (checked by script: 0 brand names in every summary and description block).

## 3. Detailed description (EN)

```
Quiet Web automatically says no to cookie banners and closes newsletter popups, so pages stay readable. It always picks the privacy-friendly option: reject all, or save only the necessary cookies. It never clicks Accept.

HOW IT WORKS
• Handles the most common consent platforms, plus a careful fallback for other banners that only clicks a clearly worded reject button, in several languages.
• Order of preference: a reject button first, then unticking the optional categories and saving. Only as a last resort it hides the banner. Those cases are counted separately and shown in the popup.
• Newsletter popups that cover much of the page are closed with their own close button; otherwise they are removed and scrolling is restored. It never acts on login, sign-up, checkout, cart, payment or account pages.
• Popup: how many annoyances were handled, today's count, what happened on the current site, a switch to turn Quiet Web off for that site, and "Report broken site", which opens a prefilled GitHub issue. Nothing is sent automatically.
• Share: copy a short text about what Quiet Web handled for you, with a link to the extension.

WHERE IT WORKS
Every website, because banners are everywhere. You can switch Quiet Web off for any site from the popup.

PRIVACY
• Page content is read on your device only to find banners and popups. It is never stored or sent.
• Only counters and per-site settings are stored, in your browser's local extension storage.
• No ads, no tracking, no analytics, no accounts, and no network requests by the extension.
• Permissions: storage, tabs (to show the current site in the popup) and access to all sites, which is needed to find banners on any page.

OPTIONAL SUPPORT
Quiet Web is free and built by one developer. If it helps, you can support it with an optional one-time donation through Stripe. The ask appears in the popup only at milestones (100, 500 and 2,000 annoyances handled), at most once per milestone and 30 days apart, never right after install. Choose "Don't ask again" and it stops for good. The same links are always in Options. Payments happen on Stripe's page; the extension never sees them.

The extension's interface is in English.

Open source: https://github.com/Overcrasher/quiet-web
```
Characters: 2247

---

## 4. Translations (paste per language in the dashboard)

### Detailed description (ro, Romanian)

```
Quiet Web spune automat nu bannerelor de cookie-uri și închide ferestrele de newsletter, ca paginile să rămână lizibile. Alege mereu varianta prietenoasă cu confidențialitatea: respinge tot sau salvează doar cookie-urile necesare. Nu apasă niciodată pe Accept.

CUM FUNCȚIONEAZĂ
• Se ocupă de cele mai comune platforme de consimțământ, plus o variantă prudentă pentru alte bannere, care apasă doar un buton de respingere clar formulat, în mai multe limbi.
• Ordinea preferințelor: mai întâi un buton de respingere, apoi debifarea categoriilor opționale și salvarea. Doar ca ultimă soluție ascunde bannerul. Aceste cazuri sunt numărate separat și afișate în fereastra extensiei.
• Ferestrele de newsletter care acoperă mare parte din pagină sunt închise cu propriul buton de închidere; altfel sunt eliminate și derularea este restabilită. Nu acționează niciodată pe pagini de autentificare, înscriere, finalizare comandă, coș, plată sau cont.
• Fereastra extensiei: câte neplăceri au fost rezolvate, numărul de azi, ce s-a întâmplat pe site-ul curent, un comutator pentru a opri Quiet Web pe acel site și „Report broken site”, care deschide un issue GitHub precompletat. Nimic nu este trimis automat.
• Distribuire: copiezi un text scurt despre ce a rezolvat Quiet Web pentru tine, cu un link către extensie.

UNDE FUNCȚIONEAZĂ
Pe orice site, pentru că bannerele sunt peste tot. Poți opri Quiet Web pe orice site din fereastra extensiei.

CONFIDENȚIALITATE
• Conținutul paginii este citit doar pe dispozitivul tău, pentru a găsi bannere și ferestre. Nu este stocat și nu este trimis.
• Se stochează doar contoare și setări per site, în spațiul local de stocare al extensiei.
• Fără reclame, fără urmărire, fără analiză, fără conturi și fără cereri de rețea din partea extensiei.
• Permisiuni: storage, tabs (pentru a arăta site-ul curent în fereastra extensiei) și acces la toate site-urile, necesar pentru a găsi bannere pe orice pagină.

SUSȚINERE OPȚIONALĂ
Quiet Web este gratuită și făcută de un singur dezvoltator. Dacă ți-a fost de folos, o poți susține printr-o donație unică, opțională, prin Stripe. Propunerea apare în fereastra extensiei doar la praguri (100, 500 și 2.000 de neplăceri rezolvate), cel mult o dată pe prag, la minimum 30 de zile distanță, niciodată imediat după instalare. Cu „Don't ask again” se oprește definitiv. Aceleași linkuri sunt mereu în Opțiuni. Plata se face pe pagina Stripe; extensia nu o vede.

Interfața extensiei este în limba engleză.

Cod sursă deschis: https://github.com/Overcrasher/quiet-web
```
Characters: 2537

### Detailed description (de, German)

```
Quiet Web lehnt Cookie-Banner automatisch ab und schließt Newsletter-Pop-ups, damit Seiten lesbar bleiben. Es wählt immer die datenschutzfreundliche Option: alles ablehnen oder nur notwendige Cookies speichern. Auf „Akzeptieren“ klickt es nie.

SO FUNKTIONIERT ES
• Behandelt die gängigsten Einwilligungsplattformen, dazu eine vorsichtige Rückfalllösung für andere Banner, die nur eine klar formulierte Ablehnen-Schaltfläche anklickt, in mehreren Sprachen.
• Reihenfolge: zuerst eine Ablehnen-Schaltfläche, dann optionale Kategorien abwählen und speichern. Nur als letzter Ausweg blendet es das Banner aus. Diese Fälle werden getrennt gezählt und im Popup angezeigt.
• Newsletter-Pop-ups, die große Teile der Seite verdecken, werden über ihre eigene Schließen-Schaltfläche geschlossen; sonst werden sie entfernt und das Scrollen wird wiederhergestellt. Auf Anmelde-, Registrierungs-, Kasse-, Warenkorb-, Zahlungs- und Kontoseiten greift es nie ein.
• Popup: wie viele Störungen erledigt wurden, die heutige Zahl, was auf der aktuellen Seite passiert ist, ein Schalter, um Quiet Web für diese Seite auszuschalten, und „Report broken site“, das ein vorausgefülltes GitHub-Issue öffnet. Nichts wird automatisch gesendet.
• Teilen: Kopiere einen kurzen Text darüber, was Quiet Web für dich erledigt hat, mit einem Link zur Erweiterung.

WO ES FUNKTIONIERT
Jede Website, denn Banner gibt es überall. Im Popup kannst du Quiet Web für jede Seite ausschalten.

DATENSCHUTZ
• Der Seiteninhalt wird nur auf deinem Gerät gelesen, um Banner und Pop-ups zu finden. Er wird weder gespeichert noch gesendet.
• Gespeichert werden nur Zähler und seitenbezogene Einstellungen, im lokalen Erweiterungsspeicher deines Browsers.
• Keine Werbung, kein Tracking, keine Analysen, keine Konten und keine Netzwerkanfragen der Erweiterung.
• Berechtigungen: storage, tabs (um die aktuelle Seite im Popup zu zeigen) und Zugriff auf alle Websites, nötig, um auf jeder Seite Banner zu finden.

FREIWILLIGE UNTERSTÜTZUNG
Quiet Web ist kostenlos und von einem einzelnen Entwickler gebaut. Wenn sie dir hilft, kannst du sie mit einer freiwilligen einmaligen Spende über Stripe unterstützen. Die Bitte erscheint im Popup nur bei Meilensteinen (100, 500 und 2.000 erledigte Störungen), höchstens einmal pro Meilenstein und mit mindestens 30 Tagen Abstand, nie direkt nach der Installation. Wähle „Don't ask again“, und sie hört für immer auf. Dieselben Links findest du immer in den Optionen. Die Zahlung läuft auf der Seite von Stripe; die Erweiterung sieht sie nie.

Die Oberfläche der Erweiterung ist auf Englisch.

Open Source: https://github.com/Overcrasher/quiet-web
```
Characters: 2637

### Detailed description (fr, French)

```
Quiet Web refuse automatiquement les bannières de cookies et ferme les pop-ups de newsletter, pour que les pages restent lisibles. Il choisit toujours l'option respectueuse de la vie privée : tout refuser, ou n'enregistrer que les cookies nécessaires. Il ne clique jamais sur Accepter.

COMMENT ÇA MARCHE
• Gère les plateformes de consentement les plus courantes, avec un repli prudent pour les autres bannières, qui ne clique que sur un bouton de refus clairement libellé, en plusieurs langues.
• Ordre de préférence : d'abord un bouton de refus, puis décocher les catégories facultatives et enregistrer. En dernier recours seulement, il masque la bannière. Ces cas sont comptés à part et affichés dans la fenêtre de l'extension.
• Les pop-ups de newsletter qui couvrent une grande partie de la page sont fermés avec leur propre bouton ; sinon ils sont supprimés et le défilement est rétabli. Il n'agit jamais sur les pages de connexion, d'inscription, de paiement, de panier ou de compte.
• Fenêtre de l'extension : nombre de nuisances traitées, total du jour, ce qui s'est passé sur le site actuel, un interrupteur pour désactiver Quiet Web sur ce site et « Report broken site », qui ouvre un ticket GitHub prérempli. Rien n'est envoyé automatiquement.
• Partage : copiez un court texte sur ce que Quiet Web a traité pour vous, avec un lien vers l'extension.

OÙ ÇA FONCTIONNE
Tous les sites, car les bannières sont partout. Vous pouvez désactiver Quiet Web pour n'importe quel site depuis la fenêtre de l'extension.

CONFIDENTIALITÉ
• Le contenu de la page est lu uniquement sur votre appareil, pour repérer bannières et pop-ups. Il n'est ni stocké ni envoyé.
• Seuls des compteurs et des réglages par site sont enregistrés, dans le stockage local de l'extension de votre navigateur.
• Aucune publicité, aucun suivi, aucune analyse, aucun compte et aucune requête réseau de l'extension.
• Autorisations : storage, tabs (pour afficher le site actuel dans la fenêtre) et accès à tous les sites, nécessaire pour repérer les bannières sur n'importe quelle page.

SOUTIEN FACULTATIF
Quiet Web est gratuite et conçue par un seul développeur. Si elle vous est utile, vous pouvez la soutenir par un don unique et facultatif via Stripe. La demande n'apparaît dans la fenêtre de l'extension qu'à certains paliers (100, 500 et 2 000 nuisances traitées), au plus une fois par palier et à 30 jours d'intervalle, jamais juste après l'installation. Choisissez « Don't ask again » et elle s'arrête définitivement. Les mêmes liens sont toujours dans les Options. Le paiement se fait sur la page de Stripe ; l'extension ne le voit jamais.

L'interface de l'extension est en anglais.

Code source ouvert: https://github.com/Overcrasher/quiet-web
```
Characters: 2730

### Detailed description (es, Spanish)

```
Quiet Web rechaza automáticamente los banners de cookies y cierra los pop-ups de boletín, para que las páginas sigan siendo legibles. Siempre elige la opción más respetuosa con tu privacidad: rechazar todo o guardar solo las cookies necesarias. Nunca pulsa Aceptar.

CÓMO FUNCIONA
• Gestiona las plataformas de consentimiento más comunes, con un respaldo prudente para otros banners que solo pulsa un botón de rechazo claramente rotulado, en varios idiomas.
• Orden de preferencia: primero un botón de rechazo, luego desmarcar las categorías opcionales y guardar. Solo como último recurso oculta el banner. Estos casos se cuentan aparte y se muestran en la ventana de la extensión.
• Los pop-ups de boletín que cubren buena parte de la página se cierran con su propio botón; si no, se eliminan y se restablece el desplazamiento. Nunca actúa en páginas de inicio de sesión, registro, pago, carrito o cuenta.
• Ventana de la extensión: cuántas molestias se resolvieron, la cifra de hoy, qué pasó en el sitio actual, un interruptor para desactivar Quiet Web en ese sitio y «Report broken site», que abre una incidencia de GitHub rellenada. No se envía nada automáticamente.
• Compartir: copia un texto breve sobre lo que Quiet Web ha resuelto por ti, con un enlace a la extensión.

DÓNDE FUNCIONA
Cualquier sitio web, porque los banners están en todas partes. Puedes desactivar Quiet Web en cualquier sitio desde la ventana de la extensión.

PRIVACIDAD
• El contenido de la página se lee solo en tu dispositivo, para encontrar banners y pop-ups. No se guarda ni se envía.
• Solo se guardan contadores y ajustes por sitio, en el almacenamiento local de extensiones de tu navegador.
• Sin anuncios, sin seguimiento, sin analítica, sin cuentas y sin solicitudes de red por parte de la extensión.
• Permisos: storage, tabs (para mostrar el sitio actual en la ventana) y acceso a todos los sitios, necesario para encontrar banners en cualquier página.

APOYO OPCIONAL
Quiet Web es gratuita y la ha creado un solo desarrollador. Si te resulta útil, puedes apoyarla con una donación única y opcional a través de Stripe. La petición aparece en la ventana de la extensión solo en ciertos hitos (100, 500 y 2.000 molestias resueltas), como máximo una vez por hito y con 30 días de separación, nunca justo después de instalar. Elige «Don't ask again» y se detiene para siempre. Los mismos enlaces están siempre en Opciones. El pago se hace en la página de Stripe; la extensión nunca lo ve.

La interfaz de la extensión está en inglés.

Código abierto: https://github.com/Overcrasher/quiet-web
```
Characters: 2578

---

## 5. Category and language

- Category: Privacy & Security.
- Languages: English (default); Romanian (ro), German (de), French (fr) and Spanish (es) as added localized listings.

## 6. Single purpose statement (Privacy practices tab)

```
Quiet Web has one purpose: to automatically reject cookie consent banners and close newsletter popups on the pages the user visits, and to show the user a count of what it handled.
```

## 7. Permission justifications

### storage
```
Stores counters (cookie banners rejected, banners hidden, popups closed), the list of sites where the user switched Quiet Web off, and the state of the optional support prompt, in chrome.storage.local. Nothing is transmitted.
```

### tabs
```
Used to show the current site and what happened on it in the popup, and to let the user switch Quiet Web off for that site. No browsing history is stored.
```

### Host permissions (<all_urls>)
```
Cookie banners and newsletter popups appear on any website, so the content scripts must run on all pages and in all frames (consent dialogs often live in iframes). They read the page's DOM on the device to find a consent dialog or popup and click the reject button, or remove the popup. No data from the page is stored or sent, and the extension makes no network requests. Some consent platforms expose a reject function in the page's own JavaScript world; for those, a tiny MAIN-world content script file per platform only calls that documented reject function. No eval, no generic code execution, no remote code.
```

### Are you using remote code?
Answer: **No**
```
No. All JavaScript is bundled in the extension package. It does not load or evaluate remote scripts, remote modules or WebAssembly, uses no eval, and its extension-page CSP is script-src 'self'. It makes no network requests of its own.
```

## 8. Data usage disclosures (Privacy practices tab)

Recommended answers. CWS defines "collect" as data transmitted off the user's device or handled by the developer. Quiet Web never transmits anything and has no server, so strictly nothing is collected. Recommended checkbox: tick **Website content (the page's structure and text are read on the device to find banners and popups)**. Leave every other box unticked (the extension never sees payment details; Stripe handles them on its own page).

The content is processed on the device only, never stored and never transmitted. Keep Web history unticked: page addresses are not stored. If a reviewer asks, the same explanation applies.

Certifications (tick all three):
- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

## 9. URLs

- Privacy policy URL: https://overcrasher.github.io/quiet-web/privacy.html
- Homepage URL: https://overcrasher.github.io/quiet-web/
- Support URL: https://github.com/Overcrasher/quiet-web/issues

## 10. Screenshots, promo tiles and icon (upload order)

The Chrome Web Store has no per-screenshot caption field. Upload in this order from store/images/ (headline is printed on each image):

1. screenshot-1-banners.png: "Cookie banners, answered no." / before (cookie banner) and after (clean page plus the Quiet Web popup) on a generic news page
2. screenshot-2-popup.png: "214 annoyances handled for you." / the popup with the counters, breakdown and this-site status
3. screenshot-3-newsletter.png: "Newsletter popups, closed." / before (newsletter popup) and after (closed) on a generic news page
4. screenshot-4-pay-or-consent.png: "When a site asks you to pay or accept, you decide." / the pay-or-consent state: the banner is left alone and the popup says so
5. screenshot-5-privacy.png: "Everything happens on your device. Nothing is sent anywhere." / popup counters beside three privacy points

Promo tiles: promo-small-440x280.png and promo-marquee-1400x560.png: icon, name, "Auto-reject cookie banners" and "Say no to the noise."

Store icon: store-icon-128.png (96px artwork centred on a transparent 128px canvas, from icons/icon128.png).

All images are generated by tools/store_images.py (real UI captured from the unpacked extension; pages are invented fixtures, no third-party names or logos).

## 11. Notes for the reviewer

```
Quiet Web rejects cookie banners and closes newsletter popups, all on the device. No account or login is needed, and nothing is sent anywhere. It never clicks "Accept".

Quick test (about 3 minutes). Use a profile in the EU or a fresh profile with no cookies so banners show:
1. Load the extension and pin it.
2. Open a large news site in an EU language (for example a national news site). The cookie banner is answered "no" within a second or two: "Reject all", or "Necessary only", or open settings, untick optional categories and save. Compare with a profile without the extension to see the banner.
3. Click the toolbar icon: the headline "N annoyances handled for you.", today's count, and "Rejected cookies via <platform>" for the current site. The platforms handled are listed in the repository (rules/ folder). Where no safe button exists, the banner is hidden and counted separately as "hidden".
4. "Disable on this site" in the popup turns the extension off for that site only. "Report broken site" opens a prefilled GitHub issue (site name, extension version, what happened); nothing is sent until the user submits it.
5. Newsletter popups: close the first one that covers much of the page and asks for an email; the extension closes it or removes it and restores scrolling. It never acts on URLs containing login, signin, signup, register, checkout, cart, basket, payment, pay, account, auth or password.

Why <all_urls>: cookie banners and popups appear on every kind of site, often inside iframes (so all_frames is on). All processing is local; no network requests, no remote code, no eval. For a few consent platforms a tiny MAIN-world content script per platform only calls that platform's documented reject function.

Optional support: free extension. The support banner appears in the popup only at 100, 500 and 2,000 annoyances handled, at most once per milestone, 30 days apart. The same Stripe link is always in Options. Payments happen on Stripe's page.

Permissions: storage, tabs, host permissions <all_urls>. Source: https://github.com/Overcrasher/quiet-web
```

## 12. Pre-submission checklist

- [ ] Run `python3 tools/check_release.py --release` and confirm it exits 0 (Stripe links valid and non-test, THANKS_URL matches the manifest, locale limits).
- [ ] Run the unit tests (see README) and load the unpacked folder one last time on real pages.
- [ ] Run `python3 tools/package.py`, which runs the release check and writes dist/quiet-web-<version>.zip; upload that zip.
- [ ] Confirm the manifest version is correct (1.0.0 for the first upload; bump for every later upload).
- [ ] Register a Chrome Web Store developer account (one-time US$5 fee) and verify the contact email; set the publisher name to Quantumbyte Labs.
- [ ] Confirm GitHub Pages is live: https://overcrasher.github.io/quiet-web/, privacy.html and thanks.html all open.
- [ ] Create the 5 screenshots (1280x800) matching section 10, plus the small promo tile (440x280); the marquee tile (1400x560) is optional.
- [ ] Paste the detailed description in each language (EN, RO, DE, FR, ES; name and short summary come from the package), category, single purpose, permission justifications, data disclosures and reviewer notes.
- [ ] Tick the three certification statements and set remote code to No.
- [ ] After publishing: put the real store URL into docs/index.html (the TODO(store-url) block), the README and the siblings' "More from the same developer" lists.
- [ ] Set visibility (Public) and distribution regions, then submit for review.
