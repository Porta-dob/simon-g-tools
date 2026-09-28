/* Simon G. Stock Check. (c) 2026 GROMA S.R.L., groma.ro */
// Page logic. No network calls; the calculation runs in worker.js.
/* global SGParse, SGXlsx, SGCore, SGSample, SG_I18N */
(function () {
  'use strict';
  const P = SGParse;
  const BASE = document.currentScript.src.replace(/[^/]*$/, '');
  const ENGINE = document.documentElement.getAttribute('data-engine') || 'unknown';
  const LANG = (document.documentElement.lang || 'en').slice(0, 2) === 'ro' ? 'ro' : 'en';
  const T = SG_I18N[LANG];
  const fill = (s, vars) => { if (vars) for (const k in vars) s = s.split('{' + k + '}').join(String(vars[k])); return s; };
  const t = (key, vars) => fill(T[key] === undefined ? key : T[key], vars);
  const tEn = (key, vars) => fill(SG_I18N.en[key], vars);

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

  const minus = s => s.replace(/^-/, '−');
  const fmt0 = new Intl.NumberFormat(T.locale, { maximumFractionDigits: 0 });
  const fmt1 = new Intl.NumberFormat(T.locale, { maximumFractionDigits: 1 });
  const nf0 = { format: v => minus(fmt0.format(v)) };
  const nf1 = { format: v => minus(fmt1.format(v)) };
  const isNum = v => typeof v === 'number' && Number.isFinite(v);
  const num = (v, f) => (isNum(v) ? (f || nf0).format(v) : '—');
  const pct = v => (isNum(v) ? nf0.format(v * 100) + '%' : '—');

  const DEFAULT_LEVELS = { AX: 0.98, AY: 0.97, AZ: 0.95, BX: 0.96, BY: 0.95, BZ: 0.92, CX: 0.92, CY: 0.90, CZ: 0.85 };
  const STATUSES = ['order', 'excess', 'covered', 'parameters', 'not_computable'];
  const QUESTIONS = ['first', 'sign', 'cash', 'excess', 'ranout', 'weak'];
  const methodName = m => (T['m_' + m] === undefined ? m : T['m_' + m]);
  const reasonText = r => (r ? (T['r_' + r] === undefined ? String(r).replace(/_/g, ' ') : T['r_' + r]) : '');
  const limitText = l => (T['l_' + l] === undefined ? null : T['l_' + l]);
  const stepName = s => (T['st_' + s] === undefined ? String(s).replace(/_/g, ' ') : T['st_' + s]);
  const stepNote = n => String(n).replace(/(\d+\.\d{2})\d+/g, '$1');

  const state = { moves: null, opening: null, products: null, results: null, meta: null, settings: null, sort: { col: 'status', dir: 1 }, worker: null, tour: -1 };

  function say(msg) { $('progress').textContent = msg; }
  const column = (rows, i, max) => { const out = []; for (let r = 1; r < rows.length && out.length < max; r++) out.push(rows[r][i]); return out; };

  // ---------------------------------------------------------------- reading files
  /** cb(sheets): [{ name, rows }]. A CSV is one sheet. */
  function readFile(file, cb) {
    const name = file.name.toLowerCase();
    if (/\.xls$/.test(name) || /\.xlsb$/.test(name)) { say(t('oldExcel')); return; }
    const fr = new FileReader();
    fr.onerror = () => say(t('fileUnreadable'));
    if (/\.xlsx$/.test(name) || /\.xlsm$/.test(name)) {
      say(t('readingExcel'));
      fr.onload = () => {
        SGXlsx.readWorkbook(fr.result)
          .then(sheets => { say(''); cb(sheets.map(s => ({ name: s.name, rows: s.rows, fromExcel: true }))); })
          .catch(err => say(t(err && err.message === 'browser_too_old' ? 'browserOld' : 'excelUnreadable')));
      };
      fr.readAsArrayBuffer(file);
    } else {
      fr.onload = () => {
        const text = String(fr.result);
        const delim = P.detectDelimiter(text);
        cb([{ name: file.name, rows: P.parseCsv(text, delim), delim, fromExcel: false }]);
      };
      fr.readAsText(file);
    }
  }

  function source(sheet, fields, label) {
    const rows = sheet.rows;
    const map = P.guessMapping(rows[0], fields, fields === P.SALES_FIELDS ? rows.slice(1, 60) : undefined);
    const src = { name: label, rows, headers: rows[0], map, fromExcel: !!sheet.fromExcel, delim: sheet.delim || ';', dec: '.', decSure: true };
    const numeric = ['qty', 'onHand', 'unitCost', 'onOrder'].map(k => map[k]).filter(i => i !== undefined && i >= 0);
    const samples = numeric.reduce((acc, i) => acc.concat(column(rows, i, 1000)), []);
    const d = src.fromExcel ? { dec: '.', sure: true } : P.detectDecimal(samples, src.delim);
    src.dec = d.dec; src.decSure = d.sure;
    if (map.date !== undefined) {
      src.dateOrder = map.date >= 0 ? P.detectDateOrder(column(rows, map.date, 400)) : 'unknown';
      src.dateOrderChoice = src.dateOrder === 'MDY' ? 'MDY' : 'DMY';
    }
    return src;
  }

  const has = (map, keys) => keys.every(k => map[k] !== undefined && map[k] >= 0);
  function kindOf(sheet) {
    if (!sheet.rows || sheet.rows.length < 2) return null;
    const name = String(sheet.name).toLowerCase();
    const moves = P.guessMapping(sheet.rows[0], P.SALES_FIELDS, sheet.rows.slice(1, 60));
    const prod = P.guessMapping(sheet.rows[0], P.PRODUCT_FIELDS);
    const open = P.guessMapping(sheet.rows[0], P.OPENING_FIELDS);
    if (/(read|citi|info|instruc)/.test(name)) return null;
    if (/(open|ini[tț]ial|start)/.test(name) && has(open, ['sku', 'qty'])) return 'opening';
    if (/(product|produs|item|articol|material)/.test(name) && prod.sku >= 0) return 'products';
    if (has(moves, ['date', 'sku', 'qty']) && moves.type >= 0) return 'moves';
    if (prod.sku >= 0 && (prod.leadTime >= 0 || prod.unitCost >= 0 || prod.packSize >= 0)) return 'products';
    if (has(moves, ['date', 'sku', 'qty'])) return 'moves';
    if (has(open, ['sku', 'qty'])) return 'opening';
    return null;
  }

  function loadMain(sheets, fileName) {
    const found = { moves: null, opening: null, products: null };
    for (const s of sheets) { const k = kindOf(s); if (k && !found[k]) found[k] = s; }
    if (!found.moves && sheets.length === 1 && sheets[0].rows.length >= 2) found.moves = sheets[0];
    if (!found.moves) { say(t('foundNone')); return; }
    setMoves(found.moves, fileName);
    if (found.opening) setOpening(found.opening, fileName + ' · ' + found.opening.name);
    if (found.products) setProducts(found.products, fileName + ' · ' + found.products.name);
    const parts = [nf0.format(found.moves.rows.length - 1) + ' ' + t('foundMoves')];
    if (found.opening) parts.push(nf0.format(found.opening.rows.length - 1) + ' ' + t('foundOpening'));
    if (found.products) parts.push(nf0.format(found.products.rows.length - 1) + ' ' + t('foundProducts'));
    $('movesName').textContent = fileName + ' · ' + (sheets.length > 1 ? t('found') + ' ' : '') + parts.join(', ');
    refreshRun();
  }

  function setMoves(sheet, label) {
    if (sheet.rows.length < 2) { say(t('movesEmpty')); return; }
    const s = source(sheet, P.SALES_FIELDS, label);
    s.roles = null; s.types = []; s.flipSign = false; s.negativeShare = 0;
    state.moves = s;
    scanMoves(true);
    renderMovesMapping();
    renderPreview();
  }
  function setOpening(sheet, label) {
    if (sheet.rows.length < 2) { say(t('openingEmpty')); return; }
    state.opening = source(sheet, P.OPENING_FIELDS, label);
    $('openingName').textContent = label + ' · ' + nf0.format(sheet.rows.length - 1) + ' ' + t('rowsWord');
    renderSimpleMapping('openingMap', state.opening, P.OPENING_FIELDS, true);
  }
  function setProducts(sheet, label) {
    if (sheet.rows.length < 2) { say(t('productsEmpty')); return; }
    state.products = source(sheet, P.PRODUCT_FIELDS, label);
    $('productsName').textContent = label + ' · ' + nf0.format(sheet.rows.length - 1) + ' ' + t('rowsWord');
    renderSimpleMapping('productsMap', state.products, P.PRODUCT_FIELDS, false);
  }

  /** Reads what the columns alone cannot tell: the transaction types and the sign of the sales. */
  function scanMoves(reset) {
    const s = state.moves, m = s.map;
    s.dateOrder = m.date >= 0 ? P.detectDateOrder(column(s.rows, m.date, 400)) : 'unknown';
    if (reset) s.dateOrderChoice = s.dateOrder === 'MDY' ? 'MDY' : 'DMY';
    let types = [];
    if (m.type >= 0) {
      const seen = new Map();
      for (let i = 1; i < s.rows.length; i++) {
        const v = String(s.rows[i][m.type] === undefined ? '' : s.rows[i][m.type]).trim();
        seen.set(v, (seen.get(v) || 0) + 1);
        if (seen.size > 40) break;
      }
      types = seen.size > 40 ? [] : [...seen.entries()].sort((x, y) => y[1] - x[1]).map(e => ({ value: e[0], rows: e[1] }));
    }
    const same = s.types.length === types.length && s.types.every((x, i) => x.value === types[i].value);
    s.types = types;
    if (types.length === 0) s.roles = null;
    else if (reset || !same || s.roles === null) { s.roles = {}; types.forEach(x => { s.roles[x.value] = SGCore.guessRole(x.value); }); }
    measureSign();
    if (reset || !s.flipChosen) s.flipSign = s.negativeShare > 0.6;
  }

  function measureSign() {
    const s = state.moves, m = s.map;
    let neg = 0, all = 0;
    if (m.qty >= 0) {
      for (let i = 1; i < s.rows.length; i++) {
        if (s.roles !== null && s.roles[String(s.rows[i][m.type] || '').trim()] !== 'sale') continue;
        const q = P.parseNumber(s.rows[i][m.qty], s.dec);
        if (q === null || q === 0) continue;
        all++;
        if (q < 0) neg++;
      }
    }
    s.negativeShare = all > 0 ? neg / all : 0;
  }

  // ---------------------------------------------------------------- mapping panels
  function renderMapping(hostId, src, fields, onChange) {
    const host = $(hostId);
    host.textContent = '';
    host.classList.remove('sg-hidden');
    for (const f of fields) {
      const sel = el('select', { 'data-field': f.id });
      sel.appendChild(el('option', { value: '-1', text: f.required ? t('chooseColumn') : t('notInFile') }));
      src.headers.forEach((h, i) => {
        const o = el('option', { value: String(i), text: String(h).trim() || t('column', { n: i + 1 }) });
        if (src.map[f.id] === i) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('change', () => { src.map[f.id] = Number(sel.value); onChange(f.id); });
      host.appendChild(el('label', { class: f.required ? 'req' : '' }, [t('f_' + f.id), sel]));
    }
    return host;
  }

  function decimalSelect(src, after) {
    const sel = el('select', { 'data-role': 'decimal' });
    [[',', t('decComma')], ['.', t('decPoint')]].forEach(([v, label]) => {
      const o = el('option', { value: v, text: label });
      if (src.dec === v) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener('change', () => { src.dec = sel.value; src.decSure = true; after(); });
    return el('label', null, [t('decimal'), sel]);
  }

  function dateSelect(src) {
    const sel = el('select', { 'data-role': 'dateorder' });
    [['DMY', t('dayFirst')], ['MDY', t('monthFirst')]].forEach(([v, label]) => {
      const o = el('option', { value: v, text: label });
      if (src.dateOrderChoice === v) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener('change', () => { src.dateOrderChoice = sel.value; });
    return el('label', null, [t('dateFormat'), sel]);
  }

  function renderSimpleMapping(hostId, src, fields, withDate) {
    const again = () => { renderSimpleMapping(hostId, src, fields, withDate); refreshRun(); };
    const host = renderMapping(hostId, src, fields, id => {
      if (withDate && id === 'date') src.dateOrder = src.map.date >= 0 ? P.detectDateOrder(column(src.rows, src.map.date, 400)) : 'unknown';
      again();
    });
    if (withDate && src.map.date >= 0 && src.dateOrder !== 'YMD' && src.dateOrder !== 'unknown') host.appendChild(dateSelect(src));
    if (!src.fromExcel) host.appendChild(decimalSelect(src, again));
    if (!src.decSure) host.appendChild(el('div', { class: 'sg-warn', text: t('decUnsure') }));
  }

  function renderMovesMapping() {
    const s = state.moves;
    const again = () => { renderMovesMapping(); refreshRun(); };
    const resign = () => { measureSign(); if (!s.flipChosen) s.flipSign = s.negativeShare > 0.6; again(); };
    const host = renderMapping('movesMap', s, P.SALES_FIELDS, () => { scanMoves(false); again(); });
    if (s.dateOrder === 'ambiguous' || s.dateOrder === 'DMY' || s.dateOrder === 'MDY') host.appendChild(dateSelect(s));
    if (!s.fromExcel) host.appendChild(decimalSelect(s, resign));

    if (s.types.length > 0) {
      const set = el('fieldset', { class: 'sg-roles' }, [el('legend', { text: t('rolesTitle') })]);
      s.types.forEach(x => {
        const sel = el('select');
        SGCore.ROLES.forEach(r => {
          const o = el('option', { value: r, text: t('role_' + r) });
          if (s.roles[x.value] === r) o.selected = true;
          sel.appendChild(o);
        });
        sel.addEventListener('change', () => { s.roles[x.value] = sel.value; resign(); });
        set.appendChild(el('label', null, [el('span', { class: 'sg-code', text: (x.value === '' ? '—' : x.value) + ' · ' + nf0.format(x.rows) }), sel]));
      });
      host.appendChild(set);
      if (!s.types.some(x => s.roles[x.value] === 'sale')) host.appendChild(el('div', { class: 'sg-warn', text: t('rolesNoSale') }));
    }
    const flip = el('input', { type: 'checkbox', id: 'flipSign' });
    flip.checked = s.flipSign;
    flip.addEventListener('change', () => { s.flipSign = flip.checked; s.flipChosen = true; });
    host.appendChild(el('label', { class: 'sg-check' }, [flip, t('negativeSales')]));
    if (s.negativeShare > 0.6) host.appendChild(el('div', { class: 'sg-warn', text: t('negativeFound', { pct: nf0.format(s.negativeShare * 100) }) }));
    if (!s.decSure) host.appendChild(el('div', { class: 'sg-warn', text: t('decUnsure') }));
    if (s.dateOrder === 'ambiguous') host.appendChild(el('div', { class: 'sg-warn', text: t('dateAmbiguous') }));
    if (s.dateOrder === 'unknown' && s.map.date >= 0) host.appendChild(el('div', { class: 'sg-warn', text: t('dateUnknown') }));
  }

  function renderPreview() {
    const host = $('movesPreview');
    host.textContent = '';
    host.classList.remove('sg-hidden');
    const tb = el('table');
    const hr = el('tr');
    state.moves.headers.forEach(h => hr.appendChild(el('th', { text: String(h) })));
    tb.appendChild(hr);
    state.moves.rows.slice(1, 5).forEach(r => {
      const tr = el('tr');
      r.forEach(c => tr.appendChild(el('td', { text: String(c) })));
      tb.appendChild(tr);
    });
    host.appendChild(tb);
  }

  function renderOpeningNote() {
    const s = state.moves, note = $('openingNote');
    const openRows = s.roles === null ? 0 : s.types.filter(x => s.roles[x.value] === 'opening').reduce((a, x) => a + x.rows, 0);
    note.classList.remove('sg-hidden', 'sg-hint', 'sg-warn');
    if (openRows > 0) { note.classList.add('sg-hint'); note.textContent = t('openingInMoves', { n: nf0.format(openRows) }); }
    else if (!state.opening && !(state.products && state.products.map.onHand >= 0)) { note.classList.add('sg-warn'); note.textContent = t('openingMissing'); }
    else note.classList.add('sg-hidden');
  }

  function refreshRun() {
    const s = state.moves;
    const ok = !!s && s.map.date >= 0 && s.map.sku >= 0 && s.map.qty >= 0 && s.dateOrder !== 'unknown'
      && (s.roles === null || s.types.some(x => s.roles[x.value] === 'sale'))
      && (!state.opening || (state.opening.map.sku >= 0 && state.opening.map.qty >= 0))
      && (!state.products || state.products.map.sku >= 0);
    $('runBtn').disabled = !ok;
    if (ok) say('');
    if (s) renderOpeningNote();
  }

  // ---------------------------------------------------------------- sample
  function sampleData() {
    const d = SGSample.generate();
    state.opening = null; state.products = null;
    $('openingName').textContent = ''; $('openingMap').classList.add('sg-hidden');
    setMoves({ name: 'sample', rows: d.moves, fromExcel: true }, 'sample');
    setProducts({ name: 'sample', rows: d.products, fromExcel: true }, 'sample');
    $('movesName').textContent = nf0.format(d.moves.length - 1) + ' ' + t('foundMoves') + ', ' + nf0.format(d.products.length - 1) + ' ' + t('foundProducts');
    if ($('limitValue').value === '') { $('limitValue').value = '2000'; $('limitB').checked = true; }
    refreshRun();
  }

  // ---------------------------------------------------------------- run
  function settings() {
    const v = (id, d) => { const x = Number($(id).value); return Number.isFinite(x) ? x : d; };
    const levels = {};
    document.querySelectorAll('#matrix input').forEach(i => {
      const x = Number(i.value) / 100;
      if (x > 0 && x < 1) levels[i.getAttribute('data-cell')] = x;
    });
    const raw = $('limitValue').value.trim();
    const ceiling = raw === '' ? null : P.parseNumber(raw, P.detectDecimal([raw], LANG === 'ro' ? ';' : ',').dec);
    return {
      leadTimeDays: Math.max(0, v('leadTimeDays', 14)), leadTimeSdDays: Math.max(0, v('leadTimeSdDays', 3)),
      reviewPeriodDays: Math.max(1, v('reviewPeriodDays', 7)), coverCapDays: Math.max(7, v('coverCapDays', 45)),
      excessCoverDays: Math.max(30, v('excessCoverDays', 180)), fillZeros: $('fillZeros').checked,
      serviceLevels: levels, abcCutA: 0.8, abcCutB: 0.95,
      limit: { classes: ['A', 'B', 'C'].filter(c => $('limit' + c).checked), maxValue: ceiling !== null && ceiling >= 0 ? ceiling : null },
      currency: $('currency').value.trim().toUpperCase(),
    };
  }

  const pack = src => (src ? { rows: src.rows, map: src.map, dec: src.dec, dateOrder: src.dateOrderChoice || 'DMY', roles: src.roles || null, flipSign: !!src.flipSign } : null);

  function run(done) {
    if (state.worker) state.worker.terminate();
    const w = new Worker(BASE + 'worker.js');
    state.worker = w;
    $('runBtn').disabled = true;
    say(t('reading'));
    state.settings = settings();
    w.onmessage = e => {
      const m = e.data;
      if (m.type === 'progress') say(t('computing', { done: m.done, total: m.total }));
      else if (m.type === 'error') { say(m.code ? t(m.code) : t('stopped', { m: m.message })); $('runBtn').disabled = false; }
      else if (m.type === 'done') {
        state.results = m.results; state.meta = m;
        say(t('doneLine', { n: nf0.format(m.results.length), s: nf1.format(m.seconds) }));
        $('runBtn').disabled = false;
        renderResults();
        if (typeof done === 'function') done();
      }
    };
    w.onerror = e => { say(t('stopped', { m: e.message })); $('runBtn').disabled = false; };
    w.postMessage({ type: 'run', input: { moves: pack(state.moves), opening: pack(state.opening), products: pack(state.products), settings: state.settings } });
  }

  // ---------------------------------------------------------------- results
  const median = a => { if (a.length === 0) return null; const s = a.slice().sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const sum = (a, f) => a.reduce((acc, x) => { const v = f(x); return acc + (isNum(v) ? v : 0); }, 0);
  const tile = (k, v, s) => el('div', { class: 'sg-tile' }, [el('div', { class: 'k', text: k }), el('div', { class: 'v', text: v }), s ? el('div', { class: 's', text: s }) : null]);

  function renderResults() {
    const R = state.results, M = state.meta, S = state.settings;
    $('results').classList.remove('sg-hidden');
    $('next').classList.remove('sg-hidden');
    $('asOf').textContent = t('asOf', { d: M.asOf });
    const tiles = $('tiles');
    tiles.textContent = '';
    const computed = R.filter(r => r.state === 'computed');
    const steady = R.filter(r => isNum(r.wmape) && (r.xyz === 'X' || r.xyz === 'Y'));
    const acc = (steady.length > 0 ? steady : R.filter(r => isNum(r.wmape))).map(r => r.wmape);
    tiles.appendChild(tile(t('t_products'), nf0.format(R.length), t('t_productsSub', { n: nf0.format(computed.length) })));
    if (M.hasStock) {
      const toOrder = R.filter(r => r.status === 'order');
      const inside = toOrder.filter(r => r.limit && r.limit.within);
      const excess = R.filter(r => r.excessUnits > 0);
      const costed = R.some(r => isNum(r.unitCost));
      tiles.appendChild(tile(t('t_order'), t('t_orderUnit', { n: nf0.format(toOrder.length) }),
        costed ? t('t_orderValue', { v: nf0.format(sum(toOrder, r => r.order && r.order.value)) }) : t('t_orderNoCost')));
      tiles.appendChild(tile(t('t_sign'), nf0.format(inside.length),
        S.limit.maxValue === null ? t('t_signNone', { n: nf0.format(toOrder.length) }) : t('t_signSub', { n: nf0.format(toOrder.length - inside.length) })));
      if (M.stockRebuilt) tiles.appendChild(tile(t('t_ranout'), nf0.format(R.filter(r => r.stock && r.stock.zero90 > 0).length), t('t_ranoutSub')));
      tiles.appendChild(tile(t('t_excess'), costed ? nf0.format(sum(excess, r => r.excessValue)) : t('t_orderUnit', { n: nf0.format(excess.length) }),
        t('t_excessSub', { n: nf0.format(excess.length), d: S.excessCoverDays })));
      if (costed) tiles.appendChild(tile(t('t_stock'), nf0.format(sum(R, r => r.stockValue)), t('t_stockSub')));
    } else tiles.appendChild(tile(t('t_noStock'), '—', t('t_noStockSub')));
    tiles.appendChild(tile(t('t_error'), acc.length ? pct(median(acc)) : '—', t('t_errorSub')));

    const notes = $('readNotes');
    notes.textContent = '';
    const c = M.counts;
    const line = (s, warn) => notes.appendChild(el('p', { class: warn ? 'sg-warnline' : '', text: s }));
    line(t('rowsUsed', { u: nf0.format(c.rowsUsed), r: nf0.format(c.rowsRead) })
      + (c.otherType ? t('otherType', { n: nf0.format(c.otherType) }) : '')
      + (c.badDate ? t('badDate', { n: nf0.format(c.badDate) }) : '')
      + (c.badQty ? t('badQty', { n: nf0.format(c.badQty) }) : '')
      + (c.noSku ? t('noSku', { n: nf0.format(c.noSku) }) : ''));
    if (M.stockRebuilt) line(t('stockRebuilt'));
    if (c.openingNoDate) line(t('openingNoDate'));
    if (c.negativeStock) line(t('negativeStock', { n: nf0.format(c.negativeStock) }), true);
    if (c.noOpening) line(t('noOpening', { n: nf0.format(c.noOpening) }), true);
    if (c.negativeDays) line(t('negativeDays', { n: nf0.format(c.negativeDays) }));
    if (c.noSales) line(t('noSales', { n: nf0.format(c.noSales) }));
    if (c.noStockMatch) line(t('noStockMatch', { n: nf0.format(c.noStockMatch) }));
    const holed = R.filter(r => r.holes && r.holes.length > 0).length;
    if (holed) line(t('holes', { n: nf0.format(holed) }));
    line(t(M.abcBasis === 'value' ? 'abcValue' : 'abcUnits'));

    const asks = $('asks');
    asks.textContent = '';
    QUESTIONS.forEach(q => {
      const b = el('button', { class: 'sg-ask', type: 'button', 'data-q': q, 'aria-pressed': 'false', text: t('q_' + q) });
      b.addEventListener('click', () => ask(q));
      asks.appendChild(b);
    });
    $('answer').classList.add('sg-hidden');

    const sf = $('statusFilter');
    sf.textContent = '';
    sf.appendChild(el('option', { value: '', text: t('allStatuses') }));
    STATUSES.forEach(k => { if (R.some(r => r.status === k)) sf.appendChild(el('option', { value: k, text: t('s_' + k) })); });
    $('recordsBtn').disabled = !R.some(r => r.status === 'order');
    renderTable();
    if (state.tour < 0) $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function ask(q) {
    const a = SGCore.answer(q, state.results);
    const S = state.settings;
    document.querySelectorAll('.sg-ask').forEach(b => b.setAttribute('aria-pressed', b.getAttribute('data-q') === q ? 'true' : 'false'));
    let text;
    if (q === 'ranout' && !state.meta.stockRebuilt) text = t('a_ranoutNA');
    else if (a.count === 0) text = t('a_' + q + '0', { days: S.excessCoverDays });
    else text = t('a_' + q, {
      count: nf0.format(a.count), value: num(a.value), urgent: nf0.format(a.urgent || 0), inside: nf0.format(a.inside || 0), outside: nf0.format(a.outside || 0),
      insideValue: num(a.insideValue), outsideValue: num(a.outsideValue), topValue: num(a.topValue), share: pct(a.share),
      days: q === 'excess' ? S.excessCoverDays : nf0.format(a.days || 0), worst: pct(a.worst),
    });
    const host = $('answer');
    host.textContent = '';
    host.classList.remove('sg-hidden');
    host.appendChild(el('p', { text }));
    if (a.rows && a.rows.length) {
      const row = el('p', { class: 'sg-toplist' }, [t('a_top') + ' ']);
      a.rows.forEach(key => {
        const r = state.results.find(x => x.key === key);
        const b = el('button', { class: 'sg-linkbtn', type: 'button', text: r.sku + (r.loc ? ' · ' + r.loc : '') });
        b.addEventListener('click', () => openDetail(r));
        row.appendChild(b);
      });
      host.appendChild(row);
    }
    $('statusFilter').value = [...$('statusFilter').options].some(o => o.value === a.status) ? a.status : '';
    state.sort = { col: a.sort[0], dir: a.sort[1] };
    renderTable();
  }

  const COLS = [
    { id: 'sku', left: true, get: r => r.sku + (r.loc ? ' · ' + r.loc : ''), text: true },
    { id: 'status', left: true, get: r => ['order', 'excess', 'not_computable', 'covered', 'parameters'].indexOf(r.status), badge: true },
    { id: 'cls', left: true, get: r => (r.abc || '') + (r.xyz || ''), text: true },
    { id: 'meanDaily', get: r => r.meanDaily, f: nf1 },
    { id: 'fc30', get: r => r.fc30 },
    { id: 'wmape', get: r => r.wmape, pct: true },
    { id: 'reorderPoint', get: r => r.reorderPoint },
    { id: 'onHand', get: r => r.onHand, stock: true },
    { id: 'coverDays', get: r => r.coverDays, stock: true },
    { id: 'zero90', get: r => (r.stock ? r.stock.zero90 : null), rebuilt: true },
    { id: 'orderQty', get: r => (r.order ? r.order.qty : null), stock: true },
    { id: 'orderValue', get: r => (r.order ? r.order.value : null), stock: true, cost: true },
    { id: 'sign', left: true, get: r => (r.limit ? (r.limit.within ? 0 : 1) : null), sign: true, stock: true },
    { id: 'stockValue', get: r => r.stockValue, stock: true, cost: true },
    { id: 'excess', get: r => (r.excessValue !== null ? r.excessValue : r.excessUnits), stock: true },
  ];

  function visibleRows() {
    const q = $('filter').value.trim().toLowerCase();
    const st = $('statusFilter').value;
    const col = COLS.find(c => c.id === state.sort.col) || COLS[0];
    const rows = state.results.filter(r => (!q || (r.sku + ' ' + r.loc).toLowerCase().indexOf(q) !== -1) && (!st || r.status === st));
    rows.sort((a, b) => {
      const x = col.get(a), y = col.get(b);
      if (x === null || x === undefined) return 1;
      if (y === null || y === undefined) return -1;
      const d = typeof x === 'string' ? x.localeCompare(y, 'en', { numeric: true }) : x - y;
      return d * state.sort.dir || a.sku.localeCompare(b.sku, 'en', { numeric: true });
    });
    return rows;
  }

  function renderTable() {
    const tb = $('table');
    tb.textContent = '';
    const M = state.meta;
    const costed = state.results.some(r => isNum(r.unitCost));
    const cols = COLS.filter(c => (!c.stock || M.hasStock) && (!c.rebuilt || M.stockRebuilt) && (!c.cost || costed));
    const hr = el('tr');
    cols.forEach(c => {
      const th = el('th', { class: c.left ? 'l' : '', text: t('c_' + c.id), scope: 'col', tabindex: '0' });
      if (state.sort.col === c.id) th.setAttribute('aria-sort', state.sort.dir === 1 ? 'ascending' : 'descending');
      const go = () => { state.sort = { col: c.id, dir: state.sort.col === c.id ? -state.sort.dir : (c.text || c.badge || c.sign ? 1 : -1) }; renderTable(); };
      th.addEventListener('click', go);
      th.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
      hr.appendChild(th);
    });
    tb.appendChild(el('thead', null, [hr]));
    const body = el('tbody');
    const rows = visibleRows();
    const shown = rows.slice(0, 500);
    shown.forEach(r => {
      const tr = el('tr', { tabindex: '0', 'data-key': r.key });
      cols.forEach(c => {
        const td = el('td', { class: c.left ? 'l' : '' });
        if (c.badge) td.appendChild(el('span', { class: 'sg-badge sg-b-' + r.status, text: t('s_' + r.status) }));
        else if (c.sign) td.textContent = r.limit ? t(r.limit.within ? 'sign_in' : 'sign_out') : '—';
        else if (c.text) td.textContent = c.get(r) || '—';
        else if (c.pct) td.textContent = pct(c.get(r));
        else td.textContent = num(c.get(r), c.f);
        tr.appendChild(td);
      });
      tr.addEventListener('click', () => openDetail(r));
      tr.addEventListener('keydown', e => { if (e.key === 'Enter') openDetail(r); });
      body.appendChild(tr);
    });
    tb.appendChild(body);
    $('tableNote').textContent = rows.length > shown.length ? t('tableFirst', { n: nf0.format(rows.length) }) : t('tableAll', { n: nf0.format(rows.length) });
  }

  // ---------------------------------------------------------------- detail
  function chart(a, b, aria, classes) {
    const W = 660, H = 200, L = 52, Rr = 12, Tp = 12, B = 26;
    const all = a.concat(b);
    const s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'sg-chart', role: 'img', 'aria-label': aria });
    if (all.length < 2) return s;
    const top = Math.max(1, ...all.map(p => p.q));
    const low = Math.min(0, ...all.map(p => p.q));
    const max = top * 1.08, span = max - low;
    const x = i => L + (i / (all.length - 1)) * (W - L - Rr);
    const y = v => Tp + (1 - (v - low) / span) * (H - Tp - B);
    [0, 0.5, 1].forEach(f => {
      const v = top * f;
      const tx = svg('text', { x: L - 6, y: y(v) + 4, 'text-anchor': 'end' });
      tx.textContent = nf0.format(v);
      s.appendChild(tx);
      s.appendChild(svg('line', { x1: L, y1: y(v), x2: W - Rr, y2: y(v), class: 'axis' }));
    });
    const path = (pts, off) => pts.map((p, i) => (i ? 'L' : 'M') + x(i + off).toFixed(1) + ' ' + y(p.q).toFixed(1)).join(' ');
    if (a.length > 1) s.appendChild(svg('path', { d: path(a, 0), class: classes[0] }));
    if (b.length > 0) {
      const joined = a.length > 0 ? [a[a.length - 1]].concat(b) : b;
      s.appendChild(svg('path', { d: path(joined, Math.max(0, a.length - 1)), class: classes[1] }));
      s.appendChild(svg('line', { x1: x(a.length - 1), y1: Tp, x2: x(a.length - 1), y2: y(low), class: 'split' }));
    }
    const lab = (i, anchor) => { const tx = svg('text', { x: x(i), y: H - 8, 'text-anchor': anchor }); tx.textContent = all[i].w; s.appendChild(tx); };
    lab(0, 'start');
    if (a.length > 2 && b.length > 0 && (a.length - 1) / (all.length - 1) < 0.78) lab(a.length - 1, 'middle');
    lab(all.length - 1, 'end');
    return s;
  }

  const kv = pairs => el('div', { class: 'sg-kv' }, pairs.filter(Boolean).map(([k, v]) => el('div', null, [el('div', { class: 'k', text: k }), el('div', { class: 'v', text: v })])));
  const list = items => el('ul', null, items.map(s => el('li', { text: s })));

  function openDetail(r) {
    const S = state.settings;
    const c = $('drawerContent');
    c.textContent = '';
    c.appendChild(el('h3', { id: 'drawerTitle', text: r.sku + (r.loc ? ' · ' + r.loc : '') }));
    c.appendChild(el('p', null, [el('span', { class: 'sg-badge sg-b-' + r.status, text: t('s_' + r.status) }), ' ',
      el('span', { class: 'sg-muted', text: t('d_class', { c: (r.abc || '?') + (r.xyz || '?'), a: r.firstDate, b: r.lastDate }) })]));

    c.appendChild(el('h4', { text: t('d_chart') }));
    c.appendChild(chart(r.histWeekly.filter(p => p.n >= 6 || r.histWeekly.length < 8), r.fcWeekly.filter(p => p.n >= 7), t('d_chartAria'), ['hist', 'fc']));
    c.appendChild(el('div', { class: 'sg-legend' }, [el('span', null, [el('i', { class: 'lh' }), t('sold')]), el('span', null, [el('i', { class: 'lf' }), t('forecast')])]));

    c.appendChild(el('h4', { text: t('d_forecast') }));
    let why;
    if (r.forecastState !== 'ok') why = t('whyNone');
    else if (r.method === 'baseline_moving_average') why = r.origins ? t('whyBaselineN', { n: r.origins }) : t('whyBaseline');
    else why = t('whyModel', { m: methodName(r.method), n: r.origins || '—', e: pct(r.wmape), b: pct(r.baselineWmape) });
    c.appendChild(el('p', { text: why }));
    if (r.xyz === 'Z' || (isNum(r.demandFrequency) && r.demandFrequency < 0.3)) c.appendChild(el('p', { class: 'sg-muted', text: t('sparse') }));
    c.appendChild(kv([[t('k_meanDaily'), num(r.meanDaily, nf1)], [t('k_fc30'), num(r.fc30)], [t('k_method'), methodName(r.method)], [t('k_error'), pct(r.wmape)]]));

    c.appendChild(el('h4', { text: t('d_params') }));
    if (r.state === 'computed') {
      c.appendChild(el('p', { text: t('paramsLine', { s: pct(r.csl), c: r.abc + r.xyz, l: num(r.leadTime, nf1), src: t(r.leadFrom === 'file' ? 'fromFile' : 'fromAssumption') }) }));
      c.appendChild(kv([[t('k_ss'), num(r.safetyStock)], [t('k_rop'), num(r.reorderPoint)], [t('k_out'), num(r.orderUpTo)]]));
    } else c.appendChild(el('p', { text: t('notComputed', { r: reasonText(r.reason) }) }));

    const plain = [];
    if (isNum(r.onHand)) {
      c.appendChild(el('h4', { text: t('d_position') }));
      c.appendChild(el('p', { text: r.stockSource === 'file' ? t('stockFromFile') : t('stockFromLedger', { a: r.stock.from }) }));
      if (r.stockWeekly.length > 1 && r.stockSource === 'rebuilt') {
        c.appendChild(chart(r.stockWeekly, [], t('d_stockAria'), ['stock', 'fc']));
        c.appendChild(el('div', { class: 'sg-legend' }, [el('span', null, [el('i', { class: 'ls' }), t('d_stockChart')])]));
      }
      c.appendChild(kv([
        [t('k_onHand'), num(r.onHand)], [t('k_onOrder'), num(r.onOrder)], [t('k_cover'), num(r.coverDays)],
        r.stock ? [t('k_zero'), num(r.stock.zero90)] : null,
        r.order ? [t('k_order'), num(r.order.qty)] : null,
        r.order && r.order.value !== null ? [t('k_orderValue'), num(r.order.value)] : null,
        r.excessUnits > 0 ? [t('k_excessUnits'), num(r.excessUnits)] : null,
        r.excessValue > 0 ? [t('k_excessValue'), num(r.excessValue)] : null,
      ]));
      if (r.order && r.order.waterfall && r.order.waterfall.length) {
        const tb = el('table', { class: 'sg-steps' });
        tb.appendChild(el('tr', null, [el('th', { class: 'l', text: t('w_step') }), el('th', { text: t('w_change') }), el('th', { text: t('w_qty') })]));
        r.order.waterfall.forEach(w => {
          tb.appendChild(el('tr', null, [
            el('td', { class: 'l' }, [stepName(w.step), LANG === 'en' && w.note ? el('div', { class: 'note', text: stepNote(w.note) }) : null]),
            el('td', { text: (w.delta > 0 ? '+' : '') + num(w.delta, nf1) }), el('td', { text: num(w.qty, nf1) }),
          ]));
        });
        c.appendChild(tb);
        if (r.order.orderDate) c.appendChild(el('p', { class: 'sg-muted sg-small', text: t('orderDates', { a: r.order.orderDate, b: r.order.arrival || '—' }) }));
      } else if (r.order && r.order.state === 'not_computable') c.appendChild(el('p', { text: t('noProposal', { r: reasonText(r.order.reason) }) }));
      if (r.order) (r.order.limits || []).forEach(l => { const s = limitText(l); if (s) plain.push(s); });
      if (r.limit) {
        c.appendChild(el('h4', { text: t('d_limit') }));
        c.appendChild(el('p', { text: t(r.limit.within ? 'limitIn' : 'limitOut') }));
        if (!r.limit.within) c.appendChild(list(r.limit.reasons.map(x => t('lr_' + x, { c: r.abc || '?', v: num(S.limit.maxValue) }))));
      }
    }

    const k = r.cleansing || {};
    const holeDays = (r.holes || []).reduce((a, h) => a + h.days, 0);
    if (k.calendarGapDays > holeDays) plain.unshift(t('n_gap', { n: nf0.format(k.calendarGapDays - holeDays) }));
    (r.holes || []).forEach(h => plain.unshift(t('n_hole', { a: h.from, b: h.to, n: h.days })));
    if (k.uncensored > 0) plain.unshift(t('n_stockout', { n: nf0.format(k.uncensored) }));
    if (r.stock && r.stock.negativeDays > 0) plain.unshift(t('n_negStock', { n: nf0.format(r.stock.negativeDays), m: num(r.stock.min) }));
    if (k.duplicateDatesDropped > 0) plain.unshift(t('n_dup', { n: nf0.format(k.duplicateDatesDropped) }));
    if (r.limits.some(l => /^Annual seasonality was dropped/.test(l))) plain.unshift(t('n_short'));
    if (plain.length) {
      c.appendChild(el('h4', { text: t('d_notes') }));
      c.appendChild(list(plain.filter((v, i, a) => a.indexOf(v) === i)));
    }
    const tech = r.notes.concat(r.limits).filter(s => !/^(Promotion uplift|Holiday effect)/.test(s));
    if (tech.length) c.appendChild(el('details', { class: 'sg-tech' }, [el('summary', { text: t('d_tech') }), list(tech)]));

    $('drawer').classList.remove('sg-hidden');
    $('drawerClose').focus();
  }
  function closeDetail() { $('drawer').classList.add('sg-hidden'); }

  // ---------------------------------------------------------------- export
  function download(name, type, text) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = el('a', { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportCsv() {
    const S = state.settings, M = state.meta;
    // A cell that starts like a formula is written as text, so a spreadsheet does not execute it.
    const q = v => {
      let s = v === null || v === undefined ? '' : String(v);
      if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+([.,]\d+)?$/.test(s)) s = "'" + s;
      return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const dec = LANG === 'ro' ? ',' : '.';
    const n = v => (isNum(v) ? String(Math.round(v * 100) / 100).replace('.', dec) : '');
    const lines = [];
    lines.push([t('x_title'), t('asOf', { d: M.asOf })].map(q).join(';'));
    lines.push([t('x_assumptions'), t('x_lead', { n: S.leadTimeDays }), t('x_leadSd', { n: S.leadTimeSdDays }), t('x_review', { n: S.reviewPeriodDays }),
      t('x_cap', { n: S.coverCapDays }), t('x_excess', { n: S.excessCoverDays }), t(S.fillZeros ? 'x_fill' : 'x_nofill'),
      t('x_classes', { b: t(M.abcBasis === 'value' ? 'x_value' : 'x_units') }),
      S.limit.maxValue === null ? t('x_nolimit') : t('x_limit', { c: S.limit.classes.join(' '), v: n(S.limit.maxValue) })].map(q).join(';'));
    lines.push('');
    lines.push(t('x_header'));
    state.results.forEach(r => {
      lines.push([q(r.sku), q(r.loc), q(t('s_' + r.status)), q((r.abc || '') + (r.xyz || '')), n(r.meanDaily), n(r.fc30), q(methodName(r.method)),
        n(r.wmape === null ? null : r.wmape * 100), n(r.csl === null ? null : r.csl * 100), n(r.leadTime), n(r.safetyStock), n(r.reorderPoint),
        n(r.orderUpTo), n(r.onHand), n(r.onOrder), n(r.coverDays), n(r.stock ? r.stock.zero90 : null), n(r.order ? r.order.qty : null), n(r.order ? r.order.value : null),
        q(r.limit ? t(r.limit.within ? 'sign_in' : 'sign_out') : ''), n(r.excessUnits), n(r.excessValue), q(r.state === 'computed' ? '' : reasonText(r.reason))].join(';'));
    });
    download(t('x_file', { d: M.asOf }), 'text/csv;charset=utf-8', '﻿' + lines.join('\r\n'));
  }

  function exportRecords() {
    const S = state.settings, M = state.meta;
    const r1 = v => (isNum(v) ? String(Math.round(v * 10) / 10) : 'not known');
    const sources = [tEn('rec_src_moves', { d: M.asOf })];
    if (M.stockRebuilt) sources.push(tEn('rec_src_opening'));
    if (state.products) sources.push(tEn('rec_src_products'));
    const recs = SGCore.decisionRecords(state.results, M, S, {
      engineVersion: ENGINE, sources, currency: /^[A-Z]{3}$/.test(S.currency) ? S.currency : 'XXX',
      createdAt: new Date().toISOString(),
      limitRef: S.limit.maxValue === null ? tEn('rec_nolimit') : tEn('rec_limit', { c: S.limit.classes.join(', '), v: r1(S.limit.maxValue) }),
      reasoning: r => {
        const w = r.order.waterfall || [];
        const at = id => w.find(x => x.step === id) || null;
        const need = at('net_need'), ss = at('safety_stock'), pos = at('position');
        return tEn('rec_reason', { need: r1(need && need.qty), csl: Math.round(r.csl * 100) + '%', ss: r1(ss && ss.delta), pos: r1(pos && -pos.delta), qty: r1(r.order.qty) });
      },
    });
    if (recs.length === 0) { say(t('recordsNone')); return; }
    download(t('x_records', { d: M.asOf }), 'application/json', JSON.stringify(recs, null, 1));
  }

  // ---------------------------------------------------------------- guided first run
  const TOUR = [
    { key: 'tour1', target: 'step-moves', enter: next => { if (!state.moves) sampleData(); next(); } },
    { key: 'tour2', target: 'movesMap', enter: next => next() },
    { key: 'tour3', target: 'step-settings', enter: next => next() },
    { key: 'tour4', target: 'tiles', enter: next => { if (state.results) next(); else run(next); } },
    { key: 'tour5', target: 'asks', enter: next => { ask('first'); next(); } },
    { key: 'tour6', target: 'drawerContent', enter: next => { const r = state.results.find(x => x.status === 'order') || state.results[0]; if (r) openDetail(r); next(); }, leave: closeDetail },
    { key: 'tour7', target: 'exports', enter: next => next() },
  ];
  function tourShow(i) {
    const prev = TOUR[state.tour];
    if (prev && prev.leave && i !== state.tour) prev.leave();
    document.querySelectorAll('.sg-tour-focus').forEach(n => n.classList.remove('sg-tour-focus'));
    if (i < 0 || i >= TOUR.length) { state.tour = -1; $('tour').classList.add('sg-hidden'); return; }
    state.tour = i;
    const step = TOUR[i];
    $('tour').classList.remove('sg-hidden');
    $('tourStep').textContent = t('tourOf', { a: i + 1, b: TOUR.length });
    $('tourText').textContent = t(step.key);
    $('tourBack').textContent = t('tourBack');
    $('tourBack').disabled = i === 0;
    $('tourNext').textContent = i === TOUR.length - 1 ? t('tourDone') : t('tourNext');
    $('tourNext').disabled = true;
    step.enter(() => {
      const target = $(step.target);
      if (target) {
        const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        target.classList.add('sg-tour-focus');
        target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      }
      $('tourNext').disabled = false;
      $('tourNext').focus({ preventScroll: true });
    });
  }

  // ---------------------------------------------------------------- wiring
  function buildMatrix() {
    const tb = $('matrix');
    tb.appendChild(el('tr', null, [el('th'), el('th', { text: t('mx_x') }), el('th', { text: t('mx_y') }), el('th', { text: t('mx_z') })]));
    ['A', 'B', 'C'].forEach(a => {
      const tr = el('tr', null, [el('th', { text: a })]);
      ['X', 'Y', 'Z'].forEach(x => {
        const c = a + x;
        tr.appendChild(el('td', null, [el('input', { type: 'number', min: '50', max: '99.9', step: '0.5', value: String(DEFAULT_LEVELS[c] * 100), 'data-cell': c, 'aria-label': t('mx_aria', { c }) })]));
      });
      tb.appendChild(tr);
    });
  }
  const onFile = (id, fn) => $(id).addEventListener('change', e => { const f = e.target.files[0]; if (f) readFile(f, sheets => fn(sheets, f.name)); });

  buildMatrix();
  onFile('movesFile', loadMain);
  onFile('openingFile', (sheets, name) => { const s = sheets.find(x => kindOf(x) === 'opening') || sheets[0]; setOpening(s, name); refreshRun(); });
  onFile('productsFile', (sheets, name) => { const s = sheets.find(x => kindOf(x) === 'products') || sheets[0]; setProducts(s, name); refreshRun(); });
  $('sampleBtn').addEventListener('click', sampleData);
  $('runBtn').addEventListener('click', () => run());
  $('filter').addEventListener('input', renderTable);
  $('statusFilter').addEventListener('change', renderTable);
  $('exportBtn').addEventListener('click', exportCsv);
  $('recordsBtn').addEventListener('click', exportRecords);
  $('printBtn').addEventListener('click', () => window.print());
  $('drawerClose').addEventListener('click', closeDetail);
  $('drawer').addEventListener('click', e => { if (e.target === $('drawer')) closeDetail(); });
  $('tourBtn').addEventListener('click', () => tourShow(0));
  $('tourNext').addEventListener('click', () => tourShow(state.tour + 1));
  $('tourBack').addEventListener('click', () => tourShow(state.tour - 1));
  $('tourClose').addEventListener('click', () => tourShow(-1));
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (state.tour >= 0) tourShow(-1); else closeDetail();
  });
})();
