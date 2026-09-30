# East Side Crime Map

Live map of Providence police incidents near 56 Cooke St, ranked by severity and distance.

Live: https://adambraff.github.io/tools/crime-map/

## How it works

- **Data**: the browser pulls the [Providence Police Case Log (past 180 days)](https://data.providenceri.gov/Public-Safety/Providence-Police-Case-Log-Past-180-days/rz3y-pz8v) straight from the city's Socrata API on every load. No backend.
- **Geocoding**: the city publishes block-level locations ("300 Block HOPE ST") and intersections. `streets.json` holds US Census TIGER/Line 2025 address-range street segments for Providence; `core.js` places each block at its midpoint and each intersection at the shared street vertex. Street-only records are placed only if the street is under 0.4 mi long.
- **Ranking**: score = severity (1-10 by offense type) × 1 / (1 + (distance / h)²). The slider sets h (default 0.35 mi). Admin entries (warrants, traffic, lost property) score zero.
- **URL params**: `?days=7&radius=1&top=20&half=0.35&labels=1&others=0`

## Files

- `index.html`: the map (Leaflet, Esri gray canvas tiles)
- `core.js`: parsing, geocoding, severity, scoring (shared by the page and the weekly script)
- `streets.json`: Providence street segments with address ranges
- `weekly.js`: Node script used by the weekly scheduled task to write the notification text from `data.json`
- `build_streets.py`: rebuilds `streets.json` from TIGER ADDRFEAT (Providence County) and the Providence place boundary

## Weekly task

```
curl -sSO https://adambraff.github.io/tools/crime-map/{core.js,weekly.js,streets.json}
curl -sS -o data.json "https://data.providenceri.gov/resource/rz3y-pz8v.json?\$select=casenumber,location,reported_date,offense_desc,statute_desc&\$where=reported_date>='$(date -u -d '7 days ago' +%F)T00:00:00'&\$limit=50000"
node weekly.js 7
```
