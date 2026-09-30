// Builds the two language pages of the Working Capital Check from one template, so they cannot drift apart.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://groma.ro';
const URLS = { ro: '/simon-g/capital-de-lucru', en: '/en/simon-g/working-capital' };
const STOCK_CHECK = { ro: '/simon-g/verificare-stoc', en: '/en/simon-g/stock-check' };
const SIMON_G = { ro: '/simon-g', en: '/en/simon-g' };
const stamp = '20261001a';

const FIELDS = ['revenue', 'cogs', 'stock', 'receivables', 'payables', 'netProfit'];
const OPTIONAL = { revenue: false, cogs: true, stock: false, receivables: false, payables: true, netProfit: true };

const TEXT = {
  en: {
    title: 'Simon G. Working Capital Check — free, computed on your computer',
    desc: 'Free working capital check by Groma. Type a few figures from the last two annual balance sheets and see how much cash is tied up in stock and receivables, how it changed, and what one day is worth. Nothing is sent anywhere.',
    ogTitle: 'Simon G. Working Capital Check — what one day of stock or collection is worth',
    nav: [[SIMON_G.en, 'Simon G.'], [STOCK_CHECK.en, 'Stock Check']],
    langLabel: 'RO', ogLocale: 'en_US', ogImage: '/assets/og/og-en.png',
    eyebrow: 'Simon G. · Working Capital Check · free',
    h1: 'How much cash is tied up in stock and receivables, and what is a day worth?',
    lead: 'Type a few figures from the last two annual balance sheets. You get the days of stock, the days to collect, how they changed and what one day is worth, updated as you type.',
    trustB: 'Nothing you type leaves this page.',
    trust: ' The calculation runs in this browser tab, and the page is built so that it cannot send data anywhere. Your IT department can verify this in the page source.',
    s1: 'Figures from the last two annual balance sheets',
    s1hint: 'Whole figures, in any currency. Revenue, stock and trade receivables are needed for both years; cost of goods sold, trade payables and net profit are optional and sharpen the result.',
    currency: 'Currency (optional)', currencyPlaceholder: 'e.g. lei, EUR',
    example: 'Fill with an example',
    yPrior: 'Year before', yLatest: 'Latest year', optional: 'optional',
    f_revenue: 'Revenue', f_cogs: 'Cost of goods sold', f_stock: 'Stock (inventories)', f_receivables: 'Trade receivables',
    f_payables: 'Trade payables', f_netProfit: 'Net profit',
    resultsH: 'Results', chartH: 'This year against last year, in days',
    nextH: 'From a figure to a controlled process',
    next1: 'This page answers the question once, from two balance sheets. Simon G. works on the same question every night, product by product, on your own server, and keeps a record of what was decided.',
    next2: 'The next step is to see which products hold that cash: the ',
    stockCheckLink: 'Stock Check',
    readH: 'How to read it',
    formulas: [
      ['Days of stock', 'stock \u00f7 (cost of goods sold, or revenue when it is not given) \u00d7 365'],
      ['Days to collect', 'trade receivables \u00f7 revenue \u00d7 365'],
      ['Days to pay', 'trade payables \u00f7 (cost of goods sold, or revenue when it is not given) \u00d7 365'],
      ['Cash conversion cycle', 'days of stock + days to collect \u2212 days to pay'],
      ['One day', '(cost of goods sold, or revenue) \u00f7 365'],
    ],
    limitsH: 'What it does not do',
    limits: ['No comparison against other companies', 'Year-end balances hide what moved during the year', 'It is not an audit of the figures typed in'],
    faqH: 'Questions',
    faq: [
      ['Where do my figures go?', 'Nowhere. The calculation runs in this browser tab. The page carries a security policy that forbids every outgoing connection, and it loads no analytics or third-party scripts.'],
      ['What if I do not have cost of goods sold?', 'Days of stock and days to pay are then computed on revenue instead, and the page says so next to the figure. The days will run a little higher than if cost of goods sold had been used, since revenue includes margin.'],
      ['Why are receivable days always on revenue?', 'Trade receivables come from sales, so revenue is the figure they are measured against, whether or not cost of goods sold is known.'],
      ['Does the "what if" control predict anything?', 'No. It is arithmetic on last year\u2019s figures: what fewer days of stock or a faster collection would be worth today, at today\u2019s revenue and cost. It is not a plan or a forecast.'],
      ['What does it cost?', 'This check is free. Simon G., the platform that does this every night, product by product, with approvals and a record of decisions, is a paid product installed on your own infrastructure.'],
    ],
    footTag: 'Groma — AI engineering studio. We build for professionals whose decisions carry weight, on a horizon of generations, not quarters.',
    footNav: [['/en/', 'Groma'], ['/en/articles/a-human-signs-where', 'Writing'], [URLS.ro, 'Română'], ['/en/privacy', 'Privacy']],
    legal: '\u00a9 2026 GROMA S.R.L. \u00b7 CUI 54804217 \u00b7 Trade Reg. J2026035922005 \u00b7 Timi\u0219oara, Romania',
    legal2: 'Built by humans, with AI \u2014 behind a human gate.',
    copyBtn: 'Copy the figures', printBtn: 'Print',
    whatIfTitle: 'What if you held stock and collected payment a few days sooner?',
    whatIfLead: 'This is arithmetic on last year\u2019s figures, not a forecast: it shows what fewer days would be worth today.',
    whatIfStockLabel: 'Fewer days of stock', whatIfRecvLabel: 'Sooner to collect, days', whatIfResultLabel: 'Cash this would release',
    sayTitle: 'What the figures say', afterLink: '.',
  },
  ro: {
    title: 'Simon G. Verificare capital de lucru — gratuit, calculat pe calculatorul dumneavoastră',
    desc: 'Verificare gratuită a capitalului de lucru, de la Groma. Introduceți câteva cifre din ultimele două bilanțuri anuale și vedeți cât numerar este ținut în stoc și în creanțe, cum s-a schimbat și cât valorează o zi. Nimic nu este trimis nicăieri.',
    ogTitle: 'Simon G. Verificare capital de lucru — cât valorează o zi de stoc sau de încasare',
    nav: [[SIMON_G.ro, 'Simon G.'], [STOCK_CHECK.ro, 'Verificare stoc']],
    langLabel: 'EN', ogLocale: 'ro_RO', ogImage: '/assets/og/og-ro.png',
    eyebrow: 'Simon G. \u00b7 Verificare capital de lucru \u00b7 gratuit',
    h1: 'Cât numerar este ținut în stoc și în creanțe și cât valorează o zi?',
    lead: 'Introduceți câteva cifre din ultimele două bilanțuri anuale. Primiți zilele de stoc, zilele de încasare, cum s-au schimbat și cât valorează o zi, actualizate pe măsură ce scrieți.',
    trustB: 'Ce scrieți nu părăsește această pagină.',
    trust: ' Calculul se face în această filă de browser, iar pagina este construită astfel încât să nu poată trimite date nicăieri. Departamentul IT poate verifica acest lucru în sursa paginii.',
    s1: 'Cifre din ultimele două bilanțuri anuale',
    s1hint: 'Cifre întregi, în orice monedă. Cifra de afaceri, stocul și creanțele comerciale sunt necesare pentru ambii ani; costul mărfii vândute, datoriile comerciale și profitul net sunt opționale și fac rezultatul mai exact.',
    currency: 'Moneda (opțional)', currencyPlaceholder: 'de ex. lei, EUR',
    example: 'Completați cu un exemplu',
    yPrior: 'Anul anterior', yLatest: 'Anul recent', optional: 'opțional',
    f_revenue: 'Cifra de afaceri', f_cogs: 'Costul mărfii vândute', f_stock: 'Stoc (imobilizări circulante)', f_receivables: 'Creanțe comerciale',
    f_payables: 'Datorii comerciale', f_netProfit: 'Profit net',
    resultsH: 'Rezultate', chartH: 'Anul recent față de anul anterior, în zile',
    nextH: 'De la o cifră la un proces ținut sub control',
    next1: 'Pagina aceasta răspunde la întrebare o singură dată, din două bilanțuri. Simon G. lucrează la aceeași întrebare în fiecare noapte, produs cu produs, pe serverul dumneavoastră, și păstrează evidența a ce s-a hotărât.',
    next2: 'Pasul următor este să vedeți care produse țin acel numerar: ',
    stockCheckLink: 'Verificarea stocului',
    readH: 'Cum se citește',
    formulas: [
      ['Zile de stoc', 'stoc \u00f7 (costul mărfii vândute, sau cifra de afaceri când nu este dat) \u00d7 365'],
      ['Zile de încasare', 'creanțe comerciale \u00f7 cifra de afaceri \u00d7 365'],
      ['Zile de plată', 'datorii comerciale \u00f7 (costul mărfii vândute, sau cifra de afaceri când nu este dat) \u00d7 365'],
      ['Ciclul de conversie a numerarului', 'zile de stoc + zile de încasare \u2212 zile de plată'],
      ['O zi', '(costul mărfii vândute, sau cifra de afaceri) \u00f7 365'],
    ],
    limitsH: 'Ce nu face',
    limits: ['Nu compară cu alte companii', 'Soldurile de la sfârșitul anului ascund ce s-a mișcat în timpul anului', 'Nu este un audit al cifrelor introduse'],
    faqH: 'Întrebări',
    faq: [
      ['Unde ajung cifrele mele?', 'Nicăieri. Calculul se face în această filă de browser. Pagina are o politică de securitate care interzice orice conexiune spre exterior și nu încarcă niciun script de analiză sau al unor terți.'],
      ['Ce fac dacă nu am costul mărfii vândute?', 'Zilele de stoc și de plată se calculează atunci la cifra de afaceri, iar pagina arată acest lucru lângă cifră. Zilele vor ieși ceva mai mari decât dacă s-ar fi folosit costul mărfii vândute, pentru că cifra de afaceri include și marja.'],
      ['De ce zilele de încasare se calculează mereu la cifra de afaceri?', 'Creanțele comerciale provin din vânzări, așa că cifra de afaceri este cifra față de care se măsoară, indiferent dacă se cunoaște sau nu costul mărfii vândute.'],
      ['Controlul „ce s-ar întâmpla dacă” prezice ceva?', 'Nu. Este aritmetică pe cifrele anului recent: cât ar valora azi mai puține zile de stoc sau o încasare mai rapidă, la cifra de afaceri și costurile de azi. Nu este un plan și nu este o prognoză.'],
      ['Cât costă?', 'Această verificare este gratuită. Simon G., platforma care face acest lucru în fiecare noapte, produs cu produs, cu aprobări și cu evidența deciziilor, este un produs cu plată, instalat pe infrastructura dumneavoastră.'],
    ],
    footTag: 'Groma — studio de inginerie AI. Construim pentru profesioniști ale căror decizii contează, pe un orizont de generații, nu de trimestre.',
    footNav: [['/', 'Groma'], ['/articole/pana-unde-semneaza-un-om', 'Articole'], [URLS.en, 'English'], ['/confidentialitate', 'Confidențialitate']],
    legal: '\u00a9 2026 GROMA S.R.L. \u00b7 CUI 54804217 \u00b7 Nr. Reg. Com. J2026035922005 \u00b7 Timi\u0219oara, Rom\u00e2nia',
    legal2: 'Construit de oameni, cu AI \u2014 sub poart\u0103 uman\u0103.',
    copyBtn: 'Copiați cifrele', printBtn: 'Tipărire',
    whatIfTitle: 'Ce s-ar întâmpla dacă ați ține stocul și ați încasa cu câteva zile mai devreme?',
    whatIfLead: 'Aceasta este aritmetică pe cifrele anului recent, nu o prognoză: arată cât ar valora azi mai puține zile.',
    whatIfStockLabel: 'Cu câte zile mai puțin stoc', whatIfRecvLabel: 'Cu câte zile mai devreme încasarea', whatIfResultLabel: 'Numerar eliberat astfel',
    sayTitle: 'Ce spun cifrele', afterLink: '.',
  },
};

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function yearBlock(x, prefix, label) {
  return `      <div class="sg-year">
        <h3>${esc(label)}</h3>
${FIELDS.map(f => `        <div class="sg-field">
          <label for="${prefix}-${f}">${esc(x['f_' + f])}${OPTIONAL[f] ? ' <span class="sg-opt">' + esc(x.optional) + '</span>' : ''}</label>
          <input type="text" inputmode="decimal" id="${prefix}-${f}" autocomplete="off">
          <div class="sg-warn-inline" id="${prefix}-${f}-warn" role="status"></div>
        </div>`).join('\n')}
      </div>`;
}

