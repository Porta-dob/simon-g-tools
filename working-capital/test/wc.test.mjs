// Node test for the pure arithmetic in ../app/wc-calc.js. No DOM, no network.
// Run: node test/wc.test.mjs
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const C = require(path.join(here, '..', 'app', 'wc-calc.js'));

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('ok - ' + name); }
  catch (e) { console.error('FAIL - ' + name); console.error(e); process.exitCode = 1; }
}
const close = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, (msg || '') + ` (got ${a}, expected ~${b})`);

// ---------------------------------------------------------------- parseNumber
test('parseNumber reads Romanian format (dot thousands, comma decimal)', () => {
  assert.equal(C.parseNumber('1.234,5'), 1234.5);
  assert.equal(C.parseNumber('1.056.698.576'), 1056698576);
});
test('parseNumber reads English format (comma thousands, dot decimal)', () => {
  assert.equal(C.parseNumber('1,234.5'), 1234.5);
  assert.equal(C.parseNumber('1,056,698,576'), 1056698576);
});
test('parseNumber reads plain integers and figures with spaces', () => {
  assert.equal(C.parseNumber('1056698576'), 1056698576);
  assert.equal(C.parseNumber(' 1 056 698 576 '), 1056698576);
  assert.equal(C.parseNumber('1 056 698 576'), 1056698576);
});
test('parseNumber reads negative numbers, leading or trailing minus, and the proper minus sign', () => {
  assert.equal(C.parseNumber('-1234,5'), -1234.5);
  assert.equal(C.parseNumber('1234,5-'), -1234.5);
  assert.equal(C.parseNumber('−1.234,5'), -1234.5);
});
test('parseNumber returns null for empty, missing or unreadable text', () => {
  assert.equal(C.parseNumber(''), null);
  assert.equal(C.parseNumber('   '), null);
  assert.equal(C.parseNumber(null), null);
  assert.equal(C.parseNumber(undefined), null);
  assert.equal(C.parseNumber('abc'), null);
  assert.equal(C.parseNumber('12-34'), null);
});
test('parseNumber accepts a raw number as-is', () => {
  assert.equal(C.parseNumber(1234.5), 1234.5);
  assert.equal(C.parseNumber(NaN), null);
});

// ---------------------------------------------------------------- real public figures
// A case from published annual accounts: revenue, stock, receivables for 2024 then 2025 (no cost of goods sold, no payables).
const published = {
  currency: 'lei',
  y0: { revenue: 1056698576, stock: 237606695, receivables: 134704109 },
  y1: { revenue: 1088647661, stock: 282783682, receivables: 173951469 },
};

test('stock days and receivable days match the published figures, computed on revenue', () => {
  const r = C.compute(published);
  assert.equal(r.ok, true);
  assert.equal(r.y0.stockDenomUsed, 'revenue');
  assert.equal(r.y1.stockDenomUsed, 'revenue');
  assert.equal(Math.round(r.y0.stockDays), 82);
  assert.equal(Math.round(r.y1.stockDays), 95);
  assert.equal(Math.round(r.y0.receivableDays), 47);
  assert.equal(Math.round(r.y1.receivableDays), 58);
});

test('one day of revenue is about 2.98 million', () => {
  const r = C.compute(published);
  close(r.y1.dayValueRevenue / 1e6, 2.98, 0.01, 'one day of revenue');
});

test('cost of goods sold, when given, is used instead of revenue for stock days', () => {
  const withCogs = {
    y0: { revenue: 1000000, cogs: 700000, stock: 100000, receivables: 50000 },
    y1: { revenue: 1100000, cogs: 750000, stock: 120000, receivables: 60000 },
  };
  const r = C.compute(withCogs);
  assert.equal(r.y0.stockDenomUsed, 'cogs');
  assert.equal(r.y1.stockDenomUsed, 'cogs');
  close(r.y1.stockDays, (120000 / 750000) * 365, 1e-9);
  // receivable days always uses revenue, cost of goods sold plays no part in it
  close(r.y1.receivableDays, (60000 / 1100000) * 365, 1e-9);
});

test('the cash conversion cycle appears only once payables are given', () => {
  const noPayables = C.compute(published);
  assert.equal(noPayables.y1.ccc, null);
  const withPayables = C.compute({
    y0: { revenue: 1000000, stock: 100000, receivables: 50000, payables: 40000 },
    y1: { revenue: 1100000, stock: 120000, receivables: 60000, payables: 45000 },
  });
  assert.notEqual(withPayables.y1.ccc, null);
  close(withPayables.y1.ccc, withPayables.y1.stockDays + withPayables.y1.receivableDays - withPayables.y1.payableDays, 1e-9);
});

// ---------------------------------------------------------------- missing, zero, negative
test('missing required inputs give null (the page shows "—"), never zero', () => {
  const r = C.compute({ y0: { revenue: 1000000, stock: 100000 }, y1: { revenue: 1100000, stock: 120000, receivables: 60000 } });
  assert.equal(r.y0.receivableDays, null);
  assert.notEqual(r.y0.receivableDays, 0);
  assert.equal(r.complete, false);
});

