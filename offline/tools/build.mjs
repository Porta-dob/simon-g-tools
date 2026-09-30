// Builds one HTML file that holds the four Simon G. tools, in English and Romanian, for use without a network.
// It is assembled from the files published on the site, so the offline tools are the same code as the online ones.
//   SITE_DIR=<site working tree> node build.mjs
// The file carries a content security policy that lists the hash of every script and style inside it
// and allows no connection of any kind.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = process.env.SITE_DIR;
if (!SITE) { console.error('Set SITE_DIR to the site working tree.'); process.exit(1); }
const VERSION = process.env.SG_OFFLINE_VERSION || '2026.10.1';
const read = p => fs.readFileSync(path.join(SITE, p), 'utf8').replace(/\r\n/g, '\n');
const sha = s => "'sha256-" + crypto.createHash('sha256').update(s, 'utf8').digest('base64') + "'";

const TOOLS = {
  stock: { en: 'en/simon-g/stock-check.html', ro: 'simon-g/verificare-stoc.html' },
  capital: { en: 'en/simon-g/working-capital.html', ro: 'simon-g/capital-de-lucru.html' },
  credit: { en: 'en/simon-g/credit-check.html', ro: 'simon-g/verificare-credit.html' },
  charter: { en: 'en/simon-g/decision-charter.html', ro: 'simon-g/carta-deciziilor.html' },
};
// what each worker loads, in order; the importScripts line is dropped
const WORKERS = {
  stock: ['simon-g/app/engine.js', 'simon-g/app/parse.js', 'simon-g/app/core.js', 'simon-g/app/worker.js'],
  credit: ['simon-g/credit/credit-engine.js', 'simon-g/app/parse.js', 'simon-g/credit/credit-calc.js', 'simon-g/credit/credit-worker.js'],
};
const WORKER_CALLS = {
  'simon-g/app/app.js': ["new Worker(BASE + 'worker.js')", "new Worker(parent.SGOffline.worker('stock'))"],
  'simon-g/credit/credit-app.js': ["new Worker(BASE + 'credit-worker.js')", "new Worker(parent.SGOffline.worker('credit'))"],
};

const parts = {};   // key -> text, stored once in the file
const hashes = { script: new Set(), style: new Set() };

// fonts: one stylesheet with the font files inside it
{
  let css = read('assets/fonts/fonts.css');
  css = css.replace(/url\(\/assets\/fonts\/([^)]+)\)/g, (m, f) => 'url(data:font/woff2;base64,' + fs.readFileSync(path.join(SITE, 'assets/fonts', f)).toString('base64') + ')');
  if (/url\(\//.test(css)) throw new Error('a font was not embedded');
  parts['css:fonts'] = css;
}
function addCss(file) {
  const key = 'css:' + file;
  if (!parts[key]) {
    const css = read(file);
    if (/url\(/.test(css)) throw new Error(file + ' refers to another file');
    parts[key] = css;
  }
  return key;
}
function addJs(file) {
  const key = 'js:' + file;
  if (!parts[key]) {
    let js = read(file);
    const call = WORKER_CALLS[file];
    if (call) {
      if (js.split(call[0]).length !== 2) throw new Error(file + ': worker call not found');
      js = js.replace(call[0], call[1]);
    }
    if (/<\/script/i.test(js)) throw new Error(file + ' holds a closing script tag');
    parts[key] = js;
  }
  return key;
}
for (const [name, files] of Object.entries(WORKERS)) {
  const src = files.map(f => read(f).replace(/^importScripts\([^)]*\);?\s*$/m, '')).join('\n;\n');
  if (/importScripts\(/.test(src)) throw new Error('worker ' + name + ' still imports a file');
  parts['worker:' + name] = src;
}

// a tool page becomes a document for a frame: no site header or footer, styles and scripts as references to the parts
function frameDoc(file) {
  const html = read(file);
  const htmlTag = html.match(/<html[^>]*>/)[0];
  const title = html.match(/<title>([\s\S]*?)<\/title>/)[1];
  const css = [...html.matchAll(/<link rel="stylesheet" href="\/([^"?]+)[^"]*">/g)].map(m => m[1]);
  let body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
  body = body.replace(/<div class="rail"><\/div>/, '')
    .replace(/<header class="site-header">[\s\S]*?<\/header>/, '')
    .replace(/<footer class="site-footer">[\s\S]*?<\/footer>/, '');
  if (/site-header|site-footer/.test(body)) throw new Error(file + ': header or footer left in');
  body = body.replace(/<script src="\/([^"?]+)[^"]*"><\/script>/g, (m, f) => '<!--@' + addJs(f) + '-->');
  if (/<script/.test(body)) throw new Error(file + ': a script was left in');
  body = body.replace(/href="\/(?!\/)([^"]*)"( download)?/g, (m, p) => 'href="https://groma.ro/' + p + '" target="_blank" rel="noopener"');
  if (/(src|href)="\/(?!\/)/.test(body)) throw new Error(file + ': a site path was left in');
  const styles = css.map(f => '<!--@' + (f === 'assets/fonts/fonts.css' ? 'css:fonts' : addCss(f)) + '-->').join('');
  return '<!doctype html>' + htmlTag + '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + title + '</title>'
    + styles + '<!--@css:frame--></head><body>' + body + '</body></html>';
}
parts['css:frame'] = 'main.sg, main { padding-top: 8px; }\n';
const frames = {};
for (const [tool, files] of Object.entries(TOOLS)) for (const lang of ['en', 'ro']) frames[tool + ':' + lang] = frameDoc(files[lang]);

