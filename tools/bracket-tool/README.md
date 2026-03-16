# March Madness 2026 Bracket Builder

Interactive bracket builder for the 2026 NCAA Tournament. Adjust weighted metrics to generate a custom bracket with predicted scores.

## Features

- **Composite scoring** from COOPER Elo ratings (Nate Silver), SRS, Net Rating, Momentum, and Peak Proximity
- **Adjustable weights** — sliders let you emphasize different metrics in real time
- **Offense vs Defense bias** — tilt the model toward high-scoring or lockdown-defense teams
- **Chaos / Upset factor** — inject randomness to simulate bracket busting (button-triggered, not live)
- **Favorite team bonus** — because the heart wants what it wants
- **Hover tooltips** on every team showing full stat lines and composite score
- **Predicted final scores** using PPG, opponent PPG, and composite advantage

## Data Sources

- **Elo ratings**: Nate Silver's COOPER model (Silver Bulletin)
- **SRS, SOS, ORtg, DRtg, NRtg**: Sports Reference
- **PPG, Record, MOV**: Sports Reference

## Usage

Open `index.html` in any modern browser. No dependencies, no build step, no backend.

Live at: [adambraff.github.io/tools/bracket-tool/](https://adambraff.github.io/tools/bracket-tool/)
