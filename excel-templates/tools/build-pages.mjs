// Builds the four landing pages of the free Excel templates (two templates, two languages).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://groma.ro';
const FILES = '/simon-g/excel/';

const SHELL = {
  en: {
    home: '/en/', nav: [['/en/simon-g', 'Simon G.'], ['/en/simon-g/method', 'Method'], ['/en/#writing', 'Writing'], ['/en/#contact', 'Contact']],
    langLabel: 'RO', ogLocale: 'en_US', ogImage: '/assets/og/og-en.png',
    footTag: 'Groma — AI engineering studio. We build for professionals whose decisions carry weight, on a horizon of generations, not quarters.',
    footNav: [['/en/', 'Groma'], ['/en/simon-g', 'Simon G.'], ['/en/privacy', 'Privacy']],
    legal: '© 2026 GROMA S.R.L. · CUI 54804217 · Trade Reg. J2026035922005 · Timișoara, Romania',
    legal2: 'Built by humans, with AI — behind a human gate.',
    eyebrow: 'Simon G. · Excel template · free', download: 'Download the Excel file', other: 'Română',
    fillH: 'What you fill in', formulaH: 'The formulas', exampleH: 'A worked example', limitsH: 'What a spreadsheet cannot see',
    faqH: 'Questions', moreH: 'The other free template', size: 'Excel workbook (.xlsx), no macros, no sign-up.',
  },
  ro: {
    home: '/', nav: [['/simon-g', 'Simon G.'], ['/simon-g/metoda', 'Metodă'], ['/#articole', 'Articole'], ['/#contact', 'Contact']],
    langLabel: 'EN', ogLocale: 'ro_RO', ogImage: '/assets/og/og-ro.png',
    footTag: 'Groma — studio de inginerie AI. Construim pentru profesioniști ale căror decizii contează, pe un orizont de generații, nu de trimestre.',
    footNav: [['/', 'Groma'], ['/simon-g', 'Simon G.'], ['/confidentialitate', 'Confidențialitate']],
    legal: '© 2026 GROMA S.R.L. · CUI 54804217 · Nr. Reg. Com. J2026035922005 · Timișoara, România',
    legal2: 'Construit de oameni, cu AI — sub poartă umană.',
    eyebrow: 'Simon G. · Model Excel · gratuit', download: 'Descărcați fișierul Excel', other: 'English',
    fillH: 'Ce completați', formulaH: 'Formulele', exampleH: 'Un exemplu calculat', limitsH: 'Ce nu poate vedea un tabel',
    faqH: 'Întrebări', moreH: 'Celălalt model gratuit', size: 'Fișier Excel (.xlsx), fără macrocomenzi, fără cont.',
  },
};

