# Groma web and product standard

Version 1, 28 September 2026. Applies to groma.ro and to every Simon G. page, tool and download on it.

It combines two sources: the Groma brand (`Desktop\Groma\Brand`) for how things look, and the Simon usability rules (decision D121 and `docs/ui-pro-s4-contract.md` in the Simon repository) for how things behave.

## 1. Principles

1. **One thing per screen.** Each page or step has one purpose and one main action.
2. **Say it in words.** Every figure sits beside a sentence that says what it means.
3. **Nothing hidden, nothing invented.** Missing data is shown as missing. Assumptions are on screen.
4. **Remove before adding.** If a page works without an element, the element goes.
5. **The visitor's data stays with the visitor.** Tools run in the browser and say so.

## 2. Brand

| Token | Value | Use |
|---|---|---|
| Obsidian | `#131A27` | Text, structure, primary buttons |
| Cobalt | `#1A4FC8` | Accent only: the top rail, one highlight per chart, links, focus |
| Cobalt light | `#4A8FD4` | Hover on dark backgrounds |
| Ivory | `#F7F5F0` | Page background |
| Ivory deep | `#EFECE4` | Table headers, quiet panels |
| White | `#FFFFFF` | Cards and tables that hold data |

- Rectangles only. No rounded corners, no shadows, no gradients.
- Hairlines separate; colour does not.
- Cobalt appears on a page a handful of times, never as a fill for large areas.

## 3. Type

| Role | Family | Size | Weight |
|---|---|---|---|
| Display | Inter Tight | 28 to 68 px | 600 |
| Section heading | Inter Tight | 20 to 28 px | 600 |
| Card heading | Inter Tight | 17 px | 600 |
| Article body | Inter | 17.5 px | 400 |
| Interface body | Inter | 16 px | 400 |
| Tables, notes, hints | Inter | 14 px | 400 |
| Labels, table headers, codes | IBM Plex Mono | 12 px, upper case, spaced | 500 |

- Nothing smaller than 12 px.
- Product pages use three text sizes: 12, 14 and 16.
- Fonts are served from groma.ro. No font is loaded from another domain.
- Figures in tables use tabular numerals.
- Romanian uses ș and ț with the comma below.

## 4. Colour for meaning

| Meaning | Text | Background | Word (EN / RO) |
|---|---|---|---|
| Act now | `#8F2A1F` | `#F6E4E0` | Order now / De comandat |
| Look at it | `#7A5600` | `#F5ECD3` | Excess stock / Surplus |
| Fine | `#1F5E3A` | `#E1EFE5` | Covered / Acoperit |
| Neutral | Obsidian | Ivory deep | Parameters ready / Parametri calculați |
| No data | 66% obsidian | none, hairline border | Not computable / Nu se poate calcula |

- Colour never stands alone. The word is always beside it.
- No more than these five states on one page.

## 5. Layout

- Content width 1160 px at most. Side gutter from 20 to 48 px.
- A tool page runs top to bottom in numbered steps. The result appears below the steps.
- Each step is a white card with a number, a title, one sentence of help and one main action.
- Optional inputs are closed by default and marked "optional".
- Key figures come first, as tiles: a label, the figure, one line of explanation.
- Detail opens in a side panel and closes with Escape.

## 6. Tables

- Header: 12 px mono, upper case, on ivory deep.
- First column left-aligned. Numbers right-aligned.
- A wide table scrolls inside its own frame. The page never scrolls sideways.
- A sortable column shows its direction. A clickable row shows a hover tint.
- More than 500 rows: show the first 500, say so, and put all rows in the export.

## 7. Charts

- Drawn as plain SVG. No chart library.
- History in grey, the one thing that matters in cobalt. One highlight per chart.
- Three axis labels at most on the value axis. Dates at the start and end.
- A legend when there are two series. A title in words above the chart.
- A gap is drawn as a gap. It is never drawn as zero.

## 8. Numbers, dates and units

| Item | English | Romanian |
|---|---|---|
| Thousands and decimals | 1,234.5 | 1.234,5 |
| Percent | 27% | 27% |
| Date | 2026-09-28 | 2026-09-28 |
| Missing value | — | — |
| Negative | −1.9 | −1,9 |

- Figures are not shortened to fit. A column is widened or scrolled.
- Money is shown in the visitor's own currency, without a symbol, when the currency is not known.
- An exported CSV uses a semicolon, the language's decimal mark, and a byte order mark, and guards against spreadsheet formulas.

## 9. Forms

