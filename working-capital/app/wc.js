/* Simon G. Working Capital Check. (c) 2026 GROMA S.R.L., groma.ro */
// Page logic. No network calls; the arithmetic runs in wc-calc.js, in this browser tab.
/* global SGWC, SGWC_I18N */
(function () {
  'use strict';
  const C = SGWC;
  const LANG = (document.documentElement.lang || 'en').slice(0, 2) === 'ro' ? 'ro' : 'en';
  const T = SGWC_I18N[LANG];
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
  const nf1 = new Intl.NumberFormat(T.locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fmt = (v, f) => (v === null || v === undefined || !Number.isFinite(v) ? T.missing : (f || nf0).format(v).replace(/^-/, '−'));

  const FIELDS = ['revenue', 'cogs', 'stock', 'receivables', 'payables', 'netProfit'];

  function money(v) {
    if (v === null || v === undefined || !Number.isFinite(v)) return T.missing;
    const c = $('currency').value.trim();
    return fmt(Math.round(v)) + (c ? ' ' + c : '');
  }

  function readInputs() {
    const y = id => {
      const o = {};
      FIELDS.forEach(f => { o[f] = C.parseNumber($(id + '-' + f).value); });
      return o;
    };
    return { currency: $('currency').value, y0: y('y0'), y1: y('y1') };
  }

  function fieldLabel(f) { return t('f_' + f); }

  function clearFieldWarnings() {
    FIELDS.forEach(f => { ['y0', 'y1'].forEach(y => { const n = $(y + '-' + f + '-warn'); if (n) n.textContent = ''; }); });
  }

  function showErrors(errors) {
    clearFieldWarnings();
    errors.forEach(e => {
      const n = $(e.year + '-' + e.field + '-warn');
      if (!n) return;
      n.textContent = t(e.code === 'negative' ? 'err_negative' : 'err_absurd', { field: fieldLabel(e.field), year: t(e.year === 'y0' ? 'y_prior' : 'y_latest') });
    });
  }

  let lastResult = null;

  function recompute() {
    const input = readInputs();
    const result = C.compute(input);
    lastResult = result;
    showErrors(result.errors);
    render(result);
  }

  // ---------------------------------------------------------------- tiles
  function tile(k, v, s) {
    return el('div', { class: 'sg-tile' }, [el('div', { class: 'k', text: k }), el('div', { class: 'v', text: v }), s ? el('div', { class: 's', text: s }) : null]);
  }

  function changeLine(delta, moneyDelta) {
    if (delta === null) return '';
    if (delta === 0) return t('changeFlat');
    if (moneyDelta === null || moneyDelta === undefined) return t(delta > 0 ? 'changeUpDays' : 'changeDownDays', { n: fmt(Math.abs(delta)) });
    return t(delta > 0 ? 'changeUp' : 'changeDown', { n: fmt(Math.abs(delta)), v: money(Math.abs(moneyDelta)) });
  }

  function denomNote(used) { return t(used === 'cogs' ? 'onCogs' : 'onRevenue'); }

  function renderTiles(r) {
    const host = $('tiles');
    host.textContent = '';
    host.appendChild(tile(t('tile_stockDays'), fmt(r.y1.stockDays), [denomNote(r.y1.stockDenomUsed), changeLine(r.change.stockDaysDelta, r.change.stockMoneyDelta)].filter(Boolean).join(' · ')));
    host.appendChild(tile(t('tile_receivableDays'), fmt(r.y1.receivableDays), changeLine(r.change.receivableDaysDelta, r.change.receivableMoneyDelta)));
    if (r.y1.payables !== null || r.y0.payables !== null) {
      host.appendChild(tile(t('tile_payableDays'), fmt(r.y1.payableDays), r.y1.payableDays === null ? t('needPayables') : [denomNote(r.y1.payableDenomUsed), changeLine(r.change.payableDaysDelta, r.change.payableMoneyDelta)].filter(Boolean).join(' · ')));
      host.appendChild(tile(t('tile_ccc'), fmt(r.y1.ccc), r.y1.ccc === null ? t('needPayables') : changeLine(r.change.cccDelta, null) || t('changeFlat')));
    }
    host.appendChild(tile(t('tile_dayStock'), money(r.y1.dayValueStock)));
    host.appendChild(tile(t('tile_dayRevenue'), money(r.y1.dayValueRevenue)));
  }

  // ---------------------------------------------------------------- chart (plain SVG, widths as attributes)
  function renderChart(r) {
    const host = $('chart');
    host.textContent = '';
    const rows = [
      { label: t('chart_stock'), a: r.y0.stockDays, b: r.y1.stockDays },
      { label: t('chart_receivable'), a: r.y0.receivableDays, b: r.y1.receivableDays },
    ];
    if (r.y1.payableDays !== null || r.y0.payableDays !== null) rows.push({ label: t('chart_payable'), a: r.y0.payableDays, b: r.y1.payableDays });
    const usable = rows.filter(x => x.a !== null || x.b !== null);
    if (usable.length === 0) { host.appendChild(el('p', { class: 'sg-muted sg-small', text: t('needMore') })); return; }

    const W = 640, rowH = 54, L = 108, R = 64, top = 20;
    const H = top + usable.length * rowH + 10;
    const s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'sg-chart', role: 'img', 'aria-label': t('chart_title') });
    const max = Math.max(1, ...usable.map(x => Math.max(x.a || 0, x.b || 0))) * 1.12;
    const barMax = W - L - R;
    const w = v => (v === null ? 0 : Math.max(v > 0 ? 2 : 0, (v / max) * barMax));

    usable.forEach((row, i) => {
      const y0 = top + i * rowH;
      s.appendChild(svg('text', { x: 0, y: y0 + 16, class: 'lab' })).textContent = row.label;
      s.appendChild(svg('rect', { x: L, y: y0 + 2, width: String(w(row.a)), height: 14, class: 'bar prior' }));
      const la = svg('text', { x: L + w(row.a) + 6, y: y0 + 13, class: 'val' }); la.textContent = fmt(row.a); s.appendChild(la);
      s.appendChild(svg('rect', { x: L, y: y0 + 22, width: String(w(row.b)), height: 14, class: 'bar latest' }));
      const lb = svg('text', { x: L + w(row.b) + 6, y: y0 + 33, class: 'val' }); lb.textContent = fmt(row.b); s.appendChild(lb);
    });
    host.appendChild(s);
    host.appendChild(el('div', { class: 'sg-legend' }, [
      el('span', null, [el('i', { class: 'lp' }), t('legend_prior')]),
      el('span', null, [el('i', { class: 'll' }), t('legend_latest')]),
    ]));
  }

  // ---------------------------------------------------------------- what-if
  function renderWhatIf(r) {
    const sd = Math.max(0, Number($('whatIfStock').value) || 0);
    const rd = Math.max(0, Number($('whatIfRecv').value) || 0);
    const w = C.whatIf(r, sd, rd);
    $('whatIfResult').textContent = w.total === null ? t('needMore') : money(w.total);
  }

  function step(id, delta, min, max) {
    const n = $(id);
    const v = Math.min(max, Math.max(min, (Number(n.value) || 0) + delta));
    n.value = String(v);
    renderWhatIf(lastResult);
  }

  // ---------------------------------------------------------------- sentences
  function renderSentences(r) {
    const host = $('sentences');
    host.textContent = '';
    if (!r.complete || r.sentences.length === 0) { host.appendChild(el('p', { class: 'sg-muted', text: t('noSentences') })); return; }
    const ol = el('ol');
    r.sentences.forEach(f => {
      let s = '';
      if (f.id === 'growthStock') {
        s = t(f.growthRevenuePct >= 0 ? 's_growthStock' : 's_growthStock_inv', { gRev: nf1.format(Math.abs(f.growthRevenuePct)), gStock: nf1.format(f.growthStockPct) });
      } else if (f.id === 'growthReceivables') {
        s = t('s_growthReceivables', { gRecv: nf1.format(f.growthReceivablePct), gRev: nf1.format(f.growthRevenuePct), d0: fmt(f.receivableDays0), d1: fmt(f.receivableDays1) });
      } else if (f.id === 'cashMoved') {
        const n = Math.abs((f.stockDaysDelta || 0) + (f.receivableDaysDelta || 0));
        if (f.moneyDelta === 0) s = t('s_cashMoved_flat');
        else s = t(f.moneyDelta > 0 ? 's_cashMoved_up' : 's_cashMoved_down', { n: fmt(n), v: money(Math.abs(f.moneyDelta)) });
      }
      if (s) ol.appendChild(el('li', { text: s }));
    });
    host.appendChild(ol);
  }

  function render(r) {
    renderTiles(r);
    renderChart(r);
    renderWhatIf(r);
    renderSentences(r);
  }

  // ---------------------------------------------------------------- example
  function fillExample() {
    const ex = {
      y0: { revenue: 10000000, cogs: 7000000, stock: 1400000, receivables: 1200000, payables: 900000, netProfit: 300000 },
      y1: { revenue: 11000000, cogs: 7600000, stock: 1650000, receivables: 1450000, payables: 950000, netProfit: 250000 },
    };
    FIELDS.forEach(f => { $('y0-' + f).value = String(ex.y0[f]); $('y1-' + f).value = String(ex.y1[f]); });
    if (!$('currency').value.trim()) $('currency').value = LANG === 'ro' ? 'lei' : 'EUR';
    recompute();
  }

  // ---------------------------------------------------------------- copy
  function copyFigures() {
    const r = lastResult;
    if (!r) return;
    const lines = [t('copyHeader'), ''];
    const yr = (label, y) => {
      lines.push(label + ':');
      FIELDS.forEach(f => lines.push('  ' + fieldLabel(f) + ': ' + (y[f] === null ? T.missing : fmt(y[f]))));
    };
    yr(t('y_prior'), r.y0);
    yr(t('y_latest'), r.y1);
    lines.push('');
    lines.push(t('tile_stockDays') + ': ' + fmt(r.y1.stockDays) + ' (' + denomNote(r.y1.stockDenomUsed) + ')');
    lines.push(t('tile_receivableDays') + ': ' + fmt(r.y1.receivableDays));
    if (r.y1.ccc !== null) lines.push(t('tile_ccc') + ': ' + fmt(r.y1.ccc));
    lines.push(t('tile_dayStock') + ': ' + money(r.y1.dayValueStock));
    lines.push(t('tile_dayRevenue') + ': ' + money(r.y1.dayValueRevenue));
    const text = lines.join('\n');
    const done = () => { const s = $('copyStatus'); s.textContent = t('copied'); setTimeout(() => { s.textContent = ''; }, 3000); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done);
    else done();
  }

  // ---------------------------------------------------------------- wiring
  FIELDS.forEach(f => {
    $('y0-' + f).addEventListener('input', recompute);
    $('y1-' + f).addEventListener('input', recompute);
  });
  $('currency').addEventListener('input', recompute);
  $('exampleBtn').addEventListener('click', fillExample);
  $('copyBtn').addEventListener('click', copyFigures);
  $('printBtn').addEventListener('click', () => window.print());
  $('whatIfStock').addEventListener('input', () => renderWhatIf(lastResult));
  $('whatIfRecv').addEventListener('input', () => renderWhatIf(lastResult));
  $('whatIfStockMinus').addEventListener('click', () => step('whatIfStock', -1, 0, 3650));
  $('whatIfStockPlus').addEventListener('click', () => step('whatIfStock', 1, 0, 3650));
  $('whatIfRecvMinus').addEventListener('click', () => step('whatIfRecv', -1, 0, 3650));
  $('whatIfRecvPlus').addEventListener('click', () => step('whatIfRecv', 1, 0, 3650));

  recompute();
})();
