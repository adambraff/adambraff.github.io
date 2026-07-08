# Onelife AEO/GEO Visibility Tracker

A single-file, client-side tool that measures how AI answer engines (Google Gemini / AI Overviews, ChatGPT, Claude, Perplexity) describe Onelife Fitness versus competitors, tracks those numbers over time, and surfaces the content gaps worth fixing. It operationalizes the two line items the Q2 2026 board deck committed to on p.78 but left without a method: "obtain baseline measurement data" and "establish ongoing measurement."

Live: https://adambraff.github.io/tools/ol-aeo-geo-tracker/

## What changed in v2 (2026-07-08)

**Bug fix that matters: owned-citation share was silently broken.** Gemini's grounding API returns vertexaisearch redirect URLs, so checking the URL for "onelifefitness.com" always failed; the real domain lives in the citation *title*. Every live run since the baseline reported 0% owned citations when the true number was ~22%. v2 detects owned citations from title and URL, and recomputes the metric for all historical runs on load. The moral is the tool's own: verify the measurement before optimizing the metric.

**Repo-hosted history.** The page now auto-loads `data/olgeo-history.json` from this folder on startup and merges it (deduped by timestamp) with anything in the browser's localStorage. The repo file is the durable store; the browser is a cache. Runs that errored entirely (e.g., bad API key) are dropped.

**Claude runs — no API key needed.** A parallel engine series (`engine: "claude"`): Claude in Cowork runs the same 20-query battery through live web search, scores each answer with the same rubric, and commits the run JSON to `data/olgeo-history.json`. A weekly scheduled task keeps it running without human effort. Gemini runs (API key) and Claude runs are kept as separate series and compared in the Engine comparison table, not averaged together — no single engine is ground truth, and the spread between them is itself information.

**Profound-inspired views** (see tryprofound.com for the enterprise version of this idea):

- Scorecard deltas vs the previous run *of the same engine series* (no cross-engine deltas)
- Run picker to view any historical run, not just the latest
- Competitor leaderboard with rank movement (▲/▼) vs the prior comparable run
- Intent breakdown — where the answer is won or lost by query type (strength and classes intents are the persistent losers; comparison and amenity intents the winners)
- Citation-source leaderboard — the domains engines actually cite, owned vs earned, with counts (this is the earned-media hit list)
- Engine comparison — per-series averages across all runs
- "What to fix" — auto-generated, rule-based actions from the latest run: invisible queries, buried mentions, accuracy flags, zero-owned-citation markets, sentiment drags, and comparison answers that lean too hard on onelifefitness.com itself

## Quick start

1. Open the live URL. History loads automatically from `data/olgeo-history.json` — you'll see the trend and latest diagnosis with zero setup.
2. To add a Gemini run: **Setup** → paste a Gemini API key → **Run** → **Run full battery**. Export from **Trend & data** and commit to `data/olgeo-history.json` (or ask Claude to).
3. To add a Claude run: ask Claude in Cowork to "run the OL AEO/GEO battery and commit the results." The weekly scheduled task does this automatically.

Keys live only in the browser's localStorage and go straight to each provider. Use a usage-capped key.

## What it measures

Each buyer-intent query goes to each engine; an AI judge scores the answer. Metrics, tracked per market, per intent, and per engine:

- **Share of Voice**: share of queries where Onelife is mentioned at all. Presence is table stakes.
- **Prominence (0–3)**: how featured Onelife is when mentioned. 3 = led or recommended; 1 = afterthought. This is the metric that matters most.
- **Recommendation rate**: share of answers where Onelife is actively positioned as a top pick.
- **Sentiment (−1 to 1)**: tone of the Onelife mention.
- **Owned-citation share**: share of cited sources that are onelifefitness.com — whether engines learn about Onelife from Onelife or only from Yelp, Reddit, and listicles.
- **Competitor Share of Voice**: the same presence metric for every named competitor.

## The Claude-run spec (for reproducibility)

A Claude run is a JSON object appended to the `data/olgeo-history.json` array:

```json
{
  "ts": "ISO timestamp",
  "label": "Claude run (Cowork web search)",
  "engines": ["claude"],
  "results": [ /* one record per query, same schema as live runs */ ]
}
```

Each result record: `qid, query, market, intent, engine ("claude"), engineName, answer, citations [{url, title=domain}], ownedCitations, mentioned, rank, recommended, sentiment, sentiment_score, brands_mentioned, accuracy_concern, notes, prominence, error (null), _judge ("claude")`. Prominence rule: 0 if not mentioned; 3 if recommended or rank 1; 2 if rank 2–3; else 1. The tool recomputes `ownedCitations` and `agg` on load, so hand-built runs only need the raw fields.

## Reading the data honestly

The engines are proxies for AI Overviews and ChatGPT, not the literal consumer surfaces; read numbers as directional. Answers are non-deterministic, so track the trend, not single points — and expect the Claude series to run systematically friendlier to Onelife than the Gemini series (first Claude run: prominence 2.67 vs Gemini's ~2.75 average, but with different queries won and lost; strength and classes intents fail on both). The judge is a model scoring a model; spot-check the query-level detail. Revisit the battery quarterly.

## Files

- `index.html` — the entire tool, no build step, no dependencies beyond Chart.js from CDN.
- `data/olgeo-history.json` — the durable run history (7 Gemini runs since 2026-05-27 + Claude runs).
- `README.md` — this file.
