// Builds the download page of the offline file and the note for IT departments, in English and Romanian.
// Run build.mjs first: the pages print the version, the size and the fingerprint of the file it wrote.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://groma.ro';
const rel = JSON.parse(fs.readFileSync(path.join(root, 'out', 'release.json'), 'utf8'));
const FILE = '/simon-g/download/simon-g-tools';
const mb = (rel.bytes / 1048576).toFixed(1);
const POLICY_ONLINE = "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; worker-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'none'";
const policyOffline = word => "default-src 'none'; script-src <" + rel.scripts + ' ' + word + ">; style-src <" + rel.styles + ' ' + word + ">; font-src data:; img-src data:; worker-src blob:; connect-src 'none'; form-action 'none'; base-uri 'none'";
const REPO = 'https://github.com/Porta-dob/simon-g-tools';

const SHELL = {
  en: {
    home: '/en/', nav: [['/en/simon-g', 'Simon G.'], ['/en/simon-g/method', 'Method'], ['/en/#writing', 'Writing'], ['/en/#contact', 'Contact']],
    langLabel: 'RO', ogLocale: 'en_US', ogImage: '/assets/og/og-en.png', other: 'Română',
    footTag: 'Groma — AI engineering studio. We build for professionals whose decisions carry weight, on a horizon of generations, not quarters.',
    footNav: [['/en/', 'Groma'], ['/en/simon-g', 'Simon G.'], ['/en/privacy', 'Privacy']],
    legal: '© 2026 GROMA S.R.L. · CUI 54804217 · Trade Reg. J2026035922005 · Timișoara, Romania',
    legal2: 'Built by humans, with AI — behind a human gate.',
  },
  ro: {
    home: '/', nav: [['/simon-g', 'Simon G.'], ['/simon-g/metoda', 'Metodă'], ['/#articole', 'Articole'], ['/#contact', 'Contact']],
    langLabel: 'EN', ogLocale: 'ro_RO', ogImage: '/assets/og/og-ro.png', other: 'English',
    footTag: 'Groma — studio de inginerie AI. Construim pentru profesioniști ale căror decizii contează, pe un orizont de generații, nu de trimestre.',
    footNav: [['/', 'Groma'], ['/simon-g', 'Simon G.'], ['/confidentialitate', 'Confidențialitate']],
    legal: '© 2026 GROMA S.R.L. · CUI 54804217 · Nr. Reg. Com. J2026035922005 · Timișoara, România',
    legal2: 'Construit de oameni, cu AI — sub poartă umană.',
  },
};

const URLS = {
  offline: { en: '/en/simon-g/offline', ro: '/simon-g/offline' },
  it: { en: '/en/simon-g/for-it', ro: '/simon-g/pentru-it' },
};
const OUT = {
  offline: { en: 'en/simon-g/offline.html', ro: 'simon-g/offline.html' },
  it: { en: 'en/simon-g/for-it.html', ro: 'simon-g/pentru-it.html' },
};

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const list = items => `<ul class="hub-list">\n${items.map(i => `      <li>${i}</li>`).join('\n')}\n    </ul>`;
const code = s => `<code class="it-code">${esc(s)}</code>`;
const table = rows => `<div class="hub-table-wrap"><table class="hub-table xl-table"><tbody>\n${rows.map(([k, v]) => `      <tr><th scope="row">${esc(k)}</th><td class="it-td">${v}</td></tr>`).join('\n')}\n    </tbody></table></div>`;

