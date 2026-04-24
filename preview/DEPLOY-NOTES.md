# Landing page redesign — deploy notes

## Live preview
https://adambraff.github.io/preview/ (images will appear as blank tiles until you add them)

## What's done
- 8 watercolor tile images generated via ChatGPT, saved to `~/Downloads/`:
  - `braff-01-forecasting-contest.png` (marathon runners)
  - `braff-02-calibration.png` (target with arrows)
  - `braff-03-fertility.png` (bare tree)
  - `braff-04-ai-employment.png` (human vs robot arm-wrestle)
  - `braff-05-nfl-valuations.png` (football on coins)
  - `braff-06-birds-of-ai.png` (cardinal/goldfinch/bluejay fighting)
  - `braff-07-hjr203.png` (Florida bungalow)
  - `braff-08-mabel-adventure.png` (mostly black Bernedoodle)
- New `preview/index.html` pushed to main (this file + the page itself).
- Current live landing at `/` is untouched.

## To finish the redesign (5 minutes)

1. Review the 8 PNGs in `~/Downloads/`. Any rejects, tell me to regenerate.
2. Create `/assets/tiles/` at the repo root and put the 8 PNGs there with these filenames (strip the `braff-` prefix):
   - `01-forecasting-contest.png`
   - `02-calibration.png`
   - `03-fertility.png`
   - `04-ai-employment.png`
   - `05-nfl-valuations.png`
   - `06-birds-of-ai.png`
   - `07-hjr203.png`
   - `08-mabel-adventure.png`
3. Reload https://adambraff.github.io/preview/ — images should load.
4. If you're happy, move `preview/index.html` to the root (replacing the current `index.html`), keep the images in `/assets/tiles/`, and delete `preview/`.

## Design choices (flag anything to change)
- Warm off-white paper aesthetic (instead of current dark gradient) to match watercolor illustrations.
- Serif headings, sans-serif tile descriptions.
- 3-column responsive grid on desktop, single column on mobile.
- Subtle hover lift on tiles.
- Added Mabel's Providence Adventure as the 8th tile.
- Descriptions trimmed slightly for the tile format — still accurate to original.

## If you want regenerations
Tell me which subject and what to change. The style prompt is still in our chat so I can run another pass and drop the replacement in Downloads.
