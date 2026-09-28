// Builds the two language pages from one template, so that they cannot drift apart.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://groma.ro';
const URLS = { ro: '/simon-g/verificare-credit', en: '/en/simon-g/credit-check' };
const version = JSON.parse(fs.readFileSync(path.join(root, 'app', 'credit-engine.version.json'), 'utf8'));
const stamp = version.built.replace(/-/g, '') + 'c';

const TEXT = {
  en: {
    title: 'Simon G. Credit Check — free scorecard, trend and the cost of late payment, computed on your computer',
    desc: 'Free credit check by Groma. Load a list of customer invoices and get a transparent scorecard, class, trend and the yearly cost of late payment for every business customer. The file never leaves your computer.',
    ogTitle: 'Simon G. Credit Check — how your customers really pay, and what it costs you',
    home: '/en/', nav: [['/en/#method', 'Method'], ['/en/#work', 'Work'], ['/en/#writing', 'Writing'], ['/en/#contact', 'Contact']],
    langLabel: 'RO', ogLocale: 'en_US', ogImage: '/assets/og/og-en.png',
    eyebrow: 'Simon G. · Credit Check · free',
    h1: 'How do your customers really pay, and what does it cost you?',
    lead: 'Load a list of customer invoices. For every business customer you get a transparent scorecard, a class, a trend and the yearly cost of late payment, each with the reasoning behind it.',
    trustB: 'Your file never leaves this computer.',
    trust: ' The calculation runs in this browser tab, and the page is built so that it cannot send data anywhere. Your IT department can verify this in the page source.',
    s1: 'Customer invoices',
    s1hint: 'An Excel or CSV file with one row per invoice: customer, invoice date, due date, payment date (leave empty if still unpaid), amount, and the amount paid if it was less than the full amount.',
    tplH: 'Template', tplHint: 'The template holds eighteen months of invented invoices for forty customers. Download it, load it to see the result, then replace the rows with your own export.',
    tplLabel: 'Invoices', tplDesc: 'One row per invoice, forty customers, eighteen months',
    chooseInvoices: 'Choose invoice file', sample: 'Try with sample data',
    s2: 'Your assumptions',
    s2hint: 'Nothing is guessed silently. These values are used where your file does not say otherwise, and they are printed in the export.',
    a_asOf: 'As-of date', a_asOfHint: 'Proposed from the latest date in your file; change it to test another point in time.',
    a_margin: 'Gross margin rate on these customers, %', a_wacc: 'Cost of capital per year, %',
    run: 'Run the credit check', results: 'Results',
    filter: 'Filter by customer name', statusAria: 'Filter by class', exportBtn: 'Export to CSV', print: 'Print', close: 'Close',
    nextH: 'From a one-off check to a controlled process',
    next1: 'This page answers the question once. Simon G. runs the same scorecard every night from your own systems, puts a limit change in front of a named person for approval, keeps the record of who decided what, and ties it to what actually happened afterwards.',
    next2: 'Write to us and we will show it on your own data.',
    methodLink: ['/en/simon-g/method', 'The rules behind it: the Simon G. Method'],
    contact: 'contact@groma.ro',
    whatH: 'What the calculation does',
    whatLead: 'Most credit-scoring tools give you a number. This one shows the seven components behind it, and their published weights.',
    what: [
      ['Punctuality falls with days beyond terms', 'The average number of days a customer pays after the due date costs 2.5 points each, up to the full hundred.'],
      ['Completeness looks at value, not count', 'It is the share of paid invoice value that was paid in full — a large invoice paid short counts more than a small one.'],
      ['Consistency rewards a steady pattern', 'The score falls with the spread of days beyond terms from one invoice to the next, not only with the average.'],
      ['Trend compares two windows', 'The last six months of settled invoices are compared with the six-to-eighteen-months-ago window; each day of drift costs four points.'],
      ['A clean record can be overridden', 'A payment incident in the last twelve months caps the class at C. An active insolvency flag sets it to D, whatever the score says.'],
      ['Financing cost is a real number', 'Yearly purchases × mean days beyond terms ÷ 365 × your cost of capital. Shown in your currency, and as a share of the margin the customer generates.'],
      ['One score, seven components, published weights', 'Punctuality 22%, completeness 18%, consistency 13%, trend 13%, clean record 14%, relationship length 8%, financing cost 12%. Class A from 86, B from 78, C from 66, D below.'],
    ],
    limitsH: 'What it does not do',
    limits: ['External credit registers (BPI, CIP or a credit bureau)', 'Legal incidents, unless your file states them', 'A statutory credit rating', 'Private individuals — do not load a list of consumers; use business customers only', 'A change to a credit limit — that stays a person\u2019s decision'],
    limitsNote: 'Simon G., the full platform, runs the same scorecard every night from your own systems and keeps the record of every limit decision. External incident registers are not connected there either.',
    faqH: 'Questions',
    faq: [
      ['Where does my data go?', 'Nowhere. The file is read by your browser and the calculation runs on your computer. The page carries a security policy that forbids every outgoing connection, and it loads no analytics or third-party scripts.'],
      ['What file do I need?', 'A list of invoices with customer, invoice date, due date, payment date and amount, as Excel (.xlsx) or CSV. Unpaid invoices are included with an empty payment date. A template is on this page.'],
      ['How is the score computed?', 'Seven components — punctuality, completeness, consistency, trend, clean record, relationship length and financing cost — are combined with published weights into a score from 0 to 100 and a class from A to D. Every figure traces back to your invoices.'],
      ['Does it decide who gets credit?', 'No. It shows the numbers and the reasoning behind them. A person decides whether to change a limit.'],
      ['What does it cost?', 'The Credit Check is free. Simon G., the platform that runs the same calculation every night with approvals and an audit record, is a paid product installed on your own infrastructure.'],
    ],
    footTag: 'Groma — AI engineering studio. We build for professionals whose decisions carry weight, on a horizon of generations, not quarters.',
    footNav: [['/en/', 'Groma'], ['/en/articles/a-human-signs-where', 'Writing'], [URLS.ro, 'Română'], ['/en/privacy', 'Privacy']],
    legal: '© 2026 GROMA S.R.L. · CUI 54804217 · Trade Reg. J2026035922005 · Timișoara, Romania',
    legal2: 'Built by humans, with AI — behind a human gate.',
  },
  ro: {
    title: 'Simon G. Verificare credit comercial — scor, tendință și costul întârzierii la plată, calculate gratuit pe calculatorul dumneavoastră',
    desc: 'Verificare gratuită de credit comercial, de la Groma. Încărcați lista facturilor emise clienților și primiți, pentru fiecare client, un scor transparent, o clasă, o tendință și costul anual al întârzierii la plată. Fișierul nu părăsește calculatorul.',
    ogTitle: 'Simon G. Verificare credit comercial — cum plătesc de fapt clienții dumneavoastră și cât vă costă',
    home: '/', nav: [['/#metoda', 'Metodă'], ['/#lucrari', 'Lucrări'], ['/#articole', 'Articole'], ['/#contact', 'Contact']],
    langLabel: 'EN', ogLocale: 'ro_RO', ogImage: '/assets/og/og-ro.png',
    eyebrow: 'Simon G. · Verificare credit comercial · gratuit',
    h1: 'Cum plătesc de fapt clienții dumneavoastră și cât vă costă?',
    lead: 'Încărcați lista facturilor emise clienților. Pentru fiecare client persoană juridică primiți un scor transparent, o clasă, o tendință și costul anual al întârzierii la plată, fiecare cu explicația lui.',
    trustB: 'Fișierul nu părăsește acest calculator.',
    trust: ' Calculul se face în această filă de browser, iar pagina este construită astfel încât să nu poată trimite date nicăieri. Departamentul IT poate verifica acest lucru în sursa paginii.',
    s1: 'Facturile clienților',
    s1hint: 'Un fișier Excel sau CSV cu un rând pe factură: clientul, data facturii, data scadenței, data plății (goală dacă factura nu a fost încă plătită), suma și suma încasată, dacă a fost mai mică decât suma totală.',
    tplH: 'Model de fișier', tplHint: 'Modelul conține optsprezece luni de facturi inventate pentru patruzeci de clienți. Descărcați-l, încărcați-l ca să vedeți rezultatul, apoi înlocuiți rândurile cu exportul dumneavoastră.',
    tplLabel: 'Facturi', tplDesc: 'Un rând pe factură, patruzeci de clienți, optsprezece luni',
    chooseInvoices: 'Alegeți fișierul de facturi', sample: 'Încercați cu date de probă',
    s2: 'Ipotezele dumneavoastră',
    s2hint: 'Nimic nu este presupus pe ascuns. Valorile de mai jos se folosesc acolo unde fișierul nu spune altceva și apar scrise în export.',
    a_asOf: 'Data de referință', a_asOfHint: 'Propusă din cea mai recentă dată din fișierul dumneavoastră; o puteți schimba pentru a testa un alt moment.',
    a_margin: 'Rata marjei brute la acești clienți, %', a_wacc: 'Costul capitalului pe an, %',
    run: 'Porniți verificarea', results: 'Rezultate',
    filter: 'Căutați după numele clientului', statusAria: 'Filtrați după clasă', exportBtn: 'Export CSV', print: 'Tipărire', close: 'Închide',
    nextH: 'De la o verificare făcută o dată la un proces ținut sub control',
    next1: 'Pagina aceasta răspunde la întrebare o singură dată. Simon G. face același calcul în fiecare noapte, din sistemele dumneavoastră, pune orice schimbare de limită în fața unei persoane cu nume și prenume pentru aprobare, păstrează evidența cine ce a hotărât și o leagă de ce s-a întâmplat de fapt.',
    next2: 'Scrieți-ne și vi-l arătăm pe datele dumneavoastră.',
    methodLink: ['/simon-g/metoda', 'Regulile din spatele lui: Metoda Simon G.'],
    contact: 'contact@groma.ro',
    whatH: 'Ce face calculul',
    whatLead: 'Cele mai multe instrumente de scoring vă dau un număr. Acesta arată cele șapte componente din spatele lui și ponderile lor publicate.',
    what: [
      ['Punctualitatea scade cu zilele de întârziere', 'Numărul mediu de zile în care un client plătește după scadență costă 2,5 puncte pe zi, până la suta completă.'],
      ['Plata integrală se uită la valoare, nu la număr', 'Este cota din valoarea facturilor plătite care a fost plătită integral — o factură mare plătită parțial contează mai mult decât una mică.'],
      ['Constanța răsplătește un tipar stabil', 'Scorul scade odată cu variația zilelor de întârziere de la o factură la alta, nu doar cu media lor.'],
      ['Tendința compară două intervale', 'Ultimele șase luni de facturi decontate sunt comparate cu intervalul de acum șase până la optsprezece luni; fiecare zi de abatere costă patru puncte.'],
      ['Un cazier curat poate fi suprascris', 'Un incident de plată din ultimele douăsprezece luni plafonează clasa la C. Un marcaj activ de insolvență o fixează la D, indiferent de scor.'],
      ['Costul de finanțare este o cifră reală', 'Achiziții anuale × zile medii de întârziere ÷ 365 × costul capitalului dumneavoastră. Arătat în moneda dumneavoastră și ca pondere din marja pe care o generează clientul.'],
      ['Un scor, șapte componente, ponderi publicate', 'Punctualitate 22%, plată integrală 18%, constanță 13%, tendință 13%, cazier curat 14%, durata relației 8%, cost de finanțare 12%. Clasa A de la 86, B de la 78, C de la 66, D sub aceasta.'],
    ],
    limitsH: 'Ce nu face',
    limits: ['Registre externe de credit (BPI, CIP sau un birou de credit)', 'Incidente juridice, dacă nu le declarați în fișier', 'Un rating de credit reglementat', 'Persoane fizice — nu încărcați o listă de persoane fizice; folosiți doar clienți persoane juridice', 'O schimbare a limitei de credit — aceasta rămâne decizia unui om'],
    limitsNote: 'Simon G., platforma completă, face același calcul în fiecare noapte din sistemele dumneavoastră și păstrează evidența fiecărei decizii de limită. Nici acolo nu sunt conectate registrele externe de incidente.',
    faqH: 'Întrebări',
    faq: [
      ['Unde ajung datele mele?', 'Nicăieri. Fișierul este citit de browser, iar calculul se face pe calculatorul dumneavoastră. Pagina are o politică de securitate care interzice orice conexiune spre exterior și nu încarcă niciun script de analiză sau al unor terți.'],
      ['Ce fișier îmi trebuie?', 'O listă de facturi cu client, data facturii, data scadenței, data plății și suma, în format Excel (.xlsx) sau CSV. Facturile neplătite se includ cu data plății goală. Un model se găsește pe această pagină.'],
      ['Cum se calculează scorul?', 'Șapte componente — punctualitate, plată integrală, constanță, tendință, cazier curat, durata relației și cost de finanțare — sunt combinate cu ponderi publicate într-un scor de la 0 la 100 și o clasă de la A la D. Fiecare cifră se poate urmări până la facturile dumneavoastră.'],
      ['Hotărăște ea cui i se dă credit?', 'Nu. Arată cifrele și raționamentul din spatele lor. Un om hotărăște dacă schimbă o limită.'],
      ['Cât costă?', 'Verificarea de credit este gratuită. Simon G., platforma care face același calcul în fiecare noapte, cu aprobări și cu evidența deciziilor, este un produs cu plată, instalat pe infrastructura dumneavoastră.'],
    ],
    footTag: 'Groma — studio de inginerie AI. Construim pentru profesioniști ale căror decizii contează, pe un orizont de generații, nu de trimestre.',
    footNav: [['/', 'Groma'], ['/articole/pana-unde-semneaza-un-om', 'Articole'], [URLS.en, 'English'], ['/confidentialitate', 'Confidențialitate']],
    legal: '© 2026 GROMA S.R.L. · CUI 54804217 · Nr. Reg. Com. J2026035922005 · Timișoara, România',
    legal2: 'Construit de oameni, cu AI — sub poartă umană.',
  },
};

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function page(lang) {
  const x = TEXT[lang], other = lang === 'ro' ? 'en' : 'ro';
  const url = SITE + URLS[lang];
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication', name: lang === 'ro' ? 'Simon G. Verificare credit comercial' : 'Simon G. Credit Check',
        applicationCategory: 'BusinessApplication', operatingSystem: 'Any (web browser)', url, inLanguage: lang,
        description: x.desc, offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
        publisher: { '@id': SITE + '/#org' },
        featureList: ['Transparent scorecard per customer', 'Class A to D with published weights', 'Trend over the last six to eighteen months', 'Yearly cost of late payment and share of margin eaten', 'Runs locally in the browser; no data upload'],
      },
      { '@type': 'FAQPage', mainEntity: x.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    ],
  };
  const v = '?v=' + stamp;
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; worker-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'none'">
  <title>${esc(x.title)}</title>
  <meta name="description" content="${esc(x.desc)}">
  <link rel="icon" type="image/svg+xml" href="/assets/groma-mark.svg">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="canonical" href="${url}">
  <link rel="alternate" hreflang="ro" href="${SITE + URLS.ro}">
  <link rel="alternate" hreflang="en" href="${SITE + URLS.en}">
  <link rel="alternate" hreflang="x-default" href="${SITE + URLS.en}">
  <meta property="og:title" content="${esc(x.ogTitle)}">
  <meta property="og:description" content="${esc(x.desc)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="Groma">
  <meta property="og:locale" content="${x.ogLocale}">
  <meta property="og:image" content="${SITE + x.ogImage}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="stylesheet" href="/assets/fonts/fonts.css">
  <link rel="stylesheet" href="/assets/styles.css">
  <link rel="stylesheet" href="/simon-g/app/stock-check.css${v}">
  <link rel="stylesheet" href="/simon-g/credit/credit.css${v}">
  <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
