/* Simon G. Credit Check. (c) 2026 GROMA S.R.L., groma.ro */
// The grouping and aggregation that turns invoice rows into a per-customer scorecard.
// Pure logic: no importScripts, no onmessage, no network. Loaded by credit-worker.js and by the
// node test, both after credit-engine.js and parse.js are in scope. Needs SGParse and SimonCredit.
(function (root) {
  'use strict';

  const DAY = 86400000;
  const dayNum = iso => Math.round(Date.parse(iso + 'T00:00:00Z') / DAY);
  const monthsBetween = (fromDay, toDay) => (toDay - fromDay) / 30.44;

  /** Column definitions for the one invoice file. Header regexes only — the date-order and
   *  decimal-mark guesses run separately, on the columns once chosen (see credit-app.js). */
  const INVOICE_FIELDS = [
    { id: 'customer', label: 'Customer', required: true,
      re: /^(customer|client|partener|cump[aă]r[aă]tor|debitor|denumire.?(client|partener)|company|firm[aă])/i },
    { id: 'invoiceDate', label: 'Invoice date', required: true,
      re: /(invoice.?date|data.?factur|issue.?date|doc.?date|data.?emiterii)/i },
    { id: 'dueDate', label: 'Due date', required: true,
      re: /(due.?date|scaden|maturit|payment.?due|data.?scaden)/i },
    { id: 'paymentDate', label: 'Payment date', required: false,
      re: /(payment.?date|data.?plat|paid.?date|data.?incas|data.?[iî]ncas|clearing.?date)/i },
    { id: 'amount', label: 'Amount', required: true,
      re: /^(?!.*(plat|paid|incas|[iî]ncas))(amount|suma|sum[aă]|valoare|value|total)/i },
    { id: 'amountPaid', label: 'Amount paid', required: false,
      re: /(paid|plat|incas|[iî]ncas)/i },
    { id: 'incidentMonthsAgo', label: 'Months since a payment incident, if any', required: false,
      re: /incident/i },
    { id: 'insolvency', label: 'Insolvency flag', required: false,
      re: /insolven/i },
  ];

  const truthy = v => /^(1|true|yes|y|da|x)$/i.test(String(v === undefined || v === null ? '' : v).trim());

  /** Reads every row into a flat list of invoices, grouped by customer name (trimmed, as given). */
  function readInvoices(msg, counts) {
    const P = root.SGParse;
    const rows = P.parseCsv(msg.invoicesText, msg.invoicesDelim);
    const map = msg.invoicesMap;
    const toDate = P.makeDateParser(msg.dateOrder);
    const customers = new Map();
    counts.rowsRead = Math.max(0, rows.length - 1);
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const customer = String(r[map.customer] === undefined ? '' : r[map.customer]).trim();
      if (customer === '') { counts.badCustomer++; continue; }
      const invoiceDate = toDate(r[map.invoiceDate]);
      if (invoiceDate === null) { counts.badInvoiceDate++; continue; }
      const dueDate = toDate(r[map.dueDate]);
      if (dueDate === null) { counts.badDueDate++; continue; }
      const amount = P.parseNumber(r[map.amount], msg.invoicesDec);
      if (amount === null) { counts.badAmount++; continue; }
      let paymentDate = null;
      if (map.paymentDate >= 0) {
        const raw = r[map.paymentDate];
        const s = String(raw === undefined || raw === null ? '' : raw).trim();
        if (s !== '') {
          paymentDate = toDate(s);
          if (paymentDate === null) counts.badPaymentDate++;
        }
      }
      const amountPaid = map.amountPaid >= 0 ? P.parseNumber(r[map.amountPaid], msg.invoicesDec) : null;
      const incidentMonthsAgo = map.incidentMonthsAgo >= 0 ? P.parseNumber(r[map.incidentMonthsAgo], msg.invoicesDec) : null;
      const insolvency = map.insolvency >= 0 && truthy(r[map.insolvency]);

      let list = customers.get(customer);
      if (!list) { list = []; customers.set(customer, list); }
      list.push({ invoiceDate, dueDate, paymentDate, amount, amountPaid, incidentMonthsAgo, insolvency });
      counts.rowsUsed++;
    }
    return customers;
  }

  /** Builds one customer's scorecard input and derived figures from their raw invoices.
   *  minSettled is the number of settled (paid) invoices needed before a score is shown —
   *  below it the engine's arithmetic would run on too little data to mean anything. */
  function computeCustomer(customer, invoices, asOfDay, settings, minSettled) {
    const settledRaw = [], open = [];
    for (const inv of invoices) (inv.paymentDate !== null ? settledRaw : open).push(inv);

    const settled = settledRaw.map(inv => {
      const dbt = dayNum(inv.paymentDate) - dayNum(inv.dueDate);
      const paidFull = inv.amountPaid === null ? true : inv.amountPaid >= inv.amount - 0.01;
      const monthsAgo = Math.max(0, monthsBetween(dayNum(inv.paymentDate), asOfDay));
      return { amount: inv.amount, dbt, paidFull, monthsAgo };
    });

    // The scorecard is built on invoices already paid. An invoice still unpaid long after its due date
    // is therefore not in the score; the page says so next to the score.
    let overdueAmount = 0, oldestOverdueDays = 0;
    for (const inv of open) {
      const outstanding = inv.amount - (inv.amountPaid || 0);
      if (outstanding > 0 && dayNum(inv.dueDate) < asOfDay) {
        overdueAmount += outstanding;
        oldestOverdueDays = Math.max(oldestOverdueDays, asOfDay - dayNum(inv.dueDate));
      }
    }

    const firstInvoiceDay = invoices.reduce((min, inv) => Math.min(min, dayNum(inv.invoiceDate)), Infinity);
    const spanDays = Math.max(1, asOfDay - firstInvoiceDay);
    const relationYears = spanDays / 365.25;

    const trailingFrom = asOfDay - 365;
    let trailingSum = 0, allSum = 0;
    for (const inv of invoices) {
      allSum += inv.amount;
      if (dayNum(inv.invoiceDate) >= trailingFrom) trailingSum += inv.amount;
    }
    const annualized = spanDays < 365;
    const annualPurchases = annualized ? allSum * 365 / spanDays : trailingSum;

    let incidentMonthsAgo = null;
    for (const inv of invoices) {
      if (typeof inv.incidentMonthsAgo === 'number' && inv.incidentMonthsAgo >= 0
        && (incidentMonthsAgo === null || inv.incidentMonthsAgo < incidentMonthsAgo)) incidentMonthsAgo = inv.incidentMonthsAgo;
    }
    const insolvencyActive = invoices.some(inv => inv.insolvency);

    const sufficientHistory = settled.length >= minSettled;
    const scorecard = sufficientHistory ? root.SimonCredit.scorecard({
      settled, relationYears, incidentMonthsAgo, insolvencyActive,
      annualPurchases, marginRate: settings.marginRate, wacc: settings.wacc,
    }) : null;

    const weightedDbtNumerator = settled.reduce((a, x) => a + x.dbt * x.amount, 0);
    const settledAmount = settled.reduce((a, x) => a + x.amount, 0);

    const invoiceRows = invoices.slice().sort((a, b) => dayNum(b.invoiceDate) - dayNum(a.invoiceDate)).map(inv => {
      const status = inv.paymentDate !== null ? 'paid' : (dayNum(inv.dueDate) < asOfDay ? 'open_overdue' : 'open_not_due');
      return {
        invoiceDate: inv.invoiceDate, dueDate: inv.dueDate, paymentDate: inv.paymentDate,
        amount: inv.amount, amountPaid: inv.amountPaid,
        dbt: inv.paymentDate !== null ? dayNum(inv.paymentDate) - dayNum(inv.dueDate) : null,
        status,
      };
    });

    return {
      customer, invoiceCount: invoices.length, settledCount: settled.length, openCount: open.length,
      sufficientHistory, relationYears: +relationYears.toFixed(1), annualPurchases: +annualPurchases.toFixed(2), annualized,
      overdueAmount: +overdueAmount.toFixed(2), oldestOverdueDays, incidentMonthsAgo, insolvencyActive,
      scorecard, weightedDbtNumerator, settledAmount,
      invoices: invoiceRows,
    };
  }

  /** Runs the whole calculation. msg carries the raw file text plus the chosen mapping/format
   *  and the visitor's assumptions (as-of date, margin rate, cost of capital). Returns the
   *  payload the page renders; nothing here talks to the network. */
  function run(msg, onProgress) {
    const counts = {
      rowsRead: 0, rowsUsed: 0, badCustomer: 0, badInvoiceDate: 0, badDueDate: 0,
      badAmount: 0, badPaymentDate: 0,
    };
    const customers = readInvoices(msg, counts);
    if (customers.size === 0) return { error: 'noRows', counts };

    let maxDay = -Infinity;
    for (const invoices of customers.values())
      for (const inv of invoices) {
        maxDay = Math.max(maxDay, dayNum(inv.invoiceDate), dayNum(inv.dueDate));
        if (inv.paymentDate !== null) maxDay = Math.max(maxDay, dayNum(inv.paymentDate));
      }
    const asOfDay = msg.settings.asOf ? dayNum(msg.settings.asOf) : maxDay;
    const asOf = new Date(asOfDay * DAY).toISOString().slice(0, 10);
    const minSettled = 3;

    const names = [...customers.keys()];
    const results = [];
    let done = 0;
    for (const name of names) {
      results.push(computeCustomer(name, customers.get(name), asOfDay, msg.settings, minSettled));
      done++;
      if (onProgress && done % 20 === 0) onProgress(done, names.length);
    }

    const scored = results.filter(r => r.sufficientHistory);
    const overdueTotal = results.reduce((a, r) => a + r.overdueAmount, 0);
    const dbtNum = results.reduce((a, r) => a + r.weightedDbtNumerator, 0);
    const dbtDen = results.reduce((a, r) => a + r.settledAmount, 0);
    const yearlyCostTotal = scored.reduce((a, r) => a + r.scorecard.financingCostPerYear, 0);

    return {
      asOf, counts, marginRate: msg.settings.marginRate, wacc: msg.settings.wacc,
      results,
      tiles: {
        customersTotal: results.length, customersAnalysed: scored.length,
        overdueTotal: +overdueTotal.toFixed(2),
        weightedAvgDbt: dbtDen > 0 ? +(dbtNum / dbtDen).toFixed(1) : null,
        yearlyCostTotal: +yearlyCostTotal.toFixed(2),
      },
    };
  }

  root.SGCreditCalc = { run, INVOICE_FIELDS, dayNum, monthsBetween };
})(typeof self !== 'undefined' ? self : this);
