/* Simon G. Stock Check. (c) 2026 GROMA S.R.L., groma.ro */
// Invented data for the sample button and for the downloadable template: an opening stock,
// then sales, receipts, returns and adjustments for one year. Sales stop when the shelf is empty,
// so the data contains the out-of-stock days a real ledger would contain.
(function (root) {
  'use strict';

  const NAMES = ['Oil filter', 'Air filter', 'Brake pads front', 'Brake disc', 'Wiper blade 600', 'Engine oil 5W40 4L',
    'Coolant 1L', 'Battery 70Ah', 'Spark plug', 'Timing belt kit', 'Cabin filter', 'Bulb H7', 'Fuel filter', 'Shock absorber',
    'Clutch kit', 'Alternator', 'Wheel bearing', 'Brake fluid 1L', 'Antifreeze 5L', 'Exhaust clamp', 'V-belt', 'Thermostat',
    'Water pump', 'Glow plug'];

  function generate(opt) {
    const o = Object.assign({ products: 24, days: 365, seed: 20260928, end: '2026-08-31', location: 'MAIN' }, opt || {});
    let seed = o.seed >>> 0;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    const DAY = 86400000;
    const end = Date.parse(o.end + 'T00:00:00Z');
    const iso = d => new Date(end - (o.days - 1 - d) * DAY).toISOString().slice(0, 10);
    const openDate = new Date(end - o.days * DAY).toISOString().slice(0, 10);

    const moves = [['date', 'product', 'location', 'type', 'quantity']];
    const products = [['product', 'description', 'location', 'lead_time_days', 'unit_cost', 'pack_size', 'min_order_qty', 'on_order']];
    const body = [];

    for (let k = 0; k < o.products; k++) {
      const code = 'P-' + String(1001 + k);
      const name = NAMES[k % NAMES.length] + (k >= NAMES.length ? ' ' + (Math.floor(k / NAMES.length) + 1) : '');
      const base = k % 6 === 0 ? 30 + rnd() * 40 : k % 6 < 4 ? 5 + rnd() * 18 : 0.7 + rnd() * 1.6;
      const season = rnd() < 0.5 ? 0.3 : 0.05;
      const phase = rnd() * 6.28;
      const lead = [5, 7, 10, 14, 21][Math.floor(rnd() * 5)];
      const pack = base > 20 ? 12 : base > 4 ? 6 : 1;
      const cost = Math.round((3 + rnd() * 120) * 100) / 100;
      // three kinds of planning: tight (runs out), sound, and generous (holds too much)
      const style = k % 5 === 1 ? 'tight' : k % 5 === 3 ? 'generous' : 'sound';
      const coverTarget = style === 'tight' ? lead * 0.9 + 3 : style === 'generous' ? lead + 260 : lead + 16;
      const rop = base * (style === 'tight' ? lead * 0.7 : style === 'generous' ? lead + 200 : lead + 6);
      const upTo = base * coverTarget;
      const surge = k % 7 === 2 ? 240 : -1;

      let onHand = Math.round(base * (style === 'generous' ? 300 : style === 'tight' ? lead * 0.8 : lead + 12));
      body.push([openDate, code, o.location, 'opening', onHand]);
      const due = [];
      for (let d = 0; d < o.days; d++) {
        const date = iso(d);
        const dow = new Date(Date.parse(date + 'T00:00:00Z')).getUTCDay();
        let received = 0;
        for (let i = due.length - 1; i >= 0; i--) if (due[i].day <= d) { received += due[i].qty; due.splice(i, 1); }
        if (received > 0) { body.push([date, code, o.location, 'receipt', received]); onHand += received; }
        if (dow !== 0) {
          let want = base * (dow === 6 ? 0.5 : 1) * (1 + season * Math.sin((2 * Math.PI * d) / 365 + phase)) * (0.55 + rnd() * 0.9);
          if (surge >= 0 && d >= surge) want *= 1.8;
          if (base < 2.5 && rnd() < 0.6) want = 0;
          want = Math.round(want);
          const sold = Math.min(want, Math.max(0, onHand));
          if (sold > 0) { body.push([date, code, o.location, 'sale', sold]); onHand -= sold; }
          if (sold > 0 && rnd() < 0.01) { const back = Math.min(sold, pack); body.push([date, code, o.location, 'return', back]); onHand += back; }
        }
        if (d % 90 === 89 && rnd() < 0.5) {
          const diff = -Math.min(onHand, Math.round(rnd() * 3));
          if (diff !== 0) { body.push([date, code, o.location, 'adjustment', diff]); onHand += diff; }
        }
        const pipeline = due.reduce((t, x) => t + x.qty, 0);
        if (d % 7 === 0 && onHand + pipeline <= rop) {
          const qty = Math.max(pack, Math.ceil((upTo - onHand - pipeline) / pack) * pack);
          const late = rnd() < (style === 'tight' ? 0.35 : 0.1) ? Math.round(3 + rnd() * 9) : 0;
          due.push({ day: d + lead + late, qty });
        }
      }
      products.push([code, name, o.location, lead, cost, pack, pack, due.reduce((t, x) => t + x.qty, 0)]);
    }
    body.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
    return { moves: moves.concat(body), products };
  }

  root.SGSample = { generate };
})(typeof self !== 'undefined' ? self : globalThis);
