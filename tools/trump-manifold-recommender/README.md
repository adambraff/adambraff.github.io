# Trump Manifold Recommender

Pulls Trump-related prediction markets from Manifold and lets you classify them along four behavioral dimensions (Self-Interested, Loyalty Demand, Executive Power, Deal Making). Adjusting the sliders generates edge-based recommendations on which markets to bet.

## Architecture
- **Frontend**: Static HTML on GitHub Pages
- **Backend**: Cloudflare Worker with KV storage + Gemini API for classification

## Live
https://adambraff.github.io/tools/trump-manifold-recommender/