for (const [key, text] of Object.entries(parts)) {
  if (key.startsWith('js:')) hashes.script.add(sha(text));
  if (key.startsWith('css:')) hashes.style.add(sha(text));
}

const mark = 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(SITE, 'assets/groma-mark-reversed.svg')).toString('base64');
const engine = { sourceCommit: (read(TOOLS.stock.en).match(/data-engine="([^"]*)"/) || [0, 'unknown'])[1] };
const built = new Date().toISOString().slice(0, 10);

const TEXT = {
  en: {
    title: 'Simon G. tools, offline', home: 'Start', stock: 'Stock Check', capital: 'Working Capital Check', credit: 'Credit Check', charter: 'Decision Charter',
    tab_home: 'Start', tab_stock: 'Stock', tab_capital: 'Working capital', tab_credit: 'Credit', tab_charter: 'Charter',
    h1: 'The Simon G. tools, on your computer',
    lead: 'This file holds four tools. It works without a network connection. It needs no installation, no account and no administrator rights.',
    trustB: 'Nothing leaves this computer.',
    trust: ' The file is built so that it cannot open any connection. Your IT department can check this in the first lines of the file.',
    cards: {
      stock: 'Load your opening stock and transactions. Get a forecast, a reorder point and an order proposal for every product, and compare with last month.',
      capital: 'Enter a few figures from two balance sheets. See the days of stock, the days to collect and what one day is worth.',
      credit: 'Load your invoice list. See how well and how late each customer pays, and what the lateness costs.',
      charter: 'Write who may decide what, what a machine may do alone and when it must ask. Print it on one page.',
    },
    open: 'Open', aboutH: 'About this file',
    about: ['Version {v}, built on {d}. Planning engine {e}.', 'The file does not update itself. For a newer version, download it again from groma.ro/en/simon-g/offline.',
      'The fingerprint (SHA-256) of each version is published on that page, so you can check that your copy is the original.',
      'The tools are free. Simon G., the platform that runs the same calculations every night with approvals and a record of decisions, is a paid product by Groma: groma.ro/en/simon-g'],
    langLabel: 'Language', leave: 'Changing the language closes the tools you have open. What you entered in them is lost. Continue?',
  },
  ro: {
    title: 'Instrumentele Simon G., offline', home: 'Start', stock: 'Verificare stoc', capital: 'Capital de lucru', credit: 'Verificare credit', charter: 'Carta deciziilor',
    tab_home: 'Start', tab_stock: 'Stoc', tab_capital: 'Capital de lucru', tab_credit: 'Credit', tab_charter: 'Cartă',
    h1: 'Instrumentele Simon G., pe calculatorul dumneavoastră',
    lead: 'Acest fișier conține patru instrumente. Funcționează fără conexiune la rețea. Nu cere instalare, cont sau drepturi de administrator.',
    trustB: 'Nimic nu părăsește acest calculator.',
    trust: ' Fișierul este construit astfel încât să nu poată deschide nicio conexiune. Departamentul IT poate verifica acest lucru în primele rânduri ale fișierului.',
    cards: {
      stock: 'Încărcați stocul inițial și tranzacțiile. Primiți pentru fiecare produs prognoza, punctul de comandă și o propunere de comandă, și comparați cu luna trecută.',
      capital: 'Scrieți câteva cifre din două bilanțuri. Vedeți zilele de stoc, zilele până la încasare și cât valorează o zi.',
      credit: 'Încărcați lista de facturi. Vedeți cât de bine și cât de târziu plătește fiecare client și cât costă întârzierea.',
      charter: 'Scrieți cine ce poate hotărî, ce poate face singură o mașină și când trebuie să întrebe. Tipăriți pe o pagină.',
    },
    open: 'Deschideți', aboutH: 'Despre acest fișier',
    about: ['Versiunea {v}, construită la {d}. Motor de planificare {e}.', 'Fișierul nu se actualizează singur. Pentru o versiune mai nouă, descărcați-l din nou de la groma.ro/simon-g/offline.',
      'Amprenta (SHA-256) a fiecărei versiuni este publicată pe acea pagină, ca să puteți verifica dacă aveți originalul.',
      'Instrumentele sunt gratuite. Simon G., platforma care face aceleași calcule în fiecare noapte, cu aprobări și cu evidența deciziilor, este un produs cu plată al Groma: groma.ro/simon-g'],
    langLabel: 'Limba', leave: 'Schimbarea limbii închide instrumentele deschise. Ce ați scris în ele se pierde. Continuați?',
  },
};

const shellCss = `
:root { --obsidian: #131A27; --cobalt: #1A4FC8; --ivory: #F7F5F0; --ink-soft: rgba(19, 26, 39, 0.72); --line: rgba(19, 26, 39, 0.14); }
* { box-sizing: border-box; }
html, body { height: 100%; margin: 0; }
body { display: flex; flex-direction: column; background: var(--ivory); color: var(--obsidian); font-family: 'Inter', 'Segoe UI', Arial, sans-serif; font-size: 16px; line-height: 1.5; }
.bar { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px; padding: 8px 16px; background: var(--obsidian); color: var(--ivory); border-top: 4px solid var(--cobalt); }
.bar img { height: 26px; width: 26px; margin-right: 8px; }
.bar .name { font-family: 'Inter Tight', 'Inter', 'Segoe UI', sans-serif; font-weight: 600; letter-spacing: 0.04em; margin-right: 14px; }
.bar button { font: inherit; font-size: 14px; min-height: 40px; padding: 8px 12px; background: transparent; color: var(--ivory); border: 1px solid transparent; cursor: pointer; }
.bar button:hover { border-color: rgba(247, 245, 240, 0.5); }
.bar button[aria-current="page"] { background: var(--ivory); color: var(--obsidian); }
.bar button:focus-visible, .card button:focus-visible { outline: 3px solid #7FA2F5; outline-offset: 2px; }
.bar .spacer { flex: 1 1 auto; }
.bar .lang { border-color: rgba(247, 245, 240, 0.5); font-family: 'IBM Plex Mono', Consolas, monospace; font-size: 12px; letter-spacing: 0.08em; }
#views { flex: 1 1 auto; min-height: 0; position: relative; }
#views iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: var(--ivory); }
#home { position: absolute; inset: 0; overflow-y: auto; padding: clamp(20px, 5vw, 56px) clamp(16px, 5vw, 64px) 48px; }
#home .in { max-width: 1040px; margin: 0 auto; }
.roof { width: 70px; height: 6px; background: var(--cobalt); margin: 0 0 22px; }
h1 { font-family: 'Inter Tight', 'Inter', 'Segoe UI', sans-serif; font-weight: 600; font-size: clamp(28px, 4.4vw, 44px); line-height: 1.08; letter-spacing: -0.02em; margin: 0 0 16px; max-width: 760px; }
.lead { font-size: 18px; color: var(--ink-soft); max-width: 720px; margin: 0 0 14px; }
.trust { border-left: 4px solid var(--cobalt); background: #fff; padding: 12px 16px; max-width: 760px; margin: 0 0 28px; }
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 16px; margin: 0 0 36px; }
.card { background: #fff; border: 1px solid var(--line); border-top: 4px solid var(--obsidian); padding: 18px 18px 20px; display: flex; flex-direction: column; gap: 10px; }
.card h2 { font-family: 'Inter Tight', 'Inter', 'Segoe UI', sans-serif; font-size: 19px; font-weight: 600; margin: 0; }
.card p { margin: 0; font-size: 14px; color: var(--ink-soft); flex: 1 1 auto; }
.card button { align-self: flex-start; font: inherit; font-size: 14px; font-weight: 600; min-height: 44px; padding: 10px 18px; background: var(--obsidian); color: var(--ivory); border: 0; cursor: pointer; }
.card button:hover { background: var(--cobalt); }
.about h2 { font-family: 'IBM Plex Mono', Consolas, monospace; font-weight: 500; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--ink-soft); margin: 0 0 8px; }
.about p { font-size: 14px; color: var(--ink-soft); margin: 0 0 6px; max-width: 760px; }
[hidden] { display: none !important; }
@media print { .bar { display: none; } #views iframe, #home { position: static; height: auto; } }
`;
hashes.style.add(sha(shellCss));
hashes.style.add(sha(parts['css:fonts']));

// the page's own script; it never changes after the build, so its hash can be listed in the policy
const shellJs = `
(function () {
  'use strict';
  var DATA = JSON.parse(document.getElementById('sg-data').textContent);
  var P = DATA.parts, T = DATA.text, TOOLS = ['stock', 'capital', 'credit', 'charter'];
  var lang = /^ro/i.test(navigator.language || '') ? 'ro' : 'en';
  var current = 'home', frames = {}, urls = {};
  var $ = function (id) { return document.getElementById(id); };
  var SC = 'script';

  window.SGOffline = {
    version: DATA.version,
    // a worker is started from text held in this file, never from the network
    worker: function (name) {
      if (!urls[name]) urls[name] = URL.createObjectURL(new Blob([P['worker:' + name]], { type: 'text/javascript' }));
      return urls[name];
    }
  };

  function expand(html) {
    return html.replace(new RegExp('<' + '!--@(js|css):([^>]*?)--' + '>', 'g'), function (m, kind, key) {
      var text = P[kind + ':' + key];
      return kind === 'js' ? '<' + SC + '>' + text + '</' + SC + '>' : '<style>' + text + '</style>';
    });
  }

  function show(view) {
    current = view;
    $('home').hidden = view !== 'home';
    Object.keys(frames).forEach(function (k) { frames[k].hidden = k !== view; });
    if (view !== 'home' && !frames[view]) {
      var f = document.createElement('iframe');
      f.title = T[lang][view];
      f.srcdoc = expand(DATA.frames[view + ':' + lang]);
      $('views').appendChild(f);
      frames[view] = f;
    }
    document.querySelectorAll('.bar button[data-view]').forEach(function (b) {
      if (b.getAttribute('data-view') === view) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    document.title = T[lang].title + (view === 'home' ? '' : ' · ' + T[lang][view]);
  }

  function paint() {
    var x = T[lang];
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-t]').forEach(function (n) { n.textContent = x[n.getAttribute('data-t')]; });
    document.querySelectorAll('[data-card]').forEach(function (n) { n.textContent = x.cards[n.getAttribute('data-card')]; });
    document.querySelectorAll('[data-open]').forEach(function (n) { n.textContent = x.open + ': ' + x[n.getAttribute('data-open')]; });
    var about = $('about');
    about.textContent = '';
    x.about.forEach(function (s) {
      var p = document.createElement('p');
      p.textContent = s.replace('{v}', DATA.version).replace('{d}', DATA.built).replace('{e}', DATA.engine);
      about.appendChild(p);
    });
    $('langBtn').textContent = lang === 'ro' ? 'EN' : 'RO';
    $('langBtn').setAttribute('aria-label', x.langLabel);
    show(current);
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('button') : null;
    if (!b) return;
    var view = b.getAttribute('data-view') || b.getAttribute('data-open');
    if (view) { show(view); return; }
    if (b.id === 'langBtn') {
      if (Object.keys(frames).length > 0 && !window.confirm(T[lang].leave)) return;
      Object.keys(frames).forEach(function (k) { frames[k].remove(); });
      frames = {};
      current = 'home';
      lang = lang === 'ro' ? 'en' : 'ro';
      paint();
    }
  });

  // the fonts are held once in the file and given to this page and to each tool
  var fonts = document.createElement('style');
  fonts.textContent = P['css:fonts'];
  document.head.appendChild(fonts);

  paint();

  // a check that the file works on this computer: open it with #selftest at the end of its address
  if (location.hash === '#selftest') {
    var out = [], root = document.documentElement;
    var wait = function (test, ms) { return new Promise(function (ok, no) { var t0 = Date.now(); (function tick() { var v; try { v = test(); } catch (e) { v = null; } if (v) ok(v); else if (Date.now() - t0 > ms) no(new Error('timeout')); else setTimeout(tick, 200); })(); }); };
    var doc = function (k) { return frames[k].contentDocument; };
    var runTool = function (k, tiles) {
      show(k);
      return wait(function () { return doc(k) && doc(k).getElementById('sampleBtn') && doc(k).readyState === 'complete'; }, 15000)
        .then(function () { doc(k).getElementById('sampleBtn').click(); return wait(function () { return !doc(k).getElementById('runBtn').disabled; }, 15000); })
        .then(function () { doc(k).getElementById('runBtn').click(); return wait(function () { return doc(k).getElementById(tiles).children.length > 0; }, 40000); })
        .then(function () { out.push(k + ' ok: ' + doc(k).getElementById(tiles).textContent.slice(0, 80)); });
    };
    root.setAttribute('data-selftest', 'running');
    runTool('stock', 'tiles').then(function () { return runTool('credit', 'tiles'); })
      .then(function () { show('capital'); return wait(function () { return doc('capital').getElementById('exampleBtn'); }, 15000); })
      .then(function () { doc('capital').getElementById('exampleBtn').click(); return wait(function () { return doc('capital').getElementById('tiles').children.length > 0; }, 10000); })
      .then(function () { out.push('capital ok'); show('charter'); return wait(function () { return doc('charter').getElementById('classesBody').children.length > 0; }, 15000); })
      .then(function () { out.push('charter ok'); root.setAttribute('data-selftest', 'PASS | ' + out.join(' | ')); })
      .catch(function (e) { root.setAttribute('data-selftest', 'FAIL | ' + out.join(' | ') + ' | ' + e.message); });
  }
})();
`;
hashes.script.add(sha(shellJs));

const csp = "default-src 'none'; script-src " + [...hashes.script].join(' ') + "; style-src " + [...hashes.style].join(' ')
  + "; font-src data:; img-src data:; worker-src blob:; connect-src 'none'; form-action 'none'; base-uri 'none'";

const data = { version: VERSION, built, engine: engine.sourceCommit, text: TEXT, parts, frames };
const json = JSON.stringify(data).replace(/</g, '\\u003c').replace(new RegExp(String.fromCharCode(0x2028), 'g'), '\\u2028').replace(new RegExp(String.fromCharCode(0x2029), 'g'), '\\u2029');

const tabs = ['home', 'stock', 'capital', 'credit', 'charter'];
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<!-- Simon G. tools, offline. Version ${VERSION}, built ${built}. (c) 2026 GROMA S.R.L., groma.ro
     The policy on the next line is what your browser enforces for this file and for everything inside it:
     no connection to any address (connect-src 'none', default-src 'none'), no form submission,
     and only the scripts and styles whose fingerprints are listed may run. -->
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Simon G. tools, offline</title>
<style>${shellCss}</style>
</head>
<body>
<nav class="bar" aria-label="Simon G.">
  <img src="${mark}" alt="Groma">
  <span class="name">SIMON G.</span>
${tabs.map(t => `  <button type="button" data-view="${t}" data-t="tab_${t}"></button>`).join('\n')}
  <span class="spacer"></span>
  <button type="button" class="lang" id="langBtn"></button>
</nav>
<div id="views">
  <div id="home">
    <div class="in">
      <div class="roof"></div>
      <h1 data-t="h1"></h1>
      <p class="lead" data-t="lead"></p>
      <p class="trust"><strong data-t="trustB"></strong><span data-t="trust"></span></p>
      <div class="cards">
${tabs.slice(1).map(t => `        <div class="card"><h2 data-t="${t}"></h2><p data-card="${t}"></p><button type="button" data-open="${t}"></button></div>`).join('\n')}
      </div>
      <div class="about"><h2 data-t="aboutH"></h2><div id="about"></div></div>
    </div>
  </div>
</div>
<script type="application/json" id="sg-data">${json}</script>
<script>${shellJs}</script>
</body>
</html>
`;
if (shellJs.includes('</' + 'script')) throw new Error('shell script holds a closing tag');
fs.mkdirSync(path.join(root, 'out'), { recursive: true });
const outFile = path.join(root, 'out', 'simon-g-tools.html');
fs.writeFileSync(outFile, html);
const fileHash = crypto.createHash('sha256').update(fs.readFileSync(outFile)).digest('hex');
fs.writeFileSync(path.join(root, 'out', 'release.json'), JSON.stringify({ version: VERSION, built, engine: engine.sourceCommit, file: 'simon-g-tools.html', bytes: fs.statSync(outFile).size, sha256: fileHash,
  scripts: hashes.script.size, styles: hashes.style.size }, null, 1));
console.log('simon-g-tools.html', fs.statSync(outFile).size, 'bytes, sha256', fileHash);
console.log('scripts listed:', hashes.script.size, '| styles listed:', hashes.style.size);