</head>
<body>

<div class="rail"></div>

<header class="site-header">
  <div class="inner">
    <a class="brand" href="${x.home}">
      <img src="/assets/groma-mark.svg" alt="Groma">
      <span class="divider"></span>
      <span class="wordmark">GROMA</span>
    </a>
    <nav class="site-nav">
${x.nav.map(([h, l]) => `      <a href="${h}">${esc(l)}</a>`).join('\n')}
      <a class="lang" href="${URLS[other]}">${x.langLabel}</a>
    </nav>
  </div>
</header>

<main class="sg">
  <section class="sg-hero">
    <p class="eyebrow">${esc(x.eyebrow)}</p>
    <div class="roofline"></div>
    <h1>${esc(x.h1)}</h1>
    <p class="sg-lead">${esc(x.lead)}</p>
    <p class="sg-trust"><strong>${esc(x.trustB)}</strong>${esc(x.trust)}</p>
  </section>

  <section class="sg-card" id="step-invoices">
    <h2><span class="sg-n">1</span> ${esc(x.s1)}</h2>
    <p class="sg-hint">${esc(x.s1hint)}</p>
    <div class="sg-row">
      <input type="file" id="invoicesFile" accept=".xlsx,.xlsm,.csv,.txt,.tsv,text/csv" class="sg-file">
      <label class="sg-btn solid" for="invoicesFile">${esc(x.chooseInvoices)}</label>
      <button class="sg-btn" id="sampleBtn" type="button">${esc(x.sample)}</button>
      <span class="sg-fname" id="invoicesName"></span>
    </div>
    <details class="sg-templates">
      <summary>${esc(x.tplH)}</summary>
      <p class="sg-hint">${esc(x.tplHint)}</p>
      <div class="sg-table-wrap"><table class="sg-tpl">
        <thead><tr><th scope="col">${esc(x.tplLabel)}</th><th scope="col"></th></tr></thead>
        <tbody><tr><th scope="row">${esc(x.tplLabel)}</th>
          <td>${esc(x.tplDesc)}<span class="sg-dl"><a href="/simon-g/credit/templates/simon-g-credit-invoices.xlsx" download>Excel</a><a href="/simon-g/credit/templates/simon-g-credit-invoices.csv" download>CSV</a></span></td></tr></tbody>
      </table></div>
    </details>
    <div id="invoicesMap" class="sg-mapping sg-hidden"></div>
    <div id="invoicesPreview" class="sg-preview sg-hidden"></div>
  </section>

  <section class="sg-card" id="step-settings">
    <h2><span class="sg-n">2</span> ${esc(x.s2)}</h2>
    <p class="sg-hint">${esc(x.s2hint)}</p>
    <div class="sg-grid">
      <label>${esc(x.a_asOf)}<input type="date" id="asOfDate"></label>
      <label>${esc(x.a_margin)}<input type="number" id="marginRate" min="0" max="100" step="0.5" value="20"></label>
      <label>${esc(x.a_wacc)}<input type="number" id="waccRate" min="0" max="100" step="0.5" value="10"></label>
    </div>
    <p class="sg-hint">${esc(x.a_asOfHint)}</p>
    <div class="sg-row">
      <button class="sg-btn solid big" id="runBtn" type="button" disabled>${esc(x.run)}</button>
      <span id="progress" class="sg-progress" role="status"></span>
    </div>
  </section>

  <section id="results" class="sg-hidden">
    <h2 class="sg-res-title">${esc(x.results)} <span id="asOf" class="sg-muted sg-small"></span></h2>
    <div id="tiles" class="sg-tiles"></div>
    <div id="readNotes" class="sg-notes"></div>
    <div class="sg-row sg-tools">
      <input type="search" id="filter" placeholder="${esc(x.filter)}" aria-label="${esc(x.filter)}">
      <select id="statusFilter" aria-label="${esc(x.statusAria)}"></select>
      <button class="sg-btn" id="exportBtn" type="button">${esc(x.exportBtn)}</button>
      <button class="sg-btn" id="printBtn" type="button">${esc(x.print)}</button>
    </div>
    <div class="sg-table-wrap"><table id="table" class="sg-data"></table></div>
    <p class="sg-muted sg-small" id="tableNote"></p>
  </section>

  <section class="sg-card sg-next sg-hidden" id="next">
    <h2>${esc(x.nextH)}</h2>
    <p>${esc(x.next1)}</p>
    <p>${esc(x.next2)} <a href="mailto:${x.contact}">${x.contact}</a></p>
    <p><a href="${x.methodLink[0]}">${esc(x.methodLink[1])}</a></p>
  </section>

  <section class="sg-what">
    <h2>${esc(x.whatH)}</h2>
    <p class="sg-lead">${esc(x.whatLead)}</p>
    <div class="sg-cards">
