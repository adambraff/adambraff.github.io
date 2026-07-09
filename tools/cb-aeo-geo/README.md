# Composition Brands — AEO/GEO Visibility Tracker

A client-side tool that measures how AI answer-engines (ChatGPT, Gemini, Claude, Perplexity, Google AI Overviews) describe Composition Brands' portfolio versus competitors, and tracks whether that visibility is improving or eroding over time.

**Live:** https://adambraff.github.io/tools/cb-aeo-geo/

## What it measures

For a battery of ~28 buyer-intent queries, an AI "judge" scores how the target brand appears in the answer a consumer-facing assistant would give:

- **Share of Voice** — % of queries where the brand is mentioned at all
- **Prominence (0–3)** — how featured it is when mentioned (3 = led / recommended, 2 = top-3, 1 = afterthought, 0 = absent). This is the metric that matters: a mention without prominence is invisibility with a footnote.
- **Recommend rate** — % of queries where the brand is actively positioned as a top pick
- **Sentiment** — tone of the brand mention
- **Owned-citation share** — % of cited sources on the brand's own domains vs earned/third-party media
- **Accuracy concerns** — factual claims about the brand that look wrong or unverifiable

## Brands & markets

Each brand is its own "market" (distinct category + geography):

| Market | Brand | Category | Geo |
|---|---|---|---|
| Viking · US | Viking | Pro-style indoor ranges | US |
| Lynx · US | Lynx | Built-in outdoor grills | US |
| AGA · UK | AGA | Cast-iron heat-storage cookers | UK |
| Rangemaster · UK | Rangemaster | Range cookers | UK |
| La Cornue · US+UK | La Cornue | Ultra-luxury French ranges | US + UK |
| Brand / Reputation | mixed | Sentiment / alternatives queries | geo-free |

Queries span discovery, product/amenity, comparison, persona, specialist, plus geography-free sentiment / "alternatives to <competitor>" clusters (where a brand strong on discovery is often invisible).

## Quick start

Open the live URL. The page auto-loads run history from `data/cbgeo-history.json` and any per-run files listed in `data/manifest.json`, and renders Results, Trend, and a citation panel. Use the run sliders to pool a date window. Everything runs in your browser — no login, no backend.

## Two measurement series

- **Claude runs** (no API key): ask Claude in Cowork to "run the CB AEO/GEO battery." Claude runs every query through live web search, scores each with the rubric, and commits the run to the repo. A weekly scheduled Claude run keeps the trend fed. This is the default series.
- **API runs** (optional): paste a Google Gemini key into the tracker's Battery tab to run the same battery through Gemini grounding (a proxy for Google AI Overviews). Kept as a separate series — engine series are compared side by side, never averaged.

## The Claude-run spec

Each run is a JSON object `{ts, label, engines:["claude"], results:[…]}` with one record per query. Record fields: `qid, query, market, intent, engine, engineName, answer, citations:[{url,title}], ownedCitations, mentioned, rank, recommended, sentiment, sentiment_score, brands_mentioned, accuracy_concern, notes, prominence`. Prominence rule: 0 if not mentioned; 3 if recommended or rank 1; 2 if rank 2–3; else 1. Citation `title` is the bare domain. No `agg` key — aggregates recompute on load.

## Honest limitations

- These are **proxies, not the literal consumer surfaces**. A Claude/Gemini web-search answer approximates what ChatGPT or Google AI Overviews would say; it is not a scrape of them.
- AI answers are **non-deterministic**. Read the trend across runs, not a single point. Weekly cadence is deliberate — daily adds noise, not signal.
- The judge is **a model scoring a model**. Treat all numbers as directional.
- 100% mention rates are expected here because each query is built around that brand's own category. **Prominence, recommend rate, and owned-citation share are where the signal lives**, not raw mention rate.
- Opening `index.html` via `file://` won't load the data folder (the browser blocks it) and uses a different localStorage origin. Use the deployed URL.