const PAGES = {
  offline: {
    en: {
      title: 'Simon G. tools, offline: one file, no installation | Groma',
      desc: 'The four free Simon G. tools in one file that works without a network connection. No installation, no account, no administrator rights. The fingerprint of the file is published here.',
      eyebrow: 'Simon G. · offline · free',
      h1: 'The four tools in one file, for use without a network',
      lead: 'Download one file, open it with a double click, and use the Stock Check, the Working Capital Check, the Credit Check and the Decision Charter with the network cable unplugged.',
      body: () => `
  <section class="section">
    <h2>What you get</h2>
    ${list(['One HTML file of ' + mb + ' MB. It opens in the browser you already have.', 'No installation, no account and no administrator rights.', 'English and Romanian in the same file.',
      'The same calculations as the tools on this site. The file is built from the same code.', 'It cannot open a connection to any address. Your files stay on your computer.'])}
    <div class="cta-row">
      <a class="btn solid" href="${FILE}" download="simon-g-tools.html" data-track="simon-g-tools.html">Download simon-g-tools.html</a>
      <a class="btn ghost" href="${URLS.it.en}">Note for your IT department</a>
    </div>
    <p class="xl-note">Version ${esc(rel.version)}, built on ${esc(rel.built)}.</p>
  </section>

  <section class="section">
    <h2>How to use it</h2>
    ${list(['Save the file where you keep your work, for example on the desktop.', 'Open it with a double click. It opens in your browser.', 'Choose a tool. In the Stock Check, save the workspace file at the end, and load it again next month.',
      'The file does not update itself. For a newer version, download it again from this page.'])}
  </section>

  <section class="section">
    <h2>Check that your copy is the original</h2>
    <p class="lead">Each version has a fingerprint. If the fingerprint of your copy is the one below, the file is the one we published.</p>
    ${table([['Version', esc(rel.version)], ['Size', esc(rel.bytes.toLocaleString('en-GB')) + ' bytes'], ['SHA-256', code(rel.sha256)],
      ['On Windows', code('certutil -hashfile simon-g-tools.html SHA256')], ['On macOS or Linux', code('shasum -a 256 simon-g-tools.html')]])}
  </section>

  <section class="section">
    <h2>Questions</h2>
    <div class="hub-faq">
      <h3>My company blocks downloaded programs. Will this work?</h3>
      <p>It is not a program. It is a web page saved as a file, and it runs inside your browser with the same limits as any web page. If your company blocks HTML files as well, use the tools on this site instead; they are the same.</p>
      <h3>Which browsers?</h3>
      <p>We tested it in Chrome and in Edge. It uses standard browser features, so current versions of Firefox and Safari should work; we have not tested them.</p>
      <h3>Does it count how often I use it?</h3>
      <p>No. The file cannot send anything. This page counts how many times the download button is pressed, and nothing else.</p>
      <h3>What does it cost?</h3>
      <p>Nothing. Simon G., the platform that runs the same calculations every night with approvals and a record of decisions, is a paid product.</p>
    </div>
  </section>`,
    },
    ro: {
      title: 'Instrumentele Simon G., offline: un singur fișier, fără instalare | Groma',
      desc: 'Cele patru instrumente gratuite Simon G. într-un singur fișier care funcționează fără conexiune la rețea. Fără instalare, fără cont, fără drepturi de administrator. Amprenta fișierului este publicată aici.',
      eyebrow: 'Simon G. · offline · gratuit',
      h1: 'Cele patru instrumente într-un singur fișier, de folosit fără rețea',
      lead: 'Descărcați un fișier, îl deschideți cu dublu clic și folosiți verificarea de stoc, capitalul de lucru, verificarea de credit și carta deciziilor cu cablul de rețea scos.',
      body: () => `
  <section class="section">
    <h2>Ce primiți</h2>
    ${list(['Un fișier HTML de ' + mb.replace('.', ',') + ' MB. Se deschide în browserul pe care îl aveți deja.', 'Fără instalare, fără cont și fără drepturi de administrator.', 'Română și engleză în același fișier.',
      'Aceleași calcule ca la instrumentele de pe acest site. Fișierul este construit din același cod.', 'Nu poate deschide nicio conexiune, către nicio adresă. Fișierele dumneavoastră rămân pe calculator.'])}
    <div class="cta-row">
      <a class="btn solid" href="${FILE}" download="simon-g-tools.html" data-track="simon-g-tools.html">Descărcați simon-g-tools.html</a>
      <a class="btn ghost" href="${URLS.it.ro}">Notă pentru departamentul IT</a>
    </div>
    <p class="xl-note">Versiunea ${esc(rel.version)}, construită la ${esc(rel.built)}.</p>
  </section>

  <section class="section">
    <h2>Cum se folosește</h2>
    ${list(['Salvați fișierul acolo unde vă țineți lucrul, de exemplu pe desktop.', 'Deschideți-l cu dublu clic. Se deschide în browser.', 'Alegeți un instrument. La verificarea de stoc, salvați la sfârșit fișierul de lucru și încărcați-l din nou luna viitoare.',
      'Fișierul nu se actualizează singur. Pentru o versiune mai nouă, descărcați-l din nou de pe această pagină.'])}
  </section>

  <section class="section">
    <h2>Verificați că aveți originalul</h2>
    <p class="lead">Fiecare versiune are o amprentă. Dacă amprenta copiei dumneavoastră este cea de mai jos, fișierul este cel publicat de noi.</p>
    ${table([['Versiune', esc(rel.version)], ['Mărime', esc(rel.bytes.toLocaleString('ro-RO')) + ' octeți'], ['SHA-256', code(rel.sha256)],
      ['În Windows', code('certutil -hashfile simon-g-tools.html SHA256')], ['În macOS sau Linux', code('shasum -a 256 simon-g-tools.html')]])}
  </section>

  <section class="section">
    <h2>Întrebări</h2>
    <div class="hub-faq">
      <h3>Firma mea blochează programele descărcate. Va merge?</h3>
      <p>Nu este un program. Este o pagină web salvată ca fișier, care rulează în browser, cu aceleași limite ca orice pagină web. Dacă firma blochează și fișierele HTML, folosiți instrumentele de pe acest site; sunt aceleași.</p>
      <h3>În ce browsere?</h3>
      <p>L-am verificat în Chrome și în Edge. Folosește funcții standard ale browserelor, așa că versiunile curente de Firefox și Safari ar trebui să meargă; pe acestea nu le-am verificat.</p>
      <h3>Numără de câte ori îl folosesc?</h3>
      <p>Nu. Fișierul nu poate trimite nimic. Pagina aceasta numără de câte ori este apăsat butonul de descărcare și nimic altceva.</p>
      <h3>Cât costă?</h3>
      <p>Nimic. Simon G., platforma care face aceleași calcule în fiecare noapte, cu aprobări și cu evidența deciziilor, este un produs cu plată.</p>
    </div>
  </section>`,
    },
  },
  it: {
    en: {
      title: 'Simon G. free tools: a note for the IT department | Groma',
      desc: 'What the free Simon G. tools are, what they do with data, what stops them from sending it, and how to check each statement yourself.',
      eyebrow: 'Simon G. · for the IT department',
      h1: 'A note for the IT department',
      lead: 'A colleague wants to use the free Simon G. tools with company data. This page says what the tools are, what they do with that data, and how you can check each statement.',
      body: () => `
  <section class="section">
    <h2>In short</h2>
    ${table([
      ['What they are', 'Four static web pages, also available as one HTML file for use without a network: Stock Check, Working Capital Check, Credit Check, Decision Charter.'],
      ['Server side', 'None. There is no account, no upload and no database. The site serves files and nothing else.'],
      ['Where the data goes', 'Nowhere. The file a user chooses is read by the browser and processed in the page. Results are shown on screen and can be saved by the user as files.'],
      ['What enforces it', 'A content security policy in each page that forbids every connection. The browser enforces it.'],
      ['Installation', 'None. No administrator rights, no browser extension, no plug-in.'],
      ['Third parties', 'None on the tool pages: no analytics, no fonts or scripts from other hosts, no cookies.'],
    ])}
  </section>

  <section class="section">
    <h2>The policy</h2>
    <p class="lead">Each tool page on groma.ro carries this policy in the first lines of its source:</p>
    <p>${code(POLICY_ONLINE)}</p>
    <p class="lead">The offline file carries this one. It lists the SHA-256 fingerprint of every script and every style block in the file, so nothing else can run:</p>
    <p>${code(policyOffline('fingerprints'))}</p>
    ${list(['<strong>connect-src \'none\'</strong> blocks fetch, XMLHttpRequest, WebSocket and beacons.', '<strong>default-src \'none\'</strong> blocks everything not listed, including frames and media from any address.',
      '<strong>img-src</strong> allows the page\'s own images and inline images only, so data cannot leave inside an image address.', '<strong>form-action \'none\'</strong> blocks form submission.',
      'A policy does not stop a user from following a link. The links in the tools point to groma.ro and carry no data.'])}
  </section>

  <section class="section">
    <h2>How to check</h2>
    ${table([
      ['Read the policy', 'Open the page source. The policy is in the first lines.'],
      ['Watch the network', 'Open the developer tools, Network tab, then load a file and run a tool. After the page has loaded, no request appears.'],
      ['Pull the cable', 'Open the offline file with the network disconnected. Everything works.'],
      ['Run the self-test', 'Open the offline file with ' + code('#selftest') + ' at the end of its address. It runs the tools on invented data and writes PASS or FAIL in the ' + code('data-selftest') + ' attribute of the page.'],
      ['Check the fingerprint', 'Compare the SHA-256 of the offline file with the one on <a href="' + URLS.offline.en + '">the download page</a>: ' + code('certutil -hashfile simon-g-tools.html SHA256')],
      ['Read the code', 'The page code, the tests and the build scripts are public: <a href="' + REPO + '">github.com/Porta-dob/simon-g-tools</a>. The offline file is built from the published pages by ' + code('offline/tools/build.mjs') + '.'],
    ])}
  </section>

  <section class="section">
    <h2>What the tools read and write</h2>
    ${table([
      ['Files read', 'Excel (.xlsx, .xlsm) and CSV, chosen by the user. Macros are not executed: the page reads the cell values with its own reader, under 200 lines, with no library.'],
      ['Files written', 'Only when the user presses a button: results as CSV, decision records as JSON, a workspace file as JSON, and printing. They go to the browser\'s download folder.'],
      ['Stored in the browser', 'The Decision Charter keeps its draft in the browser\'s local storage on that computer; its "Clear" button removes it. The other three tools store nothing.'],
      ['Cookies', 'None.'],
      ['Updates', 'The pages on the site change when we publish a new version. The offline file never changes by itself.'],
    ])}
  </section>

  <section class="section">
    <h2>What is counted</h2>
    ${list(['The tool pages and the offline file count nothing.', 'The other pages of groma.ro count visits with the hosting provider\'s counter, without cookies. The download pages also count a press on a download button, with the file name.',
      'A second counter on those pages loads only if the visitor accepts it in the banner.'])}
  </section>

  <section class="section">
    <h2>Requirements, licence, contact</h2>
    ${table([
      ['Browser', 'A current browser. Tested in Chrome and Edge. The Excel reader needs a browser version from mid-2023 or later.'],
      ['Licence', 'Page code: Apache-2.0. Calculation engine: FSL-1.1-ALv2, free for your internal use; it may not be offered as a competing product, and it becomes Apache-2.0 two years after each release.'],
      ['Warranty', 'None. The tools propose; a person decides.'],
      ['Publisher', 'GROMA S.R.L., Timișoara, Romania, CUI 54804217.'],
      ['Security contact', '<a href="mailto:contact@groma.ro?subject=Simon%20G.%20security">contact@groma.ro</a>. Write to us if you find a way to make a tool send data.'],
    ])}
    <div class="cta-row"><a class="btn ghost" href="${URLS.offline.en}">The offline file</a> <a class="btn ghost" href="/en/simon-g">The tools</a></div>
  </section>`,
    },
    ro: {
      title: 'Instrumentele gratuite Simon G.: notă pentru departamentul IT | Groma',
      desc: 'Ce sunt instrumentele gratuite Simon G., ce fac cu datele, ce le împiedică să le trimită și cum puteți verifica singuri fiecare afirmație.',
      eyebrow: 'Simon G. · pentru departamentul IT',
      h1: 'Notă pentru departamentul IT',
      lead: 'Un coleg vrea să folosească instrumentele gratuite Simon G. cu date ale firmei. Pagina aceasta spune ce sunt instrumentele, ce fac cu datele și cum puteți verifica fiecare afirmație.',
      body: () => `
  <section class="section">
    <h2>Pe scurt</h2>
    ${table([
      ['Ce sunt', 'Patru pagini web statice, disponibile și ca un singur fișier HTML, de folosit fără rețea: verificare stoc, capital de lucru, verificare credit, carta deciziilor.'],
      ['Partea de server', 'Nu există. Nu există cont, încărcare de fișiere sau bază de date. Site-ul servește fișiere și atât.'],
      ['Unde ajung datele', 'Nicăieri. Fișierul ales de utilizator este citit de browser și prelucrat în pagină. Rezultatele apar pe ecran și pot fi salvate de utilizator ca fișiere.'],
      ['Ce garantează acest lucru', 'O politică de securitate a conținutului, în fiecare pagină, care interzice orice conexiune. O aplică browserul.'],
      ['Instalare', 'Niciuna. Fără drepturi de administrator, fără extensie de browser, fără plug-in.'],
      ['Terți', 'Niciunul pe paginile instrumentelor: fără analiză de trafic, fără fonturi sau scripturi de pe alte gazde, fără cookie-uri.'],
    ])}
  </section>

  <section class="section">
    <h2>Politica</h2>
    <p class="lead">Fiecare pagină de instrument de pe groma.ro are această politică în primele rânduri ale sursei:</p>
    <p>${code(POLICY_ONLINE)}</p>
    <p class="lead">Fișierul offline o are pe aceasta. Ea enumeră amprenta SHA-256 a fiecărui script și a fiecărui bloc de stil din fișier, așa că nimic altceva nu poate rula:</p>
    <p>${code(policyOffline('amprente'))}</p>
    ${list(['<strong>connect-src \'none\'</strong> blochează fetch, XMLHttpRequest, WebSocket și beacon.', '<strong>default-src \'none\'</strong> blochează tot ce nu este enumerat, inclusiv cadre și conținut media de la orice adresă.',
      '<strong>img-src</strong> permite doar imaginile paginii și imaginile incluse în ea, așa că datele nu pot pleca în adresa unei imagini.', '<strong>form-action \'none\'</strong> blochează trimiterea de formulare.',
      'O politică nu împiedică utilizatorul să urmeze un link. Linkurile din instrumente duc la groma.ro și nu poartă date.'])}
  </section>

  <section class="section">
    <h2>Cum verificați</h2>
    ${table([
      ['Citiți politica', 'Deschideți sursa paginii. Politica este în primele rânduri.'],
      ['Urmăriți rețeaua', 'Deschideți instrumentele pentru dezvoltatori, fila Network, apoi încărcați un fișier și rulați un instrument. După ce pagina s-a încărcat, nu mai apare nicio cerere.'],
      ['Scoateți cablul', 'Deschideți fișierul offline cu rețeaua deconectată. Totul funcționează.'],
      ['Rulați autotestul', 'Deschideți fișierul offline cu ' + code('#selftest') + ' la sfârșitul adresei. Rulează instrumentele pe date inventate și scrie PASS sau FAIL în atributul ' + code('data-selftest') + ' al paginii.'],
      ['Verificați amprenta', 'Comparați SHA-256 al fișierului offline cu cel de pe <a href="' + URLS.offline.ro + '">pagina de descărcare</a>: ' + code('certutil -hashfile simon-g-tools.html SHA256')],
      ['Citiți codul', 'Codul paginilor, testele și scripturile de construire sunt publice: <a href="' + REPO + '">github.com/Porta-dob/simon-g-tools</a>. Fișierul offline este construit din paginile publicate, de ' + code('offline/tools/build.mjs') + '.'],
    ])}
  </section>

  <section class="section">
    <h2>Ce citesc și ce scriu instrumentele</h2>
    ${table([
      ['Fișiere citite', 'Excel (.xlsx, .xlsm) și CSV, alese de utilizator. Macrocomenzile nu sunt executate: pagina citește valorile celulelor cu propriul cititor, de sub 200 de rânduri, fără nicio bibliotecă.'],
      ['Fișiere scrise', 'Doar când utilizatorul apasă un buton: rezultate în CSV, fișe de decizie în JSON, un fișier de lucru în JSON și tipărire. Ajung în dosarul de descărcări al browserului.'],
      ['Păstrat în browser', 'Carta deciziilor își ține ciorna în memoria locală a browserului, pe acel calculator; butonul ei de ștergere o elimină. Celelalte trei instrumente nu păstrează nimic.'],
      ['Cookie-uri', 'Niciunul.'],
      ['Actualizări', 'Paginile de pe site se schimbă când publicăm o versiune nouă. Fișierul offline nu se schimbă niciodată singur.'],
    ])}
  </section>

  <section class="section">
    <h2>Ce se numără</h2>
    ${list(['Paginile instrumentelor și fișierul offline nu numără nimic.', 'Celelalte pagini ale groma.ro numără vizitele cu contorul furnizorului de găzduire, fără cookie-uri. Paginile de descărcare numără și apăsarea unui buton de descărcare, cu numele fișierului.',
      'Un al doilea contor se încarcă pe acele pagini doar dacă vizitatorul îl acceptă în bannerul de consimțământ.'])}
  </section>

  <section class="section">
    <h2>Cerințe, licență, contact</h2>
    ${table([
      ['Browser', 'Un browser actual. Verificat în Chrome și Edge. Cititorul de Excel cere o versiune de browser de la mijlocul lui 2023 sau mai nouă.'],
      ['Licență', 'Codul paginilor: Apache-2.0. Motorul de calcul: FSL-1.1-ALv2, liber pentru uz intern; nu poate fi oferit ca produs concurent și devine Apache-2.0 la doi ani după fiecare versiune.'],
      ['Garanție', 'Niciuna. Instrumentele propun; hotărăște un om.'],
      ['Editor', 'GROMA S.R.L., Timișoara, România, CUI 54804217.'],
      ['Contact pentru securitate', '<a href="mailto:contact@groma.ro?subject=Simon%20G.%20security">contact@groma.ro</a>. Scrieți-ne dacă găsiți o cale prin care un instrument poate trimite date.'],
    ])}
    <div class="cta-row"><a class="btn ghost" href="${URLS.offline.ro}">Fișierul offline</a> <a class="btn ghost" href="/simon-g">Instrumentele</a></div>
  </section>`,
    },
  },
};

