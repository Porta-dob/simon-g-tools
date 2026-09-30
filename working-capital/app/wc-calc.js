/* Simon G. Working Capital Check. (c) 2026 GROMA S.R.L., groma.ro */
// Pure arithmetic. No DOM, no locale formatting, no text. Loaded by the page and by the node tests.
(function (root) {
  'use strict';

  const YEAR_FIELDS = ['revenue', 'cogs', 'stock', 'receivables', 'payables', 'netProfit'];
  const NON_NEGATIVE = ['revenue', 'cogs', 'stock', 'receivables', 'payables'];
  const ABSURD_ABS = 1e15; // a bound past which a figure is not a real balance-sheet amount

  const isNum = v => typeof v === 'number' && Number.isFinite(v);
  const num = v => (isNum(v) ? v : null);

  /** Parses a figure typed as 1.234,5 or 1,234.5 or with spaces (plain or non-breaking).
   *  Returns a finite number, or null if the text holds no readable number.
   *  When both separators are present, the rightmost one is the decimal mark.
   *  When only one is present, it is read as decimal when followed by 1 or 2 digits at
   *  the end of the string, and as a thousands grouping when followed by exactly 3. */
  function parseNumber(raw) {
    if (raw === null || raw === undefined) return null;
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
    let s = String(raw).trim();
    if (s === '') return null;
    s = s.replace(/[\s  ']/g, '');
    let neg = false;
    if (s.startsWith('−')) { neg = true; s = s.slice(1); } // proper minus sign U+2212
    if (s.startsWith('-')) { neg = true; s = s.slice(1); }
    else if (s.startsWith('+')) s = s.slice(1);
    if (s.endsWith('-')) { neg = true; s = s.slice(0, -1); }
    if (s === '') return null;
    if (!/^[0-9.,]+$/.test(s)) return null;

    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    let dec;
    if (lastComma !== -1 && lastDot !== -1) {
      dec = lastComma > lastDot ? ',' : '.';
    } else if (lastComma !== -1 || lastDot !== -1) {
      const sep = lastComma !== -1 ? ',' : '.';
      const idx = lastComma !== -1 ? lastComma : lastDot;
      const after = s.length - idx - 1;
      const occurrences = s.split(sep).length - 1;
      // Repeated separators are always thousands grouping (a decimal mark cannot repeat).
      // A single occurrence followed by exactly three digits, with digits before it, also reads as grouping.
      dec = (occurrences > 1 || (occurrences === 1 && after === 3 && idx > 0)) ? null : sep;
    } else {
      dec = null;
    }

    let cleaned;
    if (dec === null) {
      cleaned = s.replace(/[.,]/g, '');
    } else {
      const other = dec === ',' ? '.' : ',';
      cleaned = s.split(other).join('');
      cleaned = dec === ',' ? cleaned.replace(',', '.') : cleaned;
    }
    if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
    const v = Number(cleaned);
    if (!Number.isFinite(v)) return null;
    return neg ? -v : v;
  }

  function validateYear(y, yearLabel, errors) {
    const clean = {};
    for (const f of YEAR_FIELDS) {
      const v = num(y ? y[f] : null);
      if (v === null) { clean[f] = null; continue; }
      if (Math.abs(v) > ABSURD_ABS) { errors.push({ field: f, year: yearLabel, code: 'absurd' }); clean[f] = null; continue; }
      if (NON_NEGATIVE.indexOf(f) !== -1 && v < 0) { errors.push({ field: f, year: yearLabel, code: 'negative' }); clean[f] = null; continue; }
      clean[f] = v;
    }
    return clean;
  }

  /** One year's ratios from clean (already-validated) figures. */
  function yearMetrics(y) {
    const { revenue, cogs, stock, receivables, payables, netProfit } = y;
    const stockDenomUsed = cogs !== null ? 'cogs' : 'revenue';
    const stockDenom = cogs !== null ? cogs : revenue;
    const payableDenomUsed = stockDenomUsed;
    const payableDenom = stockDenom;

    const stockDays = (stock !== null && stockDenom !== null && stockDenom !== 0) ? (stock / stockDenom) * 365 : null;
    const receivableDays = (receivables !== null && revenue !== null && revenue !== 0) ? (receivables / revenue) * 365 : null;
    const payableDays = (payables !== null && payableDenom !== null && payableDenom !== 0) ? (payables / payableDenom) * 365 : null;
    // the cycle is the sum of the whole-day figures shown on the page, so that the reader can add them up
    const ccc = (stockDays !== null && receivableDays !== null && payableDays !== null) ? Math.round(stockDays) + Math.round(receivableDays) - Math.round(payableDays) : null;
    const margin = (netProfit !== null && revenue !== null && revenue !== 0) ? (netProfit / revenue) * 100 : null;

    const dayValueStock = stockDenom !== null ? stockDenom / 365 : null;
    const dayValueRevenue = revenue !== null ? revenue / 365 : null;

    return {
      revenue, cogs, stock, receivables, payables, netProfit,
      stockDenomUsed, payableDenomUsed,
      stockDays, receivableDays, payableDays, ccc, margin,
      dayValueStock, dayValueRevenue,
    };
  }

  const roundOrNull = v => (v === null ? null : Math.round(v));

  function daysDelta(m0, m1, key) {
    if (m0[key] === null || m1[key] === null) return null;
    return Math.round(m1[key]) - Math.round(m0[key]);
  }
  function moneyOfDelta(delta, dayValue) {
    if (delta === null || dayValue === null) return null;
    return delta * dayValue;
  }

  function growthPct(v0, v1) {
    if (v0 === null || v1 === null || v0 === 0) return null;
    return ((v1 / v0) - 1) * 100;
  }

  function buildSentenceFacts(y0, y1, m0, m1, change) {
    const facts = [];

    const gRev = growthPct(y0.revenue, y1.revenue);
    const gStock = growthPct(y0.stock, y1.stock);
    if (gRev !== null && gStock !== null) {
      facts.push({ id: 'growthStock', growthRevenuePct: gRev, growthStockPct: gStock });
    }

    const gRecv = growthPct(y0.receivables, y1.receivables);
    if (gRev !== null && gRecv !== null && m0.receivableDays !== null && m1.receivableDays !== null) {
      facts.push({
        id: 'growthReceivables', growthRevenuePct: gRev, growthReceivablePct: gRecv,
        receivableDays0: roundOrNull(m0.receivableDays), receivableDays1: roundOrNull(m1.receivableDays),
      });
    }

    const parts = [];
    if (change.stockMoneyDelta !== null) parts.push(change.stockMoneyDelta);
    if (change.receivableMoneyDelta !== null) parts.push(change.receivableMoneyDelta);
    if (parts.length > 0) {
      facts.push({
        id: 'cashMoved',
        stockDaysDelta: change.stockDaysDelta, receivableDaysDelta: change.receivableDaysDelta,
        moneyDelta: parts.reduce((a, b) => a + b, 0),
      });
    }

    return facts;
  }

  /** input = { currency, y0: {revenue,cogs,stock,receivables,payables,netProfit}, y1: {...} }
   *  Every field is a number or null. Use parseNumber() first to turn typed text into numbers. */
  function compute(input) {
    const errors = [];
    const y0 = validateYear(input && input.y0, 'y0', errors);
    const y1 = validateYear(input && input.y1, 'y1', errors);
    const m0 = yearMetrics(y0);
    const m1 = yearMetrics(y1);

    const change = {
      stockDaysDelta: daysDelta(m0, m1, 'stockDays'),
      receivableDaysDelta: daysDelta(m0, m1, 'receivableDays'),
      payableDaysDelta: daysDelta(m0, m1, 'payableDays'),
      cccDelta: daysDelta(m0, m1, 'ccc'),
    };
    change.stockMoneyDelta = moneyOfDelta(change.stockDaysDelta, m1.dayValueStock);
    change.receivableMoneyDelta = moneyOfDelta(change.receivableDaysDelta, m1.dayValueRevenue);
    change.payableMoneyDelta = moneyOfDelta(change.payableDaysDelta, m1.dayValueStock);

    const sentences = buildSentenceFacts(y0, y1, m0, m1, change);

    const hasRequired = y => y.revenue !== null && y.stock !== null && y.receivables !== null;
    const complete = hasRequired(y0) && hasRequired(y1);

    return {
      ok: errors.length === 0,
      errors,
      complete,
      currency: (input && typeof input.currency === 'string') ? input.currency.trim() : '',
      y0: m0, y1: m1, change, sentences,
    };
  }

  /** Cash released by holding stock `stockDaysCut` days fewer and collecting `receivableDaysCut` days sooner,
   *  valued at the latest year's figures. Arithmetic only: it is not a projection of what will happen. */
  function whatIf(result, stockDaysCut, receivableDaysCut) {
    const sd = isNum(stockDaysCut) ? stockDaysCut : 0;
    const rd = isNum(receivableDaysCut) ? receivableDaysCut : 0;
    const fromStock = result.y1.dayValueStock !== null ? sd * result.y1.dayValueStock : null;
    const fromReceivables = result.y1.dayValueRevenue !== null ? rd * result.y1.dayValueRevenue : null;
    let total = null;
    if (fromStock !== null || fromReceivables !== null) total = (fromStock || 0) + (fromReceivables || 0);
    return { fromStock, fromReceivables, total };
  }

  const API = { parseNumber, compute, whatIf, yearMetrics, YEAR_FIELDS };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.SGWC = API;
})(typeof self !== 'undefined' ? self : this);
