# Chinese models on the Arena text leaderboard

Daily time series of the **highest-rated Chinese model** on the
[Arena](https://arena.ai/leaderboard/text) text leaderboard (overall category,
style control on), Jan 1 – Jul 15, 2026.

Live: https://adambraff.github.io/tools/arena-cn-rank/

## What it shows

- **Rank over time** — where the top Chinese model sat on the board each day.
- **Rating over time** — its Elo, plotted against the day's frontier model.
- **Lead changes** — which model held the top Chinese slot, for how long, and
  whether it did so on a thin vote sample.

## The finding

Rank went **#12 → #16** while rating went **1447.5 → 1475.0**. Chinese models got
~27 Elo points better over six months and finished ranked *lower*, because the
field grew 293 → 374 and most new arrivals above them were US variants
(thinking modes, sizes, checkpoints). Rank is partly a measure of US release cadence.

Frontier gap closed ~43 → ~33 points, most of it before April. Later movement sits
inside overlapping confidence intervals.

## Caveats

- **Preview models distort the top.** Several leaders took the Chinese #1 slot on
  <5,000 votes with ±10 CIs, then decayed as samples grew. `qwen3.7-max-preview`
  has held ~3,700 votes since May 19 — its count is *falling*, so the estimate
  will not sharpen.
- **No rebaseline artifact.** The lmarena.ai → arena.ai transition (Jan 22–31)
  shifted 298 common models by a median of +0.01 points.
- **Gaps:** Jan 22–31 (rebrand), May 4 (snapshot unavailable).

## Data

Reconstructed from 144 Wayback Machine snapshots. The leaderboard is a Next.js
app; the data lives in the RSC flight payload (`self.__next_f.push`), not a public
API — the `/api/` endpoints return 403. Parser extracts the `entries` array from
the `text-overall-style_control` leaderboard.

Build scripts live outside this folder (`fetch_arena_history.py`, `reclassify.py`).
`index.html` is self-contained with the series inlined — no deps, no fetch.