function page(lang) {
  const x = TEXT[lang], other = lang === 'ro' ? 'en' : 'ro';
  const url = SITE + URLS[lang];
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication', name: lang === 'ro' ? 'Simon G. Verificare capital de lucru' : 'Simon G. Working Capital Check',
        applicationCategory: 'BusinessApplication', operatingSystem: 'Any (web browser)', url, inLanguage: lang,
        description: x.desc, offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
        publisher: { '@id': SITE + '/#org' },
        featureList: ['Days of stock, days to collect and days to pay from two balance sheets', 'Change from the year before, in days and in money', 'What one day of stock or collection is worth', 'A what-if control for fewer days', 'Runs locally in the browser; nothing is sent anywhere'],
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
  <link rel="stylesheet" href="/simon-g/app/stock-check.css">
  <link rel="stylesheet" href="/simon-g/working-capital/wc.css${v}">
  <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
</head>
<body>

<div class="rail"></div>

<header class="site-header">
  <div class="inner">
    <a class="brand" href="${lang === 'ro' ? '/' : '/en/'}">
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

  <section class="sg-card" id="step-inputs">
    <h2><span class="sg-n">1</span> ${esc(x.s1)}</h2>
    <p class="sg-hint">${esc(x.s1hint)}</p>
    <div class="sg-row">
      <div class="sg-field sg-currency">
        <label for="currency">${esc(x.currency)}</label>
        <input type="text" id="currency" placeholder="${esc(x.currencyPlaceholder)}" autocomplete="off">
      </div>
      <button class="sg-btn" id="exampleBtn" type="button">${esc(x.example)}</button>
    </div>
    <div class="sg-years">
${yearBlock(x, 'y0', x.yPrior)}
${yearBlock(x, 'y1', x.yLatest)}
    </div>
  </section>

  <section id="results">
    <h2 class="sg-res-title">${esc(x.resultsH)}</h2>
    <div id="tiles" class="sg-tiles"></div>

    <h3>${esc(x.chartH)}</h3>
    <div id="chart"></div>

    <div class="sg-whatif">
      <h3>${esc(x.whatIfTitle)}</h3>
      <p class="sg-hint">${esc(x.whatIfLead)}</p>
      <div class="sg-stepper-row">
        <div class="sg-stepper">
          <label for="whatIfStock">${esc(x.whatIfStockLabel)}</label>
          <div class="sg-stepper-control">
            <button type="button" id="whatIfStockMinus" aria-label="minus">&minus;</button>
            <input type="number" id="whatIfStock" value="0" min="0" max="3650" step="1">
            <button type="button" id="whatIfStockPlus" aria-label="plus">+</button>
          </div>
        </div>
        <div class="sg-stepper">
          <label for="whatIfRecv">${esc(x.whatIfRecvLabel)}</label>
          <div class="sg-stepper-control">
            <button type="button" id="whatIfRecvMinus" aria-label="minus">&minus;</button>
            <input type="number" id="whatIfRecv" value="0" min="0" max="3650" step="1">
            <button type="button" id="whatIfRecvPlus" aria-label="plus">+</button>
          </div>
        </div>
        <div class="sg-whatif-result">
          <div class="k">${esc(x.whatIfResultLabel)}</div>
          <div class="v" id="whatIfResult">&mdash;</div>
        </div>
      </div>
    </div>

    <div class="sg-say">
      <h3>${esc(x.sayTitle)}</h3>
      <div id="sentences"></div>
    </div>

    <div class="sg-row sg-copy-row">
      <button class="sg-btn" id="copyBtn" type="button">${esc(x.copyBtn)}</button>
      <button class="sg-btn" id="printBtn" type="button">${esc(x.printBtn)}</button>
      <span id="copyStatus" class="sg-copy-status" role="status"></span>
    </div>
  </section>

  <section class="sg-card sg-next">
    <h2>${esc(x.nextH)}</h2>
    <p>${esc(x.next1)}</p>
    <p>${esc(x.next2)}<a href="${STOCK_CHECK[lang]}">${esc(x.stockCheckLink)}</a>${esc(x.afterLink)}</p>
  </section>

  <section class="sg-what">
    <h2>${esc(x.readH)}</h2>
    <dl class="sg-formulas">
${x.formulas.map(([t2, f]) => `      <dt>${esc(t2)}</dt><dd>${esc(f)}</dd>`).join('\n')}
    </dl>
    <h3 class="sg-sub">${esc(x.limitsH)}</h3>
    <ul class="sg-limits">${x.limits.map(l => `<li>${esc(l)}</li>`).join('')}</ul>
  </section>

  <section class="sg-feedback">
    <h2>${lang === 'ro' ? 'Ceva a ieșit greșit sau neclar?' : 'Was something wrong or unclear?'}</h2>
    <p>${lang === 'ro'
      ? 'Scrieți-ne ce s-a întâmplat și ne uităm. Descrieți problema în cuvinte și nu atașați datele dumneavoastră.'
      : 'Tell us what happened and we will look at it. Describe the problem in words and do not attach your data.'}
      <a href="mailto:contact@groma.ro?subject=Simon%20G.%20Working%20Capital%20Check">contact@groma.ro</a></p>
  </section>

  <section class="sg-faq">
    <h2>${esc(x.faqH)}</h2>
${x.faq.map(([q, a]) => `    <h3>${esc(q)}</h3>\n    <p>${esc(a)}</p>`).join('\n')}
  </section>
</main>

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

<script src="/simon-g/working-capital/wc-calc.js${v}"></script>
<script src="/simon-g/working-capital/wc-i18n.js${v}"></script>
<script src="/simon-g/working-capital/wc.js${v}"></script>
</body>
</html>
`;
}

fs.mkdirSync(path.join(root, 'pages'), { recursive: true });
for (const lang of ['ro', 'en']) {
  fs.writeFileSync(path.join(root, 'pages', lang + '.html'), page(lang));
  console.log('pages/' + lang + '.html');
}
