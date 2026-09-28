# Simon G. Stock Check

A free stock check by Groma. Load a sales history file and get, for every product, a demand forecast, safety stock, reorder point, order proposal and excess stock, each with its reasoning.

The file never leaves the computer. The calculation runs in the browser tab, and the page's content security policy forbids every network connection (`connect-src 'none'`).

## Use

1. Open the page.
2. Choose a sales file: CSV with date, product code and quantity. Optional columns: location, out-of-stock flag.
3. Optionally choose a product file: product code and stock on hand, plus any of lead time, unit cost, pack size, minimum order quantity, quantity on order.
4. Check the assumptions and run.

Accepted date formats: `2025-12-31`, `31.12.2025`, `31/12/2025`, `12/31/2025`. Delimiters `,` `;` tab and `|` are detected. Decimal comma and decimal point are both read.

## What the numbers mean

| Output | Meaning |
|---|---|
| Class | A, B, C by share of volume (80 / 15 / 5); X, Y, Z by how steady demand is |
| Error | Forecast error on past dates the method had not seen |
| Safety stock | Stock held against variation in demand and lead time, at the service level of the class |
| Reorder point | Stock level at which an order is due |
| Proposed order | Quantity to order now, after pack size, minimum quantity and the cover limit |
| Excess | Stock above the chosen number of days of cover |

Nothing is filled in silently. Where a value is missing, the result says so and says what it switched off.

## Build and publish

```bash
bash tools/build-engine.sh
```

```bash
bash tools/publish-to-site.sh
```

The first rebuilds `app/engine.js` from the private Simon repository. The second builds both language pages and copies everything into the Groma site working tree; committing and pushing there deploys it. Preview with the `groma-site` server.

Live: https://groma.ro/en/simon-g/stock-check and https://groma.ro/simon-g/verificare-stoc

## Files

| File | Role |
|---|---|
| `tools/build-pages.mjs` | Both language pages, from one template |
| `app/app.js`, `app/stock-check.css` | Page logic and styles, on top of the Groma site stylesheet |
| `app/i18n.js` | English and Romanian texts |
| `app/parse.js` | Reading CSV, numbers and dates |
| `app/worker.js` | The calculation, off the page's thread |
| `app/engine.js` | The Simon G. planning engine, bundled |

## Limits of this version

- No promotion or holiday calendar.
- One supplier per product, no price breaks.
- No expiry dates, no transfers between locations.
- Tested on invented data only: up to 5,000 products, and a 136,000-row ledger of 505 product-locations.
- The folder `templates` holds superseded files and is not published; `template` holds the current one.

## Tests

```bash
node test/core.test.mjs
```


## Licence

The page code is open. The planning engine is published as a bundle under a delayed-open licence. Licence texts are added before the first public release.
