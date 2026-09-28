// Tests of the calculation without a browser: node test/core.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.join(here, '..', 'app');
const ctx = { console };
ctx.self = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['engine.js', 'parse.js', 'core.js', 'sample.js']) vm.runInContext(fs.readFileSync(path.join(app, f), 'utf8'), ctx, { filename: f });
vm.runInContext('self.SimonEngine = SimonEngine;', ctx);
const { SGCore, SGParse, SGSample, SimonEngine } = ctx;

let pass = 0, fail = 0;
const ok = (name, cond, extra) => { if (cond) pass++; else { fail++; console.log('FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); } };

const settings = {
  leadTimeDays: 14, leadTimeSdDays: 3, reviewPeriodDays: 7, coverCapDays: 45, excessCoverDays: 180, fillZeros: true,
  serviceLevels: { AX: 0.98, AY: 0.97, AZ: 0.95, BX: 0.96, BY: 0.95, BZ: 0.92, CX: 0.92, CY: 0.9, CZ: 0.85 },
  abcCutA: 0.8, abcCutB: 0.95, limit: { classes: ['B', 'C'], maxValue: 5000 },
};
const roles = { opening: 'opening', sale: 'sale', receipt: 'receipt', return: 'return', adjustment: 'adjust' };
const moveMap = { date: 0, sku: 1, loc: 2, type: 3, qty: 4, stockout: -1 };
const prodMap = { sku: 0, loc: 2, onHand: -1, onOrder: 7, leadTime: 3, unitCost: 4, packSize: 5, moq: 6 };

// 1. hand-made ledger: stock is rebuilt exactly
{
  const rows = [['date', 'product', 'location', 'type', 'quantity'],
    ['2026-01-01', 'A', '', 'opening', '10'],
    ['2026-01-02', 'A', '', 'sale', '4'],
    ['2026-01-03', 'A', '', 'sale', '6'],
    ['2026-01-04', 'A', '', 'sale', '0'],
    ['2026-01-05', 'A', '', 'receipt', '20'],
    ['2026-01-05', 'A', '', 'sale', '5'],
    ['2026-01-06', 'A', '', 'return', '1'],
    ['2026-01-07', 'A', '', 'adjustment', '-2'],
    ['2026-01-08', 'A', '', 'sale', '3']];
  const out = SGCore.run({ moves: { rows, map: moveMap, dec: '.', dateOrder: 'DMY', roles, flipSign: false }, opening: null, products: null, settings }, SimonEngine, SGParse);
  const r = out.results[0];
  ok('ledger: one product', out.results.length === 1);
  ok('ledger: current stock 10-4-6+20-5+1-2-3 = 11', r.stock.current === 11, r.stock);
  ok('ledger: on hand taken from the rebuilt stock', r.onHand === 11 && r.stockSource === 'rebuilt');
  ok('ledger: two days at zero (3rd and 4th)', r.stock.zeroDays === 2, r.stock);
  ok('ledger: never below zero', r.stock.negativeDays === 0);
  ok('ledger: opening row is not a sale', out.counts.rowsUsed === 9 && r.historyDays === 7, { used: out.counts.rowsUsed, days: r.historyDays });
}

// 2. missing opening stock is said, not guessed
{
  const rows = [['date', 'product', 'location', 'type', 'quantity'], ['2026-01-01', 'A', '', 'opening', '5'], ['2026-01-02', 'A', '', 'sale', '1'], ['2026-01-02', 'B', '', 'sale', '2'], ['2026-01-03', 'B', '', 'sale', '2']];
  const out = SGCore.run({ moves: { rows, map: moveMap, dec: '.', dateOrder: 'DMY', roles, flipSign: false }, opening: null, products: null, settings }, SimonEngine, SGParse);
  const b = out.results.find(x => x.sku === 'B');
  ok('no opening: stock unknown for B', b.stock === null && b.onHand === null && b.order === null, b && b.onHand);
  ok('no opening: counted', out.counts.noOpening === 1, out.counts);
}

// 3. stock below zero is reported
{
  const rows = [['date', 'product', 'location', 'type', 'quantity'], ['2026-01-01', 'A', '', 'opening', '2'], ['2026-01-02', 'A', '', 'sale', '5'], ['2026-01-03', 'A', '', 'sale', '1']];
  const out = SGCore.run({ moves: { rows, map: moveMap, dec: '.', dateOrder: 'DMY', roles, flipSign: false }, opening: null, products: null, settings }, SimonEngine, SGParse);
  ok('negative stock counted', out.counts.negativeStock === 1 && out.results[0].stock.negativeDays === 2, out.results[0].stock);
}

// 4. a ledger that writes sales as negative quantities, with a separate opening sheet
{
  const rows = [['Posting Date', 'Item', 'Loc', 'Type', 'Qty'], ['02/01/2026', 'A', 'M', 'Sale', '-4'], ['03/01/2026', 'A', 'M', 'Sale', '1'], ['04/01/2026', 'A', 'M', 'Purchase', '10']];
  const opening = { rows: [['Item', 'Loc', 'Qty'], ['A', 'M', '8']], map: { sku: 0, loc: 1, date: -1, qty: 2 }, dec: '.', dateOrder: 'DMY' };
  const out = SGCore.run({ moves: { rows, map: { date: 0, sku: 1, loc: 2, type: 3, qty: 4, stockout: -1 }, dec: '.', dateOrder: 'DMY', roles: { Sale: 'sale', Purchase: 'receipt' }, flipSign: true }, opening, products: null, settings }, SimonEngine, SGParse);
  const r = out.results[0];
  ok('negative sales: stock 8-4+1+10 = 15', r.stock.current === 15, r.stock);
  ok('opening without a date starts the day before the first movement', r.stock.from === '2026-01-01', r.stock.from);
}

// 5. the sample: every product computed, some run out, some hold too much, limits applied
const sample = SGSample.generate();
const input = { moves: { rows: sample.moves, map: moveMap, dec: '.', dateOrder: 'DMY', roles, flipSign: false }, opening: null, products: { rows: sample.products, map: prodMap, dec: '.' }, settings };
const out = SGCore.run(input, SimonEngine, SGParse);
{
  ok('sample: 24 products', out.results.length === 24, out.results.length);
  ok('sample: all have rebuilt stock', out.results.every(r => r.stockSource === 'rebuilt'));
  ok('sample: no stock below zero', out.counts.negativeStock === 0, out.counts);
  ok('sample: some ran out in the last 90 days', out.results.some(r => r.stock.zero90 > 0));
  ok('sample: some orders', out.results.some(r => r.status === 'order'));
  ok('sample: some excess', out.results.some(r => r.status === 'excess'));
  ok('sample: out-of-stock days were corrected by the engine', out.results.some(r => r.cleansing.uncensored > 0));
  const orders = out.results.filter(r => r.status === 'order');
  ok('sample: every order has a limit verdict', orders.every(r => r.limit && typeof r.limit.within === 'boolean'));
  ok('sample: class A never inside a B,C limit', orders.filter(r => r.abc === 'A').every(r => !r.limit.within));
  ok('sample: value above the ceiling is outside', orders.filter(r => r.order.value > 5000).every(r => !r.limit.within && r.limit.reasons.includes('value')));
  console.log('sample:', out.results.length, 'products;', orders.length, 'orders;', orders.filter(r => r.limit.within).length, 'inside the limit;',
    out.results.filter(r => r.status === 'excess').length, 'excess;', out.results.filter(r => r.stock.zero90 > 0).length, 'ran out in 90 days;',
    'rows', sample.moves.length - 1);
}

// 5b. the weekly error is measured, and is not above the daily one for steady sellers
{
  const withWeek = out.results.filter(r => typeof r.wmapeWeek === 'number');
  ok('weekly error: measured for most products', withWeek.length >= out.results.length * 0.8, withWeek.length);
  ok('weekly error: between 0 and the daily error', withWeek.every(r => r.wmapeWeek >= 0 && r.wmapeWeek <= r.wmape + 1e-9), withWeek.filter(r => r.wmapeWeek > r.wmape).map(r => [r.sku, r.wmape, r.wmapeWeek]));
  const steady = withWeek.filter(r => r.xyz === 'X' || r.xyz === 'Y');
  const med = a => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
  console.log('weekly error: median daily', (med(steady.map(r => r.wmape)) * 100).toFixed(0) + '%', '-> median weekly', (med(steady.map(r => r.wmapeWeek)) * 100).toFixed(0) + '%', 'on', steady.length, 'steady products');
}

// 6. no limit written means every order needs a signature
{
  const s2 = Object.assign({}, settings, { limit: { classes: ['A', 'B', 'C'], maxValue: null } });
  const o2 = SGCore.run(Object.assign({}, input, { settings: s2 }), SimonEngine, SGParse);
  ok('no limit: nothing inside', o2.results.filter(r => r.status === 'order').every(r => !r.limit.within && r.limit.reasons.includes('no_limit')));
}

// 7. same input, same output
{
  const again = SGCore.run(input, SimonEngine, SGParse);
  ok('deterministic', JSON.stringify(again.results) === JSON.stringify(out.results));
}

// 8. answers add up
{
  const a = SGCore.answer('sign', out.results);
  ok('answer sign: inside + outside = orders', a.inside + a.outside === out.results.filter(r => r.status === 'order').length, a);
  const c = SGCore.answer('cash', out.results);
  const total = out.results.reduce((t, r) => t + (r.stockValue || 0), 0);
  ok('answer cash: total equals the sum of rows', Math.abs(c.value - total) < 1e-6, [c.value, total]);
  ok('answer first: rows are orders', SGCore.answer('first', out.results).rows.every(k => out.results.find(r => r.key === k).status === 'order'));
  ok('answer ranout: counts products with empty days', SGCore.answer('ranout', out.results).count === out.results.filter(r => r.stock.zero90 > 0).length);
}

// 9. decision records follow the published schema
{
  const recs = SGCore.decisionRecords(out.results, out, settings, {
    engineVersion: 'test', sources: ['movements'], limitRef: 'Replenishment order: classes B, C up to 5000', currency: 'EUR',
    createdAt: '2026-09-28T00:00:00Z', reasoning: r => 'Order ' + r.order.qty,
  });
  ok('records: one per order', recs.length === out.results.filter(r => r.status === 'order').length);
  fs.writeFileSync(path.join(here, 'records.sample.json'), JSON.stringify(recs, null, 1));
  let validated = 'skipped';
  try {
    const { createRequire } = await import('node:module');
    const req = createRequire(process.env.AJV_DIR ? path.join(process.env.AJV_DIR, 'x.js') : import.meta.url);
    const Ajv = req('ajv/dist/2020'); const fmt = req('ajv-formats');
    const ajv = new Ajv({ allErrors: true, strict: false }); fmt(ajv);
    const v = ajv.compile(JSON.parse(fs.readFileSync(path.join(here, '..', '..', 'method', 'decision-record.schema.json'), 'utf8')));
    const bad = recs.filter(r => !v(r));
    ok('records: valid against the schema', bad.length === 0, bad.length ? v.errors : null);
    validated = 'done';
  } catch (e) { console.log('schema validation skipped:', e.message.split('\n')[0]); }
  console.log('records:', recs.length, '| schema validation', validated);
}

console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
