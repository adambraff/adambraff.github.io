# Onelife AEO/GEO Visibility Tracker

A single-file, client-side tool that measures how AI answer engines (Google Gemini / AI Overviews, ChatGPT, Claude, Perplexity) describe Onelife Fitness versus competitors, tracks those numbers over time, and surfaces the content gaps worth fixing. It operationalizes the two line items the Q2 2026 board deck committed to on p.78 but left without a method: "obtain baseline measurement data" and "establish ongoing measurement."

Live: https://adambraff.github.io/tools/ol-aeo-geo-tracker/

This addresses the board's three implicit asks: (a) diagnose where Onelife ranks in AI answers today, (b) maintain a few metrics over time to see the trend, and (c) actually improve visibility. It ships with a real baseline already loaded, so it shows a diagnosis before you enter a single API key.

## Quick start

1. Open the live URL (or the local `index.html`).
2. Go to **Run** and click **Load 2026-05-26 baseline** to see the seeded diagnosis immediately.
3. To run live, go to **Setup**, paste a **Gemini** API key (cheapest, web-grounded, and it also powers the AI scoring step), toggle the engine on, then go to **Run** and hit **Run full battery**.
4. Add OpenAI and/or Anthropic keys for an ensemble across engines. Export results to JSON/CSV from the **Trend & data** tab and commit them to git so the trend survives.

Your keys live only in this browser's localStorage and go straight to each provider. The page is public (GitHub Pages), the HTML is public, the keys are not. Still, use a usage-capped key, and prefer running locally if you would rather not store a key in a browser at all.

## Recommended engine stack (the "which AI" question)

You asked me to recommend the approach rather than assume you have keys. Here it is, in priority order, with confidence levels.

**Primary: Google Gemini with Google Search grounding (~90% this is the right default).** It is the closest proxy for Google AI Overviews, which is the surface actually eating Onelife's organic traffic (the deck cites 41% of mobile searches showing an AI Overview and 80%+ of Onelife searches happening on mobile). Gemini Flash is cheap (fractions of a cent per query), returns grounding citations, and answers direct browser calls without CORS gymnastics. It also runs the tool's scoring "judge," so one key gets you both querying and scoring.

**Secondary: OpenAI (ChatGPT web search) and Anthropic (Claude web search) (~80%).** ChatGPT is the engine the deck singles out at ~17% of queries, so it belongs in the ensemble. Both respond to direct browser calls (Anthropic requires a header the tool sets automatically). Adding them turns a single-engine reading into an ensemble, which cancels the idiosyncrasies of any one model. That ensemble logic is the whole point: no single engine is ground truth, the aggregate is.

**Experimental: Perplexity (~50% it works from the browser).** Excellent grounding and citations, but it often refuses cross-origin browser calls. If it errors, leave it off or route it through a tiny proxy. Not worth a backend on its own.

**What I would not build:** a Python/server backend. It is unnecessary here, it breaks your client-side + GitHub Pages model, and it adds a thing to maintain for a job the browser can do. The one real limitation is that none of these APIs is literally Google's consumer AI Overview box; they are faithful proxies, not the exact same model in the exact same UI. Treat the numbers as directional, which is the only honest way to treat anything in a space the deck itself disclaims as possibly "different by next month."

Rough cost: a 20-query battery across 3 engines is 60 answer calls plus 60 scoring calls, on the order of a few cents to about a dollar per run with Flash-class models. Weekly runs cost rounding error.

## What it measures

The tool sends each buyer-intent query to each engine, then an AI judge scores the answer. The metrics, all tracked per market and per engine:

- **Share of Voice**: share of queries where Onelife is mentioned at all. Presence is table stakes.
- **Prominence (0 to 3)**: how featured Onelife is when mentioned. 3 means it led the answer or was recommended; 1 means it was an afterthought at the bottom of the list. This is the metric that matters most, because mention without prominence is invisibility with a footnote.
- **Recommendation rate**: share of answers where Onelife is actively positioned as a top pick rather than merely enumerated.
- **Sentiment (-1 to 1)**: tone of the Onelife mention.
- **Owned-citation share**: share of cited sources that are onelifefitness.com. This tells you whether the engines are learning about Onelife from Onelife, or only from Yelp, Reddit, and listicles.
- **Competitor Share of Voice**: the same presence metric for every named competitor, so you can see who is winning the answer when Onelife is not.

## (a) How it diagnoses your current position

The query battery is built from the way buyers actually talk to AI now, including the exact examples the deck used ("which is the biggest strength training gym in Dunwoody," "find boxing gyms with 8AM classes in Alexandria"). It spans four intents that behave very differently: discovery ("best gyms in X"), amenity ("gym with a pool / kids club in X"), specialized ("best strength training gym in X"), and comparison ("Onelife vs Crunch in X"), plus brand-level reputation ("is Onelife worth it"). Markets are the three you prioritized: DMV, Atlanta, and Coastal Virginia. You can add, remove, or toggle any query.

## (b) How it tracks the trend over time

Every run is saved as a timestamped snapshot in the browser, and the **Trend** tab charts any metric over time, per market. Because a browser is not a durable store, the tool exports each run to JSON and the full history to CSV. Commit those to a `/data` folder in the repo and your trend history becomes version-controlled and permanent, which is the cheap, robust way to persist this without a database.

Three ways to run it on a cadence, easiest first. Run it manually once a week and export (two minutes, no setup). Or have Claude run the battery on a schedule, log the structured results, and append to the history file, which needs no separate infrastructure. Or, if you want it fully hands-off later, a small scheduled job can hit the same APIs and write to `/data`. Start with weekly-manual; automate only once the metric proves it moves.