${x.what.map(([h, p], i) => `      <div class="sg-cardlet"><span class="sg-num">${String(i + 1).padStart(2, '0')}</span><h3>${esc(h)}</h3><p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p></div>`).join('\n')}
    </div>
    <h3 class="sg-sub">${esc(x.limitsH)}</h3>
    <ul class="sg-limits">${x.limits.map(l => `<li>${esc(l)}</li>`).join('')}</ul>
    <p class="sg-hint">${esc(x.limitsNote)}</p>
  </section>

  <section class="sg-feedback">
    <h2>${lang === 'ro' ? 'Ceva a ieșit greșit sau neclar?' : 'Was something wrong or unclear?'}</h2>
    <p>${lang === 'ro'
      ? 'Scrieți-ne ce s-a întâmplat și ne uităm. Descrieți problema în cuvinte și nu atașați datele dumneavoastră.'
      : 'Tell us what happened and we will look at it. Describe the problem in words and do not attach your data.'}
      <a href="mailto:contact@groma.ro?subject=Simon%20G.%20Credit%20Check">contact@groma.ro</a></p>
  </section>

  <section class="sg-faq">
    <h2>${esc(x.faqH)}</h2>
${x.faq.map(([q, a]) => `    <h3>${esc(q)}</h3>\n    <p>${esc(a)}</p>`).join('\n')}
  </section>
