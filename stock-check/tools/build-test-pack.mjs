// Builds a test pack on the Desktop: generated data with planted cases, and a guide that states
// what the Stock Check should find. The expected figures in the guide come from running the
// calculation on the pack, so the guide and the page cannot disagree.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.SG_TEST_OUT || path.join(os.homedir(), 'Desktop', 'Simon-G-Test');
fs.mkdirSync(OUT, { recursive: true });

const ctx = { console };
ctx.self = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['engine.js', 'parse.js', 'core.js', 'sample.js']) vm.runInContext(fs.readFileSync(path.join(root, 'app', f), 'utf8'), ctx, { filename: f });
vm.runInContext('self.SimonEngine = SimonEngine;', ctx);
const { SGCore, SGParse, SGSample, SimonEngine } = ctx;

const FIRST = '2026-08-31', SECOND = '2026-09-30';
const d = SGSample.generate({ products: 40, days: 760, seed: 4242, end: SECOND });
const head = d.moves[0];
let rows = d.moves.slice(1);
let products = d.products.slice(1);
const of = (code, type) => rows.filter(r => r[1] === code && (!type || r[3] === type));
const perDay = code => of(code, 'sale').length / 760;
const fast = products.map(p => p[0]).filter(c => perDay(c) > 0.8);
const planted = [];

// 1. a gap in the export: eight days of sales removed from a product that sells almost daily
{
  const code = fast[2];
  const from = '2026-05-11', to = '2026-05-18';
  const before = rows.length;
  rows = rows.filter(r => !(r[1] === code && r[3] === 'sale' && r[0] >= from && r[0] <= to));
  planted.push({ code, en: `Sales from ${from} to ${to} were removed (${before - rows.length} rows).`, expect: 'Flagged as a probable gap in the export. Open the product and read "What the calculation noted".',
    ro: `Vânzările dintre ${from} și ${to} au fost scoase (${before - rows.length} rânduri).`, expectRo: 'Semnalat ca probabilă lipsă în export. Deschideți produsul și citiți „Ce a observat calculul”.' });
}
// 2. a missing receipt: the rebuilt stock falls below zero
{
  const code = fast[4];
  const rec = of(code, 'receipt').filter(r => r[0] <= FIRST).sort((a, b) => b[4] - a[4])[0];
  rows = rows.filter(r => r !== rec);
  planted.push({ code, en: `One receipt of ${rec[4]} units on ${rec[0]} was removed.`, expect: 'The rebuilt stock falls below zero. The page reports it above the table and in the product detail.',
    ro: `O recepție de ${rec[4]} bucăți din ${rec[0]} a fost scoasă.`, expectRo: 'Stocul refăcut coboară sub zero. Pagina spune acest lucru deasupra tabelului și în detaliul produsului.' });
}
// 3. no opening stock for one product
{
  const code = fast[6];
  rows = rows.filter(r => !(r[1] === code && r[3] === 'opening'));
  planted.push({ code, en: 'Its opening stock row was removed.', expect: 'It gets a forecast and a reorder point, and no order proposal. Status: Parameters ready.',
    ro: 'Rândul cu stocul inițial a fost scos.', expectRo: 'Primește prognoză și punct de comandă, dar nu și propunere de comandă. Stare: Parametri calculați.' });
}
// 4. a product that is not in the product sheet
{
  const code = fast[8];
  products = products.filter(p => p[0] !== code);
  planted.push({ code, en: 'It was removed from the Products sheet.', expect: 'Counted as a product with no row in the product file. It uses your assumptions for lead time and has no order value.',
    ro: 'A fost scos din foaia Products.', expectRo: 'Numărat ca produs fără rând în fișierul de produse. Folosește ipotezele dumneavoastră pentru termenul de livrare și nu are valoare de comandă.' });
}
// 5. two rows that cannot be read
{
  const code = fast[0];
  rows.push(['31-31-2026', code, 'MAIN', 'sale', 5]);
  rows.push(['2026-03-03', code, 'MAIN', 'sale', 'abc']);
  planted.push({ code: '—', en: 'One row has an impossible date and one has a quantity written as text.', expect: 'Both are counted in the line under the tiles: one unreadable date, one unreadable quantity.',
    ro: 'Un rând are o dată imposibilă, iar altul are cantitatea scrisă cu litere.', expectRo: 'Amândouă sunt numărate în rândul de sub casete: o dată care nu poate fi citită și o cantitate care nu poate fi citită.' });
}
rows.sort((a, b) => (String(a[0]) < String(b[0]) ? -1 : String(a[0]) > String(b[0]) ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));

