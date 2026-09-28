/* Simon G. Decision Charter. (c) 2026 GROMA S.R.L., groma.ro */
// Pure logic for the Decision Charter tool: no DOM, no network. Runs the same in the
// browser (as a script, exposing SGCharterCore) and under Node (as a CommonJS module),
// so the rules that matter — the blank-filling, the CSV guard, the completeness count —
// can be tested without a page.
(function (root, factory) {
  var core = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
  root.SGCharterCore = core;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var BLANK_TOKEN = '____';

  /** Splits a template sentence on the blank token. blankCount is how many blanks it holds. */
  function splitBlanks(template) {
    var text = template === null || template === undefined ? '' : String(template);
    var segments = text.split(BLANK_TOKEN);
    return { segments: segments, blankCount: segments.length - 1 };
  }

  /** True when the text still has an unfilled blank. */
  function hasBlank(template) {
    return splitBlanks(template).blankCount > 0;
  }

  /**
   * Rebuilds the sentence, replacing each blank with the matching value (or the blank
   * token itself, when that value is empty). `values` is an array aligned to the blanks,
   * left to right.
   */
  function reconstructBlankText(template, values) {
    var split = splitBlanks(template);
    var segments = split.segments;
    var out = segments[0];
    for (var i = 1; i < segments.length; i++) {
      var raw = values && values[i - 1] !== undefined && values[i - 1] !== null ? String(values[i - 1]).trim() : '';
      out += (raw === '' ? BLANK_TOKEN : raw) + segments[i];
    }
    return out;
  }

  /**
   * A cell counts as carrying no signed limit when it is empty or still holds a blank —
   * rule 2 of the method: every freedom given to a machine has a signed limit.
   */
  function textIsBlankOrEmpty(text) {
    var s = text === null || text === undefined ? '' : String(text).trim();
    return s === '' || s.indexOf(BLANK_TOKEN) !== -1;
  }

  /**
   * The three counts the method asks for: nothing unowned, nothing unsigned (no limit),
   * nothing static (no review date). `rows` holds only the classes the visitor ticked in;
   * a class left unticked is not part of the charter and is not counted.
   */
  function computeCompleteness(rows) {
    var list = rows || [];
    var noOwner = 0, noLimit = 0, noReviewDate = 0, anyGap = 0;
    for (var i = 0; i < list.length; i++) {
      var r = list[i] || {};
      var missingOwner = !r.owner || !String(r.owner).trim();
      var missingLimit = textIsBlankOrEmpty(r.machineText);
      var missingReview = !r.reviewDate || !String(r.reviewDate).trim();
      if (missingOwner) noOwner++;
      if (missingLimit) noLimit++;
      if (missingReview) noReviewDate++;
      if (missingOwner || missingLimit || missingReview) anyGap++;
    }
    return { total: list.length, noOwner: noOwner, noLimit: noLimit, noReviewDate: noReviewDate, anyGap: anyGap };
  }

  /** Splits free text into one entry per non-empty line, trimmed — used for the
   *  perimeter statement's lists (approved AI tools, what may never leave). */
  function splitLines(text) {
    var s = text === null || text === undefined ? '' : String(text);
    var out = [];
    s.split(/\r\n|\r|\n/).forEach(function (line) {
      var t = line.trim();
      if (t !== '') out.push(t);
    });
    return out;
  }

  // ---------------------------------------------------------------- CSV

  /**
   * One field, guarded and quoted for a semicolon CSV: a leading =, +, -, @, tab or CR
   * is written as text so a spreadsheet does not execute it as a formula, and a field
   * holding a separator, quote or newline is wrapped in quotes.
   */
  function csvQuoteField(value) {
    var s = value === null || value === undefined ? '' : String(value);
    if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+([.,]\d+)?$/.test(s)) s = "'" + s;
    if (/[";\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  /** Joins pre-built lines into CSV text (CRLF), without the byte order mark. A line is
   *  either an array of raw field values (quoted here) or a string already fit to print
   *  as-is (a header row spelled in plain identifiers, or a blank separator line). */
  function buildCsvContent(input) {
    var lines = (input && input.lines) || [];
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      out.push(Array.isArray(line) ? line.map(csvQuoteField).join(';') : String(line));
    }
    return out.join('\r\n');
  }

  /** Builds the charter's CSV lines: a title line, a blank line, the header, one row per
   *  ticked class. Signed by / signed on repeat the charter's own signer and date, since
   *  the whole charter is signed as one document (rule 4: a person signs). */
  function buildCharterCsvLines(input) {
    var company = (input && input.company) || {};
    var rows = (input && input.rows) || [];
    var lines = [];
    lines.push([input.title || '', company.name || '', company.date || '']);
    lines.push('');
    lines.push(input.header || '');
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      lines.push([
        r.cls || '', r.owner || '', r.machineText || '', r.escalatesText || '',
        r.healthSignals || '', r.reviewDate || '', company.signer || '', company.date || '',
      ]);
    }
    return lines;
  }

  // ---------------------------------------------------------------- JSON

  /** Plain, reusable JSON for the whole document: company, the ticked classes (resolved
   *  text, no editor bookkeeping) and the perimeter statement. */
  function buildJsonExport(input) {
    var company = (input && input.company) || {};
    var rows = (input && input.rows) || [];
    return {
      tool: (input && input.toolName) || 'Simon G. Decision Charter',
      version: (input && input.version) || '0.1',
      generated: (input && input.generated) || '',
      company: { name: company.name || '', date: company.date || '', signer: company.signer || '' },
      classes: rows.map(function (r) {
        return {
          class: r.cls || '',
          owner: r.owner || '',
          machineMayActAlone: r.machineText || '',
          escalatesWhen: r.escalatesText || '',
          healthSignals: r.healthSignals || '',
          reviewDate: r.reviewDate || '',
          signedBy: company.signer || '',
          signedOn: company.date || '',
        };
      }),
      perimeter: (input && input.perimeter) || {},
    };
  }

  // ---------------------------------------------------------------- storage

  /** JSON.stringify guarded against a value that cannot be serialised (a DOM node landing
   *  in state by mistake, a circular reference): returns null instead of throwing. */
  function serializeState(state) {
    try {
      return JSON.stringify(state);
    } catch (e) {
      return null;
    }
  }

  /** JSON.parse guarded against a missing key, corrupted text or a non-object result. */
  function deserializeState(json) {
    if (!json) return null;
    try {
      var obj = JSON.parse(json);
      return obj && typeof obj === 'object' ? obj : null;
    } catch (e) {
      return null;
    }
  }

  return {
    BLANK_TOKEN: BLANK_TOKEN,
    splitBlanks: splitBlanks,
    hasBlank: hasBlank,
    reconstructBlankText: reconstructBlankText,
    computeCompleteness: computeCompleteness,
    splitLines: splitLines,
    csvQuoteField: csvQuoteField,
    buildCsvContent: buildCsvContent,
    buildCharterCsvLines: buildCharterCsvLines,
    buildJsonExport: buildJsonExport,
    serializeState: serializeState,
    deserializeState: deserializeState,
  };
});
