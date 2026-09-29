// Builds the two language pages from one template, so that they cannot drift apart.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://groma.ro';
const URLS = { ro: '/simon-g/verificare-stoc', en: '/en/simon-g/stock-check' };
const version = JSON.parse(fs.readFileSync(path.join(root, 'app', 'engine.version.json'), 'utf8'));
const RELEASE = '5';
const stamp = version.built.replace(/-/g, '') + '-' + RELEASE;
const TPL = '/simon-g/template/';

const TEXT = {
  en: {
    title: 'Simon G. Stock Check — free forecast, reorder points and order proposals, computed on your computer',
    desc: 'Free stock check by Groma. Load your opening stock and transactions and get, for every product, a demand forecast, reorder point, order proposal and excess stock, each with its reasoning. The file never leaves your computer.',
    ogTitle: 'Simon G. Stock Check — what to order, and what you hold too much of',
    home: '/en/', nav: [['/en/simon-g', 'Simon G.'], ['/en/simon-g/method', 'Method'], ['/en/#writing', 'Writing'], ['/en/#contact', 'Contact']],
    langLabel: 'RO', ogLocale: 'en_US', ogImage: '/assets/og/og-en.png',
    eyebrow: 'Simon G. · Stock Check · free',
    h1: 'What should you order, and what are you holding too much of?',
    lead: 'Load your opening stock and your transactions. You get a forecast, a reorder point and an order proposal for every product, each with the reasoning behind it.',
    trustB: 'Your file never leaves this computer.',
    trust: ' The calculation runs in this browser tab, and the page is built so that it cannot send data anywhere. Your IT department can verify this in the page source.',
    tour: 'Show me how it works', tourHint: 'Seven steps on invented data. It takes about two minutes.',
    s1: 'Opening stock and transactions',
    s1hint: 'An Excel or CSV file with one row per movement: date, product, type and quantity. The types are sale, receipt, return and adjustment. The opening stock is a sheet of its own, or rows of type "opening".',
    chooseMoves: 'Choose your file', sample: 'Try with sample data',
    wsH: 'Used it before?', wsHint: 'Load the workspace file you saved last time, then your new export. Your columns and assumptions come back, and the results are compared with the last run.',
    wsLoad: 'Load your workspace file', wsSave: 'Save workspace', report: 'Management report',
    rpTitleLabel: 'Title on the report', rpPrint: 'Print or save as PDF', rpHint: 'To keep it as a file, choose "Save as PDF" in the print window.',
    tplH: 'Download the template',
    tplHint: 'The template holds a year of invented data. Load it to see the result, then replace the rows with your own. You may keep your own column names.',
    tplXlsx: 'Excel workbook: transactions, opening stock, products', tplCsv1: 'CSV: transactions with opening stock', tplCsv2: 'CSV: products',
    s2: 'Separate files', optional: 'optional',
    s2hint: 'Use these when the opening stock or the product data are in files of their own. Product data: lead time, unit cost, pack size, minimum order quantity, quantity on order, or today\'s stock.',
    chooseOpening: 'Choose opening stock file', chooseProducts: 'Choose product file',
    s3: 'Your assumptions',
    s3hint: 'Nothing is guessed silently. These values are used where your files do not say otherwise, and they are printed in the export.',
    a1: 'Lead time, days', a2: 'Lead time variation, days', a3: 'You review orders every, days',
    a4: 'Never order more than, days of cover', a5: 'Stock is excess above, days of cover',
    a6: 'A day with no sale for a product means nothing was sold',
    limitH: 'Approval limit',
    limitHint: 'Which orders may go ahead on one signature. An order outside the limit needs the signature of the person who owns the decision. With no value written, every order needs it.',
    limitClasses: 'Product classes allowed', limitValue: 'Order value up to', currency: 'Currency code, such as EUR or RON',
    levels: 'Service levels by product class',
    levelsHint: 'A = the products that make up the first 80% of your volume, B the next 15%, C the rest. X = steady demand, Y = variable, Z = erratic. The value is the share of order cycles you want to get through without running out.',
    run: 'Run the stock check', results: 'Results',
    askH: 'Ask the results', askHint: 'Six fixed questions, answered from the figures above. No language model is involved.',
    filter: 'Filter by product code', statusAria: 'Filter by status', exportBtn: 'Export to CSV', recordsBtn: 'Export decision records', print: 'Print', close: 'Close',
    nextH: 'From a one-off check to a controlled process',
    next1: 'This page answers the question once. Simon G. runs it every night on your own server, puts each proposal in front of a named person for approval, keeps the record of who decided what, and measures afterwards what each decision was worth.',
    next2: 'Write to us and we will show it on your own data.',
    methodLink: ['/en/simon-g/method', 'The rules behind it: the Simon G. Method'],
    contact: 'contact@groma.ro',
    whatH: 'What the calculation does',
    whatLead: 'Most planning tools give you a number. This one shows how it reached it, and says what it could not know.',
    what: [
      ['A method has to earn its place', 'For every product, several forecasting methods are tested on past dates they had not seen. A more complex method is used only when it beats a plain moving average by a clear margin, on most of the test dates. The margin it must clear rises with how erratic the product is.'],
      ['It separates what moves demand', 'Day of the week, time of year and trend are measured separately and then put together. The yearly pattern is used only when there are two full years to measure it on.'],
      ['Slow sellers are treated as slow sellers', 'A product that sells on fewer than ten days in ninety is recognised and tested with methods made for irregular demand. They are used when they do better on its own history.'],
      ['Stock is rebuilt day by day', 'From the opening stock and every transaction, the page works out what was on the shelf each day. A day with an empty shelf is corrected, so the forecast describes what customers wanted and not what the shelf allowed.'],
      ['Nine service levels, not one', 'Products are classed by importance (A, B, C) and by how steady their demand is (X, Y, Z). Each of the nine classes has its own service level, which you can change.'],
      ['Safety stock covers two risks', 'It covers the variation of demand and the variation of the supplier\u2019s delivery time, over the days until the next delivery you can influence.'],
      ['The order is built step by step', 'Forecast demand, safety stock, stock you already hold and stock on order, pack size, minimum quantity, and a limit on days of cover. Each step shows what it added or removed.'],
      ['Your limit decides who signs', 'You write which product classes and what order value may go ahead on one signature. Every proposal is checked against it, and can be exported as a decision record in the published Simon G. format.'],
      ['The same file gives the same result', 'The calculation is fixed arithmetic. It does not learn or change between runs, so a result can be checked and repeated. What is missing is reported as missing and is never replaced silently.'],
    ],
    paramsNote: 'Behind the page are 50 parameters, each with a documented range. The page shows the ones that matter most and keeps the rest at their documented values.',
    limitsH: 'What it does not do',
    limits: ['Expiry dates and batches', 'Promotions and holiday calendars', 'Several suppliers for one product', 'Price breaks', 'New products with no history', 'Transfers between locations'],
    limitsNote: 'Simon G., the full platform, covers promotions, several locations and supplier terms. Expiry dates are not covered there either.',
    faqH: 'Questions',
    faq: [
      ['Where does my data go?', 'Nowhere. The file is read by your browser and the calculation runs on your computer. The page carries a security policy that forbids every outgoing connection, and it loads no analytics or third-party scripts.'],
      ['What file do I need?', 'The opening stock and the transactions of at least three months, preferably one to two years, as Excel (.xlsx) or CSV. A stock ledger exported from your own system works with its own column names: the page shows which column it took for what, and lets you say what each transaction type means.'],
      ['Why does it need the opening stock?', 'With the opening stock and every movement since, the stock of each day is known. That gives today\'s stock for the order proposal, and it shows the days when a product was out of stock, which would otherwise look like days without demand.'],
      ['How is the forecast made?', 'For each product several methods are tested on past dates they had not seen. A more complex method is used only if it beats a plain moving average by a clear margin.'],
      ['Can I use it every month?', 'Yes. After a run, save the workspace file. It holds your column choices, your assumptions and the results, and it stays on your computer. Next month load it together with the new export: the page shows what was forecast against what sold, and which proposals were followed.'],
      ['Does it decide what I order?', 'No. It proposes and shows its reasoning. A person decides, and your approval limit says which person.'],
      ['Is there an AI assistant?', 'There are six fixed questions, answered by arithmetic on your results. No language model reads your data, and the same results always give the same answer.'],
      ['What does it cost?', 'The Stock Check is free. Simon G., the platform that runs the same calculation every night with approvals and a record of decisions, is a paid product installed on your own infrastructure.'],
    ],
    footTag: 'Groma — AI engineering studio. We build for professionals whose decisions carry weight, on a horizon of generations, not quarters.',
    footNav: [['/en/', 'Groma'], ['/en/simon-g', 'Simon G.'], [URLS.ro, 'Română'], ['/en/privacy', 'Privacy']],
    legal: '© 2026 GROMA S.R.L. · CUI 54804217 · Trade Reg. J2026035922005 · Timișoara, Romania',
    legal2: 'Built by humans, with AI — behind a human gate.',
  },
  ro: {
    title: 'Simon G. Verificare stoc — prognoză, punct de comandă și propuneri de comandă, calculate gratuit pe calculatorul dumneavoastră',
    desc: 'Verificare gratuită a stocului, de la Groma. Încărcați stocul inițial și tranzacțiile și primiți pentru fiecare produs prognoza cererii, punctul de comandă, propunerea de comandă și surplusul, fiecare cu explicația ei. Fișierul nu părăsește calculatorul.',
    ogTitle: 'Simon G. Verificare stoc — ce comandați și ce țineți în plus',
    home: '/', nav: [['/simon-g', 'Simon G.'], ['/simon-g/metoda', 'Metodă'], ['/#articole', 'Articole'], ['/#contact', 'Contact']],
    langLabel: 'EN', ogLocale: 'ro_RO', ogImage: '/assets/og/og-ro.png',
    eyebrow: 'Simon G. · Verificare stoc · gratuit',
    h1: 'Ce ar trebui să comandați și ce țineți în plus pe stoc?',
    lead: 'Încărcați stocul inițial și tranzacțiile. Pentru fiecare produs primiți prognoza, punctul de comandă și propunerea de comandă, fiecare cu explicația ei.',
    trustB: 'Fișierul nu părăsește acest calculator.',
    trust: ' Calculul se face în această filă de browser, iar pagina este construită astfel încât să nu poată trimite date nicăieri. Departamentul IT poate verifica acest lucru în sursa paginii.',
    tour: 'Arătați-mi cum funcționează', tourHint: 'Șapte pași, pe date inventate. Durează cam două minute.',
    s1: 'Stoc inițial și tranzacții',
    s1hint: 'Un fișier Excel sau CSV cu un rând pe mișcare: data, produsul, tipul și cantitatea. Tipurile sunt vânzare, recepție, retur și ajustare. Stocul inițial stă pe o foaie separată sau în rânduri de tip „opening”.',
    chooseMoves: 'Alegeți fișierul', sample: 'Încercați cu date de probă',
    wsH: 'L-ați mai folosit?', wsHint: 'Încărcați fișierul de lucru salvat data trecută, apoi noul export. Coloanele și ipotezele revin, iar rezultatele sunt comparate cu ultima rulare.',
    wsLoad: 'Încărcați fișierul de lucru', wsSave: 'Salvați fișierul de lucru', report: 'Raport pentru conducere',
    rpTitleLabel: 'Titlul de pe raport', rpPrint: 'Tipăriți sau salvați ca PDF', rpHint: 'Ca să îl păstrați ca fișier, alegeți „Salvare ca PDF” în fereastra de tipărire.',
    tplH: 'Descărcați modelul',
    tplHint: 'Modelul conține un an de date inventate. Încărcați-l ca să vedeți rezultatul, apoi înlocuiți rândurile cu ale dumneavoastră. Puteți păstra numele de coloane din sistemul dumneavoastră.',
    tplXlsx: 'Fișier Excel: tranzacții, stoc inițial, produse', tplCsv1: 'CSV: tranzacții cu stoc inițial', tplCsv2: 'CSV: produse',
    s2: 'Fișiere separate', optional: 'opțional',
    s2hint: 'Folosiți-le când stocul inițial sau datele despre produse sunt în fișiere separate. Date despre produse: termenul de livrare, costul unitar, bucățile pe ambalaj, cantitatea minimă de comandă, cantitatea deja comandată sau stocul de astăzi.',
    chooseOpening: 'Alegeți fișierul cu stocul inițial', chooseProducts: 'Alegeți fișierul de produse',
    s3: 'Ipotezele dumneavoastră',
    s3hint: 'Nimic nu este presupus pe ascuns. Valorile de mai jos se folosesc acolo unde fișierele nu spun altceva și apar scrise în export.',
    a1: 'Termen de livrare, zile', a2: 'Variația termenului de livrare, zile', a3: 'Revizuiți comenzile la fiecare, zile',
    a4: 'Nu comandați niciodată peste, zile de acoperire', a5: 'Stocul este surplus peste, zile de acoperire',
    a6: 'O zi fără nicio vânzare la un produs înseamnă că nu s-a vândut nimic',
    limitH: 'Limita de aprobare',
    limitHint: 'Ce comenzi pot pleca pe o singură semnătură. O comandă în afara limitei cere semnătura celui care răspunde de decizie. Dacă nu scrieți o valoare, toate comenzile o cer.',
    limitClasses: 'Clase de produse permise', limitValue: 'Valoarea comenzii, până la', currency: 'Codul monedei, de exemplu RON sau EUR',
    levels: 'Niveluri de serviciu pe clase de produse',
    levelsHint: 'A = produsele care fac primele 80% din volum, B următoarele 15%, C restul. X = cerere constantă, Y = variabilă, Z = neregulată. Valoarea este ponderea ciclurilor de comandă pe care vreți să le treceți fără să rămâneți fără marfă.',
    run: 'Porniți verificarea', results: 'Rezultate',
    askH: 'Întrebați rezultatele', askHint: 'Șase întrebări fixe, cu răspunsul scos din cifrele de mai sus. Nu este folosit niciun model de limbaj.',
    filter: 'Căutați după codul produsului', statusAria: 'Filtrați după stare', exportBtn: 'Export CSV', recordsBtn: 'Export fișe de decizie', print: 'Tipărire', close: 'Închide',
    nextH: 'De la o verificare făcută o dată la un proces ținut sub control',
    next1: 'Pagina aceasta răspunde la întrebare o singură dată. Simon G. face același calcul în fiecare noapte, pe serverul dumneavoastră, pune fiecare propunere în fața unei persoane cu nume și prenume pentru aprobare, păstrează evidența cine ce a hotărât și măsoară apoi cât a valorat fiecare decizie.',
    next2: 'Scrieți-ne și vi-l arătăm pe datele dumneavoastră.',
    methodLink: ['/simon-g/metoda', 'Regulile din spatele lui: Metoda Simon G.'],
    contact: 'contact@groma.ro',
    whatH: 'Ce face calculul',
    whatLead: 'Cele mai multe instrumente de planificare vă dau un număr. Acesta arată cum a ajuns la el și spune ce nu a avut de unde să știe.',
    what: [
      ['O metodă trebuie să-și câștige locul', 'Pentru fiecare produs se încearcă mai multe metode de prognoză pe date din trecut pe care metoda nu le-a văzut. O metodă mai complexă este folosită numai dacă bate clar media mobilă simplă, la cele mai multe dintre datele de test. Cu cât produsul este mai neregulat, cu atât pragul este mai sus.'],
      ['Desparte ce anume mișcă cererea', 'Ziua din săptămână, perioada din an și tendința se măsoară separat și apoi se pun la un loc. Tiparul anual este folosit doar când există doi ani întregi pe care să fie măsurat.'],
      ['Produsele cu vânzare rară sunt tratate ca atare', 'Un produs care se vinde în mai puțin de zece zile din nouăzeci este recunoscut și încercat cu metode făcute pentru cerere neregulată. Ele sunt folosite atunci când dau rezultate mai bune pe istoricul lui.'],
      ['Stocul este refăcut zi cu zi', 'Din stocul inițial și din fiecare tranzacție, pagina află ce era pe raft în fiecare zi. O zi cu raftul gol este corectată, ca prognoza să arate ce au vrut clienții, nu cât a permis raftul.'],
      ['Nouă niveluri de serviciu, nu unul', 'Produsele sunt împărțite după importanță (A, B, C) și după cât de constantă este cererea (X, Y, Z). Fiecare dintre cele nouă clase are nivelul ei de serviciu, pe care îl puteți schimba.'],
      ['Stocul de siguranță acoperă două riscuri', 'Acoperă variația cererii și variația termenului de livrare al furnizorului, pe zilele până la următoarea livrare pe care o mai puteți influența.'],
      ['Comanda se construiește pas cu pas', 'Cererea prognozată, stocul de siguranță, stocul pe care îl aveți și cel deja comandat, ambalajul, cantitatea minimă și o limită de zile de acoperire. Fiecare pas arată ce a adăugat sau ce a scos.'],
      ['Limita dumneavoastră hotărăște cine semnează', 'Scrieți ce clase de produse și ce valoare de comandă pot pleca pe o singură semnătură. Fiecare propunere este verificată față de limită și poate fi exportată ca fișă de decizie, în formatul publicat Simon G.'],
      ['Același fișier dă același rezultat', 'Calculul este aritmetică fixă. Nu învață și nu se schimbă de la o rulare la alta, așa că un rezultat poate fi verificat și repetat. Ce lipsește este raportat ca lipsă și nu este înlocuit pe tăcute.'],
    ],
    paramsNote: 'În spatele paginii sunt 50 de parametri, fiecare cu un interval documentat. Pagina îi arată pe cei care contează cel mai mult și îi lasă pe ceilalți la valorile lor documentate.',
    limitsH: 'Ce nu face',
    limits: ['Termene de valabilitate și loturi', 'Promoții și calendar de sărbători', 'Mai mulți furnizori pentru același produs', 'Praguri de preț', 'Produse noi, fără istoric', 'Transferuri între locații'],
    limitsNote: 'Simon G., platforma completă, acoperă promoțiile, mai multe locații și condițiile furnizorilor. Nici acolo nu sunt acoperite termenele de valabilitate.',
    faqH: 'Întrebări',
    faq: [
      ['Unde ajung datele mele?', 'Nicăieri. Fișierul este citit de browser, iar calculul se face pe calculatorul dumneavoastră. Pagina are o politică de securitate care interzice orice conexiune spre exterior și nu încarcă niciun script de analiză sau al unor terți.'],
      ['Ce fișier îmi trebuie?', 'Stocul inițial și tranzacțiile pe cel puțin trei luni, de preferat unul-doi ani, în format Excel (.xlsx) sau CSV. O fișă de magazie exportată din sistemul dumneavoastră merge cu numele ei de coloane: pagina arată ce coloană a luat pentru ce și vă lasă să spuneți ce înseamnă fiecare tip de tranzacție.'],
      ['De ce este nevoie de stocul inițial?', 'Cu stocul inițial și cu toate mișcările de atunci, se cunoaște stocul fiecărei zile. De aici vine stocul de astăzi, folosit la propunerea de comandă, și tot de aici se văd zilele în care un produs a lipsit, care altfel ar părea zile fără cerere.'],
      ['Cum se face prognoza?', 'Pentru fiecare produs se încearcă mai multe metode pe date din trecut pe care metoda nu le-a văzut. O metodă mai complexă este folosită numai dacă bate clar o medie mobilă simplă.'],
      ['Îl pot folosi în fiecare lună?', 'Da. După o rulare, salvați fișierul de lucru. El conține coloanele alese, ipotezele și rezultatele și rămâne pe calculatorul dumneavoastră. Luna viitoare încărcați-l împreună cu noul export: pagina arată ce s-a prognozat față de ce s-a vândut și ce propuneri au fost urmate.'],
      ['Hotărăște ea ce comand?', 'Nu. Propune și își arată raționamentul. Hotărăște un om, iar limita de aprobare spune care.'],
      ['Există un asistent AI?', 'Există șase întrebări fixe, cu răspunsul calculat din rezultatele dumneavoastră. Niciun model de limbaj nu vă citește datele, iar aceleași rezultate dau de fiecare dată același răspuns.'],
      ['Cât costă?', 'Verificarea de stoc este gratuită. Simon G., platforma care face același calcul în fiecare noapte, cu aprobări și cu evidența deciziilor, este un produs cu plată, instalat pe infrastructura dumneavoastră.'],
    ],
    footTag: 'Groma — studio de inginerie AI. Construim pentru profesioniști ale căror decizii contează, pe un orizont de generații, nu de trimestre.',
    footNav: [['/', 'Groma'], ['/simon-g', 'Simon G.'], [URLS.en, 'English'], ['/confidentialitate', 'Confidențialitate']],
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
        '@type': 'SoftwareApplication', name: lang === 'ro' ? 'Simon G. Verificare stoc' : 'Simon G. Stock Check',
        applicationCategory: 'BusinessApplication', operatingSystem: 'Any (web browser)', url, inLanguage: lang,
        description: x.desc, offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
        publisher: { '@id': SITE + '/#org' },
        featureList: ['Stock rebuilt day by day from opening stock and transactions', 'Demand forecast per product', 'Safety stock and reorder point',
          'Order proposal with pack size and minimum quantity', 'Approval limit and decision records', 'Excess stock', 'Runs locally in the browser; no data upload'],
      },
      { '@type': 'FAQPage', mainEntity: x.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    ],
  };
  const v = '?v=' + stamp;
  const file = (id, label, solid) => `<input type="file" id="${id}" accept=".xlsx,.xlsm,.csv,.txt,.tsv,text/csv" class="sg-file">
      <label class="sg-btn${solid ? ' solid' : ''}" for="${id}">${esc(label)}</label>`;
  return `<!doctype html>
<html lang="${lang}" data-engine="${esc(version.sourceCommit)}">
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
    <div class="sg-row sg-tourstart">
      <button class="sg-btn" id="tourBtn" type="button">${esc(x.tour)}</button>
      <span class="sg-hint">${esc(x.tourHint)}</span>
    </div>
  </section>

  <section class="sg-ws" id="step-workspace">
    <p><strong>${esc(x.wsH)}</strong> ${esc(x.wsHint)}</p>
    <div class="sg-row">
      <input type="file" id="workspaceFile" accept=".json,application/json" class="sg-file">
      <label class="sg-btn" for="workspaceFile">${esc(x.wsLoad)}</label>
      <span class="sg-fname" id="workspaceName" role="status"></span>
    </div>
  </section>

  <section class="sg-card" id="step-moves">
    <h2><span class="sg-n">1</span> ${esc(x.s1)}</h2>
    <p class="sg-hint">${esc(x.s1hint)}</p>
    <div class="sg-row">
      ${file('movesFile', x.chooseMoves, true)}
      <button class="sg-btn" id="sampleBtn" type="button">${esc(x.sample)}</button>
      <span class="sg-fname" id="movesName"></span>
    </div>
    <details class="sg-templates">
      <summary>${esc(x.tplH)}</summary>
      <p class="sg-hint">${esc(x.tplHint)}</p>
      <ul class="sg-dl">
        <li><a href="${TPL}simon-g-stock-template.xlsx" download>${esc(x.tplXlsx)}</a></li>
        <li><a href="${TPL}simon-g-stock-transactions.csv" download>${esc(x.tplCsv1)}</a></li>
        <li><a href="${TPL}simon-g-stock-products.csv" download>${esc(x.tplCsv2)}</a></li>
      </ul>
    </details>
    <div id="movesMap" class="sg-mapping sg-hidden"></div>
    <p id="openingNote" class="sg-hidden"></p>
    <div id="movesPreview" class="sg-preview sg-hidden"></div>
  </section>

  <section class="sg-card" id="step-files">
    <h2><span class="sg-n">2</span> ${esc(x.s2)} <span class="sg-opt">${esc(x.optional)}</span></h2>
    <p class="sg-hint">${esc(x.s2hint)}</p>
    <div class="sg-row">
      ${file('openingFile', x.chooseOpening, false)}
      <span class="sg-fname" id="openingName"></span>
    </div>
    <div id="openingMap" class="sg-mapping sg-hidden"></div>
    <div class="sg-row sg-gap">
      ${file('productsFile', x.chooseProducts, false)}
      <span class="sg-fname" id="productsName"></span>
    </div>
    <div id="productsMap" class="sg-mapping sg-hidden"></div>
  </section>

  <section class="sg-card" id="step-settings">
    <h2><span class="sg-n">3</span> ${esc(x.s3)}</h2>
    <p class="sg-hint">${esc(x.s3hint)}</p>
    <div class="sg-grid">
      <label>${esc(x.a1)}<input type="number" id="leadTimeDays" min="0" max="365" step="1" value="14"></label>
      <label>${esc(x.a2)}<input type="number" id="leadTimeSdDays" min="0" max="90" step="0.5" value="3"></label>
      <label>${esc(x.a3)}<input type="number" id="reviewPeriodDays" min="1" max="90" step="1" value="7"></label>
      <label>${esc(x.a4)}<input type="number" id="coverCapDays" min="7" max="365" step="1" value="45"></label>
      <label>${esc(x.a5)}<input type="number" id="excessCoverDays" min="30" max="730" step="1" value="180"></label>
      <label class="sg-check"><input type="checkbox" id="fillZeros" checked> ${esc(x.a6)}</label>
    </div>
    <fieldset class="sg-limit" id="limitBox">
      <legend>${esc(x.limitH)}</legend>
      <p class="sg-hint">${esc(x.limitHint)}</p>
      <div class="sg-grid">
        <div class="sg-field"><span class="sg-fieldlabel">${esc(x.limitClasses)}</span>
          <span class="sg-row">
            <label class="sg-check"><input type="checkbox" id="limitA"> A</label>
            <label class="sg-check"><input type="checkbox" id="limitB"> B</label>
            <label class="sg-check"><input type="checkbox" id="limitC" checked> C</label>
          </span>
        </div>
        <label>${esc(x.limitValue)}<input type="text" inputmode="decimal" id="limitValue" autocomplete="off"></label>
        <label>${esc(x.currency)}<input type="text" id="currency" maxlength="3" autocomplete="off"></label>
      </div>
    </fieldset>
    <details>
      <summary>${esc(x.levels)}</summary>
      <p class="sg-hint">${esc(x.levelsHint)}</p>
      <table class="sg-matrix" id="matrix"></table>
    </details>
    <div class="sg-row">
      <button class="sg-btn solid big" id="runBtn" type="button" disabled>${esc(x.run)}</button>
      <span id="progress" class="sg-progress" role="status"></span>
    </div>
  </section>

  <section id="results" class="sg-hidden">
    <h2 class="sg-res-title">${esc(x.results)} <span id="asOf" class="sg-muted sg-small"></span></h2>
    <div id="tiles" class="sg-tiles"></div>
    <div id="readNotes" class="sg-notes"></div>
    <div id="since" class="sg-since sg-hidden"></div>
    <div class="sg-askbox">
      <h3>${esc(x.askH)}</h3>
      <p class="sg-hint">${esc(x.askHint)}</p>
      <div id="asks" class="sg-asks"></div>
      <div id="answer" class="sg-answer sg-hidden" role="status"></div>
    </div>
    <div class="sg-row sg-tools">
      <input type="search" id="filter" placeholder="${esc(x.filter)}" aria-label="${esc(x.filter)}">
      <select id="statusFilter" aria-label="${esc(x.statusAria)}"></select>
      <span class="sg-row" id="exports">
        <button class="sg-btn" id="exportBtn" type="button">${esc(x.exportBtn)}</button>
        <button class="sg-btn" id="recordsBtn" type="button">${esc(x.recordsBtn)}</button>
        <button class="sg-btn" id="printBtn" type="button">${esc(x.print)}</button>
        <button class="sg-btn" id="reportBtn" type="button">${esc(x.report)}</button>
        <button class="sg-btn solid" id="workspaceBtn" type="button">${esc(x.wsSave)}</button>
      </span>
    </div>
    <p class="sg-hint" id="workspaceSaved" role="status"></p>
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
${x.what.map(([h, p], i) => `      <div class="sg-cardlet"><span class="sg-num">${String(i + 1).padStart(2, '0')}</span><h3>${esc(h)}</h3><p>${esc(p)}</p></div>`).join('\n')}
    </div>
    <p class="sg-hint sg-gap">${esc(x.paramsNote)}</p>
    <h3 class="sg-sub">${esc(x.limitsH)}</h3>
    <ul class="sg-limits">${x.limits.map(l => `<li>${esc(l)}</li>`).join('')}</ul>
    <p class="sg-hint">${esc(x.limitsNote)}</p>
  </section>

  <section class="sg-feedback">
    <h2>${lang === 'ro' ? 'Ceva a ieșit greșit sau neclar?' : 'Was something wrong or unclear?'}</h2>
    <p>${lang === 'ro'
      ? 'Scrieți-ne ce s-a întâmplat și ne uităm. Descrieți problema în cuvinte și nu atașați datele dumneavoastră.'
      : 'Tell us what happened and we will look at it. Describe the problem in words and do not attach your data.'}
      <a href="mailto:contact@groma.ro?subject=Simon%20G.%20Stock%20Check">contact@groma.ro</a></p>
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

<div id="report" class="sg sg-report sg-hidden" role="dialog" aria-modal="true" aria-labelledby="reportHeading">
  <div class="sg-report-bar">
    <label>${esc(x.rpTitleLabel)}<input type="text" id="reportTitle" maxlength="80" autocomplete="off"></label>
    <button class="sg-btn solid" id="reportPrint" type="button">${esc(x.rpPrint)}</button>
    <button class="sg-btn" id="reportClose" type="button">${esc(x.close)}</button>
    <span class="sg-hint">${esc(x.rpHint)}</span>
  </div>
  <div class="sg-report-sheet" id="reportSheet"></div>
</div>

<div id="tour" class="sg sg-tour sg-hidden" role="region" aria-live="polite" aria-label="${esc(x.tour)}">
  <p class="sg-tourstep" id="tourStep"></p>
  <p id="tourText"></p>
  <div class="sg-row">
    <button class="sg-btn" id="tourBack" type="button"></button>
    <button class="sg-btn solid" id="tourNext" type="button"></button>
    <button class="sg-btn" id="tourClose" type="button">${esc(x.close)}</button>
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
<script src="/simon-g/app/core.js${v}"></script>
<script src="/simon-g/app/sample.js${v}"></script>
<script src="/simon-g/app/i18n.js${v}"></script>
<script src="/simon-g/app/app.js${v}"></script>
</body>
</html>
`;
}

fs.mkdirSync(path.join(root, 'pages'), { recursive: true });
for (const lang of ['ro', 'en']) {
  fs.writeFileSync(path.join(root, 'pages', lang + '.html'), page(lang));
  console.log('pages/' + lang + '.html');
}