// what the calculation finds on the pack, with the page's default assumptions and a limit of classes B and C up to 2,000
const settings = {
  leadTimeDays: 14, leadTimeSdDays: 3, reviewPeriodDays: 7, coverCapDays: 45, excessCoverDays: 180, fillZeros: true,
  serviceLevels: { AX: 0.98, AY: 0.97, AZ: 0.95, BX: 0.96, BY: 0.95, BZ: 0.92, CX: 0.92, CY: 0.9, CZ: 0.85 },
  abcCutA: 0.8, abcCutB: 0.95, limit: { classes: ['B', 'C'], maxValue: 2000 },
};
const all = rows;
rows = all.filter(r => !(String(r[0]) > FIRST && /^\d{4}-/.test(String(r[0]))));
const isIso = r => /^\d{4}-\d{2}-\d{2}$/.test(String(r[0])) && !Number.isNaN(Date.parse(r[0]));
const clean = rows.filter(r => isIso(r) && typeof r[4] === 'number');
const prodRows = [d.products[0]].concat(products);
const calc = (list, previous) => SGCore.run({
  moves: { rows: [head].concat(list), map: { date: 0, sku: 1, loc: 2, type: 3, qty: 4, stockout: -1 }, dec: '.', dateOrder: 'DMY',
    roles: { opening: 'opening', sale: 'sale', receipt: 'receipt', return: 'return', adjustment: 'adjust' }, flipSign: false },
  opening: null,
  products: { rows: prodRows, map: { sku: 0, loc: 2, onHand: -1, onOrder: 7, leadTime: 3, unitCost: 4, packSize: 5, moq: 6 }, dec: '.' },
  settings, previous: previous || null,
}, SimonEngine, SGParse);
const run = calc(clean);        // what the workbook holds
const runCsv = calc(rows);      // the CSV also holds the two unreadable rows
const R = run.results;
const sum = (a, f) => a.reduce((t, x) => t + (typeof f(x) === 'number' && Number.isFinite(f(x)) ? f(x) : 0), 0);
const med = a => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[s.length >> 1] : null; };
const orders = R.filter(r => r.status === 'order');
const steady = R.filter(r => typeof r.wmapeWeek === 'number' && (r.xyz === 'X' || r.xyz === 'Y'));
const E = {
  products: R.length, badDate: runCsv.counts.badDate, badQty: runCsv.counts.badQty,
  orders: orders.length, orderValue: Math.round(sum(orders, r => r.order.value)),
  inside: orders.filter(r => r.limit.within).length, outside: orders.filter(r => !r.limit.within).length,
  ranOut: R.filter(r => r.stock && r.stock.zero90 > 0).length,
  excess: R.filter(r => r.excessUnits > 0).length, excessValue: Math.round(sum(R, r => r.excessValue)),
  stockValue: Math.round(sum(R, r => r.stockValue)),
  noOpening: run.counts.noOpening, negativeStock: run.counts.negativeStock, noStockMatch: run.counts.noStockMatch,
  holes: R.filter(r => r.holes.length > 0).length,
  errorWeek: Math.round(med(steady.map(r => r.wmapeWeek)) * 100), errorDay: Math.round(med(steady.map(r => r.wmape)) * 100),
  seasonal: R.filter(r => r.method === 'seasonal_damped_trend').length, average: R.filter(r => r.method === 'baseline_moving_average').length,
  intermittent: R.filter(r => /croston|tsb/.test(r.method)).length,
  asOf: run.asOf,
};
// the second month, compared with the first as the workspace file would hold it
const snap = JSON.parse(JSON.stringify(SGCore.snapshot(run.results, run, settings)));
const clean2 = all.filter(r => isIso(r) && typeof r[4] === 'number');
const run2 = calc(clean2, { asOf: snap.asOf });
const C = SGCore.compare(snap, run2.results, run2);
const orders2 = run2.results.filter(r => r.status === 'order');
const miss = C.rows.filter(r => r.diff !== null).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))[0];
const nf = v => new Intl.NumberFormat('en-GB').format(v);