const PAGES = {
  stock: {
    url: { en: '/en/simon-g/safety-stock-excel-template', ro: '/simon-g/model-excel-stoc-de-siguranta' },
    out: { en: 'en/simon-g/safety-stock-excel-template.html', ro: 'simon-g/model-excel-stoc-de-siguranta.html' },
    file: { en: 'simon-g-safety-stock-reorder-point.xlsx', ro: 'simon-g-stoc-de-siguranta-punct-de-comanda.xlsx' },
    en: {
      title: 'Safety stock and reorder point Excel template, free, with the formulas explained | Simon G.',
      desc: 'A free Excel workbook that calculates safety stock, reorder point, order-up-to level and a proposed order for up to 300 products. The formulas are open and explained, with a worked example.',
      h1: 'Safety stock and reorder point: a free Excel template',
      lead: 'The workbook calculates safety stock, reorder point and a proposed order for up to 300 products. Every formula is open, and explained below.',
      fill: ['Average units sold per day', 'Standard deviation of daily sales', 'Lead time, in days', 'Variation of the lead time, in days', 'How often you review orders, in days',
        'Service level', 'Stock on hand and stock on order', 'Pack size, minimum order quantity and unit cost'],
      fillNote: 'If you do not know the average and the standard deviation, the second sheet calculates them from the daily sales of one product.',
      formulas: [
        ['Safety stock', 'service factor × √[ (lead time + review period) × σ² of daily sales + (average daily sales)² × σ² of lead time ]',
          'The first part covers the variation of demand over the days until the next delivery you can still influence. The second covers a supplier who delivers late.'],
        ['Reorder point', 'average daily sales × lead time + safety stock', 'When stock on hand and on order falls to this level, an order is due.'],
        ['Order up to', 'average daily sales × (lead time + review period) + safety stock', 'The level an order should bring you back to.'],
        ['Proposed order', 'order up to − on hand − on order', 'Never below zero, rounded up to the pack size and raised to the minimum order quantity.'],
        ['Service factor', '=NORMSINV(service level)', 'The number of standard deviations that gives the service level. 95% gives 1.64, 98% gives 2.05.'],
      ],
      example: {
        lead: 'A product sells 16 units a day, with a standard deviation of 6. The supplier delivers in 21 days, give or take 4. You review orders every 7 days and want a 97% service level.',
        rows: [['Service factor', '1.88'], ['Safety stock', '1.88 × √(28 × 6² + 16² × 4²) = 1.88 × 71.4 = 135'], ['Reorder point', '16 × 21 + 135 = 471'],
          ['Order up to', '16 × 28 + 135 = 583'], ['Proposed order', '583 − 96 on hand − 360 on order = 127, rounded up to packs of 12 = 132']],
      },
      limits: [
        'A day when the product was out of stock looks like a day with no demand. The average comes out too low, and the next order is too small.',
        'Season, trend and day of the week are ignored. One average stands for the whole year.',
        'Every product is filled in by hand, and the figures go stale the day after.',
      ],
      cta: ['The free Stock Check does these from your transactions file. It rebuilds the stock of every day, corrects the out-of-stock days, tests several forecasting methods per product and proposes the orders for all products at once. It runs in your browser and the file is not uploaded.',
        '/en/simon-g/stock-check', 'Open the Stock Check'],
      faq: [
        ['Which service level should I choose?', 'A higher level for products that matter more and sell steadily, a lower one for slow and erratic products. 98% for the top sellers and 90% for the slow ones is a common starting point. Each extra point costs more stock than the one before.'],
        ['What if I do not know the variation of the lead time?', 'Write 0 and the formula covers demand only. If your supplier is sometimes a week late, a variation of 3 to 4 days is a fair first guess.'],
        ['Why is the review period in the formula?', 'If you place orders once a week, an order placed today must last until the delivery of next week\'s order. The stock has to cover the lead time plus the days between two orders.'],
        ['Does it work outside Excel?', 'The workbook uses standard functions and no macros. We tested it in Excel.'],
        ['May I change it and share it?', 'Yes, freely, with or without credit.'],
      ],
      more: ['Cash conversion cycle and working capital days', 'working'],
    },
    ro: {
      title: 'Model Excel pentru stocul de siguranță și punctul de comandă, gratuit, cu formulele explicate | Simon G.',
      desc: 'Un fișier Excel gratuit care calculează stocul de siguranță, punctul de comandă, nivelul până la care se comandă și o comandă propusă pentru cel mult 300 de produse. Formulele sunt la vedere și explicate, cu un exemplu calculat.',
      h1: 'Stocul de siguranță și punctul de comandă: un model Excel gratuit',
      lead: 'Fișierul calculează stocul de siguranță, punctul de comandă și o comandă propusă pentru cel mult 300 de produse. Fiecare formulă este la vedere și explicată mai jos.',
      fill: ['Media bucăților vândute pe zi', 'Abaterea standard a vânzărilor zilnice', 'Termenul de livrare, în zile', 'Variația termenului de livrare, în zile', 'La câte zile revizuiți comenzile',
        'Nivelul de serviciu', 'Stocul curent și ce este deja comandat', 'Bucățile pe ambalaj, cantitatea minimă de comandă și costul unitar'],
      fillNote: 'Dacă nu știți media și abaterea standard, a doua foaie le calculează din vânzările zilnice ale unui produs.',
      formulas: [
        ['Stocul de siguranță', 'factorul de serviciu × √[ (termen de livrare + perioada de revizuire) × σ² a vânzărilor zilnice + (media vânzărilor zilnice)² × σ² a termenului de livrare ]',
          'Prima parte acoperă variația cererii pe zilele până la următoarea livrare pe care o mai puteți influența. A doua acoperă un furnizor care întârzie.'],
        ['Punctul de comandă', 'media vânzărilor zilnice × termenul de livrare + stocul de siguranță', 'Când stocul curent plus ce este deja comandat coboară la acest nivel, este timpul pentru o comandă.'],
        ['Comandă până la', 'media vânzărilor zilnice × (termen de livrare + perioada de revizuire) + stocul de siguranță', 'Nivelul la care trebuie să vă readucă o comandă.'],
        ['Comanda propusă', 'comandă până la − stoc curent − deja comandat', 'Niciodată sub zero, rotunjită în sus la ambalaj și ridicată la cantitatea minimă de comandă.'],
        ['Factorul de serviciu', '=NORMSINV(nivelul de serviciu)', 'Numărul de abateri standard care dă nivelul de serviciu. 95% dă 1,64, iar 98% dă 2,05.'],
      ],
      example: {
        lead: 'Un produs se vinde în medie cu 16 bucăți pe zi, cu o abatere standard de 6. Furnizorul livrează în 21 de zile, plus sau minus 4. Revizuiți comenzile la 7 zile și vreți un nivel de serviciu de 97%.',
        rows: [['Factorul de serviciu', '1,88'], ['Stocul de siguranță', '1,88 × √(28 × 6² + 16² × 4²) = 1,88 × 71,4 = 135'], ['Punctul de comandă', '16 × 21 + 135 = 471'],
          ['Comandă până la', '16 × 28 + 135 = 583'], ['Comanda propusă', '583 − 96 în stoc − 360 deja comandate = 127, rotunjit în sus la ambalaje de 12 = 132']],
      },
      limits: [
        'O zi în care produsul a lipsit din stoc arată ca o zi fără cerere. Media iese prea mică, iar următoarea comandă este prea mică.',
        'Sezonul, tendința și ziua săptămânii nu sunt luate în seamă. O singură medie ține loc de tot anul.',
        'Fiecare produs se completează de mână, iar cifrele sunt vechi chiar de a doua zi.',
      ],
      cta: ['Verificarea de stoc, gratuită, face aceste lucruri din fișierul dumneavoastră de tranzacții. Reface stocul fiecărei zile, corectează zilele fără stoc, încearcă mai multe metode de prognoză pentru fiecare produs și propune comenzile pentru toate produsele deodată. Rulează în browser, iar fișierul nu este trimis nicăieri.',
        '/simon-g/verificare-stoc', 'Deschideți verificarea de stoc'],
      faq: [
        ['Ce nivel de serviciu să aleg?', 'Unul mai mare pentru produsele importante, care se vând constant, și unul mai mic pentru cele lente și neregulate. 98% pentru cele mai vândute și 90% pentru cele lente este un punct de plecare obișnuit. Fiecare punct în plus costă mai mult stoc decât cel dinainte.'],
        ['Ce fac dacă nu știu variația termenului de livrare?', 'Scrieți 0, iar formula acoperă doar cererea. Dacă furnizorul întârzie uneori o săptămână, o variație de 3–4 zile este o primă estimare rezonabilă.'],
        ['De ce apare perioada de revizuire în formulă?', 'Dacă dați comenzi o dată pe săptămână, comanda de astăzi trebuie să ajungă până la livrarea comenzii de săptămâna viitoare. Stocul trebuie să acopere termenul de livrare plus zilele dintre două comenzi.'],
        ['Merge și în afara Excelului?', 'Fișierul folosește funcții standard și nu are macrocomenzi. L-am verificat în Excel.'],
        ['Îl pot schimba și da mai departe?', 'Da, liber, cu sau fără menționarea sursei.'],
      ],
      more: ['Ciclul de numerar și zilele de capital de lucru', 'working'],
    },
  },
  working: {
    url: { en: '/en/simon-g/cash-conversion-cycle-excel-template', ro: '/simon-g/model-excel-capital-de-lucru' },
    out: { en: 'en/simon-g/cash-conversion-cycle-excel-template.html', ro: 'simon-g/model-excel-capital-de-lucru.html' },
    file: { en: 'simon-g-working-capital-days.xlsx', ro: 'simon-g-zile-capital-de-lucru.xlsx' },
    en: {
      title: 'Cash conversion cycle Excel template: days of stock, days to collect, days to pay | Simon G.',
      desc: 'A free Excel workbook that calculates days of stock, days to collect, days to pay and the cash conversion cycle for two years, shows what one day is worth, and how much cash a few days would release.',
      h1: 'Cash conversion cycle and working capital days: a free Excel template',
      lead: 'Five figures per year give the days your money stays in stock and in receivables, the days your suppliers finance you, and what one day is worth.',
      fill: ['Revenue', 'Cost of goods sold', 'Stock at year end', 'Receivables from customers at year end', 'Payables to suppliers at year end'],
      fillNote: 'All five are in the annual balance sheet and the profit and loss account. Fill in two years to see the change.',
      formulas: [
        ['Days of stock', 'stock ÷ cost of goods sold × 365', 'How long goods stay in the warehouse before they are sold.'],
        ['Days to collect', 'receivables ÷ revenue × 365', 'How long customers take to pay.'],
        ['Days to pay', 'payables ÷ cost of goods sold × 365', 'How long you take to pay suppliers.'],
        ['Cash cycle', 'days of stock + days to collect − days to pay', 'The days between paying your supplier and being paid by your customer.'],
        ['One day is worth', 'cost of goods sold ÷ 365, and revenue ÷ 365', 'What you would release by taking one day out of stock, or one day out of collection.'],
      ],
      example: {
        lead: 'A distributor with a revenue of 48.2 million and a cost of goods sold of 37.1 million holds 9.4 million of stock, is owed 7.9 million and owes suppliers 6.1 million.',
        rows: [['Days of stock', '9.4 ÷ 37.1 × 365 = 92'], ['Days to collect', '7.9 ÷ 48.2 × 365 = 60'], ['Days to pay', '6.1 ÷ 37.1 × 365 = 60'],
          ['Cash cycle', '92 + 60 − 60 = 92 days'], ['One day of stock', '37.1 million ÷ 365 = 101,644'],
          ['Ten days of stock and five of collection', '10 × 101,644 + 5 × 132,055 = 1,676,712 released']],
      },
      limits: [
        'Year-end balances are one day out of 365. A company that empties its warehouse in December looks better than it is.',
        'The figures do not say which products hold the stock.',
        'They do not say which customers pay late.',
      ],
      cta: ['The free Working Capital Check does this calculation in your browser and explains each figure. The Stock Check then shows which products hold the excess, and the Credit Check which customers pay late. Nothing you enter leaves your computer.',
        '/en/simon-g/working-capital', 'Open the Working Capital Check'],
      faq: [
        ['Should I use cost of goods sold or revenue for stock?', 'Cost of goods sold. Stock is carried at cost, so dividing it by revenue makes the days look shorter than they are.'],
        ['What is a good cash cycle?', 'It depends on the trade. Compare with your own previous years first. A cycle that grows while revenue stays flat means more money is standing still.'],
        ['Can the cycle be negative?', 'Yes. A company paid by customers before it pays suppliers has a negative cycle. It is common in retail.'],
        ['May I change it and share it?', 'Yes, freely, with or without credit.'],
      ],
      more: ['Safety stock and reorder point', 'stock'],
    },
    ro: {
      title: 'Model Excel pentru ciclul de numerar: zile de stoc, zile până la încasare, zile până la plată | Simon G.',
      desc: 'Un fișier Excel gratuit care calculează zilele de stoc, zilele până la încasare, zilele până la plată și ciclul de numerar pe doi ani, arată cât valorează o zi și câți bani ar elibera câteva zile.',
      h1: 'Ciclul de numerar și zilele de capital de lucru: un model Excel gratuit',
      lead: 'Cinci cifre pe an arată câte zile stau banii în stocuri și în creanțe, câte zile vă finanțează furnizorii și cât valorează o zi.',
      fill: ['Cifra de afaceri', 'Costul mărfurilor vândute', 'Stocurile la sfârșitul anului', 'Creanțele de la clienți la sfârșitul anului', 'Datoriile către furnizori la sfârșitul anului'],
      fillNote: 'Toate cinci se găsesc în bilanțul anual și în contul de profit și pierdere. Completați doi ani ca să vedeți schimbarea.',
      formulas: [
        ['Zile de stoc', 'stocuri ÷ costul mărfurilor vândute × 365', 'Cât stă marfa în depozit până se vinde.'],
        ['Zile până la încasare', 'creanțe ÷ cifra de afaceri × 365', 'În cât timp plătesc clienții.'],
        ['Zile până la plată', 'datorii către furnizori ÷ costul mărfurilor vândute × 365', 'În cât timp plătiți furnizorii.'],
        ['Ciclul de numerar', 'zile de stoc + zile până la încasare − zile până la plată', 'Zilele dintre plata furnizorului și încasarea de la client.'],
        ['Cât valorează o zi', 'costul mărfurilor vândute ÷ 365, respectiv cifra de afaceri ÷ 365', 'Cât ați elibera scoțând o zi din stoc sau o zi din încasare.'],
      ],
      example: {
        lead: 'Un distribuitor cu o cifră de afaceri de 48,2 milioane și un cost al mărfurilor vândute de 37,1 milioane are stocuri de 9,4 milioane, creanțe de 7,9 milioane și datorii către furnizori de 6,1 milioane.',
        rows: [['Zile de stoc', '9,4 ÷ 37,1 × 365 = 92'], ['Zile până la încasare', '7,9 ÷ 48,2 × 365 = 60'], ['Zile până la plată', '6,1 ÷ 37,1 × 365 = 60'],
          ['Ciclul de numerar', '92 + 60 − 60 = 92 de zile'], ['O zi de stoc', '37,1 milioane ÷ 365 = 101.644'],
          ['Zece zile de stoc și cinci de încasare', '10 × 101.644 + 5 × 132.055 = 1.676.712 eliberați']],
      },
      limits: [
        'Soldurile de la sfârșitul anului sunt o zi din 365. O firmă care își golește depozitul în decembrie arată mai bine decât este.',
        'Cifrele nu spun ce produse țin stocul.',
        'Nu spun nici ce clienți plătesc târziu.',
      ],
      cta: ['Verificarea capitalului de lucru, gratuită, face acest calcul în browser și explică fiecare cifră. Verificarea de stoc arată apoi ce produse țin surplusul, iar verificarea de credit ce clienți plătesc târziu. Nimic din ce scrieți nu părăsește calculatorul.',
        '/simon-g/capital-de-lucru', 'Deschideți verificarea capitalului de lucru'],
      faq: [
        ['Pentru stocuri folosesc costul mărfurilor vândute sau cifra de afaceri?', 'Costul mărfurilor vândute. Stocul este ținut la cost, așa că împărțirea la cifra de afaceri face ca zilele să pară mai puține decât sunt.'],
        ['Care este un ciclu de numerar bun?', 'Depinde de domeniu. Comparați mai întâi cu anii dumneavoastră anteriori. Un ciclu care crește în timp ce cifra de afaceri stă pe loc înseamnă că mai mulți bani stau degeaba.'],
        ['Poate fi ciclul negativ?', 'Da. O firmă care încasează de la clienți înainte să-și plătească furnizorii are un ciclu negativ. Este obișnuit în comerțul cu amănuntul.'],
        ['Îl pot schimba și da mai departe?', 'Da, liber, cu sau fără menționarea sursei.'],
      ],
      more: ['Stocul de siguranță și punctul de comandă', 'stock'],
    },
  },
};

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function page(id, lang) {
  const P = PAGES[id], x = P[lang], s = SHELL[lang], other = lang === 'ro' ? 'en' : 'ro';
  const url = SITE + P.url[lang];
  const file = FILES + P.file[lang];
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'DigitalDocument', name: x.h1, description: x.desc, url, inLanguage: lang, encodingFormat: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        isAccessibleForFree: true, publisher: { '@id': SITE + '/#org' } },
      { '@type': 'FAQPage', mainEntity: x.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    ],
  };
  const btn = `<a class="btn solid" href="${file}" download data-track="${esc(P.file[lang])}">${esc(s.download)}</a>`;
  const moreId = x.more[1];
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
  <link rel="alternate" hreflang="ro" href="${SITE + P.url.ro}">
  <link rel="alternate" hreflang="en" href="${SITE + P.url.en}">
  <link rel="alternate" hreflang="x-default" href="${SITE + P.url.en}">
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
  <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
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
      <a class="lang" href="${P.url[other]}">${s.langLabel}</a>
    </nav>
  </div>
