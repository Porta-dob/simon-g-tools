// Tests for the pure logic behind the Decision Charter: no DOM, no browser. Run with
// `node test/charter.test.mjs`. Exits non-zero on the first failed assertion.
import assert from 'node:assert/strict';
import test from 'node:test';
import Core from '../app/charter-core.js';

// ---------------------------------------------------------------- blanks

test('splitBlanks counts the blanks in a template', () => {
  assert.equal(Core.splitBlanks('Never').blankCount, 0);
  assert.equal(Core.splitBlanks('Quantity under ____').blankCount, 1);
  assert.equal(Core.splitBlanks('Above ____, or below ____').blankCount, 2);
  assert.equal(Core.hasBlank('Quantity under ____'), true);
  assert.equal(Core.hasBlank('Never'), false);
});

test('reconstructBlankText fills a single blank', () => {
  const out = Core.reconstructBlankText('Quantity under ____', ['500']);
  assert.equal(out, 'Quantity under 500');
});

test('reconstructBlankText fills several blanks in order', () => {
  const out = Core.reconstructBlankText('Above ____, or below ____', ['1000', '10']);
  assert.equal(out, 'Above 1000, or below 10');
});

test('reconstructBlankText leaves the blank token where no value was typed', () => {
  const out = Core.reconstructBlankText('Quantity under ____', ['']);
  assert.equal(out, 'Quantity under ____');
  const out2 = Core.reconstructBlankText('Quantity under ____', []);
  assert.equal(out2, 'Quantity under ____');
});

test('reconstructBlankText trims stray whitespace typed into a blank', () => {
  const out = Core.reconstructBlankText('Quantity under ____', ['  500  ']);
  assert.equal(out, 'Quantity under 500');
});

test('a template with no blank is returned unchanged', () => {
  assert.equal(Core.reconstructBlankText('Never', []), 'Never');
});

// ---------------------------------------------------------------- completeness

test('computeCompleteness counts an empty owner, an unfilled limit, and a missing review date', () => {
  const rows = [
    { owner: '', machineText: 'Never', reviewDate: '2026-12-01' }, // no owner only
    { owner: 'A. Pop', machineText: 'Quantity under ____', reviewDate: '2026-12-01' }, // unfilled blank
    { owner: 'A. Pop', machineText: '', reviewDate: '2026-12-01' }, // empty limit
    { owner: 'A. Pop', machineText: 'Never', reviewDate: '' }, // no review date
    { owner: 'A. Pop', machineText: 'Never', reviewDate: '2026-12-01' }, // complete
  ];
  const c = Core.computeCompleteness(rows);
  assert.equal(c.total, 5);
  assert.equal(c.noOwner, 1);
  assert.equal(c.noLimit, 2);
  assert.equal(c.noReviewDate, 1);
  assert.equal(c.anyGap, 4);
});

test('computeCompleteness on an empty charter reports zero, not a crash', () => {
  const c = Core.computeCompleteness([]);
  assert.deepEqual(c, { total: 0, noOwner: 0, noLimit: 0, noReviewDate: 0, anyGap: 0 });
});

test('a row can be missing more than one thing and still counts once toward anyGap', () => {
  const c = Core.computeCompleteness([{ owner: '', machineText: '', reviewDate: '' }]);
  assert.equal(c.noOwner, 1);
  assert.equal(c.noLimit, 1);
  assert.equal(c.noReviewDate, 1);
  assert.equal(c.anyGap, 1);
});

// ---------------------------------------------------------------- CSV: quoting and the formula guard

test('csvQuoteField leaves a plain word alone', () => {
  assert.equal(Core.csvQuoteField('Planner'), 'Planner');
});

test('csvQuoteField guards a leading formula character with a leading quote', () => {
  assert.equal(Core.csvQuoteField('=2+2'), "'=2+2");
  assert.equal(Core.csvQuoteField('+1'), "'+1");
  assert.equal(Core.csvQuoteField('@SUM(A1)'), "'@SUM(A1)");
  assert.equal(Core.csvQuoteField('-overdue'), "'-overdue"); // a leading minus on non-numeric text is still guarded
});

test('csvQuoteField does not guard a plain negative number', () => {
  assert.equal(Core.csvQuoteField('-3.5'), '-3.5');
  assert.equal(Core.csvQuoteField('-3,5'), '-3,5');
});

test('csvQuoteField wraps and escapes a field holding a separator, quote or newline', () => {
  assert.equal(Core.csvQuoteField('a;b'), '"a;b"');
  assert.equal(Core.csvQuoteField('a "quote"'), '"a ""quote"""');
  assert.equal(Core.csvQuoteField('line one\nline two'), '"line one\nline two"');
});

test('csvQuoteField turns null and undefined into an empty field', () => {
  assert.equal(Core.csvQuoteField(null), '');
  assert.equal(Core.csvQuoteField(undefined), '');
});