// files
const csv = rws => '\ufeff' + rws.map(r => r.map(c => { const s = String(c); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\r\n') + '\r\n';
fs.writeFileSync(path.join(OUT, 'simon-g-test-transactions.csv'), csv([head].concat(rows)));
fs.writeFileSync(path.join(OUT, 'simon-g-test-products.csv'), csv(prodRows));
const workbook = (list, name, note) => {
  const h = path.join(OUT, 'handover.json');
  fs.writeFileSync(h, JSON.stringify({
    opening: [['product', 'location', 'date', 'quantity']].concat(list.filter(r => r[3] === 'opening').map(r => [r[1], r[2], r[0], r[4]])),
    transactions: [head].concat(list.filter(r => r[3] !== 'opening')),
    products: prodRows,
    note_en: 'Invented: 40 products of a parts distributor, one location, ' + note + ', with planted cases described in TEST-GUIDE.md.',
    note_ro: 'Inventate: 40 de produse ale unui distribuitor de piese, o locație, ' + note + ', cu cazuri plantate, descrise în TEST-GUIDE.md.',
  }));
  execFileSync('python', [path.join(root, 'tools', 'build-templates.py'), h, path.join(OUT, name)], { stdio: 'inherit' });
  fs.unlinkSync(h);
};
workbook(clean, 'simon-g-test-stock.xlsx', 'data to ' + FIRST);
workbook(clean2, 'simon-g-test-stock-next-month.xlsx', 'data to ' + SECOND);

const credit = path.resolve(root, '..', 'credit-check', 'templates', 'simon-g-credit-invoices.xlsx');
if (fs.existsSync(credit)) fs.copyFileSync(credit, path.join(OUT, 'simon-g-test-invoices.xlsx'));

const guide = `# Simon G. test pack

Generated on ${new Date().toISOString().slice(0, 10)}. All data is invented.

## What is in this folder

| File | Use it on |
|---|---|
| \`simon-g-test-stock.xlsx\` | Stock Check, first month: one workbook with transactions, opening stock and products, to ${FIRST} |
| \`simon-g-test-stock-next-month.xlsx\` | Stock Check, second month: the same workbook with one more month, to ${SECOND} |
| \`simon-g-test-transactions.csv\` | Stock Check: the same transactions as CSV, with the opening stock inside and two unreadable rows |
| \`simon-g-test-products.csv\` | Stock Check: the product data as CSV |
| \`simon-g-test-invoices.xlsx\` | Credit Check |

## Test 1: the workbook

1. Open https://groma.ro/en/simon-g/stock-check
2. Choose \`simon-g-test-stock.xlsx\`.
3. Check that the page found three sheets, and that each transaction type has the right meaning.
4. Under "Approval limit", tick classes B and C and write 2000 as the value.
5. Leave the other assumptions as they are and run.

### What you should see

| Figure | Expected |
|---|---|
| Products analysed | ${E.products} |
| To order now | ${E.orders} products, value ${nf(E.orderValue)} |
| Inside your limit | ${E.inside}, with ${E.outside} more needing a signature |
| Ran out of stock in the last 90 days | ${E.ranOut} |
| Excess stock | ${E.excess} products, value ${nf(E.excessValue)} |
| Stock value | ${nf(E.stockValue)} |
| Typical forecast error, per week | ${E.errorWeek}% (the daily figure is ${E.errorDay}%) |
| Results dated | ${E.asOf} |

Forecast methods chosen: seasonal with trend for ${E.seasonal} products, moving average for ${E.average}, methods for irregular demand for ${E.intermittent}.

These figures were computed by the same calculation the page uses. If the page shows something else, that is a defect. Please note which figure differs.

## Test 2: the planted cases

| Product | What was done to the data | What the page should do |
|---|---|---|
${planted.map(p => `| ${p.code} | ${p.en} | ${p.expect} |`).join('\n')}

Under the tiles the page should also say:

| Line | Expected |
|---|---|
| Products with transactions but no opening stock | ${E.noOpening} |
| Products whose rebuilt stock falls below zero | ${E.negativeStock} |
| Products with no row in the product file | ${E.noStockMatch} |
| Products with a probable gap in the export | ${E.holes} |

The two unreadable rows are in the CSV file only. Load \`simon-g-test-transactions.csv\`, then \`simon-g-test-products.csv\` under "Separate files", to see them counted: ${E.badDate} unreadable date and ${E.badQty} unreadable quantity.

## Test 3: the next month

This is what a planner does the month after.

1. Finish Test 1. Under the results, press "Save workspace". A file named \`simon-g-workspace-${FIRST}.json\` lands in your downloads folder.
2. Reload the page, so that it starts empty.
3. Press "Load your workspace file" and choose that file.
4. Choose \`simon-g-test-stock-next-month.xlsx\`. The columns, the transaction types and the limit should already be set. You should not have to type anything.
5. Run.

A block named "Since your last run" should appear under the results.

| Figure | Expected |
|---|---|
| Period | ${C.from} to ${C.to}, ${C.days} days |
| Forecast for the period | ${nf(Math.round(C.totals.forecast))}, sold ${nf(Math.round(C.totals.sold))} |
| Forecast error over the period | ${Math.round(C.totals.error * 100)}% |
| Proposals followed | ${C.totals.followed} of ${C.totals.proposals}, with ${C.totals.partly} partly, ${C.totals.notFollowed} not and ${C.totals.notDue} not yet due |
| Not followed, then ran out | ${C.totals.notFollowedEmpty} |
| Largest difference | ${miss.sku}: forecast ${nf(Math.round(miss.forecast))}, sold ${nf(Math.round(miss.sold))} |
| To order now, second month | ${orders2.length} products, value ${nf(Math.round(sum(orders2, r => r.order.value)))} |

The receipts in the second month were invented without regard to the proposals, so "followed" here only shows that the page reads receipts correctly.

Then press "Management report". A short report of about two pages should open, with the key figures, the orders that need a signature, the excess stock, the comparison and the notes on the data. Write a title, then press "Print or save as PDF". The printed page should hold the report only.

## Test 4: try to break it

| Try | What should happen |
|---|---|
| Change every transaction type marked "Sale" to "Leave out" | The run button stays off until one type is a sale |
| Set the lead time to 60 days | It changes only the product that has no row in the product file |
| Remove the value from the approval limit | Every order needs a signature |
| Tick class A in the approval limit and raise the value | More orders fall inside the limit |
| Rename a column in the workbook, for example "quantity" to "buc" | The page still finds it, or asks you to choose the column |
| Delete the Opening stock sheet | Forecasts and reorder points only, with a plain warning |
| Load an old \`.xls\` file | A message asks for \`.xlsx\` or CSV |
| Use the page on a phone | No sideways scrolling |
| Press "Show me how it works" | Seven steps on the page's own sample |
| Ask each of the six questions | An answer in words, and the table sorted to match |
| Export the decision records | A JSON file with one record per order |
| Load the workspace, then the first month again | The page says the dates are the same and compares nothing |
| Load the workspace, then a file with other column names | The columns are guessed again; nothing from the workspace is forced onto them |
| Load a text file as the workspace | The page says it is not a workspace file |

## Test 5: the other tools

| Tool | Address | What to try |
|---|---|---|
| Working Capital Check | https://groma.ro/en/simon-g/working-capital | Press "Fill with an example", then change one figure |
| Credit Check | https://groma.ro/en/simon-g/credit-check | Load \`simon-g-test-invoices.xlsx\`, run, open the customer with the lowest score |
| Decision Charter | https://groma.ro/en/simon-g/decision-charter | Fill in three owners and three limits, then print |

## What to write down

For each thing that looks wrong: the page, what you did, what you expected and what you saw. A screenshot helps.

---

# Pachet de test Simon G.

Toate datele sunt inventate. Pașii sunt aceiași ca mai sus, pe https://groma.ro/simon-g/verificare-stoc.

| Produs | Ce s-a făcut cu datele | Ce trebuie să facă pagina |
|---|---|---|
${planted.map(p => `| ${p.code} | ${p.ro} | ${p.expectRo} |`).join('\n')}
`;
fs.writeFileSync(path.join(OUT, 'TEST-GUIDE.md'), guide);
console.log(JSON.stringify(E));
for (const f of fs.readdirSync(OUT)) console.log(f, fs.statSync(path.join(OUT, f)).size, 'B');