</header>

<main>
  <section class="hero hub-hero">
    <div>
      <p class="eyebrow">${esc(s.eyebrow)}</p>
      <div class="roofline"></div>
      <h1>${esc(x.h1)}</h1>
      <p class="lead">${esc(x.lead)}</p>
      <div class="cta-row">
        ${btn}
      </div>
      <p class="xl-note">${esc(s.size)}</p>
    </div>
  </section>

  <section class="section">
    <h2>${esc(s.fillH)}</h2>
    <ul class="hub-list">
${x.fill.map(f => `      <li>${esc(f)}</li>`).join('\n')}
    </ul>
    <p class="xl-note">${esc(x.fillNote)}</p>
  </section>

  <section class="section">
    <h2>${esc(s.formulaH)}</h2>
    <dl class="xl-formulas">
${x.formulas.map(([n, f, w]) => `      <dt>${esc(n)}</dt>\n      <dd><code>${esc(f)}</code><p>${esc(w)}</p></dd>`).join('\n')}
    </dl>
  </section>

  <section class="section">
    <h2>${esc(s.exampleH)}</h2>
    <p class="lead">${esc(x.example.lead)}</p>
    <div class="hub-table-wrap">
      <table class="hub-table xl-table">
        <tbody>
${x.example.rows.map(([k, v]) => `          <tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('\n')}
        </tbody>
      </table>
    </div>
  </section>

  <section class="section">
    <h2>${esc(s.limitsH)}</h2>
    <ul class="hub-list">
${x.limits.map(f => `      <li>${esc(f)}</li>`).join('\n')}
    </ul>
    <p class="lead">${esc(x.cta[0])}</p>
    <div class="cta-row">
      <a class="btn solid" href="${x.cta[1]}">${esc(x.cta[2])}</a>
      ${btn.replace('btn solid', 'btn ghost')}
    </div>
  </section>

  <section class="section">
    <h2>${esc(s.faqH)}</h2>
    <div class="hub-faq">
${x.faq.map(([q, a]) => `      <h3>${esc(q)}</h3>\n      <p>${esc(a)}</p>`).join('\n')}
    </div>
    <p class="xl-note">${esc(s.moreH)}: <a href="${PAGES[moreId].url[lang]}">${esc(x.more[0])}</a></p>
  </section>
</main>

<footer class="site-footer">
  <div class="inner">
    <div>
      <img src="/assets/groma-mark-reversed.svg" alt="Groma">
      <p class="tag">${esc(s.footTag)}</p>
    </div>
    <nav>
${s.footNav.concat([[P.url[other], s.other]]).map(([h, l]) => `      <a href="${h}">${esc(l)}</a>`).join('\n')}
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

const out = path.join(root, 'pages');
for (const id of Object.keys(PAGES)) for (const lang of ['en', 'ro']) {
  const f = path.join(out, PAGES[id].out[lang]);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, page(id, lang));
  console.log(PAGES[id].out[lang]);
}
fs.writeFileSync(path.join(out, 'urls.json'), JSON.stringify(Object.values(PAGES).map(p => p.url), null, 1));