function page(id, lang) {
  const x = PAGES[id][lang], s = SHELL[lang], other = lang === 'ro' ? 'en' : 'ro';
  const url = SITE + URLS[id][lang];
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(x.title)}</title>
  <meta name="description" content="${esc(x.desc)}">
  <link rel="icon" type="image/svg+xml" href="/assets/groma-mark.svg">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="canonical" href="${url}">
  <link rel="alternate" hreflang="ro" href="${SITE + URLS[id].ro}">
  <link rel="alternate" hreflang="en" href="${SITE + URLS[id].en}">
  <link rel="alternate" hreflang="x-default" href="${SITE + URLS[id].en}">
  <meta property="og:title" content="${esc(x.h1)}">
  <meta property="og:description" content="${esc(x.desc)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="Groma">
  <meta property="og:locale" content="${s.ogLocale}">
  <meta property="og:image" content="${SITE + s.ogImage}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="stylesheet" href="/assets/fonts/fonts.css">
  <link rel="stylesheet" href="/assets/styles.css">
  <link rel="stylesheet" href="/simon-g/hub/hub.css">
  <link rel="stylesheet" href="/simon-g/excel/excel.css">
  <link rel="stylesheet" href="/simon-g/download/it.css">
</head>
<body>

<div class="rail"></div>