- Every control has a visible label above it.
- Controls are at least 40 px high. Pointer targets are at least 24 by 24 px.
- One solid button per step. Other actions are outlined.
- A file the page has read shows its name and its number of rows.
- What the page guessed is shown and can be changed: columns, date format, decimal mark.
- A guess that could be wrong carries a plain warning beside it.

## 10. Feedback

- Progress is reported in words: "Computed 120 of 505 products".
- A result states how long it took and where it ran.
- An error says what happened and what to do next. It never shows a code alone.
- An empty state says why it is empty and how to fill it.

## 11. Wording

- Sentences of 25 words at most. One idea each.
- The visitor's words, not ours: "stock", "order", "supplier".
- No claim about a competitor. No superlative.
- Each product page states what the product does not do.
- Romanian is written in Romanian, not translated.

## 12. Accessibility

- Text contrast at least 4.5 to 1. Large text and graphics at least 3 to 1.
- A visible focus ring: 2 px cobalt, 2 px offset.
- Everything works from the keyboard. A panel opened by a key closes with Escape.
- Headings descend in order. One `h1` per page.
- Motion is reduced when the visitor asks for it.
- The page language is declared.

## 13. Screen sizes

Checked at 375, 768, 1024 and 1280 px. Card grids go from three columns to two to one. No horizontal page scroll at any width.

## 14. Privacy and trust

- A tool page loads nothing from another domain.
- A tool page forbids outgoing connections in its security policy, and carries no analytics.
- Content pages may carry analytics only after consent.
- Downloads are named `simon-g-<what>-<layout>.<type>`.

## 15. Print

A4 portrait. Site header, footer and controls are hidden. Tables keep their headers.

## 16. Checks before publishing

| Check | How |
|---|---|
| Contrast, minimum size, pointer targets | The audit script, on every new page |
| No console errors | Browser console |
| No request to another domain | Network list |
| 375 px width | Emulated phone |
| Both languages | Read by a person |
| Every figure in the copy | Traced to the code or the data |

---

# Audit of 28 September 2026

Pages checked: home, one article, the method, the Stock Check. English and Romanian. Measured in the browser with a script that reads computed styles.

## Findings and what was done

| # | Finding | Where | Severity | Status |
|---|---|---|---|---|
| 1 | Secondary text had a contrast of 3.4 to 3.6 to 1 | Whole site: labels, dates, table headers, notes | High | Fixed. The faint ink went from 52% to 66% opacity; contrast is now above 4.5 |
| 2 | Text at 11 and 11.5 px | Status labels, table headers, tile labels | Medium | Fixed. Minimum is 12 px |
| 3 | Navigation links were 22 px high | Header and footer, whole site | Medium | Fixed. Now above 24 px |
| 4 | No visible focus ring outside the tool | Whole site | Medium | Fixed |
| 5 | Smooth scrolling ignored the reduced-motion setting | Whole site | Low | Fixed |
| 6 | Twelve different text sizes on one page | Stock Check | Medium | Fixed. Three sizes plus headings |
| 7 | Only CSV accepted | Stock Check | High | Fixed. Excel is read in the browser |
| 8 | A raw SAP quantity such as `35,000-` was unreadable | Stock Check | High | Fixed |
| 9 | One transaction type could be chosen | Stock Check | Medium | Fixed. Several can be ticked |
| 10 | The decimal mark was guessed without saying so | Stock Check | Medium | Fixed. It is shown, can be changed, and warns when unsure |
| 11 | No explanation of what the calculation does | Stock Check | Medium | Fixed. Nine points and a list of limits |
| 12 | Many text sizes in the site stylesheet (13.5, 14.5, 15.5, 18.5 and others) | Home, articles | Low | Open. Needs a careful pass over the older pages |
| 13 | The daily error figure reads as poor to a non-specialist | Stock Check | Medium | Open. A weekly figure needs a change in the engine |
| 14 | No step-by-step guide for a first visit | Stock Check | Medium | Open. Proposed as the walkthrough |
| 15 | The detail panel has no "previous" and "next" | Stock Check | Low | Open |

## Passed without change

- No rounded corners, shadows or gradients on any page.
- Three font families only, all served from groma.ro.
- One `h1` per page. Every image has alternative text. Every input has a label.
- No console errors. No request to another domain on tool pages.

## Not measured

- Real visitors. No person outside the team has used the pages while being observed.
- Screen readers. Structure was checked; reading with one was not.
- The Simon application. It follows its own standard, with a teal accent, serif headings and rounded corners, and differs from this one.
