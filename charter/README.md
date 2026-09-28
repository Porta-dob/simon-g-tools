# Simon G. Decision Charter

A free tool by Groma. An executive builds the company's one-page decision charter and
perimeter statement, following the [Simon G. Method](../method/SIMON-G-METHOD.md), then
prints it or downloads it. Everything runs in the browser; nothing is sent anywhere.

## Use

1. Open the page.
2. Step 1: name the company (optional), the date, and who signs the charter.
3. Step 2: tick which of the fifteen starter decision classes apply, edit any cell,
   fill in the blanks a limit carries (`____`), or add and remove a class.
4. Step 3: write the perimeter statement — where data is processed, which AI tools are
   approved, what may never leave, and who approves an exception.
5. The result below updates as you type: the one-page charter, the perimeter statement,
   and a completeness check against three of the method's rules (nothing unowned,
   nothing unsigned, nothing static). Print, or download CSV or JSON.

The draft is kept in this browser's local storage only, so it survives a reload. The
Clear button removes it.

## Build and publish

```bash
node tools/build-pages.mjs
```

```bash
bash tools/publish-to-site.sh
```

The first builds both language pages from `tools/build-pages.mjs` into `pages/`. The
second copies the built pages and the app files into the Groma site working tree;
committing and pushing there deploys it.

Live: https://groma.ro/en/simon-g/decision-charter and https://groma.ro/simon-g/carta-deciziilor

## Files

| File | Role |
|---|---|
| `tools/build-pages.mjs` | Both language pages, from one template |
| `app/charter-core.js` | The pure logic: blanks, the completeness count, CSV and JSON export, the localStorage round trip. No DOM; this is what `test/charter.test.mjs` exercises directly |
| `app/charter.js` | Page wiring: renders the table, the live preview, and reads and writes localStorage |
| `app/charter-i18n.js` | The starter decision classes and the texts the script composes at run time. Static texts (the hero, the steps, the FAQ) live in the two built HTML pages |
| `app/charter.css` | Page-specific styles, on top of the shared `/simon-g/app/stock-check.css` |

## Test

```bash
node --test test/charter.test.mjs
```

Covers: the blank-filling in a limit's sentence, the completeness count (no owner, no
signed limit, no review date), the CSV formula guard and quoting, the CSV and JSON
export shape, and the localStorage serialize/deserialize round trip — all without a DOM.

## Limits of this version

- The perimeter statement is free text plus one choice of where data is processed; it
  does not check that choice against anything.
- The completeness check only counts a ticked class; an unticked one is not part of the
  charter.
- This page does not keep a decision record and does not enforce the limits it states.
  That is Simon G., the platform.

## Licence

The page code is open, matching the rest of the Simon G. Method material (CC BY 4.0 for
the method text and templates it is built on).