<header class="site-header">
  <div class="inner">
    <a class="brand" href="${s.home}">
      <img src="/assets/groma-mark.svg" alt="Groma">
      <span class="divider"></span>
      <span class="wordmark">GROMA</span>
    </a>
    <nav class="site-nav">
${s.nav.map(([h, l]) => `      <a href="${h}">${esc(l)}</a>`).join('\n')}
      <a class="lang" href="${URLS[id][other]}">${s.langLabel}</a>
    </nav>
  </div>
</header>

<main>
  <section class="hero hub-hero">
    <div>
      <p class="eyebrow">${esc(x.eyebrow)}</p>
      <div class="roofline"></div>
      <h1>${esc(x.h1)}</h1>
      <p class="lead">${esc(x.lead)}</p>
    </div>
  </section>
${x.body()}
</main>

<footer class="site-footer">
  <div class="inner">
    <div>
      <img src="/assets/groma-mark-reversed.svg" alt="Groma">
      <p class="tag">${esc(s.footTag)}</p>
    </div>
    <nav>
${s.footNav.concat([[URLS[id][other], s.other]]).map(([h, l]) => `      <a href="${h}">${esc(l)}</a>`).join('\n')}
    </nav>
    <div class="legal">
      <span>${esc(s.legal)}</span>
      <span>${esc(s.legal2)}</span>
    </div>
  </div>
