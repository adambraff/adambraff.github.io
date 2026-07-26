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

- **Charts** are hand-rolled SVG via a ~120-line kit in the page (`hbar`, `vbar`, `line`, `share`, `scatter`). Six-colour categorical palette, tabular-numeral value labels, no chart library.
- **Photographs** are fetched at runtime from the Wikipedia REST API (`/page/summary/`), which is CORS-enabled and returns Commons-licensed images plus attribution. Figures hide themselves silently if the fetch fails, so the page degrades cleanly offline. Nothing is hotlinked from `upload.wikimedia.org` directly and no images are vendored into the repo.
- **Nav** uses an IntersectionObserver scroll-spy that scrolls only the nav strip, never the page.
- Responsive from 390px up. Dark theme only.

## Sourcing and confidence

Economic figures come from Statistics Norway, Norges Bank Investment Management, the Norwegian Seafood Council, the Norwegian Tax Administration and Energifakta Norge, and carry their year inline. Historical, cultural and sporting material is written from general knowledge — roughly 90% reliable on dates, 80% on specific counts.

Figures with a dotted underline in the page are ones worth re-verifying before quoting.

Deliberately omitted rather than guessed:

- The Milan-Cortina 2026 Winter Olympic medal table (the all-time chart runs through Beijing 2022)
- Current-season football statistics
- 2026 World Cup qualification status
- The Museum of the Viking Age reopening date, which has slipped repeatedly

## Licence

Text is mine. Photographs remain under their respective Creative Commons or public-domain terms, credited in each caption with a link back to the source article.
