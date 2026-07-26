# Editorial handoff — tools/norway/index.html

Read `tools/norway/index.html` directly from this folder. It is a single self-contained
HTML file: markup, CSS and JS all in one. Everything below lives in that one file.

## Do this first
Read the whole file before editing. Do not work from any earlier copy of it — a design
pass landed after the last editorial pass, and stale markup will undo it.

## What NOT to change (design decisions, just settled)
- Micro-labels on hero metrics and stat cards are sentence case now. Do not restore caps.
- Chart figures have no plate numbers.
- Chart value labels are generated in JS from the data arrays near the bottom of the file.
  Several carry a `scale` option so the drawn numbers stay under four digits (thousands of
  emigrants and immigrants, NOK trillion for the fund, cm for Bergen rainfall). If you change
  a figure in prose, check the matching data array and the `.chsub` unit line agree.
- Table header rows are bold with a periwinkle rule. Not uppercase.
- The footer is a collapsed `<details class="srcs">` Sources accordion. There is no
  corrections paragraph any more, by request. Do not reintroduce one.

## Two things that will bite you
1. **Source names auto-link.** A script at the bottom of the file (`Inline source references`)
   scans figcaptions, `p.small`, `.stat em`, `.card p` and `.flag p` for a fixed list of
   institution names — Statistics Norway, SSB, Norges Bank Investment Management, Norges Bank,
   Energifakta Norge, UN Comtrade, IOC, Norwegian Meteorological Institute, MET Norway,
   Norwegian Seafood Council, World Happiness Report, World Values Survey, Small Arms Survey,
   UNODC, IMDi, OECD, Vinmonopolet, Norwegian Tax Administration, Skatteetaten, Kartverket,
   Language Council of Norway, Church of Norway — and wraps each in a link.
   Rename one in prose and its link silently disappears. Add a new source name to the `SRC`
   map in that script if you want it to link.
2. **New sources belong in the accordion**, in the matching group inside `.srcbody`,
   not in a prose paragraph.

## Also present, don't break
- Inline term explainers: certain words trigger a Wikipedia preview or a local gloss. Both
  lists are near the bottom of the file (entity map, then a glossary of Norwegian terms).
  Renaming a term in prose without updating the list kills its explainer.
- Photographs load live from Wikipedia via `data-wiki` attributes on `figure.ph`; captions
  are generated. Don't hand-write photo captions.
- `tools/norway/sw.js` is the offline service worker. If you rename or add files, its cache
  list needs the same names.

## Voice, for reference
Braff & Co.: short declaratives, numbers inline with the year they come from, caveats short
and inline. No emoji, no exclamation points, no hype adjectives. Title Case for headings,
sentence case for sub-labels.

## When you're done
Hand the folder back. Design edits resume after that — we are deliberately not editing
this file in parallel, because there is no merge.