</footer>

<script defer src="/_vercel/insights/script.js"></script>
<script defer src="/simon-g/excel/track.js"></script>
<script defer src="/assets/consent.js"></script>
</body>
</html>
`;
}

for (const id of Object.keys(PAGES)) for (const lang of ['en', 'ro']) {
  const f = path.join(root, 'pages', OUT[id][lang]);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, page(id, lang));
  console.log(OUT[id][lang]);
}
fs.writeFileSync(path.join(root, 'pages', 'it.css'), `/* Simon G. download page and IT note */
.it-code { font-family: var(--font-mono); font-size: 14px; background: #fff; border: 1px solid rgba(19, 26, 39, 0.14); padding: 2px 6px; overflow-wrap: anywhere; }
td .it-code { display: inline-block; max-width: 100%; }
p > .it-code { display: block; padding: 10px 14px; border-left: 4px solid var(--cobalt); line-height: 1.5; }
.xl-table .it-td { font-family: var(--font-body, inherit); font-size: 16px; line-height: 1.5; }
.xl-table th { vertical-align: top; }
.it-td a, .hub-faq a { color: var(--cobalt); text-underline-offset: 3px; }
@media print {
  @page { margin: 12mm; }
  body { background: #fff !important; }
  .rail, .site-header, .site-footer, .cta-row, #groma-consent { display: none !important; }
  main, .section, .hero, .hero > div { padding: 0 !important; margin: 0 !important; border: 0 !important; max-width: none !important; min-height: 0 !important; }
  .hero .roofline { margin: 6px 0 8px !important; }
  h1 { font-size: 22px !important; margin: 0 0 6px !important; }
  h2 { font-size: 15px !important; margin: 12px 0 4px !important; max-width: none !important; }
  .lead { font-size: 11px !important; margin: 0 0 4px !important; max-width: none !important; }
  .hub-table th, .hub-table td, .xl-table .it-td { font-size: 11px !important; line-height: 1.35 !important; padding: 4px 8px !important; }
  .hub-list { max-width: none !important; margin: 4px 0 !important; }
  .hub-list { list-style: disc !important; padding-left: 18px !important; }
  .hub-list li { font-size: 11px !important; padding: 1px 0 !important; border: 0 !important; max-width: none !important; }
  .hub-list li::before { display: none !important; }
  .it-code, p > .it-code { font-size: 9.5px; padding: 3px 6px; }
  .hub-table tr, .hub-list li { break-inside: avoid; }
}
`);
