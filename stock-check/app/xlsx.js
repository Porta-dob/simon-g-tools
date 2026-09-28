/* Simon G. Stock Check. (c) 2026 GROMA S.R.L., groma.ro */
// Reads the first sheet of an .xlsx workbook in the browser, without any library and without the network.
// Returns rows of text: dates as YYYY-MM-DD, numbers with a decimal point.
(function (root) {
  'use strict';

  const u16 = (v, o) => v.getUint16(o, true);
  const u32 = (v, o) => v.getUint32(o, true);

  function entries(buf) {
    const v = new DataView(buf);
    let eocd = -1;
    for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) {
      if (u32(v, i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('not_a_workbook');
    const count = u16(v, eocd + 10);
    let p = u32(v, eocd + 16);
    const out = new Map();
    const dec = new TextDecoder('utf-8');
    for (let i = 0; i < count; i++) {
      if (u32(v, p) !== 0x02014b50) break;
      const method = u16(v, p + 10), csize = u32(v, p + 20), nameLen = u16(v, p + 28);
      const extraLen = u16(v, p + 30), commentLen = u16(v, p + 32), local = u32(v, p + 42);
      const name = dec.decode(new Uint8Array(buf, p + 46, nameLen));
      out.set(name, { method, csize, local });
      p += 46 + nameLen + extraLen + commentLen;
    }
    return out;
  }

  async function readEntry(buf, e) {
    const v = new DataView(buf);
    const start = e.local + 30 + u16(v, e.local + 26) + u16(v, e.local + 28);
    const data = new Uint8Array(buf, start, e.csize);
    let bytes;
    if (e.method === 0) bytes = data;
    else if (e.method === 8) {
      if (typeof DecompressionStream === 'undefined') throw new Error('browser_too_old');
      const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    } else throw new Error('unsupported_compression');
    return new TextDecoder('utf-8').decode(bytes);
  }

  const xml = text => new DOMParser().parseFromString(text, 'application/xml');
  const BUILTIN_DATES = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58]);
  const looksLikeDate = code => /[dmyh]/i.test(String(code).replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, '').replace(/\\./g, ''))
    && !/^general$/i.test(code);

  function colIndex(ref) {
    let n = 0;
    for (let i = 0; i < ref.length; i++) {
      const c = ref.charCodeAt(i);
      if (c < 65 || c > 90) break;
      n = n * 26 + (c - 64);
    }
    return n - 1;
  }

  function serialToIso(serial, date1904) {
    const days = Math.floor(serial) + (date1904 ? 1462 : 0);
    const ms = Date.UTC(1899, 11, 30) + days * 86400000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? String(serial) : d.toISOString().slice(0, 10);
  }

  /** Every sheet of the workbook, in order: [{ name, rows }]. */
  async function readWorkbook(buf) {
    const zip = entries(buf);
    const get = async name => (zip.has(name) ? readEntry(buf, zip.get(name)) : null);

    const wbText = await get('xl/workbook.xml');
    if (wbText === null) throw new Error('not_a_workbook');
    const wb = xml(wbText);
    const pr = wb.getElementsByTagName('workbookPr')[0];
    const date1904 = !!pr && /^(1|true)$/.test(pr.getAttribute('date1904') || '');
    const sheetNodes = wb.getElementsByTagName('sheet');
    if (sheetNodes.length === 0) throw new Error('no_sheet');
    const target = new Map();
    const relsText = await get('xl/_rels/workbook.xml.rels');
    if (relsText !== null) {
      const rels = xml(relsText).getElementsByTagName('Relationship');
      for (let i = 0; i < rels.length; i++) {
        const t = rels[i].getAttribute('Target');
        target.set(rels[i].getAttribute('Id'), t.startsWith('/') ? t.slice(1) : 'xl/' + t.replace(/^\.\//, ''));
      }
    }

    const strings = [];
    const ssText = await get('xl/sharedStrings.xml');
    if (ssText !== null) {
      const si = xml(ssText).getElementsByTagName('si');
      for (let i = 0; i < si.length; i++) {
        const ts = si[i].getElementsByTagName('t');
        let s = '';
        for (let k = 0; k < ts.length; k++) if (ts[k].parentNode.nodeName !== 'rPh') s += ts[k].textContent;
        strings.push(s);
      }
    }

    const dateStyle = [];
    const stText = await get('xl/styles.xml');
    if (stText !== null) {
      const st = xml(stText);
      const custom = new Map();
      const nf = st.getElementsByTagName('numFmt');
      for (let i = 0; i < nf.length; i++) custom.set(Number(nf[i].getAttribute('numFmtId')), nf[i].getAttribute('formatCode') || '');
      const cellXfs = st.getElementsByTagName('cellXfs')[0];
      if (cellXfs) {
        const xf = cellXfs.getElementsByTagName('xf');
        for (let i = 0; i < xf.length; i++) {
          const id = Number(xf[i].getAttribute('numFmtId') || 0);
          dateStyle.push(BUILTIN_DATES.has(id) || (custom.has(id) && looksLikeDate(custom.get(id))));
        }
      }
    }

    const readSheet = async sheetPath => {
    const sheetText = await get(sheetPath);
    if (sheetText === null) return [];
    const rowsXml = xml(sheetText).getElementsByTagName('row');
    const rows = [];
    let width = 0;
    for (let i = 0; i < rowsXml.length; i++) {
      const cells = rowsXml[i].getElementsByTagName('c');
      const row = [];
      for (let k = 0; k < cells.length; k++) {
        const c = cells[k];
        const ref = c.getAttribute('r');
        const col = ref ? colIndex(ref) : k;
        const type = c.getAttribute('t') || 'n';
        const vNode = c.getElementsByTagName('v')[0];
        let val = '';
        if (type === 's') val = vNode ? (strings[Number(vNode.textContent)] || '') : '';
        else if (type === 'inlineStr') { const t = c.getElementsByTagName('t')[0]; val = t ? t.textContent : ''; }
        else if (type === 'b') val = vNode && vNode.textContent === '1' ? 'true' : 'false';
        else if (type === 'd') val = vNode ? vNode.textContent.slice(0, 10) : '';
        else if (vNode) {
          const raw = vNode.textContent;
          if (type === 'n' && dateStyle[Number(c.getAttribute('s') || 0)] && raw !== '') val = serialToIso(Number(raw), date1904);
          else if (type === 'n' && raw !== '') { const n = Number(raw); val = Number.isFinite(n) ? String(n) : raw; }
          else val = raw;
        }
        while (row.length < col) row.push('');
        row[col] = val;
      }
      if (row.some(x => x !== '')) { rows.push(row); if (row.length > width) width = row.length; }
    }
    for (const r of rows) while (r.length < width) r.push('');
    return rows;
    };

    const out = [];
    for (let i = 0; i < sheetNodes.length; i++) {
      const node = sheetNodes[i];
      const rid = node.getAttribute('r:id') || node.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
      const p = target.get(rid) || ('xl/worksheets/sheet' + (i + 1) + '.xml');
      out.push({ name: node.getAttribute('name') || ('Sheet' + (i + 1)), rows: await readSheet(p) });
    }
    return out;
  }

  /** The first sheet only. */
  async function readXlsx(buf) {
    const sheets = await readWorkbook(buf);
    return sheets.length ? sheets[0].rows : [];
  }

  /** Rows back to delimited text, so the rest of the page handles one format only. */
  function toDelimited(rows) {
    const q = s => (/[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s);
    return rows.map(r => r.map(c => q(String(c))).join(';')).join('\n');
  }

  root.SGXlsx = { readXlsx, readWorkbook, toDelimited };
})(typeof self !== 'undefined' ? self : this);
