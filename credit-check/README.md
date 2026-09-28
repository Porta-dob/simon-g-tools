# Simon G. Credit Check

A free credit check by Groma. Load a list of customer invoices and get, for every business customer, a transparent scorecard, a class (A–D), a trend and the yearly cost of late payment, each with its reasoning.

The file never leaves the computer. The calculation runs in the browser tab, and the page's content security policy forbids every network connection (`connect-src 'none'`).

## Use

1. Open the page.
2. Choose an invoice file: Excel (.xlsx) or CSV, one row per invoice — customer, invoice date, due date, payment date (empty if still unpaid), amount, and the amount paid if less than the full amount.
3. Optional columns, if you track them: `incident_months_ago` (months since a payment incident) and `insolvency` (yes/no). Left out, the calculation assumes neither, and says so on the page.
4. Check the assumptions (as-of date, gross margin rate, cost of capital) and run.

Accepted date formats: `2025-12-31`, `31.12.2025`, `31/12/2025`, `12/31/2025`. Delimiters `,` `;` tab and `|` are detected. Decimal comma and decimal point are both read.

## What the numbers mean

Every figure traces to `packages/engine/src/credit.ts` in the private Simon repository — this page does not re-implement its arithmetic.

| Output | Meaning |
|---|---|
| Class | A (score ≥ 86), B (≥ 78), C (≥ 66), D (below); capped at C on a payment incident in the last 12 months, forced to D on an active insolvency flag |
| Score | Weighted sum of seven components: punctuality, completeness, longevity, consistency, trend, clean record, financing |
| Mean days beyond terms | Average of (payment date − due date) over the customer's settled (paid) invoices |
| Trend | Compares the last six months of settled invoices against the six-to-eighteen-months-ago window |
| Overdue amount | Unpaid invoices whose due date has already passed, as of the as-of date |
| Yearly financing cost | Yearly purchases × mean days beyond terms ÷ 365 × cost of capital |
| Share of margin eaten | The financing cost as a percentage of the gross margin the customer generates |

A customer needs at least three settled invoices before a score is shown; below that the page says so instead of guessing.

Nothing is filled in silently. Relationship length is measured from the first invoice on file; incidents and insolvency are assumed absent unless the optional columns say otherwise; both are stated on the page.

## Build and publish

```bash
bash tools/build-engine.sh
```

```bash
python tools/build-templates.py
```

```bash
bash tools/publish-to-site.sh
```

The first rebuilds `app/credit-engine.js` from the private Simon repository. The second regenerates the downloadable invoice template. The third builds both language pages and copies everything into the Groma site working tree; committing and pushing there deploys it.

Live: https://groma.ro/en/simon-g/credit-check and https://groma.ro/simon-g/verificare-credit

## Files

| File | Role |
|---|---|
| `tools/build-pages.mjs` | Both language pages, from one template |
| `tools/build-templates.py` | The downloadable invoice template (invented data) |
| `app/credit-app.js`, `app/credit.css` | Page logic and styles, on top of the Groma site stylesheet and the shared `sg-` components |
| `app/credit-i18n.js` | English and Romanian texts |
| `app/credit-calc.js` | Grouping invoices by customer and building each scorecard input — shared by the worker and the test |
| `app/credit-worker.js` | Wires `credit-calc.js` to the worker's `onmessage`/`postMessage`, off the page's thread |
| `app/credit-engine.js` | The Simon G. credit engine (`credit.ts`), bundled |
| `/simon-g/app/parse.js`, `/simon-g/app/xlsx.js` | Shared file readers, loaded from the Stock Check's published location — not duplicated here |

## Limits of this version

- Business customers only; not a statutory credit rating; no external credit registers.
- Incidents and insolvency are read only from the optional columns you add — nothing is checked against a registry.
- One invoice file; margin rate and cost of capital are set once for the whole book, not per customer.
- It proposes nothing to execute. A limit change is a person's decision.

## Licence

The page code is open. The credit engine is published as a bundle under a delayed-open licence. Licence texts are added before the first public release.
