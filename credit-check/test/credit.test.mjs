// Loads the built engine bundle and the shared grouping code in a vm context — the same code the
// worker runs in the browser — and checks the arithmetic against hand-computed and generated data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadContext() {
  const ctx = {};
  ctx.self = ctx;
  vm.createContext(ctx);
  // parse.js is the shared reader; read it from the sibling stock-check app folder, exactly as
  // it is published at /simon-g/app/parse.js and loaded by the credit page.
  const engineSrc = fs.readFileSync(path.join(root, 'app', 'credit-engine.js'), 'utf8');
  const parseSrc = fs.readFileSync(path.join(root, '..', 'stock-check', 'app', 'parse.js'), 'utf8');
  const calcSrc = fs.readFileSync(path.join(root, 'app', 'credit-calc.js'), 'utf8');
  vm.runInContext(engineSrc, ctx, { filename: 'credit-engine.js' });
  vm.runInContext(parseSrc, ctx, { filename: 'parse.js' });
  vm.runInContext(calcSrc, ctx, { filename: 'credit-calc.js' });
  assert.ok(ctx.SimonCredit && typeof ctx.SimonCredit.scorecard === 'function', 'SimonCredit.scorecard must load');
  assert.ok(ctx.SGParse && typeof ctx.SGParse.parseCsv === 'function', 'SGParse must load');
  assert.ok(ctx.SGCreditCalc && typeof ctx.SGCreditCalc.run === 'function', 'SGCreditCalc.run must load');
  return ctx;
}

function mapFor(ctx, headers) {
  return ctx.SGParse.guessMapping(headers, ctx.SGCreditCalc.INVOICE_FIELDS, []);
}

function runText(ctx, text, settings) {
  const headers = text.split('\n')[0].split(',');
  const map = mapFor(ctx, headers);
  return ctx.SGCreditCalc.run({
    type: 'run', invoicesText: text, invoicesDelim: ',', invoicesDec: '.', invoicesMap: map,
    dateOrder: 'DMY', settings: Object.assign({ asOf: null, marginRate: 0.20, wacc: 0.10 }, settings || {}),
  });
}

test('the mapping recognises the template header', () => {
  const ctx = loadContext();
  const headers = ['customer', 'invoice_date', 'due_date', 'payment_date', 'amount', 'amount_paid'];
  const map = mapFor(ctx, headers);
  assert.equal(map.customer, 0);
  assert.equal(map.invoiceDate, 1);
  assert.equal(map.dueDate, 2);
  assert.equal(map.paymentDate, 3);
  assert.equal(map.amount, 4);
  assert.equal(map.amountPaid, 5);
});

test('days beyond terms are computed correctly for three hand-written invoices', () => {
  const ctx = loadContext();
  const text = [
    'customer,invoice_date,due_date,payment_date,amount,amount_paid',
    'Acme,2025-01-01,2025-01-31,2025-02-05,1000,1000', // 5 days late
    'Acme,2025-02-01,2025-03-03,2025-03-01,2000,2000', // 2 days early
    'Acme,2025-03-01,2025-03-31,2025-04-10,1500,1500', // 10 days late
  ].join('\n');
  const out = runText(ctx, text);
  assert.equal(out.results.length, 1);
  const r = out.results[0];
  assert.equal(r.customer, 'Acme');
  assert.equal(r.settledCount, 3);
  // sorted newest invoice first: 2025-03-01 (dbt 10), 2025-02-01 (dbt -2), 2025-01-01 (dbt 5)
  // (values are copied out with a plain array literal — the source array was built in the vm
  // context, and assert/strict's deepEqual treats cross-realm arrays as never reference-equal)
  assert.deepEqual([...r.invoices.map(i => i.dbt)], [10, -2, 5]);
  const expectedMean = Math.round(((5 - 2 + 10) / 3) * 10) / 10;
  assert.equal(r.scorecard.meanDbt, expectedMean);
  assert.ok(r.scorecard.score >= 0 && r.scorecard.score <= 100);
  assert.ok(['A', 'B', 'C', 'D'].includes(r.scorecard.cls));
});

