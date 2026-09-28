/* Simon G. Credit Check. (c) 2026 GROMA S.R.L., groma.ro */
// Simon G. Credit Check — page logic. No network calls; the calculation runs in credit-worker.js.
/* global SGParse, SGXlsx, SGCreditCalc, SG_I18N */
(function () {
  'use strict';
  const P = SGParse;
  const FIELDS = SGCreditCalc.INVOICE_FIELDS;
  const BASE = document.currentScript.src.replace(/[^/]*$/, '');
  const LANG = (document.documentElement.lang || 'en').slice(0, 2) === 'ro' ? 'ro' : 'en';
  const T = SG_I18N[LANG];
  const t = (key, vars) => {
    let s = T[key] === undefined ? key : T[key];
    if (vars) for (const k in vars) s = s.split('{' + k + '}').join(String(vars[k]));
    return s;
  };

  const $ = id => document.getElementById(id);
  const el = (tag, attrs, children) => {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    if (children) for (const c of children) if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    return n;
  };
  const svg = (tag, attrs) => {
    const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };

  const nf0 = new Intl.NumberFormat(T.locale, { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat(T.locale, { maximumFractionDigits: 1 });
  const num = (v, f) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : (f || nf0).format(v));
  const CLASSES = ['A', 'B', 'C', 'D'];

  const state = { invoices: null, results: null, meta: null, settings: null, sort: { col: 'score', dir: -1 }, worker: null };

  // ---------------------------------------------------------------- files
  function readFile(file, cb) {
    const name = file.name.toLowerCase();
    if (/\.xls$/.test(name) || /\.xlsb$/.test(name)) { say(t('oldExcel')); return; }
    const fr = new FileReader();
    fr.onerror = () => say(t('fileUnreadable'));
    if (/\.xlsx$/.test(name) || /\.xlsm$/.test(name)) {
      say(t('readingExcel'));
      fr.onload = () => {
        SGXlsx.readXlsx(fr.result)
          .then(rows => { say(''); cb(SGXlsx.toDelimited(rows), true); })
          .catch(err => say(t(err && err.message === 'browser_too_old' ? 'browserOld' : 'excelUnreadable')));
      };
      fr.readAsArrayBuffer(file);
    } else {
      fr.onload = () => cb(String(fr.result), false);
      fr.readAsText(file);
    }
  }
  function say(msg) { $('progress').textContent = msg; }

  const column = (rows, i, max) => { const out = []; for (let r = 1; r < rows.length && out.length < max; r++) out.push(rows[r][i]); return out; };
  const DAY = 86400000;

  function loadInvoices(text, name, fromExcel) {
    const delim = fromExcel ? ';' : P.detectDelimiter(text);
    const rows = P.parseCsv(text, delim);
    if (rows.length < 2) { say(t('invoicesEmpty')); return; }
    const map = P.guessMapping(rows[0], FIELDS, rows.slice(1, 60));
    state.invoices = { text, name, delim, fromExcel: !!fromExcel, headers: rows[0], rows, map, dateOrderChoice: null, dec: '.', decSure: true };
    $('invoicesName').textContent = name + ' · ' + nf0.format(rows.length - 1) + ' ' + t('rowsWord');
    scanInvoices(true);
    renderMapping();
    renderPreview();
    refreshRun();
  }

  /** Reads what the mapping alone cannot tell: the date order and the number format. */
  function scanInvoices(reset) {
    const s = state.invoices, m = s.map;
    const dateCols = [m.invoiceDate, m.dueDate, m.paymentDate].filter(i => i >= 0);
    const dateSamples = dateCols.reduce((a, i) => a.concat(column(s.rows, i, 200)), []);
    s.dateOrder = dateCols.length ? P.detectDateOrder(dateSamples) : 'unknown';
    if (reset || !s.dateOrderChoice) s.dateOrderChoice = s.dateOrder === 'MDY' ? 'MDY' : 'DMY';
    if (reset || !s.decChosen) {
      const numCols = [m.amount, m.amountPaid].filter(i => i >= 0);
      const numSamples = numCols.reduce((a, i) => a.concat(column(s.rows, i, 400)), []);
      const d = s.fromExcel ? { dec: '.', sure: true } : P.detectDecimal(numSamples, s.delim);
      s.dec = d.dec; s.decSure = d.sure;
    }
    guessAsOf();
  }

  /** The as-of date the page proposes: the latest invoice or payment date in the file. A due date is
   *  left out on purpose, because it lies in the future for every invoice not yet due.
   *  Shown on screen and can be changed — it is never used silently. */
  function guessAsOf() {
    const s = state.invoices, m = s.map;
    if (m.invoiceDate < 0 || m.dueDate < 0 || s.dateOrder === 'unknown') { s.guessedAsOf = null; return; }
    const toDate = P.makeDateParser(s.dateOrderChoice);
    let max = -Infinity;
    const cols = [m.invoiceDate, m.paymentDate].filter(i => i >= 0);
    for (const i of cols) {
      const vals = column(s.rows, i, s.rows.length);
      for (const raw of vals) {
        const d = toDate(raw);
        if (d !== null) { const n = Date.parse(d); if (n > max) max = n; }
      }
    }
    s.guessedAsOf = Number.isFinite(max) ? new Date(max).toISOString().slice(0, 10) : null;
    if (s.guessedAsOf) $('asOfDate').value = s.guessedAsOf;
  }

  function renderMapping() {
    const s = state.invoices;
    const host = $('invoicesMap');
    host.textContent = '';
    host.classList.remove('sg-hidden');
    for (const f of FIELDS) {
      const sel = el('select', { 'data-field': f.id });
      sel.appendChild(el('option', { value: '-1', text: f.required ? t('chooseColumn') : t('notInFile') }));
      s.headers.forEach((h, i) => {
        const o = el('option', { value: String(i), text: String(h).trim() || t('column', { n: i + 1 }) });
        if (s.map[f.id] === i) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('change', () => { s.map[f.id] = Number(sel.value); scanInvoices(false); renderMapping(); refreshRun(); });
      host.appendChild(el('label', { class: f.required ? 'req' : '' }, [t('f_' + f.id), sel]));
    }

    if (s.dateOrder === 'ambiguous' || s.dateOrder === 'DMY' || s.dateOrder === 'MDY') {
      const sel = el('select', { id: 'dateOrderSel' });
      [['DMY', t('dayFirst')], ['MDY', t('monthFirst')]].forEach(([v, label]) => {
        const o = el('option', { value: v, text: label });
        if (s.dateOrderChoice === v) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('change', () => { s.dateOrderChoice = sel.value; guessAsOf(); });
      host.appendChild(el('label', null, [t('dateFormat'), sel]));
    }

    const dsel = el('select');
    [[',', t('decComma')], ['.', t('decPoint')]].forEach(([v, label]) => {
      const o = el('option', { value: v, text: label });
      if (s.dec === v) o.selected = true;
      dsel.appendChild(o);
    });
    dsel.addEventListener('change', () => { s.dec = dsel.value; s.decChosen = true; s.decSure = true; renderMapping(); });
    host.appendChild(el('label', null, [t('decimal'), dsel]));

    if (!s.decSure) host.appendChild(el('div', { class: 'sg-warn', text: t('decUnsure') }));
    if (s.dateOrder === 'ambiguous') host.appendChild(el('div', { class: 'sg-warn', text: t('dateAmbiguous') }));
    if (s.dateOrder === 'unknown' && s.map.invoiceDate >= 0) host.appendChild(el('div', { class: 'sg-warn', text: t('dateUnknown') }));
  }

  function renderPreview() {
    const host = $('invoicesPreview');
    host.textContent = '';
    host.classList.remove('sg-hidden');
    const tb = el('table');
    const hr = el('tr');
    state.invoices.headers.forEach(h => hr.appendChild(el('th', { text: String(h) })));
    tb.appendChild(hr);
    state.invoices.rows.slice(1, 5).forEach(r => {
      const tr = el('tr');
      r.forEach(c => tr.appendChild(el('td', { text: String(c) })));
      tb.appendChild(tr);
    });
    host.appendChild(tb);
  }

  function refreshRun() {
    const s = state.invoices;
    const ok = !!s && s.map.customer >= 0 && s.map.invoiceDate >= 0 && s.map.dueDate >= 0 && s.map.amount >= 0 && s.dateOrder !== 'unknown';
    $('runBtn').disabled = !ok;
    if (ok) say('');
  }

  // ---------------------------------------------------------------- sample
  function sampleData() {
    let seed = 20260928;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    const gauss = (m, sd) => m + sd * Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
    const end = Date.UTC(2026, 7, 31), startDays = 545; // ~18 months
    const iso = ts => new Date(ts).toISOString().slice(0, 10);
    const rows = ['customer;invoice_date;due_date;payment_date;amount;amount_paid'];
    const profiles = ['punctual', 'normal', 'slow', 'deteriorating', 'improving'];
    for (let k = 1; k <= 24; k++) {
      const name = 'Sample client ' + String(k).padStart(2, '0');
      const profile = profiles[k % profiles.length];
      const terms = [15, 30, 45, 60][k % 4];
      const lo = 500 + (k % 5) * 800, hi = lo + 3000;
      for (let d = 0; d < startDays; d += Math.max(3, Math.round(7 / (1 + (k % 3))))) {
        const invTs = end - (startDays - d) * DAY;
        const frac = d / startDays;
        const amount = Math.round((lo + rnd() * (hi - lo)) * 100) / 100;
        const dueTs = invTs + terms * DAY;
        let dbt;
        if (profile === 'punctual') dbt = gauss(-2, 3);
        else if (profile === 'normal') dbt = gauss(12, 6);
        else if (profile === 'slow') dbt = gauss(35, 10);
        else if (profile === 'deteriorating') dbt = gauss(5 + frac * 45, 5);
        else dbt = gauss(50 - frac * 45, 5);
        const daysToDueFromEnd = Math.round((end - dueTs) / DAY);
        let unpaid = false;
        if (daysToDueFromEnd < 0) unpaid = true;
        else if (daysToDueFromEnd < 10) unpaid = rnd() < 0.7;
        else if (daysToDueFromEnd < 25) unpaid = rnd() < 0.3;
        if (unpaid) { rows.push([name, iso(invTs), iso(dueTs), '', amount, ''].join(';')); continue; }
        let payTs = dueTs + Math.round(dbt) * DAY;
        if (payTs < invTs) payTs = invTs;
        if (payTs > end) payTs = end;
        rows.push([name, iso(invTs), iso(dueTs), iso(payTs), amount, amount].join(';'));
      }
    }
    loadInvoices(rows.join('\n'), 'sample-invoices.csv');
  }

  // ---------------------------------------------------------------- run
  function settings() {
    const pct = (id, d) => { const x = Number($(id).value); return Number.isFinite(x) ? x / 100 : d; };
    const asOf = $('asOfDate').value || null;
    return { asOf, marginRate: pct('marginRate', 0.20), wacc: pct('waccRate', 0.10) };
  }

  function run() {
    if (state.worker) state.worker.terminate();
    const w = new Worker(BASE + 'credit-worker.js');
    state.worker = w;
    $('runBtn').disabled = true;
    say(t('reading'));
    const s = state.invoices;
    state.settings = settings();
    w.onmessage = e => {
      const m = e.data;
      if (m.type === 'progress') say(t('computing', { done: m.done, total: m.total }));
      else if (m.type === 'error') { say(m.code ? t(m.code) : t('stopped', { m: m.message })); $('runBtn').disabled = false; }
      else if (m.type === 'done') {
        state.results = m.results; state.meta = m;
        say(t('doneLine', { n: nf0.format(m.results.length), s: nf1.format((performance.now() - state.t0) / 1000) }));
        $('runBtn').disabled = false;
        renderResults();
      }
    };
    w.onerror = e => { say(t('stopped', { m: e.message })); $('runBtn').disabled = false; };
    state.t0 = performance.now();
    w.postMessage({
      type: 'run', invoicesText: s.text, invoicesDelim: s.delim, invoicesDec: s.dec, invoicesMap: s.map,
      dateOrder: s.dateOrderChoice, settings: state.settings,
    });
  }

  // ---------------------------------------------------------------- results
  const sum = (a, f) => a.reduce((acc, x) => { const v = f(x); return acc + (typeof v === 'number' && Number.isFinite(v) ? v : 0); }, 0);
  const tile = (k, v, s) => el('div', { class: 'sg-tile' }, [el('div', { class: 'k', text: k }), el('div', { class: 'v', text: v }), s ? el('div', { class: 's', text: s }) : null]);

  function renderResults() {
    const R = state.results, M = state.meta;
    $('results').classList.remove('sg-hidden');
    $('next').classList.remove('sg-hidden');
    $('asOf').textContent = t('asOf', { d: M.asOf });
    const tiles = $('tiles');
    tiles.textContent = '';
    tiles.appendChild(tile(t('t_customers'), nf0.format(M.tiles.customersTotal), t('t_customersSub', { n: nf0.format(M.tiles.customersAnalysed) })));
    tiles.appendChild(tile(t('t_overdue'), nf0.format(M.tiles.overdueTotal), t('t_overdueSub')));
    tiles.appendChild(tile(t('t_dbt'), M.tiles.weightedAvgDbt === null ? '—' : nf1.format(M.tiles.weightedAvgDbt), t('t_dbtSub')));
    tiles.appendChild(tile(t('t_cost'), nf0.format(M.tiles.yearlyCostTotal), t('t_costSub')));

    const notes = $('readNotes');
    notes.textContent = '';
    const c = M.counts;
    const line = s => notes.appendChild(el('p', { text: s }));
    line(t('rowsUsed', { u: nf0.format(c.rowsUsed), r: nf0.format(c.rowsRead) })
      + (c.badCustomer ? t('badCustomer', { n: nf0.format(c.badCustomer) }) : '')
      + (c.badInvoiceDate ? t('badInvoiceDate', { n: nf0.format(c.badInvoiceDate) }) : '')
      + (c.badDueDate ? t('badDueDate', { n: nf0.format(c.badDueDate) }) : '')
      + (c.badAmount ? t('badAmount', { n: nf0.format(c.badAmount) }) : '')
      + (c.badPaymentDate ? t('badPaymentDate', { n: nf0.format(c.badPaymentDate) }) : ''));
    const insufficient = R.filter(r => !r.sufficientHistory).length;
    if (insufficient) line(t('insufficientNote', { n: nf0.format(insufficient) }));
    line(t('assumeIncident'));
    line(t('assumeRelation'));

    const sf = $('statusFilter');
    sf.textContent = '';
    sf.appendChild(el('option', { value: '', text: t('allStatuses') }));
    CLASSES.forEach(k => { if (R.some(r => r.scorecard && r.scorecard.cls === k)) sf.appendChild(el('option', { value: k, text: t('s_' + k) })); });
    if (insufficient) sf.appendChild(el('option', { value: 'none', text: t('s_none') }));
    renderTable();
    $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const COLS = [
    { id: 'customer', left: true, get: r => r.customer, text: true },
    { id: 'cls', left: true, get: r => (r.scorecard ? r.scorecard.cls : null), badge: true },
    { id: 'score', get: r => (r.scorecard ? r.scorecard.score : null) },
    { id: 'meanDbt', get: r => (r.scorecard ? r.scorecard.meanDbt : null), f: nf1 },
    { id: 'trend', left: true, get: r => (r.scorecard ? r.scorecard.trend : null), word: v => t(v > 55 ? 'w_trendUp' : v < 45 ? 'w_trendDown' : 'w_trendFlat') },
    { id: 'overdue', get: r => r.overdueAmount },
    { id: 'yearlyCost', get: r => (r.scorecard ? r.scorecard.financingCostPerYear : null) },
    { id: 'marginShare', get: r => (r.scorecard ? r.scorecard.financingBurdenPct : null), pct: true },
  ];

  function visibleRows() {
    const q = $('filter').value.trim().toLowerCase();
    const st = $('statusFilter').value;
    const col = COLS.find(c => c.id === state.sort.col) || COLS[0];
    const rows = state.results.filter(r => (!q || r.customer.toLowerCase().indexOf(q) !== -1)
      && (!st || (st === 'none' ? !r.scorecard : (r.scorecard && r.scorecard.cls === st))));
    rows.sort((a, b) => {
      const x = col.get(a), y = col.get(b);
      if (x === null || x === undefined) return 1;
      if (y === null || y === undefined) return -1;
      const d = typeof x === 'string' ? x.localeCompare(y, 'en', { numeric: true }) : x - y;
      return d * state.sort.dir || a.customer.localeCompare(b.customer, 'en', { numeric: true });
    });
    return rows;
  }

  function renderTable() {
    const tb = $('table');
    tb.textContent = '';
    const hr = el('tr');
    COLS.forEach(c => {
      const th = el('th', { class: c.left ? 'l' : '', text: t('c_' + c.id), scope: 'col', tabindex: '0' });
      if (state.sort.col === c.id) th.setAttribute('aria-sort', state.sort.dir === 1 ? 'ascending' : 'descending');
      const go = () => {
        state.sort = { col: c.id, dir: state.sort.col === c.id ? -state.sort.dir : (c.text || c.badge ? 1 : -1) };
        renderTable();
      };
      th.addEventListener('click', go);
      th.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
      hr.appendChild(th);
    });
    tb.appendChild(el('thead', null, [hr]));
    const body = el('tbody');
    const rows = visibleRows();
    const shown = rows.slice(0, 500);
    shown.forEach(r => {
      const tr = el('tr', { tabindex: '0' });
      COLS.forEach(c => {
        const td = el('td', { class: c.left ? 'l' : '' });
        if (c.badge) {
          const cls = r.scorecard ? r.scorecard.cls : null;
          td.appendChild(el('span', { class: 'sg-badge ' + (cls ? 'sg-cls-' + cls : 'sg-cls-none'), text: cls ? t('s_' + cls) : t('s_none') }));
        } else if (c.word) td.textContent = c.get(r) === null ? '—' : c.word(c.get(r));
        else if (c.text) td.textContent = c.get(r) || '—';
        else if (c.pct) td.textContent = c.get(r) === null ? '—' : nf0.format(c.get(r)) + '%';
        else td.textContent = num(c.get(r), c.f);
        tr.appendChild(td);
      });
      tr.addEventListener('click', () => openDetail(r));
      tr.addEventListener('keydown', e => { if (e.key === 'Enter') openDetail(r); });
      body.appendChild(tr);
    });
    tb.appendChild(body);
    $('tableNote').textContent = rows.length > shown.length
      ? t('tableFirst', { n: nf0.format(rows.length) }) : t('tableAll', { n: nf0.format(rows.length) });
  }

  // ---------------------------------------------------------------- detail
  const COMPONENTS = ['punctuality', 'completeness', 'longevity', 'consistency', 'trend', 'cleanRecord', 'financing'];

  function bar(value) {
    const W = 300, H = 14;
    const s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'sg-bar', role: 'img', 'aria-label': String(Math.round(value)) + '/100' });
    s.appendChild(svg('rect', { x: 0, y: 0, width: W, height: H, class: 'track' }));
    s.appendChild(svg('rect', { x: 0, y: 0, width: Math.max(0, Math.min(W, W * value / 100)), height: H, class: 'fill' }));
    return s;
  }

  function componentSentence(id, r) {
    const sc = r.scorecard;
    if (id === 'punctuality') {
      const d = sc.meanDbt;
      return d >= 0 ? t('sent_punctualityLate', { n: nf1.format(d) }) : t('sent_punctualityEarly', { n: nf1.format(-d) });
    }
    if (id === 'completeness') return t('sent_completeness', { p: nf0.format(sc.completeness) });
    if (id === 'longevity') return t('sent_longevity', { n: nf1.format(r.relationYears) });
    if (id === 'consistency') return t('sent_consistency', { n: nf1.format(sc.sdDbt) });
    if (id === 'trend') return sc.trend > 55 ? t('sent_trendUp') : sc.trend < 45 ? t('sent_trendDown') : t('sent_trendFlat');
    if (id === 'cleanRecord') {
      if (!sc.override) return t('sent_cleanRecordClean');
      return /insolvency/.test(sc.override) ? t('sent_cleanRecordInsolvency') : t('sent_cleanRecordIncident');
    }
    if (id === 'financing') return t('sent_financing', { c: nf0.format(sc.financingCostPerYear), p: nf0.format(sc.financingBurdenPct) });
    return '';
  }

  function openDetail(r) {
    const c = $('drawerContent');
    c.textContent = '';
    c.appendChild(el('h3', { id: 'drawerTitle', text: r.customer }));
    const cls = r.scorecard ? r.scorecard.cls : null;
    c.appendChild(el('p', null, [
      el('span', { class: 'sg-badge ' + (cls ? 'sg-cls-' + cls : 'sg-cls-none'), text: cls ? t('s_' + cls) : t('s_none') }), ' ',
      cls ? el('span', { class: 'sg-muted', text: t('d_score', { s: nf1.format(r.scorecard.score) }) }) : el('span', { class: 'sg-muted', text: t('insufficientRow') }),
    ]));

    if (r.scorecard) {
      c.appendChild(el('h4', { text: t('d_scorecard') }));
      const wrap = el('div', { class: 'sg-comps' });
      COMPONENTS.forEach(id => {
        wrap.appendChild(el('div', { class: 'sg-comp' }, [
          el('div', { class: 'sg-comp-h' }, [el('span', { text: t('comp_' + id) }), el('span', { class: 'sg-comp-v', text: String(r.scorecard[id]) })]),
          bar(r.scorecard[id]),
          el('p', { class: 'sg-comp-s', text: componentSentence(id, r) }),
        ]));
      });
      c.appendChild(wrap);
    } else {
      c.appendChild(el('p', { text: t('insufficientDetail', { n: r.settledCount }) }));
    }

    c.appendChild(el('h4', { text: t('d_position') }));
    c.appendChild(el('div', { class: 'sg-kv' }, [
      [t('k_invoiceCount'), num(r.invoiceCount)], [t('k_overdue'), num(r.overdueAmount)],
      [t('k_relation'), nf1.format(r.relationYears)], [t('k_annualPurchases'), num(r.annualPurchases)],
    ].map(([k, v]) => el('div', null, [el('div', { class: 'k', text: k }), el('div', { class: 'v', text: v })]))));
    if (r.annualized) c.appendChild(el('p', { class: 'sg-muted sg-small', text: t('annualizedNote') }));

    c.appendChild(el('h4', { text: t('d_invoices') }));
    const tb = el('table', { class: 'sg-steps' });
    tb.appendChild(el('tr', null, [
      el('th', { class: 'l', text: t('w_invoiceDate') }), el('th', { class: 'l', text: t('w_dueDate') }),
      el('th', { class: 'l', text: t('w_paymentDate') }), el('th', { text: t('w_amount') }), el('th', { text: t('w_dbt') }),
    ]));
    r.invoices.slice(0, 300).forEach(inv => {
      tb.appendChild(el('tr', null, [
        el('td', { class: 'l', text: inv.invoiceDate }), el('td', { class: 'l', text: inv.dueDate }),
        el('td', { class: 'l', text: inv.paymentDate || (inv.status === 'open_overdue' ? t('w_openOverdue') : t('w_openNotDue')) }),
        el('td', { text: num(inv.amount) }), el('td', { text: inv.dbt === null ? '—' : num(inv.dbt) }),
      ]));
    });
    c.appendChild(tb);
    if (r.invoices.length > 300) c.appendChild(el('p', { class: 'sg-muted sg-small', text: t('tableFirst', { n: r.invoices.length }) }));

    $('drawer').classList.remove('sg-hidden');
    $('drawerClose').focus();
  }
  function closeDetail() { $('drawer').classList.add('sg-hidden'); }

  // ---------------------------------------------------------------- export
  function exportCsv() {
    const M = state.meta;
    const q = v => {
      let s = v === null || v === undefined ? '' : String(v);
      if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+([.,]\d+)?$/.test(s)) s = "'" + s;
      return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const dec = LANG === 'ro' ? ',' : '.';
    const n = v => (typeof v === 'number' && Number.isFinite(v) ? String(Math.round(v * 100) / 100).replace('.', dec) : '');
    const lines = [];
    lines.push([t('x_title'), t('asOf', { d: M.asOf })].map(q).join(';'));
    lines.push([t('x_assumptions'), t('x_margin', { n: Math.round(M.marginRate * 1000) / 10 }), t('x_wacc', { n: Math.round(M.wacc * 1000) / 10 })].map(q).join(';'));
    lines.push('');
    lines.push(t('x_header'));
    state.results.forEach(r => {
      const sc = r.scorecard;
      lines.push([q(r.customer), q(sc ? sc.cls : ''), n(sc ? sc.score : null), n(sc ? sc.meanDbt : null),
        n(sc ? sc.trend : null), n(r.overdueAmount), n(sc ? sc.financingCostPerYear : null),
        n(sc ? sc.financingBurdenPct : null), n(r.invoiceCount), n(r.settledCount)].join(';'));
    });
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: t('x_file', { d: M.asOf }) });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---------------------------------------------------------------- wiring
  $('invoicesFile').addEventListener('change', e => { const f = e.target.files[0]; if (f) readFile(f, (s, x) => loadInvoices(s, f.name, x)); });
  $('sampleBtn').addEventListener('click', sampleData);
  $('runBtn').addEventListener('click', run);
  $('filter').addEventListener('input', renderTable);
  $('statusFilter').addEventListener('change', renderTable);
  $('exportBtn').addEventListener('click', exportCsv);
  $('printBtn').addEventListener('click', () => window.print());
  $('drawerClose').addEventListener('click', closeDetail);
  $('drawer').addEventListener('click', e => { if (e.target === $('drawer')) closeDetail(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDetail(); });
  $('asOfDate').addEventListener('change', () => { if (state.invoices) refreshRun(); });
})();
