# Trump Manifold Recommender

Pulls Trump-related prediction markets from Manifold and lets you classify them along four behavioral dimensions (Self-Interested, Loyalty Demand, Executive Power, Deal Making). Adjusting the sliders generates edge-based recommendations on which markets to bet.

## How it works
1. **Sync** fetches all open Trump markets from the Manifold API directly in your browser
2. Each market option gets a rule-based trait score (keyword matching against the four dimensions)
3. Set your sliders to express your model of Trump's behavior
4. **Run Recommendations** finds markets where your model disagrees with market prices (the "edge")

## Architecture
- Single self-contained HTML file, no backend
- Manifold API called directly from the browser (CORS-enabled)
- Market data cached in localStorage between sessions
- Rule-based classification (keyword scoring per trait dimension)

## Live
https://adambraff.github.io/tools/trump-manifold-recommender/
