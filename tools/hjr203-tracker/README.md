# HJR 203 Tracker

Probability and signal dashboard for Florida's HJR 203 (Elimination of Non-school Property Tax for Homesteads).

Tracks whether HJR 203 (or a substantively similar joint resolution) will both pass the Florida Legislature and be approved by 60%+ of voters in November 2026.

## What it tracks

- **Probability decomposition**: P(Senate passes) × P(on ballot) × P(voter approval at 60%)
- **Legislative timeline**: Key milestones with directional probability signals
- **Financial indicators**: JOE vs XHB spread, FL muni bond spreads, FL REIT performance
- **Polling data**: JMI, UNF PORL, WUSF surveys with 60% threshold context
- **Google Trends**: Search interest in "Florida property tax" as awareness proxy
- **Politician statements**: Directional signals from DeSantis, Perez, Albritton, Hooper
- **Forecast log**: Running Bayesian updates as new information arrives

## How to update

All data lives in plain JavaScript arrays at the top of `index.html`. To update:

1. Add new entries to `forecastLog` with updated probabilities
2. Add new events to `timelineEvents`
3. Update chart data arrays with new monthly data points
4. Push to GitHub Pages

## Methodology

Tetlockian superforecasting: base rates, decomposition into conditionally independent components, Bayesian updating from evidence, calibrated confidence intervals.

## Live

https://adambraff.github.io/tools/hjr203-tracker/
