/* Simon G. Decision Charter. (c) 2026 GROMA S.R.L., groma.ro */
// Page logic. No network calls, no build step at run time: everything below reads and
// writes only this tab's DOM and this browser's localStorage.
/* global SGCharterCore, SG_CHARTER_I18N */
(function () {
  'use strict';
  var Core = SGCharterCore;
  var LANG = (document.documentElement.lang || 'en').slice(0, 2) === 'ro' ? 'ro' : 'en';
  var T = SG_CHARTER_I18N[LANG];
  var t = function (key, vars) {
    var s = T[key] === undefined ? key : T[key];
    if (vars) for (var k in vars) s = s.split('{' + k + '}').join(String(vars[k]));
    return s;
  };
  var STORE_KEY = 'simon-g-charter-' + LANG + '-v1';

  var $ = function (id) { return document.getElementById(id); };
  var el = function (tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    if (children) for (var i = 0; i < children.length; i++) {
      var c = children[i];
      if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return n;
  };
  var today = function () {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

  // ---------------------------------------------------------------- state

  var state = null;
  var rowSeq = 0;

  function defaultState() {
    var rows = T.starter.map(function (r) {
      var machineBlanks = new Array(Core.splitBlanks(r[2]).blankCount).fill('');
      var escalatesBlanks = new Array(Core.splitBlanks(r[3]).blankCount).fill('');
      return {
        id: 'c' + (++rowSeq), fn: r[0], cls: r[1],
        owner: '', machineTemplate: r[2], machineBlanks: machineBlanks,
        escalatesTemplate: r[3], escalatesBlanks: escalatesBlanks,
        healthSignals: r[4], reviewDate: '', included: true, custom: false,
      };
    });
    return {
      company: { name: '', date: today(), signer: '' },
      rows: rows,
      perimeter: { locType: 'own', locDetail: '', aiTools: '', neverLeaves: '', exceptionApprover: '' },
    };
  }

  /** Fills in anything a saved draft from an earlier version of the page might lack,
   *  so an old draft still loads instead of breaking the page. */
  function withDefaults(saved) {
    var base = defaultState();
    if (!saved || typeof saved !== 'object') return base;
    var company = saved.company || {};
    var perimeter = saved.perimeter || {};
    var rows = Array.isArray(saved.rows) ? saved.rows.map(function (r) {
      r = r || {};
      var mt = typeof r.machineTemplate === 'string' ? r.machineTemplate : '';
      var et = typeof r.escalatesTemplate === 'string' ? r.escalatesTemplate : '';
      rowSeq++;
      return {
        id: r.id || ('c' + rowSeq), fn: r.fn || T.otherFunction, cls: r.cls || '',
        owner: r.owner || '', machineTemplate: mt,
        machineBlanks: Array.isArray(r.machineBlanks) ? r.machineBlanks : new Array(Core.splitBlanks(mt).blankCount).fill(''),
        escalatesTemplate: et,
        escalatesBlanks: Array.isArray(r.escalatesBlanks) ? r.escalatesBlanks : new Array(Core.splitBlanks(et).blankCount).fill(''),
        healthSignals: r.healthSignals || '', reviewDate: r.reviewDate || '',
        included: r.included !== false, custom: !!r.custom,
      };
    }) : base.rows;
    return {
      company: { name: company.name || '', date: company.date || today(), signer: company.signer || '' },
      rows: rows,
      perimeter: {
        locType: perimeter.locType || 'own', locDetail: perimeter.locDetail || '',
        aiTools: perimeter.aiTools || '', neverLeaves: perimeter.neverLeaves || '',
        exceptionApprover: perimeter.exceptionApprover || '',
      },
    };
  }

  function load() {
    var saved = Core.deserializeState(safeGet(STORE_KEY));
    state = withDefaults(saved);
  }
  function safeGet(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } }
  function safeSet(key, value) { try { window.localStorage.setItem(key, value); return true; } catch (e) { return false; } }
  function safeRemove(key) { try { window.localStorage.removeItem(key); } catch (e) { /* ignore */ } }

  var saveTimer = null;
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      var json = Core.serializeState(state);
      if (json) safeSet(STORE_KEY, json);
    }, 300);
  }

  // ---------------------------------------------------------------- step 1

  function wireCompany() {
    $('companyName').value = state.company.name;
    $('charterDate').value = state.company.date;
    $('signerName').value = state.company.signer;
    $('companyName').addEventListener('input', function (e) { state.company.name = e.target.value; scheduleSave(); renderPreview(); });
    $('charterDate').addEventListener('input', function (e) { state.company.date = e.target.value; scheduleSave(); renderPreview(); });
    $('signerName').addEventListener('input', function (e) { state.company.signer = e.target.value; scheduleSave(); renderPreview(); });
  }

  // ---------------------------------------------------------------- step 2, the table

  function renderBlankCell(row, key) {
    var templateKey = key + 'Template', blanksKey = key + 'Blanks';
    var template = row[templateKey];
    var wrap = el('div', { class: 'sg-cellwrap' });
    if (Core.hasBlank(template)) {
      var line = el('div', { class: 'sg-blankline' });
      var segments = Core.splitBlanks(template).segments;
      for (var i = 0; i < segments.length; i++) {
        if (segments[i]) line.appendChild(el('span', { class: 'sg-blanktext', text: segments[i] }));
        if (i < segments.length - 1) {
          let idx = i; // a fresh binding per blank, so each input updates its own position
          var input = el('input', {
            type: 'text', class: 'sg-blank', size: '5', value: row[blanksKey][idx] || '',
            placeholder: Core.BLANK_TOKEN, 'aria-label': t('blankAria', { t: row.cls || t('addedRow') }),
          });
          input.addEventListener('input', function (e) { row[blanksKey][idx] = e.target.value; scheduleSave(); renderPreview(); });
          line.appendChild(input);
        }
      }
      wrap.appendChild(line);
      var editBtn = el('button', { type: 'button', class: 'sg-linklike' , text: t('editWording') });
      editBtn.addEventListener('click', function () {
        row[templateKey] = Core.reconstructBlankText(row[templateKey], row[blanksKey]);
        row[blanksKey] = [];
        scheduleSave();
        var td = editBtn.closest('td');
        td.innerHTML = '';
        td.appendChild(renderBlankCell(row, key));
        renderPreview();
      });
      wrap.appendChild(editBtn);
    } else {
      var ta = el('textarea', { class: 'sg-cellText', rows: '2', placeholder: t('freeTextPh'),
        'aria-label': t(key === 'machine' ? 'colMachine' : 'colEscalates') + ': ' + (row.cls || t('addedRow')) });
      ta.value = template;
      ta.addEventListener('input', function (e) { row[templateKey] = e.target.value; scheduleSave(); renderPreview(); });
      ta.addEventListener('blur', function () {
        if (Core.hasBlank(row[templateKey])) {
          row[blanksKey] = new Array(Core.splitBlanks(row[templateKey]).blankCount).fill('');
          var td = ta.closest('td');
          td.innerHTML = '';
          td.appendChild(renderBlankCell(row, key));
          renderPreview();
        }
      });
      wrap.appendChild(ta);
    }
    return wrap;
  }

  function renderTable() {
    var tbody = $('classesBody');
    tbody.innerHTML = '';
    var groups = [];
    var byFn = {};
    state.rows.forEach(function (r) {
      if (!byFn[r.fn]) { byFn[r.fn] = []; groups.push(r.fn); }
      byFn[r.fn].push(r);
    });
    groups.forEach(function (fn) {
      tbody.appendChild(el('tr', { class: 'sg-group' }, [el('td', { colspan: '8', text: fn })]));
      byFn[fn].forEach(function (row) { tbody.appendChild(renderRow(row)); });
    });
  }

  function renderRow(row) {
    var tr = el('tr');

    var includeCell = el('td', { class: 'sg-cell-check' });
    var includeInput = el('input', { type: 'checkbox' });
    includeInput.checked = row.included;
    includeInput.setAttribute('aria-label', t('include') + ': ' + (row.cls || t('addedRow')));
    includeInput.addEventListener('change', function (e) { row.included = e.target.checked; scheduleSave(); renderPreview(); });
    includeCell.appendChild(includeInput);
    tr.appendChild(includeCell);

    var clsInput = el('input', { type: 'text', value: row.cls, placeholder: t('classPh'), 'aria-label': t('colClass') });
    clsInput.addEventListener('input', function (e) { row.cls = e.target.value; scheduleSave(); renderPreview(); });
    tr.appendChild(el('td', { class: 'l' }, [clsInput]));

    var ownerInput = el('input', { type: 'text', value: row.owner, placeholder: t('ownerPh'), 'aria-label': t('colOwner') });
    ownerInput.addEventListener('input', function (e) { row.owner = e.target.value; scheduleSave(); renderPreview(); });
    tr.appendChild(el('td', { class: 'l' }, [ownerInput]));

    tr.appendChild(el('td', { class: 'l' }, [renderBlankCell(row, 'machine')]));
    tr.appendChild(el('td', { class: 'l' }, [renderBlankCell(row, 'escalates')]));

    var healthInput = el('input', { type: 'text', value: row.healthSignals, placeholder: t('healthPh'), 'aria-label': t('colHealth') });
    healthInput.addEventListener('input', function (e) { row.healthSignals = e.target.value; scheduleSave(); renderPreview(); });
    tr.appendChild(el('td', { class: 'l' }, [healthInput]));

    var dateInput = el('input', { type: 'date', value: row.reviewDate, 'aria-label': t('colReview') });
    dateInput.addEventListener('input', function (e) { row.reviewDate = e.target.value; scheduleSave(); renderPreview(); });
    tr.appendChild(el('td', null, [dateInput]));

    var removeBtn = el('button', { type: 'button', class: 'sg-btn small', text: t('remove') });
    removeBtn.addEventListener('click', function () {
      if (window.confirm(t('removeConfirm', { c: row.cls || t('addedRow') }))) {
        state.rows = state.rows.filter(function (r) { return r.id !== row.id; });
        scheduleSave();
        renderTable();
        renderPreview();
      }
    });
    tr.appendChild(el('td', null, [removeBtn]));

    return tr;
  }

  function addClass() {
    rowSeq++;
    var row = {
      id: 'custom' + rowSeq, fn: T.otherFunction, cls: '', owner: '',
      machineTemplate: '', machineBlanks: [], escalatesTemplate: '', escalatesBlanks: [],
      healthSignals: '', reviewDate: '', included: true, custom: true,
    };
    state.rows.push(row);
    scheduleSave();
    renderTable();
    renderPreview();
    var inputs = $('classesBody').querySelectorAll('tr:last-child input[type="text"]');
    if (inputs.length) inputs[0].focus();
  }

  // ---------------------------------------------------------------- step 3, perimeter

  function wirePerimeter() {
    var radios = document.querySelectorAll('input[name="procLoc"]');
    radios.forEach(function (r) {
      r.checked = r.value === state.perimeter.locType;
      r.addEventListener('change', function (e) { if (e.target.checked) { state.perimeter.locType = e.target.value; scheduleSave(); renderPreview(); } });
    });
    $('procLocDetail').value = state.perimeter.locDetail;
    $('procLocDetail').addEventListener('input', function (e) { state.perimeter.locDetail = e.target.value; scheduleSave(); renderPreview(); });
    $('aiTools').value = state.perimeter.aiTools;
    $('aiTools').addEventListener('input', function (e) { state.perimeter.aiTools = e.target.value; scheduleSave(); renderPreview(); });
    $('neverLeaves').value = state.perimeter.neverLeaves;
    $('neverLeaves').addEventListener('input', function (e) { state.perimeter.neverLeaves = e.target.value; scheduleSave(); renderPreview(); });
    $('exceptionApprover').value = state.perimeter.exceptionApprover;
    $('exceptionApprover').addEventListener('input', function (e) { state.perimeter.exceptionApprover = e.target.value; scheduleSave(); renderPreview(); });
  }

  // ---------------------------------------------------------------- resolved rows

  function resolvedIncludedRows() {
    return state.rows.filter(function (r) { return r.included; }).map(function (r) {
      return {
        fn: r.fn, cls: r.cls || t('addedRow'), owner: r.owner,
        machineText: Core.reconstructBlankText(r.machineTemplate, r.machineBlanks),
        escalatesText: Core.reconstructBlankText(r.escalatesTemplate, r.escalatesBlanks),
        healthSignals: r.healthSignals, reviewDate: r.reviewDate,
      };
    });
  }

  // ---------------------------------------------------------------- preview

  function renderPreview() {
    var rows = resolvedIncludedRows();
    renderCharterPreview(rows);
    renderPerimeterPreview();
    renderCompleteness(rows);
  }

  function renderCharterPreview(rows) {
    var host = $('previewCharter');
    host.innerHTML = '';
    host.appendChild(el('h3', { text: t('resultTitle') }));
    var whoLine = state.company.name ? t('forCompany', { c: state.company.name }) : t('forCompanyGeneric');
    host.appendChild(el('p', { class: 'sg-muted sg-small', text: whoLine }));
    host.appendChild(el('p', { class: 'sg-small', text: state.company.signer ? t('signedLine', { signer: state.company.signer, date: state.company.date }) : t('unsignedLine') }));
    if (!rows.length) {
      host.appendChild(el('p', { class: 'sg-hint', text: t('previewEmpty') }));
      return;
    }
    var wrap = el('div', { class: 'sg-table-wrap' });
    var table = el('table', { class: 'sg-data' });
    var thead = el('tr', null, [
      el('th', { class: 'l', text: t('colClass') }), el('th', { class: 'l', text: t('colOwner') }),
      el('th', { class: 'l', text: t('colMachine') }), el('th', { class: 'l', text: t('colEscalates') }),
      el('th', { class: 'l', text: t('colHealth') }), el('th', { class: 'l', text: t('colReview') }),
    ]);
    table.appendChild(el('thead', null, [thead]));
    var tbody = el('tbody');
    var lastFn = null;
    rows.forEach(function (r) {
      if (r.fn !== lastFn) { tbody.appendChild(el('tr', { class: 'sg-group' }, [el('td', { colspan: '6', text: r.fn })])); lastFn = r.fn; }
      tbody.appendChild(el('tr', null, [
        el('td', { class: 'l' }, [document.createTextNode(r.cls)]),
        el('td', { class: 'l' }, [document.createTextNode(r.owner || '—')]),
        el('td', { class: 'l' }, [document.createTextNode(r.machineText)]),
        el('td', { class: 'l' }, [document.createTextNode(r.escalatesText)]),
        el('td', { class: 'l' }, [document.createTextNode(r.healthSignals || '—')]),
        el('td', { class: 'l' }, [document.createTextNode(r.reviewDate || '—')]),
      ]));
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    host.appendChild(wrap);
  }

  function renderPerimeterPreview() {
    var host = $('previewPerimeter');
    host.innerHTML = '';
    host.appendChild(el('h3', { text: t('perimeterTitle') }));
    var p = state.perimeter;
    var where = t('cm_' + p.locType) || t('cm_own');
    var detail = p.locDetail && p.locDetail.trim() ? ' (' + p.locDetail.trim() + ')' : '';
    host.appendChild(el('p', { text: t('perimeterLocationLine', { where: where, detail: detail }) }));
    var ai = Core.splitLines(p.aiTools);
    host.appendChild(el('p', { text: t('perimeterAiLine', { list: ai.length ? ai.join(', ') : t('perimeterAiNone') }) }));
    var never = Core.splitLines(p.neverLeaves);
    host.appendChild(el('p', { text: t('perimeterNeverLine', { list: never.length ? never.join(', ') : t('perimeterNeverNone') }) }));
    host.appendChild(el('p', { text: t('perimeterExceptionLine', { who: p.exceptionApprover && p.exceptionApprover.trim() ? p.exceptionApprover.trim() : t('perimeterExceptionNone') }) }));
  }

  function renderCompleteness(rows) {
    var c = Core.computeCompleteness(rows);
    var host = $('complTiles');
    host.innerHTML = '';
    function tile(k, v, s, cls) {
      var d = el('div', { class: 'sg-tile' + (cls ? ' ' + cls : '') });
      d.appendChild(el('div', { class: 'k', text: k }));
      d.appendChild(el('div', { class: 'v', text: String(v) }));
      d.appendChild(el('div', { class: 's', text: s }));
      host.appendChild(d);
    }
    tile(t('t_total'), c.total, t('t_totalSub', { n: c.total }));
    tile(t('t_owner'), c.noOwner, t('t_ownerSub'), c.noOwner ? 'sg-tile-warn' : 'sg-tile-ok');
    tile(t('t_limit'), c.noLimit, t('t_limitSub'), c.noLimit ? 'sg-tile-warn' : 'sg-tile-ok');
    tile(t('t_review'), c.noReviewDate, t('t_reviewSub'), c.noReviewDate ? 'sg-tile-warn' : 'sg-tile-ok');
    $('complBanner').textContent = c.anyGap === 0 && c.total > 0 ? t('allGood') : (c.total > 0 ? t('someGaps', { n: c.anyGap, t: c.total }) : '');
    $('complBanner').className = 'sg-notes' + (c.anyGap === 0 && c.total > 0 ? ' sg-b-covered-text' : (c.anyGap > 0 ? ' sg-b-order-text' : ''));
  }

  // ---------------------------------------------------------------- export

  function isoStamp() { return today(); }

  function downloadBlob(content, mime, filename) {
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = el('a', { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function exportCsv() {
    var rows = resolvedIncludedRows();
    var lines = Core.buildCharterCsvLines({ title: t('company'), company: state.company, rows: rows, header: t('x_header') });
    var content = Core.buildCsvContent({ lines: lines });
    downloadBlob('﻿' + content, 'text/csv;charset=utf-8', t('x_file', { d: isoStamp() }));
  }

  function exportJson() {
    var rows = resolvedIncludedRows();
    var perimeter = {
      processingLocationType: state.perimeter.locType,
      processingLocationDetail: state.perimeter.locDetail,
      approvedAiTools: Core.splitLines(state.perimeter.aiTools),
      neverLeaves: Core.splitLines(state.perimeter.neverLeaves),
      exceptionApprover: state.perimeter.exceptionApprover,
    };
    var obj = Core.buildJsonExport({ toolName: t('company'), generated: new Date().toISOString(), company: state.company, rows: rows, perimeter: perimeter });
    downloadBlob(JSON.stringify(obj, null, 2), 'application/json;charset=utf-8', t('x_json_file', { d: isoStamp() }));
  }

  function clearDraft() {
    if (!window.confirm(t('confirmClear'))) return;
    safeRemove(STORE_KEY);
    rowSeq = 0;
    state = defaultState();
    wireCompany();
    renderTable();
    wirePerimeter();
    renderPreview();
    say(t('cleared'));
  }

  function say(msg) {
    var n = $('saveNotice');
    n.textContent = msg;
    clearTimeout(say._t);
    say._t = setTimeout(function () { n.textContent = t('savedNotice'); }, 2500);
  }

  // ---------------------------------------------------------------- boot

  load();
  wireCompany();
  renderTable();
  wirePerimeter();
  renderPreview();
  $('saveNotice').textContent = t('savedNotice');

  $('addClassBtn').addEventListener('click', addClass);
  $('exportCsvBtn').addEventListener('click', exportCsv);
  $('exportJsonBtn').addEventListener('click', exportJson);
  $('printBtn').addEventListener('click', function () { window.print(); });
  $('clearBtn').addEventListener('click', clearDraft);
})();
