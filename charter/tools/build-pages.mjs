// Builds the two language pages from one template, so that they cannot drift apart.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://groma.ro';
const URLS = { ro: '/simon-g/carta-deciziilor', en: '/en/simon-g/decision-charter' };
const SIMON_G_URL = { ro: '/simon-g', en: '/en/simon-g' };
const METHOD_URL = { ro: '/simon-g/metoda', en: '/en/simon-g/method' };
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');

const TEXT = {
  en: {
    title: 'Simon G. Decision Charter — build your one-page decision charter and perimeter statement, free',
    desc: 'Free Decision Charter by Groma. Tick the decision classes that apply to your company, name an owner and a limit for each, write your perimeter statement, then print or download it. Nothing leaves this browser.',
    ogTitle: 'Simon G. Decision Charter — who may decide what, and within which limits',
    home: '/en/',
    nav: [[SIMON_G_URL.en, 'Simon G.'], [METHOD_URL.en, 'Method']],
    langLabel: 'RO', ogLocale: 'en_US', ogImage: '/assets/og/og-en.png',
    eyebrow: 'Simon G. · Decision Charter · free',
    h1: 'Who may decide what, and within which limits?',
    lead: 'Tick the decision classes that apply to your company, name an owner and a signed limit for each, and write down your perimeter statement. You get a one-page charter to print or keep.',
    trustB: 'Your draft stays in this browser.',
    trust: ' Nothing you type is uploaded. The page carries a security policy that forbids every outgoing connection, and your draft is kept only in this browser\u2019s local storage, on this device.',
    s1: 'Your company', s1hint: 'These lines identify the charter. The company name is optional; the date and the signer are used on every row and in every export.',
    companyNameLabel: 'Company name', companyNamePh: 'Optional',
    dateLabel: 'Date', signerLabel: 'Signed by',
    s2: 'Decision classes', s2hint: 'Fifteen starter classes, from the Simon G. Method, are ticked in. Untick what does not apply, edit any cell, and add or remove a class.',
    addClass: 'Add a class',
    thInclude: 'Applies', thClass: 'Class', thOwner: 'Owner', thMachine: 'Machine may act alone', thEscalates: 'Escalates when', thHealth: 'Health signals', thReview: 'Review date', thRemove: '',
    s3: 'Perimeter statement', s3hint: 'Where data and models may run, and what must stay inside.',
    locLabel: 'Where is data processed', locOwn: 'Own servers', locCloud: 'A named cloud region', locVendor: 'A vendor',
    locDetailLabel: 'Which one', locDetailPh: 'For example: Frankfurt, eu-central-1, or the vendor\u2019s name',
    aiToolsLabel: 'AI tools approved for this data', aiToolsHint: 'One per line.',
    neverLeavesLabel: 'What may never leave the perimeter', neverLeavesHint: 'One per line.',
    exceptionLabel: 'Who approves an exception',
    resultsH: 'Result',
    exportCsv: 'Download CSV', exportJson: 'Download JSON', print: 'Print', clear: 'Clear',
    csvHint: 'The CSV holds the decision charter: one row per ticked class, in the method\u2019s own columns.',
    jsonHint: 'The JSON holds the charter and the perimeter statement together.',
    nextH: 'From one page to an enforced system',
    next1: 'This page gets you to Level 1 of the method: written. Simon G., the platform, keeps a decision record for every decision the charter covers, measures its effect, and refuses what the charter does not allow.',
    next2: 'Write to us and we will show it on your own decisions.',
    methodLink: [METHOD_URL.en, 'The rules behind it: the Simon G. Method'],
    contact: 'contact@groma.ro',
    whatH: 'What this is', whatLead: 'A charter is one page. It says who decides, what a machine may do alone, and where it must stop.',
    what: [
      ['A starting point, signed by you', 'The fifteen starter classes come from the method\u2019s own table. Nothing here binds your company until you tick a class, name its owner and set its limit.'],
      ['Your draft, your browser', 'Everything you type is held in this browser\u2019s local storage. Reloading the page keeps it; a different computer or a private window starts empty.'],
      ['A charter, not a certificate', 'Filling this page is Level 1 of the method: written. It does not record decisions, measure their effect, or enforce the limits it states \u2014 that is what Levels 2 to 4 are for.'],
    ],
    limitsH: 'What it does not do',
    limits: ['Does not make your company compliant with any regulation', 'Does not keep a decision record', 'Does not enforce the limits it states', 'Does not check your entries for legal correctness', 'Does not send or store anything outside this browser'],
    limitsNote: 'The Simon G. Method explains how the charter relates to the EU AI Act, GDPR, NIS2 and ISO/IEC 42001. It is not legal advice.',
    faqH: 'Questions',
    faq: [
      ['Where does my draft go?', 'Nowhere. It is kept only in this browser\u2019s local storage, on this device. Closing the tab does not lose it; a different browser, a different computer, or a private window starts with the fifteen starter classes again.'],
      ['Does this make my company compliant?', 'No. The Simon G. Method produces evidence that several rules ask for \u2014 the EU AI Act, GDPR, NIS2, ISO/IEC 42001 \u2014 but it does not judge whether a limit is right, and it is not legal advice. A lawyer reads the charter, not this page.'],
      ['What do the blank spaces in a limit mean?', 'A limit such as "order value under ____" needs a number your company decides on. Fill it in and it becomes part of the sentence; leave it, and the class counts as having no signed limit in the completeness check below the charter.'],
      ['Can I change the wording, not just the blanks?', 'Yes. Each limit and escalation carries an "Edit the wording" link that turns it into a plain text box, so you can write it in your own words.'],
      ['What does it cost?', 'Nothing. The Decision Charter is free. Simon G., the platform that keeps the decision record and enforces the charter, is a paid product installed on your own infrastructure.'],
    ],
    footTag: 'Groma — AI engineering studio. We build for professionals whose decisions carry weight, on a horizon of generations, not quarters.',
    footNav: [['/en/', 'Groma'], ['/en/articles/a-human-signs-where', 'Writing'], [URLS.ro, 'Română'], ['/en/privacy', 'Privacy']],
    legal: '© 2026 GROMA S.R.L. · CUI 54804217 · Trade Reg. J2026035922005 · Timișoara, Romania',
    legal2: 'Built by humans, with AI — behind a human gate.',
  },
  ro: {
    title: 'Simon G. Carta deciziilor — construiți gratuit carta deciziilor și declarația de perimetru, pe o singură pagină',
    desc: 'Carta deciziilor Simon G., gratuită, de la Groma. Bifați clasele de decizii care se aplică la compania dumneavoastră, numiți un responsabil și o limită pentru fiecare, scrieți declarația de perimetru, apoi tipăriți sau descărcați. Nimic nu iese din acest browser.',
    ogTitle: 'Simon G. Carta deciziilor — cine ce poate hotărî și în ce limite',
    home: '/',
    nav: [[SIMON_G_URL.ro, 'Simon G.'], [METHOD_URL.ro, 'Metodă']],
    langLabel: 'EN', ogLocale: 'ro_RO', ogImage: '/assets/og/og-ro.png',
    eyebrow: 'Simon G. · Carta deciziilor · gratuit',
    h1: 'Cine ce poate hotărî, și în ce limite?',
    lead: 'Bifați clasele de decizii care se aplică la compania dumneavoastră, numiți un responsabil și o limită semnată pentru fiecare, apoi scrieți declarația de perimetru. Primiți o cartă pe o singură pagină, de tipărit sau de păstrat.',
    trustB: 'Ciorna dumneavoastră rămâne în acest browser.',
    trust: ' Nimic din ce scrieți nu este trimis nicăieri. Pagina are o politică de securitate care interzice orice conexiune spre exterior, iar ciorna se păstrează doar în memoria locală a acestui browser, pe acest calculator.',
    s1: 'Compania dumneavoastră', s1hint: 'Aceste rânduri identifică carta. Numele companiei este opțional; data și semnatarul apar pe fiecare rând și în fiecare export.',
    companyNameLabel: 'Numele companiei', companyNamePh: 'Opțional',
    dateLabel: 'Data', signerLabel: 'Semnat de',
    s2: 'Clasele de decizii', s2hint: 'Cincisprezece clase de pornire, din Metoda Simon G., sunt bifate deja. Debifați ce nu se aplică, editați orice celulă și adăugați sau eliminați o clasă.',
    addClass: 'Adăugați o clasă',
    thInclude: 'Se aplică', thClass: 'Clasa', thOwner: 'Responsabil', thMachine: 'Ce poate face mașina singură', thEscalates: 'Când urcă la om', thHealth: 'Semnele de sănătate', thReview: 'Data revizuirii', thRemove: '',
    s3: 'Declarația de perimetru', s3hint: 'Unde pot rula datele și modelele, și ce trebuie să rămână înăuntru.',
    locLabel: 'Unde se prelucrează datele', locOwn: 'Servere proprii', locCloud: 'O regiune cloud numită', locVendor: 'Un furnizor',
    locDetailLabel: 'Care anume', locDetailPh: 'De exemplu: Frankfurt, eu-central-1, sau numele furnizorului',
    aiToolsLabel: 'Instrumente AI aprobate pentru aceste date', aiToolsHint: 'Câte unul pe rând.',
    neverLeavesLabel: 'Ce nu are voie să iasă din perimetru', neverLeavesHint: 'Câte unul pe rând.',
    exceptionLabel: 'Cine aprobă o excepție',
    resultsH: 'Rezultat',
    exportCsv: 'Descărcați CSV', exportJson: 'Descărcați JSON', print: 'Tipărire', clear: 'Ștergere',
    csvHint: 'CSV-ul conține carta deciziilor: câte un rând pentru fiecare clasă bifată, cu coloanele metodei.',
    jsonHint: 'JSON-ul conține carta și declarația de perimetru împreună.',
    nextH: 'De la o pagină la un sistem care impune regulile',
    next1: 'Această pagină vă duce la treapta 1 a metodei: scris. Simon G., platforma, ține câte o fișă pentru fiecare decizie acoperită de cartă, îi măsoară efectul și refuză ce carta nu permite.',
    next2: 'Scrieți-ne și vi-l arătăm pe deciziile dumneavoastră.',
    methodLink: [METHOD_URL.ro, 'Regulile din spatele ei: Metoda Simon G.'],
    contact: 'contact@groma.ro',
    whatH: 'Ce este aceasta', whatLead: 'O cartă încape pe o pagină. Spune cine hotărăște, ce poate face o mașină singură și unde trebuie să se oprească.',
    what: [
      ['Un punct de pornire, semnat de dumneavoastră', 'Cele cincisprezece clase de pornire vin din tabelul metodei. Nimic de aici nu obligă compania dumneavoastră până nu bifați o clasă, îi numiți responsabilul și îi stabiliți limita.'],
      ['Ciorna dumneavoastră, în browserul dumneavoastră', 'Tot ce scrieți se păstrează în memoria locală a acestui browser. Reîncărcarea paginii o păstrează; un alt calculator sau o fereastră privată pornesc de la zero.'],
      ['O cartă, nu un certificat', 'Completarea acestei pagini este treapta 1 a metodei: scris. Ea nu consemnează decizii, nu le măsoară efectul și nu impune limitele pe care le scrie \u2014 acestea sunt treptele 2 până la 4.'],
    ],
    limitsH: 'Ce nu face',
    limits: ['Nu face compania dumneavoastră conformă cu vreo reglementare', 'Nu ține o fișă a deciziilor', 'Nu impune limitele pe care le scrie', 'Nu verifică juridic ce ați scris', 'Nu trimite și nu păstrează nimic în afara acestui browser'],
    limitsNote: 'Metoda Simon G. explică legătura cartei cu Regulamentul UE privind inteligența artificială, GDPR, NIS2 și ISO/IEC 42001. Nu este consultanță juridică.',
    faqH: 'Întrebări',
    faq: [
      ['Unde ajunge ciorna mea?', 'Nicăieri. Se păstrează doar în memoria locală a acestui browser, pe acest calculator. Închiderea filei nu o pierde; un alt browser, un alt calculator sau o fereastră privată pornesc din nou cu cele cincisprezece clase de pornire.'],
      ['Face aceasta compania mea conformă?', 'Nu. Metoda Simon G. produce dovezile pe care le cer mai multe reguli \u2014 Regulamentul UE privind inteligența artificială, GDPR, NIS2, ISO/IEC 42001 \u2014 dar nu judecă dacă o limită este cea potrivită și nu este consultanță juridică. Carta o citește un jurist, nu această pagină.'],
      ['Ce înseamnă spațiile libere dintr-o limită?', 'O limită precum „valoarea comenzii sub ____” are nevoie de un număr pe care îl stabilește compania dumneavoastră. Completați-l și devine parte din frază; dacă îl lăsați necompletat, clasa apare fără limită semnată în verificarea de sub cartă.'],
      ['Pot schimba formularea, nu doar spațiile libere?', 'Da. Fiecare limită și fiecare condiție de escaladare are un link „Editați formularea”, care o transformă într-o casetă de text simplă, ca să o scrieți cu propriile cuvinte.'],
      ['Cât costă?', 'Nimic. Carta deciziilor este gratuită. Simon G., platforma care ține fișa deciziilor și impune carta, este un produs cu plată, instalat pe infrastructura dumneavoastră.'],
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
        '@type': 'SoftwareApplication', name: lang === 'ro' ? 'Simon G. Carta deciziilor' : 'Simon G. Decision Charter',
        applicationCategory: 'BusinessApplication', operatingSystem: 'Any (web browser)', url, inLanguage: lang,
        description: x.desc, offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
        publisher: { '@id': SITE + '/#org' },
        featureList: ['Fifteen starter decision classes, editable', 'Owner, machine limit, escalation, health signals and review date per class', 'Perimeter statement', 'Completeness check against the method\u2019s rules', 'Print, CSV and JSON export', 'Runs locally in the browser; the draft never leaves it'],
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
  <link rel="stylesheet" href="/simon-g/charter/charter.css${v}">
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

  <section class="sg-card" id="step-company">
    <h2><span class="sg-n">1</span> ${esc(x.s1)}</h2>
    <p class="sg-hint">${esc(x.s1hint)}</p>
    <div class="sg-grid">
      <label>${esc(x.companyNameLabel)}<input type="text" id="companyName" placeholder="${esc(x.companyNamePh)}"></label>
      <label>${esc(x.dateLabel)}<input type="date" id="charterDate"></label>
      <label>${esc(x.signerLabel)}<input type="text" id="signerName"></label>
    </div>
  </section>

  <section class="sg-card" id="step-classes">
    <h2><span class="sg-n">2</span> ${esc(x.s2)}</h2>
    <p class="sg-hint">${esc(x.s2hint)}</p>
    <div class="sg-table-wrap">
      <table class="sg-data sg-charter-table">
        <thead>
          <tr>
            <th scope="col">${esc(x.thInclude)}</th>
            <th scope="col" class="l">${esc(x.thClass)}</th>
            <th scope="col" class="l">${esc(x.thOwner)}</th>
            <th scope="col" class="l">${esc(x.thMachine)}</th>
            <th scope="col" class="l">${esc(x.thEscalates)}</th>
            <th scope="col" class="l">${esc(x.thHealth)}</th>
            <th scope="col">${esc(x.thReview)}</th>
            <th scope="col">${esc(x.thRemove)}</th>
          </tr>
        </thead>
        <tbody id="classesBody"></tbody>
      </table>
    </div>
    <div class="sg-row sg-add-row">
      <button class="sg-btn" id="addClassBtn" type="button">${esc(x.addClass)}</button>
    </div>
  </section>

  <section class="sg-card" id="step-perimeter">
    <h2><span class="sg-n">3</span> ${esc(x.s3)}</h2>
    <p class="sg-hint">${esc(x.s3hint)}</p>
    <fieldset class="sg-radios">
      <legend class="sg-hint sg-legend-tight">${esc(x.locLabel)}</legend>
      <label><input type="radio" name="procLoc" value="own" id="procLocOwn"> ${esc(x.locOwn)}</label>
      <label><input type="radio" name="procLoc" value="cloud" id="procLocCloud"> ${esc(x.locCloud)}</label>
      <label><input type="radio" name="procLoc" value="vendor" id="procLocVendor"> ${esc(x.locVendor)}</label>
    </fieldset>
    <div class="sg-grid">
      <label>${esc(x.locDetailLabel)}<input type="text" id="procLocDetail" placeholder="${esc(x.locDetailPh)}"></label>
      <label>${esc(x.exceptionLabel)}<input type="text" id="exceptionApprover"></label>
    </div>
    <div class="sg-grid">
      <label>${esc(x.aiToolsLabel)}<textarea id="aiTools" class="sg-area" rows="3"></textarea></label>
      <label>${esc(x.neverLeavesLabel)}<textarea id="neverLeaves" class="sg-area" rows="3"></textarea></label>
    </div>
  </section>

  <section id="results" class="sg-card">
    <h2 class="sg-results-h">${esc(x.resultsH)}</h2>
    <div class="sg-row sg-buttons-row">
      <button class="sg-btn solid" id="exportCsvBtn" type="button">${esc(x.exportCsv)}</button>
      <button class="sg-btn" id="exportJsonBtn" type="button">${esc(x.exportJson)}</button>
      <button class="sg-btn" id="printBtn" type="button">${esc(x.print)}</button>
      <button class="sg-btn" id="clearBtn" type="button">${esc(x.clear)}</button>
      <span id="saveNotice" class="sg-save-notice" role="status"></span>
    </div>
    <p class="sg-hint sg-csv-json-hint">${esc(x.csvHint)} ${esc(x.jsonHint)}</p>
    <div id="complTiles" class="sg-tiles"></div>
    <p id="complBanner" class="sg-notes" role="status"></p>
    <div id="previewCharter" class="sg-preview-doc"></div>
    <div id="previewPerimeter"></div>
  </section>

  <section class="sg-card sg-next" id="next">
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
      <a href="mailto:contact@groma.ro?subject=Simon%20G.%20Decision%20Charter">contact@groma.ro</a></p>
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

<script src="/simon-g/charter/charter-core.js${v}"></script>
<script src="/simon-g/charter/charter-i18n.js${v}"></script>
<script src="/simon-g/charter/charter.js${v}"></script>
</body>
</html>
`;
}

fs.mkdirSync(path.join(root, 'pages'), { recursive: true });
for (const lang of ['ro', 'en']) {
  fs.writeFileSync(path.join(root, 'pages', lang + '.html'), page(lang));
  console.log('pages/' + lang + '.html');
}