</main>

<div id="drawer" class="sg sg-drawer sg-hidden" role="dialog" aria-modal="true" aria-labelledby="drawerTitle">
  <div class="sg-drawer-body">
    <button class="sg-close" id="drawerClose" type="button" aria-label="${esc(x.close)}">×</button>
    <div id="drawerContent"></div>
  </div>
</div>

<footer class="site-footer">
  <div class="inner">
    <div>
      <img src="/assets/groma-mark-reversed.svg" alt="Groma">
      <p class="tag">${esc(x.footTag)}</p>
    </div>
    <nav>
${x.footNav.map(([h, l]) => `      <a href="${h}">${esc(l)}</a>`).join('\n')}
    </nav>
    <div class="legal">
      <span>${esc(x.legal)}</span>
      <span>${esc(x.legal2)}</span>
    </div>
  </div>
</footer>

<script src="/simon-g/app/parse.js${v}"></script>
<script src="/simon-g/app/xlsx.js${v}"></script>
<script src="/simon-g/credit/credit-i18n.js${v}"></script>
<script src="/simon-g/credit/credit-calc.js${v}"></script>
<script src="/simon-g/credit/credit-app.js${v}"></script>
</body>
</html>
`;
}

fs.mkdirSync(path.join(root, 'pages'), { recursive: true });
for (const lang of ['ro', 'en']) {
  fs.writeFileSync(path.join(root, 'pages', lang + '.html'), page(lang));
  console.log('pages/' + lang + '.html');
}
