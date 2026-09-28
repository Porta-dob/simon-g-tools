/* Simon G. Stock Check. (c) 2026 GROMA S.R.L., groma.ro */
// The calculation, free of the page and of the worker, so that it can be tested on its own.
// It reads movements and an opening balance, rebuilds the stock day by day, and asks the engine
// for a forecast, replenishment parameters and an order proposal per product.
(function (root) {
  'use strict';

  const DAY = 86400000;
  const SEP = '\u0001';
  const dayNum = iso => Math.round(Date.parse(iso + 'T00:00:00Z') / DAY);
  const dayIso = n => new Date(n * DAY).toISOString().slice(0, 10);
  const weekStart = n => n - ((new Date(n * DAY).getUTCDay() + 6) % 7);
  const cell = (r, i) => String(i >= 0 && r[i] !== undefined && r[i] !== null ? r[i] : '').trim();

  const ROLES = ['sale', 'return', 'receipt', 'adjust', 'opening', 'ignore'];

  /** A first guess of what a transaction type means. The visitor can change every one. */
  function guessRole(value) {
    const v = String(value).trim().toLowerCase();
    if (v === '') return 'ignore';
    if (/^(601|sale|sales|vanzare|vânzare|vanzari|vânzări|invoice|factura|factură|issue)$/.test(v) || /^(sale|vanz|vânz)/.test(v)) return 'sale';
    if (/^(602|651|return|retur|credit memo|storno)$/.test(v) || /(return|retur)/.test(v)) return 'return';
    if (/^(101|receipt|purchase|reception|receptie|recepție|intrare|achizitie|achiziție|purch)$/.test(v) || /^(recep|purch|achiz)/.test(v)) return 'receipt';
    if (/^(561|opening|opening stock|stoc initial|stoc inițial|sold initial|sold inițial)$/.test(v) || /(opening|ini[tț]ial)/.test(v)) return 'opening';
    if (/(adjust|ajust|inventar|count|scrap|rebut|transfer|positive|negative)/.test(v) || /^(7\d\d|3\d\d)$/.test(v)) return 'adjust';
    return 'ignore';
  }

  function weekly(points) {
    const m = new Map();
    for (const p of points) {
      const w = weekStart(p.day);
      const cur = m.get(w) || { q: 0, n: 0 };
      cur.q += p.qty; cur.n++; m.set(w, cur);
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0])
      .map(([w, v]) => ({ w: dayIso(w), q: Math.round(v.q * 100) / 100, n: v.n }));
  }

  function readMovements(src, P, counts) {
    const rows = src.rows, map = src.map;
    const toDate = P.makeDateParser(src.dateOrder);
    const roles = src.roles || null;
    const series = new Map();
    const opening = new Map();
    let lastDay = -Infinity, firstDay = Infinity;
    const get = key => {
      let s = series.get(key);
      if (!s) { const [sku, loc] = key.split(SEP); s = { sku, loc, days: new Map() }; series.set(key, s); }
      return s;
    };
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const role = roles === null || map.type < 0 ? 'sale' : (roles[cell(r, map.type)] || 'ignore');
      if (role === 'ignore') { counts.otherType++; continue; }
      const date = toDate(r[map.date]);
      const raw = P.parseNumber(r[map.qty], src.dec);
      const sku = cell(r, map.sku);
      if (date === null) { counts.badDate++; continue; }
      if (raw === null) { counts.badQty++; continue; }
      if (sku === '') { counts.noSku++; continue; }
      const key = sku + SEP + cell(r, map.loc);
      const d = dayNum(date);
      counts.rowsUsed++;
      if (role === 'opening') {
        const cur = opening.get(key);
        if (!cur || d >= cur.day) opening.set(key, { day: d, qty: Math.abs(raw) });
        get(key);
        continue;
      }
      if (d > lastDay) lastDay = d;
      if (d < firstDay) firstDay = d;
      const s = get(key);
      const c = s.days.get(d) || { demand: 0, flow: 0, stockout: false, sold: false };
      if (role === 'sale') {
        const q = src.flipSign ? -raw : raw;
        c.demand += q; c.flow -= q; c.sold = true;
      } else if (role === 'return') { c.demand -= Math.abs(raw); c.flow += Math.abs(raw); c.sold = true; }
      else if (role === 'receipt') c.flow += Math.abs(raw);
      else if (role === 'adjust') c.flow += raw;
      if (map.stockout >= 0 && /^(1|true|yes|y|da|x)$/i.test(cell(r, map.stockout))) c.stockout = true;
      s.days.set(d, c);
    }
    counts.rowsRead = Math.max(0, rows.length - 1);
    return { series, opening, lastDay, firstDay };
  }

  function readOpening(src, P, into, firstDay, counts) {
    if (!src) return;
    const map = src.map;
    const toDate = P.makeDateParser(src.dateOrder || 'DMY');
    for (let i = 1; i < src.rows.length; i++) {
      const r = src.rows[i];
      const sku = cell(r, map.sku);
      const q = P.parseNumber(r[map.qty], src.dec);
      if (sku === '' || q === null) { counts.openingBad++; continue; }
      const date = map.date >= 0 ? toDate(r[map.date]) : null;
      const day = date !== null ? dayNum(date) : firstDay - 1;
      if (date === null) counts.openingNoDate++;
      into.set(sku + SEP + cell(r, map.loc), { day, qty: q });
      counts.openingRows++;
    }
  }

  function readProducts(src, P) {
    const out = new Map();
    if (!src) return out;
    const map = src.map;
    const num = (r, id) => (map[id] >= 0 ? P.parseNumber(r[map[id]], src.dec) : null);
    for (let i = 1; i < src.rows.length; i++) {
      const r = src.rows[i];
      const sku = cell(r, map.sku);
      if (sku === '') continue;
      out.set(sku + SEP + cell(r, map.loc), {
        onHand: num(r, 'onHand'), onOrder: num(r, 'onOrder'),
        leadTime: map.leadTime >= 0 ? P.parseLeadTime(r[map.leadTime], src.dec) : null,
        unitCost: num(r, 'unitCost'), packSize: num(r, 'packSize'), moq: num(r, 'moq'),
      });
    }
    return out;
  }

  /** A product that sells on most days and then shows no sale for a week is more likely a hole in
   *  the export than a week without sales, unless the stock was at zero. */
  function findHoles(saleDays, first, lastDay) {
    const span = lastDay - first + 1;
    if (span < 30 || saleDays.length / span < 0.6) return [];
    const holes = [];
    let prev = first;
    for (const d of saleDays) {
      if (d - prev - 1 > 5) holes.push([prev + 1, d - 1]);
      prev = d;
    }
    return holes;
  }

  /** Stock at the end of each day, from the opening balance forward. */
  function rebuildStock(s, open, lastDay) {
    if (!open) return null;
    const onHand = new Map();
    let run = open.qty, negativeDays = 0, zeroDays = 0, min = run;
    for (let d = open.day; d <= lastDay; d++) {
      const c = s.days.get(d);
      if (c && d >= open.day) run += c.flow;
      run = Math.round(run * 1e6) / 1e6;
      onHand.set(d, run);
      if (run < 0) negativeDays++;
      if (run <= 0) zeroDays++;
      if (run < min) min = run;
    }
    let zero90 = 0;
    for (let d = Math.max(open.day, lastDay - 89); d <= lastDay; d++) if (onHand.get(d) <= 0) zero90++;
    return { onHand, current: run, negativeDays, zeroDays, zero90, min, from: open.day };
  }

  function buildHistory(s, stock, lastDay, fillZeros, counts) {
    const saleDays = [...s.days.entries()].filter(e => e[1].sold).map(e => e[0]).sort((a, b) => a - b);
    if (saleDays.length === 0) return { hist: [], holes: [] };
    const first = saleDays[0];
    const out = (d, c) => {
      let q = c ? c.demand : 0;
      if (q < 0) { q = 0; counts.negativeDays++; }
      const empty = stock !== null && stock.onHand.has(d) && stock.onHand.get(d) <= 0;
      return { date: dayIso(d), qty: q, stockout: empty || (c ? c.stockout : false) };
    };
    const hist = [];
    let holes = [];
    if (fillZeros) {
      holes = findHoles(saleDays, first, lastDay).filter(h => {
        // a silence explained by an empty shelf is a stockout, not a gap in the export
        if (stock === null) return true;
        let empty = 0;
        for (let d = h[0]; d <= h[1]; d++) if (stock.onHand.has(d) && stock.onHand.get(d) <= 0) empty++;
        return empty < (h[1] - h[0] + 1) / 2;
      });
      const inHole = d => holes.some(h => d >= h[0] && d <= h[1]);
      for (let d = first; d <= lastDay; d++) if (!inHole(d)) hist.push(out(d, s.days.get(d)));
    } else for (const d of saleDays) hist.push(out(d, s.days.get(d)));
    return { hist, holes };
  }

  /** Whether an order may go ahead on one signature, under the limit the visitor wrote. */
  function limitCheck(row, limit) {
    const reasons = [];
    if (!limit || limit.maxValue === null || limit.maxValue === undefined) reasons.push('no_limit');
    else {
      if (limit.classes.indexOf(row.abc) === -1) reasons.push('class');
      if (row.order.value === null) reasons.push('no_cost');
      else if (row.order.value > limit.maxValue) reasons.push('value');
      if (row.holes.length > 0 || (row.stock && row.stock.negativeDays > 0)) reasons.push('data');
    }
    return { within: reasons.length === 0, reasons };
  }

  function run(input, E, P, progress) {
    const set = input.settings;
    const counts = {
      rowsRead: 0, rowsUsed: 0, badDate: 0, badQty: 0, noSku: 0, negativeDays: 0, otherType: 0, noStockMatch: 0,
      openingRows: 0, openingBad: 0, openingNoDate: 0, noOpening: 0, negativeStock: 0, noSales: 0,
    };
    const { series, opening, lastDay, firstDay } = readMovements(input.moves, P, counts);
    readOpening(input.opening, P, opening, firstDay, counts);
    counts.openingRows = opening.size;
    const products = readProducts(input.products, P);
    if (series.size === 0 || lastDay === -Infinity) return { error: 'noRows', counts };
    const asOf = dayIso(lastDay);

    const keys = [...series.keys()];
    const productFor = k => products.get(k) || products.get(k.split(SEP)[0] + SEP) || null;
    const openingFor = k => opening.get(k) || opening.get(k.split(SEP)[0] + SEP) || null;
    const allCosted = keys.every(k => { const p = productFor(k); return p && typeof p.unitCost === 'number' && p.unitCost > 0; });
    const weights = keys.map(k => {
      let units = 0;
      for (const [d, c] of series.get(k).days) if (d >= lastDay - 364 && c.demand > 0) units += c.demand;
      return { id: k, margin: allCosted ? units * productFor(k).unitCost : units };
    });
    const abc = E.classifyABC(weights, set.abcCutA, set.abcCutB);

    const results = [];
    let done = 0;
    for (const key of keys) {
      const s = series.get(key);
      const p = productFor(key);
      if (products.size > 0 && p === null) counts.noStockMatch++;
      const stock = rebuildStock(s, openingFor(key), lastDay);
      if (opening.size > 0 && stock === null) counts.noOpening++;
      if (stock !== null && stock.negativeDays > 0) counts.negativeStock++;
      const { hist: history, holes } = buildHistory(s, stock, lastDay, set.fillZeros, counts);
      if (history.length === 0) { counts.noSales++; continue; }

      const fileLead = p && typeof p.leadTime === 'number' && p.leadTime >= 0;
      const leadMean = fileLead ? p.leadTime : set.leadTimeDays;
      const horizon = Math.min(730, Math.max(91, Math.ceil(leadMean + set.reviewPeriodDays) + 14));
      const r = E.planSeries({
        skuId: s.sku, locId: s.loc || '-', history, future: [],
        forecastFactors: { horizonDays: horizon },
        leadTime: { mean: leadMean, sd: set.leadTimeSdDays },
        reviewPeriodDays: set.reviewPeriodDays,
        abc: abc.get(key) || null,
        serviceLevelMatrix: set.serviceLevels,
      });

      const periods = r.forecast.periods || [];
      const fcDaily = periods.map(x => x.forecast);
      const fc30 = fcDaily.slice(0, 30).reduce((a, b) => a + b, 0);
      const fcMean = fcDaily.length > 0 ? fcDaily.reduce((a, b) => a + b, 0) / fcDaily.length : null;

      const fileStock = p && typeof p.onHand === 'number';
      const onHand = fileStock ? p.onHand : (stock !== null ? stock.current : null);
      const stockWeekly = stock === null ? [] : weekly([...stock.onHand.entries()].filter(e => e[0] > lastDay - 728).map(e => ({ day: e[0], qty: e[1] })))
        .map(w => ({ w: w.w, q: Math.round((w.q / w.n) * 100) / 100, n: w.n }));

      const out = {
        key, sku: s.sku, loc: s.loc, abc: abc.get(key) || null,
        xyz: r.xyz === 'not_computable' ? null : r.xyz,
        state: r.state, reason: r.reason,
        historyDays: history.length, firstDate: history[0].date, lastDate: history[history.length - 1].date,
        meanDaily: r.demandMeanDaily, fc30: periods.length > 0 ? fc30 : null, fcMeanDaily: fcMean,
        method: r.forecast.method, forecastState: r.forecast.state,
        wmape: r.forecast.accuracy.wmape, baselineWmape: r.forecast.accuracy.baselineWmape,
        origins: r.forecast.accuracy.originsScored,
        csl: r.service.csl, leadTime: leadMean, leadFrom: fileLead ? 'file' : 'assumption',
        safetyStock: r.safetyStock, reorderPoint: r.reorderPoint, orderUpTo: r.orderUpTo,
        notes: (r.forecast.cleansing.notes || []).concat(r.provenance.notes || []),
        limits: r.forecast.limits || [], absent: r.provenance.absent || [],
        cleansing: r.forecast.cleansing.counts,
        demandFrequency: r.stats ? r.stats.demandFrequency : null,
        holes: holes.map(h => ({ from: dayIso(h[0]), to: dayIso(h[1]), days: h[1] - h[0] + 1 })),
        histWeekly: weekly(history.slice(-728).map(h => ({ day: dayNum(h.date), qty: h.qty }))),
        fcWeekly: weekly(periods.map(x => ({ day: dayNum(x.date), qty: x.forecast }))),
        stockWeekly,
        stock: stock === null ? null : { from: dayIso(stock.from), current: stock.current, zeroDays: stock.zeroDays, zero90: stock.zero90, negativeDays: stock.negativeDays, min: stock.min },
        stockSource: fileStock ? 'file' : (stock !== null ? 'rebuilt' : null),
        onHand, onOrder: p ? p.onOrder : null, unitCost: p ? p.unitCost : null,
        coverDays: null, order: null, excessUnits: null, excessValue: null, stockValue: null,
        limit: null, status: 'parameters',
      };
      if (r.state !== 'computed') out.status = 'not_computable';

      if (typeof onHand === 'number') {
        const cost = p && typeof p.unitCost === 'number' && p.unitCost >= 0 ? p.unitCost : null;
        const held = Math.max(0, onHand);
        out.stockValue = cost !== null ? held * cost : null;
        if (fcMean !== null && fcMean > 0) {
          out.coverDays = held / fcMean;
          out.excessUnits = Math.max(0, held - fcMean * set.excessCoverDays);
        } else if (fcMean !== null && held > 0) out.excessUnits = held;
        if (out.excessUnits !== null && cost !== null) out.excessValue = out.excessUnits * cost;

        if (r.state === 'computed' && r.service.csl !== null && fcDaily.length > 0) {
          const factors = Object.assign({}, E.DEFAULT_ORDERING_FACTORS, { reviewPeriodDays: set.reviewPeriodDays, coverCapDays: set.coverCapDays });
          const pack = p && typeof p.packSize === 'number' && p.packSize > 0 ? p.packSize : null;
          const terms = {
            supplierId: '-', moqUnits: p && typeof p.moq === 'number' && p.moq > 0 ? p.moq : null, orderMultiple: pack,
            minOrderValue: null, orderWeekdays: null, leadTimeDays: leadMean, leadTimeSdDays: set.leadTimeSdDays, priceBreaks: null,
          };
          const line = {
            skuId: s.sku, locId: s.loc || '-', supplierId: '-', onHand: held,
            onOrder: p && typeof p.onOrder === 'number' && p.onOrder > 0 ? [{ qty: p.onOrder, dueDate: dayIso(lastDay + Math.ceil(leadMean)) }] : [],
            reserved: null, packSize: pack, unitCost: cost === null ? 0 : cost, unitPrice: null,
            forecastDaily: fcDaily, forecastErrorSdOverProtection: null, demandSdDaily: r.sigmaDaily, serviceLevel: r.service.csl,
          };
          try {
            const o = E.proposeLine(line, terms, factors, asOf);
            out.order = {
              state: o.state, reason: o.reason, qty: o.qty, binding: o.binding, value: cost !== null ? o.qty * cost : null,
              orderDate: o.orderDate, arrival: o.expectedArrival, coverDaysAfter: o.coverDaysAfter,
              waterfall: o.waterfall, limits: o.limits, absent: o.absent,
            };
            if (o.qty > 0) { out.status = 'order'; out.limit = limitCheck(out, set.limit); }
            else out.status = out.excessUnits > 0 ? 'excess' : 'covered';
          } catch (err) {
            out.order = { state: 'not_computable', reason: String((err && err.message) || err), qty: 0, waterfall: [], limits: [], absent: [] };
            out.status = 'not_computable';
          }
        } else if (out.excessUnits > 0) out.status = 'excess';
      }
      results.push(out);
      done++;
      if (progress && done % 20 === 0) progress(done, keys.length);
    }

    return {
      results, counts, asOf, abcBasis: allCosted ? 'value' : 'units',
      hasStock: results.some(x => typeof x.onHand === 'number'),
      stockRebuilt: results.some(x => x.stockSource === 'rebuilt'),
    };
  }

  /** Fixed questions, answered from the results. No language model: the same results give the same answer. */
  function answer(id, results) {
    const num = v => typeof v === 'number' && Number.isFinite(v);
    const sum = (a, f) => a.reduce((t, x) => t + (num(f(x)) ? f(x) : 0), 0);
    const top = (a, f, n) => a.slice().sort((x, y) => f(y) - f(x)).slice(0, n || 5);
    if (id === 'first') {
      const a = results.filter(r => r.status === 'order');
      const urgent = a.filter(r => num(r.coverDays) && r.coverDays < r.leadTime);
      return { id, count: a.length, value: sum(a, r => r.order.value), urgent: urgent.length,
        rows: a.slice().sort((x, y) => (x.coverDays - x.leadTime) - (y.coverDays - y.leadTime)).slice(0, 5).map(r => r.key), status: 'order', sort: ['coverDays', 1] };
    }
    if (id === 'cash') {
      const a = results.filter(r => num(r.stockValue));
      const total = sum(a, r => r.stockValue);
      const t5 = top(a, r => r.stockValue, 5);
      return { id, count: a.length, value: total, topValue: sum(t5, r => r.stockValue), share: total > 0 ? sum(t5, r => r.stockValue) / total : null,
        rows: t5.map(r => r.key), status: '', sort: ['stockValue', -1] };
    }
    if (id === 'excess') {
      const a = results.filter(r => r.excessUnits > 0);
      return { id, count: a.length, value: sum(a, r => r.excessValue), units: sum(a, r => r.excessUnits),
        rows: top(a, r => (num(r.excessValue) ? r.excessValue : r.excessUnits), 5).map(r => r.key), status: '', sort: ['excess', -1] };
    }
    if (id === 'ranout') {
      const a = results.filter(r => r.stock && r.stock.zero90 > 0);
      return { id, count: a.length, days: sum(a, r => r.stock.zero90), rows: top(a, r => r.stock.zero90, 5).map(r => r.key), status: '', sort: ['zero90', -1] };
    }
    if (id === 'weak') {
      const a = results.filter(r => num(r.wmape) && (r.abc === 'A' || r.abc === 'B'));
      const worst = top(a, r => r.wmape, 5);
      return { id, count: a.length, worst: worst.length ? worst[0].wmape : null, rows: worst.map(r => r.key), status: '', sort: ['wmape', -1] };
    }
    if (id === 'sign') {
      const a = results.filter(r => r.status === 'order' && r.limit);
      const inside = a.filter(r => r.limit.within);
      return { id, count: a.length, inside: inside.length, insideValue: sum(inside, r => r.order.value),
        outside: a.length - inside.length, outsideValue: sum(a.filter(r => !r.limit.within), r => r.order.value),
        rows: top(a.filter(r => !r.limit.within), r => (num(r.order.value) ? r.order.value : 0), 5).map(r => r.key), status: 'order', sort: ['orderValue', -1] };
    }
    return null;
  }

  const PLAIN = {
    orderWeekdays: 'fixed order days', minOrderValue: 'supplier minimum order value', priceBreaks: 'price breaks',
    forecastErrorSdOverProtection: 'measured forecast error', reserved: 'reserved stock', moqUnits: 'minimum order quantity',
    orderMultiple: 'order multiple', packSize: 'pack size', leadTimeSdDays: 'lead time variation',
  };

  /** Order proposals as decision records, in the published Simon G. format, version 0.1. */
  function decisionRecords(results, meta, settings, info) {
    const out = [];
    let n = 0;
    for (const r of results) {
      if (r.status !== 'order' || !r.order) continue;
      n++;
      const absent = [];
      if (r.leadFrom === 'assumption') absent.push({ input: 'lead time', consequence: 'the assumption of ' + settings.leadTimeDays + ' days was used' });
      if (r.unitCost === null) absent.push({ input: 'unit cost', consequence: 'the order has no value and cannot be checked against a value limit' });
      (r.order.absent || []).forEach(a => absent.push({ input: PLAIN[a] || String(a), consequence: 'not recorded; no default was used in its place' }));
      const rec = {
        record_id: meta.asOf + '-' + String(n).padStart(5, '0'),
        schema_version: '0.1',
        class: 'Replenishment order',
        charter_version: info.charterVersion || 'not recorded',
        subject: r.loc ? { product: r.sku, location: r.loc } : { product: r.sku },
        proposer: { kind: 'algorithm', name: 'Simon G. planning engine', version: info.engineVersion },
        inputs: { data_as_of: meta.asOf + 'T00:00:00Z', sources: info.sources, absent },
        current: { on_hand: r.onHand, on_order: r.onOrder === null ? 0 : r.onOrder },
        proposed: { order_quantity: r.order.qty, order_date: r.order.orderDate, expected_arrival: r.order.arrival },
        evidence: {
          reasoning: info.reasoning(r),
          steps: (r.order.waterfall || []).map(w => ({ step: w.step, change: w.delta, quantity: w.qty })),
          limits: (r.limits || []).concat(r.order.limits || []),
        },
        limit_check: { within_limit: !!(r.limit && r.limit.within), limit_ref: info.limitRef, acted_alone: false },
        status: 'proposed',
        decisions: [],
        perimeter: { data_left_perimeter: false },
        created_at: info.createdAt,
      };
      if (r.order.value !== null) rec.evidence.expected_effect = { amount: Math.round(r.order.value * 100) / 100, currency: info.currency, basis: 'purchase value at unit cost' };
      out.push(rec);
    }
    return out;
  }

  root.SGCore = { run, answer, decisionRecords, guessRole, ROLES, SEP };
})(typeof self !== 'undefined' ? self : globalThis);
