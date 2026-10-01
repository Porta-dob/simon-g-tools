# Simon G. free tools

Four free tools by [Groma](https://groma.ro). Each runs in the browser. Nothing is uploaded, and the pages forbid every outgoing connection in their security policy.

| Tool | What goes in | What comes out | Live |
|---|---|---|---|
| Stock Check | Opening stock and transactions | Forecast, reorder point, order proposal, excess stock, approval marking, decision records | [English](https://groma.ro/en/simon-g/stock-check) · [Romanian](https://groma.ro/simon-g/verificare-stoc) |
| Working Capital Check | A few balance sheet figures for two years | Stock days, days to collect, cash tied up, the value of one day | [English](https://groma.ro/en/simon-g/working-capital) · [Romanian](https://groma.ro/simon-g/capital-de-lucru) |
| Credit Check | A list of invoices to business customers | A payment score per customer, the trend, the yearly cost of late payment | [English](https://groma.ro/en/simon-g/credit-check) · [Romanian](https://groma.ro/simon-g/verificare-credit) |
| Decision Charter | Owners and limits for your decision classes | A one-page charter and a perimeter statement | [English](https://groma.ro/en/simon-g/decision-charter) · [Romanian](https://groma.ro/simon-g/carta-deciziilor) |

The rules behind them are in [the Simon G. Method](https://github.com/Porta-dob/simon-g-method).

Also here:

| What | Where |
|---|---|
| The four tools as one file, for use without a network (1.6 MB, English and Romanian) | [Download page](https://groma.ro/en/simon-g/offline) · builder in `offline/` |
| Two Excel templates: safety stock and reorder point; cash cycle and working capital days | [Safety stock](https://groma.ro/en/simon-g/safety-stock-excel-template) · [Cash cycle](https://groma.ro/en/simon-g/cash-conversion-cycle-excel-template) · builder in `excel-templates/` |
| A note for IT departments: what the tools do with data and how to check it | [For IT](https://groma.ro/en/simon-g/for-it) |

## How to check that nothing is sent

- Each tool page carries a content security policy with `connect-src 'none'` and `default-src 'none'`. It is in the first lines of the page source.
- The offline file lists the SHA-256 of every script and style block inside it in its policy, so nothing else can run. Workers are started from text held in the file.
- `offline/tools/selftest.mjs` opens the offline file from disk in a headless browser over the DevTools protocol, runs the tools on invented data and fails if the browser logs anything or requests any network address.
- The fingerprint of each published offline file is on the download page and in `offline/release.json`.

## How they are built

- Plain HTML, CSS and JavaScript. No framework, no library, no build step at run time.
- Each tool has one template that builds the English and the Romanian page.
- The arithmetic is kept apart from the page, so it can be tested without a browser.
- Excel files are read in the browser by a small reader written for this purpose.
- Pages follow [DESIGN-STANDARD.md](DESIGN-STANDARD.md).

## Build the offline file

```bash
SITE_DIR=<a checkout of the published site> node offline/tools/build.mjs
```

```bash
node offline/tools/selftest.mjs offline/out/simon-g-tools.html
```

The builder reads the published pages and their assets, so it needs the site's files; they are not in this repository.

## Run the tests

```bash
node stock-check/test/core.test.mjs
```

```bash
node working-capital/test/wc.test.mjs
```

```bash
node --test credit-check/test/credit.test.mjs
```

```bash
node --test charter/test/charter.test.mjs
```

## What is not here

The pages use the header, footer, fonts and base stylesheet of groma.ro, which are not part of this repository. To run a page on its own, serve it next to your own `/assets/styles.css` and `/assets/fonts/fonts.css`.

The two engines are included as built, minified files only. Their source is not published:

| File | What it is |
|---|---|
| `stock-check/app/engine.js` | The Simon G. planning engine |
| `credit-check/app/credit-engine.js` | The Simon G. credit engine |

## Licence

| Part | Licence |
|---|---|
| Page code, tests, templates and documents | [Apache License 2.0](LICENSE) |
| The two engine files named above | [Functional Source License 1.1, Apache 2.0 future licence](LICENSE-ENGINE.md) |

The Functional Source License allows any use except offering a competing product or service. Each version becomes Apache 2.0 two years after it is published.

All example data is invented.

## Feedback

Open an issue, or write to contact@groma.ro. Please describe the problem in words and do not attach your data.
