/* Simon G. Stock Check. (c) 2026 GROMA S.R.L., groma.ro */
// Simon G. Stock Check — file reading helpers. Loaded by the page and by the worker.
(function (root) {
  'use strict';

  function detectDelimiter(text) {
    const head = text.slice(0, 20000).split(/\r?\n/).filter(l => l.trim().length > 0).slice(0, 20);
    let best = ',', bestScore = -1;
    for (const d of [';', '\t', ',', '|']) {
      const counts = head.map(l => splitLine(l, d).length);
      if (counts.length === 0 || counts[0] < 2) continue;
      const same = counts.filter(c => c === counts[0]).length;
      const score = same * 100 + counts[0];
      if (score > bestScore) { bestScore = score; best = d; }
    }
    return best;
  }

  function splitLine(line, delim) {
    const out = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) {
        if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; }
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === delim) { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out;
  }

  /** Whole-file parse. Quoted fields may contain the delimiter and line breaks. */
  function parseCsv(text, delim, maxRows) {
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    const rows = []; let row = [], cur = '', q = false;
    const n = text.length;
    for (let i = 0; i < n; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
        else cur += c;
        continue;
      }
      if (c === '"') q = true;
      else if (c === delim) { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cur); cur = '';
        if (row.length > 1 || row[0].trim() !== '') rows.push(row);
        row = [];
        if (maxRows && rows.length >= maxRows) return rows;
      } else cur += c;
    }
    if (cur !== '' || row.length > 0) { row.push(cur); if (row.length > 1 || row[0].trim() !== '') rows.push(row); }
    return rows;
  }

  /** dec is the decimal separator of the column: ',' or '.'. The other one is the thousands separator.
   *  A minus sign written after the number, as SAP exports it, is read as a negative. */
  function parseNumber(raw, dec) {
    if (raw === null || raw === undefined) return null;
    let s = String(raw).replace(/[\s\u00a0']/g, '');
    if (s === '') return null;
    let neg = false;
    if (s.endsWith('-')) { neg = true; s = s.slice(0, -1); }
    else if (s.startsWith('-')) { neg = true; s = s.slice(1); }
    else if (s.startsWith('+')) s = s.slice(1);
    if (dec === ',') s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
    if (!/^\d*\.?\d+(e[-+]?\d+)?$/i.test(s)) return null;
    const v = Number(s);
    if (!Number.isFinite(v)) return null;
    return neg ? -v : v;
  }

  /** Reads a column of numbers and says which separator is the decimal one.
   *  Returns { dec, sure }. "12,000" alone cannot be decided, so the file's delimiter
   *  breaks the tie and sure is false. */
  function detectDecimal(samples, delim) {
    let comma = 0, point = 0, open = 0;
    for (const raw of samples) {
      const s = String(raw === undefined || raw === null ? '' : raw).replace(/[\s\u00a0'+-]/g, '');
      if (s === '') continue;
      const c = (s.match(/,/g) || []).length, d = (s.match(/\./g) || []).length;
      if (c > 0 && d > 0) { if (s.lastIndexOf(',') > s.lastIndexOf('.')) comma++; else point++; }
      else if (c > 1) point++;
      else if (d > 1) comma++;
      else if (c === 1) { if (/,\d{3}$/.test(s)) open++; else comma++; }
      else if (d === 1) { if (/\.\d{3}$/.test(s)) open++; else point++; }
    }
    if (comma > point) return { dec: ',', sure: true };
    if (point > comma) return { dec: '.', sure: true };
    return { dec: delim === ',' ? '.' : ',', sure: open === 0 };
  }

  /** Lead time as a number of days, or as a Business Central date formula such as 14D, 2W, 1M. */
  function parseLeadTime(raw, dec) {
    const n = parseNumber(raw, dec);
    if (n !== null) return n;
    const m = /^<?\s*(\d+)\s*([DWMQY])\s*>?$/i.exec(String(raw === undefined || raw === null ? '' : raw).trim());
    if (!m) return null;
    return Number(m[1]) * { D: 1, W: 7, M: 30, Q: 91, Y: 365 }[m[2].toUpperCase()];
  }

  function iso(y, m, d) {
    if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1990 || y > 2100) return null;
    const t = new Date(Date.UTC(y, m - 1, d));
    if (t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return null;
    return t.toISOString().slice(0, 10);
  }

  /** order: 'DMY' or 'MDY' — used only when the year comes last. */
  function makeDateParser(order) {
    return function (raw) {
      if (raw === null || raw === undefined) return null;
      const s = String(raw).trim().split(/[T ]/)[0];
      let m;
      if ((m = /^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/.exec(s))) return iso(+m[1], +m[2], +m[3]);
      if ((m = /^(\d{4})(\d{2})(\d{2})$/.exec(s))) return iso(+m[1], +m[2], +m[3]);
      if ((m = /^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})$/.exec(s))) {
        let y = +m[3]; if (y < 100) y += 2000;
        return order === 'MDY' ? iso(y, +m[1], +m[2]) : iso(y, +m[2], +m[1]);
      }
      return null;
    };
  }

  /** 'YMD' | 'DMY' | 'MDY' | 'ambiguous' | 'unknown' */
  function detectDateOrder(samples) {
    let yearFirst = 0, yearLast = 0, firstOver12 = 0, secondOver12 = 0;
    for (const raw of samples) {
      const s = String(raw || '').trim().split(/[T ]/)[0];
      let m;
      if (/^\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2}$/.test(s) || /^\d{8}$/.test(s)) yearFirst++;
      else if ((m = /^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})$/.exec(s))) {
        yearLast++;
        if (+m[1] > 12) firstOver12++;
        if (+m[2] > 12) secondOver12++;
      }
    }
    if (yearFirst === 0 && yearLast === 0) return 'unknown';
    if (yearFirst >= yearLast) return 'YMD';
    if (firstOver12 > 0 && secondOver12 === 0) return 'DMY';
    if (secondOver12 > 0 && firstOver12 === 0) return 'MDY';
    return 'ambiguous';
  }

  const SALES_FIELDS = [
    { id: 'date', label: 'Date', required: true, re: /^(posting|date|data|datum|day|zi|invoice.?date|doc.?date|buchung)/i },
    { id: 'sku', label: 'Product code', required: true, re: /^(sku|product|produs|item|artic|material|cod|code|part)(?!.*(desc|name|denum|text|document))/i },
    { id: 'qty', label: 'Quantity sold', required: true, re: /^(qty|quant|cantit|units|buc|menge|sold|sales|vanz)/i },
    { id: 'loc', label: 'Location', required: false, re: /^(loc|store|warehouse|depozit|magazin|site|branch|gestiune|plant|werk|invent.?loc)/i },
    { id: 'stockout', label: 'Out of stock that day', required: false, re: /(stockout|stock.?out|oos|ruptur)/i },
    { id: 'type', label: 'Transaction type', required: false, re: /(trans.?type|entry.?type|^type$|^tip|movement|^mvt|bewegungsart)/i },
  ];
  const OPENING_FIELDS = [
    { id: 'sku', label: 'Product code', required: true, re: /^(no\.?$|sku|product|produs|item|artic|material|cod|code|part)(?!.*(desc|name|denum|text))/i },
    { id: 'loc', label: 'Location', required: false, re: /^(loc|store|warehouse|depozit|magazin|site|branch|gestiune|plant|werk|invent.?loc)/i },
    { id: 'date', label: 'Date', required: false, re: /^(posting|date|data|datum|day|zi|as.?of)/i },
    { id: 'qty', label: 'Quantity', required: true, re: /(qty|quant|cantit|stock|stoc|on.?hand|balance|sold|unrestricted|inventory|opening)/i },
  ];
  const PRODUCT_FIELDS = [
    { id: 'sku', label: 'Product code', required: true, re: /^(no\.?$|sku|product|produs|item|artic|material|cod|code|part)(?!.*(desc|name|denum|text))/i },
    { id: 'loc', label: 'Location', required: false, re: /^(loc|store|warehouse|depozit|magazin|site|branch|gestiune|plant|werk|invent.?loc)/i },
    { id: 'onHand', label: 'Stock on hand', required: false, re: /^(?!.*order)(.*(on.?hand|avail|physical|disponibil|unrestricted|sold.?final)|stock|stoc|inventory)/i },
    { id: 'onOrder', label: 'Already on order', required: false, re: /(on.?order|ordered|transit|comandat|purch.*order)/i },
    { id: 'leadTime', label: 'Lead time (days)', required: false, re: /(lead|termen|livrare|deliv)/i },
    { id: 'unitCost', label: 'Unit cost', required: false, re: /(cost|price|pret|preț)/i },
    { id: 'packSize', label: 'Pack size', required: false, re: /(pack|bax|colet|multiple|multiplu|rounding)/i },
    { id: 'moq', label: 'Minimum order quantity', required: false, re: /(moq|min.*order|min.*lot|minim)/i },
  ];

  /** Header names decide; for the date the values decide first, because a header such as
   *  DATAAREAID starts like "data" and holds no date at all. */
  function guessMapping(headers, fields, rows) {
    const map = {}, taken = new Set();
    const sample = (rows || []).slice(0, 40);
    const looksLikeDates = i => {
      if (sample.length === 0) return true;
      const order = detectDateOrder(sample.map(r => r[i]));
      if (order === 'unknown') return false;
      const parse = makeDateParser(order === 'MDY' ? 'MDY' : 'DMY');
      return sample.filter(r => parse(r[i]) !== null).length >= sample.length * 0.8;
    };
    for (const f of fields) {
      map[f.id] = -1;
      if (f.id === 'date' && sample.length > 0) {
        const dated = headers.map((h, i) => i).filter(looksLikeDates);
        const named = dated.filter(i => f.re.test(String(headers[i]).trim()));
        const pick = named.length > 0 ? named[0] : dated.length > 0 ? dated[0] : -1;
        if (pick >= 0) { map.date = pick; taken.add(pick); }
        continue;
      }
      for (let i = 0; i < headers.length; i++) {
        if (taken.has(i)) continue;
        if (f.re.test(String(headers[i]).trim())) { map[f.id] = i; taken.add(i); break; }
      }
    }
    return map;
  }

  root.SGParse = {
    detectDelimiter, parseCsv, parseNumber, detectDecimal, parseLeadTime, makeDateParser, detectDateOrder, guessMapping,
    SALES_FIELDS, OPENING_FIELDS, PRODUCT_FIELDS,
  };
})(typeof self !== 'undefined' ? self : this);
