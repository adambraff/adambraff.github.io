# Norway, by the numbers

A data-forward field guide to Norway, built as pre-trip reading for a visit to Oslo, Bergen and the fjords.

**Live:** https://adambraff.github.io/tools/norway/

## What it covers

| Section | Contents |
|---|---|
| History | 22-event timeline, from post-glacial settlement through the 2022 gas windfall |
| Peoples | Sámi, Kven, Romani, and the immigration numbers |
| Economy | The oil fund, exports and imports, power mix, seafood, tax, prices |
| Culture | Four literature Nobels, Munch, Vigeland, Grieg, and the black metal decade |
| Sport | Winter Olympic dominance, per-capita medals, the asthma controversy |
| Oslo | Neighbourhoods, the east–west divide, what to see |
| Bergen | The Hanseatic stockfish trade, rainfall data, what to do |
| Fjords | Bergensbanen, Flåmsbana, fjord geology, Trolltunga, daylight by month |
| Language | Bokmål vs Nynorsk, pronunciation, useful phrases, untranslatables |
| Differences | Trust, cashlessness, guns vs homicide, allemannsretten, social norms |

## Technical

Single self-contained `index.html`. No build step, no dependencies, no analytics.

- **22 charts**, all hand-rolled SVG via a ~260-line kit in the page (`hbar`, `vbar`, `line`, `mline`, `share`, `stackbar`, `scatter`, `scatter2`) plus one bespoke cross-section diagram. Six-colour categorical palette, tabular-numeral value labels, no chart library. Truncated bar baselines are declared in the chart subtitle.
- **26 photographs**, fetched at runtime from the Wikipedia REST API (`/page/summary/`), which is CORS-enabled and returns Commons-licensed images plus attribution. Loading is lazy (IntersectionObserver, 700px rootMargin), capped at two concurrent requests, and retries on HTTP 429 — firing all 26 at once reliably gets you rate-limited. Figures hide themselves if the fetch fails, so the page degrades cleanly offline. Nothing is hotlinked from `upload.wikimedia.org` directly and no images are vendored into the repo.
- **Nav** uses an IntersectionObserver scroll-spy that scrolls only the nav strip, never the page.
- Responsive from 390px up. Dark theme only.

## Sourcing and confidence

Everything was fact-checked against current sources in July 2026. Economic figures come from Statistics Norway, Norges Bank Investment Management, the Norwegian Seafood Council, the Norwegian Tax Administration and Energifakta Norge. Climate normals are 1991–2020 from the Norwegian Meteorological Institute. Comparative social data is from the World Values Survey, the Small Arms Survey (2017, still the most recent global firearms count), UNODC and the World Happiness Report 2026. Every figure carries its year inline.

Corrections the fact-check produced, against the first draft:

| Claim | Was | Is |
|---|---|---|
| Black Death mortality | 50–60% | 60–65% |
| Americans of Norwegian descent | 4.5M | ~3.9M (2021 ACS; 4.5M was the 2000 Census) |
| Harald V and Haakon VII | great-grandson | grandson |
| Bergen annual rainfall | 2,250 mm | 2,496 mm |
| Bergen rain days | ~230 | ~201 (≥1 mm threshold) |
| Oslo annual rainfall | 763 mm | 834 mm |
| Hardangerfjord depth | 800 m | 855 m |
| Nærøyfjord length | 17 km | 18 km |
| Bokmål school share | 85–87% | 88.9% |
| Hanseatic Kontor founded | c.1360 | c.1350 |
| Norway–Russia border | 198 km | 196 km |
| Flåmsbana gradient | 5.5% throughout | 5.5% maximum, 1:24 average |
| Church of Norway membership | 62% | ~61% |
| Cabins | ~440,000 | 452,150 (2026) |
| Norway homicide rate | ~0.5 | 0.73 per 100,000 |
| Winter Olympic medals, all-time | 405 | 447 (incl. Milan-Cortina 2026) |

Added after the fact-check: the Milan-Cortina 2026 medal table (Norway 18-12-11, first on both golds and total), Norway's run to its first men's World Cup quarter-final in July 2026, the Museum of the Viking Age reopening date (November 2027, so closed for this trip), and the current zero-emission rule for the World Heritage fjords (under 10,000 GT from 1 January 2026, large cruise ships deferred to 2032).

Still uncertain, and flagged in the page:

- Oslo district-level life expectancy has not been republished since about 2015
- The Museum of the Viking Age date has slipped before and there is a reported funding shortfall
- Career goal totals for active footballers move weekly and are omitted

## Licence

Text is mine. Photographs remain under their respective Creative Commons or public-domain terms, credited in each caption with a link back to the source article.
