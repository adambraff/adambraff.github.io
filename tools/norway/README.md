# Norway, by the numbers

A data-forward field guide to Norway. Single self-contained `index.html` plus `sw.js` for offline reading.

**Live:** https://adambraff.github.io/tools/norway/

## Design

Dark ground, persistent left rail, and white numbered chart plates. The plates are the
structural device: charts break out of the dark reading column onto a light ground, which
gives the page its rhythm and makes the data the loudest thing on the screen.

- **Rail (212px).** Braff mark, numbered section index with scroll-spy, read progress,
  offline save, back-link. Collapses to a horizontal sticky bar under 1000px.
- **Section openers.** Full-bleed Wikipedia photograph, section number at 96px, headline
  and lede over a left-to-right scrim. Photo credit sits bottom-right.
- **Plates.** `figure.ch` on `#f4f7fa` with a 3px `#c8392f` top rule, auto-numbered
  PLATE 01–25 in DOM order, source line under a hairline.
- **Type.** Archivo 600–800 for display, system sans for body. No tracked-uppercase
  eyebrows: headers are run-in, and uppercase survives only on plate numbers, stat
  micro-labels and axis labels.

## Interaction

- **Chart readouts.** Hovering any bar or point dims the rest of the series and shows a
  readout. Marks are paired with their own labels geometrically after render, so the SVG
  chart kit is untouched.
- **Inline explainers.** A dictionary in the page script marks the first prose mention of
  each key term. Solid blue underline fetches a Wikipedia preview on 250ms hover intent
  and caches it; dotted blue is a local definition that needs no network. Tap opens the
  card and never navigates; the link out is a separate target. Enter, Space, focus and
  Escape all work. **To add a term, add one line to `WIKI` or `GLOSS`.**
- **Offline.** "Save for offline" registers `sw.js` (scoped to this directory) and warms
  the cache with every loaded photograph. The page then reads with no signal.

## Technical

- **25 charts** from a ~260-line hand-rolled SVG kit in the page. Palette darkened for the
  light plates. No chart library.
- **26 photographs** from the Wikipedia REST API, lazy, two concurrent, retry on 429,
  full-resolution with a thumbnail fallback and a graceful failure.
- No build step, no dependencies, no analytics. Archivo is the one external font.