## (c) How to actually improve visibility

The baseline already points at the work. In priority order, with confidence:

**Close the owned-citation gap with structured per-club content (~85%).** Owned-citation share was 16% overall and 0% in Atlanta, meaning the engines describe Onelife almost entirely from third parties. Give them something clean to cite: per-club pages with LocalBusiness/HealthClub schema, accurate hours, amenities, geo-coordinates, and a real FAQ block per location in plain question-and-answer form. Answer engines extract structured, factual, current content and skip vague marketing copy.

**Get into the third-party sources the engines lean on (~85%).** Across every local query the engines cited Yelp, Google Business Profile, Tripadvisor, and local "best gym in X" roundups (ARLnow, Bethesda Magazine, Discover Dunwoody, stayarlington) far more than onelifefitness.com. So claim and optimize the Google Business Profile for every club, drive real reviews, and pitch the local writers and visitor bureaus who own those roundups. This is earned media, and it is exactly where AI grounds.

**Own the comparison queries, because they are wide open (~75%).** "Onelife vs Crunch" returned essentially no real material, only an Indeed employer-comparison page and TikTok. Whoever publishes the honest, specific comparison (amenities, price, locations, who each is for) will own that answer. Build "Onelife vs Crunch / LA Fitness / Life Time in [metro]" pages and the FAQ pages that feed the same intent.

**Fix the Atlanta intent mismatch (~70%).** Atlanta scored 1.00/3 prominence. Onelife loses strength-training and family/childcare intent there to Life Time, LA Fitness, and boutiques, even on queries where its full-service model should win. Decide deliberately: either produce content that reframes the strength and family offering (Hyrox, Strike, recovery, kids club) for those intents, or concede those queries and concentrate on the full-service queries Onelife can win. This is the same Atlanta weakness the deck flags on the sales side, showing up in the AI mirror.

**Keep facts consistent and current, and earn authority the GEO research rewards (~70%).** Conflicting hours, amenities, or pricing across the web confuse the models. Separately, the GEO research literature (Aggarwal et al.) found that content with citations, concrete statistics, quotations, and fluent authoritative language measurably gains visibility in generative answers, on the order of tens of percent. Write that way: sourced, specific, expert, not promotional.

### On the board member's Reddit idea

The instinct is half right and half dangerous, and worth separating cleanly.

The right half: Reddit is disproportionately cited by Google AI Overviews and ChatGPT, partly because of content licensing deals and partly because people append "reddit" to queries. The baseline confirmed it, the "is Onelife worth it" answer was sourced from Reddit. Being genuinely present where the engines source answers is real and valuable.

The dangerous half is the execution he described, mass-producing content and creating links back into it. That is the 2005 SEO link-farm playbook, and it fails now for concrete reasons (~85% confident it is net-negative). LLMs do not rank by backlink volume the way 2005 Google did, so "links back into it" does not move AI citations the way he is imagining. Reddit's terms ban undisclosed promotion, mods remove it aggressively, and a caught astroturfing campaign becomes its own negative content the engines will then cite, which is the opposite of robust. There is also an FTC disclosure problem: undisclosed paid or employee endorsement is a violation, not a gray area.

The legitimate version of his instinct: encourage real members to review and discuss, have trainers and staff be genuinely useful public experts (the deck's own "build public OL experts" line), run honest AMAs, and seed comparison and FAQ content on owned properties that you then pitch to real third-party reviewers. Earn the mentions. Do not manufacture them. This tool is how you would tell whether the earned approach is working, which is also the answer to the board's fair question of "what KPI tells us in six months whether this is working."

## The 2026-05-26 baseline (pre-loaded)

Generated by running a representative slice of the battery through live web search as an answer-engine proxy.

| Market | Share of Voice | Avg prominence | Recommend rate | Sentiment | Owned-citation share |
|---|---|---|---|---|---|
| DMV | 100% | 2.25 / 3 | 50% | +0.46 | 8% |
| Atlanta | 100% | 1.00 / 3 | 0% | +0.07 | 0% |
| Coastal VA | 100% | 3.00 / 3 | 100% | +0.80 | 75% |
| Brand | 100% | 2.00 / 3 | 0% | -0.05 | 0% |

Onelife is mentioned almost everywhere but featured only where it is genuinely differentiated. Coastal (pools, full-service) dominates and even gets onelifefitness.com cited directly. DMV is strong on amenity and class intent but contested at the premium end by Equinox in Bethesda. Atlanta is the visibility hole, buried behind Life Time, LA Fitness, and boutiques. Comparison queries are an open content gap. Sentiment on the brand-level "worth it" query is dragged down by cancellation-friction and customer-service complaints, which is a reminder that AI sentiment is downstream of operational reality.

## Limitations (read these)

The engines are faithful proxies for AI Overviews and ChatGPT, not the literal consumer surfaces, so read the numbers as directional, not as a ranked leaderboard. AI answers are non-deterministic and personalized, so expect run-to-run wobble; that is exactly why you track a trend rather than a single reading. The judge is a model scoring another model, so spot-check the query-level detail rather than trusting the aggregate blindly. Model names drift, so the model fields in Setup are editable. And the whole discipline is young; the deck's own disclaimer that this "could all be different by next month" is correct, so revisit the battery and method quarterly.

## Files

- `index.html` — the entire tool, no build step, no dependencies beyond Chart.js from CDN.
- `README.md` — this file.
