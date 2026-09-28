/* Simon G. Credit Check. (c) 2026 GROMA S.R.L., groma.ro */
// Simon G. Credit Check — the calculation, off the page's thread. No network access is used.
/* global SimonCredit, SGParse, SGCreditCalc */
importScripts('credit-engine.js', '../app/parse.js', 'credit-calc.js');
'use strict';

onmessage = e => {
  if (e.data && e.data.type === 'run') {
    try {
      const out = SGCreditCalc.run(e.data, (done, total) => postMessage({ type: 'progress', done, total }));
      if (out.error) postMessage({ type: 'error', code: out.error, counts: out.counts });
      else postMessage(Object.assign({ type: 'done' }, out));
    } catch (err) {
      postMessage({ type: 'error', message: String(err && err.message || err) });
    }
  }
};