test('zero revenue does not throw and gives null instead of Infinity', () => {
  const r = C.compute({ y0: { revenue: 0, stock: 100000, receivables: 50000 }, y1: { revenue: 1100000, stock: 120000, receivables: 60000 } });
  assert.equal(r.y0.stockDays, null);
  assert.equal(r.y0.receivableDays, null);
  assert.equal(r.y0.dayValueRevenue, 0);
});

test('a negative stock, receivable or revenue figure is rejected with a plain error, not silently used', () => {
  const r = C.compute({ y0: { revenue: 1000000, stock: -5, receivables: 50000 }, y1: { revenue: 1100000, stock: 120000, receivables: 60000 } });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.field === 'stock' && e.year === 'y0' && e.code === 'negative'));
  assert.equal(r.y0.stockDays, null);
});

test('net profit may be negative (a loss) without being flagged', () => {
  const r = C.compute({ y0: { revenue: 1000000, stock: 100000, receivables: 50000, netProfit: -2000 }, y1: { revenue: 1100000, stock: 120000, receivables: 60000, netProfit: 3000 } });
  assert.equal(r.ok, true);
  close(r.y0.margin, -0.2, 1e-9);
});

test('an absurdly large figure is rejected', () => {
  const r = C.compute({ y0: { revenue: 1e20, stock: 100000, receivables: 50000 }, y1: { revenue: 1100000, stock: 120000, receivables: 60000 } });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.field === 'revenue' && e.code === 'absurd'));
});

// ---------------------------------------------------------------- change and sentences
test('the day-count change is the difference of the rounded day counts', () => {
  const r = C.compute(published);
  assert.equal(r.change.stockDaysDelta, Math.round(r.y1.stockDays) - Math.round(r.y0.stockDays));
  assert.equal(r.change.receivableDaysDelta, Math.round(r.y1.receivableDays) - Math.round(r.y0.receivableDays));
});

test('the money value of a day-count change is the change in days times the latest day value', () => {
  const r = C.compute(published);
  close(r.change.stockMoneyDelta, r.change.stockDaysDelta * r.y1.dayValueStock, 1e-6);
  close(r.change.receivableMoneyDelta, r.change.receivableDaysDelta * r.y1.dayValueRevenue, 1e-6);
});

test('every generated sentence fact matches the numbers it is built from', () => {
  const r = C.compute(published);
  const growth = r.sentences.find(s => s.id === 'growthStock');
  close(growth.growthRevenuePct, ((published.y1.revenue / published.y0.revenue) - 1) * 100, 1e-9);
  close(growth.growthStockPct, ((published.y1.stock / published.y0.stock) - 1) * 100, 1e-9);

  const recv = r.sentences.find(s => s.id === 'growthReceivables');
  close(recv.growthReceivablePct, ((published.y1.receivables / published.y0.receivables) - 1) * 100, 1e-9);
  assert.equal(recv.receivableDays0, Math.round(r.y0.receivableDays));
  assert.equal(recv.receivableDays1, Math.round(r.y1.receivableDays));

  const cash = r.sentences.find(s => s.id === 'cashMoved');
  close(cash.moneyDelta, r.change.stockMoneyDelta + r.change.receivableMoneyDelta, 1e-6);
});

test('sentences that need a figure that was not given are simply left out', () => {
  const r = C.compute({ y0: { revenue: 1000000, stock: 100000 }, y1: { revenue: 1100000, stock: 120000, receivables: 60000 } });
  assert.equal(r.sentences.find(s => s.id === 'growthReceivables'), undefined);
});

// ---------------------------------------------------------------- what-if
test('what-if is plain arithmetic on the latest year\'s day values', () => {
  const r = C.compute(published);
  const w = C.whatIf(r, 10, 5);
  close(w.fromStock, 10 * r.y1.dayValueStock, 1e-6);
  close(w.fromReceivables, 5 * r.y1.dayValueRevenue, 1e-6);
  close(w.total, w.fromStock + w.fromReceivables, 1e-6);
});
test('what-if with zero days released gives zero cash, not null', () => {
  const r = C.compute(published);
  const w = C.whatIf(r, 0, 0);
  assert.equal(w.total, 0);
});
test('what-if degrades to what is known when a day value is missing', () => {
  // Cost of goods sold is given, so the stock side still has a day value; revenue is missing for the
  // latest year, so the collection side (which is always valued on revenue) cannot be computed.
  const r = C.compute({ y0: { revenue: 1000000, cogs: 700000, stock: 100000, receivables: 50000 }, y1: { cogs: 750000, stock: 120000, receivables: 60000 } });
  assert.equal(r.y1.dayValueRevenue, null);
  assert.notEqual(r.y1.dayValueStock, null);
  const w = C.whatIf(r, 10, 5);
  assert.equal(w.fromReceivables, null);
  close(w.total, w.fromStock, 1e-6);
});

console.log(`\n${passed} tests passed.`);
if (process.exitCode) { console.error('Some tests failed.'); }
