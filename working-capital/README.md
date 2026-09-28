# Simon G. Working Capital Check

A free tool by Groma. A CFO or owner types a few figures from the last two annual balance sheets and immediately sees how much cash is tied up in stock and receivables, how it changed, and what one day is worth.

No file, no sign-up. The arithmetic runs in the browser; nothing is sent anywhere.

## Use

1. Open the page.
2. Type revenue, stock and trade receivables for the year before and the latest year. These three are needed for both years.
3. Optionally add cost of goods sold, trade payables and net profit; each sharpens the result and, for cost of goods sold, changes which figure the day counts are computed on.
4. The tiles, the chart, the "what if" control and the three sentences update as you type.

Figures can be typed as `1.234,5` or `1,234.5`, with or without spaces; the page reads either.

## What the numbers mean

| Output | Formula |
|---|---|
| Days of stock | stock ÷ (cost of goods sold, or revenue when it is not given) × 365 |
| Days to collect | trade receivables ÷ revenue × 365 |
| Days to pay | trade payables ÷ (cost of goods sold, or revenue when it is not given) × 365 |
| Cash conversion cycle | days of stock + days to collect − days to pay |
| One day | (cost of goods sold, or revenue) ÷ 365 |

Missing inputs show as "—", never zero. A negative or absurdly large figure is rejected with a plain message and is not used. Receivable days are always computed on revenue, whether or not cost of goods sold is known.

## Build and test

```bash
node test/wc.test.mjs
node tools/build-pages.mjs
```

```bash
bash tools/publish-to-site.sh
```

The first runs the arithmetic tests. The second builds both language pages into `pages/`. The third copies the built pages and the app files into the Groma site working tree; committing and pushing there deploys it.

Public URLs: https://groma.ro/simon-g/capital-de-lucru and https://groma.ro/en/simon-g/working-capital

## Files

| File | Role |
|---|---|
| `app/wc-calc.js` | Pure arithmetic: parsing, ratios, changes, sentence facts, the what-if control. No DOM. |
| `app/wc-i18n.js` | English and Romanian texts the page builds while it runs |
| `app/wc.js` | Page logic: reads the inputs, renders the tiles, the SVG chart and the sentences |
| `app/wc.css` | Styles specific to this tool, on top of `stock-check.css`'s generic `sg-` components |
| `tools/build-pages.mjs` | Both language pages, from one template, so they cannot drift apart |
| `tools/publish-to-site.sh` | Copies the built pages and app files into the Groma site working tree |
| `test/wc.test.mjs` | Node tests for `wc-calc.js`, including one case taken from published annual accounts |
