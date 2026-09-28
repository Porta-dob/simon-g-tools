/* Simon G. Stock Check. (c) 2026 GROMA S.R.L., groma.ro */
// Runs the calculation off the page's thread. No network access is used.
/* global SimonEngine, SGParse, SGCore */
importScripts('engine.js', 'parse.js', 'core.js');

onmessage = e => {
  if (!e.data || e.data.type !== 'run') return;
  const t0 = performance.now();
  try {
    const out = SGCore.run(e.data.input, SimonEngine, SGParse, (done, total) => postMessage({ type: 'progress', done, total }));
    if (out.error) postMessage({ type: 'error', code: out.error, counts: out.counts });
    else postMessage(Object.assign({ type: 'done', seconds: (performance.now() - t0) / 1000 }, out));
  } catch (err) {
    postMessage({ type: 'error', message: String((err && err.message) || err) });
  }
};
