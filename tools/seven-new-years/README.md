# Seven New Years

When should the new year begin? Seven calendars (Gregorian, Chinese, Rosh Hashanah, Nowruz, Islamic, Enkutatash, Baisakhi) placed on a circular year against the temperature record of the place each comes from, plus a first-derivative (rate-of-change) view to find each city's fastest-warming and fastest-cooling months, and a 20-year historical drift range for each date.

Live: https://adambraff.github.io/tools/seven-new-years/

## What it shows

- A radial "wheel" chart: day of year as angle, colored by calendar type (solar / lunisolar / lunar), with true-scale 20-year drift arcs where a real range exists (Islamic New Year drifts too much to plot as an arc &mdash; ~229 days since 2006 &mdash; so it's a dot with the number in its caption).
- Seven cards, each with the origin city's monthly temperature band + mean, the month-over-month derivative of that curve, and a short note on the calendar's mechanism and agricultural anchor.
- A comparison table and two collapsible data tables (monthly means, monthly rates of change).

## Stack

Single self-contained `index.html`. Vanilla JS, hand-rolled SVG charts (no chart library), Google Fonts (Fraunces / IBM Plex Sans / IBM Plex Mono). No build step, no backend.

## Sources

Wikipedia (Chinese New Year, Rosh Hashanah, Enkutatash, Mesha Sankranti), the UN (Nowruz), Britannica (Islamic calendar, Baisakhi), and climate normals from climate-data.org and Weather Spark. Climate figures are long-run monthly averages, not 2026 forecasts; see the in-page footer for calendar-specific caveats.
