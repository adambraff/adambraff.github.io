# RI Labor Reality

Live: https://adambraff.github.io/tools/ri-labor-reality/

Employment-population ratio for Rhode Island, New England, and the US, not the unemployment rate. Decomposes the trend two ways: geographically (US vs. New England vs. Rhode Island) and by cause (participation effect vs. unemployment effect, exact two-factor split). Includes all six New England states and red/green choropleths of all 50 states plus DC, centered on the US rate.

## Data
- BLS Local Area Unemployment Statistics (state unemployment rates) and the CPS state model (participation rates), seasonally adjusted, pulled via FRED.
- Employment-population ratio = participation rate × (1 − unemployment rate ÷ 100), validated against BLS's own published US ratio (EMRATIO): mean difference 0.04 points, max 0.12, across 1976–2026.
- New England = unweighted average of CT, ME, MA, NH, RI, VT. Not a BLS-published series.
- Data through August 2026. October 2025 is missing from every series (the 43-day federal shutdown starting October 1, 2025 stopped that month's household survey; never backfilled).

## Build
Self-contained `index.html` plus a `data.js` (embedded time series, decomposition and choropleth path data), no other dependencies, no build step. Data was pulled once from FRED (`fredgraph.csv`) and the BLS state series. State boundary paths generated from `us-atlas` (Albers USA projection) via `topojson-client` + `d3-geo`, simplified with `topojson-simplify` and rounded to integer coordinates, baked into static SVG `<path>` elements — no client-side mapping library.

To refresh with newer data, re-pull the same FRED series (RIUR, MAUR, CTUR, MEUR, NHUR, VTUR, UNRATE, LBSSA09/23/25/33/44/50, CIVPART, EMRATIO, plus `<postal>UR` and `LBSSA<FIPS>` for all 50 states + DC) and regenerate `data.js`.