test('unpaid invoices are handled: overdue amount, status and no dbt', () => {
  const ctx = loadContext();
  const text = [
    'customer,invoice_date,due_date,payment_date,amount,amount_paid',
    'Acme,2025-01-01,2025-01-31,2025-02-05,1000,1000',
    'Acme,2025-02-01,2025-03-03,2025-03-01,2000,2000',
    'Acme,2025-03-01,2025-03-31,2025-04-10,1500,1500',
    'Acme,2025-04-01,2025-05-01,,500,', // still unpaid
  ].join('\n');
  const out = runText(ctx, text, { asOf: '2025-06-01' });
  const r = out.results[0];
  assert.equal(r.invoiceCount, 4);
  assert.equal(r.settledCount, 3);
  assert.equal(r.overdueAmount, 500);
  const open = r.invoices.find(i => i.paymentDate === null);
  assert.equal(open.status, 'open_overdue');
  assert.equal(open.dbt, null);
  // a customer with only 3 settled invoices still gets a scorecard (the minimum), unaffected by the open one
  assert.ok(r.scorecard);
  assert.equal(out.tiles.overdueTotal, 500);
});

test('a customer with fewer than three settled invoices gets no score', () => {
  const ctx = loadContext();
  const text = [
    'customer,invoice_date,due_date,payment_date,amount,amount_paid',
    'Newco,2025-01-01,2025-01-31,2025-02-05,1000,1000',
    'Newco,2025-02-01,2025-03-03,2025-03-10,2000,2000',
  ].join('\n');
  const out = runText(ctx, text);
  const r = out.results[0];
  assert.equal(r.sufficientHistory, false);
  assert.equal(r.scorecard, null);
  assert.equal(out.tiles.customersAnalysed, 0);
});

test('the generated template: every scored customer gets a score in range, the deteriorating customer scores below the punctual one, and the tiles equal the sum of the rows', () => {
  const ctx = loadContext();
  const csvPath = path.join(root, 'templates', 'simon-g-credit-invoices.csv');
  const text = fs.readFileSync(csvPath, 'utf8').replace(/^﻿/, '');
  const out = runText(ctx, text);
  assert.ok(!out.error, 'the template must parse without error: ' + out.error);
  assert.equal(out.results.length, 40, 'the template holds forty customers');

  for (const r of out.results) {
    if (!r.sufficientHistory) continue;
    assert.ok(Number.isFinite(r.scorecard.score), r.customer + ' must have a numeric score');
    assert.ok(r.scorecard.score >= 0 && r.scorecard.score <= 100, r.customer + ' score must be 0..100');
    assert.ok(['A', 'B', 'C', 'D'].includes(r.scorecard.cls), r.customer + ' must have a class');
  }

  // built by tools/build-templates.py: Client 01 is 'punctual', Client 07 is 'deteriorating'.
  const punctual = out.results.find(r => r.customer === 'Client 01');
  const deteriorating = out.results.find(r => r.customer === 'Client 07');
  assert.ok(punctual && punctual.scorecard, 'Client 01 must be scored');
  assert.ok(deteriorating && deteriorating.scorecard, 'Client 07 must be scored');
  assert.ok(deteriorating.scorecard.score < punctual.scorecard.score,
    `deteriorating (${deteriorating.scorecard.score}) should score below punctual (${punctual.scorecard.score})`);
  assert.ok(deteriorating.scorecard.meanDbt > punctual.scorecard.meanDbt);

  // totals in the tiles equal the sum of the rows
  const sumOverdue = Math.round(out.results.reduce((a, r) => a + r.overdueAmount, 0) * 100) / 100;
  assert.equal(out.tiles.overdueTotal, sumOverdue);

  const scored = out.results.filter(r => r.sufficientHistory);
  assert.equal(out.tiles.customersAnalysed, scored.length);
  assert.equal(out.tiles.customersTotal, out.results.length);

  const sumCost = Math.round(scored.reduce((a, r) => a + r.scorecard.financingCostPerYear, 0) * 100) / 100;
  assert.equal(out.tiles.yearlyCostTotal, sumCost);

  const dbtNum = out.results.reduce((a, r) => a + r.weightedDbtNumerator, 0);
  const dbtDen = out.results.reduce((a, r) => a + r.settledAmount, 0);
  const expectedWeighted = dbtDen > 0 ? Math.round((dbtNum / dbtDen) * 10) / 10 : null;
  assert.equal(out.tiles.weightedAvgDbt, expectedWeighted);

  // some invoices in the template were left unpaid on purpose
  const anyOpen = out.results.some(r => r.invoices.some(i => i.status !== 'paid'));
  assert.ok(anyOpen, 'the template must include unpaid invoices');
});