test('buildCsvContent joins rows with CRLF and passes a raw header line through unchanged', () => {
  const content = Core.buildCsvContent({
    lines: [
      ['Simon G. Decision Charter', 'Acme SRL', '2026-09-28'],
      '',
      'class;owner',
      ['Replenishment order', '=EVIL()'],
    ],
  });
  const rows = content.split('\r\n');
  assert.equal(rows.length, 4);
  assert.equal(rows[0], 'Simon G. Decision Charter;Acme SRL;2026-09-28');
  assert.equal(rows[1], '');
  assert.equal(rows[2], 'class;owner');
  assert.equal(rows[3], "Replenishment order;'=EVIL()");
});

test('buildCharterCsvLines carries the signer and date onto every ticked row', () => {
  const lines = Core.buildCharterCsvLines({
    title: 'Simon G. Decision Charter',
    company: { name: 'Acme SRL', date: '2026-09-28', signer: 'M. Ionescu' },
    header: 'class;owner;machine_may_act_alone;escalates_when;health_signals;review_date;signed_by;signed_on',
    rows: [
      { cls: 'Replenishment order', owner: 'A. Pop', machineText: 'Quantity under 500', escalatesText: 'Above 500', healthSignals: 'Reversals', reviewDate: '2027-01-01' },
    ],
  });
  assert.equal(lines.length, 4);
  assert.deepEqual(lines[3], ['Replenishment order', 'A. Pop', 'Quantity under 500', 'Above 500', 'Reversals', '2027-01-01', 'M. Ionescu', '2026-09-28']);
  const content = Core.buildCsvContent({ lines });
  assert.ok(content.startsWith('Simon G. Decision Charter;Acme SRL;2026-09-28\r\n'));
});

// ---------------------------------------------------------------- JSON export

test('buildJsonExport produces one clean object per ticked class, with no editor bookkeeping', () => {
  const obj = Core.buildJsonExport({
    toolName: 'Simon G. Decision Charter', generated: '2026-09-28T00:00:00.000Z',
    company: { name: 'Acme SRL', date: '2026-09-28', signer: 'M. Ionescu' },
    rows: [{ cls: 'Replenishment order', owner: 'A. Pop', machineText: 'Quantity under 500', escalatesText: 'Above 500', healthSignals: 'Reversals', reviewDate: '2027-01-01' }],
    perimeter: { processingLocationType: 'own', approvedAiTools: [], neverLeaves: ['Customer names'], exceptionApprover: 'CIO' },
  });
  assert.equal(obj.tool, 'Simon G. Decision Charter');
  assert.equal(obj.classes.length, 1);
  assert.equal(obj.classes[0].class, 'Replenishment order');
  assert.equal(obj.classes[0].machineMayActAlone, 'Quantity under 500');
  assert.equal(obj.classes[0].signedBy, 'M. Ionescu');
  assert.equal(obj.classes[0].signedOn, '2026-09-28');
  assert.equal(obj.perimeter.exceptionApprover, 'CIO');
  // round trip through JSON.stringify/parse, as the browser does for the download
  const roundTripped = JSON.parse(JSON.stringify(obj));
  assert.deepEqual(roundTripped, obj);
});

test('buildJsonExport on no ticked classes still returns a valid, empty document', () => {
  const obj = Core.buildJsonExport({ company: {}, rows: [], perimeter: {} });
  assert.deepEqual(obj.classes, []);
  assert.equal(obj.company.name, '');
});

// ---------------------------------------------------------------- perimeter lists

test('splitLines drops blank lines and trims each entry', () => {
  assert.deepEqual(Core.splitLines('ChatGPT\n\n  Copilot  \r\nClaude'), ['ChatGPT', 'Copilot', 'Claude']);
  assert.deepEqual(Core.splitLines(''), []);
  assert.deepEqual(Core.splitLines(null), []);
});

// ---------------------------------------------------------------- localStorage round trip

test('serializeState / deserializeState round-trip a realistic draft', () => {
  const state = {
    company: { name: 'Acme SRL', date: '2026-09-28', signer: 'M. Ionescu' },
    rows: [
      { id: 'c1', fn: 'Supply chain', cls: 'Replenishment order', owner: 'A. Pop', machineTemplate: 'Quantity under ____', machineBlanks: ['500'], escalatesTemplate: 'Above ____', escalatesBlanks: ['500'], healthSignals: 'Reversals', reviewDate: '2027-01-01', included: true, custom: false },
    ],
    perimeter: { locType: 'own', locDetail: '', aiTools: 'Claude', neverLeaves: 'Customer names', exceptionApprover: 'CIO' },
  };
  const json = Core.serializeState(state);
  assert.equal(typeof json, 'string');
  const back = Core.deserializeState(json);
  assert.deepEqual(back, state);
});

test('deserializeState returns null for missing, corrupted or non-object JSON, instead of throwing', () => {
  assert.equal(Core.deserializeState(null), null);
  assert.equal(Core.deserializeState(''), null);
  assert.equal(Core.deserializeState('{not valid json'), null);
  assert.equal(Core.deserializeState('"just a string"'), null);
  assert.equal(Core.deserializeState('42'), null);
});

test('serializeState does not throw on a value it cannot fully serialise', () => {
  const circular = {};
  circular.self = circular;
  assert.equal(Core.serializeState(circular), null);
});
