# Success Academy Commutes

Interactive map and table of all 59 Success Academy charter school locations in NYC, ranked by estimated door-to-door subway commute from E 87th St & Madison Ave (weekday AM rush).

**Live:** https://adambraff.github.io/tools/success-academy-commutes/

## Features

- Leaflet map (CARTO Voyager tiles) with all schools color-coded by level: elementary, middle, high, K-12. Offline fallback renders borough outlines when tiles are unreachable.
- Filter chips by school level; filters both the map dots and the table.
- Sortable table (default: commute minutes ascending) with trains, route description, estimated minutes, and straight-line miles.
- Every row and map popup links to Google Maps directions in transit mode for that journey.
- Responsive: table view on desktop, card view on phones.

## Data & method

School names, levels, grades, and addresses scraped from successacademies.org individual school pages, July 2026. Commute minutes are manual estimates (walk + wait + ride + transfer), roughly +/-10 minutes; verify finalists in a live trip planner. Distances are straight-line (haversine) from approximate geocodes. Single self-contained HTML file; no build step, no backend.
